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
  cover_image_url: string | null;
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

export type SongTagMetadataSto = {
  name: string;
  display_name: string | null;
  category_slug: string | null;
  category_label: string | null;
};
