import { create } from 'zustand';
import type { AppState } from './types';

export const useStore = create<AppState>((set) => ({
  anchors: [],
  selectedAnchor: null,
  anchorMemories: [],
  selectedMemory: null,
  loadingLevel: 0,

  setAnchors: (anchors) => set({ anchors }),
  selectAnchor: (anchor) => set({ selectedAnchor: anchor, anchorMemories: [], selectedMemory: null }),
  setAnchorMemories: (memories) => set({ anchorMemories: memories }),
  selectMemory: (memory) => set({ selectedMemory: memory }),
  setLoadingLevel: (level) => set({ loadingLevel: level }),
}));
