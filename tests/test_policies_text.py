import re
from pathlib import Path

POLICIES_PATH = Path(__file__).resolve().parent.parent / "data" / "politicas.txt"

SECTION_TITLES = (
    "1. Sobre a Empório da Música",
    "2. Horário de Funcionamento",
    "3. Formas de Pagamento",
    "4. Política de Trocas e Devoluções",
    "5. Política de Frete e Entregas",
    "6. Promoções e Descontos",
    "7. Atendimento via WhatsApp",
    "8. Garantia",
    "9. Privacidade e Proteção de Dados",
    "10. Disposições Finais",
)
PAGE_HEADER = "Empório da Música Manual de Políticas e Procedimentos"
ZERO_WIDTH_CHARS = ("​", "‌", "‍", "﻿")


def read_policies() -> str:
    return POLICIES_PATH.read_text(encoding="utf-8")


def test_policies_text_has_every_section():
    lines = read_policies().splitlines()

    for title in SECTION_TITLES:
        assert title in lines


def test_policies_text_has_no_page_header_or_footer():
    text = read_policies()

    assert PAGE_HEADER not in text
    assert not re.search(r"^\s*Página \d+\s*$", text, flags=re.MULTILINE)


def test_policies_text_has_no_zero_width_characters():
    text = read_policies()

    assert not any(char in text for char in ZERO_WIDTH_CHARS)
