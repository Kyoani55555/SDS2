import React, { useEffect, useRef } from 'react';
import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';
import { useStore } from '../store';
import { GestureType } from '../types';

// MediaPipe Hand Connections: [start, end]
const CONNECTIONS = [
    [0, 1], [1, 2], [2, 3], [3, 4], // Thumb
    [0, 5], [5, 6], [6, 7], [7, 8], // Index
    [0, 9], [9, 10], [10, 11], [11, 12], // Middle
    [0, 13], [13, 14], [14, 15], [15, 16], // Ring
    [0, 17], [17, 18], [18, 19], [19, 20], // Pinky
    [5, 9], [9, 13], [13, 17] // Knuckles
];

const GestureController: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const { handState, setHandState, setVideoReady } = useStore();
  const lastProcessRef = useRef(0);
  
  // Debounce state
  const pendingGestureRef = useRef<GestureType>(GestureType.NONE);
  const gestureCountRef = useRef(0);
  const GESTURE_CONFIRM_THRESHOLD = 5;

  useEffect(() => {
    let handLandmarker: HandLandmarker | null = null;
    let animationFrameId: number;
    let stream: MediaStream | null = null;

    const setupMediaPipe = async () => {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm"
        );
        
        handLandmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
            delegate: "GPU"
          },
          runningMode: "VIDEO",
          numHands: 1
        });

        startCamera();
      } catch (error) {
        console.error("Failed to initialize MediaPipe or Vision tasks:", error);
      }
    };

    const startCamera = () => {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        navigator.mediaDevices.getUserMedia({ video: { width: 320, height: 240 } }) // Request specific size to help aspect ratio
          .then((s) => {
            stream = s;
            if (videoRef.current) {
              videoRef.current.srcObject = stream;
              videoRef.current.addEventListener("loadeddata", predictWebcam);
              setVideoReady(true);
            }
          })
          .catch((err) => {
            console.warn("Camera access denied or unavailable:", err);
          });
      }
    };

    const predictWebcam = () => {
      if (!videoRef.current || !handLandmarker) return;

      const now = performance.now();
      // 30 FPS cap
      if (now - lastProcessRef.current > 33) {
        lastProcessRef.current = now;
        
        const startTimeMs = performance.now();
        if (videoRef.current.currentTime > 0) {
            try {
              const result = handLandmarker.detectForVideo(videoRef.current, startTimeMs);

              if (result.landmarks && result.landmarks.length > 0) {
                  const landmarks = result.landmarks[0];
                  
                  // --- Gesture Logic ---
                  // Helper to calculate distance
                  const dist = (idx1: number, idx2: number) => 
                     Math.hypot(landmarks[idx1].x - landmarks[idx2].x, landmarks[idx1].y - landmarks[idx2].y);

                  // Check extended fingers (Tip further from wrist than lower joint)
                  // We multiply by 1.1 for a small threshold/hysteresis
                  const isThumbUp = dist(4, 0) > dist(3, 0) * 1.1;
                  const isIndexUp = dist(8, 0) > dist(6, 0) * 1.1;
                  const isMiddleUp = dist(12, 0) > dist(10, 0) * 1.1;
                  const isRingUp = dist(16, 0) > dist(14, 0) * 1.1;
                  const isPinkyUp = dist(20, 0) > dist(18, 0) * 1.1;

                  let fingersUp = 0;
                  if (isThumbUp) fingersUp++;
                  if (isIndexUp) fingersUp++;
                  if (isMiddleUp) fingersUp++;
                  if (isRingUp) fingersUp++;
                  if (isPinkyUp) fingersUp++;

                  const pinchDist = dist(4, 8);
                  const isPinch = pinchDist < 0.05;

                  let detectedGesture = GestureType.NONE;

                  if (fingersUp >= 4) {
                      detectedGesture = GestureType.OPEN;
                  } else if (isIndexUp && isMiddleUp && !isRingUp && !isPinkyUp) {
                      // Victory: Index & Middle UP, Ring & Pinky DOWN. Thumb can be either.
                      detectedGesture = GestureType.VICTORY;
                  } else if (isPinch) {
                      detectedGesture = GestureType.PINCH;
                  } else if (fingersUp <= 1) {
                      detectedGesture = GestureType.FIST;
                  }

                  // Debounce
                  if (detectedGesture === pendingGestureRef.current) {
                      gestureCountRef.current++;
                  } else {
                      gestureCountRef.current = 0;
                      pendingGestureRef.current = detectedGesture;
                  }

                  // Position for 3D Scene
                  const x = (1 - landmarks[9].x) * 2 - 1; 
                  const y = -(landmarks[9].y * 2 - 1);
                  
                  const simpleLandmarks = landmarks.map(l => ({ x: l.x, y: l.y }));

                  if (gestureCountRef.current > GESTURE_CONFIRM_THRESHOLD) {
                      setHandState({ 
                          detected: true, 
                          gesture: detectedGesture, 
                          position: { x, y },
                          landmarks: simpleLandmarks
                      });
                  } else {
                      setHandState({ 
                          detected: true, 
                          position: { x, y },
                          landmarks: simpleLandmarks
                      });
                  }

              } else {
                  gestureCountRef.current = 0;
                  setHandState({ detected: false, gesture: GestureType.NONE, landmarks: [] });
              }
            } catch (e) {
              console.error("Prediction error", e);
            }
        }
      }
      animationFrameId = requestAnimationFrame(predictWebcam);
    };

    setupMediaPipe();

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
      if (handLandmarker) {
        handLandmarker.close();
      }
    };
  }, [setHandState, setVideoReady]);

  // Visualization Logic
  const renderSkeleton = () => {
    if (!handState.detected || handState.landmarks.length === 0) return null;

    // We use percentages directly since landmarks are 0-1
    return (
      <svg className="absolute inset-0 w-full h-full pointer-events-none">
        <defs>
            <filter id="preview-glow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="2" result="coloredBlur" />
                <feMerge>
                    <feMergeNode in="coloredBlur" />
                    <feMergeNode in="SourceGraphic" />
                </feMerge>
            </filter>
        </defs>
        <g filter="url(#preview-glow)">
             {/* Bones */}
             {CONNECTIONS.map(([start, end], i) => {
                const p1 = handState.landmarks[start];
                const p2 = handState.landmarks[end];
                return (
                    <line
                        key={`bone-${i}`}
                        x1={`${p1.x * 100}%`}
                        y1={`${p1.y * 100}%`}
                        x2={`${p2.x * 100}%`}
                        y2={`${p2.y * 100}%`}
                        stroke="#FFD700"
                        strokeWidth="2"
                        strokeOpacity="0.8"
                        strokeLinecap="round"
                    />
                );
            })}
            {/* Joints */}
            {handState.landmarks.map((lm, i) => (
                <circle
                    key={`joint-${i}`}
                    cx={`${lm.x * 100}%`}
                    cy={`${lm.y * 100}%`}
                    r={i % 4 === 0 && i !== 0 ? 3 : 1.5}
                    fill="#FFFFFF"
                    stroke="#FFD700"
                    strokeWidth="1"
                />
            ))}
        </g>
      </svg>
    );
  };

  return (
    <div className="absolute bottom-6 right-6 w-64 h-48 rounded-xl border-2 border-yellow-500/50 shadow-[0_0_20px_rgba(255,215,0,0.2)] bg-black/80 z-50 overflow-hidden">
        {/* 
            Container for content. 
            We scale-x-[-1] the CONTAINER so both video and SVG are flipped together.
            This ensures coordinates (0-1) match the visual video feed perfectly.
        */}
        <div className="relative w-full h-full transform scale-x-[-1]">
            <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="absolute inset-0 w-full h-full object-fill opacity-70"
            />
            {renderSkeleton()}
        </div>
        
        {/* Status Text (Not flipped, so outside the flipped container) */}
        <div className="absolute bottom-2 right-2 text-xs font-mono text-yellow-500/80 bg-black/50 px-2 rounded">
            {handState.detected ? `GESTURE: ${handState.gesture}` : "NO HAND"}
        </div>
    </div>
  );
};

export default GestureController;
