# Proposal

## Why

The brief's core deliverable is the agent itself: a Python agent that answers from the store's CSV data and policy
manual, decides when to query data and when to apply policy, and never makes up prices. The repo only has a health
endpoint today. This change brings the agent core in (ported from the CLI prototype, now on Gemini and the standard
library `csv` module) so `chat-api` can expose it over HTTP next.

## What Changes

- Track the source data in `data/`: the six CSVs under short names (`products.csv`, `categories.csv`,
  `promotions.csv`, `orders.csv`, `order_items.csv`, `customers.csv`, contents unchanged), the original
  `politicas_da_loja.pdf`, and `politicas.txt` generated from it by a new `scripts/extract_policies.py`.
- Load the CSVs once per process into typed, read-only records with the standard library `csv` module (no pandas).
- Pricing rules in Python: active promotion (highest wins), PIX 5% only without promotion, max interest-free
  installments by the manual's minimums. The LLM never does arithmetic.
- Tool `search_products`: accent-insensitive name search, category enum, price range on the effective price,
  availability filter, sorted by effective price, capped result list with the total count.
- Tool `get_order_status`: order data only when the full name or email matches the owner; one indistinguishable
  error for "not found" and "does not match". Return windows (regret, preference exchange, defect exchange, legal
  warranty) computed in Python against `REFERENCE_DATE`.
- System prompt: store persona, tool-use rules, scope rules, reply language from the requested locale, reference
  date, and the full policy manual.
- Agent loop: one stateless turn over the client-sent history, Gemini function calling via `google-genai`, at most
  5 tool rounds, returns the reply text plus a record of every tool call (name, arguments, result) for the later
  cards and trace builder.
- Fix `openspec/project.md`: the 30-day defect exchange counts from the purchase date (manual 4.2); regret and
  legal warranty count from receipt. The agent package moves from `api/emporio_agent/` to `emporio_agent/`.

## Out of scope

- HTTP chat endpoint, request limits, rate limiting and error mapping (`chat-api`).
- Cards and trace response models and the builder that turns tool call records into them (`rich-cards-and-trace`).
- Any web UI work.
- `scripts/record_examples.py` and the real-model behavior checks (`conversation-examples`).
- An interactive CLI. The prototype's CLI and file-based history are not ported: history lives in the browser.
- Shipping quotes (no data for it) and promotion wording beyond the CSV `description` field.

## Capabilities

### New Capabilities

- `product-catalog`: product search filters, ordering, result cap and availability status.
- `pricing`: effective price, active promotion selection, PIX price and max interest-free installments.
- `order-lookup`: identity-checked order status and return window deadlines.
- `support-agent`: one agent turn: system prompt content, tool orchestration, tool round limit, reply language and
  the tool call record it returns.

### Modified Capabilities

None. `chat-api` gains the chat endpoint in its own change.

## Impact

- New code: `emporio_agent/` at the repo root (data, pricing, catalog, orders, tools, prompt, agent; root rather
  than `api/` so Vercel does not turn each module into a function, see design D1), `scripts/extract_policies.py`, tests under
  `tests/`.
- New data: `data/*.csv`, `data/politicas_da_loja.pdf`, `data/politicas.txt`.
- Dependencies:
  - `google-genai` (runtime): the official Google Gen AI SDK, needed for Gemini function calling. It replaces the
    prototype's previous provider client because the project targets Gemini's free tier.
  - `pypdf` (dev only): pure Python PDF text extraction for the one-off `extract_policies.py`. Not shipped in the
    function, so cold starts are unaffected.
  - `pandas` and `python-dotenv` from the prototype are dropped: `csv` covers 65 products and 20 orders, and
    the agent reads plain environment variables (loading `.env` for local runs is settled in `chat-api`).
- Config: `GEMINI_API_KEY`, `MODEL`, `REFERENCE_DATE` (already documented in `.env.example`).
- Docs: `openspec/project.md` return window fix, package path in the layout, preference exchange assumption.
