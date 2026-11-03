import { afterEach, describe, expect, it, vi } from "vitest";

import { sendTurn } from "@/lib/chat/client";
import { ChatError, type ChatErrorKind } from "@/lib/chat/errors";
import type { ChatMessage } from "@/lib/chat/schema";

function jsonResponse(status: number, body: unknown, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...headers },
  });
}

function stubFetch(response: Response | Error) {
  const fetchMock = vi.fn(() =>
    response instanceof Error ? Promise.reject(response) : Promise.resolve(response),
  );
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

async function failure(): Promise<ChatError> {
  try {
    await sendTurn({ history: [], text: "Oi", locale: "pt-BR" });
  } catch (error) {
    if (error instanceof ChatError) return error;
    throw error;
  }
  throw new Error("sendTurn did not fail");
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("sendTurn", () => {
  it("posts the history, the new message and the locale", async () => {
    const fetchMock = stubFetch(jsonResponse(200, { reply: "Hi!" }));
    const history: ChatMessage[] = [
      { role: "user", text: "Hello" },
      { role: "agent", text: "Hi, how can I help?" },
    ];

    const reply = await sendTurn({ history, text: "Price of the GD20?", locale: "en" });

    expect(reply).toBe("Hi!");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("/api/chat");
    expect(init.method).toBe("POST");
    expect(JSON.parse(String(init.body))).toEqual({
      messages: [...history, { role: "user", text: "Price of the GD20?" }],
      locale: "en",
    });
  });

  it.each<[string, Response, ChatErrorKind, number | undefined]>([
    ["422", jsonResponse(422, { error: "invalid_request" }), "invalid_request", undefined],
    [
      "429 with Retry-After",
      jsonResponse(429, { error: "rate_limited" }, { "Retry-After": "30" }),
      "rate_limited",
      30,
    ],
    [
      "429 without Retry-After",
      jsonResponse(429, { error: "rate_limited" }),
      "rate_limited",
      undefined,
    ],
    [
      "429 with an invalid Retry-After",
      jsonResponse(429, { error: "rate_limited" }, { "Retry-After": "soon" }),
      "rate_limited",
      undefined,
    ],
    ["503", jsonResponse(503, { error: "model_unavailable" }), "model_unavailable", undefined],
    ["500", jsonResponse(500, { error: "internal_error" }), "generic", undefined],
    [
      "429 without a JSON body",
      new Response("Too Many Requests", { status: 429 }),
      "rate_limited",
      undefined,
    ],
    ["unknown status", new Response("<html>", { status: 502 }), "generic", undefined],
    ["malformed 200", jsonResponse(200, { answer: "x" }), "generic", undefined],
    ["200 that is not JSON", new Response("ok", { status: 200 }), "generic", undefined],
  ])("maps %s to a %s error", async (_label, response, kind, retryAfterSeconds) => {
    stubFetch(response);

    const error = await failure();

    expect(error.kind).toBe(kind);
    expect(error.retryAfterSeconds).toBe(retryAfterSeconds);
  });

  it("maps a network failure to a generic error", async () => {
    stubFetch(new TypeError("Failed to fetch"));

    expect((await failure()).kind).toBe("generic");
  });
});
