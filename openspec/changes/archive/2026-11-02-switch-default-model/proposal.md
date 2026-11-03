# Proposal

## Why

On 2026-11-02 the real `gemini-3.8-flash` took 118-179 s per call: 504 DEADLINE_EXCEEDED (even with no prompt) and
503 "high demand". Every real turn hit the 15 s model timeout and the chat returned 503. In the same session
`gemini-3.5-flash-lite` answered in 1-2.5 s with correct values (Takamine GD20: R$ 2.199,00, PIX R$ 2.089,05, 12x of
R$ 183,25) and declined accessories as the manual requires. The default must be a model that answers today.

## What Changes

- Default model becomes `gemini-3.5-flash-lite`. The `MODEL` environment variable still overrides it.
- Tests that assert the default model name are updated.
- `.env.example`, README, `openspec/project.md` and the local `CLAUDE.md` name the new default.
- Housekeeping: the `chat-api` main spec Purpose still says the chat endpoint arrives "in later changes"; it is
  rewritten to describe the endpoint that now exists. No requirement changes there.

Out of scope:
- Changing the 15 s timeout, the tool-round cap or any retry/fallback between models.
- Prompt or tool changes for the new model.
- Creating `scripts/record_examples.py` (it does not exist yet; it belongs to the examples change). Real-model
  confirmation here is a manual smoke test.
- No new dependency.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `support-agent`: requirement "Model choice by environment" changes its default from `gemini-3.8-flash` to
  `gemini-3.5-flash-lite`.

## Impact

- Code: `emporio_agent/config.py` (`DEFAULT_MODEL`).
- Tests: `tests/test_config.py`, `tests/test_agent.py`.
- Docs: `.env.example`, `README.md`, `openspec/project.md`, `openspec/specs/chat-api/spec.md` (Purpose only),
  `CLAUDE.md` (untracked, local only).
- Deploy: a Vercel project that sets `MODEL` explicitly keeps its value; one that relies on the default switches on
  the next deploy.
