# Design

## Context

- `api/index.py` serves only `GET /api/health`. No data, no agent code, no LLM dependency yet.
- The prototype at `~/Downloads/emporio` has working tools on pandas, Portuguese identifiers, another provider's SDK, a
  stateful `Agent` class with file history and 7 tests. Its rules are right; its shape is not what a stateless
  Vercel function needs.
- The repo is a Next.js app at the root with FastAPI as a Python function. Vercel's docs say that without a Python
  framework preset every `.py` file under `api/` becomes its own function, and recommend keeping shared code
  outside `api/` and importing it from the entry point.
- Data is tiny: 65 products, 9 categories, 25 promotions, 20 orders, 22 order items, 50 customers, a 14 KB manual.

## Goals / Non-Goals

**Goals:**

- A pure Python core that `chat-api` can call as `run_turn(messages, locale) -> TurnResult` with no HTTP concerns.
- Every rule in the specs covered by fast pytest tests with no network and no API key.
- A thin, swappable seam around the model so CI fakes it with scripted responses.

**Non-Goals:**

- Pydantic request/response models for HTTP, limits, timeouts (`chat-api`).
- Card and trace models (`rich-cards-and-trace`). This change only guarantees the raw tool call record they need.
- Prompt tuning against the real model (`conversation-examples`).

## Decisions

### D1. Package at the repo root: `emporio_agent/`, not `api/emporio_agent/`

`api/index.py` imports `emporio_agent`. Putting the package under `api/` risks Vercel deploying each module as a
separate function. Alternatives: underscore-prefixed `api/_emporio_agent/` (works by convention, but the name is
odd in imports), or `vercel.json` excludes (config to maintain). The root package follows Vercel's own advice and
keeps imports plain. Bundling the package and `data/` into the function is verified in `vercel-deployment`.
`openspec/project.md` (layout) is updated in this change.

Modules:

| Module | Responsibility |
|---|---|
| `config.py` | `REFERENCE_DATE`, `MODEL`, `MAX_TOOL_ROUNDS`, `SEARCH_RESULT_LIMIT`, paths, read from env once |
| `text.py` | `normalize(text)`: NFKD, strip accents, casefold, trim |
| `data.py` | Frozen dataclasses (`Product`, `Category`, `Promotion`, `Order`, `OrderItem`, `Customer`) and a cached `load_store()` returning a `Store` with dicts by id |
| `pricing.py` | `active_promotion`, `promo_price`, `pix_price`, `max_installments`, `price_product` |
| `catalog.py` | `search_products` |
| `orders.py` | `get_order_status`, `return_windows` |
| `tools.py` | Tool declarations for Gemini and `run_tool(name, args) -> dict` (dispatch + error capture) |
| `prompt.py` | `build_system_prompt(locale, reference_date)` |
| `agent.py` | `ChatMessage`, `ToolCallRecord`, `TurnResult`, `AgentError`, `run_turn`, `GeminiModel` adapter |

### D2. Standard library `csv` with typed records, loaded once

`csv.DictReader` into frozen dataclasses, parsed and type-converted in one place (`data.py`), cached with
`functools.cache`. Loaded lazily on first use so `GET /api/health` never touches the files. Alternative: pandas
(prototype) costs about 30 MB and seconds of cold start for 65 rows; dicts by id are simpler to read and test.

### D3. Money as `Decimal`, half-up to cents, `float` only at the tool boundary

`Decimal(row["price_brl"])` from the CSV string, `quantize(Decimal("0.01"), ROUND_HALF_UP)`. Floats would make
`323.10 / 4` round to 80.77 or 80.78 depending on representation. Tool results are JSON for the model, so values
are emitted as numbers with two decimals (`float(decimal)`), which is exact enough for display after quantizing.

### D4. Installments as a data table

```python
INSTALLMENT_MINIMUMS = (
    (range(2, 4), Decimal("50")),
    (range(4, 7), Decimal("80")),
    (range(7, 13), Decimal("100")),
)
```

`max_installments(price)` returns the largest `n` whose installment `price / n` meets its band's minimum, else 1.
The prototype had the same rule inlined in a conditional expression; a table reads like the manual.

### D5. Tool result shapes (English keys, Portuguese data)

`search_products` returns `{"total_found": int, "products": [...]}`, each product:
`product_id, name, category, description, specs, availability, stock, list_price, promotion | null,
effective_price, pix_price | null, pix_discount_applies, installments: {count, amount}`.
`promotion` is `{name, discount_percent}`.

`get_order_status` returns `{"order_id", "customer_name", "order_date", "status", "total", "payment_method",
"items": [{product_name, quantity}], "tracking_code", "estimated_delivery", "notes", "reference_date",
"return_windows": [{kind, deadline, open}]}` where `kind` is `regret | preference_exchange | defect_exchange |
legal_warranty`. Errors are `{"error": "<code>", "message": "<short text>"}` with codes `order_not_verified`,
`invalid_category`, `invalid_arguments`, `unknown_tool`.

The prototype returned `dias_desde_entrega_aprox` and left the comparison to the model. Returning deadlines and an
`open` flag keeps all date arithmetic in Python, consistent with the pricing rule.

### D6. Return windows as a data table

```python
RETURN_WINDOWS = (
    ("regret", "delivery", 7),
    ("preference_exchange", "delivery", 7),
    ("defect_exchange", "purchase", 30),
    ("legal_warranty", "delivery", 90),
)
```

Base dates per manual: 4.1 regret "após o recebimento", 4.2 defect "após a compra", 8.1 warranty "a partir da data
de recebimento". 4.3 preference exchange says only "em até 7 dias"; assumed from receipt, like regret. Recorded in
`project.md` assumptions.

### D7. One error for unknown order and identity mismatch

The prototype returned "pedido não encontrado" vs "dados não conferem", which lets anyone enumerate valid order ids.
Both now return `order_not_verified`. The prompt tells the model to ask the customer to check both the number and
the name or email.

### D8. Model seam: a one-method adapter, not the raw SDK client

```python
class ChatModel(Protocol):
    def generate(
        self, system: str, contents: list[types.Content], tools: list[types.Tool]
    ) -> types.Content: ...
```

`GeminiModel` wraps `genai.Client(api_key=...)` and calls `client.models.generate_content(model=MODEL,
contents=..., config=GenerateContentConfig(system_instruction=..., tools=..., automatic_function_calling=
AutomaticFunctionCallingConfig(disable=True)))`, returning `response.candidates[0].content`. Tests pass a
`ScriptedModel` that returns prepared `types.Content` values and records every call, so assertions read requests
directly. Alternatives: patching `genai.Client` (couples tests to SDK internals), or our own message types (would
re-implement what `google-genai` types already model). The SDK's types are used on both sides; only the network
call is faked.

The SDK's automatic function calling is disabled because the loop must cap rounds, capture each call for the
record, and turn tool exceptions into error results.

Gemini 3 models attach thought signatures to function call parts and expect them back. The loop appends the
model's returned `Content` object unchanged to `contents`, which preserves them. The exact SDK call shape is
checked against current `google-genai` docs at apply time (Context7 was not available while planning).

### D9. Loop

```
contents = history as Content(role="user"|"model", parts=[text])
for round in range(MAX_TOOL_ROUNDS + 1):
    content = model.generate(system, contents, tools)
    calls = function_call parts of content
    if not calls: return TurnResult(reply=text parts joined, tool_calls=records)
    if round == MAX_TOOL_ROUNDS: break
    contents.append(content)
    contents.append(Content(role="user", parts=[function_response per call]))
return TurnResult(reply=FALLBACK_REPLY[locale], tool_calls=records)
```

So the model is called at most 6 times and tools run in at most 5 rounds, matching the spec. Any SDK exception, or a
response with no candidates or empty content, is raised as `AgentError("model_unavailable")` from the original
exception, with a generic message. `chat-api` maps it to an HTTP error.

`run_turn(messages, locale, model=None)` builds `GeminiModel` from env when `model` is None. Reading
`GEMINI_API_KEY` happens only there, so importing the package needs no key.

### D10. Prompt

Ported from the prototype, store content in Portuguese, tool names updated to `search_products` /
`get_order_status`. Additions: reply language line from the locale (`en` -> English, `pt-BR` -> português do
Brasil, "data and policies are in Portuguese, translate when replying"); return windows guidance ("use the
`return_windows` returned by the tool, do not count days"); unified order error guidance. The manual is read once
from `data/politicas.txt` and appended in full (D2 of the project: no retrieval at this size).

### D11. Policy text extraction

`scripts/extract_policies.py` reads `data/politicas_da_loja.pdf` with `pypdf`, joins page text, drops the repeated
page header ("Empório da Música Manual de Políticas e Procedimentos") and footer ("Página N") lines, removes
zero-width characters, collapses runs of blank lines, and writes `data/politicas.txt`. The generated file is
committed so the runtime never needs `pypdf`. A test asserts the committed file contains the section titles 1 to
10, so a bad regeneration fails CI.

### D12. Dependencies and versions

`google-genai` goes in `requirements.txt`, `pypdf` in `requirements-dev.txt`, both pinned with `==` to the latest
release at apply time, like the existing pins.

## Risks / Trade-offs

- [Thought signature handling differs from the plan] -> the scripted model test asserts the second request contains
  the first response's `Content` object unchanged; the real-model check in `conversation-examples` confirms it.
- [Root package not bundled by Vercel] -> verified in `vercel-deployment` with `vercel build` output; fallback is
  `includeFiles` in `vercel.json`.
- [Model ignores `return_windows` and counts days itself] -> prompt rule plus a recorded example in
  `conversation-examples`; can't be enforced in code.
- [Name search misses plurals, e.g. "takamines"] -> the prototype's plural stripping broke accented words
  ("violões"). Accepted: the model sends model names, and category covers broad queries.
- [Estimated delivery used as receipt date] -> stated in `project.md` assumptions and in the tool result field name.

## Migration Plan

New code only. No runtime path calls it until `chat-api`, so rollback is reverting the commits.
