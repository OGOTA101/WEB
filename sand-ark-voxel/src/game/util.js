import * as THREE from 'three';
import { SHIP_BOUNDS } from '../desertWorld.js';

/** ゲーム全体で共有する定数とヘルパー */
export const HW = SHIP_BOUNDS.halfWidth;
export const HL = SHIP_BOUNDS.halfLength;
export const GRAVITY = 26;
export const MECH_LENGTH = 3.2;      // 回避距離 ≒ 機体1機分
export const BOSS_SCALE = 4;         // ボスの大きさ（さらに2倍＝初期比4倍の超巨大サイズ）
/** プレイヤーと雑魚の攻撃判定。ボス本体の攻撃はこの倍率を掛けない */
export const ATTACK_HIT_SCALE = 1 / 3;
export const WRECK_TIME = 30;        // 残骸が残る時間
export const REDEPLOY_TIME = 30;     // ガレージからの再出撃にかかる時間
export const REVIVE_TIME = 5;        // 仲間が近くにいて復旧完了するまでの時間
export const REVIVE_RADIUS = 5.5;
export const RED = new THREE.Color(0xff1a1a);

export const $ = (id) => document.getElementById(id);

/** シーンから除外したメッシュの非共有リソースを解放 */
export function disposeObject(root) {
  if (!root) return;
  root.traverse((o) => {
    if (o.isInstancedMesh) {
      o.dispose();
    }
    if (o.geometry && o.geometry.userData?.owned) {
      o.geometry.dispose();
    }
    if (o.material) {
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      for (const m of mats) {
        if (m && m.userData?.owned) m.dispose();
      }
    }
  });
}

export function raySphere(o, d, c, r) {
  const ox = o.x - c.x, oy = o.y - c.y, oz = o.z - c.z;
  const b = ox * d.x + oy * d.y + oz * d.z;
  const cc = ox * ox + oy * oy + oz * oz - r * r;
  const h = b * b - cc;
  if (h < 0) return Infinity;
  const sq = Math.sqrt(h);
  const t = -b - sq;
  if (t >= 0) return t;
  return -b + sq >= 0 ? 0 : Infinity;
}

export function rayAABB(o, d, mn, mx) {
  let tmin = 0, tmax = Infinity;
  for (const k of ['x', 'y', 'z']) {
    if (Math.abs(d[k]) < 1e-8) {
      if (o[k] < mn[k] || o[k] > mx[k]) return Infinity;
    } else {
      let t1 = (mn[k] - o[k]) / d[k];
      let t2 = (mx[k] - o[k]) / d[k];
      if (t1 > t2) [t1, t2] = [t2, t1];
      tmin = Math.max(tmin, t1);
      tmax = Math.min(tmax, t2);
      if (tmin > tmax) return Infinity;
    }
  }
  return tmin;
}

export function distPointSegment(p, a, b) {
  const ab = b.clone().sub(a);
  const t = THREE.MathUtils.clamp(p.clone().sub(a).dot(ab) / Math.max(1e-6, ab.lengthSq()), 0, 1);
  return a.clone().addScaledVector(ab, t).distanceTo(p);
}

export function lerpAngle(a, b, t) {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
}

export const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

export function obstacleBox(ob) {
  return [{ x: ob.minX, y: 0, z: ob.minZ }, { x: ob.maxX, y: ob.maxY, z: ob.maxZ }];
}
