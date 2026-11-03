import en from "@/locales/en.json";
import ptBR from "@/locales/pt-BR.json";

import type { Locale } from "./locale";

export type MessageKey = keyof typeof en;
export type Dictionary = Record<MessageKey, string>;
export type TranslationValues = Record<string, string | number>;

/** Keys with `_one` / `_other` plural forms, named without the suffix. */
export type CountKey = {
  [K in MessageKey]: K extends `${infer Base}_other` ? Base : never;
}[MessageKey];

const DICTIONARIES: Record<Locale, Dictionary> = { en, "pt-BR": ptBR };

function interpolate(template: string, values: TranslationValues = {}): string {
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in values ? String(values[name]) : match,
  );
}

export function translate(locale: Locale, key: MessageKey, values?: TranslationValues): string {
  return interpolate(DICTIONARIES[locale][key], values);
}

/** Picks the plural form with the locale's rules, falling back to `_other` when a form is missing. */
export function translateCount(
  locale: Locale,
  key: CountKey,
  count: number,
  values: TranslationValues = {},
): string {
  const dictionary: Partial<Record<string, string>> = DICTIONARIES[locale];
  const form = new Intl.PluralRules(locale).select(count);
  const template = dictionary[`${key}_${form}`] ?? DICTIONARIES[locale][`${key}_other`];
  return interpolate(template, { ...values, count });
}

/** For keys built from API values (e.g. an error code) that the dictionary may not know. */
export function isMessageKey(key: string): key is MessageKey {
  return key in en;
}
