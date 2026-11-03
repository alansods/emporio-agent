import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { LanguageToggle } from "@/components/LanguageToggle/LanguageToggle";
import { TracePanel } from "@/components/TracePanel/TracePanel";
import type { LatestTrace } from "@/lib/chat/latestTrace";
import type { Trace } from "@/lib/chat/schema";
import en from "@/locales/en.json";
import ptBR from "@/locales/pt-BR.json";

import { renderWithLocale } from "../renderWithLocale";

const QUESTION = "Quanto custa o GD20?";
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

function entry(trace: Trace): LatestTrace {
  return { question: QUESTION, trace };
}

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

function argumentValue(key: string): string | null | undefined {
  const term = screen.getByText(key, { selector: "dt" });
  return term.nextElementSibling?.textContent;
}

describe("TracePanel", () => {
  it("shows the question, the tool call, its arguments and outcome", () => {
    renderWithLocale(<TracePanel entry={entry(SEARCH_TRACE)} />, "en");

    expect(screen.getByText(en["trace.answerTo"])).toBeInTheDocument();
    expect(screen.getByText(`“${QUESTION}”`)).toBeInTheDocument();
    expect(screen.getByText("search_products()")).toBeInTheDocument();
    expect(screen.getByText(new RegExp(en["tools.search_products"]))).toBeInTheDocument();
    expect(argumentValue("name")).toBe("GD20");
    expect(screen.getByText("1 product found")).toBeInTheDocument();
    expect(document.body).toHaveTextContent("2 model calls");
    expect(document.body).toHaveTextContent("2.3 s");
  });

  it("has no collapse control", () => {
    renderWithLocale(<TracePanel entry={entry(SEARCH_TRACE)} />, "en");

    expect(screen.queryByRole("button")).toBeNull();
    expect(document.querySelector("details")).toBeNull();
  });

  it("shows the empty state without a trace", () => {
    renderWithLocale(<TracePanel entry={null} />, "pt-BR");

    expect(screen.getByText(ptBR["trace.empty"])).toBeInTheDocument();
  });

  it("formats numbers and the duration in the active locale", () => {
    renderWithLocale(<TracePanel entry={entry(errorTrace("order_not_verified"))} />, "pt-BR");

    expect(argumentValue("order_id")).toBe("1");
    expect(document.body).toHaveTextContent("0,9 s");
  });

  it("labels a known error code", () => {
    renderWithLocale(<TracePanel entry={entry(errorTrace("order_not_verified"))} />, "pt-BR");

    expect(screen.getByText(ptBR["traceError.order_not_verified"])).toBeInTheDocument();
  });

  it("falls back to the generic label plus the code for an unknown error", () => {
    renderWithLocale(<TracePanel entry={entry(errorTrace("disk_on_fire"))} />, "en");

    expect(
      screen.getByText(en["trace.error.generic"].replace("{code}", "disk_on_fire")),
    ).toBeInTheDocument();
  });

  it("says no tools were used and still shows the model calls", () => {
    renderWithLocale(
      <TracePanel entry={entry({ model_calls: 1, duration_ms: 800, steps: [] })} />,
      "en",
    );

    expect(document.body).toHaveTextContent(en["trace.noTools"]);
    expect(document.body).toHaveTextContent("1 model call");
  });

  it("re-labels on a locale switch and keeps the question as written", () => {
    renderWithLocale(
      <>
        <LanguageToggle />
        <TracePanel entry={entry(SEARCH_TRACE)} />
      </>,
      "pt-BR",
    );
    expect(screen.getByText("1 produto encontrado")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "EN" }));

    expect(screen.getByText("1 product found")).toBeInTheDocument();
    expect(screen.getByText(en["trace.answerTo"])).toBeInTheDocument();
    expect(screen.getByText(`“${QUESTION}”`)).toBeInTheDocument();
  });
});
