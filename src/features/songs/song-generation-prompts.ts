import type { SongDetailDto, SongVerseDto } from "@/features/songs/song-types";

export const ART_STYLE_BLOCK = [
  "Illustrerer med følgende stil: Vintage børnebogsillustration fra 1960’erne/70’erne,",
  "malet i gouache/akvarel med synlige penselstrøg og mat papirtekstur.",
  "Surrealistiske og humoristiske scener med overdrevne figurer, ekspressive,",
  "som udgangspunkt smilende ansigter (med mindre andet er passende i historien)",
  "og kaotisk energi.",
  "Dæmpede jordfarver kombineret med stærke kontraster.",
  "Tableau-komposition fyldt med små detaljer og flere handlingsspor.",
  "Stemning: barnlig og grotesk på samme tid, satirisk, absurd og anarkistisk.",
  "Ingen tekst på illustrationen.",
  "Karakterer refereres til i flere vers skal være konsistente.",
  "Dimensions must be 1024 x 1536, tall, 2:3 aspect ratio.",
].join("\n");

const joinVerses = (verses: readonly SongVerseDto[]): string =>
  verses.map((verse) => verse.lyricText.trim()).join("\n\n");

export const createInitialSongIllustrationPrompt = (
  song: SongDetailDto,
): string => {
  if (song.verses.length === 0) {
    throw new Error("Song requires at least one verse to build prompt.");
  }

  const versesText = joinVerses(song.verses);
  const firstVerse = song.verses[0]?.lyricText ?? "";

  return [
    "Her er en sang:",
    "",
    song.title,
    "",
    versesText,
    "",
    ART_STYLE_BLOCK,
    "",
    "Lav en illustration af første vers:",
    "",
    firstVerse.trim(),
  ]
    .filter((segment) => segment !== undefined)
    .join("\n");
};

export const createNextVerseIllustrationPrompt = (
  verse: SongVerseDto,
): string =>
  [
    "Illustrer næste vers i samme stil og dimensioner:",
    "",
    verse.lyricText.trim(),
  ].join("\n");
