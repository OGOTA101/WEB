/**
 * オンライン対戦通信マネージャー (最大6人対応)
 * PeerJS (WebRTC P2P) と BroadcastChannel (同一ブラウザ別タブ間高速通信) の
 * ハイブリッド構成により、サーバー構築不要でインターネット越しでもローカル複数タブでも
 * 確実にルームコード共有によるリアルタイム対戦が可能です。
 */
class NetworkManager {
  constructor() {
    this.mode = 'offline'; // 'offline' | 'host' | 'guest'
    this.roomCode = '';
    this.myPeerId = 'local_' + Math.random().toString(36).substring(2, 9);
    this.peer = null;
    this.connections = new Map(); // peerId -> DataConnection (Host用)
    this.hostConn = null;         // DataConnection (Guest用)
    this.bc = null;               // BroadcastChannel (同一PC別タブ間用)

    this.lobbyPlayers = [];       // 最大6人枠のロビー情報
    this.onLobbyUpdate = null;
    this.onGameStart = null;
    this.onStateSync = null;
    this.onGuestAction = null;
    this.onChatMessage = null;
    this.onStatusChange = null;
  }

  generateRoomCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
  }

  notifyStatus(text, isError = false) {
    if (this.onStatusChange) {
      this.onStatusChange(text, isError);
    }
  }

  /**
   * オンラインルームをホストとして作成
   */
  async createRoom(hostProfile) {
    this.cleanup();
    this.mode = 'host';
    this.roomCode = this.generateRoomCode();
    this.myPeerId = 'HOST_' + this.roomCode;

    this.lobbyPlayers = [
      {
        peerId: this.myPeerId,
        name: hostProfile.name || 'ホスト',
        avatar: hostProfile.avatar || 0,
        isCpu: false,
        isHost: true,
        ready: true
      }
    ];

    // 1. BroadcastChannel 初期化（同一PC・別タブから即座に参加可能）
    if (typeof BroadcastChannel !== 'undefined') {
      this.bc = new BroadcastChannel('pixel_jinsei_room_' + this.roomCode);
      this.bc.onmessage = (ev) => this.handleBroadcastMessage(ev.data);
    }

    // 2. PeerJS (WebRTC) 初期化（別PC・スマホ・インターネット越し参加用）
    if (typeof Peer !== 'undefined') {
      try {
        const peerId = 'pixel-jinsei-room-' + this.roomCode;
        this.peer = new Peer(peerId, { debug: 0 });
        this.peer.on('open', () => {
          this.notifyStatus(`オンラインルーム【${this.roomCode}】を開設しました！（最大6人）`);
        });
        this.peer.on('connection', (conn) => {
          conn.on('open', () => {
            this.connections.set(conn.peer, conn);
          });
          conn.on('data', (data) => {
            this.handleIncomingFromGuest(conn.peer, data);
          });
          conn.on('close', () => {
            this.handleGuestDisconnect(conn.peer);
          });
        });
        this.peer.on('error', () => {
          this.notifyStatus(`ルーム【${this.roomCode}】待機中（ローカル/P2Pハイブリッド）`);
        });
      } catch (e) {
        this.notifyStatus(`ルーム【${this.roomCode}】を開設しました`);
      }
    } else {
      this.notifyStatus(`ルーム【${this.roomCode}】を開設しました`);
    }

    if (this.onLobbyUpdate) this.onLobbyUpdate(this.lobbyPlayers, this.roomCode);
    return this.roomCode;
  }

  /**
   * ゲストとしてルームコードで参加
   */
  async joinRoom(roomCode, guestProfile) {
    this.cleanup();
    this.mode = 'guest';
    this.roomCode = roomCode.trim().toUpperCase();
    this.myPeerId = 'GUEST_' + Math.random().toString(36).substring(2, 8);

    this.notifyStatus(`ルーム【${this.roomCode}】へ接続しています...`);

    let joined = false;

    // 1. BroadcastChannel 経由での参加試行
    if (typeof BroadcastChannel !== 'undefined') {
      this.bc = new BroadcastChannel('pixel_jinsei_room_' + this.roomCode);
      this.bc.onmessage = (ev) => {
        const msg = ev.data;
        if (!msg) return;
        if (msg.target && msg.target !== this.myPeerId && msg.target !== 'ALL') return;
        if (msg.type === 'LOBBY_UPDATE' || msg.type === 'STATE_SYNC' || msg.type === 'GAME_START') {
          joined = true;
        }
        this.handleIncomingFromHost(msg);
      };
      this.bc.postMessage({
        type: 'JOIN_REQUEST',
        peerId: this.myPeerId,
        profile: guestProfile
      });
    }

    // 2. PeerJS WebRTC 経由での参加試行
    if (typeof Peer !== 'undefined') {
      try {
        this.peer = new Peer(undefined, { debug: 0 });
        this.peer.on('open', () => {
          const hostPeerId = 'pixel-jinsei-room-' + this.roomCode;
          const conn = this.peer.connect(hostPeerId, { reliable: true });
          this.hostConn = conn;
          conn.on('open', () => {
            joined = true;
            this.notifyStatus(`ルーム【${this.roomCode}】に参加しました！`);
            conn.send({
              type: 'JOIN_REQUEST',
              peerId: this.myPeerId,
              profile: guestProfile
            });
          });
          conn.on('data', (data) => {
            this.handleIncomingFromHost(data);
          });
          conn.on('close', () => {
            this.notifyStatus('ホストとの接続が終了しました（CPU引継ぎで継続可能）', true);
          });
        });
      } catch (e) {
        // BroadcastChannel フォールバック
      }
    }

    setTimeout(() => {
      if (joined) {
        this.notifyStatus(`ルーム【${this.roomCode}】に接続完了！ホストの開始を待っています`);
      } else {
        this.notifyStatus(`ルーム【${this.roomCode}】に接続要求を送信しました（ホスト待機中）`);
      }
    }, 900);
  }

  handleBroadcastMessage(msg) {
    if (!msg) return;
    if (this.mode === 'host') {
      if (msg.fromHost) return;
      this.handleIncomingFromGuest(msg.peerId, msg);
    }
  }

  handleIncomingFromGuest(peerId, msg) {
    if (!msg || this.mode !== 'host') return;

    if (msg.type === 'JOIN_REQUEST') {
      const existing = this.lobbyPlayers.find((p) => p.peerId === msg.peerId);
      if (!existing) {
        if (this.lobbyPlayers.length >= 6) {
          // CPU枠があれば1つ置き換える
          const cpuIdx = this.lobbyPlayers.findIndex((p) => p.isCpu);
          if (cpuIdx !== -1) {
            this.lobbyPlayers.splice(cpuIdx, 1);
          } else {
            this.sendToGuest(msg.peerId, { type: 'ROOM_FULL' });
            return;
          }
        }
        this.lobbyPlayers.push({
          peerId: msg.peerId,
          name: (msg.profile && msg.profile.name) || `ゲスト${this.lobbyPlayers.length}`,
          avatar: (msg.profile && msg.profile.avatar) || (this.lobbyPlayers.length % 8),
          isCpu: false,
          isHost: false,
          ready: true
        });
      }
      this.broadcastLobby();
      this.notifyStatus(`${msg.profile?.name || 'プレイヤー'} が参加しました！（現在 ${this.lobbyPlayers.length}/6 人）`);
    } else if (msg.type === 'GUEST_ACTION') {
      if (this.onGuestAction) {
        this.onGuestAction(msg.peerId, msg.action);
      }
    } else if (msg.type === 'CHAT_STAMP') {
      this.broadcastToAll({
        type: 'CHAT_STAMP',
        sender: msg.sender,
        text: msg.text
      });
      if (this.onChatMessage) {
        this.onChatMessage(msg.sender, msg.text);
      }
    }
  }

  handleIncomingFromHost(msg) {
    if (!msg || this.mode !== 'guest') return;

    if (msg.type === 'LOBBY_UPDATE') {
      this.lobbyPlayers = msg.lobbyPlayers || [];
      if (this.onLobbyUpdate) this.onLobbyUpdate(this.lobbyPlayers, this.roomCode);
    } else if (msg.type === 'ROOM_FULL') {
      this.notifyStatus('このルームは満員（6人）です。', true);
    } else if (msg.type === 'GAME_START') {
      if (this.onGameStart) this.onGameStart(msg.state);
    } else if (msg.type === 'STATE_SYNC') {
      if (this.onStateSync) this.onStateSync(msg.state, msg.eventBanner);
    } else if (msg.type === 'CHAT_STAMP') {
      if (this.onChatMessage) this.onChatMessage(msg.sender, msg.text);
    }
  }

  handleGuestDisconnect(peerId) {
    this.connections.delete(peerId);
    const idx = this.lobbyPlayers.findIndex((p) => p.peerId === peerId);
    if (idx !== -1) {
      this.lobbyPlayers[idx].isCpu = true;
      this.lobbyPlayers[idx].name += '(CPU代行)';
      this.broadcastLobby();
    }
  }

  /**
   * ホストがロビーにCPUを追加（最大6人まで）
   */
  addCpuToLobby() {
    if (this.mode !== 'host') return;
    if (this.lobbyPlayers.length >= 6) return;
    const cpuIdx = this.lobbyPlayers.length;
    const cpuTemplate = window.GAME_DATA.CPU_PROFILES[cpuIdx % window.GAME_DATA.CPU_PROFILES.length];
    this.lobbyPlayers.push({
      peerId: 'CPU_' + Math.random().toString(36).substring(2, 7),
      name: cpuTemplate.name,
      avatar: cpuTemplate.avatar,
      style: cpuTemplate.style,
      isCpu: true,
      isHost: false,
      ready: true
    });
    this.broadcastLobby();
  }

  /**
   * ホストがロビーからCPUまたは枠を削除
   */
  removePlayerFromLobby(index) {
    if (this.mode !== 'host') return;
    if (index <= 0 || index >= this.lobbyPlayers.length) return;
    this.lobbyPlayers.splice(index, 1);
    this.broadcastLobby();
  }

  broadcastLobby() {
    if (this.mode !== 'host') return;
    this.broadcastToAll({
      type: 'LOBBY_UPDATE',
      lobbyPlayers: this.lobbyPlayers
    });
    if (this.onLobbyUpdate) this.onLobbyUpdate(this.lobbyPlayers, this.roomCode);
  }

  sendToGuest(peerId, payload) {
    const conn = this.connections.get(peerId);
    if (conn && conn.open) {
      conn.send(payload);
    }
    if (this.bc) {
      this.bc.postMessage({ ...payload, fromHost: true, target: peerId });
    }
  }

  broadcastToAll(payload) {
    this.connections.forEach((conn) => {
      if (conn && conn.open) {
        conn.send(payload);
      }
    });
    if (this.bc) {
      this.bc.postMessage({ ...payload, fromHost: true, target: 'ALL' });
    }
  }

  /**
   * ゲストからホストへ操作アクションを送信
   */
  sendActionToHost(action) {
    if (this.mode !== 'guest') return;
    const packet = {
      type: 'GUEST_ACTION',
      peerId: this.myPeerId,
      action
    };
    if (this.hostConn && this.hostConn.open) {
      this.hostConn.send(packet);
    }
    if (this.bc) {
      this.bc.postMessage(packet);
    }
  }

  /**
   * スタンプ・ショートチャット送信
   */
  sendStamp(senderName, text) {
    if (this.mode === 'host') {
      this.broadcastToAll({ type: 'CHAT_STAMP', sender: senderName, text });
      if (this.onChatMessage) this.onChatMessage(senderName, text);
    } else if (this.mode === 'guest') {
      const packet = { type: 'CHAT_STAMP', peerId: this.myPeerId, sender: senderName, text };
      if (this.hostConn && this.hostConn.open) this.hostConn.send(packet);
      if (this.bc) this.bc.postMessage(packet);
    } else {
      if (this.onChatMessage) this.onChatMessage(senderName, text);
    }
  }

  cleanup() {
    if (this.bc) {
      this.bc.close();
      this.bc = null;
    }
    if (this.peer) {
      try {
        this.peer.destroy();
      } catch (e) {}
      this.peer = null;
    }
    this.connections.clear();
    this.hostConn = null;
    this.mode = 'offline';
  }
}

window.networkManager = new NetworkManager();
