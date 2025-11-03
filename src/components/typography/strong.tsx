import type { ReactNode } from "react";

type StrongProps = {
  readonly children: ReactNode;
  readonly className?: string;
};

export const Strong = ({ children, className = "" }: StrongProps) => {
  const baseStyles = "font-semibold text-stone-800 dark:text-stone-100";
  const combinedClassName = className
    ? `${baseStyles} ${className}`
    : baseStyles;

  return <span className={combinedClassName}>{children}</span>;
};
