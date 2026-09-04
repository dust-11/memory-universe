// 锚点（行星）
export interface Anchor {
  id: string;
  name: string;
  count: number;        // 该锚点下的记忆数量 → 映射行星大小/亮度
  color: string;        // 主色调（hex）
  position: [number, number, number]; // 三维坐标
}

// 记忆节点（轻量版，Level 2 加载）
export interface MemoryNode {
  id: number;
  anchor_id: string;
  summary: string;      // 摘要（前100字）
  type: 'core' | 'emotion';
  depth: 'shallow' | 'deep';
  position: [number, number, number]; // 相对于行星的本地坐标
}

// 记忆详情（完整版，Level 3 点击后加载）
export interface MemoryDetail extends MemoryNode {
  content: string;
  keywords: string[];
  created_at?: string;
}

// 应用状态
export interface AppState {
  anchors: Anchor[];
  selectedAnchor: Anchor | null;
  anchorMemories: MemoryNode[];
  selectedMemory: MemoryDetail | null;
  loadingLevel: 0 | 1 | 2 | 3;

  setAnchors: (anchors: Anchor[]) => void;
  selectAnchor: (anchor: Anchor | null) => void;
  setAnchorMemories: (memories: MemoryNode[]) => void;
  selectMemory: (memory: MemoryDetail | null) => void;
  setLoadingLevel: (level: 0 | 1 | 2 | 3) => void;
}
