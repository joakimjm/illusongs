import type { ReactNode } from "react";

type BodyProps = {
  readonly children: ReactNode;
  readonly size?: BodySize;
  readonly variant?: BodyVariant;
  readonly className?: string;
};

const VARIANT_CLASSES = {
  default: "text-slate-600 dark:text-slate-300",
  muted: "text-slate-500 dark:text-slate-400",
  highlight: "text-blue-600/80 dark:text-blue-200",
};

type BodyVariant = keyof typeof VARIANT_CLASSES;

const SIZE_CLASSES = {
  xs: "text-xs",
  sm: "text-sm",
  base: "text-base leading-6",
};

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
