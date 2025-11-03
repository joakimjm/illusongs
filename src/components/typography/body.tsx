import type { ReactNode } from "react";

type BodyProps = {
  readonly children: ReactNode;
  readonly size?: BodySize;
  readonly variant?: BodyVariant;
  readonly className?: string;
};

const VARIANT_CLASSES = {
  default: "text-stone-700 dark:text-stone-300",
  muted: "text-stone-500 dark:text-stone-400",
  highlight: "text-amber-600 dark:text-amber-300",
} as const;

type BodyVariant = keyof typeof VARIANT_CLASSES;

const SIZE_CLASSES = {
  xs: "text-xs",
  sm: "text-sm",
  base: "text-base leading-6",
} as const;

type BodySize = keyof typeof SIZE_CLASSES;

export const Body = ({
  children,
  size = "base",
  variant = "default",
  className = "",
}: BodyProps) => {
  const baseStyles = `${VARIANT_CLASSES[variant]} ${SIZE_CLASSES[size]}`;
  const combinedClassName = className
    ? `${baseStyles} ${className}`
    : baseStyles;

  return <p className={combinedClassName}>{children}</p>;
};
