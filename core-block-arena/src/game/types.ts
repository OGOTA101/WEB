export type Vec2 = { x: number; y: number };

export type MaterialId = "wood" | "brick" | "stone" | "iron" | "diamond" | "obsidian";

export type WeaponId = string;

export type BulletKind =
  | "round"
  | "homing"
  | "bomb"
  | "debuff"
  | "rocket"
  | "beam"
  | "sniper"
  | "knockback"
  | "orb"
  | "pulse"
  | "blade"
  | "mine";

export type Block = {
  id: string;
  gx: number;
  gy: number;
  material: MaterialId;
  hp: number;
  maxHp: number;
  isCore: boolean;
  weapon?: WeaponId;
  cooldown: number;
};

export type Bullet = {
  id: string;
  ownerId: string;
  teamId: string;
  weapon?: WeaponId;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  damage: number;
  ttl: number;
  kind: BulletKind;
  pierce: number;
  knockback: number;
  slow: number;
  spriteFrame: number;
  color: number;
};

export type Mob = {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  hp: number;
  maxHp: number;
  tier: number;
  speed: number;
  aim: Vec2;
  color: number;
  blocks: Block[];
  moveMode: "chase" | "strafe" | "orbit" | "dash" | "flank" | "guarded";
  phase: number;
  dashTimer: number;
  dashCooldown: number;
  spawnValue: number;
  slowTimer: number;
  contactTimer: number;
};

export type Drop = {
  id: string;
  x: number;
  y: number;
  material: MaterialId;
  isCore: boolean;
  weapon?: WeaponId;
  hp: number;
  maxHp: number;
  bob: number;
};

export type PlayerState = {
  id: string;
  name: string;
  teamId: string;
  color: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  aim: Vec2;
  blocks: Block[];
  alive: boolean;
  score: number;
  kills: number;
  shieldTimer: number;
  fireHeld: boolean;
};

export type RoomSettings = {
  roomCode: string;
  friendlyFire: boolean;
  maxPlayers: number;
};

export type RemotePlayerLive = {
  id: string;
  name: string;
  slot: number;
  x: number;
  y: number;
  aim: Vec2;
  color: number;
  alive: boolean;
  score: number;
  blocks: Array<Pick<Block, "gx" | "gy" | "material" | "hp" | "maxHp" | "isCore" | "weapon">>;
};

export type GamePhase = "title" | "playing" | "gameover";

export type GameSnapshot = {
  phase: GamePhase;
  elapsed: number;
  score: number;
  highScores: HighScoreEntry[];
  players: PlayerState[];
  mobs: Mob[];
  bullets: Bullet[];
  drops: Drop[];
  message: string;
};

export type GameFxEvent =
  | { type: "shoot"; kind: BulletKind }
  | { type: "hit"; kind: BulletKind }
  | { type: "break" }
  | { type: "drop" }
  | { type: "collect"; core: boolean }
  | { type: "gameover" };

export type HighScoreEntry = {
  name: string;
  score: number;
  wave: number;
  date: string;
};

export type GameCommand =
  | { type: "move"; playerId: string; move: Vec2; fire: boolean }
  | { type: "start"; mode: "solo" | "online"; playerName: string; room: RoomSettings }
  | { type: "returnTitle" };
