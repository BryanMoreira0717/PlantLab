<img width="100%" src="https://capsule-render.vercel.app/api?type=waving&color=0:1B5E20,100:66BB6A&height=220&section=header&text=PlantLab%203D&fontSize=58&fontColor=ffffff&animation=fadeIn&fontAlignY=36&desc=Descubra%20o%20que%20acontece%20com%20sua%20planta%20antes%20de%20fazer&descAlignY=58&descSize=17" alt="PlantLab 3D header"/>

<p align="center">
  <a href="https://github.com/anomalyco/opencode"><img src="https://readme-typing-svg.herokuapp.com?font=Fira+Code&size=19&pause=1200&color=2E7D32&center=true&vCenter=true&width=760&lines=O+que+acontece+com+12+litros+de+agua+de+uma+vez;Simule+qualquer+e+se...+em+3D;React+%2B+Three.js+%2B+FastAPI+%2B+IA" alt="Typing SVG"/></a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/status-passo_10_ok-green?style=for-the-badge&logo=github" alt="status"/>
  <img src="https://img.shields.io/badge/licenca-MIT-green?style=for-the-badge" alt="license"/>
  <img src="https://img.shields.io/badge/sprint-3_de_4-blue?style=for-the-badge" alt="sprint"/>
  <img src="https://img.shields.io/badge/LLM-gpt_oss_120b-orange?style=for-the-badge" alt="llm"/>
</p>

<p align="center">
  <b>Ferramenta educativa que mostra em texto + modelo 3D o que aconteceria com uma planta ao sofrer um fenomeno qualquer.</b><br/>
  <i>Ex.: "e se eu jogar 12 litros de agua de uma vez no manjericao?" vai dar explicacao biologica + planta 3D murchando e amarelando ao longo dos dias.</i>
</p>

## Indice

- [Sobre](#sobre)
- [Como funciona](#como-funciona)
- [Tecnologias](#tecnologias)
- [Estrutura do projeto](#estrutura-do-projeto)
- [Roadmap](#roadmap)
- [Protocolo de casos extremos](#protocolo-de-casos-extremos)
- [Regra de resolução de modelo](#regra-de-resolução-de-modelo-m-01)
- [Como rodar](#como-rodar)
- [Variaveis de ambiente](#variaveis-de-ambiente)
- [Como testar o parcial do Passo 1](#como-testar-o-parcial-do-passo-1)
- [Equipe](#equipe)
- [Aviso educativo](#aviso-educativo)
- [Licenca](#licenca)

## Sobre

O PlantLab 3D resolve o medo de errar cuidando de plantas. Em vez de manual chato de botanica, o usuario:

1. Identifica a planta (foto ou nome digitado)
2. Descreve um "e se..." em texto livre ("7 dias sem luz?", "12L de agua de uma vez?")
3. Recebe explicacao biologica gerada por LLM (gpt-oss-120b via Groq)
4. Ve um modelo 3D reagindo (murcha, muda de cor, cresce/encolhe, alerta de estresse)
5. Arrasta uma linha do tempo (dia 0 ate dia N) e compara dois cenarios lado a lado

Projeto de feira agora, produto de verdade depois.

## Como funciona

```mermaid
flowchart LR
    U[Usuario foto + e se] --> F[Frontend React + R3F]
    F -->|POST identify-plant| B[Backend FastAPI]
    B -->|foto| P[PlantNet API]
    F -->|POST simulate-event| B
    B --> C[gpt-oss-120b JSON]
    C -->|simulation_params| F
    F --> V[PlantViewer 3D Three.js]
    A[pacote /ai prompts + arquetipos] --> B
```

Exemplo: foto de manjericao vira `Ocimum basilicum` (confianca 0.92, arquetipo `folha_larga`); "12 litros de agua" vira explicacao PT-BR + `{wilt: 0.3, cor: amarelado, crescimento: -0.2, stress: true, dias: 7}`; o modelo `folha_larga.glb` murcha 30%, amarela e mostra alerta.

## Tecnologias

<p align="center">
  <a href="https://skillicons.dev"><img src="https://skillicons.dev/icons?i=react,vite,ts,threejs,python,fastapi,github,vscode&perline=8" alt="tech stack"/></a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-61DAFB?style=flat&logo=react&logoColor=black" alt="react"/>
  <img src="https://img.shields.io/badge/Vite-646CFF?style=flat&logo=vite&logoColor=white" alt="vite"/>
  <img src="https://img.shields.io/badge/TypeScript-3178C6?style=flat&logo=typescript&logoColor=white" alt="ts"/>
  <img src="https://img.shields.io/badge/Three.js-black?style=flat&logo=three.js&logoColor=white" alt="three"/>
  <img src="https://img.shields.io/badge/FastAPI-009688?style=flat&logo=fastapi&logoColor=white" alt="fastapi"/>
  <img src="https://img.shields.io/badge/Python-3776AB?style=flat&logo=python&logoColor=white" alt="python"/>
  <img src="https://img.shields.io/badge/PlantNet-2E7D32?style=flat&logo=leaflet&logoColor=white" alt="plantnet"/>
  <img src="https://img.shields.io/badge/gpt_oss_120b-0467DF?style=flat&logo=openai&logoColor=white" alt="gptoss"/>
  <img src="https://img.shields.io/badge/pytest-0A9EDC?style=flat&logo=pytest&logoColor=white" alt="pytest"/>
</p>

| Camada | Stack | Papel |
|--------|-------|-------|
| `frontend/` | React + Vite + TS, react-three-fiber + drei, recharts | UI + cena 3D + timeline + comparacao A/B |
| `backend/` | FastAPI + uvicorn, httpx, python-multipart, python-dotenv, pytest | Endpoints `/identify-plant` + `/simulate-event`, CORS, rate-limit futuro |
| `ai/` | Prompts versionados, mapa especie-arquetipo, testes de prompt | Cerebro biologico, importado pelo backend a partir do Passo 5/6 |

## Estrutura do projeto

Sempre mantemos as 3 pastas raiz: `frontend`, `backend`, `ai`.

```text
PlantLab/
├── README.md
├── LICENSE
├── .gitignore
├── frontend/                  # React + Vite + TS + R3F
│   ├── src/
│   │   ├── App.tsx              # tela principal
│   │   ├── api.ts               # cliente do backend
│   │   ├── components/PlantViewer.tsx  # cena 3D animada (Passos 8-10)
│   │   ├── components/effects.ts     # matematica dos efeitos (murcha/cor/escala)
│   │   ├── components/models.ts      # biblioteca .glb + Regra M-01
│   │   └── main.tsx
│   ├── e2e/smoke-3d.mjs         # teste headless do 3D (Playwright)
│   ├── public/models/         # suculenta.glb (CC0 Quaternius) + LEIAME.txt
│   └── package.json
├── backend/                   # FastAPI (Passo 3: /health + stubs mockados)
│   ├── main.py
│   ├── requirements.txt
│   ├── tests/test_endpoints.py  # pytest: 10 testes (sucesso + 400)
│   └── .env.example
└── ai/                        # Pacote IA separado
    ├── __init__.py
    ├── archetypes.py          # ARCHETYPE_VALUES + normalize_archetype()
    └── prompts/
        ├── simulate_event.md
        └── protocolo_casos_extremos.md  # Protocolo E-01 (casos extremos)
```

## Roadmap

### SPRINT 1 — Fundacao

- [x] **Passo 1 — Setup do monorepo** (Vite react-ts + FastAPI /health + README como rodar)
- [x] **Passo 2 — Layout base** (header, upload com preview, textarea e se, botao Simular, placeholder resultado)
- [x] **Passo 3 — Endpoints stub** (`POST /identify-plant` + `POST /simulate-event` mock + pytest 10/10)
- [x] **Passo 4 — Conectar front e back (mock)** (identificar + simular reais, loading, erro amigavel)

### SPRINT 2 — Inteligencia real

- [x] **Passo 5 — PlantNet real** (foto vira especie + confianca + arquetipo; fallback p/ nome sem chave)
- [x] **Passo 6 — LLM real (gpt-oss-120b)** (evento livre vira `{explanation, simulation_params}` JSON estrito, inclui Protocolo E-01)
- [x] **Passo 7 — Refino fluxo real** (timeout 45s/75s, erros traduzidos sem jargao, alerta confianca < 0.5, loading em estagios)

### SPRINT 3 — O modelo 3D

- [x] **Passo 8 — R3F + placeholder** (`<PlantViewer/>` com luz + OrbitControls + smoke headless)
- [x] **Passo 9 — .glb reais** (M-01: `suculenta.glb` CC0 + fallback, `useGLTF`, ErrorBoundary, auto-fit, e2e swap)
- [x] **Passo 10 — Animar pela simulacao** (murcha/cor/escala/stress suaves via `useFrame`, E-01, badge + glow)

### SPRINT 4 — Timeline, comparacao e polish

- [ ] **Passo 11 — Timeline** (slider dia 0-N com interpolacao)
- [ ] **Passo 12 — Comparacao A/B** (2 viewers + grafico recharts)
- [ ] **Passo 13 — Polish feira** (banner educativo, loading unico, Nova simulacao, mobile)

### FASE 2 — Pos-feira

- [ ] ESP32 + sensores (umidade, temp, luz) e digital twin real x simulado

## Protocolo de casos extremos

**Protocolo E-01 — todo "e se..." merece resposta a altura.** O usuario nem sempre esta
brincando, e mesmo quando esta, a resposta certa educa sem moralismo.

1. **Levar a serio:** responder o cenario de forma literal — o que aconteceria de verdade
   com a planta (ex.: jogada no rio, jogada no sol extremo).
2. **Sem recusa e sem sermao:** explicar as consequencias fisicas e biologicas de forma
   direta, educativa e com leveza.
3. **Animacao dedicada quando viavel:** mapear o evento para uma animacao especifica do
   modelo 3D (ex.: submersao e arrasto no rio; ressecamento e queimadura no sol) +
   explicacao correspondente.
4. **Fallback honesto:** sem animacao especifica, usar estresse generico no nivel maximo
   coerente + explicacao cobrindo o cenario.
5. **Seguranca e ambiente:** se houver risco a pessoas, animais ou ao ambiente (ex.:
   planta toxica em rio), incluir aviso breve. Informar, nunca incentivar.

Detalhe operacional em `ai/prompts/protocolo_casos_extremos.md` (16 casos em 5 grupos:
agua e liquidos, temperatura extrema, quimica domestica, fisica e mecanica, ambiente —
ex.: mar, agua fervendo, fogo, freezer, agua sanitaria, oleo, micro-ondas, queda,
escuro total). Executado no
**Passo 6** (LLM trata extremos sem recusa) e no **Passo 10** (mapa evento-animacao
especial + fallback), com casos de grupos distintos em cada bateria de testes.

## Regra de resolução de modelo (M-01)

**Regra M-01 — sempre mostrar uma planta, nunca tela vazia.** Ao identificar, o frontend
resolve o modelo da biblioteca (`frontend/public/models/`) assim:

1. **Exato:** existe o `.glb` do `archetype` vindo do backend → usa ele.
2. **Mais próximo:** não existe → usa o vizinho visual mais parecido, nesta ordem:
   `arbustiva ↔ arvore_pequena`, `graminea → arbustiva`, `suculenta → folha_larga`.
3. **Default:** nenhum vizinho disponível → `folha_larga` (sempre presente).

Sequência no tempo: o **Passo 9** implementa esta regra com os modelos **estáticos**
(só troca o modelo, sem reação). As **consequências visuais** da simulação
(murcha, cor, escala, estresse — inclusive E-01) entram no **Passo 10**, que anima
qualquer modelo resolvido pela M-01, inclusive o default.

## Como rodar

Dois terminais separados.

**Terminal 1 — Backend (http://localhost:8000):**

```bash
cd backend
pip install -r requirements.txt
python -m uvicorn main:app --reload
```

Docs: http://localhost:8000/docs | Health: http://localhost:8000/health

**Terminal 2 — Frontend (http://localhost:5173):**

```bash
cd frontend
npm install
npm run dev
```

Nota Windows: se o PowerShell bloquear `npm` com erro de ExecutionPolicy, rode uma vez como Admin `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`, ou use `cmd /c "npm run dev"`.

## Variaveis de ambiente

Copie `backend/.env.example` para `backend/.env` (nunca commite o `.env`):

```env
PLANTNET_API_KEY=
LLM_PROVIDER=groq
LLM_MODEL=openai/gpt-oss-120b
LLM_API_KEY=
```

| Chave | Onde conseguir | Quando precisa |
|-------|----------------|----------------|
| `PLANTNET_API_KEY` | my.plantnet.org (conta gratuita) | Passo 5 em diante |
| `LLM_API_KEY` | provedor do LLM (Groq, Together ou OpenRouter) | Passo 6 em diante |

Ate o Passo 4 nenhuma chave e necessaria (usamos mocks). No Passo 5, a identificacao
por foto precisa da chave; sem ela o backend usa o nome digitado (fallback).

### Chave do PlantNet (gratuita)

1. Crie a conta em https://my.plantnet.org e confirme o e-mail.
2. Gere a API key no painel e copie.
3. Cole em `backend/.env` como `PLANTNET_API_KEY=sua_chave` (crie a partir do `.env.example`).
4. Reinicie o uvicorn e teste em `/docs` com uma foto real.

Limites gratuitos podem mudar — confira em my.plantnet.org. Para economizar quota nos
testes automatizados, os pytest usam a API mockada; a chamada real so acontece ao vivo.

### Chave do LLM (Passo 6)

1. Crie a conta no provedor (recomendado: https://console.groq.com — tem plano gratuito).
2. Gere a API key e copie.
3. Em `backend/.env`: `LLM_PROVIDER=groq`, `LLM_MODEL=openai/gpt-oss-120b`, `LLM_API_KEY=sua_chave`.
4. Reinicie o uvicorn e teste em `/docs` com especie + evento (ex.: manjericao x excesso de agua,
   cacto x excesso de agua — as respostas devem diferir e fazer sentido biologico).

Provedores suportados: `groq`, `together`, `openrouter` (todos via `LLM_PROVIDER`; sem
`LLM_MODEL` usa o padrao do provedor). Sem chave, o endpoint responde 502 claro — e os
pytest nunca gastam credito (LLM sempre mockado).

## Como testar o parcial do Passo 1

1. Suba o backend: `cd backend` + `python -m uvicorn main:app --reload`, abra http://localhost:8000/health e confira `{"status":"ok"}`; abra http://localhost:8000/docs e veja `GET /health` e `GET /` listados.
2. Suba o frontend: `cd frontend` + `npm run dev`, abra http://localhost:5173 e confira a tela padrao do Vite + React + TS sem erro no console (F12).
3. Teste de queda: derrube o backend (Ctrl+C) e recarregue o `/docs` para ver erro de conexao esperado; o frontend deve continuar abrindo normalmente isolado.
4. Teste rapido por codigo: `npm run build` no frontend passa (tsc + vite); `TestClient(app).get("/health")` no backend retorna 200.

Tudo isso foi executado aqui e passou: TestClient 200 `{"status":"ok"}`, CORS liberado para localhost:5173, uvicorn live 200, vite dev live 200, `npm run build` em 613ms sem erro.

## Equipe

Bryan Moreira, Leonardo Alves, Renan Mobrise, Gabriel Rossi, Luis Pedro, Keliyah Cristine.

## Aviso educativo

> PlantLab 3D e uma ferramenta educativa. As simulacoes sao aproximacoes baseadas em IA e nao substituem experimentos reais nem recomendacoes agronomicas profissionais.

## Licenca

MIT — veja [LICENSE](LICENSE).

<img width="100%" src="https://capsule-render.vercel.app/api?type=waving&color=0:66BB6A,100:1B5E20&height=140&section=footer&text=Regue%20com%20amor,%20simule%20sem%20medo&fontSize=20&fontColor=ffffff&animation=fadeIn" alt="PlantLab footer"/>

<p align="center">
  <img src="https://img.shields.io/badge/feito_com-_e_-brightgreen?style=flat" alt="made with love"/>
</p>
