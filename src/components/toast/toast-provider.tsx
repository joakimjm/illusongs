"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { FiX } from "react-icons/fi";

type ToastVariant = "info" | "success" | "error";

type ToastInput = {
  readonly title: string;
  readonly description?: string;
  readonly variant?: ToastVariant;
  readonly durationMs?: number;
};

type ToastItem = {
  readonly id: string;
  readonly title: string;
  readonly description?: string;
  readonly variant: ToastVariant;
};

type ToastContextValue = {
  readonly pushToast: (toast: ToastInput) => string;
  readonly dismissToast: (id: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const DEFAULT_DURATION_MS = 6000;

const VARIANT_CLASSES: Record<ToastVariant, string> = {
  info: "border-blue-200 bg-white text-slate-900 dark:border-blue-900/50 dark:bg-slate-900 dark:text-slate-100",
  success:
    "border-emerald-200 bg-white text-slate-900 dark:border-emerald-900/40 dark:bg-slate-900 dark:text-slate-100",
  error:
    "border-rose-200 bg-white text-slate-900 dark:border-rose-900/40 dark:bg-slate-900 dark:text-slate-100",
};

type ToastViewportProps = {
  readonly toasts: readonly ToastItem[];
  readonly onDismiss: (id: string) => void;
};

const ToastViewport = ({ toasts, onDismiss }: ToastViewportProps) => (
  <div className="pointer-events-none fixed top-4 right-4 z-[999] flex max-w-sm flex-col gap-3 sm:right-6">
    {toasts.map((toast) => {
      const toastClasses = [
        "pointer-events-auto flex flex-col gap-2 rounded-xl border px-4 py-3 shadow-lg shadow-slate-950/10 transition focus-within:ring-2 focus-within:ring-blue-500 dark:shadow-black/40",
        VARIANT_CLASSES[toast.variant],
      ].join(" ");

      return (
        <div
          key={toast.id}
          aria-live="polite"
          aria-atomic="true"
          className={toastClasses}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex flex-col gap-1">
              <span className="text-sm font-semibold">{toast.title}</span>
              {toast.description ? (
                <span className="text-sm text-slate-600 dark:text-slate-300">
                  {toast.description}
                </span>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => onDismiss(toast.id)}
              aria-label="Dismiss notification"
              className="rounded-full p-1 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            >
              <FiX aria-hidden className="h-4 w-4" />
            </button>
          </div>
        </div>
      );
    })}
  </div>
);

const generateId = () => {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }
  return `toast-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

type ToastProviderProps = {
  readonly children: ReactNode;
};

export const ToastProvider = ({ children }: ToastProviderProps) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timersRef = useRef<Map<string, number>>(new Map());

  const dismissToast = useCallback((id: string) => {
    setToasts((previous) => previous.filter((toast) => toast.id !== id));
    const timerId = timersRef.current.get(id);
    if (timerId !== undefined) {
      window.clearTimeout(timerId);
      timersRef.current.delete(id);
    }
  }, []);

  const pushToast = useCallback(
    ({ title, description, variant = "info", durationMs }: ToastInput) => {
      const id = generateId();
      setToasts((previous) => [
        ...previous,
        {
          id,
          title,
          description,
          variant,
        },
      ]);

      const timeout = window.setTimeout(() => {
        dismissToast(id);
      }, durationMs ?? DEFAULT_DURATION_MS);
      timersRef.current.set(id, timeout);

      return id;
    },
    [dismissToast],
  );

  useEffect(
    () => () => {
      for (const timer of timersRef.current.values()) {
        window.clearTimeout(timer);
      }
      timersRef.current.clear();
    },
    [],
  );

  const contextValue = useMemo<ToastContextValue>(
    () => ({
      pushToast,
      dismissToast,
    }),
    [dismissToast, pushToast],
  );

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={dismissToast} />
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
};

export type { ToastVariant, ToastInput };
