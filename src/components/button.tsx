import type { LinkProps } from "next/link";
import type {
  ButtonHTMLAttributes,
  ComponentPropsWithoutRef,
  ElementType,
  JSX,
} from "react";

const BASE_CLASSES =
  "inline-flex whitespace-nowrap items-center justify-center rounded-lg text-sm cursor-pointer font-medium shadow transition focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70 dark:focus:ring-offset-stone-900";

const VARIANT_CLASSES = {
  primary:
    "bg-amber-500 text-stone-950 hover:bg-amber-400 dark:bg-amber-400 dark:text-stone-950 dark:hover:bg-amber-300",
  secondary:
    "border border-stone-400 text-stone-700 hover:bg-stone-700 hover:text-white dark:border-stone-500 dark:text-stone-200 dark:hover:bg-stone-200 dark:hover:text-stone-900",
  danger:
    "border border-rose-500 text-rose-600 hover:bg-rose-600 hover:text-white focus:outline-none focus:ring-2 focus:ring-rose-500 dark:border-rose-400 dark:text-rose-300 dark:hover:bg-rose-400 dark:hover:text-stone-950 dark:focus:ring-offset-stone-900",
  link: "border border-transparent text-stone-700 underline decoration-stone-400 underline-offset-2 hover:text-stone-900 dark:text-stone-200 dark:hover:text-white",
};

type ButtonVariant = keyof typeof VARIANT_CLASSES;

const SIZE_CLASSES = {
  md: "gap-2 px-4 py-2",
  sm: "gap-1 px-3 py-1.5 text-sm",
  xs: "gap-1 px-2 py-1.5 text-xs",
};

type ButtonSize = keyof typeof SIZE_CLASSES;

type ButtonProps<TElement extends ElementType = "button"> = {
  readonly as?: TElement;
  readonly variant?: ButtonVariant;
  readonly size?: ButtonSize;
  readonly className?: string;
  readonly type?: TElement extends "button"
    ? ButtonHTMLAttributes<HTMLButtonElement>["type"]
    : never;
};

type PolymorphicButtonProps<TElement extends ElementType = "button"> =
  ButtonProps<TElement> &
    Omit<
      ComponentPropsWithoutRef<TElement>,
      keyof ButtonProps | "className" | "type"
    >;

type NextLinkComponent = typeof import("next/link").default;

type NextLinkButtonProps<RouteType extends string> = {
  readonly as: NextLinkComponent;
  readonly variant?: ButtonVariant;
  readonly size?: ButtonSize;
  readonly className?: string;
  readonly type?: never;
} & Omit<LinkProps<RouteType>, "className"> &
  Omit<
    ComponentPropsWithoutRef<"a">,
    keyof LinkProps<RouteType> | "className" | "type"
  >;

export function Button<RouteType extends string>(
  props: NextLinkButtonProps<RouteType>,
): JSX.Element;
export function Button<TElement extends ElementType = "button">(
  props: PolymorphicButtonProps<TElement>,
): JSX.Element;
export function Button<TElement extends ElementType = "button">({
  as,
  variant = "primary",
  size = "md",
  className,
  type,
  ...rest
}:
  | PolymorphicButtonProps<TElement>
  | NextLinkButtonProps<string>): JSX.Element {
  const Component = as ?? "button";
  const classes = [
    BASE_CLASSES,
    VARIANT_CLASSES[variant],
    SIZE_CLASSES[size],
    className ?? "",
  ]
    .filter((value) => value.trim().length > 0)
    .join(" ");

  const defaultButtonType =
    type === undefined && (as === undefined || as === "button")
      ? "button"
      : undefined;

  return (
    <Component
      className={classes}
      {...rest}
      {...(type !== undefined ? { type } : {})}
      {...(defaultButtonType ? { type: defaultButtonType } : {})}
    />
  );
}
