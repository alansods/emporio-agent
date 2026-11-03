# Proposal

## Why

The chat answers correctly, but only as a text bubble: prices, stock and order deadlines are buried in prose, the
reply shows raw Markdown (`**`, `* `), and a reviewer cannot see which tools ran or with what arguments. The case
is judged on logic and clarity, so the UI should show the tool-backed facts as structured cards and expose a trace
of each turn. The agent loop already records every tool call (`support-agent` > Tool call record), so the data is
there and only needs to reach the browser.

## What Changes

- `POST /api/chat` returns `{reply, cards, trace}` instead of `{reply}`. Existing clients keep working because
  they ignore extra fields.
- `cards` are built in Python from the turn's tool results, never from model text: one product card per product
  returned by `search_products` (deduplicated, capped), one order card per verified `get_order_status` result.
  Card values (prices, PIX, installments, deadlines) are the tool's computed values; the UI only formats them.
- `trace` lists each tool call with its name, arguments, outcome (products found and count, order found, or an
  error code) and duration, plus the number of model calls and the total turn duration.
- The agent turn also measures each tool call's duration and counts model calls.
- The UI renders cards under the agent bubble and a collapsed "How I answered" panel with the trace, localized in
  `en` and `pt-BR`, keyboard accessible and fitting 360 px. Cards and trace are stored with the history, so a
  reload keeps them; requests still send only `role` and `text`.
- Agent replies render a small safe Markdown subset (paragraphs, `**bold**`, `-`/`*` bullet lists) as React
  elements. Anything else, including HTML, stays literal text.

Out of scope: streaming, links or images in replies, full Markdown (headings, tables, code, links), cards for
policy answers, editing or re-running a turn from the trace, prompt tuning (belongs to `conversation-examples`).

## Capabilities

### New Capabilities

- `answer-cards`: structured product and order cards built from tool results and how the UI shows them.
- `turn-trace`: the per-turn trace of tool calls, outcomes and timings and how the UI shows it.

### Modified Capabilities

- `chat-api`: the chat endpoint response gains `cards` and `trace`.
- `support-agent`: the tool call record gains a duration, and a turn reports how many model calls it made.
- `chat-ui`: agent replies render basic Markdown safely; the response validation covers `cards` and `trace`; the
  stored history keeps cards and trace across reloads.

## Impact

- API: `emporio_agent/agent.py` (timing, model call count), new `emporio_agent/cards.py` and
  `emporio_agent/trace.py`, `emporio_agent/api_models.py` (card and trace models), `api/index.py`, the shared
  fixture `tests/fixtures/chat_response.json` and its contract tests.
- Web: `lib/chat/schema.ts` (Zod mirrors), `lib/chat/client.ts` (returns reply, cards and trace),
  `lib/storage/historyStore.ts`, new `components/ProductCard`, `components/OrderCard`, `components/TracePanel`,
  `lib/markdown/` (subset renderer), `MessageBubble`, `ChatApp`, both dictionaries.
- No new dependency: the Markdown subset is a small own renderer (see design), so `react-markdown` is not added.
- Docs: README sections on the response contract and limitations.
