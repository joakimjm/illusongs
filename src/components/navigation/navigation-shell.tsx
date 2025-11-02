"use client";

import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactElement, ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { SelectableItem } from "@/components/selectable-item";
import { Body, Heading, SectionLabel } from "@/components/typography";
import type { SupabaseUser } from "@/features/supabase/supabase-types";
import { UserInfo } from "./user-info";

type NavigationItem = {
  readonly href: Route;
  readonly label: string;
  readonly description?: string;
};

export type NavigationSection = {
  readonly id: string;
  readonly title?: string;
  readonly items: readonly NavigationItem[];
};

type NavigationHeader = {
  readonly eyebrow: string;
  readonly title: string;
  readonly description?: string;
};

type NavigationShellProps = {
  readonly children: ReactNode;
  readonly header: NavigationHeader;
  readonly sections: readonly NavigationSection[];
  readonly user: SupabaseUser;
};

const NAVIGATION_ID = "app-navigation-panel";

export const NavigationShell = ({
  children,
  header,
  sections,
  user,
}: NavigationShellProps) => {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const previousPathRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    closeButtonRef.current?.focus({ preventScroll: true });
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  useEffect(() => {
    const previousPath = previousPathRef.current;
    const currentPath = pathname ?? "";

    if (isOpen && previousPath !== null && previousPath !== currentPath) {
      setIsOpen(false);
    }

    previousPathRef.current = currentPath;
  }, [pathname, isOpen]);

  const renderSection = (section: NavigationSection) => {
    if (section.items.length === 0) {
      return null;
    }

    return (
      <nav
        key={section.id}
        aria-label={section.title ?? "Application navigation"}
        className="flex flex-col gap-2"
      >
        {section.title ? (
          <SectionLabel className="px-1">{section.title}</SectionLabel>
        ) : null}
        <ul className="flex flex-col gap-2">
          {section.items.map((item) => {
            const isActive =
              pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <li key={item.href}>
                <SelectableItem
                  as={Link}
                  href={item.href}
                  isActive={isActive}
                  className="group"
                >
                  <Body
                    size="sm"
                    variant={isActive ? "highlight" : "default"}
                    className={"block font-semibold"}
                  >
                    {item.label}
                  </Body>
                  {item.description ? (
                    <Body
                      size="xs"
                      className="mt-1 block"
                      variant={isActive ? "highlight" : "muted"}
                    >
                      {item.description}
                    </Body>
                  ) : null}
                </SelectableItem>
              </li>
            );
          })}
        </ul>
      </nav>
    );
  };

  const renderedSections = sections
    .map(renderSection)
    .filter((section): section is ReactElement => section !== null);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 transition-colors dark:bg-slate-950 dark:text-slate-100">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/80 lg:hidden">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <SectionLabel className="text-slate-700 dark:text-slate-300">
            {header.title}
          </SectionLabel>
          {renderedSections.length > 0 ? (
            <button
              type="button"
              aria-controls={NAVIGATION_ID}
              aria-expanded={isOpen}
              onClick={() => setIsOpen(true)}
              className="inline-flex items-center justify-center rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Menu
              <span className="sr-only">Open navigation</span>
            </button>
          ) : null}
        </div>
      </header>

      {isOpen ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="app-navigation-title"
          id={NAVIGATION_ID}
          className="fixed inset-0 z-40 flex lg:hidden"
        >
          <div
            className="absolute inset-0 bg-slate-900/60"
            aria-hidden
            onClick={() => setIsOpen(false)}
          />
          <div className="relative ml-auto flex h-full w-80 flex-col gap-6 overflow-y-auto bg-white px-4 py-6 shadow-xl dark:bg-slate-900">
            <div className="flex items-center justify-between">
              <Heading
                level={2}
                id="app-navigation-title"
                className="text-base"
              >
                {header.title}
              </Heading>
              <button
                ref={closeButtonRef}
                type="button"
                onClick={() => setIsOpen(false)}
                className="inline-flex items-center justify-center rounded-md border border-slate-300 bg-white px-2 py-1 text-sm text-slate-700 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Close
                <span className="sr-only">Close navigation menu</span>
              </button>
            </div>
            <div className="flex flex-col gap-6">{renderedSections}</div>
            <UserInfo user={user} />
          </div>
        </div>
      ) : null}

      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 lg:flex-row lg:items-start lg:gap-8 lg:px-6 lg:py-10">
        {renderedSections.length > 0 ? (
          <aside className="sticky top-20 hidden w-72 shrink-0 rounded-2xl border border-slate-200 bg-white/90 p-5 shadow-sm backdrop-blur lg:block dark:border-slate-800 dark:bg-slate-900/80">
            <div className="mb-4">
              <SectionLabel>{header.eyebrow}</SectionLabel>
              <Heading level={2} className="mt-1 text-lg">
                {header.title}
              </Heading>
              {header.description ? (
                <Body
                  size="sm"
                  className="mt-1 text-xs text-slate-500 dark:text-slate-400"
                >
                  {header.description}
                </Body>
              ) : null}
            </div>
            <div className="flex flex-col gap-6">{renderedSections}</div>
            <div className="mt-6">
              <UserInfo user={user} />
            </div>
          </aside>
        ) : null}

        <main className="flex w-full flex-col gap-6 lg:flex-1">{children}</main>
      </div>
    </div>
  );
};
