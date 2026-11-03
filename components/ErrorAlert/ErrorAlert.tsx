import { ChatError } from "@/lib/chat/errors";
import { useI18n } from "@/lib/i18n/I18nProvider";

import styles from "./ErrorAlert.module.css";

function useErrorMessage(error: Error): string {
  const { t, tCount } = useI18n();
  const chatError = error instanceof ChatError ? error : new ChatError("generic");
  switch (chatError.kind) {
    case "invalid_request":
      return t("error.invalidRequest");
    case "rate_limited":
      return chatError.retryAfterSeconds
        ? tCount("error.rateLimited", chatError.retryAfterSeconds)
        : t("error.rateLimitedNoDelay");
    case "model_unavailable":
      return t("error.modelUnavailable");
    case "generic":
      return t("error.generic");
  }
}

export function ErrorAlert({ error }: { error: Error }) {
  const message = useErrorMessage(error);

  return (
    <div role="alert" className={styles.alert}>
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="var(--danger)"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        focusable="false"
      >
        <circle cx="12" cy="12" r="9" />
        <path d="M12 8v5M12 16h.01" />
      </svg>
      <p className={styles.text}>{message}</p>
    </div>
  );
}
