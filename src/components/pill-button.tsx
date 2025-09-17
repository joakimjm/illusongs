import type { ComponentPropsWithoutRef, ElementType, JSX } from "react";

const BASE_CLASSES =
  "inline-flex items-center gap-3 rounded-full text-xs font-semibold uppercase transition backdrop-blur border border-white/20 bg-yellow-900/20 px-6 py-3 text-white tracking-[0.38em] hover:bg-white/20";

type PolymorphicProps<C extends ElementType> = {
  readonly as?: C;
  readonly className?: string;
};

type PillButtonProps<C extends ElementType> = PolymorphicProps<C> &
  Omit<ComponentPropsWithoutRef<C>, keyof PolymorphicProps<C>>;

const mergeClassNames = (
  className?: string,
): string => {
  if (className === undefined || className.length === 0) {
    return BASE_CLASSES;
  }

  return `${BASE_CLASSES} ${className}`;
};

const PillButton = <C extends ElementType = "button">({
  as,
  className,
  ...rest
}: PillButtonProps<C>): JSX.Element => {
  const Component = as ?? "button";
  const mergedClassName = mergeClassNames(className);

  return (
    <Component
      {...(rest as ComponentPropsWithoutRef<C>)}
      className={mergedClassName}
    />
  );
};

export default PillButton;
