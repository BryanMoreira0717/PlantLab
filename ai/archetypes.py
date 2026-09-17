"""Mapa especie -> arquetipo 3D (Passo 5: classificacao por palavras-chave).

Os 5 arquetipos correspondem aos arquivos .glb que serao
colocados em frontend/public/models/ no Passo 9:
    suculenta | folha_larga | arbustiva | graminea | arvore_pequena

A classificacao e propositalmente simples (substring, sem acento,
maiusculas/minusculas ignoradas) e pode ser refinada depois.
Ordem de prioridade: suculenta > graminea > arbustiva > arvore_pequena.
Tudo que nao casar cai em folha_larga (fallback padrao).
"""

import unicodedata

ARCHETYPE_VALUES = (
    "suculenta",
    "folha_larga",
    "arbustiva",
    "graminea",
    "arvore_pequena",
)

DEFAULT_ARCHETYPE = "folha_larga"

# Palavras-chave (sem acento, minusculas) por arquetipo.
ARCHETYPE_KEYWORDS: dict[str, tuple[str, ...]] = {
    "suculenta": (
        "cact", "opuntia", "mammillaria", "cereus", "echeveria", "crassula",
        "sedum", "aloe", "babosa", "agave", "haworth", "lithops", "kalanchoe",
        "suculent", "sempervivum", "sansevieria", "espada-de-sao-jorge",
    ),
    "graminea": (
        "bambu", "bamboo", "grama", "grass", "poaceae", "capim", "saccharum",
        "zea", "milho", "trigo", "triticum", "arroz", "oryza", "aveia", "avena",
        "cevada", "hordeum", "sorgo", "sorghum", "cortaderia", "pennisetum",
        "cymbopogon", "citronela", "capim-limao", "vetiver", "zoysia",
    ),
    "arbustiva": (
        "rosa", "rose", "hibisc", "azale", "rhododendron", "bux", "buxinho",
        "ixora", "lantana", "camelia", "gardenia", "jasm", "murta", "myrt",
        "pitanga", "eugenia", "croton", "codiaeum", "alecrim", "rosmarinus",
        "hortela", "mentha", "menta", "melissa", "cidreira", "salvia",
        "tomilho", "thym", "oregano", "bougainville", "buganvilia", "primavera",
    ),
    "arvore_pequena": (
        "ficus", "figueira", "citrus", "limao", "laranja", "orange",
        "tangerina", "mexerica", "jabuticaba", "plinia", "manga", "mangifera",
        "abacate", "persea", "macieira", "malus", "pereira", "pyrus",
        "oliveira", "olea", "romazeira", "punica", "acerola", "malpighia", "amora",
        "morus", "ipe", "tabebuia", "handroanthus", "jacaranda", "bonsai",
        "pinheiro", "pinus", "araucaria", "cipreste", "cupressus", "eucalipto",
        "eucalyptus", "cerejeira", "prunus", "ameixa", "pessego",
    ),
}

# Palavras que indicam folha larga ( so documentam; o fallback ja cobre).
LEAFY_KEYWORDS: tuple[str, ...] = (
    "ocimum", "manjeric", "basil", "monstera", "costela-de-adao", "philodendron",
    "filodendro", "calathea", "maranta", "begonia", "alocasia", "colocasia",
    "taioba", "xanthosoma", "hydrangea", "hortensia", "saintpaulia", "violeta",
    "peperomia", "pilea", "hedera", "hera", "epipremnum", "jiboia", "pothos",
    "anthurium", "anturio", "spathiphyllum", "lirio-da-paz", "lilium", "lirio",
)


def normalize_archetype(value: str | None) -> str:
    """Garante que o arquetipo seja um dos 5 validos (fallback: folha_larga)."""
    if value in ARCHETYPE_VALUES:
        return value
    return DEFAULT_ARCHETYPE


def _norm(text: str) -> str:
    """Minusculas, sem acento, espacos nas bordas removidos (para casar keywords)."""
    text = unicodedata.normalize("NFD", text.lower().strip())
    return "".join(ch for ch in text if unicodedata.category(ch) != "Mn")


def map_species_to_archetype(scientific_name: str = "", common_name: str = "") -> str:
    """Classifica a planta em um dos 5 arquetipos por palavras-chave.

    Procura as keywords de cada arquetipo (na ordem de prioridade do modulo)
    dentro do nome cientifico + nome popular. Nao achou nada -> folha_larga.
    """
    haystack = f"{_norm(scientific_name)} {_norm(common_name)}"
    for archetype, keywords in ARCHETYPE_KEYWORDS.items():
        if any(keyword in haystack for keyword in keywords):
            return archetype
    return DEFAULT_ARCHETYPE
