import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { chatResponseSchema } from "@/lib/chat/schema";
import { historyStore, type StoredMessage } from "@/lib/storage/historyStore";

const HISTORY_KEY = "emporio.history.v1";
const FIXTURE = chatResponseSchema.parse(
  JSON.parse(readFileSync(join(process.cwd(), "tests/fixtures/chat_response.json"), "utf8")),
);

afterEach(() => {
  window.localStorage.clear();
});

describe("historyStore", () => {
  it("loads messages saved before cards existed", () => {
    const old = [
      { role: "user", text: "Oi" },
      { role: "agent", text: "Olá!" },
    ];
    window.localStorage.setItem(HISTORY_KEY, JSON.stringify(old));

    expect(historyStore.getSnapshot()).toEqual(old);
  });

  it("round-trips cards and trace", () => {
    const messages: StoredMessage[] = [
      { role: "user", text: "Ohana?" },
      { role: "agent", text: FIXTURE.reply, cards: FIXTURE.cards, trace: FIXTURE.trace },
    ];

    historyStore.save(messages);

    expect(historyStore.getSnapshot()).toEqual(messages);
  });

  it.each([
    ["invalid JSON", "{not json"],
    ["wrong shape", JSON.stringify([{ role: "agent", text: "x", cards: [{ type: "product" }] }])],
  ])("reads %s as an empty conversation", (_label, raw) => {
    window.localStorage.setItem(HISTORY_KEY, raw);

    expect(historyStore.getSnapshot()).toEqual([]);
  });
});
