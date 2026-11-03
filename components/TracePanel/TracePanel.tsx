import type { Trace, TraceOutcome } from "@/lib/chat/schema";
import { formatSeconds } from "@/lib/format";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { isMessageKey } from "@/lib/i18n/translate";

import styles from "./TracePanel.module.css";

const JSON_INDENT = 2;

/** Native <details>: collapsed by default, keyboard and screen-reader support come with it. */
export function TracePanel({ trace }: { trace: Trace }) {
  const { locale, t, tCount } = useI18n();

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

  const calls =
    trace.steps.length > 0 ? tCount("trace.toolCalls", trace.steps.length) : t("trace.noTools");
  const seconds = t("trace.seconds", { seconds: formatSeconds(locale, trace.duration_ms) });

  return (
    <details className={styles.panel}>
      <summary className={styles.summary}>
        {t("trace.title")} · {calls} · {seconds}
      </summary>
      <div className={styles.body}>
        {trace.steps.length > 0 && (
          <ol className={styles.steps}>
            {trace.steps.map((step, index) => (
              <li key={index} className={styles.step}>
                {toolLabel(step.tool)} (<code className={styles.tool}>{step.tool}</code>) ·{" "}
                {t("trace.milliseconds", { ms: step.duration_ms })}
                <pre className={styles.arguments}>
                  {JSON.stringify(step.arguments, null, JSON_INDENT)}
                </pre>
                {outcomeLabel(step.outcome)}
              </li>
            ))}
          </ol>
        )}
        <p className={styles.modelCalls}>{tCount("trace.modelCalls", trace.model_calls)}</p>
      </div>
    </details>
  );
}
