import { afterAll, afterEach, beforeAll, beforeEach } from "vitest";
import {
  acquireTestAdvisoryLock,
  runMigrations,
  truncateTables,
} from "@/features/testing/postgres-test-utils";

type TruncateTablesOption = readonly string[] | null;

type DatabaseTestOptions = {
  truncateTables?: TruncateTablesOption;
  beforeEachHook?: () => Promise<void>;
  afterEachHook?: () => Promise<void>;
};

const executeTruncate = async (tables: TruncateTablesOption) => {
  if (!tables || tables.length === 0) {
    return;
  }

  await truncateTables(tables);
};

export const registerDatabaseTestSuite = (options?: DatabaseTestOptions) => {
  const truncateOption = options?.truncateTables ?? null;
  const beforeEachHook = options?.beforeEachHook ?? null;
  const afterEachHook = options?.afterEachHook ?? null;

  let releaseDbLock: (() => Promise<void>) | null = null;

  beforeAll(async () => {
    releaseDbLock = await acquireTestAdvisoryLock();
    await runMigrations();
  });

  beforeEach(async () => {
    await executeTruncate(truncateOption);
    if (beforeEachHook) {
      await beforeEachHook();
    }
  });

  afterEach(async () => {
    await executeTruncate(truncateOption);
    if (afterEachHook) {
      await afterEachHook();
    }
  });

  afterAll(async () => {
    if (releaseDbLock) {
      await releaseDbLock();
      releaseDbLock = null;
    }
  });
};
