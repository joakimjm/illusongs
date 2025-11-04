import { getPostgresConnection } from "@/features/postgres/postgres-connection-pool";

export type SongGenerationConversation = {
  songId: string;
  provider: string;
  model: string;
  conversationId: string;
  createdAt: string;
  updatedAt: string;
};

type ConversationRow = {
  song_id: string;
  provider: string;
  model: string;
  conversation_id: string;
  created_at: Date;
  updated_at: Date;
};

const mapRowToConversation = (
  row: ConversationRow,
): SongGenerationConversation => ({
  songId: row.song_id,
  provider: row.provider,
  model: row.model,
  conversationId: row.conversation_id,
  createdAt: row.created_at.toISOString(),
  updatedAt: row.updated_at.toISOString(),
});

export const findConversationForSong = async (
  songId: string,
): Promise<SongGenerationConversation | null> => {
  const connection = getPostgresConnection();

  return await connection.clientUsing(async (client) => {
    const result = await client.query<ConversationRow>(
      `
        SELECT
          song_id,
          provider,
          model,
          conversation_id,
          created_at,
          updated_at
        FROM song_generation_conversations
        WHERE song_id = $1
        LIMIT 1
      `,
      [songId],
    );

    const row = result.rows[0];
    return row ? mapRowToConversation(row) : null;
  });
};

export const upsertConversationForSong = async (input: {
  songId: string;
  provider: string;
  model: string;
  conversationId: string;
}): Promise<SongGenerationConversation> => {
  const connection = getPostgresConnection();

  return await connection.clientUsing(async (client) => {
    const result = await client.query<ConversationRow>(
      `
        INSERT INTO song_generation_conversations (
          song_id,
          provider,
          model,
          conversation_id
        )
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (song_id)
        DO UPDATE SET
          provider = EXCLUDED.provider,
          model = EXCLUDED.model,
          conversation_id = EXCLUDED.conversation_id,
          updated_at = NOW()
        RETURNING
          song_id,
          provider,
          model,
          conversation_id,
          created_at,
          updated_at
      `,
      [input.songId, input.provider, input.model, input.conversationId],
    );

    const row = result.rows[0];
    if (!row) {
      throw new Error("Failed to store conversation metadata.");
    }

    return mapRowToConversation(row);
  });
};

export const deleteConversationForSong = async (
  songId: string,
): Promise<void> => {
  const connection = getPostgresConnection();

  await connection.clientUsing(async (client) => {
    await client.query(
      `
        DELETE FROM song_generation_conversations
        WHERE song_id = $1
      `,
      [songId],
    );
  });
};
