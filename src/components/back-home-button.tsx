"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { HiHome } from "react-icons/hi2";
import PillButton from "@/components/pill-button";

const BackHomeButton = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const qs = searchParams.toString();
  const fallbackHref = qs.length > 0 ? `/?${qs}` : "/";

  const handleClick = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }
    router.push(fallbackHref);
  };

  return (
    <PillButton
      as="button"
      type="button"
      onClick={handleClick}
      aria-label="Til forsiden"
      className="flex items-center justify-center gap-3 px-4 text-xl"
    >
      <HiHome aria-hidden className="h-6 w-6" />
      <span className="sr-only">Til forsiden</span>
    </PillButton>
  );
};

export default BackHomeButton;
