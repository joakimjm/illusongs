"use client";

import type { JSX } from "react";
import { useScrollFollow } from "@/utils/use-scroll-follow";

const BACKGROUND_STRENGTH = -0.05;
const BACKGROUND_MAX_OFFSET = 200;

export const HomeScrollBackground = (): JSX.Element => {
  const backgroundRef = useScrollFollow<HTMLDivElement>({
    strength: BACKGROUND_STRENGTH,
    maxOffset: BACKGROUND_MAX_OFFSET,
  });

  return (
    <div
      ref={backgroundRef}
      aria-hidden
      className="pointer-events-none absolute inset-0 bg-[url('/bg-light.webp')] bg-cover bg-center bg-fixed dark:bg-[url('/bg-dark.webp')]"
      style={{
        backgroundPosition:
          "center calc(50% + var(--scroll-follow-offset, 0px))",
      }}
    />
  );
};
