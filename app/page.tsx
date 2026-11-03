import { ChatApp } from "@/components/ChatApp/ChatApp";

import styles from "./page.module.css";

export default function Home() {
  return (
    <div className={styles.app}>
      <ChatApp />
    </div>
  );
}
