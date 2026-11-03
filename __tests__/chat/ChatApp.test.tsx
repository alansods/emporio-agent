import { readFileSync } from "node:fs";
import { join } from "node:path";

import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import Home from "@/app/page";
import { Providers } from "@/components/Providers/Providers";
import type { ChatMessage, Locale } from "@/lib/chat/schema";
import en from "@/locales/en.json";
import ptBR from "@/locales/pt-BR.json";

const HISTORY_KEY = "emporio.history.v1";
const FULL_RESPONSE: { reply: string } = JSON.parse(
  readFileSync(join(process.cwd(), "tests/fixtures/chat_response.json"), "utf8"),
);
const PRODUCT_NAME = "Ohana CK-20 Concert Natural";
const ORDER_ONLY_RESPONSE = {
  reply: "Seu pedido foi entregue.",
  cards: [],
  trace: {
    model_calls: 2,
    duration_ms: 1200,
    steps: [
      {
        tool: "get_order_status",
        arguments: { order_id: 7, name_or_email: "Letícia Gonçalves Rocha" },
        outcome: { kind: "order" },
        duration_ms: 2,
      },
    ],
  },
};

type Deferred = { resolve: (response: Response) => void };

function jsonResponse(status: number, body: unknown, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...headers },
  });
}

function stubFetch(...responses: Response[]) {
  const fetchMock = vi.fn(() => {
    const next = responses.shift();
    return next ? Promise.resolve(next) : Promise.reject(new TypeError("Failed to fetch"));
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function stubPendingFetch(): { fetchMock: ReturnType<typeof vi.fn>; deferred: Deferred } {
  const deferred: Deferred = { resolve: () => undefined };
  const fetchMock = vi.fn(
    () =>
      new Promise<Response>((resolve) => {
        deferred.resolve = resolve;
      }),
  );
  vi.stubGlobal("fetch", fetchMock);
  return { fetchMock, deferred };
}

function requestBody(
  fetchMock: ReturnType<typeof vi.fn>,
  call = 0,
): { messages: ChatMessage[]; locale: Locale } {
  const init = fetchMock.mock.calls[call]?.[1] as RequestInit;
  return JSON.parse(String(init.body));
}

function storedHistory(): ChatMessage[] {
  return JSON.parse(window.localStorage.getItem(HISTORY_KEY) ?? "[]");
}

function renderApp({
  locale = "pt-BR",
  history,
}: { locale?: Locale; history?: ChatMessage[] } = {}) {
  window.localStorage.setItem("emporio.locale", locale);
  if (history) window.localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  return render(
    <Providers initialLocale={locale}>
      <Home />
    </Providers>,
  );
}

function composer(): HTMLTextAreaElement {
  return screen.getByRole("textbox") as HTMLTextAreaElement;
}

function type(text: string) {
  fireEvent.change(composer(), { target: { value: text } });
}

function pressEnter(options: { shiftKey?: boolean } = {}) {
  fireEvent.keyDown(composer(), { key: "Enter", ...options });
}

function feed(): HTMLElement {
  return screen.getByRole("log");
}

function tracePanel(locale: Locale = "pt-BR"): HTMLElement {
  const dictionary = locale === "en" ? en : ptBR;
  return screen.getByRole("complementary", { name: dictionary["trace.title"] });
}

function alternating(count: number): ChatMessage[] {
  return Array.from({ length: count }, (_, index) => ({
    role: index % 2 === 0 ? "user" : "agent",
    text: `message ${index}`,
  }));
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("empty conversation", () => {
  it("shows the greeting and suggestions without calling the API", () => {
    const fetchMock = stubFetch();
    renderApp();

    expect(within(feed()).getByText(ptBR["greeting.text"])).toBeInTheDocument();
    expect(screen.getByRole("button", { name: ptBR["greeting.suggestion2"] })).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("sends a suggestion as the user's only message and hides the suggestions", async () => {
    const { fetchMock } = stubPendingFetch();
    renderApp();

    fireEvent.click(screen.getByRole("button", { name: ptBR["greeting.suggestion2"] }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(requestBody(fetchMock).messages).toEqual([
      { role: "user", text: ptBR["greeting.suggestion2"] },
    ]);
    expect(screen.queryByRole("button", { name: ptBR["greeting.suggestion1"] })).toBeNull();
  });
});

describe("composer", () => {
  it("sends on Enter and clears the field", async () => {
    const fetchMock = stubFetch(jsonResponse(200, { reply: "Olá!" }));
    renderApp();

    type("Oi");
    pressEnter();

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(requestBody(fetchMock).messages.at(-1)).toEqual({ role: "user", text: "Oi" });
    expect(composer().value).toBe("");
  });

  it("adds a line on Shift+Enter without sending", () => {
    const fetchMock = stubFetch();
    renderApp();

    type("a\nb");
    pressEnter({ shiftKey: true });

    expect(fetchMock).not.toHaveBeenCalled();
    expect(composer().value).toBe("a\nb");
  });

  it("does not send blank text", () => {
    const fetchMock = stubFetch();
    renderApp();

    type("   ");
    pressEnter();
    fireEvent.click(screen.getByRole("button", { name: ptBR["composer.send"] }));

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("does not start a second request while a turn is pending", async () => {
    const { fetchMock } = stubPendingFetch();
    renderApp();

    type("Oi");
    pressEnter();
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    type("De novo");
    pressEnter();
    fireEvent.click(screen.getByRole("button", { name: ptBR["composer.send"] }));

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("caps the text at 2000 characters", () => {
    renderApp();

    type("x".repeat(2500));

    expect(composer().value).toHaveLength(2000);
  });
});

describe("turns", () => {
  it("shows the pending message and an announced typing indicator", async () => {
    stubPendingFetch();
    renderApp();

    type("Oi");
    pressEnter();

    expect(await within(feed()).findByText("Oi")).toBeInTheDocument();
    expect(within(feed()).getByText(ptBR["typing.label"])).toBeInTheDocument();
  });

  it("appends the reply and removes the typing indicator", async () => {
    stubFetch(jsonResponse(200, { reply: "Olá!" }));
    renderApp();

    type("Oi");
    pressEnter();

    expect(await within(feed()).findByText("Olá!")).toBeInTheDocument();
    expect(within(feed()).getByText("Oi")).toBeInTheDocument();
    expect(within(feed()).queryByText(ptBR["typing.label"])).toBeNull();
    expect(storedHistory()).toEqual([
      { role: "user", text: "Oi" },
      { role: "agent", text: "Olá!", cards: [] },
    ]);
  });

  it("shows cards under the reply and the trace only in the side panel", async () => {
    stubFetch(jsonResponse(200, FULL_RESPONSE));
    renderApp();
    expect(within(tracePanel()).getByText(ptBR["trace.empty"])).toBeInTheDocument();

    type("Ohana e pedido 1");
    pressEnter();

    await within(feed()).findByRole("heading", { name: PRODUCT_NAME });
    const articles = within(feed()).getAllByRole("article");
    expect(articles).toHaveLength(2);
    expect(articles[0]).toHaveTextContent(PRODUCT_NAME);
    expect(articles[1]).toHaveTextContent(ptBR["orderStatus.delivered"]);
    expect(within(feed()).queryByText("search_products()")).toBeNull();
    expect(within(tracePanel()).getByText("“Ohana e pedido 1”")).toBeInTheDocument();
    expect(within(tracePanel()).getByText("search_products()")).toBeInTheDocument();
    expect(within(tracePanel()).getByText("get_order_status()")).toBeInTheDocument();
    expect(
      within(feed()).getByText("Ohana CK-20 Concert Natural", { selector: "strong" }),
    ).toBeInTheDocument();
  });

  it("switches the side panel to the newest turn", async () => {
    stubFetch(jsonResponse(200, FULL_RESPONSE), jsonResponse(200, ORDER_ONLY_RESPONSE));
    renderApp();
    type("Ohana e pedido 1");
    pressEnter();
    await within(feed()).findByRole("heading", { name: PRODUCT_NAME });

    type("E o pedido 7?");
    pressEnter();

    await within(feed()).findByText(ORDER_ONLY_RESPONSE.reply);
    expect(within(tracePanel()).getByText("“E o pedido 7?”")).toBeInTheDocument();
    expect(within(tracePanel()).getByText("get_order_status()")).toBeInTheDocument();
    expect(within(tracePanel()).queryByText("search_products()")).toBeNull();
  });

  it("shows HTML in a reply as literal text", async () => {
    stubFetch(jsonResponse(200, { reply: "<b>oi</b>" }));
    renderApp();

    type("Oi");
    pressEnter();

    expect(await within(feed()).findByText("<b>oi</b>")).toBeInTheDocument();
    expect(feed().querySelector("b")).toBeNull();
  });

  it("trims the request but keeps every stored message on screen", async () => {
    const history = alternating(24);
    const fetchMock = stubFetch(jsonResponse(200, { reply: "ok" }));
    renderApp({ history });

    type("new");
    pressEnter();

    await within(feed()).findByText("ok");
    const { messages } = requestBody(fetchMock);
    expect(messages.length).toBeLessThanOrEqual(20);
    expect(messages[0]?.role).toBe("user");
    expect(messages.at(-1)).toEqual({ role: "user", text: "new" });
    for (const message of history) {
      expect(within(feed()).getByText(message.text)).toBeInTheDocument();
    }
  });
});

describe("errors", () => {
  async function failWith(response: Response, locale: Locale = "pt-BR") {
    stubFetch(response);
    renderApp({ locale });
    type("Oi");
    pressEnter();
    return screen.findByRole("alert");
  }

  it("says how many seconds to wait when rate limited", async () => {
    const alert = await failWith(
      jsonResponse(429, { error: "rate_limited" }, { "Retry-After": "30" }),
    );

    expect(alert).toHaveTextContent(ptBR["error.rateLimited_other"].replace("{count}", "30"));
  });

  it("uses the active locale for the rate limit message", async () => {
    const alert = await failWith(
      jsonResponse(429, { error: "rate_limited" }, { "Retry-After": "1" }),
      "en",
    );

    expect(alert).toHaveTextContent(en["error.rateLimited_one"].replace("{count}", "1"));
  });

  it("asks to try again shortly without a usable Retry-After", async () => {
    const alert = await failWith(jsonResponse(429, { error: "rate_limited" }));

    expect(alert).toHaveTextContent(ptBR["error.rateLimitedNoDelay"]);
  });

  it("says the assistant is unavailable on 503", async () => {
    const alert = await failWith(jsonResponse(503, { error: "model_unavailable" }));

    expect(alert).toHaveTextContent(ptBR["error.modelUnavailable"]);
  });

  it("suggests a new conversation on 422", async () => {
    const alert = await failWith(jsonResponse(422, { error: "invalid_request" }));

    expect(alert).toHaveTextContent(ptBR["error.invalidRequest"]);
  });

  it.each([
    ["500", jsonResponse(500, { error: "internal_error" })],
    ["a malformed body", jsonResponse(200, { answer: "x" })],
  ])("shows the generic message on %s", async (_label, response) => {
    const alert = await failWith(response);

    expect(alert).toHaveTextContent(ptBR["error.generic"]);
  });

  it("shows the generic message on a network failure", async () => {
    stubFetch();
    renderApp();
    type("Oi");
    pressEnter();

    expect(await screen.findByRole("alert")).toHaveTextContent(ptBR["error.generic"]);
  });

  it("keeps the history unchanged and puts the text back in the composer", async () => {
    await failWith(jsonResponse(503, { error: "model_unavailable" }));

    expect(storedHistory()).toEqual([]);
    expect(composer().value).toBe("Oi");
    expect(within(feed()).queryByText("Oi")).toBeNull();
  });

  it("removes the alert on the next send", async () => {
    stubFetch(
      jsonResponse(503, { error: "model_unavailable" }),
      jsonResponse(200, { reply: "Olá!" }),
    );
    renderApp();
    type("Oi");
    pressEnter();
    await screen.findByRole("alert");

    pressEnter();

    await waitFor(() => expect(screen.queryByRole("alert")).toBeNull());
    expect(await within(feed()).findByText("Olá!")).toBeInTheDocument();
  });
});

describe("persistence", () => {
  it("restores the conversation after a reload", async () => {
    stubFetch(jsonResponse(200, { reply: "Olá!" }));
    const { unmount } = renderApp();
    type("Oi");
    pressEnter();
    await within(feed()).findByText("Olá!");

    unmount();
    renderApp();

    const texts = within(feed())
      .getAllByText(/^(Oi|Olá!)$/)
      .map((element) => element.textContent);
    expect(texts).toEqual(["Oi", "Olá!"]);
  });

  it("keeps cards and the side panel trace after a reload", async () => {
    stubFetch(jsonResponse(200, FULL_RESPONSE));
    const { unmount } = renderApp();
    type("Ohana e pedido 1");
    pressEnter();
    await within(feed()).findByRole("heading", { name: PRODUCT_NAME });

    unmount();
    renderApp();

    expect(within(feed()).getByRole("heading", { name: PRODUCT_NAME })).toBeInTheDocument();
    expect(within(tracePanel()).getByText("get_order_status()")).toBeInTheDocument();
  });

  it("shows the empty panel for a history saved before cards", () => {
    renderApp({
      history: [
        { role: "user", text: "Oi" },
        { role: "agent", text: "Olá!" },
      ],
    });

    expect(within(feed()).getByText("Olá!")).toBeInTheDocument();
    expect(within(tracePanel()).getByText(ptBR["trace.empty"])).toBeInTheDocument();
  });

  it.each([["not json"], [JSON.stringify([{ role: "system", text: "x" }])], [JSON.stringify({})]])(
    "treats corrupted storage %s as an empty conversation",
    (raw) => {
      window.localStorage.setItem(HISTORY_KEY, raw);
      renderApp();

      expect(within(feed()).getByText(ptBR["greeting.text"])).toBeInTheDocument();
      expect(screen.queryByRole("alert")).toBeNull();
    },
  );
});

describe("new conversation", () => {
  it("clears the history, shows the greeting and focuses the composer", () => {
    renderApp({
      history: [
        { role: "user", text: "Oi" },
        { role: "agent", text: "Olá!" },
      ],
    });

    fireEvent.click(screen.getByRole("button", { name: ptBR["header.newConversation"] }));

    expect(within(feed()).queryByText("Olá!")).toBeNull();
    expect(screen.getByRole("button", { name: ptBR["greeting.suggestion1"] })).toBeInTheDocument();
    expect(storedHistory()).toEqual([]);
    expect(composer()).toHaveFocus();
  });

  it("removes a visible alert", async () => {
    stubFetch(jsonResponse(503, { error: "model_unavailable" }));
    renderApp();
    type("Oi");
    pressEnter();
    await screen.findByRole("alert");

    fireEvent.click(screen.getByRole("button", { name: ptBR["header.newConversation"] }));

    expect(screen.queryByRole("alert")).toBeNull();
  });
});

describe("keyboard and accessibility", () => {
  it("orders the controls toggle, new conversation, suggestions, field, send", () => {
    renderApp();

    const controls = Array.from(document.querySelectorAll<HTMLElement>("button, textarea")).map(
      (element) =>
        element instanceof HTMLTextAreaElement
          ? "field"
          : (element.getAttribute("aria-label") ?? element.textContent),
    );

    expect(controls).toEqual([
      "EN",
      "PT-BR",
      ptBR["header.newConversation"],
      ptBR["trace.title"],
      ptBR["greeting.suggestion1"],
      ptBR["greeting.suggestion2"],
      ptBR["greeting.suggestion3"],
      ptBR["greeting.suggestion4"],
      "field",
      ptBR["composer.send"],
    ]);
  });

  it("labels the composer and the icon buttons", () => {
    renderApp();

    expect(screen.getByRole("textbox", { name: ptBR["composer.label"] })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: ptBR["composer.send"] })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: ptBR["header.newConversation"] }),
    ).toBeInTheDocument();
  });
});

describe("trace sheet on narrow screens", () => {
  function sheetButton(): HTMLElement {
    return screen.getByRole("button", { name: ptBR["trace.title"] });
  }

  function sheet(): HTMLDialogElement {
    return document.querySelector("dialog") as HTMLDialogElement;
  }

  it("opens the latest trace in a modal dialog from the header", async () => {
    stubFetch(jsonResponse(200, FULL_RESPONSE));
    renderApp();
    type("Ohana e pedido 1");
    pressEnter();
    await within(feed()).findByRole("heading", { name: PRODUCT_NAME });

    fireEvent.click(sheetButton());

    expect(sheet().open).toBe(true);
    expect(within(sheet()).getByRole("heading", { name: ptBR["trace.title"] })).toBeInTheDocument();
    expect(within(sheet()).getByText("get_order_status()")).toBeInTheDocument();
  });

  it("closes from its close button and returns focus to the header button", () => {
    renderApp();
    fireEvent.click(sheetButton());

    fireEvent.click(within(sheet()).getByRole("button", { name: ptBR["trace.close"] }));

    expect(sheet().open).toBe(false);
    expect(within(sheet()).queryByText(ptBR["trace.empty"])).toBeNull();
    expect(sheetButton()).toHaveFocus();
  });

  it("closes on a backdrop click", () => {
    renderApp();
    fireEvent.click(sheetButton());

    fireEvent.click(sheet());

    expect(sheet().open).toBe(false);
  });

  it("returns focus when the browser closes it, as Esc does", () => {
    renderApp();
    fireEvent.click(sheetButton());

    act(() => sheet().close());

    expect(within(sheet()).queryByText(ptBR["trace.empty"])).toBeNull();
    expect(sheetButton()).toHaveFocus();
  });
});

describe("language", () => {
  function visibleStrings(): string[] {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const texts: string[] = [];
    while (walker.nextNode()) texts.push(walker.currentNode.textContent?.trim() ?? "");
    const attributes = Array.from(document.querySelectorAll("[aria-label], [placeholder]")).flatMap(
      (element) => [element.getAttribute("aria-label"), element.getAttribute("placeholder")],
    );
    return [...texts, ...attributes].filter((value): value is string => Boolean(value));
  }

  it.each([
    ["en", "pt-BR", ptBR],
    ["pt-BR", "en", en],
  ] as const)("switching to %s leaves no %s string behind", (target, source, previous) => {
    renderApp({ locale: source });

    fireEvent.click(screen.getByRole("button", { name: target === "en" ? "EN" : "PT-BR" }));

    const strings = visibleStrings();
    for (const value of Object.values(previous)) {
      expect(strings, value).not.toContain(value);
    }
  });

  it("re-labels cards and the trace panel", async () => {
    stubFetch(jsonResponse(200, FULL_RESPONSE));
    renderApp();
    type("Ohana e pedido 1");
    pressEnter();
    await within(feed()).findByRole("heading", { name: PRODUCT_NAME });

    fireEvent.click(screen.getByRole("button", { name: "EN" }));

    const [product, order] = within(feed()).getAllByRole("article");
    expect(product?.textContent?.replace(/\u00a0/g, " ")).toContain("R$439.20");
    expect(product).toHaveTextContent(en["availability.available"]);
    expect(order).toHaveTextContent(en["orderStatus.delivered"]);
    expect(within(tracePanel("en")).getByText("1 product found")).toBeInTheDocument();
  });

  it("keeps existing replies as written", () => {
    renderApp({
      history: [
        { role: "user", text: "Oi" },
        { role: "agent", text: "Olá, tudo bem?" },
      ],
    });

    fireEvent.click(screen.getByRole("button", { name: "EN" }));

    expect(within(feed()).getByText("Olá, tudo bem?")).toBeInTheDocument();
  });

  it("sends the locale active at send time", async () => {
    const fetchMock = stubFetch(jsonResponse(200, { reply: "Hi" }));
    renderApp();

    fireEvent.click(screen.getByRole("button", { name: "EN" }));
    type("Hello");
    pressEnter();

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(requestBody(fetchMock).locale).toBe("en");
    await act(async () => undefined);
  });
});
