# Design

## Context

The model id lives in one place: `DEFAULT_MODEL` in `emporio_agent/config.py`, read through `model_name()`, which
prefers `MODEL` from the environment. Every model request carries a 15 s timeout (chat-api spec), so a model that
takes minutes per call makes every turn fail with 503. See proposal.md - Why for the measurements.

## Goals / Non-Goals

**Goals:**
- Real turns complete well inside the 15 s timeout with the default configuration.
- Keep `MODEL` as the single switch to go back to `gemini-3.8-flash` (or any other model) without a code change.

**Non-Goals:**
- Automatic fallback between models, latency-based routing or retries.
- Tuning the prompt for the lighter model.

## Decisions

- **Switch the default instead of raising the timeout.** A 180 s timeout would make the chat technically "work" but
  unusable, and Vercel function limits would cut it anyway. The lighter model answered correctly in 1-2.5 s.
- **`gemini-3.5-flash-lite` over keeping `gemini-3.8-flash` and documenting `MODEL=...`.** The default must work for
  anyone who clones the repo and for the deployed demo; an override that everyone has to set is a broken default.
- **No model fallback chain.** It would add retry logic, a second timeout budget and harder-to-read traces for a
  problem a config change solves. Revisit if the lighter model also degrades.
- **Correctness does not depend on model strength for arithmetic.** Prices, PIX and installments are computed in
  Python tools, so a lighter model does not put the pricing rules at risk. The remaining risk is tool selection and
  instruction following (declines, order identity check), covered by the manual smoke test below.

## Risks / Trade-offs

- [Lighter model follows instructions less reliably (wrong tool, skipped decline)] → Manual smoke test with the real
  model on a price question, an accessory question and an order lookup with a wrong name; `MODEL` lets the operator
  switch back without a deploy of new code.
- [Measurement from a single day; `gemini-3.8-flash` may recover] → The choice is a one-line constant plus docs;
  reverting is cheap.
- [Deploy that sets `MODEL=gemini-3.8-flash` explicitly keeps failing] → Check the Vercel project env vars after the
  deploy.

## Migration Plan

Deploy as usual (push to `main`). Rollback: set `MODEL=gemini-3.8-flash` in the environment, or revert the commit.
