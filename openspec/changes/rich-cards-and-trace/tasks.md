# Tasks

## 1. API: timing, cards, trace and response contract (commit: `feat(api): return cards and trace from chat turns`)

- [x] 1.1 Write failing tests: in `tests/test_agent.py` the `support-agent` "Tool call record" scenarios (record has
  a non-negative integer `duration_ms`; `model_calls` is 1 without tools and 2 with one search round);
  `tests/test_cards.py` with hand-built records for every `answer-cards` API scenario ("No tools used", "Values
  match the tool result" against the real GD20 search result, "Tool error gives no card", "Two searches return the
  same product", "Cap", "Promotion without PIX", "Verified order", "Wrong identity"); `tests/test_trace.py` for
  every `turn-trace` API scenario ("Turn without tools", "Search step", "Failed identity check", "Round limit
  reached"); `tests/test_chat_api.py` updated for the `chat-api` scenarios with the scripted fake model
  ("Successful turn" body has `cards: []` and a trace with no steps, "Tool turn" has the GD20 card and one step);
  `tests/test_contract.py` validates the extended fixture. Verify `pytest` fails for the missing modules and fields.
- [x] 1.2 Implement design D1 to D5: `duration_ms` on `ToolCallRecord` and `model_calls` on `TurnResult` in
  `emporio_agent/agent.py`, card and trace models in `emporio_agent/api_models.py`, `emporio_agent/cards.py`,
  `emporio_agent/trace.py`, turn timing and the new body in `api/index.py`, and the extended
  `tests/fixtures/chat_response.json` (D9). Verify `pytest`, `ruff check .` and `ruff format --check .` pass, and
  `pnpm test` still passes against the extended fixture.

## 2. Web: schema, client, storage and Markdown subset (commit: `feat(web): parse cards and trace and render reply markdown`)

- [ ] 2.1 Write failing tests: `__tests__/chat/schema.test.ts` ("Malformed card", "Reply only" reads `cards` as
  `[]` and no trace, "Extra fields", the extended fixture parses); `__tests__/chat/client.test.ts` (`sendTurn`
  returns reply, cards and trace; "Request strips cards and trace": every request message has only `role` and
  `text`); `__tests__/storage/history.test.ts` ("History saved before cards" loads `{role, text}` entries, cards and
  trace round-trip, corrupted value gives `[]`); `__tests__/markdown/renderReply.test.tsx` ("Bold and list",
  "Unmatched markers stay literal", "Reply text is not interpreted as HTML" with no `b` element, single line breaks
  kept). Verify they fail.
- [ ] 2.2 Implement design D6 and D7: Zod card and trace schemas and the response schema in `lib/chat/schema.ts`,
  `sendTurn` result and request mapping in `lib/chat/client.ts`, `StoredMessage` in `lib/storage/historyStore.ts`,
  `lib/markdown/renderReply.tsx`, and use it in the agent `MessageBubble`. Verify `pnpm test`, `pnpm typecheck` and
  `pnpm lint` pass.

## 3. Web: cards and trace panel (commit: `feat(web): show product and order cards and the turn trace`)

- [ ] 3.1 Write failing component tests: `__tests__/cards/ProductCard.test.tsx` ("Product card in Portuguese",
  "Product card in English", "Promotion shown", "Availability label"); `__tests__/cards/OrderCard.test.tsx` ("Order
  card", dates do not shift with the time zone); `__tests__/trace/TracePanel.test.tsx` ("Collapsed by default",
  "Keyboard toggle" with `user-event`, "Error outcome label", "Unknown error code", "Reply without tools");
  `__tests__/chat/ChatApp.test.tsx` updated for "Successful turn" with cards and trace under the bubble, "Reload"
  keeping card and panel, and "Switching language re-labels cards". Verify they fail.
- [ ] 3.2 Implement design D8: `components/ProductCard`, `components/OrderCard`, `components/TracePanel` with CSS
  Modules and tokens, the new keys in `locales/en.json` and `locales/pt-BR.json`, and the cards and panel under each
  agent bubble in `ChatApp`. Verify `pnpm test` (including dictionary parity), `pnpm typecheck`, `pnpm lint`,
  `pnpm format:check` and `pnpm build` pass.
- [ ] 3.3 Manual check with `pnpm dev` plus `uvicorn` (real key): ask for the GD20, for "violões Yamaha" and for an
  order with the right and a wrong name; cards and panel match the reply, the panel opens with Enter, nothing
  scrolls horizontally in a 360 px frame, switching language re-labels cards and panel, reload keeps them. Record
  the result here; fix findings inside this group before committing.

## 4. Docs (commit: `docs: document cards, trace and reply formatting`)

- [ ] 4.1 README: response contract `{reply, cards, trace}`, cards built in Python from tool results (never from
  model text), what the trace shows and leaves out, the Markdown subset and when to switch to `react-markdown`, and
  the limitation that cards list every product a search returned. Update `openspec/project.md` only if a decision
  here differs from it. Verify `pnpm format:check` and `ruff format --check .` pass.

## 5. Production acceptance (no commit; fixes get their own `fix(...)` commit with a test)

- [ ] 5.1 After groups 1 to 4 are pushed and the deployment is ready, on https://emporio-agent-three.vercel.app in
  `pt-BR` ask "Quanto custa o violão Takamine GD20?": the reply shows R$ 2.199,00, PIX R$ 2.089,05 and 12x R$ 183,25
  without raw `**`, a GD20 product card with the same values and a trace panel with one `search_products` step
  ("Takamine GD20 in production"). Record the result here.

## Workflow follow-up

- Commit the proposal as `docs(openspec): propose rich-cards-and-trace` after review.
- After all groups are done and CI is green, run `openspec validate rich-cards-and-trace --strict`, archive with
  `/opsx:archive` and commit `docs(openspec): archive rich-cards-and-trace`.
