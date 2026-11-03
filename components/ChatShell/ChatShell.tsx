import type { ReactNode } from "react";

import styles from "./ChatShell.module.css";

type ChatShellProps = {
  feedLabel: string;
  children: ReactNode;
  alert: ReactNode;
  composer: ReactNode;
};

export function ChatShell({ feedLabel, children, alert, composer }: ChatShellProps) {
  return (
    <main className={styles.layout}>
      <div className={styles.panel}>
        <div className={styles.feed} role="log" aria-live="polite" aria-label={feedLabel}>
          {children}
        </div>
        {alert}
        {composer}
      </div>
    </main>
  );
}
