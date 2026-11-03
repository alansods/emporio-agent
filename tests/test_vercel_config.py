"""Contract test for vercel.json: routing, function bundle and duration of the API function."""

import json
from pathlib import Path
from typing import Any

import pytest

from emporio_agent.config import MAX_TOOL_ROUNDS, MODEL_TIMEOUT_MS

REPO_ROOT = Path(__file__).resolve().parent.parent
VERCEL_CONFIG_PATH = REPO_ROOT / "vercel.json"
API_FUNCTION = "api/index.py"
MS_PER_SECOND = 1000


@pytest.fixture(scope="module")
def config() -> dict[str, Any]:
    return json.loads(VERCEL_CONFIG_PATH.read_text(encoding="utf-8"))


@pytest.fixture(scope="module")
def api_function(config: dict[str, Any]) -> dict[str, Any]:
    return config["functions"][API_FUNCTION]


def test_api_paths_are_rewritten_to_the_fastapi_function(config: dict[str, Any]) -> None:
    assert {"source": "/api/:path*", "destination": "/api/index"} in config["rewrites"]


@pytest.mark.parametrize("pattern", ["emporio_agent/**", "data/*.csv", "data/politicas.txt"])
def test_bundle_includes_code_and_runtime_data(api_function: dict[str, Any], pattern: str) -> None:
    assert pattern in api_function["includeFiles"]


@pytest.mark.parametrize(
    "pattern", ["node_modules/**", ".next/**", "tests/**", "__tests__/**", "docs/**", "data/*.pdf"]
)
def test_bundle_excludes_non_runtime_files(api_function: dict[str, Any], pattern: str) -> None:
    assert pattern in api_function["excludeFiles"]


def test_max_duration_covers_worst_case_turn(api_function: dict[str, Any]) -> None:
    worst_case_turn_seconds = (MAX_TOOL_ROUNDS + 1) * MODEL_TIMEOUT_MS / MS_PER_SECOND
    assert api_function["maxDuration"] > worst_case_turn_seconds


def test_function_dependencies_come_from_requirements_txt() -> None:
    """Vercel installs from pyproject.toml when it exists, ignoring requirements.txt."""
    assert (REPO_ROOT / "requirements.txt").is_file()
    assert not (REPO_ROOT / "pyproject.toml").exists()


@pytest.mark.parametrize("name", ["GEMINI_API_KEY", "MODEL", "REFERENCE_DATE"])
def test_config_does_not_set_secrets_or_overrides(config: dict[str, Any], name: str) -> None:
    assert name not in config.get("env", {})
    assert name not in config.get("build", {}).get("env", {})
