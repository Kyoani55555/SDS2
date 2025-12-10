import { create } from 'zustand';
import { TreeMode, HandState, GestureType } from './types';

interface AppState {
  mode: TreeMode;
  handState: HandState;
  setHandState: (state: Partial<HandState>) => void;
  toggleMode: () => void;
  videoReady: boolean;
  setVideoReady: (ready: boolean) => void;
  photos: string[];
  setPhotos: (photos: string[]) => void;
}

export const useStore = create<AppState>((set) => ({
  mode: TreeMode.FORMED,
  videoReady: false,
  handState: {
    detected: false,
    gesture: GestureType.NONE,
    position: { x: 0, y: 0 },
    landmarks: [],
  },
  photos: [],
  setHandState: (partial) =>
    set((state) => {
      const newState = { ...state.handState, ...partial };
      let newMode = state.mode;

      if (newState.detected) {
        switch (newState.gesture) {
            case GestureType.OPEN:
                newMode = TreeMode.CHAOS;
                break;
            case GestureType.FIST:
                newMode = TreeMode.FORMED;
                break;
            case GestureType.PINCH:
                newMode = TreeMode.GRID;
                break;
            // No default: retain current mode if gesture is NONE or ambiguous
        }
      }
      
      return { 
        handState: newState,
        mode: newMode
      };
    }),
  toggleMode: () => set((state) => ({ 
    mode: state.mode === TreeMode.FORMED ? TreeMode.CHAOS : TreeMode.FORMED 
  })),
  setVideoReady: (ready) => set({ videoReady: ready }),
  setPhotos: (photos) => set({ photos }),
}));