import { readFileSync } from "node:fs";
import { join } from "node:path";
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import Home from "@/app/page";
import { Providers } from "@/components/Providers/Providers";

function renderHome() {
  return render(
    <Providers initialLocale="en">
      <Home />
    </Providers>,
  );
}

describe("app shell", () => {
  it("shows the brand in the banner with a decorative glyph", () => {
    renderHome();

    const banner = screen.getByRole("banner");
    expect(within(banner).getByText("Empório da Música")).toBeInTheDocument();
    const glyph = banner.querySelector("svg");
    expect(glyph).toHaveAttribute("aria-hidden", "true");
  });

  it("has a main landmark with a polite live feed", () => {
    renderHome();

    const main = screen.getByRole("main");
    expect(main.querySelector('[aria-live="polite"]')).not.toBeNull();
  });

  it("offers no theme toggle", () => {
    renderHome();

    expect(
      screen.queryByRole("button", { name: /theme|dark|light|tema|escuro|claro/i }),
    ).toBeNull();
    expect(screen.queryByRole("switch")).toBeNull();
  });
});

describe("global styles", () => {
  it("neutralizes motion when reduced motion is preferred", () => {
    const css = readFileSync(join(process.cwd(), "styles/globals.css"), "utf8");

    expect(css).toMatch(/@media\s*\(prefers-reduced-motion:\s*reduce\)/);
    expect(css).toMatch(/animation-duration:\s*0\.01ms/);
    expect(css).toMatch(/transition-duration:\s*0\.01ms/);
  });
});
