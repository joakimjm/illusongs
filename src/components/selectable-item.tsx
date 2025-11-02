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
    "block rounded-lg border p-3 transition focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900";

  const activeClasses =
    "border-blue-600 bg-blue-600/10 dark:border-blue-400 dark:bg-blue-500/20";

  const inactiveClasses =
    "border-slate-200 hover:border-blue-300 hover:bg-blue-50 dark:border-slate-700 dark:hover:border-blue-400 dark:hover:bg-slate-900";

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
