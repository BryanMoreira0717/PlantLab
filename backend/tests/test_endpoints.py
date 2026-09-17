"""Testes dos endpoints (Passo 3: simulate mock; Passo 5: identify com fallback).

Os testes de identify aqui cobrem o comportamento SEM chave do PlantNet
(fallback para o nome digitado). O caminho com API real (mockada) e o
mapeamento de arquetipo estao em test_plantnet.py.

Roda com:  python -m pytest tests/ -v   (a partir de backend/)
"""

import io
import sys
from pathlib import Path

# Garante `from main import ...` e `from ai...` independente do runner/cwd.
BACKEND_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_DIR))
sys.path.insert(0, str(BACKEND_DIR.parent))

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

import main  # noqa: E402
from ai.archetypes import ARCHETYPE_VALUES  # noqa: E402
from ai.llm import LLMError  # noqa: E402
from main import app  # noqa: E402

client = TestClient(app)

FAKE_SIMULATION = {
    "explanation": "Excesso de água encharca o solo e asfixia as raízes. Estimativa educativa.",
    "simulation_params": {
        "wilt_level": 0.3,
        "leaf_color_shift": "amarelado",
        "growth_rate_change": -0.2,
        "stress_flag": True,
        "timeline_days": 7,
    },
}


async def _fake_reason_ok(species, event, **kwargs):
    assert species == VALID_SIMULATION["species_scientific_name"]
    assert event == VALID_SIMULATION["event_description"]
    return FAKE_SIMULATION


async def _fake_reason_fail(species, event, **kwargs):
    raise LLMError("LLM fora do ar (mock).")


@pytest.fixture()
def _mock_llm_ok(monkeypatch):
    monkeypatch.setenv("LLM_API_KEY", "test-key")
    monkeypatch.setattr(main, "reason_event", _fake_reason_ok)


@pytest.fixture()
def _mock_llm_fail(monkeypatch):
    monkeypatch.setenv("LLM_API_KEY", "test-key")
    monkeypatch.setattr(main, "reason_event", _fake_reason_fail)


@pytest.fixture(autouse=True)
def _no_plantnet_key(monkeypatch):
    """Garante fallback (sem chave real) nestes testes."""
    monkeypatch.delenv("PLANTNET_API_KEY", raising=False)

FAKE_PNG = b"\x89PNG\r\n\x1a\n" + b"\x00" * 64
VALID_SIMULATION = {
    "species_scientific_name": "Ocimum basilicum",
    "event_description": "e se eu jogar 12 litros de água de uma vez?",
}
ALLOWED_COLORS = {"nenhum", "amarelado", "amarronzado", "verde_escuro", "verde_claro"}


def test_health_ok():
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json() == {"status": "ok"}


def test_identify_with_name_only_uses_fallback():
    r = client.post("/identify-plant", data={"plant_name": "manjericão"})
    assert r.status_code == 200
    body = r.json()
    assert body["species_common_name"] == "manjericão"
    assert body["species_scientific_name"] == "manjericão"
    assert body["confidence"] == 0.5
    assert body["archetype"] == "folha_larga"


def test_identify_photo_without_key_returns_502():
    r = client.post(
        "/identify-plant",
        files={"image": ("planta.png", io.BytesIO(FAKE_PNG), "image/png")},
    )
    assert r.status_code == 502


def test_identify_photo_without_key_but_with_name_falls_back():
    r = client.post(
        "/identify-plant",
        data={"plant_name": "cacto"},
        files={"image": ("planta.png", io.BytesIO(FAKE_PNG), "image/png")},
    )
    assert r.status_code == 200
    body = r.json()
    assert body["species_common_name"] == "cacto"
    assert body["archetype"] == "suculenta"


def test_identify_without_anything_returns_400():
    r = client.post("/identify-plant", data={})
    assert r.status_code == 400
    assert "plant_name" in r.json()["detail"]


def test_simulate_valid_returns_llm_result(_mock_llm_ok):
    r = client.post("/simulate-event", json=VALID_SIMULATION)
    assert r.status_code == 200
    body = r.json()
    assert isinstance(body["explanation"], str) and len(body["explanation"]) > 20
    params = body["simulation_params"]
    assert 0 <= params["wilt_level"] <= 1
    assert params["leaf_color_shift"] in ALLOWED_COLORS
    assert -1 <= params["growth_rate_change"] <= 1
    assert isinstance(params["stress_flag"], bool)
    assert isinstance(params["timeline_days"], int)


def test_simulate_without_key_returns_502(monkeypatch):
    monkeypatch.delenv("LLM_API_KEY", raising=False)
    r = client.post("/simulate-event", json=VALID_SIMULATION)
    assert r.status_code == 502


def test_simulate_llm_failure_returns_502(_mock_llm_fail):
    r = client.post("/simulate-event", json=VALID_SIMULATION)
    assert r.status_code == 502


def test_simulate_missing_species_returns_400():
    r = client.post("/simulate-event", json={"event_description": "muita água"})
    assert r.status_code == 400


def test_simulate_missing_event_returns_400():
    r = client.post("/simulate-event", json={"species_scientific_name": "Ocimum basilicum"})
    assert r.status_code == 400


def test_simulate_empty_body_returns_400():
    r = client.post("/simulate-event", json={})
    assert r.status_code == 400


def test_simulate_blank_strings_returns_400():
    r = client.post(
        "/simulate-event",
        json={"species_scientific_name": "   ", "event_description": "  "},
    )
    assert r.status_code == 400
