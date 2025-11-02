import type { ComponentProps } from "react";

type SectionLabelProps = ComponentProps<"h3">;

export const SectionLabel = ({
  children,
  className = "",
}: SectionLabelProps) => {
  const baseStyles =
    "text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400";
  const combinedClassName = className
    ? `${baseStyles} ${className}`
    : baseStyles;

  return <h3 className={combinedClassName}>{children}</h3>;
};
