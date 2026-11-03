"""Answer cards built from a turn's tool results, never from model text."""

from emporio_agent.agent import ToolCallRecord
from emporio_agent.api_models import OrderCard, ProductCard
from emporio_agent.config import SEARCH_RESULT_LIMIT

MAX_PRODUCT_CARDS = SEARCH_RESULT_LIMIT


def _succeeded(record: ToolCallRecord, tool: str) -> bool:
    return record.name == tool and "error" not in record.result


def _product_cards(records: list[ToolCallRecord]) -> list[ProductCard]:
    """Every product the turn's searches returned, once each, in first-seen order, capped."""
    cards: dict[int, ProductCard] = {}
    for record in records:
        if not _succeeded(record, "search_products"):
            continue
        for product in record.result["products"]:
            card = ProductCard.model_validate(product)
            cards.setdefault(card.product_id, card)
    return list(cards.values())[:MAX_PRODUCT_CARDS]


def _order_cards(records: list[ToolCallRecord]) -> list[OrderCard]:
    return [
        OrderCard.model_validate(record.result)
        for record in records
        if _succeeded(record, "get_order_status")
    ]


def build_cards(records: list[ToolCallRecord]) -> list[ProductCard | OrderCard]:
    """Product cards first, then order cards. Values are copied from the tool results as is."""
    return [*_product_cards(records), *_order_cards(records)]
