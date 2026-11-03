import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { LanguageToggle } from "@/components/LanguageToggle/LanguageToggle";
import { Providers } from "@/components/Providers/Providers";
import { useI18n } from "@/lib/i18n/I18nProvider";

function Probe() {
  const { t } = useI18n();
  return <p>{t("composer.send")}</p>;
}

function renderToggle() {
  window.localStorage.setItem("emporio.locale", "pt-BR");
  return render(
    <Providers initialLocale="pt-BR">
      <LanguageToggle />
      <Probe />
    </Providers>,
  );
}

describe("LanguageToggle", () => {
  it("marks the active locale as pressed inside a labelled group", () => {
    renderToggle();

    expect(screen.getByRole("group", { name: "Idioma" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "PT-BR" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "EN" })).toHaveAttribute("aria-pressed", "false");
  });

  it("switches the UI, the document language and the saved choice", () => {
    renderToggle();

    fireEvent.click(screen.getByRole("button", { name: "EN" }));

    expect(screen.getByText("Send")).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Language" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "EN" })).toHaveAttribute("aria-pressed", "true");
    expect(document.documentElement.lang).toBe("en");
    expect(window.localStorage.getItem("emporio.locale")).toBe("en");
    expect(document.cookie).toContain("locale=en");
  });
});
