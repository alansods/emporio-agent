"""Regenerate data/politicas.txt from the original policy PDF.

Usage: python scripts/extract_policies.py
"""

import re
from pathlib import Path

from pypdf import PdfReader

DATA_DIR = Path(__file__).resolve().parent.parent / "data"
PDF_PATH = DATA_DIR / "politicas_da_loja.pdf"
TEXT_PATH = DATA_DIR / "politicas.txt"

PAGE_HEADER = "Empório da Música Manual de Políticas e Procedimentos"
PAGE_FOOTER = re.compile(r"^\s*Página \d+\s*$")
ZERO_WIDTH = re.compile("[​‌‍﻿]")
BLANK_RUN = re.compile(r"\n{3,}")


def is_page_noise(line: str) -> bool:
    return line.strip() == PAGE_HEADER or bool(PAGE_FOOTER.match(line))


def clean(raw: str) -> str:
    text = ZERO_WIDTH.sub("", raw)
    lines = [line.rstrip() for line in text.splitlines() if not is_page_noise(line)]
    return BLANK_RUN.sub("\n\n", "\n".join(lines)).strip() + "\n"


def extract(pdf_path: Path) -> str:
    reader = PdfReader(pdf_path)
    return "\n".join(page.extract_text(extraction_mode="layout") for page in reader.pages)


def main() -> None:
    TEXT_PATH.write_text(clean(extract(PDF_PATH)), encoding="utf-8")
    print(f"Wrote {TEXT_PATH.relative_to(DATA_DIR.parent)}")


if __name__ == "__main__":
    main()
