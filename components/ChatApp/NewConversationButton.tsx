import { useI18n } from "@/lib/i18n/I18nProvider";

import styles from "./ChatApp.module.css";

export function NewConversationButton({ onClick }: { onClick: () => void }) {
  const { t } = useI18n();

  return (
    <button
      type="button"
      className={styles.newChat}
      aria-label={t("header.newConversation")}
      onClick={onClick}
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        focusable="false"
      >
        <path d="M12 5v14M5 12h14" />
      </svg>
      <span className={styles.newChatLabel} aria-hidden="true">
        {t("header.newConversation")}
      </span>
    </button>
  );
}
