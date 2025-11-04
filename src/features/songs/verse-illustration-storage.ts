import { randomUUID } from "node:crypto";
import { getRequiredConfigValue } from "@/config";
import { getSupabaseStorageClient } from "@/features/supabase/storage-access-client";

const VERSE_ILLUSTRATION_BUCKET_KEY = "SUPABASE_VERSE_ILLUSTRATIONS_BUCKET";
const DEFAULT_VERSE_ILLUSTRATION_BUCKET = "verse-illustrations";
const CACHE_CONTROL_SECONDS = "31536000";

type IllustrationVariant = "main" | "thumbnail";

const sanitizeStorageSegment = (value: string): string =>
  value.replaceAll(/[^a-zA-Z0-9-]/g, "-").toLowerCase();

const createIllustrationObjectName = (variant: IllustrationVariant): string => {
  const timestamp = new Date().toISOString().replaceAll(/[:.]/g, "-");
  const suffix = randomUUID().slice(0, 8);
  const prefix = variant === "thumbnail" ? "thumb" : "main";
  return `${prefix}-${timestamp}-${suffix}.webp`;
};

export const getVerseIllustrationsBucketName = (): string =>
  getRequiredConfigValue(
    VERSE_ILLUSTRATION_BUCKET_KEY,
    DEFAULT_VERSE_ILLUSTRATION_BUCKET,
  );

export const buildVerseIllustrationObjectPath = (
  songId: string,
  verseId: string,
  variant: IllustrationVariant = "main",
): string => {
  const normalizedSongId = sanitizeStorageSegment(songId);
  const normalizedVerseId = sanitizeStorageSegment(verseId);

  return `${normalizedSongId}/${normalizedVerseId}/${createIllustrationObjectName(
    variant,
  )}`;
};

export class VerseIllustrationUploadError extends Error {}
export class VerseIllustrationDeletionError extends Error {}

type UploadVerseIllustrationImageInput = {
  songId: string;
  verseId: string;
  image: Uint8Array;
  variant?: IllustrationVariant;
};

export const uploadVerseIllustrationImage = async (
  input: UploadVerseIllustrationImageInput,
): Promise<{ publicUrl: string; path: string }> => {
  const client = getSupabaseStorageClient();
  const bucket = getVerseIllustrationsBucketName();
  const objectPath = buildVerseIllustrationObjectPath(
    input.songId,
    input.verseId,
    input.variant ?? "main",
  );

  const { error: uploadError } = await client.storage
    .from(bucket)
    .upload(objectPath, input.image, {
      contentType: "image/webp",
      cacheControl: CACHE_CONTROL_SECONDS,
      upsert: false,
    });

  if (uploadError) {
    throw new VerseIllustrationUploadError(
      `Failed to upload verse illustration: ${uploadError.message}`,
    );
  }

  const { data: publicUrlData } = client.storage
    .from(bucket)
    .getPublicUrl(objectPath);

  const publicUrl = publicUrlData?.publicUrl;
  if (!publicUrl) {
    throw new VerseIllustrationUploadError(
      "Supabase did not return a verse illustration URL.",
    );
  }

  return {
    publicUrl,
    path: objectPath,
  };
};

export const getVerseIllustrationPublicUrl = (
  path: string | null,
): string | null => {
  if (!path || path.trim().length === 0) {
    return null;
  }

  const client = getSupabaseStorageClient();
  const bucket = getVerseIllustrationsBucketName();
  const { data } = client.storage.from(bucket).getPublicUrl(path);
  return data?.publicUrl ?? null;
};

export const deleteVerseIllustrationImage = async (
  path: string | null,
): Promise<void> => {
  const client = getSupabaseStorageClient();
  const bucket = getVerseIllustrationsBucketName();

  if (!path || path.trim().length === 0) {
    return;
  }

  const { error } = await client.storage.from(bucket).remove([path]);

  if (error) {
    throw new VerseIllustrationDeletionError(
      `Failed to delete verse illustration: ${error.message}`,
    );
  }
};
