import { getPostgresConnection } from "@/features/postgres/postgres-connection-pool";

export type SongGenerationVerseArtifactDto = {
  verseId: string;
  prompt: string;
  provider: string;
  model: string;
  imageUrl: string | null;
  imagePath: string | null;
  thumbnailPath: string | null;
  imageSummary: string | null;
  updatedAt: string;
};

type ArtifactRow = {
  verse_id: string;
  prompt: string;
  provider: string;
  model: string;
  image_url: string | null;
  image_path: string | null;
  thumbnail_path: string | null;
  image_summary: string | null;
  updated_at: Date;
};

const mapArtifactRow = (row: ArtifactRow): SongGenerationVerseArtifactDto => ({
  verseId: row.verse_id,
  prompt: row.prompt,
  provider: row.provider,
  model: row.model,
  imageUrl: row.image_url,
  imagePath: row.image_path,
  thumbnailPath: row.thumbnail_path,
  imageSummary: row.image_summary,
  updatedAt: row.updated_at.toISOString(),
});

export const fetchSongGenerationVerseArtifactsBySong = async (
  songId: string,
): Promise<SongGenerationVerseArtifactDto[]> => {
  const connection = getPostgresConnection();

  return await connection.clientUsing(async (client) => {
    const result = await client.query<ArtifactRow>(
      `
        SELECT
          a.verse_id,
          a.prompt,
          a.provider,
          a.model,
          a.image_url,
          a.image_path,
          a.thumbnail_path,
          a.image_summary,
          a.updated_at
        FROM song_generation_verse_artifacts a
        JOIN song_verses v ON v.id = a.verse_id
        WHERE v.song_id = $1
        ORDER BY v.sequence_number
      `,
      [songId],
    );

    return result.rows.map(mapArtifactRow);
  });
};
