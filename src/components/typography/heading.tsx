import type { ComponentPropsWithoutRef, ElementType, ReactNode } from "react";
import { headingFont } from "@/styles/fonts";

type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;

type HeadingProps = {
  readonly level: HeadingLevel;
  readonly children: ReactNode;
  readonly className?: string;
  readonly id?: string;
};

const headingBaseClass = `${headingFont.className} font-semibold text-stone-800 dark:text-stone-100`;

const headingStyles: Record<HeadingLevel, string> = {
  1: `${headingBaseClass} text-4xl`,
  2: `${headingBaseClass} text-3xl`,
  3: `${headingBaseClass} text-2xl`,
  4: `${headingBaseClass} text-xl`,
  5: `${headingBaseClass} text-lg`,
  6: `${headingBaseClass} text-base`,
};

type HeadingTextProps<T extends ElementType> = {
  readonly as?: T;
  readonly className?: string;
} & Omit<ComponentPropsWithoutRef<T>, "className" | "as">;

export const HeadingText = <T extends ElementType = "span">({
  as,
  className = "",
  ...props
}: HeadingTextProps<T>) => {
  const Component = as ?? "span";
  const combinedClassName = className
    ? `${headingFont.className} ${className}`
    : headingFont.className;

  return (
    <Component
      {...(props as ComponentPropsWithoutRef<T>)}
      className={combinedClassName}
    />
  );
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
