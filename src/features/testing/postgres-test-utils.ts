import path from "node:path";
import { Pool } from "pg";
import { getRequiredConfigValue } from "@/config";
import { createMigrator } from "@/features/postgres/pg-migration";

const createTestPool = () =>
  new Pool({
    connectionString: getRequiredConfigValue("POSTGRES_CONNECTION_STRING"),
  });

const DEFAULT_TEST_LOCK_KEY = 42_015;

type ReleaseAdvisoryLock = () => Promise<void>;

export const acquireTestAdvisoryLock = async (
  key: number = DEFAULT_TEST_LOCK_KEY,
): Promise<ReleaseAdvisoryLock> => {
  const pool = createTestPool();
  const client = await pool.connect();
  await client.query("SELECT pg_advisory_lock($1)", [key]);

  let released = false;
  return async () => {
    if (released) {
      return;
    }
    released = true;
    await client.query("SELECT pg_advisory_unlock($1)", [key]);
    client.release();
    await pool.end();
  };
};

export const withTestPool = async <T>(
  execute: (pool: Pool) => Promise<T>,
): Promise<T> => {
  const pool = createTestPool();
  try {
    return await execute(pool);
  } finally {
    await pool.end();
  }
};

const quoteIdentifier = (identifier: string): string =>
  `"${identifier.replaceAll(`"`, `""`)}"`;

export const truncateTables = async (
  tableNames: readonly string[],
): Promise<void> => {
  if (tableNames.length === 0) {
    return;
  }

  await withTestPool(async (pool) => {
    const sortedTableNames = [...tableNames].sort((a, b) =>
      a.localeCompare(b, "en"),
    );
    const statement = `TRUNCATE TABLE ${sortedTableNames
      .map(quoteIdentifier)
      .join(", ")} RESTART IDENTITY CASCADE`;
    try {
      await pool.query(statement);
    } catch (error) {
      if (
        typeof error === "object" &&
        error !== null &&
        // @ts-expect-error pg error type
        error.code === "42P01"
      ) {
        return;
      }
      throw error;
    }
  });
};

let migrationsReadyPromise: Promise<void> | undefined;

export const runMigrations = async (): Promise<void> => {
  if (!migrationsReadyPromise) {
    const migrationsDir = path.join(process.cwd(), "migrations");
    migrationsReadyPromise = withTestPool(async (pool) => {
      const client = await pool.connect();
      try {
        const { rows } = await client.query<{ exists: boolean }>(
          `SELECT EXISTS (
            SELECT 1
            FROM information_schema.tables
            WHERE table_schema = 'public'
              AND table_name = 'access_tokens'
          ) AS exists`,
        );

        if (rows[0]?.exists) {
          return;
        }

        const migrate = createMigrator({
          log: () => {},
        });
        await migrate(client, migrationsDir);
      } finally {
        client.release();
      }
    });
  }

  await migrationsReadyPromise;
};

export const resetMigrationsCache = () => {
  migrationsReadyPromise = undefined;
};
