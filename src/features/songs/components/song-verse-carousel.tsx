"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/button";
import { Modal } from "@/components/modal";
import { SplitButton } from "@/components/split-button";
import type { SongVerseDto } from "@/features/songs/song-types";

const HomeIcon = () => (
  <svg
    aria-hidden
    focusable="false"
    viewBox="0 0 24 24"
    className="h-6 w-6"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.8}
  >
    <title>Forside</title>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M3 10.5 12 3l9 7.5v9.5a1.5 1.5 0 0 1-1.5 1.5h-5V15h-6v6.5H4.5A1.5 1.5 0 0 1 3 20V10.5Z"
    />
  </svg>
);

const ArrowIcon = ({ direction }: { readonly direction: "left" | "right" }) => (
  <svg
    aria-hidden
    focusable="false"
    viewBox="0 0 24 24"
    className="h-6 w-6"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.8}
  >
    <title>{direction === "left" ? "Forrige vers" : "Næste vers"}</title>
    {direction === "left" ? (
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 5 8 12l7 7" />
    ) : (
      <path strokeLinecap="round" strokeLinejoin="round" d="m9 5 7 7-7 7" />
    )}
  </svg>
);

type SongVerseCarouselProps = {
  readonly songTitle: string;
  readonly verses: SongVerseDto[];
  readonly enableRequeue?: boolean;
  readonly songId?: string;
  readonly songSlug?: string;
};

type PromptPreviewPayload = {
  additionalPromptDirection?: string | null;
  basePrompt?: string;
  fullPrompt?: string;
};

type DirectionModalVerse = {
  id: string;
  sequenceNumber: number;
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

export const SongVerseCarousel = ({
  songTitle,
  verses,
  enableRequeue = false,
  songId,
  songSlug,
}: SongVerseCarouselProps) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const verseRefs = useRef<(HTMLElement | null)[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const router = useRouter();
  const [isImageFocusMode, setIsImageFocusMode] = useState(false);
  const [pendingRequeueId, setPendingRequeueId] = useState<string | null>(null);
  const [requeueError, setRequeueError] = useState<string | null>(null);
  const [directionModalVerse, setDirectionModalVerse] =
    useState<DirectionModalVerse | null>(null);
  const [directionDraft, setDirectionDraft] = useState("");
  const [basePromptPreview, setBasePromptPreview] = useState("");
  const [isPromptPreviewLoading, setIsPromptPreviewLoading] = useState(false);
  const [promptPreviewError, setPromptPreviewError] = useState<string | null>(
    null,
  );

  useEffect(() => {
    const container = containerRef.current;
    verseRefs.current = verseRefs.current.slice(0, verses.length);
    const elements = verseRefs.current.filter(
      (element): element is HTMLElement => element !== null,
    );

    if (!container || elements.length === 0) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

        if (visible?.target instanceof HTMLElement) {
          const index = elements.indexOf(visible.target);
          if (index >= 0) {
            setActiveIndex(index);
          }
        }
      },
      {
        root: container,
        threshold: [0.55, 0.75, 0.9],
      },
    );

    elements.forEach((element) => {
      observer.observe(element);
    });

    return () => {
      observer.disconnect();
    };
  }, [verses]);

  const scrollToIndex = (index: number) => {
    const container = containerRef.current;
    const target = verseRefs.current[index];
    if (!container || !target) {
      return;
    }

    container.scrollTo({
      left: target.offsetLeft,
      behavior: "smooth",
    });
  };

  const handlePrevious = () => {
    if (activeIndex > 0) {
      scrollToIndex(activeIndex - 1);
    }
  };

  const handleNext = () => {
    if (activeIndex < verses.length - 1) {
      scrollToIndex(activeIndex + 1);
    }
  };

  const handleHome = () => {
    router.back();
  };

  const handleRequeue = async (
    verseId: string,
    additionalPromptDirection?: string | null,
  ): Promise<boolean> => {
    if (!enableRequeue || !songId) {
      return false;
    }

    setPendingRequeueId(verseId);
    setRequeueError(null);

    const hasDirectionUpdate = additionalPromptDirection !== undefined;
    const body = hasDirectionUpdate
      ? JSON.stringify({
          additionalPromptDirection,
        })
      : null;

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
        throw new Error(detail || "Failed to requeue");
      }
      router.refresh();
      return true;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to requeue";
      setRequeueError(message);
      return false;
    } finally {
      setPendingRequeueId(null);
    }
  };

  const closeDirectionModal = () => {
    setDirectionModalVerse(null);
    setDirectionDraft("");
    setBasePromptPreview("");
    setPromptPreviewError(null);
    setIsPromptPreviewLoading(false);
  };

  useEffect(() => {
    if (!directionModalVerse) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setDirectionModalVerse(null);
        setDirectionDraft("");
        setBasePromptPreview("");
        setPromptPreviewError(null);
        setIsPromptPreviewLoading(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [directionModalVerse]);

  const openDirectionModal = async (verse: SongVerseDto): Promise<void> => {
    if (!enableRequeue || !songId) {
      return;
    }

    setDirectionModalVerse({
      id: verse.id,
      sequenceNumber: verse.sequenceNumber,
    });
    setDirectionDraft("");
    setBasePromptPreview("");
    setPromptPreviewError(null);
    setIsPromptPreviewLoading(true);

    try {
      const response = await fetch(
        `/api/song/${songId}/verse/${verse.id}/requeue`,
      );
      if (!response.ok) {
        const detail = await response.text();
        throw new Error(detail || "Failed to load prompt preview");
      }

      const payload: PromptPreviewPayload = await response.json();
      if (typeof payload.basePrompt !== "string") {
        throw new Error("Prompt preview is unavailable for this verse.");
      }

      setBasePromptPreview(payload.basePrompt);
      setDirectionDraft(
        typeof payload.additionalPromptDirection === "string"
          ? payload.additionalPromptDirection
          : "",
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to load prompt preview";
      setPromptPreviewError(message);
    } finally {
      setIsPromptPreviewLoading(false);
    }
  };

  const handleDirectionRequeue = async () => {
    if (!directionModalVerse) {
      return;
    }

    const normalizedDirection = directionDraft.trim();
    const success = await handleRequeue(
      directionModalVerse.id,
      normalizedDirection.length > 0 ? normalizedDirection : null,
    );

    if (success) {
      closeDirectionModal();
    }
  };

  const progressDots = verses.map((_verse, index) => (
    <span
      key={_verse.id}
      className={`h-1.5 w-6 rounded-full transition ${
        index === activeIndex
          ? "bg-[rgba(255,214,142,0.95)]"
          : "bg-[rgba(255,255,255,0.35)]"
      }`}
    />
  ));

  const previewPrompt =
    basePromptPreview.length > 0
      ? buildPromptPreview(basePromptPreview, directionDraft)
      : "";

  return (
    <div className="relative flex h-dvh flex-col bg-black text-white">
      <header className="pointer-events-none absolute left-0 right-0 top-0 z-30 flex items-center justify-end px-6 pt-6">
        <div className="flex items-center gap-2">{progressDots}</div>
      </header>

      <section
        ref={containerRef}
        className="flex h-full snap-x snap-mandatory overflow-x-scroll overscroll-x-none"
        aria-label={`Illustration carousel for ${songTitle}`}
      >
        {verses.map((verse, index) => {
          const hasImage = verse.illustrationUrl !== null;
          const isPendingRequeue = pendingRequeueId === verse.id;

          return (
            <div
              key={verse.id}
              ref={(element) => {
                verseRefs.current[index] = element;
              }}
              className="relative flex h-full w-full shrink-0 snap-center items-end"
            >
              {hasImage ? (
                <>
                  {/* biome-ignore lint/performance/noImgElement: Carousel slides need raw <img> to avoid layout shifts with dynamic content */}
                  <img
                    src={verse.illustrationUrl ?? ""}
                    alt=""
                    aria-hidden
                    loading="lazy"
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                </>
              ) : (
                <div className="absolute inset-0 bg-linear-to-br from-stone-900/80 via-stone-800/80 to-stone-900/90" />
              )}

              <div
                className={`absolute inset-0 bg-linear-to-b from-transparent via-[rgba(15,10,5,0.2)] to-[rgba(10,6,3,0.75)] duration-500 transition-opacity ${isImageFocusMode ? "opacity-0" : ""}`}
              />
              <button
                type="button"
                aria-pressed={isImageFocusMode}
                aria-label={`Toggle image focus for verse ${verse.sequenceNumber}`}
                onClick={() => setIsImageFocusMode((value) => !value)}
                className="absolute inset-0 z-10 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-200/60"
              >
                <span className="sr-only">
                  {`Toggle image focus for verse ${verse.sequenceNumber}`}
                </span>
              </button>
              <div
                className={`pointer-events-none relative flex w-full flex-col gap-6 px-6 pb-28 pt-24 sm:px-12 duration-500 transition-opacity ${isImageFocusMode ? "opacity-0" : ""}`}
              >
                <p className="select-none text-left whitespace-pre-line text-lg leading-6 text-white drop-shadow-[0_4px_24px_rgba(0,0,0,0.6)]">
                  {verse.lyricText}
                </p>
                {enableRequeue ? (
                  <div className="pointer-events-auto flex items-center justify-between text-xs text-white/80">
                    <div className="rounded-full border border-white/20 bg-black/40 px-3 py-1 uppercase tracking-wide">
                      Preview tools
                    </div>
                    <div className="flex items-center gap-2">
                      {requeueError ? (
                        <span className="text-rose-300">{requeueError}</span>
                      ) : null}
                      <SplitButton
                        primaryLabel={
                          isPendingRequeue ? "Requeuing..." : "Requeue"
                        }
                        onPrimaryClick={async () => {
                          await handleRequeue(verse.id);
                        }}
                        toggleAriaLabel={`Open requeue options for verse ${verse.sequenceNumber}`}
                        disabled={isPendingRequeue || !songId || !songSlug}
                        variant="secondary"
                        size="xs"
                        items={[
                          {
                            id: "requeue-with-direction",
                            label: "Requeue with added direction",
                            onSelect: async () => {
                              await openDirectionModal(verse);
                            },
                          },
                        ]}
                      />
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          );
        })}
      </section>

      <footer className="pointer-events-none absolute inset-x-0 bottom-8 z-30 flex items-center justify-between px-6">
        <button
          type="button"
          onClick={handleHome}
          aria-label="Til forsiden"
          className="pointer-events-auto flex h-12 w-12 items-center justify-center rounded-full bg-[rgba(18,12,6,0.55)] text-white transition hover:bg-white/25 focus:outline-none focus-visible:ring focus-visible:ring-amber-200/60 backdrop-blur-xl"
        >
          <HomeIcon />
        </button>
        <div
          className="pointer-events-none flex flex-col items-center gap-2 text-center"
          aria-hidden
        />
        <div className="pointer-events-auto flex items-center gap-2 rounded-full bg-[rgba(18,12,6,0.55)] p-3 backdrop-blur-xl">
          <button
            type="button"
            onClick={handlePrevious}
            aria-label="Forrige vers"
            disabled={activeIndex === 0}
            className={`flex h-12 w-12 items-center justify-center rounded-full text-white transition focus:outline-none focus-visible:ring focus-visible:ring-amber-200/60 ${
              activeIndex === 0
                ? "bg-white/10 text-white/40"
                : "bg-white/15 hover:bg-white/25"
            }`}
          >
            <ArrowIcon direction="left" />
          </button>
          <button
            type="button"
            onClick={handleNext}
            aria-label="Næste vers"
            disabled={activeIndex >= verses.length - 1}
            className={`flex h-12 w-12 items-center justify-center rounded-full text-white transition focus:outline-none focus-visible:ring focus-visible:ring-amber-200/60 ${
              activeIndex >= verses.length - 1
                ? "bg-white/10 text-white/40"
                : "bg-white/15 hover:bg-white/25"
            }`}
          >
            <ArrowIcon direction="right" />
          </button>
        </div>
      </footer>

      <Modal
        isOpen={directionModalVerse !== null}
        onClose={closeDirectionModal}
        title={
          directionModalVerse
            ? `Requeue verse ${directionModalVerse.sequenceNumber} with added direction`
            : "Requeue verse with added direction"
        }
        description="Used to steer image output. Moderation rules still apply."
        panelClassName="border-white/20 bg-stone-950 text-white dark:border-white/20 dark:bg-stone-950 dark:text-white"
        footer={
          <>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={closeDirectionModal}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={() => {
                void handleDirectionRequeue();
              }}
              disabled={isPromptPreviewLoading || pendingRequeueId !== null}
            >
              {pendingRequeueId === directionModalVerse?.id
                ? "Requeuing..."
                : "Save and requeue"}
            </Button>
          </>
        }
      >
        <label className="block space-y-2">
          <span className="text-xs font-medium uppercase tracking-wide text-white/80">
            Extra direction (optional)
          </span>
          <textarea
            value={directionDraft}
            onChange={(event) => {
              setDirectionDraft(event.target.value);
            }}
            rows={4}
            className="w-full rounded-lg border border-white/20 bg-black/50 px-3 py-2 text-sm text-white shadow-sm outline-none transition focus:border-amber-300 focus:ring-2 focus:ring-amber-200/40"
            placeholder="e.g. No visible text, letters, logos, or signage in the image."
          />
        </label>

        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-white/80">
            Full prompt preview
          </p>
          {isPromptPreviewLoading ? (
            <p className="rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-xs text-white/70">
              Loading prompt preview...
            </p>
          ) : promptPreviewError ? (
            <p className="rounded-lg border border-rose-400/40 bg-rose-950/30 px-3 py-2 text-xs text-rose-200">
              {promptPreviewError}
            </p>
          ) : (
            <pre className="max-h-72 overflow-auto rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-xs whitespace-pre-wrap text-white/90">
              {previewPrompt}
            </pre>
          )}
        </div>
      </Modal>
    </div>
  );
};
