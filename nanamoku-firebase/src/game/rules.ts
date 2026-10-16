import { BOARD_SIZE, EMPTY, Pos, WIN_LENGTH } from "./types";
import { getCell, inBounds, indexOf, lineDirections, posOf } from "./board";

export function countLine(cells: number[], pos: Pos, playerId: number, dir: Pos): Pos[] {
  const result: Pos[] = [pos];

  for (const sign of [-1, 1]) {
    let next = { x: pos.x + dir.x * sign, y: pos.y + dir.y * sign };
    while (inBounds(next) && getCell(cells, next) === playerId) {
      result.push(next);
      next = { x: next.x + dir.x * sign, y: next.y + dir.y * sign };
    }
  }

  return result.sort((a, b) => indexOf(a) - indexOf(b));
}

export function findWinningLine(cells: number[], playerId: number): Pos[] {
  for (let index = 0; index < cells.length; index += 1) {
    if (cells[index] !== playerId) continue;
    const pos = posOf(index);
    for (const dir of lineDirections()) {
      const line = countLine(cells, pos, playerId, dir);
      if (line.length >= WIN_LENGTH) return line.slice(0, WIN_LENGTH);
    }
  }
  return [];
}

export function wouldWin(cells: number[], pos: Pos, playerId: number): boolean {
  if (!inBounds(pos) || getCell(cells, pos) !== EMPTY) return false;
  const copy = [...cells];
  copy[indexOf(pos)] = playerId;
  return findWinningLine(copy, playerId).length >= WIN_LENGTH;
}

export function longestLineFrom(cells: number[], pos: Pos, playerId: number): number {
  if (!inBounds(pos)) return 0;
  const original = cells[indexOf(pos)];
  const copy = [...cells];
  if (original === EMPTY) copy[indexOf(pos)] = playerId;
  return Math.max(...lineDirections().map((dir) => countLine(copy, pos, playerId, dir).length));
}

export function boardIsFull(cells: number[]): boolean {
  return cells.every((cell) => cell !== EMPTY);
}

export function getThreatStones(cells: number[], playerId: number, minLength = 4): Pos[] {
  const threats: Pos[] = [];
  const seen = new Set<string>();
  for (let index = 0; index < cells.length; index += 1) {
    if (cells[index] !== playerId) continue;
    const pos = posOf(index);
    for (const dir of lineDirections()) {
      const line = countLine(cells, pos, playerId, dir);
      if (line.length >= minLength) {
        for (const stone of line) {
          const key = `${stone.x},${stone.y}`;
          if (!seen.has(key)) {
            seen.add(key);
            threats.push(stone);
          }
        }
      }
    }
  }
  return threats;
}

export function candidateCells(cells: number[], radius = 2, size = BOARD_SIZE): Pos[] {
  const occupied = cells
    .map((cell, index) => (cell === EMPTY ? null : posOf(index, size)))
    .filter((pos): pos is Pos => pos !== null);
  const seen = new Set<string>();
  const result: Pos[] = [];

  if (occupied.length === 0) {
    const center = Math.floor(size / 2);
    return [{ x: center, y: center }];
  }

  for (const base of occupied) {
    for (let y = base.y - radius; y <= base.y + radius; y += 1) {
      for (let x = base.x - radius; x <= base.x + radius; x += 1) {
        const pos = { x, y };
        const key = `${x},${y}`;
        if (seen.has(key) || !inBounds(pos, size) || getCell(cells, pos) !== EMPTY) continue;
        seen.add(key);
        result.push(pos);
      }
    }
  }
  return result;
}
