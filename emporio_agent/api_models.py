"""Request and response bodies of the chat endpoint. The web Zod schemas mirror these."""

from typing import Literal, Self

from pydantic import BaseModel, ConfigDict, Field, model_validator

from emporio_agent.config import MAX_MESSAGE_CHARS, MAX_MESSAGES
from emporio_agent.prompt import Locale


class ChatMessageIn(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    role: Literal["user", "agent"]
    text: str = Field(min_length=1, max_length=MAX_MESSAGE_CHARS)


class ChatRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    messages: list[ChatMessageIn] = Field(min_length=1, max_length=MAX_MESSAGES)
    locale: Locale

    @model_validator(mode="after")
    def last_message_is_from_user(self) -> Self:
        if self.messages[-1].role != "user":
            raise ValueError("The last message must come from the user.")
        return self


class ChatResponse(BaseModel):
    reply: str
