import "./styles/main.css";
import { CARD_CATALOG, cardsByRarity, getCard, rarityLabel } from "./game/cards";
import { deckCounts, loadDeck, saveDeck, toggleCard, validateDeck } from "./game/deck";
import {
  activePlayer,
  applyCardPlan,
  canFinishTargets,
  canUseCard,
  chooseCpuCard,
  cloneState,
  createInitialState,
  hasEnoughCost,
  isCardLocked,
  isValidCostStone,
  isValidTarget,
  placeStone,
  pruneFx,
  selectedCostValue,
  suggestMove
} from "./game/engine";
import { keyOf } from "./game/board";
import { CardDefinition, CpuLevel, GameState, Pos } from "./game/types";
import { BoardRenderer } from "./rendering/boardRenderer";

const appRoot = document.querySelector<HTMLDivElement>("#app");
if (!appRoot) throw new Error("App root not found");
const app: HTMLDivElement = appRoot;

type ViewMode = "game" | "deck";

interface CardSelection {
  card: CardDefinition;
  cost: Pos[];
  targets: Pos[];
}

let deck = loadDeck();
let cpuLevel: CpuLevel = "normal";
let state: GameState = createInitialState(deck, cpuLevel);
let renderer: BoardRenderer | null = null;
let selectedCard: CardSelection | null = null;
let hover: Pos | null = null;
let viewMode: ViewMode = "game";
let editingDeck = [...deck];
let cpuThinking = false;
let toast = "CPU対戦を開始しました";

renderShell();
startAnimationLoop();
queueCpuIfNeeded();

function renderShell(): void {
  const counts = deckCounts(deck);
  app.innerHTML = `
    <div class="app-shell">
      <header class="topbar">
        <div class="brand-block">
          <div class="brand-mark">七</div>
          <div>
            <h1>ナナモク</h1>
            <p>30x30 / 7目 / カードデッキ対戦</p>
          </div>
        </div>
        <div class="top-actions">
          <label class="select-label">
            <span>CPU</span>
            <select id="cpu-level">
              <option value="easy" ${cpuLevel === "easy" ? "selected" : ""}>Easy</option>
              <option value="normal" ${cpuLevel === "normal" ? "selected" : ""}>Normal</option>
              <option value="hard" ${cpuLevel === "hard" ? "selected" : ""}>Hard</option>
            </select>
          </label>
          <button class="ink-button" id="new-game">新規対局</button>
          <button class="gold-button" id="open-deck">デッキ編成</button>
        </div>
      </header>

      <main class="game-layout">
        <section class="board-stage">
          <div class="board-frame">
            <canvas id="board-canvas" aria-label="ナナモク盤面"></canvas>
          </div>
          <div class="turn-ribbon ${state.winner !== null ? "win" : ""}">
            ${renderTurnRibbon()}
          </div>
        </section>

        <aside class="side-panel">
          <section class="status-panel">
            ${renderStatus()}
          </section>

          <section class="hand-panel">
            <div class="panel-heading">
              <span>Deck</span>
              <strong>${counts.normal}/4 ${counts.strong}/2 ${counts.ultimate}/1</strong>
            </div>
            <div class="hand-list">
              ${renderHand()}
            </div>
          </section>

          <section class="action-panel">
            ${renderActionPanel()}
          </section>

          <section class="log-panel">
            <div class="panel-heading">
              <span>Log</span>
              <strong>${state.turnNumber}</strong>
            </div>
            <div class="log-list">
              ${state.logs.map((log) => `<div class="log-entry ${log.tone}">${escapeHtml(log.text)}</div>`).join("")}
            </div>
          </section>
        </aside>
      </main>

      <div class="toast ${toast ? "show" : ""}">${escapeHtml(toast)}</div>
      ${viewMode === "deck" ? renderDeckModal() : ""}
    </div>
  `;

  bindUi();
  const canvas = document.querySelector<HTMLCanvasElement>("#board-canvas");
  if (!canvas) throw new Error("Canvas not found");
  renderer = new BoardRenderer(canvas);
  canvas.addEventListener("click", handleBoardClick);
  canvas.addEventListener("mousemove", handleBoardHover);
  canvas.addEventListener("mouseleave", () => {
    hover = null;
  });
  window.addEventListener("resize", () => renderer?.resize(), { once: true });
}

function bindUi(): void {
  document.querySelector<HTMLButtonElement>("#new-game")?.addEventListener("click", () => {
    state = createInitialState(deck, cpuLevel);
    selectedCard = null;
    toast = "新しい対局";
    renderShell();
    queueCpuIfNeeded();
  });

  document.querySelector<HTMLButtonElement>("#open-deck")?.addEventListener("click", () => {
    editingDeck = [...deck];
    viewMode = "deck";
    renderShell();
  });

  document.querySelector<HTMLSelectElement>("#cpu-level")?.addEventListener("change", (event) => {
    const value = (event.target as HTMLSelectElement).value as CpuLevel;
    cpuLevel = value;
    state = createInitialState(deck, cpuLevel);
    selectedCard = null;
    toast = `CPU ${value}`;
    renderShell();
  });

  document.querySelectorAll<HTMLButtonElement>("[data-card-id]").forEach((button) => {
    button.addEventListener("click", () => {
      const cardId = button.dataset.cardId;
      if (!cardId) return;
      beginCard(getCard(cardId));
    });
  });

  document.querySelector<HTMLButtonElement>("#cancel-card")?.addEventListener("click", () => {
    selectedCard = null;
    toast = "カード選択を解除";
    renderShell();
  });

  document.querySelector<HTMLButtonElement>("#finish-card")?.addEventListener("click", () => {
    finishSelectedCard();
  });

  document.querySelector<HTMLButtonElement>("#deck-close")?.addEventListener("click", () => {
    viewMode = "game";
    renderShell();
  });

  document.querySelector<HTMLButtonElement>("#deck-reset")?.addEventListener("click", () => {
    editingDeck = ["N01", "N03", "N06", "N12", "S01", "S03", "U01"];
    renderShell();
  });

  document.querySelector<HTMLButtonElement>("#deck-save")?.addEventListener("click", () => {
    const result = saveDeck(editingDeck);
    toast = result.message;
    if (result.ok) {
      deck = [...editingDeck];
      state = createInitialState(deck, cpuLevel);
      viewMode = "game";
      selectedCard = null;
    }
    renderShell();
  });

  document.querySelectorAll<HTMLButtonElement>("[data-edit-card]").forEach((button) => {
    button.addEventListener("click", () => {
      const cardId = button.dataset.editCard;
      if (!cardId) return;
      editingDeck = toggleCard(editingDeck, cardId);
      renderShell();
    });
  });
}

function renderTurnRibbon(): string {
  if (state.winner !== null) {
    const winner = state.players[state.winner];
    return `<span class="stone-dot" style="--stone:${winner.stoneColor}; --stroke:${winner.strokeColor}"></span><strong>${winner.name} 勝利</strong>`;
  }
  const player = activePlayer(state);
  return `
    <span class="stone-dot" style="--stone:${player.stoneColor}; --stroke:${player.strokeColor}"></span>
    <strong>${player.name}</strong>
    <em>${cpuThinking ? "思考中" : player.isCpu ? "CPUターン" : "あなたの番"}</em>
  `;
}

function renderStatus(): string {
  const human = state.players[0];
  const cpu = state.players[1];
  return `
    <div class="player-row ${state.currentPlayer === 0 ? "active" : ""}">
      <span class="stone-dot" style="--stone:${human.stoneColor}; --stroke:${human.strokeColor}"></span>
      <div>
        <strong>${human.name}</strong>
        <small>${human.usedCards.length}/7 used ${isCardLocked(state, human.id) ? "封印" : ""}</small>
      </div>
    </div>
    <div class="player-row ${state.currentPlayer === 1 ? "active" : ""}">
      <span class="stone-dot" style="--stone:${cpu.stoneColor}; --stroke:${cpu.strokeColor}"></span>
      <div>
        <strong>${cpu.name}</strong>
        <small>${cpu.usedCards.length}/7 used ${isCardLocked(state, cpu.id) ? "封印" : ""}</small>
      </div>
    </div>
    <div class="mini-stats">
      <div><span>Turn</span><strong>${state.turnNumber}</strong></div>
      <div><span>Action</span><strong>${state.normalActionsRemaining}</strong></div>
      <div><span>Card</span><strong>${state.cardUsedThisTurn ? "Used" : "Ready"}</strong></div>
    </div>
  `;
}

function renderHand(): string {
  const human = state.players[0];
  return human.deck
    .map((cardId) => {
      const card = getCard(cardId);
      const used = human.usedCards.includes(cardId);
      const usable = canUseCard(state, human.id, card) && !cpuThinking;
      const selected = selectedCard?.card.id === card.id;
      return `
        <button class="hand-card ${card.rarity} ${used ? "used" : ""} ${selected ? "selected" : ""}" data-card-id="${card.id}" ${usable ? "" : "disabled"}>
          <span class="card-rarity">${rarityLabel(card.rarity)}</span>
          <strong>${card.name}</strong>
          <small>${renderCostText(card)}</small>
          <em>${card.role}</em>
        </button>
      `;
    })
    .join("");
}

function renderActionPanel(): string {
  if (state.winner !== null) {
    return `
      <div class="result-card">
        <span>Result</span>
        <strong>${state.players[state.winner].name} の勝利</strong>
        <button class="gold-button stretch" id="new-game-inline">再戦</button>
      </div>
    `.replace('id="new-game-inline"', 'id="new-game"');
  }

  if (!selectedCard) {
    return `
      <div class="panel-heading">
        <span>Action</span>
        <strong>${activePlayer(state).isCpu ? "CPU" : "Place"}</strong>
      </div>
      <p class="action-copy">${activePlayer(state).isCpu ? "CPUが次の一手を読んでいます。" : "盤面の空きマスに石を置けます。カードは着手前に1枚だけ使えます。"}</p>
    `;
  }

  const card = selectedCard.card;
  const enoughCost = hasEnoughCost(state, card, 0, selectedCard.cost);
  const canFinish = enoughCost && canFinishTargets(card, selectedCard.targets);
  return `
    <div class="selected-card ${card.rarity}">
      <span>${rarityLabel(card.rarity)} / ${card.role}</span>
      <strong>${card.name}</strong>
      <p>${card.effect}</p>
    </div>
    <div class="selection-meter">
      <div>
        <span>Cost</span>
        <strong>${selectedCostValue(state, selectedCard.cost, 0)} / ${requiredCost(card)}</strong>
      </div>
      <div>
        <span>Target</span>
        <strong>${selectedCard.targets.length} / ${card.target.exact ? card.target.max : `${card.target.min}-${card.target.max}`}</strong>
      </div>
    </div>
    <div class="action-buttons">
      <button class="ink-button stretch" id="cancel-card">解除</button>
      <button class="gold-button stretch" id="finish-card" ${canFinish ? "" : "disabled"}>発動</button>
    </div>
    <p class="action-copy">${card.target.kind === "none" ? "コストを選んで発動します。" : enoughCost ? "対象マスを選びます。" : "自分の石をコストとして選びます。"}</p>
  `;
}

function renderDeckModal(): string {
  const counts = deckCounts(editingDeck);
  const validation = validateDeck(editingDeck);
  return `
    <div class="modal-backdrop">
      <section class="deck-modal">
        <div class="modal-head">
          <div>
            <span class="eyebrow">Deck Build</span>
            <h2>デッキ編成</h2>
          </div>
          <button class="icon-button" id="deck-close" aria-label="閉じる">x</button>
        </div>
        <div class="deck-counter">
          <div class="${counts.normal === 4 ? "ok" : ""}">通常 <strong>${counts.normal}/4</strong></div>
          <div class="${counts.strong === 2 ? "ok" : ""}">強 <strong>${counts.strong}/2</strong></div>
          <div class="${counts.ultimate === 1 ? "ok" : ""}">最強 <strong>${counts.ultimate}/1</strong></div>
        </div>
        <div class="deck-columns">
          ${(["normal", "strong", "ultimate"] as const)
            .map(
              (rarity) => `
                <div class="deck-column">
                  <h3>${rarityLabel(rarity)}</h3>
                  ${cardsByRarity(rarity)
                    .map((card) => {
                      const selected = editingDeck.includes(card.id);
                      return `
                        <button class="deck-card ${card.rarity} ${selected ? "selected" : ""}" data-edit-card="${card.id}">
                          <span>${card.id}</span>
                          <strong>${card.name}</strong>
                          <small>${renderCostText(card)}</small>
                          <em>${card.effect}</em>
                        </button>
                      `;
                    })
                    .join("")}
                </div>
              `
            )
            .join("")}
        </div>
        <div class="modal-foot">
          <span class="${validation.ok ? "valid" : "invalid"}">${escapeHtml(validation.message)}</span>
          <button class="ink-button" id="deck-reset">初期デッキ</button>
          <button class="gold-button" id="deck-save" ${validation.ok ? "" : "disabled"}>保存して対局へ</button>
        </div>
      </section>
    </div>
  `;
}

function beginCard(card: CardDefinition): void {
  if (!canUseCard(state, 0, card)) {
    toast = "今は使えません";
    renderShell();
    return;
  }
  selectedCard = { card, cost: [], targets: [] };
  toast = `${card.name} を選択`;
  renderShell();
}

function handleBoardClick(event: MouseEvent): void {
  if (!renderer || cpuThinking || state.winner !== null) return;
  const pos = renderer.screenToBoard(event.clientX, event.clientY);
  if (!pos) return;

  if (selectedCard) {
    handleCardBoardClick(pos);
    return;
  }

  const result = placeStone(state, 0, pos);
  toast = result.message;
  renderShell();
  queueCpuIfNeeded();
}

function handleCardBoardClick(pos: Pos): void {
  if (!selectedCard) return;
  const card = selectedCard.card;
  const enoughCost = hasEnoughCost(state, card, 0, selectedCard.cost);

  if (!enoughCost) {
    const already = selectedCard.cost.some((entry) => keyOf(entry) === keyOf(pos));
    if (already) {
      selectedCard.cost = selectedCard.cost.filter((entry) => keyOf(entry) !== keyOf(pos));
    } else if (isValidCostStone(state, card, 0, pos, selectedCard.cost)) {
      selectedCard.cost.push(pos);
    } else {
      toast = "コストにできない石です";
    }
    renderShell();
    return;
  }

  if (card.target.kind === "none") {
    finishSelectedCard();
    return;
  }

  const already = selectedCard.targets.some((entry) => keyOf(entry) === keyOf(pos));
  if (already) {
    selectedCard.targets = selectedCard.targets.filter((entry) => keyOf(entry) !== keyOf(pos));
  } else if (selectedCard.targets.length < card.target.max && isValidTarget(state, card, 0, selectedCard.cost, pos, selectedCard.targets)) {
    selectedCard.targets.push(pos);
    if (card.target.exact && selectedCard.targets.length === card.target.max) {
      finishSelectedCard();
      return;
    }
  } else {
    toast = "対象にできないマスです";
  }
  renderShell();
}

function finishSelectedCard(): void {
  if (!selectedCard) return;
  const result = applyCardPlan(state, 0, {
    cardId: selectedCard.card.id,
    cost: selectedCard.cost,
    targets: selectedCard.targets
  });
  toast = result.message;
  selectedCard = null;
  renderShell();
  queueCpuIfNeeded();
}

function handleBoardHover(event: MouseEvent): void {
  if (!renderer) return;
  hover = renderer.screenToBoard(event.clientX, event.clientY);
}

function startAnimationLoop(): void {
  const loop = () => {
    if (renderer) {
      pruneFx(state, performance.now());
      renderer.draw(state, {
        cost: selectedCard?.cost ?? [],
        targets: selectedCard?.targets ?? [],
        hover,
        legalHover: hover ? isHoverLegal(hover) : false
      });
    }
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
}

function isHoverLegal(pos: Pos): boolean {
  if (cpuThinking || state.winner !== null) return false;
  if (!selectedCard) return state.currentPlayer === 0 && state.normalActionsRemaining > 0;
  const card = selectedCard.card;
  const enoughCost = hasEnoughCost(state, card, 0, selectedCard.cost);
  if (!enoughCost) return isValidCostStone(state, card, 0, pos, selectedCard.cost);
  return isValidTarget(state, card, 0, selectedCard.cost, pos, selectedCard.targets);
}

async function queueCpuIfNeeded(): Promise<void> {
  if (cpuThinking || state.winner !== null || !activePlayer(state).isCpu) return;
  cpuThinking = true;
  renderShell();
  await sleep(650);

  const cpuId = activePlayer(state).id;
  const cardPlan = chooseCpuCard(state, cpuId);
  if (cardPlan) {
    const card = getCard(cardPlan.cardId);
    toast = `CPU: ${card.name}`;
    applyCardPlan(state, cpuId, cardPlan);
    renderShell();
    await sleep(card.rarity === "ultimate" ? 900 : 520);
  }

  while (state.winner === null && activePlayer(state).id === cpuId && state.normalActionsRemaining > 0) {
    const move = suggestMove(cloneState(state), cpuId);
    placeStone(state, cpuId, move);
    renderShell();
    await sleep(420);
  }

  cpuThinking = false;
  renderShell();
  if (activePlayer(state).isCpu) {
    void queueCpuIfNeeded();
  }
}

function renderCostText(card: CardDefinition): string {
  const parts: string[] = [];
  if (card.cost.noCostWhenLowStones !== undefined) parts.push(`自石${card.cost.noCostWhenLowStones}以下`);
  else if (card.cost.stones > 0) parts.push(`${costFilterLabel(card.cost.filter)}${card.cost.stones}`);
  else parts.push("石0");
  if (card.cost.actionSkip) parts.push("行動放棄");
  if (card.cost.nextCardLock) parts.push("次札封印");
  return parts.join(" / ");
}

function requiredCost(card: CardDefinition): string {
  if (card.cost.noCostWhenLowStones !== undefined) return "条件";
  return String(card.cost.stones);
}

function costFilterLabel(filter: CardDefinition["cost"]["filter"]): string {
  if (filter === "isolated") return "孤石";
  if (filter === "line") return "連石";
  if (filter === "edge") return "端石";
  return "石";
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
