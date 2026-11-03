import json
from pathlib import Path

from emporio_agent.api_models import ChatResponse

FIXTURES = Path(__file__).parent / "fixtures"


def test_chat_response_fixture_matches_the_pydantic_model():
    payload = json.loads((FIXTURES / "chat_response.json").read_text(encoding="utf-8"))

    assert ChatResponse.model_validate(payload).model_dump() == payload
