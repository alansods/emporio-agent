import unicodedata


def normalize(text: str) -> str:
    """Lowercase, strip accents and collapse whitespace, for accent-insensitive matching."""
    decomposed = unicodedata.normalize("NFKD", text)
    without_accents = "".join(char for char in decomposed if not unicodedata.combining(char))
    return " ".join(without_accents.casefold().split())
