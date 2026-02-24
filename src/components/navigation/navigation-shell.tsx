"use client";

import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactElement, ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/button";
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
    <div className="min-h-screen bg-stone-100 text-stone-900 transition-colors dark:bg-stone-950 dark:text-stone-100">
      <header className="sticky top-0 z-30 border-b border-stone-200/80 bg-stone-50/90 backdrop-blur-md dark:border-stone-800 dark:bg-stone-950/85 lg:hidden">
        <div className="flex items-center justify-between px-4 py-3">
          <SectionLabel className="text-stone-700 dark:text-stone-200">
            {header.title}
          </SectionLabel>
          {renderedSections.length > 0 ? (
            <Button
              type="button"
              aria-controls={NAVIGATION_ID}
              aria-expanded={isOpen}
              onClick={() => setIsOpen(true)}
              variant="secondary"
              size="sm"
              className="rounded-md bg-white shadow-sm dark:bg-stone-900"
            >
              Menu
              <span className="sr-only">Open navigation</span>
            </Button>
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
            className="absolute inset-0 bg-stone-950/65"
            aria-hidden
            onClick={() => setIsOpen(false)}
          />
          <div className="relative ml-auto flex h-full w-80 flex-col gap-6 overflow-y-auto border-l border-stone-200 bg-stone-50 px-4 py-6 shadow-xl dark:border-stone-800 dark:bg-stone-950">
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
                className="inline-flex items-center justify-center rounded-md border border-stone-300 bg-white px-2 py-1 text-sm text-stone-700 transition hover:bg-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-500 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-200 dark:hover:bg-stone-800"
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

      <div className="flex w-full min-w-0 flex-col lg:grid lg:min-h-screen lg:grid-cols-[18rem_minmax(0,1fr)]">
        {renderedSections.length > 0 ? (
          <aside className="hidden h-screen flex-col border-r border-stone-200/80 bg-stone-50/80 p-5 backdrop-blur lg:sticky lg:top-0 lg:flex dark:border-stone-800 dark:bg-stone-950/80">
            <div className="mb-4">
              <SectionLabel>{header.eyebrow}</SectionLabel>
              <Heading level={2} className="mt-1 text-lg">
                {header.title}
              </Heading>
              {header.description ? (
                <Body
                  size="sm"
                  className="mt-1 text-xs text-stone-500 dark:text-stone-400"
                >
                  {header.description}
                </Body>
              ) : null}
            </div>
            <div className="flex flex-col gap-6">{renderedSections}</div>
            <div className="mt-auto pt-6">
              <UserInfo user={user} />
            </div>
          </aside>
        ) : null}

        <main className="min-w-0 p-4 sm:p-6 lg:p-8">
          <div className="min-h-[calc(100vh-2rem)] rounded-3xl border border-stone-200/80 bg-white/75 p-4 shadow-sm backdrop-blur-sm sm:p-6 lg:p-8 dark:border-stone-800/80 dark:bg-stone-900/75">
            <div className="flex w-full min-w-0 flex-col gap-6">{children}</div>
          </div>
        </main>
      </div>
    </div>
  );
};
