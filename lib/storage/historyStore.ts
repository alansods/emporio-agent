import { z } from "zod";

import { messageSchema, type ChatMessage } from "@/lib/chat/schema";

const STORAGE_KEY = "emporio.history.v1";
const historySchema = z.array(messageSchema);
const EMPTY: ChatMessage[] = [];

const listeners = new Set<() => void>();
let cache: { raw: string | null; value: ChatMessage[] } = { raw: null, value: EMPTY };

function readRaw(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function parse(raw: string | null): ChatMessage[] {
  if (raw === null) return EMPTY;
  try {
    const parsed = historySchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : EMPTY;
  } catch {
    return EMPTY;
  }
}

/** Cached by the raw string so React gets a stable reference between renders. */
function getSnapshot(): ChatMessage[] {
  const raw = readRaw();
  if (raw !== cache.raw) cache = { raw, value: parse(raw) };
  return cache.value;
}

function getServerSnapshot(): ChatMessage[] {
  return EMPTY;
}

function notify(): void {
  listeners.forEach((listener) => listener());
}

function onStorage(event: StorageEvent): void {
  if (event.key === STORAGE_KEY) notify();
}

function subscribe(listener: () => void): () => void {
  if (listeners.size === 0) window.addEventListener("storage", onStorage);
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) window.removeEventListener("storage", onStorage);
  };
}

function write(update: () => void): void {
  try {
    update();
  } catch {
    // Storage can be full or blocked; the conversation then lasts only for this page view.
  }
  notify();
}

function save(messages: ChatMessage[]): void {
  write(() => window.localStorage.setItem(STORAGE_KEY, JSON.stringify(messages)));
}

function clear(): void {
  write(() => window.localStorage.removeItem(STORAGE_KEY));
}

export const historyStore = { getSnapshot, getServerSnapshot, subscribe, save, clear };
