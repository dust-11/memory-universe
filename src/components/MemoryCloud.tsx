import { useMemo } from 'react';
import { Html } from '@react-three/drei';
import type { MemoryNode } from '../types';

interface Props {
  memories: MemoryNode[];
  anchorColor: string;
  anchorPosition: [number, number, number];
  onMemoryClick?: (memory: MemoryNode) => void;
}

// 在锚点周围随机散布记忆节点（暂时用随机，后期换成 embedding 位置）
function randomSpherePoint(radius: number): [number, number, number] {
  const theta = Math.random() * Math.PI * 2;
  const phi = Math.acos(2 * Math.random() - 1);
  const r = radius * Math.cbrt(Math.random()); // 立方根分布，内部也有点
  return [
    r * Math.sin(phi) * Math.cos(theta),
    r * Math.sin(phi) * Math.sin(theta),
    r * Math.cos(phi),
  ];
}

export function MemoryCloud({ memories, anchorColor, anchorPosition, onMemoryClick }: Props) {
  // 给每个记忆生成一个随机本地坐标（相对于锚点）
  const memoryPoints = useMemo(
    () => memories.map((m) => ({ ...m, localPos: randomSpherePoint(12) })),
    [memories]
  );

  return (
    <group position={anchorPosition}>
      {memoryPoints.map((mem) => {
        // 深度记忆更大更亮，浅度记忆小而暗
        const size = mem.depth === 'deep' ? 0.3 : 0.15;
        const intensity = mem.depth === 'deep' ? 1.0 : 0.4;
        
        return (
          <mesh
            key={mem.id}
            position={mem.localPos}
            onClick={(e) => { e.stopPropagation(); onMemoryClick?.(mem); }}
            onPointerOver={(e) => { e.stopPropagation(); document.body.style.cursor = 'pointer'; }}
            onPointerOut={(e) => { e.stopPropagation(); document.body.style.cursor = 'default'; }}
          >
            <sphereGeometry args={[size, 8, 8]} />
            <meshStandardMaterial
              color={anchorColor}
              emissive={anchorColor}
              emissiveIntensity={intensity}
              transparent
              opacity={0.85}
            />
          </mesh>
        );
      })}
      
      {/* 显示记忆数量提示 */}
      <Html position={[0, 15, 0]} center distanceFactor={100}>
        <div style={{
          color: '#b9c2d6',
          fontSize: 11,
          background: 'rgba(0,0,0,0.6)',
          padding: '3px 8px',
          borderRadius: 4,
          whiteSpace: 'nowrap',
          pointerEvents: 'none',
        }}>
          {memories.length} 条记忆已展开
        </div>
      </Html>
    </group>
  );
}
