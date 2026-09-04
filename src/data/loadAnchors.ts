/**
 * Level 1 数据加载：从后端 API 读取锚点列表
 * 用 HYG v4.4 真实恒星位置替换假银河
 */
import type { Anchor } from '../types';

// HYG 恒星数据类型
interface HygStar {
  x: number;      // 秒差距
  y: number;
  z: number;
  mag: number;    // 视星等（越小越亮）
  ci: number;     // 色指数 B-V（蓝→红）
  proper: string; // 星名
  spect: string;  // 光谱型
}

// 真实恒星数据缓存
let starsCache: HygStar[] | null = null;

// 坐标缩放：真实 xyz 范围约 ±1000pc，场景约 ±120 单位 → 缩放 0.12
const COORD_SCALE = 0.12;

// 按亮度排序，取前 N 颗作为锚点行星位置
function getStarsForAnchors(anchorCount: number): HygStar[] {
  if (!starsCache) return [];
  // 按视星等排序（越小越亮），取前 anchorCount 颗
  return [...starsCache]
    .sort((a, b) => a.mag - b.mag)
    .slice(0, anchorCount);
}

// 真实恒星颜色映射：ci 色指数 → 颜色
// ci < 0: 蓝白, ci 0-0.5: 白, ci 0.5-1: 黄, ci 1-1.5: 橙, ci > 1.5: 红
function starColor(ci: number): string {
  if (ci < 0) return '#9bb0ff';      // 蓝白
  if (ci < 0.5) return '#ffffff';    // 白
  if (ci < 1.0) return '#fff4e8';    // 黄白
  if (ci < 1.5) return '#ffd2a1';    // 橙
  return '#ffcc6f';                   // 红
}

// 锚点颜色：冷白/淡蓝白，明显区别于星云的暖黄/冷蓝配色
// 让行星在星云中一眼可辨，不和背景粒子混淆
function anchorColor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = ((hash << 5) - hash + id.charCodeAt(i)) | 0;
  }
  // hue 在 180-240（青/蓝白），低饱和高亮度，像真实恒星的白色星点
  const hue = 180 + (Math.abs(hash) % 60);
  const sat = 15 + (Math.abs(hash >> 8) % 30);
  const lit = 78 + (Math.abs(hash >> 16) % 18);
  return `hsl(${hue},${sat}%,${lit}%)`;
}

export async function loadAnchors(): Promise<Anchor[]> {
  // 先加载真实恒星数据
  if (!starsCache) {
    const starsRes = await fetch('/api/stars');
    if (starsRes.ok) {
      const data = await starsRes.json();
      starsCache = data.stars || [];
      console.log(`HYG星表加载: ${starsCache.length}颗恒星`);
    } else {
      console.warn('HYG星表加载失败，使用假银河位置');
    }
  }

  const res = await fetch('/api/anchors');
  if (!res.ok) throw new Error(`loadAnchors: HTTP ${res.status}`);
  const raw: { id: string; name: string; count: number }[] = await res.json();
  const total = raw.length;

  // 获取真实恒星位置
  const stars = getStarsForAnchors(total);
  const useRealStars = stars.length >= total;

  if (useRealStars) {
    console.log(`使用真实恒星位置: ${total}颗`);
  } else {
    console.warn(`真实恒星不足(${stars.length}/${total})，回退到假银河`);
  }

  return raw.map((r, i) => {
    let position: [number, number, number];
    let color: string;

    if (useRealStars) {
      // 用真实恒星位置
      const star = stars[i];
      position = [
        star.x * COORD_SCALE,
        star.y * COORD_SCALE,
        star.z * COORD_SCALE,
      ];
      color = starColor(star.ci);
    } else {
      // 回退到假银河
      position = galaxyPosition(i, total, r.count);
      color = anchorColor(r.id);
    }

    return {
      ...r,
      color,
      position,
    };
  });
}

// 假银河位置（备用，当真实恒星不足时）
function galaxyPosition(index: number, total: number, count: number): [number, number, number] {
  const rng = seededRandom(index * 7919 + 1234); // 稳定随机，不每次刷新变位置

  // 按记忆数量排序的 index：越靠前的锚点记忆越多，应该越靠近核心
  const t = index / total; // 0=核心大锚点, 1=边缘小锚点

  // 核球区域（前20%的大锚点聚集在中心）
  if (t < 0.2) {
    const r = rng() * 18 + 2;
    const theta = rng() * Math.PI * 2;
    const phi = (rng() - 0.5) * Math.PI * 0.6;
    return [
      r * Math.cos(theta) * Math.cos(phi),
      r * Math.sin(phi) * 0.5,
      r * Math.sin(theta) * Math.cos(phi),
    ];
  }

  // 螺旋臂区域（中间60%分布在2-4条旋臂上）
  if (t < 0.8) {
    const armIndex = Math.floor(rng() * 3); // 3条旋臂
    const armOffset = (armIndex / 3) * Math.PI * 2;
    const r = 22 + (t - 0.2) / 0.6 * 70 + rng() * 12;
    const armTheta = r * 0.045 + armOffset; // 旋臂角度随半径增加
    const scatter = (rng() - 0.5) * 14; // 旋臂宽度随机散落
    const theta = armTheta + scatter / r;
    const height = (rng() - 0.5) * (1.5 + r * 0.04);
    return [
      r * Math.cos(theta),
      height,
      r * Math.sin(theta),
    ];
  }

  // 外围散落（后20%随机散落在外围）
  const r = 90 + rng() * 30;
  const theta = rng() * Math.PI * 2;
  const height = (rng() - 0.5) * 8;
  return [r * Math.cos(theta), height, r * Math.sin(theta)];
}

// 稳定种子随机数生成器（同 index 每次位置一样）
function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

export async function loadAnchorMemories(anchorId: string) {
  const res = await fetch(`/api/anchors/${encodeURIComponent(anchorId)}/memories`);
  if (!res.ok) throw new Error(`loadAnchorMemories: HTTP ${res.status}`);
  return res.json();
}

export async function loadMemoryDetail(memoryId: number) {
  const res = await fetch(`/api/memories/${memoryId}`);
  if (!res.ok) throw new Error(`loadMemoryDetail: HTTP ${res.status}`);
  return res.json();
}
