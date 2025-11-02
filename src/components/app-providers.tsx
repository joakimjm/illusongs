"use client";

import type { ReactNode } from "react";
import { ToastProvider } from "@/components/toast/toast-provider";

type AppProvidersProps = {
  readonly children: ReactNode;
};

export const AppProviders = ({ children }: AppProvidersProps) => (
  <ToastProvider>{children}</ToastProvider>
);
