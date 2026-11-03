import { ChatError, toChatError } from "./errors";
import type { StoredMessage } from "@/lib/storage/historyStore";

import { chatResponseSchema, type ChatRequest, type ChatTurn, type Locale } from "./schema";
import { trimForRequest } from "./trim";

const CHAT_ENDPOINT = "/api/chat";

export type TurnInput = { history: StoredMessage[]; text: string; locale: Locale };

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return undefined;
  }
}

async function post(body: ChatRequest): Promise<Response> {
  try {
    return await fetch(CHAT_ENDPOINT, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    throw new ChatError("generic");
  }
}

/** Runs one turn and returns the reply with its cards and trace, or throws a `ChatError`. */
export async function sendTurn({ history, text, locale }: TurnInput): Promise<ChatTurn> {
  const messages = trimForRequest([...history, { role: "user", text }]).map(({ role, text }) => ({
    role,
    text,
  }));
  const response = await post({ messages, locale });
  const body = await readJson(response);
  if (!response.ok) throw toChatError(response.status, body, response.headers);

  const parsed = chatResponseSchema.safeParse(body);
  if (!parsed.success) throw new ChatError("generic");
  return parsed.data;
}
