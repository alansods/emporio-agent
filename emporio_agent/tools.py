"""Tool declarations sent to Gemini and the dispatcher that runs the model's calls."""

import inspect
from collections.abc import Callable
from typing import Any

from google.genai import types

from emporio_agent.catalog import search_products
from emporio_agent.data import load_store
from emporio_agent.orders import get_order_status

TOOL_FUNCTIONS: dict[str, Callable[..., dict[str, Any]]] = {
    "search_products": search_products,
    "get_order_status": get_order_status,
}


def _search_products_declaration(category_names: list[str]) -> types.FunctionDeclaration:
    return types.FunctionDeclaration(
        name="search_products",
        description=(
            "Search the store catalog. Returns live price, active promotion, PIX price, maximum "
            "interest-free installments, stock and availability. All filters are optional and "
            "combine with AND. Price filters use the effective (promotional) price."
        ),
        parameters_json_schema={
            "type": "object",
            "properties": {
                "name": {
                    "type": "string",
                    "description": "Words of the product name or model; every word must match.",
                },
                "category": {"type": "string", "enum": category_names},
                "min_price": {"type": "number", "description": "Minimum price in BRL."},
                "max_price": {"type": "number", "description": "Maximum price in BRL."},
                "only_available": {
                    "type": "boolean",
                    "description": "Only products that can be bought now.",
                },
            },
        },
    )


GET_ORDER_STATUS_DECLARATION = types.FunctionDeclaration(
    name="get_order_status",
    description=(
        "Look up an order. Returns data only when name_or_email matches the order owner's full "
        "name or email. Delivered orders include return and warranty deadlines with an open flag."
    ),
    parameters_json_schema={
        "type": "object",
        "properties": {
            "order_id": {"type": "integer", "description": "Order number."},
            "name_or_email": {
                "type": "string",
                "description": "The customer's full name or email, as given by the customer.",
            },
        },
        "required": ["order_id", "name_or_email"],
    },
)


def build_tools() -> list[types.Tool]:
    """Built on demand: the category enum comes from the data, which is loaded lazily."""
    category_names = [category.name for category in load_store().categories.values()]
    declarations = [_search_products_declaration(category_names), GET_ORDER_STATUS_DECLARATION]
    return [types.Tool(function_declarations=declarations)]


def _error(code: str, message: str) -> dict[str, Any]:
    return {"error": code, "message": message}


def run_tool(name: str, args: dict[str, Any]) -> dict[str, Any]:
    """Runs one model call. Bad calls become error results for the model, never exceptions."""
    function = TOOL_FUNCTIONS.get(name)
    if function is None:
        available = ", ".join(TOOL_FUNCTIONS)
        return _error("unknown_tool", f"Unknown tool. Available tools: {available}.")
    try:
        inspect.signature(function).bind(**args)
    except TypeError as exc:
        return _error("invalid_arguments", str(exc))
    return function(**args)
