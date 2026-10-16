import * as THREE from 'three';
import { buildVoxelCluster } from './voxelBuilder.js';

/**
 * 武器マスターデータ ＆ 武器ごとの細密ボクセルモデル
 *
 * 弾数：各武器はマガジン制（mag 発）。撃ち切ると自動リロード（reload 秒）、[R] で手動リロード。
 *       ビーム・火炎は「エネルギー/燃料」ゲージ（1秒あたり drain 消費）。
 * 出力：power（弾の強さ）。敵弾とぶつかると出力を比べ、弱い方が消える（同じなら相殺）。
 *
 * behavior（挙動）
 *  shell / gatling / pulse / beam / missile / rail / plasma / shotgun / flame / gravity
 *  melee  : 近接（blade=薙ぎ払い / pile=突き刺し / hammer=叩きつけ範囲）
 *  mortar : 迫撃砲（照準点へ高い放物線で落とす）
 *  vulcan : 頭部機関砲（軽い高速連射）
 */

export const WEAPONS = [
  // ===================== 射撃（腕） =====================
  {
    id: 'w_cannon', name: 'HC-88 重装榴弾キャノン', short: 'CANNON', category: '実弾 / 爆発', icon: '💥',
    behavior: 'shell', damage: 240, fireRate: 1.25, speed: 46, splash: 4.5, knockback: 10, power: 3,
    mag: 6, reload: 2.6, color: 0xff8a00, recoil: 0.9, fireSE: 'fireCannon',
    desc: '重い砲弾が放物線を描き、着弾点を吹き飛ばす。敵弾も押し潰す高出力弾。'
  },
  {
    id: 'w_gatling', name: 'GT-6 回転式重機関砲', short: 'GATLING', category: '実弾 / 連射', icon: '⚙',
    behavior: 'gatling', damage: 26, fireRate: 0.09, speed: 82, spread: 0.035, knockback: 1, power: 0.6,
    mag: 120, reload: 3.0, color: 0xffe066, recoil: 0.12, fireSE: 'fireGatling',
    desc: '6本のバレルが回転して弾幕を張る。撃ち始めは回転が上がるまで遅い。'
  },
  {
    id: 'w_pulse', name: 'LZ-2 パルスレーザー', short: 'PULSE', category: '光学 / バースト', icon: '✦',
    behavior: 'pulse', damage: 58, fireRate: 0.7, speed: 120, burst: 3, knockback: 2, power: 1,
    mag: 18, reload: 2.0, color: 0x40f0ff, recoil: 0.25, fireSE: 'firePulse',
    desc: '高速の光弾を3点バースト。弾速が速く遠くの敵に当てやすい。'
  },
  {
    id: 'w_beam', name: 'BX-9 照射ビームレーザー', short: 'BEAM', category: '光学 / 照射', icon: '☄',
    behavior: 'beam', damage: 0, dps: 220, fireRate: 0, range: 145, knockback: 0, power: 99,
    mag: 100, drain: 24, reload: 3.4, color: 0x7df9ff, recoil: 0.05, fireSE: 'beamStart',
    desc: '押し続ける間、太い光線を照射。進路上の敵弾もすべて焼き払う。'
  },
  {
    id: 'w_missile', name: 'MP-4 誘導ミサイルポッド', short: 'MISSILE', category: '爆発 / 誘導', icon: '🚀',
    behavior: 'missile', damage: 75, fireRate: 1.6, speed: 32, count: 4, splash: 2.6, knockback: 4, power: 1.5,
    mag: 16, reload: 3.5, color: 0xff5050, recoil: 0.4, fireSE: 'fireMissile',
    desc: '4発を扇状に発射。[F]でロックオンした敵へ誘導する。'
  },
  {
    id: 'w_rail', name: 'RG-X 電磁レールキャノン', short: 'RAILGUN', category: '特殊 / 貫通', icon: '⚡',
    behavior: 'rail', damage: 420, fireRate: 1.4, chargeTime: 0.9, range: 230, knockback: 14, power: 99,
    mag: 3, reload: 3.2, color: 0xc77dff, recoil: 1.1, fireSE: 'fireRail',
    desc: '押してチャージ、離して発射。直線上の敵と敵弾をすべて貫く。'
  },
  {
    id: 'w_plasma', name: 'PL-3 プラズマランチャー', short: 'PLASMA', category: '光学 / 爆発', icon: '◉',
    behavior: 'plasma', damage: 150, fireRate: 0.95, speed: 34, splash: 3.6, knockback: 6, power: 2.5,
    mag: 8, reload: 2.4, color: 0x5dff8a, recoil: 0.45, fireSE: 'firePlasma',
    desc: '低速の大きなプラズマ球。ロック中の敵へ緩やかに引き寄せられ炸裂する。'
  },
  {
    id: 'w_shotgun', name: 'SG-12 重散弾砲', short: 'SHOTGUN', category: '実弾 / 近距離', icon: '✸',
    behavior: 'shotgun', damage: 34, fireRate: 1.0, speed: 72, pellets: 9, spread: 0.09, life: 0.55, knockback: 3, power: 0.8,
    mag: 6, reload: 2.8, color: 0xffc46b, recoil: 0.8, fireSE: 'fireShotgun',
    desc: '9発の散弾。射程は短いが、接近した敵を一撃で押し返す。'
  },
  {
    id: 'w_flame', name: 'FT-5 火炎放射器', short: 'FLAME', category: '特殊 / 炎上', icon: '🔥',
    behavior: 'flame', damage: 9, fireRate: 0.045, speed: 22, life: 0.6, knockback: 0, power: 0.5,
    mag: 100, drain: 20, reload: 3.0, color: 0xff6a1a, recoil: 0.02, fireSE: null,
    desc: '押し続ける間、炎を噴射。当たった敵を炎上させ継続ダメージ。'
  },
  {
    id: 'w_gravity', name: 'GV-0 重力崩壊砲', short: 'GRAVITY', category: '特殊 / 範囲', icon: '◎',
    behavior: 'gravity', damage: 280, fireRate: 2.2, speed: 20, pullRadius: 11, splash: 7, knockback: 0, power: 6,
    mag: 2, reload: 4.0, color: 0x9b5cff, recoil: 0.6, fireSE: 'fireGravity',
    desc: '重力球が敵と敵弾を吸い寄せ、一気に圧壊させる。'
  },

  // ===================== 近接（腕） =====================
  {
    id: 'm_blade', name: 'HB-7 ヒートブレード', short: 'BLADE', category: '近接 / 斬撃', icon: '⚔',
    behavior: 'melee', melee: 'blade', damage: 210, fireRate: 0.6, range: 5.0, arc: 2.3, lunge: 9, hitTime: 0.12, knockback: 9,
    mag: 0, reload: 0, color: 0xff7a2a, recoil: 0.3, fireSE: 'meleeSwing',
    desc: '赤熱した刃で前方を薙ぎ払う。ロック中は敵へ踏み込み、敵弾も斬り払える。'
  },
  {
    id: 'm_pile', name: 'PB-1 パイルバンカー', short: 'PILE', category: '近接 / 刺突', icon: '⬣',
    behavior: 'melee', melee: 'pile', damage: 720, fireRate: 1.6, range: 4.2, arc: 0.9, lunge: 11, hitTime: 0.28, knockback: 26,
    mag: 4, reload: 3.0, color: 0xffd27a, recoil: 1.3, fireSE: 'pileCharge',
    desc: '炸薬で鉄杭を撃ち込む一撃必殺。大型の敵も大きく吹き飛ばす。'
  },
  {
    id: 'm_hammer', name: 'GH-3 グラビティハンマー', short: 'HAMMER', category: '近接 / 範囲', icon: '⚒',
    behavior: 'melee', melee: 'hammer', damage: 330, fireRate: 1.3, range: 5.5, arc: 6.3, lunge: 6, hitTime: 0.34, knockback: 16,
    mag: 0, reload: 0, color: 0x8fb6ff, recoil: 1.0, fireSE: 'meleeSwingHeavy',
    desc: '巨大な鎚を甲板に叩きつけ、周囲すべてを衝撃波で打ち上げる。'
  },

  {
    id: 'w_none', name: '【装備なし】 アームレス', short: '---', category: '-', icon: '∅',
    behavior: 'none', damage: 0, fireRate: 1, mag: 0, mobilityBonus: 12, color: 0x000000,
    desc: '腕を外して軽量化。この腕では攻撃できない。'
  }
];

/** 頭部・胴体・脚部パーツに稀に付いている内蔵武器 */
export const BUILTIN_WEAPONS = {
  b_vulcan: {
    id: 'b_vulcan', name: '頭部バルカン', short: 'VULCAN', category: '内蔵 / 牽制', icon: '⁘', mount: 'head',
    behavior: 'vulcan', damage: 14, fireRate: 0.07, speed: 95, spread: 0.05, knockback: 0, power: 0.4,
    mag: 60, reload: 2.5, color: 0xfff1a8, recoil: 0.03, fireSE: 'fireVulcan',
    desc: '頭部の小口径機関砲。威力は低いが、迫る敵弾の迎撃に使える。'
  },
  b_micromissile: {
    id: 'b_micromissile', name: '肩部マイクロミサイル', short: 'μ-MISSILE', category: '内蔵 / 誘導', icon: '⇶', mount: 'shoulder',
    behavior: 'missile', damage: 42, fireRate: 2.0, speed: 30, count: 6, splash: 2.0, knockback: 2, power: 1,
    mag: 18, reload: 4.0, color: 0xff7070, recoil: 0.2, fireSE: 'fireMissile',
    desc: '肩の小型ミサイルを6連射。ロックオン中の敵へ群がる。'
  },
  b_mortar: {
    id: 'b_mortar', name: '脚部迫撃砲', short: 'MORTAR', category: '内蔵 / 曲射', icon: '⌒', mount: 'legs',
    behavior: 'mortar', damage: 260, fireRate: 2.2, splash: 5.5, knockback: 12, power: 3,
    mag: 4, reload: 3.5, color: 0xffa040, recoil: 0.5, fireSE: 'fireMortar',
    desc: '照準点へ高い弧を描いて砲弾を落とす。遮蔽物越しの敵にも届く。'
  }
};

// ----------------------------------------------------------------------------
// 武器モデル（細かいボクセル 0.12m 単位）
// ----------------------------------------------------------------------------
export const FINE = 0.12;
const GUNMETAL = 0x5d6775;
const DARK = 0x2c323b;
const STEEL = 0x9aa6b4;
const BRASS = 0xc9a04f;

function makeBuilder() {
  const list = [];
  const api = {
    list,
    add(x, y, z, color, emissive = 0, ei = 0, metal = 0.75, rough = 0.32) {
      list.push({ x, y, z, color, emissive, emissiveIntensity: ei, metalness: metal, roughness: rough });
    },
    box(x0, x1, y0, y1, z0, z1, color, emissive = 0, ei = 0) {
      for (let x = x0; x <= x1; x++)
        for (let y = y0; y <= y1; y++)
          for (let z = z0; z <= z1; z++) {
            if (x === x0 || x === x1 || y === y0 || y === y1 || z === z0 || z === z1) api.add(x, y, z, color, emissive, ei);
          }
    },
    cylZ(cx, cy, r, z0, z1, color, emissive = 0, ei = 0) {
      const R = Math.ceil(r);
      for (let z = z0; z <= z1; z++)
        for (let x = -R; x <= R; x++)
          for (let y = -R; y <= R; y++) {
            const d = Math.sqrt(x * x + y * y);
            if (d > r + 0.15) continue;
            if (d > r - 1.0 || z === z0 || z === z1) api.add(cx + x, cy + y, z, color, emissive, ei);
          }
    },
    ringZ(cx, cy, r, z, color, emissive = 0, ei = 0, thick = 0.8) {
      const R = Math.ceil(r);
      for (let x = -R; x <= R; x++)
        for (let y = -R; y <= R; y++) {
          const d = Math.sqrt(x * x + y * y);
          if (d <= r + 0.2 && d >= r - thick) api.add(cx + x, cy + y, z, color, emissive, ei);
        }
    },
    sphere(cx, cy, cz, r, color, emissive = 0, ei = 0) {
      const R = Math.ceil(r);
      for (let x = -R; x <= R; x++)
        for (let y = -R; y <= R; y++)
          for (let z = -R; z <= R; z++) {
            const d = Math.sqrt(x * x + y * y + z * z);
            if (d <= r + 0.2 && d >= r - 1.1) api.add(cx + x, cy + y, cz + z, color, emissive, ei);
          }
    }
  };
  return api;
}

/**
 * 武器のボクセル配列を生成（3Dモデルとアイコン描画の両方で使う）
 * @returns {{ list, spinner, muzzleZ }}
 */
export function weaponVoxels(def) {
  const b = makeBuilder();
  let spinner = null;
  let muzzleZ = -20;
  const withMount = def.mount !== 'head' && def.mount !== 'shoulder' && def.mount !== 'legs';
  if (withMount && def.behavior !== 'none') {
    b.box(-2, 2, -2, 2, 2, 7, DARK);   // 肩ジョイント
    b.cylZ(0, -3, 0.9, 1, 6, STEEL);   // 油圧シリンダー
  }

  switch (def.behavior) {
    case 'shell':
      b.box(-3, 3, -3, 3, -6, 2, GUNMETAL);
      b.box(-3, 3, 3, 3, -5, 0, STEEL);
      b.cylZ(0, 0, 2.2, -24, -6, GUNMETAL);
      b.ringZ(0, 0, 2.8, -12, STEEL);
      b.ringZ(0, 0, 2.6, -13, def.color, def.color, 0.9);
      for (let z = -29; z <= -25; z++) if (z !== -27) b.box(-3, 3, -2, 2, z, z, DARK);
      muzzleZ = -30;
      break;
    case 'gatling': {
      b.cylZ(0, 0, 3.2, -7, 2, GUNMETAL);
      b.box(4, 7, -3, 2, -5, 1, BRASS);
      b.box(3, 3, -1, 0, -4, -1, DARK);
      const sb = makeBuilder();
      for (let k = 0; k < 6; k++) {
        const a = (k / 6) * Math.PI * 2;
        const bx = Math.round(Math.cos(a) * 2), by = Math.round(Math.sin(a) * 2);
        for (let z = -24; z <= -8; z++) sb.add(bx, by, z, STEEL);
      }
      sb.ringZ(0, 0, 3, -12, DARK);
      sb.ringZ(0, 0, 3, -21, DARK);
      sb.add(0, 0, -24, def.color, def.color, 1.2);
      spinner = sb.list;
      muzzleZ = -25;
      break;
    }
    case 'pulse':
      b.box(-2, 2, -2, 2, -6, 2, 0xdfe7ef);
      b.box(-1, 1, -1, 1, -22, -6, 0xc8d3de);
      for (const z of [-9, -13, -17]) b.ringZ(0, 0, 2.2, z, def.color, def.color, 1.8);
      b.box(-1, 1, -1, 1, -23, -23, def.color, def.color, 3);
      b.box(-1, 1, 3, 4, -5, 0, GUNMETAL);
      muzzleZ = -24;
      break;
    case 'beam':
      b.box(-3, 3, -3, 3, -10, 2, 0x2a3b55);
      for (let z = -9; z <= 1; z += 2) b.box(-4, 4, 4, 4, z, z, STEEL);
      b.cylZ(0, 0, 1.5, -15, -10, GUNMETAL);
      b.ringZ(0, 0, 3.6, -16, STEEL, 0, 0, 1.2);
      b.ringZ(0, 0, 2.4, -17, def.color, def.color, 2);
      b.box(-1, 1, -1, 1, -17, -17, 0xffffff, def.color, 3.5);
      muzzleZ = -18;
      break;
    case 'missile':
      if (def.mount === 'shoulder') {
        // 肩部ミニポッド（3×2）
        b.box(-4, 4, -2, 3, -5, 3, 0x4c5a3a);
        for (const mx of [-2, 0, 2]) for (const my of [-1, 1]) {
          b.add(mx, my, -6, 0xd32f2f, 0xff1744, 0.8);
          b.add(mx, my, -7, 0xeeeeee);
        }
        muzzleZ = -7;
      } else {
        b.box(-4, 4, -4, 4, -9, 1, 0x4c5a3a);
        b.box(-4, 4, 5, 5, -8, 0, STEEL);
        for (const mx of [-2, 2]) for (const my of [-2, 2]) {
          b.add(mx, my, -10, 0xd32f2f, 0xff1744, 0.8);
          b.add(mx, my, -11, 0xeeeeee);
        }
        b.box(-5, -5, -2, 2, -7, -1, DARK);
        b.box(5, 5, -2, 2, -7, -1, DARK);
        muzzleZ = -11;
      }
      break;
    case 'rail':
      b.box(-3, 3, -3, 3, -4, 3, 0x2d2440);
      for (const rx of [-2, 2]) b.box(rx, rx, -1, 1, -34, -4, DARK);
      for (let z = -31; z <= -6; z += 5) {
        b.box(-2, 2, 2, 2, z, z, STEEL);
        b.box(-1, 1, -2, -2, z, z, def.color, def.color, 1.6);
      }
      b.box(-1, 1, 4, 5, -3, 2, def.color, def.color, 1.2);
      muzzleZ = -35;
      break;
    case 'plasma':
      b.sphere(0, 0, -5, 3.6, 0x2f4a3a);
      b.sphere(0, 0, -5, 2.0, def.color, def.color, 2.4);
      b.cylZ(0, 0, 1.6, -14, -8, GUNMETAL);
      b.ringZ(0, 0, 2.2, -14, def.color, def.color, 2);
      muzzleZ = -15;
      break;
    case 'shotgun':
      b.box(-3, 3, -3, 2, -4, 2, GUNMETAL);
      b.cylZ(-1.5, 0, 1.3, -15, -4, STEEL);
      b.cylZ(1.5, 0, 1.3, -15, -4, STEEL);
      b.box(-2, 2, -3, -2, -10, -6, BRASS);
      b.add(-1.5, 0, -16, def.color, def.color, 1.2);
      b.add(1.5, 0, -16, def.color, def.color, 1.2);
      muzzleZ = -16;
      break;
    case 'flame':
      b.cylZ(0, -3, 2.2, -8, 3, 0x8a3a1a);
      b.ringZ(0, -3, 2.4, -2, BRASS);
      b.box(-2, 2, -1, 2, -6, 2, GUNMETAL);
      b.cylZ(0, 1, 1.0, -16, -6, STEEL);
      b.ringZ(0, 1, 1.8, -17, DARK);
      b.add(0, -1, -17, def.color, def.color, 3);
      muzzleZ = -18;
      break;
    case 'gravity':
      b.box(-2, 2, -2, 2, -6, 2, 0x221a33);
      b.cylZ(0, 0, 1, -9, -6, DARK);
      for (let a = 0; a < 64; a++) {
        const t = (a / 64) * Math.PI * 2;
        b.add(Math.round(Math.cos(t) * 4), Math.round(Math.sin(t) * 4), -12, STEEL);
        b.add(Math.round(Math.cos(t) * 4), Math.round(Math.sin(t) * 4), -13, def.color, def.color, 1.4);
      }
      b.sphere(0, 0, -12, 1.6, 0x0a0612, def.color, 2.2);
      muzzleZ = -14;
      break;
    case 'melee':
      if (def.melee === 'blade') {
        b.box(-2, 2, -2, 2, -4, 2, GUNMETAL);          // 柄・ガード
        b.box(-3, 3, -1, 1, -5, -5, BRASS);
        for (let z = -30; z <= -6; z++) {
          const w = z < -26 ? Math.max(0, 1 + Math.floor((z + 30) / 2)) : 1;
          for (let y = -w; y <= w; y++) b.add(0, y + 1, z, 0xcfd6de, 0, 0, 0.95, 0.15); // 刀身
          b.add(0, -w + 0, z, def.color, def.color, 2.2);                                // 赤熱した刃先
        }
        muzzleZ = -30;
      } else if (def.melee === 'pile') {
        b.box(-3, 3, -3, 3, -10, 2, 0x3b3f46);         // 炸薬チャンバー
        b.box(-3, 3, 4, 4, -9, 1, BRASS);
        for (let z = -8; z <= 0; z += 4) b.ringZ(0, 0, 3.6, z, STEEL);
        b.cylZ(0, 0, 1.2, -18, -10, 0xd9dee5);          // 鉄杭
        b.add(0, 0, -19, 0xffffff, def.color, 1.2);
        muzzleZ = -19;
      } else {
        b.box(-1, 1, -1, 1, -16, 2, 0x4a3a2a);         // 柄
        b.box(-5, 5, -4, 4, -24, -17, 0x46556e);       // 鎚頭
        b.box(-5, 5, -4, 4, -20, -20, def.color, def.color, 1.6);
        b.box(-6, 6, -1, 1, -25, -25, STEEL);
        muzzleZ = -24;
      }
      break;
    case 'vulcan':
      b.box(-1, 1, -1, 1, -6, 1, GUNMETAL);
      b.add(0, 0, -7, def.color, def.color, 1.5);
      b.box(-1, 1, 2, 2, -3, 0, STEEL);
      muzzleZ = -7;
      break;
    case 'mortar':
      b.box(-3, 3, -2, 2, -3, 3, GUNMETAL);
      // 上向きの砲身（Y方向）
      for (let y = 3; y <= 12; y++) b.ringZ(0, y - 3, 1.8, -y + 1, STEEL);
      b.ringZ(0, 9, 2.2, -11, def.color, def.color, 1.4);
      muzzleZ = -12;
      break;
    default:
      break;
  }
  return { list: b.list, spinner, muzzleZ };
}

export function buildWeaponModel(def) {
  const { list, spinner, muzzleZ } = weaponVoxels(def);
  const group = new THREE.Group();
  group.add(buildVoxelCluster(list, FINE));
  let spinGroup = null;
  if (spinner) {
    spinGroup = buildVoxelCluster(spinner, FINE);
    group.add(spinGroup);
  }
  const muzzle = def.behavior === 'mortar'
    ? new THREE.Vector3(0, 10 * FINE, -11 * FINE)
    : new THREE.Vector3(0, 0, muzzleZ * FINE);
  return { group, spinner: spinGroup, muzzle };
}

export function getWeapon(id) {
  return WEAPONS.find((w) => w.id === id) || BUILTIN_WEAPONS[id] || WEAPONS[WEAPONS.length - 1];
}
