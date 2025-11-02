export type SongSto = {
  id: string;
  slug: string;
  title: string;
  language_code: string;
  is_published: boolean;
  created_at: Date;
  updated_at: Date;
};

export type SongSummarySto = SongSto & {
  tag_names: readonly string[];
};

export type SongVerseSto = {
  id: string;
  song_id: string;
  sequence_number: number;
  lyric_text: string;
  illustration_url: string | null;
  created_at: Date;
  updated_at: Date;
};

export type SongTagSto = {
  tag_name: string;
};
