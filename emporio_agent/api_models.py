"""Request and response bodies of the chat endpoint. The web Zod schemas mirror these."""

from typing import Annotated, Any, Literal, Self

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


Availability = Literal["available", "out_of_stock", "discontinued", "coming_soon"]
OrderStatus = Literal["pending", "confirmed", "shipped", "delivered", "cancelled"]
PaymentMethod = Literal["pix", "boleto", "debit", "credit_3x", "credit_6x", "credit_12x"]
ReturnWindowKind = Literal["regret", "preference_exchange", "defect_exchange", "legal_warranty"]


class PromotionInfo(BaseModel):
    name: str
    discount_percent: float


class Installments(BaseModel):
    count: int
    amount: float


class ProductCard(BaseModel):
    """Field names match the `search_products` result keys; extra result keys are dropped."""

    type: Literal["product"] = "product"
    product_id: int
    name: str
    category: str
    availability: Availability
    stock: int
    list_price: float
    promotion: PromotionInfo | None
    effective_price: float
    pix_price: float | None
    installments: Installments


class OrderItem(BaseModel):
    product_name: str
    quantity: int


class ReturnWindow(BaseModel):
    kind: ReturnWindowKind
    deadline: str
    open: bool


class OrderCard(BaseModel):
    """Field names match the `get_order_status` result keys; customer name and notes are dropped."""

    type: Literal["order"] = "order"
    order_id: int
    status: OrderStatus
    order_date: str
    estimated_delivery: str | None
    tracking_code: str | None
    total: float
    payment_method: PaymentMethod
    items: list[OrderItem]
    return_windows: list[ReturnWindow]


Card = Annotated[ProductCard | OrderCard, Field(discriminator="type")]


class ProductsOutcome(BaseModel):
    kind: Literal["products"] = "products"
    count: int


class OrderOutcome(BaseModel):
    kind: Literal["order"] = "order"


class ErrorOutcome(BaseModel):
    kind: Literal["error"] = "error"
    code: str


Outcome = Annotated[ProductsOutcome | OrderOutcome | ErrorOutcome, Field(discriminator="kind")]


class TraceStep(BaseModel):
    tool: str
    arguments: dict[str, Any]
    outcome: Outcome
    duration_ms: int


class Trace(BaseModel):
    model_calls: int
    duration_ms: int
    steps: list[TraceStep]


class ChatResponse(BaseModel):
    reply: str
    cards: list[Card]
    trace: Trace
