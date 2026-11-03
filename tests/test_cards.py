from typing import Any

from emporio_agent.agent import ToolCallRecord
from emporio_agent.cards import MAX_PRODUCT_CARDS, build_cards
from emporio_agent.catalog import search_products
from emporio_agent.orders import NOT_VERIFIED, get_order_status


def record(name: str, arguments: dict[str, Any], result: dict[str, Any]) -> ToolCallRecord:
    return ToolCallRecord(name=name, arguments=arguments, result=result, duration_ms=0)


def search(**arguments: Any) -> ToolCallRecord:
    return record("search_products", arguments, search_products(**arguments))


def product_ids(cards: list[Any]) -> list[int]:
    return [card.product_id for card in cards if card.type == "product"]


def test_no_tools_used():
    assert build_cards([]) == []


def test_values_match_the_tool_result():
    (card,) = build_cards([search(name="Takamine GD20")])

    assert card.type == "product"
    assert card.name == "Takamine GD20 Dreadnought Natural"
    assert card.list_price == 2199
    assert card.effective_price == 2199
    assert card.pix_price == 2089.05
    assert card.installments.count == 12
    assert card.installments.amount == 183.25
    assert card.promotion is None


def test_tool_error_gives_no_card():
    result = search_products(category="Pedais")

    assert result["error"] == "invalid_category"
    assert build_cards([record("search_products", {"category": "Pedais"}, result)]) == []


def test_two_searches_return_the_same_product():
    cards = build_cards([search(name="Yamaha C40"), search(name="C40")])

    assert product_ids(cards) == [81]


def test_cap_keeps_the_first_products_in_order():
    violoes = search(category="Violões")
    yamaha = search(name="Yamaha")
    expected = list(
        dict.fromkeys(
            [p["product_id"] for p in violoes.result["products"]]
            + [p["product_id"] for p in yamaha.result["products"]]
        )
    )

    cards = build_cards([violoes, yamaha])

    assert len(expected) > MAX_PRODUCT_CARDS
    assert product_ids(cards) == expected[:MAX_PRODUCT_CARDS]


def test_promotion_without_pix():
    (card,) = build_cards([search(name="Ohana CK-20")])

    assert card.promotion.name == "Desconto Exclusivo"
    assert card.promotion.discount_percent == 20
    assert card.list_price == 549
    assert card.effective_price == 439.2
    assert card.pix_price is None


def test_verified_order():
    result = get_order_status(1, "Pedro Henrique Oliveira")

    (card,) = build_cards([record("get_order_status", {"order_id": 1}, result)])

    assert card.type == "order"
    assert card.order_id == 1
    assert card.status == "delivered"
    assert card.payment_method == "pix"
    assert card.total == 11499
    assert card.tracking_code == "BRAB1234567BR"
    assert [item.quantity for item in card.items] == [1]
    assert [window.kind for window in card.return_windows] == [
        "regret",
        "preference_exchange",
        "defect_exchange",
        "legal_warranty",
    ]
    assert "customer_name" not in card.model_dump()
    assert "notes" not in card.model_dump()


def test_wrong_identity_gives_no_card():
    result = get_order_status(1, "Maria")

    assert result == NOT_VERIFIED
    assert build_cards([record("get_order_status", {"order_id": 1}, result)]) == []


def test_product_cards_come_before_order_cards():
    order = record("get_order_status", {}, get_order_status(1, "Pedro Henrique Oliveira"))

    cards = build_cards([order, search(name="Takamine GD20")])

    assert [card.type for card in cards] == ["product", "order"]
