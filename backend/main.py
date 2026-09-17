"""PlantLab 3D — Backend FastAPI.

Passos implementados:
- Passo 1: setup + GET /health.
- Passo 3: stubs mockados de POST /identify-plant e POST /simulate-event
  (respostas fixas; a logica real com PlantNet e Llama 3.3 70B chega no Sprint 2,
  mantendo estes mesmos formatos de entrada e saida).

Execucao local:
    cd backend
    pip install -r requirements.txt
    python -m uvicorn main:app --reload   # http://localhost:8000

Docs interativas: http://localhost:8000/docs
Health check:     http://localhost:8000/health -> {"status": "ok"}
"""

import sys
from pathlib import Path

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

# Permite `from ai...` tanto via uvicorn quanto via pytest, de qualquer cwd.
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from ai.archetypes import normalize_archetype  # noqa: E402

app = FastAPI(
    title="PlantLab 3D API",
    description="API educativa: identifica plantas e simula o efeito de eventos (texto + 3D).",
    version="0.2.0",
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
# Mocks do Passo 3 (substituidos por IA real no Sprint 2)
# ---------------------------------------------------------------------------

MOCK_IDENTIFICATION = {
    "species_common_name": "Manjericão",
    "species_scientific_name": "Ocimum basilicum",
    "confidence": 0.92,
    "archetype": normalize_archetype("folha_larga"),
}

MOCK_SIMULATION = {
    "explanation": (
        "Um excesso repentino de água pode causar encharcamento do solo, "
        "reduzindo o oxigênio disponível para as raízes e favorecendo o "
        "apodrecimento. Esta é uma estimativa educativa e não substitui "
        "experimentos reais."
    ),
    "simulation_params": {
        "wilt_level": 0.3,
        "leaf_color_shift": "amarelado",
        "growth_rate_change": -0.2,
        "stress_flag": True,
        "timeline_days": 7,
    },
}


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
        "version": "0.2.0",
        "docs": "/docs",
        "health": "/health",
    }


@app.post(
    "/identify-plant",
    response_model=IdentificationResponse,
    summary="Identifica a planta (STUB mockado)",
)
async def identify_plant(
    image: UploadFile | None = File(default=None),
    plant_name: str | None = Form(default=None),
) -> dict:
    """Identifica a planta a partir de foto e/ou nome (stub do Passo 3).

    Entrada (multipart/form-data, ambos opcionais, mas PELO MENOS UM exigido):
    - image: arquivo de imagem da planta.
    - plant_name: nome digitado, ex. "manjericão".

    Saída: {species_common_name, species_scientific_name, confidence (0-1),
    archetype (suculenta | folha_larga | arbustiva | graminea | arvore_pequena)}.

    Erros: 400 se nem imagem nem nome forem enviados.
    Nota: hoje retorna um JSON fixo; a chamada real ao PlantNet chega no Passo 5.
    """
    has_image = image is not None and bool(image.filename)
    has_name = bool((plant_name or "").strip())
    if not has_image and not has_name:
        raise HTTPException(
            status_code=400,
            detail="Envie uma imagem ou o nome da planta (plant_name).",
        )
    if has_image and image is not None:
        await image.read()  # stub: conteúdo consumido e ignorado no mock
    return MOCK_IDENTIFICATION


@app.post(
    "/simulate-event",
    response_model=SimulationResponse,
    summary="Simula um evento (STUB mockado)",
)
async def simulate_event(payload: SimulationRequest) -> dict:
    """Simula o efeito de um evento sobre a espécie (stub do Passo 3).

    Entrada (JSON, ambos obrigatórios e não-vazios):
    - species_scientific_name: ex. "Ocimum basilicum".
    - event_description: texto livre, ex. "e se eu jogar 12 litros de água?".

    Saída: {explanation (PT-BR, 2-4 frases), simulation_params {wilt_level 0-1,
    leaf_color_shift, growth_rate_change -1..1, stress_flag, timeline_days}}.

    Erros: 400 se algum campo faltar ou vier vazio.
    Nota: hoje retorna um JSON fixo; o raciocínio real via Llama 3.3 70B chega no Passo 6.
    """
    species = (payload.species_scientific_name or "").strip()
    event = (payload.event_description or "").strip()
    if not species or not event:
        raise HTTPException(
            status_code=400,
            detail="species_scientific_name e event_description são obrigatórios.",
        )
    return MOCK_SIMULATION
