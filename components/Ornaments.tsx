import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useStore } from '../store';
import { TreeMode } from '../types';

interface OrnamentData {
  targetPositions: THREE.Vector3[];
  chaosPositions: THREE.Vector3[];
  randomRotations: THREE.Euler[];
}

interface OrnamentProps {
  type: 'ball' | 'box';
  data: OrnamentData;
  color: string;
  weight: number; // 0.1 (light) to 1.0 (heavy/slow)
  scale: number;
}

const Ornaments: React.FC<OrnamentProps> = ({ type, data, color, weight, scale }) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const mode = useStore((state) => state.mode);
  const lerpVal = useRef(0);
  
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const count = data.targetPositions.length;

  useFrame((state, delta) => {
    if (!meshRef.current) return;

    const targetLerp = mode === TreeMode.CHAOS ? 1 : 0;
    
    // Heavier objects move slower (lower delta multiplier)
    const physicsSpeed = 2.0 * (1.0 - weight * 0.5); 
    lerpVal.current = THREE.MathUtils.lerp(lerpVal.current, targetLerp, delta * physicsSpeed);

    for (let i = 0; i < count; i++) {
      const t = data.targetPositions[i];
      const c = data.chaosPositions[i];
      const r = data.randomRotations[i];

      // Interpolate position
      dummy.position.lerpVectors(t, c, lerpVal.current);
      
      // Rotate based on time and mode
      dummy.rotation.set(
          r.x + state.clock.elapsedTime * 0.2, 
          r.y + state.clock.elapsedTime * 0.1, 
          r.z
      );

      // Scale up slightly when in chaos mode for effect
      const currentScale = scale * (1 + lerpVal.current * 0.2);
      dummy.scale.set(currentScale, currentScale, currentScale);

      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]} castShadow receiveShadow>
      {type === 'ball' ? (
        <sphereGeometry args={[1, 32, 32]} />
      ) : (
        <boxGeometry args={[1, 1, 1]} />
      )}
      <meshStandardMaterial 
        color={color} 
        metalness={0.9} 
        roughness={0.1} 
        envMapIntensity={2} 
      />
    </instancedMesh>
  );
};

export default Ornaments;