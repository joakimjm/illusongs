export type SongSummaryDto = {
  id: string;
  slug: string;
  title: string;
  languageCode: string;
  coverImageUrl: string | null;
  createdAt: string;
  updatedAt: string;
  tags: string[];
};

export type SongVerseDto = {
  id: string;
  sequenceNumber: number;
  lyricText: string;
  illustrationUrl: string | null;
  createdAt: string;
  updatedAt: string;
};

export type SongDetailDto = SongSummaryDto & {
  isPublished: boolean;
  verses: SongVerseDto[];
};

export type CreateSongVerseInput = {
  sequenceNumber: number;
  lyricText: string;
  illustrationUrl: string | null;
};

export type CreateSongInput = {
  slug: string;
  title: string;
  languageCode: string;
  isPublished: boolean;
  tags: string[];
  verses: CreateSongVerseInput[];
};
