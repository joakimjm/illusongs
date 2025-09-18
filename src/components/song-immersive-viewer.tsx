"use client";

import { Schoolbell } from "next/font/google";
import Image from "next/image";
import Link from "next/link";
import {
  type PointerEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  HiHome,
  HiOutlineArrowLeft,
  HiOutlineArrowRight,
} from "react-icons/hi2";

import PillButton from "@/components/pill-button";
import type { Song } from "@/data/songs";

const schoolbell = Schoolbell({
  subsets: ["latin"],
  weight: "400",
});

type SongImmersiveViewerProps = {
  readonly song: Song;
};

type PointerSnapshot = {
  readonly pointerId: number;
  readonly startX: number;
};

const SWIPE_THRESHOLD_PX = 56;

const SongImmersiveViewer = ({ song }: SongImmersiveViewerProps) => {
  const verses = useMemo(() => song.verses, [song.verses]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const pointerSnapshot = useRef<PointerSnapshot | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);

  const goNext = useCallback(() => {
    setActiveIndex((previousIndex) => {
      const lastIndex = verses.length - 1;

      if (lastIndex <= 0 || previousIndex >= lastIndex) {
        return previousIndex;
      }

      return previousIndex + 1;
    });
  }, [verses.length]);

  const goPrevious = useCallback(() => {
    setActiveIndex((previousIndex) => {
      if (previousIndex <= 0) {
        return previousIndex;
      }

      return previousIndex - 1;
    });
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowRight") {
        event.preventDefault();
        goNext();
      }

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        goPrevious();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [goNext, goPrevious]);

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    pointerSnapshot.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
    };

    setDragOffset(0);
    setIsDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
    event.preventDefault();
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const snapshot = pointerSnapshot.current;

    if (snapshot === null || snapshot.pointerId !== event.pointerId) {
      return;
    }

    setDragOffset(event.clientX - snapshot.startX);
    event.preventDefault();
  };

  const releasePointer = (event: PointerEvent<HTMLDivElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const resetDrag = (event: PointerEvent<HTMLDivElement>) => {
    pointerSnapshot.current = null;
    setDragOffset(0);
    setIsDragging(false);
    releasePointer(event);
  };

  const handlePointerEnd = (event: PointerEvent<HTMLDivElement>) => {
    const snapshot = pointerSnapshot.current;

    if (snapshot === null || snapshot.pointerId !== event.pointerId) {
      return;
    }

    const deltaX = event.clientX - snapshot.startX;

    if (Math.abs(deltaX) >= SWIPE_THRESHOLD_PX) {
      if (deltaX < 0 && activeIndex < verses.length - 1) {
        goNext();
      }

      if (deltaX > 0 && activeIndex > 0) {
        goPrevious();
      }
    }

    resetDrag(event);
  };

  const handlePointerCancel = (event: PointerEvent<HTMLDivElement>) => {
    const snapshot = pointerSnapshot.current;

    if (snapshot !== null && snapshot.pointerId === event.pointerId) {
      resetDrag(event);
    }
  };

  if (verses.length === 0) {
    return null;
  }

  const containerWidth = stageRef.current?.clientWidth ?? 0;
  const dragOffsetPercent =
    containerWidth === 0 ? 0 : (dragOffset / containerWidth) * 100;
  const totalVerses = verses.length;
  const hasPrevious = totalVerses > 0 && activeIndex > 0;
  const hasNext = totalVerses > 0 && activeIndex < totalVerses - 1;

  return (
    <div className="relative flex w-full flex-1 flex-col">
      <section
        ref={stageRef}
        className="relative flex min-h-[100dvh] flex-1 overflow-hidden touch-pan-y"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        onPointerCancel={handlePointerCancel}
        onPointerLeave={handlePointerEnd}
        aria-roledescription="carousel"
        aria-label={`Vers fra ${song.title}`}
      >
        {verses.map((verse, index) => {
          const rawOffset = index - activeIndex;
          const half = Math.floor(totalVerses / 2);
          const shortestOffset =
            rawOffset > half
              ? rawOffset - totalVerses
              : rawOffset < -half
                ? rawOffset + totalVerses
                : rawOffset;
          const isActive = shortestOffset === 0;
          const translateXPercent = isActive
            ? dragOffsetPercent
            : shortestOffset * 100;
          const opacity = isActive
            ? 1
            : Math.abs(shortestOffset) === 1
              ? 0.3
              : 0;

          return (
            <article
              key={verse.id}
              className="absolute inset-0"
              aria-hidden={!isActive}
              style={{
                transform: `translateX(${translateXPercent}%)`,
                opacity,
                transition:
                  isDragging && isActive
                    ? "none"
                    : "transform 500ms ease, opacity 400ms ease",
              }}
            >
              <div className="relative flex h-full w-full flex-col justify-end overflow-hidden">
                <div className="absolute inset-0 overflow-hidden">
                  <Image
                    src={verse.illustration.src}
                    alt=""
                    fill
                    priority={index === 0}
                    sizes="100vw"
                    className="object-cover scale-200 blur-2xl"
                  />
                </div>
                <div className="pointer-events-none absolute inset-0" />
                <div className="relative flex h-full flex-col justify-center">
                  <figure className="flex flex-1 items-start justify-center">
                    <Image
                      src={verse.illustration.src}
                      alt={verse.illustration.alt}
                      width={1600}
                      height={1200}
                      priority={index === 0}
                      className="w-full object-contain"
                      sizes="100vw"
                    />
                  </figure>
                  <div className="z-0 pt-20 pb-24 backdrop-blur-fade-top-to-bottom absolute bottom-0 w-full">
                    <div className="flex">
                      <div className="w-full px-6 text-slate-100">
                        <p
                          className={`${schoolbell.className} whitespace-pre-line text-lg leading-relaxed text-slate-100 sm:text-2xl`}
                        >
                          {verse.text}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </article>
          );
        })}
        <div
          aria-hidden
          className="pointer-events-none absolute right-4 flex items-center gap-3 text-white"
          style={{
            top: "calc(env(safe-area-inset-top, 0px) + 1rem)",
            right: "calc(env(safe-area-inset-right, 0px) + 1rem)",
          }}
        >
          {verses.map((verse, index) => (
            <span
              key={verse.id}
              className={`h-2.5 w-2.5 rounded-full border border-white/40 transition ${index === activeIndex
                ? "bg-amber-300 shadow-[0_0_0_8px_rgba(252,211,77,0.35)]"
                : "bg-transparent"
                }`}
            />
          ))}
        </div>
        <div
          className="absolute bottom-0 z-10 mt-6 flex w-full items-center justify-between gap-3 px-3 text-white sm:px-6"
          style={{
            paddingBottom: "calc(env(safe-area-inset-bottom, 0px))",
            paddingLeft: "calc(env(safe-area-inset-left, 0px) + 0.75rem)",
            paddingRight: "calc(env(safe-area-inset-right, 0px) + 0.75rem)",
          }}
        >
          <PillButton
            as={Link}
            href="/"
            aria-label="Til forsiden"
            className="px-4 text-xl"
          >
            <HiHome aria-hidden className="h-6 w-6" />
            <span className="sr-only">Til forsiden</span>
          </PillButton>
          <div className="flex items-center gap-3">
            <PillButton
              type="button"
              onClick={goPrevious}
              aria-label="Forrige vers"
              disabled={!hasPrevious}
              className="px-4 text-xl disabled:opacity-40"
            >
              <HiOutlineArrowLeft aria-hidden className="h-6 w-6" />
              <span className="sr-only">Forrige vers</span>
            </PillButton>
            <PillButton
              type="button"
              onClick={goNext}
              aria-label="Næste vers"
              disabled={!hasNext}
              className="px-4 text-xl disabled:opacity-40"
            >
              <HiOutlineArrowRight aria-hidden className="h-6 w-6" />
              <span className="sr-only">Næste vers</span>
            </PillButton>
          </div>
        </div>
      </section>
    </div>
  );
};

export default SongImmersiveViewer;
