"""Real-model behavior check and example recorder. Run by hand; CI never calls it.

Usage: python scripts/record_examples.py

Sends fixed cases and the example conversations through the real /api/chat app in-process,
checks the tool calls of each turn from the response trace (never the wording) and writes each
passing conversation to examples/<slug>.md. Exit status: 0 all passed, 1 a failure, 2 no key.
"""

import json
import os
import sys
import time
import unicodedata
from dataclasses import dataclass, field
from datetime import date
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from dotenv import load_dotenv  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from api.index import app, chat_rate_limiter  # noqa: E402
from emporio_agent.config import CHAT_RATE_WINDOW_SECONDS, model_name, reference_date  # noqa: E402
from emporio_agent.prompt import Locale  # noqa: E402
from emporio_agent.rate_limit import RateLimiter  # noqa: E402

ENV_FILE = ROOT / ".env"
EXAMPLES_DIR = ROOT / "examples"
RUN_RATE_LIMIT = 1000
# Free tier allows 15 model requests per minute and a turn makes about two.
TURN_PAUSE_SECONDS = 8
EXIT_OK, EXIT_FAILED, EXIT_NO_KEY = 0, 1, 2


def normalize(text: str) -> str:
    decomposed = unicodedata.normalize("NFKD", text.casefold())
    return "".join(char for char in decomposed if not unicodedata.combining(char))


@dataclass(frozen=True)
class Contains:
    """Every word of `words` appears in the value, ignoring case and accents."""

    words: str

    def matches(self, value: Any) -> bool:
        actual = normalize(str(value))
        return all(word in actual for word in normalize(self.words).split())

    def __str__(self) -> str:
        return f"containing {self.words!r}"


@dataclass(frozen=True)
class AtMost:
    limit: float

    def matches(self, value: Any) -> bool:
        return isinstance(value, int | float) and value <= self.limit

    def __str__(self) -> str:
        return f"at most {self.limit:g}"


def _matches(expected: Any, value: Any) -> bool:
    if isinstance(expected, Contains | AtMost):
        return expected.matches(value)
    return value == expected


@dataclass(frozen=True)
class ExpectedCall:
    """A tool call and its key arguments. Arguments not listed are not checked."""

    tool: str
    args: dict[str, Any] = field(default_factory=dict)
    outcome: str | None = None


@dataclass(frozen=True)
class Turn:
    text: str
    expected: tuple[ExpectedCall, ...] = ()
    locale: Locale = "pt-BR"


@dataclass(frozen=True)
class Case:
    name: str
    turn: Turn


@dataclass(frozen=True)
class Conversation:
    slug: str
    title: str
    summary: str
    turns: tuple[Turn, ...]


@dataclass(frozen=True)
class RecordedTurn:
    text: str
    reply: str
    steps: list[dict[str, Any]]


def _outcome_matches(expected: str, outcome: dict[str, Any]) -> bool:
    return expected in (outcome.get("kind"), outcome.get("code"))


def _call_problems(expected: ExpectedCall, step: dict[str, Any]) -> list[str]:
    arguments = step.get("arguments", {})
    problems = [
        f"{expected.tool}: {key} is {arguments.get(key)!r}, expected {value}"
        for key, value in expected.args.items()
        if not _matches(value, arguments.get(key))
    ]
    outcome = step.get("outcome", {})
    if expected.outcome and not _outcome_matches(expected.outcome, outcome):
        problems.append(f"{expected.tool}: outcome is {outcome}, expected {expected.outcome}")
    return problems


def check_turn(expected: tuple[ExpectedCall, ...], trace: dict[str, Any]) -> list[str]:
    """Problems with the turn's tool calls; an empty list means the turn passed."""
    steps = trace.get("steps", [])
    expected_tools = {call.tool for call in expected}
    problems = [
        f"unexpected call {step['tool']}" for step in steps if step["tool"] not in expected_tools
    ]
    for call in expected:
        candidates = [_call_problems(call, step) for step in steps if step["tool"] == call.tool]
        if not candidates:
            problems.append(f"missing call {call.tool}")
        elif all(candidates):
            problems.extend(candidates[0])
    return problems


def _describe_outcome(outcome: dict[str, Any]) -> str:
    if outcome.get("kind") == "products":
        count = outcome.get("count", 0)
        return f"{count} product" + ("" if count == 1 else "s")
    if outcome.get("kind") == "error":
        return f"error {outcome.get('code')}"
    return "order found"


def _describe_step(step: dict[str, Any]) -> str:
    arguments = json.dumps(step["arguments"], ensure_ascii=False)
    return f"- `{step['tool']}` `{arguments}`: {_describe_outcome(step['outcome'])}"


def render_example(
    conversation: Conversation, turns: list[RecordedTurn], model: str, recorded_on: str
) -> str:
    lines = [
        f"# {conversation.title}",
        "",
        conversation.summary,
        "",
        f"- Model: `{model}`",
        f"- Reference date: {reference_date().isoformat()}",
        f"- Recorded: {recorded_on}",
    ]
    for turn in turns:
        tools = [_describe_step(step) for step in turn.steps] or ["- no tool call"]
        lines += ["", f"**Customer:** {turn.text}", "", "**Agent:**", "", turn.reply, ""]
        lines += ["Tools:", "", *tools]
    return "\n".join(lines) + "\n"


def make_client() -> TestClient:
    """The real app with a rate limit high enough for one run."""
    limiter = RateLimiter(RUN_RATE_LIMIT, CHAT_RATE_WINDOW_SECONDS)
    app.dependency_overrides[chat_rate_limiter] = lambda: limiter
    return TestClient(app)


def send_turn(
    client: TestClient, history: list[dict[str, str]], turn: Turn, pause_seconds: float
) -> tuple[RecordedTurn | None, list[str]]:
    messages = [*history, {"role": "user", "text": turn.text}]
    time.sleep(pause_seconds)
    response = client.post("/api/chat", json={"messages": messages, "locale": turn.locale})
    body = response.json()
    if response.status_code != 200:
        return None, [f"HTTP {response.status_code} {body.get('error')}"]
    recorded = RecordedTurn(turn.text, body["reply"], body["trace"]["steps"])
    return recorded, check_turn(turn.expected, body["trace"])


def report(label: str, recorded: RecordedTurn | None, problems: list[str]) -> bool:
    if not problems:
        print(f"PASS {label}")
        return True
    print(f"FAIL {label}: {'; '.join(problems)}")
    for step in recorded.steps if recorded else []:
        print(f"     {_describe_step(step)}")
    return False


def run_conversation(client: TestClient, conversation: Conversation) -> list[RecordedTurn] | None:
    """All turns in order, each with the history so far; None as soon as one fails."""
    history: list[dict[str, str]] = []
    recorded_turns: list[RecordedTurn] = []
    for index, turn in enumerate(conversation.turns, start=1):
        recorded, problems = send_turn(client, history, turn, TURN_PAUSE_SECONDS)
        if not report(f"{conversation.slug} turn {index}", recorded, problems) or not recorded:
            return None
        recorded_turns.append(recorded)
        history += [{"role": "user", "text": turn.text}, {"role": "agent", "text": recorded.reply}]
    return recorded_turns


def main(env_file: Path = ENV_FILE, examples_dir: Path = EXAMPLES_DIR) -> int:
    load_dotenv(env_file)
    if not os.getenv("GEMINI_API_KEY"):
        print("GEMINI_API_KEY is missing: set it in the environment or in .env.")
        return EXIT_NO_KEY
    client = make_client()
    passed = True
    for case in CASES:
        recorded, problems = send_turn(client, [], case.turn, TURN_PAUSE_SECONDS)
        passed = report(case.name, recorded, problems) and passed
    examples_dir.mkdir(exist_ok=True)
    for conversation in CONVERSATIONS:
        turns = run_conversation(client, conversation)
        if turns is None:
            passed = False
            continue
        markdown = render_example(conversation, turns, model_name(), date.today().isoformat())
        (examples_dir / f"{conversation.slug}.md").write_text(markdown, encoding="utf-8")
    return EXIT_OK if passed else EXIT_FAILED


ACOUSTIC_UP_TO_1000 = ExpectedCall(
    "search_products", {"category": "Violões", "max_price": AtMost(1000)}
)
NO_TOOL: tuple[ExpectedCall, ...] = ()

CASES = (
    Case(
        "price-pt",
        Turn(
            "Quanto custa o Takamine GD20?",
            (ExpectedCall("search_products", {"name": Contains("GD20")}),),
        ),
    ),
    Case(
        "price-en",
        Turn(
            "How much is the Yamaha C40?",
            (ExpectedCall("search_products", {"name": Contains("C40")}),),
            locale="en",
        ),
    ),
    Case(
        "acoustic-up-to-1000",
        Turn("Quais violões até R$ 1000 vocês têm disponíveis?", (ACOUSTIC_UP_TO_1000,)),
    ),
    Case(
        "cheapest-electric-guitar",
        Turn(
            "Qual a guitarra mais barata?",
            (ExpectedCall("search_products", {"category": "Guitarras", "pick": "cheapest"}),),
        ),
    ),
    Case(
        "order-owner",
        Turn(
            "Qual o status do pedido 6? Meu nome é Gabriel Santos Araújo.",
            (ExpectedCall("get_order_status", {"order_id": 6}, outcome="order"),),
        ),
    ),
    Case(
        "order-wrong-name",
        Turn(
            "Qual o status do pedido 6? Meu nome é Maria Silva.",
            (ExpectedCall("get_order_status", {"order_id": 6}, outcome="order_not_verified"),),
        ),
    ),
    Case("order-without-identity", Turn("Qual o status do pedido 6?", NO_TOOL)),
    Case("accessory", Turn("Vocês vendem cordas de violão?", NO_TOOL)),
    Case("off-topic", Turn("Me passa uma receita de bolo de cenoura?", NO_TOOL)),
)

CONVERSATIONS = (
    Conversation(
        "01-acoustic-guitars",
        "Available acoustic guitars up to R$ 1000",
        "Catalog search with category, price and availability filters, then one product's terms.",
        (
            Turn("Quais violões até R$ 1000 vocês têm disponíveis?", (ACOUSTIC_UP_TO_1000,)),
            Turn(
                "Gostei do Yamaha C40. Quanto fica no PIX e em quantas vezes posso parcelar?",
                (ExpectedCall("search_products", {"name": Contains("C40")}),),
            ),
        ),
    ),
    Conversation(
        "02-takamine-gd20-price",
        "Takamine GD20 price",
        "Price, PIX price and installments, all computed in Python and quoted from the tool.",
        (
            Turn(
                "Quanto custa o Takamine GD20?",
                (ExpectedCall("search_products", {"name": Contains("GD20")}),),
            ),
        ),
    ),
    Conversation(
        "03-regret-return",
        "Regret return of order 7",
        "Identity check before any order data; the 7-day regret window is closed, the legal "
        "warranty is still open.",
        (
            Turn("Comprei um instrumento no pedido 7 e me arrependi, posso devolver?", NO_TOOL),
            Turn(
                "Meu nome é Letícia Gonçalves Rocha.",
                (ExpectedCall("get_order_status", {"order_id": 7}, outcome="order"),),
            ),
        ),
    ),
    Conversation(
        "04-address-and-strings",
        "Store address, then strings",
        "A policy answer from the manual, then an accessory request declined politely.",
        (
            Turn("Qual o endereço da loja?", NO_TOOL),
            Turn("E vocês vendem cordas para violão?", NO_TOOL),
        ),
    ),
    Conversation(
        "05-english",
        "A conversation in English",
        "English locale: Portuguese data and policy translated on the fly.",
        (
            Turn(
                "Hi! Do you have electric guitars under R$ 7000?",
                (
                    ExpectedCall(
                        "search_products", {"category": "Guitarras", "max_price": AtMost(7000)}
                    ),
                ),
                locale="en",
            ),
            Turn("What is your return policy if I change my mind?", NO_TOOL, locale="en"),
        ),
    ),
)


if __name__ == "__main__":
    sys.exit(main())
