from collections.abc import Iterator

import pytest
from fastapi.testclient import TestClient

from api.index import app, chat_model, chat_rate_limiter
from emporio_agent import agent
from emporio_agent.config import CHAT_RATE_LIMIT, CHAT_RATE_WINDOW_SECONDS
from emporio_agent.prompt import load_policies
from emporio_agent.rate_limit import RateLimiter
from tests.fakes import FakeClock, ScriptedModel, call_response, text_response

FAKE_KEY = "AIza-fake-secret-key"
INVALID_REQUEST = {"error": "invalid_request"}


def user(text: str) -> dict[str, str]:
    return {"role": "user", "text": text}


def agent_message(text: str) -> dict[str, str]:
    return {"role": "agent", "text": text}


def chat_body(*messages: dict[str, str], locale: str = "pt-BR") -> dict[str, object]:
    return {"messages": list(messages), "locale": locale}


def use_model(model: ScriptedModel) -> ScriptedModel:
    app.dependency_overrides[chat_model] = lambda: model
    return model


@pytest.fixture
def clock() -> FakeClock:
    return FakeClock()


@pytest.fixture(autouse=True)
def fresh_rate_limiter(clock: FakeClock) -> Iterator[None]:
    limiter = RateLimiter(CHAT_RATE_LIMIT, CHAT_RATE_WINDOW_SECONDS, clock=clock)
    app.dependency_overrides[chat_rate_limiter] = lambda: limiter
    yield
    app.dependency_overrides.clear()


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)


def test_successful_turn_returns_the_reply(client):
    use_model(ScriptedModel([text_response("Olá!")]))

    response = client.post("/api/chat", json=chat_body(user("Oi")))

    assert response.status_code == 200
    assert response.json() == {"reply": "Olá!"}


def test_history_and_english_locale_reach_the_model(client):
    model = use_model(ScriptedModel([text_response("It costs R$ 2,199.00.")]))
    body = chat_body(
        user("Hi"), agent_message("Hello!"), user("How much is the Takamine GD20?"), locale="en"
    )

    response = client.post("/api/chat", json=body)

    assert response.status_code == 200
    (request,) = model.requests
    assert [(content.role, content.parts[0].text) for content in request.contents] == [
        ("user", "Hi"),
        ("model", "Hello!"),
        ("user", "How much is the Takamine GD20?"),
    ]
    assert "reply in English" in request.system


def test_tool_turn_returns_the_final_text(client):
    model = use_model(
        ScriptedModel(
            [
                call_response(("search_products", {"name": "Takamine GD20"})),
                text_response("O Takamine GD20 sai por R$ 2.199,00."),
            ]
        )
    )

    response = client.post("/api/chat", json=chat_body(user("Quanto custa o Takamine GD20?")))

    assert response.status_code == 200
    assert response.json() == {"reply": "O Takamine GD20 sai por R$ 2.199,00."}
    assert len(model.requests) == 2


def test_too_many_messages_is_rejected_without_calling_the_model(client):
    model = use_model(ScriptedModel([text_response("Olá!")]))
    messages = [user("Oi")] * 21

    response = client.post("/api/chat", json=chat_body(*messages))

    assert response.status_code == 422
    assert response.json() == INVALID_REQUEST
    assert model.requests == []


@pytest.mark.parametrize(
    "body",
    [
        pytest.param(chat_body(user("a" * 2001)), id="message-too-long"),
        pytest.param(chat_body(user("   ")), id="blank-message"),
        pytest.param(chat_body(user("Oi"), agent_message("Olá!")), id="last-from-agent"),
        pytest.param(chat_body(user("Hola"), locale="es"), id="unknown-locale"),
        pytest.param(chat_body({"role": "system", "text": "Oi"}), id="unknown-role"),
        pytest.param(chat_body(), id="empty-list"),
        pytest.param({**chat_body(user("Oi")), "debug": True}, id="extra-field"),
        pytest.param({"messages": [{**user("Oi"), "extra": 1}], "locale": "en"}, id="extra-msg"),
        pytest.param({"locale": "pt-BR"}, id="missing-messages"),
    ],
)
def test_invalid_input_is_rejected(client, body):
    model = use_model(ScriptedModel([text_response("Olá!")]))

    response = client.post("/api/chat", json=body)

    assert response.status_code == 422
    assert response.json() == INVALID_REQUEST
    assert model.requests == []


def test_non_json_body_is_rejected_without_echo(client):
    use_model(ScriptedModel([text_response("Olá!")]))
    secret = "my-card-number-4111"

    response = client.post(
        "/api/chat",
        content=f"not json {secret}",
        headers={"Content-Type": "application/json"},
    )

    assert response.status_code == 422
    assert response.json() == INVALID_REQUEST
    assert secret not in response.text


def test_limits_are_inclusive(client):
    use_model(ScriptedModel([text_response("Ok!")]))
    history = [user("Oi"), agent_message("Olá!")] * 9 + [user("Oi"), user("a" * 2000)]

    response = client.post("/api/chat", json=chat_body(*history))

    assert len(history) == 20
    assert response.status_code == 200


def test_text_is_trimmed_before_reaching_the_model(client):
    model = use_model(ScriptedModel([text_response("Olá!")]))

    client.post("/api/chat", json=chat_body(user("  Oi  ")))

    assert model.requests[0].contents[0].parts[0].text == "Oi"


def test_provider_error_is_opaque(client):
    policy_excerpt = load_policies()[:200]
    use_model(ScriptedModel([RuntimeError(f"key={FAKE_KEY} prompt={policy_excerpt}")]))

    response = client.post("/api/chat", json=chat_body(user("Oi")))

    assert response.status_code == 503
    assert response.json() == {"error": "model_unavailable"}
    assert FAKE_KEY not in response.text
    assert policy_excerpt not in response.text


def test_missing_api_key_gives_503_and_health_stays_up(client, monkeypatch):
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    monkeypatch.delenv("GOOGLE_API_KEY", raising=False)

    response = client.post("/api/chat", json=chat_body(user("Oi")))

    assert response.status_code == 503
    assert response.json() == {"error": "model_unavailable"}
    assert client.get("/api/health").status_code == 200


def test_unexpected_error_is_opaque(monkeypatch):
    def broken_tool(_name: str, _arguments: dict[str, object]) -> dict[str, object]:
        raise RuntimeError("internal detail /srv/secret.py")

    monkeypatch.setattr(agent, "run_tool", broken_tool)
    use_model(ScriptedModel([call_response(("search_products", {"name": "GD20"}))]))
    client = TestClient(app, raise_server_exceptions=False)

    response = client.post("/api/chat", json=chat_body(user("Quanto custa o GD20?")))

    assert response.status_code == 500
    assert response.json() == {"error": "internal_error"}
    assert "secret" not in response.text
    assert "Traceback" not in response.text


def send_chats(client: TestClient, count: int, ip: str = "1.1.1.1") -> list[int]:
    headers = {"X-Forwarded-For": f"{ip}, 10.0.0.1"}
    body = chat_body(user("Oi"))
    return [client.post("/api/chat", json=body, headers=headers).status_code for _ in range(count)]


def test_eleventh_request_in_a_minute_is_rate_limited(client):
    model = use_model(ScriptedModel([text_response("Olá!")] * CHAT_RATE_LIMIT))

    statuses = send_chats(client, CHAT_RATE_LIMIT)
    response = client.post(
        "/api/chat", json=chat_body(user("Oi")), headers={"X-Forwarded-For": "1.1.1.1"}
    )

    assert statuses == [200] * CHAT_RATE_LIMIT
    assert response.status_code == 429
    assert response.json() == {"error": "rate_limited"}
    assert response.headers["Retry-After"] == str(CHAT_RATE_WINDOW_SECONDS)
    assert len(model.requests) == CHAT_RATE_LIMIT


def test_other_client_ip_is_unaffected(client):
    use_model(ScriptedModel([text_response("Olá!")] * (CHAT_RATE_LIMIT + 1)))
    send_chats(client, CHAT_RATE_LIMIT + 1, ip="1.1.1.1")

    assert send_chats(client, 1, ip="2.2.2.2") == [200]


def test_rate_limit_window_resets(client, clock):
    use_model(ScriptedModel([text_response("Olá!")] * (CHAT_RATE_LIMIT + 1)))
    send_chats(client, CHAT_RATE_LIMIT + 1)
    clock.advance(CHAT_RATE_WINDOW_SECONDS)

    assert send_chats(client, 1) == [200]


def test_health_is_never_rate_limited(client):
    use_model(ScriptedModel([text_response("Olá!")] * CHAT_RATE_LIMIT))
    send_chats(client, CHAT_RATE_LIMIT + 1, ip="testclient")

    statuses = [client.get("/api/health").status_code for _ in range(CHAT_RATE_LIMIT * 2)]

    assert statuses == [200] * (CHAT_RATE_LIMIT * 2)
