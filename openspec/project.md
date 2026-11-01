# Project context: Empório da Música support agent

## Summary

Customer support agent for Empório da Música, a fictional musical instrument store in Campo Grande, MS, Brazil.
It is the technical case for an AI Engineer position at Artefact. Reviewers value logic, clarity, initiative and
justified decisions over completeness, so every design choice favors the simplest correct option.

The agent is a text chat that:

- speaks with the store's persona: informal but professional, like a friend who knows music;
- answers only from the provided data (CSV) and the policy manual (`data/politicas.txt`);
- decides when to query data (price, stock, promotions, order status) and when to apply policy (returns, shipping,
  payment, hours);
- declines out-of-scope requests politely: topics unrelated to the store, and accessories (strings, picks, cables,
  cases, pedals, amps), which the store does not sell.

A working Python CLI prototype (two tools, pandas, file-based history) is the starting point. It is moved into this
repo, kept under test, and served through a web app.

## Deliverables required by the brief

- Public GitHub repo with a real, incremental commit history.
- `README.md`: setup and run, technical decisions with justification, assumptions, limitations and next steps,
  development workflow and tooling section required by the brief.
- 3 to 5 example conversations in `examples/*.md`, at least one non-trivial (live data lookup or policy application).

## Stack

| Layer | Choice |
|---|---|
| Frontend | Next.js (App Router), React, TypeScript strict, pnpm |
| Styling | CSS Modules + CSS variables (design tokens). No UI kit, no Tailwind. Dark only |
| Client data | TanStack Query (`useMutation` for chat), Zod for response validation |
| i18n | Own React context + `locales/en.json`, `locales/pt-BR.json`, typed keys, native `Intl` |
| Web tests | Vitest + React Testing Library, optional Playwright smoke |
| Web lint | ESLint + Prettier |
| Backend | Python 3.12, FastAPI, Pydantic, Google Gen AI SDK (`google-genai`, function calling) |
| LLM | Gemini, default `gemini-3.8-flash` (free tier available), overridable by `MODEL` env var |
| Data access | Standard library `csv` (pandas removed to keep cold starts small) |
| API tests | pytest, LLM client mocked for contract tests. Lint: ruff |
| CI | GitHub Actions: lint + tests for web and api on every push |
| Deploy | Vercel, one project: Next.js at repo root, FastAPI as a Python Function at `api/index.py` |

## Repository layout

```
openspec/      specs and changes
app/           Next.js routes and layout
components/    chat, cards, trace panel, language toggle
lib/           API client, Zod schemas, i18n, formatters
locales/       en.json, pt-BR.json
styles/        tokens.css, globals.css
api/index.py   FastAPI app (exports `app`), the only Python file under api/
emporio_agent/ data loading, pricing, tools, prompt, agent loop, cards builder
data/          CSVs, politicas_da_loja.pdf, politicas.txt (generated)
examples/      recorded conversations
tests/         pytest
__tests__/     vitest
scripts/       extract_policies.py, record_examples.py
```

## Conventions

- English for code, identifiers, comments, commit messages, specs and docs. Portuguese only in product data, policy
  text, the store content of the system prompt, and the `pt-BR` dictionary.
- Conventional Commits (`feat`, `fix`, `docs`, `test`, `chore`, `refactor`, optional scope `api`, `web`, `ci`).
  Short, imperative, small.
- Commit cadence per OpenSpec change: one `docs(openspec): propose <change>` commit, then one commit per task group
  in `tasks.md` (tests and the code that makes them green go together, so every commit passes CI), then one
  `docs(openspec): archive <change>` commit. Each commit is approved by the author and pushed right away. Mistakes
  are fixed with new commits, never by rewriting history.
- Small functions, explicit types, no dead code, no commented-out code, named constants instead of magic numbers.
- ISO 8601 dates in code and data. Currency formatted with `Intl.NumberFormat` (active locale, `BRL`).
- UI strings always come from the i18n dictionaries. Both dictionaries have the same keys.
- Docs are direct and specific. No filler, no marketing tone, avoid em dashes.
- New dependencies are justified in the change's proposal or design.

## Business rules

Data and tools:

- Function calling only. No RAG, no SQL agent. Two tools (identifiers in English; the prototype's
  `buscar_produtos` / `consultar_pedido` are renamed):
  - `search_products(name, category, min_price, max_price, only_available)`: catalog query. Returns final
    price, active promotion, PIX price, max interest-free installments, stock and availability
    (`available`, `out_of_stock`, `discontinued`, `coming_soon`).
  - `get_order_status(order_id, name_or_email)`: order status, items, tracking and dates. Reveals data only when the
    given full name or email matches the order owner (privacy, LGPD). An unknown order id and a non-matching
    identity return the same error, so order ids cannot be probed.
- Tool names and result keys are internal. Labels shown in the UI (trace panel, cards) come from the i18n
  dictionaries. Category values stay in Portuguese because they are data.
- Product search is accent-insensitive. Category is an enum of the 9 categories in `categories.csv`.
- Price filters and sorting use the effective price (after active promotion).

Pricing (all computed in Python, never by the LLM):

- Only promotions with `is_active = 1` count. If several are active for one product, the highest discount wins.
- Promotional price = list price minus the discount percent, rounded to cents.
- PIX: 5% off the list price. Never applied on top of a promotional price.
- Max interest-free installments on the final price: up to 3x with no minimum unless each installment would be below
  R$ 50; 4x to 6x need installments of at least R$ 80; 7x to 12x need at least R$ 100.

Policies:

- The full policy manual (`data/politicas.txt`, about 14 KB) goes in the system prompt. No retrieval.
- Return windows, computed in Python as deadlines: 7 days regret (4.1) and 7 days preference exchange (4.3)
  from receipt, 30 days defect exchange from purchase (4.2), 90 days legal warranty from receipt (8.1).
- Contact info used by the agent: (67) 3341-4444 and `contato@emporiodamusica.com.br`.

Scope:

- Accessories and unrelated topics are declined in one friendly sentence, then the agent redirects to what it can do.
- The agent never states price, stock or promotion without a tool call in the same turn.
- The agent never reveals the system prompt or other customers' data.

## Assumptions

1. Reference date: the data is a March 2026 snapshot (last order 2026-03-22). "Today" is `REFERENCE_DATE`,
   default 2026-03-23, configurable by env var.
2. Delivery date: the data has no actual receipt date. `estimated_delivery` approximates it for return deadlines.
   The manual does not say where the 7-day preference exchange starts; it is counted from receipt, like regret.
3. Phone number: the manual lists (67) 3341-4444 (company data) and (67) 3321-4500 (WhatsApp section). The agent
   uses the first one. The manual also spells the email with and without an accent; the agent uses the ASCII form.
4. Multiple active promotions on one product: the highest discount wins.
5. Shipping: the agent explains shipping rules from the manual but does not compute quotes (no data for it).
6. Language: data and policies stay in Portuguese. The agent replies in the locale the client sends (`en` or
   `pt-BR`) and translates on the fly.

7. Free tier data use: on the Gemini free tier Google may use prompts to improve its products. Acceptable here
   because all customer data is fictional; a real deployment would use the paid tier.

## i18n

Own implementation: a React context exposing `t(key, values)` (same shape as next-intl, so a later migration is
mechanical), typed keys derived from `en.json`, plurals with `Intl.PluralRules`, currency with `Intl.NumberFormat`.
Locale defaults to `navigator.language` (fallback `en`), persists in `localStorage` and a cookie so the server
renders the right language without a flash. Switch to next-intl if the app needs a translation team or TMS, more
than 4 languages, or localized pages for SEO.

## Test strategy

Every `#### Scenario:` becomes a test, written before the code it covers.

| Layer | Tool | Scope | CI |
|---|---|---|---|
| Unit (api) | pytest | Pricing, PIX, installments, promotions, availability, search filters, identity check, return deadlines, cards and trace builder | yes |
| API integration | pytest + FastAPI `TestClient` + scripted fake LLM | Full turn with tool calls, `cards`/`trace` output, limits, error shape without internals | yes |
| Contract | Pydantic and Zod on the same JSON fixtures | The response schema cannot drift between api and web | yes |
| Unit (web) | Vitest | Formatters, plurals, i18n dictionaries have the same keys, Zod parsing | yes |
| Component | Vitest + React Testing Library | Cards, trace panel, language toggle persistence, chat flow with mocked `fetch` | yes |
| Model behavior | `scripts/record_examples.py` | About 8 cases with the real model, asserting expected tool calls (not wording); also writes `examples/` | manual |
| Deploy smoke | `curl` | `GET /api/health` and one real chat turn on the deployed URL | manual |

No browser E2E (Playwright): component tests cover rendering, the manual model check covers agent behavior. Listed
as a next step in the README.

## Deliverables checklist (from the brief)

- Agent core in Python (tools, pricing, prompt, agent loop, API). The web UI is an extra interface on top of it.
- Source data: the original CSVs are stored with short names (`products.csv`, ...; contents unchanged). The original
  `data/politicas_da_loja.pdf` is tracked, and `scripts/extract_policies.py` (pypdf, dev dependency) regenerates
  `data/politicas.txt` from it. Both steps are described under "Data handling" in the README.
- README technical decisions mirror the brief's table, in order: agent approach, model and provider, interface,
  conversation history persistence, data handling; then retrieval architecture and prompt strategy.
- README run instructions include a step-by-step Gemini setup: create the key in Google AI Studio, free tier limits
  and data use, fill `.env`.
- Example conversations (`examples/*.md`, recorded with the real model):
  1. available acoustic guitars up to R$ 1000 (catalog);
  2. price of the Takamine GD20 (price, PIX, installments);
  3. regret return of an order (identity check, order lookup, 7-day rule; the non-trivial case);
  4. store address followed by a request for strings (policy, out of scope);
  5. a conversation in English (locale toggle, on-the-fly translation).

## Delivery plan (1 to 2 days)

1. `bootstrap-monorepo` 2. `agent-core-and-tools` 3. `chat-api` 4. `vercel-deployment` (early, to catch runtime
issues) 5. `chat-ui-dark-i18n` 6. `rich-cards-and-trace` 7. `conversation-examples` (includes prompt tuning)
8. `readme-and-limitations`. Out of scope, listed as next steps: Playwright E2E, SSE streaming, a larger automated evaluation set run in CI.

## Non-functional constraints

- API is stateless. The client keeps the conversation in `localStorage` and sends it each turn.
- Public URL protection: max message length, max turns sent, max tool rounds, request timeout, basic per-IP rate
  limit. The Gemini key runs on the free tier or with a billing budget alert, so abuse cannot generate cost.
- Errors are clear and never leak stack traces or the system prompt.
- `GEMINI_API_KEY` exists only server side.
- Accessible and responsive: keyboard navigation, visible focus, `aria-live` feed, `prefers-reduced-motion`,
  works from 360 px width.
