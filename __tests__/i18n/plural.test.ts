import { describe, expect, it } from "vitest";

import { translateCount } from "@/lib/i18n/translate";

describe("translateCount", () => {
  it.each([
    ["en", 1, "1 second"],
    ["en", 30, "30 seconds"],
    ["pt-BR", 1, "1 segundo"],
    ["pt-BR", 30, "30 segundos"],
  ] as const)("%s with %i uses the right plural form", (locale, count, expected) => {
    const text = translateCount(locale, "error.rateLimited", count);

    expect(text).toContain(expected);
    expect(text).not.toContain(`${expected}s`);
  });
});
