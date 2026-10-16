import Phaser from "phaser";
import {
  BLOCK_SIZE,
  BOARD_SIZE,
  MATERIALS,
  SPRITE_FRAME_SIZE,
  WEAPONS,
  blockFrame,
  bulletFrameForWeapon
} from "../catalog";
import { GameAudio } from "../audio";
import type { SharedInput } from "../input";
import { clamp } from "../math";
import type { Block, Bullet, Drop, Mob, PlayerState } from "../types";
import type { CoreBlockArenaSim } from "../simulation";

const SPRITE_KEY = "game-sprites";

export class GameplayScene extends Phaser.Scene {
  private boardGraphics!: Phaser.GameObjects.Graphics;
  private overlayGraphics!: Phaser.GameObjects.Graphics;
  private lastPhase = "";
  private audio = new GameAudio();
  private dropLabels = new Map<string, Phaser.GameObjects.Text>();
  private sprites = new Map<string, Phaser.GameObjects.Image>();
  private activeSprites = new Set<string>();

  constructor(
    private sim: CoreBlockArenaSim,
    private inputState: SharedInput
  ) {
    super("GameplayScene");
  }

  preload() {
    this.load.spritesheet(SPRITE_KEY, "assets/game-sprites.png", {
      frameWidth: SPRITE_FRAME_SIZE,
      frameHeight: SPRITE_FRAME_SIZE
    });
  }

  create() {
    this.cameras.main.setBackgroundColor(0x101724);
    this.boardGraphics = this.add.graphics().setDepth(-20);
    this.overlayGraphics = this.add.graphics().setDepth(30);
    this.input?.on("pointerdown", () => {
      this.audio.unlock();
      this.inputState.setFire(true);
    });
    this.input?.on("pointerup", () => this.inputState.setFire(false));
    this.input?.on("pointerout", () => this.inputState.setFire(false));
    window.addEventListener("pointerdown", () => this.audio.unlock());
    window.addEventListener("keydown", () => this.audio.unlock(), { once: true });
  }

  update(_: number, deltaMs: number) {
    this.inputState.update();
    const player = this.sim.localPlayer;
    if (player) {
      this.sim.command({ type: "move", playerId: player.id, move: this.inputState.state.move, fire: this.inputState.state.fire });
    }
    this.sim.update(Math.min(deltaMs / 1000, 0.05));
    for (const event of this.sim.drainFxEvents()) this.audio.play(event);
    this.renderWorld();
    this.followCamera();
    this.events.emit("snapshot", this.sim.snapshot());
    if (this.lastPhase !== this.sim.phase) {
      this.lastPhase = this.sim.phase;
      this.events.emit("phase", this.sim.phase);
    }
  }

  private renderWorld() {
    this.boardGraphics.clear();
    this.overlayGraphics.clear();
    this.activeSprites.clear();
    this.syncDropLabels();
    this.drawBoard(this.boardGraphics);

    for (const drop of this.sim.drops) this.syncDropSprite(drop);
    for (const bullet of this.sim.bullets) this.syncBulletSprite(bullet);
    for (const mob of this.sim.mobs) this.syncMobSprites(mob);
    for (const player of this.sim.players) this.syncPlayerSprites(player);

    this.drawOverlays(this.overlayGraphics);
    this.pruneSprites();
  }

  private drawBoard(g: Phaser.GameObjects.Graphics) {
    const h = BOARD_SIZE / 2;
    g.fillStyle(0x182437, 1);
    g.fillRect(-h, -h, BOARD_SIZE, BOARD_SIZE);
    g.lineStyle(2, 0x26364f, 0.9);
    g.strokeRect(-h, -h, BOARD_SIZE, BOARD_SIZE);
    g.lineStyle(1, 0x26364f, 0.22);
    for (let x = -h; x <= h; x += 120) g.lineBetween(x, -h, x, h);
    for (let y = -h; y <= h; y += 120) g.lineBetween(-h, y, h, y);
  }

  private syncPlayerSprites(player: PlayerState) {
    if (!player.alive) return;
    for (const block of player.blocks) {
      this.syncBlockSprite(`player:${player.id}:${block.id}`, player.x + block.gx * BLOCK_SIZE, player.y + block.gy * BLOCK_SIZE, block, 6);
    }
  }

  private syncMobSprites(mob: Mob) {
    for (const block of mob.blocks) {
      this.syncBlockSprite(`mob:${mob.id}:${block.id}`, mob.x + block.gx * BLOCK_SIZE, mob.y + block.gy * BLOCK_SIZE, block, 5);
    }
  }

  private syncBlockSprite(key: string, x: number, y: number, block: Block, depth: number) {
    this.syncSprite(key, x, y, blockFrame(block.material, block.isCore), BLOCK_SIZE, 0, 1, depth);
  }

  private syncBulletSprite(bullet: Bullet) {
    const angle = Math.atan2(bullet.vy, bullet.vx);
    const size = Math.max(18, bullet.radius * 3.2);
    this.syncSprite(`bullet:${bullet.id}`, bullet.x, bullet.y, bullet.spriteFrame ?? bulletFrameForWeapon(bullet.weapon), size, angle, 1, 12);
  }

  private syncDropSprite(drop: Drop) {
    const bob = Math.sin(drop.bob) * 4;
    const y = drop.y + bob;
    const color = drop.isCore && drop.weapon && WEAPONS[drop.weapon] ? WEAPONS[drop.weapon].color : MATERIALS[drop.material].light;
    const key = `drop:${drop.id}`;
    const sprite = this.syncSprite(key, drop.x, y, blockFrame(drop.material, drop.isCore), 24, 0, 0.95, 9);
    sprite.setTint(color);
  }

  private syncSprite(
    key: string,
    x: number,
    y: number,
    frame: number,
    size: number,
    rotation: number,
    alpha: number,
    depth: number
  ) {
    let sprite = this.sprites.get(key);
    if (!sprite) {
      sprite = this.add.image(x, y, SPRITE_KEY, frame).setOrigin(0.5);
      this.sprites.set(key, sprite);
    }
    sprite.setFrame(frame);
    sprite.setPosition(x, y);
    sprite.setDisplaySize(size, size);
    sprite.setRotation(rotation);
    sprite.setAlpha(alpha);
    sprite.setDepth(depth);
    sprite.clearTint();
    this.activeSprites.add(key);
    return sprite;
  }

  private pruneSprites() {
    for (const [key, sprite] of this.sprites) {
      if (this.activeSprites.has(key)) continue;
      sprite.destroy();
      this.sprites.delete(key);
    }
  }

  private drawOverlays(g: Phaser.GameObjects.Graphics) {
    for (const drop of this.sim.drops) this.drawDropOverlay(g, drop);
    for (const mob of this.sim.mobs) this.drawMobOverlay(g, mob);
    for (const player of this.sim.players) this.drawPlayerOverlay(g, player);
  }

  private drawPlayerOverlay(g: Phaser.GameObjects.Graphics, player: PlayerState) {
    if (!player.alive) return;
    for (const block of player.blocks) {
      this.drawBlockOverlay(g, player.x + block.gx * BLOCK_SIZE, player.y + block.gy * BLOCK_SIZE, block, player.color, false);
    }
    const nose = { x: player.x + player.aim.x * 70, y: player.y + player.aim.y * 70 };
    g.lineStyle(3, player.color, 0.5);
    g.lineBetween(player.x, player.y, nose.x, nose.y);
    if (player.shieldTimer > 0) {
      g.lineStyle(10, 0x90e0ef, 0.65);
      g.beginPath();
      g.arc(nose.x, nose.y, 54, Math.atan2(player.aim.y, player.aim.x) - 0.9, Math.atan2(player.aim.y, player.aim.x) + 0.9);
      g.strokePath();
    }
  }

  private drawMobOverlay(g: Phaser.GameObjects.Graphics, mob: Mob) {
    for (const block of mob.blocks) {
      this.drawBlockOverlay(g, mob.x + block.gx * BLOCK_SIZE, mob.y + block.gy * BLOCK_SIZE, block, mob.color, true);
    }
    const bounds = this.mobBounds(mob);
    if (!bounds) return;
    const t = mob.maxHp > 0 ? mob.hp / mob.maxHp : 0;
    g.fillStyle(0x111111, 0.55);
    g.fillRect(bounds.x, bounds.y - 10, bounds.width, 4);
    g.fillStyle(0x80ed99, 0.95);
    g.fillRect(bounds.x, bounds.y - 10, bounds.width * t, 4);
  }

  private drawBlockOverlay(g: Phaser.GameObjects.Graphics, x: number, y: number, block: Block, teamColor: number, enemy: boolean) {
    const half = BLOCK_SIZE * 0.5 - 1;
    if (enemy) {
      g.lineStyle(2, teamColor, 0.9);
      g.strokeRect(x - half + 2, y - half + 2, half * 2 - 4, half * 2 - 4);
    }
    if (block.isCore) {
      const coreColor = enemy ? teamColor : block.weapon && WEAPONS[block.weapon] ? WEAPONS[block.weapon].color : 0xffd166;
      g.lineStyle(2, coreColor, 0.95);
      g.strokeRect(x - half + 7, y - half + 7, half * 2 - 14, half * 2 - 14);
      g.fillStyle(coreColor, 0.95);
      g.fillRect(x - 4, y - 4, 8, 8);
    }
    const crack = 1 - block.hp / block.maxHp;
    if (crack <= 0.01) return;
    g.lineStyle(2, 0x121212, clamp(0.35 + crack * 0.5, 0.35, 0.9));
    g.lineBetween(x - 10, y - 8, x - 2, y - 8);
    g.lineBetween(x - 2, y - 8, x - 2, y + 2);
    if (crack > 0.35) {
      g.lineBetween(x + 8, y - 4, x + 8, y + 8);
      g.lineBetween(x + 1, y + 8, x + 8, y + 8);
    }
    if (crack > 0.6) {
      g.lineBetween(x - 11, y + 6, x - 4, y + 6);
      g.lineBetween(x - 4, y + 6, x - 4, y + 12);
    }
  }

  private drawDropOverlay(g: Phaser.GameObjects.Graphics, drop: Drop) {
    const bob = Math.sin(drop.bob) * 4;
    const y = drop.y + bob;
    const color = drop.isCore && drop.weapon && WEAPONS[drop.weapon] ? WEAPONS[drop.weapon].color : MATERIALS[drop.material].light;
    g.fillStyle(color, 0.16);
    g.fillRect(drop.x - 23, y - 23, 46, 46);
    g.lineStyle(2, color, 0.72);
    g.strokeRect(drop.x - 18, y - 18, 36, 36);
    g.fillStyle(MATERIALS[drop.material].light, 0.9);
    for (let i = 0; i < drop.maxHp; i += 1) g.fillRect(drop.x - 11 + i * 3, y + 17, 2, 2);
  }

  private mobBounds(mob: Mob) {
    if (!mob.blocks.length) return undefined;
    const xs = mob.blocks.map((block) => mob.x + block.gx * BLOCK_SIZE);
    const ys = mob.blocks.map((block) => mob.y + block.gy * BLOCK_SIZE);
    const minX = Math.min(...xs) - BLOCK_SIZE * 0.5;
    const maxX = Math.max(...xs) + BLOCK_SIZE * 0.5;
    const minY = Math.min(...ys) - BLOCK_SIZE * 0.5;
    const maxY = Math.max(...ys) + BLOCK_SIZE * 0.5;
    return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
  }

  private syncDropLabels() {
    const live = new Set(this.sim.drops.map((drop) => drop.id));
    for (const [id, label] of this.dropLabels) {
      if (!live.has(id)) {
        label.destroy();
        this.dropLabels.delete(id);
      }
    }
    for (const drop of this.sim.drops) {
      const weapon = drop.weapon && WEAPONS[drop.weapon] ? WEAPONS[drop.weapon] : undefined;
      const text = drop.isCore ? `${weapon ? weapon.short : "Mv"} ${MATERIALS[drop.material].short}${drop.maxHp}` : `${MATERIALS[drop.material].short} HP${drop.maxHp}`;
      let label = this.dropLabels.get(drop.id);
      if (!label) {
        label = this.add
          .text(drop.x, drop.y - 34, text, {
            fontFamily: '"Yu Gothic UI", Meiryo, sans-serif',
            fontSize: "12px",
            color: "#ffffff",
            backgroundColor: "rgba(5, 8, 14, 0.72)",
            padding: { x: 4, y: 2 }
          })
          .setOrigin(0.5, 1)
          .setDepth(40);
        this.dropLabels.set(drop.id, label);
      }
      label.setText(text);
      label.setPosition(drop.x, drop.y - 28 + Math.sin(drop.bob) * 4);
    }
  }

  private followCamera() {
    const player = this.sim.localPlayer;
    if (!player) return;
    const maxCell = player.blocks.reduce((max, block) => Math.max(max, Math.abs(block.gx), Math.abs(block.gy)), 1);
    const blockZoom = 0.58 - Math.max(0, player.blocks.length - 9) * 0.014;
    const spreadZoom = 0.58 - Math.max(0, maxCell - 1) * 0.075;
    const targetZoom = clamp(Math.min(blockZoom, spreadZoom), 0.14, 0.58);
    const camera = this.cameras.main;
    camera.centerOn(player.x, player.y);
    camera.setZoom(camera.zoom + (targetZoom - camera.zoom) * 0.05);
  }
}
