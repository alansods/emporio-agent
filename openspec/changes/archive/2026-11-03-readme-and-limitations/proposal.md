# Proposal

## Why

This is the last change of the delivery plan. The README still says "work in progress" and lacks most of what the
brief asks for: justified technical decisions, assumptions, next steps and the coding assistant section. Two prompt
rules added in `conversation-examples` (identity before order lookup, open return windows) are coded and tested but
not in the spec.

## What Changes

- Rewrite `README.md` against the brief and `openspec/project.md` > Deliverables checklist: remove the work in
  progress note; add a step-by-step Gemini setup; technical decisions in the brief's order (agent approach, model
  and provider, interface, history persistence, data handling, then retrieval architecture and prompt strategy);
  assumptions; links to the 5 example conversations; known limitations plus next steps; an "AI assistant usage"
  section describing the workflow. Keep the existing web app, deploy and limitation content, trimmed where it
  repeats.
- Spec delta for `support-agent`: two scenarios for prompt rules already in `emporio_agent/prompt.py` and covered by
  `tests/test_prompt.py`. No code change.
- Manual smoke test on production (https://emporio-agent-three.vercel.app): Takamine GD20 price, and regret return
  of order 7 where the agent asks for the name before any order lookup.
- Optional, only if time allows: example 03 says "Comprei um instrumento" instead of "Comprei um violão" (order 7 is
  a soprano ukulele), then re-record the examples.

Out of scope: the Vercel Node version warning (project on Node 26.x, local 22), new features, Playwright E2E, SSE
streaming, an automated evaluation set in CI (all listed as next steps in the README). No new dependency.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `support-agent`: "System prompt content" gains the rules to ask for the full name or email before calling
  `get_order_status`, and to cite the return windows still open when the requested one is closed.

## Impact

- `README.md`, `openspec/specs/support-agent/spec.md` (at archive).
- Optional: `scripts/record_examples.py` (one string) and `examples/*.md` (re-recorded).
- No API, UI or dependency change.
