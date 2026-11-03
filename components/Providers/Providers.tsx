"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import type { ReactNode } from "react";

import { I18nProvider } from "@/lib/i18n/I18nProvider";
import type { Locale } from "@/lib/i18n/locale";

function createQueryClient(): QueryClient {
  // A retried chat turn would spend rate limit and model quota, so never retry.
  return new QueryClient({ defaultOptions: { mutations: { retry: 0 } } });
}

type ProvidersProps = { initialLocale: Locale; children: ReactNode };

export function Providers({ initialLocale, children }: ProvidersProps) {
  const [queryClient] = useState(createQueryClient);

  return (
    <QueryClientProvider client={queryClient}>
      <I18nProvider initialLocale={initialLocale}>{children}</I18nProvider>
    </QueryClientProvider>
  );
}
