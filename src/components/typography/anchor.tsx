type AnchorProps<E extends React.ElementType = "a"> = {
  as?: E;
} & Omit<React.ComponentPropsWithoutRef<E>, "as">;

export const Anchor = <E extends React.ElementType = "a">({
  as,
  children,
  className,
  ...rest
}: AnchorProps<E>) => {
  const Tag = as || "a";
  return (
    <Tag
      {...rest}
      className={`inline-flex items-center gap-2 text-sm font-medium text-blue-600 underline-offset-4 hover:underline dark:text-blue-300 ${className ?? ""}`}
    >
      {children}
    </Tag>
  );
};
