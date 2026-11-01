"""The search_products tool: catalog query with live price, stock and availability."""

from dataclasses import dataclass
from decimal import Decimal
from typing import Any

from emporio_agent.config import SEARCH_RESULT_LIMIT
from emporio_agent.data import Product, Promotion, Store, load_store
from emporio_agent.pricing import Pricing, price_product
from emporio_agent.text import normalize

ACTIVE_STATUS = "active"
STATUS_AVAILABILITY = {"discontinued": "discontinued", "coming_soon": "coming_soon"}
AVAILABLE = "available"
OUT_OF_STOCK = "out_of_stock"


@dataclass(frozen=True)
class PricedProduct:
    product: Product
    pricing: Pricing


def as_number(value: Decimal) -> int | float:
    """JSON number for the model: integers stay integers, money keeps its cents."""
    return int(value) if value == value.to_integral_value() else float(value)


def availability(product: Product) -> str:
    if product.status == ACTIVE_STATUS:
        return AVAILABLE if product.stock > 0 else OUT_OF_STOCK
    return STATUS_AVAILABILITY[product.status]


def _category_id(store: Store, category: str) -> int | None:
    wanted = normalize(category)
    return next(
        (c.category_id for c in store.categories.values() if normalize(c.name) == wanted), None
    )


def _matches_name(product: Product, words: list[str]) -> bool:
    product_name = normalize(product.name)
    return all(word in product_name for word in words)


def _in_price_range(price: Decimal, min_price: float | None, max_price: float | None) -> bool:
    above_min = min_price is None or price >= Decimal(str(min_price))
    below_max = max_price is None or price <= Decimal(str(max_price))
    return above_min and below_max


def _promotion_result(promotion: Promotion | None) -> dict[str, Any] | None:
    if promotion is None:
        return None
    return {
        "name": promotion.description,
        "discount_percent": as_number(promotion.discount_percent),
    }


def _to_result(store: Store, item: PricedProduct) -> dict[str, Any]:
    product, pricing = item.product, item.pricing
    return {
        "product_id": product.product_id,
        "name": product.name,
        "category": store.categories[product.category_id].name,
        "description": product.description,
        "specs": product.specs,
        "availability": availability(product),
        "stock": product.stock,
        "list_price": as_number(pricing.list_price),
        "promotion": _promotion_result(pricing.promotion),
        "effective_price": as_number(pricing.effective_price),
        "pix_price": None if pricing.pix_price is None else as_number(pricing.pix_price),
        "pix_discount_applies": pricing.pix_discount_applies,
        "installments": {
            "count": pricing.installments.count,
            "amount": as_number(pricing.installments.amount),
        },
    }


def search_products(
    name: str | None = None,
    category: str | None = None,
    min_price: float | None = None,
    max_price: float | None = None,
    only_available: bool = False,
) -> dict[str, Any]:
    """Filters combine with AND. Price filters and sorting use the effective (promotional) price."""
    store = load_store()
    products = list(store.products.values())

    if category:
        category_id = _category_id(store, category)
        if category_id is None:
            return {
                "error": "invalid_category",
                "message": "Unknown category.",
                "valid_categories": [c.name for c in store.categories.values()],
            }
        products = [p for p in products if p.category_id == category_id]
    if name:
        words = normalize(name).split()
        products = [p for p in products if _matches_name(p, words)]
    if only_available:
        products = [p for p in products if availability(p) == AVAILABLE]

    priced = [
        PricedProduct(p, price_product(p, store.promotions_for(p.product_id))) for p in products
    ]
    in_range = [
        item
        for item in priced
        if _in_price_range(item.pricing.effective_price, min_price, max_price)
    ]
    in_range.sort(key=lambda item: item.pricing.effective_price)
    return {
        "total_found": len(in_range),
        "products": [_to_result(store, item) for item in in_range[:SEARCH_RESULT_LIMIT]],
    }
