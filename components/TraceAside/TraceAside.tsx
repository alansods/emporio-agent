import { TerminalIcon, TracePanel } from "@/components/TracePanel/TracePanel";
import type { LatestTrace } from "@/lib/chat/latestTrace";
import { useI18n } from "@/lib/i18n/I18nProvider";

import styles from "./TraceAside.module.css";

const HEADING_ID = "trace-aside-title";
const HEADING_ICON_SIZE = 18;

/** Always-open side panel with the latest turn's trace; hidden on narrow screens by CSS. */
export function TraceAside({ entry }: { entry: LatestTrace | null }) {
  const { t } = useI18n();

  return (
    <aside className={styles.aside} aria-labelledby={HEADING_ID}>
      <h2 id={HEADING_ID} className={styles.heading}>
        <span className={styles.icon}>
          <TerminalIcon size={HEADING_ICON_SIZE} />
        </span>
        {t("trace.title")}
      </h2>
      <div className={styles.scroll}>
        <TracePanel entry={entry} />
      </div>
    </aside>
  );
}
