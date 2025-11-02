import { getPostgresConnection } from "@/features/postgres/postgres-connection-pool";
import {
  mapAccessTokenStoToDto,
  mapPermissionsOrThrow,
} from "@/features/tokens/token-mapping";
import type { AccessTokenDto } from "@/features/tokens/token-types";
import type {
  AccessTokenWithHashAndPermissionsSto,
  AccessTokenWithPermissionsSto,
} from "./token-stos";

export const fetchAccessTokens = async (): Promise<AccessTokenDto[]> => {
  const connection = getPostgresConnection();

  return await connection.clientUsing(async (client) => {
    const result = await client.query<AccessTokenWithPermissionsSto>(
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
        GROUP BY
          t.id,
          t.label,
          t.token_last_four,
          t.created_by,
          t.created_at,
          t.last_used_at
        ORDER BY t.created_at DESC
      `,
    );

    return result.rows.map(mapAccessTokenStoToDto);
  });
};

type AccessTokenLookup = {
  id: string;
  label: string;
  lastFour: string;
  createdBy: string;
  createdAt: Date;
  lastUsedAt: Date | null;
  permissions: ReturnType<typeof mapPermissionsOrThrow>;
};

export const findAccessTokenByHash = async (
  tokenHash: Buffer,
): Promise<AccessTokenLookup | null> => {
  const connection = getPostgresConnection();

  return await connection.clientUsing(async (client) => {
    const result = await client.query<AccessTokenWithHashAndPermissionsSto>(
      `
        SELECT
          t.id,
          t.label,
          t.token_hash,
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
        WHERE t.token_hash = $1
        GROUP BY
          t.id,
          t.label,
          t.token_hash,
          t.token_last_four,
          t.created_by,
          t.created_at,
          t.last_used_at
      `,
      [tokenHash],
    );

    const record = result.rows[0];
    if (!record) {
      return null;
    }

    return {
      id: record.id,
      label: record.label,
      lastFour: record.token_last_four,
      createdBy: record.created_by,
      createdAt: record.created_at,
      lastUsedAt: record.last_used_at,
      permissions: mapPermissionsOrThrow(record.permissions),
    };
  });
};
