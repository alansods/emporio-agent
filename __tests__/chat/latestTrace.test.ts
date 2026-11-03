import { describe, expect, it } from "vitest";

import { latestTrace } from "@/lib/chat/latestTrace";
import type { Trace } from "@/lib/chat/schema";
import type { StoredMessage } from "@/lib/storage/historyStore";

function trace(tool: string): Trace {
  return {
    model_calls: 2,
    duration_ms: 1000,
    steps: [{ tool, arguments: {}, outcome: { kind: "products", count: 1 }, duration_ms: 3 }],
  };
}

describe("latestTrace", () => {
  it("returns null for an empty history", () => {
    expect(latestTrace([])).toBeNull();
  });

  it("returns null when no agent message has a trace", () => {
    const history: StoredMessage[] = [
      { role: "user", text: "Oi" },
      { role: "agent", text: "Olá!" },
    ];

    expect(latestTrace(history)).toBeNull();
  });

  it("picks the last agent trace and the question before it", () => {
    const history: StoredMessage[] = [
      { role: "user", text: "Quanto custa o GD20?" },
      { role: "agent", text: "R$ 2.199,00", trace: trace("search_products") },
      { role: "user", text: "E o pedido 7?" },
      { role: "agent", text: "Seu nome?", trace: trace("get_order_status") },
    ];

    expect(latestTrace(history)).toEqual({
      question: "E o pedido 7?",
      trace: trace("get_order_status"),
    });
  });

  it("skips a later agent message without a trace", () => {
    const history: StoredMessage[] = [
      { role: "user", text: "Quanto custa o GD20?" },
      { role: "agent", text: "R$ 2.199,00", trace: trace("search_products") },
      { role: "user", text: "Oi" },
      { role: "agent", text: "Olá!" },
    ];

    expect(latestTrace(history)?.question).toBe("Quanto custa o GD20?");
  });
});
