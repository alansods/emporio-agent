import type { FormEvent, KeyboardEvent, Ref } from "react";

import { MAX_MESSAGE_CHARS } from "@/lib/chat/limits";
import { useI18n } from "@/lib/i18n/I18nProvider";

import styles from "./Composer.module.css";

const FIELD_ID = "composer";

type ComposerProps = {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  ref: Ref<HTMLTextAreaElement>;
};

export function Composer({ value, onChange, onSubmit, ref }: ComposerProps) {
  const { t } = useI18n();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) return;
    event.preventDefault();
    onSubmit();
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <label htmlFor={FIELD_ID} className="sr-only">
        {t("composer.label")}
      </label>
      <textarea
        id={FIELD_ID}
        ref={ref}
        className={styles.field}
        rows={1}
        maxLength={MAX_MESSAGE_CHARS}
        value={value}
        placeholder={t("composer.placeholder")}
        onChange={(event) => onChange(event.target.value.slice(0, MAX_MESSAGE_CHARS))}
        onKeyDown={handleKeyDown}
      />
      <button type="submit" className={styles.send} aria-label={t("composer.send")}>
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          focusable="false"
        >
          <path d="M5 12h14M13 6l6 6-6 6" />
        </svg>
        <span className={styles.sendLabel} aria-hidden="true">
          {t("composer.send")}
        </span>
      </button>
    </form>
  );
}
