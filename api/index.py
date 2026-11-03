"""FastAPI app served as a Vercel Python Function. Routes keep the /api prefix."""

import logging
from typing import Annotated

from fastapi import Depends, FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from emporio_agent.agent import AgentError, ChatMessage, ChatModel, default_model, run_turn
from emporio_agent.api_models import ChatRequest, ChatResponse

logger = logging.getLogger(__name__)

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


@app.exception_handler(AgentError)
async def agent_error_handler(_request: Request, exc: AgentError) -> JSONResponse:
    logger.error("Model unavailable", exc_info=exc)
    return error_response(503, "model_unavailable")


@app.exception_handler(Exception)
async def unexpected_error_handler(_request: Request, exc: Exception) -> JSONResponse:
    logger.error("Unexpected error", exc_info=exc)
    return error_response(500, "internal_error")


def chat_model() -> ChatModel:
    return default_model()


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/api/chat")
def chat(request: ChatRequest, model: Annotated[ChatModel, Depends(chat_model)]) -> ChatResponse:
    messages = [ChatMessage(role=message.role, text=message.text) for message in request.messages]
    result = run_turn(messages, request.locale, model=model)
    return ChatResponse(reply=result.reply)
