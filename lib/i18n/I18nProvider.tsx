"use client";

import { createContext, useContext, useEffect, useMemo, useSyncExternalStore } from "react";
import type { ReactNode } from "react";

import { localeStore } from "@/lib/storage/localeStore";

import type { Locale } from "./locale";
import {
  translate,
  translateCount,
  type CountKey,
  type MessageKey,
  type TranslationValues,
} from "./translate";

type I18nValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: MessageKey, values?: TranslationValues) => string;
  tCount: (key: CountKey, count: number, values?: TranslationValues) => string;
};

const I18nContext = createContext<I18nValue | null>(null);

type I18nProviderProps = { initialLocale: Locale; children: ReactNode };

export function I18nProvider({ initialLocale, children }: I18nProviderProps) {
  const locale = useSyncExternalStore(
    localeStore.subscribe,
    localeStore.getSnapshot,
    () => initialLocale,
  );

  useEffect(() => {
    document.documentElement.lang = locale;
    localeStore.writeCookie(locale);
  }, [locale]);

  const value = useMemo<I18nValue>(
    () => ({
      locale,
      setLocale: localeStore.setLocale,
      t: (key, values) => translate(locale, key, values),
      tCount: (key, count, values) => translateCount(locale, key, count, values),
    }),
    [locale],
  );

  return <I18nContext value={value}>{children}</I18nContext>;
}

export function useI18n(): I18nValue {
  const value = useContext(I18nContext);
  if (!value) throw new Error("useI18n must be used inside I18nProvider");
  return value;
}
