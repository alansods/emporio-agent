# Design

## Context

- `app/layout.tsx` is a server component with `lang="en"` hardcoded, Inter and Sora fonts, `tokens.css` and
  `globals.css`. `app/page.tsx` renders `Header` (brand plus `GuitarGlyph`) and `ChatShell` (`<main>` with an empty
  `role="log"` `aria-live="polite"` feed). Tokens already include `--pink-strong #d6125a` / `--on-pink-strong #fff`
  (the prototype's decision for white text on pink) and a contrast test.
- `next.config.ts` proxies `/api/*` to `127.0.0.1:8000` in development only; in production `vercel.json` routes
  `/api/*` to the FastAPI function. The browser can always call the relative path `/api/chat`.
- API contract (`chat-api` spec, `emporio_agent/api_models.py`): request `{messages: [{role: "user"|"agent", text}],
  locale: "en"|"pt-BR"}`, 1 to 20 messages, trimmed text 1 to 2000 chars, last one from `user`, no extra fields.
  Response 200 `{reply}`; errors `{"error": code}` with 422 / 429 (+ `Retry-After`) / 503 / 500.
- Next.js 16 docs (fetched 2026-11-02): `cookies()` is async; calling it in a layout opts the route into dynamic
  rendering. TanStack Query v5 docs: `useMutation` exposes `isPending`, `error`, `variables`, `reset()`; mutations do
  not retry by default. Zod 4 docs: `z.object` strips unknown keys, `z.strictObject` rejects them, `safeParse`
  returns `{success, data | error}`. Context7 was not connected; the vendors' own docs pages were read instead.
- The Next 16 ESLint preset ships the React Compiler hook rules, which flag `setState` inside `useEffect`.

## Goals / Non-Goals

**Goals:**

- One client component tree owns the conversation; server code only resolves the initial locale.
- Browser storage is read without hydration mismatches and without `setState` in effects.
- Client limits and the response shape cannot silently drift from the Python side: both are checked in CI.

**Non-Goals:**

- No i18n library, no routing per locale (`/en`, `/pt-BR`), no translated metadata.
- No server state for conversations; the API stays stateless.

## Decisions

### D1. Component tree

- `app/layout.tsx` (server) reads the `locale` cookie, validates it with `parseLocale` (unknown or missing → `en`),
  sets `<html lang>` and wraps children in `<Providers initialLocale>`.
- `components/Providers` (client): `QueryClientProvider` (one `QueryClient` created in `useState`, mutations
  `retry: 0` stated explicitly) and `I18nProvider`.
- `app/page.tsx` renders `<ChatApp />` (client), which owns history, draft and the turn mutation and renders
  `Header` (with an `actions` slot holding `LanguageToggle` and `NewConversationButton`) and `ChatShell` (feed plus
  `Composer`). `Header`, `ChatShell` and `GuitarGlyph` keep their files and styles; `ChatShell` gains props instead
  of being replaced.
- New components, each with its own CSS Module: `MessageBubble`, `Greeting` (greeting plus suggestion chips),
  `TypingIndicator`, `ErrorAlert`, `Composer`, `LanguageToggle`, `NewConversationButton`.

Alternative: keep `page.tsx` a server component and make only leaf components client. Rejected: the header button
and the feed share the same state, so the state owner must be a common client parent anyway.

### D2. Own i18n context

- `locales/en.json` and `locales/pt-BR.json`, flat dotted keys (`composer.placeholder`). `MessageKey` is
  `keyof typeof en`, so a wrong key fails `tsc`. Both dictionaries are imported statically (a few hundred bytes).
- `t(key, values?)` replaces `{name}` placeholders. Count-dependent strings use `key_one` / `key_other` entries and
  `tCount(key, count)`, which picks the form with `new Intl.PluralRules(locale).select(count)` and falls back to
  `_other` when a form is missing (pt has a `many` category that only applies to compact notation).
- `I18nProvider` exposes `{locale, setLocale, t, tCount}`. The brand name stays a constant in `Header`.
- Keys introduced (both dictionaries): `header.language`, `header.newConversation`, `feed.label`, `greeting.text`,
  `greeting.suggestionsTitle`, `greeting.suggestion1` to `greeting.suggestion4`, `typing.label`, `composer.label`,
  `composer.placeholder`, `composer.send`, `error.invalidRequest`, `error.rateLimited_one`,
  `error.rateLimited_other`, `error.rateLimitedNoDelay`, `error.modelUnavailable`, `error.generic`. Suggestions come
  from the prototype: acoustic guitars up to R$ 1000, Takamine GD20 price, guitars on sale, how returns work.

Alternative: next-intl. Rejected for now per `openspec/project.md` > i18n (two languages, no SEO routes); `t()`
keeps the same shape so a migration is mechanical.

### D3. Browser storage as external stores

`lib/storage/` holds two tiny stores over `localStorage`, read with `useSyncExternalStore`:

- `historyStore`: key `emporio.history.v1`, value validated with a Zod array of `{role, text}`. `getSnapshot`
  caches the parsed array by the raw string so React gets a stable reference; parse failure or a storage exception
  yields `[]`. `getServerSnapshot` returns `[]`. `save` and `clear` write and notify subscribers; the `storage` event
  keeps other tabs in sync.
- `localeStore`: key `emporio.locale`. Its snapshot is the saved locale, else the `navigator.language` match
  (`pt*` → `pt-BR`, else `en`). `getServerSnapshot` returns the cookie locale passed from the layout. `setLocale`
  writes `localStorage`, the cookie (`locale=<value>; Path=/; Max-Age=31536000; SameSite=Lax`) and
  `document.documentElement.lang`.

During hydration React uses the server snapshot, so the first client render matches the HTML, then re-renders with
the stored values. Returning users get the right language from the cookie; a first-time Portuguese browser switches
from `en` to `pt-BR` right after hydration (one frame).

Alternative: `useEffect` plus `useState`. Rejected: flagged by the lint preset and needs a manual "hydrated" flag.

### D4. Turn flow with `useMutation`

- `sendTurn({history, text, locale})` in `lib/chat/client.ts` builds `messages = trimForRequest([...history, user])`,
  posts JSON to `/api/chat` and returns the parsed `reply`.
- `ChatApp` calls `mutation.mutate({text, locale})` with the trimmed draft and clears the draft. While `isPending`,
  the feed shows `variables.text` as a user bubble plus `TypingIndicator`, and `Composer` refuses to submit.
- `onSuccess`: `historyStore.save([...history, user, {role: "agent", text: reply}])`.
- `onError`: the draft is set back to `variables.text`; history is untouched. `ErrorAlert` renders from
  `mutation.error`. A new `mutate` clears the previous error; "new conversation" calls `historyStore.clear()`,
  `mutation.reset()` and focuses the textarea.

History is only written on success, so a failed or abandoned turn never leaves an unanswered user message stored.

Alternative: append the user message first and mark it failed with a retry button. Rejected: more state, and a
retry would send two consecutive user messages.

### D5. Trimming and limits

`lib/chat/limits.ts` exports `MAX_MESSAGES = 20` and `MAX_MESSAGE_CHARS = 2000`. `trimForRequest` keeps the last
`MAX_MESSAGES` items and drops a leading `agent` message, so the window always starts with the user (the conversation
the model sees then reads naturally). The textarea has `maxLength={MAX_MESSAGE_CHARS}`. A vitest reads
`emporio_agent/config.py` and fails if its `MAX_MESSAGES` or `MAX_MESSAGE_CHARS` differ from the TypeScript values.

### D6. Response and error parsing

- `lib/chat/schema.ts`: `chatResponseSchema = z.object({reply: z.string()})` (non-strict, so `cards` and `trace`
  added later do not break this client), `apiErrorSchema = z.object({error: z.string()})`, `messageSchema` reused by
  the request type and by `historyStore`.
- `ChatError` carries `kind: "invalid_request" | "rate_limited" | "model_unavailable" | "generic"` and an optional
  `retryAfterSeconds`. `toChatError(status, body, headers)` takes the code from the body, falling back to the status
  (422, 429, 503); anything else is `generic`. `Retry-After` counts only as a positive integer. `fetch` rejections
  and Zod failures become `generic`.
- `ErrorAlert` maps kind to key: `error.invalidRequest`, `error.rateLimited` via `tCount` (or
  `error.rateLimitedNoDelay`), `error.modelUnavailable`, `error.generic`.
- Contract fixture `tests/fixtures/chat_response.json` (`{"reply": "..."}`): pytest validates it with
  `ChatResponse`, vitest with `chatResponseSchema`, per `openspec/project.md` > Test strategy.

### D7. Composer and feed behavior

- `<form>` with a visually hidden `<label>` and a `<textarea rows={1}>`. `onKeyDown`: Enter without Shift and not
  during IME composition (`event.nativeEvent.isComposing`) calls `requestSubmit()`; Shift+Enter keeps the default.
  Height grows with `field-sizing: content` up to a `max-height`, falling back to a fixed one-line field where
  unsupported.
- The send button is a real `type="submit"` button with `aria-label={t("composer.send")}`; its visible text is
  hidden below 760 px, like the prototype. Same for "new conversation".
- After each history or pending change, the feed scrolls its end marker into view with `behavior: "auto"` (no
  animated scroll, so nothing to disable for reduced motion).
- Bubbles render `{text}` as a React text node with `white-space: pre-wrap` and `overflow-wrap: anywhere`, so long
  words cannot cause horizontal scroll at 360 px and HTML is never interpreted.

### D8. Styling

CSS Modules and tokens only. User bubble: `--pink-strong` background with `--on-pink-strong` text, aligned right.
Agent bubble: `--surface-2` with `--text`, aligned left with the guitar avatar (`aria-hidden`). Chips: outlined,
`--border`, pink on hover. Alert: `--surface-2` with a `--danger` outline icon and text in `--text`. Typing dots use
a keyframe animation that the existing reduced-motion rule in `globals.css` neutralizes. Focus uses the global
`:focus-visible` ring. Touch targets are at least 44 px.

## Risks / Trade-offs

- [Root layout reads a cookie, so the page is dynamic] → One small page; the cost is a function invocation per page
  view instead of a static file. Revisit with Cache Components and a `<Suspense>` boundary if it matters.
- [Trimming to 20 messages drops older context] → Matches the API limit; the full history stays on screen. Stated
  in the README limitations by `readme-and-limitations`.
- [Personal data (name, email, order id) stays in `localStorage`] → It never leaves the device except in chat
  requests; "new conversation" deletes it. Stated in the README.
- [Replies may contain Markdown markers such as `**`] → Shown as plain text for now; prompt tuning in
  `conversation-examples` or Markdown rendering can follow.
- [First visit with a Portuguese browser shows English for one frame] → Only without a cookie; the choice is saved
  right after.
- [`field-sizing` unsupported in some browsers] → The field stays one line tall and scrolls; still usable.
- [jsdom lacks `scrollIntoView`] → Stub it in `vitest.setup.ts`.

## Migration Plan

Each task group is pushed to `main`, which deploys production through the Vercel Git integration. Rollback is a
redeploy of the previous production deployment from the Vercel dashboard (no data migration; storage keys are
versioned with `.v1`).
