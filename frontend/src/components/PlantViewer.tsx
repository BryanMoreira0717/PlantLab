import {
  Component,
  Suspense,
  useMemo,
  useRef,
  type ReactNode,
  type RefObject,
} from 'react'
import * as THREE from 'three'
import { Canvas, useFrame } from '@react-three/fiber'
import { ContactShadows, Html, OrbitControls, useGLTF, useProgress } from '@react-three/drei'
import { resolveModelUrl } from './models'
import { resolveSpeciesModel, SpeciesModel } from './SpeciesModels'
import SpecialFx from './SpecialFx'
import { FX_META, detectSpecialFx, type FxKind } from './fx'
import {
  clamp01,
  clampGrowth,
  growthScale,
  tintTarget,
  wiltScaleY,
  wiltTilt,
} from './effects'
import type { SimulationParams } from '../api'

interface PlantViewerProps {
  /** Arquétipo vindo do backend. Com .glb registrado carrega o modelo real (M-01),
   *  sem arquivo cai no placeholder — nunca quebra. */
  archetype?: string
  /** Nome popular/científico para selecionar um modelo botânico mais específico. */
  species?: string
  /** Params do /simulate-event. null = planta saudável. A transição é sempre
   *  suave (damp no useFrame); o Passo 11 vai alimentar alvos interpolados. */
  simulation?: SimulationParams | null
  /** Texto livre do evento: ativa o efeito característico (fogo, água...).
   *  null = só o sistema genérico de murcha/cor/escala. */
  event?: string
  /** Override de dev (?fx=): força o efeito sem passar pela detecção. */
  forceFx?: FxKind | null
}

interface LeafConfig {
  position: [number, number, number]
  rotation: [number, number, number]
  scale: [number, number, number]
  color: string
}

/** Vaso + terra: cresce junto, mas nunca murcha nem muda de cor. */
function Pot() {
  return (
    <group>
      <mesh position={[0, 0.35, 0]} castShadow>
        <cylinderGeometry args={[0.55, 0.42, 0.7, 32]} />
        <meshStandardMaterial color="#b06a48" roughness={0.85} />
      </mesh>
      <mesh position={[0, 0.7, 0]} castShadow>
        <cylinderGeometry args={[0.58, 0.58, 0.1, 32]} />
        <meshStandardMaterial color="#9d5c3d" roughness={0.85} />
      </mesh>
      <mesh position={[0, 0.72, 0]} receiveShadow>
        <cylinderGeometry args={[0.5, 0.5, 0.06, 32]} />
        <meshStandardMaterial color="#4a382c" roughness={1} />
      </mesh>
    </group>
  )
}

/** Copa do placeholder (caule + folhas + broto): recebe murcha e cor. */
function Crown() {
  const leaves: LeafConfig[] = [
    { position: [0.5, 1.35, 0], rotation: [0, 0, -0.65], scale: [1, 0.3, 0.48], color: '#43a047' },
    { position: [-0.5, 1.5, 0.1], rotation: [0, 0, 0.65], scale: [1, 0.3, 0.48], color: '#388e3c' },
    { position: [0, 1.6, -0.5], rotation: [0.65, 0, 0], scale: [1, 0.3, 0.48], color: '#66bb6a' },
    { position: [0.1, 1.75, 0.5], rotation: [-0.65, 0, 0], scale: [0.9, 0.28, 0.45], color: '#43a047' },
    { position: [-0.35, 1.15, -0.35], rotation: [0.4, 0.5, 0.5], scale: [0.85, 0.28, 0.42], color: '#388e3c' },
    { position: [0.35, 1.2, 0.35], rotation: [-0.4, -0.5, -0.5], scale: [0.85, 0.28, 0.42], color: '#66bb6a' },
  ]

  return (
    <group>
      <mesh position={[0, 1.25, 0]} castShadow>
        <cylinderGeometry args={[0.05, 0.07, 1.1, 12]} />
        <meshStandardMaterial color="#558b2f" roughness={0.9} />
      </mesh>
      {leaves.map((leaf, i) => (
        <mesh key={i} position={leaf.position} rotation={leaf.rotation} scale={leaf.scale} castShadow>
          <sphereGeometry args={[0.42, 24, 16]} />
          <meshStandardMaterial color={leaf.color} roughness={0.75} />
        </mesh>
      ))}
      <mesh position={[0, 1.95, 0]} castShadow>
        <sphereGeometry args={[0.16, 20, 14]} />
        <meshStandardMaterial color="#7cb342" roughness={0.7} />
      </mesh>
    </group>
  )
}

/** Placeholder estático: default visual (M-01) e fallback de erro do .glb. */
function PlaceholderPlant() {
  return (
    <>
      <Pot />
      <Crown />
    </>
  )
}

/** .glb real centralizado e normalizado para ~2.2 na maior dimensão. */
function FittedModel({ url }: { url: string }) {
  const gltf = useGLTF(url)
  const fitted = useMemo(() => {
    const box = new THREE.Box3().setFromObject(gltf.scene)
    const size = box.getSize(new THREE.Vector3())
    const center = box.getCenter(new THREE.Vector3())
    const scale = 2.2 / Math.max(size.x, size.y, size.z, 0.001)
    return {
      scale,
      position: [-center.x * scale, -box.min.y * scale, -center.z * scale] as [
        number,
        number,
        number,
      ],
    }
  }, [gltf])
  return (
    <group scale={fitted.scale} position={fitted.position}>
      <primitive object={gltf.scene} />
    </group>
  )
}

const _tint = new THREE.Color()

/** Aplica simulation_params nos grupos com transição suave (damp ~2s).
 *  growthRef = escala uniforme; wiltRef = achata + inclina + tinge (só a planta,
 *  o vaso/pote de mentira ficam de fora da murcha e da cor). */
function usePlantAnimation(
  growthRef: RefObject<THREE.Group | null>,
  wiltRef: RefObject<THREE.Group | null>,
  sim: SimulationParams | null,
) {
  const displayed = useRef({ wilt: 0, growth: 0, mix: 0 })
  const claimed = useRef(new Set<THREE.Material>())

  useFrame((_, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05)
    const d = displayed.current
    d.wilt = THREE.MathUtils.damp(d.wilt, sim ? clamp01(sim.wilt_level) : 0, 2.2, delta)
    d.growth = THREE.MathUtils.damp(d.growth, sim ? clampGrowth(sim.growth_rate_change) : 0, 2.2, delta)
    const tintHex = sim ? tintTarget(sim.leaf_color_shift) : null
    d.mix = THREE.MathUtils.damp(d.mix, tintHex ? 1 : 0, 2.2, delta)

    growthRef.current?.scale.setScalar(growthScale(d.growth))

    const w = wiltRef.current
    if (!w) return
    w.scale.set(1, wiltScaleY(d.wilt), 1)
    w.rotation.z = wiltTilt(d.wilt)
    if (tintHex) _tint.set(tintHex)
    w.traverse((obj) => {
      const mesh = obj as THREE.Mesh
      if (!mesh.isMesh) return
      let mat = mesh.material as THREE.MeshStandardMaterial | THREE.MeshStandardMaterial[]
      if (Array.isArray(mat) || !mat?.color) return
      if (!mesh.userData.baseColor) {
        if (claimed.current.has(mat)) {
          mat = mat.clone()
          mesh.material = mat
        }
        claimed.current.add(mat)
        mesh.userData.baseColor = mat.color.clone()
      }
      const base = mesh.userData.baseColor as THREE.Color
      mat.color.copy(base)
      if (tintHex) mat.color.lerp(_tint, d.mix * 0.55)
    })
  })
}

/** Brilho avermelhado pulsante quando há estresse. */
function StressGlow({ active }: { active: boolean }) {
  const ref = useRef<THREE.PointLight>(null)
  const level = useRef(0)
  useFrame(({ clock }, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05)
    level.current = THREE.MathUtils.damp(level.current, active ? 1 : 0, 2.5, delta)
    const light = ref.current
    if (light) light.intensity = level.current * (1.4 + Math.sin(clock.elapsedTime * 4) * 0.6)
  })
  return <pointLight ref={ref} position={[0, 2.8, 1.6]} color="#ff5252" intensity={0} distance={7} />
}

/** Falha de carregamento (.glb ausente/corrompido) vira placeholder, não crash. */
class ModelErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  render() {
    if (this.state.failed) return <PlaceholderPlant />
    return this.props.children
  }
}

/** Overlay de loading do drei (progresso real do download do .glb). */
function LoadingOverlay() {
  const { active, progress } = useProgress()
  if (!active) return null
  return <div className="viewer-loading">Carregando modelo 3D… {Math.round(progress)}%</div>
}

function Scene({
  url,
  speciesModel,
  sim,
  fx,
}: {
  url: string | null
  speciesModel: ReturnType<typeof resolveSpeciesModel>
  sim: SimulationParams | null
  fx: FxKind | null
}) {
  const growthRef = useRef<THREE.Group>(null)
  const wiltRef = useRef<THREE.Group>(null)
  usePlantAnimation(growthRef, wiltRef, sim)
  const stressed = !!sim?.stress_flag

  return (
    <>
      <color attach="background" args={['#eef3e8']} />
      <ambientLight intensity={0.55} />
      <hemisphereLight args={['#eaf5e9', '#8a7a63', 0.35]} />
      <directionalLight
        position={[4, 7, 3]}
        intensity={1.6}
        castShadow
        shadow-mapSize={[1024, 1024]}
      />
      <group ref={growthRef}>
        <ModelErrorBoundary key={url ?? 'placeholder'}>
          <Suspense fallback={null}>
            {speciesModel ? (
              <><Pot /><group ref={wiltRef}><SpeciesModel kind={speciesModel} /></group></>
            ) : url ? (
              <group ref={wiltRef}>
                <FittedModel url={url} />
              </group>
            ) : (
              <>
                <Pot />
                <group ref={wiltRef}>
                  <Crown />
                </group>
              </>
            )}
          </Suspense>
        </ModelErrorBoundary>
      </group>
      {/* chão */}
      <mesh position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[2.6, 48]} />
        <meshStandardMaterial color="#dde7d4" roughness={1} />
      </mesh>
      <ContactShadows position={[0, 0.01, 0]} opacity={0.4} scale={8} blur={2.2} far={4} />
      <SpecialFx kind={fx} growthRef={growthRef} wiltRef={wiltRef} />
      <StressGlow active={stressed} />
      {stressed && (
        <Html position={[0, 2.75, 0]} center zIndexRange={[5, 0]}>
          <div className="stress-badge">⚠ planta estressada</div>
        </Html>
      )}
      <OrbitControls
        makeDefault
        target={[0, 1.1, 0]}
        enableDamping
        minDistance={2.2}
        maxDistance={10}
        maxPolarAngle={Math.PI / 2 - 0.05}
      />
    </>
  )
}

export default function PlantViewer({
  archetype = 'folha_larga',
  species = '',
  simulation = null,
  event = '',
  forceFx = null,
}: PlantViewerProps) {
  const url = resolveModelUrl(archetype)
  const speciesModel = resolveSpeciesModel(species)
  const fx = forceFx ?? detectSpecialFx(event)
  const fxMeta = fx ? FX_META[fx] : null
  return (
    <div
      className="viewer-wrap"
      role="img"
      aria-label={`Modelo 3D de planta (arquétipo ${archetype})${
        simulation ? ', mostrando o efeito da simulação' : ''
      }${fxMeta ? `, efeito ${fxMeta.label}` : ''}. Arraste para girar.`}
    >
      <LoadingOverlay />
      {fxMeta && (
        <div className="fx-chip">
          {fxMeta.icon} {fxMeta.label}
        </div>
      )}
      {fx === 'dark' && <div className="fx-dark-overlay" aria-hidden="true" />}
      <Canvas shadows dpr={[1, 2]} camera={{ position: [3.2, 2.4, 4.2], fov: 42 }}>
        <Scene url={url} speciesModel={speciesModel} sim={simulation} fx={fx} />
      </Canvas>
    </div>
  )
}
