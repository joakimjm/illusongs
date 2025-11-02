import { Client } from "pg";
import { getRequiredConfigValue } from "@/config";
import {
  resetMigrationsCache,
  runMigrations,
} from "@/features/testing/postgres-test-utils";

const PUBLIC_SCHEMA = "public";
const FLAG_SKIP_DB = "VITEST_SKIP_DB";

const shouldSkipDatabase = (): boolean =>
  (process.env[FLAG_SKIP_DB]?.toLowerCase() ?? "") === "true";

const resetSchema = async () => {
  const client = new Client({
    connectionString: getRequiredConfigValue("POSTGRES_CONNECTION_STRING"),
  });
  await client.connect();

  try {
    console.warn("Resetting test database schema...");
    await client.query(`DROP SCHEMA IF EXISTS ${PUBLIC_SCHEMA} CASCADE;`);
    await client.query(`CREATE SCHEMA ${PUBLIC_SCHEMA};`);
  } finally {
    await client.end();
  }
};

export async function setup(): Promise<void> {
  if (shouldSkipDatabase()) {
    console.info(
      "VITEST_SKIP_DB=true – skipping database schema reset and migrations.",
    );
    return;
  }

  resetMigrationsCache();
  await resetSchema();
  await runMigrations();
}

export async function teardown(): Promise<void> {
  if (shouldSkipDatabase()) {
    return;
  }

  resetMigrationsCache();
  await resetSchema();
}
