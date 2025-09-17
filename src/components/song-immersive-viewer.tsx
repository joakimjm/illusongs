"use client";

import Image from "next/image";
import {
  type PointerEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import PillButton from "@/components/pill-button";
import type { Song } from "@/data/songs";

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
      const total = verses.length;

      if (total === 0) {
        return previousIndex;
      }

      return (previousIndex + 1) % total;
    });
  }, [verses.length]);

  const goPrevious = useCallback(() => {
    setActiveIndex((previousIndex) => {
      const total = verses.length;

      if (total === 0) {
        return previousIndex;
      }

      return (previousIndex + total - 1) % total;
    });
  }, [verses.length]);

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

  useEffect(() => {
    if (activeIndex >= verses.length) {
      setActiveIndex(0);
    }
  }, [activeIndex, verses.length]);

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
      if (deltaX < 0) {
        goNext();
      } else {
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

  const totalVerses = verses.length;
  const containerWidth = stageRef.current?.clientWidth ?? 0;
  const dragOffsetPercent =
    containerWidth === 0 ? 0 : (dragOffset / containerWidth) * 100;

  return (
    <div className="relative flex w-full flex-1 flex-col">
      <section
        ref={stageRef}
        className="relative flex min-h-screen flex-1 overflow-hidden touch-pan-y"
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
                    className="object-cover scale-200 blur-3xl"
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
                  <div className="z-0 pt-6 pb-24 backdrop-blur absolute bottom-0 w-full">
                    <div className="flex">
                      <div className="w-full px-6 text-slate-100">
                        <p className="whitespace-pre-line text-lg leading-relaxed sm:text-2xl">
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
        <div className="fixed top-8 right-6">
          <div className="flex items-center gap-3" aria-hidden>
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
        </div>
        <div className="py-6 w-full absolute bottom-0 z-10 mt-6 flex flex-wrap items-center justify-between gap-2 px-2 text-white sm:px-0">
          <PillButton
            type="button"
            onClick={goPrevious}
            aria-label="Forrige vers"
          >
            ← Forrige
          </PillButton>

          <PillButton type="button" onClick={goNext} aria-label="Næste vers">
            Næste →
          </PillButton>
        </div>
      </section>
    </div>
  );
};

export default SongImmersiveViewer;
