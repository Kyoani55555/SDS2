export type Vector3 = [number, number, number];

export enum TreeMode {
  CHAOS = 'CHAOS',
  FORMED = 'FORMED',
  GRID = 'GRID'
}

export enum GestureType {
  FIST = 'FIST',
  OPEN = 'OPEN',
  PINCH = 'PINCH',
  VICTORY = 'VICTORY',
  NONE = 'NONE'
}

export interface ParticleData {
  id: string;
  chaosPos: Vector3;
  treePos: Vector3;
  rotation: Vector3;
  scale: number;
  speed: number; // Unique lerp speed for "weight" simulation
  color: string;
}

export interface HandState {
  detected: boolean;
  gesture: GestureType;
  position: { x: number; y: number }; // Normalized -1 to 1
  landmarks: { x: number; y: number }[]; // Normalized 0 to 1 (MediaPipe raw)
}