import { BOARD_SIZE, Blocker, BonusCell, EMPTY, Pos, Reservation } from "./types";

export function indexOf(pos: Pos, size = BOARD_SIZE): number {
  return pos.y * size + pos.x;
}

export function posOf(index: number, size = BOARD_SIZE): Pos {
  return { x: index % size, y: Math.floor(index / size) };
}

export function inBounds(pos: Pos, size = BOARD_SIZE): boolean {
  return pos.x >= 0 && pos.y >= 0 && pos.x < size && pos.y < size;
}

export function createEmptyBoard(size = BOARD_SIZE): number[] {
  return Array.from({ length: size * size }, () => EMPTY);
}

export function getCell(cells: number[], pos: Pos): number {
  if (!inBounds(pos)) return EMPTY;
  return cells[indexOf(pos)];
}

export function setCell(cells: number[], pos: Pos, owner: number): void {
  if (!inBounds(pos)) return;
  cells[indexOf(pos)] = owner;
}

export function clearCell(cells: number[], pos: Pos): void {
  setCell(cells, pos, EMPTY);
}

export function samePos(a: Pos, b: Pos): boolean {
  return a.x === b.x && a.y === b.y;
}

export function distance(a: Pos, b: Pos): number {
  return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
}

export function manhattan(a: Pos, b: Pos): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

export function keyOf(pos: Pos): string {
  return `${pos.x},${pos.y}`;
}

export function neighbors(pos: Pos): Pos[] {
  const result: Pos[] = [];
  for (let dy = -1; dy <= 1; dy += 1) {
    for (let dx = -1; dx <= 1; dx += 1) {
      if (dx === 0 && dy === 0) continue;
      const next = { x: pos.x + dx, y: pos.y + dy };
      if (inBounds(next)) result.push(next);
    }
  }
  return result;
}

export function lineDirections(): Pos[] {
  return [
    { x: 1, y: 0 },
    { x: 0, y: 1 },
    { x: 1, y: 1 },
    { x: 1, y: -1 }
  ];
}

export function isEmpty(cells: number[], pos: Pos): boolean {
  return inBounds(pos) && getCell(cells, pos) === EMPTY;
}

export function allPositions(size = BOARD_SIZE): Pos[] {
  const result: Pos[] = [];
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      result.push({ x, y });
    }
  }
  return result;
}

export function playerPositions(cells: number[], playerId: number): Pos[] {
  const result: Pos[] = [];
  cells.forEach((cell, index) => {
    if (cell === playerId) result.push(posOf(index));
  });
  return result;
}

export function occupiedPositions(cells: number[]): Pos[] {
  const result: Pos[] = [];
  cells.forEach((cell, index) => {
    if (cell !== EMPTY) result.push(posOf(index));
  });
  return result;
}

export function isIsolated(cells: number[], pos: Pos, playerId: number, extra: Pos[] = []): boolean {
  const extraKeys = new Set(extra.map(keyOf));
  return neighbors(pos).every((near) => getCell(cells, near) !== playerId && !extraKeys.has(keyOf(near)));
}

export function hasOwnNeighbor(cells: number[], pos: Pos, playerId: number): boolean {
  return neighbors(pos).some((near) => getCell(cells, near) === playerId);
}

export function isOuterRing(pos: Pos, ring = 2, size = BOARD_SIZE): boolean {
  return pos.x < ring || pos.y < ring || pos.x >= size - ring || pos.y >= size - ring;
}

export function isInner(pos: Pos, margin = 3, size = BOARD_SIZE): boolean {
  return pos.x >= margin && pos.y >= margin && pos.x < size - margin && pos.y < size - margin;
}

export function blockerAt(blockers: Blocker[], pos: Pos, turnNumber: number): Blocker | null {
  const idx = indexOf(pos);
  return blockers.find((blocker) => blocker.index === idx && blocker.expiresTurn >= turnNumber) ?? null;
}

export function reservationAt(reservations: Reservation[], pos: Pos): Reservation | null {
  const idx = indexOf(pos);
  return reservations.find((reservation) => reservation.index === idx) ?? null;
}

export function bonusAt(bonusCells: BonusCell[], pos: Pos, owner: number, turnNumber: number): BonusCell | null {
  const idx = indexOf(pos);
  return bonusCells.find((bonus) => bonus.index === idx && bonus.owner === owner && bonus.expiresTurn >= turnNumber) ?? null;
}

export function uniquePositions(positions: Pos[]): Pos[] {
  const seen = new Set<string>();
  const result: Pos[] = [];
  for (const pos of positions) {
    const key = keyOf(pos);
    if (!seen.has(key)) {
      seen.add(key);
      result.push(pos);
    }
  }
  return result;
}

export function areCollinear(positions: Pos[]): boolean {
  if (positions.length <= 2) return true;
  const [a, b] = positions;
  const dx = Math.sign(b.x - a.x);
  const dy = Math.sign(b.y - a.y);
  if (dx === 0 && dy === 0) return false;
  return positions.slice(2).every((pos) => {
    const xDiff = pos.x - a.x;
    const yDiff = pos.y - a.y;
    if (dx === 0) return pos.x === a.x;
    if (dy === 0) return pos.y === a.y;
    return Math.abs(xDiff) === Math.abs(yDiff) && Math.sign(xDiff) === dx && Math.sign(yDiff) === dy;
  });
}
