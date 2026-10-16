import { MAX_PLAYERS } from "../game/catalog";
import type { GameSnapshot, PlayerState, RemotePlayerLive, RoomSettings } from "../game/types";

export type OnlineStatus = {
  enabled: boolean;
  message: string;
  roomCode?: string;
  playerSlot?: number;
};

export class FirebaseRoomClient {
  status: OnlineStatus = { enabled: false, message: "Firebase未設定: ソロは利用できます" };
  private databaseUrl = "";
  private roomPath = "";
  private playerId = crypto.randomUUID();

  async configure() {
    const config = await this.loadConfig();
    if (!config?.databaseURL) {
      this.status = { enabled: false, message: "Firebase未設定: firebase-config.jsonを置くとオンライン有効" };
      return this.status;
    }
    this.databaseUrl = config.databaseURL.replace(/\/$/, "");
    this.status = { enabled: true, message: "Firebase接続準備完了" };
    return this.status;
  }

  async createRoom(settings: RoomSettings, playerName: string) {
    if (!this.databaseUrl) await this.configure();
    if (!this.databaseUrl) return this.status;
    this.roomPath = `rooms/${settings.roomCode}`;
    const now = Date.now();
    await this.write(this.roomPath, {
      settings: { ...settings, maxPlayers: MAX_PLAYERS },
      hostId: this.playerId,
      createdAt: now,
      updatedAt: now,
      players: {
        [this.playerId]: {
          name: playerName,
          slot: 1,
          joinedAt: now,
          alive: true
        }
      }
    });
    this.status = { enabled: true, message: `部屋 ${settings.roomCode} 作成済み`, roomCode: settings.roomCode, playerSlot: 1 };
    return this.status;
  }

  async joinRoom(roomCode: string, playerName: string) {
    if (!this.databaseUrl) await this.configure();
    if (!this.databaseUrl) return this.status;
    this.roomPath = `rooms/${roomCode}`;
    const room = (await this.read(this.roomPath)) as { players?: Record<string, unknown> } | null;
    if (!room) {
      this.status = { enabled: true, message: `部屋 ${roomCode} が見つかりません` };
      return this.status;
    }
    const used = Object.keys(room.players ?? {}).length;
    if (used >= MAX_PLAYERS) {
      this.status = { enabled: true, message: "満員です" };
      return this.status;
    }
    await this.patch(`${this.roomPath}/players/${this.playerId}`, {
      name: playerName,
      slot: used + 1,
      joinedAt: Date.now(),
      alive: true
    });
    this.status = { enabled: true, message: `部屋 ${roomCode} 参加済み`, roomCode, playerSlot: used + 1 };
    return this.status;
  }

  async syncSnapshot(snapshot: GameSnapshot): Promise<RemotePlayerLive[]> {
    if (!this.databaseUrl || !this.roomPath) return [];
    const local = snapshot.players[0];
    if (local) {
      await this.patch(`${this.roomPath}/players/${this.playerId}/live`, this.toLive(local));
    }
    const summary = {
      phase: snapshot.phase,
      elapsed: snapshot.elapsed,
      score: snapshot.score,
      players: snapshot.players.map((p) => ({
        id: p.id,
        name: p.name,
        x: Math.round(p.x),
        y: Math.round(p.y),
        blocks: p.blocks.length,
        cores: p.blocks.filter((b) => b.isCore).length,
        alive: p.alive
      })),
      mobs: snapshot.mobs.length,
      drops: snapshot.drops.length,
      updatedAt: Date.now()
    };
    if (this.status.playerSlot === 1) void this.patch(`${this.roomPath}/state`, summary);
    const players = (await this.read(`${this.roomPath}/players`)) as Record<string, { live?: RemotePlayerLive }> | null;
    return Object.entries(players ?? {})
      .filter(([id, value]) => id !== this.playerId && !!value.live)
      .map(([, value]) => value.live as RemotePlayerLive);
  }

  private async loadConfig(): Promise<Record<string, string> | null> {
    if (window.__FIREBASE_CONFIG__) return window.__FIREBASE_CONFIG__;
    try {
      const response = await fetch("firebase-config.json", { cache: "no-store" });
      if (!response.ok) return null;
      return (await response.json()) as Record<string, string>;
    } catch {
      return null;
    }
  }

  private toLive(player: PlayerState): RemotePlayerLive {
    return {
      id: this.playerId,
      name: player.name,
      slot: this.status.playerSlot ?? 1,
      x: Math.round(player.x),
      y: Math.round(player.y),
      aim: player.aim,
      color: player.color,
      alive: player.alive,
      score: player.score,
      blocks: player.blocks.map((block) => ({
        gx: block.gx,
        gy: block.gy,
        material: block.material,
        hp: block.hp,
        maxHp: block.maxHp,
        isCore: block.isCore,
        weapon: block.weapon
      }))
    };
  }

  private async read(path: string) {
    const response = await fetch(`${this.databaseUrl}/${path}.json`, { cache: "no-store" });
    if (!response.ok) throw new Error(`Firebase read failed: ${response.status}`);
    return response.json();
  }

  private async write(path: string, body: unknown) {
    const response = await fetch(`${this.databaseUrl}/${path}.json`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    if (!response.ok) throw new Error(`Firebase write failed: ${response.status}`);
  }

  private async patch(path: string, body: unknown) {
    const response = await fetch(`${this.databaseUrl}/${path}.json`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    if (!response.ok) throw new Error(`Firebase patch failed: ${response.status}`);
  }
}
