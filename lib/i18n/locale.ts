import { localeSchema, type Locale } from "@/lib/chat/schema";

export type { Locale };

export const DEFAULT_LOCALE: Locale = "en";
export const LOCALE_COOKIE = "locale";

export function parseLocale(value: unknown): Locale | undefined {
  const parsed = localeSchema.safeParse(value);
  return parsed.success ? parsed.data : undefined;
}

/** Any Portuguese browser language selects pt-BR; everything else selects English. */
export function detectLocale(language: string | undefined): Locale {
  return language?.toLowerCase().startsWith("pt") ? "pt-BR" : DEFAULT_LOCALE;
}
