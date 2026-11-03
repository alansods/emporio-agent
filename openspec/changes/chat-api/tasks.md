# Tasks

## 1. Local env loading (`chore(api): load .env for local api runs`)

- [x] 1.1 Add `python-dotenv` to `requirements-dev.txt`, pinned to the latest release; verify `uv pip install -r requirements-dev.txt` succeeds
- [x] 1.2 Change the documented dev command to `uvicorn api.index:app --reload --port 8000 --env-file .env` in README "Run locally" and the contributor command table; verify that command starts with the placeholder `.env` and `curl localhost:8000/api/health` returns `{"status":"ok"}`

## 2. Chat endpoint, input limits and error mapping (`feat(api): add chat endpoint with input limits`)

- [x] 2.1 Write `tests/test_chat_api.py` from the endpoint, input limit, model failure and unexpected error scenarios (successful turn, history and English locale reach the model, tool turn, 21 messages with the model not called, 2001 characters, blank text, last message from agent, locale `es`, empty list, extra field, non-JSON body without echo, 20 messages with 2000 characters accepted, provider error body exactly `model_unavailable` without key or policy text, missing key 503 while health stays 200, unexpected exception 500 with `raise_server_exceptions=False`); verify it fails
- [x] 2.2 Add `MAX_MESSAGES` and `MAX_MESSAGE_CHARS` to `config.py` and implement `emporio_agent/api_models.py` (design D1); verify the model-level validation tests pass
- [x] 2.3 Rename `_default_model` to `default_model` in `agent.py`; add `POST /api/chat` with the `chat_model` dependency and the 422, 503 and 500 handlers in `api/index.py` (design D2, D3, D4); verify `pytest`, `ruff check .` and `ruff format --check .` pass with `GEMINI_API_KEY` unset

## 3. Per-IP rate limit (`feat(api): rate limit chat requests per ip`)

- [x] 3.1 Write `tests/test_rate_limit.py` (limiter unit tests with a fake clock: 10 allowed, 11th raises with `retry_after` rounded up, other key unaffected, reset after 60 s, expired entries dropped) and add the rate limit scenarios to `tests/test_chat_api.py` (11th request 429 with `Retry-After` and the model not called, other IP via `X-Forwarded-For` unaffected, window reset, health never limited); verify they fail
- [x] 3.2 Add `CHAT_RATE_LIMIT` and `CHAT_RATE_WINDOW_SECONDS` to `config.py`, implement `emporio_agent/rate_limit.py` and the `enforce_rate_limit` dependency and 429 handler (design D5); verify `pytest` passes

## 4. Model request timeout (`feat(agent): bound model requests with a timeout`)

- [x] 4.1 Add a test to `tests/test_agent.py` that the `GenerateContentConfig` sent through `FakeGeminiClient` has `http_options.timeout == 15000`, and a chat API test that a `TimeoutError` from the model gives 503; verify the first fails
- [x] 4.2 Add `MODEL_TIMEOUT_MS` to `config.py` and pass it in `GeminiModel.generate` (design D6); verify `pytest` passes

## 5. Integration check

- [ ] 5.1 Run the API with the dev command and the web app with `pnpm dev`; verify `curl -X POST localhost:3000/api/chat` with a valid body returns 503 `model_unavailable` with the placeholder key (or 200 with a real key), a 21-message body returns 422, and the 11th request in a minute returns 429
- [ ] 5.2 Verify CI is green on push and `git grep -n "GEMINI_API_KEY" api/` returns nothing (the key is only read inside the package)

## Workflow follow-up

- Run `openspec validate chat-api --type change --strict` before archiving (the name matches a spec too).
- `chat-api` modifies the `chat-api` main spec only; archive it after `agent-core-and-tools` is archived so the
  archive order matches the commit order.
- Archive with `/opsx:archive` and commit `docs(openspec): archive chat-api`.
- Verify `git log --format=full` shows no trailers.
