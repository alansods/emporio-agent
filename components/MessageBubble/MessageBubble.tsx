import type { ReactNode } from "react";

import { GuitarGlyph } from "@/components/GuitarGlyph/GuitarGlyph";
import type { ChatMessage } from "@/lib/chat/schema";

import styles from "./MessageBubble.module.css";

const AVATAR_SIZE = 18;

type MessageBubbleProps = { role: ChatMessage["role"]; children: ReactNode };

export function MessageBubble({ role, children }: MessageBubbleProps) {
  if (role === "user") {
    return (
      <div className={`${styles.row} ${styles.userRow}`}>
        <p className={`${styles.bubble} ${styles.user}`}>{children}</p>
      </div>
    );
  }
  return (
    <div className={styles.row}>
      <span className={styles.avatar}>
        <GuitarGlyph size={AVATAR_SIZE} />
      </span>
      <div className={`${styles.bubble} ${styles.agent}`}>{children}</div>
    </div>
  );
}
