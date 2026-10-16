/**
 * WebRTC (PeerJS) を活用した最大6人オンライン協力プレイ同期マネージャー
 * ホストまたはゲストとして接続し、自機の6部位構成・座標・HP・射撃アクションをリアルタイム同期します。
 */

import { Peer } from 'peerjs';

export class CoopNetworkManager {
  constructor(onPeerUpdate, onRemoteShoot, onWaveSync) {
    this.peer = null;
    this.connections = new Map(); // peerId -> DataConnection
    this.remotePlayers = new Map(); // peerId -> playerState
    this.isHost = true;
    this.roomId = null;
    this.myId = 'local-' + Math.random().toString(36).substring(2, 7).toUpperCase();
    this.onPeerUpdate = onPeerUpdate;
    this.onRemoteShoot = onRemoteShoot;
    this.onWaveSync = onWaveSync;
  }

  /**
   * 部屋を作成する（最大6人までのホストになる）
   */
  createRoom(statusCallback) {
    const code = 'ARK-' + Math.random().toString(36).substring(2, 6).toUpperCase();
    this.isHost = true;
    statusCallback(`ルーム作成中 (${code})...`);

    this.peer = new Peer(code);
    this.peer.on('open', (id) => {
      this.roomId = id;
      this.myId = id;
      statusCallback(`ホスト待機中！ルームID: [${id}] (最大6人まで参加可能)`);
      const hudRoom = document.getElementById('hud-room-code');
      if (hudRoom) hudRoom.textContent = `ROOM: ${id}`;
    });

    this.peer.on('connection', (conn) => {
      if (this.connections.size >= 5) {
        // ホスト含め最大6人
        conn.on('open', () => conn.send({ type: 'full' }));
        return;
      }
      this._setupConnection(conn);
    });

    this.peer.on('error', (err) => {
      statusCallback(`通信通知: ${err.type} (ローカル/AI共闘モードで継続可能)`);
    });
  }

  /**
   * 既存の部屋に参加する
   */
  joinRoom(targetRoomId, statusCallback) {
    if (!targetRoomId) return;
    const cleanId = targetRoomId.trim().toUpperCase();
    this.isHost = false;
    statusCallback(`ルーム [${cleanId}] に接続中...`);

    this.peer = new Peer();
    this.peer.on('open', (id) => {
      this.myId = id;
      const conn = this.peer.connect(cleanId);
      this._setupConnection(conn, statusCallback);
      const hudRoom = document.getElementById('hud-room-code');
      if (hudRoom) hudRoom.textContent = `JOINED: ${cleanId}`;
    });

    this.peer.on('error', (err) => {
      statusCallback(`接続エラー: ${err.type}`);
    });
  }

  _setupConnection(conn, statusCallback) {
    conn.on('open', () => {
      this.connections.set(conn.peer, conn);
      if (statusCallback) {
        statusCallback(`接続成功！ [${conn.peer}] とオンライン共闘リンク確立`);
      }
    });

    conn.on('data', (data) => {
      if (!data || !data.type) return;
      if (data.type === 'state') {
        this.remotePlayers.set(data.id, data.payload);
        if (this.onPeerUpdate) this.onPeerUpdate(data.id, data.payload);
        // ホストの場合は他のゲストにもリレー配信（最大6人のメッシュ同期）
        if (this.isHost) {
          for (const [pid, c] of this.connections.entries()) {
            if (pid !== conn.peer && c.open) {
              c.send(data);
            }
          }
        }
      } else if (data.type === 'shoot') {
        if (this.onRemoteShoot) this.onRemoteShoot(data.payload);
        if (this.isHost) {
          for (const [pid, c] of this.connections.entries()) {
            if (pid !== conn.peer && c.open) c.send(data);
          }
        }
      } else if (data.type === 'wave' && !this.isHost) {
        if (this.onWaveSync) this.onWaveSync(data.payload);
      }
    });

    conn.on('close', () => {
      this.connections.delete(conn.peer);
      this.remotePlayers.delete(conn.peer);
      if (this.onPeerUpdate) this.onPeerUpdate(conn.peer, null);
    });
  }

  broadcastState(payload) {
    const msg = { type: 'state', id: this.myId, payload };
    for (const conn of this.connections.values()) {
      if (conn.open) conn.send(msg);
    }
  }

  broadcastShoot(shotInfo) {
    const msg = { type: 'shoot', id: this.myId, payload: shotInfo };
    for (const conn of this.connections.values()) {
      if (conn.open) conn.send(msg);
    }
  }

  broadcastWave(waveInfo) {
    if (!this.isHost) return;
    const msg = { type: 'wave', payload: waveInfo };
    for (const conn of this.connections.values()) {
      if (conn.open) conn.send(msg);
    }
  }
}
