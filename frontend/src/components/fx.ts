/** Efeitos especiais por tipo de evento (Passo 10+ / E-01).
 * detectSpecialFx lê o texto livre do usuário e devolve o efeito característico
 * (fogo de verdade, submersão de verdade...) ou null (cai no sistema genérico
 * de murcha/cor/escala). Puro e testável em Node, sem WebGL.
 */

export type FxKind =
  | 'fire' | 'water' | 'flood' | 'heat' | 'drought' | 'frost' | 'fall' | 'dark' | 'microwave'
  | 'soil' | 'nutrient' | 'care' | 'wind' | 'pests' | 'sunlight'
  | 'rain' | 'pruning' | 'repot' | 'pollination' | 'bloom' | 'chemical' | 'hail' | 'compost'

export const FX_KINDS: FxKind[] = [
  'fire', 'water', 'flood', 'heat', 'drought', 'frost', 'fall', 'dark', 'microwave',
  'soil', 'nutrient', 'care', 'wind', 'pests', 'sunlight',
  'rain', 'pruning', 'repot', 'pollination', 'bloom', 'chemical', 'hail', 'compost',
]

export const FX_META: Record<FxKind, { icon: string; label: string }> = {
  fire: { icon: '🔥', label: 'pegando fogo' },
  water: { icon: '🌊', label: 'submersa no rio' },
  flood: { icon: '🚿', label: 'recebendo uma inundação' },
  heat: { icon: '☀️', label: 'torrando no calor' },
  drought: { icon: '🏜️', label: 'desidratando sem água' },
  frost: { icon: '❄️', label: 'congelada' },
  fall: { icon: '💥', label: 'tombada' },
  dark: { icon: '🌙', label: 'no escuro' },
  microwave: { icon: '⚡', label: 'no micro-ondas' },
  soil: { icon: '🪨', label: 'em solo ruim' },
  nutrient: { icon: '🧪', label: 'com excesso de fertilizante' },
  care: { icon: '✨', label: 'bem cuidada e florescendo' },
  wind: { icon: '💨', label: 'sob vento forte' },
  pests: { icon: '🐛', label: 'com pragas nas folhas' },
  sunlight: { icon: '🌤️', label: 'recebendo luz adequada' },
  rain: { icon: '🌦️', label: 'tomando uma chuva leve' },
  pruning: { icon: '✂️', label: 'sendo podada' },
  repot: { icon: '🪴', label: 'sendo transplantada' },
  pollination: { icon: '🐝', label: 'sendo polinizada' },
  bloom: { icon: '🌸', label: 'florescendo' },
  chemical: { icon: '☣️', label: 'exposta a produto químico' },
  hail: { icon: '🧊', label: 'sob uma chuva de granizo' },
  compost: { icon: '🍂', label: 'recebendo composto orgânico' },
}

function norm(text: string): string {
  const lower = text.toLowerCase()
  let out = ''
  for (const ch of lower.normalize('NFD')) {
    const code = ch.charCodeAt(0)
    if (code < 0x300 || code > 0x36f) out += ch
  }
  return ` ${out.replace(/[^a-z0-9\s-]+/g, ' ')} `
}

/** stems = substring; words = palavra inteira (evita "solo"→sol, "frio"→rio). */
interface FxRule {
  kind: FxKind
  stems: string[]
  words: string[]
}

/** Ordem = prioridade em caso de colisão ("jogar no rio em dia de sol" → água). */
const RULES: FxRule[] = [
  { kind: 'microwave', stems: ['micro-ondas', 'microondas', 'micro ondas'], words: [] },
  { kind: 'chemical', stems: ['agua sanitaria', 'agua de lavadeira', 'cloro', 'detergente', 'produto de limpeza', 'solvente', 'desinfetante', 'querosene', 'veneno', 'herbicida', 'pesticida'], words: [] },
  { kind: 'fire', stems: ['fogo', 'chama', 'queim', 'incendi', 'brasa', 'fogueira', 'carboniz'], words: [] },
  { kind: 'hail', stems: ['granizo', 'pedras de gelo', 'chuva de gelo'], words: [] },
  { kind: 'flood', stems: ['700l', '700 l', 'litros de uma vez', 'litros de agua', 'jogar agua', 'solo encharcado', 'vaso encharcado', 'encharcamento', 'alagamento', 'alagou', 'inund', 'mangueira', 'balde de agua', 'torneira aberta', 'excesso de agua', 'chuva torrencial'], words: [] },
  {
    kind: 'water',
    stems: ['submers', 'afog', 'mergulh', 'enchente', 'jogar no rio', 'cair no rio', 'dentro do rio', 'fundo do rio', 'debaixo da agua', 'debaixo d agua'],
    words: [' rio ', ' mar ', ' oceano ', ' lagoa ', ' piscina '],
  },
  { kind: 'bloom', stems: ['florescendo', 'florindo', 'abrindo flores', 'brotando', 'primeira flor', 'deu flores'], words: [] },
  { kind: 'care', stems: ['cuidei certinho', 'cuidada', 'cuidado ideal', 'regar na medida', 'rotina perfeita', 'ambiente ideal', 'bem cuidada', 'cuidados corretos', 'condicoes ideais'], words: [] },
  { kind: 'compost', stems: ['composto organico', 'compostagem', 'humus de minhoca', 'adubo equilibrado', 'adubacao correta', 'fertilizante na dose certa'], words: [] },
  { kind: 'pruning', stems: ['podar', 'poda', 'podei', 'tesoura de poda', 'cortei as folhas', 'cortar folhas', 'retirar folhas velhas'], words: [] },
  { kind: 'repot', stems: ['transplant', 'replant', 'mudar de vaso', 'trocar de vaso', 'vaso maior', 'novo vaso', 'trocar o substrato'], words: [] },
  { kind: 'pollination', stems: ['poliniz', 'abelhas', 'borboletas', 'beija-flor', 'polen'], words: [] },
  { kind: 'rain', stems: ['chuva leve', 'garoa', 'chuvisco', 'chuvinha', 'chuva moderada'], words: [] },
  { kind: 'nutrient', stems: ['fertiliz', 'adubo', 'nutriente', 'nitrogenio', 'fosforo', 'potassio', 'salin', 'esterco'], words: [] },
  { kind: 'pests', stems: ['praga', 'pulg', 'cochonilha', 'lagarta', 'aranha-vermelha', 'fungo', 'mofo', 'oídio', 'oidio', 'ferrugem', 'comida por inseto'], words: [] },
  { kind: 'wind', stems: ['vento', 'ventania', 'furacao', 'tempestade', 'vendaval', 'corrente de ar'], words: [] },
  { kind: 'soil', stems: ['terra ruim', 'solo ruim', 'solo compact', 'terra compact', 'sem drenagem', 'areia pura', 'barro pesado', 'trocar o substrato', 'terra seca', 'solo pobre', 'raiz apertada', 'vaso pequeno'], words: [] },
  { kind: 'sunlight', stems: ['luz adequada', 'sol da manha', 'luz indireta', 'lugar iluminado', 'janela clara', 'fotossintese', 'luz de cultivo'], words: [] },
  { kind: 'drought', stems: ['sem agua', 'falta de agua', 'falta d agua', 'nao reguei', 'esqueci de regar', 'sem regar', 'dias sem rega', 'solo seco', 'terra seca', 'terra ficou seca', 'desidrat'], words: [] },
  { kind: 'frost', stems: ['gelo', 'freezer', 'congel', 'geada', 'neve', 'frio', 'resfri'], words: [] },
  {
    kind: 'fall',
    stems: ['varanda', 'queda', 'tombo', 'derrub', 'escada', 'jogar de cima', 'jogar da', 'do alto'],
    words: [' altura ', ' chao '],
  },
  {
    kind: 'dark',
    stems: ['escuro', 'breu', 'porao', 'armario', 'caixa fechada', 'total escuridao', 'sem luz'],
    words: [],
  },
  {
    kind: 'heat',
    stems: ['torr', 'calor', 'estufa', 'ressec', 'carro fechado', 'luz direta'],
    words: [' sol '],
  },
]

export function detectSpecialFx(eventDescription: string): FxKind | null {
  const text = norm(eventDescription || '')
  if (text.trim().length < 2) return null
  for (const rule of RULES) {
    if (rule.stems.some((s) => text.includes(s))) return rule.kind
    if (rule.words.some((w) => text.includes(w))) return rule.kind
  }
  return null
}
