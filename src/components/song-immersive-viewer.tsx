"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { HiOutlineArrowLeft, HiOutlineArrowRight } from "react-icons/hi2";
import InnerImageZoom from "react-inner-image-zoom";
import BackHomeButton from "@/components/back-home-button";
import PillButton from "@/components/pill-button";
import type { Song } from "@/data/songs";
import "scrollyfills";

type SongImmersiveViewerProps = {
  readonly song: Song;
};

const SongImmersiveViewer = ({ song }: SongImmersiveViewerProps) => {
  const verses = useMemo(() => song.verses, [song.verses]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isSpotlightEnabled, setIsSpotlightEnabled] = useState(false);
  const [spotPos, setSpotPos] = useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });
  const requestRef = useRef<number | null>(null);
  const pendingPos = useRef<{ x: number; y: number } | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Track pointer / touch position for spotlight while enabled.
  useEffect(() => {
    if (!isSpotlightEnabled) {
      return;
    }
    const handleMove = (e: PointerEvent | TouchEvent | MouseEvent) => {
      let clientX: number | null = null;
      let clientY: number | null = null;
      if (e instanceof TouchEvent) {
        const t = e.touches[0];
        if (t) {
          clientX = t.clientX;
          clientY = t.clientY;
        }
      } else if (e instanceof PointerEvent || e instanceof MouseEvent) {
        clientX = e.clientX;
        clientY = e.clientY;
      }
      if (clientX === null || clientY === null) return;
      pendingPos.current = { x: clientX, y: clientY };
      if (requestRef.current === null) {
        requestRef.current = window.requestAnimationFrame(() => {
          if (pendingPos.current) {
            setSpotPos(pendingPos.current);
          }
          requestRef.current = null;
        });
      }
    };
    window.addEventListener("pointermove", handleMove, { passive: true });
    window.addEventListener("touchmove", handleMove, { passive: true });
    window.addEventListener("mousemove", handleMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("touchmove", handleMove);
      window.removeEventListener("mousemove", handleMove);
      if (requestRef.current !== null) {
        cancelAnimationFrame(requestRef.current);
        requestRef.current = null;
      }
    };
  }, [isSpotlightEnabled]);

  // Scroll snap index tracking (restored original effect)
  useEffect(() => {
    const container = containerRef.current;
    if (container === null) {
      return;
    }
    const eventListener = () => {
      const current = containerRef.current;
      if (current === null) return;
      const index = Math.round(current.scrollLeft / current.clientWidth);
      setActiveIndex(index);
    };
    container.addEventListener("scrollend", eventListener);
    return () => container.removeEventListener("scrollend", eventListener);
  }, []);

  const SPOT_RADIUS = 140; // px

  const clampIndex = useCallback(
    (index: number) => {
      if (verses.length === 0) {
        return 0;
      }

      return Math.min(Math.max(index, 0), verses.length - 1);
    },
    [verses.length],
  );

  const scrollToIndex = useCallback(
    (index: number) => {
      const container = containerRef.current;
      if (container === null) {
        return;
      }

      const target = clampIndex(index);
      container
        .getElementsByTagName("article")
        [target]?.scrollIntoView({ behavior: "smooth" });
    },
    [clampIndex],
  );

  const scrollAndUpdate = useCallback(
    (index: number) => {
      const target = clampIndex(index);
      setActiveIndex(target);
      scrollToIndex(target);
    },
    [clampIndex, scrollToIndex],
  );

  useEffect(() => {
    if (activeIndex >= verses.length && verses.length > 0) {
      scrollAndUpdate(verses.length - 1);
    }
  }, [activeIndex, verses.length, scrollAndUpdate]);

  const goNext = useCallback(() => {
    if (activeIndex < verses.length - 1) {
      scrollAndUpdate(activeIndex + 1);
    }
  }, [activeIndex, verses.length, scrollAndUpdate]);

  const goPrevious = useCallback(() => {
    if (activeIndex > 0) {
      scrollAndUpdate(activeIndex - 1);
    }
  }, [activeIndex, scrollAndUpdate]);

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

  const hasPrevious = activeIndex > 0;
  const hasNext = activeIndex < verses.length - 1;

  if (verses.length === 0) {
    return null;
  }

  return (
    <div className="relative flex w-full flex-1 flex-col">
      <div className="flex min-h-screen h-full w-full overflow-hidden">
        <div
          ref={containerRef}
          className="flex min-h-screen w-full snap-x snap-mandatory overflow-x-auto overflow-y-hidden scroll-smooth [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
        >
          {verses.map((verse) => (
            <article
              key={verse.id}
              className="flex h-full w-full flex-shrink-0 snap-start"
            >
              <div className="select-none relative flex h-full w-full flex-col justify-end overflow-hidden">
                <div className="absolute h-full w-full border inset-0 overflow-hidden">
                  <Image
                    priority
                    src={verse.illustration.src}
                    alt=""
                    fill
                    sizes="100vw"
                    className="object-cover scale-200 blur-2xl"
                  />
                </div>
                <div className="relative flex h-full flex-col justify-center">
                  <figure className="flex flex-1 items-start justify-center">
                    <InnerImageZoom
                      width={1600}
                      height={1200}
                      afterZoomOut={() => setIsSpotlightEnabled(false)}
                      afterZoomIn={() => setIsSpotlightEnabled(true)}
                      className="w-full object-contain"
                      src={verse.illustration.src}
                      zoomSrc={verse.illustration.src}
                    />
                  </figure>
                  <div className="z-0 pt-20 pb-24 backdrop-blur-fade-top-to-bottom absolute bottom-0 w-full">
                    <div className="flex">
                      <div className="w-full px-6 text-amber-100">
                        <p className={`whitespace-pre-line sm:text-2xl`}>
                          {verse.text}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>

        {isSpotlightEnabled && (
          <div
            aria-hidden
            className="pointer-events-none fixed inset-0 z-40 transition-opacity"
            style={{
              background: `radial-gradient(circle ${SPOT_RADIUS}px at ${spotPos.x}px ${spotPos.y}px, rgba(0,0,0,0) 0%, rgba(0,0,0,0) 55%, rgba(0,0,0,0.45) 65%, rgba(0,0,0,0.65) 100%)`,
            }}
          />
        )}

        <div
          aria-hidden
          className="pointer-events-none absolute right-4 flex items-center gap-3 text-white"
          style={{
            top: "max(calc(env(safe-area-inset-top, 0px)), 1rem)",
            right: "calc(env(safe-area-inset-right, 0px) + 0.75rem)",
          }}
        >
          {verses.map((verse, index) => (
            <span
              key={verse.id}
              className={`h-2.5 w-2.5 rounded-full border border-white/40 transition ${
                index === activeIndex
                  ? "bg-amber-300 shadow-[0_0_0_8px_rgba(252,211,77,0.35)]"
                  : "bg-transparent"
              }`}
            />
          ))}
        </div>

        <div
          className="absolute bottom-0 z-10 mt-6 flex w-full items-center justify-between gap-3 px-3 text-white sm:px-6"
          style={{
            paddingBottom: "max(calc(env(safe-area-inset-bottom, 0px)), 1rem)",
            paddingLeft: "calc(env(safe-area-inset-left, 0px) + 0.75rem)",
            paddingRight: "calc(env(safe-area-inset-right, 0px) + 0.75rem)",
          }}
        >
          <BackHomeButton />
          <div className="flex items-center gap-3">
            <PillButton
              type="button"
              onClick={goPrevious}
              aria-label="Forrige vers"
              disabled={!hasPrevious}
              className="flex items-center justify-center gap-3 px-4 text-xl disabled:opacity-40"
            >
              <HiOutlineArrowLeft aria-hidden className="h-6 w-6" />
              <span className="sr-only">Forrige vers</span>
            </PillButton>
            <PillButton
              type="button"
              onClick={goNext}
              aria-label="Næste vers"
              disabled={!hasNext}
              className="flex items-center justify-center gap-3 px-4 text-xl disabled:opacity-40"
            >
              <HiOutlineArrowRight aria-hidden className="h-6 w-6" />
              <span className="sr-only">Næste vers</span>
            </PillButton>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SongImmersiveViewer;
