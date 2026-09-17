import { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { ContactShadows, OrbitControls } from '@react-three/drei'

interface PlantViewerProps {
  /** Passo 9: seleciona o .glb em public/models/. Hoje só rotula a cena. */
  archetype?: string
}

interface LeafConfig {
  position: [number, number, number]
  rotation: [number, number, number]
  scale: [number, number, number]
  color: string
}

/** Planta placeholder em geometria básica (Passo 8).
 *  Passo 9: trocar por <Model archetype={archetype} /> via useGLTF.
 *  Passo 10: animar murcha/cor/escala via useFrame + simulation_params. */
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

export default function PlantViewer({ archetype = 'folha_larga' }: PlantViewerProps) {
  return (
    <div
      className="viewer-wrap"
      role="img"
      aria-label={`Modelo 3D de planta saudável (arquétipo ${archetype}). Arraste para girar.`}
    >
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
        <Suspense fallback={null}>
          <PlaceholderPlant />
          {/* chão */}
          <mesh position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
            <circleGeometry args={[2.6, 48]} />
            <meshStandardMaterial color="#dde7d4" roughness={1} />
          </mesh>
          <ContactShadows position={[0, 0.01, 0]} opacity={0.4} scale={8} blur={2.2} far={4} />
        </Suspense>
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
