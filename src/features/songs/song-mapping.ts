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
  coverImageUrl: song.cover_image_url,
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
  id: song.id,
  slug: song.slug,
  title: song.title,
  languageCode: song.language_code,
  coverImageUrl:
    verses.find((verse) => verse.illustration_url)?.illustration_url ?? null,
  createdAt: song.created_at.toISOString(),
  updatedAt: song.updated_at.toISOString(),
  tags: tags.map((tag) => tag.tag_name),
  isPublished: song.is_published,
  verses: verses.map(mapSongVerseStoToDto),
});
