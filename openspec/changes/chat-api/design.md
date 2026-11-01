# Design

## Context

- `api/index.py` serves `GET /api/health` and maps Starlette HTTP errors to `{"error": "<detail>"}`.
- `emporio_agent.agent.run_turn(messages, locale, model=None)` is synchronous, raises `AgentError` (message
  `model_unavailable`) for any model failure, and builds `GeminiModel` from `GEMINI_API_KEY` when no model is given.
- In development Next.js rewrites `/api/*` to `127.0.0.1:8000`; in production both run on one Vercel origin. No CORS
  is needed in either case.
- Gemini's free tier caps requests per minute per project, and one turn can make up to 6 model calls.

## Goals / Non-Goals

**Goals:**

- A thin route: validate, rate limit, call `run_turn`, map errors. No agent logic in `api/`.
- Every scenario in the `chat-api` delta tested with `TestClient` and the existing `ScriptedModel`, no network.

**Non-Goals:**

- Distributed rate limiting, request logging or metrics beyond Python's `logging`.
- Changing the agent loop or prompt.

## Decisions

### D1. Pydantic models in `emporio_agent/api_models.py`

```python
class ChatMessageIn(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    role: Literal["user", "agent"]
    text: str = Field(min_length=1, max_length=MAX_MESSAGE_CHARS)

class ChatRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    messages: list[ChatMessageIn] = Field(min_length=1, max_length=MAX_MESSAGES)
    locale: Locale

    # model_validator(mode="after"): last message role must be "user"

class ChatResponse(BaseModel):
    reply: str
```

`str_strip_whitespace` makes "only spaces" fail `min_length=1` and the 2000 limit apply to trimmed text, which is
what the spec states. The models live in the package, not in `api/`, because `api/index.py` must stay the only
Python file there (Vercel turns each `.py` under `api/` into a function). `rich-cards-and-trace` extends
`ChatResponse`, and the web Zod schema mirrors it.

Limits: `MAX_MESSAGES = 20`, `MAX_MESSAGE_CHARS = 2000`, in `config.py`. 20 messages is about 10 exchanges, enough
context for a support chat; the browser sends the last 20 (done in `chat-ui-dark-i18n`). Rejecting instead of
truncating server side keeps the contract explicit and the payload bounded. Alternative considered: server keeps the
last N. It hides a client bug and still needs a hard cap on body size.

### D2. Model injection through a FastAPI dependency

`agent.py` renames `_default_model` to `default_model()` (still raises `AgentError` when the key is missing). The
route declares `model: ChatModel = Depends(chat_model)` where `chat_model()` returns `default_model()`. Tests set
`app.dependency_overrides[chat_model]` to return a `ScriptedModel`. An `AgentError` raised inside the dependency
reaches the same exception handler as one raised by the turn, so a missing key is a 503 too.

Alternative: monkeypatching `emporio_agent.agent.GeminiModel`. Works, but couples tests to module internals;
dependency overrides are FastAPI's documented seam.

### D3. Sync route

`def chat(...)` (not `async def`): `run_turn` and the SDK call are blocking, and FastAPI runs sync routes in its
thread pool. An async route would block the event loop or need `run_in_threadpool` by hand.

### D4. Error mapping in one place

| Source | Status | Body |
|---|---|---|
| `RequestValidationError` (bad JSON, schema, limits) | 422 | `{"error": "invalid_request"}` |
| `RateLimited` | 429 + `Retry-After` | `{"error": "rate_limited"}` |
| `AgentError` | 503 | `{"error": "model_unavailable"}` |
| any other `Exception` | 500 | `{"error": "internal_error"}` |
| Starlette `HTTPException` (existing) | as raised | `{"error": "<detail>"}` |

Handlers log the exception (`logger.exception` for 500 and 503, the validation error locations for 422) but return
only the code. FastAPI's default 422 body echoes the submitted input, which could reflect large or sensitive text;
the UI only needs to know the request was rejected. The UI maps codes to localized messages.

Starlette's error middleware re-raises after the 500 handler responds, so 500 tests use
`TestClient(app, raise_server_exceptions=False)`.

### D5. In-memory fixed-window rate limiter

`emporio_agent/rate_limit.py`:

```python
class RateLimiter:
    def __init__(self, limit: int, window_seconds: float, clock: Callable[[], float] = time.monotonic): ...
    def check(self, key: str) -> None:  # raises RateLimited(retry_after_seconds)
```

A dict `ip -> (window_start, count)` behind a `threading.Lock` (sync routes run in a thread pool). Entries whose
window has ended are dropped on each check, so memory stays proportional to active clients. The clock is injected
so the reset scenario needs no sleep. Limit: 10 per 60 s, in `config.py` (`CHAT_RATE_LIMIT`,
`CHAT_RATE_WINDOW_SECONDS`). `Retry-After` is the seconds left in the window, rounded up.

The route takes the limiter through a dependency (`enforce_rate_limit`) that runs before the model dependency, so a
limited request never builds a client. Tests override it with a fresh limiter and a fake clock.

Client IP: first entry of `X-Forwarded-For`, else `request.client.host`. Vercel sets `X-Forwarded-For` itself and
does not pass a client-supplied value through; `vercel-deployment` verifies this on the deployed URL. Locally any
client can spoof the header, which is irrelevant there.

Alternatives: Vercel WAF rate limiting (dashboard config, not in the repo or tests), Redis/Upstash (new service and
dependency). The limit's job here is to stop casual abuse of a demo; cost is already capped by the free tier.

### D6. Model request timeout

`GeminiModel.generate` passes `http_options=types.HttpOptions(timeout=MODEL_TIMEOUT_MS)` inside
`GenerateContentConfig` (the SDK takes the timeout in milliseconds). `MODEL_TIMEOUT_MS = 15_000` in `config.py`.
A timeout raises from the SDK, which the loop already turns into `AgentError`. Worst case per turn is 6 x 15 s =
90 s; `vercel-deployment` sets the function's max duration above that. A per-call timeout keeps the agent loop
unchanged; an overall turn deadline would need cancellation of a blocking SDK call in a thread, which Python does
not support cleanly.

### D7. `.env` for local runs only

`python-dotenv` in `requirements-dev.txt`; the documented dev command becomes
`uvicorn api.index:app --reload --port 8000 --env-file .env`. Uvicorn's `--env-file` imports `dotenv`, so the
flag fails without it. The app code never loads `.env`: on Vercel, variables come from project settings.
Alternative: `set -a; source .env` in the shell. Works without a dependency but is shell specific and easy to forget.

## Risks / Trade-offs

- [Rate limit is per function instance] -> Vercel may run several instances, so the effective limit can be higher.
  Accepted for a demo; documented as a limitation with Vercel WAF or a shared store as the next step.
- [Gemini free tier RPM is lower than 10 turns x 6 calls] -> the provider's 429 surfaces as 503
  `model_unavailable`. Acceptable; the README explains the free tier limits.
- [Spoofed `X-Forwarded-For` off Vercel] -> only matters outside Vercel, where the limit is not a security control.
- [Validation errors give the client no detail] -> the UI enforces the same limits before sending, so a 422 means a
  client bug, which the server log explains.

## Migration Plan

Additive: a new route and dev dependency. Rollback is reverting the commits; the health endpoint is untouched.
