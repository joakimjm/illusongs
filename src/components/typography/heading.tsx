import type { ReactNode } from "react";

type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;

type HeadingProps = {
  readonly level: HeadingLevel;
  readonly children: ReactNode;
  readonly className?: string;
  readonly id?: string;
};

const headingStyles: Record<HeadingLevel, string> = {
  1: "font-heading text-4xl font-semibold text-[color:var(--text-primary)]",
  2: "font-heading text-3xl font-semibold text-[color:var(--text-primary)]",
  3: "font-heading text-2xl font-semibold text-[color:var(--text-primary)]",
  4: "font-heading text-xl font-semibold text-[color:var(--text-primary)]",
  5: "font-heading text-lg font-semibold text-[color:var(--text-primary)]",
  6: "font-heading text-base font-semibold text-[color:var(--text-primary)]",
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
