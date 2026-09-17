"""Raciocinio biologico via LLM (Passo 6).

Modelo padrao: gpt-oss-120b via Groq (o Llama 3.3 70B foi aposentado pela Groq;
segue disponivel via together/openrouter configurando LLM_PROVIDER/LLM_MODEL).

Provedores suportados (todos com API compativel ao formato chat/completions):
groq (padrao), together, openrouter. Config via .env:
    LLM_PROVIDER=groq | together | openrouter
    LLM_MODEL=<id do modelo>  (vazio = padrao do provedor)
    LLM_API_KEY=<chave>

O prompt e montado a partir de ai/prompts/simulate_event.md + o resumo
operacional do Protocolo E-01 (protocolo_casos_extremos.md), e a resposta
passa por parse estrito: qualquer desvio de formato vira LLMError para o
backend responder 502 em vez de inventar numero.
"""

import json
import re
from pathlib import Path

import httpx

PROMPTS_DIR = Path(__file__).resolve().parent / "prompts"

PROVIDERS: dict[str, dict[str, str]] = {
    "groq": {
        "url": "https://api.groq.com/openai/v1/chat/completions",
        "model": "openai/gpt-oss-120b",
    },
    "together": {
        "url": "https://api.together.xyz/v1/chat/completions",
        "model": "meta-llama/Llama-3.3-70B-Instruct-Turbo",
    },
    "openrouter": {
        "url": "https://openrouter.ai/api/v1/chat/completions",
        "model": "meta-llama/llama-3.3-70b-instruct",
    },
}

ALLOWED_COLORS = ("nenhum", "amarelado", "amarronzado", "verde_escuro", "verde_claro")
REQUEST_TIMEOUT = 60.0
TEMPERATURE = 0.3
MAX_TOKENS = 600


class LLMError(Exception):
    """Qualquer falha ao gerar a simulacao via LLM (rede, API ou formato)."""


def _read_prompt(filename: str) -> str:
    return (PROMPTS_DIR / filename).read_text(encoding="utf-8")


def build_messages(species: str, event: str) -> list:
    """Monta system (regras + E-01) e user (especie + evento) para o chat."""
    system = _read_prompt("simulate_event.md") + "\n\n" + _read_prompt("protocolo_casos_extremos.md")
    user = (
        f"Espécie (nome científico): {species}\n"
        f"Evento descrito pelo usuário: {event}\n\n"
        "Responda SOMENTE com o JSON válido, sem nenhum texto antes ou depois."
    )
    return [
        {"role": "system", "content": system},
        {"role": "user", "content": user},
    ]


def extract_json(text: str) -> dict:
    """Extrai o JSON da resposta, tolerando cercas de markdown.

    Levanta LLMError se nao houver JSON valido.
    """
    if not isinstance(text, str) or not text.strip():
        raise LLMError("LLM retornou resposta vazia.")
    candidate = text.strip()
    fence = re.search(r"```(?:json)?\s*(.*?)```", candidate, re.DOTALL | re.IGNORECASE)
    if fence:
        candidate = fence.group(1).strip()
    try:
        data = json.loads(candidate)
    except json.JSONDecodeError:
        start, end = candidate.find("{"), candidate.rfind("}")
        if start == -1 or end <= start:
            raise LLMError("LLM nao retornou JSON valido.") from None
        try:
            data = json.loads(candidate[start : end + 1])
        except json.JSONDecodeError as exc:
            raise LLMError(f"LLM retornou JSON malformado: {exc}.") from exc
    if not isinstance(data, dict):
        raise LLMError("LLM retornou JSON fora do formato esperado (objeto).")
    return data


def _as_float(value: object, field: str, low: float, high: float) -> float:
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        raise LLMError(f"Campo '{field}' deve ser numero entre {low} e {high}.")
    number = float(value)
    if not low <= number <= high:
        raise LLMError(f"Campo '{field}' fora do intervalo [{low}, {high}]: {value}.")
    return number


def validate_simulation(data: dict) -> dict:
    """Valida o JSON no contrato de POST /simulate-event (estrito).

    Retorna o dict normalizado. Levanta LLMError em qualquer desvio.
    """
    if not isinstance(data, dict):
        raise LLMError("Resposta do LLM em formato inesperado.")
    explanation = data.get("explanation")
    params = data.get("simulation_params")
    if not isinstance(explanation, str) or not explanation.strip():
        raise LLMError("Campo 'explanation' ausente ou vazio.")
    if not isinstance(params, dict):
        raise LLMError("Campo 'simulation_params' ausente ou invalido.")

    color = params.get("leaf_color_shift")
    if color not in ALLOWED_COLORS:
        raise LLMError(f"Campo 'leaf_color_shift' invalido: {color!r}.")
    stress = params.get("stress_flag")
    if not isinstance(stress, bool):
        raise LLMError("Campo 'stress_flag' deve ser true ou false.")
    timeline = params.get("timeline_days")
    if isinstance(timeline, bool) or not isinstance(timeline, (int, float)):
        raise LLMError("Campo 'timeline_days' deve ser numero inteiro >= 0.")
    if isinstance(timeline, float):
        if not timeline.is_integer():
            raise LLMError(f"Campo 'timeline_days' deve ser inteiro: {timeline}.")
        timeline = int(timeline)
    if timeline < 0:
        raise LLMError("Campo 'timeline_days' deve ser >= 0.")

    return {
        "explanation": explanation.strip(),
        "simulation_params": {
            "wilt_level": _as_float(params.get("wilt_level"), "wilt_level", 0, 1),
            "leaf_color_shift": color,
            "growth_rate_change": _as_float(params.get("growth_rate_change"), "growth_rate_change", -1, 1),
            "stress_flag": stress,
            "timeline_days": timeline,
        },
    }


async def _post_chat(messages: list, provider: str, model: str | None, api_key: str) -> str:
    """Envia o chat ao provedor e devolve o texto bruto da resposta."""
    config = PROVIDERS.get(provider)
    if config is None:
        raise LLMError(
            f"Provedor LLM desconhecido: {provider!r}. Use: {', '.join(sorted(PROVIDERS))}."
        )
    headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
    if provider == "openrouter":
        headers["HTTP-Referer"] = "http://localhost:5173"
        headers["X-Title"] = "PlantLab 3D"
    body = {
        "model": model or config["model"],
        "messages": messages,
        "temperature": TEMPERATURE,
        "max_tokens": MAX_TOKENS,
        "response_format": {"type": "json_object"},
    }
    try:
        async with httpx.AsyncClient(timeout=REQUEST_TIMEOUT) as client:
            response = await client.post(config["url"], headers=headers, json=body)
    except httpx.TimeoutException as exc:
        raise LLMError(f"LLM demorou demais ({REQUEST_TIMEOUT}s).") from exc
    except httpx.HTTPError as exc:
        raise LLMError(f"Falha de rede ao chamar o LLM: {exc}.") from exc

    if response.status_code in (401, 403):
        raise LLMError("Chave do LLM invalida ou sem permissao (401/403).")
    if response.status_code == 429:
        raise LLMError("Quota do LLM esgotada (429). Tente mais tarde.")
    if response.status_code >= 400:
        raise LLMError(f"Provedor do LLM retornou erro HTTP {response.status_code}.")
    try:
        payload = response.json()
        content = payload["choices"][0]["message"]["content"]
    except (ValueError, KeyError, IndexError, TypeError) as exc:
        raise LLMError("Resposta do provedor do LLM em formato inesperado.") from exc
    if not isinstance(content, str) or not content.strip():
        raise LLMError("LLM retornou conteudo vazio.")
    return content


async def reason_event(
    species: str,
    event: str,
    provider: str = "groq",
    model: str | None = None,
    api_key: str = "",
) -> dict:
    """Gera a simulacao do evento para a especie via Llama 3.3 70B.

    Retorna {"explanation", "simulation_params"} validado. Levanta LLMError
    em qualquer falha (chave, rede, formato).
    """
    if not (api_key or "").strip():
        raise LLMError("LLM_API_KEY nao configurada.")
    messages = build_messages(species.strip(), event.strip())
    raw = await _post_chat(messages, provider.strip().lower() or "groq", model, api_key.strip())
    return validate_simulation(extract_json(raw))
