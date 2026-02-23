import type { ReactNode } from "react";

type PageShellVariant = "standalone" | "embedded";

type PageShellProps = {
  readonly children: ReactNode;
  readonly className?: string;
  readonly variant?: PageShellVariant;
};

export const PageShell = ({
  children,
  className,
  variant = "standalone",
}: PageShellProps) => {
  if (variant === "embedded") {
    return (
      <section
        className={`flex w-full min-w-0 flex-col gap-8${className ? ` ${className}` : ""}`}
      >
        {children}
      </section>
    );
  }

  return (
    <main className="min-h-screen bg-linear-to-b from-amber-50 via-stone-50 to-stone-100 text-stone-900 dark:from-stone-950 dark:via-stone-950 dark:to-stone-900 dark:text-stone-100">
      <section
        className={`mx-auto flex min-h-screen max-w-3xl flex-col justify-center gap-8 px-6 py-16 sm:px-12${className ? ` ${className}` : ""}`}
      >
        {children}
      </section>
    </main>
  );
};
