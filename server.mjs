/**
 * 轻量 API 服务器：读取 memory.db，给前端提供锚点和记忆数据
 * 启动：node server.mjs
 * 端口：3001（前端 Vite 代理到它）
 */
import { createServer } from 'http';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const require = createRequire(import.meta.url);

// memory.db 路径
const DB_PATH = process.env.MEMORY_DB || path.join(process.env.HOME, '.openclaw/memory/memory.db');

if (!fs.existsSync(DB_PATH)) {
  console.error(`memory.db 不存在: ${DB_PATH}`);
  console.error('请设置环境变量 MEMORY_DB 指向正确路径');
  process.exit(1);
}

let Database;
try {
  Database = require('better-sqlite3');
} catch (e) {
  console.error('better-sqlite3 未安装，运行 npm install');
  process.exit(1);
}

const db = new Database(DB_PATH, { readonly: true });

// 检查表结构
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(r => r.name);
console.log('memory.db 表：', tables);

// 锚点列表：join anchors 表拿到 summary 作为展示名
function getAnchors() {
  const rows = db.prepare(`
    SELECT a.anchor_id as id,
           COALESCE(NULLIF(a.summary,''), a.anchor_id) as name,
           COUNT(m.id) as count
    FROM anchors a
    LEFT JOIN memories m ON m.anchor_id = a.anchor_id
    WHERE a.archived_at IS NULL
    GROUP BY a.anchor_id
    HAVING count > 0
    ORDER BY count DESC
  `).all();
  return rows.map(r => ({ id: r.id, name: String(r.name).slice(0, 40), count: r.count }));
}

function getAnchorMemories(anchorId) {
  return db.prepare(`
    SELECT id, summary, type, depth, weight, created_at
    FROM memories
    WHERE anchor_id = ?
    ORDER BY weight DESC, created_at DESC
    LIMIT 300
  `).all(anchorId).map(r => ({
    id: r.id,
    anchor_id: anchorId,
    summary: String(r.summary || '').slice(0, 120),
    type: r.type || 'core',
    depth: r.depth || 'shallow',
    weight: r.weight || 0,
  }));
}

function getMemoryDetail(memoryId) {
  return db.prepare(`SELECT * FROM memories WHERE id = ?`).get(memoryId) || null;
}

// HYG v4.4 星表：读取真实恒星数据
let starsCache = null;
function getStars() {
  if (starsCache) return starsCache;

  const csvPath = path.join(process.env.HOME, 'memory-universe/data/hyg_v44.csv');
  if (!fs.existsSync(csvPath)) {
    console.error('HYG星表不存在:', csvPath);
    return { stars: [], error: 'HYG星表文件不存在' };
  }

  const content = fs.readFileSync(csvPath, 'utf-8');
  const lines = content.split('\n');
  const headers = lines[0].split(',').map(h => h.replace(/"/g, ''));

  const xIdx = headers.indexOf('x');
  const yIdx = headers.indexOf('y');
  const zIdx = headers.indexOf('z');
  const magIdx = headers.indexOf('mag');
  const ciIdx = headers.indexOf('ci');
  const properIdx = headers.indexOf('proper');
  const spectIdx = headers.indexOf('spect');

  const stars = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // 简单的CSV解析（处理引号）
    const fields = [];
    let current = '';
    let inQuotes = false;
    for (const char of line) {
      if (char === '"') inQuotes = !inQuotes;
      else if (char === ',' && !inQuotes) {
        fields.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    fields.push(current);

    const x = parseFloat(fields[xIdx]) || 0;
    const y = parseFloat(fields[yIdx]) || 0;
    const z = parseFloat(fields[zIdx]) || 0;
    const mag = parseFloat(fields[magIdx]) || 99;
    const ci = parseFloat(fields[ciIdx]) || 0;
    const proper = fields[properIdx] || '';
    const spect = fields[spectIdx] || '';

    // 过滤无效数据
    if (x === 0 && y === 0 && z === 0) continue;
    if (mag > 15) continue; // 只保留可见星

    stars.push({ x, y, z, mag, ci, proper, spect });
  }

  starsCache = { stars, total: stars.length };
  console.log(`HYG星表加载完成: ${stars.length}颗恒星`);
  return starsCache;
}

// HTTP 路由
const server = createServer((req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');

  const url = req.url?.split('?')[0] || '/';

  if (url === '/api/anchors') {
    res.end(JSON.stringify(getAnchors()));
    return;
  }

  if (url === '/api/stars') {
    res.end(JSON.stringify(getStars()));
    return;
  }

  const anchorMatch = url.match(/^\/api\/anchors\/(.+)\/memories$/);
  if (anchorMatch) {
    const anchorId = decodeURIComponent(anchorMatch[1]);
    res.end(JSON.stringify(getAnchorMemories(anchorId)));
    return;
  }

  const memoryMatch = url.match(/^\/api\/memories\/(\d+)$/);
  if (memoryMatch) {
    const detail = getMemoryDetail(parseInt(memoryMatch[1]));
    res.end(JSON.stringify(detail));
    return;
  }

  res.statusCode = 404;
  res.end(JSON.stringify({ error: 'not found' }));
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Memory Universe API 已启动：http://localhost:${PORT}`);
  console.log(`数据源：${DB_PATH}`);
});
