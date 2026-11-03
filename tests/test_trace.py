from emporio_agent.agent import ChatMessage, ToolCallRecord, run_turn
from emporio_agent.catalog import search_products
from emporio_agent.orders import get_order_status
from emporio_agent.trace import build_trace
from tests.fakes import ScriptedModel, call_response

ORDER_ARGUMENTS = {"order_id": 1, "name_or_email": "Maria"}


def test_turn_without_tools():
    trace = build_trace([], model_calls=1, duration_ms=12)

    assert trace.steps == []
    assert trace.model_calls == 1
    assert trace.duration_ms == 12


def test_search_step():
    result = search_products(name="GD20")
    records = [ToolCallRecord("search_products", {"name": "GD20"}, result, duration_ms=3)]

    trace = build_trace(records, model_calls=2, duration_ms=40)

    (step,) = trace.steps
    assert step.tool == "search_products"
    assert step.arguments == {"name": "GD20"}
    assert step.outcome.model_dump() == {"kind": "products", "count": 1}
    assert step.duration_ms == 3
    assert trace.model_calls == 2


def test_verified_order_step():
    result = get_order_status(1, "Pedro Henrique Oliveira")
    records = [ToolCallRecord("get_order_status", {"order_id": 1}, result, duration_ms=1)]

    (step,) = build_trace(records, model_calls=2, duration_ms=5).steps

    assert step.outcome.model_dump() == {"kind": "order"}


def test_failed_identity_check():
    result = get_order_status(1, "Maria")
    records = [ToolCallRecord("get_order_status", ORDER_ARGUMENTS, result, duration_ms=1)]

    trace = build_trace(records, model_calls=2, duration_ms=5)

    (step,) = trace.steps
    assert step.outcome.model_dump() == {"kind": "error", "code": "order_not_verified"}
    assert "BRAB1234567BR" not in trace.model_dump_json()


def test_round_limit_reached_lists_every_call():
    model = ScriptedModel([call_response(("search_products", {"name": "GD20"}))] * 6)

    result = run_turn([ChatMessage("user", "GD20?")], "pt-BR", model=model)
    trace = build_trace(result.tool_calls, result.model_calls, duration_ms=0)

    assert len(trace.steps) == 5
    assert trace.model_calls == 6
