"""PlantLab 3D — Backend FastAPI.

Passos implementados:
- Passo 1: setup + GET /health.
- Passo 5: POST /identify-plant real via PlantNet (foto) com fallback gracioso
  para o nome digitado quando nao ha foto, chave ou a API falha.
- Passo 6: POST /simulate-event real via Llama 3.3 70B (provedor configuravel),
  com parse estrito e Protocolo E-01 para casos extremos.

Execucao local:
    cd backend
    pip install -r requirements.txt
    python -m uvicorn main:app --reload   # http://localhost:8000

Docs interativas: http://localhost:8000/docs
Health check:     http://localhost:8000/health -> {"status": "ok"}
"""

import os
import sys
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

load_dotenv()  # permite PLANTNET_API_KEY em backend/.env no dev local

# Permite `from ai...` tanto via uvicorn quanto via pytest, de qualquer cwd.
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from ai.archetypes import map_species_to_archetype  # noqa: E402
from ai.llm import LLMError, reason_event  # noqa: E402
from ai.plantnet import PlantNetError, identify_species  # noqa: E402

app = FastAPI(
    title="PlantLab 3D API",
    description="API educativa: identifica plantas e simula o efeito de eventos (texto + 3D).",
    version="0.4.0",
)

# Libera o frontend Vite (porta padrao 5173). Em producao, restrinja.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Modelos (contrato da API — NÃO mudar os formatos sem alinhar frontend e /ai)
# ---------------------------------------------------------------------------


class IdentificationResponse(BaseModel):
    """Resposta de POST /identify-plant."""

    species_common_name: str = Field(examples=["Manjericão"])
    species_scientific_name: str = Field(examples=["Ocimum basilicum"])
    confidence: float = Field(ge=0, le=1, examples=[0.92])
    archetype: str = Field(
        examples=["folha_larga"],
        description="Um de: suculenta, folha_larga, arbustiva, graminea, arvore_pequena.",
    )


class SimulationRequest(BaseModel):
    """Entrada de POST /simulate-event (JSON). Ambos os campos sao obrigatorios."""

    species_scientific_name: str | None = Field(default=None, examples=["Ocimum basilicum"])
    event_description: str | None = Field(
        default=None,
        examples=["e se eu jogar 12 litros de água de uma vez?"],
    )


class SimulationParams(BaseModel):
    """Parametros numericos que o frontend usa para animar o modelo 3D."""

    wilt_level: float = Field(ge=0, le=1, examples=[0.3])
    leaf_color_shift: str = Field(
        examples=["amarelado"],
        description="Um de: nenhum, amarelado, amarronzado, verde_escuro, verde_claro.",
    )
    growth_rate_change: float = Field(
        ge=-1,
        le=1,
        examples=[-0.2],
        description="Negativo = crescimento prejudicado, positivo = favorecido.",
    )
    stress_flag: bool = Field(examples=[True])
    timeline_days: int = Field(ge=0, examples=[7])


class SimulationResponse(BaseModel):
    """Resposta de POST /simulate-event."""

    explanation: str
    simulation_params: SimulationParams


# ---------------------------------------------------------------------------
# Rotas
# ---------------------------------------------------------------------------


@app.get("/health", summary="Health check")
def health() -> dict:
    """Retorna o estado do backend. Usado pelo Passo 1 para validar o setup."""
    return {"status": "ok"}


@app.get("/", summary="Info raiz")
def root() -> dict:
    """Mensagem de boas-vindas com link para /docs."""
    return {
        "name": "PlantLab 3D API",
        "version": "0.4.0",
        "docs": "/docs",
        "health": "/health",
    }


@app.post(
    "/identify-plant",
    response_model=IdentificationResponse,
    summary="Identifica a planta (PlantNet + fallback)",
)
async def identify_plant(
    image: UploadFile | None = File(default=None),
    plant_name: str | None = Form(default=None),
) -> dict:
    """Identifica a planta a partir de foto e/ou nome (Passo 5).

    Entrada (multipart/form-data, ambos opcionais, mas PELO MENOS UM exigido):
    - image: arquivo de imagem da planta (JPEG/PNG).
    - plant_name: nome digitado, ex. "manjericão".

    Comportamento:
    1. Com foto + PLANTNET_API_KEY configurada: chama o PlantNet e devolve o
       melhor candidato (nome cientifico, popular, score) + archetype do /ai.
    2. Sem foto, ou sem chave, ou com falha na API: fallback gracioso usando o
       nome digitado (confianca 0.5 = nao verificado por IA) + archetype do /ai.
    3. Sem foto e sem nome: 400. Com foto mas sem chave/nome e API indisponivel:
       502 pedindo para digitar o nome ou tentar de novo.

    Saída: {species_common_name, species_scientific_name, confidence (0-1),
    archetype (suculenta | folha_larga | arbustiva | graminea | arvore_pequena)}.

    Erros: 400 se nem imagem nem nome forem enviados; 502 se a identificacao
    por foto falhar e nao houver nome para fallback.
    """
    typed_name = (plant_name or "").strip()
    has_image = image is not None and bool(image.filename)
    if not has_image and not typed_name:
        raise HTTPException(
            status_code=400,
            detail="Envie uma imagem ou o nome da planta (plant_name).",
        )

    if has_image and image is not None:
        api_key = os.getenv("PLANTNET_API_KEY", "").strip()
        if not api_key and not typed_name:
            raise HTTPException(
                status_code=502,
                detail="Identificação por foto indisponível (PLANTNET_API_KEY "
                "não configurada). Digite o nome da planta ou configure a chave.",
            )
        if api_key:
            try:
                content = await image.read()
                found = await identify_species(
                    image_bytes=content,
                    filename=image.filename or "planta.jpg",
                    media_type=image.content_type or "image/jpeg",
                    api_key=api_key,
                )
                return {
                    "species_common_name": found["common_name"],
                    "species_scientific_name": found["scientific_name"],
                    "confidence": found["confidence"],
                    "archetype": map_species_to_archetype(
                        found["scientific_name"], found["common_name"]
                    ),
                }
            except PlantNetError as exc:
                if not typed_name:
                    raise HTTPException(
                        status_code=502,
                        detail=f"Não foi possível identificar pela foto ({exc}). "
                        "Digite o nome da planta ou tente de novo.",
                    ) from exc
                # com nome digitado: cai no fallback abaixo

    # Fallback: usa o nome digitado diretamente (confianca 0.5 = nao verificado).
    return {
        "species_common_name": typed_name,
        "species_scientific_name": typed_name,
        "confidence": 0.5,
        "archetype": map_species_to_archetype(typed_name, typed_name),
    }


@app.post(
    "/simulate-event",
    response_model=SimulationResponse,
    summary="Simula um evento (Llama 3.3 70B)",
)
async def simulate_event(payload: SimulationRequest) -> dict:
    """Simula o efeito de um evento sobre a espécie via LLM (Passo 6).

    Entrada (JSON, ambos obrigatórios e não-vazios):
    - species_scientific_name: ex. "Ocimum basilicum".
    - event_description: texto livre, ex. "e se eu jogar 12 litros de água?".

    Saída: {explanation (PT-BR, 2-4 frases), simulation_params {wilt_level 0-1,
    leaf_color_shift, growth_rate_change -1..1, stress_flag, timeline_days}}.

    Erros: 400 se algum campo faltar ou vier vazio; 502 se a chave do LLM não
    estiver configurada ou a geração falhar (rede, quota ou formato inválido).
    Casos extremos seguem o Protocolo E-01 (ai/prompts/protocolo_casos_extremos.md).
    """
    species = (payload.species_scientific_name or "").strip()
    event = (payload.event_description or "").strip()
    if not species or not event:
        raise HTTPException(
            status_code=400,
            detail="species_scientific_name e event_description são obrigatórios.",
        )
    api_key = os.getenv("LLM_API_KEY", "").strip()
    if not api_key:
        raise HTTPException(
            status_code=502,
            detail="Simulação por IA indisponível (LLM_API_KEY não configurada). "
            "Configure a chave do provedor e tente de novo.",
        )
    try:
        return await reason_event(
            species,
            event,
            provider=os.getenv("LLM_PROVIDER", "groq"),
            model=os.getenv("LLM_MODEL", "").strip() or None,
            api_key=api_key,
        )
    except LLMError as exc:
        raise HTTPException(
            status_code=502,
            detail=f"Não foi possível gerar a simulação ({exc}). Tente de novo.",
        ) from exc
