import { MAX_PLAYERS, MATERIALS, WEAPONS } from "./game/catalog";
import type { SharedInput } from "./game/input";
import type { CoreBlockArenaSim } from "./game/simulation";
import type { GameSnapshot, RoomSettings } from "./game/types";
import type { FirebaseRoomClient, OnlineStatus } from "./multiplayer/firebaseRoom";

type UiDeps = {
  sim: CoreBlockArenaSim;
  input: SharedInput;
  online: FirebaseRoomClient;
  onStart: (mode: "solo" | "online", name: string, room: RoomSettings) => void;
};

export class GameUi {
  private root: HTMLElement;
  private snapshot?: GameSnapshot;
  private onlineStatus?: OnlineStatus;
  private playerName = localStorage.getItem("core-block-arena.name") ?? "Player";
  private roomCode = "";
  private friendlyFire = false;

  constructor(private deps: UiDeps) {
    const root = document.getElementById("ui-root");
    if (!root) throw new Error("#ui-root が見つかりません");
    this.root = root;
    this.roomCode = this.createRoomCode();
    this.render();
    this.bindMobileControls();
  }

  setSnapshot(snapshot: GameSnapshot) {
    this.snapshot = snapshot;
    this.render();
  }

  setOnlineStatus(status: OnlineStatus) {
    this.onlineStatus = status;
    this.render();
  }

  private render() {
    const phase = this.snapshot?.phase ?? "title";
    this.root.innerHTML = `
      <section class="hud ${phase === "playing" ? "" : "is-hidden"}">
        <div class="hud-strip">
          <strong>Core Block Arena</strong>
          <span>Score ${this.snapshot?.score ?? 0}</span>
          <span>Time ${Math.floor(this.snapshot?.elapsed ?? 0)}s</span>
          <span>Blocks ${this.snapshot?.players[0]?.blocks.length ?? 0}</span>
          <span>Cores ${this.snapshot?.players[0]?.blocks.filter((b) => b.isCore).length ?? 0}</span>
        </div>
        <div class="weapon-strip">${this.weaponChips()}</div>
      </section>

      <section class="title ${phase === "title" ? "" : "is-hidden"}">
        <div class="title-bg"></div>
        <div class="title-panel">
          <p class="eyebrow">巨大な四角い板の上で育つブロック破壊アリーナ</p>
          <h1>Core Block Arena</h1>
          <div class="form-row">
            <label>名前</label>
            <input id="player-name" value="${this.escape(this.playerName)}" maxlength="16" />
          </div>
          <div class="button-row">
            <button id="solo-start" class="primary">ソロプレイ</button>
            <button id="create-room">部屋を立てる</button>
            <button id="join-room">部屋に入る</button>
          </div>
          <div class="room-box">
            <label>部屋コード</label>
            <input id="room-code" value="${this.escape(this.roomCode)}" maxlength="8" />
            <label class="check"><input id="friendly-fire" type="checkbox" ${this.friendlyFire ? "checked" : ""}/> フレンドリーファイアあり</label>
            <p>${this.onlineStatus?.message ?? "Firebase確認中"} / 最大${MAX_PLAYERS}人</p>
          </div>
          <div class="ranking">
            <h2>ハイスコア</h2>
            ${this.rankingRows()}
          </div>
        </div>
      </section>

      <section class="gameover ${phase === "gameover" ? "" : "is-hidden"}">
        <div class="modal">
          <p class="eyebrow">${this.escape(this.snapshot?.message ?? "ゲームオーバー")}</p>
          <h2>GAME OVER</h2>
          <p>Score ${this.snapshot?.score ?? 0}</p>
          <button id="back-title" class="primary">タイトルへ</button>
        </div>
      </section>

      <div class="mobile-controls">
        <div id="stick" class="stick"><div id="stick-knob"></div></div>
        <button id="fire-button">FIRE</button>
      </div>
    `;
    this.bindButtons();
  }

  private bindButtons() {
    const nameInput = this.root.querySelector<HTMLInputElement>("#player-name");
    const roomInput = this.root.querySelector<HTMLInputElement>("#room-code");
    const ffInput = this.root.querySelector<HTMLInputElement>("#friendly-fire");
    nameInput?.addEventListener("input", () => {
      this.playerName = nameInput.value || "Player";
      localStorage.setItem("core-block-arena.name", this.playerName);
    });
    roomInput?.addEventListener("input", () => {
      this.roomCode = roomInput.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8);
      roomInput.value = this.roomCode;
    });
    ffInput?.addEventListener("change", () => {
      this.friendlyFire = !!ffInput.checked;
    });
    this.root.querySelector("#solo-start")?.addEventListener("click", () => this.start("solo"));
    this.root.querySelector("#create-room")?.addEventListener("click", () => this.createRoom());
    this.root.querySelector("#join-room")?.addEventListener("click", () => this.joinRoom());
    this.root.querySelector("#back-title")?.addEventListener("click", () => this.deps.sim.command({ type: "returnTitle" }));
  }

  private bindMobileControls() {
    this.root.addEventListener("pointerdown", (event) => {
      const target = event.target as HTMLElement;
      if (target.id === "fire-button") {
        this.deps.input.setFire(true);
        target.setPointerCapture(event.pointerId);
      }
    });
    this.root.addEventListener("pointerup", (event) => {
      const target = event.target as HTMLElement;
      if (target.id === "fire-button") this.deps.input.setFire(false);
    });
    this.root.addEventListener("pointercancel", () => this.deps.input.setFire(false));

    let activeStick: number | null = null;
    this.root.addEventListener("pointerdown", (event) => {
      const stick = this.root.querySelector<HTMLElement>("#stick");
      if (!(event.target as HTMLElement).closest("#stick") || !stick) return;
      activeStick = event.pointerId;
      stick.setPointerCapture(event.pointerId);
      this.updateStick(event, stick);
    });
    this.root.addEventListener("pointermove", (event) => {
      if (event.pointerId !== activeStick) return;
      const stick = this.root.querySelector<HTMLElement>("#stick");
      if (stick) this.updateStick(event, stick);
    });
    this.root.addEventListener("pointerup", (event) => {
      if (event.pointerId !== activeStick) return;
      activeStick = null;
      this.deps.input.setStick({ x: 0, y: 0 });
      const knob = this.root.querySelector<HTMLElement>("#stick-knob");
      if (knob) knob.style.transform = "translate(-50%, -50%)";
    });
  }

  private updateStick(event: PointerEvent, stick: HTMLElement) {
    const rect = stick.getBoundingClientRect();
    const dx = event.clientX - (rect.left + rect.width / 2);
    const dy = event.clientY - (rect.top + rect.height / 2);
    const max = rect.width * 0.34;
    const len = Math.hypot(dx, dy);
    const nx = len > max ? dx / len : dx / max;
    const ny = len > max ? dy / len : dy / max;
    this.deps.input.setStick({ x: nx, y: ny });
    const knob = this.root.querySelector<HTMLElement>("#stick-knob");
    if (knob) knob.style.transform = `translate(calc(-50% + ${nx * max}px), calc(-50% + ${ny * max}px))`;
  }

  private start(mode: "solo" | "online") {
    this.deps.onStart(mode, this.playerName, this.roomSettings());
  }

  private async createRoom() {
    const status = await this.deps.online.createRoom(this.roomSettings(), this.playerName);
    this.setOnlineStatus(status);
    if (status.enabled && status.roomCode) this.start("online");
  }

  private async joinRoom() {
    const status = await this.deps.online.joinRoom(this.roomCode, this.playerName);
    this.setOnlineStatus(status);
    if (status.enabled && status.roomCode) this.start("online");
  }

  private roomSettings(): RoomSettings {
    return { roomCode: this.roomCode || this.createRoomCode(), friendlyFire: this.friendlyFire, maxPlayers: MAX_PLAYERS };
  }

  private weaponChips() {
    const player = this.snapshot?.players[0];
    if (!player) return "";
    const counts = new Map<string, number>();
    for (const block of player.blocks) {
      if (block.isCore && block.weapon) counts.set(block.weapon, (counts.get(block.weapon) ?? 0) + 1);
    }
    return [...counts.entries()]
      .map(([weapon, count]) => `<span class="chip" style="--chip:${this.color(WEAPONS[weapon as keyof typeof WEAPONS].color)}">${WEAPONS[weapon as keyof typeof WEAPONS].label} x${count}</span>`)
      .join("");
  }

  private rankingRows() {
    const scores = this.snapshot?.highScores ?? this.deps.sim.highScores;
    if (!scores.length) return "<p>まだ記録なし</p>";
    return scores
      .map((score, index) => `<div class="rank"><span>${index + 1}. ${this.escape(score.name)}</span><strong>${score.score}</strong><small>W${score.wave} ${score.date}</small></div>`)
      .join("");
  }

  private createRoomCode() {
    return Math.random().toString(36).slice(2, 8).toUpperCase();
  }

  private color(value: number) {
    return `#${value.toString(16).padStart(6, "0")}`;
  }

  private escape(value: string) {
    return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[char] ?? char);
  }
}
