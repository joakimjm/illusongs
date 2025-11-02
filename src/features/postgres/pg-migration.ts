// Ported from https://raw.githubusercontent.com/rogierslag/pg-migration/refs/heads/master/src/index.js
import { promises as fs } from "node:fs";
import path from "node:path";
import type { ClientBase } from "pg";

/**
 * Simple runtime SQL-file migrator for Postgres.
 * - Tracks applied migrations in "dbchangelog"
 * - Executes .sql files in lexicographic order (timestamp-prefixed names recommended)
 * - Skips README.md and dbchangelog.sql (kept for parity with original)
 * - Takes an existing pg Client/Pool client (connected)
 * - Optionally runs a callback (e.g., start server) after successful migration
 */

type LogLevel = "debug" | "info" | "warn" | "error";
type Logger = (level: LogLevel, message: string) => void;

interface MigrationOptions {
  log?: Logger;
  /** Prevent concurrent runs across replicas. Default: true */
  useAdvisoryLock?: boolean;
  /** Lock key; must be consistent across all instances. Default: 88418723 */
  advisoryLockKey?: number;
  /** Schema/table that stores migration state. Default: public.dbchangelog */
  changelogTable?: string;
  /** Fail fast if any migration contains multiple statements that must be split. Default: false */
  strictSingleStatement?: boolean;
}

type OnReady = () => void | Promise<void>;

const defaultLogger: Logger = (level, msg) =>
  console[level === "debug" ? "log" : level]?.(`[pg-migration] ${msg}`);

export function createMigrator(opts: MigrationOptions = {}) {
  const {
    log = defaultLogger,
    useAdvisoryLock = true,
    advisoryLockKey = 88418723,
    strictSingleStatement = false,
  } = opts;

  return async function migrateAndStart(
    client: ClientBase,
    migrationsDir: string,
    onReady?: OnReady,
  ): Promise<void> {
    // 1) Ensure changelog table
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.dbchangelog (
        id text PRIMARY KEY,
        applied_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    log("debug", `Ensured changelog table: public.dbchangelog`);

    // 2) Optional cluster-wide guard (advisory lock)
    if (useAdvisoryLock) {
      const { rows } = await client.query<{ pg_try_advisory_lock: boolean }>(
        "SELECT pg_try_advisory_lock($1) AS pg_try_advisory_lock",
        [advisoryLockKey],
      );
      if (!rows[0]?.pg_try_advisory_lock) {
        throw new Error(
          `Could not obtain advisory lock ${advisoryLockKey}. Another instance may be migrating.`,
        );
      }
      log("info", `Obtained advisory lock ${advisoryLockKey}`);
    }

    try {
      // 3) Discover migration files
      const files = (await fs.readdir(migrationsDir))
        .filter((f) => f.endsWith(".sql"))
        .filter((f) => f !== "dbchangelog.sql") // parity with original
        .sort((a, b) => a.localeCompare(b, "en"));

      // README.md is ignored by design in the original
      // (no action needed here since we only take .sql)

      log(
        "info",
        `Found ${files.length} .sql migration(s) in ${migrationsDir}`,
      );

      // 4) Find already applied
      const applied = new Set<string>();
      {
        const { rows } = await client.query<{ id: string }>(
          `SELECT id FROM public.dbchangelog ORDER BY applied_at ASC`,
        );
        rows.forEach((r) => {
          applied.add(r.id);
        });
      }

      // 5) Apply missing migrations (in order)
      for (const file of files) {
        const id = path.basename(file, ".sql"); // original derives id from filename
        if (applied.has(id)) {
          log("debug", `Skip (already applied): ${id}`);
          continue;
        }

        const fullPath = path.join(migrationsDir, file);
        const sql = await fs.readFile(fullPath, "utf8");

        if (strictSingleStatement && sql.includes(";")) {
          // crude guard: you can replace with proper SQL splitting if needed
          throw new Error(
            `strictSingleStatement=true but migration "${file}" contains ';'`,
          );
        }

        log("info", `Applying: ${id}`);
        // Run each migration in its own transaction
        try {
          await client.query("BEGIN");
          await client.query(sql);
          await client.query(`INSERT INTO public.dbchangelog(id) VALUES ($1)`, [
            id,
          ]);
          await client.query("COMMIT");
          log("info", `Applied: ${id}`);
        } catch (err) {
          await client.query("ROLLBACK");
          log("error", `Failed: ${id} (${(err as Error).message})`);
          throw err;
        }
      }
    } finally {
      if (useAdvisoryLock) {
        await client.query("SELECT pg_advisory_unlock($1)", [advisoryLockKey]);
        log("info", `Released advisory lock ${advisoryLockKey}`);
      }
    }

    // 6) Start the app
    if (onReady) await onReady();
  };
}
