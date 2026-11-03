from collections.abc import Iterator
from typing import Any

import pytest

from api.index import app, chat_model
from emporio_agent.config import CHAT_RATE_LIMIT
from scripts.record_examples import (
    CASES,
    CONVERSATIONS,
    AtMost,
    Contains,
    Conversation,
    ExpectedCall,
    RecordedTurn,
    Turn,
    check_turn,
    main,
    make_client,
    render_example,
)
from tests.fakes import ScriptedModel, text_response


def step(tool: str, arguments: dict[str, Any], outcome: dict[str, Any]) -> dict[str, Any]:
    return {"tool": tool, "arguments": arguments, "outcome": outcome, "duration_ms": 3}


def trace(*steps: dict[str, Any]) -> dict[str, Any]:
    return {"model_calls": len(steps) + 1, "duration_ms": 900, "steps": list(steps)}


PRODUCTS = {"kind": "products", "count": 2}
ORDER = {"kind": "order"}


@pytest.fixture(autouse=True)
def clear_overrides() -> Iterator[None]:
    yield
    app.dependency_overrides.clear()


def test_matching_call_passes():
    expected = (
        ExpectedCall("search_products", {"category": "Violões", "max_price": AtMost(1000)}),
    )
    arguments = {"category": "Violões", "max_price": 1000, "only_available": True}

    assert check_turn(expected, trace(step("search_products", arguments, PRODUCTS))) == []


def test_name_argument_matches_by_words():
    expected = (ExpectedCall("search_products", {"name": Contains("GD20")}),)

    problems = check_turn(expected, trace(step("search_products", {"name": "takamine gd20"}, {})))

    assert problems == []


def test_wrong_argument_fails_and_names_it():
    expected = (ExpectedCall("get_order_status", {"order_id": 7}),)
    arguments = {"order_id": 6, "name_or_email": "Letícia Gonçalves Rocha"}

    problems = check_turn(expected, trace(step("get_order_status", arguments, ORDER)))

    assert len(problems) == 1
    assert "order_id" in problems[0]


def test_price_above_the_limit_fails():
    expected = (ExpectedCall("search_products", {"max_price": AtMost(1000)}),)

    problems = check_turn(expected, trace(step("search_products", {"max_price": 1500}, PRODUCTS)))

    assert any("max_price" in problem for problem in problems)


def test_unexpected_tool_fails_when_no_tool_is_expected():
    problems = check_turn((), trace(step("search_products", {"name": "cordas"}, PRODUCTS)))

    assert any("search_products" in problem for problem in problems)


def test_missing_call_fails():
    expected = (ExpectedCall("get_order_status", {"order_id": 7}),)

    assert check_turn(expected, trace()) != []


def test_expected_outcome_must_match():
    expected = (ExpectedCall("get_order_status", {"order_id": 6}, outcome="order_not_verified"),)
    arguments = {"order_id": 6, "name_or_email": "Maria Silva"}
    not_verified = {"kind": "error", "code": "order_not_verified"}

    assert check_turn(expected, trace(step("get_order_status", arguments, ORDER))) != []
    assert check_turn(expected, trace(step("get_order_status", arguments, not_verified))) == []


def test_missing_key_exits_non_zero_without_a_model_call(monkeypatch, tmp_path, capsys):
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    model = ScriptedModel([])
    app.dependency_overrides[chat_model] = lambda: model

    status = main(env_file=tmp_path / ".env", examples_dir=tmp_path)

    assert status != 0
    assert "GEMINI_API_KEY" in capsys.readouterr().out
    assert model.requests == []
    assert list(tmp_path.iterdir()) == []


def test_rate_limit_does_not_apply_to_the_run():
    turns = CHAT_RATE_LIMIT + 1
    model = ScriptedModel([text_response("Olá!") for _ in range(turns)])
    client = make_client()
    app.dependency_overrides[chat_model] = lambda: model
    body = {"messages": [{"role": "user", "text": "Oi"}], "locale": "pt-BR"}

    statuses = [client.post("/api/chat", json=body).status_code for _ in range(turns)]

    assert statuses == [200] * turns


def test_example_markdown_content():
    conversation = Conversation(
        slug="02-takamine-gd20-price",
        title="Takamine GD20 price",
        summary="Price, PIX price and installments come from the tool.",
        turns=(Turn("Quanto custa o Takamine GD20?"),),
    )
    recorded = [
        RecordedTurn(
            text="Quanto custa o Takamine GD20?",
            reply="O **Takamine GD20** sai por R$ 2.199,00.",
            steps=[step("search_products", {"name": "Takamine GD20"}, {**PRODUCTS, "count": 1})],
        ),
        RecordedTurn(text="Obrigado!", reply="Por nada!", steps=[]),
    ]

    markdown = render_example(conversation, recorded, model="gemini-test", recorded_on="2026-11-03")

    assert markdown.startswith("# Takamine GD20 price\n")
    assert "Price, PIX price and installments come from the tool." in markdown
    assert "gemini-test" in markdown
    assert "2026-03-23" in markdown
    assert "2026-11-03" in markdown
    assert "**Customer:** Quanto custa o Takamine GD20?" in markdown
    assert "O **Takamine GD20** sai por R$ 2.199,00." in markdown
    assert '`search_products` `{"name": "Takamine GD20"}`: 1 product' in markdown
    assert "no tool call" in markdown


def test_cases_and_conversations_cover_the_brief():
    assert len(CASES) == 8
    assert [conversation.slug for conversation in CONVERSATIONS] == [
        "01-acoustic-guitars",
        "02-takamine-gd20-price",
        "03-regret-return",
        "04-address-and-strings",
        "05-english",
    ]
