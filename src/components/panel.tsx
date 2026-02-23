type PanelProps<E extends React.ElementType = "div"> = {
  as?: E;
  className?: string;
  children?: React.ReactNode;
} & Omit<React.ComponentPropsWithoutRef<E>, "as" | "children" | "className">;

export const Panel = <E extends React.ElementType = "div">({
  as,
  className = "",
  children,
  ...rest
}: PanelProps<E>) => {
  const Tag = as || "div";
  return (
    <Tag
      {...rest}
      className={`rounded-3xl border border-stone-200/80 bg-white/80 p-6 shadow-sm backdrop-blur dark:border-stone-800/80 dark:bg-stone-900/65 ${className}`}
    >
      {children}
    </Tag>
  );
};

export const ShadowPanel = <E extends React.ElementType = "div">({
  as,
  className = "",
  children,
  ...rest
}: PanelProps<E>) => {
  const Tag = as || "div";
  return (
    <Tag
      {...rest}
      className={`rounded-3xl border border-dashed border-stone-200/80 bg-white/75 p-6 dark:border-stone-700/80 dark:bg-stone-900/55 ${className}`}
    >
      {children}
    </Tag>
  );
};
