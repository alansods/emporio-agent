# Proposal

## Why

`agent-core-and-tools` gives a Python `run_turn`, but nothing can reach it over HTTP. The web chat and the deployed
URL need one endpoint that runs a turn, and since the URL is public it must reject oversized or malformed input,
limit request rates and never leak internals when the model fails.

## What Changes

- `POST /api/chat`: takes `{messages, locale}` (the browser-held history and `en` or `pt-BR`), runs one agent turn
  and returns `{reply}`. `cards` and `trace` are added to the response by `rich-cards-and-trace`.
- Input limits enforced before the model is called: 1 to 20 messages, each 1 to 2000 characters after trimming,
  last message from the user, known roles and locale only, no extra fields. Violations return HTTP 422.
- Per-IP rate limit: 10 chat requests per minute per client IP, HTTP 429 with `Retry-After` beyond that.
- Timeout on every model request (15 s). Together with the 6-call cap of the agent loop it bounds a turn.
- One JSON error shape for every failure: `{"error": "<code>"}` with `invalid_request` (422), `rate_limited` (429),
  `model_unavailable` (503) and `internal_error` (500). No validation details echoed, no stack traces, no prompt
  text. Details go to the server log only.
- Local development loads `.env` into the API through `uvicorn --env-file .env`. README and dev command updated.

## Out of scope

- `cards` and `trace` in the response (`rich-cards-and-trace`).
- Any web UI that calls the endpoint, history trimming in the browser and error messages shown to the user
  (`chat-ui-dark-i18n`).
- Vercel function settings such as `maxDuration`, bundling of `data/`, and production smoke checks
  (`vercel-deployment`).
- Streaming (SSE), authentication, CORS (the web app and API share one origin in production and through the dev
  rewrite), and a shared rate limit store across function instances.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `chat-api`: adds the chat endpoint, its input limits, the per-IP rate limit, the model timeout and the error
  mapping. The existing health and unknown-route requirements are unchanged.

## Impact

- Code: `api/index.py` (route, error handlers), new `emporio_agent/api_models.py` (Pydantic request and response)
  and `emporio_agent/rate_limit.py`; `emporio_agent/agent.py` gains the request timeout and exposes the default
  model factory so the route can inject a fake model in tests; `emporio_agent/config.py` gains the limit constants.
- Tests: `tests/test_chat_api.py` with FastAPI `TestClient` and the existing `ScriptedModel`, `tests/test_rate_limit.py`.
- Dependencies: `python-dotenv` (dev only). Uvicorn's `--env-file` option imports it; without it the flag fails.
  Not shipped: on Vercel the variables come from the project settings, so the runtime never reads `.env`.
- Docs: README "Run locally" and the dev command in the contributor notes.
