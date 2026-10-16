import type { Vec2 } from "./types";

export const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

export const len = (v: Vec2) => Math.hypot(v.x, v.y);

export const normalize = (v: Vec2, fallback: Vec2 = { x: 1, y: 0 }): Vec2 => {
  const length = len(v);
  if (length < 0.0001) return { ...fallback };
  return { x: v.x / length, y: v.y / length };
};

export const distSq = (a: Vec2, b: Vec2) => {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
};

export const rotate = (v: Vec2, radians: number): Vec2 => {
  const c = Math.cos(radians);
  const s = Math.sin(radians);
  return { x: v.x * c - v.y * s, y: v.x * s + v.y * c };
};

export const approach = (current: number, target: number, delta: number) => {
  if (current < target) return Math.min(current + delta, target);
  return Math.max(current - delta, target);
};

export const cellKey = (gx: number, gy: number) => `${gx},${gy}`;
