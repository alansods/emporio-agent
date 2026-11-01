import styles from "./ChatShell.module.css";

export function ChatShell() {
  return (
    <main className={styles.layout}>
      <div className={styles.panel}>
        <div className={styles.feed} role="log" aria-live="polite" />
      </div>
    </main>
  );
}
