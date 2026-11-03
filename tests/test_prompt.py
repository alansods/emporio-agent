from datetime import date

from emporio_agent.config import DATA_DIR
from emporio_agent.prompt import build_system_prompt

REFERENCE_DATE = date(2026, 3, 23)


def test_prompt_carries_the_full_policy_manual():
    manual = (DATA_DIR / "politicas.txt").read_text(encoding="utf-8")

    assert manual in build_system_prompt("pt-BR", REFERENCE_DATE)


def test_prompt_carries_contact_and_reference_date():
    prompt = build_system_prompt("pt-BR", REFERENCE_DATE)

    assert "(67) 3341-4444" in prompt
    assert "contato@emporiodamusica.com.br" in prompt
    assert "2026-03-23" in prompt


def test_prompt_names_both_tools():
    prompt = build_system_prompt("pt-BR", REFERENCE_DATE)

    assert "search_products" in prompt
    assert "get_order_status" in prompt


def test_english_locale_asks_for_english_replies():
    prompt = build_system_prompt("en", REFERENCE_DATE)

    assert "reply in English" in prompt
    assert "português do Brasil" not in prompt


def test_portuguese_locale_asks_for_brazilian_portuguese_replies():
    prompt = build_system_prompt("pt-BR", REFERENCE_DATE)

    assert "português do Brasil" in prompt
    assert "reply in English" not in prompt


def test_prompt_asks_for_exact_tool_values():
    prompt = build_system_prompt("pt-BR", REFERENCE_DATE)

    assert "exatamente" in prompt
    assert "R$ 599,90" in prompt


def test_prompt_limits_the_markdown():
    prompt = build_system_prompt("pt-BR", REFERENCE_DATE)

    assert "# Formato" in prompt
    assert "**negrito**" in prompt
    assert '"- "' in prompt
    for forbidden in ("títulos", "tabelas", "listas numeradas", "links"):
        assert forbidden in prompt


def test_prompt_asks_for_narrow_searches():
    prompt = build_system_prompt("pt-BR", REFERENCE_DATE)

    for search_filter in ("`category`", "`max_price`", "`only_available`"):
        assert search_filter in prompt


def test_prompt_forbids_order_lookup_without_identity():
    prompt = build_system_prompt("pt-BR", REFERENCE_DATE)

    assert "Não chame `get_order_status` antes" in prompt


def test_prompt_asks_to_mention_open_return_windows():
    prompt = build_system_prompt("pt-BR", REFERENCE_DATE)

    assert "ainda abertas" in prompt
