import { Component, Suspense, useMemo, type ReactNode } from 'react'
import * as THREE from 'three'
import { Canvas } from '@react-three/fiber'
import { ContactShadows, OrbitControls, useGLTF, useProgress } from '@react-three/drei'
import { resolveModelUrl } from './models'

interface PlantViewerProps {
  /** Arquétipo vindo do backend. Com .glb registrado carrega o modelo real (M-01),
   *  sem arquivo cai no placeholder — nunca quebra. */
  archetype?: string
}

interface LeafConfig {
  position: [number, number, number]
  rotation: [number, number, number]
  scale: [number, number, number]
  color: string
}

/** Planta placeholder em geometria básica: default visual (M-01 passo 3) e
 *  fallback de erro quando o .glb falta ou vem corrompido. */
function PlaceholderPlant() {
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
      {/* vaso */}
      <mesh position={[0, 0.35, 0]} castShadow>
        <cylinderGeometry args={[0.55, 0.42, 0.7, 32]} />
        <meshStandardMaterial color="#b06a48" roughness={0.85} />
      </mesh>
      {/* borda do vaso */}
      <mesh position={[0, 0.7, 0]} castShadow>
        <cylinderGeometry args={[0.58, 0.58, 0.1, 32]} />
        <meshStandardMaterial color="#9d5c3d" roughness={0.85} />
      </mesh>
      {/* terra */}
      <mesh position={[0, 0.72, 0]} receiveShadow>
        <cylinderGeometry args={[0.5, 0.5, 0.06, 32]} />
        <meshStandardMaterial color="#4a382c" roughness={1} />
      </mesh>
      {/* caule */}
      <mesh position={[0, 1.25, 0]} castShadow>
        <cylinderGeometry args={[0.05, 0.07, 1.1, 12]} />
        <meshStandardMaterial color="#558b2f" roughness={0.9} />
      </mesh>
      {/* folhas */}
      {leaves.map((leaf, i) => (
        <mesh key={i} position={leaf.position} rotation={leaf.rotation} scale={leaf.scale} castShadow>
          <sphereGeometry args={[0.42, 24, 16]} />
          <meshStandardMaterial color={leaf.color} roughness={0.75} />
        </mesh>
      ))}
      {/* broto do topo */}
      <mesh position={[0, 1.95, 0]} castShadow>
        <sphereGeometry args={[0.16, 20, 14]} />
        <meshStandardMaterial color="#7cb342" roughness={0.7} />
      </mesh>
    </group>
  )
}

/** .glb real centralizado e normalizado para ~2.2 de altura (modelos de fontes
 *  diferentes chegam em escalas variadas). Passo 10: animar este grupo. */
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

export default function PlantViewer({ archetype = 'folha_larga' }: PlantViewerProps) {
  const url = resolveModelUrl(archetype)
  return (
    <div
      className="viewer-wrap"
      role="img"
      aria-label={`Modelo 3D de planta saudável (arquétipo ${archetype}). Arraste para girar.`}
    >
      <LoadingOverlay />
      <Canvas shadows dpr={[1, 2]} camera={{ position: [3.2, 2.4, 4.2], fov: 42 }}>
        <color attach="background" args={['#eef3e8']} />
        <ambientLight intensity={0.55} />
        <hemisphereLight args={['#eaf5e9', '#8a7a63', 0.35]} />
        <directionalLight
          position={[4, 7, 3]}
          intensity={1.6}
          castShadow
          shadow-mapSize={[1024, 1024]}
        />
        <ModelErrorBoundary key={url ?? 'placeholder'}>
          <Suspense fallback={null}>
            {url ? <FittedModel url={url} /> : <PlaceholderPlant />}
          </Suspense>
        </ModelErrorBoundary>
        {/* chão */}
        <mesh position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <circleGeometry args={[2.6, 48]} />
          <meshStandardMaterial color="#dde7d4" roughness={1} />
        </mesh>
        <ContactShadows position={[0, 0.01, 0]} opacity={0.4} scale={8} blur={2.2} far={4} />
        <OrbitControls
          makeDefault
          target={[0, 1.1, 0]}
          enableDamping
          minDistance={2.2}
          maxDistance={10}
          maxPolarAngle={Math.PI / 2 - 0.05}
        />
      </Canvas>
    </div>
  )
}
