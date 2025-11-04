import { expect, test } from "vitest";
import { createSong } from "@/features/songs/song-commands";
import {
  deleteConversationForSong,
  findConversationForSong,
  upsertConversationForSong,
} from "@/features/songs/song-generation-conversations";
import { registerDatabaseTestSuite } from "@/features/testing/database-test-harness";

const TABLES: readonly string[] = [
  "song_generation_conversations",
  "song_tags",
  "song_verses",
  "songs",
  "tags",
];

registerDatabaseTestSuite({ truncateTables: TABLES });

test("upsertConversationForSong creates and updates conversation", async () => {
  const song = await createSong({
    slug: "conversation-song",
    title: "Conversation Song",
    languageCode: "en",
    isPublished: false,
    tags: [],
    verses: [
      {
        sequenceNumber: 1,
        lyricText: "Verse",
        illustrationUrl: null,
      },
    ],
  });

  const created = await upsertConversationForSong({
    songId: song.id,
    provider: "openrouter",
    model: "model-a",
    conversationId: "conv-1",
  });

  expect(created.songId).toBe(song.id);
  expect(created.conversationId).toBe("conv-1");

  const fetched = await findConversationForSong(song.id);
  expect(fetched?.conversationId).toBe("conv-1");

  const updated = await upsertConversationForSong({
    songId: song.id,
    provider: "openrouter",
    model: "model-b",
    conversationId: "conv-2",
  });

  expect(updated.model).toBe("model-b");
  expect(updated.conversationId).toBe("conv-2");

  await deleteConversationForSong(song.id);
  const afterDelete = await findConversationForSong(song.id);
  expect(afterDelete).toBeNull();
});
