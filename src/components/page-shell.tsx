import type { ReactNode } from "react";

type PageShellProps = {
  readonly children: ReactNode;
  readonly className?: string;
};

export const PageShell = ({ children, className }: PageShellProps) => (
  <main className="min-h-screen bg-linear-to-b from-slate-50 via-white to-slate-100 text-slate-900 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900 dark:text-slate-100">
    <section
      className={`mx-auto flex min-h-screen max-w-3xl flex-col justify-center gap-8 px-6 py-16 sm:px-12${className ? ` ${className}` : ""}`}
    >
      {children}
    </section>
  </main>
);
