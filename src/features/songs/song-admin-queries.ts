import { getPostgresConnection } from "@/features/postgres/postgres-connection-pool";

type AdminSongSummary = {
  id: string;
  title: string;
  slug: string;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
  verseCount: number;
  pendingJobs: number;
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
