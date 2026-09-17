"""Testes do Passo 6: prompt, parse, validacao e reason_event (tudo mockado).

Nenhum teste aqui chama a internet — a borda HTTP (_post_chat) e mockada.
Roda com:  python -m pytest tests/ -v   (a partir de backend/)
"""

import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_DIR))
sys.path.insert(0, str(BACKEND_DIR.parent))

import pytest  # noqa: E402

import ai.llm as llm  # noqa: E402
from ai.llm import (  # noqa: E402
    LLMError,
    build_messages,
    extract_json,
    reason_event,
    validate_simulation,
)

VALID_JSON = {
    "explanation": "Excesso de água encharca o solo e asfixia as raízes. Estimativa educativa.",
    "simulation_params": {
        "wilt_level": 0.3,
        "leaf_color_shift": "amarelado",
        "growth_rate_change": -0.2,
        "stress_flag": True,
        "timeline_days": 7,
    },
}


def test_build_messages_contains_species_event_and_e01():
    messages = build_messages("Ocimum basilicum", "12 litros de água?")
    assert [m["role"] for m in messages] == ["system", "user"]
    system, user = messages[0]["content"], messages[1]["content"]
    assert "Ocimum basilicum" in user and "12 litros" in user
    assert "SOMENTE" in user  # ordem estrita de JSON puro
    assert "simulation_params" in system
    assert "E-01" in system  # protocolo de casos extremos no prompt


def test_extract_json_plain():
    assert extract_json('{"a": 1}') == {"a": 1}


def test_extract_json_with_fences():
    text = '```json\n{"explanation": "x", "simulation_params": {}}\n```'
    assert extract_json(text)["explanation"] == "x"


def test_extract_json_with_surrounding_text():
    text = 'Claro! {"wilt_level": 0.5} espero ter ajudado.'
    assert extract_json(text) == {"wilt_level": 0.5}


def test_extract_json_invalid_raises():
    with pytest.raises(LLMError):
        extract_json("sem json nenhum aqui")


def test_extract_json_empty_raises():
    with pytest.raises(LLMError):
        extract_json("   ")


def test_validate_ok():
    assert validate_simulation(VALID_JSON) == VALID_JSON


def test_validate_rejects_bad_color():
    bad = {"explanation": "x", "simulation_params": {**VALID_JSON["simulation_params"], "leaf_color_shift": "roxo"}}
    with pytest.raises(LLMError):
        validate_simulation(bad)


@pytest.mark.parametrize(
    "field,value",
    [
        ("wilt_level", 1.5),
        ("wilt_level", -0.1),
        ("wilt_level", "muito"),
        ("growth_rate_change", 2),
        ("growth_rate_change", True),
        ("stress_flag", "sim"),
        ("stress_flag", 1),
        ("timeline_days", -1),
        ("timeline_days", 2.5),
        ("timeline_days", "sete"),
    ],
)
def test_validate_rejects_bad_params(field, value):
    bad = {"explanation": "x", "simulation_params": {**VALID_JSON["simulation_params"], field: value}}
    with pytest.raises(LLMError):
        validate_simulation(bad)


def test_validate_rejects_missing_explanation():
    with pytest.raises(LLMError):
        validate_simulation({"simulation_params": VALID_JSON["simulation_params"]})


def test_reason_event_uses_prompt_and_validates(monkeypatch):
    async def fake_post(messages, provider, model, api_key):
        assert provider == "groq"
        assert any("Ocimum" in m["content"] for m in messages)
        return '{"explanation": "Ok. Estimativa educativa.", "simulation_params": {"wilt_level": 0, "leaf_color_shift": "nenhum", "growth_rate_change": 0, "stress_flag": false, "timeline_days": 1}}'

    monkeypatch.setattr(llm, "_post_chat", fake_post)
    import asyncio

    result = asyncio.run(reason_event("Ocimum basilicum", "evento?", provider="groq", api_key="k"))
    assert result["simulation_params"]["timeline_days"] == 1


def test_reason_event_without_key_raises():
    import asyncio

    with pytest.raises(LLMError):
        asyncio.run(reason_event("X", "Y", api_key=""))


def test_reason_event_unknown_provider_raises():
    import asyncio

    with pytest.raises(LLMError):
        asyncio.run(reason_event("X", "Y", provider="nope", api_key="k"))


def test_reason_event_bad_json_raises(monkeypatch):
    async def fake_post(messages, provider, model, api_key):
        return "não é json"

    monkeypatch.setattr(llm, "_post_chat", fake_post)
    import asyncio

    with pytest.raises(LLMError):
        asyncio.run(reason_event("X", "Y", api_key="k"))
