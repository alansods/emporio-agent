"use client";

import { useI18n } from "@/lib/i18n/I18nProvider";
import type { Locale } from "@/lib/i18n/locale";

import styles from "./LanguageToggle.module.css";

/** Labels are the same in every locale, so they are not dictionary entries. */
const OPTIONS: ReadonlyArray<{ locale: Locale; label: string }> = [
  { locale: "en", label: "EN" },
  { locale: "pt-BR", label: "PT-BR" },
];

export function LanguageToggle() {
  const { locale, setLocale, t } = useI18n();

  return (
    <div role="group" aria-label={t("header.language")} className={styles.group}>
      {OPTIONS.map((option) => (
        <button
          key={option.locale}
          type="button"
          lang={option.locale}
          aria-pressed={option.locale === locale}
          className={styles.option}
          onClick={() => setLocale(option.locale)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
