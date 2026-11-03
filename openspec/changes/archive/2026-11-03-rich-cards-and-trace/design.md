# Design

## Context

- `run_turn` (`emporio_agent/agent.py`) already returns `TurnResult(reply, tool_calls)` with one
  `ToolCallRecord(name, arguments, result)` per executed call. `api/index.py` drops the records and returns
  `ChatResponse(reply)`.
- Tool results are plain dicts. `search_products` returns `{total_found, products: [...]}` (at most
  `SEARCH_RESULT_LIMIT = 8`) or `{error, message, ...}`; each product already carries list, effective and PIX prices
  and installments computed in `pricing.py`. `get_order_status` returns the order with items and `return_windows`
  or `{error: "order_not_verified", ...}`. `run_tool` turns bad calls into `{error, message}` results.
- Web: `lib/chat/schema.ts` mirrors `ChatResponse` with a non-strict `z.object({reply})`; `sendTurn` returns the
  reply string; `historyStore` saves `ChatMessage[]` (`{role, text}`) under `emporio.history.v1`; `MessageBubble`
  renders text as a React child (`white-space: pre-wrap`). `tests/fixtures/chat_response.json` is validated by both
  `ChatResponse` (pytest) and the Zod schema (vitest).
- Data enums used by labels: order status `pending | confirmed | shipped | delivered | cancelled`, payment method
  `pix | boleto | debit | credit_3x | credit_6x | credit_12x`, availability `available | out_of_stock |
  discontinued | coming_soon`, return window kinds `regret | preference_exchange | defect_exchange |
  legal_warranty`.

## Goals / Non-Goals

**Goals:**

- Cards and trace are a pure function of the turn's tool records, unit-tested without the model.
- One response contract checked on both sides by the shared fixture.
- No business arithmetic in TypeScript; the UI formats numbers and dates only.

**Non-Goals:**

- No new dependency, no new endpoint, no change to the request shape or limits.
- No per-card actions (links, "buy", copy tracking code).

## Decisions

**D1. Builders in Python, separate modules.** `emporio_agent/cards.py` exposes
`build_cards(records) -> list[ProductCard | OrderCard]`; `emporio_agent/trace.py` exposes
`build_trace(records, model_calls, duration_ms) -> Trace`. Both take `ToolCallRecord`s and use the Pydantic
models from `api_models.py`, so FastAPI serializes them. A card is built only from a result without an `error`
key, matched by tool name. Alternative considered: let the model emit card JSON. Rejected: it would let the model
state prices, which a business rule forbids.

**D2. Card models are discriminated by `type`.** `ProductCard(type="product", product_id, name, category,
availability, stock, list_price, promotion: {name, discount_percent} | None, effective_price, pix_price | None,
installments: {count, amount})` and `OrderCard(type="order", order_id, status, order_date, estimated_delivery |
None, tracking_code | None, total, payment_method, items: [{product_name, quantity}], return_windows: [{kind,
deadline, open}])`. Field names follow the tool result keys, so the builder is a copy, not a mapping. Enums are
`Literal`s mirroring the data; an unexpected value fails loudly in tests rather than reaching the UI. Order
`customer_name`, `notes` and `reference_date` are left out: the customer typed their identity themselves, notes are
free text, and the reference date is internal.

**D3. Dedup and cap.** Product cards are deduplicated by `product_id` in first-seen order and capped at
`MAX_PRODUCT_CARDS = SEARCH_RESULT_LIMIT` (8), so a broad search plus a narrow one does not flood the feed. All
products the search returned are shown, even ones the reply does not mention. Alternative considered: keep only
products named in the reply. Rejected: string matching on model prose is fragile and hides what the tool found,
which the trace and cards exist to show.

**D4. Trace outcome is a summary, not the result.** `TraceStep(tool, arguments, outcome, duration_ms)` with
`outcome` one of `{"kind": "products", "count": total_found}`, `{"kind": "order"}`, `{"kind": "error", "code":
str}`. Full results are not echoed: cards already show the useful part, and echoing would double the payload and
put unverified data paths in a second place. Arguments are echoed as sent; for orders they hold the identity the
user typed in the same conversation, which is already in the browser's history.

**D5. Timing in the loop.** `_run_call` measures `time.perf_counter()` around `run_tool` and stores
`duration_ms: int` on `ToolCallRecord`; `run_turn` counts model calls and returns `model_calls` on `TurnResult`.
The endpoint measures the whole turn the same way and passes it to `build_trace`. Tests assert non-negative
integers, never exact times.

**D6. Web schema and storage.** Zod mirrors in `lib/chat/schema.ts`: `cardSchema =
z.discriminatedUnion("type", [productCard, orderCard])`, `traceSchema`, and `chatResponseSchema = z.object({reply,
cards: z.array(cardSchema).default([]), trace: traceSchema.optional()})` (still non-strict). `sendTurn` returns
`{reply, cards, trace}`. Stored history becomes `StoredMessage = ChatMessage & {cards?, trace?}` under the same
key `emporio.history.v1`: old entries still parse because both fields are optional, so no migration code.
`trimForRequest` output is mapped to `{role, text}` before sending, so the API's `extra="forbid"` never sees cards.

**D7. Markdown subset as an own renderer.** `lib/markdown/renderReply.tsx` splits the text into blocks on blank
lines; a block whose every line starts with `- ` or `* ` becomes `<ul>`, any other block a `<p>` with single line
breaks kept as `<br>`. Inside a line, `**x**` pairs become `<strong>`; an unpaired `**` stays literal. Output is
React elements built from strings, never `dangerouslySetInnerHTML`, so HTML stays text. Alternative considered:
`react-markdown` (safe by default, about 40 kB plus remark). Rejected: one dependency for two constructs, and it
renders links, images and headings the spec excludes. Switch to it if replies need links or tables.

**D8. UI components.** `ProductCard` and `OrderCard` are `<article>`s with a heading and a `<dl>`; amounts via the
existing currency formatter, dates via `Intl.DateTimeFormat(locale, {dateStyle: "medium", timeZone: "UTC"})` on
the ISO date so the day never shifts by time zone. Promotion shows the list price in `<s>` plus the discount badge.
`TracePanel` is a native `<details>/<summary>`: keyboard and screen-reader behavior come for free, no state needed.
Its summary uses `tCount` for "N tool calls" and the duration formatted with one decimal of seconds; arguments are
`JSON.stringify(args, null, 2)` in a `<pre>` with `white-space: pre-wrap; overflow-wrap: anywhere` so 360 px
holds. Labels: `cards.*`, `trace.*`, `tools.search_products`, `tools.get_order_status`, and value maps
(`availability.*`, `orderStatus.*`, `payment.*`, `returnWindow.*`, `traceError.*`) in both dictionaries; the
existing parity tests cover them. An unknown error code falls back to `trace.error.generic` plus the code.

**D9. Contract fixture.** `tests/fixtures/chat_response.json` grows to a full response (one product card with a
promotion, one order card, a two-step trace). pytest validates it with `ChatResponse`, vitest with
`chatResponseSchema`, so a field renamed on one side fails CI.

## Risks / Trade-offs

- [Cards show products the reply does not mention] → Accepted (D3); the card list is "what the tool found". Prompt
  tuning in `conversation-examples` can make searches narrower.
- [Storage grows with cards] → At most 8 small cards per turn; history is cleared by "New conversation". No cap
  added.
- [The model writes Markdown the subset does not cover (headings, numbered lists)] → Shown as literal text, still
  readable; `conversation-examples` can steer the prompt to bullets and bold only.
- [Trace exposes tool arguments] → Only to the same browser that sent them; no other customer's data is in the
  trace because outcomes do not echo results.

## Migration Plan

Deploy API and web together (one Vercel deployment). Old clients ignore the new fields; old stored histories load
unchanged (D6). Rollback is reverting the commits.
