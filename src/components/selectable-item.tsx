import type React from "react";

type SelectableItemProps<E extends React.ElementType = "button"> = {
  as?: E;
  isActive: boolean;
  disabled?: boolean;
  className?: string;
  children: React.ReactNode;
} & Omit<
  React.ComponentPropsWithoutRef<E>,
  "as" | "children" | "className" | "disabled"
>;

export const SelectableItem = <E extends React.ElementType = "button">({
  as,
  isActive,
  disabled,
  className = "",
  children,
  ...rest
}: SelectableItemProps<E>) => {
  const Component = as || "button";

  const baseClasses =
    "block rounded-lg border p-3 transition focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 dark:focus:ring-offset-stone-950";

  const activeClasses =
    "border-amber-500 bg-amber-100/80 dark:border-amber-400/80 dark:bg-amber-400/15";

  const inactiveClasses =
    "border-stone-200 hover:border-amber-300 hover:bg-amber-50 dark:border-stone-700 dark:hover:border-amber-500/70 dark:hover:bg-stone-900";

  const disabledClasses = disabled ? "cursor-not-allowed opacity-60" : "";

  const classes = [
    baseClasses,
    isActive ? activeClasses : inactiveClasses,
    disabledClasses,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <Component {...rest} className={classes} disabled={disabled}>
      {children}
    </Component>
  );
};
