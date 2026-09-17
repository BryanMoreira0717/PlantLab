/** Cliente HTTP do backend PlantLab 3D (Passo 7: erros traduzidos + timeout).
 * Base fixa em http://localhost:8000 — virar variável de ambiente depois.
 * Regra de UX: nenhum detalhe técnico vaza para a tela (sem HTTP, sem py).
 */

export interface Identification {
  species_common_name: string
  species_scientific_name: string
  confidence: number
  archetype: string
}

export interface SimulationParams {
  wilt_level: number
  leaf_color_shift: string
  growth_rate_change: number
  stress_flag: boolean
  timeline_days: number
}

export interface Simulation {
  explanation: string
  simulation_params: SimulationParams
}

const API_BASE = 'http://localhost:8000'

// Servidor aguenta 25s (PlantNet) e 60s (LLM); cliente dá uma margem acima.
const IDENTIFY_TIMEOUT_MS = 45_000
const SIMULATE_TIMEOUT_MS = 75_000

const CONNECTION_ERROR =
  'Não consegui falar com o backend. Confira se ele está rodando: abra um terminal em backend e rode "python -m uvicorn main:app --reload".'

const IDENTIFY_FAILED =
  'Não consegui identificar pela foto agora. Tente outra foto mais nítida ou digite o nome da planta.'
const IDENTIFY_TIMEOUT =
  'A identificação demorou demais. Tente uma foto menor ou digite o nome da planta.'
const SIMULATE_FAILED =
  'A IA não respondeu a tempo. Aguarde alguns instantes e clique em Simular de novo.'
const SERVER_ERROR = 'Algo deu errado no servidor. Tente de novo em instantes.'

/** fetch com timeout real (AbortController). Estoura TimeoutError amigável. */
async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  ms: number,
  timeoutMessage: string,
): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), ms)
  try {
    return await fetch(url, { ...init, signal: controller.signal })
  } catch {
    // abort() = timeout; qualquer outro erro = rede/CORS/backend fora do ar
    throw new Error(controller.signal.aborted ? timeoutMessage : CONNECTION_ERROR)
  } finally {
    clearTimeout(timer)
  }
}

/** Extrai o `detail` de um erro HTTP do FastAPI, com fallback amigável. */
async function readError(res: Response, fallback: string): Promise<string> {
  try {
    const data: unknown = await res.json()
    if (data !== null && typeof data === 'object' && 'detail' in data) {
      const detail = (data as { detail: unknown }).detail
      if (typeof detail === 'string' && detail) return detail
    }
  } catch {
    /* corpo fora do padrão — usa o fallback */
  }
  return fallback
}

/** 400 mostra o motivo acionável do backend; 502 vira texto leigo; resto genérico. */
async function throwFriendly(res: Response, failedMessage: string, fallback400: string): Promise<never> {
  if (res.status === 502) throw new Error(failedMessage)
  if (res.status === 400) throw new Error(await readError(res, fallback400))
  throw new Error(SERVER_ERROR)
}

export async function identifyPlant(image: File | null, plantName: string): Promise<Identification> {
  const form = new FormData()
  if (image) form.append('image', image)
  if (plantName.trim()) form.append('plant_name', plantName.trim())

  const res = await fetchWithTimeout(
    `${API_BASE}/identify-plant`,
    { method: 'POST', body: form },
    IDENTIFY_TIMEOUT_MS,
    IDENTIFY_TIMEOUT,
  )
  if (!res.ok) await throwFriendly(res, IDENTIFY_FAILED, 'Não foi possível identificar. Envie uma foto ou digite o nome.')
  return (await res.json()) as Identification
}

export async function simulateEvent(species: string, event: string): Promise<Simulation> {
  const res = await fetchWithTimeout(
    `${API_BASE}/simulate-event`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ species_scientific_name: species, event_description: event }),
    },
    SIMULATE_TIMEOUT_MS,
    SIMULATE_FAILED,
  )
  if (!res.ok) await throwFriendly(res, SIMULATE_FAILED, 'Não foi possível simular. Confira os dados e tente de novo.')
  return (await res.json()) as Simulation
}
