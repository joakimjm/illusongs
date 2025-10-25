import rawSongs from "@/../public/songs.json";

type JsonPrimitive = string | number | boolean | null;
type JsonObject = { readonly [key: string]: JsonValue | undefined };
type JsonValue = JsonPrimitive | JsonValue[] | JsonObject;

export type SongVerseIllustration = {
  readonly src: string;
  readonly alt: string;
};

export type SongVerse = {
  readonly id: number;
  readonly text: string;
  readonly illustration: SongVerseIllustration;
};

export type Song = {
  readonly id: string;
  readonly title: string;
  readonly verses: ReadonlyArray<SongVerse>;
  readonly tags: ReadonlyArray<string>;
};

type SongVerseDocument = {
  readonly id: number;
  readonly text: string;
  readonly illustration: string;
};

type SongDocument = {
  readonly id: string;
  readonly title: string;
  readonly verses: ReadonlyArray<SongVerseDocument>;
  readonly tags: ReadonlyArray<string>;
  readonly illustration?: string; // future top-level illustration support
};

const isJsonObject = (value: JsonValue | undefined): value is JsonObject =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isJsonArray = (value: JsonValue | undefined): value is JsonValue[] =>
  Array.isArray(value);

const isJsonString = (value: JsonValue | undefined): value is string =>
  typeof value === "string";

const isJsonNumber = (value: JsonValue | undefined): value is number =>
  typeof value === "number" && Number.isFinite(value);

const ensureString = (
  value: JsonValue | undefined,
  message: string,
): string => {
  if (!isJsonString(value)) {
    throw new Error(message);
  }

  return value;
};

const ensureNumber = (
  value: JsonValue | undefined,
  message: string,
): number => {
  if (!isJsonNumber(value)) {
    throw new Error(message);
  }

  return value;
};

const parseSongVerseDocument = (value: JsonValue): SongVerseDocument => {
  if (!isJsonObject(value)) {
    throw new Error("Each verse must be an object");
  }

  const id = ensureNumber(value.id, "Verse id must be a number");
  const text = ensureString(value.text, "Verse text must be a string");
  const illustration = ensureString(
    value.illustration,
    "Verse illustration must be a string",
  );

  return { id, text, illustration };
};

const parseSongDocument = (value: JsonValue): SongDocument => {
  if (!isJsonObject(value)) {
    throw new Error("Each song must be an object");
  }

  const id = ensureString(value.id, "Song id must be a string");
  const title = ensureString(value.title, "Song title must be a string");
  const versesValue = value.verses;
  const tagsValue = value.tags;

  if (!isJsonArray(versesValue)) {
    throw new Error("Song verses must be an array");
  }

  if (!isJsonArray(tagsValue)) {
    throw new Error("Song tags must be an array");
  }

  const verses = versesValue.map((verse) => parseSongVerseDocument(verse));
  const tags = tagsValue.map((tagValue, index) => {
    if (!isJsonString(tagValue)) {
      throw new Error(`Song tag at index ${index} must be a string`);
    }
    return tagValue.toLowerCase();
  });

  return {
    id,
    title,
    verses,
    tags,
  };
};

const toSongVerse =
  (songTitle: string) =>
  (verse: SongVerseDocument): SongVerse => ({
    id: verse.id,
    text: verse.text,
    illustration: {
      src: verse.illustration,
      alt: `Vers ${verse.id} illustration til ${songTitle}`,
    },
  });

const toSong = (songDocument: SongDocument): Song => ({
  id: songDocument.id,
  title: songDocument.title,
  verses: songDocument.verses.map((verse) =>
    toSongVerse(songDocument.title)(verse),
  ),
  tags: songDocument.tags,
});

const parseSongCollection = (
  value: JsonValue | undefined,
): ReadonlyArray<Song> => {
  if (!isJsonArray(value)) {
    throw new Error("Songs document must be an array");
  }

  return value.map((songValue) => toSong(parseSongDocument(songValue)));
};

const songsDocument: JsonValue | undefined = rawSongs;

const songs: ReadonlyArray<Song> = parseSongCollection(songsDocument);

export const listSongs = (): ReadonlyArray<Song> => songs;

export const getSongById = (songId: string): Song | undefined =>
  songs.find((song) => song.id === songId);
