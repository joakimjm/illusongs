"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/button";
import { Modal } from "@/components/modal";
import { SplitButton } from "@/components/split-button";

type RequeueJobControlsProps = {
  songId: string;
  verseId: string;
  verseSequence: number;
};

type PromptPreviewPayload = {
  additionalPromptDirection?: string | null;
  basePrompt?: string;
};

const ADDITIONAL_DIRECTION_HEADER = "Ekstra retning for dette vers:";

const buildPromptPreview = (
  basePrompt: string,
  additionalPromptDirection: string,
): string => {
  const normalizedDirection = additionalPromptDirection.trim();
  if (normalizedDirection.length === 0) {
    return basePrompt;
  }

  return [
    basePrompt,
    "",
    ADDITIONAL_DIRECTION_HEADER,
    normalizedDirection,
  ].join("\n");
};

export const RequeueJobControls = ({
  songId,
  verseId,
  verseSequence,
}: RequeueJobControlsProps) => {
  const router = useRouter();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [directionDraft, setDirectionDraft] = useState("");
  const [basePromptPreview, setBasePromptPreview] = useState("");
  const [isPromptPreviewLoading, setIsPromptPreviewLoading] = useState(false);
  const [promptPreviewError, setPromptPreviewError] = useState<string | null>(
    null,
  );

  const closeDialog = () => {
    setIsDialogOpen(false);
    setDirectionDraft("");
    setBasePromptPreview("");
    setPromptPreviewError(null);
    setIsPromptPreviewLoading(false);
  };

  const requeue = async (
    additionalPromptDirection?: string | null,
  ): Promise<boolean> => {
    const hasDirectionUpdate = additionalPromptDirection !== undefined;
    const body = hasDirectionUpdate
      ? JSON.stringify({ additionalPromptDirection })
      : null;

    setError(null);
    setIsSubmitting(true);
    try {
      const response = await fetch(
        `/api/song/${songId}/verse/${verseId}/requeue`,
        {
          method: "POST",
          headers: body ? { "content-type": "application/json" } : undefined,
          body,
        },
      );
      if (!response.ok) {
        const detail = await response.text();
        throw new Error(detail || "Unable to requeue job.");
      }

      router.refresh();
      return true;
    } catch (caught) {
      const message =
        caught instanceof Error ? caught.message : "Unable to requeue job.";
      setError(message);
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  const openDirectionDialog = async (): Promise<void> => {
    setIsDialogOpen(true);
    setDirectionDraft("");
    setBasePromptPreview("");
    setPromptPreviewError(null);
    setIsPromptPreviewLoading(true);

    try {
      const response = await fetch(
        `/api/song/${songId}/verse/${verseId}/requeue`,
      );
      if (!response.ok) {
        const detail = await response.text();
        throw new Error(detail || "Unable to load prompt preview.");
      }

      const payload: PromptPreviewPayload = await response.json();
      if (typeof payload.basePrompt !== "string") {
        throw new Error("Prompt preview is unavailable.");
      }

      setBasePromptPreview(payload.basePrompt);
      setDirectionDraft(
        typeof payload.additionalPromptDirection === "string"
          ? payload.additionalPromptDirection
          : "",
      );
    } catch (caught) {
      const message =
        caught instanceof Error
          ? caught.message
          : "Unable to load prompt preview.";
      setPromptPreviewError(message);
    } finally {
      setIsPromptPreviewLoading(false);
    }
  };

  const saveAndRequeue = async () => {
    const normalizedDirection = directionDraft.trim();
    const success = await requeue(
      normalizedDirection.length > 0 ? normalizedDirection : null,
    );
    if (success) {
      closeDialog();
    }
  };

  const promptPreview =
    basePromptPreview.length > 0
      ? buildPromptPreview(basePromptPreview, directionDraft)
      : "";

  return (
    <>
      <div className="flex flex-col items-end gap-2">
        {error ? (
          <span className="max-w-72 text-right text-xs text-rose-600 dark:text-rose-300">
            {error}
          </span>
        ) : null}
        <SplitButton
          primaryLabel={isSubmitting ? "Requeuing..." : "Requeue"}
          onPrimaryClick={async () => {
            await requeue();
          }}
          toggleAriaLabel={`Open options for verse ${verseSequence}`}
          variant="danger"
          size="xs"
          disabled={isSubmitting}
          items={[
            {
              id: "requeue-with-direction",
              label: "Requeue with added direction",
              onSelect: openDirectionDialog,
            },
          ]}
        />
      </div>

      <Modal
        isOpen={isDialogOpen}
        onClose={closeDialog}
        title={`Requeue verse ${verseSequence} with added direction`}
        description="Used to steer image output. Moderation rules still apply."
        footer={
          <>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={closeDialog}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={() => {
                void saveAndRequeue();
              }}
              disabled={isSubmitting || isPromptPreviewLoading}
            >
              {isSubmitting ? "Requeuing..." : "Save and requeue"}
            </Button>
          </>
        }
      >
        <label className="block space-y-2">
          <span className="text-xs font-medium uppercase tracking-wide text-slate-700 dark:text-slate-200">
            Extra direction (optional)
          </span>
          <textarea
            value={directionDraft}
            onChange={(event) => {
              setDirectionDraft(event.target.value);
            }}
            rows={4}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            placeholder="e.g. No visible text, letters, logos, or signage in the image."
          />
        </label>

        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-700 dark:text-slate-200">
            Full prompt preview
          </p>
          {isPromptPreviewLoading ? (
            <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-950/60 dark:text-slate-300">
              Loading prompt preview...
            </p>
          ) : promptPreviewError ? (
            <p className="rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:border-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
              {promptPreviewError}
            </p>
          ) : (
            <pre className="max-h-72 overflow-auto rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs whitespace-pre-wrap text-slate-800 dark:border-slate-700 dark:bg-slate-950/60 dark:text-slate-100">
              {promptPreview}
            </pre>
          )}
        </div>
      </Modal>
    </>
  );
};
