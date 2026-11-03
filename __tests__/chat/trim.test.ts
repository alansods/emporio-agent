import { describe, expect, it } from "vitest";

import { MAX_MESSAGES } from "@/lib/chat/limits";
import type { ChatMessage } from "@/lib/chat/schema";
import { trimForRequest } from "@/lib/chat/trim";

function alternating(count: number): ChatMessage[] {
  return Array.from({ length: count }, (_, index) => ({
    role: index % 2 === 0 ? "user" : "agent",
    text: `message ${index}`,
  }));
}

describe("trimForRequest", () => {
  it("keeps a short history as it is", () => {
    const messages = alternating(3);

    expect(trimForRequest(messages)).toEqual(messages);
  });

  it("keeps the most recent messages, starting with the user", () => {
    const messages = alternating(25);

    const trimmed = trimForRequest(messages);

    expect(trimmed.length).toBeLessThanOrEqual(MAX_MESSAGES);
    expect(trimmed[0]?.role).toBe("user");
    expect(trimmed.at(-1)).toEqual(messages.at(-1));
    expect(trimmed).toEqual(messages.slice(messages.length - trimmed.length));
  });

  it("keeps exactly the limit when the window already starts with the user", () => {
    const messages = alternating(21).slice(1);
    messages.push({ role: "user", text: "new" });

    const trimmed = trimForRequest(messages);

    expect(trimmed).toHaveLength(MAX_MESSAGES);
    expect(trimmed[0]?.role).toBe("user");
  });
});
