export type SongSummaryDto = {
  id: string;
  slug: string;
  title: string;
  languageCode: string;
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
