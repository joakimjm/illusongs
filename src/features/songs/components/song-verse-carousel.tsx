"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
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
};

export const SongVerseCarousel = ({
  songTitle,
  verses,
}: SongVerseCarouselProps) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const verseRefs = useRef<(HTMLElement | null)[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const router = useRouter();
  const [isImageFocusMode, setIsImageFocusMode] = useState(false);

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
    router.push("/");
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
          return (
            <button
              type="button"
              key={verse.id}
              ref={(element) => {
                verseRefs.current[index] = element;
              }}
              aria-pressed={isImageFocusMode}
              onClick={() => setIsImageFocusMode((value) => !value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  setIsImageFocusMode((value) => !value);
                }
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
              <div
                className={`relative z-10 flex w-full flex-col gap-6 px-6 pb-28 pt-24 sm:px-12 duration-500 transition-opacity ${isImageFocusMode ? "opacity-0" : ""}`}
              >
                <p className="select-none text-left whitespace-pre-line text-lg leading-6 text-white drop-shadow-[0_4px_24px_rgba(0,0,0,0.6)]">
                  {verse.lyricText}
                </p>
              </div>
            </button>
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
    </div>
  );
};
