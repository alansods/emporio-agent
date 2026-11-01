import subprocess
import sys
from datetime import date
from decimal import Decimal

from emporio_agent.data import load_store


def test_loads_every_table():
    store = load_store()

    assert len(store.products) == 65
    assert len(store.categories) == 9
    assert len(store.promotions) == 25
    assert len(store.orders) == 20
    assert len(store.order_items) == 22
    assert len(store.customers) == 50


def test_fields_are_typed():
    store = load_store()
    product = store.products[94]
    order = store.orders[8]

    assert product.price == Decimal("5999")
    assert product.stock == 4
    assert product.specs["top"]
    assert order.order_date == date(2026, 2, 15)
    assert order.estimated_delivery == date(2026, 2, 28)
    assert order.total == Decimal("349.9")


def test_empty_optional_fields_are_none():
    order = load_store().orders[9]

    assert order.tracking_code is None
    assert order.estimated_delivery is None
    assert order.notes is None


def test_promotions_and_items_are_indexed():
    store = load_store()

    assert [promo.discount_percent for promo in store.promotions_for(94)] == [Decimal("8")]
    assert [item.product_id for item in store.items_for(15)] == [82, 106]
    assert store.promotions_for(81) == ()


def test_import_reads_no_file():
    code = "import emporio_agent.data as d; print(d.load_store.cache_info().currsize)"
    result = subprocess.run(
        [sys.executable, "-c", code], capture_output=True, text=True, check=True
    )

    assert result.stdout.strip() == "0"
