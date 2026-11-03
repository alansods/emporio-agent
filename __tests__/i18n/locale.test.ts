import { afterEach, describe, expect, it, vi } from "vitest";

import { detectLocale, parseLocale } from "@/lib/i18n/locale";
import { localeStore } from "@/lib/storage/localeStore";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("parseLocale", () => {
  it.each([
    ["en", "en"],
    ["pt-BR", "pt-BR"],
    ["fr", undefined],
    [undefined, undefined],
  ])("parses %s as %s", (value, expected) => {
    expect(parseLocale(value)).toBe(expected);
  });
});

describe("detectLocale", () => {
  it.each([
    ["pt-PT", "pt-BR"],
    ["pt-BR", "pt-BR"],
    ["pt", "pt-BR"],
    ["es-ES", "en"],
    ["en-US", "en"],
    [undefined, "en"],
  ])("maps the browser language %s to %s", (language, expected) => {
    expect(detectLocale(language)).toBe(expected);
  });
});

describe("localeStore", () => {
  function browserLanguage(language: string) {
    vi.spyOn(window.navigator, "language", "get").mockReturnValue(language);
  }

  it("uses the browser language when nothing is saved", () => {
    browserLanguage("pt-PT");

    expect(localeStore.getSnapshot()).toBe("pt-BR");
  });

  it("prefers a saved choice over the browser language", () => {
    browserLanguage("pt-BR");
    localeStore.setLocale("en");

    expect(localeStore.getSnapshot()).toBe("en");
  });

  it("ignores an unknown saved value", () => {
    browserLanguage("pt-BR");
    window.localStorage.setItem("emporio.locale", "fr");

    expect(localeStore.getSnapshot()).toBe("pt-BR");
  });

  it("falls back to the locale cookie when local storage is empty", () => {
    browserLanguage("en-US");
    document.cookie = "locale=pt-BR; path=/";

    expect(localeStore.getSnapshot()).toBe("pt-BR");
  });
});
