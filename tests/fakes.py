"""Test doubles for the model: only the network call is faked, the SDK types are real."""

from dataclasses import dataclass, field
from typing import Any

from google.genai import types


def text_response(text: str) -> types.Content:
    return types.Content(role="model", parts=[types.Part.from_text(text=text)])


def call_response(*calls: tuple[str, dict[str, Any]]) -> types.Content:
    parts = [
        types.Part(function_call=types.FunctionCall(id=f"call-{index}", name=name, args=args))
        for index, (name, args) in enumerate(calls)
    ]
    return types.Content(role="model", parts=parts)


@dataclass(frozen=True)
class ModelRequest:
    system: str
    contents: list[types.Content]
    tools: list[types.Tool]


@dataclass
class ScriptedModel:
    """Returns prepared responses in order (or raises them) and snapshots each request."""

    responses: list[types.Content | Exception]
    requests: list[ModelRequest] = field(default_factory=list)

    def generate(
        self, system: str, contents: list[types.Content], tools: list[types.Tool]
    ) -> types.Content:
        self.requests.append(ModelRequest(system, list(contents), tools))
        response = self.responses[len(self.requests) - 1]
        if isinstance(response, Exception):
            raise response
        return response


@dataclass
class FakeGeminiClient:
    """Stands in for `genai.Client`: exposes `models.generate_content` and records its arguments."""

    response: types.GenerateContentResponse | None = None
    error: Exception | None = None
    calls: list[dict[str, Any]] = field(default_factory=list)

    @property
    def models(self) -> "FakeGeminiClient":
        return self

    def generate_content(self, **kwargs: Any) -> types.GenerateContentResponse:
        self.calls.append(kwargs)
        if self.error is not None:
            raise self.error
        assert self.response is not None
        return self.response


def gemini_response(content: types.Content) -> types.GenerateContentResponse:
    return types.GenerateContentResponse(candidates=[types.Candidate(content=content)])
