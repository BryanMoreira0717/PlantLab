import type { ReactNode } from 'react'

/** Modelos botânicos procedurais próprios para espécies frequentes nos testes.
 *  São malhas Three.js reais (caule, folhas e flores), sem imagens ou downloads. */
export type SpeciesModelKind =
  | 'basil' | 'monstera' | 'sunflower' | 'rose' | 'fern'
  | 'orchid' | 'tomato' | 'aloe' | 'lavender' | 'bamboo' | 'citrus'

function Leaf({ at, angle = 0, color = '#388e3c', size = 1 }: {
  at: [number, number, number]
  angle?: number
  color?: string
  size?: number
}) {
  return (
    <mesh position={at} rotation={[0.15, angle, -angle * 0.72]} scale={[0.42 * size, 0.12 * size, 0.23 * size]} castShadow>
      <sphereGeometry args={[1, 18, 12]} />
      <meshStandardMaterial color={color} roughness={0.72} />
    </mesh>
  )
}

function Stem({ height = 1.25, color = '#4d8b3a' }: { height?: number; color?: string }) {
  return <mesh position={[0, 0.72 + height / 2, 0]} castShadow><cylinderGeometry args={[0.035, 0.065, height, 10]} /><meshStandardMaterial color={color} roughness={0.86} /></mesh>
}

function Basil() {
  return <group>
    <Stem height={1.05} />
    {Array.from({ length: 9 }, (_, i) => {
      const y = 1.03 + Math.floor(i / 2) * 0.28
      const side = i % 2 ? -1 : 1
      return <Leaf key={i} at={[side * (0.3 + (i % 3) * 0.04), y, (i % 3 - 1) * 0.16]} angle={side * 0.55} color={i % 2 ? '#2e7d32' : '#43a047'} size={0.9 + (i % 3) * 0.12} />
    })}
    <mesh position={[0, 1.9, 0]}><sphereGeometry args={[0.12, 14, 10]} /><meshStandardMaterial color="#8bc34a" /></mesh>
  </group>
}

function Monstera() {
  return <group>
    <Stem height={1.45} />
    {Array.from({ length: 7 }, (_, i) => {
      const a = i * (Math.PI * 2 / 7)
      const y = 1.18 + (i % 3) * 0.27
      return <group key={i} position={[Math.cos(a) * 0.38, y, Math.sin(a) * 0.32]} rotation={[0.12, -a, (i % 2 ? -1 : 1) * 0.24]}>
        <mesh scale={[0.36, 0.12, 0.48]} castShadow><sphereGeometry args={[1, 20, 14]} /><meshStandardMaterial color={i % 2 ? '#2e7d32' : '#388e3c'} roughness={0.76} side={2} /></mesh>
        <mesh position={[0, 0.008, 0]} scale={[0.025, 0.015, 0.42]}><sphereGeometry args={[1, 8, 8]} /><meshStandardMaterial color="#9ccc65" /></mesh>
      </group>
    })}
  </group>
}

function Sunflower() {
  const petals = Array.from({ length: 14 }, (_, i) => {
    const a = i * Math.PI * 2 / 14
    return <mesh key={i} position={[Math.cos(a) * 0.27, 2.13, Math.sin(a) * 0.27]} rotation={[0, -a, 0.25]} scale={[0.16, 0.065, 0.31]} castShadow>
      <sphereGeometry args={[1, 14, 10]} /><meshStandardMaterial color={i % 2 ? '#ffc928' : '#ffdc51'} roughness={0.65} />
    </mesh>
  })
  return <group>
    <Stem height={1.45} />
    <Leaf at={[-0.34, 1.16, 0]} angle={-0.7} color="#398b38" />
    <Leaf at={[0.34, 1.48, 0.05]} angle={0.7} color="#43a047" />
    {petals}
    <mesh position={[0, 2.13, 0]}><sphereGeometry args={[0.2, 20, 16]} /><meshStandardMaterial color="#704214" roughness={1} /></mesh>
  </group>
}

function Rose() {
  const petals = Array.from({ length: 12 }, (_, i) => {
    const a = i * Math.PI * 2 / 12
    return <mesh key={i} position={[Math.cos(a) * 0.12, 1.98 + (i % 2) * 0.045, Math.sin(a) * 0.12]} rotation={[0.2, -a, 0.35]} scale={[0.17, 0.11, 0.2]}>
      <sphereGeometry args={[1, 14, 10]} /><meshStandardMaterial color={i % 2 ? '#c62845' : '#e84b68'} roughness={0.6} />
    </mesh>
  })
  return <group>
    <Stem height={1.3} />
    <Leaf at={[-0.28, 1.05, 0]} angle={-0.7} />
    <Leaf at={[0.27, 1.42, 0.02]} angle={0.6} color="#2e7d32" />
    {petals}
    <mesh position={[0, 2, 0]}><sphereGeometry args={[0.105, 16, 12]} /><meshStandardMaterial color="#f06292" /></mesh>
  </group>
}

function Fern() {
  const fronds = Array.from({ length: 8 }, (_, i) => {
    const a = i * Math.PI / 4
    const leaflets: ReactNode[] = []
    for (let j = 0; j < 5; j++) {
      const t = j / 5
      const r = 0.2 + t * 0.48
      const y = 0.92 + t * 0.96
      leaflets.push(<Leaf key={j} at={[Math.cos(a) * r, y, Math.sin(a) * r]} angle={a + (j % 2 ? 0.7 : -0.7)} color={j % 2 ? '#2e7d32' : '#43a047'} size={0.6} />)
    }
    return <group key={i}>
      <mesh position={[Math.cos(a) * 0.32, 1.43, Math.sin(a) * 0.32]} rotation={[0, -a, 0.25]}><cylinderGeometry args={[0.012, 0.025, 1.05, 7]} /><meshStandardMaterial color="#4d8b3a" /></mesh>
      {leaflets}
    </group>
  })
  return <group>{fronds}<mesh position={[0, 0.98, 0]}><cylinderGeometry args={[0.25, 0.19, 0.5, 12]} /><meshStandardMaterial color="#4b3428" /></mesh></group>
}

function Orchid() {
  return <group>
    <Stem height={1.35} color="#658c4b" />
    {Array.from({ length: 4 }, (_, i) => {
      const a = i * Math.PI / 2
      return <Leaf key={i} at={[Math.cos(a) * 0.32, 0.94, Math.sin(a) * 0.32]} angle={a} color="#43834a" size={1.25} />
    })}
    {[1.55, 1.83, 2.1].map((y, i) => <group key={i} position={[0.12 + i * 0.08, y, 0]}>
      {Array.from({ length: 5 }, (_, j) => {
        const a = j * Math.PI * 2 / 5
        return <mesh key={j} position={[Math.cos(a) * 0.13, Math.sin(a) * 0.1, 0]} rotation={[0, 0, -a]} scale={[0.12, 0.19, 0.07]}>
          <sphereGeometry args={[1, 12, 10]} /><meshStandardMaterial color={j % 2 ? '#e7b4dc' : '#f5d8ed'} roughness={0.5} />
        </mesh>
      })}
      <mesh position={[0, 0, 0.06]}><sphereGeometry args={[0.07, 12, 10]} /><meshStandardMaterial color="#d6a52c" /></mesh>
    </group>)}
  </group>
}

function Tomato() {
  return <group>
    <Stem height={1.42} />
    {Array.from({ length: 7 }, (_, i) => <Leaf key={i} at={[Math.sin(i * 2.4) * 0.4, 1.05 + (i % 4) * 0.22, Math.cos(i * 2.4) * 0.28]} angle={i * 0.8} color="#3e8b3e" size={0.8} />)}
    {[[0.26, 1.23, 0.18], [-0.26, 1.62, -0.05], [0.15, 1.92, -0.12]].map(([x, y, z], i) => <group key={i} position={[x, y, z]}>
      <mesh castShadow><sphereGeometry args={[0.16, 18, 14]} /><meshStandardMaterial color={i === 2 ? '#e95b43' : '#d94332'} roughness={0.5} /></mesh>
      <mesh position={[0, 0.15, 0]}><coneGeometry args={[0.06, 0.11, 5]} /><meshStandardMaterial color="#498744" /></mesh>
    </group>)}
  </group>
}

function Aloe() {
  return <group>
    {Array.from({ length: 11 }, (_, i) => {
      const a = i * Math.PI * 2 / 11
      const length = 0.75 + (i % 4) * 0.12
      return <mesh key={i} position={[Math.cos(a) * 0.24, 0.94 + length * 0.42, Math.sin(a) * 0.24]} rotation={[Math.cos(a) * 0.12, -a, -Math.sin(a) * 0.28]} scale={[0.14, length, 0.1]} castShadow>
        <coneGeometry args={[0.75, 1, 8]} /><meshStandardMaterial color={i % 2 ? '#4f9b76' : '#67ad83'} roughness={0.55} />
      </mesh>
    })}
    <mesh position={[0, 0.82, 0]}><cylinderGeometry args={[0.2, 0.28, 0.25, 12]} /><meshStandardMaterial color="#547c53" /></mesh>
  </group>
}

function Lavender() {
  return <group>
    {Array.from({ length: 7 }, (_, i) => {
      const a = i * Math.PI * 2 / 7
      const x = Math.cos(a) * 0.18
      const z = Math.sin(a) * 0.18
      return <group key={i}>
        <mesh position={[x * 1.5, 1.35, z * 1.5]} rotation={[0, 0, x * 0.3]}><cylinderGeometry args={[0.012, 0.026, 1.2, 7]} /><meshStandardMaterial color="#588044" /></mesh>
        {Array.from({ length: 5 }, (_, j) => <mesh key={j} position={[x * (1.5 + j * 0.16), 1.65 + j * 0.1, z * (1.5 + j * 0.16)]} scale={[0.07, 0.09, 0.07]}>
          <sphereGeometry args={[1, 10, 8]} /><meshStandardMaterial color={j % 2 ? '#8e63b0' : '#a87ac4'} roughness={0.55} />
        </mesh>)}
        <Leaf at={[x - 0.18, 1.02, z]} angle={a} color="#688b48" size={0.58} />
      </group>
    })}
  </group>
}

function Bamboo() {
  return <group>
    {[-0.28, 0, 0.28].map((x, i) => <group key={i} position={[x, 0, (i - 1) * 0.15]}>
      {[0.25, 0.68, 1.11, 1.54].map((y) => <mesh key={y} position={[0, y + 0.18, 0]} castShadow>
        <cylinderGeometry args={[0.045, 0.052, 0.38, 9]} /><meshStandardMaterial color="#6b9c46" roughness={0.65} />
      </mesh>)}
      {[0.65, 1.2, 1.72].map((y, j) => <mesh key={j} position={[0, y, 0]}><torusGeometry args={[0.05, 0.012, 5, 10]} /><meshStandardMaterial color="#aec56a" /></mesh>)}
      <Leaf at={[x > 0 ? 0.3 : -0.3, 1.72, 0]} angle={x > 0 ? 0.7 : -0.7} color="#4c8b40" size={0.8} />
      <Leaf at={[x > 0 ? -0.25 : 0.25, 1.85, 0.05]} angle={x > 0 ? -0.5 : 0.5} color="#68a64e" size={0.7} />
    </group>)}
  </group>
}

function Citrus() {
  return <group>
    <mesh position={[0, 1.13, 0]} castShadow><cylinderGeometry args={[0.09, 0.14, 0.92, 9]} /><meshStandardMaterial color="#765239" roughness={1} /></mesh>
    {Array.from({ length: 9 }, (_, i) => {
      const a = i * Math.PI * 2 / 9
      const x = Math.cos(a) * 0.42
      const z = Math.sin(a) * 0.4
      return <group key={i}>
        <mesh position={[x, 1.75 + (i % 3) * 0.14, z]} scale={[0.42, 0.4, 0.4]} castShadow><sphereGeometry args={[1, 14, 11]} /><meshStandardMaterial color={i % 2 ? '#327d38' : '#408b3c'} roughness={0.82} /></mesh>
        {i % 2 === 0 && <mesh position={[x * 0.88, 1.6 + (i % 3) * 0.15, z * 1.1]} castShadow><sphereGeometry args={[0.11, 14, 12]} /><meshStandardMaterial color="#f6a623" roughness={0.5} /></mesh>}
      </group>
    })}
  </group>
}

export function resolveSpeciesModel(name = ''): SpeciesModelKind | null {
  const value = name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
  if (value.includes('ocimum') || value.includes('manjeric') || value.includes('basil')) return 'basil'
  if (value.includes('monstera') || value.includes('costela-de-adao')) return 'monstera'
  if (value.includes('helianthus') || value.includes('girassol') || value.includes('sunflower')) return 'sunflower'
  if (value.includes('rosa') || value.includes('rose')) return 'rose'
  if (value.includes('samambaia') || value.includes('fern') || value.includes('nephrolepis')) return 'fern'
  if (value.includes('orquidea') || value.includes('orchid') || value.includes('phalaenopsis')) return 'orchid'
  if (value.includes('tomate') || value.includes('tomato') || value.includes('solanum lycopersicum')) return 'tomato'
  if (value.includes('babosa') || value.includes('aloe') || value.includes('aloe vera')) return 'aloe'
  if (value.includes('lavanda') || value.includes('lavandula') || value.includes('lavender')) return 'lavender'
  if (value.includes('bambu') || value.includes('bamboo') || value.includes('bambusa')) return 'bamboo'
  if (value.includes('limoeiro') || value.includes('limão') || value.includes('citrus') || value.includes('lemon')) return 'citrus'
  return null
}

export function SpeciesModel({ kind }: { kind: SpeciesModelKind }) {
  switch (kind) {
    case 'basil': return <Basil />
    case 'monstera': return <Monstera />
    case 'sunflower': return <Sunflower />
    case 'rose': return <Rose />
    case 'fern': return <Fern />
    case 'orchid': return <Orchid />
    case 'tomato': return <Tomato />
    case 'aloe': return <Aloe />
    case 'lavender': return <Lavender />
    case 'bamboo': return <Bamboo />
    case 'citrus': return <Citrus />
  }
}
