import { screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { OrderCard } from "@/components/Cards/OrderCard";
import type { OrderCard as OrderCardData } from "@/lib/chat/schema";
import en from "@/locales/en.json";
import ptBR from "@/locales/pt-BR.json";

import { renderWithLocale } from "../renderWithLocale";

const ORDER: OrderCardData = {
  type: "order",
  order_id: 2,
  status: "delivered",
  order_date: "2026-03-01",
  estimated_delivery: "2026-03-20",
  tracking_code: "BRCX9876543BR",
  total: 5999,
  payment_method: "credit_6x",
  items: [{ product_name: "Taylor 110e Dreadnought Natural", quantity: 1 }],
  return_windows: [{ kind: "regret", deadline: "2026-03-27", open: true }],
};

afterEach(() => {
  window.localStorage.clear();
});

describe("OrderCard", () => {
  it("shows localized status, payment, window, deadline and open label", () => {
    renderWithLocale(<OrderCard card={ORDER} />, "pt-BR");

    const card = screen.getByRole("article");
    const text = card.textContent?.replace(/\u00a0/g, " ");
    expect(text).toContain(ptBR["orderStatus.delivered"]);
    expect(text).toContain(ptBR["payment.credit_6x"]);
    expect(text).toContain(ptBR["returnWindow.regret"]);
    expect(text).toContain(ptBR["cards.windowOpen"]);
    expect(text).toContain("27 de mar. de 2026");
    expect(text).toContain("R$ 5.999,00");
    expect(text).toContain("Taylor 110e Dreadnought Natural");
    expect(text).toContain("BRCX9876543BR");
    expect(text).not.toContain("credit_6x");
  });

  it("shows ISO dates on the same calendar day in English", () => {
    renderWithLocale(<OrderCard card={{ ...ORDER, order_date: "2026-01-01" }} />, "en");

    const text = screen.getByRole("article").textContent;
    expect(text).toContain("Jan 1, 2026");
    expect(text).toContain(en["orderStatus.delivered"]);
  });
});
