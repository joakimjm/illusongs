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
      className={`rounded-3xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/50 backdrop-blur shadow-sm p-6 ${className}`}
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
      className={`rounded-3xl border border-dashed border-slate-200 bg-white/70 p-6  dark:border-slate-700 dark:bg-slate-900/30 ${className}`}
    >
      {children}
    </Tag>
  );
};
