import Phaser from 'phaser'
import { fetchLeaderboard, loadPlayerName, recordReferralVisit, savePlayerName, submitScore, type LeaderboardEntry } from './firebase'
import './style.css'

const WORLD_WIDTH = 2600
const WORLD_HEIGHT = 1800
const PLAYER_MAX_HP = 8
const CELL_SIZE = 160
const RANGE_BUFF = 1.4
const FIRE_RATE_BUFF = 1.2
const MANUAL_AIM_DEADZONE = 36
const MELEE_TRIGGER_RADIUS = 144
const PLAYER_DISPLAY_SIZE = 58
const ITEM_DROP_SIZE = PLAYER_DISPLAY_SIZE * 1.5
const MAX_UPGRADE_LEVEL = 3
const BOSS_SPAWN_SECONDS = 180
const LEVEL_CRUMB_START = 8
const LEVEL_CRUMB_INCREMENT = 2
const SE_VOLUME_KEY = 'eraser-survivor-se-volume'
const BGM_VOLUME_KEY = 'eraser-survivor-bgm-volume'
const VOICE_VOLUME_KEY = 'eraser-survivor-voice-volume'
const MAP_ZOOM_KEY = 'eraser-survivor-map-zoom'
const AUTO_AIM_KEY = 'eraser-survivor-auto-aim'
const HIGH_SCORE_KEY = 'eraser-survivor-high-score'
const DESKTOP_HINT_KEY = 'eraser-survivor-desktop-hint-dismissed'
const FUSION_CODEX_KEY = 'eraser-survivor-fusion-codex'
const HOW_TO_SEEN_KEY = 'eraser-survivor-how-to-seen'
const LAST_RUN_STATE_KEY = 'eraser-survivor-last-run-state'
const LAST_ERROR_KEY = 'eraser-survivor-last-error'
const PAGE_SESSION_KEY = 'eraser-survivor-page-session'
const LEADERBOARD_CACHE_KEY = 'eraser-survivor-leaderboard-cache'
const LEADERBOARD_CACHE_MS = 24 * 60 * 60 * 1000
const NORMAL_CRUMB_VALUE = 1
const BOSS_MINION_CRUMB_VALUE = 1
const MAX_ENEMIES_DESKTOP = 190
const MAX_ENEMIES_TOUCH = 110
const MAX_BULLETS_DESKTOP = 260
const MAX_BULLETS_TOUCH = 190
const MAX_CRUMBS_DESKTOP = 115
const MAX_CRUMBS_TOUCH = 72
const CRUMB_ATTRACT_MULTIPLIER = 1.05
const PENCIL_BOSS_HP = 5200
const PENCIL_BOSS_KNOCKBACK_RATE = 0.08
const SLOW_FRAME_WARN_MS = 700
const SLOW_FRAME_STOP_MS = 1600
const SLOW_FRAME_STOP_COUNT = 3
const ACTIVE_OBJECT_STOP_DESKTOP = 1800
const ACTIVE_OBJECT_STOP_TOUCH = 1200
const SPAWN_TARGET_BASE = 16
const SPAWN_TARGET_PER_WAVE = 2
const SPAWN_INTERVAL_BASE = 2.45
const SPAWN_INTERVAL_MIN = 1.28
const SPAWN_INTERVAL_WAVE_REDUCTION = 0.018
const BGM_SOURCES: Record<BgmKey, string> = {
  'bgm-main': '/assets/audio/bgm-shinnyuusakusen.mp3',
  'bgm-title': '/assets/audio/bgm-title-maou-8bit22.mp3',
  'bgm-boss': '/assets/audio/bgm-boss-maou-theme02-1m23.mp3',
  'bgm-codex': '/assets/audio/bgm-codex-maou-event34.mp3',
}
const TITLE_CALL_KEYS = [
  'se-title-call-01',
  'se-title-call-02',
  'se-title-call-03',
  'se-title-call-04',
  'se-title-call-05',
  'se-title-call-06',
  'se-title-call-07',
  'se-title-call-08',
] as const
const TITLE_CALL_PRIMARY_KEY: TitleCallKey = 'se-title-call-01'
const TITLE_CALL_SECONDARY_KEY: TitleCallKey = 'se-title-call-05'
const TITLE_CALL_JOKE_KEYS: readonly TitleCallKey[] = [
  'se-title-call-02',
  'se-title-call-03',
  'se-title-call-04',
  'se-title-call-06',
  'se-title-call-07',
  'se-title-call-08',
]

type EnemyKind = '兵' | '槍' | '弓' | '盾' | '馬' | '龖' | '龍'
type WeaponId = 'bullet' | 'sniper' | 'shotgun' | 'machinegun' | 'cannon' | 'compass'
type UpgradeId = 'melee' | WeaponId | 'bowGuard'
type DamageSource = 'melee' | BulletVisual | 'compass' | 'item' | 'contact'
type FusionId =
  | 'machinegun-pierce'
  | 'machinegun-big'
  | 'machinegun-spread'
  | 'machinegun-power'
  | 'sniper-rapid'
  | 'sniper-big'
  | 'sniper-spread'
  | 'sniper-power'
  | 'cannon-rapid'
  | 'cannon-big'
  | 'cannon-spread'
  | 'cannon-power'
  | 'cannon-compass'
  | 'shotgun-rapid'
  | 'shotgun-pierce'
  | 'shotgun-big'
  | 'shotgun-power'
  | 'compass-big'
  | 'compass-power'
  | 'anti-bow-missile'
type BulletVisual = 'bullet' | 'sniper' | 'shotgun' | 'machinegun' | 'cannon'
type BgmKey = 'bgm-main' | 'bgm-title' | 'bgm-boss' | 'bgm-codex'
type TitleCallKey = (typeof TITLE_CALL_KEYS)[number]
type BulletBody = Phaser.GameObjects.Image
type AntiBowTarget = { x: number; y: number; distance: number }
type LevelChoice =
  | { type: 'upgrade'; id: UpgradeId; name: string }
  | { type: 'fusion'; id: FusionId; name: string; description: string }
type ItemKind =
  | 'multishot'
  | 'range'
  | 'bucket-gray'
  | 'bucket-gold'
  | 'glue-gray'
  | 'glue-gold'
  | 'stapler-gray'
  | 'stapler-gold'
  | 'gold-crumb'
  | 'heal'

type Enemy = {
  id: number
  text: Phaser.GameObjects.Text
  kind: EnemyKind
  hp: number
  maxHp: number
  speed: number
  radius: number
  phase: number
  cooldown: number
  windup: number
  boss: boolean
  slowUntil: number
  stapledUntil: number
  glueFx: Phaser.GameObjects.Image | null
  stapleFx: Phaser.GameObjects.Container | null
  dropsLoot: boolean
}

type PendingEnemyDamage = {
  enemy: Enemy
  damage: number
  knockback: number
  source: DamageSource
}

type PencilBoss = {
  body: Phaser.GameObjects.Image
  healthBack: Phaser.GameObjects.Rectangle
  healthFill: Phaser.GameObjects.Rectangle
  hp: number
  maxHp: number
  radius: number
  walkCooldown: number
  walkTime: number
  summonCooldown: number
}

type Bullet = {
  body: BulletBody
  velocity: Phaser.Math.Vector2
  speed: number
  damage: number
  source: DamageSource
  radius: number
  life: number
  pierce: number
  knockback: number
  spin: number
  trailTimer: number
  hitIds: Set<number>
  targetKind?: EnemyKind
  homing?: boolean
  antiBow?: boolean
  ignoreShield?: boolean
}

type Hazard = {
  body: Phaser.GameObjects.GameObject & { x: number; y: number; destroy: () => void }
  velocity: Phaser.Math.Vector2
  radius: number
  life: number
  rangeLeft: number
  kind: 'spear' | 'bow'
}

type Crumb = {
  body: Phaser.GameObjects.Image
  value: number
  scoreValue: number
  radius: number
}

type CompassBit = {
  body: Phaser.GameObjects.Image
  trailTimer: number
  hitCooldowns: Map<number, number>
}

type ItemDrop = {
  body: Phaser.GameObjects.Image
  kind: ItemKind
  radius: number
}

type ItemDefinition = {
  key: string
  label: string
  tier: 'gray' | 'gold'
}

type RoundAction = 'retry' | 'title'

function detectPageLoadCause() {
  const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined
  const wasDiscarded = Boolean((document as Document & { wasDiscarded?: boolean }).wasDiscarded)
  let sameTabSession = false
  try {
    sameTabSession = sessionStorage.getItem(PAGE_SESSION_KEY) === 'active'
    sessionStorage.setItem(PAGE_SESSION_KEY, 'active')
  } catch {
    // Session storage is optional; navigation timing still provides useful evidence.
  }
  return {
    navigationType: navigation?.type ?? 'unknown',
    wasDiscarded,
    sameTabSession,
  }
}

const PAGE_LOAD_CAUSE = detectPageLoadCause()

type Upgrade = {
  id: UpgradeId
  name: string
}

const UPGRADES: Record<UpgradeId, Upgrade> = {
  melee: { id: 'melee', name: '通常攻撃' },
  bullet: { id: 'bullet', name: '消しゴム弾丸' },
  sniper: { id: 'sniper', name: 'スナイパー弾' },
  shotgun: { id: 'shotgun', name: '消しゴム散弾' },
  machinegun: { id: 'machinegun', name: 'マシンガン' },
  cannon: { id: 'cannon', name: '消しゴム大砲' },
  compass: { id: 'compass', name: '消しゴムコンパス' },
  bowGuard: { id: 'bowGuard', name: '弓ガード' },
}

const FUSIONS: Record<FusionId, { name: string; requires: [UpgradeId, UpgradeId]; description: string; hidden?: boolean }> = {
  'machinegun-pierce': { name: 'マシンガン貫通', requires: ['machinegun', 'sniper'], description: 'マシンガンが完全貫通する' },
  'machinegun-big': { name: 'マシンガン大砲サイズ', requires: ['machinegun', 'cannon'], description: 'マシンガン弾が大砲と同じサイズになる' },
  'machinegun-spread': { name: 'マシンガン散射', requires: ['machinegun', 'shotgun'], description: '散弾LV3相当の8発を細く拡散して連射する' },
  'machinegun-power': { name: 'マシンガンダメ13', requires: ['machinegun', 'melee'], description: 'マシンガンの威力が13になる' },
  'sniper-rapid': { name: 'スナイパー連射', requires: ['sniper', 'machinegun'], description: 'マシンガン並みの連射速度になる' },
  'sniper-big': { name: 'スナイパー大砲サイズ', requires: ['sniper', 'cannon'], description: 'スナイパー弾が大砲と同じサイズになる' },
  'sniper-spread': { name: 'スナイパー散射', requires: ['sniper', 'shotgun'], description: '散弾LV3相当の8発を並列に撃つ' },
  'sniper-power': { name: 'スナイパー衝撃', requires: ['sniper', 'melee'], description: '威力50のままノックバックを強化する' },
  'cannon-rapid': { name: '大砲連射', requires: ['cannon', 'machinegun'], description: 'マシンガン並みの連射速度になる' },
  'cannon-big': { name: '大砲ダメージ2倍', requires: ['cannon', 'sniper'], description: '大砲ダメージを15→30へ' },
  'cannon-spread': { name: '大砲拡散', requires: ['cannon', 'shotgun'], description: '散弾LV3相当の8方向へ撃つ' },
  'cannon-power': { name: '大砲ダメ40', requires: ['cannon', 'melee'], description: '大砲の威力が40になる' },
  'cannon-compass': { name: 'コンパス大砲サイズ', requires: ['cannon', 'compass'], description: 'コンパス弾が大砲サイズになる' },
  'shotgun-rapid': { name: '散弾連射', requires: ['shotgun', 'machinegun'], description: 'マシンガン並みの連射速度になる' },
  'shotgun-pierce': { name: '散弾貫通', requires: ['shotgun', 'sniper'], description: '散弾が完全貫通する' },
  'shotgun-big': { name: '散弾大砲サイズ', requires: ['shotgun', 'cannon'], description: '散弾が大砲と同じサイズになる' },
  'shotgun-power': { name: '散弾ダメ20', requires: ['shotgun', 'melee'], description: '散弾の威力が20になる' },
  'compass-big': { name: 'コンパス大砲サイズ', requires: ['compass', 'cannon'], description: 'コンパスの周回弾が大きくなる' },
  'compass-power': { name: 'コンパスダメ10', requires: ['compass', 'melee'], description: 'コンパスの威力が10になる' },
  'anti-bow-missile': { name: '貫通ホーミングミサイル', requires: ['melee', 'bullet'], description: '威力50。全敵を追尾し、盾の軽減を貫通。1体に命中すると消える', hidden: true },
}

const RESULT_TIPS = [
  'スコア600点を越えるとランキングの表示が変わるよ！',
  '合成次第でホーミングミサイルなんてものができるらしい？？',
  'ライフ残数でボーナスが変動するよ！満タンだと更にボーナス！',
  'クリア時間が短ければ短いほどボーナス！最速を叩き出せ！',
  'ボイスは友達です♯',
  'タイトル画面のBGM、良いよね。無限に聴けちゃう♪',
  'よかったら図鑑コンプを目指してみてね！',
  '通常攻撃とスナイパー弾は盾を貫通するよ！',
  '弓ガード中もコンパスは攻撃できるよ！',
  '合成候補は通常の4択に追加されるよ。候補をよく見て選ぼう！',
]

const ITEM_DEFS: Record<ItemKind, ItemDefinition> = {
  multishot: { key: 'item-multishot', label: '増弾丸', tier: 'gray' },
  range: { key: 'item-range', label: '射程アップ', tier: 'gray' },
  'bucket-gray': { key: 'item-bucket-gray', label: 'インク爆弾', tier: 'gray' },
  'bucket-gold': { key: 'item-bucket-gold', label: '金インク爆弾', tier: 'gold' },
  'glue-gray': { key: 'item-glue-gray', label: 'のり', tier: 'gray' },
  'glue-gold': { key: 'item-glue-gold', label: '金のり', tier: 'gold' },
  'stapler-gray': { key: 'item-stapler-gray', label: 'ホッチキス', tier: 'gray' },
  'stapler-gold': { key: 'item-stapler-gold', label: '金ホッチキス', tier: 'gold' },
  'gold-crumb': { key: 'item-gold-crumb', label: '金の消しカス', tier: 'gold' },
  heal: { key: 'item-heal', label: 'ライフ回復', tier: 'gray' },
}

const ENEMY_HP: Record<EnemyKind, number> = {
  '兵': 10,
  '槍': 15,
  '弓': 30,
  '盾': 30,
  '馬': 10,
  '龖': 50,
  '龍': 50,
}

const MELEE_DAMAGE = [0, 5, 15, 20]
const BULLET_DAMAGE = [0, 5, 10, 15]
const SNIPER_DAMAGE = [0, 50, 50, 50]
const SHOTGUN_DAMAGE = [0, 5, 10, 15]
const MACHINEGUN_DAMAGE = [0, 4, 6, 8]
const CANNON_DAMAGE = [0, 10, 15, 15]
const COMPASS_DAMAGE = [0, 5, 5, 5]
const COMPASS_COUNT = [0, 2, 4, 6]
const MACHINEGUN_FIRE_INTERVAL = 0.07
const SHOTGUN_FUSION_SHOT_COUNT = 8
const CANNON_FUSION_RADIUS = 40
const SPEAR_ATTACK_TRIGGER_RANGE = 368
const SPEAR_COOLDOWN = 2.35
const SPEAR_THRUST_DISTANCE = 138
const SPEAR_THRUST_DURATION = 300
const HOMING_MISSILE_DAMAGE = 50
const BULLET_VISUALS: Record<BulletVisual, { key: string; width: number; height: number; baseRadius: number }> = {
  bullet: { key: 'bullet-blue', width: 34, height: 10, baseRadius: 9 },
  shotgun: { key: 'bullet-red', width: 24, height: 6, baseRadius: 5 },
  machinegun: { key: 'bullet-orange', width: 28, height: 8, baseRadius: 4 },
  sniper: { key: 'bullet-purple', width: 42, height: 7, baseRadius: 8 },
  cannon: { key: 'bullet-black', width: 52, height: 25, baseRadius: 19 },
}

class SpatialGrid<T extends { x: number; y: number }> {
  private cells = new Map<string, T[]>()

  clear() {
    this.cells.clear()
  }

  add(item: T) {
    const key = this.key(item.x, item.y)
    const cell = this.cells.get(key)
    if (cell) cell.push(item)
    else this.cells.set(key, [item])
  }

  query(x: number, y: number, radius: number) {
    const found: T[] = []
    const minX = Math.floor((x - radius) / CELL_SIZE)
    const maxX = Math.floor((x + radius) / CELL_SIZE)
    const minY = Math.floor((y - radius) / CELL_SIZE)
    const maxY = Math.floor((y + radius) / CELL_SIZE)
    for (let cy = minY; cy <= maxY; cy += 1) {
      for (let cx = minX; cx <= maxX; cx += 1) {
        const cell = this.cells.get(`${cx},${cy}`)
        if (cell) found.push(...cell)
      }
    }
    return found
  }

  private key(x: number, y: number) {
    return `${Math.floor(x / CELL_SIZE)},${Math.floor(y / CELL_SIZE)}`
  }
}

class EraserSurvivorScene extends Phaser.Scene {
  private player!: Phaser.GameObjects.Image
  private aimMarker!: Phaser.GameObjects.Image
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys
  private keys!: Record<string, Phaser.Input.Keyboard.Key>
  private graphics!: Phaser.GameObjects.Graphics
  private collectGraphics!: Phaser.GameObjects.Graphics
  private enemies: Enemy[] = []
  private bullets: Bullet[] = []
  private pendingBulletDamage = new Map<number, PendingEnemyDamage>()
  private hazards: Hazard[] = []
  private crumbs: Crumb[] = []
  private items: ItemDrop[] = []
  private compassBits: CompassBit[] = []
  private enemyPool: Enemy[] = []
  private bulletPool: Phaser.GameObjects.Image[] = []
  private crumbPool: Phaser.GameObjects.Image[] = []
  private itemPool: Phaser.GameObjects.Image[] = []
  private fxPool: Phaser.GameObjects.Image[] = []
  private activeFx = new Set<Phaser.GameObjects.Image>()
  private enemyGrid = new SpatialGrid<Enemy & { x: number; y: number }>()
  private crumbGrid = new SpatialGrid<Crumb & { x: number; y: number }>()
  private itemGrid = new SpatialGrid<ItemDrop & { x: number; y: number }>()
  private moveVector = new Phaser.Math.Vector2()
  private aimVector = new Phaser.Math.Vector2(1, 0)
  private leftPointerId: number | null = null
  private rightPointerId: number | null = null
  private leftStart = new Phaser.Math.Vector2()
  private rightStart = new Phaser.Math.Vector2()
  private leftCurrent = new Phaser.Math.Vector2()
  private rightCurrent = new Phaser.Math.Vector2()
  private mouseScreen = new Phaser.Math.Vector2(window.innerWidth / 2, window.innerHeight / 2)
  private mouseAim = new Phaser.Math.Vector2(1, 0)
  private playerSpeed = 235
  private playerRadius = 18
  private elapsed = 0
  private kills = 0
  private score = 0
  private level = 1
  private crumbsHeld = 0
  private nextLevelCrumbs = LEVEL_CRUMB_START
  private hp = PLAYER_MAX_HP
  private hasCase = true
  private enemySeq = 1
  private spawnTimer = 0
  private meleeTimer = 0
  private meleeFlashTimer = 0
  private invincibleTimer = 0
  private damagePose = false
  private showAttackHitbox = false
  private levelChoiceOpen = false
  private pendingLevelUps = 0
  private expGaugeMaxFlash = false
  private miniMapVisible = true
  private fullMapVisible = false
  private mapPausedByToggle = false
  private mapZoomLevel = Math.max(1, this.loadVolumeLevel(MAP_ZOOM_KEY, 6))
  private lastLifeFilled = -1
  private manualAimLocked = false
  private desktopAimToggleLock = false
  private desktopRightHold = false
  private touchControls = false
  private desktopHintShownThisRun = false
  private roundStarted = false
  private titleOpen = true
  private cameraIntroShown = false
  private collectButtonUsed = false
  private bossPhase = false
  private bossSpawned = false
  private bossSummonWave = 0
  private clearState = false
  private clearEnding = false
  private clearLifeBonus = 0
  private clearBossTimeBonus = 0
  private bossFightStartedAt = 0
  private autoAim = true
  private bowGuardActive = false
  private buffTimers: Record<'multishot' | 'range', number> = { multishot: 0, range: 0 }
  private permanentProjectileBonus = 0
  private goldRushTimer = 0
  private goldRushSparkTimer = 0
  private leaderboard: LeaderboardEntry[] = []
  private rankingBusy = false
  private submittedScore = false
  private pencilBoss: PencilBoss | null = null
  private bgm: HTMLAudioElement | null = null
  private currentBgmKey: BgmKey | null = null
  private bgmGain: GainNode | null = null
  private bgmMediaSource: MediaElementAudioSourceNode | null = null
  private audioUnlocked = false
  private enemyHitSeTimer = 0
  private playerFireSeTimer = 0
  private enemyAttackSeTimer = 0
  private playerHitSeTimer = 0
  private bowGuardSeTimer = 0
  private antiBowTimer = 0
  private diagnosticTimer = 0
  private slowFrameCount = 0
  private panicStopped = false
  private debugMapOpenCount = 0
  private debugMode = false
  private seVolumeLevel = this.loadVolumeLevel(SE_VOLUME_KEY, 3)
  private bgmVolumeLevel = this.loadVolumeLevel(BGM_VOLUME_KEY, 5)
  private voiceVolumeLevel = this.loadVolumeLevel(VOICE_VOLUME_KEY, 8)
  private weaponLevels: Record<UpgradeId, number> = {
    melee: 1,
    bullet: 0,
    sniper: 0,
    shotgun: 0,
    machinegun: 0,
    cannon: 0,
    compass: 0,
    bowGuard: 0,
  }
  private unlockedFusions = new Set<FusionId>()
  private fusedBaseWeapons = new Set<UpgradeId>()
  private weaponTimers: Record<WeaponId, number> = {
    bullet: 0,
    sniper: 1.2,
    shotgun: 1,
    machinegun: 0.3,
    cannon: 2,
    compass: 0,
  }
  private hud = {
    time: null as HTMLElement | null,
    kills: null as HTMLElement | null,
    level: null as HTMLElement | null,
    crumbs: null as HTMLElement | null,
    hp: null as HTMLElement | null,
    life: null as HTMLElement | null,
    case: null as HTMLElement | null,
    high: null as HTMLElement | null,
    weapons: null as HTMLElement | null,
    title: null as HTMLElement | null,
    ranking: null as HTMLElement | null,
    rankingScroll: null as HTMLElement | null,
    rankingList: null as HTMLElement | null,
    rankingStatus: null as HTMLElement | null,
    titleBest: null as HTMLElement | null,
    playerName: null as HTMLInputElement | null,
    submitStatus: null as HTMLElement | null,
    overlay: null as HTMLElement | null,
    overlayLabel: null as HTMLElement | null,
    overlayTitle: null as HTMLElement | null,
    final: null as HTMLElement | null,
    resultTip: null as HTMLElement | null,
    upgrades: null as HTMLElement | null,
    controls: null as HTMLElement | null,
    pauseAuto: null as HTMLButtonElement | null,
    pauseRetry: null as HTMLButtonElement | null,
    pauseTitle: null as HTMLButtonElement | null,
    pauseHint: null as HTMLElement | null,
    expGauge: null as HTMLElement | null,
    miniMap: null as HTMLElement | null,
    miniMapCanvas: null as HTMLCanvasElement | null,
    miniMapToggle: null as HTMLButtonElement | null,
    collectButton: null as HTMLButtonElement | null,
    bowWarning: null as HTMLElement | null,
    itemWarning: null as HTMLElement | null,
    mouseCursor: null as HTMLElement | null,
    seVolume: null as HTMLInputElement | null,
    bgmVolume: null as HTMLInputElement | null,
    voiceVolume: null as HTMLInputElement | null,
    seVolumeValue: null as HTMLElement | null,
    bgmVolumeValue: null as HTMLElement | null,
    voiceVolumeValue: null as HTMLElement | null,
    titleSeVolume: null as HTMLInputElement | null,
    titleBgmVolume: null as HTMLInputElement | null,
    titleVoiceVolume: null as HTMLInputElement | null,
    titleSeVolumeValue: null as HTMLElement | null,
    titleBgmVolumeValue: null as HTMLElement | null,
    titleVoiceVolumeValue: null as HTMLElement | null,
    titleMapZoom: null as HTMLInputElement | null,
    titleMapZoomValue: null as HTMLElement | null,
    titleNotice: null as HTMLElement | null,
    mapZoom: null as HTMLInputElement | null,
    mapZoomValue: null as HTMLElement | null,
    quickTime: null as HTMLElement | null,
    codex: null as HTMLElement | null,
    codexList: null as HTMLElement | null,
    codexPreview: null as HTMLElement | null,
    howTo: null as HTMLElement | null,
    shareDialog: null as HTMLElement | null,
    shareStatus: null as HTMLElement | null,
    shareNative: null as HTMLButtonElement | null,
    shareX: null as HTMLAnchorElement | null,
    shareLine: null as HTMLAnchorElement | null,
    desktopHint: null as HTMLElement | null,
    desktopHintToggle: null as HTMLInputElement | null,
    quickAuto: null as HTMLButtonElement | null,
    quickPause: null as HTMLButtonElement | null,
    actionConfirm: null as HTMLElement | null,
    actionConfirmTitle: null as HTMLElement | null,
    actionConfirmText: null as HTMLElement | null,
    actionConfirmAccept: null as HTMLButtonElement | null,
    actionConfirmCancel: null as HTMLButtonElement | null,
  }
  private paused = false
  private pendingRoundAction: RoundAction | null = null

  constructor() {
    super('eraser-survivor')
  }

  private loadVolumeLevel(key: string, fallback: number) {
    const value = Number(localStorage.getItem(key) ?? fallback)
    return Phaser.Math.Clamp(Number.isFinite(value) ? Math.round(value) : fallback, 0, 10)
  }

  private loadAutoAim(fallback: boolean) {
    try {
      const stored = localStorage.getItem(AUTO_AIM_KEY)
      if (stored === '1') return true
      if (stored === '0') return false
    } catch {
      // Use the platform default when storage is unavailable.
    }
    return fallback
  }

  preload() {
    this.load.image('eraser-case', '/assets/characters/eraser.png')
    this.load.image('eraser-bare', '/assets/characters/eraser-bare.png')
    this.load.image('eraser-case-hit', '/assets/characters/eraser-case-hit.png')
    this.load.image('eraser-bare-hit', '/assets/characters/eraser-bare-hit.png')
    this.load.image('pencil-boss', '/assets/characters/pen.png')
    this.load.image('crumb-gray', '/assets/items/crumb-gray.png')
    this.load.image('bullet-blue', '/assets/projectiles/bullet-blue.png')
    this.load.image('bullet-orange', '/assets/projectiles/bullet-orange.png')
    this.load.image('bullet-black', '/assets/projectiles/bullet-black.png')
    this.load.image('bullet-purple', '/assets/projectiles/bullet-purple.png')
    this.load.image('bullet-red', '/assets/projectiles/bullet-red.png')
    this.load.image('aim-marker', '/assets/ui/aim-marker.png')
    this.load.image('item-multishot', '/assets/items/item-multishot.png')
    this.load.image('item-range', '/assets/items/item-range.png')
    this.load.image('item-bucket-gold', '/assets/items/item-bucket-gold.png')
    this.load.image('item-bucket-gray', '/assets/items/item-bucket-gray.png')
    this.load.image('item-stapler-gold', '/assets/items/item-stapler-gold.png')
    this.load.image('item-stapler-gray', '/assets/items/item-stapler-gray.png')
    this.load.image('item-glue-gold', '/assets/items/item-glue-gold.png')
    this.load.image('item-glue-gray', '/assets/items/item-glue-gray.png')
    this.load.image('item-gold-crumb', '/assets/items/item-gold-crumb.png')
    this.load.image('item-heal', '/assets/ui/life-full.png')
    this.load.image('fx-burst-white-small', '/assets/fx/burst-white-small.png')
    this.load.image('fx-burst-white-large', '/assets/fx/burst-white-large.png')
    this.load.image('fx-spark-orange', '/assets/fx/spark-orange.png')
    this.load.image('fx-swipe-blue', '/assets/fx/swipe-blue.png')
    this.load.image('fx-glue-brown', '/assets/fx/glue-brown.png')
    this.load.image('fx-bucket-ring', '/assets/fx/bucket-ring.png')
    this.load.image('fx-bucket-splash', '/assets/fx/bucket-splash.png')
    this.load.image('fx-gold-crumb-shine', '/assets/fx/gold-crumb-shine.png')
    this.load.image('title-logo', '/assets/title/title-logo.png')
    this.load.audio('se-boss-explosion', '/assets/audio/se-boss-explosion-maou.mp3')
    this.load.audio('se-clear-jingle', '/assets/audio/se-clear-jingle-maou.mp3')
    this.load.audio('se-game-over', '/assets/audio/se-game-over-maou.mp3')
    this.load.audio('se-enemy-attack', '/assets/audio/se-enemy-attack.mp3')
    this.load.audio('se-enemy-hit', '/assets/audio/se-enemy-hit.mp3')
    this.load.audio('se-level-up', '/assets/audio/se-level-up.mp3')
    this.load.audio('se-player-fire', '/assets/audio/se-player-fire.mp3')
    this.load.audio('se-player-hit', '/assets/audio/se-player-hit.mp3')
    this.load.audio('se-round-end', '/assets/audio/se-round-end.mp3')
    this.load.audio('se-round-start', '/assets/audio/se-round-start.mp3')
    TITLE_CALL_KEYS.forEach((key) => this.load.audio(key, `/assets/audio/${key}.mp3`))
  }

  create() {
    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT)
    this.scale.on('resize', (size: Phaser.Structs.Size) => {
      this.cameras.main.setSize(size.width, size.height)
      this.syncControlMode()
      this.applyCameraZoom()
    })
    this.drawNotebookWorld()

    this.player = this.add.image(WORLD_WIDTH / 2, WORLD_HEIGHT / 2, 'eraser-bare')
    this.player.setDisplaySize(58, 58)
    this.player.setDepth(20)
    this.aimMarker = this.add.image(this.player.x, this.player.y, 'aim-marker')
    this.aimMarker.setDisplaySize(18, 25)
    this.aimMarker.setDepth(19)
    this.cameras.main.startFollow(this.player, true, 0.09, 0.09)

    this.cursors = this.input.keyboard!.createCursorKeys()
    this.keys = this.input.keyboard!.addKeys({
      W: 'W',
      A: 'A',
      S: 'S',
      D: 'D',
      SHIFT: 'SHIFT',
      CTRL: 'CTRL',
      E: 'E',
      P: 'P',
      ESC: 'ESC',
    }) as Record<string, Phaser.Input.Keyboard.Key>
    this.input.keyboard!.on('keydown-H', () => {
      this.showAttackHitbox = !this.showAttackHitbox
      this.syncHitboxButton()
      if (!this.showAttackHitbox) this.graphics.clear()
    })
    this.input.keyboard!.on('keydown-SPACE', () => {
      if (this.titleOpen) return
      if (this.hp <= 0) {
        this.requestRoundAction('retry')
        return
      }
      if (this.levelChoiceOpen) return
      this.togglePause()
    })
    this.input.keyboard!.on('keydown-P', () => {
      if (this.titleOpen || this.hp <= 0 || this.levelChoiceOpen) return
      this.togglePause()
    })
    this.input.keyboard!.on('keydown-ESC', () => {
      if (this.titleOpen || this.hp <= 0 || this.levelChoiceOpen) return
      this.togglePause()
    })
    this.input.keyboard!.on('keydown-E', () => {
      if (this.titleOpen || this.hp <= 0 || this.levelChoiceOpen) return
      this.toggleFullMap()
    })

    this.graphics = this.add.graphics().setDepth(100)
    this.collectGraphics = this.add.graphics().setDepth(6)
    this.bindDom()
    this.bindPads()
    this.tryLockLandscape()
    this.syncControlMode()
    this.applyCameraZoom()
    this.resetRoundState()
    this.showTitleScreen()
    this.updateHud()
  }

  update(_: number, deltaMs: number) {
    try {
      this.updateGame(deltaMs)
    } catch (error) {
      this.stopWithError('UPDATE_EXCEPTION', error)
    }
  }

  private updateGame(deltaMs: number) {
    if (this.paused) {
      this.drawMiniMap()
      this.updateMouseCursor()
      return
    }
    if (!this.roundStarted || this.titleOpen || this.hp <= 0 || this.levelChoiceOpen) return
    if (this.clearEnding) {
      this.updateHud()
      this.drawMiniMap()
      this.updateMouseCursor()
      return
    }
    if (this.detectPerformanceStop(deltaMs)) return

    const dt = Math.min(deltaMs / 1000, 0.033)
    this.elapsed += dt
    this.spawnTimer -= dt
    this.enemyHitSeTimer = Math.max(0, this.enemyHitSeTimer - dt)
    this.playerFireSeTimer = Math.max(0, this.playerFireSeTimer - dt)
    this.enemyAttackSeTimer = Math.max(0, this.enemyAttackSeTimer - dt)
    this.playerHitSeTimer = Math.max(0, this.playerHitSeTimer - dt)
    this.bowGuardSeTimer = Math.max(0, this.bowGuardSeTimer - dt)
    this.antiBowTimer = Math.max(0, this.antiBowTimer - dt)
    this.diagnosticTimer -= dt
    if (this.diagnosticTimer <= 0) {
      this.recordRunState('tick')
      this.diagnosticTimer = 2
    }
    this.meleeTimer -= dt
    this.meleeFlashTimer = Math.max(0, this.meleeFlashTimer - dt)
    this.invincibleTimer = Math.max(0, this.invincibleTimer - dt)
    this.goldRushTimer = Math.max(0, this.goldRushTimer - dt)
    this.buffTimers.multishot = Math.max(0, this.buffTimers.multishot - dt)
    this.buffTimers.range = Math.max(0, this.buffTimers.range - dt)
    for (const key of Object.keys(this.weaponTimers) as WeaponId[]) this.weaponTimers[key] -= dt

    this.readInput()
    this.movePlayer(dt)
    this.updateBowGuard()
    this.updatePencilBoss(dt)
    this.updateAimMarker()
    this.updatePlayerAura(dt)
    this.drawCollectRing()
    this.rebuildSpatialGrids()
    this.updateCollect(dt)
    this.updateMelee()
    if (!this.roundStarted) return
    this.updateWeapons()
    if (!this.roundStarted) return
    this.updateEnemies(dt)
    if (!this.roundStarted) return
    this.updateBullets(dt)
    if (!this.roundStarted) return
    this.updateHazards(dt)
    if (!this.roundStarted) return
    this.updateCompasses(dt)
    if (!this.roundStarted) return
    this.handlePlayerContactHits()
    if (!this.roundStarted) return
    this.updateSpawning(dt)
    this.updateHud()
    this.drawMiniMap()
    this.updateBowWarning()
    this.updateItemWarning()
    this.updateMouseCursor()
    this.drawDebug()
    if (this.detectObjectOverload()) return
  }

  private detectPerformanceStop(deltaMs: number) {
    if (document.visibilityState !== 'visible') return false
    if (deltaMs >= SLOW_FRAME_STOP_MS) {
      this.stopWithError('PERFORMANCE_STOP', `single frame ${Math.round(deltaMs)}ms`)
      return true
    }
    if (deltaMs >= SLOW_FRAME_WARN_MS) this.slowFrameCount += 1
    else this.slowFrameCount = 0
    if (this.slowFrameCount >= SLOW_FRAME_STOP_COUNT) {
      this.stopWithError('PERFORMANCE_STOP', `${this.slowFrameCount} slow frames, last ${Math.round(deltaMs)}ms`)
      return true
    }
    return false
  }

  private detectObjectOverload() {
    const total = this.enemies.length + this.bullets.length + this.hazards.length + this.crumbs.length + this.items.length + this.compassBits.length
    const limit = this.touchControls ? ACTIVE_OBJECT_STOP_TOUCH : ACTIVE_OBJECT_STOP_DESKTOP
    if (total <= limit) return false
    this.stopWithError('OBJECT_OVERLOAD', `active objects ${total}/${limit}`)
    return true
  }

  private diagnosticSnapshot(reason: string, detail: string) {
    return {
      reason,
      detail,
      elapsed: Math.floor(this.elapsed),
      hp: this.hp,
      score: this.score,
      level: this.level,
      enemies: this.enemies.length,
      bullets: this.bullets.length,
      hazards: this.hazards.length,
      crumbs: this.crumbs.length,
      items: this.items.length,
      compass: this.compassBits.length,
      pools: {
        enemies: this.enemyPool.length,
        bullets: this.bulletPool.length,
        crumbs: this.crumbPool.length,
        items: this.itemPool.length,
        fx: this.fxPool.length,
      },
      bossPhase: this.bossPhase,
      bossHp: this.pencilBoss ? `${Math.ceil(this.pencilBoss.hp)}/${this.pencilBoss.maxHp}` : 'none',
      touch: this.touchControls,
      visible: document.visibilityState,
      userAgent: navigator.userAgent,
      pageLoad: PAGE_LOAD_CAUSE,
      at: new Date().toISOString(),
    }
  }

  private errorDetail(error: unknown) {
    if (error instanceof Error) return `${error.name}: ${error.message}\n${error.stack || ''}`.trim()
    if (typeof error === 'string') return error
    try {
      return JSON.stringify(error)
    } catch {
      return String(error)
    }
  }

  private stopWithError(reason: string, error: unknown) {
    if (this.panicStopped) return
    this.panicStopped = true
    const detail = this.errorDetail(error)
    const snapshot = this.diagnosticSnapshot(reason, detail)
    try {
      localStorage.setItem(LAST_ERROR_KEY, JSON.stringify(snapshot))
    } catch {
      // Ignore storage failures. The visible overlay still contains the snapshot.
    }
    this.recordRunState(`error:${reason}`)
    this.roundStarted = false
    this.paused = true
    document.body.classList.add('paused')
    this.stopBgm()
    this.hideDesktopHint()
    this.hud.bowWarning?.classList.remove('visible')
    this.hud.itemWarning?.classList.remove('visible')
    this.miniMapVisible = false
    this.fullMapVisible = false
    this.mapPausedByToggle = false
    this.syncMiniMapToggle()
    this.graphics?.clear()
    if (this.hud.overlayLabel) this.hud.overlayLabel.textContent = 'ERROR STOP'
    if (this.hud.overlayTitle) this.hud.overlayTitle.textContent = 'ゲームを停止しました。'
    if (this.hud.submitStatus) this.hud.submitStatus.textContent = 'タイトルに戻らず停止しています'
    if (this.hud.final) {
      this.hud.final.innerHTML = `
        <div class="error-log">
          <b>${this.escapeHtml(reason)}</b>
          <pre>${this.escapeHtml(JSON.stringify(snapshot, null, 2))}</pre>
        </div>`
    }
    this.hud.overlay?.classList.add('visible')
  }

  private resetRoundState() {
    this.syncControlMode()
    this.time.removeAllEvents()
    this.clearRoundObjects()
    this.enemies = []
    this.bullets = []
    this.hazards = []
    this.crumbs = []
    this.items = []
    this.compassBits = []
    this.enemyGrid.clear()
    this.crumbGrid.clear()
    this.itemGrid.clear()
    this.moveVector.set(0, 0)
    this.aimVector.set(1, 0)
    this.leftPointerId = null
    this.rightPointerId = null
    this.elapsed = 0
    this.kills = 0
    this.score = 0
    this.level = 1
    this.crumbsHeld = 0
    this.nextLevelCrumbs = LEVEL_CRUMB_START
    this.hp = PLAYER_MAX_HP
    this.hasCase = false
    this.spawnTimer = 0
    this.meleeTimer = 0
    this.meleeFlashTimer = 0
    this.invincibleTimer = 0
    this.damagePose = false
    this.levelChoiceOpen = false
    this.pendingLevelUps = 0
    this.expGaugeMaxFlash = false
    this.miniMapVisible = false
    this.fullMapVisible = false
    this.mapPausedByToggle = false
    this.lastLifeFilled = -1
    this.manualAimLocked = false
    this.desktopAimToggleLock = false
    this.desktopRightHold = false
    this.roundStarted = false
    this.collectButtonUsed = false
    this.bossPhase = false
    this.bossSpawned = false
    this.bossSummonWave = 0
    this.clearState = false
    this.clearEnding = false
    this.clearLifeBonus = 0
    this.clearBossTimeBonus = 0
    this.bossFightStartedAt = 0
    this.autoAim = this.loadAutoAim(this.touchControls)
    this.buffTimers = { multishot: 0, range: 0 }
    this.permanentProjectileBonus = 0
    this.goldRushTimer = 0
    this.goldRushSparkTimer = 0
    this.bowGuardActive = false
    this.submittedScore = false
    this.enemyHitSeTimer = 0
    this.playerFireSeTimer = 0
    this.enemyAttackSeTimer = 0
    this.playerHitSeTimer = 0
    this.bowGuardSeTimer = 0
    this.antiBowTimer = 0
    this.diagnosticTimer = 0
    this.slowFrameCount = 0
    this.debugMapOpenCount = 0
    this.debugMode = false
    this.pencilBoss?.body.destroy()
    this.pencilBoss?.healthBack.destroy()
    this.pencilBoss?.healthFill.destroy()
    this.pencilBoss = null
    this.paused = false
    this.weaponLevels = { melee: 1, bullet: 0, sniper: 0, shotgun: 0, machinegun: 0, cannon: 0, compass: 0, bowGuard: 0 }
    this.unlockedFusions = new Set()
    this.fusedBaseWeapons = new Set()
    this.weaponTimers = { bullet: 0, sniper: 1.2, shotgun: 1, machinegun: 0.3, cannon: 2, compass: 0 }
    this.player.clearTint()
    this.player.setPosition(WORLD_WIDTH / 2, WORLD_HEIGHT / 2)
    this.player.setTexture('eraser-bare')
    this.player.setDisplaySize(58, 58)
    this.player.setAngle(0)
    this.player.setFlipX(false)
    this.aimMarker.setPosition(this.player.x + 42, this.player.y)
    document.body.classList.remove('left-touching', 'right-touching', 'paused', 'map-open')
    document.body.classList.remove('level-choice-open')
    this.hud.collectButton?.classList.remove('used', 'spent')
    this.hideDesktopHint()
    document.querySelector('#game-over')?.classList.remove('visible')
    document.querySelector('#level-up')?.classList.remove('visible')
    this.hud.bowWarning?.classList.remove('visible')
    this.hud.itemWarning?.classList.remove('visible')
    if (this.hud.overlayLabel) this.hud.overlayLabel.textContent = 'GAME OVER'
    if (this.hud.overlayTitle) this.hud.overlayTitle.textContent = 'けしごむ、削られた。'
    this.hud.submitStatus?.replaceChildren()
    this.closeRoundActionConfirm()
    this.syncPauseButton()
    this.syncAutoButtons()
    this.syncMiniMapToggle()
  }

  private clearRoundObjects() {
    for (const enemy of this.enemies) {
      this.releaseEnemy(enemy)
    }
    for (const bullet of this.bullets) this.releaseBulletBody(bullet.body)
    for (const hazard of this.hazards) hazard.body.destroy()
    for (const crumb of this.crumbs) this.releaseCrumbBody(crumb.body)
    for (const item of this.items) this.releaseItemBody(item.body)
    for (const bit of this.compassBits) bit.body.destroy()
    for (const fx of [...this.activeFx]) this.releaseFxBody(fx)
    this.pencilBoss?.body.destroy()
    this.pencilBoss?.healthBack.destroy()
    this.pencilBoss?.healthFill.destroy()
    this.pencilBoss = null
    this.enemies.length = 0
    this.bullets.length = 0
    this.pendingBulletDamage.clear()
    this.hazards.length = 0
    this.crumbs.length = 0
    this.items.length = 0
    this.compassBits.length = 0
    this.enemyGrid.clear()
    this.crumbGrid.clear()
    this.itemGrid.clear()
  }

  private releaseEnemy(enemy: Enemy) {
    this.tweens.killTweensOf(enemy.text)
    enemy.glueFx?.destroy()
    enemy.stapleFx?.destroy()
    enemy.glueFx = null
    enemy.stapleFx = null
    enemy.text.setActive(false)
    enemy.text.setVisible(false)
    enemy.text.setPosition(-9999, -9999)
    enemy.text.setAlpha(1)
    enemy.text.setScale(1)
    enemy.text.setAngle(0)
    enemy.text.clearTint()
    if (this.enemyPool.length < this.enemyPoolLimit()) this.enemyPool.push(enemy)
    else enemy.text.destroy()
  }

  private releaseBulletBody(body: Phaser.GameObjects.Image) {
    this.tweens.killTweensOf(body)
    body.setActive(false)
    body.setVisible(false)
    body.setPosition(-9999, -9999)
    body.setAlpha(1)
    body.setScale(1)
    body.setAngle(0)
    body.clearTint()
    if (this.bulletPool.length < this.bulletPoolLimit()) this.bulletPool.push(body)
    else body.destroy()
  }

  private releaseCrumbBody(body: Phaser.GameObjects.Image) {
    this.tweens.killTweensOf(body)
    body.setActive(false)
    body.setVisible(false)
    body.setPosition(-9999, -9999)
    body.setAlpha(1)
    body.setScale(1)
    if (this.crumbPool.length < this.crumbPoolLimit()) this.crumbPool.push(body)
    else body.destroy()
  }

  private releaseItemBody(body: Phaser.GameObjects.Image) {
    this.tweens.killTweensOf(body)
    body.setActive(false)
    body.setVisible(false)
    body.setPosition(-9999, -9999)
    body.setAlpha(1)
    body.setScale(1)
    if (this.itemPool.length < this.itemPoolLimit()) this.itemPool.push(body)
    else body.destroy()
  }

  private acquireFxBody(x: number, y: number, key: string) {
    const body = this.fxPool.pop() ?? this.add.image(x, y, key)
    body.setTexture(key)
    body.setPosition(x, y)
    body.setActive(true)
    body.setVisible(true)
    body.setAlpha(1)
    body.setScale(1)
    body.setAngle(0)
    this.activeFx.add(body)
    return body
  }

  private releaseFxBody(body: Phaser.GameObjects.Image) {
    if (!this.activeFx.delete(body)) return
    this.tweens.killTweensOf(body)
    body.setActive(false)
    body.setVisible(false)
    body.setPosition(-9999, -9999)
    body.setAlpha(1)
    body.setScale(1)
    body.setAngle(0)
    if (this.fxPool.length < this.fxPoolLimit()) this.fxPool.push(body)
    else body.destroy()
  }

  private syncControlMode() {
    this.touchControls = window.matchMedia('(pointer: coarse)').matches
    document.body.classList.toggle('touch-device', this.touchControls)
    document.body.classList.toggle('desktop-device', !this.touchControls)
    this.applyCameraZoom()
    if (!this.touchControls) {
      this.leftPointerId = null
      this.rightPointerId = null
      document.body.classList.remove('left-touching', 'right-touching')
    }
    if (this.hud.controls) {
      this.hud.controls.textContent = this.touchControls
        ? '左半分: 移動 / 右半分: 攻撃方向固定'
        : 'WASD: 移動 / マウス: 照準 / クリック: 固定 / SPACE: ポーズ'
    }
    if (this.hud.pauseHint) {
      this.hud.pauseHint.textContent = this.touchControls
        ? 'PAUSE中に設定変更。MAP表示中は停止'
        : 'SPACE / P / ESC で停止。Eで全体MAP'
    }
    this.syncAutoButtons()
    this.syncPauseButton()
  }

  private applyCameraZoom() {
    if (!this.cameras?.main) return
    this.cameras.main.setZoom(this.cameraTargetZoom())
  }

  private cameraTargetZoom() {
    const t = Phaser.Math.Clamp(this.mapZoomLevel, 1, 10)
    const touchZoom = Phaser.Math.Linear(0.9, 0.58, (t - 1) / 9)
    return this.touchControls ? touchZoom : 1
  }

  private maxEnemies() {
    return this.touchControls ? MAX_ENEMIES_TOUCH : MAX_ENEMIES_DESKTOP
  }

  private maxBullets() {
    return this.touchControls ? MAX_BULLETS_TOUCH : MAX_BULLETS_DESKTOP
  }

  private maxCrumbs() {
    return this.touchControls ? MAX_CRUMBS_TOUCH : MAX_CRUMBS_DESKTOP
  }

  private enemyPoolLimit() {
    return this.touchControls ? 72 : 120
  }

  private crumbPoolLimit() {
    return this.touchControls ? 80 : 130
  }

  private itemPoolLimit() {
    return this.touchControls ? 20 : 32
  }

  private bulletPoolLimit() {
    return this.touchControls ? 96 : 140
  }

  private fxPoolLimit() {
    return this.touchControls ? 40 : 72
  }

  private recordRunState(reason: string) {
    if (!this.roundStarted || this.titleOpen) return
    try {
      localStorage.setItem(LAST_RUN_STATE_KEY, JSON.stringify({
        reason,
        elapsed: Math.floor(this.elapsed),
        hp: this.hp,
        enemies: this.enemies.length,
        bullets: this.bullets.length,
        crumbs: this.crumbs.length,
        items: this.items.length,
        bossPhase: this.bossPhase,
        bossSpawned: this.bossSpawned,
        mapZoom: this.mapZoomLevel,
        pools: {
          enemies: this.enemyPool.length,
          bullets: this.bulletPool.length,
          crumbs: this.crumbPool.length,
          items: this.itemPool.length,
          fx: this.fxPool.length,
        },
        at: Date.now(),
      }))
    } catch (error) {
      console.warn('[Eraser Survivor] Run checkpoint could not be saved', error)
    }
  }

  private togglePause(force?: boolean) {
    if (this.hp <= 0 || this.levelChoiceOpen || this.titleOpen) return
    this.paused = typeof force === 'boolean' ? force : !this.paused
    document.body.classList.toggle('paused', this.paused)
    if (!this.paused) {
      this.closeRoundActionConfirm()
      this.fullMapVisible = false
      this.miniMapVisible = !this.touchControls && this.roundStarted && !this.titleOpen
      this.mapPausedByToggle = false
      this.syncMiniMapToggle()
    }
    if (this.paused) {
      this.hideDesktopHint()
      this.hud.bowWarning?.classList.remove('visible')
      this.hud.itemWarning?.classList.remove('visible')
    }
    this.syncPauseButton()
    if (!this.paused) this.graphics.clear()
  }

  private syncPauseButton() {
    if (this.hud.quickPause) this.hud.quickPause.textContent = this.paused ? 'RESUME' : 'PAUSE'
  }

  private requestRoundAction(action: RoundAction) {
    this.pendingRoundAction = action
    if (this.hud.actionConfirmTitle) this.hud.actionConfirmTitle.textContent = action === 'retry' ? '最初からリトライしますか？' : 'タイトルへ戻りますか？'
    if (this.hud.actionConfirmText) {
      this.hud.actionConfirmText.textContent = action === 'retry'
        ? '現在のプレイを終了し、敵・弾・消しカスをすべて消して最初から開始します。'
        : '現在のプレイを終了してタイトル画面へ戻ります。'
    }
    if (this.hud.actionConfirmAccept) this.hud.actionConfirmAccept.textContent = action === 'retry' ? 'リトライする' : 'タイトルへ戻る'
    this.hud.actionConfirm?.classList.add('visible')
  }

  private closeRoundActionConfirm() {
    this.pendingRoundAction = null
    this.hud.actionConfirm?.classList.remove('visible')
  }

  private executeRoundAction() {
    const action = this.pendingRoundAction
    this.closeRoundActionConfirm()
    if (action === 'retry') {
      this.startRound()
      return
    }
    if (action === 'title') {
      this.clearLastRunState()
      this.showTitleScreen()
    }
  }

  private toggleAutoAim(force?: boolean) {
    this.autoAim = typeof force === 'boolean' ? force : !this.autoAim
    try {
      localStorage.setItem(AUTO_AIM_KEY, this.autoAim ? '1' : '0')
    } catch {
      // Persistence is optional when storage is unavailable.
    }
    if (this.autoAim) {
      this.manualAimLocked = false
      this.desktopAimToggleLock = false
      this.desktopRightHold = false
    }
    this.syncAutoButtons()
  }

  private syncAutoButtons() {
    const buttons = [this.hud.quickAuto, this.hud.pauseAuto].filter(Boolean) as HTMLButtonElement[]
    for (const button of buttons) {
      button.textContent = this.autoAim ? 'AUTO ON' : 'AUTO OFF'
      button.classList.toggle('active', this.autoAim)
    }
  }

  private syncMiniMapToggle() {
    this.hud.miniMap?.classList.toggle('visible', this.miniMapVisible)
    this.hud.miniMap?.classList.toggle('full-map', this.fullMapVisible)
    document.body.classList.toggle('map-open', this.fullMapVisible)
    if (this.hud.miniMapToggle) {
      this.hud.miniMapToggle.textContent = this.fullMapVisible ? 'MAP CLOSE' : 'MAP OPEN'
      this.hud.miniMapToggle.classList.toggle('active', this.fullMapVisible)
    }
    if (this.miniMapVisible) this.drawMiniMap()
  }

  private toggleFullMap(force?: boolean) {
    const next = typeof force === 'boolean' ? force : !this.fullMapVisible
    if (next === this.fullMapVisible) return
    if (next) {
      this.registerMapOpenForDebug()
      this.mapPausedByToggle = !this.paused
      this.miniMapVisible = true
      this.fullMapVisible = true
      if (!this.paused) this.togglePause(true)
      else this.syncPauseButton()
    } else {
      this.fullMapVisible = false
      this.miniMapVisible = !this.touchControls && this.roundStarted && !this.titleOpen
      const shouldResume = this.mapPausedByToggle
      this.mapPausedByToggle = false
      if (shouldResume) this.togglePause(false)
    }
    this.syncMiniMapToggle()
  }

  private registerMapOpenForDebug() {
    if (this.debugMode || !this.roundStarted || this.titleOpen) return
    this.debugMapOpenCount += 1
    if (this.debugMapOpenCount >= 10) this.activateDebugMode()
  }

  private activateDebugMode() {
    if (this.debugMode) return
    this.debugMode = true
    this.crumbsHeld = 0
    this.nextLevelCrumbs = 1
    this.expGaugeMaxFlash = false
    this.updateHud()
    this.updateExpGauge()
    console.info('[Eraser Survivor] DEBUG MODE enabled: crumbs required per level = 1')
    const label = this.add.text(this.player.x, this.player.y - 82, 'DEBUG MODE\nけしカス1個でLV UP', {
      fontFamily: '"Arial Narrow", "Segoe UI", sans-serif',
      fontSize: '18px',
      fontStyle: '900',
      align: 'center',
      color: '#ff2c2c',
      stroke: '#ffffff',
      strokeThickness: 5,
    })
    label.setOrigin(0.5)
    label.setDepth(40)
    this.tweens.add({ targets: label, y: label.y - 34, alpha: 0, duration: 1300, ease: 'Cubic.easeOut', onComplete: () => label.destroy() })
  }

  private maybeShowDesktopHint() {
    if (this.touchControls || this.desktopHintShownThisRun || localStorage.getItem(DESKTOP_HINT_KEY) === '1') return
    this.desktopHintShownThisRun = true
    this.hud.desktopHint?.classList.add('visible')
  }

  private hideDesktopHint() {
    this.hud.desktopHint?.classList.remove('visible')
  }

  private bindDom() {
    this.hud.time = document.querySelector('#time')
    this.hud.kills = document.querySelector('#kills')
    this.hud.level = document.querySelector('#level')
    this.hud.crumbs = document.querySelector('#crumbs')
    this.hud.hp = document.querySelector('#hp')
    this.hud.life = document.querySelector('#life-bar')
    this.hud.case = document.querySelector('#case')
    this.hud.high = document.querySelector('#high')
    this.hud.weapons = document.querySelector('#weapons')
    this.hud.title = document.querySelector('#title-screen')
    this.hud.ranking = document.querySelector('#ranking-screen')
    this.hud.rankingScroll = document.querySelector('#ranking-scroll-region')
    this.hud.rankingList = document.querySelector('#ranking-list')
    this.hud.rankingStatus = document.querySelector('#ranking-status')
    this.hud.titleBest = document.querySelector('#title-best')
    this.hud.playerName = document.querySelector<HTMLInputElement>('#player-name')
    this.hud.submitStatus = document.querySelector('#submit-status')
    this.hud.overlay = document.querySelector('#game-over')
    this.hud.overlayLabel = document.querySelector('#overlay-label')
    this.hud.overlayTitle = document.querySelector('#overlay-title')
    this.hud.final = document.querySelector('#final-stats')
    this.hud.resultTip = document.querySelector('#result-tip')
    this.hud.upgrades = document.querySelector('#upgrade-list')
    this.hud.controls = document.querySelector('#controls')
    this.hud.pauseAuto = document.querySelector<HTMLButtonElement>('#pause-auto-button')
    this.hud.pauseRetry = document.querySelector<HTMLButtonElement>('#pause-retry-button')
    this.hud.pauseTitle = document.querySelector<HTMLButtonElement>('#pause-title-button')
    this.hud.pauseHint = document.querySelector('#pause-hint')
    this.hud.expGauge = document.querySelector('#exp-gauge-fill')
    this.hud.miniMap = document.querySelector('#mini-map')
    this.hud.miniMapCanvas = document.querySelector<HTMLCanvasElement>('#mini-map-canvas')
    this.hud.miniMapToggle = document.querySelector<HTMLButtonElement>('#mini-map-toggle')
    this.hud.collectButton = document.querySelector<HTMLButtonElement>('#collect-button')
    this.hud.bowWarning = document.querySelector('#bow-warning')
    this.hud.itemWarning = document.querySelector('#item-warning')
    this.hud.mouseCursor = document.querySelector('#mouse-cursor-follow')
    this.hud.seVolume = document.querySelector<HTMLInputElement>('#se-volume')
    this.hud.bgmVolume = document.querySelector<HTMLInputElement>('#bgm-volume')
    this.hud.voiceVolume = document.querySelector<HTMLInputElement>('#voice-volume')
    this.hud.seVolumeValue = document.querySelector('#se-volume-value')
    this.hud.bgmVolumeValue = document.querySelector('#bgm-volume-value')
    this.hud.voiceVolumeValue = document.querySelector('#voice-volume-value')
    this.hud.titleSeVolume = document.querySelector<HTMLInputElement>('#title-se-volume')
    this.hud.titleBgmVolume = document.querySelector<HTMLInputElement>('#title-bgm-volume')
    this.hud.titleVoiceVolume = document.querySelector<HTMLInputElement>('#title-voice-volume')
    this.hud.titleSeVolumeValue = document.querySelector('#title-se-volume-value')
    this.hud.titleBgmVolumeValue = document.querySelector('#title-bgm-volume-value')
    this.hud.titleVoiceVolumeValue = document.querySelector('#title-voice-volume-value')
    this.hud.titleMapZoom = document.querySelector<HTMLInputElement>('#title-map-zoom')
    this.hud.titleMapZoomValue = document.querySelector('#title-map-zoom-value')
    this.hud.titleNotice = document.querySelector('#title-notice')
    this.hud.mapZoom = document.querySelector<HTMLInputElement>('#map-zoom')
    this.hud.mapZoomValue = document.querySelector('#map-zoom-value')
    this.hud.quickTime = document.querySelector('#quick-time')
    this.hud.codex = document.querySelector('#codex-screen')
    this.hud.codexList = document.querySelector('#codex-list')
    this.hud.codexPreview = document.querySelector('#codex-preview')
    this.hud.howTo = document.querySelector('#how-to-dialog')
    this.hud.shareDialog = document.querySelector('#share-dialog')
    this.hud.shareStatus = document.querySelector('#share-status')
    this.hud.shareNative = document.querySelector<HTMLButtonElement>('#share-native-button')
    this.hud.shareX = document.querySelector<HTMLAnchorElement>('#share-x-button')
    this.hud.shareLine = document.querySelector<HTMLAnchorElement>('#share-line-button')
    this.hud.desktopHint = document.querySelector('#desktop-hint')
    this.hud.desktopHintToggle = document.querySelector<HTMLInputElement>('#desktop-hint-never')
    this.hud.quickAuto = document.querySelector<HTMLButtonElement>('#auto-button')
    this.hud.quickPause = document.querySelector<HTMLButtonElement>('#pause-button')
    this.hud.actionConfirm = document.querySelector('#round-action-confirm')
    this.hud.actionConfirmTitle = document.querySelector('#round-action-confirm-title')
    this.hud.actionConfirmText = document.querySelector('#round-action-confirm-text')
    this.hud.actionConfirmAccept = document.querySelector<HTMLButtonElement>('#round-action-confirm-accept')
    this.hud.actionConfirmCancel = document.querySelector<HTMLButtonElement>('#round-action-confirm-cancel')
    const playButton = document.querySelector<HTMLButtonElement>('#play-button')!
    const rankingButton = document.querySelector<HTMLButtonElement>('#ranking-button')!
    const codexButton = document.querySelector<HTMLButtonElement>('#codex-button')!
    const howToButton = document.querySelector<HTMLButtonElement>('#how-to-button')!
    const shareButton = document.querySelector<HTMLButtonElement>('#title-share-button')!
    const shareCloseTop = document.querySelector<HTMLButtonElement>('#share-close-top')!
    const shareClose = document.querySelector<HTMLButtonElement>('#share-close')!
    const shareCopy = document.querySelector<HTMLButtonElement>('#share-copy-button')!
    const rankingCloseTop = document.querySelector<HTMLButtonElement>('#ranking-close-top')!
    const rankingClose = document.querySelector<HTMLButtonElement>('#ranking-close')!
    const codexClose = document.querySelector<HTMLButtonElement>('#codex-close')!
    const howToClose = document.querySelector<HTMLButtonElement>('#how-to-close')!
    const toTitle = document.querySelector<HTMLButtonElement>('#to-title')!
    const startSplashButton = document.querySelector<HTMLButtonElement>('#start-splash-button')!
    const playerName = this.hud.playerName!
    startSplashButton.onclick = (event) => {
      event.stopPropagation()
      if (!this.titleOpen) return
      this.unlockAudio()
      this.startBgm('bgm-title')
      document.querySelector('#start-splash')?.classList.remove('visible')
    }
    this.hud.title?.addEventListener('pointerdown', () => {
      if (!this.titleOpen) return
      this.unlockAudio()
      this.startBgm('bgm-title')
    }, { passive: true })
    playerName.value = loadPlayerName()
    const persistName = () => {
      playerName.value = savePlayerName(playerName.value)
      if (this.titleOpen) this.renderTitleSummary()
    }
    playerName.onchange = persistName
    playerName.onblur = () => persistName()
    playButton.onclick = (event) => {
      event.stopPropagation()
      if (!this.titleOpen) return
      playerName.value = savePlayerName(playerName.value)
      this.startRound(true)
    }
    rankingButton.onclick = (event) => {
      event.stopPropagation()
      void this.openRanking()
    }
    codexButton.onclick = (event) => {
      event.stopPropagation()
      this.openCodex()
    }
    howToButton.onclick = (event) => {
      event.stopPropagation()
      this.openHowTo(false)
    }
    shareButton.onclick = (event) => {
      event.stopPropagation()
      this.openShare()
    }
    shareCloseTop.onclick = (event) => {
      event.stopPropagation()
      this.closeShare()
    }
    shareClose.onclick = (event) => {
      event.stopPropagation()
      this.closeShare()
    }
    this.hud.shareNative!.onclick = (event) => {
      event.stopPropagation()
      void this.shareWithDevice()
    }
    shareCopy.onclick = (event) => {
      event.stopPropagation()
      void this.copyShareLink()
    }
    rankingClose.onclick = (event) => {
      event.stopPropagation()
      this.closeRanking()
    }
    rankingCloseTop.onclick = (event) => {
      event.stopPropagation()
      this.closeRanking()
    }
    codexClose.onclick = (event) => {
      event.stopPropagation()
      this.closeCodex()
    }
    howToClose.onclick = (event) => {
      event.stopPropagation()
      this.closeHowTo(true)
    }
    toTitle.onclick = (event) => {
      event.stopPropagation()
      this.requestRoundAction('title')
    }
    const pauseButton = this.hud.quickPause!
    const autoButton = this.hud.quickAuto!
    const pauseAutoButton = this.hud.pauseAuto!
    pauseButton.onclick = (event) => {
      event.stopPropagation()
      this.togglePause()
    }
    autoButton.onclick = (event) => {
      event.stopPropagation()
      this.toggleAutoAim()
    }
    this.hud.collectButton!.onclick = (event) => {
      event.stopPropagation()
      this.collectAllCrumbs()
    }
    pauseAutoButton.onclick = (event) => {
      event.stopPropagation()
      this.toggleAutoAim()
    }
    this.hud.pauseRetry!.onclick = (event) => {
      event.stopPropagation()
      this.requestRoundAction('retry')
    }
    this.hud.pauseTitle!.onclick = (event) => {
      event.stopPropagation()
      this.requestRoundAction('title')
    }
    this.hud.miniMapToggle!.onclick = (event) => {
      event.stopPropagation()
      this.toggleFullMap()
    }
    const bindVolumeInput = (input: HTMLInputElement, kind: 'se' | 'bgm' | 'voice') => {
      const apply = () => this.setVolumeLevel(kind, Number(input.value))
      input.oninput = apply
      input.onchange = apply
    }
    bindVolumeInput(this.hud.seVolume!, 'se')
    bindVolumeInput(this.hud.bgmVolume!, 'bgm')
    bindVolumeInput(this.hud.voiceVolume!, 'voice')
    bindVolumeInput(this.hud.titleSeVolume!, 'se')
    bindVolumeInput(this.hud.titleBgmVolume!, 'bgm')
    bindVolumeInput(this.hud.titleVoiceVolume!, 'voice')
    this.hud.mapZoom!.oninput = () => this.setVolumeLevel('map', Number(this.hud.mapZoom!.value))
    this.hud.titleMapZoom!.oninput = () => this.setVolumeLevel('map', Number(this.hud.titleMapZoom!.value))
    const retry = document.querySelector<HTMLButtonElement>('#retry')!
    retry.onclick = (event) => {
      event.stopPropagation()
      this.requestRoundAction('retry')
    }
    this.hud.actionConfirmAccept!.onclick = (event) => {
      event.stopPropagation()
      this.executeRoundAction()
    }
    this.hud.actionConfirmCancel!.onclick = (event) => {
      event.stopPropagation()
      this.closeRoundActionConfirm()
    }
    const closeHint = document.querySelector<HTMLButtonElement>('#desktop-hint-close')!
    closeHint.onclick = (event) => {
      event.stopPropagation()
      const neverShow = this.hud.desktopHintToggle?.checked
      if (neverShow) localStorage.setItem(DESKTOP_HINT_KEY, '1')
      this.hideDesktopHint()
    }
    document.querySelector('#game-shell')?.addEventListener('contextmenu', (event) => event.preventDefault())
    document.querySelector('#game-shell')?.addEventListener('touchmove', (event) => {
      if (this.roundStarted && !this.paused && !this.levelChoiceOpen && !this.titleOpen) event.preventDefault()
    }, { passive: false })
    document.querySelector('#game-shell')?.addEventListener('gesturestart', (event) => event.preventDefault())
    window.addEventListener('beforeunload', () => this.recordRunState('beforeunload'))
    window.addEventListener('error', (event) => {
      this.stopWithError('JS_ERROR', event.error || `${event.message} @ ${event.filename}:${event.lineno}:${event.colno}`)
    })
    window.addEventListener('unhandledrejection', (event) => {
      this.stopWithError('UNHANDLED_REJECTION', event.reason)
    })
    window.addEventListener('pagehide', (event) => this.recordRunState(event.persisted ? 'pagehide-bfcache' : 'pagehide'))
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') this.recordRunState('hidden')
    })
    this.syncAutoButtons()
    this.syncPauseButton()
    this.syncMiniMapToggle()
    this.syncVolumeUi()
    this.openHowToIfFirstVisit()
  }

  private bindPads() {
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      this.tryLockLandscape()
      if (this.touchControls) {
        const isLeft = pointer.x < window.innerWidth / 2
        if (isLeft && this.leftPointerId === null) {
          this.leftPointerId = pointer.id
          this.leftStart.set(pointer.x, pointer.y)
          this.leftCurrent.copy(this.leftStart)
          this.setPadVars('left', pointer.x, pointer.y, 0, 0)
          document.body.classList.add('left-touching')
        } else if (!isLeft && this.rightPointerId === null) {
          this.rightPointerId = pointer.id
          this.rightStart.set(pointer.x, pointer.y)
          this.rightCurrent.copy(this.rightStart)
          this.setPadVars('right', pointer.x, pointer.y, 0, 0)
          document.body.classList.add('right-touching')
        }
        return
      }

      this.mouseScreen.set(pointer.x, pointer.y)
      const world = this.cameras.main.getWorldPoint(pointer.x, pointer.y)
      this.mouseAim.set(world.x - this.player.x, world.y - this.player.y)
      if (this.autoAim && this.mouseAim.lengthSq() > 0) this.toggleAutoAim(false)
      if (pointer.button === 2) {
        this.desktopRightHold = true
        this.manualAimLocked = true
      } else if (pointer.button === 0 && this.roundStarted && !this.paused && !this.levelChoiceOpen) {
        this.desktopAimToggleLock = !this.desktopAimToggleLock
        this.manualAimLocked = this.desktopAimToggleLock
        if (this.desktopAimToggleLock) this.toggleAutoAim(false)
      }
    })

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (this.touchControls) {
        if (pointer.id === this.leftPointerId) {
          this.leftCurrent.set(pointer.x, pointer.y)
          const knob = this.leftCurrent.clone().subtract(this.leftStart).limit(54)
          this.setPadVars('left', this.leftStart.x, this.leftStart.y, knob.x, knob.y)
        }
        if (pointer.id === this.rightPointerId) {
          this.rightCurrent.set(pointer.x, pointer.y)
          const knob = this.rightCurrent.clone().subtract(this.rightStart).limit(54)
          this.setPadVars('right', this.rightStart.x, this.rightStart.y, knob.x, knob.y)
        }
        return
      }

      this.mouseScreen.set(pointer.x, pointer.y)
      const world = this.cameras.main.getWorldPoint(pointer.x, pointer.y)
      this.mouseAim.set(world.x - this.player.x, world.y - this.player.y)
    })

    const end = (pointer: Phaser.Input.Pointer) => {
      if (this.touchControls) {
        if (pointer.id === this.leftPointerId) {
          this.leftPointerId = null
          this.moveVector.set(0, 0)
          document.body.classList.remove('left-touching')
          this.setPadVars('left', this.leftStart.x, this.leftStart.y, 0, 0)
        }
        if (pointer.id === this.rightPointerId) {
          this.rightPointerId = null
          document.body.classList.remove('right-touching')
          this.setPadVars('right', this.rightStart.x, this.rightStart.y, 0, 0)
        }
        return
      }

      if (pointer.button === 2) this.desktopRightHold = false
      this.manualAimLocked = this.desktopAimToggleLock
    }
    this.input.on('pointerup', end)
    this.input.on('pointerupoutside', end)
  }

  private setPadVars(side: 'left' | 'right', x: number, y: number, knobX: number, knobY: number) {
    document.documentElement.style.setProperty(`--${side}-pad-x`, `${x}px`)
    document.documentElement.style.setProperty(`--${side}-pad-y`, `${y}px`)
    document.documentElement.style.setProperty(`--${side}-knob-x`, `${knobX}px`)
    document.documentElement.style.setProperty(`--${side}-knob-y`, `${knobY}px`)
  }

  private startRound(useTitleCall = false) {
    this.panicStopped = false
    this.paused = false
    document.body.classList.remove('paused')
    this.clearLastRunState()
    if (this.hud.titleNotice) {
      this.hud.titleNotice.textContent = ''
      this.hud.titleNotice.classList.remove('visible')
    }
    this.unlockAudio()
    if (useTitleCall) this.playTitleCall()
    else this.playSe('se-round-start', { volume: 0.88, rate: 1 })
    this.titleOpen = false
    this.closeRanking()
    this.closeCodex(false)
    document.body.classList.remove('menu-open')
    this.hud.title?.classList.remove('visible')
    this.resetRoundState()
    this.roundStarted = true
    this.startBgm('bgm-main')
    this.startCameraIntro()
    this.miniMapVisible = !this.touchControls
    this.fullMapVisible = false
    this.spawnTimer = 0.35
    this.invincibleTimer = 1.2
    const initialEnemies = this.touchControls ? 8 : 10
    for (let i = 0; i < initialEnemies; i += 1) this.spawnEnemy()
    this.maybeShowDesktopHint()
    this.updateHud()
    this.syncMiniMapToggle()
    this.recordRunState('tick')
    this.diagnosticTimer = 2
  }

  private startCameraIntro() {
    if (this.cameraIntroShown) return
    this.cameraIntroShown = true
    const targetZoom = this.cameraTargetZoom()
    const closeZoom = Math.min(1.45, Math.max(1.15, targetZoom * 1.7))
    this.cameras.main.setZoom(closeZoom)
    this.tweens.add({
      targets: this.cameras.main,
      zoom: targetZoom,
      duration: 900,
      ease: 'Cubic.easeOut',
    })
  }

  private showTitleScreen() {
    this.panicStopped = false
    this.paused = false
    document.body.classList.remove('paused')
    this.resetRoundState()
    this.stopBgm()
    this.hideDesktopHint()
    this.hud.bowWarning?.classList.remove('visible')
    this.hud.itemWarning?.classList.remove('visible')
    this.hud.mouseCursor?.classList.remove('visible')
    this.miniMapVisible = false
    this.fullMapVisible = false
    this.mapPausedByToggle = false
    this.syncMiniMapToggle()
    this.titleOpen = true
    this.roundStarted = false
    this.closeRanking()
    this.closeCodex(false)
    this.hud.overlay?.classList.remove('visible')
    this.hud.title?.classList.add('visible')
    document.body.classList.add('menu-open')
    this.renderTitleSummary()
    if (this.audioUnlocked) this.startBgm('bgm-title')
    this.updateHud()
  }

  private renderTitleSummary() {
    if (this.hud.titleBest) this.hud.titleBest.textContent = String(this.highScore())
    this.renderTitleNotice()
  }

  private clearLastRunState() {
    try {
      localStorage.removeItem(LAST_RUN_STATE_KEY)
      localStorage.removeItem(LAST_ERROR_KEY)
    } catch {
      // Ignore storage failures.
    }
  }

  private renderTitleNotice() {
    if (!this.hud.titleNotice || !this.titleOpen) return
    try {
      const raw = localStorage.getItem(LAST_RUN_STATE_KEY)
      const errorRaw = localStorage.getItem(LAST_ERROR_KEY)
      if (!raw) {
        if (errorRaw) {
          const errorState = JSON.parse(errorRaw) as { reason?: string; elapsed?: number; enemies?: number; bullets?: number; crumbs?: number }
          const elapsed = typeof errorState.elapsed === 'number' ? this.formatTime(errorState.elapsed) : '--'
          this.hud.titleNotice.textContent = `前回プレイはエラー停止ログを残しています。${errorState.reason || 'ERROR'} / TIME ${elapsed}`
          this.hud.titleNotice.classList.add('visible')
          this.clearLastRunState()
        } else {
          this.hud.titleNotice.textContent = ''
          this.hud.titleNotice.classList.remove('visible')
        }
        return
      }
      const state = JSON.parse(raw) as { reason?: string; elapsed?: number; enemies?: number; bullets?: number; crumbs?: number; at?: number }
      if (state.reason?.startsWith('error:')) {
        const errorState = errorRaw ? JSON.parse(errorRaw) as { reason?: string; elapsed?: number; enemies?: number; bullets?: number; crumbs?: number } : state
        const elapsed = typeof errorState.elapsed === 'number' ? this.formatTime(errorState.elapsed) : '--'
        const enemies = typeof errorState.enemies === 'number' ? errorState.enemies : '?'
        const bullets = typeof errorState.bullets === 'number' ? errorState.bullets : '?'
        this.hud.titleNotice.textContent = `前回プレイはエラー停止ログを残しています。${errorState.reason || state.reason} / TIME ${elapsed} / 敵 ${enemies} / 弾 ${bullets}`
        this.hud.titleNotice.classList.add('visible')
        this.clearLastRunState()
        return
      }
      const reloadLike = state.reason === 'hidden' || state.reason === 'pagehide' || state.reason === 'pagehide-bfcache' || state.reason === 'beforeunload' || state.reason === 'tick'
      if (!reloadLike) {
        this.hud.titleNotice.textContent = ''
        this.hud.titleNotice.classList.remove('visible')
        return
      }
      const elapsed = typeof state.elapsed === 'number' ? this.formatTime(state.elapsed) : '--'
      const enemies = typeof state.enemies === 'number' ? state.enemies : '?'
      const bullets = typeof state.bullets === 'number' ? state.bullets : '?'
      const crumbs = typeof state.crumbs === 'number' ? state.crumbs : '?'
      const cause = PAGE_LOAD_CAUSE.wasDiscarded
        ? 'ブラウザがメモリ節約のためページを破棄しました'
        : PAGE_LOAD_CAUSE.navigationType === 'reload'
          ? 'ページの再読み込みが発生しました'
          : PAGE_LOAD_CAUSE.sameTabSession
            ? '同じタブでページが再作成されました'
            : 'ブラウザ終了またはページ移動が発生しました'
      this.hud.titleNotice.textContent = `${cause}。TIME ${elapsed} / 敵 ${enemies} / 弾 ${bullets} / 消しカス ${crumbs}`
      this.hud.titleNotice.classList.add('visible')
      this.clearLastRunState()
    } catch {
      this.hud.titleNotice.textContent = '前回プレイ中に異常終了した可能性があります。保存ログの読み取りに失敗しました。'
      this.hud.titleNotice.classList.add('visible')
      this.clearLastRunState()
    }
  }

  private async openRanking() {
    if (this.rankingBusy) return
    this.hud.ranking?.classList.add('visible')
    this.resetRankingScroll()
    const cached = this.loadLeaderboardCache()
    if (cached.length) {
      this.renderLeaderboard(cached)
      this.resetRankingScroll()
      this.hud.rankingStatus!.textContent = '更新中...'
    } else {
      this.hud.rankingStatus!.textContent = '読み込み中...'
      this.hud.rankingList!.innerHTML = ''
    }
    this.rankingBusy = true
    try {
      this.leaderboard = await fetchLeaderboard(30)
      this.saveLeaderboardCache(this.leaderboard)
      this.hud.rankingStatus!.textContent = this.leaderboard.length ? '' : 'まだランキングがありません'
      this.renderLeaderboard(this.leaderboard)
      this.resetRankingScroll()
    } catch {
      this.hud.rankingStatus!.textContent = cached.length ? '最新ランキングの取得に失敗しました' : 'ランキングの取得に失敗しました'
    } finally {
      this.rankingBusy = false
    }
  }

  private resetRankingScroll() {
    const scroller = this.hud.rankingScroll
    if (!scroller) return
    scroller.scrollTop = 0
    requestAnimationFrame(() => {
      scroller.scrollTop = 0
    })
  }

  private renderLeaderboard(entries: LeaderboardEntry[]) {
    if (!this.hud.rankingList) return
    this.hud.rankingList.innerHTML = entries
      .map((entry, index) => {
        const time = this.formatTime(entry.timeSeconds)
        const build = this.rankingBuildSummary(entry.build)
        const scoreClass = entry.score >= 600 ? ' class="score-over-600"' : ''
        const rank = index + 1
        const crown = rank <= 3
          ? '<svg class="ranking-crown" viewBox="0 0 32 24" aria-hidden="true"><path d="M3 7l7 5 6-9 6 9 7-5-3 14H6L3 7Z"></path><path d="M7 17h18"></path></svg>'
          : ''
        return `<li${scoreClass}><b class="ranking-rank ranking-rank-${rank}">${crown}${rank}</b><strong>${this.escapeHtml(entry.name)}</strong><span class="ranking-score">${entry.score}</span><i><em>Level ${Math.max(1, Math.floor(entry.level))}</em><em>${time}</em><em>${this.escapeHtml(build)}</em></i></li>`
      })
      .join('')
  }

  private rankingBuildSummary(build: string) {
    const source = build.replace(/\s+/g, ' ').trim()
    return source || '武器情報なし'
  }

  private loadLeaderboardCache() {
    try {
      const raw = localStorage.getItem(LEADERBOARD_CACHE_KEY)
      if (!raw) return []
      const parsed = JSON.parse(raw) as { at?: number; entries?: LeaderboardEntry[] }
      if (!Array.isArray(parsed.entries)) return []
      if (typeof parsed.at === 'number' && Date.now() - parsed.at > LEADERBOARD_CACHE_MS) return []
      return parsed.entries.slice(0, 30)
    } catch {
      return []
    }
  }

  private saveLeaderboardCache(entries: LeaderboardEntry[]) {
    try {
      localStorage.setItem(LEADERBOARD_CACHE_KEY, JSON.stringify({ at: Date.now(), entries: entries.slice(0, 30) }))
    } catch {
      // Ranking cache is an optional speed-up.
    }
  }

  private closeRanking() {
    this.hud.ranking?.classList.remove('visible')
  }

  private shareUrl(source: 'x' | 'line' | 'share') {
    const url = new URL(window.location.href)
    url.search = ''
    url.hash = ''
    url.searchParams.set('utm_source', source)
    url.searchParams.set('utm_medium', 'social')
    url.searchParams.set('utm_campaign', 'player_share')
    return url.toString()
  }

  private shareMessage() {
    return '消しゴムサバイバーをプレイしよう！'
  }

  private openShare() {
    const xUrl = new URL('https://x.com/intent/post')
    xUrl.searchParams.set('text', this.shareMessage())
    xUrl.searchParams.set('url', this.shareUrl('x'))
    const lineUrl = `https://line.me/R/msg/text/?${encodeURIComponent(`${this.shareMessage()}\n${this.shareUrl('line')}`)}`
    if (this.hud.shareX) this.hud.shareX.href = xUrl.toString()
    if (this.hud.shareLine) this.hud.shareLine.href = lineUrl
    if (this.hud.shareNative) this.hud.shareNative.hidden = typeof navigator.share !== 'function'
    if (this.hud.shareStatus) this.hud.shareStatus.textContent = '共有方法を選んでください。'
    this.hud.shareDialog?.classList.add('visible')
    document.body.classList.add('dialog-open')
  }

  private closeShare() {
    this.hud.shareDialog?.classList.remove('visible')
    document.body.classList.remove('dialog-open')
  }

  private async shareWithDevice() {
    if (typeof navigator.share !== 'function') return
    try {
      await navigator.share({ title: '消しゴムサバイバー', text: this.shareMessage(), url: this.shareUrl('share') })
      if (this.hud.shareStatus) this.hud.shareStatus.textContent = '共有しました。'
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return
      if (this.hud.shareStatus) this.hud.shareStatus.textContent = '共有を完了できませんでした。'
    }
  }

  private async copyShareLink() {
    const url = this.shareUrl('share')
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url)
      } else {
        const input = document.createElement('textarea')
        input.value = url
        input.setAttribute('readonly', '')
        input.style.position = 'fixed'
        input.style.opacity = '0'
        document.body.appendChild(input)
        input.select()
        document.execCommand('copy')
        input.remove()
      }
      if (this.hud.shareStatus) this.hud.shareStatus.textContent = 'リンクをコピーしました。'
    } catch {
      if (this.hud.shareStatus) this.hud.shareStatus.textContent = 'コピーできませんでした。'
    }
  }

  private openCodex() {
    this.unlockAudio()
    this.startBgm('bgm-codex')
    const discovered = this.loadDiscoveredFusions()
    this.hud.codexList!.innerHTML = (Object.keys(FUSIONS) as FusionId[])
      .map((id) => {
        const fusion = FUSIONS[id]
        const isDiscovered = discovered.has(id)
        const title = isDiscovered ? fusion.name : '？？？'
        return `
          <li class="${isDiscovered ? 'found' : ''}">
            <button type="button" data-fusion-preview="${id}">
              <b>${this.escapeHtml(title)}</b>
              <span>${this.escapeHtml(isDiscovered ? this.fusionChoiceDetails(id) : this.fusionRecipeLabel(id))}</span>
              <i>${this.escapeHtml(isDiscovered ? fusion.description : '？？？')}</i>
            </button>
          </li>`
      })
      .join('')
    for (const button of Array.from(this.hud.codexList!.querySelectorAll<HTMLButtonElement>('button'))) {
      button.onclick = () => this.renderFusionPreview(button.dataset.fusionPreview as FusionId)
    }
    this.renderFusionPreview((Object.keys(FUSIONS) as FusionId[])[0])
    this.hud.codex?.classList.add('visible')
  }

  private closeCodex(resumeTitleBgm = true) {
    this.hud.codex?.classList.remove('visible')
    if (resumeTitleBgm && this.titleOpen) this.startBgm('bgm-title')
  }

  private openHowTo(markSeen: boolean) {
    this.hud.howTo?.classList.add('visible')
    document.body.classList.add('dialog-open')
    if (markSeen) localStorage.setItem(HOW_TO_SEEN_KEY, '1')
  }

  private closeHowTo(markSeen: boolean) {
    if (markSeen) localStorage.setItem(HOW_TO_SEEN_KEY, '1')
    this.hud.howTo?.classList.remove('visible')
    document.body.classList.remove('dialog-open')
    this.unlockAudio()
    if (this.titleOpen) this.startBgm('bgm-title')
  }

  private openHowToIfFirstVisit() {
    if (localStorage.getItem(HOW_TO_SEEN_KEY) === '1') return
    this.openHowTo(false)
  }

  private unlockAudio() {
    if (this.audioUnlocked) return
    const soundManager = this.sound as Phaser.Sound.BaseSoundManager & { context?: AudioContext }
    soundManager.context?.resume?.().catch(() => {})
    soundManager.volume = 1
    this.audioUnlocked = true
  }

  private currentSeVolume() {
    return (Phaser.Math.Clamp(this.seVolumeLevel, 0, 10) / 10) * 0.45
  }

  private currentBgmVolume() {
    return (Phaser.Math.Clamp(this.bgmVolumeLevel, 0, 10) / 10) * 0.32
  }

  private currentVoiceVolume() {
    return (Phaser.Math.Clamp(this.voiceVolumeLevel, 0, 10) / 10) * 0.82
  }

  private setVolumeLevel(kind: 'se' | 'bgm' | 'voice' | 'map', value: number) {
    const level = Phaser.Math.Clamp(Number.isFinite(value) ? Math.round(value) : 0, 0, 10)
    if (kind === 'se') {
      this.seVolumeLevel = level
      localStorage.setItem(SE_VOLUME_KEY, String(level))
    } else if (kind === 'bgm') {
      this.bgmVolumeLevel = level
      localStorage.setItem(BGM_VOLUME_KEY, String(level))
      this.applyBgmVolume()
    } else if (kind === 'voice') {
      this.voiceVolumeLevel = level
      localStorage.setItem(VOICE_VOLUME_KEY, String(level))
    } else {
      this.mapZoomLevel = Phaser.Math.Clamp(level, 1, 10)
      localStorage.setItem(MAP_ZOOM_KEY, String(this.mapZoomLevel))
      this.applyCameraZoom()
    }
    this.syncVolumeUi()
  }

  private syncVolumeUi() {
    if (this.hud.seVolume) this.hud.seVolume.value = String(this.seVolumeLevel)
    if (this.hud.bgmVolume) this.hud.bgmVolume.value = String(this.bgmVolumeLevel)
    if (this.hud.voiceVolume) this.hud.voiceVolume.value = String(this.voiceVolumeLevel)
    if (this.hud.seVolumeValue) this.hud.seVolumeValue.textContent = String(this.seVolumeLevel)
    if (this.hud.bgmVolumeValue) this.hud.bgmVolumeValue.textContent = String(this.bgmVolumeLevel)
    if (this.hud.voiceVolumeValue) this.hud.voiceVolumeValue.textContent = String(this.voiceVolumeLevel)
    if (this.hud.titleSeVolume) this.hud.titleSeVolume.value = String(this.seVolumeLevel)
    if (this.hud.titleBgmVolume) this.hud.titleBgmVolume.value = String(this.bgmVolumeLevel)
    if (this.hud.titleVoiceVolume) this.hud.titleVoiceVolume.value = String(this.voiceVolumeLevel)
    if (this.hud.titleSeVolumeValue) this.hud.titleSeVolumeValue.textContent = String(this.seVolumeLevel)
    if (this.hud.titleBgmVolumeValue) this.hud.titleBgmVolumeValue.textContent = String(this.bgmVolumeLevel)
    if (this.hud.titleVoiceVolumeValue) this.hud.titleVoiceVolumeValue.textContent = String(this.voiceVolumeLevel)
    if (this.hud.mapZoom) this.hud.mapZoom.value = String(this.mapZoomLevel)
    if (this.hud.titleMapZoom) this.hud.titleMapZoom.value = String(this.mapZoomLevel)
    if (this.hud.mapZoomValue) this.hud.mapZoomValue.textContent = String(this.mapZoomLevel)
    if (this.hud.titleMapZoomValue) this.hud.titleMapZoomValue.textContent = String(this.mapZoomLevel)
  }

  private applyBgmVolume() {
    if (this.bgmGain) this.bgmGain.gain.value = this.currentBgmVolume()
    else if (this.bgm) this.bgm.volume = this.currentBgmVolume()
  }

  private startBgm(key: BgmKey = 'bgm-main') {
    if (!this.audioUnlocked) return
    if (this.bgm && this.currentBgmKey !== key) {
      this.releaseBgmElement()
    }
    if (!this.bgm) {
      const audio = new Audio(BGM_SOURCES[key])
      audio.loop = true
      audio.preload = 'metadata'
      audio.volume = 1
      audio.setAttribute('playsinline', '')
      this.bgm = audio
      this.currentBgmKey = key
      const soundManager = this.sound as Phaser.Sound.BaseSoundManager & { context?: AudioContext }
      if (soundManager.context) {
        try {
          this.bgmMediaSource = soundManager.context.createMediaElementSource(audio)
          this.bgmGain = soundManager.context.createGain()
          this.bgmMediaSource.connect(this.bgmGain)
          this.bgmGain.connect(soundManager.context.destination)
        } catch {
          this.bgmMediaSource = null
          this.bgmGain = null
          audio.volume = this.currentBgmVolume()
        }
      } else {
        audio.volume = this.currentBgmVolume()
      }
    }
    if (this.bgm.paused) {
      void this.bgm.play().catch((error) => {
        if (!(error instanceof DOMException) || error.name !== 'AbortError') {
          console.info('[Eraser Survivor] BGM waits for user interaction', error)
        }
      })
    }
    this.applyBgmVolume()
  }

  private releaseBgmElement() {
    this.bgmMediaSource?.disconnect()
    this.bgmGain?.disconnect()
    this.bgmMediaSource = null
    this.bgmGain = null
    if (this.bgm) {
      this.bgm.pause()
      this.bgm.removeAttribute('src')
      this.bgm.load()
      this.bgm = null
    }
    this.currentBgmKey = null
  }

  private stopBgm() {
    this.bgm?.pause()
  }

  private playSe(key: string, config?: Phaser.Types.Sound.SoundConfig) {
    this.unlockAudio()
    const requestedVolume = typeof config?.volume === 'number' ? config.volume : 1
    this.sound.play(key, { ...config, volume: requestedVolume * this.currentSeVolume() })
  }

  private playVoice(key: string, config?: Phaser.Types.Sound.SoundConfig) {
    this.unlockAudio()
    const requestedVolume = typeof config?.volume === 'number' ? config.volume : 1
    this.sound.play(key, { ...config, volume: requestedVolume * this.currentVoiceVolume() })
  }

  private pickTitleCallKey() {
    const roll = Math.random()
    if (roll < 0.5) return TITLE_CALL_PRIMARY_KEY
    if (roll < 0.9) return TITLE_CALL_SECONDARY_KEY
    const jokeIndex = Math.floor(Math.random() * TITLE_CALL_JOKE_KEYS.length)
    return TITLE_CALL_JOKE_KEYS[jokeIndex] ?? TITLE_CALL_JOKE_KEYS[0]
  }

  private playTitleCall() {
    this.playVoice(this.pickTitleCallKey(), { volume: 1, rate: 1 })
  }

  private readInput() {
    this.moveVector.set(0, 0)
    if (this.cursors.left.isDown || this.keys.A.isDown) this.moveVector.x -= 1
    if (this.cursors.right.isDown || this.keys.D.isDown) this.moveVector.x += 1
    if (this.cursors.up.isDown || this.keys.W.isDown) this.moveVector.y -= 1
    if (this.cursors.down.isDown || this.keys.S.isDown) this.moveVector.y += 1
    if (this.touchControls && this.leftPointerId !== null) this.moveVector.copy(this.leftCurrent).subtract(this.leftStart)
    if (this.moveVector.lengthSq() > 0) this.moveVector.normalize()

    if (this.touchControls) {
      if (this.rightPointerId !== null) {
        const aim = this.rightCurrent.clone().subtract(this.rightStart)
        if (aim.lengthSq() > MANUAL_AIM_DEADZONE) {
          this.aimVector.copy(aim.normalize())
          this.manualAimLocked = true
          if (this.autoAim) this.toggleAutoAim(false)
        }
      } else if (this.autoAim) {
        const nearest = this.findNearestTarget()
        if (nearest) this.aimVector.set(nearest.x - this.player.x, nearest.y - this.player.y).normalize()
      }
      return
    }

    const desktopHoldLock = this.desktopRightHold || this.keys.SHIFT.isDown || this.keys.CTRL.isDown
    if (this.autoAim) {
      const nearest = this.findNearestTarget()
      if (nearest) this.aimVector.set(nearest.x - this.player.x, nearest.y - this.player.y).normalize()
      this.manualAimLocked = false
      return
    }

    const world = this.cameras.main.getWorldPoint(this.mouseScreen.x, this.mouseScreen.y)
    this.mouseAim.set(world.x - this.player.x, world.y - this.player.y)
    if (!desktopHoldLock && !this.desktopAimToggleLock && this.mouseAim.lengthSq() > 0) {
      this.aimVector.copy(this.mouseAim.normalize())
      this.manualAimLocked = false
    } else if (desktopHoldLock || this.desktopAimToggleLock) {
      this.manualAimLocked = true
      if (this.mouseAim.lengthSq() > 0 && !this.desktopAimToggleLock && this.desktopRightHold) {
        this.aimVector.copy(this.mouseAim.normalize())
      }
    }
  }

  private updateAimMarker() {
    const dir = this.aimVector.clone()
    if (dir.lengthSq() === 0) dir.set(1, 0)
    dir.normalize()
    this.aimMarker.x = this.player.x + dir.x * 42
    this.aimMarker.y = this.player.y + dir.y * 42
    this.aimMarker.setAngle(Phaser.Math.RadToDeg(Math.atan2(dir.y, dir.x)) + 180)
    const activeAim = this.autoAim || this.manualAimLocked || this.rightPointerId !== null || (!this.touchControls && this.mouseAim.lengthSq() > 0)
    this.aimMarker.setAlpha(activeAim ? 0.96 : 0.72)
  }

  private movePlayer(dt: number) {
    this.player.x = Phaser.Math.Clamp(this.player.x + this.moveVector.x * this.playerSpeed * dt, this.playerRadius, WORLD_WIDTH - this.playerRadius)
    this.player.y = Phaser.Math.Clamp(this.player.y + this.moveVector.y * this.playerSpeed * dt, this.playerRadius, WORLD_HEIGHT - this.playerRadius)
    this.player.setFlipX(this.meleeFlashTimer > 0 ? this.aimVector.x < 0 : this.aimVector.x > 0)
    const attackLean = this.meleeFlashTimer > 0 ? Math.sign(this.aimVector.x || 1) * 7 : 0
    this.player.setAngle(attackLean + Math.sin(this.elapsed * 10) * (this.moveVector.lengthSq() > 0 ? 2.4 : 0.6))
  }

  private updateBowGuard() {
    const active = this.weaponLevels.bowGuard > 0
      && this.moveVector.lengthSq() === 0
      && this.meleeFlashTimer <= 0
      && !this.damagePose
      && this.hp > 0
    if (active === this.bowGuardActive) return
    this.bowGuardActive = active
    if (active) {
      this.player.setTexture('eraser-case')
      this.player.setDisplaySize(58, 58)
      this.player.setTint(0xd9ecff)
    } else if (!this.damagePose && this.goldRushTimer <= 0) {
      this.player.setTexture('eraser-bare')
      this.player.setDisplaySize(58, 58)
      this.player.clearTint()
    }
  }

  private updatePlayerAura(dt: number) {
    if (this.bowGuardActive) {
      this.player.setTint(0xd9ecff)
      return
    }
    if (this.goldRushTimer > 0) {
      this.player.setTint(0xffd13b)
      this.goldRushSparkTimer -= dt
      if (this.goldRushSparkTimer <= 0) {
        const shine = this.add.image(this.player.x + 16, this.player.y - 18, 'fx-gold-crumb-shine')
        shine.setDisplaySize(18, 18)
        shine.setDepth(24)
        shine.setAngle(-18)
        this.tweens.add({
          targets: shine,
          x: shine.x + 4,
          y: shine.y - 4,
          alpha: 0,
          scaleX: 1.5,
          scaleY: 1.5,
          duration: 240,
          ease: 'Sine.easeOut',
          onComplete: () => shine.destroy(),
        })
        this.goldRushSparkTimer = 0.12
      }
      return
    }
    this.player.clearTint()
  }

  private updatePencilBoss(dt: number) {
    if (!this.bossSpawned && this.elapsed >= BOSS_SPAWN_SECONDS) this.spawnPencilBoss()
    const boss = this.pencilBoss
    if (!boss) return
    this.syncPencilBossHealthBar()

    const bossDir = new Phaser.Math.Vector2(this.player.x - boss.body.x, this.player.y - boss.body.y)
    const distance = bossDir.length()
    if (distance > 0) bossDir.normalize()

    boss.walkCooldown -= dt
    boss.summonCooldown -= dt
    if (boss.walkTime > 0) {
      const pace = distance > 120 ? 66 : 42
      boss.body.x = Phaser.Math.Clamp(boss.body.x + bossDir.x * pace * dt, boss.radius, WORLD_WIDTH - boss.radius)
      boss.body.y = Phaser.Math.Clamp(boss.body.y + bossDir.y * pace * dt, boss.radius, WORLD_HEIGHT - boss.radius)
      boss.walkTime -= dt
    } else if (boss.walkCooldown <= 0) {
      boss.walkTime = Phaser.Math.FloatBetween(0.7, 1.45)
      boss.walkCooldown = Phaser.Math.FloatBetween(1.6, 3.2)
    }

    boss.body.setFlipX(bossDir.x < 0)
    boss.body.setAngle(Math.sin(this.elapsed * 4.4) * 2.2)
    if (boss.summonCooldown <= 0) {
      this.spawnBossMinionWave()
      boss.summonCooldown = Math.max(1.8, 3.4 - this.bossSummonWave * 0.08)
    }
  }

  private syncPencilBossHealthBar() {
    const boss = this.pencilBoss
    if (!boss) return
    const barY = boss.body.y - 76
    boss.healthBack.setPosition(boss.body.x, barY)
    boss.healthFill.setPosition(boss.body.x - 40, barY)
    boss.healthFill.setScale(Math.max(0, Math.min(1, boss.hp / boss.maxHp)), 1)
  }

  private spawnPencilBoss() {
    if (this.pencilBoss) return
    this.bossSpawned = true
    this.bossPhase = true
    this.bossSummonWave = 0
    this.bossFightStartedAt = this.elapsed
    this.startBgm('bgm-boss')
    const x = Phaser.Math.Clamp(this.player.x + 180, 96, WORLD_WIDTH - 96)
    const y = Phaser.Math.Clamp(this.player.y - 180, 96, WORLD_HEIGHT - 96)
    const body = this.add.image(x, y, 'pencil-boss')
    body.setDisplaySize(122, 122)
    body.setDepth(18)
    const healthBack = this.add.rectangle(x, y - 76, 84, 7, 0x20171a, 0.94)
    healthBack.setStrokeStyle(1, 0xf6e7d2, 0.72)
    healthBack.setDepth(20)
    const healthFill = this.add.rectangle(x - 40, y - 76, 80, 4, 0xd42626, 1)
    healthFill.setOrigin(0, 0.5)
    healthFill.setDepth(21)
    this.pencilBoss = {
      body,
      healthBack,
      healthFill,
      hp: PENCIL_BOSS_HP,
      maxHp: PENCIL_BOSS_HP,
      radius: 42,
      walkCooldown: 1.1,
      walkTime: 0.85,
      summonCooldown: 1.8,
    }
    this.syncPencilBossHealthBar()
    this.spawnWhiteBurst(x, y, 2.2)
    const title = this.add.text(x, y - 82, 'BOSS', {
      fontFamily: '"Arial Narrow", "Segoe UI", sans-serif',
      fontSize: '24px',
      fontStyle: '900',
      color: '#d42626',
      stroke: '#ffffff',
      strokeThickness: 5,
    })
    title.setOrigin(0.5)
    title.setDepth(22)
    this.tweens.add({ targets: title, y: title.y - 24, alpha: 0, duration: 900, ease: 'Cubic.easeOut', onComplete: () => title.destroy() })
    this.cameras.main.shake(220, 0.012)
  }

  private spawnBossMinionWave() {
    const boss = this.pencilBoss
    if (!boss) return
    this.bossSummonWave += 1
    const count = Phaser.Math.Clamp(4 + Math.floor(this.bossSummonWave / 2), 4, 8)
    for (let i = 0; i < count; i += 1) {
      const spread = (i - (count - 1) / 2) * 24 + Phaser.Math.Between(-8, 8)
      const x = Phaser.Math.Clamp(boss.body.x + spread, 32, WORLD_WIDTH - 32)
      const y = Phaser.Math.Clamp(boss.body.y + 74 + Phaser.Math.Between(-6, 18), 32, WORLD_HEIGHT - 32)
      const kind = this.pickBossMinionKind()
      this.spawnEnemy(kind === '龖', { x, y, fromBoss: true, kind })
    }
  }

  private pickBossMinionKind(): EnemyKind {
    const roll = Phaser.Math.Between(1, 100)
    if (roll <= 48) return '兵'
    if (roll <= 65) return '馬'
    if (roll <= 80) return '盾'
    if (roll <= 92) return '槍'
    if (roll <= 98) return '弓'
    return '龖'
  }

  private updateMelee() {
    if (this.weaponLevels.melee <= 0) return
    if (this.bowGuardActive) return
    if (this.meleeTimer > 0) return
    if (!this.hasMeleeTargetInRange()) return
    this.meleeTimer = 0.42
    this.meleeFlashTimer = 0.14
    this.playPlayerAttackPose()
    this.drawHeadbuttSlash()

    const level = Phaser.Math.Clamp(this.weaponLevels.melee, 1, MAX_UPGRADE_LEVEL)
    const side = this.aimVector.x < 0 ? -1 : 1
    const rangeBoost = level >= 3 ? 1.22 : 1
    const hitX = this.player.x + side * 52 * rangeBoost
    const hitY = this.player.y + this.aimVector.y * 14
    const hitWidth = level >= 3 ? 62 : 50
    const hitHeight = level >= 3 ? 48 : 40
    const bodyHitRadius = level >= 3 ? 38 : 32
    for (const enemy of this.enemyGrid.query(hitX, hitY, 112 * rangeBoost)) {
      const dx = Math.abs(enemy.text.x - hitX)
      const dy = Math.abs(enemy.text.y - hitY)
      if (dx <= hitWidth && dy <= hitHeight) this.damageEnemy(enemy, MELEE_DAMAGE[level], side * 24, 'melee')
    }
    for (const enemy of this.enemyGrid.query(this.player.x, this.player.y, bodyHitRadius + 36)) {
      if (this.circleHit(this.player.x, this.player.y, bodyHitRadius, enemy.text.x, enemy.text.y, enemy.radius)) {
        this.damageEnemy(enemy, MELEE_DAMAGE[level], Math.sign(enemy.text.x - this.player.x || side) * 18, 'melee')
      }
    }
    const bossRadius = level >= 3 ? 54 : 42
    if (this.pencilBoss && this.circleHit(hitX, hitY, bossRadius, this.pencilBoss.body.x, this.pencilBoss.body.y, this.pencilBoss.radius)) {
      this.damagePencilBoss(MELEE_DAMAGE[level], side * 18)
    }
    if (this.pencilBoss && this.circleHit(this.player.x, this.player.y, bodyHitRadius, this.pencilBoss.body.x, this.pencilBoss.body.y, this.pencilBoss.radius)) {
      this.damagePencilBoss(MELEE_DAMAGE[level], Math.sign(this.pencilBoss.body.x - this.player.x || side) * 14)
    }
  }

  private hasMeleeTargetInRange() {
    const level = Phaser.Math.Clamp(this.weaponLevels.melee, 1, MAX_UPGRADE_LEVEL)
    const side = this.aimVector.x < 0 ? -1 : 1
    const rangeBoost = level >= 3 ? 1.22 : 1
    const triggerRadius = MELEE_TRIGGER_RADIUS * rangeBoost
    const hitX = this.player.x + side * 52 * rangeBoost
    const hitY = this.player.y + this.aimVector.y * 14
    const bodyTriggerRadius = level >= 3 ? 42 : 36
    for (const enemy of this.enemyGrid.query(hitX, hitY, triggerRadius)) {
      const dx = enemy.text.x - hitX
      const dy = enemy.text.y - hitY
      if (dx * dx + dy * dy <= triggerRadius * triggerRadius) return true
    }
    for (const enemy of this.enemyGrid.query(this.player.x, this.player.y, bodyTriggerRadius + 36)) {
      if (this.circleHit(this.player.x, this.player.y, bodyTriggerRadius, enemy.text.x, enemy.text.y, enemy.radius)) return true
    }
    if (this.pencilBoss && this.circleHit(hitX, hitY, triggerRadius, this.pencilBoss.body.x, this.pencilBoss.body.y, this.pencilBoss.radius)) return true
    if (this.pencilBoss && this.circleHit(this.player.x, this.player.y, bodyTriggerRadius, this.pencilBoss.body.x, this.pencilBoss.body.y, this.pencilBoss.radius)) return true
    return false
  }

  private playPlayerAttackPose() {
    this.player.setTexture('eraser-bare-hit')
    this.player.setDisplaySize(66, 66)
    this.time.delayedCall(140, () => {
      if (this.hp <= 0 || this.damagePose) return
      this.player.setTexture(this.bowGuardActive ? 'eraser-case' : 'eraser-bare')
      this.player.setDisplaySize(58, 58)
      this.player.setFlipX(this.aimVector.x > 0)
    })
  }

  private drawHeadbuttSlash() {
    const level = Phaser.Math.Clamp(this.weaponLevels.melee, 1, MAX_UPGRADE_LEVEL)
    const side = this.aimVector.x < 0 ? -1 : 1
    const rangeBoost = level >= 3 ? 1.22 : 1
    const slash = this.add.rectangle(this.player.x + side * 52 * rangeBoost, this.player.y + this.aimVector.y * 14, level >= 3 ? 68 : 54, level >= 3 ? 34 : 26, 0xffffff, 0.7)
    slash.setStrokeStyle(2, 0x4da3ff, 0.9)
    slash.setDepth(15)
    this.tweens.add({ targets: slash, x: slash.x + side * 18, alpha: 0, scaleX: 0.35, duration: 130, onComplete: () => slash.destroy() })
  }

  private fusedLevel(id: WeaponId) {
    return this.fusedBaseWeapons.has(id) ? MAX_UPGRADE_LEVEL : 0
  }

  private activeWeaponLevel(id: WeaponId) {
    return Math.max(this.weaponLevels[id], this.fusedLevel(id))
  }

  private updateWeapons() {
    if (this.bowGuardActive) return
    const projectileFactor = this.projectileCountMultiplier()
    const rangeFactor = this.attackRangeMultiplier()
    const bulletLevel = this.activeWeaponLevel('bullet')
    if (bulletLevel > 0 && this.weaponTimers.bullet <= 0) {
      const level = Phaser.Math.Clamp(bulletLevel, 1, MAX_UPGRADE_LEVEL)
      this.weaponTimers.bullet = this.cooldown(level >= 3 ? 0.42 : 0.58)
      this.firePattern(projectileFactor, 0.06, (direction) => {
        this.fireBullet(direction, level >= 3 ? 12 : 9, level >= 3 ? 500 : 440, BULLET_DAMAGE[level], 0, (level >= 3 ? 1.65 : 1.25) * RANGE_BUFF * rangeFactor, 'bullet', true, 12)
      })
    }
    const sniperLevel = this.activeWeaponLevel('sniper')
    if (sniperLevel > 0 && this.weaponTimers.sniper <= 0) {
      const level = Phaser.Math.Clamp(sniperLevel, 1, MAX_UPGRADE_LEVEL)
      this.weaponTimers.sniper = this.cooldown(this.hasFusion('sniper-rapid') ? MACHINEGUN_FIRE_INTERVAL : level >= 3 ? 0.52 : 1.55)
      this.fireSniperVolley(level, rangeFactor)
    }
    const shotgunLevel = this.activeWeaponLevel('shotgun')
    if (shotgunLevel > 0 && this.weaponTimers.shotgun <= 0) {
      const level = Phaser.Math.Clamp(shotgunLevel, 1, MAX_UPGRADE_LEVEL)
      this.weaponTimers.shotgun = this.cooldown(this.hasFusion('shotgun-rapid') ? MACHINEGUN_FIRE_INTERVAL : 1.34)
      const count = (level >= 3 ? 8 : 5) * projectileFactor
      for (let i = 0; i < count; i += 1) {
        const width = level >= 3 ? 30 : 52
        const spread = Phaser.Math.DegToRad(-width / 2 + (width * i) / Math.max(1, count - 1))
        this.fireBullet(this.rotatedAim(spread), this.hasFusion('shotgun-big') ? CANNON_FUSION_RADIUS : level >= 3 ? 6 : 5, 460, this.hasFusion('shotgun-power') ? 20 : SHOTGUN_DAMAGE[level], this.hasFusion('shotgun-pierce') ? Number.POSITIVE_INFINITY : 0, 0.72 * RANGE_BUFF * rangeFactor, 'shotgun', false, 9)
      }
      this.spawnMuzzleSpark(this.aimVector, 0.92)
    }
    const machinegunLevel = this.activeWeaponLevel('machinegun')
    if (machinegunLevel > 0 && this.weaponTimers.machinegun <= 0) {
      const level = Phaser.Math.Clamp(machinegunLevel, 1, MAX_UPGRADE_LEVEL)
      this.weaponTimers.machinegun = this.cooldown(level >= 3 ? MACHINEGUN_FIRE_INTERVAL : 0.13)
      const burst = (this.hasFusion('machinegun-spread') ? SHOTGUN_FUSION_SHOT_COUNT : 1) * projectileFactor
      // Fusion changes the firing shape, not the base shot count.
      for (let i = 0; i < burst; i += 1) {
        const jitter = Phaser.Math.FloatBetween(-0.11, 0.11)
        const spread = this.hasFusion('machinegun-spread') ? Phaser.Math.FloatBetween(-0.18, 0.18) : jitter
        this.fireBullet(this.rotatedAim(spread), this.hasFusion('machinegun-big') ? CANNON_FUSION_RADIUS : 4, 575, this.hasFusion('machinegun-power') ? 13 : MACHINEGUN_DAMAGE[level], this.hasFusion('machinegun-pierce') ? Number.POSITIVE_INFINITY : 0, 0.62 * RANGE_BUFF * rangeFactor, 'machinegun', true, 22)
      }
    }
    const cannonLevel = this.activeWeaponLevel('cannon')
    if (cannonLevel > 0 && this.weaponTimers.cannon <= 0) {
      const level = Phaser.Math.Clamp(cannonLevel, 1, MAX_UPGRADE_LEVEL)
      this.weaponTimers.cannon = this.cooldown(this.hasFusion('cannon-rapid') ? MACHINEGUN_FIRE_INTERVAL : 2.18)
      const cannonShots = this.hasFusion('cannon-spread') ? projectileFactor * SHOTGUN_FUSION_SHOT_COUNT : projectileFactor
      this.firePattern(cannonShots, this.hasFusion('cannon-spread') ? 0.095 : 0.055, (direction) => {
        const cannonDamage = this.hasFusion('cannon-power') ? 40 : this.hasFusion('cannon-big') ? 30 : CANNON_DAMAGE[level]
        const cannonRadius = this.hasCannonFusion() ? CANNON_FUSION_RADIUS : level >= 3 ? 36 : 32
        this.fireBullet(direction, cannonRadius, 360, cannonDamage, level >= 3 ? Number.POSITIVE_INFINITY : 3, 1.45 * RANGE_BUFF * rangeFactor, 'cannon', true, 48)
      })
      const cannonShakeDuration = this.hasFusion('cannon-rapid') ? 18 : 55
      const cannonShakeIntensity = this.hasFusion('cannon-rapid') ? 0.0008 : 0.003
      this.cameras.main.shake(cannonShakeDuration, cannonShakeIntensity)
    }
    if (this.hasFusion('anti-bow-missile') && this.antiBowTimer <= 0) {
      const target = this.findAntiBowTarget(this.player.x, this.player.y)
      if (target) {
        const direction = new Phaser.Math.Vector2(target.x - this.player.x, target.y - this.player.y)
        this.fireBullet(direction, 10, 900, HOMING_MISSILE_DAMAGE, 0, 4.8 * RANGE_BUFF * rangeFactor, 'bullet', true, 12, { homing: true, antiBow: true, ignoreShield: true })
      }
      const level = Phaser.Math.Clamp(this.activeWeaponLevel('bullet'), 1, MAX_UPGRADE_LEVEL)
      this.antiBowTimer = this.cooldown(level >= 3 ? 0.42 : 0.58)
    }
  }

  private cooldown(baseSeconds: number) {
    return baseSeconds / FIRE_RATE_BUFF
  }

  private fireSniperVolley(level: number, rangeFactor: number) {
    const directions = [this.aimVector.clone()]
    if (level >= 2) directions.push(this.aimVector.clone().scale(-1))
    const baseLaneCount = level >= 3 ? 2 : 1
    const laneCount = Math.max(baseLaneCount + this.permanentProjectileBonus, this.hasFusion('sniper-spread') ? SHOTGUN_FUSION_SHOT_COUNT / 2 : 1)
    const laneOffsets = Array.from({ length: laneCount }, (_, index) => (index - (laneCount - 1) / 2) * 12)
    const radius = this.hasFusion('sniper-big') ? CANNON_FUSION_RADIUS : 8
    const speed = level >= 3 ? 860 : 780
    const life = (level >= 3 ? 2.05 : 1.75) * RANGE_BUFF * rangeFactor
    const knockback = this.hasFusion('sniper-power') ? 24 : 10
    for (const direction of directions) {
      for (const lateralOffset of laneOffsets) {
        this.fireBullet(direction, radius, speed, SNIPER_DAMAGE[level], Number.POSITIVE_INFINITY, life, 'sniper', true, knockback, { lateralOffset })
      }
    }
  }

  private fireBullet(direction: Phaser.Math.Vector2, radius: number, speed: number, damage: number, pierce: number, life: number, visual: BulletVisual, emitSpark = true, knockback = 14, options?: { targetKind?: EnemyKind; homing?: boolean; antiBow?: boolean; ignoreShield?: boolean; lateralOffset?: number }) {
    const dir = direction.clone()
    if (dir.lengthSq() === 0) dir.set(1, 0)
    dir.normalize()
    if (this.playerFireSeTimer <= 0) {
      this.playSe('se-player-fire', { volume: visual === 'cannon' ? 1 : 0.94, rate: visual === 'machinegun' ? 1.12 : 1 })
      this.playerFireSeTimer = visual === 'machinegun' ? 0.045 : 0.085
    }
    if (emitSpark) this.spawnMuzzleSpark(dir, visual === 'cannon' ? 1.28 : visual === 'sniper' ? 1.04 : 0.86)
    const perpendicular = new Phaser.Math.Vector2(-dir.y, dir.x)
    const lateralOffset = options?.lateralOffset ?? 0
    const body = this.createBulletBody(
      visual,
      this.player.x + dir.x * 28 + perpendicular.x * lateralOffset,
      this.player.y + dir.y * 28 + perpendicular.y * lateralOffset,
      dir,
      radius,
    )
    this.bullets.push({ body, velocity: dir.scale(speed), speed, damage, source: visual, radius, life, pierce, knockback, spin: 0, trailTimer: 0, hitIds: new Set(), targetKind: options?.targetKind, homing: options?.homing, antiBow: options?.antiBow, ignoreShield: options?.ignoreShield })
    while (this.bullets.length > this.maxBullets()) {
      const removed = this.bullets.shift()
      if (removed) this.releaseBulletBody(removed.body)
    }
  }

  private rotatedAim(radians: number) {
    return this.aimVector.clone().rotate(radians)
  }

  private projectileCountMultiplier() {
    return 1 + this.permanentProjectileBonus
  }

  private attackRangeMultiplier() {
    return this.buffTimers.range > 0 ? 2 : 1
  }

  private firePattern(multiplier: number, spreadStep: number, fire: (direction: Phaser.Math.Vector2) => void) {
    if (multiplier <= 1) {
      fire(this.aimVector)
      return
    }
    for (let i = 0; i < multiplier; i += 1) {
      const spread = spreadStep * (i - (multiplier - 1) / 2)
      fire(this.rotatedAim(spread))
    }
  }

  private createBulletBody(visual: BulletVisual, x: number, y: number, dir: Phaser.Math.Vector2, radius: number) {
    const angle = Phaser.Math.RadToDeg(Math.atan2(dir.y, dir.x)) + 180
    const config = BULLET_VISUALS[visual]
    const sprite = this.bulletPool.pop() ?? this.add.image(x, y, config.key)
    sprite.setTexture(config.key)
    sprite.setPosition(x, y)
    sprite.setActive(true)
    sprite.setVisible(true)
    sprite.setAlpha(1)
    sprite.setScale(1)
    const sizeScale = Phaser.Math.Clamp(radius / config.baseRadius, 0.75, 1.9)
    sprite.setDisplaySize(config.width * sizeScale, config.height * sizeScale)
    sprite.setDepth(12)
    sprite.setAngle(angle)
    return sprite
  }

  private isPointInCameraView(x: number, y: number, margin = 0) {
    const view = this.cameras.main.worldView
    return x >= view.left - margin && x <= view.right + margin && y >= view.top - margin && y <= view.bottom + margin
  }

  private findAntiBowTarget(fromX: number, fromY: number): AntiBowTarget | null {
    let best: { x: number; y: number; distance: number } | null = null
    const consider = (x: number, y: number) => {
      if (!this.isPointInCameraView(x, y, 18)) return
      const distance = Phaser.Math.Distance.Squared(fromX, fromY, x, y)
      if (!best || distance < best.distance) best = { x, y, distance }
    }
    for (const enemy of this.enemies) {
      if (enemy.text.active) consider(enemy.text.x, enemy.text.y)
    }
    if (this.pencilBoss?.body.active) consider(this.pencilBoss.body.x, this.pencilBoss.body.y)
    return best
  }

  private spawnMuzzleSpark(direction: Phaser.Math.Vector2, scale = 1) {
    const dir = direction.clone()
    if (dir.lengthSq() === 0) dir.set(1, 0)
    dir.normalize()
    const angle = Phaser.Math.RadToDeg(Math.atan2(dir.y, dir.x))
    const offsets = this.touchControls ? [0] : [-10, 10]
    for (const offset of offsets) {
      const spark = this.acquireFxBody(this.player.x + dir.x * 22, this.player.y + dir.y * 22, 'fx-spark-orange')
      spark.setDisplaySize(18 * scale, 32 * scale)
      spark.setDepth(22)
      spark.setAngle(angle + offset)
      spark.setAlpha(0.94)
      const startScaleX = spark.scaleX
      const startScaleY = spark.scaleY
      this.tweens.add({
        targets: spark,
        x: spark.x + dir.x * (16 + 8 * scale) + (offset / 10) * dir.y * 4,
        y: spark.y + dir.y * (16 + 8 * scale) - (offset / 10) * dir.x * 4,
        scaleX: startScaleX * 1.85,
        scaleY: startScaleY * 1.2,
        alpha: 0,
        duration: 170,
        ease: 'Cubic.easeOut',
        onComplete: () => this.releaseFxBody(spark),
      })
    }
  }

  private spawnWhiteBurst(x: number, y: number, scale = 1) {
    const large = this.acquireFxBody(x, y, 'fx-burst-white-large')
    large.setDisplaySize(11 * scale, 10 * scale)
    large.setDepth(12)
    large.setAlpha(0.92)
    const largeScaleX = large.scaleX
    const largeScaleY = large.scaleY
    const small = this.touchControls ? null : this.acquireFxBody(x, y, 'fx-burst-white-small')
    small?.setDisplaySize(6 * scale, 6 * scale)
    small?.setDepth(13)
    small?.setAlpha(0.98)
    const smallScaleX = small?.scaleX ?? 1
    const smallScaleY = small?.scaleY ?? 1
    this.tweens.add({
      targets: large,
      scaleX: largeScaleX * 1.85,
      scaleY: largeScaleY * 1.85,
      alpha: 0,
      angle: Phaser.Math.Between(-24, 24),
      duration: 180,
      ease: 'Cubic.easeOut',
      onComplete: () => this.releaseFxBody(large),
    })
    if (small) {
      this.tweens.add({
        targets: small,
        scaleX: smallScaleX * 1.7,
        scaleY: smallScaleY * 1.7,
        alpha: 0,
        angle: Phaser.Math.Between(-45, 45),
        duration: 140,
        ease: 'Cubic.easeOut',
        onComplete: () => this.releaseFxBody(small),
      })
    }
  }

  private spawnCompassTrail(x: number, y: number, tangentX: number, tangentY: number) {
    const tail = this.acquireFxBody(x - tangentX * 10, y - tangentY * 10, 'fx-swipe-blue')
    tail.setDisplaySize(24, 5)
    tail.setDepth(12)
    tail.setAngle(Phaser.Math.RadToDeg(Math.atan2(tangentY, tangentX)))
    tail.setAlpha(0.88)
    const startScaleX = tail.scaleX
    const startScaleY = tail.scaleY
    this.tweens.add({
      targets: tail,
      x: tail.x - tangentX * 12,
      y: tail.y - tangentY * 12,
      scaleX: startScaleX * 1.9,
      scaleY: startScaleY * 1.25,
      alpha: 0,
      duration: 180,
      ease: 'Sine.easeOut',
      onComplete: () => this.releaseFxBody(tail),
    })
  }

  private updateEnemies(dt: number) {
    for (const enemy of this.enemies) {
      enemy.cooldown -= dt
      enemy.windup = Math.max(0, enemy.windup - dt)
      const glued = enemy.slowUntil > this.elapsed
      const stapled = enemy.stapledUntil > this.elapsed
      const dir = new Phaser.Math.Vector2(this.player.x - enemy.text.x, this.player.y - enemy.text.y)
      const distance = dir.length()
      if (distance > 0) dir.normalize()
      const stopDistance = enemy.kind === '弓' ? 180 : enemy.kind === '槍' ? 70 : 0
      const speedFactor = stapled ? 0 : glued ? 0.3 : 1
      if (distance > stopDistance && speedFactor > 0) {
        enemy.text.x += dir.x * enemy.speed * speedFactor * dt
        enemy.text.y += dir.y * enemy.speed * speedFactor * dt
      }
      if (!stapled && enemy.kind === '槍' && distance < SPEAR_ATTACK_TRIGGER_RANGE && enemy.cooldown <= 0) this.spearAttack(enemy, dir)
      if (!stapled && enemy.kind === '弓' && distance < 460 && enemy.cooldown <= 0) this.bowAttack(enemy, dir)
      const pulse = Math.sin(this.elapsed * 7 + enemy.phase)
      const bossPulse = enemy.boss ? 1 + Math.abs(pulse) * 0.06 : 1
      enemy.text.setScale(bossPulse * (1 + Math.abs(pulse) * 0.06), bossPulse * (1 - Math.abs(pulse) * 0.03))
      enemy.text.setY(enemy.text.y + Math.sin(this.elapsed * 12 + enemy.phase) * dt * 18)
      enemy.text.setAngle(Phaser.Math.Clamp(dir.x * 10, -7, 7) + pulse * 3)
      enemy.glueFx?.setPosition(enemy.text.x, enemy.text.y)
      enemy.stapleFx?.setPosition(enemy.text.x, enemy.text.y - 2)
      if (!glued && enemy.glueFx) {
        enemy.glueFx.destroy()
        enemy.glueFx = null
      }
      if (!stapled && enemy.stapleFx) {
        enemy.stapleFx.destroy()
        enemy.stapleFx = null
      }
    }
  }

  private spearAttack(enemy: Enemy, dir: Phaser.Math.Vector2) {
    const attackId = enemy.id
    enemy.cooldown = SPEAR_COOLDOWN
    enemy.windup = 0.3
    if (this.enemyAttackSeTimer <= 0) {
      this.playSe('se-enemy-attack', { volume: 1, rate: 0.98 })
      this.enemyAttackSeTimer = 0.08
    }
    enemy.text.setColor('#ff5757')
    enemy.text.setStroke('#ffd1d1', 4)
    enemy.text.setText('倉')
    const angle = Phaser.Math.RadToDeg(Math.atan2(dir.y, dir.x))
    const thrust = this.add.container(enemy.text.x - dir.x * 10, enemy.text.y - dir.y * 10)
    thrust.setDepth(12)
    thrust.setAngle(angle)
    const shaft = this.add.rectangle(0, 0, enemy.boss ? 42 : 34, enemy.boss ? 8 : 6, 0xff4747, 0.96)
    const tip = this.add.triangle(enemy.boss ? 23 : 19, 0, 0, 0, 12, 6, 12, -6, 0xff7d7d, 1)
    thrust.add([shaft, tip])
    thrust.setScale(0.5, 0.9)
    this.tweens.add({ targets: thrust, x: enemy.text.x + dir.x * SPEAR_THRUST_DISTANCE, y: enemy.text.y + dir.y * SPEAR_THRUST_DISTANCE, scaleX: 0.9, scaleY: 1.05, alpha: 0.08, duration: SPEAR_THRUST_DURATION, ease: 'Cubic.easeOut' })
    this.hazards.push({ body: thrust, velocity: new Phaser.Math.Vector2(0, 0), life: SPEAR_THRUST_DURATION / 1000 + 0.02, rangeLeft: 0, radius: enemy.boss ? 22 : 16, kind: 'spear' })
    this.time.delayedCall(SPEAR_THRUST_DURATION - 10, () => {
      if (!enemy.text.active || enemy.id !== attackId) return
      enemy.text.setText('槍')
      enemy.text.setColor('#191611')
      enemy.text.setStroke('#fff4d8', 4)
    })
  }

  private bowAttack(enemy: Enemy, dir: Phaser.Math.Vector2) {
    const attackId = enemy.id
    enemy.cooldown = 3.2
    enemy.windup = 0.72
    if (this.enemyAttackSeTimer <= 0) {
      this.playSe('se-enemy-attack', { volume: 1, rate: 1.06 })
      this.enemyAttackSeTimer = 0.08
    }
    const angle = Phaser.Math.RadToDeg(Math.atan2(dir.y, dir.x))
    enemy.text.setColor('#ff5757')
    enemy.text.setStroke('#ffd1d1', 4)
    this.tweens.add({
      targets: enemy.text,
      x: enemy.text.x - dir.x * 18,
      y: enemy.text.y - dir.y * 18,
      angle,
      scaleX: 0.48,
      scaleY: 1.82,
      yoyo: true,
      duration: 280,
      ease: 'Cubic.easeInOut',
    })
    const bend = this.add.text(enemy.text.x - dir.x * 4, enemy.text.y - dir.y * 4, '弓', {
      fontFamily: '"Yu Mincho", "Hiragino Mincho ProN", serif',
      fontSize: '23px',
      fontStyle: '900',
      color: '#ff6565',
      stroke: '#ffd1d1',
      strokeThickness: 3,
    })
    bend.setOrigin(0.5)
    bend.setDepth(8)
    bend.setAngle(angle + 10)
    bend.setScale(0.34, 0.75)
    this.tweens.add({ targets: bend, x: bend.x - dir.x * 22, y: bend.y - dir.y * 22, scaleX: 0.62, scaleY: 0.38, alpha: 0, duration: 360, ease: 'Cubic.easeOut', onComplete: () => bend.destroy() })
    this.time.delayedCall(360, () => {
      if (!enemy.text.active || enemy.id !== attackId || this.hp <= 0) return
      const shotDir = new Phaser.Math.Vector2(this.player.x - enemy.text.x, this.player.y - enemy.text.y)
      if (shotDir.lengthSq() === 0) shotDir.set(1, 0)
      shotDir.normalize()
      const shotAngle = Phaser.Math.RadToDeg(Math.atan2(shotDir.y, shotDir.x))
      const snap = this.add.rectangle(enemy.text.x, enemy.text.y, 34, 3, 0xff6565, 0.82)
      snap.setDepth(8)
      snap.setAngle(shotAngle)
      this.tweens.add({ targets: snap, x: snap.x - shotDir.x * 20, y: snap.y - shotDir.y * 20, alpha: 0, duration: 120, onComplete: () => snap.destroy() })
      const arrow = this.add.container(enemy.text.x + shotDir.x * 24, enemy.text.y + shotDir.y * 24)
      arrow.setDepth(9)
      arrow.setAngle(shotAngle)
      const shaft = this.add.rectangle(0, 0, 18, 4, 0xff4747, 0.98)
      const tip = this.add.triangle(10, 0, 0, 0, 8, 4, 8, -4, 0xff9e9e, 1)
      arrow.add([shaft, tip])
      this.hazards.push({ body: arrow, velocity: shotDir.scale(320), life: 1.05, rangeLeft: 345, radius: 8, kind: 'bow' })
      enemy.text.setColor('#191611')
      enemy.text.setStroke('#fff4d8', 4)
    })
  }

  private updateBullets(dt: number) {
    this.pendingBulletDamage.clear()
    for (let i = this.bullets.length - 1; i >= 0; i -= 1) {
      const bullet = this.bullets[i]
      if (!bullet) continue
      bullet.life -= dt
      if (bullet.homing) {
        const target = bullet.antiBow
          ? this.findAntiBowTarget(bullet.body.x, bullet.body.y)
          : bullet.targetKind
            ? this.findNearestEnemyByKind(bullet.targetKind, bullet.body.x, bullet.body.y)
            : null
        if (bullet.antiBow && !target) bullet.homing = false
        if (target) {
          const targetX = 'text' in target ? target.text.x : target.x
          const targetY = 'text' in target ? target.text.y : target.y
          const desired = new Phaser.Math.Vector2(targetX - bullet.body.x, targetY - bullet.body.y)
          if (desired.lengthSq() > 0) {
            desired.normalize().scale(bullet.speed)
            bullet.velocity.lerp(desired, Math.min(1, dt * 5.6))
          }
        }
      }
      if (bullet.antiBow) {
        if (bullet.velocity.lengthSq() === 0) bullet.velocity.set(1, 0)
        bullet.velocity.setLength(bullet.speed)
      }
      bullet.body.x += bullet.velocity.x * dt
      bullet.body.y += bullet.velocity.y * dt
      if (bullet.homing && bullet.velocity.lengthSq() > 0) bullet.body.setAngle(Phaser.Math.RadToDeg(Math.atan2(bullet.velocity.y, bullet.velocity.x)) + 180)
      if (bullet.antiBow) {
        bullet.trailTimer -= dt
        if (bullet.trailTimer <= 0 && bullet.velocity.lengthSq() > 0) {
          const trailDirection = bullet.velocity.clone().normalize()
          this.spawnCompassTrail(bullet.body.x, bullet.body.y, trailDirection.x, trailDirection.y)
          bullet.trailTimer = 0.045
        }
      }
      bullet.body.rotation += dt * bullet.spin
      const nearby = this.enemyGrid.query(bullet.body.x, bullet.body.y, bullet.radius + 90)
      for (const enemy of nearby) {
        if (bullet.targetKind && enemy.kind !== bullet.targetKind) continue
        if (bullet.hitIds.has(enemy.id)) continue
        if (!this.circleHit(bullet.body.x, bullet.body.y, bullet.radius, enemy.text.x, enemy.text.y, enemy.radius)) continue
        bullet.hitIds.add(enemy.id)
        this.queueBulletDamage(enemy, bullet.damage, bullet.velocity.x > 0 ? bullet.knockback : -bullet.knockback, bullet.source, bullet.ignoreShield)
        bullet.pierce -= 1
        if (bullet.antiBow) {
          bullet.homing = false
          bullet.pierce = -1
        }
        if (bullet.pierce < 0) break
      }
      if (bullet.pierce >= 0 && this.pencilBoss && (!bullet.antiBow || this.isPointInCameraView(this.pencilBoss.body.x, this.pencilBoss.body.y, 18)) && !bullet.hitIds.has(-1) && this.circleHit(bullet.body.x, bullet.body.y, bullet.radius, this.pencilBoss.body.x, this.pencilBoss.body.y, this.pencilBoss.radius)) {
        bullet.hitIds.add(-1)
        this.damagePencilBoss(bullet.damage, bullet.velocity.x > 0 ? bullet.knockback : -bullet.knockback)
        if (!this.roundStarted) return
        bullet.pierce -= 1
      }
      if (bullet.life <= 0 || bullet.pierce < 0 || bullet.body.x < 0 || bullet.body.y < 0 || bullet.body.x > WORLD_WIDTH || bullet.body.y > WORLD_HEIGHT) {
        this.releaseBulletBody(bullet.body)
        this.bullets.splice(i, 1)
      }
    }
    this.flushBulletDamage()
  }

  private queueBulletDamage(enemy: Enemy, amount: number, knockbackX: number, source: DamageSource, ignoreShield = false) {
    if (!enemy.text.active || !this.enemies.includes(enemy)) return
    const current = this.pendingBulletDamage.get(enemy.id)
    const damage = this.enemyDamageAmount(enemy, amount, source, ignoreShield)
    const knockback = this.enemyKnockbackAmount(enemy, knockbackX, source)
    if (current) {
      current.damage += damage
      current.knockback += knockback
      current.source = source
      return
    }
    this.pendingBulletDamage.set(enemy.id, { enemy, damage, knockback, source })
  }

  private flushBulletDamage() {
    for (const entry of this.pendingBulletDamage.values()) {
      const enemy = entry.enemy
      if (!enemy.text.active || !this.enemies.includes(enemy)) continue
      const damageId = enemy.id
      enemy.hp -= entry.damage
      enemy.text.x = Phaser.Math.Clamp(enemy.text.x + Phaser.Math.Clamp(entry.knockback, -96, 96), enemy.radius, WORLD_WIDTH - enemy.radius)
      enemy.text.setTint(0x2574d5)
      if (this.enemyHitSeTimer <= 0) {
        this.playSe('se-enemy-hit', { volume: 1, rate: 1.02 })
        this.enemyHitSeTimer = 0.045
      }
      this.time.delayedCall(55, () => {
        if (!enemy.text.active || enemy.id !== damageId) return
        if (enemy.slowUntil > this.elapsed) enemy.text.setTint(0x9a6846)
        else enemy.text.clearTint()
      })
      if (enemy.hp <= 0) this.defeatEnemy(enemy)
    }
    this.pendingBulletDamage.clear()
  }

  private updateHazards(dt: number) {
    for (let i = this.hazards.length - 1; i >= 0; i -= 1) {
      const hazard = this.hazards[i]
      if (!hazard) continue
      const step = hazard.velocity.length() * dt
      hazard.body.x += hazard.velocity.x * dt
      hazard.body.y += hazard.velocity.y * dt
      hazard.life -= dt
      hazard.rangeLeft -= step
      if (this.circleHit(this.player.x, this.player.y, this.playerRadius, hazard.body.x, hazard.body.y, hazard.radius)) {
        if (hazard.kind === 'bow' && this.bowGuardActive) {
          hazard.life = 0
          this.spawnGuardFlash(hazard.body.x, hazard.body.y)
          if (this.bowGuardSeTimer <= 0) {
            this.playSe('se-enemy-hit', { volume: 0.8, rate: 1.35 })
            this.bowGuardSeTimer = 0.14
          }
        } else if (this.goldRushTimer > 0) hazard.life = 0
        else if (this.invincibleTimer <= 0) {
          this.takeDamage()
          if (!this.roundStarted) return
          hazard.life = 0
        }
      }
      if (hazard.life <= 0 || hazard.rangeLeft < 0) {
        hazard.body.destroy()
        this.hazards.splice(i, 1)
      }
    }
  }

  private spawnGuardFlash(x: number, y: number) {
    const flash = this.add.rectangle(x, y, 34, 18, 0x4da3ff, 0.72)
    flash.setDepth(23)
    flash.setStrokeStyle(2, 0xffffff, 0.9)
    this.tweens.add({
      targets: flash,
      scaleX: 1.8,
      scaleY: 1.4,
      alpha: 0,
      angle: flash.angle + 28,
      duration: 180,
      ease: 'Cubic.easeOut',
      onComplete: () => flash.destroy(),
    })
  }

  private updateCompasses(dt: number) {
    // cannon-compass consumes the compass level, but grants its orbit as a permanent attachment.
    const hasAttachedCannonCompass = this.hasFusion('cannon-compass')
    const level = Phaser.Math.Clamp(hasAttachedCannonCompass ? MAX_UPGRADE_LEVEL : this.activeWeaponLevel('compass'), 0, MAX_UPGRADE_LEVEL)
    const bitCount = COMPASS_COUNT[level]
    const rangeFactor = this.attackRangeMultiplier()
    while (this.compassBits.length < bitCount) {
      const bit = this.add.image(this.player.x, this.player.y, 'bullet-blue')
      bit.setDisplaySize(38, 10)
      bit.setDepth(13)
      this.compassBits.push({ body: bit, trailTimer: 0, hitCooldowns: new Map() })
    }
    while (this.compassBits.length > bitCount) this.compassBits.pop()?.body.destroy()
    if (level <= 0) return
    const radius = (148 + level * 22) * rangeFactor
    const compassBig = this.hasFusion('compass-big') || this.hasFusion('cannon-compass')
    const hitRadius = compassBig ? 42 : level >= 3 ? 34 : 28
    const compassDamage = this.hasFusion('compass-power') ? 10 : COMPASS_DAMAGE[level]
    for (let i = 0; i < this.compassBits.length; i += 1) {
      const bit = this.compassBits[i]
      if (!bit) continue
      for (const [id, cooldown] of bit.hitCooldowns) {
        const nextCooldown = cooldown - dt
        if (nextCooldown <= 0) bit.hitCooldowns.delete(id)
        else bit.hitCooldowns.set(id, nextCooldown)
      }
      const cannonDisplayScale = Phaser.Math.Clamp(CANNON_FUSION_RADIUS / BULLET_VISUALS.cannon.baseRadius, 0.75, 1.9)
      bit.body.setDisplaySize(
        compassBig ? BULLET_VISUALS.cannon.width * cannonDisplayScale : level >= 3 ? 58 : 46,
        compassBig ? BULLET_VISUALS.cannon.height * cannonDisplayScale : level >= 3 ? 15 : 13,
      )
      const angle = this.elapsed * ((12 + level * 1.6) * 0.62) + (Math.PI * 2 * i) / this.compassBits.length
      const tangentX = -Math.sin(angle)
      const tangentY = Math.cos(angle)
      bit.body.x = this.player.x + Math.cos(angle) * radius
      bit.body.y = this.player.y + Math.sin(angle) * radius
      bit.body.setAngle(Phaser.Math.RadToDeg(Math.atan2(tangentY, tangentX)) + 180)
      bit.trailTimer -= dt
      if (bit.trailTimer <= 0) {
        this.spawnCompassTrail(bit.body.x, bit.body.y, tangentX, tangentY)
        bit.trailTimer = 0.028
      }
      for (const enemy of this.enemyGrid.query(bit.body.x, bit.body.y, 56)) {
        if (bit.hitCooldowns.has(enemy.id)) continue
        if (this.circleHit(bit.body.x, bit.body.y, hitRadius, enemy.text.x, enemy.text.y, enemy.radius)) {
          this.damageEnemy(enemy, compassDamage, Math.cos(angle) * 18, 'compass')
          bit.hitCooldowns.set(enemy.id, 0.36)
        }
      }
      if (this.pencilBoss && !bit.hitCooldowns.has(-1) && this.circleHit(bit.body.x, bit.body.y, hitRadius, this.pencilBoss.body.x, this.pencilBoss.body.y, this.pencilBoss.radius)) {
        this.damagePencilBoss(compassDamage, Math.cos(angle) * 12)
        if (!this.roundStarted) return
        bit.hitCooldowns.set(-1, 0.36)
      }
    }
  }

  private updateCollect(dt: number) {
    const attractRadius = (120 + this.level * 7) * CRUMB_ATTRACT_MULTIPLIER
    for (const crumb of this.crumbGrid.query(this.player.x, this.player.y, attractRadius + 80)) {
      const dx = this.player.x - crumb.body.x
      const dy = this.player.y - crumb.body.y
      const distSq = dx * dx + dy * dy
      if (distSq < 900) {
        this.collectCrumb(crumb)
      } else if (distSq < attractRadius * attractRadius) {
        const dist = Math.sqrt(distSq) || 1
        crumb.body.x += (dx / dist) * (230 + this.level * 16) * dt
        crumb.body.y += (dy / dist) * (230 + this.level * 16) * dt
      }
    }
    const itemPickupRadius = this.playerRadius + ITEM_DROP_SIZE * 0.34
    for (const item of this.itemGrid.query(this.player.x, this.player.y, itemPickupRadius + 12)) {
      const dx = this.player.x - item.body.x
      const dy = this.player.y - item.body.y
      const distSq = dx * dx + dy * dy
      if (distSq < itemPickupRadius * itemPickupRadius) {
        this.collectItem(item)
      }
    }
  }

  private drawCollectRing() {
    const attractRadius = (120 + this.level * 7) * CRUMB_ATTRACT_MULTIPLIER
    this.collectGraphics.clear()
    this.collectGraphics.lineStyle(2, 0x6f8fa6, 0.2)
    this.collectGraphics.strokeCircle(this.player.x, this.player.y, attractRadius)
    this.collectGraphics.lineStyle(1, 0xc6d8e5, 0.12)
    this.collectGraphics.strokeCircle(this.player.x, this.player.y, Math.max(8, attractRadius - 3))
  }

  private collectCrumb(crumb: Crumb) {
    const index = this.crumbs.indexOf(crumb)
    if (index >= 0) this.crumbs.splice(index, 1)
    this.releaseCrumbBody(crumb.body)
    this.score += crumb.scoreValue
    this.crumbsHeld += crumb.value
    while (this.crumbsHeld >= this.nextLevelCrumbs) {
      this.crumbsHeld -= this.nextLevelCrumbs
      this.level += 1
      this.nextLevelCrumbs = this.debugMode ? 1 : this.nextLevelCrumbs + LEVEL_CRUMB_INCREMENT
      this.expGaugeMaxFlash = true
      this.pendingLevelUps += 1
    }
    if (!this.levelChoiceOpen && this.pendingLevelUps > 0) this.openLevelUp()
  }

  private collectAllCrumbs() {
    if (this.titleOpen || !this.roundStarted || this.paused || this.hp <= 0 || this.levelChoiceOpen || this.collectButtonUsed) return
    const available = [...this.crumbs]
    if (!available.length) return
    this.collectButtonUsed = true
    for (const crumb of available) this.collectCrumb(crumb)
    this.updateHud()
    this.hud.collectButton?.classList.add('used')
    this.hud.collectButton!.disabled = true
    this.time.delayedCall(420, () => {
      if (this.collectButtonUsed) this.hud.collectButton?.classList.add('spent')
    })
    this.playSe('se-player-fire', { volume: 0.12, rate: 0.78 })
  }

  private collectItem(item: ItemDrop) {
    const index = this.items.indexOf(item)
    if (index >= 0) this.items.splice(index, 1)
    this.releaseItemBody(item.body)
    let labelText = ITEM_DEFS[item.kind].label
    if (item.kind === 'multishot') {
      this.permanentProjectileBonus += 1
      labelText = `SHOT +${this.permanentProjectileBonus}`
    } else if (item.kind === 'range') {
      this.buffTimers.range += 20
      labelText = '2x RANGE'
    } else if (item.kind === 'bucket-gray' || item.kind === 'bucket-gold') {
      this.activateBucket(item.kind === 'bucket-gold')
    } else if (item.kind === 'glue-gray' || item.kind === 'glue-gold') {
      this.activateGlue(item.kind === 'glue-gold')
    } else if (item.kind === 'stapler-gray' || item.kind === 'stapler-gold') {
      this.activateStapler(item.kind === 'stapler-gold')
    } else if (item.kind === 'gold-crumb') {
      this.goldRushTimer += 7
      labelText = 'GOLD RUSH'
    } else if (item.kind === 'heal') {
      const before = this.hp
      this.hp = Math.min(PLAYER_MAX_HP, this.hp + 2)
      labelText = before >= PLAYER_MAX_HP ? 'LIFE MAX' : '+2 LIFE'
      this.lastLifeFilled = -1
    }
    const label = this.add.text(this.player.x, this.player.y - 28, labelText, {
      fontFamily: '"Arial Narrow", "Segoe UI", sans-serif',
      fontSize: '14px',
      fontStyle: '900',
      color: '#ffffff',
      stroke: '#211a13',
      strokeThickness: 4,
    })
    label.setOrigin(0.5)
    label.setDepth(16)
    this.tweens.add({ targets: label, y: label.y - 18, alpha: 0, duration: 460, ease: 'Cubic.easeOut', onComplete: () => label.destroy() })
  }

  private activateBucket(isGold: boolean) {
    const radius = this.effectRadius(isGold ? 1.2 : 0.7)
    this.spawnBucketEffect(radius)
    for (const enemy of this.enemies.slice()) {
      if (!enemy.text.active) continue
      if (!this.circleHit(this.player.x, this.player.y, radius, enemy.text.x, enemy.text.y, enemy.radius)) continue
      this.damageEnemy(enemy, isGold ? 26 : 14, Math.sign(enemy.text.x - this.player.x || 1) * 32, 'item')
    }
  }

  private activateGlue(isGold: boolean) {
    const radius = this.effectRadius(isGold ? 1.2 : 0.7)
    for (const enemy of this.enemies) {
      if (!enemy.text.active) continue
      if (!this.circleHit(this.player.x, this.player.y, radius, enemy.text.x, enemy.text.y, enemy.radius)) continue
      enemy.slowUntil = Math.max(enemy.slowUntil, this.elapsed + 7)
      if (!enemy.glueFx) {
        enemy.glueFx = this.add.image(enemy.text.x, enemy.text.y, 'fx-glue-brown')
        enemy.glueFx.setDisplaySize(enemy.boss ? 34 : 24, enemy.boss ? 34 : 24)
        enemy.glueFx.setDepth(8)
        enemy.glueFx.setAlpha(0.72)
      }
      enemy.text.setTint(0x9a6846)
      const glueId = enemy.id
      this.time.delayedCall(7000, () => {
        if (enemy.text.active && enemy.id === glueId && enemy.slowUntil <= this.elapsed) enemy.text.clearTint()
      })
    }
  }

  private activateStapler(isGold: boolean) {
    const radius = this.effectRadius(isGold ? 1.2 : 0.7)
    for (const enemy of this.enemies.slice()) {
      if (!enemy.text.active) continue
      if (!this.circleHit(this.player.x, this.player.y, radius, enemy.text.x, enemy.text.y, enemy.radius)) continue
      enemy.stapledUntil = Math.max(enemy.stapledUntil, this.elapsed + 7)
      this.damageEnemy(enemy, isGold ? 4 : 2, 0, 'item')
      if (enemy.text.active && !enemy.stapleFx) enemy.stapleFx = this.createStapleFx(enemy.text.x, enemy.text.y)
    }
  }

  private spawnBucketEffect(radius: number) {
    const ring = this.add.image(this.player.x, this.player.y, 'fx-bucket-ring')
    ring.setDisplaySize(radius * 0.45, radius * 0.45)
    ring.setDepth(11)
    ring.setAlpha(0.95)
    const splash = this.add.image(this.player.x, this.player.y, 'fx-bucket-splash')
    splash.setDisplaySize(radius * 0.32, radius * 0.32)
    splash.setDepth(10)
    splash.setAlpha(0.92)
    this.tweens.add({
      targets: ring,
      scaleX: 4.8,
      scaleY: 4.8,
      alpha: 0,
      duration: 180,
      ease: 'Cubic.easeOut',
      onComplete: () => ring.destroy(),
    })
    this.tweens.add({
      targets: splash,
      scaleX: 2.6,
      scaleY: 2.6,
      alpha: 0,
      duration: 150,
      ease: 'Cubic.easeOut',
      onComplete: () => splash.destroy(),
    })
    this.cameras.main.flash(80, 255, 255, 255, false)
  }

  private createStapleFx(x: number, y: number) {
    const container = this.add.container(x, y)
    container.setDepth(10)
    const top = this.add.rectangle(0, -8, 24, 3, 0x9ea5af, 0.95)
    const legLeft = this.add.rectangle(-8, -4, 3, 10, 0x8a929d, 0.95)
    const legRight = this.add.rectangle(8, -4, 3, 10, 0x8a929d, 0.95)
    const low = this.add.rectangle(0, 8, 20, 3, 0x747c86, 0.92)
    container.add([top, legLeft, legRight, low])
    return container
  }

  private effectRadius(screenFactor: number) {
    return Math.max(this.cameras.main.width, this.cameras.main.height) * screenFactor
  }

  private openLevelUp() {
    if (this.levelChoiceOpen || this.pendingLevelUps <= 0) return
    const choices = this.pickUpgrades()
    if (!choices.length) {
      this.pendingLevelUps = 0
      this.expGaugeMaxFlash = false
      this.updateExpGauge()
      return
    }
    this.pendingLevelUps -= 1
    this.levelChoiceOpen = true
    document.body.classList.add('level-choice-open')
    this.expGaugeMaxFlash = true
    this.updateExpGauge()
    this.hud.bowWarning?.classList.remove('visible')
    this.playSe('se-level-up', { volume: 0.92, rate: 1 })
    document.querySelector('#level-up')!.classList.add('visible')
    this.hud.upgrades!.innerHTML = choices
      .map((choice) => {
        if (choice.type === 'fusion') {
          return `<button type="button" class="fusion-choice" data-fusion="${choice.id}"><b>${choice.name}</b><span>${this.escapeHtml(this.fusionChoiceDetails(choice.id))}</span><i>合成</i></button>`
        }
        const nextLevel = this.weaponLevels[choice.id] + 1
        return `<button type="button" class="level-choice-${Math.min(nextLevel, 3)}" data-upgrade="${choice.id}"><b>${choice.name}</b><span>${this.upgradeDescription(choice.id, nextLevel)}</span><i>${choice.id === 'bowGuard' ? 'GUARD' : `LV ${nextLevel}`}</i></button>`
      })
      .join('')
    for (const button of Array.from(this.hud.upgrades!.querySelectorAll<HTMLButtonElement>('button'))) {
      button.onclick = () => {
        const fusion = button.dataset.fusion as FusionId | undefined
        if (fusion) this.unlockFusion(fusion)
        else {
          const id = button.dataset.upgrade as UpgradeId
          const maxLevel = id === 'bowGuard' ? 1 : MAX_UPGRADE_LEVEL
          this.weaponLevels[id] = Math.min(maxLevel, this.weaponLevels[id] + 1)
        }
        this.levelChoiceOpen = false
        document.body.classList.remove('level-choice-open')
        this.expGaugeMaxFlash = false
        document.querySelector('#level-up')!.classList.remove('visible')
        this.updateHud()
        if (this.pendingLevelUps > 0) this.openLevelUp()
      }
    }
  }

  private pickUpgrades() {
    const ids = (Object.keys(UPGRADES) as UpgradeId[]).filter((id) => !this.fusedBaseWeapons.has(id) && this.weaponLevels[id] < (id === 'bowGuard' ? 1 : MAX_UPGRADE_LEVEL))
    const fusions = this.availableFusions()
    const choices: LevelChoice[] = Phaser.Utils.Array.Shuffle(ids)
      .slice(0, 4)
      .map((id) => ({ type: 'upgrade' as const, ...UPGRADES[id] }))
    // Fusion choices are additions. They must never replace the four normal choices.
    choices.push(...fusions.map((id) => ({ type: 'fusion' as const, id, name: FUSIONS[id].name, description: FUSIONS[id].description })))
    console.info(`[Eraser Survivor] Level choices: ${choices.length} (${fusions.length} fusion + ${choices.length - fusions.length} upgrade), queued=${this.pendingLevelUps}`)
    return choices
  }

  private hasCannonFusion() {
    return (Object.keys(FUSIONS) as FusionId[]).some((id) => {
      const [base] = FUSIONS[id].requires
      return base === 'cannon' && this.hasFusion(id)
    })
  }

  private availableFusions() {
    return (Object.keys(FUSIONS) as FusionId[]).filter((id) => {
      if (this.unlockedFusions.has(id)) return false
      const [left, right] = FUSIONS[id].requires
      // A fused weapon is a protected special slot and cannot be consumed again.
      if (this.fusedBaseWeapons.has(right)) return false
      return this.weaponLevels[left] >= MAX_UPGRADE_LEVEL && this.weaponLevels[right] >= MAX_UPGRADE_LEVEL
    })
  }

  private unlockFusion(id: FusionId) {
    const fusion = FUSIONS[id]
    const [base, consumed] = fusion.requires
    if (this.fusedBaseWeapons.has(consumed)) return
    this.unlockedFusions.add(id)
    this.saveDiscoveredFusion(id)
    this.fusedBaseWeapons.add(base)
    this.weaponLevels[base] = MAX_UPGRADE_LEVEL
    this.weaponLevels[consumed] = 0
    const label = this.add.text(this.player.x, this.player.y - 54, fusion.hidden ? '特殊合成発見' : '合成完了', {
      fontFamily: '"Arial Narrow", "Segoe UI", sans-serif',
      fontSize: '18px',
      fontStyle: '900',
      color: fusion.hidden ? '#ffffff' : '#ffd23f',
      stroke: fusion.hidden ? '#7c2dff' : '#201811',
      strokeThickness: 5,
    })
    label.setOrigin(0.5)
    label.setDepth(25)
    this.tweens.add({ targets: label, y: label.y - 28, alpha: 0, duration: 760, ease: 'Cubic.easeOut', onComplete: () => label.destroy() })
  }

  private fusionChoiceDetails(id: FusionId) {
    const [base, consumed] = FUSIONS[id].requires
    return `ベース: ${UPGRADES[base].name} / 消費: ${UPGRADES[consumed].name}。${this.fusionEffectSummary(id)}`
  }

  private fusionRecipeLabel(id: FusionId) {
    const [base, consumed] = FUSIONS[id].requires
    return `${UPGRADES[base].name} LV3 + ${UPGRADES[consumed].name} LV3`
  }

  private fusionEffectSummary(id: FusionId) {
    const fusion = FUSIONS[id]
    const [base] = fusion.requires
    if (id === 'cannon-big') return '大砲ダメージを15→30へ'
    if (id === 'sniper-power') return 'スナイパー弾のノックバックを強くする'
    if (id === 'sniper-spread') return '散弾LV3相当の8発を平行に撃つ'
    if (id === 'machinegun-spread') return '散弾LV3相当の8発を細く拡散して連射する'
    if (id === 'cannon-spread') return '散弾LV3相当の8方向へ撃つ'
    if (id === 'machinegun-pierce' || id === 'shotgun-pierce') return 'スナイパー弾と同じ完全貫通を付与する'
    if (id === 'machinegun-big' || id === 'sniper-big' || id === 'shotgun-big') return '大砲と同じ弾サイズにする'
    if (id === 'sniper-rapid' || id === 'shotgun-rapid' || id === 'cannon-rapid') return 'マシンガン並みの連射速度にする'
    if (id.includes('power')) return `${UPGRADES[base].name}の威力を大きく伸ばす`
    if (id.includes('rapid')) return `${UPGRADES[base].name}の発射間隔を短くする`
    if (id.includes('pierce')) return `${UPGRADES[base].name}に貫通性能を足す`
    if (id.includes('spread')) return `${UPGRADES[base].name}を複数方向へ撃つ`
    if (id.includes('big')) return `${UPGRADES[base].name}の弾サイズを大きくする`
    if (id === 'cannon-compass') return 'コンパス弾を大砲サイズにする'
    if (id === 'anti-bow-missile') return '威力50。盾の軽減を貫通し、1体に命中すると消える全敵追尾ミサイルを追加する'
    return fusion.description
  }

  private renderFusionPreview(id: FusionId) {
    const fusion = FUSIONS[id]
    if (!fusion || !this.hud.codexPreview) return
    const [left, right] = fusion.requires
    if (!this.loadDiscoveredFusions().has(id)) {
      this.hud.codexPreview.innerHTML = `
        <div class="codex-preview-head">
          <span>LOCKED</span>
          <h2>？？？</h2>
        </div>
        <div class="codex-recipe locked">
          <b><span>ベース</span>${this.escapeHtml(UPGRADES[left].name)} LV3</b>
          <em>+</em>
          <b><span>消費</span>${this.escapeHtml(UPGRADES[right].name)} LV3</b>
        </div>
        <p>？？？</p>
        <p class="codex-effect">合成して入手すると詳細が開示される。</p>
        <div class="fusion-preview-stage preview-locked" aria-label="未発見の合成">
          <span class="preview-lock-mark">？？？</span>
        </div>
        <small>未入手の合成は結果名・効果・プレビューを伏せる。</small>
      `
      return
    }
    this.hud.codexPreview.innerHTML = `
      <div class="codex-preview-head">
        <span>PREVIEW</span>
        <h2>${this.escapeHtml(fusion.name)}</h2>
      </div>
      <div class="codex-recipe">
        <b><span>ベース</span>${this.escapeHtml(UPGRADES[left].name)} LV3</b>
        <em>+</em>
        <b><span>消費</span>${this.escapeHtml(UPGRADES[right].name)} LV3</b>
      </div>
      <p>${this.escapeHtml(fusion.description)}</p>
      <p class="codex-effect">${this.escapeHtml(this.fusionEffectSummary(id))}</p>
      <div class="fusion-preview-stage ${this.fusionPreviewClass(id)}" aria-label="${this.escapeHtml(fusion.name)}の攻撃イメージ">
        ${this.fusionPreviewBody(id)}
      </div>
      <small>ベース武器は合成武器へ変化し、素材武器はLV0に戻る。</small>
    `
  }

  private fusionPreviewClass(id: FusionId) {
    if (id.includes('anti-bow')) return 'preview-missile'
    if (id.includes('compass')) return 'preview-compass'
    if (id.includes('machinegun')) return 'preview-machinegun'
    if (id.includes('sniper')) return 'preview-sniper'
    if (id.includes('cannon')) return 'preview-cannon'
    if (id.includes('shotgun')) return 'preview-shotgun'
    return 'preview-basic'
  }

  private fusionPreviewBody(id: FusionId) {
    const player = '<img class="preview-eraser" src="/assets/characters/eraser-bare.png" alt="消しゴム君">'
    if (id.includes('compass')) {
      const bigCompass = id.includes('big') || id === 'cannon-compass'
      const cannonDisplayScale = Phaser.Math.Clamp(CANNON_FUSION_RADIUS / BULLET_VISUALS.cannon.baseRadius, 0.75, 1.9)
      const width = bigCompass ? BULLET_VISUALS.cannon.width * cannonDisplayScale : 58
      const height = bigCompass ? BULLET_VISUALS.cannon.height * cannonDisplayScale : 15
      const bits = Array.from({ length: 6 }, (_, index) => {
        const delay = Math.round((-980 * index) / 6)
        return `<span class="preview-orbit-node" style="--orbit-delay: ${delay}ms"><img class="preview-orbit-projectile" src="/assets/projectiles/bullet-blue.png" alt="回転する消しゴム弾" style="--bullet-w: ${width}px; --bullet-h: ${height}px"></span>`
      }).join('')
      return `${player}${bits}`
    }
    const visual = this.fusionPreviewVisual(id)
    const radius = this.fusionPreviewRadius(id)
    const [base] = FUSIONS[id].requires
    if (base === 'shotgun') {
      const count = 8
      const width = 30
      const shots = Array.from({ length: count }, (_, index) => {
        const angle = -width / 2 + (width * index) / Math.max(1, count - 1)
        const y = Math.sin(Phaser.Math.DegToRad(angle)) * 70
        return this.previewProjectileHtml(visual, radius, 'preview-projectile shot', { y, angle, delay: index * 28 })
      }).join('')
      return `${player}${shots}`
    }
    if (id.includes('spread')) {
      const count = base === 'machinegun' || base === 'cannon' ? SHOTGUN_FUSION_SHOT_COUNT : base === 'sniper' ? SHOTGUN_FUSION_SHOT_COUNT / 2 : 3
      const width = base === 'machinegun' ? 20 : base === 'cannon' ? 24 : 14
      const shots = Array.from({ length: count }, (_, index) => {
        const angle = base === 'sniper' ? 0 : -width / 2 + (width * index) / Math.max(1, count - 1)
        const y = base === 'sniper'
          ? (index - (count - 1) / 2) * 15
          : Math.sin(Phaser.Math.DegToRad(angle)) * 72
        return this.previewProjectileHtml(visual, radius, 'preview-projectile shot', { y, angle, delay: index * 46 })
      }).join('')
      return `${player}${shots}`
    }
    if (base === 'machinegun' || id.includes('rapid')) {
      const shots = Array.from({ length: base === 'machinegun' ? 4 : 2 }, (_, index) => (
        this.previewProjectileHtml(visual, radius, 'preview-projectile shot burst', { y: (index - 1.5) * 7, angle: 0, delay: index * 105 })
      )).join('')
      return `${player}${shots}`
    }
    if (id.includes('anti-bow')) {
      return `${player}<span class="preview-curve"></span>${this.previewProjectileHtml('bullet', 10, 'preview-projectile missile', { y: 0, angle: 0, delay: 0 }, '全敵追尾ミサイル')}`
    }
    return `${player}${this.previewProjectileHtml(visual, radius, 'preview-projectile shot', { y: 0, angle: 0, delay: 0 })}`
  }

  private previewProjectileHtml(visual: BulletVisual, radius: number, className: string, options: { y: number; angle: number; delay: number }, alt = '消しゴム弾') {
    const config = BULLET_VISUALS[visual]
    const sizeScale = Phaser.Math.Clamp(radius / config.baseRadius, 0.75, 1.9)
    const width = Math.round(config.width * sizeScale * 10) / 10
    const height = Math.round(config.height * sizeScale * 10) / 10
    return `<img class="${className}" src="/assets/projectiles/${config.key}.png" alt="${alt}" style="--bullet-w: ${width}px; --bullet-h: ${height}px; --shot-y: ${Math.round(options.y * 10) / 10}px; --shot-rot: ${Math.round(options.angle * 10) / 10}deg; --delay: ${options.delay}ms">`
  }

  private fusionPreviewVisual(id: FusionId): BulletVisual {
    if (id.includes('anti-bow')) return 'bullet'
    const [base] = FUSIONS[id].requires
    if (base === 'machinegun') return 'machinegun'
    if (base === 'sniper') return 'sniper'
    if (base === 'shotgun') return 'shotgun'
    if (base === 'cannon') return 'cannon'
    return 'bullet'
  }

  private fusionPreviewRadius(id: FusionId) {
    const [base] = FUSIONS[id].requires
    if (base === 'machinegun') return id.includes('big') ? CANNON_FUSION_RADIUS : 4
    if (base === 'sniper') return id.includes('big') ? CANNON_FUSION_RADIUS : 8
    if (base === 'shotgun') return id.includes('big') ? CANNON_FUSION_RADIUS : 6
    if (base === 'cannon') return 40
    return 12
  }

  private hasFusion(id: FusionId) {
    return this.unlockedFusions.has(id)
  }

  private loadDiscoveredFusions() {
    try {
      const parsed = JSON.parse(localStorage.getItem(FUSION_CODEX_KEY) || '[]')
      return new Set((Array.isArray(parsed) ? parsed : []).filter((id): id is FusionId => id in FUSIONS))
    } catch {
      return new Set<FusionId>()
    }
  }

  private saveDiscoveredFusion(id: FusionId) {
    const discovered = this.loadDiscoveredFusions()
    discovered.add(id)
    localStorage.setItem(FUSION_CODEX_KEY, JSON.stringify([...discovered]))
  }

  private upgradeDescription(id: UpgradeId, nextLevel: number) {
    switch (id) {
      case 'melee':
        return nextLevel >= 3
          ? '威力20。盾防御を無視し、頭突きの範囲アップ'
          : `威力${MELEE_DAMAGE[nextLevel]}。盾防御を無視する頭突き`
      case 'bullet':
        return nextLevel >= 3
          ? '威力15。連射速度・サイズ・距離アップ'
          : `威力${BULLET_DAMAGE[nextLevel]}。貫通なしの基本弾`
      case 'sniper':
        if (nextLevel >= 3) return '威力50。盾防御を無視し、前後へ2本ずつ高速連射'
        if (nextLevel === 2) return '威力50。盾防御を無視し、前後へ1本ずつ同時発射'
        return '威力50。盾防御を無視する完全貫通弾を前へ1本'
      case 'shotgun':
        return nextLevel >= 3
          ? '威力15。+3弾、拡散が締まる'
          : `威力${SHOTGUN_DAMAGE[nextLevel]}。貫通なしの近距離散弾`
      case 'machinegun':
        return nextLevel >= 3
          ? '威力8。連射速度アップ、ノックバックあり'
          : `威力${MACHINEGUN_DAMAGE[nextLevel]}。貫通なし、ノックバックあり`
      case 'cannon':
        return nextLevel >= 3
          ? '威力15。完全貫通、ノックバックあり'
          : `威力${CANNON_DAMAGE[nextLevel]}。3体貫通、ノックバックあり`
      case 'compass':
        return nextLevel >= 3
          ? '威力5。6個に増加、サイズアップ'
          : `威力5。${COMPASS_COUNT[nextLevel]}個の弾丸が周回`
      case 'bowGuard':
        return '停止中にケースを構え、弓矢だけを防ぐ。ガード中は攻撃不可'
    }
  }

  private currentWeaponSummary(id: UpgradeId, level: number) {
    const cappedLevel = Phaser.Math.Clamp(level, 1, MAX_UPGRADE_LEVEL)
    switch (id) {
      case 'melee':
        return `威力 ${MELEE_DAMAGE[cappedLevel]}、盾防御無視${cappedLevel >= 3 ? '、範囲アップ' : ''}`
      case 'bullet':
        return `威力 ${BULLET_DAMAGE[cappedLevel]}、貫通なし${cappedLevel >= 3 ? '、連射/サイズ/距離アップ' : ''}`
      case 'sniper':
        if (cappedLevel >= 3) return '威力 50、盾防御無視、前後2本ずつ高速連射'
        if (cappedLevel === 2) return '威力 50、盾防御無視、前後1本ずつ同時発射'
        return '威力 50、盾防御無視、前へ1本、完全貫通'
      case 'shotgun':
        return `威力 ${SHOTGUN_DAMAGE[cappedLevel]}、${cappedLevel >= 3 ? 8 : 5}発、近距離`
      case 'machinegun':
        return `威力 ${MACHINEGUN_DAMAGE[cappedLevel]}、貫通なし、ノックバック`
      case 'cannon':
        return `威力 ${CANNON_DAMAGE[cappedLevel]}、${cappedLevel >= 3 ? '完全貫通' : '3体貫通'}`
      case 'compass':
        return `威力 ${COMPASS_DAMAGE[cappedLevel]}、${COMPASS_COUNT[cappedLevel]}個${cappedLevel >= 3 ? '、サイズアップ' : ''}`
      case 'bowGuard':
        return this.bowGuardActive ? '停止中。弓矢ガード中、攻撃不可' : '停止すると弓矢をガード'
    }
  }

  private rebuildSpatialGrids() {
    this.enemyGrid.clear()
    for (const enemy of this.enemies) this.enemyGrid.add(Object.assign(enemy, { x: enemy.text.x, y: enemy.text.y }))
    this.crumbGrid.clear()
    for (const crumb of this.crumbs) this.crumbGrid.add(Object.assign(crumb, { x: crumb.body.x, y: crumb.body.y }))
    this.itemGrid.clear()
    for (const item of this.items) this.itemGrid.add(Object.assign(item, { x: item.body.x, y: item.body.y }))
  }

  private damageEnemy(enemy: Enemy, amount: number, knockbackX: number, source: DamageSource = 'bullet') {
    if (!enemy.text.active || !this.enemies.includes(enemy)) return
    const damageId = enemy.id
    const finalDamage = this.enemyDamageAmount(enemy, amount, source)
    const finalKnockback = this.enemyKnockbackAmount(enemy, knockbackX, source)
    enemy.hp -= finalDamage
    enemy.text.x = Phaser.Math.Clamp(enemy.text.x + finalKnockback, enemy.radius, WORLD_WIDTH - enemy.radius)
    enemy.text.setTint(0x2574d5)
    if (this.enemyHitSeTimer <= 0) {
      this.playSe('se-enemy-hit', { volume: 1, rate: 1.02 })
      this.enemyHitSeTimer = 0.045
    }
    this.time.delayedCall(55, () => {
      if (!enemy.text.active || enemy.id !== damageId) return
      if (enemy.slowUntil > this.elapsed) enemy.text.setTint(0x9a6846)
      else enemy.text.clearTint()
    })
    if (enemy.hp <= 0) this.defeatEnemy(enemy)
  }

  private enemyDamageAmount(enemy: Enemy, amount: number, source: DamageSource, ignoreShield = false) {
    if (ignoreShield || enemy.kind !== '盾' || source === 'melee' || source === 'sniper') return amount
    return Math.max(1, Math.floor(amount / 10))
  }

  private enemyKnockbackAmount(enemy: Enemy, amount: number, source: DamageSource) {
    const sourceFactor: Record<DamageSource, number> = {
      melee: 0.62,
      bullet: 0.68,
      sniper: 0.34,
      shotgun: 0.62,
      machinegun: 0.3,
      cannon: 0.84,
      compass: 0.32,
      item: 0.42,
      contact: 0.3,
    }
    let factor = sourceFactor[source]
    if (enemy.boss) factor *= 0.62
    if (enemy.kind === '盾') factor *= source === 'cannon' ? 0.32 : 0.18
    else if (enemy.kind === '龖' || enemy.kind === '龍') factor *= 0.55
    return amount * factor
  }

  private damagePencilBoss(amount: number, knockbackX: number) {
    const boss = this.pencilBoss
    if (!boss || !boss.body.active) return
    boss.hp -= amount
    boss.body.x = Phaser.Math.Clamp(boss.body.x + knockbackX * PENCIL_BOSS_KNOCKBACK_RATE, boss.radius, WORLD_WIDTH - boss.radius)
    boss.body.setTint(0xff7676)
    if (this.enemyHitSeTimer <= 0) {
      this.playSe('se-enemy-hit', { volume: 1, rate: 0.9 })
      this.enemyHitSeTimer = 0.05
    }
    this.time.delayedCall(70, () => {
      if (boss.body.active) boss.body.clearTint()
    })
    if (boss.hp <= 0) this.clearGame()
  }

  private defeatEnemy(enemy: Enemy) {
    const index = this.enemies.indexOf(enemy)
    if (index < 0) return
    const x = enemy.text.x
    const y = enemy.text.y
    const kind = enemy.kind
    const boss = enemy.boss
    const splitsIntoDragons = kind === '龖'
    if (enemy.dropsLoot && !splitsIntoDragons) {
      this.dropCrumb(x, y, NORMAL_CRUMB_VALUE, !this.bossPhase)
      if (!this.bossPhase && Phaser.Math.Between(1, 100) === 1) this.dropItem(x, y)
    } else if (this.bossPhase && !splitsIntoDragons) {
      this.dropCrumb(x, y, BOSS_MINION_CRUMB_VALUE, false)
    }
    this.spawnWhiteBurst(x, y, boss ? 1.5 : 1)
    const pop = this.touchControls ? null : this.add.text(x, y, kind, {
      fontFamily: '"Yu Mincho", "Hiragino Mincho ProN", serif',
      fontSize: boss ? '36px' : '22px',
      fontStyle: '900',
      color: '#2574d5',
      stroke: '#ffffff',
      strokeThickness: 4,
    })
    pop?.setOrigin(0.5)
    pop?.setDepth(12)
    this.enemies.splice(index, 1)
    this.releaseEnemy(enemy)
    this.kills += 1
    if (pop) this.tweens.add({ targets: pop, y: pop.y - 26, scale: 1.45, alpha: 0, duration: 260, onComplete: () => pop.destroy() })
    if (splitsIntoDragons) this.spawnDragonSplit(x, y)
  }

  private spawnDragonSplit(x: number, y: number) {
    if (!this.roundStarted) return
    for (const offset of [-18, 18]) {
      if (this.enemies.length >= this.maxEnemies()) return
      const dragonX = Phaser.Math.Clamp(x + offset + Phaser.Math.Between(-6, 6), 32, WORLD_WIDTH - 32)
      const dragonY = Phaser.Math.Clamp(y + Phaser.Math.Between(-12, 12), 32, WORLD_HEIGHT - 32)
      const dragon = this.acquireEnemy(dragonX, dragonY, '龍', false, Math.floor(this.elapsed / 16), false)
      dragon.cooldown = Phaser.Math.FloatBetween(0.1, 0.45)
      this.enemies.push(dragon)
      this.spawnWhiteBurst(dragonX, dragonY, 0.8)
    }
  }

  private clearGame() {
    if (this.clearState || this.clearEnding) return
    const boss = this.pencilBoss
    this.clearState = true
    this.clearEnding = true
    this.bossPhase = false
    this.invincibleTimer = Math.max(this.invincibleTimer, 2.5)
    this.clearLifeBonus = this.hp * 10 + (this.hp >= PLAYER_MAX_HP ? 50 : 0)
    this.clearBossTimeBonus = this.bossTimeBonus()
    this.score += 100 + this.clearLifeBonus + this.clearBossTimeBonus
    this.stopBgm()
    if (boss) {
      const x = boss.body.x
      const y = boss.body.y
      this.playSe('se-boss-explosion', { volume: 1, rate: 1 })
      this.spawnWhiteBurst(x, y, 3.2)
      this.time.delayedCall(130, () => this.spawnWhiteBurst(x + Phaser.Math.Between(-30, 30), y + Phaser.Math.Between(-24, 24), 2.3))
      this.time.delayedCall(280, () => this.spawnWhiteBurst(x + Phaser.Math.Between(-42, 42), y + Phaser.Math.Between(-34, 34), 1.8))
      this.tweens.add({
        targets: boss.body,
        scaleX: boss.body.scaleX * 1.16,
        scaleY: boss.body.scaleY * 1.16,
        alpha: 0,
        angle: boss.body.angle + 18,
        duration: 820,
        ease: 'Cubic.easeOut',
        onComplete: () => boss.body.destroy(),
      })
      boss.healthBack.destroy()
      boss.healthFill.destroy()
      this.pencilBoss = null
    }
    this.time.delayedCall(1120, () => {
      if (!this.roundStarted || !this.clearState) return
      this.clearEnding = false
      this.endGame()
    })
  }

  private bossTimeBonus() {
    if (!this.bossFightStartedAt) return 0
    const fightSeconds = Math.max(0, this.elapsed - this.bossFightStartedAt)
    if (fightSeconds <= 10) return 200
    if (fightSeconds <= 30) return 100
    if (fightSeconds <= 60) return 50
    return 0
  }

  private dropCrumb(x: number, y: number, value: number, scoreable = true) {
    if (this.crumbs.length >= this.maxCrumbs() && this.mergeCrumbDrop(x, y, value, scoreable)) return
    const crumb = this.acquireCrumbBody(x + Phaser.Math.Between(-8, 8), y + Phaser.Math.Between(-8, 8))
    const size = value > 1 ? 18 : 12
    crumb.setDisplaySize(size, size)
    crumb.setDepth(7)
    this.crumbs.push({ body: crumb, value, scoreValue: scoreable ? value : 0, radius: value > 1 ? 8 : 5 })
  }

  private acquireCrumbBody(x: number, y: number) {
    const body = this.crumbPool.pop() ?? this.add.image(x, y, 'crumb-gray')
    body.setTexture('crumb-gray')
    body.setPosition(x, y)
    body.setActive(true)
    body.setVisible(true)
    body.setAlpha(1)
    body.setScale(1)
    body.setDepth(7)
    return body
  }

  private mergeCrumbDrop(x: number, y: number, value: number, scoreable: boolean) {
    if (!this.crumbs.length) return false
    let target = this.crumbs[0]
    let bestDistance = Number.POSITIVE_INFINITY
    for (const crumb of this.crumbs) {
      const dist = Phaser.Math.Distance.Squared(x, y, crumb.body.x, crumb.body.y)
      if (dist < bestDistance) {
        bestDistance = dist
        target = crumb
      }
    }
    target.value += value
    target.scoreValue += scoreable ? value : 0
    target.radius = Phaser.Math.Clamp(target.radius + 0.45, 5, 16)
    const size = Phaser.Math.Clamp(10 + target.value * 2, 12, 26)
    target.body.setDisplaySize(size, size)
    target.body.setAlpha(0.98)
    return true
  }

  private dropItem(x: number, y: number) {
    const pool = Object.keys(ITEM_DEFS) as ItemKind[]
    const kind = pool[Phaser.Math.Between(0, pool.length - 1)]
    const key = ITEM_DEFS[kind].key
    const item = this.acquireItemBody(x + Phaser.Math.Between(-10, 10), y + Phaser.Math.Between(-10, 10), key)
    item.setDisplaySize(ITEM_DROP_SIZE, ITEM_DROP_SIZE)
    item.setDepth(8)
    this.items.push({ body: item, kind, radius: ITEM_DROP_SIZE * 0.38 })
  }

  private acquireItemBody(x: number, y: number, key: string) {
    const body = this.itemPool.pop() ?? this.add.image(x, y, key)
    body.setTexture(key)
    body.setPosition(x, y)
    body.setActive(true)
    body.setVisible(true)
    body.setAlpha(1)
    body.setScale(1)
    body.setDepth(8)
    return body
  }

  private handlePlayerContactHits() {
    if (this.goldRushTimer > 0) {
      if (this.pencilBoss && this.circleHit(this.player.x, this.player.y, this.playerRadius + 8, this.pencilBoss.body.x, this.pencilBoss.body.y, this.pencilBoss.radius)) {
        this.damagePencilBoss(1.4, Math.sign(this.pencilBoss.body.x - this.player.x || 1) * 16)
      }
      for (const enemy of this.enemyGrid.query(this.player.x, this.player.y, 64)) {
        if (this.circleHit(this.player.x, this.player.y, this.playerRadius + 8, enemy.text.x, enemy.text.y, enemy.radius)) {
          this.damageEnemy(enemy, 0.9, Math.sign(enemy.text.x - this.player.x || 1) * 22, 'contact')
        }
      }
      return
    }
    if (this.invincibleTimer > 0) return
    if (this.pencilBoss && this.circleHit(this.player.x, this.player.y, this.playerRadius, this.pencilBoss.body.x, this.pencilBoss.body.y, this.pencilBoss.radius)) {
      this.takeDamage()
      return
    }
    for (const enemy of this.enemyGrid.query(this.player.x, this.player.y, 55)) {
      if (this.circleHit(this.player.x, this.player.y, this.playerRadius, enemy.text.x, enemy.text.y, enemy.radius)) {
        this.takeDamage()
        return
      }
    }
  }

  private takeDamage() {
    if (this.clearEnding || this.clearState) return
    this.invincibleTimer = 1.1
    this.cameras.main.shake(170, 0.01)
    if (this.playerHitSeTimer <= 0) {
      this.playSe('se-player-hit', { volume: 1, rate: 1 })
      this.playerHitSeTimer = 0.14
    }
    if (this.hasCase) {
      this.damagePose = true
      this.hasCase = false
      this.player.setTexture('eraser-case-hit')
      this.player.setDisplaySize(66, 66)
      this.burstCase()
      this.time.delayedCall(260, () => {
        this.damagePose = false
        if (this.hp > 0) {
          this.player.setTexture('eraser-bare')
          this.player.setDisplaySize(58, 58)
        }
      })
      return
    }
    this.hp -= 1
    this.damagePose = true
    this.player.setTexture('eraser-bare-hit')
    this.player.setDisplaySize(66, 66)
    this.time.delayedCall(180, () => {
      this.damagePose = false
      if (this.hp > 0) {
        this.player.setTexture('eraser-bare')
        this.player.setDisplaySize(58, 58)
      }
    })
    if (this.hp <= 0) this.endGame()
  }

  private burstCase() {
    for (let i = 0; i < 18; i += 1) {
      const shard = this.add.rectangle(this.player.x, this.player.y, Phaser.Math.Between(5, 12), Phaser.Math.Between(4, 9), 0x277bd8, 0.9)
      shard.setDepth(12)
      shard.setAngle(Phaser.Math.Between(0, 180))
      const angle = Phaser.Math.FloatBetween(0, Math.PI * 2)
      const distance = Phaser.Math.FloatBetween(28, 88)
      this.tweens.add({ targets: shard, x: shard.x + Math.cos(angle) * distance, y: shard.y + Math.sin(angle) * distance, alpha: 0, angle: shard.angle + Phaser.Math.Between(-160, 160), duration: 420, ease: 'Cubic.easeOut', onComplete: () => shard.destroy() })
    }
  }

  private updateSpawning(dt: number) {
    if (this.bossPhase) return
    if (this.spawnTimer > 0) return
    const wave = Math.floor(this.elapsed / 20)
    const desiredCount = Math.min(this.maxEnemies(), SPAWN_TARGET_BASE + wave * SPAWN_TARGET_PER_WAVE)
    const missing = Math.max(0, desiredCount - this.enemies.length)
    const burst = Phaser.Math.Clamp(3 + Math.floor(wave / 3), 3, 10)
    const spawnCount = missing > 0 ? Math.min(burst, missing) : 1
    for (let i = 0; i < spawnCount; i += 1) this.spawnEnemy()
    if (this.elapsed > 24 && Phaser.Math.Between(1, 100) <= 7 + wave) this.spawnEnemy(true)
    this.spawnTimer = Math.max(SPAWN_INTERVAL_MIN, SPAWN_INTERVAL_BASE - wave * SPAWN_INTERVAL_WAVE_REDUCTION) + dt
  }

  private enemyTextStyle(kind: EnemyKind, boss: boolean): Phaser.Types.GameObjects.Text.TextStyle {
    return {
      fontFamily: '"Yu Mincho", "Hiragino Mincho ProN", "Noto Serif CJK JP", serif',
      fontSize: this.enemyFontSize(kind, boss),
      fontStyle: '900',
      color: this.enemyTextColor(kind, boss),
      stroke: '#fff4d8',
      strokeThickness: boss ? 6 : 4,
      shadow: { offsetX: 2, offsetY: 3, color: '#b3a58d', blur: 0, fill: true },
    }
  }

  private enemyFontSize(kind: EnemyKind, boss: boolean) {
    if (boss) return kind === '龖' ? '46px' : '42px'
    if (kind === '兵') return '21px'
    if (kind === '龍') return '25px'
    return '23px'
  }

  private enemyTextColor(kind: EnemyKind, boss: boolean) {
    if (boss) return kind === '龖' ? '#4b130f' : '#3b1110'
    if (kind === '盾') return '#263849'
    if (kind === '馬') return '#2a1d10'
    if (kind === '龍') return '#4b1713'
    return '#191611'
  }

  private enemyMaxHp(kind: EnemyKind, boss: boolean) {
    if (kind === '盾') return 30
    if (kind === '龖' || kind === '龍') return 50
    if (boss) return 50
    return ENEMY_HP[kind]
  }

  private enemyRadius(kind: EnemyKind, boss: boolean) {
    if (boss) return kind === '龖' ? 34 : 28
    if (kind === '兵') return 12
    if (kind === '馬') return 13
    if (kind === '龍') return 18
    return 14
  }

  private acquireEnemy(x: number, y: number, kind: EnemyKind, boss: boolean, wave: number, dropsLoot: boolean) {
    const text = this.enemyPool.pop()?.text ?? this.add.text(x, y, kind, this.enemyTextStyle(kind, boss))
    text.setStyle(this.enemyTextStyle(kind, boss))
    text.setText(kind)
    text.setOrigin(0.5)
    text.setDepth(9)
    text.setPosition(x, y)
    text.setActive(true)
    text.setVisible(true)
    text.setAlpha(1)
    text.setScale(1)
    text.setAngle(0)
    text.clearTint()
    const maxHp = this.enemyMaxHp(kind, boss)
    const enemy: Enemy = {
      id: this.enemySeq,
      text,
      kind,
      hp: maxHp,
      maxHp,
      speed: this.enemySpeed(kind, wave) * (boss ? 0.7 : 1),
      radius: this.enemyRadius(kind, boss),
      phase: Phaser.Math.FloatBetween(0, Math.PI * 2),
      cooldown: Phaser.Math.FloatBetween(0.35, 1.2),
      windup: 0,
      boss,
      slowUntil: 0,
      stapledUntil: 0,
      glueFx: null,
      stapleFx: null,
      dropsLoot,
    }
    this.enemySeq += 1
    return enemy
  }

  private spawnEnemy(forceBoss = false, options?: { x?: number; y?: number; fromBoss?: boolean; kind?: EnemyKind }) {
    if (this.enemies.length >= this.maxEnemies()) return
    const camera = this.cameras.main
    const margin = 120
    const side = Phaser.Math.Between(0, 3)
    let x = options?.x ?? camera.midPoint.x
    let y = options?.y ?? camera.midPoint.y
    if (options?.x === undefined || options?.y === undefined) {
      if (side === 0) {
        x = camera.worldView.left - margin
        y = Phaser.Math.FloatBetween(camera.worldView.top - margin, camera.worldView.bottom + margin)
      } else if (side === 1) {
        x = camera.worldView.right + margin
        y = Phaser.Math.FloatBetween(camera.worldView.top - margin, camera.worldView.bottom + margin)
      } else if (side === 2) {
        x = Phaser.Math.FloatBetween(camera.worldView.left - margin, camera.worldView.right + margin)
        y = camera.worldView.top - margin
      } else {
        x = Phaser.Math.FloatBetween(camera.worldView.left - margin, camera.worldView.right + margin)
        y = camera.worldView.bottom + margin
      }
    }
    x = Phaser.Math.Clamp(x, 32, WORLD_WIDTH - 32)
    y = Phaser.Math.Clamp(y, 32, WORLD_HEIGHT - 32)
    const wave = Math.floor(this.elapsed / 16)
    const kindWave = Math.floor(this.elapsed / 48)
    const kind = options?.kind ?? this.pickEnemyKind(kindWave)
    const boss = forceBoss || Phaser.Math.Between(1, 1000) < 8 + wave
    this.enemies.push(this.acquireEnemy(x, y, kind, boss, wave, !options?.fromBoss))
  }

  private pickEnemyKind(wave: number): EnemyKind {
    if (wave < 1) return '兵'
    const roll = Phaser.Math.Between(1, 100)
    if (roll <= 44) return '兵'
    if (roll <= 60) return '馬'
    if (roll <= 74) return '盾'
    if (roll <= 90) return '槍'
    return '弓'
  }

  private enemySpeed(kind: EnemyKind, wave: number) {
    if (kind === '兵') return Phaser.Math.FloatBetween(42, 58) + wave * 3
    if (kind === '馬') return Phaser.Math.FloatBetween(84, 116) + wave * 5.2
    if (kind === '盾') return Phaser.Math.FloatBetween(28, 38) + wave * 1.8
    if (kind === '龖') return Phaser.Math.FloatBetween(28, 36) + wave * 1.2
    if (kind === '龍') return Phaser.Math.FloatBetween(46, 58) + wave * 2.6
    if (kind === '槍') return Phaser.Math.FloatBetween(16, 21) + wave * 1.3
    return Phaser.Math.FloatBetween(5.5, 7.5) + wave * 0.5
  }

  private tryLockLandscape() {
    if (!window.matchMedia('(pointer: coarse)').matches) return
    const orientationApi = screen.orientation as (ScreenOrientation & { lock?: (orientation: OrientationLockType) => Promise<void> }) | undefined
    if (!orientationApi?.lock) return
    orientationApi.lock('landscape').catch(() => {})
  }

  private drawNotebookWorld() {
    const g = this.add.graphics()
    g.fillStyle(0xf8f3e8, 1)
    g.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT)
    g.lineStyle(1, 0xcfd8df, 0.18)
    for (let x = 70; x < WORLD_WIDTH; x += 80) g.lineBetween(x, 0, x, WORLD_HEIGHT)
    g.lineStyle(2, 0xcfd8df, 0.45)
    for (let y = 60; y < WORLD_HEIGHT; y += 80) g.lineBetween(0, y, WORLD_WIDTH, y)
    g.lineStyle(4, 0xec8991, 0.45)
    g.lineBetween(150, 0, 150, WORLD_HEIGHT)
    g.lineStyle(10, 0xd9c3a3, 0.22)
    g.strokeRect(12, 12, WORLD_WIDTH - 24, WORLD_HEIGHT - 24)
  }

  private findNearestTarget() {
    let nearest: { x: number; y: number } | null = null
    let bestDistance = Number.POSITIVE_INFINITY
    for (const enemy of this.enemies) {
      const dist = Phaser.Math.Distance.Squared(this.player.x, this.player.y, enemy.text.x, enemy.text.y)
      if (dist < bestDistance) {
        nearest = { x: enemy.text.x, y: enemy.text.y }
        bestDistance = dist
      }
    }
    if (this.pencilBoss) {
      const dist = Phaser.Math.Distance.Squared(this.player.x, this.player.y, this.pencilBoss.body.x, this.pencilBoss.body.y)
      if (dist < bestDistance) nearest = { x: this.pencilBoss.body.x, y: this.pencilBoss.body.y }
    }
    return nearest
  }

  private findNearestEnemyByKind(kind: EnemyKind, x = this.player.x, y = this.player.y) {
    let nearest: Enemy | null = null
    let bestDistance = Number.POSITIVE_INFINITY
    for (const enemy of this.enemies) {
      if (enemy.kind !== kind || !enemy.text.active) continue
      const dist = Phaser.Math.Distance.Squared(x, y, enemy.text.x, enemy.text.y)
      if (dist < bestDistance) {
        nearest = enemy
        bestDistance = dist
      }
    }
    return nearest
  }

  private circleHit(ax: number, ay: number, ar: number, bx: number, by: number, br: number) {
    return Phaser.Math.Distance.Squared(ax, ay, bx, by) <= (ar + br) * (ar + br)
  }

  private updateHud() {
    this.hud.time!.textContent = this.formatTime(this.elapsed)
    if (this.hud.quickTime) this.hud.quickTime.textContent = this.formatTime(this.elapsed)
    this.hud.kills!.textContent = String(this.kills)
    this.hud.level!.textContent = String(this.level)
    this.hud.crumbs!.textContent = `${this.crumbsHeld}/${this.nextLevelCrumbs} (${this.score})`
    this.hud.hp!.textContent = '■'.repeat(Math.max(0, this.hp))
    const full = '/assets/ui/life-full.png'
    const empty = '/assets/ui/life-empty.png'
    const slots = PLAYER_MAX_HP
    const filled = Math.max(0, this.hp)
    if (this.lastLifeFilled !== filled) {
      this.hud.life!.innerHTML = Array.from({ length: slots }, (_, index) => {
        const src = index < filled ? full : empty
        const alt = index < filled ? 'life' : 'empty life'
        return `<img src="${src}" alt="${alt}">`
      }).join('')
      this.lastLifeFilled = filled
    }
    this.hud.case!.textContent = this.bowGuardActive ? 'GUARD' : this.weaponLevels.bowGuard > 0 ? 'READY' : 'BARE'
    this.hud.case!.classList.toggle('broken', !this.bowGuardActive)
    this.hud.high!.textContent = String(this.highScore())
    if (this.hud.collectButton) {
      this.hud.collectButton.disabled = this.collectButtonUsed || this.crumbs.length === 0
      this.hud.collectButton.setAttribute('aria-label', this.collectButtonUsed ? '全マップの消しカスを回収（使用済み）' : `全マップの消しカスを回収（${this.crumbs.length}個）`)
    }
    const attachedCompass = this.hasFusion('cannon-compass')
    const unlocked = (Object.keys(this.weaponLevels) as UpgradeId[]).filter((id) => this.weaponLevels[id] > 0 || this.fusedBaseWeapons.has(id) || (id === 'compass' && attachedCompass))
    const fusionLine = [...this.unlockedFusions].map((id) => FUSIONS[id].name).join(' / ')
    const buffs = [
      this.permanentProjectileBonus > 0 ? `SHOT +${this.permanentProjectileBonus}` : '',
      this.buffTimers.range > 0 ? `2x RANGE ${Math.ceil(this.buffTimers.range)}s` : '',
      this.goldRushTimer > 0 ? `GOLD ${Math.ceil(this.goldRushTimer)}s` : '',
      this.pencilBoss ? `PEN BOSS ${Math.max(0, Math.ceil(this.pencilBoss.hp))}/${this.pencilBoss.maxHp}` : '',
    ].filter(Boolean).join(' / ')
    this.hud.weapons!.innerHTML = `
      <div class="pause-block-head">
        <span>ARMS</span>
        <strong>${unlocked.length ? unlocked.map((id) => `${UPGRADES[id].name} ${this.fusedBaseWeapons.has(id) ? '合成' : id === 'compass' && attachedCompass ? '付与' : `LV${this.weaponLevels[id]}`}`).join(' / ') : '未取得'}</strong>
      </div>
      <ul class="weapon-list">
        ${unlocked.length
          ? unlocked.map((id) => `<li><b>${UPGRADES[id].name}${this.fusedBaseWeapons.has(id) ? ' 合成' : id === 'compass' && attachedCompass ? ' 付与' : ''}</b><span>${this.currentWeaponSummary(id, this.fusedBaseWeapons.has(id) || id === 'compass' && attachedCompass ? MAX_UPGRADE_LEVEL : this.weaponLevels[id])}</span></li>`).join('')
          : '<li><b>現在の武器なし</b><span>レベルアップで射撃武器を解放</span></li>'}
      </ul>
      <p class="buff-line">${buffs || '一時効果なし'}</p>
      ${fusionLine ? `<p class="buff-line fusion-line">合成: ${this.escapeHtml(fusionLine)}</p>` : ''}
    `
    this.updateExpGauge()
  }

  private updateExpGauge() {
    if (!this.hud.expGauge) return
    const progress = this.expGaugeMaxFlash
      ? 1
      : Math.min(1, this.crumbsHeld / Math.max(1, this.nextLevelCrumbs))
    this.hud.expGauge.style.width = `${Math.round(progress * 1000) / 10}%`
    this.hud.expGauge.classList.toggle('max', this.expGaugeMaxFlash)
    this.hud.expGauge.setAttribute('aria-valuenow', String(Math.round(progress * 100)))
  }

  private drawMiniMap() {
    if (!this.miniMapVisible || !this.hud.miniMapCanvas) return
    const canvas = this.hud.miniMapCanvas
    const context = canvas.getContext('2d')
    if (!context) return
    const width = canvas.width
    const height = canvas.height
    context.clearRect(0, 0, width, height)
    context.fillStyle = 'rgba(0, 0, 0, 0.72)'
    context.fillRect(0, 0, width, height)
    context.strokeStyle = 'rgba(255, 248, 229, 0.62)'
    context.lineWidth = 2
    context.strokeRect(1, 1, width - 2, height - 2)
    context.strokeStyle = 'rgba(255, 248, 229, 0.16)'
    context.lineWidth = 1
    for (let x = 0; x <= width; x += width / 10) context.beginPath(), context.moveTo(x, 0), context.lineTo(x, height), context.stroke()
    for (let y = 0; y <= height; y += height / 7) context.beginPath(), context.moveTo(0, y), context.lineTo(width, y), context.stroke()
    const mapX = (x: number) => Phaser.Math.Clamp((x / WORLD_WIDTH) * width, 3, width - 3)
    const mapY = (y: number) => Phaser.Math.Clamp((y / WORLD_HEIGHT) * height, 3, height - 3)
    const enemyScale = this.fullMapVisible ? 1.35 : 1
    context.globalAlpha = 0.92
    for (const enemy of this.enemies) {
      if (!enemy.text.active) continue
      const x = mapX(enemy.text.x)
      const y = mapY(enemy.text.y)
      const radius = this.miniMapEnemyRadius(enemy) * enemyScale
      context.fillStyle = this.miniMapEnemyColor(enemy)
      context.shadowColor = 'rgba(255, 248, 229, 0.72)'
      context.shadowBlur = this.fullMapVisible ? 5 : 3
      context.beginPath()
      context.arc(x, y, radius, 0, Math.PI * 2)
      context.fill()
      context.shadowBlur = 0
      context.strokeStyle = 'rgba(255, 248, 229, 0.95)'
      context.lineWidth = this.fullMapVisible ? 2.2 : 1.4
      context.stroke()
    }
    if (this.pencilBoss?.body.active) {
      const bossX = mapX(this.pencilBoss.body.x)
      const bossY = mapY(this.pencilBoss.body.y)
      context.fillStyle = '#a31313'
      context.beginPath()
      context.moveTo(bossX, bossY - 11)
      context.lineTo(bossX + 11, bossY)
      context.lineTo(bossX, bossY + 11)
      context.lineTo(bossX - 11, bossY)
      context.closePath()
      context.fill()
      context.strokeStyle = '#ffffff'
      context.lineWidth = 2
      context.stroke()
    }
    context.fillStyle = '#1267c4'
    context.beginPath()
    context.arc(mapX(this.player.x), mapY(this.player.y), this.fullMapVisible ? 9 : 6.5, 0, Math.PI * 2)
    context.fill()
    context.globalAlpha = 1
    context.strokeStyle = '#ffffff'
    context.lineWidth = this.fullMapVisible ? 3 : 2.2
    context.stroke()
  }

  private miniMapEnemyRadius(enemy: Enemy) {
    if (enemy.boss) return enemy.kind === '龖' ? 7.4 : 6.5
    if (enemy.kind === '龍') return 5.8
    if (enemy.kind === '弓') return 5.2
    if (enemy.kind === '槍') return 4.7
    if (enemy.kind === '盾') return 5
    if (enemy.kind === '馬') return 4.5
    return 4.1
  }

  private miniMapEnemyColor(enemy: Enemy) {
    if (enemy.kind === '龖') return '#8f1010'
    if (enemy.kind === '龍') return '#b51010'
    if (enemy.boss) return '#b51010'
    if (enemy.kind === '弓') return '#ef2b2b'
    if (enemy.kind === '槍') return '#d26722'
    if (enemy.kind === '盾') return '#40637d'
    if (enemy.kind === '馬') return '#5e3513'
    return '#15120f'
  }

  private itemAssetPath(kind: ItemKind) {
    const key = ITEM_DEFS[kind].key
    if (kind === 'heal') return '/assets/ui/life-full.png'
    return `/assets/items/${key}.png`
  }

  private updateBowWarning() {
    const warning = this.hud.bowWarning
    if (!warning) return
    if (!this.player.active || this.titleOpen || this.hp <= 0 || this.levelChoiceOpen || this.paused) {
      warning.classList.remove('visible')
      return
    }
    const width = this.scale.width || window.innerWidth
    const height = this.scale.height || window.innerHeight
    const view = this.cameras.main.worldView
    const playerX = ((this.player.x - view.left) / Math.max(1, view.width)) * width
    const playerY = ((this.player.y - view.top) / Math.max(1, view.height)) * height
    const candidates = this.enemies
      .filter((enemy) => {
        if (enemy.kind !== '弓' || !enemy.text.active) return false
        const screenX = ((enemy.text.x - view.left) / Math.max(1, view.width)) * width
        const screenY = ((enemy.text.y - view.top) / Math.max(1, view.height)) * height
        return screenX < 0 || screenX > width || screenY < 0 || screenY > height
      })
      .sort((left, right) => {
        const leftDistance = Phaser.Math.Distance.Squared(this.player.x, this.player.y, left.text.x, left.text.y)
        const rightDistance = Phaser.Math.Distance.Squared(this.player.x, this.player.y, right.text.x, right.text.y)
        return leftDistance - rightDistance
      })
      .slice(0, 6)
    if (!candidates.length) {
      warning.replaceChildren()
      warning.classList.remove('visible')
      return
    }
    const padding = 22
    const markers = candidates.map((enemy, index) => {
      const directionX = enemy.text.x - this.player.x
      const directionY = enemy.text.y - this.player.y
      const distance = Math.hypot(directionX, directionY) || 1
      const dx = directionX / distance
      const dy = directionY / distance
      const edgeDistances: number[] = []
      if (dx > 0) edgeDistances.push((width - padding - playerX) / dx)
      if (dx < 0) edgeDistances.push((padding - playerX) / dx)
      if (dy > 0) edgeDistances.push((height - padding - playerY) / dy)
      if (dy < 0) edgeDistances.push((padding - playerY) / dy)
      const positiveDistances = edgeDistances.filter((value) => value > 0)
      const edgeScale = positiveDistances.length ? Math.min(...positiveDistances) : Math.max(width, height)
      const tangentX = -dy
      const tangentY = dx
      const offset = index * 20
      return {
        x: Phaser.Math.Clamp(playerX + dx * edgeScale + tangentX * offset, padding, width - padding),
        y: Phaser.Math.Clamp(playerY + dy * edgeScale + tangentY * offset, padding, height - padding),
        label: `弓の敵 ${index + 1}`,
      }
    })
    warning.replaceChildren(...markers.map((marker) => {
      const element = document.createElement('span')
      element.className = 'bow-warning-marker'
      element.textContent = '⚠️'
      element.setAttribute('aria-label', marker.label)
      element.style.left = `${marker.x}px`
      element.style.top = `${marker.y}px`
      return element
    }))
    warning.classList.add('visible')
  }

  private updateItemWarning() {
    const warning = this.hud.itemWarning
    if (!warning) return
    if (!this.player.active || this.titleOpen || this.hp <= 0 || this.levelChoiceOpen || this.paused || this.fullMapVisible) {
      warning.classList.remove('visible')
      return
    }
    const width = this.scale.width || window.innerWidth
    const height = this.scale.height || window.innerHeight
    const view = this.cameras.main.worldView
    const playerX = ((this.player.x - view.left) / Math.max(1, view.width)) * width
    const playerY = ((this.player.y - view.top) / Math.max(1, view.height)) * height
    const candidates = this.items
      .filter((item) => {
        if (!item.body.active) return false
        const screenX = ((item.body.x - view.left) / Math.max(1, view.width)) * width
        const screenY = ((item.body.y - view.top) / Math.max(1, view.height)) * height
        return screenX < 0 || screenX > width || screenY < 0 || screenY > height
      })
      .sort((left, right) => {
        const leftDistance = Phaser.Math.Distance.Squared(this.player.x, this.player.y, left.body.x, left.body.y)
        const rightDistance = Phaser.Math.Distance.Squared(this.player.x, this.player.y, right.body.x, right.body.y)
        return leftDistance - rightDistance
      })
      .slice(0, 6)
    if (!candidates.length) {
      warning.replaceChildren()
      warning.classList.remove('visible')
      return
    }
    const padding = 28
    const markers = candidates.map((item, index) => {
      const directionX = item.body.x - this.player.x
      const directionY = item.body.y - this.player.y
      const distance = Math.hypot(directionX, directionY) || 1
      const dx = directionX / distance
      const dy = directionY / distance
      const edgeDistances: number[] = []
      if (dx > 0) edgeDistances.push((width - padding - playerX) / dx)
      if (dx < 0) edgeDistances.push((padding - playerX) / dx)
      if (dy > 0) edgeDistances.push((height - padding - playerY) / dy)
      if (dy < 0) edgeDistances.push((padding - playerY) / dy)
      const positiveDistances = edgeDistances.filter((value) => value > 0)
      const edgeScale = positiveDistances.length ? Math.min(...positiveDistances) : Math.max(width, height)
      const tangentX = -dy
      const tangentY = dx
      const offset = index * 24
      return {
        x: Phaser.Math.Clamp(playerX + dx * edgeScale + tangentX * offset, padding, width - padding),
        y: Phaser.Math.Clamp(playerY + dy * edgeScale + tangentY * offset, padding, height - padding),
        kind: item.kind,
      }
    })
    warning.replaceChildren(...markers.map((marker) => {
      const element = document.createElement('img')
      element.className = 'item-warning-marker'
      element.src = this.itemAssetPath(marker.kind)
      element.alt = ITEM_DEFS[marker.kind].label
      element.style.left = `${marker.x}px`
      element.style.top = `${marker.y}px`
      return element
    }))
    warning.classList.add('visible')
  }

  private updateMouseCursor() {
    const cursor = this.hud.mouseCursor
    if (!cursor) return
    if (this.touchControls || this.titleOpen || !this.roundStarted || this.hp <= 0) {
      cursor.classList.remove('visible')
      return
    }
    cursor.style.left = `${this.mouseScreen.x}px`
    cursor.style.top = `${this.mouseScreen.y}px`
    cursor.classList.add('visible')
  }

  private drawDebug() {
    this.graphics.clear()
    if (!this.showAttackHitbox) return
    this.graphics.lineStyle(2, 0x4da3ff, 0.82)
    const side = this.aimVector.x < 0 ? -1 : 1
    this.graphics.strokeRect(this.player.x + side * 52 - 50, this.player.y + this.aimVector.y * 14 - 40, 100, 80)
  }

  private endGame() {
    this.clearLastRunState()
    this.graphics.clear()
    this.roundStarted = false
    this.hideDesktopHint()
    this.hud.bowWarning?.classList.remove('visible')
    this.hud.itemWarning?.classList.remove('visible')
    this.miniMapVisible = false
    this.fullMapVisible = false
    this.mapPausedByToggle = false
    this.syncMiniMapToggle()
    this.clearRoundObjects()
    this.stopBgm()
    this.playSe(this.clearState ? 'se-clear-jingle' : 'se-game-over', { volume: 0.94, rate: 1 })
    const best = Math.max(this.highScore(), this.score)
    localStorage.setItem(HIGH_SCORE_KEY, String(best))
    this.player.setTint(0x8d8d8d)
    if (this.hud.overlayLabel) this.hud.overlayLabel.textContent = this.clearState ? 'GAME CLEAR' : 'GAME OVER'
    if (this.hud.overlayTitle) this.hud.overlayTitle.textContent = this.clearState ? 'えんぴつボスを削りきった。' : 'けしごむ、削られた。'
    const lifeBonusLine = this.clearState ? `<dt>LIFE BONUS</dt><dd>+${this.clearLifeBonus}</dd>` : ''
    const bossBonusLine = this.clearState ? `<dt>BOSS BONUS</dt><dd>+${this.clearBossTimeBonus}</dd>` : ''
    this.hud.final!.innerHTML = `<dt>SCORE</dt><dd>${this.score}</dd>${lifeBonusLine}${bossBonusLine}<dt>TIME</dt><dd>${this.formatTime(this.elapsed)}</dd><dt>KILLS</dt><dd>${this.kills}</dd><dt>HIGH</dt><dd>${best}</dd>`
    if (this.hud.resultTip) this.hud.resultTip.textContent = this.randomResultTip()
    this.hud.overlay!.classList.add('visible')
    void this.submitRankingIfNeeded()
    this.renderTitleSummary()
  }

  private highScore() {
    return Number(localStorage.getItem(HIGH_SCORE_KEY) || '0')
  }

  private randomResultTip() {
    return RESULT_TIPS[Math.floor(Math.random() * RESULT_TIPS.length)]
  }

  private currentBuildSummary() {
    const weapons = (Object.keys(this.weaponLevels) as UpgradeId[])
      .filter((id) => this.weaponLevels[id] > 0 && id !== 'bowGuard')
      .map((id) => `${UPGRADES[id].name}${this.weaponLevels[id]}`)
    if (this.weaponLevels.bowGuard > 0) weapons.push('弓ガード')
    const fusions = [...this.unlockedFusions].map((id) => FUSIONS[id].name)
    return [...weapons, ...fusions].join(' / ').slice(0, 80)
  }

  private async submitRankingIfNeeded() {
    if (this.submittedScore || this.score <= 0 || !this.hud.submitStatus) return
    this.submittedScore = true
    this.hud.submitStatus.textContent = 'ランキング送信中...'
    try {
      await submitScore({
        name: savePlayerName(this.hud.playerName?.value || loadPlayerName()),
        score: this.score,
        kills: this.kills,
        level: this.level,
        timeSeconds: Math.floor(this.elapsed),
        build: this.currentBuildSummary(),
      })
      this.hud.submitStatus.textContent = 'ランキング送信完了'
    } catch {
      this.hud.submitStatus.textContent = 'ランキング送信失敗'
    }
  }

  private syncHitboxButton() {
    const button = document.querySelector<HTMLButtonElement>('#hitbox-toggle')
    if (!button) return
    button.textContent = this.showAttackHitbox ? 'HITBOX ON' : 'HITBOX OFF'
    button.classList.toggle('active', this.showAttackHitbox)
  }

  private formatTime(seconds: number) {
    const total = Math.floor(seconds)
    const m = Math.floor(total / 60)
    const s = total % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  private escapeHtml(value: string) {
    return value
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;')
  }
}

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <div id="game-shell">
    <div id="game-root"></div>
    <section id="start-splash" class="menu-screen visible" aria-label="ゲーム開始">
      <button type="button" id="start-splash-button" aria-label="タイトル画面へ進む">
        <img src="/assets/title/title-logo-splash.png" alt="消しゴムサバイバー">
        <span>START</span>
      </button>
    </section>
    <section id="title-screen" class="menu-screen visible">
      <div class="menu-inner">
        <button type="button" id="title-share-button" aria-label="ゲームを共有" title="共有">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 16V3m0 0 5 5m-5-5L7 8M5 13v6h14v-6"></path></svg>
        </button>
        <div id="title-stage" aria-label="消しゴムサバイバー">
          <img id="title-logo" src="/assets/title/title-logo.png" alt="消しゴムサバイバー">
          <span class="title-kanji title-kanji-spear" aria-hidden="true">槍</span>
          <span class="title-kanji title-kanji-bow" aria-hidden="true">弓</span>
          <span class="title-kanji title-kanji-shield-a" aria-hidden="true">盾</span>
          <span class="title-kanji title-kanji-dragon" aria-hidden="true">龍</span>
          <span class="title-kanji title-kanji-shield-b" aria-hidden="true">盾</span>
          <span class="title-kanji title-kanji-soldier-a" aria-hidden="true">兵</span>
          <span class="title-kanji title-kanji-soldier-b" aria-hidden="true">兵</span>
          <img class="title-projectile title-projectile-a" src="/assets/projectiles/bullet-blue.png" alt="" aria-hidden="true">
          <img class="title-projectile title-projectile-b" src="/assets/projectiles/bullet-blue.png" alt="" aria-hidden="true">
          <img class="title-character title-player-character" src="/assets/characters/eraser.png" alt="主人公の消しゴム君">
          <img class="title-character title-pencil-character" src="/assets/characters/pen.png" alt="鉛筆のボス">
        </div>
        <div id="title-control-panel">
          <div id="title-meta">
            <label class="title-field">
              <span>NAME</span>
              <input id="player-name" type="text" maxlength="16" spellcheck="false">
            </label>
            <div class="title-stat"><span>BEST SCORE</span><strong id="title-best">0</strong></div>
          </div>
          <div id="title-buttons">
            <button type="button" id="play-button">PLAY</button>
            <button type="button" id="ranking-button">RANKING</button>
            <button type="button" id="codex-button">合成図鑑</button>
            <button type="button" id="how-to-button">遊び方</button>
          </div>
          <div id="title-volume" aria-label="タイトル音量設定">
            <div class="volume-control camera-control">
              <label for="title-map-zoom">カメラ距離 <strong id="title-map-zoom-value">6</strong></label>
              <input id="title-map-zoom" type="range" min="1" max="10" step="1" value="6">
            </div>
            <div class="volume-control">
              <label for="title-se-volume">SE <strong id="title-se-volume-value">3</strong></label>
              <input id="title-se-volume" type="range" min="0" max="10" step="1" value="3">
            </div>
            <div class="volume-control">
              <label for="title-bgm-volume">BGM <strong id="title-bgm-volume-value">5</strong></label>
              <input id="title-bgm-volume" type="range" min="0" max="10" step="1" value="5">
            </div>
            <div class="volume-control">
              <label for="title-voice-volume">VOICE <strong id="title-voice-volume-value">8</strong></label>
              <input id="title-voice-volume" type="range" min="0" max="10" step="1" value="8">
            </div>
          </div>
          <div id="title-credits" aria-label="クレジット">
            <p><span>企画・仕様・デザイン</span><a class="credit-link" href="https://x.com/BeatsKirito" target="_blank" rel="noopener noreferrer">@BeatsKirito</a></p>
            <p><span>プログラム</span><a class="credit-link" href="https://x.com/SGGame9" target="_blank" rel="noopener noreferrer">@SGGame9</a></p>
            <p><span>ボイス</span><a class="credit-link" href="https://x.com/h_katsui" target="_blank" rel="noopener noreferrer">@h_katsui</a></p>
          </div>
          <p id="music-credit"><span>音楽：</span><span>魔王魂</span></p>
          <p id="title-notice" aria-live="polite"></p>
        </div>
      </div>
    </section>
    <section id="share-dialog" class="menu-screen" aria-modal="true" role="dialog" aria-labelledby="share-title">
      <div class="menu-inner share-inner">
        <div class="panel-head">
          <button type="button" id="share-close-top" class="panel-close">CLOSE</button>
          <div>
            <p>SHARE</p>
            <h1 id="share-title">ゲームを共有</h1>
          </div>
        </div>
        <p id="share-status" aria-live="polite">共有方法を選んでください。</p>
        <div id="share-actions">
          <button type="button" id="share-native-button">OSの共有</button>
          <a id="share-x-button" href="#" target="_blank" rel="noopener noreferrer">Xで共有</a>
          <a id="share-line-button" href="#" target="_blank" rel="noopener noreferrer">LINEで共有</a>
          <button type="button" id="share-copy-button">リンクをコピー</button>
        </div>
        <button type="button" id="share-close" class="sub-button">閉じる</button>
      </div>
    </section>
    <section id="how-to-dialog" aria-modal="true" role="dialog" aria-labelledby="how-to-title">
      <div id="how-to-panel">
        <figure id="how-to-shot" aria-label="ゲーム画面の見方">
          <div class="shot-bg-lines"></div>
          <div class="shot-title">
            <p>HOW TO PLAY</p>
            <h1 id="how-to-title">遊び方</h1>
          </div>
          <span class="shot-callout shot-callout-main">文字が勝手に動いた!?<br>消しゴム君を操作して文字を消そう!</span>
          <span class="shot-callout shot-callout-exp">消しカスを集めて<b>レベルアップ!</b></span>
          <span class="shot-word word-soldier">兵</span>
          <span class="shot-word word-spear">槍</span>
          <span class="shot-word word-bow">弓</span>
          <span class="shot-warning"><i>⚠️</i><b>弓の方向</b></span>
          <img class="shot-player" src="/assets/characters/eraser-bare.png" alt="消しゴム君">
          <img class="shot-bullet" src="/assets/projectiles/bullet-blue.png" alt="消しゴム弾">
          <span class="shot-arrow move-up">↑</span>
          <span class="shot-arrow move-left">←</span>
          <span class="shot-arrow move-right">→</span>
          <span class="shot-arrow aim-arrow">攻撃方向</span>
          <span class="shot-pad move-pad"><i></i><b>移動</b></span>
          <span class="shot-pad aim-pad"><i></i><b>向き</b></span>
          <span class="shot-crumb crumb-a"></span>
          <span class="shot-crumb crumb-b"></span>
          <span class="shot-crumb crumb-c"></span>
          <div class="shot-collect-wrap">
            <button type="button" class="shot-collect-button" disabled aria-label="消しカス全回収">
              <span class="collect-button-icon" aria-hidden="true"><i></i><b>↓</b></span>
              <span>消しカス全回収</span>
            </button>
            <span class="shot-collect-note">一度しか使えないよ！</span>
          </div>
        </figure>
        <div id="how-to-grid">
          <section>
            <h2>PC</h2>
            <p><b>移動</b> W / A / S / D</p>
            <p><b>向き</b> マウス</p>
            <p><b>ポーズ</b> スペースキー</p>
          </section>
          <section>
            <h2>スマホ</h2>
            <p><b>移動</b> 画面左側をドラッグ</p>
            <p><b>向き</b> 画面右側をドラッグ</p>
          </section>
        </div>
        <ul id="how-to-list">
          <li>最終強化同士で合成! 図鑑を埋めよう!</li>
          <li>最後まで生き残ればクリア!</li>
        </ul>
        <button type="button" id="how-to-close">閉じる</button>
      </div>
    </section>
    <section id="ranking-screen" class="menu-screen">
      <div class="menu-inner ranking-inner">
        <div class="panel-head">
          <button type="button" id="ranking-close-top" class="panel-close">CLOSE</button>
          <div>
            <p>ONLINE</p>
            <h1>ランキング</h1>
          </div>
        </div>
        <p id="ranking-scroll-guide" aria-hidden="true">
          <span>1位から順番に表示</span>
          <span>下へスライド <b>↓</b></span>
        </p>
        <div
          id="ranking-scroll-region"
          role="region"
          tabindex="0"
          aria-label="ランキング一覧。1位から順に下へスライドして閲覧できます"
        >
          <p id="ranking-status" aria-live="polite"></p>
          <ol id="ranking-list"></ol>
          <button type="button" id="ranking-close">CLOSE</button>
        </div>
      </div>
    </section>
    <section id="codex-screen" class="menu-screen">
      <div class="menu-inner ranking-inner">
        <div class="panel-head">
          <p>FUSION</p>
          <h1>合成図鑑</h1>
        </div>
        <div id="codex-layout">
          <ul id="codex-list"></ul>
          <aside id="codex-preview"></aside>
        </div>
        <button type="button" id="codex-close">CLOSE</button>
      </div>
    </section>
    <div id="rotate-lock" aria-hidden="true">
      <p>横向きにしてプレイ</p>
    </div>
    <header id="quick-hud" aria-live="polite">
      <div id="life-bar"></div>
      <div id="quick-time">0:00</div>
      <div id="quick-actions">
        <button type="button" id="auto-button" class="active">AUTO ON</button>
        <button type="button" id="pause-button">PAUSE</button>
      </div>
    </header>
    <div id="exp-gauge" aria-label="経験値ゲージ" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0">
      <div id="exp-gauge-fill"></div>
    </div>
    <aside id="mini-map" aria-label="全体マップ">
      <canvas id="mini-map-canvas" width="960" height="560"></canvas>
    </aside>
    <div id="bow-warning" aria-label="弓の敵がいる方向">⚠️</div>
    <div id="item-warning" aria-label="アイテムがある方向"></div>
    <div id="mouse-cursor-follow" aria-hidden="true"><img src="/assets/ui/life-full.png" alt=""></div>
    <button type="button" id="collect-button" aria-label="全マップの消しカスを回収">
      <span class="collect-button-icon" aria-hidden="true"><i></i><b>↓</b></span>
      <span>消しカス全回収</span>
    </button>
    <div id="hud" class="pause-panel" aria-live="polite">
      <div><span>TIME</span><strong id="time">0:00</strong></div>
      <div><span>KILLS</span><strong id="kills">0</strong></div>
      <div><span>LV</span><strong id="level">1</strong></div>
      <div><span>KASU</span><strong id="crumbs">0/5</strong></div>
      <div><span>CASE</span><strong id="case">CASE</strong></div>
      <div><span>BODY</span><strong id="hp">■■</strong></div>
      <div><span>HIGH</span><strong id="high">0</strong></div>
    </div>
    <div id="pause-actions" class="pause-panel">
      <button type="button" id="pause-auto-button" class="active">AUTO ON</button>
      <button type="button" id="mini-map-toggle">MAP OPEN</button>
      <button type="button" id="pause-retry-button">リトライ</button>
      <button type="button" id="pause-title-button">タイトルへ戻る</button>
      <div class="volume-control">
        <label for="se-volume">SE <strong id="se-volume-value">3</strong></label>
        <input id="se-volume" type="range" min="0" max="10" step="1" value="3">
      </div>
      <div class="volume-control">
        <label for="bgm-volume">BGM <strong id="bgm-volume-value">5</strong></label>
        <input id="bgm-volume" type="range" min="0" max="10" step="1" value="5">
      </div>
      <div class="volume-control">
        <label for="voice-volume">VOICE <strong id="voice-volume-value">8</strong></label>
        <input id="voice-volume" type="range" min="0" max="10" step="1" value="8">
      </div>
      <div class="volume-control camera-control">
        <label for="map-zoom">カメラ距離 <strong id="map-zoom-value">6</strong></label>
        <input id="map-zoom" type="range" min="1" max="10" step="1" value="6">
      </div>
      <p id="pause-hint">PAUSE中に設定変更。Eで全体MAP</p>
    </div>
    <div id="weapons" class="pause-panel"></div>
    <div id="level-up">
      <section>
        <p>LEVEL UP</p>
        <h1>強化を選択</h1>
        <div id="upgrade-list"></div>
      </section>
    </div>
    <div id="game-over">
      <div>
        <p id="overlay-label">GAME OVER</p>
        <h1 id="overlay-title">けしごむ、削られた。</h1>
        <dl id="final-stats"></dl>
        <p id="submit-status"></p>
        <button type="button" id="retry">リトライ</button>
        <button type="button" id="to-title" class="sub-button">タイトルへ</button>
      </div>
      <p id="result-tip" class="result-tip" aria-live="polite"></p>
    </div>
    <div id="round-action-confirm" aria-modal="true" role="dialog" aria-labelledby="round-action-confirm-title">
      <div>
        <p>CONFIRM</p>
        <h1 id="round-action-confirm-title">確認</h1>
        <p id="round-action-confirm-text"></p>
        <div class="confirm-actions">
          <button type="button" id="round-action-confirm-accept">実行する</button>
          <button type="button" id="round-action-confirm-cancel">キャンセル</button>
        </div>
      </div>
    </div>
    <div id="left-pad" class="touch-stick" aria-hidden="true"><span></span></div>
    <div id="right-pad" class="touch-stick aim" aria-hidden="true"><span></span></div>
    <p id="controls" class="pause-panel">左半分: 移動 / 右半分: 攻撃方向固定</p>
    <aside id="desktop-hint" aria-live="polite">
      <p>WASDで移動 / マウスで照準 / クリックで向き固定 / SPACEでポーズ</p>
      <label><input id="desktop-hint-never" type="checkbox"> 以降表示しない</label>
      <button type="button" id="desktop-hint-close">OK</button>
    </aside>
  </div>
`

const referralSource = new URLSearchParams(window.location.search).get('utm_source')
if (referralSource === 'x' || referralSource === 'line' || referralSource === 'share') {
  void recordReferralVisit(referralSource)
}

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game-root',
  backgroundColor: '#1f2833',
  width: window.innerWidth,
  height: window.innerHeight,
  pixelArt: false,
  input: { activePointers: 4 },
  scale: { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: EraserSurvivorScene,
})
