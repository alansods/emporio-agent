import { detectLocale, LOCALE_COOKIE, parseLocale, type Locale } from "@/lib/i18n/locale";

const STORAGE_KEY = "emporio.locale";
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

const listeners = new Set<() => void>();

function readStorage(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function readCookie(): string | undefined {
  const prefix = `${LOCALE_COOKIE}=`;
  return document.cookie
    .split("; ")
    .find((entry) => entry.startsWith(prefix))
    ?.slice(prefix.length);
}

function notify(): void {
  listeners.forEach((listener) => listener());
}

function onStorage(event: StorageEvent): void {
  if (event.key === STORAGE_KEY) notify();
}

/** Saved choice (local storage, then cookie), else the browser language. */
function getSnapshot(): Locale {
  return (
    parseLocale(readStorage()) ?? parseLocale(readCookie()) ?? detectLocale(navigator.language)
  );
}

function subscribe(listener: () => void): () => void {
  if (listeners.size === 0) window.addEventListener("storage", onStorage);
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) window.removeEventListener("storage", onStorage);
  };
}

function setLocale(locale: Locale): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, locale);
  } catch {
    // Storage can be blocked (private mode); the cookie still keeps the choice.
  }
  writeCookie(locale);
  notify();
}

/** Lets the server render the same locale on the next visit. */
function writeCookie(locale: Locale): void {
  document.cookie = `${LOCALE_COOKIE}=${locale}; Path=/; Max-Age=${COOKIE_MAX_AGE_SECONDS}; SameSite=Lax`;
}

export const localeStore = { getSnapshot, subscribe, setLocale, writeCookie };
