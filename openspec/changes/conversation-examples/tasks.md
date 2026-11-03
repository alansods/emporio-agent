# Tasks

## 1. Prompt tuning (`fix(api): quote tool values exactly and limit reply markdown`)

- [x] 1.1 Add tests to `tests/test_prompt.py` for the three new support-agent scenarios (exact tool values, Markdown
  subset, narrow searches); verify they fail with `pytest tests/test_prompt.py`
- [x] 1.2 Add the D4 wording to `emporio_agent/prompt.py`; verify `pytest` and `ruff check .` pass

## 2. Behavior check and recorder (`feat(scripts): add real-model behavior check and example recorder`)

- [x] 2.1 Write `tests/test_record_examples.py` from the model-evaluation scenarios: matching call, name by words,
  wrong argument named in the report, unexpected tool, expected outcome, missing key exits non-zero without a model
  call, rate limit override accepts more than ten requests (fake model), example Markdown content; verify they fail
- [x] 2.2 Implement `scripts/record_examples.py` (D1-D3, D5): turn dataclasses, matchers, `check_turn`,
  `render_example`, the 8 cases and 5 conversations, `main()` with `.env` loading and the limiter override; verify
  `pytest` and `ruff check .` pass and CI makes no network call

## 3. Real run and examples (`docs(examples): record example conversations`)

- [x] 3.1 Run `python scripts/record_examples.py` with the real key; verify every case passes (rerun once on a 503)
  and the C40 and GD20 replies quote the exact values from their cards; if a case fails for a prompt reason, adjust
  the prompt in group 1 terms and rerun
- [x] 3.2 Review the five `examples/*.md` files (regret example: window closed, warranty open until 2026-05-18,
  nothing revealed before identity); verify `ruff format --check .` and `pnpm format:check` stay clean

## 4. Docs (`docs: document the behavior check and examples`)

- [x] 4.1 README: how to run the script (key, cost, exit codes), link to `examples/`, reword the misquote known
  limitation with the run result; verify the documented command runs as written

## Workflow follow-up

- `openspec validate conversation-examples --strict`, then `/opsx:archive`, commit `docs(openspec): archive
  conversation-examples`, push and check CI with `gh run list --limit 1`.
