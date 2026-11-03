import { useI18n } from "@/lib/i18n/I18nProvider";

import { MessageBubble } from "./MessageBubble";
import styles from "./MessageBubble.module.css";

export function TypingIndicator() {
  const { t } = useI18n();

  return (
    <MessageBubble role="agent">
      <span className={styles.dots}>
        <span className="sr-only">{t("typing.label")}</span>
        <span className={styles.dot} aria-hidden="true" />
        <span className={styles.dot} aria-hidden="true" />
        <span className={styles.dot} aria-hidden="true" />
      </span>
    </MessageBubble>
  );
}
