# Tasks

## 1. Chat client: schema, limits, trimming, errors (commit: `feat(web): add chat api client with zod validation`)

- [x] 1.1 Add `@tanstack/react-query@^5` and `zod@^4` with `pnpm add` (justified in proposal.md > Impact). Verify
  `pnpm install --frozen-lockfile` and `pnpm build` still pass.
- [x] 1.2 Write failing tests: `__tests__/chat/trim.test.ts` (scenarios "Short history", "Long history is trimmed":
  25 alternating messages give at most 20, starting with `user`, ending with the new one);
  `__tests__/chat/limits.test.ts` (reads `emporio_agent/config.py`, fails if `MAX_MESSAGES` or `MAX_MESSAGE_CHARS`
  differ); `__tests__/chat/schema.test.ts` ("Malformed success body", "Extra fields", and the contract fixture
  `tests/fixtures/chat_response.json` parses); `__tests__/chat/client.test.ts` with a stubbed `fetch` (request is
  `POST /api/chat` with `{messages, locale}`; 422 / 429 with `Retry-After: 30` / 429 without header / 503 / 500 /
  `fetch` rejection / malformed 200 map to the kinds of design D6). Add `tests/test_contract.py` validating the same
  fixture with `ChatResponse`. Verify `pnpm test` fails for the missing modules.
- [x] 1.3 Implement `lib/chat/limits.ts`, `lib/chat/trim.ts`, `lib/chat/schema.ts`, `lib/chat/errors.ts` and
  `lib/chat/client.ts` (`sendTurn`) per design D4 to D6, plus the fixture. Verify `pnpm test`, `pnpm typecheck`,
  `pnpm lint`, `pytest` and `ruff check .` pass.

## 2. i18n context, dictionaries and language toggle (commit: `feat(web): add i18n context and language toggle`)

- [x] 2.1 Write failing tests: `__tests__/i18n/dictionaries.test.ts` ("Key parity", "Placeholder parity", "No empty
  values"); `__tests__/i18n/locale.test.ts` (`parseLocale` and browser detection: "First visit with a Portuguese
  browser" `pt-PT` → `pt-BR`, `es-ES` → `en`, "Unknown saved value" `fr` ignored, "Remembered choice");
  `__tests__/i18n/plural.test.ts` ("One second", "Several seconds" in both locales);
  `__tests__/i18n/toggle.test.tsx` ("Toggle state", "Switching updates the document language", choice written to
  `localStorage` and `document.cookie`); `__tests__/i18n/ssr.test.tsx` (`renderToString` of the providers with
  `initialLocale="pt-BR"` contains the Portuguese greeting; the layout with a mocked `next/headers` cookie returns
  `<html lang="pt-BR">`, and `lang="en"` without the cookie). Verify they fail.
- [x] 2.2 Implement `locales/en.json`, `locales/pt-BR.json` (keys of design D2), `lib/i18n/` (types, `parseLocale`,
  `detectLocale`, `I18nProvider`, `useI18n` with `t` and `tCount`), `lib/storage/localeStore.ts` (design D3),
  `components/LanguageToggle`, `components/Providers`, and the cookie read in `app/layout.tsx`. Verify all group 2
  tests, `pnpm typecheck` and `pnpm lint` pass.

## 3. Conversation UI (commit: `feat(web): add chat conversation with persisted history`)

- [x] 3.1 Write failing component tests in `__tests__/chat/ChatApp.test.tsx` with a stubbed `fetch` and the real
  providers, one per `chat-ui` scenario: "First visit", "Picking a suggestion", "Enter sends", "Shift+Enter adds a
  line", "Blank message", "No double send", "Text over the limit", "Waiting for the reply", "Successful turn",
  "Reply text is not interpreted as HTML", "Full history stays on screen", every "Localized error states" scenario,
  "Retry after an error", "Reload" (unmount and render again over the same `localStorage`), "Corrupted storage",
  "Starting over", "Tab order", "Narrow screen labels" (accessible names present). Add `web-i18n` scenarios
  "Switching to English" and "Switching to Portuguese" (render, switch, assert no value of the previous dictionary
  is in `document.body.textContent` or any `aria-label`), "Existing replies stay as written" and "Locale switch
  before sending". Update `__tests__/home.test.tsx` to render `Home` inside the providers. Verify they fail.
- [x] 3.2 Implement `lib/storage/historyStore.ts` (design D3), `components/ChatApp`, `MessageBubble`, `Greeting`,
  `TypingIndicator`, `ErrorAlert`, `Composer`, `NewConversationButton`, the `actions` slot in `Header`, the new props
  of `ChatShell`, and `app/page.tsx`, with CSS Modules per design D7 and D8. Stub `Element.prototype.scrollIntoView`
  in `vitest.setup.ts`. Verify `pnpm test`, `pnpm typecheck`, `pnpm lint`, `pnpm format:check` and `pnpm build` pass.
- [x] 3.3 Manual check with `pnpm dev` plus `uvicorn` (real key): keyboard only (Tab through every control, Enter
  sends, Shift+Enter breaks the line, focus ring visible), 360 px viewport without horizontal scroll (also with a
  2000-character message), reduced motion in the browser's rendering settings stops the typing dots, reload keeps
  the conversation, a cookie set to `pt-BR` renders Portuguese with no flash. Fix any finding inside this group
  before committing.
  Result 2026-11-03 (local, real key): Tab order EN, PT-BR, new conversation, conversation log, composer, send, each
  with a 2px focus ring; Shift+Enter kept a line break and Enter sent it. In a 360 px frame `scrollWidth` equals
  `clientWidth` on first load and after a 2000-character unbroken message, which wraps inside the bubble. The global
  `prefers-reduced-motion: reduce` rule in `globals.css` overrides the dots' infinite animation (checked in the
  loaded stylesheet; the setting itself was not toggled in the browser). Reload kept the conversation; the server
  rendered `<html lang="pt-BR">` with Portuguese text for `locale=pt-BR` and `lang="en"` for `locale=en`, so no
  flash. No findings.

## 4. Docs (commit: `docs: document the chat ui and i18n`)

- [x] 4.1 README: how the web UI talks to the API (history in `localStorage`, last 20 messages sent, errors shown),
  the own i18n approach and when to switch to next-intl, and limitations (history trimmed to 20 messages, personal
  data kept in the browser until "new conversation", replies shown as plain text). Update `openspec/project.md`
  only if a decision here differs from it. Verify `pnpm format:check` and `ruff format --check .` pass.

## 5. Production acceptance (no commit; fixes get their own `fix(web): ...` commit with a test)

- [x] 5.1 After groups 1 to 4 are pushed and the production deployment is ready, on
  https://emporio-agent-three.vercel.app in `pt-BR` ask "Quanto custa o violão Takamine GD20?" and confirm the reply
  shows R$ 2.199,00, PIX R$ 2.089,05 and 12x R$ 183,25 ("Takamine GD20 in production").
  Result 2026-11-02 after 19e548b (group 4 not yet pushed): reply quoted all three values in about 5 s;
  replies may show raw Markdown `**` (known limitation, design Risks).
- [x] 5.2 On production: switch to `en` and confirm every UI string changes; reload and confirm the conversation and
  the language are kept; send 11 messages within a minute (or until the per-instance limit triggers) and confirm the
  localized 429 message with the seconds. Record the results in this file.
  Result 2026-11-03: the GD20 question answered R$ 2.199,00 / PIX R$ 2.089,05 / 12x R$ 183,25. Switching to EN set
  `lang="en"` and left no `pt-BR` dictionary value in the page text, `aria-label`s or placeholder (past replies kept
  as written). Reload kept the 16 messages and EN. The limiter counts requests before body validation, so 9 POSTs
  returned 422 and then 429 with `Retry-After: 21`; the next send showed "Too many messages in a short time. Try
  again in 20 seconds." with the text kept in the composer, and switching to PT-BR translated it with the seconds.
  No findings.

## Workflow follow-up

- Commit the proposal as `docs(openspec): propose chat-ui-dark-i18n` after review.
- After all groups are done and CI is green, run `openspec validate chat-ui-dark-i18n --strict`, archive with
  `/opsx:archive` and commit `docs(openspec): archive chat-ui-dark-i18n`.
