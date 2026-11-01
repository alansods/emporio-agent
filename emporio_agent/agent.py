"""One stateless chat turn: Gemini function calling over the store tools, capped tool loop."""

import os
from dataclasses import dataclass
from typing import Any, Literal, Protocol

from google import genai
from google.genai import types

from emporio_agent.config import MAX_TOOL_ROUNDS, model_name, reference_date
from emporio_agent.prompt import STORE_PHONE, Locale, build_system_prompt
from emporio_agent.tools import build_tools, run_tool

FALLBACK_REPLY: dict[Locale, str] = {
    "en": f"Sorry, I couldn't finish looking that up. Please call us at {STORE_PHONE}.",
    "pt-BR": f"Desculpe, não consegui concluir a consulta. Por favor, ligue para {STORE_PHONE}.",
}

MODEL_ROLES = {"user": "user", "agent": "model"}


@dataclass(frozen=True)
class ChatMessage:
    role: Literal["user", "agent"]
    text: str


@dataclass(frozen=True)
class ToolCallRecord:
    name: str
    arguments: dict[str, Any]
    result: dict[str, Any]


@dataclass(frozen=True)
class TurnResult:
    reply: str
    tool_calls: list[ToolCallRecord]


class AgentError(Exception):
    """The model could not produce a reply. The message is generic on purpose."""

    def __init__(self) -> None:
        super().__init__("model_unavailable")


class ChatModel(Protocol):
    def generate(
        self, system: str, contents: list[types.Content], tools: list[types.Tool]
    ) -> types.Content: ...


class GeminiModel:
    """Adapter over `google-genai`. Automatic function calling is off: the loop runs the tools."""

    def __init__(self, client: genai.Client | None = None) -> None:
        self._client = client or genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

    def generate(
        self, system: str, contents: list[types.Content], tools: list[types.Tool]
    ) -> types.Content:
        response = self._client.models.generate_content(
            model=model_name(),
            contents=contents,
            config=types.GenerateContentConfig(
                system_instruction=system,
                tools=tools,
                automatic_function_calling=types.AutomaticFunctionCallingConfig(disable=True),
            ),
        )
        if not response.candidates or not response.candidates[0].content:
            raise ValueError("Model response has no content.")
        return response.candidates[0].content


def _to_content(message: ChatMessage) -> types.Content:
    return types.Content(
        role=MODEL_ROLES[message.role], parts=[types.Part.from_text(text=message.text)]
    )


def _function_calls(content: types.Content) -> list[types.FunctionCall]:
    return [part.function_call for part in content.parts or [] if part.function_call]


def _reply_text(content: types.Content) -> str:
    texts = [part.text for part in content.parts or [] if part.text and not part.thought]
    return "".join(texts).strip()


def _run_call(call: types.FunctionCall) -> tuple[ToolCallRecord, types.Part]:
    name = call.name or ""
    arguments = dict(call.args or {})
    result = run_tool(name, arguments)
    response = types.FunctionResponse(id=call.id, name=name, response=result)
    return ToolCallRecord(name, arguments, result), types.Part(function_response=response)


def _generate(
    model: ChatModel, system: str, contents: list[types.Content], tools: list[types.Tool]
) -> types.Content:
    try:
        return model.generate(system, contents, tools)
    except Exception as exc:
        raise AgentError() from exc


def _default_model() -> GeminiModel:
    try:
        return GeminiModel()
    except Exception as exc:
        raise AgentError() from exc


def run_turn(
    messages: list[ChatMessage], locale: Locale, model: ChatModel | None = None
) -> TurnResult:
    """One turn over the client-sent history; the model runs at most MAX_TOOL_ROUNDS + 1 times."""
    model = model or _default_model()
    system = build_system_prompt(locale, reference_date())
    tools = build_tools()
    contents = [_to_content(message) for message in messages]
    records: list[ToolCallRecord] = []

    for round_number in range(MAX_TOOL_ROUNDS + 1):
        content = _generate(model, system, contents, tools)
        calls = _function_calls(content)
        if not calls:
            reply = _reply_text(content)
            if not reply:
                raise AgentError()
            return TurnResult(reply=reply, tool_calls=records)
        if round_number == MAX_TOOL_ROUNDS:
            break
        executed = [_run_call(call) for call in calls]
        records.extend(record for record, _ in executed)
        contents.append(content)
        contents.append(types.Content(role="user", parts=[part for _, part in executed]))

    return TurnResult(reply=FALLBACK_REPLY[locale], tool_calls=records)
