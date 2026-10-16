import Phaser from "phaser";
import "./style.css";

const COLS = 16;
const ROWS = 30;
const UI_ROWS = 2;
const PLAY_ROWS = ROWS - UI_ROWS;
const MIN_COL = 1;
const MAX_COL = 14;
const START_ROW = PLAY_ROWS - 1;
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyBWCR7BnMYOuf-_7MSfEzaAEqVqeKAMxNE",
  authDomain: "sggame-hub.firebaseapp.com",
  databaseURL: "https://sggame-hub-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "sggame-hub",
  storageBucket: "sggame-hub.firebasestorage.app",
  messagingSenderId: "960541786506",
  appId: "1:960541786506:web:4f8f2e0f6b1f2e0f6b1f2e"
};

type Mode = "single" | "multi";
type Screen = "title" | "multi" | "customize" | "gacha" | "parts" | "result" | "credits" | "game";
type Slot = "main" | "sub" | "engine" | "hull" | "bridge";
type Team = "player" | "enemy";
type Rarity = "N" | "R" | "SR" | "UR";

type Part = {
  id: string;
  slot: Slot;
  name: string;
  rarity: Rarity;
  color: string;
  desc: string;
  stat: Record<string, number | string>;
};

type Loadout = Record<Slot, string>;
type Owned = Record<Slot, string[]>;

type Bullet = {
  id: number;
  team: Team;
  owner: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  damage: number;
  color: string;
  life: number;
  kind: "dot" | "beam" | "missile" | "wave";
};

type Enemy = {
  id: number;
  type: "drone" | "charger" | "turret" | "boss";
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  hp: number;
  maxHp: number;
  color: string;
  cooldown: number;
  phase: number;
  line?: number;
  targetX: number;
  strafeCooldown: number;
};

type PlayerState = {
  id: string;
  name: string;
  color: string;
  col: number;
  row: number;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  dead: boolean;
  score: number;
  revive: number;
  loadout: Loadout;
  bullets: Bullet[];
  updatedAt: number;
};

const catalog: Record<Slot, Part[]> = {
  main: [
    { id: "pulse", slot: "main", name: "Pulse Needle", rarity: "N", color: "#23e7ff", desc: "停止中に軽く刻む単発主砲。", stat: { rate: 180, speed: 460, damage: 1, spread: 0 } },
    { id: "tri", slot: "main", name: "Tri Line", rarity: "R", color: "#42ff9e", desc: "停止中に3ラインへ薄く散らす主砲。", stat: { rate: 260, speed: 420, damage: 1, spread: 1 } },
    { id: "rail", slot: "main", name: "Rail Bit", rarity: "SR", color: "#ffd36a", desc: "停止中に撃つ高速貫通気味の主砲。", stat: { rate: 320, speed: 680, damage: 2, spread: 0 } },
    { id: "orbit", slot: "main", name: "Orbit Prism", rarity: "UR", color: "#b86cff", desc: "停止中に左右の小ビットが追従射撃する高性能主砲。", stat: { rate: 210, speed: 500, damage: 1, spread: 2 } }
  ],
  sub: [
    { id: "cannon", slot: "sub", name: "Still Cannon", rarity: "N", color: "#ecfbff", desc: "少し構えてから高威力弾を撃つ標準副砲。", stat: { rate: 720, speed: 560, damage: 4, pattern: "single", chargeDelay: 520 } },
    { id: "laser", slot: "sub", name: "Hold Laser", rarity: "R", color: "#ff4fd8", desc: "長めに固定してから細いレーザーを叩き込む。", stat: { rate: 920, speed: 760, damage: 6, pattern: "laser", chargeDelay: 760 } },
    { id: "fan", slot: "sub", name: "Arc Fan", rarity: "SR", color: "#42ff9e", desc: "中程度の構えから扇状の強攻撃を撃つ。", stat: { rate: 820, speed: 490, damage: 3, pattern: "fan", chargeDelay: 640 } },
    { id: "comet", slot: "sub", name: "Comet Hammer", rarity: "UR", color: "#ffd36a", desc: "長く構えて重い圧縮弾を放つボス削り向け副砲。", stat: { rate: 1100, speed: 360, damage: 9, pattern: "comet", chargeDelay: 980 } }
  ],
  engine: [
    { id: "e1", slot: "engine", name: "Aqua Engine I", rarity: "N", color: "#23e7ff", desc: "速度1。長い回避クールダウン。", stat: { speedLevel: 1, moveMs: 190, dodgeCooldown: 2300, dodgeRange: 1 } },
    { id: "e2", slot: "engine", name: "Mint Engine II", rarity: "R", color: "#42ff9e", desc: "速度2。扱いやすい機関。", stat: { speedLevel: 2, moveMs: 165, dodgeCooldown: 2000, dodgeRange: 1 } },
    { id: "e4", slot: "engine", name: "Photon Engine IV", rarity: "SR", color: "#ff4fd8", desc: "速度4。連続移動が鋭い。", stat: { speedLevel: 4, moveMs: 125, dodgeCooldown: 1650, dodgeRange: 2 } },
    { id: "e5", slot: "engine", name: "Zero Engine V", rarity: "UR", color: "#ffd36a", desc: "速度5。最短クールの回避機関。", stat: { speedLevel: 5, moveMs: 105, dodgeCooldown: 1350, dodgeRange: 2 } }
  ],
  hull: [
    { id: "h1", slot: "hull", name: "Glass Cube", rarity: "N", color: "#23e7ff", desc: "HP1。前方シールドを出せる軽量船体。", stat: { hp: 1, special: "shield", specialCooldown: 5200 } },
    { id: "h2", slot: "hull", name: "Twin Frame", rarity: "R", color: "#42ff9e", desc: "HP2。周囲を掃除するボムを使う。", stat: { hp: 2, special: "bomb", specialCooldown: 6800 } },
    { id: "h3", slot: "hull", name: "Phase Hull", rarity: "SR", color: "#b86cff", desc: "HP1。短時間だけ弾と敵をすり抜ける。", stat: { hp: 1, special: "phase", specialCooldown: 6200 } },
    { id: "h4", slot: "hull", name: "Aegis Core", rarity: "UR", color: "#ffd36a", desc: "HP3。復帰補助と広い盾を持つ。", stat: { hp: 3, special: "aegis", specialCooldown: 7200 } }
  ],
  bridge: [
    { id: "b1", slot: "bridge", name: "Scout Bridge", rarity: "N", color: "#ecfbff", desc: "索敵艦橋。通常射撃の間隔を少し短縮。", stat: { fireBonus: 0.92, ability: "scan" } },
    { id: "b2", slot: "bridge", name: "Revive Tower", rarity: "R", color: "#42ff9e", desc: "味方の復帰ゲージ上昇量を強化。", stat: { fireBonus: 1, ability: "revive" } },
    { id: "b3", slot: "bridge", name: "Drone Bridge", rarity: "SR", color: "#ff4fd8", desc: "停止時の副砲に小型追従弾を追加。", stat: { fireBonus: 1, ability: "drone" } },
    { id: "b4", slot: "bridge", name: "Chrono Bridge", rarity: "UR", color: "#ffd36a", desc: "特殊機能時に敵弾を遅くする。", stat: { fireBonus: 0.85, ability: "chrono" } }
  ]
};

const allParts = Object.values(catalog).flat();
const defaultLoadout: Loadout = { main: "pulse", sub: "cannon", engine: "e2", hull: "h1", bridge: "b1" };
const defaultOwned: Owned = {
  main: ["pulse"],
  sub: ["cannon"],
  engine: ["e1", "e2"],
  hull: ["h1"],
  bridge: ["b1"]
};

function part(slot: Slot, id: string): Part {
  return catalog[slot].find((p) => p.id === id) ?? catalog[slot][0];
}

function num(value: number | string | undefined, fallback = 0): number {
  return typeof value === "number" ? value : fallback;
}

function str(value: number | string | undefined, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function distance(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function statSpeed(value: number, scale = 3300): number {
  return value / scale;
}

function uid(): string {
  const saved = localStorage.getItem("ls_player_id");
  if (saved) return saved;
  const id = `p_${Math.random().toString(36).slice(2, 10)}`;
  localStorage.setItem("ls_player_id", id);
  return id;
}

class AudioSystem {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private loopTimer = 0;
  private enabled = false;

  unlock(): void {
    if (!this.ctx) {
      this.ctx = new AudioContext();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.18;
      this.master.connect(this.ctx.destination);
    }
    void this.ctx.resume();
    this.enabled = true;
  }

  update(delta: number): void {
    if (!this.enabled || !this.ctx) return;
    this.loopTimer -= delta;
    if (this.loopTimer <= 0) {
      this.loopTimer = 520;
      const n = this.ctx.currentTime;
      const notes = [110, 146.83, 164.81, 220, 293.66];
      this.tone(notes[Math.floor(Math.random() * notes.length)], 0.08, "sawtooth", 0.025, n);
    }
  }

  shoot(): void {
    this.tone(760, 0.035, "square", 0.035);
  }

  hit(): void {
    this.tone(150, 0.07, "sawtooth", 0.06);
  }

  score(): void {
    this.tone(620, 0.08, "triangle", 0.05);
    setTimeout(() => this.tone(930, 0.08, "triangle", 0.04), 70);
  }

  special(): void {
    this.tone(240, 0.16, "sine", 0.08);
    setTimeout(() => this.tone(480, 0.16, "sine", 0.06), 80);
  }

  private tone(freq: number, duration: number, type: OscillatorType, gain: number, start?: number): void {
    if (!this.enabled || !this.ctx || !this.master) return;
    const t = start ?? this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    osc.connect(g);
    g.connect(this.master);
    osc.start(t);
    osc.stop(t + duration + 0.02);
  }
}

class InputController {
  dir = { x: 0, y: 0 };
  private pointerDown = false;
  private start = { x: 0, y: 0, t: 0 };
  private lastTap = 0;
  private sim: GameSim;

  constructor(sim: GameSim) {
    this.sim = sim;
    window.addEventListener("pointerdown", (e) => this.down(e));
    window.addEventListener("pointermove", (e) => this.move(e));
    window.addEventListener("pointerup", (e) => this.up(e));
    window.addEventListener("keydown", (e) => this.key(e, true));
    window.addEventListener("keyup", (e) => this.key(e, false));
  }

  private down(e: PointerEvent): void {
    if (!this.sim.inGame) return;
    this.pointerDown = true;
    this.start = { x: e.clientX, y: e.clientY, t: performance.now() };
    const now = performance.now();
    if (now - this.lastTap < 270) this.sim.special();
    this.lastTap = now;
  }

  private move(e: PointerEvent): void {
    if (!this.pointerDown || !this.sim.inGame) return;
    const dx = e.clientX - this.start.x;
    const dy = e.clientY - this.start.y;
    const adx = Math.abs(dx);
    const ady = Math.abs(dy);
    if (Math.max(adx, ady) < 18) {
      this.dir = { x: 0, y: 0 };
      return;
    }
    this.dir = adx > ady ? { x: Math.sign(dx), y: 0 } : { x: 0, y: Math.sign(dy) };
  }

  private up(e: PointerEvent): void {
    if (!this.pointerDown) return;
    this.pointerDown = false;
    const dx = e.clientX - this.start.x;
    const dy = e.clientY - this.start.y;
    const dt = performance.now() - this.start.t;
    const adx = Math.abs(dx);
    const ady = Math.abs(dy);
    if (this.sim.inGame && Math.max(adx, ady) > 84 && dt < 460) {
      this.sim.dodge(adx > ady ? Math.sign(dx) : 0, ady >= adx ? Math.sign(dy) : 0);
    }
    this.dir = { x: 0, y: 0 };
  }

  private key(e: KeyboardEvent, on: boolean): void {
    if (!this.sim.inGame) return;
    const value = on ? 1 : 0;
    if (e.key === "ArrowLeft" || e.key.toLowerCase() === "a") this.dir.x = -value;
    if (e.key === "ArrowRight" || e.key.toLowerCase() === "d") this.dir.x = value;
    if (e.key === "ArrowUp" || e.key.toLowerCase() === "w") this.dir.y = -value;
    if (e.key === "ArrowDown" || e.key.toLowerCase() === "s") this.dir.y = value;
    if (on && (e.key === " " || e.key.toLowerCase() === "x")) this.sim.special();
    if (on && e.key.toLowerCase() === "z") this.sim.dodge(this.dir.x || 0, this.dir.y || -1);
  }
}

class FirebaseRoom {
  status = "offline";
  playerId = uid();
  roomId = "";
  private db: any = null;
  private fb: any = null;
  private remote: Record<string, PlayerState> = {};
  private sendAt = 0;
  private unsub: Array<() => void> = [];

  async configure(): Promise<string> {
    try {
      const load = new Function("url", "return import(url)") as (url: string) => Promise<any>;
      const appMod: any = await load("https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js");
      const dbMod: any = await load("https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js");
      const app = appMod.initializeApp(FIREBASE_CONFIG);
      this.db = dbMod.getDatabase(app);
      this.fb = dbMod;
      this.status = "online";
    } catch (error) {
      console.warn("Firebase unavailable", error);
      this.status = "offline";
    }
    return this.status;
  }

  async join(roomId: string, self: PlayerState): Promise<{ ok: boolean; message: string }> {
    if (!this.fb || !this.db) await this.configure();
    if (!this.fb || !this.db) return { ok: false, message: "Firebase に接続できませんでした" };
    const room = roomId.trim().toLowerCase() || "public";
    this.roomId = room.replace(/[^a-z0-9_-]/g, "").slice(0, 18) || "public";
    const roomRef = this.fb.ref(this.db, `line_shooting_rooms/${this.roomId}`);
    const snap = await this.fb.get(roomRef);
    const data = snap.val();
    const count = data?.players ? Object.keys(data.players).length : 0;
    if (count >= 6 && !data.players[this.playerId]) return { ok: false, message: "このルームは満員です" };
    await this.fb.update(roomRef, { updatedAt: Date.now(), maxPlayers: 6 });
    const playerRef = this.fb.ref(this.db, `line_shooting_rooms/${this.roomId}/players/${this.playerId}`);
    await this.fb.set(playerRef, self);
    this.fb.onDisconnect(playerRef).remove();
    const off = this.fb.onValue(this.fb.ref(this.db, `line_shooting_rooms/${this.roomId}/players`), (s: any) => {
      const players = s.val() ?? {};
      this.remote = {};
      for (const [id, value] of Object.entries(players)) {
        if (id !== this.playerId) this.remote[id] = value as PlayerState;
      }
    });
    this.unsub.push(() => this.fb.off(this.fb.ref(this.db, `line_shooting_rooms/${this.roomId}/players`), "value", off));
    return { ok: true, message: `ROOM ${this.roomId}` };
  }

  sync(self: PlayerState): Record<string, PlayerState> {
    if (this.fb && this.db && this.roomId && performance.now() - this.sendAt > 85) {
      this.sendAt = performance.now();
      const compact = { ...self, bullets: self.bullets.slice(-8), updatedAt: Date.now() };
      void this.fb.set(this.fb.ref(this.db, `line_shooting_rooms/${this.roomId}/players/${this.playerId}`), compact);
      void this.fb.set(this.fb.ref(this.db, `line_shooting_rooms/${this.roomId}/updatedAt`), Date.now());
    }
    return this.remote;
  }

  leave(): void {
    for (const off of this.unsub) off();
    this.unsub = [];
    if (this.fb && this.db && this.roomId) {
      void this.fb.remove(this.fb.ref(this.db, `line_shooting_rooms/${this.roomId}/players/${this.playerId}`));
    }
    this.remote = {};
    this.roomId = "";
  }
}

class GameSim {
  inGame = false;
  mode: Mode = "single";
  playerId = uid();
  playerName = "PLAYER";
  color = "#23e7ff";
  loadout: Loadout = loadJson("ls_loadout", defaultLoadout);
  owned: Owned = loadJson("ls_owned", defaultOwned);
  tickets = Number(localStorage.getItem("ls_tickets") ?? "0");
  best = Number(localStorage.getItem("ls_best") ?? "0");
  score = 0;
  lastRunTickets = 0;
  hp = 1;
  maxHp = 1;
  dead = false;
  revive = 0;
  col = 8;
  row = START_ROW;
  x = 0;
  y = 0;
  moving = false;
  shield = 0;
  phase = 0;
  specialCooldown = 0;
  dodgeCooldown = 0;
  enemies: Enemy[] = [];
  bullets: Bullet[] = [];
  remote: Record<string, PlayerState> = {};
  gameOver = false;
  message = "";
  mainKick = 0;
  subKick = 0;
  subCharge = 0;
  private idCounter = 1;
  private fireTimer = 0;
  private subTimer = 0;
  private moveTimer = 0;
  private spawnTimer = 0;
  private bossActive = false;
  private fromX = 0;
  private fromY = 0;
  private toX = 0;
  private toY = 0;
  private moveElapsed = 0;
  private moveDuration = 150;
  private stoppedFor = 0;
  private runTime = 0;
  private audio: AudioSystem;
  private input: InputController | null = null;
  private onEnd: (score: number, tickets: number) => void;

  constructor(audio: AudioSystem, onEnd: (score: number, tickets: number) => void) {
    this.audio = audio;
    this.onEnd = onEnd;
    this.applyParts();
  }

  attachInput(input: InputController): void {
    this.input = input;
  }

  start(mode: Mode, name: string): void {
    this.mode = mode;
    this.playerName = name || "PLAYER";
    this.score = 0;
    this.lastRunTickets = 0;
    this.col = 8;
    this.row = START_ROW;
    this.x = this.col + 0.5;
    this.y = this.row + 0.5;
    this.toX = this.x;
    this.toY = this.y;
    this.hp = this.maxHp;
    this.dead = false;
    this.revive = 0;
    this.inGame = true;
    this.gameOver = false;
    this.enemies = [];
    this.bullets = [];
    this.remote = {};
    this.bossActive = false;
    this.spawnTimer = 300;
    this.fireTimer = 160;
    this.subTimer = 0;
    this.specialCooldown = 0;
    this.dodgeCooldown = 0;
    this.runTime = 0;
    this.message = "";
    this.mainKick = 0;
    this.subKick = 0;
    this.subCharge = 0;
    this.audio.unlock();
  }

  stop(): void {
    this.inGame = false;
    this.enemies = [];
    this.bullets = [];
  }

  applyParts(): void {
    const hull = part("hull", this.loadout.hull);
    this.maxHp = num(hull.stat.hp, 1);
    this.hp = Math.min(this.hp || this.maxHp, this.maxHp);
    this.color = hull.color === "#ffd36a" ? "#ffd36a" : part("engine", this.loadout.engine).color;
  }

  setRemote(remote: Record<string, PlayerState>): void {
    const now = Date.now();
    this.remote = Object.fromEntries(Object.entries(remote).filter(([, p]) => now - (p.updatedAt || 0) < 4500));
  }

  update(delta: number): void {
    if (!this.inGame) return;
    this.runTime += delta;
    this.mainKick = Math.max(0, this.mainKick - delta / 110);
    this.subKick = Math.max(0, this.subKick - delta / 170);
    this.audio.update(delta);
    this.specialCooldown = Math.max(0, this.specialCooldown - delta);
    this.dodgeCooldown = Math.max(0, this.dodgeCooldown - delta);
    this.shield = Math.max(0, this.shield - delta);
    this.phase = Math.max(0, this.phase - delta);
    if (this.dead) {
      this.revive = Math.max(0, this.revive - delta * 0.001);
      if (this.revive >= 100) {
        this.dead = false;
        this.hp = Math.max(1, Math.floor(this.maxHp / 2));
        this.revive = 0;
        this.message = "REVIVED";
      }
    }
    this.updateMovement(delta);
    this.updateShooting(delta);
    this.updateEnemies(delta);
    this.updateBullets(delta);
    this.handleCollisions();
    this.cleanup();
    this.checkGameOver();
  }

  special(): void {
    if (!this.inGame || this.dead || this.specialCooldown > 0) return;
    const hull = part("hull", this.loadout.hull);
    const bridge = part("bridge", this.loadout.bridge);
    const type = str(hull.stat.special, "shield");
    this.specialCooldown = num(hull.stat.specialCooldown, 6000);
    this.audio.special();
    if (type === "shield") this.shield = 2200;
    if (type === "phase") this.phase = 1700;
    if (type === "aegis") {
      this.shield = 2800;
      this.revive = Math.min(100, this.revive + 18);
    }
    if (type === "bomb") {
      this.bullets = this.bullets.filter((b) => b.team !== "enemy" || distance(this, b) > 3.2);
      for (const enemy of this.enemies) {
        if (distance(this, enemy) < 4.6) enemy.hp -= 6;
      }
    }
    if (str(bridge.stat.ability) === "chrono") {
      for (const b of this.bullets) if (b.team === "enemy") {
        b.vx *= 0.38;
        b.vy *= 0.38;
      }
    }
  }

  dodge(dx: number, dy: number): void {
    if (!this.inGame || this.dead || this.dodgeCooldown > 0) return;
    const engine = part("engine", this.loadout.engine);
    const range = num(engine.stat.dodgeRange, 1);
    if (dx === 0 && dy === 0) dy = -1;
    this.col = clamp(this.col + dx * range, MIN_COL, MAX_COL);
    this.row = clamp(this.row + dy * range, 0, START_ROW);
    this.x = this.col + 0.5;
    this.y = this.row + 0.5;
    this.toX = this.x;
    this.toY = this.y;
    this.moving = false;
    this.phase = Math.max(this.phase, 360);
    this.dodgeCooldown = num(engine.stat.dodgeCooldown, 1900);
    this.audio.special();
  }

  snapshot(): PlayerState {
    return {
      id: this.playerId,
      name: this.playerName,
      color: this.color,
      col: this.col,
      row: this.row,
      x: this.x,
      y: this.y,
      hp: this.hp,
      maxHp: this.maxHp,
      dead: this.dead,
      score: this.score,
      revive: this.revive,
      loadout: this.loadout,
      bullets: this.bullets.filter((b) => b.team === "player" && b.owner === this.playerId).slice(-12),
      updatedAt: Date.now()
    };
  }

  private updateMovement(delta: number): void {
    const engine = part("engine", this.loadout.engine);
    this.moveDuration = num(engine.stat.moveMs, 160);
    const dir = this.input?.dir ?? { x: 0, y: 0 };
    if (this.moving) {
      this.moveElapsed += delta;
      const t = clamp(this.moveElapsed / this.moveDuration, 0, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      this.x = this.fromX + (this.toX - this.fromX) * eased;
      this.y = this.fromY + (this.toY - this.fromY) * eased;
      if (t >= 1) {
        this.x = this.toX;
        this.y = this.toY;
        this.moving = false;
      }
      this.stoppedFor = 0;
      this.subCharge = 0;
      return;
    }
    this.moveTimer -= delta;
    if (dir.x !== 0 || dir.y !== 0) {
      this.stoppedFor = 0;
      this.subTimer = 0;
      this.subCharge = 0;
      if (!this.dead && this.moveTimer <= 0) {
        this.move(dir.x, dir.y);
        this.moveTimer = this.moveDuration + 24;
      }
      return;
    }
    this.stoppedFor += delta;
  }

  private move(dx: number, dy: number): void {
    let nextCol = clamp(this.col + dx, MIN_COL, MAX_COL);
    let nextRow = this.row + dy;
    if (nextRow < 0) {
      nextRow = START_ROW;
      this.score += 1;
      if (this.score > this.best) {
        this.best = this.score;
        localStorage.setItem("ls_best", String(this.best));
      }
      if (this.score % 5 === 0) {
        this.tickets += 1;
        this.lastRunTickets += 1;
        localStorage.setItem("ls_tickets", String(this.tickets));
        this.spawnBoss();
      }
      this.audio.score();
    }
    nextRow = clamp(nextRow, 0, START_ROW);
    this.col = nextCol;
    this.row = nextRow;
    this.stoppedFor = 0;
    this.subTimer = 0;
    this.subCharge = 0;
    this.fromX = this.x;
    this.fromY = this.y;
    this.toX = nextCol + 0.5;
    this.toY = nextRow + 0.5;
    this.moveElapsed = 0;
    this.moving = true;
  }

  private updateShooting(delta: number): void {
    if (this.dead) {
      this.subCharge = 0;
      return;
    }
    if (this.moving || this.stoppedFor < 80) {
      this.subCharge = 0;
      return;
    }
    const main = part("main", this.loadout.main);
    const sub = part("sub", this.loadout.sub);
    const bridge = part("bridge", this.loadout.bridge);
    const fireBonus = num(bridge.stat.fireBonus, 1);
    const chargeDelay = num(sub.stat.chargeDelay, 600);
    this.subCharge = clamp(this.stoppedFor / chargeDelay, 0, 1);
    this.fireTimer -= delta;
    if (this.fireTimer <= 0) {
      this.fireTimer = num(main.stat.rate, 220) * fireBonus;
      const spread = num(main.stat.spread, 0);
      const speed = statSpeed(num(main.stat.speed, 460));
      this.addPlayerBullet(0, -speed, num(main.stat.damage, 1), main.color, "dot");
      if (spread >= 1) {
        this.addPlayerBullet(-0.035, -speed * 0.94, 1, main.color, "dot");
        this.addPlayerBullet(0.035, -speed * 0.94, 1, main.color, "dot");
      }
      if (spread >= 2) {
        this.addPlayerBullet(-0.055, -speed, 1, main.color, "dot", -0.28);
        this.addPlayerBullet(0.055, -speed, 1, main.color, "dot", 0.28);
      }
      this.mainKick = 1;
      this.audio.shoot();
    }
    this.subTimer -= delta;
    if (this.stoppedFor < chargeDelay) {
      this.subTimer = 0;
      return;
    }
    if (this.subTimer <= 0) {
      this.subTimer = num(sub.stat.rate, 800);
      const pattern = str(sub.stat.pattern, "single");
      const speed = statSpeed(num(sub.stat.speed, 500), 2900);
      if (pattern === "fan") {
        for (const vx of [-0.075, -0.04, 0, 0.04, 0.075]) this.addPlayerBullet(vx, -speed, num(sub.stat.damage, 3), sub.color, "wave");
      } else if (pattern === "laser") {
        this.addPlayerBullet(0, -statSpeed(num(sub.stat.speed, 700), 2600), num(sub.stat.damage, 6), sub.color, "beam");
      } else {
        this.addPlayerBullet(0, -speed, num(sub.stat.damage, 4), sub.color, pattern === "comet" ? "missile" : "dot");
      }
      if (str(bridge.stat.ability) === "drone") {
        this.addPlayerBullet(-0.035, -0.16, 1, bridge.color, "dot");
        this.addPlayerBullet(0.035, -0.16, 1, bridge.color, "dot");
      }
      this.subKick = 1;
      this.audio.special();
    }
  }

  private addPlayerBullet(vx: number, vy: number, damage: number, color: string, kind: Bullet["kind"], offset = 0): void {
    this.bullets.push({
      id: this.idCounter++,
      team: "player",
      owner: this.playerId,
      x: this.x + offset,
      y: this.y - 0.25,
      vx,
      vy,
      r: kind === "beam" ? 0.12 : kind === "missile" ? 0.24 : 0.16,
      damage,
      color,
      life: kind === "beam" ? 1700 : 3600,
      kind
    });
  }

  private updateEnemies(delta: number): void {
    this.spawnTimer -= delta;
    const spawnBase = Math.max(280, 980 - this.score * 18);
    if (this.spawnTimer <= 0) {
      this.spawnTimer = spawnBase + Math.random() * 380;
      this.spawnEnemy();
    }
    for (const enemy of this.enemies) {
      if (enemy.type === "boss") {
        enemy.phase += delta;
        enemy.targetX += Math.sin(enemy.phase * 0.0015) * 0.003;
        enemy.x += (clamp(enemy.targetX, MIN_COL + 0.5, MAX_COL + 0.5) - enemy.x) * 0.035;
        enemy.y += (3.6 - enemy.y) * 0.026;
        enemy.cooldown -= delta;
        if (enemy.cooldown <= 0) {
          enemy.cooldown = Math.max(560, 1220 - this.score * 8);
          this.bossAttack(enemy);
        }
      } else {
        enemy.strafeCooldown -= delta;
        if (enemy.strafeCooldown <= 0 && enemy.type !== "drone" && Math.random() < 0.5) {
          const dir = Math.random() < 0.5 ? -1 : 1;
          enemy.targetX = clamp(Math.round(enemy.targetX - 0.5) + dir + 0.5, MIN_COL + 0.5, MAX_COL + 0.5);
          enemy.strafeCooldown = 1200 + Math.random() * 1600;
        }
        enemy.x += (enemy.targetX - enemy.x) * (enemy.type === "charger" ? 0.045 : 0.026);
        enemy.y += enemy.vy * delta / 16.67;
        enemy.cooldown -= delta;
        if (enemy.type === "turret") {
          enemy.y += (3.1 - enemy.y) * 0.02;
        }
        if (enemy.cooldown <= 0) {
          enemy.cooldown = enemy.type === "turret" ? 1050 : 1650;
          this.enemyShot(enemy);
        }
      }
    }
  }

  private spawnEnemy(): void {
    if (this.enemies.length > 42) return;
    const line = Phaser.Math.Between(MIN_COL, MAX_COL);
    const roll = Math.random();
    const type: Enemy["type"] = roll > 0.88 ? "turret" : roll > 0.62 ? "charger" : "drone";
    const hp = type === "turret" ? 4 : type === "charger" ? 2 : 1;
    this.enemies.push({
      id: this.idCounter++,
      type,
      x: line + 0.5,
      y: type === "turret" ? 0.65 : 0.45,
      vx: 0,
      vy: type === "turret" ? 0.014 : type === "charger" ? 0.052 : 0.038 + this.score * 0.0008,
      r: type === "turret" ? 0.42 : 0.32,
      hp,
      maxHp: hp,
      color: type === "turret" ? "#ff4a26" : type === "charger" ? "#ff3158" : "#ff174d",
      cooldown: 900 + Math.random() * 600,
      phase: Math.random() * 999,
      line,
      targetX: line + 0.5,
      strafeCooldown: 900 + Math.random() * 1800
    });
  }

  private spawnBoss(): void {
    if (this.bossActive) return;
    const hp = 22 + this.score * 4;
    this.bossActive = true;
    this.message = `BOSS LINE ${this.score}`;
    this.enemies.push({
      id: this.idCounter++,
      type: "boss",
      x: 8,
      y: 1.05,
      vx: 0,
      vy: 0,
      r: 1.1,
      hp,
      maxHp: hp,
      color: "#ff3158",
      cooldown: 900,
      phase: 0,
      targetX: 8,
      strafeCooldown: 0
    });
  }

  private enemyShot(enemy: Enemy): void {
    const speed = enemy.type === "turret" ? 0.073 : 0.058;
    this.bullets.push({
      id: this.idCounter++,
      team: "enemy",
      owner: "enemy",
      x: enemy.x,
      y: enemy.y + 0.3,
      vx: 0,
      vy: speed,
      r: 0.18,
      damage: 1,
      color: "#ff3158",
      life: 4200,
      kind: "dot"
    });
  }

  private bossAttack(enemy: Enemy): void {
    if (this.score >= 20 && Math.floor((enemy.phase / 1800) % 3) === 0) {
      for (let c = MIN_COL; c <= MAX_COL; c += 2) {
        this.bullets.push({ id: this.idCounter++, team: "enemy", owner: "boss", x: c + 0.5, y: enemy.y + 0.8, vx: 0, vy: 0.075, r: 0.16, damage: 1, color: "#ff3158", life: 5600, kind: "wave" });
      }
    } else if (this.score >= 12 && Math.floor((enemy.phase / 1600) % 2) === 0) {
      for (const vx of [-0.042, -0.02, 0, 0.02, 0.042]) {
        this.bullets.push({ id: this.idCounter++, team: "enemy", owner: "boss", x: enemy.x, y: enemy.y + 0.75, vx, vy: 0.068, r: 0.15, damage: 1, color: "#ff5b29", life: 4200, kind: "dot" });
      }
    } else {
      this.enemyShot(enemy);
      if (this.score >= 10) {
        this.bullets.push({ id: this.idCounter++, team: "enemy", owner: "boss", x: clamp(enemy.x - 1.2, MIN_COL + 0.5, MAX_COL + 0.5), y: enemy.y + 0.8, vx: 0, vy: 0.065, r: 0.16, damage: 1, color: "#ff3158", life: 4600, kind: "dot" });
        this.bullets.push({ id: this.idCounter++, team: "enemy", owner: "boss", x: clamp(enemy.x + 1.2, MIN_COL + 0.5, MAX_COL + 0.5), y: enemy.y + 0.8, vx: 0, vy: 0.065, r: 0.16, damage: 1, color: "#ff3158", life: 4600, kind: "dot" });
      }
    }
  }

  private updateBullets(delta: number): void {
    for (const b of this.bullets) {
      b.x += b.vx * delta / 16.67;
      b.y += b.vy * delta / 16.67;
      b.life -= delta;
    }
  }

  private handleCollisions(): void {
    for (const b of this.bullets) {
      if (b.life <= 0) continue;
      if (b.team === "player") {
        for (const enemy of this.enemies) {
          if (enemy.hp > 0 && distance(b, enemy) < b.r + enemy.r) {
            enemy.hp -= b.damage;
            b.life = b.kind === "beam" ? b.life - 180 : 0;
            if (enemy.hp <= 0) {
              if (enemy.type === "boss") {
                this.bossActive = false;
                this.message = "BOSS BROKEN";
              }
              this.audio.hit();
            }
            break;
          }
        }
        if (this.dead && distance(b, this) < 0.55 && b.owner !== this.playerId) {
          this.revive += str(part("bridge", this.loadout.bridge).stat.ability) === "revive" ? 7 : 4;
          b.life = 0;
        }
      } else {
        const shieldHit = this.shield > 0 && b.y < this.y && Math.abs(b.x - this.x) < 0.95 && b.y > this.y - 1.2;
        if (shieldHit) {
          b.life = 0;
          continue;
        }
        if (!this.dead && this.phase <= 0 && distance(b, this) < b.r + 0.32) {
          b.life = 0;
          this.damage();
        }
        for (const remote of Object.values(this.remote)) {
          if (!remote.dead && distance(b, remote) < b.r + 0.32) {
            b.life = 0;
            break;
          }
        }
      }
    }
    for (const enemy of this.enemies) {
      if (enemy.hp <= 0) continue;
      if (!this.dead && this.phase <= 0 && distance(enemy, this) < enemy.r + 0.36) {
        enemy.hp = 0;
        this.damage();
      }
    }
  }

  private damage(): void {
    if (this.dead) return;
    this.hp -= 1;
    this.audio.hit();
    if (this.hp <= 0) {
      this.dead = true;
      this.revive = 0;
      this.message = "DOWN - TEAM FIRE TO REVIVE";
    }
  }

  private cleanup(): void {
    this.enemies = this.enemies.filter((e) => e.hp > 0 && e.y < PLAY_ROWS + 2 && e.x > -2 && e.x < COLS + 2);
    this.bullets = this.bullets.filter((b) => b.life > 0 && b.y > -2 && b.y < ROWS + 2 && b.x > -2 && b.x < COLS + 2);
    if (this.bullets.length > 180) this.bullets.splice(0, this.bullets.length - 180);
    if (!this.enemies.some((e) => e.type === "boss")) this.bossActive = false;
  }

  private checkGameOver(): void {
    if (!this.dead) return;
    const aliveRemote = Object.values(this.remote).some((p) => !p.dead);
    if (this.mode === "single" || !aliveRemote) {
      this.gameOver = true;
      this.inGame = false;
      this.onEnd(this.score, this.lastRunTickets);
    }
  }

  rollGacha(): Part | null {
    if (this.tickets <= 0) return null;
    this.tickets -= 1;
    const r = Math.random();
    const rarity: Rarity = r > 0.965 ? "UR" : r > 0.82 ? "SR" : r > 0.45 ? "R" : "N";
    const pool = allParts.filter((p) => p.rarity === rarity);
    const item = pool[Math.floor(Math.random() * pool.length)];
    const owned = this.owned[item.slot] ?? [];
    if (!owned.includes(item.id)) owned.push(item.id);
    else this.tickets += item.rarity === "UR" ? 2 : 1;
    this.owned[item.slot] = owned;
    this.save();
    return item;
  }

  equip(slot: Slot, id: string): void {
    if (!this.owned[slot]?.includes(id)) return;
    this.loadout[slot] = id;
    this.applyParts();
    this.save();
  }

  save(): void {
    localStorage.setItem("ls_loadout", JSON.stringify(this.loadout));
    localStorage.setItem("ls_owned", JSON.stringify(this.owned));
    localStorage.setItem("ls_tickets", String(this.tickets));
    localStorage.setItem("ls_best", String(this.best));
  }
}

function loadJson<T>(key: string, fallback: T): T {
  try {
    return JSON.parse(localStorage.getItem(key) || "") as T;
  } catch {
    return structuredClone(fallback);
  }
}

class PlayScene extends Phaser.Scene {
  private g!: Phaser.GameObjects.Graphics;
  private sim: GameSim;
  private stage = { x: 0, y: 0, w: 360, h: 640, cw: 22.5, ch: 21.33 };

  constructor(sim: GameSim) {
    super("play");
    this.sim = sim;
  }

  create(): void {
    this.g = this.add.graphics();
  }

  update(_: number, delta: number): void {
    this.sim.update(Math.min(delta, 33));
    this.draw();
  }

  private calc(): void {
    const w = this.scale.width;
    const h = this.scale.height;
    const target = 9 / 16;
    let sw = w;
    let sh = w / target;
    if (sh > h) {
      sh = h;
      sw = h * target;
    }
    this.stage = { x: (w - sw) / 2, y: (h - sh) / 2, w: sw, h: sh, cw: sw / COLS, ch: sh / ROWS };
  }

  private px(x: number): number {
    return this.stage.x + x * this.stage.cw;
  }

  private py(y: number): number {
    return this.stage.y + y * this.stage.ch;
  }

  private draw(): void {
    this.calc();
    const g = this.g;
    g.clear();
    g.fillStyle(0x02040a, 1);
    g.fillRect(0, 0, this.scale.width, this.scale.height);
    g.fillStyle(0x06101f, 1);
    g.fillRect(this.stage.x, this.stage.y, this.stage.w, this.stage.h);
    this.drawGrid();
    this.drawDepth();
    for (const b of this.sim.bullets) this.drawBullet(b);
    for (const e of this.sim.enemies) this.drawEnemy(e);
    for (const remote of Object.values(this.sim.remote)) this.drawShip(remote.x, remote.y, remote.loadout, remote.color, remote.dead ? 0.16 : 0.34, remote.revive, 0, 0, true);
    this.drawShip(this.sim.x, this.sim.y, this.sim.loadout, this.sim.color, this.sim.dead ? 0.28 : 1, this.sim.revive, this.sim.mainKick, Math.max(this.sim.subKick, this.sim.subCharge * 0.45), false);
    if (this.sim.shield > 0) this.drawShield(this.sim.x, this.sim.y, part("hull", this.sim.loadout.hull).color, this.sim.shield / 2200);
    this.drawUiRows();
  }

  private drawGrid(): void {
    const g = this.g;
    g.fillStyle(0x23e7ff, 0.025);
    g.fillRect(this.px(MIN_COL), this.py(0), this.stage.cw * (MAX_COL - MIN_COL + 1), this.stage.ch * PLAY_ROWS);
    this.glowRect(this.px(MIN_COL), this.py(0), this.stage.cw * (MAX_COL - MIN_COL + 1), this.stage.ch * PLAY_ROWS, 0x23e7ff, 0.32, 3);
    this.glowRect(this.px(0.08), this.py(0.25), this.stage.cw * 0.18, this.stage.ch * (PLAY_ROWS - 0.5), 0xff4fd8, 0.68, 4);
    this.glowRect(this.px(15.74), this.py(0.25), this.stage.cw * 0.18, this.stage.ch * (PLAY_ROWS - 0.5), 0x42ff9e, 0.62, 4);
    for (let c = 0; c <= COLS; c++) {
      const bright = c === MIN_COL || c === MAX_COL + 1 ? 0.42 : 0.16;
      g.lineStyle(1, 0x23e7ff, bright);
      g.lineBetween(this.px(c), this.py(0), this.px(c), this.py(ROWS));
    }
    for (let r = 0; r <= ROWS; r++) {
      g.lineStyle(1, 0x23e7ff, r >= PLAY_ROWS ? 0.24 : 0.035);
      g.lineBetween(this.px(0), this.py(r), this.px(COLS), this.py(r));
    }
    g.lineStyle(2, 0xff4fd8, 0.28);
    g.strokeRect(this.px(MIN_COL), this.py(0), this.stage.cw * (MAX_COL - MIN_COL + 1), this.stage.ch * PLAY_ROWS);
  }

  private drawDepth(): void {
    const g = this.g;
    for (let i = 0; i < 8; i++) {
      g.lineStyle(1, 0x42ff9e, 0.045 + i * 0.012);
      const y = this.py(i * 3.5);
      g.lineBetween(this.px(1), y, this.px(15), y);
    }
    for (let i = 0; i < 14; i++) {
      const y = this.py((i * 2.1 + performance.now() * 0.0008) % PLAY_ROWS);
      g.fillStyle(i % 2 === 0 ? 0x23e7ff : 0xff4fd8, 0.025);
      g.fillRect(this.px(1), y, this.stage.cw * 14, 1);
    }
  }

  private drawUiRows(): void {
    const g = this.g;
    g.fillStyle(0x02040a, 0.5);
    g.fillRect(this.px(0), this.py(PLAY_ROWS), this.stage.w, this.stage.ch * UI_ROWS);
    g.lineStyle(1, 0x23e7ff, 0.3);
    g.strokeRect(this.px(0), this.py(PLAY_ROWS), this.stage.w, this.stage.ch * UI_ROWS);
  }

  private drawShip(x: number, y: number, loadout: Loadout, color: string, alpha: number, revive: number, mainKick: number, subKick: number, remote: boolean): void {
    const g = this.g;
    const cx = this.px(x);
    const cy = this.py(y);
    const s = Math.min(this.stage.cw, this.stage.ch) * 0.68;
    const hull = part("hull", loadout.hull);
    const main = part("main", loadout.main);
    const sub = part("sub", loadout.sub);
    const engine = part("engine", loadout.engine);
    const bridge = part("bridge", loadout.bridge);
    const colors = [hull.color, main.color, sub.color, engine.color, bridge.color].map((c) => Phaser.Display.Color.HexStringToColor(c).color);
    const pulse = remote ? 0.5 : 0.8 + Math.sin(performance.now() * 0.006) * 0.12;
    this.glowCircle(cx, cy, s * 0.92, colors[0], alpha * pulse, remote ? 2 : 4);
    this.glowRect(cx - s * 0.48, cy - s * 0.4, s * 0.96, s * 0.9, colors[0], alpha * 0.46, remote ? 1 : 3);
    g.lineStyle(2, colors[0], alpha);
    g.fillStyle(colors[0], alpha * 0.28);
    g.fillRect(cx - s * 0.42, cy - s * 0.34, s * 0.84, s * 0.78);
    g.strokeRect(cx - s * 0.42, cy - s * 0.34, s * 0.84, s * 0.78);
    const mainY = cy - s * (0.72 + mainKick * 0.18);
    const subSpread = subKick * s * 0.16;
    g.fillStyle(colors[1], alpha);
    this.glowRect(cx - s * 0.11, mainY, s * 0.22, s * 0.46, colors[1], alpha * (0.45 + mainKick * 0.45), remote ? 1 : 3);
    g.fillRect(cx - s * 0.09, mainY, s * 0.18, s * 0.44);
    g.fillStyle(colors[2], alpha * 0.92);
    this.glowRect(cx - s * 0.64 - subSpread, cy - s * 0.18, s * 0.22, s * 0.5, colors[2], alpha * (0.36 + subKick * 0.5), remote ? 1 : 3);
    this.glowRect(cx + s * 0.42 + subSpread, cy - s * 0.18, s * 0.22, s * 0.5, colors[2], alpha * (0.36 + subKick * 0.5), remote ? 1 : 3);
    g.fillRect(cx - s * 0.64 - subSpread, cy - s * 0.18, s * 0.22, s * 0.5);
    g.fillRect(cx + s * 0.42 + subSpread, cy - s * 0.18, s * 0.22, s * 0.5);
    g.fillStyle(colors[3], alpha * 0.9);
    g.fillRect(cx - s * 0.34, cy + s * 0.44, s * 0.22, s * 0.28);
    g.fillRect(cx + s * 0.12, cy + s * 0.44, s * 0.22, s * 0.28);
    g.fillStyle(colors[3], alpha * (remote ? 0.24 : 0.42));
    g.fillTriangle(cx - s * 0.23, cy + s * 0.78, cx - s * 0.34, cy + s * (0.48 + mainKick * 0.16), cx - s * 0.12, cy + s * (0.48 + mainKick * 0.16));
    g.fillTriangle(cx + s * 0.23, cy + s * 0.78, cx + s * 0.12, cy + s * (0.48 + mainKick * 0.16), cx + s * 0.34, cy + s * (0.48 + mainKick * 0.16));
    g.fillStyle(colors[4], alpha);
    g.fillTriangle(cx, cy - s * 0.5, cx - s * 0.2, cy - s * 0.2, cx + s * 0.2, cy - s * 0.2);
    g.fillStyle(0xffffff, alpha);
    g.fillRect(cx - 1.5, cy - 1.5, 3, 3);
    if (revive > 0) {
      g.lineStyle(3, 0x42ff9e, alpha);
      g.beginPath();
      g.arc(cx, cy, s * 0.75, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * clamp(revive / 100, 0, 1));
      g.strokePath();
    }
  }

  private drawShield(x: number, y: number, color: string, power: number): void {
    const g = this.g;
    const c = Phaser.Display.Color.HexStringToColor(color).color;
    this.glowRect(this.px(x - 0.9), this.py(y - 1.25), this.stage.cw * 1.8, this.stage.ch * 0.46, c, power, 4);
    g.lineStyle(2, c, clamp(power, 0.25, 1));
    g.strokeRoundedRect(this.px(x - 0.9), this.py(y - 1.25), this.stage.cw * 1.8, this.stage.ch * 0.46, 8);
  }

  private drawEnemy(e: Enemy): void {
    const g = this.g;
    const cx = this.px(e.x);
    const cy = this.py(e.y);
    const s = Math.min(this.stage.cw, this.stage.ch) * (e.type === "boss" ? 1.9 : 0.72);
    const color = Phaser.Display.Color.HexStringToColor(e.color).color;
    this.glowCircle(cx, cy, s * (e.type === "boss" ? 0.92 : 0.72), color, e.type === "boss" ? 0.82 : 0.62, e.type === "boss" ? 5 : 3);
    if (e.type === "turret") this.glowRect(cx - s * 0.6, cy - s * 0.55, s * 1.2, s * 1.1, 0xff4a26, 0.42, 3);
    g.fillStyle(color, e.type === "boss" ? 0.28 : 0.4);
    g.lineStyle(e.type === "boss" ? 3 : 2, color, 0.95);
    if (e.type === "boss") {
      g.fillRect(cx - s * 0.72, cy - s * 0.5, s * 1.44, s);
      g.strokeRect(cx - s * 0.72, cy - s * 0.5, s * 1.44, s);
      g.fillStyle(0xffffff, 0.9);
      g.fillRect(cx - s * 0.14, cy - s * 0.12, s * 0.28, s * 0.24);
      g.fillStyle(0xff3158, 0.7);
      g.fillRect(cx - s * 0.72, cy - s * 0.72, s * 1.44 * clamp(e.hp / e.maxHp, 0, 1), 4);
      return;
    }
    if (e.type === "charger") {
      g.fillTriangle(cx, cy - s * 0.55, cx - s * 0.5, cy + s * 0.48, cx + s * 0.5, cy + s * 0.48);
      g.strokeTriangle(cx, cy - s * 0.55, cx - s * 0.5, cy + s * 0.48, cx + s * 0.5, cy + s * 0.48);
    } else {
      g.fillRect(cx - s * 0.5, cy - s * 0.5, s, s);
      g.strokeRect(cx - s * 0.5, cy - s * 0.5, s, s);
    }
  }

  private drawBullet(b: Bullet): void {
    const g = this.g;
    const color = Phaser.Display.Color.HexStringToColor(b.color).color;
    const x = this.px(b.x);
    const y = this.py(b.y);
    const r = Math.max(3, b.r * Math.min(this.stage.cw, this.stage.ch));
    const alpha = b.team === "enemy" ? 0.95 : 0.9;
    if (b.kind === "beam") this.glowRect(x - r * 0.55, y - r * 5, r * 1.1, r * 6, color, alpha, 4);
    else this.glowCircle(x, y, r * (b.kind === "missile" ? 2.6 : 2.1), color, alpha, b.team === "player" ? 4 : 3);
    g.fillStyle(color, alpha);
    if (b.kind === "beam") {
      g.fillRect(x - r * 0.45, y - r * 4, r * 0.9, r * 5);
    } else if (b.kind === "wave") {
      g.fillRect(x - r * 1.35, y - r * 0.5, r * 2.7, r);
    } else {
      g.fillCircle(x, y, r);
    }
    g.fillStyle(0xffffff, b.team === "player" ? 0.82 : 0.5);
    g.fillCircle(x, y, Math.max(1.4, r * 0.38));
  }

  private glowRect(x: number, y: number, w: number, h: number, color: number, alpha: number, rings: number): void {
    const g = this.g;
    for (let i = rings; i >= 1; i--) {
      const grow = i * 3.5;
      g.fillStyle(color, (alpha * 0.055) / i);
      g.fillRect(x - grow, y - grow, w + grow * 2, h + grow * 2);
    }
    g.lineStyle(1, color, alpha * 0.55);
    g.strokeRect(x, y, w, h);
  }

  private glowCircle(x: number, y: number, radius: number, color: number, alpha: number, rings: number): void {
    const g = this.g;
    for (let i = rings; i >= 1; i--) {
      g.fillStyle(color, (alpha * 0.05) / i);
      g.fillCircle(x, y, radius + i * 4);
    }
    g.lineStyle(1, color, alpha * 0.48);
    g.strokeCircle(x, y, radius);
  }
}

class Ui {
  private sim: GameSim;
  private online: FirebaseRoom;
  private active: Screen = "title";
  private lastMode: Mode = "single";

  constructor(sim: GameSim, online: FirebaseRoom) {
    this.sim = sim;
    this.online = online;
    document.body.addEventListener("click", (e) => {
      const target = e.target as HTMLElement;
      const action = target.dataset.action;
      const slot = target.dataset.slot as Slot | undefined;
      const equip = target.dataset.equip;
      if (action) void this.action(action);
      if (slot) this.renderCustomize(slot);
      if (equip) this.equip(equip as Slot, target.dataset.id ?? "");
    });
    this.show("title");
    this.renderAll();
  }

  tick(): void {
    if (this.active === "game") {
      this.text("hud-score", String(this.sim.score));
      this.text("hud-hp", this.sim.dead ? "DOWN" : `${this.sim.hp}/${this.sim.maxHp}`);
      this.text("hud-ticket", String(this.sim.tickets));
      const sp = 1 - clamp(this.sim.specialCooldown / num(part("hull", this.sim.loadout.hull).stat.specialCooldown, 6000), 0, 1);
      const ev = 1 - clamp(this.sim.dodgeCooldown / num(part("engine", this.sim.loadout.engine).stat.dodgeCooldown, 1800), 0, 1);
      this.scale("sp-cool", sp);
      this.scale("ev-cool", ev);
      this.text("room-chip", this.online.roomId ? `ROOM ${this.online.roomId}` : "");
    }
  }

  setOnlineStatus(status: string): void {
    this.text("online-status", status === "online" ? "Firebase 接続 OK。最大6人まで同時参加できます。" : "Firebase 未接続。シングルは遊べます。");
  }

  private async action(action: string): Promise<void> {
    if (action !== "roll-gacha") audio.unlock();
    if (action === "single") this.start("single");
    if (action === "multi") this.show("multi");
    if (action === "customize") this.show("customize");
    if (action === "gacha") this.show("gacha");
    if (action === "parts") this.show("parts");
    if (action === "credits") this.show("credits");
    if (action === "back-title") {
      this.sim.stop();
      this.online.leave();
      this.show("title");
    }
    if (action === "join-room") await this.joinRoom();
    if (action === "roll-gacha") this.roll();
    if (action === "retry") this.start(this.lastMode);
  }

  private start(mode: Mode): void {
    this.lastMode = mode;
    const name = (document.getElementById("name-input") as HTMLInputElement | null)?.value || "PLAYER";
    this.sim.start(mode, name);
    this.show("game");
  }

  private async joinRoom(): Promise<void> {
    const room = (document.getElementById("room-input") as HTMLInputElement).value || "public";
    const name = (document.getElementById("name-input") as HTMLInputElement).value || "PLAYER";
    this.sim.start("multi", name);
    const joined = await this.online.join(room, this.sim.snapshot());
    if (!joined.ok) {
      this.sim.stop();
      this.text("online-status", joined.message);
      return;
    }
    this.lastMode = "multi";
    this.show("game");
  }

  show(screen: Screen): void {
    this.active = screen;
    document.querySelectorAll(".screen").forEach((el) => el.classList.remove("active"));
    const target = document.getElementById(`screen-${screen}`);
    if (target) target.classList.add("active");
    document.getElementById("menu")?.classList.toggle("hidden", screen === "game");
    document.getElementById("hud")?.classList.toggle("hidden", screen !== "game");
    this.renderAll();
  }

  result(score: number, tickets: number): void {
    this.text("result-title", this.sim.dead ? "GAME OVER" : "RESULT");
    this.text("result-score", String(score));
    this.text("result-note", tickets > 0 ? `ガチャチケット +${tickets}` : "スコア 5 ごとにガチャチケットを獲得できます。");
    this.show("result");
  }

  renderAll(): void {
    this.text("best-score", String(this.sim.best));
    this.text("ticket-count", String(this.sim.tickets));
    if (this.active === "customize") this.renderCustomize("main");
    if (this.active === "parts") this.renderParts();
    this.drawPreview();
  }

  private renderCustomize(slot: Slot): void {
    document.querySelectorAll(".slot-tabs button").forEach((b) => b.classList.toggle("active", (b as HTMLElement).dataset.slot === slot));
    const list = document.getElementById("slot-list");
    if (!list) return;
    list.innerHTML = "";
    for (const p of catalog[slot]) {
      const unlocked = this.sim.owned[slot]?.includes(p.id);
      const card = document.createElement("div");
      card.className = "part-card";
      card.innerHTML = `<h3 style="color:${p.color}">${p.name} ${p.rarity}</h3><p>${p.desc}</p>`;
      const btn = document.createElement("button");
      btn.textContent = this.sim.loadout[slot] === p.id ? "装備中" : unlocked ? "装備する" : "未所持";
      btn.disabled = !unlocked || this.sim.loadout[slot] === p.id;
      btn.dataset.equip = slot;
      btn.dataset.id = p.id;
      card.appendChild(btn);
      list.appendChild(card);
    }
    this.drawPreview();
  }

  private renderParts(): void {
    const grid = document.getElementById("parts-grid");
    if (!grid) return;
    grid.innerHTML = "";
    for (const p of allParts) {
      const owned = this.sim.owned[p.slot]?.includes(p.id);
      const div = document.createElement("div");
      div.className = "part-card";
      div.innerHTML = `<h3 style="color:${p.color}">${p.name} / ${p.slot.toUpperCase()} / ${p.rarity}</h3><p>${owned ? "OWNED" : "LOCKED"} - ${p.desc}</p>`;
      grid.appendChild(div);
    }
  }

  private equip(slot: Slot, id: string): void {
    this.sim.equip(slot, id);
    this.renderCustomize(slot);
  }

  private roll(): void {
    const item = this.sim.rollGacha();
    const el = document.getElementById("gacha-result");
    if (!el) return;
    if (!item) {
      el.textContent = "NO TICKET";
      return;
    }
    el.innerHTML = `<span style="color:${item.color}">${item.rarity}<br>${item.name}</span>`;
    this.renderAll();
  }

  private drawPreview(): void {
    const canvas = document.getElementById("preview") as HTMLCanvasElement | null;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "rgba(35,231,255,.05)";
    for (let i = 0; i < 10; i++) {
      ctx.fillRect(i * 24, 0, 1, canvas.height);
      ctx.fillRect(0, i * 24, canvas.width, 1);
    }
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const loadout = this.sim.loadout;
    const colors = [part("hull", loadout.hull), part("main", loadout.main), part("sub", loadout.sub), part("engine", loadout.engine), part("bridge", loadout.bridge)].map((p) => p.color);
    ctx.shadowBlur = 16;
    ctx.lineWidth = 4;
    ctx.strokeStyle = colors[0];
    ctx.fillStyle = colors[0] + "55";
    ctx.shadowColor = colors[0];
    ctx.fillRect(cx - 38, cy - 30, 76, 72);
    ctx.strokeRect(cx - 38, cy - 30, 76, 72);
    ctx.fillStyle = colors[1];
    ctx.fillRect(cx - 9, cy - 72, 18, 46);
    ctx.fillStyle = colors[2];
    ctx.fillRect(cx - 66, cy - 16, 24, 54);
    ctx.fillRect(cx + 42, cy - 16, 24, 54);
    ctx.fillStyle = colors[3];
    ctx.fillRect(cx - 30, cy + 46, 20, 30);
    ctx.fillRect(cx + 10, cy + 46, 20, 30);
    ctx.fillStyle = colors[4];
    ctx.beginPath();
    ctx.moveTo(cx, cy - 56);
    ctx.lineTo(cx - 20, cy - 20);
    ctx.lineTo(cx + 20, cy - 20);
    ctx.closePath();
    ctx.fill();
  }

  private text(id: string, value: string): void {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  }

  private scale(id: string, value: number): void {
    const el = document.getElementById(id) as HTMLElement | null;
    if (el) el.style.transform = `scaleX(${clamp(value, 0, 1)})`;
  }
}

const audio = new AudioSystem();
let ui: Ui;
const online = new FirebaseRoom();
const sim = new GameSim(audio, (score, tickets) => ui.result(score, tickets));
const input = new InputController(sim);
sim.attachInput(input);
const scene = new PlayScene(sim);

const game = new Phaser.Game({
  type: Phaser.CANVAS,
  parent: "game-root",
  backgroundColor: "#02040a",
  width: window.innerWidth,
  height: window.innerHeight,
  pixelArt: false,
  roundPixels: false,
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  scene: [scene]
});

ui = new Ui(sim, online);
void online.configure().then((status) => ui.setOnlineStatus(status));

window.setInterval(() => {
  if (sim.mode === "multi" && sim.inGame) sim.setRemote(online.sync(sim.snapshot()));
  ui.tick();
}, 80);

window.addEventListener("resize", () => {
  game.scale.resize(window.innerWidth, window.innerHeight);
});
