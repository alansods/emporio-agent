import { describe, expect, it } from "vitest";

import en from "@/locales/en.json";
import ptBR from "@/locales/pt-BR.json";

const dictionaries: Record<string, Record<string, string>> = { en, "pt-BR": ptBR };

function placeholders(value: string): string[] {
  return [...value.matchAll(/\{(\w+)\}/g)].map((match) => match[1] ?? "").sort();
}

describe("dictionaries", () => {
  it("define the same keys", () => {
    expect(Object.keys(ptBR).sort()).toEqual(Object.keys(en).sort());
  });

  it("use the same placeholders in both languages", () => {
    for (const [key, value] of Object.entries(en)) {
      expect(placeholders(ptBR[key as keyof typeof ptBR] ?? ""), key).toEqual(placeholders(value));
    }
  });

  it.each(Object.entries(dictionaries))("%s has no empty values", (_locale, dictionary) => {
    for (const [key, value] of Object.entries(dictionary)) {
      expect(value.trim(), key).not.toBe("");
    }
  });
});
