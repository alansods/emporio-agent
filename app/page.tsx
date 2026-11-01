import { ChatShell } from "@/components/ChatShell/ChatShell";
import { Header } from "@/components/Header/Header";

import styles from "./page.module.css";

export default function Home() {
  return (
    <div className={styles.app}>
      <Header />
      <ChatShell />
    </div>
  );
}
