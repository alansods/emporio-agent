import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { chatResponseSchema } from "@/lib/chat/schema";

describe("chatResponseSchema", () => {
  it("accepts the shared contract fixture", () => {
    const fixture: unknown = JSON.parse(
      readFileSync(join(process.cwd(), "tests/fixtures/chat_response.json"), "utf8"),
    );

    expect(chatResponseSchema.safeParse(fixture).success).toBe(true);
  });

  it("rejects a body without a string reply", () => {
    expect(chatResponseSchema.safeParse({ answer: "x" }).success).toBe(false);
    expect(chatResponseSchema.safeParse({ reply: 42 }).success).toBe(false);
  });

  it("ignores extra fields", () => {
    const result = chatResponseSchema.safeParse({ reply: "Oi", cards: [], extra: 1 });

    expect(result.success && result.data).toEqual({ reply: "Oi", cards: [] });
  });

  it("rejects a malformed card", () => {
    const body = { reply: "Oi", cards: [{ type: "product" }] };

    expect(chatResponseSchema.safeParse(body).success).toBe(false);
  });

  it("rejects a malformed trace", () => {
    const body = { reply: "Oi", cards: [], trace: { steps: "none" } };

    expect(chatResponseSchema.safeParse(body).success).toBe(false);
  });

  it("reads a reply-only body as no cards and no trace", () => {
    const result = chatResponseSchema.safeParse({ reply: "Oi" });

    expect(result.success && result.data).toEqual({ reply: "Oi", cards: [] });
  });
});
