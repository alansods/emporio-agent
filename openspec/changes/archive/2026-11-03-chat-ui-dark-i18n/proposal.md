# Proposal

## Why

Production (https://emporio-agent-three.vercel.app) serves a working `/api/chat`, but the home page is still the
empty shell from `bootstrap-monorepo`, so a customer or reviewer cannot talk to the agent without `curl`. This change
ships the real chat, in English and Brazilian Portuguese, following the approved prototype
(https://claude.ai/artifact/LPS436k4LfBMromoDCDkp2).

## What Changes

- Replace the placeholder feed with a working chat on top of the existing `ChatShell`, `Header` and `GuitarGlyph`:
  a localized greeting with suggestion chips, user and agent bubbles, a typing indicator while a turn runs, and a
  composer (textarea plus send button; Enter sends, Shift+Enter adds a line).
- Keep the conversation in `localStorage`, restore it on reload, and send it as `{messages, locale}` to
  `POST /api/chat`. Before sending, trim to the last 20 messages; the composer caps each message at 2000 characters.
  Both limits match the `chat-api` capability.
- Validate the response with Zod (mirror of the Pydantic `ChatResponse`, `reply` only for now).
- Map API errors to localized messages: `invalid_request` (422), `rate_limited` (429, with the `Retry-After`
  seconds), `model_unavailable` (503), `internal_error` (500), plus network failures and malformed responses. A
  failed turn returns the text to the composer instead of leaving an unanswered message in the history.
- "New conversation" action in the header that clears the history.
- Own i18n: a React context with `t(key, values)` typed from `locales/en.json`, a `locales/pt-BR.json` with the same
  keys, and an EN / PT-BR toggle in the header. The locale is detected from `navigator.language` on first visit,
  persisted in `localStorage` and a cookie, and read from the cookie on the server so the first render is already
  in the right language and `<html lang>` matches.
- Accessibility kept from the shell and extended: `role="log"` `aria-live="polite"` feed, labelled composer, visible
  focus, keyboard-only use, `prefers-reduced-motion`, no horizontal scroll from 360 px.

### Out of scope

- Rich cards and the trace panel ("How did I answer?" link, side panel, bottom sheet): `rich-cards-and-trace`.
- SSE streaming of replies, Playwright E2E (listed as next steps in `openspec/project.md`).
- Markdown rendering of replies: replies render as plain text with preserved line breaks.
- The prototype's "test version" pill and scripted answers.
- Changes to the API, its limits or its error codes.
- The Node 26.x (Vercel) vs 22 (CI) difference, unless it breaks the build.

## Capabilities

### New Capabilities

- `web-i18n`: UI localization for `en` and `pt-BR`: typed dictionaries with identical keys, locale detection and
  persistence, the language toggle, server-rendered locale, and locale-aware plurals. Currency formatting is added
  by `rich-cards-and-trace`, the first change that shows prices outside the reply text.

### Modified Capabilities

- `chat-ui`: adds the conversation itself (feed, composer, send flow, loading state, persisted history with client
  limits, response validation, localized error states, new conversation). Existing shell requirements stay as they
  are.

## Impact

- Code: `app/layout.tsx` (reads the locale cookie, wraps providers), `app/page.tsx`, `components/ChatShell`,
  `components/Header`, new `components/` for the feed, bubbles, composer, error alert and language toggle, new
  `lib/` modules (API client, Zod schema, history storage and trimming, i18n context), `locales/en.json`,
  `locales/pt-BR.json`, `__tests__/`.
- Rendering: reading `cookies()` in the root layout makes the home page dynamically rendered. Acceptable for one
  page served by a Vercel function next to the API.
- API: none. The client relies on the existing `chat-api` contract.
- New dependencies (both runtime, both already named in `openspec/project.md` > Stack):
  - `@tanstack/react-query` 5: `useMutation` gives the turn's pending, error and in-flight variables (the user
    message shown while waiting) without hand-written reducer state, never retries a mutation by default (a retry
    would spend rate limit and model quota), and the same client will serve `rich-cards-and-trace`. About 13 kB
    gzipped. Alternative considered: `useState` plus `fetch`, which is smaller but re-implements state the library
    already tests.
  - `zod` 4: the browser must not trust the response shape. A schema gives runtime validation and the TypeScript
    type from one definition, and `rich-cards-and-trace` extends it for cards and trace. Alternative considered:
    hand-written type guards, which drift from the types as the response grows.
