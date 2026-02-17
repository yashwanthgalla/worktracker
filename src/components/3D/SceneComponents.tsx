import { useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, MeshDistortMaterial, MeshWobbleMaterial, Sphere, Torus, Box } from '@react-three/drei';
import * as THREE from 'three';

// ═══════════════════════════════════════════
// Floating Orb — morphs based on scroll position
// ═══════════════════════════════════════════
function FloatingOrb({ scrollProgress, position, color, size = 1 }: {
  scrollProgress: number;
  position: [number, number, number];
  color: string;
  size?: number;
}) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (!meshRef.current) return;
    const t = state.clock.getElapsedTime();
    meshRef.current.rotation.x = t * 0.15 + scrollProgress * Math.PI;
    meshRef.current.rotation.y = t * 0.2 + scrollProgress * Math.PI * 0.5;
    meshRef.current.position.y = position[1] + Math.sin(t * 0.5) * 0.3;
    const s = size * (1 + scrollProgress * 0.3);
    meshRef.current.scale.setScalar(s);
  });

  return (
    <Float speed={2} rotationIntensity={0.4} floatIntensity={0.6}>
      <Sphere ref={meshRef} args={[1, 64, 64]} position={position}>
        <MeshDistortMaterial
          color={color}
          roughness={0.1}
          metalness={0.8}
          distort={0.3 + scrollProgress * 0.2}
          speed={2}
          transparent
          opacity={0.85}
        />
      </Sphere>
    </Float>
  );
}

// ═══════════════════════════════════════════
// Morphing Torus — wobbles with scroll
// ═══════════════════════════════════════════
function MorphTorus({ scrollProgress, position, color }: {
  scrollProgress: number;
  position: [number, number, number];
  color: string;
}) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (!meshRef.current) return;
    const t = state.clock.getElapsedTime();
    meshRef.current.rotation.x = t * 0.3 + scrollProgress * 2;
    meshRef.current.rotation.z = t * 0.2;
    meshRef.current.position.x = position[0] + Math.sin(scrollProgress * Math.PI * 2) * 0.5;
  });

  return (
    <Float speed={1.5} rotationIntensity={0.3} floatIntensity={0.4}>
      <Torus ref={meshRef} args={[1, 0.35, 32, 64]} position={position}>
        <MeshWobbleMaterial
          color={color}
          roughness={0.15}
          metalness={0.7}
          factor={0.3 + scrollProgress * 0.5}
          speed={1.5}
          transparent
          opacity={0.75}
        />
      </Torus>
    </Float>
  );
}

// ═══════════════════════════════════════════
// Particle Field — data-visualization style
// ═══════════════════════════════════════════
function ParticleField({ scrollProgress, count = 100 }: {
  scrollProgress: number;
  count?: number;
}) {
  const pointsRef = useRef<THREE.Points>(null);

  const [positions] = useState(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 10;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 10;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 10;
    }
    return pos;
  });

  const [colors] = useState(() => {
    const col = new Float32Array(count * 3);
    const palette = [
      new THREE.Color('#10b981'),
      new THREE.Color('#60a5fa'),
      new THREE.Color('#a78bfa'),
      new THREE.Color('#fbbf24'),
      new THREE.Color('#fb7185'),
    ];
    for (let i = 0; i < count; i++) {
      const c = palette[Math.floor(Math.random() * palette.length)];
      col[i * 3] = c.r;
      col[i * 3 + 1] = c.g;
      col[i * 3 + 2] = c.b;
    }
    return col;
  });

  useFrame((state) => {
    if (!pointsRef.current) return;
    const t = state.clock.getElapsedTime();
    pointsRef.current.rotation.y = t * 0.05 + scrollProgress * 2;
    pointsRef.current.rotation.x = scrollProgress * 0.5;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          args={[positions, 3]}
          attach="attributes-position"
          count={count}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute
          args={[colors, 3]}
          attach="attributes-color"
          count={count}
          array={colors}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.06}
        vertexColors
        transparent
        opacity={0.6 + scrollProgress * 0.3}
        sizeAttenuation
      />
    </points>
  );
}

// ═══════════════════════════════════════════
// Glassmorphic Cube — rotating cube
// ═══════════════════════════════════════════
function GlassCube({ scrollProgress, position }: {
  scrollProgress: number;
  position: [number, number, number];
}) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (!meshRef.current) return;
    const t = state.clock.getElapsedTime();
    meshRef.current.rotation.x = t * 0.2 + scrollProgress * Math.PI;
    meshRef.current.rotation.y = t * 0.3 + scrollProgress * Math.PI * 0.7;
    const s = 0.8 + scrollProgress * 0.4;
    meshRef.current.scale.setScalar(s);
  });

  return (
    <Float speed={1.2} rotationIntensity={0.2} floatIntensity={0.3}>
      <Box ref={meshRef} args={[1, 1, 1]} position={position}>
        <meshPhysicalMaterial
          color="#ffffff"
          roughness={0.05}
          metalness={0.1}
          transmission={0.9}
          thickness={0.5}
          transparent
          opacity={0.3}
          ior={1.5}
        />
      </Box>
    </Float>
  );
}

// ═══════════════════════════════════════════
// Main Scene — Dashboard 3D Background
// ═══════════════════════════════════════════
export function DashboardScene({ scrollProgress = 0 }: { scrollProgress?: number }) {
  return (
    <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 0 }}>
      <Canvas
        camera={{ position: [0, 0, 8], fov: 45 }}
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: true }}
        style={{ background: 'transparent' }}
      >
        <ambientLight intensity={0.5} />
        <directionalLight position={[5, 5, 5]} intensity={0.8} />
        <pointLight position={[-5, -5, 5]} intensity={0.3} color="#60a5fa" />
        <pointLight position={[5, -3, 3]} intensity={0.3} color="#10b981" />

        <FloatingOrb scrollProgress={scrollProgress} position={[-3.5, 2, -2]} color="#10b981" size={0.7} />
        <FloatingOrb scrollProgress={scrollProgress} position={[4, -1.5, -3]} color="#60a5fa" size={0.5} />
        <FloatingOrb scrollProgress={scrollProgress} position={[-2, -2.5, -1]} color="#a78bfa" size={0.4} />
        <MorphTorus scrollProgress={scrollProgress} position={[3, 2.5, -2]} color="#fbbf24" />
        <GlassCube scrollProgress={scrollProgress} position={[-4, 0, -3]} />
        <ParticleField scrollProgress={scrollProgress} count={150} />
      </Canvas>
    </div>
  );
}

// ═══════════════════════════════════════════
// Hero 3D Scene — for landing/onboarding
// ═══════════════════════════════════════════
export function HeroScene({ scrollProgress = 0 }: { scrollProgress?: number }) {
  return (
    <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 0 }}>
      <Canvas
        camera={{ position: [0, 0, 6], fov: 50 }}
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: true }}
        style={{ background: 'transparent' }}
      >
        <ambientLight intensity={0.4} />
        <directionalLight position={[3, 5, 5]} intensity={1} />
        <pointLight position={[-5, 5, 5]} intensity={0.5} color="#10b981" />
        <pointLight position={[5, -5, 5]} intensity={0.3} color="#a78bfa" />

        <FloatingOrb scrollProgress={scrollProgress} position={[0, 0, 0]} color="#10b981" size={1.2} />
        <FloatingOrb scrollProgress={scrollProgress} position={[-2.5, 1.5, -1]} color="#60a5fa" size={0.5} />
        <FloatingOrb scrollProgress={scrollProgress} position={[2.5, -1, -1.5]} color="#fb7185" size={0.4} />
        <MorphTorus scrollProgress={scrollProgress} position={[2, 2, -2]} color="#fbbf24" />
        <MorphTorus scrollProgress={scrollProgress} position={[-2.5, -2, -1]} color="#a78bfa" />
        <GlassCube scrollProgress={scrollProgress} position={[3, -2, -2]} />
        <GlassCube scrollProgress={scrollProgress} position={[-3.5, 1, -2.5]} />
        <ParticleField scrollProgress={scrollProgress} count={200} />
      </Canvas>
    </div>
  );
}

// ═══════════════════════════════════════════
// Analytics 3D Scene
// ═══════════════════════════════════════════
function DataOrb({ position, color, intensity }: {
  position: [number, number, number];
  color: string;
  intensity: number;
}) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (!meshRef.current) return;
    const t = state.clock.getElapsedTime();
    meshRef.current.position.y = position[1] + Math.sin(t * 0.8 + position[0]) * 0.15;
    meshRef.current.scale.setScalar(0.15 + intensity * 0.3);
  });

  return (
    <Sphere ref={meshRef} args={[1, 16, 16]} position={position}>
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={0.3}
        transparent
        opacity={0.7 + intensity * 0.3}
      />
    </Sphere>
  );
}

export function AnalyticsScene({ scrollProgress = 0 }: { scrollProgress?: number }) {
  const [dataPoints] = useState(() => {
    const points = [];
    for (let i = 0; i < 30; i++) {
      points.push({
        position: [(Math.random() - 0.5) * 6, (Math.random() - 0.5) * 4, (Math.random() - 0.5) * 4] as [number, number, number],
        color: ['#10b981', '#60a5fa', '#a78bfa', '#fbbf24', '#fb7185'][Math.floor(Math.random() * 5)],
        intensity: Math.random(),
      });
    }
    return points;
  });

  return (
    <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 0 }}>
      <Canvas
        camera={{ position: [0, 0, 6], fov: 45 }}
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: true }}
        style={{ background: 'transparent' }}
      >
        <ambientLight intensity={0.3} />
        <pointLight position={[3, 3, 5]} intensity={0.6} color="#10b981" />
        <pointLight position={[-3, -3, 5]} intensity={0.4} color="#60a5fa" />

        {dataPoints.map((point, i) => (
          <DataOrb key={i} {...point} />
        ))}
        <ParticleField scrollProgress={scrollProgress} count={80} />
      </Canvas>
    </div>
  );
}
