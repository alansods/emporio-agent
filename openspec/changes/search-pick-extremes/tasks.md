# Tasks

## 1. Pick in the catalog tool (`feat(api): pick the cheapest or most expensive products`)

- [ ] 1.1 Write failing tests in `tests/test_catalog.py` for the six `product-catalog` scenarios (cheapest and most
  expensive guitar, tie at 1299, pick after filters at 749, no matches, unknown value); `pytest tests/test_catalog.py`
  fails only on them
- [ ] 1.2 Write a failing test in `tests/test_tools.py` that the `search_products` declaration has `pick` with enum
  `["cheapest", "most_expensive"]`
- [ ] 1.3 Implement `pick` in `emporio_agent/catalog.py` (design D1, D2) and declare it in `emporio_agent/tools.py`;
  `pytest`, `ruff check .` and `ruff format --check .` pass

## 2. Prompt rule and behavior case (`feat(api): ask for pick on cheapest questions`)

- [ ] 2.1 Write a failing test in `tests/test_prompt.py` that the prompt mentions `pick` with `cheapest` and
  `most_expensive`; update `test_cases_and_conversations_cover_the_brief` to expect 9 cases
- [ ] 2.2 Add the rule to the search section of `emporio_agent/prompt.py` (D3) and the case to `CASES` in
  `scripts/record_examples.py` (D4); `pytest` and ruff pass; CI green after push

## Workflow follow-up

- `openspec validate search-pick-extremes --strict`, then `/opsx:archive` and commit
  `docs(openspec): archive search-pick-extremes`.
- Then `/opsx:apply readme-and-limitations`, whose single `record_examples.py` run covers the new case.
