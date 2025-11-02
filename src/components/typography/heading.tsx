import type { ReactNode } from "react";

type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;

type HeadingProps = {
  readonly level: HeadingLevel;
  readonly children: ReactNode;
  readonly className?: string;
  readonly id?: string;
};

const headingStyles: Record<HeadingLevel, string> = {
  1: "text-3xl font-bold text-slate-900 dark:text-white",
  2: "text-2xl font-semibold text-slate-900 dark:text-white",
  3: "text-xl font-semibold text-slate-900 dark:text-white",
  4: "text-lg font-semibold text-slate-900 dark:text-white",
  5: "text-base font-semibold text-slate-900 dark:text-white",
  6: "text-sm font-semibold text-slate-900 dark:text-white",
};

export const Heading = ({
  level,
  children,
  className = "",
  id,
}: HeadingProps) => {
  const Tag = `h${level}` as const;
  const baseStyles = headingStyles[level];
  const combinedClassName = className
    ? `${baseStyles} ${className}`
    : baseStyles;

  return (
    <Tag id={id} className={combinedClassName}>
      {children}
    </Tag>
  );
};
