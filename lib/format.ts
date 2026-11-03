import type { Locale } from "@/lib/i18n/locale";

const MS_PER_SECOND = 1000;

export function formatCurrency(locale: Locale, amount: number): string {
  return new Intl.NumberFormat(locale, { style: "currency", currency: "BRL" }).format(amount);
}

/** ISO `YYYY-MM-DD` read and shown in UTC, so the calendar day never shifts with the time zone. */
export function formatDate(locale: Locale, isoDate: string): string {
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeZone: "UTC" }).format(
    new Date(`${isoDate}T00:00:00Z`),
  );
}

/** Milliseconds as seconds with one decimal, e.g. 2310 -> "2.3" (en) or "2,3" (pt-BR). */
export function formatSeconds(locale: Locale, ms: number): string {
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(ms / MS_PER_SECOND);
}
