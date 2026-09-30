/** Biblioteca de modelos 3D + Regra M-01 (Passo 9).
 *
 * Para adicionar um modelo: baixe um .glb CC0 (Poly Pizza/Sketchfab), salve em
 * frontend/public/models/<arquetipo>.glb e registre em ARCHETYPE_FILES abaixo.
 * Sem o arquivo exato, resolveModelUrl usa o vizinho mais próximo; sem nenhum,
 * devolve null e o viewer mostra o placeholder procedural (nunca quebra).
 */

export const ARCHETYPE_FILES: Record<string, string> = {
  suculenta: '/models/suculenta.glb',
  folha_larga: '/models/folha_larga.glb',
  arbustiva: '/models/arbustiva.glb',
  graminea: '/models/graminea.glb',
  arvore_pequena: '/models/arvore_pequena.glb',
}

/** Vizinhos visuais por arquétipo (Regra M-01, passo 2). */
const PROXIMITY: Record<string, string[]> = {
  suculenta: ['folha_larga'],
  folha_larga: [],
  arbustiva: ['arvore_pequena', 'folha_larga'],
  graminea: ['arbustiva', 'folha_larga'],
  arvore_pequena: ['arbustiva', 'folha_larga'],
}

export function resolveModelUrl(archetype?: string): string | null {
  const key = archetype ?? ''
  const chain = [key, ...(PROXIMITY[key] ?? ['folha_larga'])]
  for (const candidate of chain) {
    const url = ARCHETYPE_FILES[candidate]
    if (url) return url
  }
  return null
}
