export const BOARD_SIZE = 30;
export const WIN_LENGTH = 7;
export const EMPTY = -1;

export type Rarity = "normal" | "strong" | "ultimate";
export type CpuLevel = "easy" | "normal" | "hard";
export type TargetKind = "none" | "empty" | "enemy" | "own" | "any";
export type CostFilter = "any" | "isolated" | "line" | "edge";

export interface Pos {
  x: number;
  y: number;
}

export interface Player {
  id: number;
  name: string;
  colorName: string;
  stoneColor: string;
  strokeColor: string;
  isCpu: boolean;
  cpuLevel: CpuLevel;
  deck: string[];
  usedCards: string[];
  cardLockedUntilTurn: number;
}

export interface CostSpec {
  stones: number;
  filter: CostFilter;
  actionSkip?: boolean;
  nextCardLock?: boolean;
  noCostWhenLowStones?: number;
}

export interface TargetSpec {
  kind: TargetKind;
  min: number;
  max: number;
  exact?: boolean;
}

export interface CardDefinition {
  id: string;
  name: string;
  rarity: Rarity;
  cost: CostSpec;
  target: TargetSpec;
  effect: string;
  role: string;
  flavor: string;
}

export interface Reservation {
  index: number;
  owner: number;
  readyTurn: number;
}

export interface Blocker {
  index: number;
  owner: number;
  expiresTurn: number;
}

export interface BonusCell {
  index: number;
  owner: number;
  value: number;
  expiresTurn: number;
}

export interface PendingAfterPlace {
  type: "chain3";
  owner: number;
}

export interface LogEntry {
  turn: number;
  playerId: number;
  text: string;
  tone: "place" | "card" | "system" | "win";
}

export interface FxEvent {
  id: number;
  type: "place" | "remove" | "card" | "win" | "block" | "reserve";
  pos?: Pos;
  text?: string;
  playerId?: number;
  createdAt: number;
}

export interface GameState {
  cells: number[];
  players: Player[];
  currentPlayer: number;
  turnNumber: number;
  normalActionsRemaining: number;
  cardUsedThisTurn: boolean;
  pendingAfterPlace: PendingAfterPlace | null;
  reservations: Reservation[];
  blockers: Blocker[];
  bonusCells: BonusCell[];
  winner: number | null;
  winningLine: Pos[];
  lastMove: Pos | null;
  logs: LogEntry[];
  fx: FxEvent[];
  nextFxId: number;
}

export interface CardPlan {
  cardId: string;
  cost: Pos[];
  targets: Pos[];
}

export interface ApplyResult {
  ok: boolean;
  message: string;
  placed: Pos[];
  removed: Pos[];
  converted: Pos[];
  blocked: Pos[];
  reserved: Pos[];
  endedTurn?: boolean;
}

export interface MoveChoice {
  cardPlan: CardPlan | null;
  place: Pos | null;
}
