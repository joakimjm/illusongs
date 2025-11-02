import type {
  SongDetailDto,
  SongSummaryDto,
  SongVerseDto,
} from "@/features/songs/song-types";
import type {
  SongSto,
  SongSummarySto,
  SongTagSto,
  SongVerseSto,
} from "./song-stos";

export const mapSongSummaryStoToDto = (
  song: SongSummarySto,
): SongSummaryDto => ({
  id: song.id,
  slug: song.slug,
  title: song.title,
  languageCode: song.language_code,
  createdAt: song.created_at.toISOString(),
  updatedAt: song.updated_at.toISOString(),
  tags: [...song.tag_names],
});

export const mapSongVerseStoToDto = (verse: SongVerseSto): SongVerseDto => ({
  id: verse.id,
  sequenceNumber: verse.sequence_number,
  lyricText: verse.lyric_text,
  illustrationUrl: verse.illustration_url,
  createdAt: verse.created_at.toISOString(),
  updatedAt: verse.updated_at.toISOString(),
});

export const mapSongStoToDetailDto = (
  song: SongSto,
  tags: readonly SongTagSto[],
  verses: readonly SongVerseSto[],
): SongDetailDto => ({
  ...mapSongSummaryStoToDto({
    ...song,
    tag_names: tags.map((tag) => tag.tag_name),
  }),
  isPublished: song.is_published,
  verses: verses.map(mapSongVerseStoToDto),
});
