import * as THREE from "three";
import "./style.css";

type Phase = "betting" | "spinning" | "pending" | "exploding" | "caught" | "won" | "bankrupt";
type CameraMode = "CAM-A" | "CAM-B" | "CAM-C" | "CAM-D";
type SpinStage = "idle" | "launch" | "orbit" | "drop" | "settle";
type BetType =
  | "straight"
  | "red"
  | "black"
  | "even"
  | "odd"
  | "low"
  | "high"
  | "dozen1"
  | "dozen2"
  | "dozen3"
  | "col1"
  | "col2"
  | "col3";

interface Bet {
  type: BetType;
  key: string;
  label: string;
  amount: number;
}

interface Spell {
  id: string;
  label: string;
  short: string;
  unlock: number;
  mana: number;
  baseAlert: number;
  cast: number;
  gesture: string;
  description: string;
  phase: "spin" | "pending" | "both";
}

interface CastAction {
  spell: Spell;
  elapsed: number;
  sourcePhase: Phase;
}

const WHEEL_ORDER = [0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26];
const RED_NUMBERS = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);
const BLACK_NUMBERS = new Set(WHEEL_ORDER.filter((number) => number !== 0 && !RED_NUMBERS.has(number)));
const DENOMINATIONS = [10, 50, 100, 500];
const INITIAL_BANKROLL = 1_000;
const WIN_TARGET = 100_000_000;

const SPELLS: Spell[] = [
  { id: "color", label: "黒→赤", short: "赤染め", unlock: 0, mana: 1, baseAlert: 1, cast: 0.32, gesture: "ボールをなぞる", description: "ボールの色だけを赤へ塗り替える", phase: "both" },
  { id: "explode", label: "爆発リセット", short: "爆破", unlock: 0, mana: 2, baseAlert: 2, cast: 2, gesture: "杖→ピン 2秒", description: "結果保留中の盤を吹き飛ばし、同じ賭けで再スピン", phase: "pending" },
  { id: "slow", label: "時間をつまむ", short: "減速", unlock: 3, mana: 1, baseAlert: 1, cast: 0.45, gesture: "ボールをつかむ", description: "ボールの時間を短く遅くする", phase: "spin" },
  { id: "sneeze", label: "くしゃみを呼ぶ", short: "くしゃみ", unlock: 3, mana: 1, baseAlert: 1, cast: 0.3, gesture: "ディーラーをタップ", description: "監視の視線を一瞬だけそらす", phase: "spin" },
  { id: "shift", label: "穴をずらす", short: "1マス移動", unlock: 8, mana: 3, baseAlert: 1, cast: 0.65, gesture: "ポケットへドラッグ", description: "結果をホイール上の隣の番号へ送る", phase: "both" },
  { id: "fake-signal", label: "偽の安全信号", short: "偽信号", unlock: 8, mana: 2, baseAlert: 2, cast: 0.5, gesture: "検知器をなぞる", description: "検知器を数秒だけ緑色に偽装する", phase: "both" },
  { id: "number", label: "数字を書き換える", short: "数字変更", unlock: 15, mana: 5, baseAlert: 2, cast: 0.95, gesture: "下段の数字へドラッグ", description: "最後に選んだ数字へ結果を変更する", phase: "both" },
  { id: "camera-loop", label: "映像をループ", short: "3秒ループ", unlock: 15, mana: 3, baseAlert: 2, cast: 0.7, gesture: "CAMを長押し", description: "上段の監視映像を古いフレームに固定する", phase: "spin" },
  { id: "duplicate", label: "ボールを2個にする", short: "2ボール", unlock: 25, mana: 4, baseAlert: 2, cast: 0.9, gesture: "ボールを分ける", description: "ボールを2個にして、結果を複数にする", phase: "spin" },
  { id: "shadow", label: "影だけに詠唱", short: "影魔法", unlock: 25, mana: 3, baseAlert: 1, cast: 0.8, gesture: "影をスワイプ", description: "主人公の影に魔法を代行させる", phase: "both" },
  { id: "double-payout", label: "チップを倍にする", short: "配当倍化", unlock: 25, mana: 4, baseAlert: 3, cast: 0.85, gesture: "チップを二度押し", description: "今回の払い戻しだけを2倍にする", phase: "pending" },
  { id: "transfer", label: "結果を移す", short: "結果転送", unlock: 40, mana: 6, baseAlert: 3, cast: 1.3, gesture: "別のボールへ線を引く", description: "別の世界線の結果を現在のポケットへ移す", phase: "pending" },
];

const app = document.querySelector<HTMLDivElement>("#app");
if (!app) throw new Error("#app was not found");

app.innerHTML = `
  <div class="game-shell">
    <header class="topbar">
      <div class="brand-lockup">
        <span class="brand-mark">✦</span>
        <h1>MAGIC ROULETTE</h1>
        <small>¥1,000 → ¥100,000,000</small>
      </div>
      <div class="compact-stats" aria-label="ゲーム状態">
        <div class="stat-block money-stat"><span>所持金</span><strong id="bankroll">¥1,000</strong></div>
        <div class="stat-block"><span>賭け金</span><strong id="total-bet">¥0</strong></div>
        <div class="stat-block alert-stat"><span>警戒</span><strong id="alert-level">0 / 10</strong></div>
        <div class="sub-stats"><span>魔力 <b id="mana">10 / 10</b></span><span>熟練 <b id="skill-count">0</b> <i id="skill-next">次 3</i></span></div>
      </div>
    </header>

    <main class="simple-layout">
      <section class="viewport-card" id="viewport-card">
        <div class="viewport-topline">
          <span id="phase-label">BETTING / 00</span>
          <div class="safe-readout" id="safe-readout"><span class="signal-dot"></span><span id="safe-label">安全</span><b id="safe-meter">82%</b></div>
        </div>
        <div id="three-root" class="three-root"></div>
        <div class="spin-stage" id="spin-stage">賭けを選んでスタート</div>
        <div class="round-banner" id="round-banner" data-tone="neutral" aria-live="polite">
          <span id="round-kicker">PLACE YOUR BET</span>
          <strong id="round-title">赤か黒を選ぶ</strong>
          <small id="round-copy">チップを置くとスタートできます</small>
        </div>
        <div class="cast-progress" id="cast-progress"><span id="cast-label">CASTING</span><i><b id="cast-fill"></b></i></div>
        <div class="pending-readout" id="pending-readout"><span>結果確定まで</span><b id="pending-timer">3.0</b><small>秒　杖で爆破できる</small></div>
        <div class="pin-target" id="pin-target">✣<span>PIN</span></div>
        <button class="wand-tool" id="wand-tool" type="button" aria-label="杖。結果保留中に中央ピンへドラッグ"><span>☄</span><small>爆破</small></button>
        <div class="status-message" id="status-message">赤・黒・数字から賭けを選ぶ。</div>
        <div class="scene-toast" id="scene-toast" aria-live="polite"></div>
      </section>

      <section class="control-card">
        <div class="bet-section">
          <div class="control-heading">
            <div><span>BET</span><h2>どちらに賭ける？</h2></div>
            <div class="round-summary"><strong id="bet-summary">賭けなし</strong><small id="last-result">前回 —</small></div>
          </div>
          <div class="chip-row"><span>チップ</span><div id="denomination-picker"></div></div>
          <div class="outside-board" id="outside-board"></div>
        </div>

        <details class="number-drawer" id="number-drawer">
          <summary><span>数字にも賭ける</span><small>0〜36・当たると35倍</small></summary>
          <div class="bet-board-wrap">
            <button class="bet-cell zero-cell green" data-bet-type="straight" data-bet-key="0" data-label="0">0<span class="chip-amount"></span></button>
            <div class="number-grid" id="number-grid"></div>
          </div>
        </details>

        <div class="magic-section">
          <div class="section-label"><span>MAGIC</span><small>安全表示が緑の時だけ使う</small></div>
          <div class="magic-tray" id="magic-tray"></div>
        </div>

        <div class="table-actions">
          <button class="secondary-button" id="clear-bets" type="button">賭けを戻す</button>
          <button class="primary-button" id="spin-button" type="button">ルーレット開始</button>
        </div>
      </div>
    </main>

    <div class="detector-mini-meter" aria-hidden="true"><div id="detector-fill"></div></div>
    <div class="hidden-systems" aria-hidden="true">
      <span id="camera-label">CAM-A / TABLE</span><span id="detector-state">SAFE</span><span id="detector-beam"></span><span id="detector-note"></span>
      <ul id="event-log"></ul>
    </div>
  </div>
  <div class="modal-layer hidden" id="modal-layer"><div class="result-modal"><span class="modal-stamp" id="modal-stamp">CAUGHT</span><h2 id="modal-title">見つかった</h2><p id="modal-copy"></p><button class="primary-button" id="restart-button" type="button">もう一度</button></div></div>
`;

const q = <T extends HTMLElement>(selector: string): T => {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`Missing element: ${selector}`);
  return element;
};

const threeRoot = q<HTMLDivElement>("#three-root");
const viewportCard = q<HTMLElement>("#viewport-card");
const controlCardEl = q<HTMLElement>(".control-card");
const bankrollEl = q<HTMLElement>("#bankroll");
const totalBetEl = q<HTMLElement>("#total-bet");
const manaEl = q<HTMLElement>("#mana");
const alertEl = q<HTMLElement>("#alert-level");
const skillCountEl = q<HTMLElement>("#skill-count");
const skillNextEl = q<HTMLElement>("#skill-next");
const statusMessageEl = q<HTMLElement>("#status-message");
const phaseLabelEl = q<HTMLElement>("#phase-label");
const cameraLabelEl = q<HTMLElement>("#camera-label");
const spinStageEl = q<HTMLElement>("#spin-stage");
const roundBannerEl = q<HTMLElement>("#round-banner");
const roundKickerEl = q<HTMLElement>("#round-kicker");
const roundTitleEl = q<HTMLElement>("#round-title");
const roundCopyEl = q<HTMLElement>("#round-copy");
const betSummaryEl = q<HTMLElement>("#bet-summary");
const lastResultEl = q<HTMLElement>("#last-result");
const safeReadoutEl = q<HTMLElement>("#safe-readout");
const safeLabelEl = q<HTMLElement>("#safe-label");
const safeMeterEl = q<HTMLElement>("#safe-meter");
const detectorStateEl = q<HTMLElement>("#detector-state");
const detectorFillEl = q<HTMLElement>("#detector-fill");
const detectorBeamEl = q<HTMLElement>("#detector-beam");
const detectorNoteEl = q<HTMLElement>("#detector-note");
const eventLogEl = q<HTMLUListElement>("#event-log");
const sceneToastEl = q<HTMLElement>("#scene-toast");
const castProgressEl = q<HTMLElement>("#cast-progress");
const castLabelEl = q<HTMLElement>("#cast-label");
const castFillEl = q<HTMLElement>("#cast-fill");
const pendingReadoutEl = q<HTMLElement>("#pending-readout");
const pendingTimerEl = q<HTMLElement>("#pending-timer");
const pinTargetEl = q<HTMLElement>("#pin-target");
const wandToolEl = q<HTMLButtonElement>("#wand-tool");
const numberGridEl = q<HTMLDivElement>("#number-grid");
const outsideBoardEl = q<HTMLDivElement>("#outside-board");
const denominationPickerEl = q<HTMLDivElement>("#denomination-picker");
const magicTrayEl = q<HTMLDivElement>("#magic-tray");
const spinButtonEl = q<HTMLButtonElement>("#spin-button");
const clearBetsButtonEl = q<HTMLButtonElement>("#clear-bets");
const modalLayerEl = q<HTMLDivElement>("#modal-layer");
const modalStampEl = q<HTMLElement>("#modal-stamp");
const modalTitleEl = q<HTMLElement>("#modal-title");
const modalCopyEl = q<HTMLElement>("#modal-copy");
const restartButtonEl = q<HTMLButtonElement>("#restart-button");

function formatYen(value: number): string {
  return `¥${Math.max(0, Math.round(value)).toLocaleString("ja-JP")}`;
}

function isRed(number: number): boolean {
  return RED_NUMBERS.has(number);
}

function colorClass(number: number): string {
  if (number === 0) return "green";
  return isRed(number) ? "red" : "black";
}

function colorLabel(number: number): string {
  if (number === 0) return "緑";
  return isRed(number) ? "赤" : "黒";
}

function randomNumber(): number {
  return Math.floor(Math.random() * 37);
}

function adjacentNumber(number: number): number {
  const index = WHEEL_ORDER.indexOf(number);
  return WHEEL_ORDER[(index + 1) % WHEEL_ORDER.length];
}

function pickRedNumber(): number {
  const red = [...RED_NUMBERS];
  return red[Math.floor(Math.random() * red.length)];
}

function pickWinningNumber(): number {
  const chosen = [...bets.values()].find((bet) => bet.type === "straight");
  return chosen ? Number(chosen.key) : pickRedNumber();
}

function skillRank(successes: number): number {
  if (successes >= 40) return 5;
  if (successes >= 25) return 4;
  if (successes >= 15) return 3;
  if (successes >= 8) return 2;
  if (successes >= 3) return 1;
  return 0;
}

function nextSkillThreshold(successes: number): number | null {
  return [3, 8, 15, 25, 40].find((threshold) => threshold > successes) ?? null;
}

function spellUnlocked(spell: Spell): boolean {
  return successfulCheats >= spell.unlock;
}

function betWins(bet: Bet, number: number): boolean {
  if (number === 0 && bet.type !== "straight") return false;
  switch (bet.type) {
    case "straight": return Number(bet.key) === number;
    case "red": return isRed(number);
    case "black": return BLACK_NUMBERS.has(number);
    case "even": return number !== 0 && number % 2 === 0;
    case "odd": return number !== 0 && number % 2 === 1;
    case "low": return number >= 1 && number <= 18;
    case "high": return number >= 19 && number <= 36;
    case "dozen1": return number >= 1 && number <= 12;
    case "dozen2": return number >= 13 && number <= 24;
    case "dozen3": return number >= 25 && number <= 36;
    case "col1": return number !== 0 && number % 3 === 1;
    case "col2": return number !== 0 && number % 3 === 2;
    case "col3": return number !== 0 && number % 3 === 0;
  }
}

function payoutFor(type: BetType): number {
  switch (type) {
    case "straight": return 35;
    case "red":
    case "black":
    case "even":
    case "odd":
    case "low":
    case "high": return 1;
    case "dozen1":
    case "dozen2":
    case "dozen3":
    case "col1":
    case "col2":
    case "col3": return 2;
  }
}

class RouletteVisual {
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
  readonly renderer: THREE.WebGLRenderer;
  readonly wheel = new THREE.Group();
  readonly ball: THREE.Mesh;
  readonly pin: THREE.Mesh;
  readonly extraBalls: THREE.Mesh[] = [];
  readonly debris: { mesh: THREE.Mesh; velocity: THREE.Vector3 }[] = [];
  private targetNumber = 0;
  private targetRotation = 0;
  private spinStartRotation = 0;
  private spinElapsed = 0;
  private spinDuration = 6.4;
  private spinStage: SpinStage = "idle";
  private readonly ballStartAngle = 0.34;
  private ballAngle = this.ballStartAngle;
  private ballRadius = 4.48;
  private ballRadialVelocity = 0;
  private ballAngularVelocity = 0;
  private ballLift = 0;
  private ballLiftVelocity = 0;
  private physicsAccumulator = 0;
  private collisionCount = 0;
  private collisionCooldown = 0;
  private wheelAngularVelocity = 0;
  private explosionElapsed = 0;
  private cameraMode: CameraMode = "CAM-A";

  constructor(private readonly mount: HTMLElement) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x07100c, 0);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.mount.appendChild(this.renderer.domElement);
    this.scene.fog = new THREE.Fog(0x07100c, 10, 24);
    this.scene.add(new THREE.AmbientLight(0x9ac7a1, 1.8));
    const key = new THREE.DirectionalLight(0xffc477, 3.2);
    key.position.set(3, 8, 6);
    this.scene.add(key);
    const redLight = new THREE.PointLight(0xa51f3d, 7, 12);
    redLight.position.set(-5, 3, -4);
    this.scene.add(redLight);
    const greenLight = new THREE.PointLight(0x5abf73, 5, 10);
    greenLight.position.set(5, 2, 2);
    this.scene.add(greenLight);
    this.createTable();
    this.scene.add(this.wheel);
    this.ball = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6), new THREE.MeshStandardMaterial({ color: 0xfff4dc, roughness: 0.25, metalness: 0.3 }));
    const ballMark = new THREE.Mesh(new THREE.SphereGeometry(0.045, 5, 4), new THREE.MeshStandardMaterial({ color: 0x573b25, roughness: 0.7 }));
    ballMark.position.set(0, 0.145, 0);
    this.ball.add(ballMark);
    this.ball.position.set(Math.cos(this.ballStartAngle) * 4.48, 0.86, Math.sin(this.ballStartAngle) * 4.48);
    this.scene.add(this.ball);
    this.pin = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.24, 1.0, 8), new THREE.MeshStandardMaterial({ color: 0xd69e4a, roughness: 0.5, metalness: 0.65 }));
    this.pin.position.y = 1.0;
    this.scene.add(this.pin);
    this.setCamera("CAM-A");
    this.resize();
    window.addEventListener("resize", () => this.resize());
  }

  private createTable(): void {
    const tableBase = new THREE.Mesh(new THREE.CylinderGeometry(4.35, 4.55, 0.34, 12), new THREE.MeshStandardMaterial({ color: 0x1c4530, roughness: 0.94, metalness: 0.05 }));
    tableBase.position.y = -0.14;
    this.scene.add(tableBase);

    const bowlProfile = [
      new THREE.Vector2(3.16, 0.57),
      new THREE.Vector2(3.42, 0.64),
      new THREE.Vector2(3.72, 0.74),
      new THREE.Vector2(4.02, 0.85),
      new THREE.Vector2(4.18, 0.94),
      new THREE.Vector2(4.28, 1.08),
    ];
    const bowl = new THREE.Mesh(
      new THREE.LatheGeometry(bowlProfile, 64),
      new THREE.MeshStandardMaterial({ color: 0x213425, roughness: 0.76, metalness: 0.18, side: THREE.DoubleSide }),
    );
    this.scene.add(bowl);
    const ballTrack = new THREE.Mesh(new THREE.TorusGeometry(4.04, 0.19, 8, 64), new THREE.MeshStandardMaterial({ color: 0x4b3b28, roughness: 0.58, metalness: 0.46 }));
    ballTrack.rotation.x = Math.PI / 2;
    ballTrack.position.y = 0.9;
    this.scene.add(ballTrack);
    const outerRail = new THREE.Mesh(new THREE.TorusGeometry(4.28, 0.07, 6, 48), new THREE.MeshStandardMaterial({ color: 0xc38a42, roughness: 0.42, metalness: 0.78 }));
    outerRail.rotation.x = Math.PI / 2;
    outerRail.position.y = 1.1;
    this.scene.add(outerRail);
    const launcher = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.18, 0.42), new THREE.MeshStandardMaterial({ color: 0x81572e, roughness: 0.6, metalness: 0.55 }));
    launcher.position.set(Math.cos(this.ballStartAngle) * 4.52, 1.02, Math.sin(this.ballStartAngle) * 4.52);
    launcher.rotation.y = -this.ballStartAngle;
    launcher.rotation.z = -0.12;
    this.scene.add(launcher);
    const brassRing = new THREE.Mesh(new THREE.TorusGeometry(3.53, 0.075, 6, 64), new THREE.MeshStandardMaterial({ color: 0xd8a14c, roughness: 0.38, metalness: 0.82 }));
    brassRing.rotation.x = Math.PI / 2;
    brassRing.position.y = 0.73;
    this.scene.add(brassRing);
    const lowerRing = new THREE.Mesh(new THREE.TorusGeometry(4.2, 0.08, 5, 20), new THREE.MeshStandardMaterial({ color: 0x8a542c, roughness: 0.8, metalness: 0.45 }));
    lowerRing.rotation.x = Math.PI / 2;
    lowerRing.position.y = -0.02;
    this.scene.add(lowerRing);

    const deflectorMaterial = new THREE.MeshStandardMaterial({ color: 0xf1c66d, emissive: 0x3d2306, emissiveIntensity: 0.45, roughness: 0.3, metalness: 0.82 });
    for (let index = 0; index < 18; index += 1) {
      const angle = (index / 18) * Math.PI * 2 + Math.PI / 36;
      const deflector = new THREE.Mesh(new THREE.OctahedronGeometry(0.115, 0), deflectorMaterial);
      deflector.scale.set(0.72, 1.45, 0.72);
      deflector.position.set(Math.cos(angle) * 3.48, this.surfaceHeight(3.48) + 0.1, Math.sin(angle) * 3.48);
      deflector.rotation.y = angle;
      this.scene.add(deflector);
    }

    const wheelBase = new THREE.Mesh(new THREE.CylinderGeometry(3.48, 3.72, 0.48, 37), new THREE.MeshStandardMaterial({ color: 0x2a211a, roughness: 0.72, metalness: 0.35 }));
    wheelBase.position.y = 0.2;
    this.wheel.add(wheelBase);
    const felt = new THREE.Mesh(new THREE.CylinderGeometry(3.15, 3.24, 0.12, 74), new THREE.MeshStandardMaterial({ color: 0x123c29, roughness: 0.9, metalness: 0.02 }));
    felt.position.y = 0.48;
    this.wheel.add(felt);

    const sector = (Math.PI * 2) / WHEEL_ORDER.length;
    WHEEL_ORDER.forEach((number, index) => {
      const angle = (index / WHEEL_ORDER.length) * Math.PI * 2;
      const pocketColor = number === 0 ? 0x16824d : isRed(number) ? 0xd73545 : 0x171b1e;
      const emissiveColor = number === 0 ? 0x063d23 : isRed(number) ? 0x4f0710 : 0x030405;
      const material = new THREE.MeshStandardMaterial({ color: pocketColor, emissive: emissiveColor, emissiveIntensity: 0.42, roughness: 0.58, metalness: 0.08, side: THREE.DoubleSide });
      const pocket = new THREE.Mesh(new THREE.RingGeometry(2.4, 3.16, 1, 1, angle - sector * 0.47, sector * 0.94), material);
      pocket.rotation.x = -Math.PI / 2;
      pocket.position.y = 0.67;
      this.wheel.add(pocket);

      const divider = new THREE.Mesh(
        new THREE.BoxGeometry(0.045, 0.11, 0.78),
        new THREE.MeshStandardMaterial({ color: 0xf0cf85, roughness: 0.42, metalness: 0.7 }),
      );
      divider.position.set(Math.cos(angle - sector / 2) * 2.79, 0.735, Math.sin(angle - sector / 2) * 2.79);
      divider.rotation.y = Math.PI / 2 - (angle - sector / 2);
      this.wheel.add(divider);

      const label = this.createLabelMesh(String(number), number === 0 ? "#efffd2" : "#fff7dc");
      label.position.set(Math.cos(angle) * 2.79, 0.742, Math.sin(angle) * 2.79);
      label.rotation.z = angle + Math.PI / 2;
      this.wheel.add(label);
    });
    const center = new THREE.Mesh(new THREE.CylinderGeometry(1.18, 1.42, 0.75, 10), new THREE.MeshStandardMaterial({ color: 0x9b6b32, roughness: 0.6, metalness: 0.65 }));
    center.position.y = 0.72;
    this.wheel.add(center);
    const centerCap = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.72, 0.16, 10), new THREE.MeshStandardMaterial({ color: 0xd5a653, roughness: 0.5, metalness: 0.7 }));
    centerCap.position.y = 1.15;
    this.wheel.add(centerCap);
  }

  private createLabelMesh(text: string, color: string): THREE.Mesh {
    const canvas = document.createElement("canvas");
    canvas.width = 128;
    canvas.height = 64;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas 2D context unavailable");
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.font = "900 38px Impact, sans-serif";
    context.lineWidth = 8;
    context.strokeStyle = "rgba(0, 0, 0, 0.82)";
    context.fillStyle = color;
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.strokeText(text, canvas.width / 2, canvas.height / 2 + 1);
    context.fillText(text, canvas.width / 2, canvas.height / 2 + 1);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = Math.min(8, this.renderer.capabilities.getMaxAnisotropy());
    const label = new THREE.Mesh(
      new THREE.PlaneGeometry(0.52, 0.26),
      new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false, side: THREE.DoubleSide }),
    );
    label.rotation.x = -Math.PI / 2;
    label.renderOrder = 3;
    return label;
  }

  private surfaceHeight(radius: number): number {
    if (radius <= 3.16) return 0.66;
    const slope = THREE.MathUtils.clamp((radius - 3.16) / 1.02, 0, 1);
    return 0.66 + slope * 0.3;
  }

  resize(): void {
    const width = Math.max(320, this.mount.clientWidth);
    const height = Math.max(240, this.mount.clientHeight);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
  }

  setCamera(mode: CameraMode): void {
    this.cameraMode = mode;
    const positions: Record<CameraMode, THREE.Vector3> = {
      "CAM-A": new THREE.Vector3(7.8, 7.4, 7.8),
      "CAM-B": new THREE.Vector3(4.6, 5.6, 4.6),
      "CAM-C": new THREE.Vector3(-7.4, 5.4, 5.0),
      "CAM-D": new THREE.Vector3(0.1, 10.8, 0.2),
    };
    this.camera.position.copy(positions[mode]);
    this.camera.lookAt(0, 0.45, 0);
  }

  setTargetNumber(number: number): void {
    this.targetNumber = number;
    const index = WHEEL_ORDER.indexOf(number);
    const pocketAngle = (index / WHEEL_ORDER.length) * Math.PI * 2;
    const pointerAngle = -Math.PI / 2;
    const normalized = pointerAngle - pocketAngle;
    const turns = Math.ceil((this.wheel.rotation.y - normalized) / (Math.PI * 2)) + 4;
    this.targetRotation = normalized + turns * Math.PI * 2;
  }

  startSpin(number: number, count = 1): void {
    this.wheel.position.set(0, 0, 0);
    this.wheel.scale.setScalar(1);
    this.wheel.rotation.z = 0;
    this.ball.visible = true;
    this.ballAngle = this.ballStartAngle;
    this.ballRadius = 4.48;
    this.ballRadialVelocity = 1.25;
    this.ballAngularVelocity = -10.8;
    this.ballLift = 0;
    this.ballLiftVelocity = 0;
    this.physicsAccumulator = 0;
    this.collisionCount = 0;
    this.collisionCooldown = 0;
    this.wheelAngularVelocity = 0;
    this.ball.position.set(Math.cos(this.ballStartAngle) * 4.48, 0.88, Math.sin(this.ballStartAngle) * 4.48);
    this.ball.rotation.set(0, 0, 0);
    this.spinElapsed = 0;
    this.spinDuration = 6.4;
    this.spinStage = "launch";
    this.spinStartRotation = this.wheel.rotation.y;
    this.setTargetNumber(number);
    this.setResults([number, ...Array.from({ length: Math.max(0, count - 1) }, () => adjacentNumber(number))]);
    this.debris.forEach(({ mesh }) => this.scene.remove(mesh));
    this.debris.length = 0;
  }

  setResults(results: number[]): void {
    while (this.extraBalls.length < results.length - 1) {
      const extra = new THREE.Mesh(new THREE.SphereGeometry(0.13, 7, 5), new THREE.MeshStandardMaterial({ color: 0xffd8a1, roughness: 0.25, metalness: 0.22 }));
      this.extraBalls.push(extra);
      this.scene.add(extra);
    }
    this.extraBalls.forEach((mesh, index) => { mesh.visible = index < results.length - 1; });
  }

  tickSpin(delta: number): boolean {
    const frameDelta = Math.min(0.04, Math.max(0, delta));
    this.spinElapsed += frameDelta;
    const progress = Math.min(1, this.spinElapsed / this.spinDuration);
    const wheelProgress = 1 - Math.pow(1 - progress, 2.35);
    const previousWheelRotation = this.wheel.rotation.y;
    this.wheel.rotation.y = THREE.MathUtils.lerp(this.spinStartRotation, this.targetRotation, wheelProgress);
    this.wheelAngularVelocity = frameDelta > 0 ? (this.wheel.rotation.y - previousWheelRotation) / frameDelta : 0;

    if (this.spinElapsed < 0.48) {
      this.spinStage = "launch";
      const local = THREE.MathUtils.smoothstep(this.spinElapsed / 0.48, 0, 1);
      this.ballAngle = this.ballStartAngle - local * 2.15;
      this.ballRadius = THREE.MathUtils.lerp(4.48, 4.05, local);
      this.ballLift = Math.sin(local * Math.PI) * 0.34;
      this.updateBallTransform(frameDelta);
    } else {
      this.spinStage = this.spinElapsed < 3.55 ? "orbit" : this.spinElapsed < 5.35 ? "drop" : "settle";
      this.physicsAccumulator = Math.min(0.12, this.physicsAccumulator + frameDelta);
      const fixedStep = 1 / 120;
      while (this.physicsAccumulator >= fixedStep) {
        this.simulateBall(fixedStep);
        this.physicsAccumulator -= fixedStep;
      }
      this.updateBallTransform(frameDelta);
    }

    if (progress >= 1) {
      this.spinStage = "idle";
      this.ballAngle = -Math.PI / 2;
      this.ballRadius = 2.79;
      this.ballLift = 0;
      this.wheel.rotation.y = this.targetRotation;
      this.updateBallTransform(0);
      this.extraBalls.forEach((mesh, index) => {
        const offset = (index + 1) * 0.16;
        mesh.position.set(Math.cos(-Math.PI / 2 + offset) * 2.79, this.surfaceHeight(2.79) + 0.16, Math.sin(-Math.PI / 2 + offset) * 2.79);
      });
      return true;
    }
    return false;
  }

  private simulateBall(delta: number): void {
    this.collisionCooldown = Math.max(0, this.collisionCooldown - delta);
    const dropProgress = THREE.MathUtils.smoothstep((this.spinElapsed - 3.25) / 2.05, 0, 1);
    const desiredRadius = THREE.MathUtils.lerp(4.03, 2.79, dropProgress);
    const radialSpring = this.spinElapsed < 3.25 ? 9.5 : 13.5;
    this.ballRadialVelocity += (desiredRadius - this.ballRadius) * radialSpring * delta;
    this.ballRadialVelocity *= Math.exp(-3.25 * delta);
    this.ballRadius += this.ballRadialVelocity * delta;

    const angularDamping = this.spinElapsed < 3.25 ? 0.1 : this.spinElapsed < 5.3 ? 0.64 : 3.2;
    this.ballAngularVelocity *= Math.exp(-angularDamping * delta);
    if (this.spinElapsed > 5.15) {
      const pointerAngle = -Math.PI / 2;
      const angleError = Math.atan2(Math.sin(pointerAngle - this.ballAngle), Math.cos(pointerAngle - this.ballAngle));
      this.ballAngularVelocity += angleError * 7.2 * delta;
    }
    this.ballAngle += this.ballAngularVelocity * delta;

    this.ballLiftVelocity -= 6.8 * delta;
    this.ballLift += this.ballLiftVelocity * delta;
    if (this.ballLift <= 0) {
      this.ballLift = 0;
      if (this.ballLiftVelocity < -0.42) this.ballLiftVelocity *= -0.32;
      else this.ballLiftVelocity = 0;
    }

    const outerWall = 4.14;
    if (this.ballRadius > outerWall) {
      this.ballRadius = outerWall;
      if (this.ballRadialVelocity > 0) {
        this.ballRadialVelocity *= -0.68;
        this.recordCollision(Math.abs(this.ballRadialVelocity));
      }
    }
    const innerWall = 2.58;
    if (this.ballRadius < innerWall) {
      this.ballRadius = innerWall;
      if (this.ballRadialVelocity < 0) {
        this.ballRadialVelocity *= -0.48;
        this.recordCollision(Math.abs(this.ballRadialVelocity));
      }
    }

    if (this.ballRadius > 3.16 && this.ballRadius < 3.78) {
      for (let index = 0; index < 18; index += 1) {
        const angle = (index / 18) * Math.PI * 2 + Math.PI / 36;
        this.resolvePointCollider(3.48, angle, 0.12, 0, 0.7);
      }
    }
    if (this.ballRadius > 2.58 && this.ballRadius < 3.2) {
      const sector = (Math.PI * 2) / WHEEL_ORDER.length;
      for (let index = 0; index < WHEEL_ORDER.length; index += 1) {
        const boundaryAngle = index * sector - sector / 2 + this.wheel.rotation.y;
        this.resolvePointCollider(2.94, boundaryAngle, 0.075, this.wheelAngularVelocity, 0.46);
      }
    }
  }

  private resolvePointCollider(radius: number, angle: number, colliderRadius: number, colliderAngularVelocity: number, restitution: number): void {
    const ballX = Math.cos(this.ballAngle) * this.ballRadius;
    const ballZ = Math.sin(this.ballAngle) * this.ballRadius;
    const colliderX = Math.cos(angle) * radius;
    const colliderZ = Math.sin(angle) * radius;
    let dx = ballX - colliderX;
    let dz = ballZ - colliderZ;
    const minimumDistance = 0.16 + colliderRadius;
    const distanceSquared = dx * dx + dz * dz;
    if (distanceSquared >= minimumDistance * minimumDistance) return;
    const distance = Math.max(0.0001, Math.sqrt(distanceSquared));
    dx /= distance;
    dz /= distance;

    const correctedX = colliderX + dx * minimumDistance;
    const correctedZ = colliderZ + dz * minimumDistance;
    this.ballRadius = Math.hypot(correctedX, correctedZ);
    this.ballAngle = Math.atan2(correctedZ, correctedX);

    const radialX = Math.cos(this.ballAngle);
    const radialZ = Math.sin(this.ballAngle);
    const tangentX = -radialZ;
    const tangentZ = radialX;
    let velocityX = radialX * this.ballRadialVelocity + tangentX * this.ballAngularVelocity * this.ballRadius;
    let velocityZ = radialZ * this.ballRadialVelocity + tangentZ * this.ballAngularVelocity * this.ballRadius;
    const colliderVelocityX = -Math.sin(angle) * colliderAngularVelocity * radius;
    const colliderVelocityZ = Math.cos(angle) * colliderAngularVelocity * radius;
    const relativeNormalVelocity = (velocityX - colliderVelocityX) * dx + (velocityZ - colliderVelocityZ) * dz;
    if (relativeNormalVelocity < 0) {
      const impulse = -(1 + restitution) * relativeNormalVelocity;
      velocityX += impulse * dx;
      velocityZ += impulse * dz;
      this.ballRadialVelocity = velocityX * radialX + velocityZ * radialZ;
      this.ballAngularVelocity = (velocityX * tangentX + velocityZ * tangentZ) / Math.max(0.2, this.ballRadius);
      this.recordCollision(Math.abs(relativeNormalVelocity));
    }
  }

  private recordCollision(intensity: number): void {
    if (this.collisionCooldown > 0) return;
    this.collisionCooldown = 0.045;
    this.collisionCount += 1;
    this.ballLiftVelocity = Math.max(this.ballLiftVelocity, Math.min(1.6, 0.35 + intensity * 0.14));
  }

  private updateBallTransform(delta: number): void {
    const height = this.surfaceHeight(this.ballRadius) + 0.16 + this.ballLift;
    this.ball.position.set(Math.cos(this.ballAngle) * this.ballRadius, height, Math.sin(this.ballAngle) * this.ballRadius);
    this.ball.rotation.x += delta * Math.max(5, Math.abs(this.ballAngularVelocity) * 2.2);
    this.ball.rotation.z += delta * Math.max(4, Math.abs(this.ballAngularVelocity) * 1.7);
    this.extraBalls.forEach((mesh, index) => {
      const offset = (index + 1) * 0.16;
      mesh.position.set(
        Math.cos(this.ballAngle + offset) * this.ballRadius,
        height + Math.sin(this.spinElapsed * 12 + index) * 0.045,
        Math.sin(this.ballAngle + offset) * this.ballRadius,
      );
    });
  }

  getSpinStage(): SpinStage {
    return this.spinStage;
  }

  getCollisionCount(): number {
    return this.collisionCount;
  }

  startExplosion(): void {
    this.explosionElapsed = 0;
    this.debris.forEach(({ mesh }) => this.scene.remove(mesh));
    this.debris.length = 0;
    for (let index = 0; index < 22; index += 1) {
      const mesh = new THREE.Mesh(new THREE.TetrahedronGeometry(0.06 + Math.random() * 0.12, 0), new THREE.MeshBasicMaterial({ color: index % 2 ? 0xe9a444 : 0xd8473f }));
      mesh.position.set((Math.random() - 0.5) * 5, 0.5 + Math.random() * 1.5, (Math.random() - 0.5) * 5);
      const velocity = new THREE.Vector3((Math.random() - 0.5) * 3, 1.4 + Math.random() * 3, (Math.random() - 0.5) * 3);
      this.debris.push({ mesh, velocity });
      this.scene.add(mesh);
    }
  }

  tickExplosion(delta: number): boolean {
    this.explosionElapsed += delta;
    const progress = Math.min(1, this.explosionElapsed / 1.05);
    this.wheel.position.y = -progress * 0.9;
    this.wheel.position.x = Math.sin(progress * Math.PI) * 0.22;
    this.wheel.rotation.z = progress * 0.45;
    this.wheel.scale.setScalar(1 + progress * 0.18);
    this.ball.visible = progress < 0.45;
    this.extraBalls.forEach((mesh) => { mesh.visible = false; });
    this.debris.forEach(({ mesh, velocity }) => {
      mesh.position.addScaledVector(velocity, delta);
      velocity.y -= delta * 2.4;
      mesh.rotation.x += delta * 7;
      mesh.rotation.z += delta * 5;
    });
    if (progress >= 1) {
      this.wheel.position.set(0, 0, 0);
      this.wheel.rotation.z = 0;
      this.wheel.scale.setScalar(1);
      this.debris.forEach(({ mesh }) => this.scene.remove(mesh));
      this.debris.length = 0;
      return true;
    }
    return false;
  }

  render(): void {
    this.renderer.render(this.scene, this.camera);
  }
}

let bankroll = INITIAL_BANKROLL;
let mana = 10;
let maxMana = 10;
let alertLevel = 0;
let successfulCheats = 0;
let phase: Phase = "betting";
let spinIndex = 0;
let pendingElapsed = 0;
let currentResults: number[] = [];
let lastResults: number[] = [];
let selectedDenomination = 10;
let selectedNumber = 7;
let doublePayout = false;
let ballCount = 1;
let timeScale = 1;
let slowUntil = 0;
let detectorJammedUntil = 0;
let cameraLoopUntil = 0;
let shadowUntil = 0;
let usedCheatThisSpin = false;
let cheatLocked = false;
let lockedNormalSpins = 0;
let detectorClock = 0;
let gameClock = 0;
let activeCast: CastAction | null = null;
let cameraMode: CameraMode = "CAM-A";
let displayedSpinStage: SpinStage = "idle";
let bets = new Map<string, Bet>();
let spellUse = new Map<string, { lastSpin: number; uses: number }>();
let roundBannerTimer: number | undefined;

const roulette = new RouletteVisual(threeRoot);

function createBetButton(label: string, type: BetType, key: string, extraClass = ""): string {
  return `<button class="bet-cell ${extraClass}" data-bet-type="${type}" data-bet-key="${key}" data-label="${label}">${label}<span class="chip-amount"></span></button>`;
}

function buildBoard(): void {
  numberGridEl.innerHTML = Array.from({ length: 36 }, (_, index) => {
    const number = index + 1;
    return createBetButton(String(number), "straight", String(number), colorClass(number));
  }).join("");
  outsideBoardEl.innerHTML = `
    <button class="bet-cell color-bet red" data-bet-type="red" data-bet-key="red" data-label="赤">
      <span class="color-name">赤</span><small>RED　配当 1 : 1</small><span class="chip-amount"></span>
    </button>
    <button class="bet-cell color-bet black" data-bet-type="black" data-bet-key="black" data-label="黒">
      <span class="color-name">黒</span><small>BLACK　配当 1 : 1</small><span class="chip-amount"></span>
    </button>
  `;
  denominationPickerEl.innerHTML = DENOMINATIONS.map((denom) => `<button class="denom ${denom === selectedDenomination ? "selected" : ""}" data-denom="${denom}">¥${denom}</button>`).join("");
  document.querySelectorAll<HTMLButtonElement>(".bet-cell").forEach((button) => {
    button.addEventListener("click", () => {
      const type = button.dataset.betType as BetType;
      const key = button.dataset.betKey ?? "";
      if (phase !== "betting") {
        toast("いまは賭けを変更できない。");
        return;
      }
      if (type === "straight") selectedNumber = Number(key);
      placeBet(type, key, button.dataset.label ?? key);
    });
  });
  document.querySelectorAll<HTMLButtonElement>(".denom").forEach((button) => {
    button.addEventListener("click", () => {
      selectedDenomination = Number(button.dataset.denom ?? 10);
      document.querySelectorAll(".denom").forEach((element) => element.classList.toggle("selected", element === button));
      toast(`${formatYen(selectedDenomination)}チップを選択`);
    });
  });
}

function placeBet(type: BetType, key: string, label: string): void {
  if (bankroll < selectedDenomination) {
    toast("そのチップを置く資金がない。");
    return;
  }
  bankroll -= selectedDenomination;
  const mapKey = `${type}:${key}`;
  const existing = bets.get(mapKey);
  if (existing) existing.amount += selectedDenomination;
  else bets.set(mapKey, { type, key, label, amount: selectedDenomination });
  const totalStake = [...bets.values()].reduce((sum, bet) => sum + bet.amount, 0);
  showRoundBanner("BET PLACED", label, `${formatYen(selectedDenomination)}追加 · 合計 ${formatYen(totalStake)}`, type === "red" ? "red" : type === "black" ? "black" : "neutral", 900);
  document.querySelectorAll(".bet-cell.just-bet").forEach((element) => element.classList.remove("just-bet"));
  const placedButton = [...document.querySelectorAll<HTMLButtonElement>(".bet-cell")].find((button) => button.dataset.betType === type && button.dataset.betKey === key);
  placedButton?.classList.add("just-bet");
  window.setTimeout(() => placedButton?.classList.remove("just-bet"), 520);
  setStatus(`${label}に${formatYen(selectedDenomination)}追加。合計${formatYen(totalStake)}。STARTで球を投入する。`);
  logEvent(`${label} に ${formatYen(selectedDenomination)} / チップを置いた`, "neutral");
  renderAll();
}

function clearBets(refund = true): void {
  if (refund) {
    bankroll += [...bets.values()].reduce((sum, bet) => sum + bet.amount, 0);
  }
  bets.clear();
  if (refund) showRoundBanner("BET CLEARED", "賭けを戻した", "次の賭けを選べます", "neutral", 900);
  renderAll();
}

function renderBoard(): void {
  document.querySelectorAll<HTMLButtonElement>(".bet-cell").forEach((button) => {
    const type = button.dataset.betType as BetType;
    const key = button.dataset.betKey ?? "";
    const bet = bets.get(`${type}:${key}`);
    const chip = button.querySelector<HTMLElement>(".chip-amount");
    button.classList.toggle("has-chip", Boolean(bet));
    button.disabled = phase !== "betting";
    if (chip) chip.textContent = bet ? formatYen(bet.amount) : "";
    const isWinning = lastResults.some((result) => betWins({ type, key, label: "", amount: 0 }, result));
    button.classList.toggle("winning", phase === "betting" && lastResults.length > 0 && isWinning);
  });
}

function renderMagicTray(): void {
  const nextUnlock = nextSkillThreshold(successfulCheats);
  const visibleSpells = SPELLS.filter((spell) => spellUnlocked(spell) || spell.unlock === nextUnlock);
  magicTrayEl.innerHTML = visibleSpells.map((spell) => {
    const unlocked = spellUnlocked(spell);
    const disabled = !unlocked || cheatLocked || phase === "caught" || phase === "won" || phase === "bankrupt" || (spell.id === "explode" && phase !== "pending");
    return `<button class="spell-button ${unlocked ? "unlocked" : "locked"} ${spell.id === "explode" ? "explosive" : ""}" data-spell-id="${spell.id}" ${disabled ? "disabled" : ""} title="${spell.description}"><span class="spell-glyph">${unlocked ? spellGlyph(spell.id) : "?"}</span><strong>${unlocked ? spell.short : "LOCKED"}</strong><small>${unlocked ? spell.gesture : `あと${Math.max(0, spell.unlock - successfulCheats)}回`}</small><i>${spell.mana}M</i></button>`;
  }).join("");
  magicTrayEl.querySelectorAll<HTMLButtonElement>(".spell-button.unlocked").forEach((button) => {
    button.addEventListener("click", () => {
      const spell = SPELLS.find((candidate) => candidate.id === button.dataset.spellId);
      if (spell) beginSpell(spell);
    });
  });
}

function spellGlyph(id: string): string {
  const glyphs: Record<string, string> = { color: "◈", explode: "✹", slow: "◌", sneeze: "◒", shift: "↝", "fake-signal": "⌁", number: "#", "camera-loop": "▣", duplicate: "Ⅱ", shadow: "☾", "double-payout": "×2", transfer: "⟲" };
  return glyphs[id] ?? "✦";
}

function phaseName(value: Phase): string {
  const labels: Record<Phase, string> = {
    betting: "賭けを選ぶ",
    spinning: "回転中",
    pending: "結果保留",
    exploding: "爆発中",
    caught: "発覚",
    won: "1億円達成",
    bankrupt: "破産",
  };
  return labels[value];
}

function setPhase(next: Phase): void {
  phase = next;
  viewportCard.dataset.phase = next;
  phaseLabelEl.textContent = `${phaseName(next)}　#${String(spinIndex).padStart(2, "0")}`;
}

function setStatus(message: string): void {
  statusMessageEl.textContent = message;
}

type RoundTone = "neutral" | "red" | "black" | "stop" | "win" | "lose";

function showRoundBanner(kicker: string, title: string, copy: string, tone: RoundTone, duration = 1400): void {
  if (roundBannerTimer !== undefined) window.clearTimeout(roundBannerTimer);
  roundKickerEl.textContent = kicker;
  roundTitleEl.textContent = title;
  roundCopyEl.textContent = copy;
  roundBannerEl.dataset.tone = tone;
  roundBannerEl.classList.remove("show");
  void roundBannerEl.offsetWidth;
  roundBannerEl.classList.add("show");
  if (duration > 0) {
    roundBannerTimer = window.setTimeout(() => {
      roundBannerEl.classList.remove("show");
      roundBannerTimer = undefined;
    }, duration);
  }
}

function showSpinStage(stage: SpinStage): void {
  if (stage === displayedSpinStage) return;
  displayedSpinStage = stage;
  const labels: Record<Exclude<SpinStage, "idle">, { title: string; status: string }> = {
    launch: { title: "● 球を投入", status: "球が発射台から外周レーンへ入った。" },
    orbit: { title: "● 外周を走行", status: "球が外周レールへ当たり、皿の上を逆方向へ走る。" },
    drop: { title: "● 皿を落下", status: "固定ピンに弾かれながら、傾斜した皿を内側へ落ちる。" },
    settle: { title: "● ポケットへ入る", status: "回転する仕切りに当たり、最後のポケットへ収まる。" },
  };
  if (stage === "idle") return;
  spinStageEl.textContent = labels[stage].title;
  setStatus(labels[stage].status);
  viewportCard.dataset.spinStage = stage;
}

function toast(message: string): void {
  sceneToastEl.textContent = message;
  sceneToastEl.classList.remove("show");
  requestAnimationFrame(() => sceneToastEl.classList.add("show"));
  window.setTimeout(() => sceneToastEl.classList.remove("show"), 2600);
}

function logEvent(message: string, tone: "neutral" | "good" | "bad" = "neutral"): void {
  const item = document.createElement("li");
  item.className = tone;
  item.innerHTML = `<span>${new Date().toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</span>${message}`;
  eventLogEl.prepend(item);
  while (eventLogEl.children.length > 5) eventLogEl.lastElementChild?.remove();
}

function safeWindow(): { safe: boolean; percent: number } {
  const period = 5;
  const safeDuration = Math.max(1.55, 3.45 - alertLevel * 0.17);
  const cycle = (gameClock % period) / period;
  const progress = Math.min(1, (cycle * period) / safeDuration);
  const pendingGraceDuration = 3;
  const pendingGrace = phase === "pending" && pendingElapsed < pendingGraceDuration;
  const cycleSafe = cycle * period < safeDuration;
  const safe = pendingGrace || detectorJammedUntil > gameClock || shadowUntil > gameClock || cycleSafe;
  const percent = pendingGrace
    ? Math.round(100 - (pendingElapsed / pendingGraceDuration) * 25)
    : safe
      ? Math.round(100 - progress * 45)
      : Math.round(Math.max(8, 38 - ((cycle * period - safeDuration) / (period - safeDuration)) * 30));
  return { safe, percent: Math.max(4, Math.min(98, percent)) };
}

function isWatched(): boolean {
  return !safeWindow().safe;
}

function canUseSpell(spell: Spell): boolean {
  if (!spellUnlocked(spell)) {
    toast(`この魔法はまだ眠っている。成功いかさま ${spell.unlock}回が必要。`);
    return false;
  }
  if (cheatLocked || alertLevel >= 10) {
    toast("警戒度10。しばらく普通のルーレットだけ。");
    return false;
  }
  if (mana < spell.mana) {
    toast("魔力が足りない。");
    return false;
  }
  const validPhase = spell.phase === "both" || (spell.phase === "spin" && phase === "spinning") || (spell.phase === "pending" && phase === "pending");
  if (!validPhase) {
    toast(spell.id === "explode" ? "盤が止まってから、3秒の間だけ。" : "今はその魔法を使うタイミングではない。");
    return false;
  }
  return true;
}

function beginSpell(spell: Spell): void {
  if (spell.id === "explode") {
    toast("杖をつかんで、ルーレット中央のピンへドラッグ。そこで2秒止める。");
    wandToolEl.classList.add("armed");
    return;
  }
  if (activeCast || !canUseSpell(spell)) return;
  if (isWatched()) {
    caught(`「${spell.label}」の発動瞬間を検知器に抜かれた。`);
    return;
  }
  mana -= spell.mana;
  activeCast = { spell, elapsed: 0, sourcePhase: phase };
  castProgressEl.classList.add("show");
  castLabelEl.textContent = `${spell.label} / ${spell.gesture}`;
  setStatus(`${spell.label}を仕込んでいる。視線を読む。`);
}

function updateCast(delta: number): void {
  if (!activeCast) return;
  if (isWatched()) {
    const label = activeCast.spell.label;
    activeCast = null;
    castProgressEl.classList.remove("show");
    caught(`「${label}」の詠唱中に視線が重なった。`);
    return;
  }
  activeCast.elapsed += delta;
  const progress = Math.min(1, activeCast.elapsed / activeCast.spell.cast);
  castFillEl.style.width = `${progress * 100}%`;
  if (progress >= 1) {
    const spell = activeCast.spell;
    activeCast = null;
    castProgressEl.classList.remove("show");
    applySpell(spell);
  }
}

function applySpell(spell: Spell): void {
  usedCheatThisSpin = true;
  switch (spell.id) {
    case "color":
      currentResults[0] = pickRedNumber();
      roulette.setTargetNumber(currentResults[0]);
      setStatus("黒いボールを赤のポケットへ塗り替えた。");
      break;
    case "slow":
      timeScale = 0.42;
      slowUntil = gameClock + 3;
      setStatus("時間をつまんだ。ボールが鈍くなった。");
      break;
    case "sneeze":
      detectorJammedUntil = Math.max(detectorJammedUntil, gameClock + 1.8);
      setStatus("ディーラーがくしゃみ。視線が一瞬だけ飛んだ。");
      break;
    case "shift":
      currentResults[0] = adjacentNumber(currentResults[0]);
      roulette.setTargetNumber(currentResults[0]);
      setStatus(`ポケットをずらした。行き先は ${currentResults[0]}。`);
      break;
    case "fake-signal":
      detectorJammedUntil = Math.max(detectorJammedUntil, gameClock + 3.5);
      setStatus("検知器に緑の嘘を流した。");
      break;
    case "number":
      currentResults[0] = selectedNumber;
      roulette.setTargetNumber(currentResults[0]);
      setStatus(`数字を ${selectedNumber} に書き換えた。`);
      break;
    case "camera-loop":
      cameraLoopUntil = Math.max(cameraLoopUntil, gameClock + 3);
      setStatus("CAMの映像を3秒前へ戻した。");
      break;
    case "duplicate":
      ballCount = 2;
      currentResults = [currentResults[0], adjacentNumber(currentResults[0])];
      roulette.setResults(currentResults);
      setStatus("ボールが2個に増えた。数字が二つ走る。");
      break;
    case "shadow":
      shadowUntil = Math.max(shadowUntil, gameClock + 3.5);
      setStatus("影が代わりに詠唱している。");
      break;
    case "double-payout":
      doublePayout = true;
      setStatus("今回の配当欄に、もう一枚の影を重ねた。");
      break;
    case "transfer":
      currentResults[0] = pickWinningNumber();
      roulette.setTargetNumber(currentResults[0]);
      setStatus(`別の結果を転送。${currentResults[0]}へ寄せた。`);
      break;
  }
  registerSuccessfulCheat(spell);
  roulette.setResults(currentResults);
  renderAll();
}

function registerSuccessfulCheat(spell: Spell): void {
  successfulCheats += 1;
  const previous = spellUse.get(spell.id);
  const repeated = previous && spinIndex - previous.lastSpin <= 3;
  const uses = repeated ? previous.uses + 1 : 1;
  const repeatPenalty = uses === 1 ? 0 : uses === 2 ? 2 : 4;
  spellUse.set(spell.id, { lastSpin: spinIndex, uses });
  alertLevel = Math.min(10, alertLevel + spell.baseAlert + repeatPenalty);
  if (alertLevel >= 10) {
    cheatLocked = true;
    logEvent(`警戒度10 / ${spell.label}の痕跡で全魔法ロック`, "bad");
    setStatus("警戒度10。普通のスピンを3回こなすしかない。");
  } else {
    logEvent(`${spell.label} 成功 / 熟練度 +1${repeatPenalty ? ` / 同じ魔法 +${repeatPenalty}` : ""}`, "good");
    toast(`${spell.label} 成功。熟練度 ${successfulCheats}`);
  }
  if (successfulCheats === 3 || successfulCheats === 8 || successfulCheats === 15 || successfulCheats === 25 || successfulCheats === 40) {
    toast(`新しい魔法を覚えた。熟練ランク ${skillRank(successfulCheats)}`);
    logEvent(`熟練ランク ${skillRank(successfulCheats)} / 魔法が増えた`, "good");
  }
}

interface WandDragState {
  active: boolean;
  holding: boolean;
  atPin: boolean;
  holdElapsed: number;
}

const wandDrag: WandDragState = { active: false, holding: false, atPin: false, holdElapsed: 0 };

function pointerNearPin(event: PointerEvent): boolean {
  const target = pinTargetEl.getBoundingClientRect();
  const x = event.clientX - (target.left + target.width / 2);
  const y = event.clientY - (target.top + target.height / 2);
  return Math.hypot(x, y) < Math.max(68, target.width * 0.7);
}

wandToolEl.addEventListener("pointerdown", (event) => {
  if (phase !== "pending" || cheatLocked || !spellUnlocked(SPELLS[1]) || mana < SPELLS[1].mana) {
    toast(cheatLocked ? "警戒度10。杖も眠っている。" : "杖は、数字が止まってから使える。");
    return;
  }
  if (isWatched()) {
    caught("杖をつかんだ瞬間を見られた。");
    return;
  }
  wandDrag.active = true;
  wandDrag.holding = false;
  wandDrag.atPin = false;
  wandDrag.holdElapsed = 0;
  wandToolEl.setPointerCapture(event.pointerId);
  wandToolEl.classList.add("dragging");
  toast("中央のピンへ運ぶ。そこで離さない。");
});

wandToolEl.addEventListener("pointermove", (event) => {
  if (!wandDrag.active) return;
  wandDrag.atPin = pointerNearPin(event);
  wandDrag.holding = wandDrag.atPin;
  pinTargetEl.classList.toggle("hot", wandDrag.atPin);
  wandToolEl.classList.toggle("at-pin", wandDrag.atPin);
});

function cancelWandDrag(): void {
  wandDrag.active = false;
  wandDrag.holding = false;
  wandDrag.atPin = false;
  wandDrag.holdElapsed = 0;
  wandToolEl.classList.remove("dragging", "at-pin", "armed");
  pinTargetEl.classList.remove("hot");
}

wandToolEl.addEventListener("pointerup", cancelWandDrag);
wandToolEl.addEventListener("pointercancel", cancelWandDrag);

function updateWandHold(delta: number): void {
  if (!wandDrag.active || !wandDrag.holding || phase !== "pending") return;
  if (isWatched()) {
    cancelWandDrag();
    caught("中央ピンへ杖を押しつけているところを見られた。");
    return;
  }
  wandDrag.holdElapsed += delta;
  const progress = Math.min(1, wandDrag.holdElapsed / 2);
  wandToolEl.style.setProperty("--hold", `${progress * 100}%`);
  if (progress >= 1) {
    cancelWandDrag();
    triggerExplosion();
  }
}

function triggerExplosion(): void {
  const spell = SPELLS.find((candidate) => candidate.id === "explode");
  if (!spell || !canUseSpell(spell)) return;
  mana -= spell.mana;
  usedCheatThisSpin = true;
  registerSuccessfulCheat(spell);
  setPhase("exploding");
  roulette.startExplosion();
  showRoundBanner("MAGIC", "BOOM", "この結果を無効化 · 同じ賭けで再スピン", "stop", 1250);
  setStatus("盤面を爆破。結果はまだ確定していない。");
  pendingReadoutEl.classList.remove("show");
  logEvent("爆発リセット / 盤面を一度なかったことにした", "good");
  renderAll();
}

function startSpin(): void {
  if (phase !== "betting") return;
  const totalBet = [...bets.values()].reduce((sum, bet) => sum + bet.amount, 0);
  if (totalBet <= 0) {
    toast("先に下段の賭け盤へチップを置く。");
    return;
  }
  spinIndex += 1;
  currentResults = [randomNumber()];
  lastResults = [];
  ballCount = 1;
  doublePayout = false;
  usedCheatThisSpin = false;
  pendingElapsed = 0;
  displayedSpinStage = "idle";
  spinStageEl.textContent = "● 球を投入";
  spinStageEl.dataset.contacts = "0";
  viewportCard.dataset.collisions = "0";
  setPhase("spinning");
  roulette.startSpin(currentResults[0], 1);
  showRoundBanner(`ROUND ${String(spinIndex).padStart(2, "0")}`, "START", `賭け金 ${formatYen(totalBet)} · 球を投入`, "neutral", 1200);
  setStatus(cheatLocked ? "魔法はロック中。球の行方を見届ける。" : "球を投入。安全表示が緑なら魔法を使える。");
  logEvent(`SPIN ${String(spinIndex).padStart(2, "0")} / ボールが走り出した`, "neutral");
  renderAll();
}

function completeSpin(): void {
  setPhase("pending");
  pendingElapsed = 0;
  roulette.setResults(currentResults);
  pendingReadoutEl.classList.add("show");
  pinTargetEl.classList.add("available");
  spinStageEl.textContent = `${currentResults[0]}　${colorLabel(currentResults[0])}`;
  const resultTone: RoundTone = currentResults[0] === 0 ? "stop" : isRed(currentResults[0]) ? "red" : "black";
  showRoundBanner("STOP", `${currentResults[0]}  ${colorLabel(currentResults[0])}`, "3秒後に確定 · 今なら爆破できる", resultTone, 1300);
  setStatus(`数字 ${currentResults[0]}。3秒だけ、まだ嘘が間に合う。`);
  logEvent(`結果停止 / ${currentResults.join(" + ")} / 確定まで3秒`, "neutral");
  renderAll();
}

function settleResult(): void {
  if (phase !== "pending") return;
  lastResults = [...currentResults];
  const payoutMultiplier = doublePayout ? 2 : 1;
  let returned = 0;
  for (const bet of bets.values()) {
    const hits = currentResults.filter((result) => betWins(bet, result)).length;
    if (hits > 0) returned += bet.amount * hits + bet.amount * payoutFor(bet.type) * hits * payoutMultiplier;
  }
  bankroll += returned;
  const totalStake = [...bets.values()].reduce((sum, bet) => sum + bet.amount, 0);
  const net = returned - totalStake;
  const winningLabel = currentResults.join(" / ");
  if (returned > 0) {
    showRoundBanner("ROUND END", `WIN +${formatYen(Math.max(0, net))}`, `${winningLabel} ${colorLabel(currentResults[0])} · 払戻 ${formatYen(returned)}`, "win", 2400);
    logEvent(`${winningLabel} / 払い戻し ${formatYen(returned)} / 純利益 ${formatYen(net)}`, "good");
    setStatus(`結果確定。${formatYen(returned)}が戻った。`);
  } else {
    showRoundBanner("ROUND END", `LOSE −${formatYen(totalStake)}`, `${winningLabel} ${colorLabel(currentResults[0])} · 次の賭けへ`, "lose", 2400);
    logEvent(`${winningLabel} / 外れ。通常の負けとして続行`, "bad");
    setStatus("外れた。でもGame Overではない。次の賭けを置ける。");
  }
  bets.clear();
  pendingReadoutEl.classList.remove("show");
  pinTargetEl.classList.remove("available");
  if (cheatLocked && !usedCheatThisSpin) {
    lockedNormalSpins += 1;
    alertLevel = Math.max(4, 10 - lockedNormalSpins * 2);
    if (lockedNormalSpins >= 3) {
      cheatLocked = false;
      lockedNormalSpins = 0;
      logEvent("通常スピン3回完了 / 魔法が警戒度4で再解禁", "good");
      setStatus("警戒が冷めた。魔法が戻った。");
    }
  } else if (!usedCheatThisSpin) {
    alertLevel = Math.max(0, alertLevel - 1);
  }
  setPhase("betting");
  if (bankroll >= WIN_TARGET) {
    setPhase("won");
    openModal("WIN", "THE TABLE FINALLY BLINKED", `¥1,000から${formatYen(bankroll)}へ。あなたは1億円の線を越えた。`, "win");
  } else if (bankroll <= 0) {
    setPhase("bankrupt");
    openModal("BUST", "THE HOUSE KEPT THE LAST CHIP", "所持金が0円になった。もう一度、1,000円から始めよう。", "loss");
  }
  renderAll();
}

function caught(reason: string): void {
  activeCast = null;
  castProgressEl.classList.remove("show");
  setPhase("caught");
  setStatus("CAUGHT。発動の瞬間を見られた。");
  logEvent(reason, "bad");
  openModal("CAUGHT", "THE TABLE SAW YOU", `${reason} 警戒度が高くても、見られた瞬間は一発で終わる。`, "loss");
  renderAll();
}

function openModal(stamp: string, title: string, copy: string, mode: "win" | "loss"): void {
  modalStampEl.textContent = stamp;
  modalStampEl.className = `modal-stamp ${mode}`;
  modalTitleEl.textContent = title;
  modalCopyEl.textContent = copy;
  modalLayerEl.classList.remove("hidden");
}

function renderAll(): void {
  viewportCard.dataset.phase = phase;
  const totalStake = [...bets.values()].reduce((sum, bet) => sum + bet.amount, 0);
  bankrollEl.textContent = formatYen(bankroll);
  totalBetEl.textContent = formatYen(totalStake);
  manaEl.textContent = `${mana} / ${maxMana}`;
  alertEl.textContent = `${alertLevel} / 10`;
  alertEl.classList.toggle("danger", alertLevel >= 8);
  skillCountEl.textContent = String(successfulCheats);
  const next = nextSkillThreshold(successfulCheats);
  skillNextEl.textContent = next ? `次 ${next}` : "全習得";
  phaseLabelEl.textContent = `${phaseName(phase)}　#${String(spinIndex).padStart(2, "0")}`;
  spinButtonEl.disabled = phase !== "betting" || bets.size === 0 || bankroll <= 0;
  spinButtonEl.textContent = bets.size === 0 ? "賭けると START" : `${cheatLocked ? "普通に回す" : "START"} · ${formatYen(totalStake)}`;
  clearBetsButtonEl.disabled = phase !== "betting" || bets.size === 0;
  controlCardEl.dataset.locked = phase === "betting" ? "false" : "true";
  const betLabels = [...bets.values()].map((bet) => bet.label);
  betSummaryEl.textContent = bets.size === 0 ? "賭けなし" : bets.size === 1 ? `${betLabels[0]} ${formatYen(totalStake)}` : `${bets.size}か所 ${formatYen(totalStake)}`;
  betSummaryEl.dataset.active = bets.size > 0 ? "true" : "false";
  document.querySelectorAll<HTMLButtonElement>(".denom").forEach((button) => { button.disabled = phase !== "betting"; });
  if (lastResults.length > 0) {
    const result = lastResults[0];
    lastResultEl.textContent = `前回 ${result}・${colorLabel(result)}`;
    lastResultEl.dataset.color = colorClass(result);
  } else {
    lastResultEl.textContent = "前回 —";
    delete lastResultEl.dataset.color;
  }
  renderBoard();
  renderMagicTray();
}

function updateDetector(): void {
  const signal = safeWindow();
  const jammed = detectorJammedUntil > gameClock || shadowUntil > gameClock;
  safeReadoutEl.classList.toggle("watched", !signal.safe && !jammed);
  safeLabelEl.textContent = jammed ? "偽装中" : signal.safe ? "安全" : "監視中";
  safeMeterEl.textContent = `${signal.percent}%`;
  detectorStateEl.textContent = jammed ? "JAMMED" : signal.safe ? "SAFE" : "CAUGHT ZONE";
  detectorStateEl.className = signal.safe || jammed ? "safe" : "danger";
  detectorFillEl.style.width = `${signal.percent}%`;
  detectorBeamEl.style.transform = `rotate(${(gameClock * 110) % 360}deg)`;
  detectorNoteEl.textContent = cameraLoopUntil > gameClock ? "CAM映像がループしている。音だけが現在。" : cheatLocked ? "魔法ロック中。緑を見ても、いまは普通に賭ける。" : "検知器を見るほど、次の安全時間が読める。";
}

function updatePending(delta: number): void {
  if (phase !== "pending") return;
  if (wandDrag.active && wandDrag.holding) return;
  pendingElapsed += delta;
  const remaining = Math.max(0, 3 - pendingElapsed);
  pendingTimerEl.textContent = remaining.toFixed(1);
  if (remaining <= 0) settleResult();
}

function updateScenePhase(delta: number): void {
  if (phase === "spinning") {
    if (gameClock > slowUntil) timeScale = 1;
    const completed = roulette.tickSpin(delta * timeScale);
    const contacts = roulette.getCollisionCount();
    viewportCard.dataset.collisions = String(contacts);
    spinStageEl.dataset.contacts = String(contacts);
    showSpinStage(roulette.getSpinStage());
    if (completed) completeSpin();
  } else if (phase === "exploding") {
    if (roulette.tickExplosion(delta)) {
      currentResults = [randomNumber()];
      ballCount = 1;
      doublePayout = false;
      usedCheatThisSpin = false;
      spinIndex += 1;
      displayedSpinStage = "idle";
      spinStageEl.textContent = "● 球を再投入";
      setPhase("spinning");
      roulette.startSpin(currentResults[0], 1);
      showRoundBanner("RESULT VOID", "RE-SPIN", "同じ賭けを保持 · 球を再投入", "neutral", 1300);
      pendingReadoutEl.classList.remove("show");
      setStatus("煙が晴れた。まだ同じ賭けで回せる。");
      logEvent("爆発後 / 盤面復旧 / 再スピン", "good");
    }
  }
}

document.querySelectorAll<HTMLButtonElement>(".camera-tab").forEach((button) => {
  button.addEventListener("click", () => {
    cameraMode = button.dataset.camera as CameraMode;
    roulette.setCamera(cameraMode);
    document.querySelectorAll(".camera-tab").forEach((element) => element.classList.toggle("active", element === button));
    const labels: Record<CameraMode, string> = { "CAM-A": "CAM-A / TABLE", "CAM-B": "CAM-B / DETECTOR", "CAM-C": "CAM-C / DEALER", "CAM-D": "CAM-D / CEILING" };
    cameraLabelEl.textContent = labels[cameraMode];
  });
});

spinButtonEl.addEventListener("click", startSpin);
clearBetsButtonEl.addEventListener("click", () => clearBets(true));
restartButtonEl.addEventListener("click", () => window.location.reload());

buildBoard();
renderAll();
showRoundBanner("PLACE YOUR BET", "赤か黒を選ぶ", "チップを置くとSTARTできます", "neutral", 2200);
logEvent("テーブル接続 / 所持金 ¥1,000", "neutral");
logEvent("ランク0 / 黒→赤 と 爆発リセットを覚えている", "good");

let previousTime = performance.now();
function animate(now: number): void {
  const delta = Math.min(0.05, Math.max(0, (now - previousTime) / 1000));
  previousTime = now;
  gameClock += delta;
  detectorClock += delta;
  updateCast(delta);
  updateWandHold(delta);
  updatePending(delta);
  updateScenePhase(delta);
  updateDetector();
  if (phase === "pending") pendingReadoutEl.classList.add("show");
  if (phase !== "pending") pendingReadoutEl.classList.remove("show");
  roulette.render();
  requestAnimationFrame(animate);
}
requestAnimationFrame(animate);
