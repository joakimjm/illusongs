import { getPostgresConnection } from "@/features/postgres/postgres-connection-pool";

export const pingPostgres = async (): Promise<boolean> => {
  const connection = getPostgresConnection();
  return await connection.clientUsing(async (client) => {
    const queryResult = await client.query<{ ping: number }>(
      "SELECT 1 AS ping",
    );
    const firstRow = queryResult.rows[0];
    return firstRow?.ping === 1;
  });
};
