import { z } from "zod";

import { cardSchema, messageSchema, traceSchema } from "@/lib/chat/schema";

/** Same key as before cards existed: both new fields are optional, so old entries still load. */
const STORAGE_KEY = "emporio.history.v1";
const storedMessageSchema = messageSchema.extend({
  cards: z.array(cardSchema).optional(),
  trace: traceSchema.optional(),
});
export type StoredMessage = z.infer<typeof storedMessageSchema>;

const historySchema = z.array(storedMessageSchema);
const EMPTY: StoredMessage[] = [];

const listeners = new Set<() => void>();
let cache: { raw: string | null; value: StoredMessage[] } = { raw: null, value: EMPTY };

function readRaw(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function parse(raw: string | null): StoredMessage[] {
  if (raw === null) return EMPTY;
  try {
    const parsed = historySchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : EMPTY;
  } catch {
    return EMPTY;
  }
}

/** Cached by the raw string so React gets a stable reference between renders. */
function getSnapshot(): StoredMessage[] {
  const raw = readRaw();
  if (raw !== cache.raw) cache = { raw, value: parse(raw) };
  return cache.value;
}

function getServerSnapshot(): StoredMessage[] {
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

function save(messages: StoredMessage[]): void {
  write(() => window.localStorage.setItem(STORAGE_KEY, JSON.stringify(messages)));
}

function clear(): void {
  write(() => window.localStorage.removeItem(STORAGE_KEY));
}

export const historyStore = { getSnapshot, getServerSnapshot, subscribe, save, clear };
