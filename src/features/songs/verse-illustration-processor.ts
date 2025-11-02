import sharp from "sharp";

const WEBP_QUALITY = 82;
const WEBP_EFFORT = 6;
const MAX_DIMENSION = 2048;

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

export const convertIllustrationToWebp = async (
  input: ConvertIllustrationInput,
): Promise<Uint8Array> => {
  const buffer = Buffer.from(input.imageData);

  try {
    const baseImage = sharp(buffer, { failOn: "error" });
    const metadata = await baseImage.metadata();

    if (!metadata.format || metadata.format.length === 0) {
      throw new InvalidVerseIllustrationError(
        "Provided file is not a supported image.",
      );
    }

    const prepared = resizeIfNecessary(
      baseImage,
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
  }
};
