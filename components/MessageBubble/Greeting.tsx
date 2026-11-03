import { useI18n } from "@/lib/i18n/I18nProvider";
import type { MessageKey } from "@/lib/i18n/translate";

import { MessageBubble } from "./MessageBubble";
import styles from "./MessageBubble.module.css";

const SUGGESTION_KEYS: MessageKey[] = [
  "greeting.suggestion1",
  "greeting.suggestion2",
  "greeting.suggestion3",
  "greeting.suggestion4",
];

type GreetingProps = { showSuggestions: boolean; onPick: (text: string) => void };

export function Greeting({ showSuggestions, onPick }: GreetingProps) {
  const { t } = useI18n();

  return (
    <MessageBubble role="agent">
      <p>{t("greeting.text")}</p>
      {showSuggestions && (
        <div className={styles.suggestions}>
          <span className={styles.suggestionsTitle}>{t("greeting.suggestionsTitle")}</span>
          {SUGGESTION_KEYS.map((key) => (
            <button key={key} type="button" className={styles.chip} onClick={() => onPick(t(key))}>
              {t(key)}
            </button>
          ))}
        </div>
      )}
    </MessageBubble>
  );
}
