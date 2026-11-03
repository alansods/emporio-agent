"""FastAPI app served as a Vercel Python Function. Routes keep the /api prefix."""

import logging
import time
from typing import Annotated

from fastapi import Depends, FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from emporio_agent.agent import (
    AgentError,
    ChatMessage,
    ChatModel,
    default_model,
    elapsed_ms,
    run_turn,
)
from emporio_agent.api_models import ChatRequest, ChatResponse
from emporio_agent.cards import build_cards
from emporio_agent.config import CHAT_RATE_LIMIT, CHAT_RATE_WINDOW_SECONDS
from emporio_agent.rate_limit import RateLimited, RateLimiter
from emporio_agent.trace import build_trace

logger = logging.getLogger(__name__)

CHAT_LIMITER = RateLimiter(CHAT_RATE_LIMIT, CHAT_RATE_WINDOW_SECONDS)

app = FastAPI(title="Empório da Música support agent", docs_url=None, redoc_url=None)


def error_response(status_code: int, code: str) -> JSONResponse:
    return JSONResponse(status_code=status_code, content={"error": code})


@app.exception_handler(StarletteHTTPException)
async def http_error_handler(_request: Request, exc: StarletteHTTPException) -> JSONResponse:
    return error_response(exc.status_code, str(exc.detail))


@app.exception_handler(RequestValidationError)
async def validation_error_handler(_request: Request, exc: RequestValidationError) -> JSONResponse:
    problems = [(error.get("type"), error.get("loc")) for error in exc.errors()]
    logger.info("Rejected chat request: %s", problems)
    return error_response(422, "invalid_request")


@app.exception_handler(RateLimited)
async def rate_limited_handler(_request: Request, exc: RateLimited) -> JSONResponse:
    response = error_response(429, "rate_limited")
    response.headers["Retry-After"] = str(exc.retry_after_seconds)
    return response


@app.exception_handler(AgentError)
async def agent_error_handler(_request: Request, exc: AgentError) -> JSONResponse:
    logger.error("Model unavailable", exc_info=exc)
    return error_response(503, "model_unavailable")


@app.exception_handler(Exception)
async def unexpected_error_handler(_request: Request, exc: Exception) -> JSONResponse:
    logger.error("Unexpected error", exc_info=exc)
    return error_response(500, "internal_error")


def client_ip(request: Request) -> str:
    """First `X-Forwarded-For` entry (set by Vercel), else the socket peer."""
    forwarded = request.headers.get("x-forwarded-for", "")
    first = forwarded.split(",")[0].strip()
    if first:
        return first
    return request.client.host if request.client else "unknown"


def chat_rate_limiter() -> RateLimiter:
    return CHAT_LIMITER


def enforce_rate_limit(
    request: Request, limiter: Annotated[RateLimiter, Depends(chat_rate_limiter)]
) -> None:
    limiter.check(client_ip(request))


def chat_model() -> ChatModel:
    return default_model()


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/api/chat", dependencies=[Depends(enforce_rate_limit)])
def chat(request: ChatRequest, model: Annotated[ChatModel, Depends(chat_model)]) -> ChatResponse:
    messages = [ChatMessage(role=message.role, text=message.text) for message in request.messages]
    started = time.perf_counter()
    result = run_turn(messages, request.locale, model=model)
    trace = build_trace(result.tool_calls, result.model_calls, elapsed_ms(started))
    return ChatResponse(reply=result.reply, cards=build_cards(result.tool_calls), trace=trace)
