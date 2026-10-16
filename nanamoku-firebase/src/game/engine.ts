import {
  BOARD_SIZE,
  CardDefinition,
  CardPlan,
  EMPTY,
  FxEvent,
  GameState,
  MoveChoice,
  Player,
  Pos
} from "./types";
import {
  allPositions,
  areCollinear,
  blockerAt,
  bonusAt,
  clearCell,
  createEmptyBoard,
  distance,
  getCell,
  hasOwnNeighbor,
  inBounds,
  indexOf,
  isEmpty,
  isInner,
  isIsolated,
  isOuterRing,
  keyOf,
  neighbors,
  playerPositions,
  posOf,
  setCell,
  uniquePositions
} from "./board";
import { DEFAULT_DECK, getCard } from "./cards";
import { boardIsFull, candidateCells, findWinningLine, getThreatStones, longestLineFrom, wouldWin } from "./rules";

const PLAYER_COLORS = [
  { colorName: "黒", stoneColor: "#171717", strokeColor: "#050505" },
  { colorName: "白", stoneColor: "#fff9ec", strokeColor: "#7c6f58" },
  { colorName: "赤", stoneColor: "#e94b5f", strokeColor: "#7e1828" },
  { colorName: "青", stoneColor: "#2f7df6", strokeColor: "#123a7d" },
  { colorName: "緑", stoneColor: "#31b76a", strokeColor: "#155f38" },
  { colorName: "紫", stoneColor: "#8b5cf6", strokeColor: "#4c2a9d" },
  { colorName: "金", stoneColor: "#d89a1c", strokeColor: "#704d0c" }
];

export function createPlayers(humanDeck = DEFAULT_DECK, cpuDeck = DEFAULT_DECK, cpuLevel: Player["cpuLevel"] = "normal"): Player[] {
  return [
    {
      id: 0,
      name: "あなた",
      isCpu: false,
      cpuLevel: "normal",
      deck: humanDeck,
      usedCards: [],
      cardLockedUntilTurn: 0,
      ...PLAYER_COLORS[0]
    },
    {
      id: 1,
      name: `CPU ${labelCpu(cpuLevel)}`,
      isCpu: true,
      cpuLevel,
      deck: cpuDeck,
      usedCards: [],
      cardLockedUntilTurn: 0,
      ...PLAYER_COLORS[1]
    }
  ];
}

export function createInitialState(humanDeck = DEFAULT_DECK, cpuLevel: Player["cpuLevel"] = "normal"): GameState {
  const cpuDeck = ["N01", "N03", "N05", "N12", "S01", "S06", "U02"];
  return {
    cells: createEmptyBoard(),
    players: createPlayers(humanDeck, cpuDeck, cpuLevel),
    currentPlayer: 0,
    turnNumber: 1,
    normalActionsRemaining: 1,
    cardUsedThisTurn: false,
    pendingAfterPlace: null,
    reservations: [],
    blockers: [],
    bonusCells: [],
    winner: null,
    winningLine: [],
    lastMove: null,
    logs: [
      {
        turn: 1,
        playerId: 0,
        text: "対局開始",
        tone: "system"
      }
    ],
    fx: [],
    nextFxId: 1
  };
}

export function cloneState(state: GameState): GameState {
  return {
    ...state,
    cells: [...state.cells],
    players: state.players.map((player) => ({ ...player, deck: [...player.deck], usedCards: [...player.usedCards] })),
    reservations: state.reservations.map((entry) => ({ ...entry })),
    blockers: state.blockers.map((entry) => ({ ...entry })),
    bonusCells: state.bonusCells.map((entry) => ({ ...entry })),
    winningLine: state.winningLine.map((pos) => ({ ...pos })),
    logs: state.logs.map((log) => ({ ...log })),
    fx: state.fx.map((fx) => ({ ...fx })),
    pendingAfterPlace: state.pendingAfterPlace ? { ...state.pendingAfterPlace } : null,
    lastMove: state.lastMove ? { ...state.lastMove } : null
  };
}

export function activePlayer(state: GameState): Player {
  return state.players[state.currentPlayer];
}

export function opponentOf(state: GameState, playerId: number): Player {
  return state.players.find((player) => player.id !== playerId) ?? state.players[0];
}

export function labelCpu(level: Player["cpuLevel"]): string {
  if (level === "easy") return "Easy";
  if (level === "hard") return "Hard";
  return "Normal";
}

export function logEvent(state: GameState, playerId: number, text: string, tone: "place" | "card" | "system" | "win"): void {
  state.logs.unshift({ turn: state.turnNumber, playerId, text, tone });
  state.logs = state.logs.slice(0, 18);
}

export function addFx(state: GameState, type: FxEvent["type"], pos?: Pos, text?: string, playerId?: number): void {
  state.fx.push({
    id: state.nextFxId,
    type,
    pos,
    text,
    playerId,
    createdAt: performance.now()
  });
  state.nextFxId += 1;
  state.fx = state.fx.slice(-80);
}

export function pruneFx(state: GameState, now: number): void {
  state.fx = state.fx.filter((fx) => now - fx.createdAt < 1300);
}

export function cleanTimedEffects(state: GameState): void {
  state.blockers = state.blockers.filter((blocker) => blocker.expiresTurn >= state.turnNumber);
  state.bonusCells = state.bonusCells.filter((bonus) => bonus.expiresTurn >= state.turnNumber);
}

export function startTurn(state: GameState): void {
  const player = activePlayer(state);
  state.normalActionsRemaining = 1;
  state.cardUsedThisTurn = false;
  state.pendingAfterPlace = null;
  cleanTimedEffects(state);
  resolveReservations(state, player.id);
  logEvent(state, player.id, `${player.name} の番`, "system");
}

export function advanceTurn(state: GameState): void {
  if (state.winner !== null) return;
  state.currentPlayer = (state.currentPlayer + 1) % state.players.length;
  state.turnNumber += 1;
  startTurn(state);
}

export function resolveReservations(state: GameState, playerId: number): void {
  const ready = state.reservations.filter((reservation) => reservation.owner === playerId && reservation.readyTurn <= state.turnNumber);
  if (ready.length === 0) return;
  for (const reservation of ready) {
    const pos = posOf(reservation.index);
    if (isEmpty(state.cells, pos)) {
      setCell(state.cells, pos, playerId);
      addFx(state, "reserve", pos, "予約", playerId);
      logEvent(state, playerId, "予約石が着地", "card");
    }
  }
  state.reservations = state.reservations.filter((reservation) => !(reservation.owner === playerId && reservation.readyTurn <= state.turnNumber));
  checkVictory(state, playerId);
}

export function isCardLocked(state: GameState, playerId: number): boolean {
  const player = state.players[playerId];
  return player.cardLockedUntilTurn >= state.turnNumber;
}

export function ownStoneCount(state: GameState, playerId: number): number {
  return state.cells.filter((cell) => cell === playerId).length;
}

export function costValueAt(state: GameState, pos: Pos, playerId: number): number {
  const bonus = bonusAt(state.bonusCells, pos, playerId, state.turnNumber);
  return bonus?.value ?? 1;
}

export function selectedCostValue(state: GameState, positions: Pos[], playerId: number): number {
  return uniquePositions(positions).reduce((sum, pos) => sum + costValueAt(state, pos, playerId), 0);
}

export function canUseCard(state: GameState, playerId: number, card: CardDefinition): boolean {
  const player = state.players[playerId];
  if (state.winner !== null) return false;
  if (state.currentPlayer !== playerId) return false;
  if (state.cardUsedThisTurn) return false;
  if (state.normalActionsRemaining !== 1) return false;
  if (player.usedCards.includes(card.id)) return false;
  if (isCardLocked(state, playerId)) return false;
  if (card.cost.noCostWhenLowStones !== undefined && ownStoneCount(state, playerId) > card.cost.noCostWhenLowStones) return false;
  const available = playerPositions(state.cells, playerId).filter((pos) => isValidCostStone(state, card, playerId, pos));
  if (card.cost.stones === 0) return true;
  return available.reduce((sum, pos) => sum + costValueAt(state, pos, playerId), 0) >= card.cost.stones;
}

export function isValidCostStone(state: GameState, card: CardDefinition, playerId: number, pos: Pos, selected: Pos[] = []): boolean {
  if (getCell(state.cells, pos) !== playerId) return false;
  if (selected.some((entry) => keyOf(entry) === keyOf(pos))) return false;
  if (card.cost.filter === "isolated") return isIsolated(state.cells, pos, playerId);
  if (card.cost.filter === "line") return selected.length === 0 || areCollinear([...selected, pos]);
  return true;
}

export function hasEnoughCost(state: GameState, card: CardDefinition, playerId: number, selected: Pos[]): boolean {
  if (card.cost.noCostWhenLowStones !== undefined) return ownStoneCount(state, playerId) <= card.cost.noCostWhenLowStones;
  if (card.cost.stones === 0) return true;
  if (selected.some((pos) => !isValidCostStone(state, card, playerId, pos, selected.filter((entry) => keyOf(entry) !== keyOf(pos))))) return false;
  if (card.cost.filter === "line" && selected.length > 1 && !areCollinear(selected)) return false;
  return selectedCostValue(state, selected, playerId) >= card.cost.stones;
}

export function previewCellsAfterCost(state: GameState, cost: Pos[]): number[] {
  const cells = [...state.cells];
  for (const pos of cost) clearCell(cells, pos);
  return cells;
}

export function isValidTarget(state: GameState, card: CardDefinition, playerId: number, cost: Pos[], target: Pos, selectedTargets: Pos[] = []): boolean {
  if (!inBounds(target)) return false;
  if (selectedTargets.some((pos) => keyOf(pos) === keyOf(target))) return false;
  const cells = previewCellsAfterCost(state, cost);
  const origin = cost[0] ?? target;
  const cell = getCell(cells, target);
  const enemyId = opponentOf(state, playerId).id;

  if (card.target.kind === "empty" && cell !== EMPTY) return false;
  if (card.target.kind === "enemy" && cell !== enemyId) return false;
  if (card.target.kind === "own" && cell !== playerId) return false;
  if (card.target.kind === "any" && blockerAt(state.blockers, target, state.turnNumber)) return false;

  switch (card.id) {
    case "N01":
      return cell === EMPTY && isIsolated(cells, target, playerId, selectedTargets) && playerPositions(cells, playerId).every((pos) => distance(pos, target) >= 3);
    case "N02":
      return cell === EMPTY && isInner(target) && isIsolated(cells, target, playerId, selectedTargets);
    case "N03":
      return cell === EMPTY && distance(origin, target) <= 2;
    case "N04":
      return cell === EMPTY && distance(origin, target) <= 8 && isSameStraightLine(origin, target);
    case "N05":
      return cell === enemyId && distance(origin, target) <= 1;
    case "N06":
      return cell === EMPTY && isBridgeCell(cells, target, playerId);
    case "N07":
      return cell === EMPTY && distance(origin, target) <= 3;
    case "N08":
      return cell === EMPTY && isOuterRing(target) && isIsolated(cells, target, playerId, selectedTargets);
    case "N09":
      return cell === EMPTY && distance(origin, target) <= 4;
    case "N10":
      return cell === enemyId && distance(origin, target) <= 1;
    case "N11":
      return cell === enemyId && (getThreatStones(cells, enemyId, 4).length === 0 || getThreatStones(cells, enemyId, 4).some((pos) => keyOf(pos) === keyOf(target)));
    case "N12":
      return cell === EMPTY && isIsolated(cells, target, playerId, selectedTargets);
    case "S01":
      return cell === EMPTY && distance(origin, target) <= 3 && (selectedTargets.length === 0 || selectedTargets.some((pos) => distance(pos, target) <= 1));
    case "S02":
      return cell === enemyId && distance(origin, target) <= 2;
    case "S03":
      return cell === enemyId && distance(origin, target) <= 3;
    case "S04":
      return cell === EMPTY && distance(origin, target) <= 4;
    case "S06":
      return cell === EMPTY && (selectedTargets.length === 0 || distance(selectedTargets[0], target) <= 5);
    case "U02":
      return cell === enemyId && isWithinBox([...selectedTargets, target], 15);
    case "U04":
      return true;
    default:
      return card.target.kind === "none" || card.target.kind === "any" || cell === EMPTY || cell === enemyId;
  }
}

export function canFinishTargets(card: CardDefinition, targets: Pos[]): boolean {
  if (card.target.kind === "none") return targets.length === 0;
  if (card.target.exact) return targets.length === card.target.max;
  return targets.length >= card.target.min && targets.length <= card.target.max;
}

export function applyCardPlan(state: GameState, playerId: number, plan: CardPlan): { ok: boolean; message: string } {
  const card = getCard(plan.cardId);
  if (!canUseCard(state, playerId, card)) return { ok: false, message: "このカードは使えません" };
  if (!hasEnoughCost(state, card, playerId, plan.cost)) return { ok: false, message: "コストが足りません" };
  if (!canFinishTargets(card, plan.targets)) return { ok: false, message: "対象が足りません" };
  for (const target of plan.targets) {
    const selectedBefore = plan.targets.slice(0, plan.targets.findIndex((pos) => keyOf(pos) === keyOf(target)));
    if (!isValidTarget(state, card, playerId, plan.cost, target, selectedBefore)) {
      return { ok: false, message: "対象が不正です" };
    }
  }

  const player = state.players[playerId];
  const opponent = opponentOf(state, playerId);
  const removed: Pos[] = [];
  const placed: Pos[] = [];
  const converted: Pos[] = [];
  const blocked: Pos[] = [];
  const reserved: Pos[] = [];

  for (const pos of uniquePositions(plan.cost)) {
    if (getCell(state.cells, pos) === playerId) {
      clearCell(state.cells, pos);
      removed.push(pos);
      addFx(state, "remove", pos, "cost", playerId);
    }
  }

  const place = (pos: Pos) => {
    if (!isEmpty(state.cells, pos)) return;
    setCell(state.cells, pos, playerId);
    placed.push(pos);
    addFx(state, "place", pos, undefined, playerId);
  };
  const remove = (pos: Pos) => {
    if (getCell(state.cells, pos) === opponent.id) {
      clearCell(state.cells, pos);
      removed.push(pos);
      addFx(state, "remove", pos, "破壊", opponent.id);
    }
  };
  const convert = (pos: Pos) => {
    if (getCell(state.cells, pos) === opponent.id) {
      setCell(state.cells, pos, playerId);
      converted.push(pos);
      addFx(state, "card", pos, "奪取", playerId);
    }
  };

  switch (card.id) {
    case "N05":
    case "S03":
      plan.targets.forEach(remove);
      break;
    case "N09":
      for (const pos of plan.targets) {
        state.reservations.push({ index: indexOf(pos), owner: playerId, readyTurn: state.turnNumber + state.players.length });
        reserved.push(pos);
        addFx(state, "reserve", pos, "予約", playerId);
      }
      break;
    case "N10":
      applyPush(state, playerId, plan.cost[0], plan.targets[0], removed, placed);
      break;
    case "N11": {
      remove(plan.targets[0]);
      const next = neighbors(plan.targets[0]).find((pos) => isEmpty(state.cells, pos));
      if (next) place(next);
      break;
    }
    case "N12":
      plan.targets.forEach(place);
      for (const pos of plan.targets) {
        state.bonusCells.push({ index: indexOf(pos), owner: playerId, value: 2, expiresTurn: state.turnNumber + state.players.length });
      }
      break;
    case "S02":
    case "U02":
      plan.targets.forEach(convert);
      break;
    case "S05":
      opponent.cardLockedUntilTurn = Math.max(opponent.cardLockedUntilTurn, state.turnNumber + 1);
      addFx(state, "card", undefined, "沈黙", opponent.id);
      break;
    case "S06":
      for (const pos of plan.targets) {
        state.blockers.push({ index: indexOf(pos), owner: playerId, expiresTurn: state.turnNumber + state.players.length * 2 });
        blocked.push(pos);
        addFx(state, "block", pos, "封鎖", playerId);
      }
      break;
    case "S07":
      restoreUsedCards(player, "normal", 2);
      break;
    case "S08":
      state.pendingAfterPlace = { type: "chain3", owner: playerId };
      addFx(state, "card", undefined, "連鎖", playerId);
      break;
    case "U03":
      state.normalActionsRemaining = 3;
      restoreUsedCards(player, "any", 1);
      addFx(state, "card", undefined, "三手", playerId);
      break;
    case "U04":
      applyEndgameEdit(state, playerId, plan.targets[0], removed, placed);
      break;
    default:
      plan.targets.forEach(place);
      break;
  }

  player.usedCards.push(card.id);
  state.cardUsedThisTurn = true;
  if (card.cost.nextCardLock) {
    player.cardLockedUntilTurn = Math.max(player.cardLockedUntilTurn, state.turnNumber + state.players.length);
  }
  if (card.cost.actionSkip) {
    state.normalActionsRemaining = 0;
  }

  logEvent(state, playerId, `${card.name} を使用`, "card");
  addFx(state, card.rarity === "ultimate" ? "win" : "card", plan.targets[0] ?? plan.cost[0], card.name, playerId);
  checkVictory(state, playerId);

  if (state.winner === null && state.normalActionsRemaining <= 0) {
    advanceTurn(state);
  }

  return {
    ok: true,
    message: `${card.name}: ${placed.length}配置 ${removed.length}除去 ${converted.length}奪取 ${blocked.length}封鎖 ${reserved.length}予約`
  };
}

export function placeStone(state: GameState, playerId: number, pos: Pos): { ok: boolean; message: string } {
  if (state.winner !== null) return { ok: false, message: "対局は終了しています" };
  if (state.currentPlayer !== playerId) return { ok: false, message: "今はあなたの番ではありません" };
  if (state.normalActionsRemaining <= 0) return { ok: false, message: "通常行動は残っていません" };
  if (!isEmpty(state.cells, pos)) return { ok: false, message: "そこには置けません" };
  const blocker = blockerAt(state.blockers, pos, state.turnNumber);
  if (blocker && blocker.owner !== playerId) return { ok: false, message: "封鎖されています" };

  setCell(state.cells, pos, playerId);
  state.lastMove = pos;
  addFx(state, "place", pos, undefined, playerId);
  logEvent(state, playerId, `${pos.x + 1},${pos.y + 1} に着手`, "place");

  if (state.pendingAfterPlace?.type === "chain3" && state.pendingAfterPlace.owner === playerId) {
    const extras = neighbors(pos)
      .filter((candidate) => isEmpty(state.cells, candidate))
      .sort((a, b) => longestLineFrom(state.cells, b, playerId) - longestLineFrom(state.cells, a, playerId))
      .slice(0, 3);
    extras.forEach((extra) => {
      setCell(state.cells, extra, playerId);
      addFx(state, "place", extra, "連鎖", playerId);
    });
    state.pendingAfterPlace = null;
  }

  checkVictory(state, playerId);
  if (state.winner !== null) return { ok: true, message: "勝利" };

  state.normalActionsRemaining -= 1;
  if (boardIsFull(state.cells)) {
    logEvent(state, playerId, "盤面が埋まりました", "system");
    return { ok: true, message: "引き分け" };
  }
  if (state.normalActionsRemaining <= 0) advanceTurn(state);
  return { ok: true, message: "着手しました" };
}

export function checkVictory(state: GameState, playerId: number): boolean {
  const line = findWinningLine(state.cells, playerId);
  if (line.length > 0) {
    state.winner = playerId;
    state.winningLine = line;
    logEvent(state, playerId, `${state.players[playerId].name} の勝利`, "win");
    line.forEach((pos) => addFx(state, "win", pos, "七目", playerId));
    return true;
  }
  return false;
}

export function suggestMove(state: GameState, playerId: number): Pos {
  const player = state.players[playerId];
  const opponent = opponentOf(state, playerId);
  const radius = player.cpuLevel === "hard" ? 3 : 2;
  const candidates = candidateCells(state.cells, radius).filter((pos) => {
    const blocker = blockerAt(state.blockers, pos, state.turnNumber);
    return isEmpty(state.cells, pos) && (!blocker || blocker.owner === playerId);
  });

  const immediateWin = candidates.find((pos) => wouldWin(state.cells, pos, playerId));
  if (immediateWin) return immediateWin;

  const immediateBlock = candidates.find((pos) => wouldWin(state.cells, pos, opponent.id));
  if (immediateBlock && player.cpuLevel !== "easy") return immediateBlock;

  if (player.cpuLevel === "easy") {
    return candidates[Math.floor(Math.random() * candidates.length)] ?? { x: 15, y: 15 };
  }

  let best = candidates[0] ?? { x: 15, y: 15 };
  let bestScore = -Infinity;
  for (const pos of candidates) {
    const ownLine = longestLineFrom(state.cells, pos, playerId);
    const enemyLine = longestLineFrom(state.cells, pos, opponent.id);
    const center = 18 - Math.abs(pos.x - 14.5) - Math.abs(pos.y - 14.5);
    const ownNeighbor = hasOwnNeighbor(state.cells, pos, playerId) ? 8 : 0;
    const score = ownLine * ownLine * 9 + enemyLine * enemyLine * (player.cpuLevel === "hard" ? 8 : 5) + center + ownNeighbor + Math.random() * 3;
    if (score > bestScore) {
      best = pos;
      bestScore = score;
    }
  }
  return best;
}

export function chooseCpuMove(state: GameState, playerId: number): MoveChoice {
  const cardPlan = chooseCpuCard(state, playerId);
  return {
    cardPlan,
    place: state.winner === null ? suggestMove(state, playerId) : null
  };
}

export function chooseCpuCard(state: GameState, playerId: number): CardPlan | null {
  const player = state.players[playerId];
  if (player.cpuLevel === "easy" && Math.random() > 0.24) return null;
  if (player.cpuLevel === "normal" && Math.random() > 0.48) return null;
  if (player.cpuLevel === "hard" && Math.random() > 0.72) return null;

  const cards = player.deck
    .map(getCard)
    .filter((card) => canUseCard(state, playerId, card))
    .sort((a, b) => cardCpuWeight(b) - cardCpuWeight(a));

  for (const card of cards) {
    const plan = makeCpuCardPlan(state, playerId, card);
    if (plan) return plan;
  }
  return null;
}

export function makeCpuCardPlan(state: GameState, playerId: number, card: CardDefinition): CardPlan | null {
  const cost = chooseCost(state, playerId, card);
  if (!hasEnoughCost(state, card, playerId, cost)) return null;
  const targets = chooseTargets(state, playerId, card, cost);
  if (!canFinishTargets(card, targets)) return null;
  return { cardId: card.id, cost, targets };
}

function chooseCost(state: GameState, playerId: number, card: CardDefinition): Pos[] {
  if (card.cost.stones === 0 || card.cost.noCostWhenLowStones !== undefined) return [];
  const stones = playerPositions(state.cells, playerId)
    .filter((pos) => isValidCostStone(state, card, playerId, pos))
    .sort((a, b) => {
      const aLine = longestLineFrom(state.cells, a, playerId);
      const bLine = longestLineFrom(state.cells, b, playerId);
      return aLine - bLine;
    });
  const selected: Pos[] = [];
  for (const pos of stones) {
    if (isValidCostStone(state, card, playerId, pos, selected)) selected.push(pos);
    if (selectedCostValue(state, selected, playerId) >= card.cost.stones) break;
  }
  return selected;
}

function chooseTargets(state: GameState, playerId: number, card: CardDefinition, cost: Pos[]): Pos[] {
  if (card.target.kind === "none") return [];
  if (card.id === "U04") {
    const threat = getThreatStones(state.cells, opponentOf(state, playerId).id, 4)[0];
    return [threat ?? { x: 15, y: 15 }];
  }

  const all = allPositions().filter((pos) => isValidTarget(state, card, playerId, cost, pos, []));
  const opponent = opponentOf(state, playerId);
  const sorted = all.sort((a, b) => {
    const aScore = targetScore(state, playerId, opponent.id, card, a);
    const bScore = targetScore(state, playerId, opponent.id, card, b);
    return bScore - aScore;
  });
  const targets: Pos[] = [];
  for (const pos of sorted) {
    if (targets.length >= card.target.max) break;
    if (isValidTarget(state, card, playerId, cost, pos, targets)) targets.push(pos);
  }
  return targets.length >= card.target.min ? targets : [];
}

function targetScore(state: GameState, playerId: number, enemyId: number, card: CardDefinition, pos: Pos): number {
  if (card.target.kind === "enemy") {
    return longestLineFrom(state.cells, pos, enemyId) * 12 + (15 - distance(pos, { x: 15, y: 15 }));
  }
  return longestLineFrom(state.cells, pos, playerId) * 11 + (15 - distance(pos, { x: 15, y: 15 })) + Math.random() * 2;
}

function restoreUsedCards(player: Player, rarity: "normal" | "any", count: number): void {
  const restored: string[] = [];
  for (const cardId of player.usedCards) {
    const card = getCard(cardId);
    if (rarity === "any" || card.rarity === rarity) restored.push(cardId);
    if (restored.length >= count) break;
  }
  player.usedCards = player.usedCards.filter((cardId) => !restored.includes(cardId));
}

function applyPush(state: GameState, playerId: number, origin: Pos, target: Pos, removed: Pos[], placed: Pos[]): void {
  const owner = getCell(state.cells, target);
  const dx = Math.sign(target.x - origin.x);
  const dy = Math.sign(target.y - origin.y);
  const next = { x: target.x + dx, y: target.y + dy };
  if (owner !== EMPTY && inBounds(next) && isEmpty(state.cells, next)) {
    clearCell(state.cells, target);
    setCell(state.cells, next, owner);
    placed.push(next);
    addFx(state, "card", next, "押出", owner);
    return;
  }
  if (owner !== EMPTY && owner !== playerId) {
    clearCell(state.cells, target);
    removed.push(target);
    addFx(state, "remove", target, "押出", owner);
  }
}

function applyEndgameEdit(state: GameState, playerId: number, center: Pos, removed: Pos[], placed: Pos[]): void {
  const opponent = opponentOf(state, playerId);
  const area: Pos[] = [];
  for (let y = center.y - 3; y <= center.y + 3; y += 1) {
    for (let x = center.x - 3; x <= center.x + 3; x += 1) {
      const pos = { x, y };
      if (inBounds(pos)) area.push(pos);
    }
  }
  const enemies = area
    .filter((pos) => getCell(state.cells, pos) === opponent.id)
    .sort((a, b) => longestLineFrom(state.cells, b, opponent.id) - longestLineFrom(state.cells, a, opponent.id))
    .slice(0, 6);
  enemies.forEach((pos) => {
    clearCell(state.cells, pos);
    removed.push(pos);
    addFx(state, "remove", pos, "編集", opponent.id);
  });
  const empty = area
    .filter((pos) => isEmpty(state.cells, pos))
    .sort((a, b) => longestLineFrom(state.cells, b, playerId) - longestLineFrom(state.cells, a, playerId))
    .slice(0, 6);
  empty.forEach((pos) => {
    setCell(state.cells, pos, playerId);
    placed.push(pos);
    addFx(state, "place", pos, "編集", playerId);
  });
}

function isSameStraightLine(a: Pos, b: Pos): boolean {
  return a.x === b.x || a.y === b.y || Math.abs(a.x - b.x) === Math.abs(a.y - b.y);
}

function isBridgeCell(cells: number[], target: Pos, playerId: number): boolean {
  const pairs = [
    [{ x: -1, y: 0 }, { x: 1, y: 0 }],
    [{ x: 0, y: -1 }, { x: 0, y: 1 }],
    [{ x: -1, y: -1 }, { x: 1, y: 1 }],
    [{ x: -1, y: 1 }, { x: 1, y: -1 }]
  ];
  return pairs.some(([a, b]) => {
    const left = { x: target.x + a.x, y: target.y + a.y };
    const right = { x: target.x + b.x, y: target.y + b.y };
    return inBounds(left) && inBounds(right) && getCell(cells, left) === playerId && getCell(cells, right) === playerId;
  });
}

function isWithinBox(positions: Pos[], size: number): boolean {
  const xs = positions.map((pos) => pos.x);
  const ys = positions.map((pos) => pos.y);
  return Math.max(...xs) - Math.min(...xs) < size && Math.max(...ys) - Math.min(...ys) < size;
}

function cardCpuWeight(card: CardDefinition): number {
  if (card.rarity === "ultimate") return 30;
  if (card.rarity === "strong") return 18;
  if (card.role === "資源") return 12;
  return 8;
}
