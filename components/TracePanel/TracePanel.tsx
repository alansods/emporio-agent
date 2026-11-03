import type { LatestTrace } from "@/lib/chat/latestTrace";
import type { TraceOutcome } from "@/lib/chat/schema";
import { formatSeconds } from "@/lib/format";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { isMessageKey } from "@/lib/i18n/translate";

import styles from "./TracePanel.module.css";

const ICON_SIZE = 16;

function argumentText(value: unknown): string {
  return typeof value === "string" || typeof value === "number"
    ? String(value)
    : JSON.stringify(value);
}

export function TerminalIcon({ size = ICON_SIZE }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 17l6-5-6-5" />
      <path d="M12 19h8" />
    </svg>
  );
}

/** Body of the side panel and the narrow-screen sheet: the latest turn's tool calls. */
export function TracePanel({ entry }: { entry: LatestTrace | null }) {
  const { locale, t, tCount } = useI18n();

  if (!entry) return <p className={styles.muted}>{t("trace.empty")}</p>;

  function outcomeLabel(outcome: TraceOutcome): string {
    if (outcome.kind === "products") return tCount("trace.products", outcome.count);
    if (outcome.kind === "order") return t("trace.order");
    const key = `traceError.${outcome.code}`;
    return isMessageKey(key) ? t(key) : t("trace.error.generic", { code: outcome.code });
  }

  function toolLabel(tool: string): string {
    const key = `tools.${tool}`;
    return isMessageKey(key) ? t(key) : tool;
  }

  const { question, trace } = entry;
  const calls =
    trace.steps.length > 0 ? tCount("trace.toolCalls", trace.steps.length) : t("trace.noTools");
  const seconds = t("trace.seconds", { seconds: formatSeconds(locale, trace.duration_ms) });

  return (
    <div className={styles.body}>
      {question && (
        <p className={styles.question}>
          <span className={styles.muted}>{t("trace.answerTo")}</span>
          <span className={styles.quote}>{`“${question}”`}</span>
        </p>
      )}
      {trace.steps.length > 0 && (
        <ol className={styles.steps}>
          {trace.steps.map((step, index) => (
            <li key={index} className={styles.step}>
              <span className={styles.kind}>
                <TerminalIcon />
                {t("trace.kindTool")}
              </span>
              <code className={styles.tool}>{`${step.tool}()`}</code>
              <span className={styles.muted}>
                {toolLabel(step.tool)} · {t("trace.milliseconds", { ms: step.duration_ms })}
              </span>
              {Object.keys(step.arguments).length > 0 && (
                <dl className={styles.arguments}>
                  {Object.entries(step.arguments).map(([key, value]) => (
                    <div key={key} className={styles.argument}>
                      <dt className={styles.argumentKey}>{key}</dt>
                      <dd className={styles.argumentValue}>{argumentText(value)}</dd>
                    </div>
                  ))}
                </dl>
              )}
              <span className={styles.outcome}>{outcomeLabel(step.outcome)}</span>
            </li>
          ))}
        </ol>
      )}
      <p className={styles.summary}>
        {calls} · {tCount("trace.modelCalls", trace.model_calls)} · {seconds}
      </p>
      <p className={styles.footnote}>{t("trace.footnote")}</p>
    </div>
  );
}
