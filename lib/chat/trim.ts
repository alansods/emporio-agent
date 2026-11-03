import { MAX_MESSAGES } from "./limits";
import type { ChatMessage } from "./schema";

/** Last `MAX_MESSAGES` messages, without a leading agent message, so the window starts with the user. */
export function trimForRequest<Message extends ChatMessage>(messages: Message[]): Message[] {
  const window = messages.slice(-MAX_MESSAGES);
  return window[0]?.role === "agent" ? window.slice(1) : window;
}
