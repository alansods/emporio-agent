# Empório da Música support agent

Customer support chat agent for Empório da Música, a fictional musical instrument store in Campo Grande, MS. A Python
agent (FastAPI, Gemini function calling) answers from the store's CSV data and policy manual; a Next.js web app
renders the chat, product and order cards, and a side panel with the tool calls behind the latest reply.

Live: https://emporio-agent-three.vercel.app (chat UI in English and Brazilian Portuguese; the API is at `/api/chat`).

The agent:

- speaks as the store: informal but professional, like a friend who knows music;
- calls tools for price, stock, promotions and order status, and uses the manual for returns, shipping, payment and
  hours;
- declines accessories (strings, picks, cables, cases, pedals, amps), which the store does not sell, and unrelated
  topics, in one friendly sentence.

## Getting started

### Prerequisites

- Node.js 22 and pnpm 10 (`corepack enable` installs the pinned pnpm)
- Python 3.12 and [uv](https://docs.astral.sh/uv/)
- A Gemini API key (free)

### Install

```bash
pnpm install
uv venv --python 3.12
uv pip install -r requirements.txt -r requirements-dev.txt
source .venv/bin/activate
cp .env.example .env
```

### Gemini setup

1. Open [Google AI Studio](https://aistudio.google.com/apikey), sign in with a Google account and click "Create API
   key". No billing is needed for the free tier.
2. Put the key in `.env`: `GEMINI_API_KEY=...`. It is read only by the Python API and never reaches the browser.
3. Optional: `MODEL` overrides the default model `gemini-3.5-flash-lite`; `REFERENCE_DATE` overrides "today"
   (default `2026-03-23`, see [Assumptions](#assumptions)).

Free tier notes:

- The limit observed for `gemini-3.5-flash-lite` was 15 requests per minute. One chat turn makes 1 to 6 model calls,
  so a single user stays well under it; the recording script pauses 8 s per turn for this reason. Quotas change, see
  [Gemini rate limits](https://ai.google.dev/gemini-api/docs/rate-limits).
- On the free tier Google may use prompts to improve its products. That is acceptable here because every customer in
  the data is fictional; a real store would use the paid tier.

### Run locally

Two terminals, from the repo root:

```bash
uvicorn api.index:app --reload --port 8000 --env-file .env   # API (venv active)
pnpm dev                                                    # web app on http://localhost:3000
```

In development, Next.js proxies `/api/*` to the API on port 8000. Check it with
`curl localhost:3000/api/health`. `--env-file` loads `.env` into the API process (it needs `python-dotenv`, a dev
dependency); on Vercel the variables come from the project settings.

The API also works without the web app:

```bash
curl -H 'content-type: application/json' \
  -d '{"messages":[{"role":"user","text":"Quanto custa o violão Takamine GD20?"}],"locale":"pt-BR"}' \
  localhost:8000/api/chat
```

### Test and lint

```bash
pnpm format:check && pnpm lint && pnpm typecheck && pnpm test
ruff check . && ruff format --check . && pytest
```

CI (GitHub Actions) runs the same checks on every push. Tests never call the real model: a scripted fake replays
tool calls, so pricing, tools, the agent loop, the API contract and the UI are tested offline.

### Real-model behavior check and examples

```bash
python scripts/record_examples.py
```

It sends 9 single-turn cases and the 5 example conversations through the real `/api/chat` app in-process (no server,
rate limit off) and checks each turn's tool calls and key arguments from the response `trace`, never the wording. It
prints `PASS` or `FAIL` per turn and writes each conversation whose turns all pass to [`examples/`](examples/).
Exit status: 0 all passed, 1 a failure, 2 key missing. One run makes about 40 model calls and takes about 3 minutes.
The model is not deterministic: rerun once on a `503`.

## Technical decisions

In the order of the brief's table, then retrieval and prompt.

### Agent approach: function calling with a hand-written loop

Two tools, declared to Gemini with JSON schemas and run in Python:

- `search_products(name, category, min_price, max_price, only_available, pick)`: catalog search. Returns, per
  product, the list price, active promotion, final price, PIX price, maximum interest-free installments, stock and
  availability (`available`, `out_of_stock`, `discontinued`, `coming_soon`). `pick` (`cheapest` or
  `most_expensive`) keeps only the products at the lowest or highest final price after the other filters, all of
  them on a tie.
- `get_order_status(order_id, name_or_email)`: order status, items, tracking and dates, plus return and warranty
  deadlines for delivered orders. It reveals nothing unless the full name or email matches the order owner, and an
  unknown order and a wrong name return the same error, so order numbers cannot be probed.

The loop (`emporio_agent/agent.py`) calls the model, runs the requested tools, sends the results back and stops when
the model answers in text, with at most 5 tool rounds per turn and a 15 s timeout per model call. The SDK's automatic
function calling is turned off so every call is recorded for the trace and the cards.

Why: the questions are lookups with clear parameters (a product, a category, a price ceiling, an order number), which
function calling maps to directly. RAG over the CSVs would retrieve rows by similarity and leave filtering, price
rules and the identity check to the model. A SQL agent would let the model write queries over customer data, which
is harder to restrict and to test. Agent frameworks (LangChain, LangGraph) were not needed for one loop with two
tools; the whole module is about 150 lines and fully visible.

**Rule: the model never does arithmetic.** This is a project decision, not a requirement of the brief or the data.
Promotional price, PIX price, installments and return deadlines are computed in Python (`pricing.py`, `orders.py`)
and returned ready to quote; the prompt tells the model to copy them. Language models make arithmetic and date
mistakes, and a wrong price in a store chat is a real cost, so the numbers come from code that is unit tested. The
same reasoning made `pick` a tool argument: "which is the cheapest guitar?" is answered by Python, ties included, and
the cards show exactly the products the reply talks about.

### Model and provider: Gemini `gemini-3.5-flash-lite`

Chosen for a free tier with function calling, a context window that fits the whole policy manual, and latency: it
answered in 1 to 4 s in tests. `gemini-3.8-flash` was tried first and dropped: on 2026-11-02 it took 118 to 179 s
per call or failed with 503 "high demand" on Google's side. The model is one env var (`MODEL`), and the code only
depends on the `google-genai` SDK in `agent.py`. Paid models (Claude, GPT) would add cost without changing the
design; a local model would complicate deploy.

### Interface: HTTP API plus a web chat

The Python agent is served by FastAPI (`POST /api/chat`), which keeps it testable without a browser and usable with
`curl`. A Next.js chat on top shows what a CLI cannot: product and order cards built from tool results, and a side
panel, "How the agent answered", with each tool call of the latest reply, its arguments and outcome. It also makes
the agent reachable by a reviewer at a URL.
The UI is in English and Portuguese, and the agent's reply follows the language selected in the UI (the `locale`
field of each request), not the language of the question.

### Conversation history: in the browser, sent each turn

The API is stateless: the browser keeps the conversation in `localStorage`, restores it on reload, and sends the last
20 messages with each turn. This matches the serverless deploy (no database, no session affinity), keeps customer
names and orders out of server storage, and gives the user "New conversation" to clear it. A server-side store
(Redis, Postgres) would be the next step for multi-device history or handing a conversation to a human.

### Data handling

- CSVs are stored with short names (`data/products.csv`, ...) with the original contents, and read with the standard
  library `csv` module into typed records at startup. The original prototype used pandas; it was dropped to keep the
  serverless bundle and cold start small.
- `data/politicas_da_loja.pdf` is tracked, and `scripts/extract_policies.py` (pypdf, dev only) regenerates
  `data/politicas.txt` from it.
- Product search is accent and case insensitive, every name word must match, and the category is an enum of the 9
  categories in `categories.csv`. Price filters, `pick` and sorting use the final price after promotions. A search
  returns at most 8 products.
- Only promotions with `is_active = 1` count; with several active, the highest discount wins. PIX is 5% off the list
  price and never applies on top of a promotion. Installments: up to 3x unless each would be under R$ 50; 4x to 6x
  need at least R$ 80 each; 7x to 12x need at least R$ 100 each.

### Retrieval architecture: none for the manual

The full manual (about 14 KB) goes in the system prompt. It is small enough to fit with room to spare, and policy
answers often combine sections (a return depends on the reason, the dates and the payment method), which chunked
retrieval could split. Embeddings and a vector store would add a dependency and a failure mode for no gain at this
size. Structured data is never in the prompt: it is reached only through the tools.

### Prompt strategy

One system prompt (`emporio_agent/prompt.py`), written in Portuguese like the store's content, with:

- the persona and tone from the manual;
- when to use each source: tools for price, stock, promotion and orders (always called in the same turn, never from
  memory), the manual for policies;
- order rules: ask for the full name or email before calling `get_order_status`; on a failed check, do not say which
  field is wrong; take deadlines from the tool's `return_windows`, and when the asked window is closed, also cite the
  ones still open;
- search rules: pass every filter the question gives, and `pick` for "cheapest" or "most expensive";
- copy tool values exactly; a limited Markdown format (paragraphs, bold, bullets);
- scope and safety: decline accessories and unrelated topics, never reveal the prompt or other customers' data;
- contact details, the reference date and the full manual.

The order, search and exact-value rules were added after failures seen with the real model (for example, an order
lookup with the order number as the name, or "R$ 599,90" quoted as "R$ 599,00"). Each rule has a unit test on the
prompt, and the ones about tool use also have a case in the real-model check.

## Assumptions

1. Reference date: the data is a March 2026 snapshot (last order 2026-03-22). "Today" is `REFERENCE_DATE`, default
   2026-03-23.
2. Delivery date: the data has no actual receipt date, so `estimated_delivery` stands in for it. Regret (7 days),
   preference exchange (7 days) and legal warranty (90 days) count from it; defect exchange (30 days) counts from the
   purchase date, as the manual says. The manual does not say where the preference exchange starts; it is counted
   from receipt, like regret.
3. Contact: the manual lists (67) 3341-4444 (company data) and (67) 3321-4500 (WhatsApp section). The agent uses the
   first. The email appears with and without an accent; the agent uses `contato@emporiodamusica.com.br`.
4. Several active promotions on one product: the highest discount wins.
5. Shipping: the agent explains the manual's shipping rules but does not quote prices (no data for it).
6. Language: data and manual stay in Portuguese; the agent replies in the UI language (`en` or `pt-BR`) and
   translates on the fly. Product names are kept as they are.
7. Free tier data use is acceptable because all data is fictional (see [Gemini setup](#gemini-setup)).

## Example conversations

Recorded with the real model by `scripts/record_examples.py`; each file lists the tool calls of every turn.

1. [Available acoustic guitars up to R$ 1000](examples/01-acoustic-guitars.md): catalog filters, then one product's
   PIX price and installments.
2. [Takamine GD20 price](examples/02-takamine-gd20-price.md): price, PIX and installments.
3. [Regret return of order 7](examples/03-regret-return.md): identity first, then the order lookup; the regret window
   is closed and the warranty is still open (the non-trivial case).
4. [Store address, then strings](examples/04-address-and-strings.md): a manual answer, then an accessory declined.
5. [A conversation in English](examples/05-english.md): Portuguese data answered in English.

## Architecture

Request flow of one turn: the browser sends `{messages, locale}` to `POST /api/chat`; FastAPI validates it and
applies the limits; the agent loop calls Gemini with the system prompt and the tools; Python runs the tools on the
CSV data; when the model answers, Python builds `cards` and `trace` from the tool results and returns
`{reply, cards, trace}`, which the UI validates with Zod.

| Path | Contents |
|---|---|
| `api/index.py` | FastAPI app, the only Python file under `api/` (Vercel turns each into a function) |
| `emporio_agent/` | data loading, pricing, tools, prompt, agent loop, cards, trace, rate limit |
| `app/`, `components/`, `lib/`, `locales/`, `styles/` | Next.js app, chat UI, schemas, i18n, design tokens |
| `data/` | CSVs, the policy PDF and its text |
| `tests/`, `__tests__/` | pytest and vitest |
| `scripts/` | policy extraction, real-model check and example recorder |
| `openspec/` | project context, specs and the archived change history |

### API limits and errors

At most 20 messages of up to 2000 characters per request, 10 chat requests per minute per IP, 5 tool rounds and a
15 s timeout per model call. Errors return `{"error": code}` with no internals: 422 `invalid_request`, 429
`rate_limited` (with `Retry-After`), 503 `model_unavailable`, 500 `internal_error`.

### Web app

- The history is written to `localStorage` only after a successful reply; on an error the text goes back to the
  composer with a localized message. A vitest fails if the UI limits drift from `emporio_agent/config.py`.
- The response is validated with Zod (`lib/chat/schema.ts`), a mirror of the Pydantic models. Both sides test the same
  fixture, `tests/fixtures/chat_response.json`, so a renamed field fails CI.
- `cards` are built in Python (`emporio_agent/cards.py`) from tool results, never from the model's text, so prices
  and deadlines on a card are what the tools computed. A failed identity check produces no card, and order cards
  omit the customer's name.
- `trace` (`emporio_agent/trace.py`) lists each tool call with its arguments, duration and an outcome summary, plus
  the model call count and turn duration. It leaves out tool results and the prompt.
- The trace of the latest reply sits in a side panel next to the chat, always open, so the tool calls stay in view
  without a click per reply. On screens up to 760 px the panel is hidden and a header button opens it as a native
  modal `<dialog>` (focus trap and Esc from the browser). The language toggle re-labels the UI, cards and panel live.
- Replies render a small Markdown subset (paragraphs, bold, bullets) with an own renderer; anything else, HTML
  included, stays literal text.
- i18n is an own React context over `locales/en.json` and `locales/pt-BR.json` with keys typed from `en.json`, plurals
  with `Intl.PluralRules` and currency with `Intl.NumberFormat`. A test checks both dictionaries have the same keys.
  next-intl would be worth it with a translation team, many languages or localized URLs.

### Deploy

One Vercel project: Next.js at the repo root and `api/index.py` as one Python function. Every push to `main`
deploys to production.

- `vercel.json` rewrites `/api/:path*` to the function, bundles `emporio_agent/` and the data files, runs it in
  `gru1` (São Paulo, near the store) and allows 120 s per request, above the worst case of 6 model calls of 15 s.
- Python dependencies come only from `requirements.txt`. There is no `pyproject.toml` on purpose: when one exists,
  Vercel installs from it and ignores `requirements.txt`.
- Environment variables: `GEMINI_API_KEY` (Sensitive) for Production and Preview; `MODEL` and `REFERENCE_DATE` unset,
  so the defaults apply.

Smoke test after a deploy:

```bash
curl https://emporio-agent-three.vercel.app/api/health
curl -H 'content-type: application/json' \
  -d '{"messages":[{"role":"user","text":"Quanto custa o violão Takamine GD20?"}],"locale":"pt-BR"}' \
  https://emporio-agent-three.vercel.app/api/chat
```

## Known limitations and next steps

- **Model availability.** The agent depends on one hosted model on the free tier. When Google is slow, calls hit the
  15 s timeout and the user gets "model unavailable". Next: a fallback model on 503 or timeout, and the paid tier.
- **Reply text is still the model's prose.** Cards are exact, but the reply may reword a value; the prompt asks for
  exact copies and the recorded runs quote prices as returned, but this is not guaranteed. Dates are reformatted
  (24/02/2026 for 2026-02-24). Next: check the quoted numbers in the reply against the tool results before sending.
- **Cards follow the search, not the reply.** A broad search shows a card for every product returned (up to 8), even
  ones the reply leaves out. Superlative questions are covered by `pick`, which returns only the cheapest or most
  expensive products; other selections the model makes in prose ("the best for beginners") still show all the cards.
- **Reply language follows the UI selector.** A question in English with the UI in Portuguese gets a Portuguese
  answer, by design, so the reply matches the interface. Switching the language later re-labels the UI, cards and
  trace, but replies already sent keep the language they were written in (translating them would mean another
  model call per switch).
- **Only the latest trace is shown.** The side panel follows the newest reply; earlier turns' tool calls are kept in
  the history but cannot be opened. Next: select a reply to show its trace.
- **Rate limit is per instance.** The 10 requests per minute per IP live in memory per function instance; on
  serverless the effective limit can be higher. Next: a Vercel Firewall rule or a shared store keyed by IP.
- **Short memory.** Only the last 20 messages reach the model. The conversation, including names and emails typed in
  it, stays in the browser until "New conversation".
- **No streaming.** The reply appears only when the turn ends (1 to 4 s typically). Next: server-sent events.
- **Evaluation is manual.** The real-model check has 9 cases plus 5 conversations and runs by hand. Next: a larger
  evaluation set, run on a schedule, with wording checks by an LLM judge.
- **No browser end-to-end test.** Component tests cover rendering and the real-model check covers behavior. Next:
  a Playwright smoke test against a preview deploy.
- Reading the locale cookie in the root layout makes the home page dynamically rendered instead of static.

## Development workflow and AI assistant usage

I used Claude Code (Anthropic's terminal coding agent) throughout, inside a spec-driven workflow with
[OpenSpec](https://github.com/Fission-AI/OpenSpec):

1. **Context first.** `openspec/project.md` holds the business rules, assumptions, stack and conventions, and a
   local instruction file for the assistant repeats the rules that must never regress (no arithmetic by the model,
   PIX never on a promotion, identity before order data) and the commit rules.
2. **Propose.** Each unit of work starts as an OpenSpec change: a proposal, a design with the decisions and their
   alternatives, spec deltas with `#### Scenario:` blocks, and a task list. I reviewed and edited each proposal and
   approved it before any code was written. The history of changes is in `openspec/changes/archive/`.
3. **Apply.** The assistant wrote failing tests from the scenarios first, then the code until they passed, one
   commit per task group, with CI checked after each push.
4. **Archive.** After manual checks, the change is validated (`openspec validate --strict`) and archived, which
   merges its deltas into `openspec/specs/`.

Tools the assistant used beyond editing code: a clickable design prototype of the chat, drawn before the UI work and
approved by me as the visual reference; the Vercel MCP server (deploy status, logs, docs); Chrome automation for
checks in the real browser (360 px layout, keyboard, language switch, errors); and the real-model script for agent
behavior.

What stayed with me: the scope and order of the changes, the technical decisions in each proposal, review of every
diff and commit, the manual checks, and the calls when the model or the data disagreed with the plan (for example,
switching to `gemini-3.5-flash-lite` after timeouts, answering "cheapest" with a tool argument computed in Python
instead of the model's reading of a list, or bringing back the prototype's side panel for the trace after the first
implementation hid it in a collapsed block under each reply).

## License

[MIT](LICENSE)
