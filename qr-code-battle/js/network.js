/* ========================================
   Bar-Code Tactics: 凸（TOTSU）
   ネットワーク（対戦）システム
   ======================================== */

const Network = {
    db: null,
    userId: null,
    currentRoomId: null,
    isHost: false,
    isConnected: false,
    roomRef: null,

    // 状態管理
    lastStatus: null,
    battleStarted: false,

    // コールバック
    onMatchFound: null,
    onBattleStart: null,
    onOpponentDisconnected: null,

    async init() {
        if (this.db) return true; // 既に初期化済み

        try {
            // ローカルストレージからID取得または生成
            this.userId = localStorage.getItem('bt_user_id');
            if (!this.userId) {
                this.userId = 'u_' + Math.random().toString(36).substr(2, 9);
                localStorage.setItem('bt_user_id', this.userId);
            }

            const response = await fetch('/__/firebase/init.json');
            if (response.ok) {
                const config = await response.json();

                // Realtime DatabaseのURLが自動設定されていない場合のフォールバック
                if (!config.databaseURL) {
                    // プロジェクトIDに基づくデフォルトドメイン
                    config.databaseURL = `https://${config.projectId}-default-rtdb.firebaseio.com`;
                    console.warn('databaseURL not found in init.json. Using fallback:', config.databaseURL);
                }

                firebase.initializeApp(config);
                this.db = firebase.database();
                this.isConnected = true;
                console.log('Firebase initialized. User ID:', this.userId);

                // 接続監視
                const connectedRef = this.db.ref('.info/connected');
                connectedRef.on('value', (snap) => {
                    this.isConnected = snap.val() === true;
                });

                return true;
            } else {
                console.warn('Firebase init.json not found (Local dev?)');
                return false;
            }
        } catch (e) {
            console.error('Network init failed:', e);
            return false;
        }
    },

    // ランダムマッチ
    async findRandomMatch(deck) {
        if (!this.db) return false;

        this.resetState(); // 状態リセット

        const randomRef = this.db.ref('matchmaking/random');

        // 待機中の部屋を探す
        const snapshot = await randomRef.orderByChild('status').equalTo('waiting').limitToFirst(1).once('value');
        const rooms = snapshot.val();

        if (rooms) {
            // 参加
            const roomId = Object.keys(rooms)[0];
            const room = rooms[roomId];

            // 自分が作った部屋でなければ参加
            if (room.host !== this.userId) {
                this.currentRoomId = roomId;
                this.isHost = false;
                this.roomRef = randomRef.child(roomId);

                // ゲストとして登録
                await this.roomRef.update({
                    guest: this.userId,
                    guestDeck: deck,
                    status: 'matched'
                });

                this.listenToRoom();
                return { role: 'guest', roomId };
            }
        }

        // 部屋を作成
        const newRoomRef = randomRef.push();
        this.currentRoomId = newRoomRef.key;
        this.isHost = true;
        this.roomRef = newRoomRef;

        await newRoomRef.set({
            host: this.userId,
            hostDeck: deck,
            status: 'waiting',
            createdAt: firebase.database.ServerValue.TIMESTAMP
        });

        // 切断時に削除
        newRoomRef.onDisconnect().remove();

        this.listenToRoom();
        return { role: 'host', roomId: this.currentRoomId };
    },

    // パスワードマッチ（作成/参加）
    async joinPrivateMatch(password, deck) {
        if (!this.db) return false;

        this.resetState(); // 状態リセット

        const roomId = 'p_' + password;
        const roomRef = this.db.ref('matchmaking/private/' + roomId);
        this.roomRef = roomRef;
        this.currentRoomId = roomId;

        const snapshot = await roomRef.once('value');
        const room = snapshot.val();

        if (room && room.status === 'waiting') {
            // 参加
            this.isHost = false;
            await roomRef.update({
                guest: this.userId,
                guestDeck: deck,
                status: 'matched'
            });
        } else if (!room) {
            // 作成
            this.isHost = true;
            await roomRef.set({
                host: this.userId,
                hostDeck: deck,
                status: 'waiting',
                createdAt: firebase.database.ServerValue.TIMESTAMP
            });
            // 切断時に削除
            roomRef.onDisconnect().remove();
        } else {
            // 満員または開始済み
            return { error: '満員または開始済みです' };
        }

        this.listenToRoom();
        return { success: true, role: this.isHost ? 'host' : 'guest' };
    },

    // 部屋の状態監視
    listenToRoom() {
        if (!this.roomRef) return;

        this.roomRef.on('value', (snapshot) => {
            const data = snapshot.val();
            if (!data) {
                // 部屋が消滅（相手が切断など）
                if (this.onOpponentDisconnected) this.onOpponentDisconnected();
                this.leaveRoom();
                return;
            }

            // マッチ成立チェック
            if (data.status === 'matched' && this.lastStatus !== 'matched') {
                this.lastStatus = 'matched';
                if (this.onMatchFound) {
                    this.onMatchFound();
                }
            }

            // ホストの処理: 両者のデッキが揃ったらシード生成して開始
            if (this.isHost && data.status === 'matched' && data.guestDeck && !data.seed) {
                const seed = 'seed_' + Math.random().toString(36).substr(2) + Date.now();
                this.roomRef.update({
                    seed: seed,
                    status: 'starting'
                });
            }

            // 開始チェック
            if (data.status === 'starting' && data.seed && data.hostDeck && data.guestDeck) {
                if (!this.battleStarted) {
                    this.battleStarted = true;
                    this.lastStatus = 'starting';

                    // バトル開始
                    if (this.onBattleStart) {
                        const opponentDeck = this.isHost ? data.guestDeck : data.hostDeck;
                        this.onBattleStart({
                            seed: data.seed,
                            opponentDeck: opponentDeck
                        });
                    }
                }
            }
        });
    },

    leaveRoom() {
        if (this.roomRef) {
            this.roomRef.off(); // リスナー解除
            if (this.isHost) {
                this.roomRef.remove(); // ホストなら部屋削除
            } else {
                // ゲストなら抜けたことを通知（必要なら）
                // statusをwaitingに戻すなどの処理もありだが、今回は簡易的に解散
                this.roomRef.update({ guest: null, status: 'waiting' });
            }
        }
        this.currentRoomId = null;
        this.roomRef = null;
        this.isHost = false;
        this.resetState();
    },

    resetState() {
        this.lastStatus = null;
        this.battleStarted = false;
    }
};
