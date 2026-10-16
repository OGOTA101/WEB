import { blockerAt, bonusAt, indexOf, posOf, reservationAt } from "../game/board";
import { BOARD_SIZE, EMPTY, GameState, Pos } from "../game/types";

export interface BoardHighlights {
  cost: Pos[];
  targets: Pos[];
  hover: Pos | null;
  legalHover: boolean;
}

interface Metrics {
  dpr: number;
  width: number;
  height: number;
  board: number;
  originX: number;
  originY: number;
  cell: number;
}

export class BoardRenderer {
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private metrics: Metrics = {
    dpr: 1,
    width: 0,
    height: 0,
    board: 0,
    originX: 0,
    originY: 0,
    cell: 0
  };

  constructor(canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D context is unavailable");
    this.canvas = canvas;
    this.ctx = ctx;
    this.resize();
  }

  resize(): void {
    const rect = this.canvas.getBoundingClientRect();
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    this.canvas.width = Math.max(1, Math.floor(rect.width * dpr));
    this.canvas.height = Math.max(1, Math.floor(rect.height * dpr));
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const width = rect.width;
    const height = rect.height;
    const board = Math.floor(Math.min(width, height) - 24);
    const cell = board / BOARD_SIZE;
    this.metrics = {
      dpr,
      width,
      height,
      board,
      cell,
      originX: Math.floor((width - board) / 2),
      originY: Math.floor((height - board) / 2)
    };
  }

  screenToBoard(clientX: number, clientY: number): Pos | null {
    const rect = this.canvas.getBoundingClientRect();
    const x = clientX - rect.left - this.metrics.originX;
    const y = clientY - rect.top - this.metrics.originY;
    if (x < 0 || y < 0 || x >= this.metrics.board || y >= this.metrics.board) return null;
    return {
      x: Math.max(0, Math.min(BOARD_SIZE - 1, Math.floor(x / this.metrics.cell))),
      y: Math.max(0, Math.min(BOARD_SIZE - 1, Math.floor(y / this.metrics.cell)))
    };
  }

  draw(state: GameState, highlights: BoardHighlights): void {
    const ctx = this.ctx;
    const { width, height, originX, originY, board, cell } = this.metrics;
    ctx.clearRect(0, 0, width, height);

    const paper = ctx.createLinearGradient(0, originY, width, originY + board);
    paper.addColorStop(0, "#e8cf9f");
    paper.addColorStop(0.48, "#f5dfb6");
    paper.addColorStop(1, "#c99f62");
    ctx.fillStyle = paper;
    roundRect(ctx, originX - 8, originY - 8, board + 16, board + 16, 18);
    ctx.fill();

    ctx.save();
    ctx.translate(originX, originY);
    ctx.fillStyle = "#eed6a4";
    ctx.fillRect(0, 0, board, board);
    this.drawTexture(ctx, board);
    this.drawGrid(ctx, board, cell);
    this.drawSpecialCells(ctx, state, cell);
    this.drawHighlights(ctx, highlights, cell);
    this.drawStones(ctx, state, cell);
    this.drawWinningLine(ctx, state, cell);
    this.drawFx(ctx, state, cell);
    ctx.restore();
  }

  private drawTexture(ctx: CanvasRenderingContext2D, board: number): void {
    ctx.save();
    ctx.globalAlpha = 0.13;
    ctx.strokeStyle = "#8a5f2f";
    for (let i = 0; i < 80; i += 1) {
      const y = (i * 37) % board;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.bezierCurveTo(board * 0.25, y - 12, board * 0.7, y + 16, board, y - 4);
      ctx.stroke();
    }
    ctx.restore();
  }

  private drawGrid(ctx: CanvasRenderingContext2D, board: number, cell: number): void {
    ctx.strokeStyle = "rgba(52, 34, 18, 0.42)";
    ctx.lineWidth = 1;
    for (let i = 0; i <= BOARD_SIZE; i += 1) {
      const p = Math.round(i * cell) + 0.5;
      ctx.beginPath();
      ctx.moveTo(p, 0);
      ctx.lineTo(p, board);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, p);
      ctx.lineTo(board, p);
      ctx.stroke();
    }

    ctx.fillStyle = "rgba(25, 19, 12, 0.7)";
    for (const point of [
      { x: 7, y: 7 },
      { x: 14, y: 14 },
      { x: 22, y: 22 },
      { x: 7, y: 22 },
      { x: 22, y: 7 }
    ]) {
      ctx.beginPath();
      ctx.arc((point.x + 0.5) * cell, (point.y + 0.5) * cell, Math.max(2.2, cell * 0.13), 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawSpecialCells(ctx: CanvasRenderingContext2D, state: GameState, cell: number): void {
    for (let index = 0; index < state.cells.length; index += 1) {
      const pos = posOf(index);
      const x = pos.x * cell;
      const y = pos.y * cell;
      const blocker = blockerAt(state.blockers, pos, state.turnNumber);
      if (blocker) {
        ctx.fillStyle = "rgba(32, 88, 96, 0.26)";
        ctx.fillRect(x + 1, y + 1, cell - 2, cell - 2);
        ctx.strokeStyle = "rgba(32, 88, 96, 0.8)";
        ctx.strokeRect(x + 3, y + 3, cell - 6, cell - 6);
      }
      const reservation = reservationAt(state.reservations, pos);
      if (reservation) {
        const player = state.players[reservation.owner];
        ctx.strokeStyle = player.stoneColor;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc((pos.x + 0.5) * cell, (pos.y + 0.5) * cell, cell * 0.28, 0, Math.PI * 2);
        ctx.stroke();
      }
      const owner = state.cells[index];
      if (owner !== EMPTY && bonusAt(state.bonusCells, pos, owner, state.turnNumber)) {
        ctx.fillStyle = "rgba(216, 154, 28, 0.23)";
        ctx.beginPath();
        ctx.arc((pos.x + 0.5) * cell, (pos.y + 0.5) * cell, cell * 0.46, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  private drawHighlights(ctx: CanvasRenderingContext2D, highlights: BoardHighlights, cell: number): void {
    const fillCell = (pos: Pos, fill: string, stroke: string) => {
      ctx.fillStyle = fill;
      ctx.strokeStyle = stroke;
      ctx.lineWidth = 2;
      ctx.fillRect(pos.x * cell + 2, pos.y * cell + 2, cell - 4, cell - 4);
      ctx.strokeRect(pos.x * cell + 3, pos.y * cell + 3, cell - 6, cell - 6);
    };

    highlights.cost.forEach((pos) => fillCell(pos, "rgba(211, 70, 51, 0.22)", "rgba(211, 70, 51, 0.9)"));
    highlights.targets.forEach((pos) => fillCell(pos, "rgba(42, 131, 104, 0.22)", "rgba(42, 131, 104, 0.92)"));
    if (highlights.hover) {
      fillCell(
        highlights.hover,
        highlights.legalHover ? "rgba(255, 250, 220, 0.3)" : "rgba(135, 36, 36, 0.28)",
        highlights.legalHover ? "rgba(255, 248, 200, 0.9)" : "rgba(135, 36, 36, 0.9)"
      );
    }
  }

  private drawStones(ctx: CanvasRenderingContext2D, state: GameState, cell: number): void {
    for (let index = 0; index < state.cells.length; index += 1) {
      const owner = state.cells[index];
      if (owner === EMPTY) continue;
      const pos = posOf(index);
      const player = state.players[owner];
      const cx = (pos.x + 0.5) * cell;
      const cy = (pos.y + 0.5) * cell;
      const radius = cell * 0.38;
      ctx.save();
      ctx.shadowColor = "rgba(43, 27, 12, 0.38)";
      ctx.shadowBlur = 5;
      ctx.shadowOffsetY = 2;
      const grad = ctx.createRadialGradient(cx - radius * 0.35, cy - radius * 0.4, radius * 0.08, cx, cy, radius);
      grad.addColorStop(0, lighten(player.stoneColor, 0.5));
      grad.addColorStop(0.72, player.stoneColor);
      grad.addColorStop(1, player.strokeColor);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowColor = "transparent";
      ctx.strokeStyle = player.strokeColor;
      ctx.lineWidth = Math.max(1.2, cell * 0.06);
      ctx.stroke();
      ctx.restore();
    }
  }

  private drawWinningLine(ctx: CanvasRenderingContext2D, state: GameState, cell: number): void {
    if (state.winningLine.length === 0) return;
    ctx.strokeStyle = "rgba(223, 51, 51, 0.9)";
    ctx.lineWidth = Math.max(4, cell * 0.16);
    ctx.lineCap = "round";
    ctx.beginPath();
    state.winningLine.forEach((pos, index) => {
      const x = (pos.x + 0.5) * cell;
      const y = (pos.y + 0.5) * cell;
      if (index === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
  }

  private drawFx(ctx: CanvasRenderingContext2D, state: GameState, cell: number): void {
    const now = performance.now();
    for (const fx of state.fx) {
      const age = now - fx.createdAt;
      const t = Math.min(1, age / 1200);
      ctx.save();
      ctx.globalAlpha = 1 - t;
      if (fx.pos) {
        const x = (fx.pos.x + 0.5) * cell;
        const y = (fx.pos.y + 0.5) * cell;
        const radius = cell * (0.25 + t * 1.5);
        ctx.strokeStyle = fx.type === "remove" ? "#c43d2f" : fx.type === "win" ? "#d89a1c" : "#1f7f6e";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.stroke();
        if (fx.text) {
          ctx.font = `700 ${Math.max(10, cell * 0.55)}px "Yu Gothic", sans-serif`;
          ctx.fillStyle = ctx.strokeStyle;
          ctx.textAlign = "center";
          ctx.fillText(fx.text, x, y - cell * (0.4 + t));
        }
      } else if (fx.text) {
        ctx.font = '800 30px "Yu Mincho", serif';
        ctx.fillStyle = fx.type === "win" ? "#d89a1c" : "#1f7f6e";
        ctx.textAlign = "center";
        ctx.fillText(fx.text, this.metrics.board / 2, this.metrics.board * 0.16);
      }
      ctx.restore();
    }
  }
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function lighten(hex: string, amount: number): string {
  const normalized = hex.replace("#", "");
  const number = parseInt(normalized, 16);
  const r = Math.min(255, Math.round(((number >> 16) & 255) + 255 * amount));
  const g = Math.min(255, Math.round(((number >> 8) & 255) + 255 * amount));
  const b = Math.min(255, Math.round((number & 255) + 255 * amount));
  return `rgb(${r}, ${g}, ${b})`;
}
