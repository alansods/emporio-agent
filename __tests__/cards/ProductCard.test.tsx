import { screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { ProductCard } from "@/components/Cards/ProductCard";
import type { ProductCard as ProductCardData } from "@/lib/chat/schema";
import en from "@/locales/en.json";
import ptBR from "@/locales/pt-BR.json";

import { renderWithLocale } from "../renderWithLocale";

const GD20: ProductCardData = {
  type: "product",
  product_id: 107,
  name: "Takamine GD20 Dreadnought Natural",
  category: "Violões",
  availability: "available",
  stock: 4,
  list_price: 2199,
  promotion: null,
  effective_price: 2199,
  pix_price: 2089.05,
  installments: { count: 12, amount: 183.25 },
};

const OHANA: ProductCardData = {
  ...GD20,
  product_id: 121,
  name: "Ohana CK-20 Concert Natural",
  list_price: 549,
  promotion: { name: "Desconto Exclusivo", discount_percent: 10 },
  effective_price: 494.1,
  pix_price: null,
  installments: { count: 5, amount: 98.82 },
};

function card(): HTMLElement {
  return screen.getByRole("article");
}

afterEach(() => {
  window.localStorage.clear();
});

describe("ProductCard", () => {
  it("shows the tool values in Portuguese", () => {
    renderWithLocale(<ProductCard card={GD20} />, "pt-BR");

    const text = card().textContent?.replace(/\u00a0/g, " ");
    expect(screen.getByRole("heading", { name: GD20.name })).toBeInTheDocument();
    expect(text).toContain("R$ 2.199,00");
    expect(text).toContain("R$ 2.089,05");
    expect(text).toContain("12x");
    expect(text).toContain("R$ 183,25");
    expect(text).toContain(ptBR["cards.pix"]);
  });

  it("uses English labels and amounts", () => {
    renderWithLocale(<ProductCard card={GD20} />, "en");

    const text = card().textContent?.replace(/\u00a0/g, " ");
    expect(text).toContain("R$2,199.00");
    expect(text).toContain("R$183.25");
    expect(text).toContain(en["cards.installments"]);
    expect(text).toContain(en["availability.available"]);
  });

  it("shows the old price, the effective price and the discount", () => {
    renderWithLocale(<ProductCard card={OHANA} />, "pt-BR");

    const oldPrice = card().querySelector("s");
    expect(oldPrice?.textContent?.replace(/\u00a0/g, " ")).toBe("R$ 549,00");
    const text = card().textContent?.replace(/\u00a0/g, " ");
    expect(text).toContain("R$ 494,10");
    expect(text).toContain("10%");
    expect(text).toContain("Desconto Exclusivo");
    expect(text).not.toContain(ptBR["cards.pix"]);
  });

  it("shows the localized availability label", () => {
    renderWithLocale(<ProductCard card={{ ...GD20, availability: "out_of_stock" }} />, "pt-BR");

    expect(card()).toHaveTextContent(ptBR["availability.out_of_stock"]);
    expect(card()).not.toHaveTextContent("out_of_stock");
  });

  it("is plain content, not a focusable control", () => {
    renderWithLocale(<ProductCard card={GD20} />);

    expect(card().querySelector("a, button, [tabindex]")).toBeNull();
  });
});
