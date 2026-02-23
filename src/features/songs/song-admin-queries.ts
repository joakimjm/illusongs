import { getPostgresConnection } from "@/features/postgres/postgres-connection-pool";

export type AdminSongSummary = {
  id: string;
  title: string;
  slug: string;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
  verseCount: number;
  pendingJobs: number;
};

export type AdminSongVerseDetail = {
  id: string;
  sequenceNumber: number;
  lyricText: string;
  updatedAt: string;
};

export type AdminSongDetail = {
  id: string;
  title: string;
  slug: string;
  isPublished: boolean;
  updatedAt: string;
  verses: AdminSongVerseDetail[];
};

type AdminSongSummaryRow = {
  id: string;
  title: string;
  slug: string;
  is_published: boolean;
  created_at: Date;
  updated_at: Date;
  verse_count: string;
  pending_jobs: string;
};

type AdminSongRow = {
  id: string;
  title: string;
  slug: string;
  is_published: boolean;
  updated_at: Date;
};

type AdminSongVerseRow = {
  id: string;
  sequence_number: number;
  lyric_text: string;
  updated_at: Date;
};

const mapAdminSongSummaryRow = (
  row: AdminSongSummaryRow,
): AdminSongSummary => ({
  id: row.id,
  title: row.title,
  slug: row.slug,
  isPublished: row.is_published,
  createdAt: row.created_at.toISOString(),
  updatedAt: row.updated_at.toISOString(),
  verseCount: Number.parseInt(row.verse_count, 10),
  pendingJobs: Number.parseInt(row.pending_jobs, 10),
});

const mapAdminSongVerseRow = (
  row: AdminSongVerseRow,
): AdminSongVerseDetail => ({
  id: row.id,
  sequenceNumber: row.sequence_number,
  lyricText: row.lyric_text,
  updatedAt: row.updated_at.toISOString(),
});

export const fetchAdminSongSummaries = async (): Promise<
  AdminSongSummary[]
> => {
  const connection = getPostgresConnection();

  return await connection.clientUsing(async (client) => {
    const result = await client.query<AdminSongSummaryRow>(
      `
        SELECT
          s.id,
          s.title,
          s.slug,
          s.is_published,
          s.created_at,
          s.updated_at,
          COUNT(v.id)::text AS verse_count,
          SUM(
            CASE
              WHEN j.status = 'pending' THEN 1
              ELSE 0
            END
          )::text AS pending_jobs
        FROM songs s
        LEFT JOIN song_verses v
          ON v.song_id = s.id
        LEFT JOIN song_generation_jobs j
          ON j.verse_id = v.id
        GROUP BY
          s.id,
          s.title,
          s.slug,
          s.is_published,
          s.created_at,
          s.updated_at
        ORDER BY s.created_at DESC, s.id DESC
      `,
    );

    return result.rows.map(mapAdminSongSummaryRow);
  });
};

export const findAdminSongById = async (
  songId: string,
): Promise<AdminSongDetail | null> => {
  const connection = getPostgresConnection();

  return await connection.clientUsing(async (client) => {
    const songResult = await client.query<AdminSongRow>(
      `
        SELECT
          id,
          title,
          slug,
          is_published,
          updated_at
        FROM songs
        WHERE id = $1
        LIMIT 1
      `,
      [songId],
    );

    const song = songResult.rows[0];
    if (!song) {
      return null;
    }

    const verseResult = await client.query<AdminSongVerseRow>(
      `
        SELECT
          id,
          sequence_number,
          lyric_text,
          updated_at
        FROM song_verses
        WHERE song_id = $1
        ORDER BY sequence_number
      `,
      [song.id],
    );

    return {
      id: song.id,
      title: song.title,
      slug: song.slug,
      isPublished: song.is_published,
      updatedAt: song.updated_at.toISOString(),
      verses: verseResult.rows.map(mapAdminSongVerseRow),
    };
  });
};
