from datetime import date

from emporio_agent import config
from emporio_agent.text import normalize


def test_reference_date_defaults_to_day_after_last_order(monkeypatch):
    monkeypatch.delenv("REFERENCE_DATE", raising=False)

    assert config.reference_date() == date(2026, 3, 23)


def test_reference_date_can_be_overridden(monkeypatch):
    monkeypatch.setenv("REFERENCE_DATE", "2026-02-20")

    assert config.reference_date() == date(2026, 2, 20)


def test_model_defaults_to_gemini_flash_lite(monkeypatch):
    monkeypatch.delenv("MODEL", raising=False)

    assert config.model_name() == "gemini-3.5-flash-lite"


def test_model_can_be_overridden(monkeypatch):
    monkeypatch.setenv("MODEL", "gemini-3.8-pro")

    assert config.model_name() == "gemini-3.8-pro"


def test_normalize_ignores_case_accents_and_extra_whitespace():
    assert normalize("  Letícia   GONÇALVES Rocha ") == "leticia goncalves rocha"
