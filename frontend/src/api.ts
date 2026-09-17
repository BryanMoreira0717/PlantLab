/** Cliente HTTP do backend PlantLab 3D (Passo 4: endpoints ainda mockados).
 * Base fixa em http://localhost:8000 — virar variável de ambiente no Passo 7.
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

const CONNECTION_ERROR =
  'Não consegui falar com o backend. Confira se ele está rodando: abra um terminal em backend e rode "python -m uvicorn main:app --reload".'

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

export async function identifyPlant(image: File | null, plantName: string): Promise<Identification> {
  const form = new FormData()
  if (image) form.append('image', image)
  if (plantName.trim()) form.append('plant_name', plantName.trim())

  let res: Response
  try {
    res = await fetch(`${API_BASE}/identify-plant`, { method: 'POST', body: form })
  } catch {
    // fetch só lança exceção em falha de rede/CORS/backend fora do ar
    throw new Error(CONNECTION_ERROR)
  }
  if (!res.ok) throw new Error(await readError(res, 'Não foi possível identificar a planta. Tente de novo.'))
  return (await res.json()) as Identification
}

export async function simulateEvent(species: string, event: string): Promise<Simulation> {
  let res: Response
  try {
    res = await fetch(`${API_BASE}/simulate-event`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ species_scientific_name: species, event_description: event }),
    })
  } catch {
    // fetch só lança exceção em falha de rede/CORS/backend fora do ar
    throw new Error(CONNECTION_ERROR)
  }
  if (!res.ok) throw new Error(await readError(res, 'Não foi possível rodar a simulação. Tente de novo.'))
  return (await res.json()) as Simulation
}
