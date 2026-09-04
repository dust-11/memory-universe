import { useMemo, useRef, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

/**
 * 创建软边粒子纹理：中心亮白、边缘完全透明
 * 这是让粒子有"雾气感"而非"硬球感"的关键
 */
function createSoftParticleTexture(size = 64): THREE.Texture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const center = size / 2;
  const gradient = ctx.createRadialGradient(center, center, 0, center, center, center);
  gradient.addColorStop(0, 'rgba(255,255,255,1)');
  gradient.addColorStop(0.2, 'rgba(255,255,255,0.8)');
  gradient.addColorStop(0.5, 'rgba(255,255,255,0.25)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

// HYG 恒星数据类型
interface HygStar {
  x: number;
  y: number;
  z: number;
  mag: number;
  ci: number;
  proper: string;
  spect: string;
}

// 真实恒星颜色映射
function starColor(ci: number): string {
  if (ci < 0) return '#9bb0ff';
  if (ci < 0.5) return '#ffffff';
  if (ci < 1.0) return '#fff4e8';
  if (ci < 1.5) return '#ffd2a1';
  return '#ffcc6f';
}

export function NebulaParticles() {
  const starsRef = useRef<THREE.Points>(null!);
  const mistRef = useRef<THREE.Points>(null!);

  const texture = useMemo(() => createSoftParticleTexture(64), []);

  // 真实恒星数据状态
  const [realStars, setRealStars] = useState<HygStar[] | null>(null);

  // 异步加载真实恒星
  useEffect(() => {
    let cancelled = false;
    fetch('/api/stars')
      .then(res => res.ok ? res.json() : Promise.reject('HTTP ' + res.status))
      .then(data => {
        if (!cancelled) {
          const stars = (data.stars || []) as HygStar[];
          setRealStars(stars);
          console.log(`✅ 真实恒星加载完成: ${stars.length}颗`);
        }
      })
      .catch(e => console.warn('真实恒星加载失败，使用假银河:', e));
    return () => { cancelled = true; };
  }, []);

  const starsGeo = useMemo(() => {
    const starCount = 35000;
    const sPos = new Float32Array(starCount * 3);
    const sCol = new Float32Array(starCount * 3);

    if (realStars && realStars.length > 0) {
      // ===== 真实恒星 =====
      const COORD_SCALE = 0.12;
      const sorted = [...realStars].sort((a, b) => a.mag - b.mag).slice(0, starCount);

      for (let i = 0; i < sorted.length; i++) {
        const star = sorted[i];
        sPos[i * 3] = star.x * COORD_SCALE;
        sPos[i * 3 + 1] = star.y * COORD_SCALE;
        sPos[i * 3 + 2] = star.z * COORD_SCALE;

        const color = new THREE.Color(starColor(star.ci));
        sCol[i * 3] = color.r;
        sCol[i * 3 + 1] = color.g;
        sCol[i * 3 + 2] = color.b;
      }
    } else {
      // ===== 假银河（备用） =====
      let seed = 7777;
      const rand = () => {
        seed = (seed * 1664525 + 1013904223) >>> 0;
        return seed / 0xffffffff;
      };

      for (let i = 0; i < starCount; i++) {
        const t = i / starCount;
        let x, y, z;

        if (t < 0.15) {
          const r = Math.pow(rand(), 0.4) * 20;
          const theta = rand() * Math.PI * 2;
          const phi = Math.acos(2 * rand() - 1);
          x = r * Math.sin(phi) * Math.cos(theta);
          y = r * Math.cos(phi) * 0.3;
          z = r * Math.sin(phi) * Math.sin(theta);
        } else {
          const armIdx = Math.floor(rand() * 3);
          const armAngle = (armIdx / 3) * Math.PI * 2;
          const r = 15 + Math.pow(rand(), 0.6) * 110;
          const twist = r * 0.04;
          const scatter = (rand() - 0.5) * (15 + r * 0.18);
          const theta = armAngle + twist + scatter / (r + 1);
          y = (rand() - 0.5) * (0.5 + r * 0.035);
          x = r * Math.cos(theta);
          z = r * Math.sin(theta);
        }

        sPos[i * 3] = x;
        sPos[i * 3 + 1] = y;
        sPos[i * 3 + 2] = z;

        const dist = Math.sqrt(x * x + z * z);
        const n = rand();
        if (dist < 18) {
          sCol[i * 3] = 1.0;
          sCol[i * 3 + 1] = 0.75 + n * 0.2;
          sCol[i * 3 + 2] = 0.2 + n * 0.2;
        } else if (dist < 60) {
          sCol[i * 3] = 0.6 + n * 0.35;
          sCol[i * 3 + 1] = 0.75 + n * 0.2;
          sCol[i * 3 + 2] = 1.0;
        } else {
          sCol[i * 3] = 0.3 + n * 0.2;
          sCol[i * 3 + 1] = 0.35 + n * 0.15;
          sCol[i * 3 + 2] = 0.65 + n * 0.25;
        }
      }
    }

    const sg = new THREE.BufferGeometry();
    sg.setAttribute('position', new THREE.BufferAttribute(sPos, 3));
    sg.setAttribute('color', new THREE.BufferAttribute(sCol, 3));
    return sg;
  }, [realStars]);

  const mistGeo = useMemo(() => {
    // ===== 大块弥散雾气（1.2万，超大尺寸+软纹理） =====
    const mistCount = 12000;
    const mPos = new Float32Array(mistCount * 3);
    const mCol = new Float32Array(mistCount * 3);

    let seed = 8888;
    const rand = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 0xffffffff;
    };

    for (let i = 0; i < mistCount; i++) {
      const r = Math.pow(rand(), 0.45) * 130;
      const theta = rand() * Math.PI * 2;
      const yRand = (rand() - 0.5) * (0.6 + r * 0.04);
      const x = r * Math.cos(theta);
      const z = r * Math.sin(theta);

      mPos[i * 3] = x;
      mPos[i * 3 + 1] = yRand;
      mPos[i * 3 + 2] = z;

      const dist = Math.sqrt(x * x + z * z);
      const n = rand();
      if (dist < 25) {
        mCol[i * 3] = 1.0;
        mCol[i * 3 + 1] = 0.75 + n * 0.15;
        mCol[i * 3 + 2] = 0.3 + n * 0.2;
      } else {
        mCol[i * 3] = 0.35 + n * 0.2;
        mCol[i * 3 + 1] = 0.45 + n * 0.2;
        mCol[i * 3 + 2] = 0.8 + n * 0.2;
      }
    }

    const mg = new THREE.BufferGeometry();
    mg.setAttribute('position', new THREE.BufferAttribute(mPos, 3));
    mg.setAttribute('color', new THREE.BufferAttribute(mCol, 3));
    return mg;
  }, []);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (starsRef.current) starsRef.current.rotation.y = t * 0.005;
    if (mistRef.current) mistRef.current.rotation.y = t * 0.003;
  });

  return (
    <>
      {/* 细密星点：小尺寸软纹理 */}
      <points ref={starsRef} geometry={starsGeo}>
        <pointsMaterial
          map={texture}
          size={0.8}
          vertexColors
          transparent
          opacity={0.6}
          sizeAttenuation
          depthWrite={false}
          alphaTest={0.001}
          blending={THREE.AdditiveBlending}
        />
      </points>

      {/* 雾气层：大尺寸软纹理，边缘完全透明，彻底消除"硬球"感 */}
      <points ref={mistRef} geometry={mistGeo}>
        <pointsMaterial
          map={texture}
          size={8}
          vertexColors
          transparent
          opacity={0.12}
          sizeAttenuation
          depthWrite={false}
          alphaTest={0.001}
          blending={THREE.AdditiveBlending}
        />
      </points>
    </>
  );
}
