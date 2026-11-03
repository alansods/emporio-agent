# Tasks

## 1. Default model (commit: `fix(agent): default to gemini-3.5-flash-lite`)

- [x] 1.1 Update the default-model assertions in `tests/test_config.py` (`test_model_defaults_to_gemini_flash`) and
  `tests/test_agent.py` (`test_gemini_request_uses_default_model_and_manual_function_calling`) to expect
  `gemini-3.5-flash-lite`; verify both fail with `pytest tests/test_config.py tests/test_agent.py`
- [x] 1.2 Set `DEFAULT_MODEL = "gemini-3.5-flash-lite"` in `emporio_agent/config.py`; verify `pytest`,
  `ruff check .` and `ruff format --check .` pass and the override tests still pass unchanged
- [x] 1.3 Update `.env.example` comment and commented example to `gemini-3.5-flash-lite`; verify
  `git grep -n "gemini-3.8-flash" -- . ':!openspec/changes'` lists no code, test or env file

## 2. Docs (commit: `docs: document gemini-3.5-flash-lite as default model`)

- [x] 2.1 Update the LLM row in `openspec/project.md` to the new default, with the reason in one short clause
  (latency of `gemini-3.8-flash` on 2026-11-02); verify by reading the row
- [x] 2.2 Name the default model and the `MODEL` override in `README.md` (next to the `.env` step); verify
  `pnpm format:check` passes
- [x] 2.3 Rewrite the Purpose of `openspec/specs/chat-api/spec.md` to describe the existing health and chat
  endpoints (no "in later changes"); verify `openspec validate --specs` passes
- [x] 2.4 Update the default model in the local `CLAUDE.md` (untracked); verify `git status` does not list it

## 3. Real-model check

- [ ] 3.1 With `MODEL` unset and the API running (`uvicorn api.index:app --port 8000 --env-file .env`), send three
  turns via `curl` to `/api/chat`: GD20 price (expect R$ 2.199,00 / PIX R$ 2.089,05 / 12x R$ 183,25 in the reply),
  a guitar strings question (expect a polite decline) and an order lookup with a wrong name (expect no order data);
  verify each returns 200 in under 15 s and record the results in the commit summary to the user
- [ ] 3.2 Run `python scripts/record_examples.py` only if it exists by then; otherwise note that it is deferred to
  the examples change

## Workflow follow-up

- `openspec validate switch-default-model`, then `/opsx:archive` and commit `docs(openspec): archive
  switch-default-model`.
- After deploy, check that the Vercel project does not pin `MODEL=gemini-3.8-flash`.
