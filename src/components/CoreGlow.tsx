import * as THREE from 'three';

/**
 * 星系核心光晕
 * 用极小的高亮点 + pointLight，让 Bloom 自然扩散出核球感
 * 不用大球体，避免硬边圆形
 */
export function CoreGlow() {
  return (
    <group>
      {/* 核心白点，极小，靠 Bloom 扩散成大光晕 */}
      <mesh>
        <sphereGeometry args={[1.2, 16, 16]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>

      {/* 第二层暖黄小点 */}
      <mesh>
        <sphereGeometry args={[3, 16, 16]} />
        <meshBasicMaterial color="#ffe090" transparent opacity={0.6} />
      </mesh>

      {/* 额外的点光源，让核心向外真实照亮周围粒子 */}
      <pointLight color="#fff4c0" intensity={6} distance={180} decay={1.4} />
    </group>
  );
}
