// ===== Network Manager =====
// Firebase Realtime Database for multiplayer sync

const FIREBASE_CONFIG = {
    apiKey: "AIzaSyBWCR7BnMYOuf-_7MSfEzaAEqVqeKAMxNE",
    authDomain: "sggame-hub.firebaseapp.com",
    databaseURL: "https://sggame-hub-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "sggame-hub",
    storageBucket: "sggame-hub.firebasestorage.app",
    messagingSenderId: "963308032702",
    appId: "1:963308032702:web:neoncoopshooter"
};

let firebase = null;
let db = null;

async function initFirebase() {
    if (firebase) return;
    try {
        const { initializeApp } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js');
        const { getDatabase, ref, set, onValue, push, remove, onDisconnect, get, update, off } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js');
        const app = initializeApp(FIREBASE_CONFIG);
        db = getDatabase(app);
        firebase = { ref, set, onValue, push, remove, onDisconnect, get, update, off };
    } catch (e) {
        console.warn('Firebase init failed:', e);
    }
}

export class NetworkManager {
    constructor() {
        this.playerId = 'p_' + Math.random().toString(36).substr(2, 8);
        this.roomId = null;
        this.isHost = false;
        this.players = {};
        this.listeners = [];
        this.gameStarted = false;

        // Callbacks
        this.onPlayersChanged = null;
        this.onGameStart = null;
        this.onRemotePlayerUpdate = null;
        this.onBossHPSync = null;
        this.onPlayerLeft = null;
        this.onWaveSync = null;
    }

    async init() {
        await initFirebase();
    }

    // === Random Matchmaking (2 players) ===
    async findRandomMatch() {
        if (!db) { await this.init(); if (!db) return false; }

        const lobbiesRef = firebase.ref(db, 'neon_lobbies/random');
        const snapshot = await firebase.get(lobbiesRef);
        const lobbies = snapshot.val() || {};

        // Find an open lobby
        for (const [roomId, data] of Object.entries(lobbies)) {
            if (data.status === 'waiting' && Object.keys(data.players || {}).length < 2) {
                this.roomId = roomId;
                this.isHost = false;
                await this._joinRoom(roomId);
                return true;
            }
        }

        // Create new lobby
        const newRef = firebase.push(lobbiesRef);
        this.roomId = newRef.key;
        this.isHost = true;
        await firebase.set(newRef, {
            status: 'waiting',
            maxPlayers: 2,
            type: 'random',
            createdAt: Date.now(),
            players: {
                [this.playerId]: { ready: true, joined: Date.now() } // Random match is auto-ready
            }
        });

        // Monitor room
        this._watchRoom(`neon_lobbies/random/${this.roomId}`);
        return true;
    }

    // === Password Matchmaking (up to 4 players) ===
    async findPasswordMatch(password) {
        if (!db) { await this.init(); if (!db) return false; }

        const roomId = 'pw_' + password.toLowerCase().trim();
        const roomRef = firebase.ref(db, `neon_lobbies/password/${roomId}`);
        const snapshot = await firebase.get(roomRef);
        const data = snapshot.val();

        this.roomId = roomId;

        if (!data) {
            // Create room
            this.isHost = true;
            await firebase.set(roomRef, {
                status: 'waiting',
                maxPlayers: 4,
                type: 'password',
                password: password,
                createdAt: Date.now(),
                players: {
                    [this.playerId]: { ready: false, joined: Date.now() }
                }
            });
        } else {
            // Join existing
            this.isHost = false;
            const playerCount = Object.keys(data.players || {}).length;
            if (playerCount >= 4) return false;
            await firebase.update(firebase.ref(db, `neon_lobbies/password/${roomId}/players`), {
                [this.playerId]: { ready: false, joined: Date.now() }
            });
        }

        this._watchRoom(`neon_lobbies/password/${roomId}`);
        return true;
    }

    async _joinRoom(roomId) {
        if (!db) return;
        this.roomId = roomId;
        this.isHost = false;

        await firebase.update(firebase.ref(db, `neon_lobbies/random/${roomId}/players`), {
            [this.playerId]: { ready: true, joined: Date.now() }
        });

        this._watchRoom(`neon_lobbies/random/${roomId}`);
    }

    _watchRoom(path) {
        const roomRef = firebase.ref(db, path);

        // On disconnect, clean up
        const playerRef = firebase.ref(db, `${path}/players/${this.playerId}`);
        firebase.onDisconnect(playerRef).remove();

        const unsubscribe = firebase.onValue(roomRef, (snapshot) => {
            const data = snapshot.val();
            if (!data) {
                if (this.onPlayersChanged) this.onPlayersChanged({});
                return;
            }

            this.players = data.players || {};
            if (this.onPlayersChanged) this.onPlayersChanged(this.players);

            if (data.status === 'playing' && this.onGameStart && !this.gameStarted) {
                this.gameStarted = true;
                this.onGameStart(Object.keys(this.players).length, data.stageId || 1);
            }
        });

        this.listeners.push({ ref: roomRef, unsub: unsubscribe });
    }

    async setReady(ready) {
        if (!db || !this.roomId) return;
        const type = this.roomId.startsWith('pw_') ? 'password' : 'random';
        const path = `neon_lobbies/${type}/${this.roomId}/players/${this.playerId}`;
        await firebase.update(firebase.ref(db, path), { ready });
    }

    async checkAllReady() {
        if (!this.players) return false;
        const entries = Object.values(this.players);
        if (entries.length < 2) return false;
        return entries.every(p => p.ready);
    }

    async startGame(stageId) {
        if (!db || !this.roomId) return;
        const type = this.roomId.startsWith('pw_') ? 'password' : 'random';
        const path = `neon_lobbies/${type}/${this.roomId}`;

        // Let the host update the status to trigger everyone's onGameStart listener via _watchRoom
        if (this.isHost) {
            await firebase.update(firebase.ref(db, path), { status: 'playing', stageId });
        }

        // Start game state sync locally for all players once game triggers
        this._watchGameState();
    }

    _watchGameState() {
        if (!db || !this.roomId) return;
        const type = this.roomId.startsWith('pw_') ? 'password' : 'random';
        const basePath = `neon_lobbies/${type}/${this.roomId}`;

        // Watch other players' positions
        const playersRef = firebase.ref(db, `${basePath}/gameState/players`);
        const unsub = firebase.onValue(playersRef, (snapshot) => {
            const data = snapshot.val() || {};
            for (const [pid, state] of Object.entries(data)) {
                if (pid !== this.playerId && this.onRemotePlayerUpdate) {
                    this.onRemotePlayerUpdate(pid, state);
                }
            }
        });
        this.listeners.push({ ref: playersRef, unsub });

        // Watch boss HP
        const bossRef = firebase.ref(db, `${basePath}/gameState/bossHP`);
        const unsub2 = firebase.onValue(bossRef, (snapshot) => {
            const hp = snapshot.val();
            if (hp !== null && this.onBossHPSync) {
                this.onBossHPSync(hp);
            }
        });
        this.listeners.push({ ref: bossRef, unsub: unsub2 });

        // Watch wave
        const waveRef = firebase.ref(db, `${basePath}/gameState/wave`);
        const unsub3 = firebase.onValue(waveRef, (snapshot) => {
            const wave = snapshot.val();
            if (wave !== null && this.onWaveSync) {
                this.onWaveSync(wave);
            }
        });
        this.listeners.push({ ref: waveRef, unsub: unsub3 });
    }

    // Send player state (throttled)
    _lastSend = 0;
    async sendPlayerState(state) {
        const now = Date.now();
        if (now - this._lastSend < 50) return; // 20 updates/sec max
        this._lastSend = now;

        if (!db || !this.roomId) return;
        const type = this.roomId.startsWith('pw_') ? 'password' : 'random';
        const path = `neon_lobbies/${type}/${this.roomId}/gameState/players/${this.playerId}`;
        try {
            await firebase.set(firebase.ref(db, path), state);
        } catch (e) { /* ignore throttle errors */ }
    }

    async sendBossHP(hp) {
        if (!db || !this.roomId) return;
        const type = this.roomId.startsWith('pw_') ? 'password' : 'random';
        const path = `neon_lobbies/${type}/${this.roomId}/gameState/bossHP`;
        try {
            await firebase.set(firebase.ref(db, path), hp);
        } catch (e) { /* ignore */ }
    }

    async sendWave(wave) {
        if (!db || !this.roomId) return;
        const type = this.roomId.startsWith('pw_') ? 'password' : 'random';
        const path = `neon_lobbies/${type}/${this.roomId}/gameState/wave`;
        try {
            await firebase.set(firebase.ref(db, path), wave);
        } catch (e) { /* ignore */ }
    }

    async leaveRoom() {
        // Clean up listeners
        for (const l of this.listeners) {
            if (l.unsub) firebase.off(l.ref);
        }
        this.listeners = [];

        if (!db || !this.roomId) return;
        const type = this.roomId.startsWith('pw_') ? 'password' : 'random';
        const playerPath = `neon_lobbies/${type}/${this.roomId}/players/${this.playerId}`;
        try {
            await firebase.remove(firebase.ref(db, playerPath));
        } catch (e) { /* ignore */ }

        // If host, try to clean room
        if (this.isHost) {
            try {
                const roomRef = firebase.ref(db, `neon_lobbies/${type}/${this.roomId}`);
                const snap = await firebase.get(roomRef);
                const data = snap.val();
                if (data && Object.keys(data.players || {}).length === 0) {
                    await firebase.remove(roomRef);
                }
            } catch (e) { /* ignore */ }
        }

        this.roomId = null;
        this.players = {};
        this.gameStarted = false;
    }

    getPlayerCount() {
        return Object.keys(this.players).length;
    }
}
