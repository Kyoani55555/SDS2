import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useStore } from '../store';
import { TreeMode } from '../types';

const Star: React.FC = () => {
  const meshRef = useRef<THREE.Mesh>(null);
  const mode = useStore((state) => state.mode);
  const lerpVal = useRef(0);

  // Generate a 5-pointed star shape
  const shape = useMemo(() => {
    const s = new THREE.Shape();
    const outerRadius = 1.2;
    const innerRadius = 0.5;
    const points = 5;
    
    for (let i = 0; i < points * 2; i++) {
      // Changed to + Math.PI / 2 to ensure the first point (tip) is pointing UP (0, 1)
      const angle = (i * Math.PI) / points + Math.PI / 2; 
      const radius = i % 2 === 0 ? outerRadius : innerRadius;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      if (i === 0) s.moveTo(x, y);
      else s.lineTo(x, y);
    }
    s.closePath();
    return s;
  }, []);

  const extrudeSettings = useMemo(() => ({
    depth: 0.2, // Thin profile as requested
    bevelEnabled: true,
    bevelThickness: 0.05,
    bevelSize: 0.05,
    bevelSegments: 4 // Smooth bevel
  }), []);

  // Positions
  const { treePos, chaosPos } = useMemo(() => ({
    treePos: new THREE.Vector3(0, 9.0, 0), // Raised from 8.2 to 9.0 for better clearance
    chaosPos: new THREE.Vector3(0, 18, 0).add(
        new THREE.Vector3(Math.random()-0.5, Math.random()-0.5, Math.random()-0.5).multiplyScalar(15)
    ),
  }), []);

  useFrame((state, delta) => {
    if (!meshRef.current) return;
    
    const targetLerp = mode === TreeMode.CHAOS ? 1 : 0;
    // The star is "heavy", so it moves a bit slower/majestic
    lerpVal.current = THREE.MathUtils.lerp(lerpVal.current, targetLerp, delta * 1.5);

    // Position Interp
    meshRef.current.position.lerpVectors(treePos, chaosPos, lerpVal.current);

    // Rotation Logic
    if (mode === TreeMode.FORMED && lerpVal.current < 0.1) {
        // Formed: Gentle, majestic spin
        meshRef.current.rotation.y += delta * 0.5;
        // Correct tilt to face forward perfectly
        meshRef.current.rotation.x = THREE.MathUtils.lerp(meshRef.current.rotation.x, 0, delta * 5);
        meshRef.current.rotation.z = THREE.MathUtils.lerp(meshRef.current.rotation.z, 0, delta * 5);
    } else {
        // Chaos: Tumble wildly
        meshRef.current.rotation.x += delta;
        meshRef.current.rotation.y += delta * 1.5;
        meshRef.current.rotation.z += delta * 0.5;
    }
  });

  return (
    <mesh ref={meshRef} castShadow receiveShadow>
      <extrudeGeometry 
        args={[shape, extrudeSettings]} 
        onUpdate={(self) => self.center()} // Correct way to center geometry in R3F
      />
      <meshStandardMaterial 
        color="#FFD700" 
        metalness={0.9} 
        roughness={0.1} 
        envMapIntensity={2.5}
        emissive="#FFD700"
        emissiveIntensity={0.2} // Subtle inner glow for the top piece
      />
    </mesh>
  );
};

export default Star;