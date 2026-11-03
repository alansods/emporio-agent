# Empório da Música support agent

Customer support chat agent for Empório da Música, a fictional musical instrument store in Campo Grande, MS. A Python
agent (FastAPI, Gemini function calling) answers from the store's data and policy manual; a Next.js web app renders
the chat.

Live: https://emporio-agent-three.vercel.app (chat UI in English and Brazilian Portuguese; the API is at `/api/chat`).

> Work in progress. The full README (decisions, assumptions, limitations, example conversations) comes with the final
> change.

## Getting started

### Prerequisites

- Node.js 22 and pnpm 10 (`corepack enable` installs the pinned pnpm)
- Python 3.12 and [uv](https://docs.astral.sh/uv/)

### Install

```bash
pnpm install
uv venv --python 3.12
uv pip install -r requirements.txt -r requirements-dev.txt
source .venv/bin/activate
cp .env.example .env
```

Set `GEMINI_API_KEY` in `.env`. The agent uses `gemini-3.5-flash-lite` by default; set `MODEL` to use another
Gemini model.

### Run locally

Two terminals, from the repo root:

```bash
uvicorn api.index:app --reload --port 8000 --env-file .env   # API (venv active)
pnpm dev                                                    # web app on http://localhost:3000
```

In development, Next.js proxies `/api/*` to the API on port 8000. Check it with
`curl localhost:3000/api/health`. `--env-file` loads `.env` into the API process (it needs `python-dotenv`, a dev
dependency); on Vercel the variables come from the project settings.

### Test and lint

```bash
pnpm format:check && pnpm lint && pnpm typecheck && pnpm test
ruff check . && ruff format --check . && pytest
```

CI runs the same checks on every push.

### Real-model behavior check and examples

CI always uses a scripted fake model. To check the real model, run by hand (venv active, `GEMINI_API_KEY` in the
environment or in `.env`):

```bash
python scripts/record_examples.py
```

It sends 8 single-turn cases and the 5 example conversations through the real `/api/chat` app in-process (no server,
rate limit off) and checks each turn's tool calls and key arguments from the response `trace`, never the wording. It
prints `PASS` or `FAIL` per turn and writes each conversation whose turns all pass to [`examples/`](examples/).
Exit status: 0 all passed, 1 a failure, 2 key missing. One run makes about 40 model calls on the free tier and takes
about 3 minutes, because it pauses 8 s per turn to stay under 15 requests per minute. The model is not deterministic:
rerun once on a `503`.

## Web app

The chat is one client component tree (`components/ChatApp`) over a stateless API.

- History lives in the browser's `localStorage` (`emporio.history.v1`) and is restored on reload. Each turn posts
  `{messages, locale}` to `/api/chat` with the last 20 messages, the API's limit; a leading agent message is dropped
  so the window starts with the user. The composer caps messages at 2000 characters, also the API's limit. A vitest
  fails if these numbers drift from `emporio_agent/config.py`.
- The history is written only after a successful reply. On an error the text goes back to the composer and a
  localized alert explains it: 422 invalid request, 429 rate limited (with the `Retry-After` seconds), 503 model
  unavailable, anything else generic. "New conversation" clears the history.
- The response is validated with Zod (`lib/chat/schema.ts`), a mirror of the Pydantic `ChatResponse`. Both sides
  check the same fixture, `tests/fixtures/chat_response.json`, so a field renamed on one side fails CI. Requests
  send only each message's `role` and `text`; stored cards and traces never go back to the API.
- TanStack Query's `useMutation` holds the pending turn and its error; mutations never retry, because a retry would
  spend rate limit and model quota.

### Cards, trace and reply formatting

`POST /api/chat` returns `{reply, cards, trace}`.

- `cards` are built in Python (`emporio_agent/cards.py`) from the turn's tool results, never from the model's text,
  so prices, PIX, installments and deadlines on a card are exactly what the tools computed; the UI only formats them.
  Every product a successful `search_products` call returned becomes a product card (deduplicated by id, at most 8
  per turn); every verified `get_order_status` result becomes an order card without the customer's name or notes.
  A failed identity check (`order_not_verified`) produces no card.
- `trace` (`emporio_agent/trace.py`) lists each tool call with its name, the arguments the model sent, its
  duration and an outcome summary (products found and count, order found, or an error code), plus the number of
  model calls and the whole turn's duration. It leaves out tool results and the system prompt. The UI shows it in
  a collapsed native `<details>` panel ("How I answered") under the reply.
- Cards and trace are stored with the reply in the history, so a reload keeps them.
- Agent replies render a small Markdown subset with an own renderer (`lib/markdown/renderReply.tsx`): paragraphs,
  line breaks, `**bold**` and `-`/`*` bullet lists, built as React elements. Anything else, HTML included, stays
  literal text. Switch to `react-markdown` if replies ever need links, tables or headings.

### Internationalization

Own implementation instead of a library: `locales/en.json` and `locales/pt-BR.json` with flat keys, a React context
exposing `t(key, values)` and `tCount(key, count)` (plurals through `Intl.PluralRules`), and keys typed from
`en.json`, so a missing or misspelled key fails type-checking. A test checks that both dictionaries have the same
keys and placeholders.

The locale comes from a saved choice (local storage, then a cookie), else from the browser language (`pt*` selects
`pt-BR`). The root layout reads the cookie, so returning visitors get server-rendered HTML in their language with
the right `<html lang>`. The agent replies in the locale sent with each request. Switching to next-intl would make
sense with a translation team or TMS, more than a few languages, or localized URLs for SEO.

## Deploy

One Vercel project serves both parts: Next.js at the repo root and the FastAPI app in `api/index.py` as a single
Python function. Every push to `main` deploys to production through the Vercel Git integration.

- `vercel.json` rewrites `/api/:path*` to that function, bundles `emporio_agent/` and the data files it reads at
  runtime, runs it in `gru1` (São Paulo) and allows 120 s per request, above the worst-case turn of 6 model calls of
  15 s each.
- Python dependencies come only from `requirements.txt`. There is no `pyproject.toml` on purpose: when one exists,
  Vercel installs from it and ignores `requirements.txt`. Tool settings live in `ruff.toml` and `pytest.ini`.
- Environment variables (Project Settings > Environment Variables): `GEMINI_API_KEY`, marked Sensitive, for
  Production and Preview. `MODEL` and `REFERENCE_DATE` are optional and left unset in production, so the defaults
  `gemini-3.5-flash-lite` and `2026-03-23` apply.

Smoke test after a deploy:

```bash
curl https://emporio-agent-three.vercel.app/api/health
curl -H 'content-type: application/json' \
  -d '{"messages":[{"role":"user","text":"Quanto custa o violão Takamine GD20?"}],"locale":"pt-BR"}' \
  https://emporio-agent-three.vercel.app/api/chat
```

## Known limitations

- The per-IP rate limit (10 chat requests per minute) is kept in memory per function instance. On serverless,
  requests can land on different instances and cold starts reset the counters, so the effective limit can be higher.
  Next step: a Vercel Firewall rate-limit rule or a shared store (for example Redis) keyed by IP.
- Only the last 20 messages reach the model, so in long conversations it forgets the start. The full history stays
  on screen.
- The conversation, including any name, email or order number typed in it, stays in the browser's local storage
  until "New conversation" is used.
- Cards list every product a search returned, including ones the reply does not mention. Markdown beyond the
  subset (headings, numbered lists, links) appears as typed.
- Card values come from the tools, but the reply text is still the model's prose. The prompt asks it to copy tool
  values exactly; after that change the recorded run quoted every price as returned (R$ 599,90 was once written as
  "R$ 599,00"), but this is not guaranteed, so the card stays the source of truth. Dates are reformatted (24/02/2026
  for 2026-02-24).
- Reading the locale cookie in the root layout makes the home page dynamically rendered instead of static.

## License

[MIT](LICENSE)
