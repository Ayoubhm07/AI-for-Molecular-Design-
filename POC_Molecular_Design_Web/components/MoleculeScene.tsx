"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Sphere } from "@react-three/drei";
import { Suspense, useMemo, useRef } from "react";
import * as THREE from "three";

// Geometrie d'une molecule stylisee : des atomes (spheres) relies par des
// liaisons (cylindres). Les positions sont inventees pour un rendu equilibre,
// l'objectif est esthetique et non une structure chimique exacte.

interface Atome {
  position: [number, number, number];
  couleur: string;
  rayon: number;
}

interface Liaison {
  a: number;
  b: number;
}

const ATOMES: Atome[] = [
  { position: [0, 0, 0], couleur: "#22d3ee", rayon: 0.5 },
  { position: [1.6, 0.4, 0.2], couleur: "#34d399", rayon: 0.42 },
  { position: [-1.5, 0.5, -0.3], couleur: "#34d399", rayon: 0.42 },
  { position: [0.3, 1.7, -0.4], couleur: "#a78bfa", rayon: 0.42 },
  { position: [-0.2, -1.6, 0.5], couleur: "#a78bfa", rayon: 0.42 },
  { position: [2.9, -0.3, 0.6], couleur: "#e2e8f0", rayon: 0.32 },
  { position: [-2.8, 0.1, -0.7], couleur: "#e2e8f0", rayon: 0.32 },
  { position: [0.7, 2.9, -0.9], couleur: "#e2e8f0", rayon: 0.32 },
  { position: [1.4, -1.4, 1.2], couleur: "#22d3ee", rayon: 0.38 },
  { position: [-1.3, -1.2, -1.1], couleur: "#22d3ee", rayon: 0.38 },
];

const LIAISONS: Liaison[] = [
  { a: 0, b: 1 },
  { a: 0, b: 2 },
  { a: 0, b: 3 },
  { a: 0, b: 4 },
  { a: 1, b: 5 },
  { a: 2, b: 6 },
  { a: 3, b: 7 },
  { a: 4, b: 8 },
  { a: 4, b: 9 },
  { a: 1, b: 8 },
];

function Liaison({ start, end }: { start: THREE.Vector3; end: THREE.Vector3 }) {
  const ref = useRef<THREE.Mesh>(null);
  const { position, quaternion, longueur } = useMemo(() => {
    const dir = new THREE.Vector3().subVectors(end, start);
    const longueur = dir.length();
    const position = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
    const quaternion = new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      dir.clone().normalize()
    );
    return { position, quaternion, longueur };
  }, [start, end]);

  return (
    <mesh ref={ref} position={position} quaternion={quaternion}>
      <cylinderGeometry args={[0.09, 0.09, longueur, 16]} />
      <meshStandardMaterial
        color="#5eead4"
        emissive="#22d3ee"
        emissiveIntensity={0.35}
        metalness={0.6}
        roughness={0.3}
      />
    </mesh>
  );
}

function Molecule() {
  const groupe = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (groupe.current) {
      groupe.current.rotation.y += delta * 0.2;
      groupe.current.rotation.x += delta * 0.05;
    }
  });

  const vecteurs = useMemo(
    () => ATOMES.map((a) => new THREE.Vector3(...a.position)),
    []
  );

  return (
    <group ref={groupe}>
      {LIAISONS.map((l, i) => (
        <Liaison key={i} start={vecteurs[l.a]} end={vecteurs[l.b]} />
      ))}
      {ATOMES.map((a, i) => (
        <Sphere key={i} args={[a.rayon, 32, 32]} position={a.position}>
          <meshStandardMaterial
            color={a.couleur}
            emissive={a.couleur}
            emissiveIntensity={0.4}
            metalness={0.5}
            roughness={0.2}
          />
        </Sphere>
      ))}
    </group>
  );
}

export function MoleculeScene() {
  return (
    <Canvas
      camera={{ position: [0, 0, 8], fov: 45 }}
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true }}
    >
      <ambientLight intensity={0.4} />
      <pointLight position={[10, 10, 10]} intensity={1.2} color="#22d3ee" />
      <pointLight position={[-10, -5, -5]} intensity={0.8} color="#a78bfa" />
      <pointLight position={[0, 8, -8]} intensity={0.6} color="#34d399" />
      <Suspense fallback={null}>
        <Molecule />
      </Suspense>
      <OrbitControls
        enableZoom={false}
        enablePan={false}
        autoRotate={false}
        rotateSpeed={0.5}
      />
    </Canvas>
  );
}
