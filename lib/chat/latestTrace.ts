import type { Trace } from "@/lib/chat/schema";
import type { StoredMessage } from "@/lib/storage/historyStore";

export type LatestTrace = { question: string; trace: Trace };

/** The newest agent message that carries a trace, with the user message it answers. */
export function latestTrace(history: readonly StoredMessage[]): LatestTrace | null {
  for (let index = history.length - 1; index >= 0; index -= 1) {
    const trace = history[index]?.trace;
    if (history[index]?.role !== "agent" || !trace) continue;
    const previous = history[index - 1];
    return { question: previous?.role === "user" ? previous.text : "", trace };
  }
  return null;
}
