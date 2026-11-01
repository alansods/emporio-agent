import pytest
from google.genai import types

from emporio_agent.agent import AgentError, ChatMessage, GeminiModel, run_turn
from emporio_agent.prompt import load_policies
from tests.fakes import (
    FakeGeminiClient,
    ScriptedModel,
    call_response,
    gemini_response,
    text_response,
)

QUESTION = [ChatMessage(role="user", text="Quanto custa o Takamine GD20?")]
GD20_SEARCH = ("search_products", {"name": "Takamine GD20"})


def function_responses(content: types.Content) -> list[types.FunctionResponse]:
    return [part.function_response for part in content.parts if part.function_response]


def test_prior_messages_reach_the_model_in_order():
    model = ScriptedModel([text_response("R$ 2.199,00")])
    history = [
        ChatMessage(role="user", text="Oi"),
        ChatMessage(role="agent", text="Olá!"),
        ChatMessage(role="user", text="Quanto custa o Takamine GD20?"),
    ]

    run_turn(history, "pt-BR", model=model)

    contents = model.requests[0].contents
    assert [(content.role, content.parts[0].text) for content in contents] == [
        ("user", "Oi"),
        ("model", "Olá!"),
        ("user", "Quanto custa o Takamine GD20?"),
    ]


def test_turns_are_independent():
    model = ScriptedModel([text_response("Olá!"), text_response("Tudo certo.")])

    run_turn([ChatMessage(role="user", text="Oi")], "pt-BR", model=model)
    run_turn([ChatMessage(role="user", text="Tudo bem?")], "pt-BR", model=model)

    second_contents = model.requests[1].contents
    assert [content.parts[0].text for content in second_contents] == ["Tudo bem?"]


def test_every_request_carries_the_system_prompt_and_tools():
    model = ScriptedModel([call_response(GD20_SEARCH), text_response("R$ 2.199,00")])

    run_turn(QUESTION, "pt-BR", model=model)

    for request in model.requests:
        assert load_policies() in request.system
        (tool,) = request.tools
        assert {declaration.name for declaration in tool.function_declarations} == {
            "search_products",
            "get_order_status",
        }


def test_one_tool_round_feeds_the_result_back():
    first_response = call_response(GD20_SEARCH)
    model = ScriptedModel([first_response, text_response("Sai por R$ 2.199,00.")])

    result = run_turn(QUESTION, "pt-BR", model=model)

    second_contents = model.requests[1].contents
    assert second_contents[1] is first_response
    (response,) = function_responses(second_contents[2])
    assert second_contents[2].role == "user"
    assert response.name == "search_products"
    assert response.id == "call-0"
    assert response.response["total_found"] == 1
    assert result.reply == "Sai por R$ 2.199,00."


def test_several_calls_in_one_response_all_run():
    order_lookup = ("get_order_status", {"order_id": 8, "name_or_email": "Ana Carolina Ferreira"})
    model = ScriptedModel([call_response(GD20_SEARCH, order_lookup), text_response("Pronto.")])

    result = run_turn(QUESTION, "pt-BR", model=model)

    responses = function_responses(model.requests[1].contents[-1])
    assert [response.name for response in responses] == ["search_products", "get_order_status"]
    assert responses[1].response["status"] == "shipped"
    assert [record.name for record in result.tool_calls] == ["search_products", "get_order_status"]


def test_tool_call_record_matches_the_call():
    model = ScriptedModel([call_response(GD20_SEARCH), text_response("R$ 2.199,00")])

    result = run_turn(QUESTION, "pt-BR", model=model)

    (record,) = result.tool_calls
    assert record.name == "search_products"
    assert record.arguments == {"name": "Takamine GD20"}
    assert record.result["products"][0]["name"] == "Takamine GD20 Dreadnought Natural"


def test_no_tools_used():
    model = ScriptedModel([text_response("Olá! Como posso ajudar?")])

    result = run_turn([ChatMessage(role="user", text="Oi")], "pt-BR", model=model)

    assert result.reply == "Olá! Como posso ajudar?"
    assert result.tool_calls == []


@pytest.mark.parametrize(
    ("call", "error_code"),
    [
        (("search_products", {"brand": "Takamine"}), "invalid_arguments"),
        (("delete_order", {"order_id": 8}), "unknown_tool"),
    ],
)
def test_tool_errors_go_back_to_the_model(call, error_code):
    model = ScriptedModel([call_response(call), text_response("Não consegui consultar.")])

    result = run_turn(QUESTION, "pt-BR", model=model)

    (response,) = function_responses(model.requests[1].contents[-1])
    assert response.response["error"] == error_code
    assert result.tool_calls[0].result["error"] == error_code
    assert result.reply == "Não consegui consultar."


@pytest.mark.parametrize(
    ("locale", "expected_words"), [("en", "Please call"), ("pt-BR", "ligue para")]
)
def test_round_limit_ends_with_localized_fallback(locale, expected_words):
    model = ScriptedModel([call_response(GD20_SEARCH)] * 7)

    result = run_turn(QUESTION, locale, model=model)

    assert len(model.requests) == 6
    assert len(result.tool_calls) == 5
    assert "(67) 3341-4444" in result.reply
    assert expected_words in result.reply


def test_empty_reply_is_an_agent_error():
    model = ScriptedModel([types.Content(role="model", parts=[types.Part.from_text(text="")])])

    with pytest.raises(AgentError):
        run_turn(QUESTION, "pt-BR", model=model)


def test_provider_error_hides_prompt_and_key(monkeypatch):
    api_key = "test-key-not-real"
    monkeypatch.setenv("GEMINI_API_KEY", api_key)
    client = FakeGeminiClient(error=RuntimeError(f"rejected {api_key}: {load_policies()}"))

    with pytest.raises(AgentError) as raised:
        run_turn(QUESTION, "pt-BR", model=GeminiModel(client=client))

    message = str(raised.value)
    assert api_key not in message
    assert load_policies()[:200] not in message


def test_response_without_candidates_is_an_agent_error():
    client = FakeGeminiClient(response=types.GenerateContentResponse(candidates=[]))

    with pytest.raises(AgentError):
        run_turn(QUESTION, "pt-BR", model=GeminiModel(client=client))


def test_missing_api_key_is_an_agent_error(monkeypatch):
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    monkeypatch.delenv("GOOGLE_API_KEY", raising=False)

    with pytest.raises(AgentError):
        run_turn(QUESTION, "pt-BR")


def test_gemini_request_uses_default_model_and_manual_function_calling(monkeypatch):
    monkeypatch.delenv("MODEL", raising=False)
    client = FakeGeminiClient(response=gemini_response(text_response("Olá!")))

    run_turn(QUESTION, "pt-BR", model=GeminiModel(client=client))

    (call,) = client.calls
    assert call["model"] == "gemini-3.8-flash"
    assert call["config"].automatic_function_calling.disable is True
    assert load_policies() in call["config"].system_instruction


def test_gemini_request_uses_overridden_model(monkeypatch):
    monkeypatch.setenv("MODEL", "gemini-3.8-pro")
    client = FakeGeminiClient(response=gemini_response(text_response("Olá!")))

    run_turn(QUESTION, "pt-BR", model=GeminiModel(client=client))

    assert client.calls[0]["model"] == "gemini-3.8-pro"
