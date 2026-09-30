import { useEffect, useRef, type RefObject } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import type { FxKind } from './fx'

interface FxRefs {
  growthRef: RefObject<THREE.Group | null>
  wiltRef: RefObject<THREE.Group | null>
}

function rand(min: number, max: number) {
  return min + Math.random() * (max - min)
}

/** Estado mutável das partículas num único useRef (init lazy). O conteúdo é
 *  reescrito a cada frame de propósito — padrão de particle systems em R3F
 *  (mutação de BufferAttribute no useFrame). O lint react(immutability) avisa
 *  aqui por construção, sem impacto em runtime: esses componentes já
 *  renderizam todo frame, então não há memoização a perder. */
function useStore<T>(init: () => T): RefObject<T> {
  const ref = useRef<T | null>(null)
  if (ref.current === null) ref.current = init()
  return ref as RefObject<T>
}

function commitPositions(geoRef: RefObject<THREE.BufferGeometry | null>) {
  const attr = geoRef.current?.getAttribute('position')
  if (attr) attr.needsUpdate = true
}

/** Nuvem de pontos aditiva (posições mutadas in-place a cada frame). */
function Cloud({
  positions,
  color,
  size,
  opacity,
  geoRef,
}: {
  positions: Float32Array
  color: string
  size: number
  opacity: number
  geoRef: RefObject<THREE.BufferGeometry | null>
}) {
  return (
    <points frustumCulled={false}>
      <bufferGeometry ref={geoRef}>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={size}
        color={color}
        transparent
        opacity={opacity}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        sizeAttenuation
      />
    </points>
  )
}

/* ---------------- fogo ---------------- */

function FireFx() {
  const OUTER = 60
  const INNER = 28
  const store = useStore(() => ({
    outer: Array.from({ length: OUTER }, () => ({
      r: rand(0.45, 1.0),
      a: rand(0, Math.PI * 2),
      y: rand(0, 2.6),
      speed: rand(0.9, 2.0),
    })),
    inner: Array.from({ length: INNER }, () => ({
      r: rand(0.1, 0.45),
      a: rand(0, Math.PI * 2),
      y: rand(0.2, 2.3),
      speed: rand(1.2, 2.4),
    })),
    posOuter: new Float32Array(OUTER * 3),
    posInner: new Float32Array(INNER * 3),
  }))
  const geoOuterRef = useRef<THREE.BufferGeometry>(null)
  const geoInnerRef = useRef<THREE.BufferGeometry>(null)
  const lightRef = useRef<THREE.PointLight>(null)

  useFrame(({ clock }, rawDelta) => {
    const st = store.current
    if (!st) return
    const delta = Math.min(rawDelta, 0.05)
    const t = clock.elapsedTime
    const rise = (
      seeds: { r: number; a: number; y: number; speed: number }[],
      positions: Float32Array,
      top: number,
      baseR: number,
    ) => {
      for (let i = 0; i < seeds.length; i++) {
        const s = seeds[i]
        s.y += (1.1 + s.speed) * delta
        if (s.y > top) {
          s.y = rand(0, 0.3)
          s.r = rand(baseR, baseR + 0.5)
          s.a = rand(0, Math.PI * 2)
        }
        const wobble = 1 + 0.15 * Math.sin(t * 7 + i)
        positions[i * 3] = Math.cos(s.a + t * 0.9) * s.r * wobble
        positions[i * 3 + 1] = s.y
        positions[i * 3 + 2] = Math.sin(s.a + t * 0.9) * s.r * wobble
      }
    }
    rise(st.outer, st.posOuter, 2.9, 0.45)
    rise(st.inner, st.posInner, 2.5, 0.1)
    const attrO = geoOuterRef.current?.getAttribute('position')
    if (attrO) attrO.needsUpdate = true
    const attrI = geoInnerRef.current?.getAttribute('position')
    if (attrI) attrI.needsUpdate = true
    if (lightRef.current)
      lightRef.current.intensity = 2.4 + Math.sin(t * 13) * 0.7 + Math.sin(t * 29 + 1) * 0.4
  })

  return (
    <>
      <points frustumCulled={false}>
        <bufferGeometry ref={geoOuterRef}>
          <bufferAttribute
            attach="attributes-position"
            args={[store.current?.posOuter ?? new Float32Array(0), 3]}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.3}
          color="#ff5a00"
          transparent
          opacity={0.9}
          depthWrite={false}
          sizeAttenuation
        />
      </points>
      <points frustumCulled={false}>
        <bufferGeometry ref={geoInnerRef}>
          <bufferAttribute
            attach="attributes-position"
            args={[store.current?.posInner ?? new Float32Array(0), 3]}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.18}
          color="#ffd23f"
          transparent
          opacity={0.95}
          depthWrite={false}
          sizeAttenuation
        />
      </points>
      <pointLight ref={lightRef} position={[0, 1.3, 1.4]} color="#ff7a1a" intensity={2.2} distance={7} />
    </>
  )
}

/* ---------------- água (submersão) ---------------- */

function WaterFx({ growthRef }: { growthRef: FxRefs['growthRef'] }) {
  const COUNT = 36
  const store = useStore(() => ({
    seeds: Array.from({ length: COUNT }, () => ({
      r: rand(0.1, 0.85),
      a: rand(0, Math.PI * 2),
      y: rand(0, 2.6),
      speed: rand(0.4, 1.0),
    })),
    positions: new Float32Array(COUNT * 3),
  }))
  const geoRef = useRef<THREE.BufferGeometry>(null)
  const waterRef = useRef<THREE.Mesh>(null)
  const waterMatRef = useRef<THREE.MeshStandardMaterial>(null)
  const bubblesRef = useRef<THREE.Group>(null)
  const level = useRef(0)

  useEffect(
    () => () => {
      if (growthRef.current) growthRef.current.rotation.z = 0
    },
    [growthRef],
  )

  useFrame(({ clock }, rawDelta) => {
    const st = store.current
    if (!st) return
    const { seeds, positions } = st
    const delta = Math.min(rawDelta, 0.05)
    const t = clock.elapsedTime
    level.current = THREE.MathUtils.damp(level.current, 1, 1.1, delta)
    const lv = level.current
    if (waterRef.current) {
      waterRef.current.scale.y = Math.max(0.001, 2.6 * lv)
      waterRef.current.position.y = 1.3 * lv
    }
    if (waterMatRef.current) waterMatRef.current.opacity = 0.42 * lv
    if (bubblesRef.current) bubblesRef.current.scale.y = Math.max(0.001, lv)
    const top = Math.max(0.05, 2.6 * lv)
    for (let i = 0; i < COUNT; i++) {
      const s = seeds[i]
      s.y += s.speed * delta
      if (s.y > top) s.y = 0.05
      positions[i * 3] = Math.cos(s.a) * s.r + Math.sin(t * 2 + i) * 0.03
      positions[i * 3 + 1] = s.y
      positions[i * 3 + 2] = Math.sin(s.a) * s.r
    }
    commitPositions(geoRef)
    if (growthRef.current) growthRef.current.rotation.z = 0.06 * Math.sin(t * 1.6) * lv
  })

  return (
    <>
      <mesh ref={waterRef} scale={[1, 0.001, 1]}>
        <cylinderGeometry args={[1.15, 1.15, 1, 28, 1, true]} />
        <meshStandardMaterial
          ref={waterMatRef}
          color="#3aa7e0"
          transparent
          opacity={0}
          roughness={0.15}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
      <group ref={bubblesRef} scale={[1, 0.001, 1]}>
        <Cloud
          positions={store.current?.positions ?? new Float32Array(0)}
          color="#cfeeff"
          size={0.07}
          opacity={0.85}
          geoRef={geoRef}
        />
      </group>
      <pointLight position={[0, 1.5, 1.5]} color="#6ec6ff" intensity={0.9} distance={7} />
    </>
  )
}

/* ---------------- calor forte ---------------- */

function HeatFx() {
  const COUNT = 26
  const store = useStore(() => ({
    seeds: Array.from({ length: COUNT }, () => ({
      x: rand(-1.4, 1.4),
      y: rand(0, 3),
      z: rand(-1.4, 1.4),
      speed: rand(0.25, 0.6),
      phase: rand(0, Math.PI * 2),
    })),
    positions: new Float32Array(COUNT * 3),
  }))
  const geoRef = useRef<THREE.BufferGeometry>(null)

  useFrame(({ clock }, rawDelta) => {
    const st = store.current
    if (!st) return
    const { seeds, positions } = st
    const delta = Math.min(rawDelta, 0.05)
    const t = clock.elapsedTime
    for (let i = 0; i < COUNT; i++) {
      const s = seeds[i]
      s.y += s.speed * delta
      if (s.y > 3.2) s.y = 0
      positions[i * 3] = s.x + Math.sin(t * 1.2 + s.phase) * 0.15
      positions[i * 3 + 1] = s.y
      positions[i * 3 + 2] = s.z
    }
    commitPositions(geoRef)
  })

  return (
    <>
      <Cloud
        positions={store.current?.positions ?? new Float32Array(0)}
        color="#ffd97a"
        size={0.09}
        opacity={0.75}
        geoRef={geoRef}
      />
      <directionalLight position={[3, 5, 2]} color="#ffcf9e" intensity={1.1} />
    </>
  )
}

/* ---------------- geada ---------------- */

function FrostFx() {
  const COUNT = 70
  const store = useStore(() => ({
    seeds: Array.from({ length: COUNT }, () => ({
      x: rand(-2.5, 2.5),
      y: rand(0, 4),
      z: rand(-2.5, 2.5),
      speed: rand(0.4, 0.9),
      phase: rand(0, Math.PI * 2),
    })),
    positions: new Float32Array(COUNT * 3),
  }))
  const geoRef = useRef<THREE.BufferGeometry>(null)

  useFrame(({ clock }, rawDelta) => {
    const st = store.current
    if (!st) return
    const { seeds, positions } = st
    const delta = Math.min(rawDelta, 0.05)
    const t = clock.elapsedTime
    for (let i = 0; i < COUNT; i++) {
      const s = seeds[i]
      s.y -= s.speed * delta
      if (s.y < 0) s.y = 4
      positions[i * 3] = s.x + Math.sin(t * 0.9 + s.phase) * 0.25
      positions[i * 3 + 1] = s.y
      positions[i * 3 + 2] = s.z
    }
    commitPositions(geoRef)
  })

  return (
    <>
      <Cloud
        positions={store.current?.positions ?? new Float32Array(0)}
        color="#e8f4ff"
        size={0.09}
        opacity={0.9}
        geoRef={geoRef}
      />
      <pointLight position={[-2, 3, 2]} color="#bfe3ff" intensity={0.9} distance={8} />
    </>
  )
}

/* ---------------- queda (tombada) ---------------- */

function FallFx({ wiltRef }: { wiltRef: FxRefs['wiltRef'] }) {
  const COUNT = 16
  const store = useStore(() => ({
    seeds: Array.from({ length: COUNT }, () => ({
      a: rand(0, Math.PI * 2),
      speed: rand(0.8, 1.6),
    })),
    positions: new Float32Array(COUNT * 3),
  }))
  const geoRef = useRef<THREE.BufferGeometry>(null)
  const dustMatRef = useRef<THREE.PointsMaterial>(null)
  const life = useRef(1)

  useFrame((_, rawDelta) => {
    const debugWindow = window as unknown as Record<string, unknown>
    debugWindow.__fallFrames = ((debugWindow.__fallFrames as number) ?? 0) + 1
    const st = store.current
    if (!st) {
      debugWindow.__fallNull = ((debugWindow.__fallNull as number) ?? 0) + 1
      return
    }
    const { seeds, positions } = st
    const delta = Math.min(rawDelta, 0.05)
    const wiltGroup = wiltRef.current
    if (wiltGroup) wiltGroup.rotation.z += (1.08 - wiltGroup.rotation.z) * Math.min(1, delta * 2.5)
    life.current = Math.max(0, life.current - delta * 0.7)
    const spread = (1 - life.current) * 1.6
    for (let i = 0; i < COUNT; i++) {
      const s = seeds[i]
      positions[i * 3] = Math.cos(s.a) * spread * s.speed + 0.8 * (1 - life.current)
      positions[i * 3 + 1] = 0.15 + (1 - life.current) * 0.5 * s.speed
      positions[i * 3 + 2] = Math.sin(s.a) * spread * s.speed
    }
    commitPositions(geoRef)
    if (dustMatRef.current) dustMatRef.current.opacity = 0.5 * life.current
  })

  return (
    <points frustumCulled={false}>
      <bufferGeometry ref={geoRef}>
        <bufferAttribute attach="attributes-position" args={[store.current?.positions ?? new Float32Array(0), 3]} />
      </bufferGeometry>
      <pointsMaterial
        ref={dustMatRef}
        size={0.14}
        color="#b0a696"
        transparent
        opacity={0.5}
        depthWrite={false}
        sizeAttenuation
      />
    </points>
  )
}

/* ---------------- micro-ondas ---------------- */

function MicrowaveFx({ wiltRef }: { wiltRef: FxRefs['wiltRef'] }) {
  const COUNT = 14
  const store = useStore(() => ({
    seeds: Array.from({ length: COUNT }, () => ({
      x: rand(-0.4, 0.4),
      y: rand(1, 2.4),
      z: rand(-0.4, 0.4),
      speed: rand(0.5, 1.1),
    })),
    positions: new Float32Array(COUNT * 3),
  }))
  const geoRef = useRef<THREE.BufferGeometry>(null)
  const lightRef = useRef<THREE.PointLight>(null)

  useEffect(
    () => () => {
      wiltRef.current?.position.set(0, 0, 0)
    },
    [wiltRef],
  )

  useFrame(({ clock }, rawDelta) => {
    const st = store.current
    if (!st) return
    const { seeds, positions } = st
    const delta = Math.min(rawDelta, 0.05)
    const t = clock.elapsedTime
    const w = wiltRef.current
    if (w) {
      w.position.x = 0.03 * Math.sin(t * 43) + 0.02 * Math.sin(t * 29 + 1)
      w.position.y = 0.02 * Math.sin(t * 51 + 2)
    }
    for (let i = 0; i < COUNT; i++) {
      const s = seeds[i]
      s.y += s.speed * delta
      if (s.y > 2.8) s.y = 1
      positions[i * 3] = s.x + Math.sin(t * 3 + i) * 0.05
      positions[i * 3 + 1] = s.y
      positions[i * 3 + 2] = s.z
    }
    commitPositions(geoRef)
    if (lightRef.current) lightRef.current.intensity = 1 + Math.sin(t * 9) * 0.8
  })

  return (
    <>
      <Cloud
        positions={store.current?.positions ?? new Float32Array(0)}
        color="#dddddd"
        size={0.1}
        opacity={0.6}
        geoRef={geoRef}
      />
      <pointLight ref={lightRef} position={[0, 1.6, 1.2]} color="#ff4444" intensity={1} distance={6} />
    </>
  )
}

/* ---------------- escuro (só luz fria; o véu é DOM) ---------------- */

function DarkLight() {
  return <pointLight position={[-2, 3, 2]} color="#aecbff" intensity={0.8} distance={8} />
}

/* ---------------- solo, nutrientes, cuidado, vento, pragas e luz ---------------- */

type LivingFx = Extract<FxKind,
  | 'soil' | 'nutrient' | 'care' | 'wind' | 'pests' | 'sunlight' | 'drought'
  | 'rain' | 'pruning' | 'repot' | 'pollination' | 'bloom' | 'chemical' | 'hail' | 'compost'
>

const LIVING_STYLE: Record<LivingFx, { color: string; light: string; count: number }> = {
  soil: { color: '#9a6038', light: '#d58a4d', count: 34 },
  nutrient: { color: '#e78b48', light: '#ffc857', count: 28 },
  care: { color: '#ffe66d', light: '#a6ff83', count: 48 },
  wind: { color: '#d8f1e8', light: '#bce8dc', count: 38 },
  pests: { color: '#8c6b36', light: '#b6d552', count: 26 },
  sunlight: { color: '#fff1a8', light: '#ffe082', count: 42 },
  drought: { color: '#c49a6c', light: '#e0ad67', count: 30 },
  rain: { color: '#78c9f4', light: '#7fcdf0', count: 75 },
  pruning: { color: '#d4a477', light: '#c89d73', count: 24 },
  repot: { color: '#9b6847', light: '#d6a576', count: 42 },
  pollination: { color: '#ffdf70', light: '#ffe18a', count: 32 },
  bloom: { color: '#ff91bd', light: '#ffc3df', count: 42 },
  chemical: { color: '#a4e34f', light: '#9ce65b', count: 38 },
  hail: { color: '#d5f3ff', light: '#aee5ff', count: 54 },
  compost: { color: '#b68a51', light: '#edbb64', count: 36 },
}

function LivingFx({ kind }: { kind: LivingFx }) {
  const style = LIVING_STYLE[kind]
  const store = useStore(() => ({
    seeds: Array.from({ length: style.count }, () => ({
      x: rand(-1.5, 1.5), y: rand(0.05, 2.8), z: rand(-1.1, 1.1),
      speed: rand(0.15, 0.75), phase: rand(0, Math.PI * 2),
    })),
    positions: new Float32Array(style.count * 3),
  }))
  const geoRef = useRef<THREE.BufferGeometry>(null)
  const lightRef = useRef<THREE.PointLight>(null)
  const soilRef = useRef<THREE.Mesh>(null)

  useFrame(({ clock }, rawDelta) => {
    const st = store.current
    if (!st) return
    const delta = Math.min(rawDelta, 0.05)
    const t = clock.elapsedTime
    for (let i = 0; i < st.seeds.length; i++) {
      const seed = st.seeds[i]
      if (kind === 'wind') {
        seed.x += delta * (0.9 + seed.speed)
        if (seed.x > 1.8) seed.x = -1.8
      } else if (kind === 'rain' || kind === 'hail' || kind === 'pruning') {
        seed.y -= delta * (kind === 'hail' ? 2.2 : kind === 'rain' ? 2.8 : 0.9)
        if (seed.y < 0.04) seed.y = kind === 'pruning' ? rand(1.3, 2.5) : rand(2.8, 4)
      } else if (kind === 'repot') {
        seed.phase += delta * (0.9 + seed.speed)
        seed.x = Math.cos(seed.phase) * (0.35 + seed.speed * 0.35)
        seed.z = Math.sin(seed.phase) * (0.35 + seed.speed * 0.35)
        seed.y = 0.15 + Math.abs(Math.sin(seed.phase * 1.7)) * 0.48
      } else if (kind === 'pollination' || kind === 'bloom') {
        seed.phase += delta * (0.7 + seed.speed)
        seed.y = 1.15 + (kind === 'bloom' ? 0.3 : 0.55) + Math.sin(seed.phase * 1.3) * 0.35
        seed.x = Math.cos(seed.phase) * (0.72 + seed.speed * 0.35)
        seed.z = Math.sin(seed.phase) * (0.62 + seed.speed * 0.3)
      } else {
        seed.y += delta * (kind === 'pests' ? seed.speed * 0.55 : seed.speed)
        if (seed.y > 2.9) seed.y = ['soil', 'drought', 'repot', 'compost'].includes(kind) ? 0.08 : 0.15
      }
      st.positions[i * 3] = seed.x + (kind === 'wind' ? Math.sin(t * 1.7 + seed.phase) * 0.12 : 0.05 * Math.sin(seed.phase))
      st.positions[i * 3 + 1] = seed.y + (kind === 'care' || kind === 'bloom' ? Math.sin(t * 2 + seed.phase) * 0.12 : 0)
      st.positions[i * 3 + 2] = seed.z + (kind === 'pollination' || kind === 'bloom' ? 0 : Math.cos(t + seed.phase) * 0.08)
    }
    commitPositions(geoRef)
    if (lightRef.current) {
      const pulse = ['care', 'sunlight', 'bloom', 'pollination'].includes(kind) ? 0.75 + Math.sin(t * 2.2) * 0.22 : 0.55
      lightRef.current.intensity = pulse
    }
    if (soilRef.current && (kind === 'soil' || kind === 'drought')) soilRef.current.rotation.y = t * 0.08
  })

  return (
    <>
      <Cloud
        positions={store.current?.positions ?? new Float32Array(0)}
        color={style.color}
        size={kind === 'pests' ? 0.065 : kind === 'hail' ? 0.16 : kind === 'rain' ? 0.075 : 0.105}
        opacity={kind === 'soil' ? 0.65 : 0.88}
        geoRef={geoRef}
      />
      {(['soil', 'drought', 'repot', 'compost'] as LivingFx[]).includes(kind) && (
        <mesh ref={soilRef} position={[0, 0.04, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.78, 32]} />
          <meshStandardMaterial color={kind === 'drought' ? '#b78b5e' : kind === 'compost' ? '#513c29' : '#805334'} roughness={1} transparent opacity={0.78} />
        </mesh>
      )}
      {(['care', 'sunlight', 'bloom', 'pollination'] as LivingFx[]).includes(kind) && (
        <mesh position={[0, 1.45, 0]}>
          <torusGeometry args={[kind === 'pollination' ? 0.92 : 1.1, 0.025, 8, 64]} />
          <meshBasicMaterial color={style.light} transparent opacity={0.62} />
        </mesh>
      )}
      <pointLight ref={lightRef} position={[0, 2, 1.4]} color={style.light} intensity={0.7} distance={7} />
    </>
  )
}

/** Chuva pesada cai de cima e a lâmina de água sobe, diferente da submersão em rio. */
function FloodFx({ growthRef }: { growthRef: FxRefs['growthRef'] }) {
  const COUNT = 90
  const store = useStore(() => ({
    seeds: Array.from({ length: COUNT }, () => ({ x: rand(-1.7, 1.7), y: rand(0, 3.5), z: rand(-1.5, 1.5), speed: rand(2.2, 4.2) })),
    positions: new Float32Array(COUNT * 3),
  }))
  const geoRef = useRef<THREE.BufferGeometry>(null)
  const waterRef = useRef<THREE.Mesh>(null)
  const level = useRef(0)
  useEffect(() => () => { if (growthRef.current) growthRef.current.rotation.z = 0 }, [growthRef])
  useFrame(({ clock }, rawDelta) => {
    const st = store.current
    if (!st) return
    const delta = Math.min(rawDelta, 0.05)
    level.current = THREE.MathUtils.damp(level.current, 1, 0.65, delta)
    const t = clock.elapsedTime
    for (let i = 0; i < COUNT; i++) {
      const s = st.seeds[i]
      s.y -= s.speed * delta
      if (s.y < 0.05) { s.y = rand(2.8, 4); s.x = rand(-1.7, 1.7) }
      st.positions[i * 3] = s.x + Math.sin(t * 4 + i) * 0.025
      st.positions[i * 3 + 1] = s.y
      st.positions[i * 3 + 2] = s.z
    }
    commitPositions(geoRef)
    if (waterRef.current) {
      waterRef.current.scale.y = Math.max(0.001, 1.8 * level.current)
      waterRef.current.position.y = 0.22 + 0.9 * level.current
    }
    if (growthRef.current) growthRef.current.rotation.z = Math.sin(t * 2.4) * 0.035 * level.current
  })
  return (
    <>
      <mesh ref={waterRef} position={[0, 0.2, 0]} scale={[1.65, 0.001, 1.65]}>
        <cylinderGeometry args={[1, 1, 1, 40, 1, true]} />
        <meshStandardMaterial color="#268bd2" transparent opacity={0.3} roughness={0.12} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
      <Cloud positions={store.current?.positions ?? new Float32Array(0)} color="#b9e8ff" size={0.075} opacity={0.9} geoRef={geoRef} />
      <pointLight position={[0, 2.8, 1]} color="#8bd6ff" intensity={1.2} distance={8} />
    </>
  )
}

/* ---------------- dispatcher ---------------- */

export default function SpecialFx({
  kind,
  growthRef,
  wiltRef,
}: {
  kind: FxKind | null
  growthRef: FxRefs['growthRef']
  wiltRef: FxRefs['wiltRef']
}) {
  switch (kind) {
    case 'fire':
      return <FireFx />
    case 'water':
      return <WaterFx growthRef={growthRef} />
    case 'flood':
      return <FloodFx growthRef={growthRef} />
    case 'heat':
      return <HeatFx />
    case 'frost':
      return <FrostFx />
    case 'fall':
      return <FallFx wiltRef={wiltRef} />
    case 'dark':
      return <DarkLight />
    case 'soil':
    case 'nutrient':
    case 'care':
    case 'wind':
    case 'pests':
    case 'sunlight':
    case 'drought':
    case 'rain':
    case 'pruning':
    case 'repot':
    case 'pollination':
    case 'bloom':
    case 'chemical':
    case 'hail':
    case 'compost':
      return <LivingFx kind={kind} />
    case 'microwave':
      return <MicrowaveFx wiltRef={wiltRef} />
    default:
      return null
  }
}
