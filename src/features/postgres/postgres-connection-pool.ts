import path from "node:path";
import { Pool, type PoolClient, type PoolConfig } from "pg";
import { getRequiredConfigValue } from "@/config";
import { createMigrator } from "./pg-migration";

class PostgresConnectionPool {
  private _pool: Pool;
  private migrationsPromise?: Promise<void>;
  private migrationError?: Error;

  constructor(config: PoolConfig) {
    this._pool = new Pool(config);
  }

  public async clientUsing<T>(
    execute: (client: PoolClient) => Promise<T>,
  ): Promise<T> {
    await this.ensureMigrated();
    return await this.runWithPostgresClient(execute);
  }

  private async ensureMigrated() {
    if (!this.migrationsPromise || this.migrationError) {
      this.migrationError = undefined;

      // Use the new async migrator here
      this.migrationsPromise = this.runWithPostgresClient(async (client) => {
        const migrate = createMigrator({
          log: (lvl, msg) => console.log(`[pg-migration][${lvl}] ${msg}`),
          useAdvisoryLock: true,
        });

        const migrationsDir = path.join(process.cwd(), "migrations");
        await migrate(client, migrationsDir);
      });
    }

    try {
      await this.migrationsPromise;
    } catch (err) {
      this.migrationError = err as Error;
      throw err;
    }
  }

  private async runWithPostgresClient<T>(
    execute: (client: PoolClient) => Promise<T>,
  ): Promise<T> {
    const client = await this._pool.connect();
    try {
      await client.query("BEGIN");
      const retval = await execute(client);
      await client.query("COMMIT");
      return retval;
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    } finally {
      client.release();
    }
  }
}

// Singleton export, same pattern as before
let postgresConnectionPool: PostgresConnectionPool;

export const getPostgresConnection = (): PostgresConnectionPool =>
  postgresConnectionPool ??
  // biome-ignore lint/suspicious/noAssignInExpressions: It's a singleton
  (postgresConnectionPool = new PostgresConnectionPool({
    connectionString: getRequiredConfigValue("POSTGRES_CONNECTION_STRING"),
  }));
