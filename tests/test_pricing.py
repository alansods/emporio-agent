from decimal import Decimal

import pytest

from emporio_agent.data import Promotion, load_store
from emporio_agent.pricing import active_promotion, max_installments, price_product

TAKAMINE_GD20 = 95
TAYLOR_110E = 94
KALANI_KAL_700T = 127
CRAFTER_CE_15 = 102


def price_of(product_id: int):
    store = load_store()
    return price_product(store.products[product_id], store.promotions_for(product_id))


def promotion(percent: str, *, is_active: bool = True) -> Promotion:
    return Promotion(1, 1, Decimal(percent), f"{percent}% off", is_active)


def test_inactive_promotion_is_ignored():
    pricing = price_of(CRAFTER_CE_15)

    assert pricing.promotion is None
    assert pricing.effective_price == Decimal("3899.00")


def test_active_promotion_is_applied():
    pricing = price_of(TAYLOR_110E)

    assert pricing.list_price == Decimal("5999.00")
    assert pricing.promotion is not None
    assert pricing.promotion.description == "Desconto Exclusivo"
    assert pricing.promotion.discount_percent == Decimal("8")
    assert pricing.effective_price == Decimal("5519.08")


def test_highest_active_promotion_wins():
    promotions = (promotion("10"), promotion("30", is_active=False), promotion("20"))

    chosen = active_promotion(promotions)

    assert chosen is not None
    assert chosen.discount_percent == Decimal("20")


def test_promotional_price_is_rounded_to_cents():
    assert price_of(KALANI_KAL_700T).effective_price == Decimal("323.10")


def test_pix_price_without_promotion():
    pricing = price_of(TAKAMINE_GD20)

    assert pricing.pix_price == Decimal("2089.05")
    assert pricing.pix_discount_applies is True


def test_no_pix_discount_on_promotional_price():
    pricing = price_of(TAYLOR_110E)

    assert pricing.pix_price is None
    assert pricing.pix_discount_applies is False


@pytest.mark.parametrize(
    ("price", "count", "amount"),
    [
        ("2199.00", 12, "183.25"),
        ("429.90", 5, "85.98"),
        ("323.10", 4, "80.78"),
        ("150.00", 3, "50.00"),
        ("90.00", 1, "90.00"),
    ],
)
def test_max_installments(price: str, count: int, amount: str):
    installments = max_installments(Decimal(price))

    assert installments.count == count
    assert installments.amount == Decimal(amount)
