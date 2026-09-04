import { useRef, useState } from 'react';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import type { Anchor } from '../types';

interface Props {
  anchor: Anchor;
  onClick: (anchor: Anchor) => void;
  selected: boolean;
}

export function AnchorPlanet({ anchor, onClick, selected }: Props) {
  const meshRef = useRef<THREE.Mesh>(null!);
  const [hovered, setHovered] = useState(false);

  // 大小：更小，像真实星点（最小0.25，最大1.8）
  const size = Math.max(0.25, Math.min(1.8, 0.25 + anchor.count * 0.006));
  const emissiveIntensity = selected ? 2.0 : hovered ? 1.2 : 0.6;

  return (
    <group position={anchor.position}>
      <mesh
        ref={meshRef}
        onClick={(e) => { e.stopPropagation(); onClick(anchor); }}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={(e) => {
          e.stopPropagation();
          setHovered(false);
          document.body.style.cursor = 'default';
        }}
      >
        {/* 减少多边形数，提高性能 */}
        <sphereGeometry args={[size, 8, 8]} />
        <meshStandardMaterial
          color={anchor.color}
          emissive={anchor.color}
          emissiveIntensity={emissiveIntensity}
          roughness={0.2}
          metalness={0.1}
        />
      </mesh>

      {/* 选中光环 */}
      {selected && (
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[size * 1.6, size * 1.9, 32]} />
          <meshBasicMaterial color={anchor.color} transparent opacity={0.6} side={THREE.DoubleSide} />
        </mesh>
      )}

      {/* 标签 */}
      {(hovered || selected) && (
        <Html distanceFactor={80} center zIndexRange={[0, 10]}>
          <div style={{
            background: 'rgba(7,8,15,0.88)',
            color: '#fff',
            padding: '5px 12px',
            borderRadius: 6,
            fontSize: 12,
            whiteSpace: 'nowrap',
            border: `1px solid ${anchor.color}`,
            pointerEvents: 'none',
            userSelect: 'none',
            boxShadow: `0 0 8px ${anchor.color}55`,
          }}>
            {anchor.name.length > 28 ? anchor.name.slice(0, 28) + '…' : anchor.name}
            <span style={{ marginLeft: 6, opacity: 0.5, fontSize: 10 }}>
              ×{anchor.count}
            </span>
          </div>
        </Html>
      )}
    </group>
  );
}
