import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { Providers } from "@/components/Providers/Providers";
import { useI18n } from "@/lib/i18n/I18nProvider";
import ptBR from "@/locales/pt-BR.json";

const cookieValue = vi.hoisted(() => ({ current: undefined as string | undefined }));

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) =>
      name === "locale" && cookieValue.current ? { name, value: cookieValue.current } : undefined,
  }),
}));

vi.mock("next/font/google", () => ({
  Inter: () => ({ variable: "font-inter" }),
  Sora: () => ({ variable: "font-sora" }),
}));

function Greeting() {
  const { t } = useI18n();
  return <p>{t("greeting.text")}</p>;
}

async function htmlLang(cookie: string | undefined): Promise<unknown> {
  cookieValue.current = cookie;
  const { default: RootLayout } = await import("@/app/layout");
  const element = await RootLayout({ children: null, params: Promise.resolve({}) });
  return element.props.lang;
}

describe("server render", () => {
  it("renders the initial locale's strings", () => {
    const html = renderToString(
      <Providers initialLocale="pt-BR">
        <Greeting />
      </Providers>,
    );

    expect(html).toContain(ptBR["greeting.text"]);
  });

  it("sets the html lang from the locale cookie", async () => {
    expect(await htmlLang("pt-BR")).toBe("pt-BR");
  });

  it("defaults the html lang to English without a cookie", async () => {
    expect(await htmlLang(undefined)).toBe("en");
  });

  it("ignores an unknown cookie value", async () => {
    expect(await htmlLang("fr")).toBe("en");
  });
});
