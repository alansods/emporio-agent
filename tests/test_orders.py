import pytest

from emporio_agent.orders import get_order_status

LETICIA = "Letícia Gonçalves Rocha"
ANA = "Ana Carolina Ferreira"
MATHEUS = "Matheus Ramos Correia"
ALINE = "Aline Borges Monteiro"
VERIFICATION_ERROR_KEYS = {"error", "message"}


@pytest.fixture(autouse=True)
def default_reference_date(monkeypatch):
    monkeypatch.delenv("REFERENCE_DATE", raising=False)


def windows_by_kind(result: dict) -> dict[str, dict]:
    return {window["kind"]: window for window in result["return_windows"]}


def test_full_name_matches_ignoring_case_and_accents():
    result = get_order_status(7, "leticia goncalves rocha")

    assert result["status"] == "delivered"
    assert result["items"] == [{"product_name": "Shelby SU-21S Soprano Sunburst", "quantity": 1}]


def test_email_matches_ignoring_case():
    result = get_order_status(7, "Leticia.Rocha@JMAIL.com")

    assert result["order_id"] == 7


@pytest.mark.parametrize("identity", ["Letícia Rocha", ANA])
def test_wrong_identity_reveals_nothing(identity: str):
    result = get_order_status(7, identity)

    assert result["error"] == "order_not_verified"
    assert set(result) == VERIFICATION_ERROR_KEYS


def test_unknown_order_is_indistinguishable_from_failed_check():
    assert get_order_status(9999, LETICIA) == get_order_status(7, ANA)


def test_shipped_order_has_tracking_and_no_return_windows():
    result = get_order_status(8, ANA)

    assert result["status"] == "shipped"
    assert result["tracking_code"] == "BRJL5544332BR"
    assert result["estimated_delivery"] == "2026-02-28"
    assert result["return_windows"] == []


def test_order_details_fields():
    result = get_order_status(8, ANA)

    assert result == {
        "order_id": 8,
        "customer_name": ANA,
        "order_date": "2026-02-15",
        "status": "shipped",
        "total": 349.9,
        "payment_method": "debit",
        "items": result["items"],
        "tracking_code": "BRJL5544332BR",
        "estimated_delivery": "2026-02-28",
        "notes": None,
        "reference_date": "2026-03-23",
        "return_windows": [],
    }


def test_cancelled_order_with_note():
    result = get_order_status(17, MATHEUS)

    assert result["status"] == "cancelled"
    assert result["tracking_code"] is None
    assert "cancelado pelo cliente" in result["notes"]


def test_order_with_several_items():
    result = get_order_status(15, ALINE)

    assert len(result["items"]) == 2
    assert all(item["quantity"] == 1 for item in result["items"])


def test_short_windows_closed_and_warranty_open():
    windows = windows_by_kind(get_order_status(7, LETICIA))

    assert windows["regret"] == {"kind": "regret", "deadline": "2026-02-24", "open": False}
    assert windows["preference_exchange"]["deadline"] == "2026-02-24"
    assert windows["preference_exchange"]["open"] is False
    assert windows["defect_exchange"] == {
        "kind": "defect_exchange",
        "deadline": "2026-03-05",
        "open": False,
    }
    assert windows["legal_warranty"] == {
        "kind": "legal_warranty",
        "deadline": "2026-05-18",
        "open": True,
    }


def test_regret_window_open_on_its_last_day(monkeypatch):
    monkeypatch.setenv("REFERENCE_DATE", "2026-02-24")

    assert windows_by_kind(get_order_status(7, LETICIA))["regret"]["open"] is True


def test_default_reference_date():
    assert get_order_status(7, LETICIA)["reference_date"] == "2026-03-23"


def test_overridden_reference_date(monkeypatch):
    monkeypatch.setenv("REFERENCE_DATE", "2026-02-20")

    assert get_order_status(7, LETICIA)["reference_date"] == "2026-02-20"
