import type { ReactNode } from "react";

type StrongProps = {
  readonly children: ReactNode;
  readonly className?: string;
};

export const Strong = ({ children, className = "" }: StrongProps) => {
  const baseStyles = "font-medium text-slate-900 dark:text-white";
  const combinedClassName = className
    ? `${baseStyles} ${className}`
    : baseStyles;

  return <span className={combinedClassName}>{children}</span>;
};
