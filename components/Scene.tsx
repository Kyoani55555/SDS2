import React, { useMemo, useRef, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment, ContactShadows, Float } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';
import { useStore } from '../store';
import { GestureType } from '../types'; // Added import
import TreeParticles from './TreeParticles';
import Ornaments from './Ornaments';
import Polaroids from './Polaroids';
import Star from './Star';

const TREE_HEIGHT = 16;
const TREE_RADIUS = 6;

const CameraRig = () => {
    const { handState } = useStore();
    const vec = new THREE.Vector3();

    useFrame((state) => {
        // Default camera pos
        const baseX = 0;
        const baseY = 2; // Look slightly up
        const baseZ = 20;

        // Influence by hand position
        const handX = handState.detected ? handState.position.x * 10 : 0;
        const handY = handState.detected ? handState.position.y * 5 : 0;

        // Smooth camera movement
        state.camera.position.lerp(vec.set(baseX + handX, baseY + handY, baseZ), 0.05);
        state.camera.lookAt(0, 0, 0);
    });

    return null;
};

// Wrapper component to handle group rotation (Gestures + Mouse Drag)
const TreeGroup: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const groupRef = useRef<THREE.Group>(null);
    const handState = useStore((state) => state.handState);
    const { gl } = useThree();

    // Drag Physics State
    const isDragging = useRef(false);
    const previousMouseX = useRef(0);
    const velocity = useRef(0);

    useEffect(() => {
        const canvas = gl.domElement;
        
        const handlePointerDown = (e: PointerEvent) => {
            isDragging.current = true;
            previousMouseX.current = e.clientX;
            velocity.current = 0; // Reset velocity on grab
            canvas.setPointerCapture(e.pointerId);
            canvas.style.cursor = 'grabbing';
        };

        const handlePointerMove = (e: PointerEvent) => {
            if (!isDragging.current) return;
            
            const deltaX = e.clientX - previousMouseX.current;
            previousMouseX.current = e.clientX;
            
            // Map pixel movement to rotation speed (Sensitivity)
            // Moving mouse Right (+X) -> Rotate Right (+Y)
            velocity.current = deltaX * 0.005; 
            
            // Direct manipulation for zero latency
            if (groupRef.current) {
                groupRef.current.rotation.y += velocity.current;
            }
        };

        const handlePointerUp = (e: PointerEvent) => {
            isDragging.current = false;
            canvas.releasePointerCapture(e.pointerId);
            canvas.style.cursor = ''; // Revert to CSS
        };

        canvas.addEventListener('pointerdown', handlePointerDown);
        canvas.addEventListener('pointermove', handlePointerMove);
        canvas.addEventListener('pointerup', handlePointerUp);
        canvas.addEventListener('pointercancel', handlePointerUp);

        return () => {
            canvas.removeEventListener('pointerdown', handlePointerDown);
            canvas.removeEventListener('pointermove', handlePointerMove);
            canvas.removeEventListener('pointerup', handlePointerUp);
            canvas.removeEventListener('pointercancel', handlePointerUp);
        };
    }, [gl]);

    useFrame((state, delta) => {
        if (!groupRef.current) return;

        // 1. Gesture Control (Highest Priority)
        if (handState.gesture === GestureType.VICTORY) {
            // Clockwise rotation around Y axis
            groupRef.current.rotation.y -= delta * 0.3;
            velocity.current = 0; // Kill dragging inertia
        } 
        // 2. Inertia (When not dragging and not gesturing)
        else if (!isDragging.current) {
            if (Math.abs(velocity.current) > 0.0001) {
                groupRef.current.rotation.y += velocity.current;
                // Friction / Decay
                velocity.current *= 0.95; 
            } else {
                velocity.current = 0;
            }
        }
    });

    return (
        <group ref={groupRef} position={[0, -2.5, 0]}>
            {children}
        </group>
    );
};

const Scene: React.FC = () => {
    // Generate all ornament positions in one go to avoid collisions
    const ornamentGroups = useMemo(() => {
        const configs = [
            { id: 'gold', type: 'ball', count: 250, color: '#FFD700', weight: 0.2, scale: 0.35 },
            { id: 'red', type: 'ball', count: 180, color: '#8B0000', weight: 0.2, scale: 0.3 },
            { id: 'silver', type: 'ball', count: 100, color: '#C0C0C0', weight: 0.2, scale: 0.2 },
            { id: 'box', type: 'box', count: 60, color: '#222', weight: 0.8, scale: 0.6 },
        ] as const;

        const occupiedPositions: { pos: THREE.Vector3; radius: number }[] = [];
        const groups: Record<string, { targetPositions: THREE.Vector3[]; chaosPositions: THREE.Vector3[]; randomRotations: THREE.Euler[] }> = {};

        configs.forEach(config => {
            const targetPositions: THREE.Vector3[] = [];
            const chaosPositions: THREE.Vector3[] = [];
            const randomRotations: THREE.Euler[] = [];
            
            // Collision radius includes a small buffer
            const myRadius = config.scale * 1.1; 

            for (let i = 0; i < config.count; i++) {
                let pos = new THREE.Vector3();
                let attempts = 0;
                let valid = false;

                // Try to place it without colliding
                while (!valid && attempts < 100) {
                    const yNorm = Math.random(); 
                    const y = (yNorm - 0.5) * TREE_HEIGHT;
                    // Position on surface of cone
                    const r = ((1 - yNorm) * TREE_RADIUS) + 0.5; // +0.5 to sit on outside of leaves
                    const angle = Math.random() * Math.PI * 2;
                    
                    pos.set(r * Math.cos(angle), y, r * Math.sin(angle));

                    // Check collisions against ALL previously placed ornaments
                    let collision = false;
                    for (const other of occupiedPositions) {
                        const dist = pos.distanceTo(other.pos);
                        if (dist < (myRadius + other.radius)) {
                            collision = true;
                            break;
                        }
                    }

                    if (!collision) {
                        valid = true;
                    }
                    attempts++;
                }

                // If valid or max attempts reached (skip if invalid to prevent clipping)
                if (valid) {
                    targetPositions.push(pos.clone());
                    occupiedPositions.push({ pos: pos.clone(), radius: myRadius });

                    // Generate Chaos Position
                    const rChaos = 10 + Math.random() * 15;
                    const theta = Math.random() * Math.PI * 2;
                    const phi = Math.acos(2 * Math.random() - 1);
                    chaosPositions.push(new THREE.Vector3(
                        rChaos * Math.sin(phi) * Math.cos(theta),
                        rChaos * Math.sin(phi) * Math.sin(theta),
                        rChaos * Math.cos(phi)
                    ));

                    randomRotations.push(new THREE.Euler(Math.random() * Math.PI, Math.random() * Math.PI, 0));
                }
            }

            groups[config.id] = { targetPositions, chaosPositions, randomRotations };
        });

        return groups;
    }, []);

    return (
        <Canvas
            shadows
            camera={{ position: [0, 4, 20], fov: 45 }}
            gl={{ antialias: false, toneMapping: THREE.ReinhardToneMapping, toneMappingExposure: 1.5 }}
            className="w-full h-full cursor-grab active:cursor-grabbing"
        >
            <color attach="background" args={['#020403']} />
            
            <CameraRig />

            {/* Lighting: High Contrast Luxury */}
            <ambientLight intensity={0.2} />
            <spotLight 
                position={[10, 20, 10]} 
                angle={0.3} 
                penumbra={1} 
                intensity={200} 
                castShadow 
                color="#ffebc2" // Warm light
                shadow-mapSize={[2048, 2048]}
            />
            <pointLight position={[-10, 5, -10]} intensity={50} color="#00ff88" distance={20} />
            
            <Environment preset="lobby" />

            {/* The Tree Assembly wrapped in a rotational group */}
            <TreeGroup>
                <TreeParticles />
                
                <Star />

                {/* Ornaments with Global Collision Data */}
                <Ornaments 
                    type="ball" 
                    data={ornamentGroups['gold']} 
                    color="#FFD700" 
                    weight={0.2} 
                    scale={0.35} 
                />
                <Ornaments 
                    type="ball" 
                    data={ornamentGroups['red']} 
                    color="#8B0000" 
                    weight={0.2} 
                    scale={0.3} 
                />
                <Ornaments 
                    type="ball" 
                    data={ornamentGroups['silver']} 
                    color="#C0C0C0" 
                    weight={0.2} 
                    scale={0.2} 
                />
                
                {/* Gift Boxes */}
                <Float speed={2} rotationIntensity={0.5} floatIntensity={0.5}>
                    <Ornaments 
                        type="box" 
                        data={ornamentGroups['box']} 
                        color="#222" 
                        weight={0.8} 
                        scale={0.6} 
                    />
                </Float>
                
                <React.Suspense fallback={null}>
                    <Polaroids />
                </React.Suspense>
            </TreeGroup>

            <ContactShadows resolution={1024} scale={50} blur={2} opacity={0.5} far={10} color="#000000" />

            <EffectComposer enableNormalPass={false}>
                <Bloom 
                    luminanceThreshold={0.8} 
                    mipmapBlur 
                    intensity={1.5} 
                    radius={0.6}
                />
                <Vignette eskil={false} offset={0.1} darkness={1.1} />
            </EffectComposer>
        </Canvas>
    );
};

export default Scene;