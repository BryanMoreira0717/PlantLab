/** Matemática pura dos efeitos visuais (Passo 10).
 * Separada do useFrame para ser testável em Node sem WebGL.
 * Contratos: escala de crescimento sempre em [0.8, 1.2]; murcha só achata
 * (nunca inverte); cor desconhecida = sem mudança (null).
 */

export const TINTS: Record<string, string> = {
  amarelado: '#c9a227',
  amarronzado: '#8d5a2b',
  verde_escuro: '#1b5e20',
  verde_claro: '#7bc47f',
}

export function clamp01(value: number): number {
  if (Number.isNaN(value)) return 0
  return Math.min(1, Math.max(0, value))
}

export function clampGrowth(value: number): number {
  if (Number.isNaN(value)) return 0
  return Math.min(1, Math.max(-1, value))
}

/** Escala uniforme do grupo externo: 0.8x (muito prejudicado) a 1.2x. */
export function growthScale(growthRateChange: number): number {
  return 1 + 0.2 * clampGrowth(growthRateChange)
}

/** Achatamento vertical do grupo interno (murcha): 1 (saudável) a 0.7. */
export function wiltScaleY(wiltLevel: number): number {
  return 1 - 0.3 * clamp01(wiltLevel)
}

/** Inclinação lateral da murcha, em radianos: 0 a ~0.12. */
export function wiltTilt(wiltLevel: number): number {
  return 0.12 * clamp01(wiltLevel)
}

/** Hex da cor-alvo ou null quando não há mudança. */
export function tintTarget(leafColorShift: string): string | null {
  return TINTS[leafColorShift] ?? null
}
