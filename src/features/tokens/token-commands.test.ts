import { expect, test } from "vitest";
import { registerDatabaseTestSuite } from "@/features/testing/database-test-harness";
import { withTestPool } from "@/features/testing/postgres-test-utils";
import {
  createAccessToken,
  deleteAccessToken,
  hashAccessToken,
  recordAccessTokenUse,
} from "@/features/tokens/token-commands";
import {
  fetchAccessTokens,
  findAccessTokenByHash,
} from "@/features/tokens/token-queries";
import { AccessTokenPermissions } from "@/features/tokens/token-types";

const ACCESS_TOKEN_TABLES: readonly string[] = [
  "access_token_permissions",
  "access_tokens",
];

registerDatabaseTestSuite({ truncateTables: ACCESS_TOKEN_TABLES });

const getStoredTokenHash = async (id: string): Promise<Buffer | null> =>
  await withTestPool(async (pool) => {
    const result = await pool.query<{ token_hash: Buffer }>(
      `SELECT token_hash FROM access_tokens WHERE id = $1`,
      [id],
    );
    return result.rows[0]?.token_hash ?? null;
  });

test("createAccessToken stores a hashed token and returns the plaintext value", async () => {
  const { token, accessToken } = await createAccessToken({
    label: "MCP integration",
    createdBy: "access-token-tests",
    permissions: [],
  });

  expect(token.length).toBeGreaterThan(10);
  expect(accessToken.label).toBe("MCP integration");
  expect(accessToken.lastFour).toBe(token.slice(-4));
  expect(accessToken.lastUsedAt).toBeNull();
  expect(accessToken.permissions).toEqual([]);

  const storedHash = await getStoredTokenHash(accessToken.id);
  if (storedHash === null) {
    throw new Error("Expected token hash to be persisted.");
  }
  expect(Buffer.compare(storedHash, hashAccessToken(token))).toBe(0);

  const tokens = await fetchAccessTokens();
  expect(tokens).toHaveLength(1);
  expect(tokens[0]?.id).toBe(accessToken.id);
  expect(tokens[0]?.permissions).toEqual([]);
});

test("deleteAccessToken removes the record", async () => {
  const { accessToken } = await createAccessToken({
    label: "Temporary token",
    createdBy: "access-token-tests",
    permissions: [],
  });

  const deleted = await deleteAccessToken(accessToken.id);
  expect(deleted).toBe(true);

  const tokens = await fetchAccessTokens();
  expect(tokens).toHaveLength(0);

  const deletedAgain = await deleteAccessToken(accessToken.id);
  expect(deletedAgain).toBe(false);
});

test("recordAccessTokenUse updates last_used_at and lookup by hash works", async () => {
  const { token, accessToken } = await createAccessToken({
    label: "Usage token",
    createdBy: "access-token-tests",
    permissions: [],
  });

  const beforeLookup = await findAccessTokenByHash(hashAccessToken(token));
  expect(beforeLookup).not.toBeNull();
  expect(beforeLookup?.lastUsedAt).toBeNull();

  await recordAccessTokenUse(accessToken.id);

  const tokens = await fetchAccessTokens();
  expect(tokens[0]?.lastUsedAt).not.toBeNull();

  const afterLookup = await findAccessTokenByHash(hashAccessToken(token));
  expect(afterLookup).not.toBeNull();
  expect(afterLookup?.lastUsedAt).not.toBeNull();
});

test("createAccessToken associates administrator permissions", async () => {
  const { accessToken } = await createAccessToken({
    label: "Admin token",
    createdBy: "access-token-tests",
    permissions: [AccessTokenPermissions.Administrator],
  });

  expect(accessToken.permissions).toEqual([
    AccessTokenPermissions.Administrator,
  ]);

  const tokens = await fetchAccessTokens();
  expect(tokens).toHaveLength(1);
  expect(tokens[0]?.permissions).toEqual([
    AccessTokenPermissions.Administrator,
  ]);
});
