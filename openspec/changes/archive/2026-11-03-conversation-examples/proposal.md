# Proposal

## Why

CI only exercises a scripted fake model, so nothing checks that the real Gemini model picks the right tools, and the
brief asks for 3 to 5 recorded example conversations. A manual check also found the reply prose misquoting a tool
value (Yamaha C40 R$ 599,90 written as "R$ 599,00") and using Markdown beyond what the UI renders. Now that every
response carries a `trace`, tool calls can be checked from the response itself.

## What Changes

- New `scripts/record_examples.py`, run by hand with the real key from `.env`:
  - runs about 8 single-turn cases through the real `/api/chat` app in-process and checks, from the `trace`, which
    tools ran and their key arguments (never the wording); prints pass/fail per case and exits non-zero on a failure;
  - runs the 5 conversations listed in `openspec/project.md` (catalog, GD20 price, regret return of order 7, address
    then strings, English) turn by turn and writes them to `examples/*.md`, each turn with its tool calls.
- System prompt tuning:
  - values from tools (prices, installments, dates) are quoted exactly as returned, never rounded or rewritten;
  - Markdown limited to paragraphs, `**bold**` and `- ` bullet lists;
  - use every filter the question allows (category, price range, availability) instead of a broad search.
- Pure checking and Markdown-writing helpers of the script are unit tested in CI; CI never calls the real model.
- README: how to run the script, link to `examples/`; the "misquote" known limitation is reworded after the run.

Out of scope: a larger evaluation set or running real-model checks in CI, LLM-as-judge or wording checks,
retries or flakiness statistics, any change to tools, pricing, cards or trace. No new dependency: the script uses
FastAPI's `TestClient` (already used by tests through the dev requirements) and `python-dotenv` (already a dev
dependency).

## Capabilities

### New Capabilities

- `model-evaluation`: manual real-model behavior check (expected tool calls and key arguments per case) and the
  recording of the example conversations into `examples/`.

### Modified Capabilities

- `support-agent`: the "System prompt content" requirement adds exact quoting of tool values, the Markdown subset
  and the narrow-search instruction.

## Impact

- Code: `emporio_agent/prompt.py`, new `scripts/record_examples.py`, new `examples/*.md` (generated, committed).
- Tests: `tests/test_prompt.py`, new `tests/test_record_examples.py` (no network).
- Docs: README (run instructions, examples, known limitations).
- Cost: one manual run is about 20 model calls on the free tier.
