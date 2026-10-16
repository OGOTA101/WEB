import {
  BLOCK_SIZE,
  BOARD_SIZE,
  DEFAULT_WEAPON_ID,
  MATERIAL_ORDER,
  MATERIALS,
  WEAPON_DROP_TABLE,
  WEAPONS,
  type WeaponSpec
} from "./catalog";
import { approach, cellKey, clamp, distSq, normalize, rotate } from "./math";
import { loadHighScores, saveHighScore } from "./highScores";
import type { Block, Bullet, Drop, GameCommand, GameFxEvent, GamePhase, GameSnapshot, MaterialId, Mob, PlayerState, RemotePlayerLive, Vec2, WeaponId } from "./types";

const PLAYER_ID = "local-player";
const HALF_BOARD = BOARD_SIZE / 2;

type FireOptions = {
  kind?: Bullet["kind"];
  weapon?: WeaponId;
  speed?: number;
  radius?: number;
  ttl?: number;
  pierce?: number;
  knockback?: number;
  slow?: number;
  damage?: number;
  spriteFrame?: number;
  color?: number;
};

export class CoreBlockArenaSim {
  phase: GamePhase = "title";
  elapsed = 0;
  private spawnTimer = 1.2;
  private pendingSpawns = 0;
  private idSeq = 0;
  private message = "";
  private playerName = "Player";
  private wasFireHeld = false;
  private manualPulse = false;

  players: PlayerState[] = [];
  mobs: Mob[] = [];
  bullets: Bullet[] = [];
  drops: Drop[] = [];
  highScores = loadHighScores();
  private fxEvents: GameFxEvent[] = [];

  get localPlayer() {
    return this.players[0];
  }

  command(command: GameCommand) {
    if (command.type === "returnTitle") {
      this.phase = "title";
      this.message = "";
      return;
    }

    if (command.type === "start") {
      this.start(command.playerName, command.mode === "online" ? command.room.roomCode : "SOLO");
      return;
    }

    const player = this.players.find((p) => p.id === command.playerId);
    if (!player || !player.alive) return;
    const move = normalize(command.move, player.aim);
    const moving = Math.hypot(command.move.x, command.move.y) > 0.05;
    player.fireHeld = command.fire;
    if (moving) player.aim = move;
    player.vx = moving ? move.x * this.speedFor(player) : approach(player.vx, 0, 650 / 60);
    player.vy = moving ? move.y * this.speedFor(player) : approach(player.vy, 0, 650 / 60);
  }

  update(dt: number) {
    if (this.phase !== "playing") return;
    this.elapsed += dt;
    this.manualPulse = !!this.localPlayer?.fireHeld && !this.wasFireHeld;
    this.wasFireHeld = !!this.localPlayer?.fireHeld;

    this.updatePlayers(dt);
    this.updateWeapons(dt);
    this.updateMobs(dt);
    this.updateBullets(dt);
    this.collectDrops();
    this.spawnMobs(dt);
    this.checkGameOver();
  }

  snapshot(): GameSnapshot {
    return {
      phase: this.phase,
      elapsed: this.elapsed,
      score: this.localPlayer?.score ?? 0,
      highScores: this.highScores,
      players: this.players,
      mobs: this.mobs,
      bullets: this.bullets,
      drops: this.drops,
      message: this.message
    };
  }

  setRemotePlayers(remotePlayers: RemotePlayerLive[]) {
    const local = this.localPlayer;
    if (!local) return;
    const remotes = remotePlayers.slice(0, 6).map((remote) => this.remoteToPlayer(remote));
    this.players = [local, ...remotes];
  }

  drainFxEvents() {
    const events = this.fxEvents;
    this.fxEvents = [];
    return events;
  }

  private start(playerName: string, roomCode: string) {
    this.phase = "playing";
    this.elapsed = 0;
    this.spawnTimer = 1;
    this.pendingSpawns = 0;
    this.bullets = [];
    this.mobs = [];
    this.drops = [];
    this.message = roomCode === "SOLO" ? "ソロ出撃" : `部屋 ${roomCode} に出撃`;
    this.playerName = playerName || "Player";
    this.players = [this.createPlayer(this.playerName)];
    for (let i = 0; i < 3; i += 1) this.spawnMob();
  }

  private createPlayer(name: string): PlayerState {
    const blocks: Block[] = [];
    for (let gx = -1; gx <= 1; gx += 1) {
      for (let gy = -1; gy <= 1; gy += 1) {
        const isCore = gx === 0 && gy === 0;
        blocks.push(this.createBlock(gx, gy, "wood", isCore, isCore ? DEFAULT_WEAPON_ID : undefined));
      }
    }
    return {
      id: PLAYER_ID,
      name,
      teamId: PLAYER_ID,
      color: 0x4cc9f0,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      aim: { x: 1, y: 0 },
      blocks,
      alive: true,
      score: 0,
      kills: 0,
      shieldTimer: 0,
      fireHeld: false
    };
  }

  private remoteToPlayer(remote: RemotePlayerLive): PlayerState {
    return {
      id: remote.id,
      name: remote.name,
      teamId: remote.id,
      color: remote.color,
      x: remote.x,
      y: remote.y,
      vx: 0,
      vy: 0,
      aim: remote.aim,
      blocks: remote.blocks.map((block, index) => ({
        ...block,
        id: `${remote.id}-block-${index}`,
        cooldown: 999
      })),
      alive: remote.alive,
      score: remote.score,
      kills: 0,
      shieldTimer: 0,
      fireHeld: false
    };
  }

  private createBlock(gx: number, gy: number, material: MaterialId, isCore: boolean, weapon?: WeaponId): Block {
    const hp = MATERIALS[material].hp;
    return {
      id: this.nextId("block"),
      gx,
      gy,
      material,
      hp,
      maxHp: hp,
      isCore,
      weapon,
      cooldown: weapon && WEAPONS[weapon] ? Math.random() * WEAPONS[weapon].cooldown : 0
    };
  }

  private createMobBlock(gx: number, gy: number, material: MaterialId, isCore: boolean): Block {
    const hp = MATERIALS[material].hp;
    return {
      id: this.nextId("mob-block"),
      gx,
      gy,
      material,
      hp,
      maxHp: hp,
      isCore,
      weapon: isCore && Math.random() > 0.32 ? WEAPON_DROP_TABLE[Math.floor(Math.random() * WEAPON_DROP_TABLE.length)] : undefined,
      cooldown: 999
    };
  }

  private updatePlayers(dt: number) {
    for (const player of this.players) {
      if (!player.alive) continue;
      player.x = clamp(player.x + player.vx * dt, -HALF_BOARD + 90, HALF_BOARD - 90);
      player.y = clamp(player.y + player.vy * dt, -HALF_BOARD + 90, HALF_BOARD - 90);
      player.shieldTimer = Math.max(0, player.shieldTimer - dt);
      this.pushWithShield(player, dt);
    }
  }

  private updateWeapons(dt: number) {
    for (const player of this.players) {
      if (!player.alive) continue;
      for (const block of player.blocks) {
        if (!block.isCore || !block.weapon) continue;
        block.cooldown = Math.max(0, block.cooldown - dt);
        const weapon = WEAPONS[block.weapon] ?? WEAPONS[DEFAULT_WEAPON_ID];
        if (block.cooldown > 0) continue;
        if (weapon.manual && !this.manualPulse) continue;
        this.fireWeapon(player, block, block.weapon);
        block.cooldown = weapon.cooldown;
      }
    }
  }

  private fireWeapon(player: PlayerState, block: Block, weapon: WeaponId) {
    const spec = WEAPONS[weapon] ?? WEAPONS[DEFAULT_WEAPON_ID];
    const origin = this.blockWorld(player, block);
    const aim = normalize(player.aim);

    if (spec.pattern === "shield") {
      player.shieldTimer = 1.15;
      return;
    }
    if (spec.pattern === "heal") {
      this.healOneBlock(player);
      return;
    }
    if (spec.pattern === "reinforce") {
      this.reinforceOneBlock(player);
      return;
    }
    if (spec.pattern === "orbit") {
      this.spawnOrbit(player, origin, spec);
      return;
    }

    const fire = (direction: Vec2, overrides: Partial<FireOptions> = {}) =>
      this.spawnBullet(player, origin, direction, {
        weapon: spec.id,
        kind: spec.kind,
        speed: spec.speed,
        radius: spec.radius,
        ttl: spec.ttl,
        pierce: spec.pierce,
        knockback: spec.knockback,
        slow: spec.slow,
        damage: spec.damage,
        spriteFrame: spec.spriteFrame,
        color: spec.color,
        ...overrides
      });

    if (spec.pattern === "auto") {
      fire(this.directionToNearestMob(origin, aim));
      return;
    }
    if (spec.pattern === "rear") {
      fire({ x: -aim.x, y: -aim.y });
      return;
    }
    if (spec.pattern === "fixed") {
      fire(spec.fixedDir ?? aim);
      return;
    }
    if (spec.pattern === "spread") {
      const count = Math.max(2, spec.count);
      const center = (count - 1) * 0.5;
      for (let i = 0; i < count; i += 1) fire(rotate(aim, (i - center) * spec.spread));
      return;
    }
    if (spec.pattern === "ring") {
      const count = Math.max(4, spec.count);
      for (let i = 0; i < count; i += 1) fire(rotate({ x: 1, y: 0 }, (Math.PI * 2 * i) / count));
      return;
    }
    if (spec.pattern === "cross") {
      [{ x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 }].forEach((dir) => fire(dir));
      return;
    }
    if (spec.pattern === "split") {
      fire(aim);
      fire(rotate(aim, 0.48), { speed: spec.speed * 0.82, radius: Math.max(4, spec.radius - 1) });
      fire(rotate(aim, -0.48), { speed: spec.speed * 0.82, radius: Math.max(4, spec.radius - 1) });
      return;
    }
    if (spec.pattern === "mine") {
      fire(aim, { speed: 55, ttl: Math.max(spec.ttl, 1.2), radius: spec.radius + 2, kind: "bomb" });
      return;
    }

    fire(aim);
  }

  private spawnBullet(player: PlayerState, origin: Vec2, direction: Vec2, options: FireOptions) {
    const dir = normalize(direction, player.aim);
    const kind = options.kind ?? "round";
    const spec = options.weapon ? WEAPONS[options.weapon] : undefined;
    this.bullets.push({
      id: this.nextId("bullet"),
      ownerId: player.id,
      teamId: player.teamId,
      weapon: options.weapon,
      x: origin.x + dir.x * 26,
      y: origin.y + dir.y * 26,
      vx: dir.x * (options.speed ?? 390),
      vy: dir.y * (options.speed ?? 390),
      radius: options.radius ?? 7,
      damage: options.damage ?? 1,
      ttl: options.ttl ?? 1.55,
      kind,
      pierce: options.pierce ?? 0,
      knockback: options.knockback ?? 160,
      slow: options.slow ?? 0,
      spriteFrame: options.spriteFrame ?? spec?.spriteFrame ?? WEAPONS[DEFAULT_WEAPON_ID].spriteFrame,
      color: options.color ?? spec?.color ?? WEAPONS[DEFAULT_WEAPON_ID].color
    });
    this.fxEvents.push({ type: "shoot", kind });
  }

  private spawnOrbit(player: PlayerState, origin: Vec2, spec: WeaponSpec) {
    const count = Math.max(2, spec.count);
    for (let i = 0; i < count; i += 1) {
      const angle = i * (Math.PI * 2 / count) + this.elapsed * 3;
      this.bullets.push({
        id: this.nextId("bullet"),
        ownerId: player.id,
        teamId: player.teamId,
        weapon: spec.id,
        x: origin.x + Math.cos(angle) * 72,
        y: origin.y + Math.sin(angle) * 72,
        vx: -Math.sin(angle) * Math.max(90, spec.speed * 0.32),
        vy: Math.cos(angle) * Math.max(90, spec.speed * 0.32),
        radius: spec.radius,
        damage: spec.damage,
        ttl: spec.ttl,
        kind: spec.kind,
        pierce: spec.pierce,
        knockback: spec.knockback,
        slow: spec.slow,
        spriteFrame: spec.spriteFrame,
        color: spec.color
      });
    }
    this.fxEvents.push({ type: "shoot", kind: spec.kind });
  }

  private updateMobs(dt: number) {
    const player = this.localPlayer;
    if (!player) return;
    for (const mob of this.mobs) {
      const target = { x: player.x, y: player.y };
      const dir = this.mobMoveDirection(mob, target, dt);
      const slowMul = mob.slowTimer > 0 ? 0.48 : 1;
      mob.vx = dir.x * mob.speed * slowMul;
      mob.vy = dir.y * mob.speed * slowMul;
      mob.aim = dir;
      mob.x += mob.vx * dt;
      mob.y += mob.vy * dt;
      mob.slowTimer = Math.max(0, mob.slowTimer - dt);
      mob.contactTimer = Math.max(0, mob.contactTimer - dt);
      if (Math.abs(mob.x) > HALF_BOARD + 80 || Math.abs(mob.y) > HALF_BOARD + 80) {
        mob.hp = 0;
        player.score += 15 + mob.tier * 8;
        this.queueMobSpawn(mob.spawnValue);
      }
      this.damagePlayerOnContact(player, mob);
    }
    this.mobs = this.mobs.filter((mob) => mob.hp > 0);
  }

  private updateBullets(dt: number) {
    for (const bullet of this.bullets) {
      if (bullet.kind === "homing") {
        const target = this.nearestMob({ x: bullet.x, y: bullet.y });
        if (target) {
          const desired = normalize({ x: target.x - bullet.x, y: target.y - bullet.y });
          const speed = Math.hypot(bullet.vx, bullet.vy);
          bullet.vx = bullet.vx * 0.9 + desired.x * speed * 0.1;
          bullet.vy = bullet.vy * 0.9 + desired.y * speed * 0.1;
        }
      }
      bullet.x += bullet.vx * dt;
      bullet.y += bullet.vy * dt;
      bullet.ttl -= dt;
      if (bullet.kind === "bomb" && bullet.ttl <= 0.06) {
        bullet.radius = 72;
        bullet.damage = 1;
        bullet.knockback = 760;
      }
      this.collideBulletWithMobs(bullet);
      this.collideBulletWithBlocks(bullet);
    }
    this.bullets = this.bullets.filter(
      (bullet) => bullet.ttl > 0 && Math.abs(bullet.x) < HALF_BOARD + 260 && Math.abs(bullet.y) < HALF_BOARD + 260
    );
  }

  private collideBulletWithMobs(bullet: Bullet) {
    for (const mob of this.mobs) {
      for (const block of mob.blocks) {
        const pos = this.mobBlockWorld(mob, block);
        if (Math.abs(bullet.x - pos.x) > BLOCK_SIZE * 0.5 + bullet.radius) continue;
        if (Math.abs(bullet.y - pos.y) > BLOCK_SIZE * 0.5 + bullet.radius) continue;
        const hitBlock = { ...block };
        block.hp -= bullet.damage;
        const push = normalize({ x: bullet.vx, y: bullet.vy });
        mob.x += push.x * bullet.knockback * 0.04;
        mob.y += push.y * bullet.knockback * 0.04;
        mob.slowTimer = Math.max(mob.slowTimer, bullet.slow);
        this.removeDestroyedMobBlocks(mob);
        this.fxEvents.push({ type: "hit", kind: bullet.kind });
        if (!mob.blocks.some((candidate) => candidate.isCore)) this.killMob(mob, hitBlock);
        if (bullet.pierce > 0) bullet.pierce -= 1;
        else bullet.ttl = Math.min(bullet.ttl, 0);
        return;
      }
    }
  }

  private collideBulletWithBlocks(bullet: Bullet) {
    for (const player of this.players) {
      if (bullet.ownerId === player.id) continue;
      for (const block of player.blocks) {
        const pos = this.blockWorld(player, block);
        if (Math.abs(bullet.x - pos.x) > BLOCK_SIZE * 0.5 + bullet.radius) continue;
        if (Math.abs(bullet.y - pos.y) > BLOCK_SIZE * 0.5 + bullet.radius) continue;
        block.hp -= bullet.damage;
        bullet.ttl = 0;
        this.fxEvents.push({ type: "hit", kind: bullet.kind });
      }
      this.removeDestroyedBlocks(player);
    }
  }

  private damagePlayerOnContact(player: PlayerState, mob: Mob) {
    if (mob.contactTimer > 0) return;
    for (const block of player.blocks) {
      const pos = this.blockWorld(player, block);
      for (const mobBlock of mob.blocks) {
        const mobPos = this.mobBlockWorld(mob, mobBlock);
        if (Math.abs(pos.x - mobPos.x) > BLOCK_SIZE * 0.9) continue;
        if (Math.abs(pos.y - mobPos.y) > BLOCK_SIZE * 0.9) continue;
        block.hp -= 1;
        const push = normalize({ x: mobPos.x - pos.x, y: mobPos.y - pos.y });
        mob.x += push.x * 28;
        mob.y += push.y * 28;
        mob.contactTimer = 0.55;
        this.removeDestroyedBlocks(player);
        return;
      }
    }
  }

  private pushWithShield(player: PlayerState, dt: number) {
    if (player.shieldTimer <= 0) return;
    const shield = { x: player.x + player.aim.x * 74, y: player.y + player.aim.y * 74 };
    for (const mob of this.mobs) {
      if (!mob.blocks.some((block) => distSq(this.mobBlockWorld(mob, block), shield) < (BLOCK_SIZE + 52) ** 2)) continue;
      mob.x += player.aim.x * 1040 * dt;
      mob.y += player.aim.y * 1040 * dt;
    }
  }

  private killMob(mob: Mob, sourceBlock?: Block) {
    const player = this.localPlayer;
    if (player) {
      player.score += 25 + mob.tier * 18;
      player.kills += 1;
    }
    if (Math.random() < 0.5) this.dropFromMob(mob, sourceBlock);
    this.queueMobSpawn(mob.spawnValue);
    this.fxEvents.push({ type: "break" });
  }

  private dropFromMob(mob: Mob, sourceBlock?: Block) {
    const source = sourceBlock ?? mob.blocks[Math.floor(Math.random() * mob.blocks.length)];
    const material = source?.material ?? MATERIAL_ORDER[clamp(Math.floor((mob.tier - 1) / 2), 0, MATERIAL_ORDER.length - 1)];
    const isCore = !!source?.isCore || Math.random() < Math.min(0.1 + mob.tier * 0.012, 0.22);
    const weapon = isCore
      ? (source?.weapon ?? (Math.random() < 0.28 ? undefined : WEAPON_DROP_TABLE[Math.floor(Math.random() * WEAPON_DROP_TABLE.length)]))
      : undefined;
    const hp = MATERIALS[material].hp;
    this.drops.push({
      id: this.nextId("drop"),
      x: mob.x,
      y: mob.y,
      material,
      isCore,
      weapon,
      hp,
      maxHp: hp,
      bob: Math.random() * Math.PI * 2
    });
    this.fxEvents.push({ type: "drop" });
  }

  private collectDrops() {
    const player = this.localPlayer;
    if (!player) return;
    const kept: Drop[] = [];
    for (const drop of this.drops) {
      if (distSq(player, drop) > 95 ** 2) {
        drop.bob += 0.08;
        kept.push(drop);
        continue;
      }
      this.attachDrop(player, drop);
      this.fxEvents.push({ type: "collect", core: drop.isCore });
      player.score += drop.isCore ? 90 : 35;
    }
    this.drops = kept;
  }

  private attachDrop(player: PlayerState, drop: Drop) {
    const occupied = new Set(player.blocks.map((block) => cellKey(block.gx, block.gy)));
    const candidates = new Map<string, { gx: number; gy: number }>();
    for (const block of player.blocks) {
      [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1]
      ].forEach(([dx, dy]) => {
        const gx = block.gx + dx;
        const gy = block.gy + dy;
        const key = cellKey(gx, gy);
        if (!occupied.has(key)) candidates.set(key, { gx, gy });
      });
    }
    let best = candidates.values().next().value as { gx: number; gy: number } | undefined;
    let bestScore = Number.POSITIVE_INFINITY;
    for (const candidate of candidates.values()) {
      const world = { x: player.x + candidate.gx * BLOCK_SIZE, y: player.y + candidate.gy * BLOCK_SIZE };
      const collisionScore = Math.hypot(world.x - drop.x, world.y - drop.y);
      const centerScore = Math.hypot(candidate.gx, candidate.gy) * 0.18;
      const score = collisionScore + centerScore;
      if (score < bestScore) {
        best = candidate;
        bestScore = score;
      }
    }
    if (!best) return;
    const block = this.createBlock(best.gx, best.gy, drop.material, drop.isCore, drop.weapon);
    block.hp = drop.hp;
    block.maxHp = drop.maxHp;
    player.blocks.push(block);
  }

  private removeDestroyedBlocks(player: PlayerState) {
    player.blocks = this.keepBlocksConnectedToCores(player.blocks.filter((block) => block.hp > 0));
  }

  private removeDestroyedMobBlocks(mob: Mob) {
    mob.blocks = this.keepBlocksConnectedToCores(mob.blocks.filter((block) => block.hp > 0));
    this.refreshMobHp(mob);
  }

  private checkGameOver() {
    const player = this.localPlayer;
    if (!player || !player.alive) return;
    if (player.blocks.some((block) => block.isCore)) return;
    player.alive = false;
    this.phase = "gameover";
    const wave = Math.max(1, Math.floor(this.elapsed / 22) + 1);
    this.highScores = saveHighScore({
      name: this.playerName,
      score: player.score,
      wave,
      date: new Date().toLocaleDateString("ja-JP")
    });
    this.fxEvents.push({ type: "gameover" });
    this.message = "全コアブロック破壊";
  }

  private spawnMobs(dt: number) {
    if (this.pendingSpawns <= 0) return;
    this.spawnTimer -= dt;
    if (this.spawnTimer > 0) return;
    this.spawnMob();
    this.pendingSpawns -= 1;
    this.spawnTimer = clamp(1.25 - Math.min(0.55, this.elapsed / 220), 0.7, 1.25);
  }

  private spawnMob() {
    const angle = Math.random() * Math.PI * 2;
    const distance = HALF_BOARD - 120;
    const playerKills = this.localPlayer?.kills ?? 0;
    const tier = clamp(1 + Math.floor(playerKills / 4) + Math.floor(this.elapsed / 55) + Math.floor(Math.random() * 2), 1, 12);
    const material = MATERIAL_ORDER[clamp(Math.floor((tier - 1) / 2), 0, MATERIAL_ORDER.length - 1)];
    const blocks = this.createMobBlocks(tier, material);
    const hp = blocks.reduce((sum, block) => sum + block.hp, 0);
    this.mobs.push({
      id: this.nextId("mob"),
      x: Math.cos(angle) * distance,
      y: Math.sin(angle) * distance,
      vx: 0,
      vy: 0,
      hp,
      maxHp: hp,
      tier,
      speed: 62 + tier * 7,
      aim: { x: -Math.cos(angle), y: -Math.sin(angle) },
      color: tier < 4 ? 0xff5d73 : tier < 8 ? 0xff9f1c : 0xe63946,
      blocks,
      moveMode: this.pickMobMoveMode(tier),
      phase: Math.random() * Math.PI * 2,
      dashTimer: 0,
      dashCooldown: 0.8 + Math.random() * 2.4,
      spawnValue: 1 + (tier >= 6 && Math.random() < 0.18 ? 1 : 0),
      slowTimer: 0,
      contactTimer: 0
    });
  }

  private queueMobSpawn(count: number) {
    this.pendingSpawns += clamp(Math.floor(count), 1, 3);
    this.spawnTimer = Math.min(this.spawnTimer, 0.85 + Math.random() * 0.6);
  }

  private pickMobMoveMode(tier: number): Mob["moveMode"] {
    const options: Mob["moveMode"][] = tier < 3 ? ["chase", "strafe"] : ["chase", "strafe", "orbit", "dash", "flank", "guarded"];
    return options[Math.floor(Math.random() * options.length)];
  }

  private mobMoveDirection(mob: Mob, target: Vec2, dt: number) {
    const toPlayer = { x: target.x - mob.x, y: target.y - mob.y };
    const direct = normalize(toPlayer);
    const distance = Math.hypot(toPlayer.x, toPlayer.y);
    const side = { x: -direct.y, y: direct.x };
    const wave = Math.sin(this.elapsed * 1.6 + mob.phase);

    if (mob.moveMode === "strafe") {
      return normalize({ x: direct.x * 0.78 + side.x * wave * 0.62, y: direct.y * 0.78 + side.y * wave * 0.62 }, direct);
    }
    if (mob.moveMode === "orbit") {
      const inward = distance > 260 ? 0.78 : distance < 145 ? -0.35 : 0.1;
      return normalize({ x: direct.x * inward + side.x * 0.95, y: direct.y * inward + side.y * 0.95 }, direct);
    }
    if (mob.moveMode === "flank") {
      const flankSide = Math.sin(mob.phase) > 0 ? 1 : -1;
      const flank = distance > 210 ? 0.72 : 1.1;
      return normalize({ x: direct.x * 0.55 + side.x * flank * flankSide, y: direct.y * 0.55 + side.y * flank * flankSide }, direct);
    }
    if (mob.moveMode === "guarded") {
      const retreat = distance < 115 ? -0.5 : 0.62;
      return normalize({ x: direct.x * retreat + side.x * wave * 0.28, y: direct.y * retreat + side.y * wave * 0.28 }, direct);
    }
    if (mob.moveMode === "dash") {
      mob.dashCooldown -= dt;
      mob.dashTimer = Math.max(0, mob.dashTimer - dt);
      if (mob.dashCooldown <= 0) {
        mob.dashTimer = 0.34;
        mob.dashCooldown = 1.9 + Math.random() * 2.4;
      }
      const dashBoost = mob.dashTimer > 0 ? 2.55 : 0.24;
      return normalize({ x: direct.x * dashBoost + side.x * wave * 0.2, y: direct.y * dashBoost + side.y * wave * 0.2 }, direct);
    }
    return direct;
  }

  private createMobBlocks(tier: number, material: MaterialId) {
    const cells = new Map<string, { gx: number; gy: number; isCore: boolean }>();
    const add = (gx: number, gy: number, isCore = false) => cells.set(cellKey(gx, gy), { gx, gy, isCore });
    add(0, 0, true);
    if (tier >= 2) add(1, 0);
    if (tier >= 3) add(-1, 0);
    if (tier >= 4) add(0, 1);
    if (tier >= 5) add(0, -1);
    if (tier >= 6) add(1, 1);
    if (tier >= 7) add(-1, 1);
    if (tier >= 8) add(1, -1);
    if (tier >= 9) add(-1, -1);
    if (tier >= 10) add(2, 0);
    if (tier >= 11) add(-2, 0);
    if (tier >= 12) add(0, 2, true);
    return [...cells.values()].map((cell) => this.createMobBlock(cell.gx, cell.gy, material, cell.isCore));
  }

  private blockWorld(player: PlayerState, block: Block): Vec2 {
    return { x: player.x + block.gx * BLOCK_SIZE, y: player.y + block.gy * BLOCK_SIZE };
  }

  private mobBlockWorld(mob: Mob, block: Block): Vec2 {
    return { x: mob.x + block.gx * BLOCK_SIZE, y: mob.y + block.gy * BLOCK_SIZE };
  }

  private speedFor(player: PlayerState) {
    return clamp(245 - Math.max(0, player.blocks.length - 9) * 2.4, 116, 245);
  }

  private nearestMob(pos: Vec2) {
    let best: Mob | undefined;
    let bestDist = Number.POSITIVE_INFINITY;
    for (const mob of this.mobs) {
      const score = distSq(pos, mob);
      if (score < bestDist) {
        best = mob;
        bestDist = score;
      }
    }
    return best;
  }

  private directionToNearestMob(pos: Vec2, fallback: Vec2) {
    const mob = this.nearestMob(pos);
    return mob ? normalize({ x: mob.x - pos.x, y: mob.y - pos.y }, fallback) : fallback;
  }

  private healOneBlock(player: PlayerState) {
    const target = player.blocks.find((block) => block.hp < block.maxHp);
    if (target) target.hp += 1;
  }

  private reinforceOneBlock(player: PlayerState) {
    const target = [...player.blocks].sort((a, b) => a.maxHp - b.maxHp)[0];
    if (!target) return;
    const nextIndex = clamp(MATERIAL_ORDER.indexOf(target.material) + 1, 0, MATERIAL_ORDER.length - 1);
    target.material = MATERIAL_ORDER[nextIndex];
    target.maxHp = MATERIALS[target.material].hp;
    target.hp = target.maxHp;
  }

  private keepBlocksConnectedToCores(blocks: Block[]) {
    const byKey = new Map(blocks.map((block) => [cellKey(block.gx, block.gy), block]));
    const queue = blocks.filter((block) => block.isCore);
    const keep = new Set(queue.map((block) => block.id));
    for (let index = 0; index < queue.length; index += 1) {
      const block = queue[index];
      [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1]
      ].forEach(([dx, dy]) => {
        const next = byKey.get(cellKey(block.gx + dx, block.gy + dy));
        if (!next || keep.has(next.id)) return;
        keep.add(next.id);
        queue.push(next);
      });
    }
    return blocks.filter((block) => block.isCore || keep.has(block.id));
  }

  private refreshMobHp(mob: Mob) {
    mob.hp = mob.blocks.reduce((sum, block) => sum + Math.max(0, block.hp), 0);
    mob.maxHp = Math.max(mob.maxHp, mob.blocks.reduce((sum, block) => sum + block.maxHp, 0));
  }

  private nextId(prefix: string) {
    this.idSeq += 1;
    return `${prefix}-${this.idSeq}`;
  }
}
