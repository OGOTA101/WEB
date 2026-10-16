import * as THREE from 'three';
import { buildWeaponModel, BUILTIN_WEAPONS } from './weapons.js';

/**
 * ボクセルモデルビルダー（WebGPU対応版）
 * - 質感（メタルネス／ラフネス／発光）が同じボクセルを1つの InstancedMesh にまとめ、
 *   色はインスタンスカラーで持たせる → ドローコールを大幅削減
 * - パーツごとのボクセル配列関数は、ガレージのアイコン描画にも使う
 */

const UNIT_BOX = new THREE.BoxGeometry(0.94, 0.94, 0.94);
const matCache = new Map();
const _c = new THREE.Color();

function getMaterial(emissive, ei, metalness, roughness, unique) {
  const make = () => new THREE.MeshStandardMaterial({ color: 0xffffff, emissive, emissiveIntensity: ei, metalness, roughness });
  if (unique) return make();
  const key = `${emissive}_${ei}_${metalness}_${roughness}`;
  if (!matCache.has(key)) matCache.set(key, make());
  return matCache.get(key);
}

/**
 * ボクセル配列から InstancedMesh 群を生成
 * @param {Array} voxelList [{x,y,z,color,emissive,emissiveIntensity,metalness,roughness,sx,sy,sz}]
 * @param {number} scale ボクセル1つの大きさ(m)
 * @param {boolean} allowFade 障害物の半透明化用に専用マテリアルを持たせる
 */
export function buildVoxelCluster(voxelList, scale = 0.28, allowFade = false) {
  const group = new THREE.Group();
  const buckets = new Map();
  for (const v of voxelList) {
    const metal = v.metalness ?? 0.75;
    const rough = v.roughness ?? 0.38;
    const em = v.emissive || 0;
    const ei = em ? v.emissiveIntensity || 0 : 0;
    const key = `${em}_${ei}_${metal}_${rough}`;
    if (!buckets.has(key)) buckets.set(key, { mat: getMaterial(em, ei, metal, rough, allowFade), list: [] });
    buckets.get(key).list.push(v);
  }
  const dummy = new THREE.Object3D();
  const materials = [];
  for (const { mat, list } of buckets.values()) {
    materials.push(mat);
    const inst = new THREE.InstancedMesh(UNIT_BOX, mat, list.length);
    inst.castShadow = true;
    inst.receiveShadow = true;
    list.forEach((v, i) => {
      dummy.position.set(v.x * scale, v.y * scale, v.z * scale);
      dummy.scale.set((v.sx || 1) * scale, (v.sy || 1) * scale, (v.sz || 1) * scale);
      dummy.updateMatrix();
      inst.setMatrixAt(i, dummy.matrix);
      inst.setColorAt(i, _c.set(v.color));
    });
    inst.instanceMatrix.needsUpdate = true;
    if (inst.instanceColor) inst.instanceColor.needsUpdate = true;
    group.add(inst);
  }
  group.userData.materials = materials;
  return group;
}

const shade = (hex, f) => new THREE.Color(hex).multiplyScalar(f).getHex();
const RIVET = 0xa9b4c2;
const SEAM = 0x14181e;
export const MECH_SCALE = 0.3;

// ---------------------------------------------------------------------------
// パーツごとのボクセル配列（単位：MECH_SCALE）
// ---------------------------------------------------------------------------
export function legsVoxels(legs) {
  const L = [];
  const lv = (x, y, z, color, o = {}) => L.push({ x, y, z, color, ...o });
  if (legs.type === 'caterpillar') {
    for (let z = -5; z <= 5; z++) {
      for (let y = 0; y <= 2; y++) {
        for (const side of [-1, 1]) {
          const tread = (z + y) % 2 === 0 ? 0x2b3038 : 0x1b1f25;
          lv(side * 3, y, z, SEAM, { metalness: 0.6, roughness: 0.6 });
          lv(side * 4, y, z, y === 1 ? shade(legs.color, 0.9) : tread, { metalness: 0.7, roughness: 0.55 });
          lv(side * 5, y, z, tread, { metalness: 0.6, roughness: 0.6 });
        }
      }
      if (z % 2 === 0) for (const side of [-1, 1]) lv(side * 5.6, 1, z, RIVET, { sx: 0.3, sy: 0.5, sz: 0.5 });
    }
    for (let x = -2; x <= 2; x++) for (let z = -3; z <= 3; z++) lv(x, 1.5, z, legs.color);
    for (const side of [-1, 1]) lv(side * 4, 3, -5, legs.accent, { emissive: legs.accent, emissiveIntensity: 1.8 });
  } else if (legs.type === 'biped') {
    for (const side of [-1, 1]) {
      for (let y = 0; y <= 3; y++) {
        lv(side * 2, y, 0, y === 2 ? SEAM : legs.color);
        lv(side * 3, y, 0, legs.color);
        lv(side * 2, y, 1, shade(legs.color, 0.75));
        lv(side * 3, y, 1, shade(legs.color, 0.75));
      }
      for (let z = -2; z <= 2; z++) for (const x of [2, 3]) lv(side * x, -0.3, z, 0x22272f, { sy: 0.5 });
      lv(side * 2.5, 2, -1, legs.accent, { emissive: legs.accent, emissiveIntensity: 1.4, sx: 0.6 });
      lv(side * 3.6, 3, 0, RIVET, { sx: 0.3, sy: 0.4, sz: 0.4 });
    }
    for (let x = -3; x <= 3; x++) lv(x, 3.5, 0.5, SEAM);
  } else {
    for (const [ox, oz] of [[-4, -3], [4, -3], [-4, 3], [4, 3]]) {
      for (let y = 0; y <= 2; y++) {
        lv(ox, y, oz, legs.color);
        lv(ox - Math.sign(ox), 1.5, oz, shade(legs.color, 0.7));
      }
      lv(ox, -0.3, oz, 0x22272f, { sx: 1.4, sy: 0.5, sz: 1.4 });
      lv(Math.sign(ox) * 2, 2, Math.sign(oz) * 2, legs.accent, { emissive: legs.accent, emissiveIntensity: 1.2 });
    }
    for (let x = -2; x <= 2; x++) for (let z = -2; z <= 2; z++) lv(x, 2.5, z, (x + z) % 2 ? 0x2d3436 : 0x262b30);
  }
  return L;
}

export function bodyVoxels(body) {
  const B = [];
  const bw = body.style === 'heavy' ? 3 : 2;
  for (let x = -bw; x <= bw; x++)
    for (let y = 0; y <= 3; y++)
      for (let z = -2; z <= 2; z++) {
        if (!(Math.abs(x) === bw || y === 0 || y === 3 || Math.abs(z) === 2)) continue;
        const seam = y === 1 && Math.abs(x) !== bw;
        B.push({ x, y, z, color: seam ? SEAM : (x + z) % 2 === 0 ? body.color : body.subColor });
      }
  B.push({ x: 0, y: 2, z: -2.4, color: 0x9ff6ff, emissive: 0x00e5ff, emissiveIntensity: 2.6, sz: 0.4 });
  for (const x of [-bw, bw]) for (const y of [0.4, 2.6]) B.push({ x: x * 1.12, y, z: -2.2, color: RIVET, sx: 0.35, sy: 0.35, sz: 0.35 });
  for (let x = -bw; x <= bw; x++) B.push({ x, y: 3.5, z: -2, color: x % 2 === 0 ? 0xffb300 : 0x1a1a1a, sy: 0.3 });
  for (const side of [-1, 1]) for (let z = -2; z <= 2; z++) {
    B.push({ x: side * (bw + 1), y: 3, z, color: shade(body.color, 0.85) });
    B.push({ x: side * (bw + 1), y: 3.8, z, color: shade(body.color, 1.1), sy: 0.6 });
  }
  return B;
}

export function headVoxels(head) {
  const H = [];
  for (let x = -1; x <= 1; x++)
    for (let y = 4; y <= 5; y++)
      for (let z = -1; z <= 1; z++) {
        const isEye = y === 4 && z === -1 && (head.style !== 'mono' || x === 0);
        H.push({ x, y, z, color: isEye ? head.eyeColor : y === 5 ? shade(head.color, 1.1) : head.color, emissive: isEye ? head.eyeColor : 0, emissiveIntensity: isEye ? 3 : 0 });
      }
  H.push({ x: 0, y: 3.6, z: 0, color: SEAM, sx: 1.6, sy: 0.4, sz: 1.6 });
  if (head.style === 'antenna') {
    H.push({ x: 0.8, y: 6.2, z: 0.5, color: 0x7d8896, sx: 0.3, sy: 1.6, sz: 0.3 });
    H.push({ x: 0.8, y: 7.1, z: 0.5, color: head.eyeColor, emissive: head.eyeColor, emissiveIntensity: 2.6, sx: 0.5, sy: 0.5, sz: 0.5 });
  } else if (head.style === 'mono') {
    H.push({ x: 0, y: 5.8, z: 0, color: shade(head.color, 0.8), sx: 3.2, sy: 0.6, sz: 2.4 });
  }
  return H;
}

export function boosterVoxels(booster) {
  const V = [];
  if (booster.id === 'boost_none') return V;
  for (const bx of [-1.5, 1.5]) {
    for (let y = 0.5; y <= 2.5; y++) V.push({ x: bx, y, z: 3, color: booster.color });
    V.push({ x: bx, y: 0.5, z: 3.8, color: SEAM, sx: 1.2, sz: 0.6 });
    V.push({ x: bx, y: 0.5, z: 4.2, color: booster.flameColor, emissive: booster.flameColor, emissiveIntensity: 2, sx: 0.8, sy: 0.8, sz: 0.2 });
  }
  return V;
}

/**
 * 6部位ボクセル機体
 * userData に部位グループ・武器モデル・内蔵武器マウントを持たせる
 */
export function createVoxelMechModel(stats) {
  const root = new THREE.Group();
  const { body, legs, head, rarm, larm, booster } = stats.parts;
  const s = MECH_SCALE;
  const bw = body.style === 'heavy' ? 3 : 2;

  const legsGroup = buildVoxelCluster(legsVoxels(legs), s);
  root.add(legsGroup);

  const upperPivot = new THREE.Group();
  upperPivot.position.y = 3.6 * s;
  root.add(upperPivot);
  upperPivot.add(buildVoxelCluster(bodyVoxels(body), s));
  const headGroup = buildVoxelCluster(headVoxels(head), s);
  upperPivot.add(headGroup);

  const makeArm = (def, side) => {
    const armGroup = new THREE.Group();
    armGroup.position.set(side * (bw + 1.8) * s, 1.8 * s, 0);
    let weapon = null;
    if (def.behavior !== 'none') {
      weapon = buildWeaponModel(def);
      armGroup.add(weapon.group);
    }
    upperPivot.add(armGroup);
    return { armGroup, weapon };
  };
  const rArm = makeArm(rarm, 1);
  const lArm = makeArm(larm, -1);

  // 内蔵武器のマウント
  const builtins = {};
  const mountBuiltin = (part, parent, pos) => {
    if (!part.builtin) return;
    const def = BUILTIN_WEAPONS[part.builtin];
    const g = new THREE.Group();
    g.position.copy(pos);
    const w = buildWeaponModel(def);
    g.add(w.group);
    parent.add(g);
    builtins[def.mount] = { group: g, weapon: w };
  };
  mountBuiltin(head, upperPivot, new THREE.Vector3(1.6 * s, 4.6 * s, -0.4 * s));
  mountBuiltin(body, upperPivot, new THREE.Vector3(0, 4.6 * s, 0.6 * s));
  mountBuiltin(legs, root, new THREE.Vector3(0, 2.6 * s, 4.2 * s));

  const boosterGroup = new THREE.Group();
  const boosterFlames = [];
  if (booster.id !== 'boost_none') {
    boosterGroup.add(buildVoxelCluster(boosterVoxels(booster), s));
    const flameMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(booster.flameColor).multiplyScalar(2.5), transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false
    });
    for (const bx of [-1.5, 1.5]) {
      const flame = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.9, 10), flameMat);
      flame.rotation.x = -Math.PI / 2;
      flame.position.set(bx * s, 0.5 * s, 4.7 * s);
      flame.scale.set(1, 0.3, 1);
      boosterGroup.add(flame);
      boosterFlames.push(flame);
    }
  }
  upperPivot.add(boosterGroup);

  root.userData = {
    legsGroup, upperPivot, headGroup, boosterGroup, boosterFlames,
    rArmGroup: rArm.armGroup, lArmGroup: lArm.armGroup,
    rWeapon: rArm.weapon, lWeapon: lArm.weapon,
    builtins
  };
  return root;
}

/** 大破した機体の残骸モデル（焼け焦げた色に置き換え、傾けて沈ませる） */
export function createWreckModel(stats) {
  const m = createVoxelMechModel(stats);
  const burnt = new Map();
  m.traverse((o) => {
    if (!o.isMesh) return;
    if (!burnt.has(o.material)) {
      const mat = new THREE.MeshStandardMaterial({ color: 0x8a817a, metalness: 0.6, roughness: 0.75 });
      burnt.set(o.material, mat);
    }
    o.material = burnt.get(o.material);
    if (o.isInstancedMesh && o.instanceColor) {
      // インスタンス色を暗く
      for (let i = 0; i < o.count; i++) {
        o.getColorAt(i, _c);
        _c.multiplyScalar(0.35);
        o.setColorAt(i, _c);
      }
      o.instanceColor.needsUpdate = true;
    }
  });
  const ud = m.userData;
  ud.upperPivot.rotation.set(0.35, 0.4, 0.25);
  ud.upperPivot.position.y -= 0.35;
  ud.headGroup.rotation.set(0.5, 0, 0.4);
  if (ud.lArmGroup) ud.lArmGroup.rotation.set(0.9, 0, -0.4);
  m.rotation.z = 0.12;
  return m;
}

/**
 * 浮遊する謎のボックス型雑魚敵（コアは攻撃予兆で赤く光る独立マテリアル）
 */
export const ENEMY_STYLES = {
  drone: { shell: 0x5b4b8a, trim: 0x8f7fd0, core: 0xb388ff },
  stunner: { shell: 0x1f5f73, trim: 0x4fd8ff, core: 0x80f8ff },
  burner: { shell: 0x7a3418, trim: 0xff8a3d, core: 0xffc06b },
  rammer: { shell: 0x5a1f2a, trim: 0xff5c7a, core: 0xff9eb0 }
};

export function createFloatingVoxelEnemy(variant = 'drone', weaponDef = null) {
  const st = ENEMY_STYLES[variant] || ENEMY_STYLES.drone;
  const root = new THREE.Group();
  const V = [];
  for (let x = -2; x <= 2; x++)
    for (let y = -2; y <= 2; y++)
      for (let z = -2; z <= 2; z++) {
        const edges = (Math.abs(x) === 2) + (Math.abs(y) === 2) + (Math.abs(z) === 2);
        if (edges >= 2) {
          const corner = edges === 3;
          V.push({ x, y, z, color: corner ? st.trim : st.shell, emissive: corner ? st.trim : 0, emissiveIntensity: corner ? 1.2 : 0, metalness: 0.85, roughness: 0.3 });
        }
      }
  const frame = buildVoxelCluster(V, 0.42);
  frame.traverse((o) => { if (o.isMesh) o.receiveShadow = false; });
  root.add(frame);

  const ringV = [];
  for (let a = 0; a < 12; a++) {
    const t = (a / 12) * Math.PI * 2;
    ringV.push({ x: Math.cos(t) * 1.3, y: 0, z: Math.sin(t) * 1.3, color: st.trim, sx: 0.5, sy: 0.5, sz: 0.5, metalness: 0.9, roughness: 0.2 });
  }
  const ring = buildVoxelCluster(ringV, 0.42);
  ring.traverse((o) => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = false; } });
  root.add(ring);

  const coreMat = new THREE.MeshStandardMaterial({ color: st.core, emissive: st.core, emissiveIntensity: 2.4, metalness: 0.2, roughness: 0.3 });
  coreMat.userData.owned = true;
  const core = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.62, 0.62), coreMat);
  root.add(core);

  // プレイヤーの武器を敵の機体側面にマウント（敵は -Z 方向が武器の前方なので回転ピボットに入れる）
  const weaponMount = new THREE.Group();
  root.add(weaponMount);
  let weaponModel = null;
  if (weaponDef && weaponDef.behavior !== 'none') {
    weaponModel = buildWeaponModel(weaponDef);
    weaponModel.group.traverse((o) => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = false; } });
    // 武器モデルは -Z が銃口なので、+Z（正面）へ向くよう Y軸に180度回転して横・下部に装着
    weaponModel.group.rotation.y = Math.PI;
    weaponModel.group.position.set(1.15, -0.15, 0.2);
    weaponModel.group.scale.setScalar(1.05);
    weaponMount.add(weaponModel.group);
  }

  root.userData = { frame, ring, core, coreMat, baseCoreColor: new THREE.Color(st.core), weaponMount, weaponModel };
  return root;
}

/** 雑魚敵がドロップする武器・パーツコンテナの3Dモデル */
export function createDropContainerModel(color = 0xffab00, isRare = false) {
  const root = new THREE.Group();
  const boxGroup = new THREE.Group();
  root.add(boxGroup);

  const cHex = isRare ? 0xd580ff : color || 0xffc400;
  const V = [];
  for (let x = -1; x <= 1; x++)
    for (let y = -1; y <= 1; y++)
      for (let z = -1; z <= 1; z++) {
        const edges = (Math.abs(x) === 1) + (Math.abs(y) === 1) + (Math.abs(z) === 1);
        if (edges >= 2) {
          V.push({ x, y, z, color: edges === 3 ? cHex : 0x242c38, emissive: edges === 3 ? cHex : 0, emissiveIntensity: edges === 3 ? 2.2 : 0 });
        }
      }
  const crate = buildVoxelCluster(V, 0.34);
  crate.traverse((o) => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = false; } });
  boxGroup.add(crate);

  const innerMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(cHex).multiplyScalar(2.6) });
  innerMat.userData.owned = true;
  const inner = new THREE.Mesh(new THREE.OctahedronGeometry(0.38, 0), innerMat);
  boxGroup.add(inner);

  // 遠くからでも見つけやすい光の柱（ビーコン）
  const beamMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(cHex).multiplyScalar(2.2),
    transparent: true, opacity: 0.42, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide
  });
  beamMat.userData.owned = true;
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.45, 9, 8, 1, true), beamMat);
  beam.position.y = 4.5;
  root.add(beam);

  root.userData = { boxGroup, inner, beam, beamMat };
  return root;
}
