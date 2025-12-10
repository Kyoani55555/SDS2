import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useStore } from '../store';
import { TreeMode } from '../types';

const COUNT = 12000;
const TREE_HEIGHT = 16;
const TREE_RADIUS = 6;

// Custom Shader for "Luxury Sparkle"
const vertexShader = `
  attribute vec3 chaosPos;
  attribute vec3 treePos;
  attribute float speed;
  uniform float uTime;
  uniform float uLerp;
  
  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    // Cubic easing for smoother transition
    float t = uLerp;
    t = t < 0.5 ? 4.0 * t * t * t : 1.0 - pow(-2.0 * t + 2.0, 3.0) / 2.0;

    vec3 pos = mix(treePos, chaosPos, t);
    
    // Add subtle wind/breathing movement
    pos.x += sin(uTime * 2.0 + pos.y) * 0.05 * (1.0 - t);
    pos.z += cos(uTime * 1.5 + pos.y) * 0.05 * (1.0 - t);

    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    
    // Size attenuation
    gl_PointSize = (40.0 * (1.0 + sin(uTime * speed + pos.y))) / -mvPosition.z;
    
    // Color Logic: Mix Deep Emerald and Gold
    // Gold highlights based on position
    float highlight = step(0.9, sin(pos.y * 10.0 + uTime));
    vec3 emerald = vec3(0.0, 0.4, 0.15);
    vec3 gold = vec3(1.0, 0.84, 0.0);
    
    vColor = mix(emerald, gold, highlight * 0.5);
    vAlpha = 1.0;
  }
`;

const fragmentShader = `
  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    // Circular particle
    vec2 circCoord = 2.0 * gl_PointCoord - 1.0;
    if (dot(circCoord, circCoord) > 1.0) {
      discard;
    }
    
    // Soft glow edge
    float alpha = 1.0 - smoothstep(0.8, 1.0, length(circCoord));
    gl_FragColor = vec4(vColor, alpha * vAlpha);
  }
`;

const TreeParticles: React.FC = () => {
  const pointsRef = useRef<THREE.Points>(null);
  const shaderRef = useRef<THREE.ShaderMaterial>(null);
  const mode = useStore((state) => state.mode);
  
  // Lerp factor
  const lerpVal = useRef(0);

  const { treePos, chaosPos, speeds } = useMemo(() => {
    const tPos = new Float32Array(COUNT * 3);
    const cPos = new Float32Array(COUNT * 3);
    const s = new Float32Array(COUNT);

    for (let i = 0; i < COUNT; i++) {
      // Tree Form (Cone)
      // Normalize height 0 to 1
      const yNorm = Math.random(); 
      const y = (yNorm - 0.5) * TREE_HEIGHT;
      // Radius decreases as we go up
      const r = (1 - yNorm) * TREE_RADIUS * Math.sqrt(Math.random()); // sqrt for uniform distribution on disk
      const angle = Math.random() * Math.PI * 2;
      
      tPos[i * 3] = r * Math.cos(angle);
      tPos[i * 3 + 1] = y;
      tPos[i * 3 + 2] = r * Math.sin(angle);

      // Chaos Form (Explosion Ring)
      // We push the minimum radius out (15) so they don't clump in the center
      const u = Math.random();
      const v = Math.random();
      const theta = 2 * Math.PI * u;
      const phi = Math.acos(2 * v - 1);
      
      // Min radius 15, max add 25 = 40. Drastic explosion.
      const rChaos = 15 + (25 * Math.cbrt(Math.random())); 
      
      cPos[i * 3] = rChaos * Math.sin(phi) * Math.cos(theta);
      cPos[i * 3 + 1] = rChaos * Math.sin(phi) * Math.sin(theta);
      cPos[i * 3 + 2] = rChaos * Math.cos(phi);

      s[i] = 0.5 + Math.random();
    }
    return { treePos: tPos, chaosPos: cPos, speeds: s };
  }, []);

  useFrame((state, delta) => {
    if (shaderRef.current) {
      shaderRef.current.uniforms.uTime.value = state.clock.elapsedTime;
      
      // Update Lerp
      const target = mode === TreeMode.CHAOS ? 1 : 0;
      // Smooth lerp
      lerpVal.current = THREE.MathUtils.lerp(lerpVal.current, target, delta * 2);
      shaderRef.current.uniforms.uLerp.value = lerpVal.current;
    }
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position" // We technically don't use this for position, we mix in shader
          count={COUNT}
          array={treePos}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-treePos"
          count={COUNT}
          array={treePos}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-chaosPos"
          count={COUNT}
          array={chaosPos}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-speed"
          count={COUNT}
          array={speeds}
          itemSize={1}
        />
      </bufferGeometry>
      <shaderMaterial
        ref={shaderRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={{
          uTime: { value: 0 },
          uLerp: { value: 0 },
        }}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
};

export default TreeParticles;