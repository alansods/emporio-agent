"use client";

import { useRef, useState } from "react";
import type { MouseEvent } from "react";

import { TerminalIcon, TracePanel } from "@/components/TracePanel/TracePanel";
import type { LatestTrace } from "@/lib/chat/latestTrace";
import { useI18n } from "@/lib/i18n/I18nProvider";

import styles from "./TraceSheet.module.css";

const HEADING_ID = "trace-sheet-title";
const ICON_SIZE = 18;

/**
 * Narrow-screen access to the trace: a header button (hidden above 760 px by CSS) that opens a native modal
 * dialog, which brings the focus trap and Esc. Content renders only while open.
 */
export function TraceSheet({ entry }: { entry: LatestTrace | null }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  function show() {
    dialogRef.current?.showModal();
    setOpen(true);
  }

  function onClose() {
    setOpen(false);
    triggerRef.current?.focus();
  }

  /** A click on the dialog element itself, not its content, is a click on the backdrop. */
  function onDialogClick(event: MouseEvent<HTMLDialogElement>) {
    if (event.target === event.currentTarget) dialogRef.current?.close();
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className={styles.trigger}
        aria-label={t("trace.title")}
        onClick={show}
      >
        <TerminalIcon size={ICON_SIZE} />
      </button>
      {/* Keyboard users close it with Esc or the close button; the click only adds the backdrop. */}
      <dialog
        ref={dialogRef}
        className={styles.sheet}
        aria-labelledby={HEADING_ID}
        onClose={onClose}
        onClick={onDialogClick}
      >
        {open && (
          <div className={styles.content}>
            <div className={styles.bar}>
              <h2 id={HEADING_ID} className={styles.heading}>
                {t("trace.title")}
              </h2>
              <button
                type="button"
                className={styles.close}
                aria-label={t("trace.close")}
                onClick={() => dialogRef.current?.close()}
              >
                <svg
                  width={ICON_SIZE}
                  height={ICON_SIZE}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  aria-hidden="true"
                >
                  <path d="M6 6l12 12M18 6 6 18" />
                </svg>
              </button>
            </div>
            <div className={styles.scroll}>
              <TracePanel entry={entry} />
            </div>
          </div>
        )}
      </dialog>
    </>
  );
}
