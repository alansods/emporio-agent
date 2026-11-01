# Tasks

## 1. Source data and policy text (`feat(data): add store data and policy text`)

- [x] 1.1 Copy the six CSVs from `docs/data/` to `data/` with short names (`products.csv`, `categories.csv`, `promotions.csv`, `orders.csv`, `order_items.csv`, `customers.csv`) and the PDF as `data/politicas_da_loja.pdf`; verify `cmp` reports each copy identical to its original
- [x] 1.2 Add `pypdf` to `requirements-dev.txt`, pinned to the latest release; verify `uv pip install -r requirements-dev.txt` succeeds
- [x] 1.3 Write `tests/test_policies_text.py`: `data/politicas.txt` exists, contains section titles 1 to 10, has no "Página N" footer lines and no zero-width characters; verify it fails
- [x] 1.4 Implement `scripts/extract_policies.py` (design D11) and generate `data/politicas.txt`; verify the test passes and a diff against the prototype's `politicas.txt` shows only header, footer and whitespace cleanup

## 2. Data loading and pricing (`feat(agent): add data loading and pricing rules`)

- [x] 2.1 Create the `emporio_agent/` package with `config.py` (env with defaults: `REFERENCE_DATE` 2026-03-23, `MODEL` `gemini-3.8-flash`, constants) and `text.py`; write `tests/test_config.py` for the default and overridden reference date and model; verify it fails, then passes after implementing
- [x] 2.2 Write `tests/test_data.py`: loader returns 65 products, 9 categories, 25 promotions, 20 orders, 22 order items, 50 customers with typed fields (`Decimal` prices, `date` dates, `None` for empty optional fields), and importing the package reads no file; verify it fails
- [x] 2.3 Implement `emporio_agent/data.py` (design D2); verify `tests/test_data.py` passes
- [x] 2.4 Write `tests/test_pricing.py` from every `pricing` scenario (inactive ignored, active applied, highest of several, rounding to 323.10, PIX 2089.05, no PIX on promotion, installments for 2199.00, 429.90, 323.10, 150.00, 90.00); verify it fails
- [x] 2.5 Implement `emporio_agent/pricing.py` (design D3, D4); verify `pytest tests/test_pricing.py` and `ruff check .` pass

## 3. Catalog search tool (`feat(agent): add product search tool`)

- [x] 3.1 Write `tests/test_catalog.py` from every `product-catalog` scenario (combined filters, no filters total 65, exact model, accents, every word must match, accent-insensitive category, unknown category error, promotion within budget, sort order, cap 8 with total 35, four availability values, only available); verify it fails
- [x] 3.2 Implement `emporio_agent/catalog.py` with the result shape in design D5; verify `pytest tests/test_catalog.py` passes

## 4. Order lookup tool (`feat(agent): add order lookup tool`)

- [ ] 4.1 Write `tests/test_orders.py` from every `order-lookup` scenario (name and email match ignoring case and accents, partial and other-customer names rejected, unknown id equals mismatch, shipped order 8, cancelled order 17, two items in order 15, order 7 windows at 2026-03-23 and 2026-02-24, no windows for shipped, default and overridden reference date); verify it fails
- [ ] 4.2 Implement `emporio_agent/orders.py` (design D5, D6, D7); verify `pytest tests/test_orders.py` passes
- [ ] 4.3 Update `openspec/project.md`: return windows with their base dates (defect exchange from purchase), preference exchange assumption, package path `emporio_agent/` in the layout; verify `git grep "api/emporio_agent"` returns nothing in tracked files

## 5. Tool declarations and dispatch (`feat(agent): add tool declarations and dispatch`)

- [ ] 5.1 Add `google-genai` to `requirements.txt`, pinned to the latest release; check the current SDK docs for `FunctionDeclaration`, `Tool`, `GenerateContentConfig` and disabling automatic function calling; verify `uv pip install -r requirements.txt` succeeds
- [ ] 5.2 Write `tests/test_tools.py`: declarations name exactly `search_products` and `get_order_status`, category enum equals the 9 category names, `get_order_status` requires both arguments; `run_tool` returns `invalid_arguments` for an unknown argument and `unknown_tool` for `delete_order` without raising; verify it fails
- [ ] 5.3 Implement `emporio_agent/tools.py`; verify `pytest tests/test_tools.py` passes

## 6. System prompt and agent loop (`feat(agent): add system prompt and agent loop`)

- [ ] 6.1 Write `tests/test_prompt.py` from the `support-agent` prompt scenarios (full manual text, phone, email, ISO reference date, English vs Brazilian Portuguese instruction); verify it fails
- [ ] 6.2 Implement `emporio_agent/prompt.py` (design D10); verify `pytest tests/test_prompt.py` passes
- [ ] 6.3 Add `tests/fakes.py` with a `ScriptedModel` that returns prepared `types.Content` responses and records each request; write `tests/test_agent.py` from the remaining `support-agent` scenarios (history order, independent turns, one tool round with result in second request and the first response passed back unchanged, two calls in one response, tool call record, no tools, invalid arguments, unknown tool, round limit with 6 model calls and localized fallback, provider error without manual text or key, default and overridden model); verify it fails
- [ ] 6.4 Implement `emporio_agent/agent.py` (design D8, D9); verify `pytest`, `ruff check .` and `ruff format --check .` pass with `GEMINI_API_KEY` unset
- [ ] 6.5 With a real key in the environment, run one turn from a Python shell asking for the Takamine GD20 price; verify the record shows a `search_products` call and the reply quotes 2199 and 2089.05 (manual check, not in CI)

## 7. Integration check

- [ ] 7.1 Verify `GET /api/health` still passes without `GEMINI_API_KEY`, CI is green on push, and `git ls-files data/` lists the six CSVs, the PDF and `politicas.txt`

## Workflow follow-up

- Run `openspec validate agent-core-and-tools --strict` before archiving.
- Archive with `/opsx:archive` and commit `docs(openspec): archive agent-core-and-tools`.
- Verify `git log --format=full` shows no trailers.
