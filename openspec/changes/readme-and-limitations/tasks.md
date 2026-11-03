# Tasks

## 1. Spec coverage and production smoke (no commit)

- [x] 1.1 Confirm the two new `support-agent` scenarios are covered by
  `test_prompt_forbids_order_lookup_without_identity` and `test_prompt_asks_to_mention_open_return_windows` in
  `tests/test_prompt.py`; `pytest tests/test_prompt.py` passes
- [x] 1.2 Production smoke (design D4): GD20 turn calls `search_products` and quotes R$ 2.199,00 / R$ 2.089,05 /
  12x R$ 183,25; order 7 regret turn makes no tool call and asks for name or email; the follow-up with the name calls
  `get_order_status` and cites both windows

## 2. Final README (`docs: write the final README`)

- [x] 2.1 Rewrite `README.md` in the order of design D1, with Gemini setup (D2), decisions with alternatives,
  assumptions, example links, limitations and next steps, and AI assistant usage (D3); no work in progress note, no
  em dashes
- [x] 2.2 Check every number in the README against `emporio_agent/config.py`, `vercel.json` and `.env.example`;
  `pnpm format:check` and `ruff format --check .` pass; author reviews the AI assistant usage wording

## 3. Optional: example 03 wording (`docs(examples): say instrument in the regret example`)

- [ ] 3.1 Change "Comprei um violão" to "Comprei um instrumento" in `scripts/record_examples.py`; run
  `python scripts/record_examples.py`; it exits 0 and `examples/03-regret-return.md` shows the new text; skip this
  group if the run fails twice. Skipped: both runs failed on one turn each with a Gemini 503 (17/18 turns passed
  each time); the current examples stay.

## Workflow follow-up

- `openspec validate readme-and-limitations --strict`, then `/opsx:archive` and commit
  `docs(openspec): archive readme-and-limitations`.
