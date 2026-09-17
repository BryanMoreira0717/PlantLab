"""Mapa especie -> arquetipo 3D (versao inicial do Passo 1).

Os 5 arquetipos correspondem aos arquivos .glb que serao
colocados em frontend/public/models/ no Passo 9:
    suculenta | folha_larga | arbustiva | graminea | arvore_pequena

A logica real de classificacao (palavras-chave) entra no Passo 5.
"""

ARCHETYPE_VALUES = (
    "suculenta",
    "folha_larga",
    "arbustiva",
    "graminea",
    "arvore_pequena",
)

DEFAULT_ARCHETYPE = "folha_larga"


def normalize_archetype(value: str | None) -> str:
    """Garante que o arquetipo seja um dos 5 validos (fallback: folha_larga)."""
    if value in ARCHETYPE_VALUES:
        return value
    return DEFAULT_ARCHETYPE
