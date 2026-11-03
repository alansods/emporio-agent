# Design

## Context

The README already documents setup, the real-model check, the web app, deploy and part of the limitations. The brief
asks for run instructions with the model provider, justified decisions (framework, LLM, retrieval architecture,
prompt strategy), limitations with what would be done with more time, documented assumptions, and how coding
assistants were used. The facts behind each decision already live in `openspec/project.md` and the archived changes.

## Goals / Non-Goals

**Goals:**
- A reviewer can find each brief item by heading and run the project from the README alone.
- Every decision states the choice, the main alternative and why it lost.

**Non-Goals:**
- Moving `openspec/project.md` content into the README verbatim; the README links to `openspec/` for detail.
- Changing code, prompt or tests (the spec delta documents behavior that is already tested).

## Decisions

### D1. README order

1. Summary, live URL. 2. Getting started (prerequisites, install, Gemini setup, run, test). 3. Technical decisions,
in the brief's table order, then retrieval architecture and prompt strategy. 4. Assumptions. 5. Example
conversations. 6. Architecture details (web app, cards and trace, i18n, deploy; the existing sections, trimmed).
7. Known limitations and next steps. 8. Development workflow and AI assistant usage. 9. License.

Brief items first, implementation detail after, so the review path follows the brief. Alternative: a separate
`DECISIONS.md`; rejected because the brief asks for the justifications in the README.

### D2. Gemini setup facts

The setup lists: create a key at Google AI Studio, put it in `.env`, the free tier limit observed for
`gemini-3.5-flash-lite` (15 requests per minute, the reason for the 8 s pause in the recording script), and that
free tier prompts may be used by Google (acceptable because all data is fictional, assumption 7). Exact free tier
quotas change, so the README states what was observed and links to Google's rate limit page instead of copying a
table.

### D3. AI assistant usage content

States the tool (Claude Code), how it was used (spec-driven workflow with OpenSpec: propose, review, apply,
archive; tests written from each `#### Scenario:` first; a project instruction file with the business rules and
conventions; MCP servers for Vercel and browser checks) and what stayed with the author (scope, decisions in each
proposal, review and approval of every commit, manual checks). The author reviews the wording before the commit,
since it describes their own workflow.

### D4. Production smoke test

Two `curl` calls against `/api/chat`, reading `trace` from the response:
- "Quanto custa o violão Takamine GD20?": `search_products` called; reply and card show R$ 2.199,00, PIX
  R$ 2.089,05 and 12x of R$ 183,25.
- "Comprei um instrumento no pedido 7 e me arrependi, posso devolver?": no tool call, reply asks for full name or
  email. A follow-up turn with "Letícia Gonçalves Rocha" calls `get_order_status` and cites the closed regret
  window (2026-02-24) and the open warranty (2026-05-18).

Calls stay under the 10 per minute rate limit. No result is committed beyond the task ticks.

### D5. Optional example 03 fix

Changing the customer text to "instrumento" matches order 7 (Shelby SU-21S soprano ukulele). The checks in
`record_examples.py` look only at tool names and key arguments, so they need no change. Re-recording rewrites all
example files with a new date and new wording; the diff is reviewed before committing.

## Risks / Trade-offs

- [README drifts from the code] → Each number in the README (limits, timeouts, model) is checked against
  `emporio_agent/config.py` and `vercel.json` during the rewrite.
- [Re-recording fails on a 503 or the free tier limit] → Rerun once; if it still fails, skip the optional task and
  keep the current examples, which pass.
- [Model wording differs in the smoke test] → Only tool calls and the quoted values are checked, as in the recorded
  examples.
