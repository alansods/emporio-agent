import { apiErrorSchema } from "./schema";

export type ChatErrorKind = "invalid_request" | "rate_limited" | "model_unavailable" | "generic";

const KIND_BY_CODE: Record<string, ChatErrorKind> = {
  invalid_request: "invalid_request",
  rate_limited: "rate_limited",
  model_unavailable: "model_unavailable",
};

const KIND_BY_STATUS: Record<number, ChatErrorKind> = {
  422: "invalid_request",
  429: "rate_limited",
  503: "model_unavailable",
};

export class ChatError extends Error {
  readonly kind: ChatErrorKind;
  readonly retryAfterSeconds: number | undefined;

  constructor(kind: ChatErrorKind, retryAfterSeconds?: number) {
    super(`Chat turn failed: ${kind}`);
    this.name = "ChatError";
    this.kind = kind;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

function retryAfterSeconds(headers: Headers): number | undefined {
  const value = headers.get("Retry-After")?.trim() ?? "";
  if (!/^\d+$/.test(value)) return undefined;
  const seconds = Number(value);
  return seconds > 0 ? seconds : undefined;
}

/** Error kind from the API body code, falling back to the status when the body has none. */
export function toChatError(status: number, body: unknown, headers: Headers): ChatError {
  const parsed = apiErrorSchema.safeParse(body);
  const fromCode = parsed.success ? KIND_BY_CODE[parsed.data.error] : undefined;
  const kind = fromCode ?? (parsed.success ? "generic" : (KIND_BY_STATUS[status] ?? "generic"));
  return new ChatError(kind, kind === "rate_limited" ? retryAfterSeconds(headers) : undefined);
}
