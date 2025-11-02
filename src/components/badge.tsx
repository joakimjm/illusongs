import type { ComponentPropsWithoutRef } from "react";

type BadgeVariant = "neutral" | "success" | "warning" | "info" | "error";

export type BadgeProps = {
  variant?: BadgeVariant;
  className?: string;
} & ComponentPropsWithoutRef<"span">;

const VARIANT_CLASSES: Record<BadgeVariant, string> = {
  neutral:
    "bg-slate-200/50 text-slate-700 dark:bg-slate-800/50 dark:text-slate-300",
  success:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  warning:
    "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300",
  info: "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-200",
  error: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
};

export const Badge = ({
  variant = "neutral",
  className = "",
  ...props
}: BadgeProps) => {
  const baseClasses =
    "inline-flex items-center justify-center whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold";

  const classes = [baseClasses, VARIANT_CLASSES[variant], className]
    .filter(Boolean)
    .join(" ");

  return <span className={classes} {...props} />;
};

export type { BadgeVariant };
