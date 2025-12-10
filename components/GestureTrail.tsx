import React from 'react';
import { useStore } from '../store';

// MediaPipe Hand Connections: [start, end]
const CONNECTIONS = [
    [0, 1], [1, 2], [2, 3], [3, 4], // Thumb
    [0, 5], [5, 6], [6, 7], [7, 8], // Index
    [0, 9], [9, 10], [10, 11], [11, 12], // Middle
    [0, 13], [13, 14], [14, 15], [15, 16], // Ring
    [0, 17], [17, 18], [18, 19], [19, 20], // Pinky
    [5, 9], [9, 13], [13, 17] // Knuckles
];

const GestureTrail: React.FC = () => {
  const { handState } = useStore();
  const { landmarks, detected } = handState;

  if (!detected || landmarks.length === 0) return null;

  const width = window.innerWidth;
  const height = window.innerHeight;

  // Helper to map normalized coordinates to screen
  // Mirrored X to match natural mirror-like interaction
  const mapX = (val: number) => (1 - val) * width;
  const mapY = (val: number) => val * height;

  return (
    <div className="absolute inset-0 pointer-events-none z-50 overflow-hidden">
        <svg className="w-full h-full">
            <defs>
                {/* Luxury Gold Glow Filter */}
                <filter id="skeleton-glow" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation="4" result="coloredBlur" />
                    <feFlood floodColor="#FFD700" floodOpacity="0.5" result="glowColor" />
                    <feComposite in="glowColor" in2="coloredBlur" operator="in" result="coloredBlur" />
                    <feMerge>
                        <feMergeNode in="coloredBlur" />
                        <feMergeNode in="SourceGraphic" />
                    </feMerge>
                </filter>
            </defs>

            <g filter="url(#skeleton-glow)">
                {/* Draw Bones */}
                {CONNECTIONS.map(([start, end], i) => {
                    const p1 = landmarks[start];
                    const p2 = landmarks[end];
                    return (
                        <line
                            key={`bone-${i}`}
                            x1={mapX(p1.x)}
                            y1={mapY(p1.y)}
                            x2={mapX(p2.x)}
                            y2={mapY(p2.y)}
                            stroke="#FFD700"
                            strokeWidth="3"
                            strokeOpacity="0.6"
                            strokeLinecap="round"
                        />
                    );
                })}

                {/* Draw Joints */}
                {landmarks.map((lm, i) => (
                    <circle
                        key={`joint-${i}`}
                        cx={mapX(lm.x)}
                        cy={mapY(lm.y)}
                        r={i % 4 === 0 && i !== 0 ? 5 : 3} // Larger fingertips
                        fill="#FFFFFF"
                        stroke="#FFD700"
                        strokeWidth="2"
                    />
                ))}
            </g>
        </svg>
    </div>
  );
};

export default GestureTrail;
