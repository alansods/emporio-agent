"""The get_order_status tool: identity-checked order data and return deadlines."""

from datetime import date, timedelta
from typing import Any

from emporio_agent.config import reference_date
from emporio_agent.data import Customer, Order, Store, load_store
from emporio_agent.pricing import as_number
from emporio_agent.text import normalize

DELIVERED_STATUS = "delivered"

# (kind, base date, days), from manual sections 4.1, 4.2, 4.3 and 8.1. The data has no receipt date,
# so "delivery" is the estimated delivery date.
RETURN_WINDOWS: tuple[tuple[str, str, int], ...] = (
    ("regret", "delivery", 7),
    ("preference_exchange", "delivery", 7),
    ("defect_exchange", "purchase", 30),
    ("legal_warranty", "delivery", 90),
)

# One error for "no such order" and "identity does not match", so order ids cannot be probed.
NOT_VERIFIED = {
    "error": "order_not_verified",
    "message": "No order matches this number together with this full name or email.",
}


def _is_owner(customer: Customer, name_or_email: str) -> bool:
    given = normalize(name_or_email)
    return given in (normalize(customer.name), normalize(customer.email))


def return_windows(order: Order, today: date) -> list[dict[str, Any]]:
    if order.status != DELIVERED_STATUS or order.estimated_delivery is None:
        return []
    base_dates = {"delivery": order.estimated_delivery, "purchase": order.order_date}
    windows = []
    for kind, base, days in RETURN_WINDOWS:
        deadline = base_dates[base] + timedelta(days=days)
        windows.append({"kind": kind, "deadline": deadline.isoformat(), "open": today <= deadline})
    return windows


def _items(store: Store, order: Order) -> list[dict[str, Any]]:
    return [
        {"product_name": store.products[item.product_id].name, "quantity": item.quantity}
        for item in store.items_for(order.order_id)
    ]


def get_order_status(order_id: int, name_or_email: str) -> dict[str, Any]:
    store = load_store()
    order = store.orders.get(order_id)
    if order is None or not _is_owner(store.customers[order.customer_id], name_or_email):
        return dict(NOT_VERIFIED)
    today = reference_date()
    estimated_delivery = order.estimated_delivery
    return {
        "order_id": order.order_id,
        "customer_name": store.customers[order.customer_id].name,
        "order_date": order.order_date.isoformat(),
        "status": order.status,
        "total": as_number(order.total),
        "payment_method": order.payment_method,
        "items": _items(store, order),
        "tracking_code": order.tracking_code,
        "estimated_delivery": estimated_delivery.isoformat() if estimated_delivery else None,
        "notes": order.notes,
        "reference_date": today.isoformat(),
        "return_windows": return_windows(order, today),
    }
