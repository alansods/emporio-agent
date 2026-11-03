"""Turn trace: which tools ran, with what arguments, how they ended and how long they took."""

from emporio_agent.agent import ToolCallRecord
from emporio_agent.api_models import (
    ErrorOutcome,
    OrderOutcome,
    Outcome,
    ProductsOutcome,
    Trace,
    TraceStep,
)


def _outcome(record: ToolCallRecord) -> Outcome:
    """A summary only: the tool result itself is never echoed in the trace."""
    if "error" in record.result:
        return ErrorOutcome(code=str(record.result["error"]))
    if record.name == "search_products":
        return ProductsOutcome(count=record.result["total_found"])
    return OrderOutcome()


def build_trace(records: list[ToolCallRecord], model_calls: int, duration_ms: int) -> Trace:
    steps = [
        TraceStep(
            tool=record.name,
            arguments=record.arguments,
            outcome=_outcome(record),
            duration_ms=record.duration_ms,
        )
        for record in records
    ]
    return Trace(model_calls=model_calls, duration_ms=duration_ms, steps=steps)
