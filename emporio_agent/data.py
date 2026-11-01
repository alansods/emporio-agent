"""Typed, read-only view of the store CSVs, loaded once per process on first use."""

import csv
import json
from collections.abc import Iterator
from dataclasses import dataclass, field
from datetime import date
from decimal import Decimal
from functools import cache
from pathlib import Path
from typing import Any

from emporio_agent.config import DATA_DIR


@dataclass(frozen=True)
class Category:
    category_id: int
    name: str
    description: str


@dataclass(frozen=True)
class Product:
    product_id: int
    name: str
    category_id: int
    description: str
    price: Decimal
    stock: int
    status: str
    specs: dict[str, Any] = field(hash=False)
    created_at: date


@dataclass(frozen=True)
class Promotion:
    promotion_id: int
    product_id: int
    discount_percent: Decimal
    description: str
    is_active: bool


@dataclass(frozen=True)
class Customer:
    customer_id: int
    name: str
    phone: str
    email: str
    city: str


@dataclass(frozen=True)
class Order:
    order_id: int
    customer_id: int
    order_date: date
    status: str
    total: Decimal
    payment_method: str
    tracking_code: str | None
    estimated_delivery: date | None
    notes: str | None


@dataclass(frozen=True)
class OrderItem:
    order_id: int
    product_id: int
    quantity: int


@dataclass(frozen=True)
class Store:
    categories: dict[int, Category]
    products: dict[int, Product]
    promotions: tuple[Promotion, ...]
    customers: dict[int, Customer]
    orders: dict[int, Order]
    order_items: tuple[OrderItem, ...]

    def promotions_for(self, product_id: int) -> tuple[Promotion, ...]:
        return tuple(promo for promo in self.promotions if promo.product_id == product_id)

    def items_for(self, order_id: int) -> tuple[OrderItem, ...]:
        return tuple(item for item in self.order_items if item.order_id == order_id)


def _rows(path: Path) -> Iterator[dict[str, str]]:
    with path.open(encoding="utf-8", newline="") as file:
        yield from csv.DictReader(file)


def _optional(value: str) -> str | None:
    return value or None


def _optional_date(value: str) -> date | None:
    return date.fromisoformat(value) if value else None


def _category(row: dict[str, str]) -> Category:
    return Category(int(row["category_id"]), row["name"], row["description"])


def _product(row: dict[str, str]) -> Product:
    return Product(
        product_id=int(row["product_id"]),
        name=row["name"],
        category_id=int(row["category_id"]),
        description=row["description"],
        price=Decimal(row["price_brl"]),
        stock=int(row["stock_quantity"]),
        status=row["status"],
        specs=json.loads(row["specs"]),
        created_at=date.fromisoformat(row["created_at"]),
    )


def _promotion(row: dict[str, str]) -> Promotion:
    return Promotion(
        promotion_id=int(row["promotion_id"]),
        product_id=int(row["product_id"]),
        discount_percent=Decimal(row["discount_percent"]),
        description=row["description"],
        is_active=row["is_active"] == "1",
    )


def _customer(row: dict[str, str]) -> Customer:
    return Customer(int(row["customer_id"]), row["name"], row["phone"], row["email"], row["city"])


def _order(row: dict[str, str]) -> Order:
    return Order(
        order_id=int(row["order_id"]),
        customer_id=int(row["customer_id"]),
        order_date=date.fromisoformat(row["order_date"]),
        status=row["status"],
        total=Decimal(row["total_brl"]),
        payment_method=row["payment_method"],
        tracking_code=_optional(row["tracking_code"]),
        estimated_delivery=_optional_date(row["estimated_delivery"]),
        notes=_optional(row["notes"]),
    )


def _order_item(row: dict[str, str]) -> OrderItem:
    return OrderItem(int(row["order_id"]), int(row["product_id"]), int(row["quantity"]))


@cache
def load_store(data_dir: Path = DATA_DIR) -> Store:
    categories = (_category(row) for row in _rows(data_dir / "categories.csv"))
    products = (_product(row) for row in _rows(data_dir / "products.csv"))
    customers = (_customer(row) for row in _rows(data_dir / "customers.csv"))
    orders = (_order(row) for row in _rows(data_dir / "orders.csv"))
    return Store(
        categories={category.category_id: category for category in categories},
        products={product.product_id: product for product in products},
        promotions=tuple(_promotion(row) for row in _rows(data_dir / "promotions.csv")),
        customers={customer.customer_id: customer for customer in customers},
        orders={order.order_id: order for order in orders},
        order_items=tuple(_order_item(row) for row in _rows(data_dir / "order_items.csv")),
    )
