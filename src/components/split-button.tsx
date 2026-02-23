"use client";

import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";

type SplitButtonVariant = "primary" | "secondary" | "danger";
type SplitButtonSize = "xs" | "sm" | "md";

type SplitButtonItem = {
  readonly id: string;
  readonly label: string;
  readonly onSelect: () => void | Promise<void>;
  readonly disabled?: boolean;
  readonly icon?: ReactNode;
};

type SplitButtonProps = {
  readonly primaryLabel: string;
  readonly onPrimaryClick: () => void | Promise<void>;
  readonly toggleAriaLabel: string;
  readonly items: readonly SplitButtonItem[];
  readonly disabled?: boolean;
  readonly variant?: SplitButtonVariant;
  readonly size?: SplitButtonSize;
  readonly className?: string;
};

const SIZE_CLASS_MAP: Record<SplitButtonSize, string> = {
  xs: "h-7 px-2.5 text-xs",
  sm: "h-8 px-3 text-sm",
  md: "h-10 px-4 text-sm",
};

const TOGGLE_SIZE_CLASS_MAP: Record<SplitButtonSize, string> = {
  xs: "h-7 w-7 text-xs",
  sm: "h-8 w-8 text-sm",
  md: "h-10 w-10 text-sm",
};

const VARIANT_CLASS_MAP: Record<SplitButtonVariant, string> = {
  primary:
    "border-blue-600 bg-blue-600 text-white hover:bg-blue-700 dark:border-blue-500 dark:bg-blue-500 dark:hover:bg-blue-400 dark:hover:text-slate-950",
  secondary:
    "border-blue-500 bg-white text-blue-600 hover:bg-blue-600 hover:text-white dark:border-blue-400 dark:bg-slate-900 dark:text-blue-300 dark:hover:bg-blue-400 dark:hover:text-slate-950",
  danger:
    "border-rose-500 bg-white text-rose-600 hover:bg-rose-600 hover:text-white dark:border-rose-400 dark:bg-slate-900 dark:text-rose-300 dark:hover:bg-rose-400 dark:hover:text-slate-950",
};

export const SplitButton = ({
  primaryLabel,
  onPrimaryClick,
  toggleAriaLabel,
  items,
  disabled = false,
  variant = "secondary",
  size = "sm",
  className,
}: SplitButtonProps) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      const container = containerRef.current;
      if (!container) {
        setIsOpen(false);
        return;
      }

      const target = event.target;
      if (target instanceof Node && container.contains(target)) {
        return;
      }

      setIsOpen(false);
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleEscape);
    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen]);

  const baseButtonClasses =
    "inline-flex items-center justify-center border font-medium transition focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70 dark:focus:ring-offset-slate-900";
  const variantClasses = VARIANT_CLASS_MAP[variant];
  const sizeClasses = SIZE_CLASS_MAP[size];
  const toggleSizeClasses = TOGGLE_SIZE_CLASS_MAP[size];

  return (
    <div
      ref={containerRef}
      className={`relative inline-flex items-center${className ? ` ${className}` : ""}`}
    >
      <button
        type="button"
        disabled={disabled}
        onClick={(event) => {
          event.stopPropagation();
          void onPrimaryClick();
        }}
        className={`${baseButtonClasses} ${variantClasses} ${sizeClasses} rounded-l-md border-r-0`}
      >
        {primaryLabel}
      </button>
      <button
        type="button"
        aria-label={toggleAriaLabel}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        disabled={disabled}
        onClick={(event) => {
          event.stopPropagation();
          setIsOpen((value) => !value);
        }}
        className={`${baseButtonClasses} ${variantClasses} ${toggleSizeClasses} rounded-r-md`}
      >
        ▾
      </button>

      {isOpen ? (
        <div
          role="menu"
          className="absolute right-0 top-[calc(100%+0.4rem)] z-40 min-w-56 rounded-lg border border-slate-200 bg-white p-2 shadow-lg dark:border-slate-700 dark:bg-slate-900"
        >
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              role="menuitem"
              disabled={item.disabled}
              onClick={(event) => {
                event.stopPropagation();
                setIsOpen(false);
                void item.onSelect();
              }}
              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-xs font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              {item.icon ? item.icon : null}
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
};
