import { expect, test } from "vitest";
import { pingPostgres } from "@/features/postgres/postgres-health";

test("migrations succeeed and database is reachable", async () => {
  const isReachable = await pingPostgres();
  expect(isReachable).toBe(true);
});
