import { GuitarGlyph } from "@/components/GuitarGlyph/GuitarGlyph";

import styles from "./Header.module.css";

const BRAND_NAME = "Empório da Música";

export function Header() {
  return (
    <header className={styles.header}>
      <div className={styles.brand}>
        <GuitarGlyph />
        <p className={styles.name}>{BRAND_NAME}</p>
      </div>
    </header>
  );
}
