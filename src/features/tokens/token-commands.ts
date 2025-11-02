import { createHash, randomBytes } from "node:crypto";
import { getPostgresConnection } from "@/features/postgres/postgres-connection-pool";
import { mapAccessTokenStoToDto } from "@/features/tokens/token-mapping";
import type {
  AccessTokenDto,
  AccessTokenPermission,
} from "@/features/tokens/token-types";
import type { AccessTokenWithPermissionsSto } from "./token-stos";

const TOKEN_BYTE_LENGTH = 32;

const generateTokenValue = (): string =>
  randomBytes(TOKEN_BYTE_LENGTH).toString("base64url");

export const hashAccessToken = (token: string): Buffer =>
  createHash("sha256").update(token, "utf-8").digest();

const extractTokenLastFour = (token: string): string => {
  const lastFour = token.slice(-4);
  if (lastFour.length !== 4) {
    throw new Error("Generated token must be at least four characters long.");
  }
  return lastFour;
};

export type CreateAccessTokenInput = {
  label: string;
  createdBy: string;
  permissions: readonly AccessTokenPermission[];
};

type CreateAccessTokenResult = {
  token: string;
  accessToken: AccessTokenDto;
};

export const createAccessToken = async (
  input: CreateAccessTokenInput,
): Promise<CreateAccessTokenResult> => {
  const permissions = [...new Set(input.permissions)];
  const tokenValue = generateTokenValue();
  const tokenHash = hashAccessToken(tokenValue);
  const lastFour = extractTokenLastFour(tokenValue);

  const connection = getPostgresConnection();

  const insertedToken =
    await connection.clientUsing<AccessTokenWithPermissionsSto | null>(
      async (client) => {
        await client.query("BEGIN");
        try {
          const insertResult = await client.query(
            `
              INSERT INTO access_tokens (
                label,
                token_hash,
                token_last_four,
                created_by
              )
              VALUES ($1, $2, $3, $4)
              RETURNING
                id,
                label,
                token_last_four,
                created_by,
                created_at,
                last_used_at
            `,
            [input.label, tokenHash, lastFour, input.createdBy],
          );

          const baseRecord = insertResult.rows[0] ?? null;
          if (!baseRecord) {
            throw new Error("Failed to persist access token record.");
          }

          if (permissions.length > 0) {
            const result = await client.query(
              `
                INSERT INTO access_token_permissions (
                  access_token_id,
                  permission_id
                )
                SELECT
                  $1,
                  id
                FROM token_permissions
                WHERE name = ANY($2::text[])
              `,
              [baseRecord.id, permissions],
            );

            if (result.rowCount !== permissions.length) {
              throw new Error("Invalid access token permission requested.");
            }
          }

          const tokenResult = await client.query<AccessTokenWithPermissionsSto>(
            `
              SELECT
                t.id,
                t.label,
                t.token_last_four,
                t.created_by,
                t.created_at,
                t.last_used_at,
                COALESCE(
                  ARRAY_AGG(p.name ORDER BY p.name)
                    FILTER (WHERE p.name IS NOT NULL),
                  '{}'
                ) AS permissions
              FROM access_tokens t
              LEFT JOIN access_token_permissions tp
                ON tp.access_token_id = t.id
              LEFT JOIN token_permissions p
                ON p.id = tp.permission_id
              WHERE t.id = $1
              GROUP BY t.id
            `,
            [baseRecord.id],
          );

          await client.query("COMMIT");
          return tokenResult.rows[0] ?? null;
        } catch (error) {
          await client.query("ROLLBACK");
          throw error;
        }
      },
    );

  if (!insertedToken) {
    throw new Error("Failed to persist access token record.");
  }

  return {
    token: tokenValue,
    accessToken: mapAccessTokenStoToDto(insertedToken),
  };
};

export const deleteAccessToken = async (id: string): Promise<boolean> => {
  const connection = getPostgresConnection();

  const deletedCount = await connection.clientUsing(async (client) => {
    const result = await client.query(
      `DELETE FROM access_tokens WHERE id = $1`,
      [id],
    );
    return result.rowCount ?? 0;
  });

  return deletedCount > 0;
};

export const recordAccessTokenUse = async (id: string): Promise<void> => {
  const connection = getPostgresConnection();
  await connection.clientUsing(async (client) => {
    await client.query(
      `
        UPDATE access_tokens
        SET last_used_at = NOW()
        WHERE id = $1
      `,
      [id],
    );
  });
};
