import { fireEvent, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { TracePanel } from "@/components/TracePanel/TracePanel";
import type { Trace } from "@/lib/chat/schema";
import en from "@/locales/en.json";
import ptBR from "@/locales/pt-BR.json";

import { renderWithLocale } from "../renderWithLocale";

const SEARCH_TRACE: Trace = {
  model_calls: 2,
  duration_ms: 2310,
  steps: [
    {
      tool: "search_products",
      arguments: { name: "GD20" },
      outcome: { kind: "products", count: 1 },
      duration_ms: 4,
    },
  ],
};

function errorTrace(code: string): Trace {
  return {
    model_calls: 2,
    duration_ms: 900,
    steps: [
      {
        tool: "get_order_status",
        arguments: { order_id: 1, name_or_email: "Maria" },
        outcome: { kind: "error", code },
        duration_ms: 1,
      },
    ],
  };
}

function details(): HTMLDetailsElement {
  return screen.getByRole("group") as HTMLDetailsElement;
}

function summary(): HTMLElement {
  return details().querySelector("summary") as HTMLElement;
}

afterEach(() => {
  window.localStorage.clear();
});

describe("TracePanel", () => {
  it("is collapsed and summarizes calls and duration", () => {
    renderWithLocale(<TracePanel trace={SEARCH_TRACE} />, "en");

    expect(details().open).toBe(false);
    expect(summary()).toHaveTextContent("1 tool call");
    expect(summary()).toHaveTextContent("2.3 s");
  });

  it("uses the active locale in the summary", () => {
    renderWithLocale(<TracePanel trace={SEARCH_TRACE} />, "pt-BR");

    expect(summary()).toHaveTextContent("2,3 s");
  });

  it("opens from its summary and shows the step", () => {
    renderWithLocale(<TracePanel trace={SEARCH_TRACE} />, "en");

    summary().focus();
    expect(summary()).toHaveFocus();
    fireEvent.click(summary());

    expect(details().open).toBe(true);
    expect(details()).toHaveTextContent("1 product found");
    expect(details()).toHaveTextContent(en["tools.search_products"]);
    expect(details()).toHaveTextContent("search_products");
    expect(details()).toHaveTextContent('"name": "GD20"');
    expect(details()).toHaveTextContent("2 model calls");
  });

  it("labels a known error code", () => {
    renderWithLocale(<TracePanel trace={errorTrace("order_not_verified")} />, "pt-BR");

    expect(details()).toHaveTextContent(ptBR["traceError.order_not_verified"]);
  });

  it("falls back to the generic label plus the code for an unknown error", () => {
    renderWithLocale(<TracePanel trace={errorTrace("disk_on_fire")} />, "en");

    expect(details()).toHaveTextContent(
      en["trace.error.generic"].replace("{code}", "disk_on_fire"),
    );
  });

  it("says no tools were used and still shows the model calls", () => {
    renderWithLocale(<TracePanel trace={{ model_calls: 1, duration_ms: 800, steps: [] }} />, "en");

    expect(summary()).toHaveTextContent(en["trace.noTools"].replace("{seconds}", "0.8"));
    expect(details()).toHaveTextContent("1 model call");
  });
});
