import * as THREE from 'three';
import { legsVoxels, bodyVoxels, headVoxels, boosterVoxels, MECH_SCALE } from './voxelBuilder.js';
import { weaponVoxels, FINE, getWeapon } from './weapons.js';

/**
 * パーツアイコン生成
 * ボクセル配列を 2D Canvas にアイソメトリック投影で描画する（GPU不要・高速）。
 * 上面・左面・右面を明暗3段階で塗り分けて立体感を出す。
 */

const cache = new Map();
const COS = Math.cos(Math.PI / 6);
const SIN = Math.sin(Math.PI / 6);

function shadeHex(hex, f, emissive) {
  const c = new THREE.Color(hex);
  if (emissive) c.lerp(new THREE.Color(0xffffff), 0.25);
  else c.multiplyScalar(f);
  return `rgb(${Math.min(255, c.r * 255) | 0},${Math.min(255, c.g * 255) | 0},${Math.min(255, c.b * 255) | 0})`;
}

function drawIso(voxels, size = 128, rotate = 0) {
  const cv = document.createElement('canvas');
  cv.width = cv.height = size;
  const g = cv.getContext('2d');
  if (!voxels.length) return cv;

  // Y軸回転（武器は斜めに見せる）
  const cr = Math.cos(rotate), sr = Math.sin(rotate);
  const pts = voxels.map((v) => {
    const x = v.x * cr - v.z * sr;
    const z = v.x * sr + v.z * cr;
    return { ...v, rx: x, rz: z };
  });

  // 投影範囲を求めてキャンバスに収める
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const p of pts) {
    const sx = (p.rx - p.rz) * COS;
    const sy = -p.y + (p.rx + p.rz) * SIN;
    minX = Math.min(minX, sx - 1); maxX = Math.max(maxX, sx + 1);
    minY = Math.min(minY, sy - 1.2); maxY = Math.max(maxY, sy + 1);
  }
  const scale = (size * 0.84) / Math.max(maxX - minX, maxY - minY);
  const ox = size / 2 - ((minX + maxX) / 2) * scale;
  const oy = size / 2 - ((minY + maxY) / 2) * scale;

  // 奥から手前へ（画家のアルゴリズム）。視点は +X,+Y,+Z 方向
  pts.sort((a, b) => (a.rx + a.rz + a.y) - (b.rx + b.rz + b.y));
  const poly = (arr, fill) => {
    g.beginPath();
    g.moveTo(arr[0][0], arr[0][1]);
    for (let i = 1; i < arr.length; i++) g.lineTo(arr[i][0], arr[i][1]);
    g.closePath();
    g.fillStyle = fill;
    g.fill();
  };
  for (const p of pts) {
    const hx = 0.5 * (p.sx || 1), hy = 0.5 * (p.sy || 1), hz = 0.5 * (p.sz || 1);
    const P = (dx, dy, dz) => {
      const x = p.rx + dx, y = p.y + dy, z = p.rz + dz;
      return [ox + (x - z) * COS * scale, oy + (-y + (x + z) * SIN) * scale];
    };
    const em = !!p.emissive;
    const top = [P(-hx, hy, -hz), P(hx, hy, -hz), P(hx, hy, hz), P(-hx, hy, hz)];
    const fx = [P(hx, hy, -hz), P(hx, hy, hz), P(hx, -hy, hz), P(hx, -hy, -hz)];
    const fz = [P(-hx, hy, hz), P(hx, hy, hz), P(hx, -hy, hz), P(-hx, -hy, hz)];
    poly(top, shadeHex(p.color, 1.3, em));
    poly(fz, shadeHex(p.color, 0.9, em));
    poly(fx, shadeHex(p.color, 0.62, em));
  }
  return cv;
}

/** スロットとパーツからアイコン画像（dataURL）を得る */
export function partIcon(slot, part) {
  const key = `${slot}_${part.id}`;
  if (cache.has(key)) return cache.get(key);
  let voxels = [];
  let rot = 0;
  if (slot === 'head') voxels = headVoxels(part);
  else if (slot === 'body') voxels = bodyVoxels(part);
  else if (slot === 'legs') voxels = legsVoxels(part);
  else if (slot === 'booster') voxels = boosterVoxels(part);
  else {
    const w = weaponVoxels(getWeapon(part.id));
    voxels = [...w.list, ...(w.spinner || [])];
    rot = -Math.PI * 0.62;
  }
  void MECH_SCALE; void FINE;
  const url = voxels.length ? drawIso(voxels, 96, rot).toDataURL() : '';
  cache.set(key, url);
  return url;
}
