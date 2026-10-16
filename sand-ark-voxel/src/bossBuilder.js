import * as THREE from 'three';
import { buildVoxelCluster } from './voxelBuilder.js';

/**
 * ステージボスのボクセルモデル（3体）
 * それぞれ部位ごとにアニメーションさせ、コアは攻撃予兆で赤く発光する。
 *
 *  leviathan : 砂鯨リヴァイアサン。体節がうねりながら船と並走し、甲板を飛び越える
 *  prism     : 蒼晶碑プリズム・モノリス。巨大結晶の周りを3重リングが回り、ビームを放つ
 *  omega     : 紅月の巨神オメガ・コロッサス。両腕と光輪を持つ浮遊巨人。甲板に乗り上げる
 */

function makeCore(radius, color) {
  const mat = new THREE.MeshStandardMaterial({
    color, emissive: color, emissiveIntensity: 2.6, metalness: 0.1, roughness: 0.25
  });
  const mesh = new THREE.Mesh(new THREE.IcosahedronGeometry(radius, 1), mat);
  // 外側のオーラ
  const halo = new THREE.Mesh(
    new THREE.IcosahedronGeometry(radius * 1.6, 1),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.18, depthWrite: false })
  );
  mesh.add(halo);
  return { mesh, mat, halo, baseColor: new THREE.Color(color) };
}

// ---------------------------------------------------------------------------
// 1. 砂鯨リヴァイアサン
// ---------------------------------------------------------------------------
function buildLeviathan() {
  const root = new THREE.Group();
  const S = 0.75;
  const HULL = 0x2b3a4f, BELLY = 0x8a7a63, PLATE = 0x40536b, GLOW = 0x5ef2ff;

  const segments = [];
  const segCount = 7;
  for (let i = 0; i < segCount; i++) {
    const V = [];
    const t = i / (segCount - 1);
    const r = i === 0 ? 5 : Math.max(1.8, 5.2 - t * 3.6); // 頭が太く尾へ細く
    for (let x = -Math.ceil(r); x <= Math.ceil(r); x++)
      for (let y = -Math.ceil(r); y <= Math.ceil(r); y++) {
        const d = Math.sqrt(x * x + (y * 1.25) ** 2);
        if (d > r) continue;
        const edge = d > r - 1.1;
        if (!edge) continue;
        for (let z = 0; z < 5; z++) {
          const isBelly = y < -r * 0.45;
          const rib = z === 2 && !isBelly && Math.abs(x) >= r - 1.2; // 光る肋骨ライン
          V.push({
            x, y, z: -z,
            color: rib ? GLOW : isBelly ? BELLY : (x + z) % 3 === 0 ? PLATE : HULL,
            emissive: rib ? GLOW : 0, emissiveIntensity: rib ? 1.8 : 0,
            metalness: isBelly ? 0.4 : 0.8, roughness: isBelly ? 0.6 : 0.32
          });
        }
      }
    // 背中の結晶ヒレ
    if (i > 0 && i < segCount - 1) {
      const h = Math.round(r * 0.8);
      for (let y = 0; y < h; y++) V.push({ x: 0, y: Math.ceil(r / 1.25) + y, z: -2, color: GLOW, emissive: GLOW, emissiveIntensity: 1.4 - y * 0.15, metalness: 0.2, roughness: 0.1 });
    }
    const seg = buildVoxelCluster(V, S);
    seg.position.z = i * 5 * S;
    root.add(seg);
    segments.push(seg);
  }

  // 頭部：大顎と目
  const headV = [];
  for (let x = -5; x <= 5; x++) for (let z = 0; z < 4; z++) {
    headV.push({ x, y: -4, z: -z - 1, color: 0x1d2633, metalness: 0.9, roughness: 0.3 }); // 下顎
    if (Math.abs(x) <= 4 && z === 3 && x % 2 === 0) headV.push({ x, y: -3, z: -4, color: 0xe8e2d0, metalness: 0.5, roughness: 0.3 }); // 牙
  }
  for (const ex of [-3, 3]) headV.push({ x: ex, y: 1, z: -1, color: 0xff2a3a, emissive: 0xff2a3a, emissiveIntensity: 3.5, sx: 1.4, sy: 1, sz: 1 });
  const head = buildVoxelCluster(headV, S);
  segments[0].add(head);

  // 尾ビレ
  const tailV = [];
  for (let x = -7; x <= 7; x++) {
    const w = 7 - Math.abs(x);
    for (let z = 0; z < Math.max(1, w * 0.6); z++) tailV.push({ x, y: 0, z: -z, color: Math.abs(x) > 4 ? GLOW : HULL, emissive: Math.abs(x) > 4 ? GLOW : 0, emissiveIntensity: 1.2 });
  }
  const tail = buildVoxelCluster(tailV, S);
  tail.position.z = 6 * S;
  segments[segCount - 1].add(tail);

  // コア（腹部の心臓）
  const core = makeCore(1.8, 0x5ef2ff);
  core.mesh.position.set(0, -3.2, 10 * S);
  root.add(core.mesh);

  // 全体の中心をずらして頭を前方に
  root.children.forEach((c) => (c.position.z -= 14 * S));

  return {
    root, core, radius: 9,
    hitPoints: [new THREE.Vector3(0, 0, -10), new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, 10)],
    animate(t, intensity = 1) {
      segments.forEach((seg, i) => {
        seg.position.x = Math.sin(t * 1.4 - i * 0.7) * 1.2 * intensity;
        seg.position.y = Math.sin(t * 1.1 - i * 0.6) * 0.7;
        seg.rotation.y = Math.cos(t * 1.4 - i * 0.7) * 0.12;
      });
      tail.rotation.x = Math.sin(t * 2.2) * 0.35;
      core.halo.scale.setScalar(1 + Math.sin(t * 4) * 0.12);
    }
  };
}

// ---------------------------------------------------------------------------
// 2. 蒼晶碑プリズム・モノリス
// ---------------------------------------------------------------------------
function buildPrism() {
  const root = new THREE.Group();
  const S = 0.7;
  const CRY = 0x3d7bff, CRY2 = 0x9fd4ff, DARKC = 0x16224a;

  // 八面体状の巨大結晶（中空）
  const V = [];
  const H = 13;
  for (let y = -H; y <= H; y++) {
    const r = Math.round((H - Math.abs(y)) * 0.55) + 1;
    for (let x = -r; x <= r; x++)
      for (let z = -r; z <= r; z++) {
        const m = Math.abs(x) + Math.abs(z);
        if (m > r || m < r - 1) continue;
        const facet = (y + x + z) % 4 === 0;
        V.push({
          x, y, z,
          color: facet ? CRY2 : y % 5 === 0 ? DARKC : CRY,
          emissive: facet ? CRY2 : CRY, emissiveIntensity: facet ? 1.2 : 0.35,
          metalness: 0.3, roughness: 0.08
        });
      }
  }
  const crystal = buildVoxelCluster(V, S);
  root.add(crystal);

  // 3重の回転リング
  const rings = [];
  const ringDefs = [
    { r: 12, tilt: [0.35, 0, 0], color: 0x80e5ff },
    { r: 15, tilt: [-0.5, 0, 0.6], color: 0xc5a3ff },
    { r: 18, tilt: [0.2, 0, -0.9], color: 0x64ffda }
  ];
  for (const d of ringDefs) {
    const RV = [];
    const n = Math.round(d.r * 3.2);
    for (let i = 0; i < n; i++) {
      if (i % 5 === 4) continue; // 隙間で機械的なリング感
      const a = (i / n) * Math.PI * 2;
      RV.push({ x: Math.cos(a) * d.r, y: 0, z: Math.sin(a) * d.r, color: d.color, emissive: d.color, emissiveIntensity: 1.3, metalness: 0.6, roughness: 0.2 });
    }
    const pivot = new THREE.Group();
    pivot.rotation.set(...d.tilt);
    const ring = buildVoxelCluster(RV, S);
    pivot.add(ring);
    root.add(pivot);
    rings.push(ring);
  }

  // 周囲を漂う結晶の破片
  const shards = [];
  for (let i = 0; i < 8; i++) {
    const sh = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.9 + Math.random() * 0.6),
      new THREE.MeshStandardMaterial({ color: CRY2, emissive: CRY, emissiveIntensity: 0.8, metalness: 0.3, roughness: 0.1 })
    );
    root.add(sh);
    shards.push({ mesh: sh, a: (i / 8) * Math.PI * 2, h: (Math.random() - 0.5) * 12 });
  }

  // 中央の瞳（コア）
  const core = makeCore(2.2, 0x80e5ff);
  root.add(core.mesh);

  return {
    root, core, radius: 8.5,
    hitPoints: [new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 5, 0), new THREE.Vector3(0, -5, 0)],
    animate(t) {
      rings[0].rotation.y = t * 0.6;
      rings[1].rotation.y = -t * 0.45;
      rings[2].rotation.y = t * 0.3;
      crystal.rotation.y = t * 0.15;
      shards.forEach((s, i) => {
        const a = s.a + t * 0.4;
        s.mesh.position.set(Math.cos(a) * 9, s.h + Math.sin(t + i) * 1.5, Math.sin(a) * 9);
        s.mesh.rotation.set(t, t * 0.7, 0);
      });
      core.halo.scale.setScalar(1 + Math.sin(t * 3) * 0.15);
    }
  };
}

// ---------------------------------------------------------------------------
// 3. 紅月の巨神オメガ・コロッサス
// ---------------------------------------------------------------------------
function buildOmega() {
  const root = new THREE.Group();
  const S = 0.8;
  const ARM = 0x2a1d2e, ARM2 = 0x4a2c3d, GOLD = 0xc9a24a, RED = 0xff2a4a;

  // 胴体（逆台形の装甲ブロック）
  const T = [];
  for (let y = -6; y <= 6; y++) {
    const w = y > 0 ? 7 : 7 + Math.floor(y / 2);
    for (let x = -w; x <= w; x++)
      for (let z = -3; z <= 3; z++) {
        const surf = Math.abs(x) === w || Math.abs(z) === 3 || y === -6 || y === 6;
        if (!surf) continue;
        const trim = y === 6 || Math.abs(x) === w;
        T.push({ x, y, z, color: trim ? GOLD : (x + y) % 2 === 0 ? ARM : ARM2, metalness: trim ? 0.95 : 0.8, roughness: trim ? 0.2 : 0.35 });
      }
  }
  // 胸の放熱スリット（赤く発光）
  for (let x = -5; x <= 5; x += 2) for (let y = -3; y <= 1; y++) T.push({ x, y, z: -3.3, color: RED, emissive: RED, emissiveIntensity: 1.2, sz: 0.4 });
  const torso = buildVoxelCluster(T, S);
  root.add(torso);

  // 頭部（バイザー付き）
  const HV = [];
  for (let x = -3; x <= 3; x++) for (let y = 0; y <= 3; y++) for (let z = -2; z <= 2; z++) {
    const visor = y === 1 && z === -2;
    HV.push({ x, y, z, color: visor ? RED : y === 3 ? GOLD : ARM, emissive: visor ? RED : 0, emissiveIntensity: visor ? 3 : 0, metalness: 0.85, roughness: 0.3 });
  }
  for (const side of [-1, 1]) for (let i = 0; i < 4; i++) HV.push({ x: side * (3 + i * 0.6), y: 3 + i, z: 0, color: GOLD, metalness: 0.95, roughness: 0.2 }); // 角
  const head = buildVoxelCluster(HV, S);
  head.position.y = 7 * S;
  root.add(head);

  // 両腕（肩→拳。拳を振り下ろすアニメーション用に肩ピボット）
  const arms = [];
  for (const side of [-1, 1]) {
    const pivot = new THREE.Group();
    pivot.position.set(side * 9 * S, 4 * S, 0);
    const AV = [];
    for (let x = -2; x <= 2; x++) for (let y = -2; y <= 2; y++) for (let z = -2; z <= 2; z++) AV.push({ x, y, z, color: GOLD, metalness: 0.95, roughness: 0.2 }); // 肩球
    for (let y = -12; y <= -3; y++) for (let x = -1; x <= 1; x++) for (let z = -1; z <= 1; z++) AV.push({ x, y, z, color: y % 3 === 0 ? RED : ARM2, emissive: y % 3 === 0 ? RED : 0, emissiveIntensity: 0.8, metalness: 0.85, roughness: 0.3 });
    for (let x = -3; x <= 3; x++) for (let y = -17; y <= -13; y++) for (let z = -3; z <= 3; z++) {
      const surf = Math.abs(x) === 3 || Math.abs(z) === 3 || y === -17 || y === -13;
      if (surf) AV.push({ x, y, z, color: (x + z) % 2 ? ARM : 0x3b2533, metalness: 0.9, roughness: 0.25 }); // 拳
    }
    const arm = buildVoxelCluster(AV, S);
    pivot.add(arm);
    root.add(pivot);
    arms.push(pivot);
  }

  // 背面の光輪
  const haloV = [];
  for (let i = 0; i < 90; i++) {
    const a = (i / 90) * Math.PI * 2;
    const spike = i % 9 === 0;
    const r = spike ? 15 : 13;
    haloV.push({ x: Math.cos(a) * r, y: Math.sin(a) * r, z: 0, color: spike ? RED : GOLD, emissive: spike ? RED : GOLD, emissiveIntensity: spike ? 2.2 : 0.9, metalness: 0.9, roughness: 0.2 });
  }
  const halo = buildVoxelCluster(haloV, S);
  halo.position.set(0, 3 * S, 5 * S);
  root.add(halo);

  // 胸の紅いコア
  const core = makeCore(2.0, 0xff4060);
  core.mesh.position.set(0, 1.5 * S, -3.6 * S);
  root.add(core.mesh);

  return {
    root, core, radius: 9,
    arms,
    hitPoints: [new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 6, 0), new THREE.Vector3(-7, -4, 0), new THREE.Vector3(7, -4, 0)],
    animate(t, slam = 0) {
      halo.rotation.z = t * 0.35;
      head.rotation.y = Math.sin(t * 0.7) * 0.25;
      arms.forEach((p, i) => {
        const base = Math.sin(t * 1.2 + i * Math.PI) * 0.18;
        p.rotation.x = base - slam * 1.6; // slam=1で拳を振り上げ
        p.rotation.z = (i === 0 ? -1 : 1) * 0.12;
      });
      core.halo.scale.setScalar(1 + Math.sin(t * 5) * 0.14);
    }
  };
}

export function createBoss(type) {
  if (type === 'prism') return buildPrism();
  if (type === 'omega') return buildOmega();
  return buildLeviathan();
}
