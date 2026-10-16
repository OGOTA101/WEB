import type { BulletKind, MaterialId, Vec2, WeaponId } from "./types";

export const BLOCK_SIZE = 34;
export const BOARD_SIZE = 2800;
export const MAX_PLAYERS = 7;

export const SPRITE_FRAME_SIZE = 32;
export const MATERIAL_FRAME: Record<MaterialId, number> = {
  wood: 0,
  brick: 1,
  stone: 2,
  iron: 3,
  diamond: 4,
  obsidian: 5
};
export const CORE_FRAME_OFFSET = 6;
export const BULLET_FRAME_START = 16;
export const BULLET_FRAME_COUNT = 144;

export const MATERIALS: Record<
  MaterialId,
  { hp: number; color: number; edge: number; light: number; dark: number; label: string; short: string }
> = {
  wood: { hp: 1, color: 0x9a6a39, edge: 0x5f351b, light: 0xc18a50, dark: 0x6f4524, label: "Wood", short: "Wd" },
  brick: { hp: 2, color: 0xb14f3c, edge: 0x6f2c29, light: 0xd07156, dark: 0x743027, label: "Brick", short: "Br" },
  stone: { hp: 3, color: 0x8a9092, edge: 0x52585d, light: 0xb4bbbf, dark: 0x5d666c, label: "Stone", short: "St" },
  iron: { hp: 4, color: 0xc9d2d8, edge: 0x707b84, light: 0xf3f7fb, dark: 0x87939c, label: "Iron", short: "Ir" },
  diamond: { hp: 5, color: 0x42d5f5, edge: 0x157c99, light: 0xe0fbff, dark: 0x1382a0, label: "Diamond", short: "Dm" },
  obsidian: { hp: 6, color: 0x2b2142, edge: 0x0c0814, light: 0x5b3a88, dark: 0x11081f, label: "Obsidian", short: "Ob" }
};

export const MATERIAL_ORDER: MaterialId[] = ["wood", "brick", "stone", "iron", "diamond", "obsidian"];

export type WeaponPattern =
  | "single"
  | "auto"
  | "homing"
  | "rear"
  | "fixed"
  | "spread"
  | "ring"
  | "rocket"
  | "beam"
  | "sniper"
  | "bomb"
  | "debuff"
  | "orbit"
  | "knockback"
  | "shield"
  | "heal"
  | "reinforce"
  | "split"
  | "cross"
  | "mine";

export type WeaponSpec = {
  id: WeaponId;
  label: string;
  short: string;
  manual: boolean;
  cooldown: number;
  color: number;
  description: string;
  pattern: WeaponPattern;
  kind: BulletKind;
  count: number;
  spread: number;
  speed: number;
  radius: number;
  ttl: number;
  pierce: number;
  knockback: number;
  slow: number;
  damage: number;
  fixedDir?: Vec2;
  spriteFrame: number;
};

const palettes = [
  0xffd166, 0x70d6ff, 0x80ed99, 0xf78c6b, 0xbdb2ff, 0xffafcc,
  0xf3722c, 0x00f5d4, 0xffffff, 0xf94144, 0x9b5de5, 0xfee440,
  0x4cc9f0, 0x95d5b2, 0xff6b6b, 0xe0aaff
];

const fixedDirections: Vec2[] = [
  { x: 0, y: -1 },
  { x: 1, y: 0 },
  { x: 0, y: 1 },
  { x: -1, y: 0 },
  { x: 0.707, y: -0.707 },
  { x: 0.707, y: 0.707 },
  { x: -0.707, y: 0.707 },
  { x: -0.707, y: -0.707 }
];

const baseWeapons: WeaponSpec[] = [
  makeSpec("forward", "Forward Core", "Fw", true, "single", "round", 0, { cooldown: 0.36, speed: 390 }),
  makeSpec("auto", "Auto Core", "Au", false, "auto", "round", 1, { cooldown: 0.62, speed: 420 }),
  makeSpec("homing", "Homing Core", "Hm", true, "homing", "homing", 2, { cooldown: 0.78, speed: 330, ttl: 2.4 }),
  makeSpec("rear", "Rear Core", "Rr", true, "rear", "round", 3, { cooldown: 0.45, speed: 370 }),
  makeSpec("fixedN", "North Core", "N", false, "fixed", "round", 4, { fixedDir: fixedDirections[0] }),
  makeSpec("fixedE", "East Core", "E", false, "fixed", "round", 5, { fixedDir: fixedDirections[1] }),
  makeSpec("fixedS", "South Core", "S", false, "fixed", "round", 6, { fixedDir: fixedDirections[2] }),
  makeSpec("fixedW", "West Core", "W", false, "fixed", "round", 7, { fixedDir: fixedDirections[3] }),
  makeSpec("bomb", "Bomb Core", "Bm", true, "bomb", "bomb", 8, { cooldown: 0.95, speed: 95, radius: 13, ttl: 1.1, knockback: 520 }),
  makeSpec("heal", "Repair Core", "Hp", false, "heal", "pulse", 9, { cooldown: 5.8 }),
  makeSpec("reinforce", "Upgrade Core", "Up", false, "reinforce", "pulse", 10, { cooldown: 8.5 }),
  makeSpec("debuff", "Slow Core", "Sl", true, "debuff", "debuff", 11, { cooldown: 0.82, speed: 330, slow: 2.2 }),
  makeSpec("orbit", "Orbit Core", "Or", false, "orbit", "orb", 12, { cooldown: 1.05, count: 4, radius: 9, ttl: 2.2, pierce: 1 }),
  makeSpec("spread", "Spread Core", "Sp", true, "spread", "round", 13, { cooldown: 0.64, count: 5, spread: 0.17, speed: 330, radius: 5, ttl: 1.1 }),
  makeSpec("rocket", "Rocket Core", "Rc", true, "rocket", "rocket", 14, { cooldown: 0.9, speed: 250, radius: 12, ttl: 2.7, knockback: 820 }),
  makeSpec("beam", "Beam Core", "Be", true, "beam", "beam", 15, { cooldown: 0.7, speed: 980, radius: 8, ttl: 0.38, pierce: 4 }),
  makeSpec("sniper", "Sniper Core", "Sn", true, "sniper", "sniper", 16, { cooldown: 1.05, speed: 1050, radius: 4, ttl: 1.9, pierce: 1 }),
  makeSpec("knockback", "Push Core", "Ps", true, "knockback", "knockback", 17, { cooldown: 0.7, damage: 0, speed: 460, radius: 10, knockback: 1100 }),
  makeSpec("shield", "Shield Core", "Sh", true, "shield", "pulse", 18, { cooldown: 1.2 })
];

const generatedFamilies: Array<{
  pattern: WeaponPattern;
  label: string;
  short: string;
  manual: boolean;
  kind: BulletKind;
}> = [
  { pattern: "single", label: "Needle", short: "Nd", manual: true, kind: "round" },
  { pattern: "auto", label: "Watcher", short: "Wt", manual: false, kind: "round" },
  { pattern: "homing", label: "Seeker", short: "Sk", manual: true, kind: "homing" },
  { pattern: "rear", label: "Backfire", short: "Bk", manual: true, kind: "round" },
  { pattern: "fixed", label: "Turret", short: "Tr", manual: false, kind: "round" },
  { pattern: "spread", label: "Fan", short: "Fn", manual: true, kind: "round" },
  { pattern: "ring", label: "Nova", short: "Nv", manual: true, kind: "pulse" },
  { pattern: "rocket", label: "Comet", short: "Cm", manual: true, kind: "rocket" },
  { pattern: "beam", label: "Ray", short: "Ry", manual: true, kind: "beam" },
  { pattern: "sniper", label: "Lance", short: "Ln", manual: true, kind: "sniper" },
  { pattern: "bomb", label: "Mineburst", short: "Mb", manual: true, kind: "bomb" },
  { pattern: "debuff", label: "Frost", short: "Fr", manual: true, kind: "debuff" },
  { pattern: "orbit", label: "Satellite", short: "Sa", manual: false, kind: "orb" },
  { pattern: "knockback", label: "Bumper", short: "Bp", manual: true, kind: "knockback" },
  { pattern: "split", label: "Splitter", short: "St", manual: true, kind: "blade" },
  { pattern: "cross", label: "Cross", short: "Cr", manual: true, kind: "pulse" },
  { pattern: "mine", label: "Anchor", short: "An", manual: true, kind: "mine" }
];

function makeSpec(
  id: string,
  label: string,
  short: string,
  manual: boolean,
  pattern: WeaponPattern,
  kind: BulletKind,
  spriteOffset: number,
  overrides: Partial<Omit<WeaponSpec, "id" | "label" | "short" | "manual" | "pattern" | "kind" | "description" | "spriteFrame" | "color">> = {}
): WeaponSpec {
  const color = palettes[spriteOffset % palettes.length];
  return {
    id,
    label,
    short,
    manual,
    cooldown: 0.5,
    color,
    description: `${label}: ${pattern} bullet core`,
    pattern,
    kind,
    count: 1,
    spread: 0,
    speed: 390,
    radius: 7,
    ttl: 1.55,
    pierce: 0,
    knockback: 160,
    slow: 0,
    damage: 1,
    ...overrides,
    spriteFrame: BULLET_FRAME_START + (spriteOffset % BULLET_FRAME_COUNT)
  };
}

function makeGeneratedWeapon(index: number): WeaponSpec {
  const family = generatedFamilies[index % generatedFamilies.length];
  const tier = Math.floor(index / generatedFamilies.length);
  const spriteOffset = baseWeapons.length + index;
  const color = palettes[(index + tier * 3) % palettes.length];
  const count =
    family.pattern === "spread" ? 3 + (tier % 6) :
    family.pattern === "ring" ? 6 + (tier % 7) :
    family.pattern === "orbit" ? 3 + (tier % 5) :
    family.pattern === "cross" ? 4 :
    1;
  return {
    ...makeSpec(
      `core-${String(index + 1).padStart(3, "0")}`,
      `${family.label} ${tier + 1}`,
      family.short,
      family.manual,
      family.pattern,
      family.kind,
      spriteOffset,
      {
        cooldown: Math.max(0.18, 0.34 + (index % 8) * 0.07 + tier * 0.018),
        count,
        spread: family.pattern === "spread" ? 0.13 + (tier % 5) * 0.045 : 0,
        speed: 280 + (index % 9) * 36 + (family.pattern === "sniper" || family.pattern === "beam" ? 420 : 0),
        radius: 5 + (index % 4) + (family.pattern === "rocket" || family.pattern === "bomb" || family.pattern === "mine" ? 5 : 0),
        ttl: 0.9 + (index % 8) * 0.17 + (family.pattern === "sniper" ? 0.65 : 0),
        pierce: family.pattern === "beam" ? 4 + (tier % 3) : family.pattern === "sniper" ? 1 : family.pattern === "split" ? 1 : 0,
        knockback: family.pattern === "knockback" ? 900 + tier * 40 : family.pattern === "rocket" ? 680 : 150 + (index % 6) * 35,
        slow: family.pattern === "debuff" ? 1.3 + (tier % 4) * 0.32 : 0,
        damage: family.pattern === "knockback" ? 0 : 1,
        fixedDir: family.pattern === "fixed" ? fixedDirections[index % fixedDirections.length] : undefined
      }
    ),
    color,
    description: `${family.label} ${tier + 1}: variant ${index + 1} of 120 generated core weapons`
  };
}

export const GENERATED_CORE_WEAPONS: WeaponSpec[] = Array.from({ length: 120 }, (_, index) => makeGeneratedWeapon(index));
export const CORE_WEAPONS: WeaponSpec[] = [...baseWeapons, ...GENERATED_CORE_WEAPONS];
export const WEAPONS: Record<WeaponId, WeaponSpec> = Object.fromEntries(CORE_WEAPONS.map((weapon) => [weapon.id, weapon]));
export const DEFAULT_WEAPON_ID: WeaponId = "forward";
export const WEAPON_DROP_TABLE: WeaponId[] = CORE_WEAPONS.map((weapon) => weapon.id);

export function blockFrame(material: MaterialId, isCore: boolean) {
  return MATERIAL_FRAME[material] + (isCore ? CORE_FRAME_OFFSET : 0);
}

export function bulletFrameForWeapon(weapon?: WeaponId) {
  return weapon && WEAPONS[weapon] ? WEAPONS[weapon].spriteFrame : BULLET_FRAME_START;
}
