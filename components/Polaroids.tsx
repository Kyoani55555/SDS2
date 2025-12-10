import React, { useMemo, useRef, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { useStore } from '../store';
import { TreeMode } from '../types';

const COUNT = 25;
const TREE_HEIGHT = 14;
const TREE_RADIUS = 5;

// Interface for position data calculated once
interface PolaroidData {
    id: number;
    treePos: THREE.Vector3;
    chaosPos: THREE.Vector3;
    gridPos: THREE.Vector3;
    lookAtTree: THREE.Vector3;
    rotSpeed: { x: number; y: number };
}

// Sub-component for individual frames to handle their own textures and geometry updates
const PolaroidFrame: React.FC<{ data: PolaroidData; photoUrl: string | null }> = ({ data, photoUrl }) => {
    const groupRef = useRef<THREE.Group>(null);
    const mode = useStore((state) => state.mode);
    const photoMeshRef = useRef<THREE.Mesh>(null);
    
    // Lerp state refs
    const lerpVal = useRef(0);
    const scaleVal = useRef(0);
    const gridLerpVal = useRef(0);

    // Texture Loading
    // Use a placeholder if no URL provided
    const url = photoUrl || "https://picsum.photos/200/200";
    const texture = useTexture(url);
    
    // Aspect Ratio Logic
    const [planeArgs, setPlaneArgs] = useState<[number, number]>([1, 1]);

    useEffect(() => {
        if (texture) {
            // HIGH QUALITY SETTINGS
            texture.colorSpace = THREE.SRGBColorSpace;
            texture.generateMipmaps = false; // Disable mipmaps for pixel-perfect sharpness
            texture.minFilter = THREE.LinearFilter;
            texture.magFilter = THREE.LinearFilter;
            texture.anisotropy = 16; // Max sharpness at angles
            texture.needsUpdate = true;

            const img = texture.image as HTMLImageElement;
            if (img && img.width && img.height) {
                const aspect = img.width / img.height;
                
                // Fit within 1x1 area, maintaining EXACT aspect ratio.
                // We do NOT crop. We resize the plane to match the photo shape.
                
                let w = 1;
                let h = 1;
                
                if (aspect > 1) {
                    // Landscape or Panorama
                    w = 1;
                    h = 1 / aspect;
                } else {
                    // Portrait
                    h = 1;
                    w = aspect;
                }
                setPlaneArgs([w, h]);
            }
        }
    }, [texture]);

    useFrame((state, delta) => {
        if (!groupRef.current) return;

        const isChaos = mode === TreeMode.CHAOS;
        const isGrid = mode === TreeMode.GRID;
        const isFormed = mode === TreeMode.FORMED;

        // 1. Scale Logic
        // Reduced scale from 1.5 to 1.3 for a more refined look
        const targetScale = (isChaos || isGrid) ? 1.3 : 0;
        scaleVal.current = THREE.MathUtils.lerp(scaleVal.current, targetScale, delta * 4);

        // 2. Position Mixing
        const targetChaos = isChaos ? 1 : 0;
        lerpVal.current = THREE.MathUtils.lerp(lerpVal.current, targetChaos, delta * 2.5);

        const targetGrid = isGrid ? 1 : 0;
        gridLerpVal.current = THREE.MathUtils.lerp(gridLerpVal.current, targetGrid, delta * 2.5);

        // Calculate Position
        const basePos = new THREE.Vector3().lerpVectors(data.treePos, data.chaosPos, lerpVal.current);
        groupRef.current.position.lerpVectors(basePos, data.gridPos, gridLerpVal.current);

        // Scale
        groupRef.current.scale.setScalar(scaleVal.current);

        // Rotation
        if (isGrid && gridLerpVal.current > 0.5) {
            // Grid: Look at camera (static)
            groupRef.current.lookAt(0, 4, 30);
        } else if (isFormed && lerpVal.current < 0.1) {
             // Formed: Look outward
             groupRef.current.lookAt(data.lookAtTree);
             groupRef.current.rotateY(Math.PI);
        } else {
             // Chaos: Rotate gently
             groupRef.current.rotation.x += data.rotSpeed.x * delta;
             groupRef.current.rotation.y += data.rotSpeed.y * delta;
        }
    });

    return (
        <group ref={groupRef}>
             {/* The Frame: Box Geometry in Pale Pink */}
             {/* Adjusted size slightly to better accommodate varying aspect ratios */}
             <mesh castShadow receiveShadow>
                <boxGeometry args={[1.2, 1.4, 0.05]} />
                <meshStandardMaterial 
                    color="#FFD1DC" 
                    roughness={0.4} 
                    metalness={0.1} 
                />
            </mesh>

            {/* The Photo */}
            <mesh ref={photoMeshRef} position={[0, 0.1, 0.031]}>
                <planeGeometry args={[planeArgs[0], planeArgs[1]]} />
                <meshBasicMaterial 
                    map={texture} 
                    toneMapped={false} // CRITICAL: Disable tone mapping to preserve original colors
                    transparent
                />
            </mesh>
        </group>
    );
};

const Polaroids: React.FC = () => {
    const { photos } = useStore();

    // Generate static position data once
    const items = useMemo(() => {
        const arr: PolaroidData[] = [];
        const gridCols = 5;
        
        // --- Spacing Calculation (Adjusted for scale 1.3) ---
        // Width approx 1.56 -> Spacing 1.75
        // Height approx 1.82 -> Spacing 2.1
        const spacingX = 1.75; 
        const spacingY = 2.1; 
        
        const startX = -((gridCols - 1) * spacingX) / 2;
        
        // Calculate vertical centering
        const rows = Math.ceil(COUNT / gridCols);
        const totalGridHeight = (rows - 1) * spacingY;
        
        // Center around Y=2.9 (Moved down slightly from 3.2 to sit lower in frame)
        const startY = 2.9 + totalGridHeight / 2;

        for (let i = 0; i < COUNT; i++) {
            // Tree Pos
            const yNorm = Math.random();
            const y = (yNorm - 0.5) * TREE_HEIGHT;
            const r = ((1 - yNorm) * TREE_RADIUS) + 1.5; 
            const angle = Math.random() * Math.PI * 2;
            const treePos = new THREE.Vector3(r * Math.cos(angle), y, r * Math.sin(angle));
            
            // Chaos Pos (Updated for visibility constraints AND Collision Avoidance)
            let cPos = new THREE.Vector3();
            let attempts = 0;
            let valid = false;
            // Minimum distance between centers to prevent overlap.
            // Diagonal of frame is ~2.0. Using 2.4 to be safe.
            const MIN_DIST = 2.4; 

            while (!valid && attempts < 50) {
                const chaosAngle = Math.random() * Math.PI * 2;
                // Wider radius range to give more space (9 to 16)
                const chaosRadius = 9 + Math.random() * 7; 
                // Expanded height range (-2 to 10) to spread them out vertically
                const chaosHeight = (Math.random() - 0.5) * 12 + 4; 

                cPos.set(
                    Math.cos(chaosAngle) * chaosRadius,
                    chaosHeight,
                    Math.sin(chaosAngle) * chaosRadius
                );

                // Check collision against previously placed items in this array
                let collision = false;
                for (const item of arr) {
                    if (item.chaosPos.distanceTo(cPos) < MIN_DIST) {
                        collision = true;
                        break;
                    }
                }

                if (!collision) {
                    valid = true;
                }
                attempts++;
            }
            
            // Grid Pos
            const col = i % gridCols;
            const row = Math.floor(i / gridCols);
            const gPos = new THREE.Vector3(
                startX + col * spacingX,
                startY - row * spacingY,
                8 // Distance from center, in front of tree
            );

            const lookAtTree = new THREE.Vector3(0, y, 0); 
            const rotSpeed = {
                x: (Math.random() - 0.5) * 0.5,
                y: (Math.random() - 0.5) * 0.5
            };

            arr.push({ id: i, treePos, chaosPos: cPos, gridPos: gPos, lookAtTree, rotSpeed });
        }
        return arr;
    }, []);

    return (
        <>
            {items.map((item, index) => (
                <PolaroidFrame 
                    key={item.id} 
                    data={item} 
                    photoUrl={photos[index] || null} 
                />
            ))}
        </>
    );
};

export default Polaroids;