from emporio_agent.data import load_store
from emporio_agent.tools import build_tools, run_tool


def declarations() -> dict:
    (tool,) = build_tools()
    return {declaration.name: declaration for declaration in tool.function_declarations}


def test_declares_exactly_the_two_tools():
    assert set(declarations()) == {"search_products", "get_order_status"}


def test_category_enum_lists_catalog_categories():
    schema = declarations()["search_products"].parameters_json_schema
    category_names = {category.name for category in load_store().categories.values()}

    assert len(category_names) == 9
    assert set(schema["properties"]["category"]["enum"]) == category_names
    assert "required" not in schema


def test_order_lookup_requires_both_arguments():
    schema = declarations()["get_order_status"].parameters_json_schema

    assert set(schema["required"]) == {"order_id", "name_or_email"}


def test_runs_search_products():
    result = run_tool("search_products", {"name": "takamine gd20"})

    assert result["total_found"] == 1


def test_runs_get_order_status():
    result = run_tool("get_order_status", {"order_id": 8, "name_or_email": "Ana Carolina Ferreira"})

    assert result["status"] == "shipped"


def test_unknown_argument_is_an_error_result():
    result = run_tool("search_products", {"brand": "Takamine"})

    assert result["error"] == "invalid_arguments"


def test_missing_argument_is_an_error_result():
    result = run_tool("get_order_status", {"order_id": 8})

    assert result["error"] == "invalid_arguments"


def test_unknown_tool_is_an_error_result():
    result = run_tool("delete_order", {"order_id": 8})

    assert result["error"] == "unknown_tool"
