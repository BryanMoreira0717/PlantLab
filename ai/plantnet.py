"""Cliente da API PlantNet — identificacao de especie por foto (Passo 5).

Endpoint oficial: POST https://my-api.plantnet.org/v2/identify/all
Docs: https://my.plantnet.org/doc/api/identify
Chave gratuita em: https://my.plantnet.org (vai em PLANTNET_API_KEY no .env).

Contrato:
- Entrada: bytes da imagem (JPEG/PNG), nome do arquivo, content-type, api key.
- Saida: {"scientific_name", "common_name", "confidence"} do melhor resultado.
- Falhas (rede, key invalida, quota, foto rejeitada, sem resultados):
  levantam PlantNetError para o backend decidir o fallback.
"""

import httpx

PLANTNET_URL = "https://my-api.plantnet.org/v2/identify/all"
REQUEST_TIMEOUT = 25.0
NB_RESULTS = 3


class PlantNetError(Exception):
    """Qualquer falha ao identificar via PlantNet (rede, API ou parsing)."""


async def identify_species(
    image_bytes: bytes,
    filename: str,
    media_type: str,
    api_key: str,
) -> dict:
    """Chama o PlantNet e devolve o melhor candidato.

    Retorna dict com scientific_name (str), common_name (str) e
    confidence (float 0-1). Levanta PlantNetError em qualquer falha.
    """
    if not api_key:
        raise PlantNetError("PLANTNET_API_KEY nao configurada.")
    if not image_bytes:
        raise PlantNetError("Imagem vazia.")

    try:
        async with httpx.AsyncClient(timeout=REQUEST_TIMEOUT) as client:
            response = await client.post(
                PLANTNET_URL,
                params={"api-key": api_key, "lang": "pt", "nb-results": NB_RESULTS},
                data={"organs": "auto"},
                files={"images": (filename or "planta.jpg", image_bytes, media_type or "image/jpeg")},
            )
    except httpx.TimeoutException as exc:
        raise PlantNetError(f"PlantNet demorou demais ({REQUEST_TIMEOUT}s).") from exc
    except httpx.HTTPError as exc:
        raise PlantNetError(f"Falha de rede ao chamar o PlantNet: {exc}.") from exc

    if response.status_code in (401, 403):
        raise PlantNetError("Chave do PlantNet invalida ou sem permissao (401/403).")
    if response.status_code == 404:
        raise PlantNetError("Endpoint do PlantNet nao encontrado (404).")
    if response.status_code == 429:
        raise PlantNetError("Quota do PlantNet esgotada (429). Tente mais tarde.")
    if response.status_code >= 400:
        raise PlantNetError(f"PlantNet retornou erro HTTP {response.status_code}.")

    try:
        payload = response.json()
    except ValueError as exc:
        raise PlantNetError("PlantNet retornou resposta invalida (nao-JSON).") from exc

    return parse_best_result(payload)


def parse_best_result(payload: dict) -> dict:
    """Extrai o melhor candidato do JSON do PlantNet.

    Levanta PlantNetError se nao houver resultado utilizavel.
    """
    if not isinstance(payload, dict):
        raise PlantNetError("Resposta do PlantNet em formato inesperado.")
    results = payload.get("results") or []
    if not results:
        raise PlantNetError("PlantNet nao reconheceu a planta na foto.")
    species = (results[0].get("species") or {}) if isinstance(results[0], dict) else {}
    scientific = (
        species.get("scientificNameWithoutAuthor") or species.get("scientificName") or ""
    ).strip()
    common_names = species.get("commonNames") or []
    common = str(common_names[0]).strip() if common_names else scientific
    try:
        confidence = float(results[0].get("score") or 0)
    except (TypeError, ValueError) as exc:
        raise PlantNetError("Score do PlantNet em formato inesperado.") from exc
    if not scientific:
        raise PlantNetError("PlantNet retornou resultado sem nome cientifico.")
    return {
        "scientific_name": scientific,
        "common_name": common or scientific,
        "confidence": min(max(confidence, 0.0), 1.0),
    }
