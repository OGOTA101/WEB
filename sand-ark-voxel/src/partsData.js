/**
 * パーツマスターデータ ＆ 機体スペック計算
 * - 腕：WEAPONS（射撃・近接）から選択
 * - 頭部・胴体・脚部の一部には「内蔵武器」付きのレアパーツがある
 * - 武器スロット：[1]右腕 [2]左腕 [3][4]内蔵武器（最大2つ）
 */
import { WEAPONS, BUILTIN_WEAPONS } from './weapons.js';

export const SLOT_LABELS = {
  head: '頭部', body: '胴体', rarm: '右腕', larm: '左腕', legs: '脚部', booster: 'ブースター'
};

export const PARTS_CATALOG = {
  head: [
    { id: 'head_sensor', name: 'ARGUS 広域センサー', processing: 100, color: 0x4d7ea8, eyeColor: 0x00e5ff, style: 'visor', guard: { reduce: 0.5, hold: null }, desc: '標準センサー。Qガードは軽減50%で、押している間ずっと張れる。' },
    { id: 'head_quantum', name: 'QUANTUM 高速演算', processing: 160, color: 0x8c3b6e, eyeColor: 0xffab00, style: 'antenna', guard: { reduce: 0.75, hold: 5 }, desc: 'ロックオンが速い。Qガードは軽減75%で、押している間最大5秒。' },
    { id: 'head_bunker', name: 'CYCLOPS モノアイ重装', processing: 80, color: 0x5c6b57, eyeColor: 0xff3d57, style: 'mono', guard: { reduce: 1, hold: 1 }, desc: '重装モノアイ。Qガードは軽減100%で、押している間最大1秒。' },
    { id: 'head_vulcan', name: 'VULCAN-EYE 機関砲頭', processing: 95, color: 0x6a5a48, eyeColor: 0xfff1a8, style: 'visor', rare: true, builtin: 'b_vulcan', guard: { reduce: 0.5, hold: null }, desc: '側頭部バルカン。Qガードは軽減50%で、押している間ずっと張れる。' }
  ],
  body: [
    { id: 'body_std', name: 'TYPE-80 デザートコア', hp: 1800, ep: 1000, color: 0x3b6e8c, subColor: 0x24435a, style: 'standard', desc: 'バランスの良い標準胴体。' },
    { id: 'body_heavy', name: 'GOLIATH 重装要塞', hp: 2800, ep: 850, color: 0x5c6b57, subColor: 0x37412f, style: 'heavy', desc: '圧倒的な耐久力。' },
    { id: 'body_light', name: 'MIRAGE 高出力リアクター', hp: 1350, ep: 1500, color: 0xc9772a, subColor: 0x6e3f14, style: 'sleek', desc: 'EP容量が大きく、ブーストを多用できる。' },
    { id: 'body_arsenal', name: 'ARSENAL 肩部ミサイル胴', hp: 2000, ep: 950, color: 0x6b4a3a, subColor: 0x3d2a22, style: 'standard', rare: true, builtin: 'b_micromissile', desc: '両肩にマイクロミサイルポッドを内蔵。' }
  ],
  rarm: WEAPONS,
  larm: WEAPONS,
  legs: [
    { id: 'legs_caterpillar', name: 'SAND-CRAWLER キャタピラ', type: 'caterpillar', mobility: 110, jump: 70, color: 0x454d59, accent: 0xffab00, desc: '安定した走行性能。ジャンプは苦手。' },
    { id: 'legs_biped', name: 'STRIDER 重量二足', type: 'biped', mobility: 100, jump: 110, color: 0x3b6e8c, accent: 0x00e5ff, desc: '跳躍力に優れる二足脚。' },
    { id: 'legs_quad', name: 'SCORPION 四脚フレーム', type: 'quad', mobility: 95, jump: 95, color: 0x6e473b, accent: 0xff5252, desc: '重心が低く、ノックバックに強い。', knockResist: 0.3 },
    { id: 'legs_mortar', name: 'MORTAR-CRAWLER 迫撃砲脚', type: 'caterpillar', mobility: 92, jump: 60, color: 0x5a5040, accent: 0xffa040, rare: true, builtin: 'b_mortar', desc: '後部に迫撃砲を搭載したキャタピラ。' }
  ],
  booster: [
    { id: 'boost_twin', name: 'JET-VORTEX ツイン', mobilityBonus: 20, jumpBonus: 20, color: 0xd69e2e, flameColor: 0x00e5ff, desc: 'バランス型ブースター。' },
    { id: 'boost_overdrive', name: 'OVERDRIVE 重推進', mobilityBonus: 40, jumpBonus: 10, color: 0xe53e3e, flameColor: 0xffab00, desc: 'ダッシュ速度重視。' },
    { id: 'boost_sky', name: 'AERO-THRUST 高出力', mobilityBonus: 10, jumpBonus: 40, color: 0x3182ce, flameColor: 0x64dd17, desc: '跳躍・滑空重視。' },
    { id: 'boost_none', name: '【装備なし】', mobilityBonus: 0, jumpBonus: 0, color: 0x000000, flameColor: 0x000000, desc: '滑空・高速ダッシュ不可。' }
  ]
};

export function findPart(slot, id) {
  return PARTS_CATALOG[slot].find((p) => p.id === id) || PARTS_CATALOG[slot][0];
}

/** 初期状態で所持しているパーツ（武器は右腕用の重装榴弾キャノン1個のみ） */
export function getInitialInventory() {
  return {
    head_sensor: 1,
    body_std: 1,
    w_cannon: 1,
    w_none: 99,
    legs_caterpillar: 1,
    boost_twin: 1,
    boost_none: 99
  };
}

/** 指定スロットに指定パーツを装備可能か（両腕に同じ武器を付ける場合は2個必要） */
export function canEquipPart(inv, loadout, slot, partId) {
  if (partId === 'w_none' || partId === 'boost_none') return true;
  const count = inv[partId] || 0;
  if (count <= 0) return false;
  if (slot === 'rarm' && loadout.larm === partId && loadout.rarm !== partId) return count >= 2;
  if (slot === 'larm' && loadout.rarm === partId && loadout.larm !== partId) return count >= 2;
  return true;
}

/** IDからパーツ情報とスロット種別を検索 */
export function findPartAnySlot(partId) {
  for (const slot of ['rarm', 'head', 'body', 'legs', 'booster']) {
    const p = PARTS_CATALOG[slot].find((x) => x.id === partId);
    if (p) return { slot: slot === 'rarm' ? 'weapon' : slot, part: p };
  }
  return null;
}

/** 雑魚敵やボスがドロップするパーツを抽選（敵が使っていた武器や未所持パーツを優先） */
export function pickDropPart(inv, enemyWeaponId = null, preferRare = false) {
  const pool = [];
  const addCandidate = (id, slot, part, weight) => {
    if (id === 'w_none' || id === 'boost_none') return;
    const owned = inv[id] || 0;
    const maxUseful = slot === 'weapon' ? 2 : 1;
    // 未所持は高確率、腕武器の2個目（DUAL用）は中確率、すでに十分持っている場合も低確率で候補に残す
    const mult = owned === 0 ? 5.0 : owned < maxUseful ? 2.0 : 0.35;
    pool.push({ id, slot, part, w: weight * mult });
  };

  for (const w of WEAPONS) addCandidate(w.id, 'weapon', w, w.id === enemyWeaponId ? 6.0 : 1.6);
  for (const slot of ['head', 'body', 'legs', 'booster']) {
    for (const p of PARTS_CATALOG[slot]) {
      const w = p.rare ? (preferRare ? 8.0 : 1.1) : 1.3;
      addCandidate(p.id, slot, p, w);
    }
  }

  let total = 0;
  for (const item of pool) total += item.w;
  let r = Math.random() * total;
  for (const item of pool) {
    r -= item.w;
    if (r <= 0) return item;
  }
  return pool[0];
}

/** 機体スペックと武器スロットを算出 */
export function computeMechStats(loadout) {
  const parts = {};
  for (const k of Object.keys(PARTS_CATALOG)) parts[k] = findPart(k, loadout[k]);
  const { head, body, rarm, larm, legs, booster } = parts;

  // 武器スロット：1=右腕 2=左腕 3,4=内蔵武器（頭→胴→脚の順で最大2つ）
  const slots = [
    { key: 'R', label: '右腕', def: rarm, mount: 'rarm' },
    { key: 'L', label: '左腕', def: larm, mount: 'larm' }
  ];
  for (const p of [head, body, legs]) {
    if (p.builtin && slots.length < 4) {
      const def = BUILTIN_WEAPONS[p.builtin];
      slots.push({ key: def.mount, label: SLOTNAME[def.mount], def, mount: def.mount });
    }
  }

  return {
    hp: body.hp,
    ep: body.ep,
    mobility: legs.mobility + (booster.mobilityBonus || 0) + (rarm.mobilityBonus || 0) + (larm.mobilityBonus || 0),
    jump: legs.jump + (booster.jumpBonus || 0),
    processing: head.processing,
    knockResist: legs.knockResist || 0,
    hasBooster: booster.id !== 'boost_none',
    isDualLinked: rarm.behavior !== 'none' && rarm.id === larm.id,
    slots,
    parts
  };
}

const SLOTNAME = { head: '頭部', shoulder: '肩部', legs: '脚部' };
