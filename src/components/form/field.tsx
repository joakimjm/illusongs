import clsx from "clsx";
import type { JSX, ReactNode } from "react";

type FormFieldProps = {
  readonly label: string;
  readonly htmlFor: string;
  readonly children: ReactNode;
  readonly description?: string;
  readonly className?: string;
};

export const FormField = ({
  label,
  htmlFor,
  children,
  description,
  className,
}: FormFieldProps): JSX.Element => (
  <div className={clsx("flex flex-col gap-2", className)}>
    <label
      htmlFor={htmlFor}
      className="text-sm font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300"
    >
      {label}
    </label>
    {children}
    {description ? (
      <p className="text-xs text-slate-500 dark:text-slate-400">
        {description}
      </p>
    ) : null}
  </div>
);
