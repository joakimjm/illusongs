import sharp from "sharp";

const WEBP_QUALITY = 82;
const WEBP_THUMBNAIL_QUALITY = 68;
const WEBP_EFFORT = 6;
const MAX_DIMENSION = 2048;
const THUMBNAIL_MAX_WIDTH = 512;
const THUMBNAIL_MAX_HEIGHT = 768;

export class InvalidVerseIllustrationError extends Error {}

export class VerseIllustrationProcessingError extends Error {}

type ConvertIllustrationInput = {
  imageData: ArrayBuffer;
};

const resizeIfNecessary = (
  instance: sharp.Sharp,
  width: number | undefined,
  height: number | undefined,
): sharp.Sharp => {
  if (!width && !height) {
    return instance;
  }

  const effectiveWidth =
    width && width > MAX_DIMENSION ? MAX_DIMENSION : (width ?? undefined);
  const effectiveHeight =
    height && height > MAX_DIMENSION ? MAX_DIMENSION : (height ?? undefined);

  if (!effectiveWidth && !effectiveHeight) {
    return instance;
  }

  return instance.resize({
    width: effectiveWidth,
    height: effectiveHeight,
    fit: "inside",
    withoutEnlargement: true,
  });
};

const createSharpInstance = (input: ConvertIllustrationInput): sharp.Sharp => {
  const buffer = Buffer.from(input.imageData);
  return sharp(buffer, { failOn: "error" });
};

const ensureValidImage = async (
  image: sharp.Sharp,
): Promise<{ instance: sharp.Sharp; metadata: sharp.Metadata }> => {
  const metadata = await image.metadata();

  if (!metadata.format || metadata.format.length === 0) {
    throw new InvalidVerseIllustrationError(
      "Provided file is not a supported image.",
    );
  }

  return { instance: image, metadata };
};

const handleProcessingError = (error: unknown): never => {
  if (
    error instanceof InvalidVerseIllustrationError ||
    (error instanceof Error &&
      error.message.toLowerCase().includes("unsupported image"))
  ) {
    throw new InvalidVerseIllustrationError(
      "Provided file is not a supported image.",
    );
  }

  throw new VerseIllustrationProcessingError(
    "Failed to process verse illustration.",
  );
};

export const convertIllustrationToWebp = async (
  input: ConvertIllustrationInput,
): Promise<Uint8Array> => {
  try {
    const { instance, metadata } = await ensureValidImage(
      createSharpInstance(input),
    );
    const prepared = resizeIfNecessary(
      instance,
      metadata.width,
      metadata.height,
    );

    const webpBuffer = await prepared
      .webp({
        effort: WEBP_EFFORT,
        quality: WEBP_QUALITY,
        smartSubsample: true,
        nearLossless: false,
      })
      .toBuffer();

    return new Uint8Array(webpBuffer);
  } catch (error) {
    return handleProcessingError(error);
  }
};

export const createIllustrationThumbnail = async (
  input: ConvertIllustrationInput,
): Promise<Uint8Array> => {
  try {
    const { instance } = await ensureValidImage(createSharpInstance(input));

    const thumbnailBuffer = await instance
      .resize({
        width: THUMBNAIL_MAX_WIDTH,
        height: THUMBNAIL_MAX_HEIGHT,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({
        effort: WEBP_EFFORT,
        quality: WEBP_THUMBNAIL_QUALITY,
        smartSubsample: true,
        nearLossless: false,
      })
      .toBuffer();

    return new Uint8Array(thumbnailBuffer);
  } catch (error) {
    return handleProcessingError(error);
  }
};
