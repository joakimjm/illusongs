import type { ButtonHTMLAttributes } from "react";
import { forwardRef } from "react";

const BASE_CLASSES =
  "inline-flex items-center justify-center rounded-lg text-sm cursor-pointer font-medium shadow transition focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70 dark:focus:ring-offset-slate-900";

const VARIANT_CLASSES = {
  primary:
    "bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-400",
  secondary:
    "border border-blue-500 text-blue-600 hover:bg-blue-600 hover:text-white dark:border-blue-400 dark:text-blue-300 dark:hover:bg-blue-400 dark:hover:text-slate-950",
  danger:
    "border border-rose-500 text-rose-600 hover:bg-rose-600 hover:text-white focus:outline-none focus:ring-2 focus:ring-rose-500 dark:border-rose-400 dark:text-rose-300 dark:hover:bg-rose-400 dark:hover:text-slate-950 dark:focus:ring-offset-slate-900",
};

type ButtonVariant = keyof typeof VARIANT_CLASSES;

const SIZE_CLASSES = {
  md: "gap-2 px-4 py-2",
  sm: "gap-1 px-3 py-1.5 text-sm",
  xs: "gap-1 px-2 py-1.5 text-xs",
};

type ButtonSize = keyof typeof SIZE_CLASSES;

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { variant = "primary", size = "md", className, type = "button", ...rest },
    ref,
  ) => {
    const classes = [
      BASE_CLASSES,
      VARIANT_CLASSES[variant],
      SIZE_CLASSES[size],
      className ?? "",
    ]
      .filter((value) => value.trim().length > 0)
      .join(" ");

    return <button ref={ref} type={type} className={classes} {...rest} />;
  },
);

Button.displayName = "Button";
