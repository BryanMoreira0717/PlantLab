"""Testes do Passo 5: mapa de arquetipo + PlantNet (mockado) + fallbacks.

Roda com:  python -m pytest tests/ -v   (a partir de backend/)
"""

import io
import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_DIR))
sys.path.insert(0, str(BACKEND_DIR.parent))

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

import main  # noqa: E402
from ai.archetypes import ARCHETYPE_VALUES, map_species_to_archetype  # noqa: E402
from ai.plantnet import PlantNetError, parse_best_result  # noqa: E402
from main import app  # noqa: E402

client = TestClient(app)
FAKE_PNG = b"\x89PNG\r\n\x1a\n" + b"\x00" * 64


@pytest.fixture()
def with_key(monkeypatch):
    monkeypatch.setenv("PLANTNET_API_KEY", "test-key")


# --- mapa especie -> arquetipo ---


@pytest.mark.parametrize(
    "scientific,common,expected",
    [
        ("Opuntia ficus-indica", "palma", "suculenta"),
        ("Aloe vera", "babosa", "suculenta"),
        ("Ocimum basilicum", "Manjericão", "folha_larga"),
        ("Monstera deliciosa", "costela-de-adão", "folha_larga"),
        ("Rosa chinensis", "roseira", "arbustiva"),
        ("Rosmarinus officinalis", "alecrim", "arbustiva"),
        ("Bambusa vulgaris", "bambu", "graminea"),
        ("Cymbopogon citratus", "capim-limão", "graminea"),
        ("Citrus limon", "limoeiro", "arvore_pequena"),
        ("Ficus benjamina", "ficus", "arvore_pequena"),
        ("Planta Desconhecida Xyz", "", "folha_larga"),
        ("", "", "folha_larga"),
    ],
)
def test_map_species_to_archetype(scientific, common, expected):
    assert map_species_to_archetype(scientific, common) == expected


def test_map_is_case_and_accent_insensitive():
    assert map_species_to_archetype("OPUNTIA FICUS-INDICA", "PALMA") == "suculenta"
    assert map_species_to_archetype("citrus limon", "LIMÃO") == "arvore_pequena"


def test_all_mapped_values_are_valid():
    for word in ["cacto", "bambu", "rosa", "limao", "samambaia", "xyz"]:
        assert map_species_to_archetype(word, word) in ARCHETYPE_VALUES


# --- parse da resposta do PlantNet ---


def test_parse_best_result_pt():
    payload = {
        "results": [
            {
                "score": 0.87,
                "species": {
                    "scientificNameWithoutAuthor": "Opuntia ficus-indica",
                    "commonNames": ["palma-forrageira"],
                },
            }
        ]
    }
    assert parse_best_result(payload) == {
        "scientific_name": "Opuntia ficus-indica",
        "common_name": "palma-forrageira",
        "confidence": 0.87,
    }


def test_parse_without_common_names_uses_scientific():
    payload = {"results": [{"score": 0.4, "species": {"scientificNameWithoutAuthor": "Xyz abc"}}]}
    parsed = parse_best_result(payload)
    assert parsed["common_name"] == "Xyz abc"


def test_parse_empty_results_raises():
    with pytest.raises(PlantNetError):
        parse_best_result({"results": []})


# --- endpoint com API mockada ---


async def _fake_plantnet_ok(**kwargs):
    assert kwargs["api_key"] == "test-key"
    assert kwargs["image_bytes"] == FAKE_PNG
    return {"scientific_name": "Opuntia ficus-indica", "common_name": "palma", "confidence": 0.91}


async def _fake_plantnet_fail(**kwargs):
    raise PlantNetError("PlantNet fora do ar (mock).")


def test_identify_photo_with_mocked_api(with_key, monkeypatch):
    monkeypatch.setattr(main, "identify_species", _fake_plantnet_ok)
    r = client.post(
        "/identify-plant",
        files={"image": ("planta.png", io.BytesIO(FAKE_PNG), "image/png")},
    )
    assert r.status_code == 200
    body = r.json()
    assert body["species_scientific_name"] == "Opuntia ficus-indica"
    assert body["species_common_name"] == "palma"
    assert body["confidence"] == 0.91
    assert body["archetype"] == "suculenta"


def test_identify_api_failure_with_name_falls_back(with_key, monkeypatch):
    monkeypatch.setattr(main, "identify_species", _fake_plantnet_fail)
    r = client.post(
        "/identify-plant",
        data={"plant_name": "bambu"},
        files={"image": ("planta.png", io.BytesIO(FAKE_PNG), "image/png")},
    )
    assert r.status_code == 200
    body = r.json()
    assert body["species_common_name"] == "bambu"
    assert body["confidence"] == 0.5
    assert body["archetype"] == "graminea"


def test_identify_api_failure_without_name_returns_502(with_key, monkeypatch):
    monkeypatch.setattr(main, "identify_species", _fake_plantnet_fail)
    r = client.post(
        "/identify-plant",
        files={"image": ("planta.png", io.BytesIO(FAKE_PNG), "image/png")},
    )
    assert r.status_code == 502
