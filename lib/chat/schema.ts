import { z } from "zod";

import { MAX_MESSAGE_CHARS } from "./limits";

/** Mirrors of the Pydantic models in `emporio_agent/api_models.py`. */
export const LOCALES = ["en", "pt-BR"] as const;
export const localeSchema = z.enum(LOCALES);
export type Locale = z.infer<typeof localeSchema>;

export const messageSchema = z.object({
  role: z.enum(["user", "agent"]),
  text: z.string().min(1).max(MAX_MESSAGE_CHARS),
});
export type ChatMessage = z.infer<typeof messageSchema>;

export type ChatRequest = { messages: ChatMessage[]; locale: Locale };

/** Not strict: fields added later (cards, trace) must not break this client. */
export const chatResponseSchema = z.object({ reply: z.string() });

export const apiErrorSchema = z.object({ error: z.string() });
