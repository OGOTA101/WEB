// Firebase設定 - 後でFirebaseプロジェクト作成時に更新してください
const firebaseConfig = {
    apiKey: "AIzaSyDHwo8rIsLyck8Wd-jdOEpw_8f0ny77Ivs",
    authDomain: "gomoku-game-2024.firebaseapp.com",
    databaseURL: "https://gomoku-game-2024-default-rtdb.firebaseio.com",
    projectId: "gomoku-game-2024",
    storageBucket: "gomoku-game-2024.firebasestorage.app",
    messagingSenderId: "529283108488",
    appId: "1:529283108488:web:951a20807bf04a76ff593d"
};

class GomokuFirebase {
    constructor() {
        this.app = null;
        this.database = null;
        this.playerId = null;
        this.playerName = '';
        this.gameState = null;
        this.isMyTurn = false;
        this.myColor = null;
        this.gameTimer = null;
        this.timeLeft = 30;
        this.currentGameId = null;
        this.timerSyncRef = null; // タイマー同期用

        // **新機能：ゲーム設定**
        this.gameSettings = {
            timeLimit: 30,      // 制限時間（秒）、0は無制限
            matchType: 'random', // 'random', 'password', 'cpu'
            roomPassword: '',    // 合言葉
            cpuDifficulty: 'easy' // CPU難易度
        };
        this.cpuAI = null; // CPU AI インスタンス
        this.isCPUGame = false; // CPU対戦フラグ

        // UI要素を先に初期化してからFirebaseを初期化
        this.initializeUI();
        this.initializeFirebase();
    }

    initializeFirebase() {
        try {
            // Firebase SDKの読み込み確認
            if (typeof firebase === 'undefined') {
                throw new Error('Firebase SDK がロードされていません');
            }

            // Firebase初期化
            this.app = firebase.initializeApp(firebaseConfig);
            this.database = firebase.database();

            // プレイヤーIDを生成
            this.playerId = this.generatePlayerId();

            console.log('Firebase初期化完了');
            console.log('Database URL:', firebaseConfig.databaseURL);

            // 接続テスト
            this.testConnection();

            // UIが初期化されている場合のみ接続状態を更新
            setTimeout(() => {
                this.updateConnectionStatus(true);
            }, 100);
        } catch (error) {
            console.error('Firebase初期化エラー:', error);

            // エラーメッセージをユーザーに表示
            const errorMsg = `Firebase接続エラー: ${error.message}`;
            setTimeout(() => {
                this.updateConnectionStatus(false);
                if (this.elements && this.elements.lobbyStatus) {
                    this.elements.lobbyStatus.innerHTML = `<div class="error">${errorMsg}</div>`;
                }
            }, 100);

            // デモモード（Firebase設定なしでもUI確認可能）
            console.log('デモモードで動作します');
        }
    }

    generatePlayerId() {
        return 'player_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
    }

    async testConnection() {
        if (!this.database) return;

        try {
            console.log('Firebase接続テスト開始...');

            // 接続状況のリアルタイム監視を開始
            this.database.ref('.info/connected').on('value', (snapshot) => {
                const connected = snapshot.val();
                console.log('🌐 Firebase接続状況:', connected ? '接続中' : '切断');
                this.updateConnectionStatus(connected);

                if (!connected) {
                    console.warn('⚠️ Firebase接続が切断されました');
                } else {
                    console.log('✅ Firebase接続が回復しました');
                }
            });

            // 初回接続テスト
            await this.database.ref('.info/connected').once('value');
            console.log('✅ Firebase接続テスト成功');
        } catch (error) {
            console.error('❌ Firebase接続テスト失敗:', error);
            setTimeout(() => {
                this.updateConnectionStatus(false);
            }, 100);
        }
    }

    initializeUI() {
        // DOM要素の取得
        this.screens = {
            lobby: document.getElementById('lobby'),
            game: document.getElementById('game'),
            result: document.getElementById('result')
        };

        this.elements = {
            playerName: document.getElementById('playerName'),
            // **新機能：ゲーム設定要素**
            timeLimit: document.getElementById('timeLimit'),
            matchType: document.getElementById('matchType'),
            roomPassword: document.getElementById('roomPassword'),
            cpuDifficulty: document.getElementById('cpuDifficulty'),
            passwordGroup: document.getElementById('passwordGroup'),
            cpuDifficultyGroup: document.getElementById('cpuDifficultyGroup'),

            joinGameBtn: document.getElementById('joinGameBtn'),
            leaveQueueBtn: document.getElementById('leaveQueueBtn'),
            lobbyStatus: document.getElementById('lobbyStatus'),
            playerCount: document.getElementById('playerCount'),
            playersUL: document.getElementById('playersUL'),
            gameBoard: document.getElementById('gameBoard'),
            blackPlayerName: document.getElementById('blackPlayerName'),
            whitePlayerName: document.getElementById('whitePlayerName'),
            currentTurn: document.getElementById('currentTurn'),
            gameTimer: document.getElementById('gameTimer'),
            gameSettings: document.getElementById('gameSettings'),
            surrenderBtn: document.getElementById('surrenderBtn'),
            leaveGameBtn: document.getElementById('leaveGameBtn'),
            resultTitle: document.getElementById('resultTitle'),
            resultMessage: document.getElementById('resultMessage'),
            backToLobbyBtn: document.getElementById('backToLobbyBtn'),
            playAgainBtn: document.getElementById('playAgainBtn'),
            connectionIndicator: document.getElementById('connectionIndicator'),
            connectionText: document.getElementById('connectionText')
        };

        // イベントリスナーの設定
        this.elements.joinGameBtn.addEventListener('click', () => this.joinGame());
        this.elements.leaveQueueBtn.addEventListener('click', () => this.leaveQueue());
        this.elements.surrenderBtn.addEventListener('click', () => this.surrender());
        this.elements.leaveGameBtn.addEventListener('click', () => this.leaveGame());
        this.elements.backToLobbyBtn.addEventListener('click', () => this.backToLobby());
        this.elements.playAgainBtn.addEventListener('click', () => this.playAgain());

        // スマホ対応：タッチイベントとクリックイベント両方を追加
        this.elements.gameBoard.addEventListener('click', (e) => this.handleBoardClick(e));
        this.elements.gameBoard.addEventListener('touchstart', (e) => {
            e.preventDefault(); // デフォルトのタッチ動作を防ぐ
            this.handleBoardTouch(e);
        });

        // **新機能：ゲーム設定のイベントリスナー**
        this.elements.matchType.addEventListener('change', () => this.updateMatchTypeUI());
        this.elements.timeLimit.addEventListener('change', () => this.updateGameSettings());
        this.elements.roomPassword.addEventListener('input', () => this.updateGameSettings());
        this.elements.cpuDifficulty.addEventListener('change', () => this.updateGameSettings());

        // プレイヤー名の入力処理
        this.elements.playerName.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.joinGame();
            }
        });

        // キャンバスの初期化
        this.ctx = this.elements.gameBoard.getContext('2d');
        this.boardSize = 15;
        this.cellSize = 40;
        this.initializeBoard();

        // プレイヤーリストのリアルタイム監視
        this.listenToPlayersUpdate();

        // **新機能：初期UI状態を設定**
        this.updateMatchTypeUI();
        this.updateGameSettings();
    }

    // **新機能：マッチタイプに応じてUIを更新**
    updateMatchTypeUI() {
        const matchType = this.elements.matchType.value;

        // 合言葉入力の表示/非表示
        this.elements.passwordGroup.style.display = matchType === 'password' ? 'block' : 'none';

        // CPU難易度選択の表示/非表示
        this.elements.cpuDifficultyGroup.style.display = matchType === 'cpu' ? 'block' : 'none';

        // ボタンテキストの変更
        if (matchType === 'cpu') {
            this.elements.joinGameBtn.textContent = 'CPU対戦開始';
        } else {
            this.elements.joinGameBtn.textContent = 'ゲーム開始';
        }

        this.updateGameSettings();
    }

    // **新機能：ゲーム設定を更新**
    updateGameSettings() {
        this.gameSettings.timeLimit = parseInt(this.elements.timeLimit.value);
        this.gameSettings.matchType = this.elements.matchType.value;
        this.gameSettings.roomPassword = this.elements.roomPassword.value.trim();
        this.gameSettings.cpuDifficulty = this.elements.cpuDifficulty.value;

        console.log('ゲーム設定更新:', this.gameSettings);
    }

    updateConnectionStatus(connected) {
        // DOM要素が存在しない場合はスキップ
        if (!this.elements || !this.elements.connectionIndicator || !this.elements.connectionText) {
            console.log('UI要素がまだ初期化されていません');
            return;
        }

        if (connected) {
            this.elements.connectionIndicator.className = 'indicator connected';
            this.elements.connectionText.textContent = 'Firebase接続済み';
        } else {
            this.elements.connectionIndicator.className = 'indicator disconnected';
            this.elements.connectionText.textContent = 'Firebase未接続（デモモード）';
        }
    }

    listenToPlayersUpdate() {
        if (!this.database) {
            // デモ用のプレイヤーリスト
            this.updatePlayersList([{ id: 'demo', name: 'Demo Player', inQueue: false }]);
            return;
        }

        // オンラインプレイヤーのリアルタイム監視
        this.database.ref('players').on('value', (snapshot) => {
            const players = snapshot.val() || {};
            this.updatePlayersList(Object.values(players));
        });
    }

    updatePlayersList(players) {
        this.elements.playerCount.textContent = players.length;
        this.elements.playersUL.innerHTML = '';

        players.forEach(player => {
            const li = document.createElement('li');
            li.textContent = `${player.name} ${player.inQueue ? '(マッチング中)' : ''}`;
            if (player.id === this.playerId) {
                li.classList.add('current-player');
            }
            this.elements.playersUL.appendChild(li);
        });
    }

    async joinGame() {
        const name = this.elements.playerName.value.trim();
        if (!name) {
            alert('プレイヤー名を入力してください');
            return;
        }

        // ゲーム設定を更新
        this.updateGameSettings();

        // **新機能：CPU対戦の場合**
        if (this.gameSettings.matchType === 'cpu') {
            this.startCPUGame(name);
            return;
        }

        // **新機能：合言葉マッチの場合**
        if (this.gameSettings.matchType === 'password') {
            if (!this.gameSettings.roomPassword) {
                alert('合言葉を入力してください');
                return;
            }
        }

        if (!this.database) {
            alert('Firebase設定が必要です。README.mdの手順に従ってFirebaseプロジェクトを設定してください。');
            return;
        }

        console.log('🎮 ゲーム参加処理開始');

        // **新機能：進行中のゲームに復帰できるかチェック**
        const existingGame = await this.checkForExistingGame(name);
        if (existingGame) {
            console.log('🔄 既存ゲームへの復帰:', existingGame.id);
            this.playerName = name;
            this.playerId = existingGame.playerId; // 元のプレイヤーIDを復元
            this.resumeGame(existingGame);
            return;
        }

        // 既存のゲームデータをクリーンアップ
        await this.cleanupOldGames();

        // Firebase権限の詳細テスト
        console.log('Firebase権限テスト開始...');
        try {
            // 基本的な読み書きテスト
            const testRef = this.database.ref('test');
            await testRef.set({ test: true, timestamp: Date.now() });
            console.log('基本書き込みテスト: 成功');
            await testRef.remove();
            console.log('基本削除テスト: 成功');

            // プレイヤーズノードテスト
            const playersTestRef = this.database.ref('players/test');
            await playersTestRef.set({ id: 'test', name: 'test' });
            console.log('プレイヤーズ書き込みテスト: 成功');
            await playersTestRef.remove();
            console.log('プレイヤーズ削除テスト: 成功');

        } catch (error) {
            console.error('Firebase権限テストエラー:', error);
            alert(`Firebase権限エラー: ${error.message}\n\nFirebaseコンソールでデータベースルールを確認してください:\nhttps://console.firebase.google.com/project/gomoku-game-2024/database/gomoku-game-2024-default-rtdb/rules`);
            return;
        }

        this.playerName = name;

        try {
            console.log('プレイヤー登録開始:', { playerId: this.playerId, name: name, settings: this.gameSettings });

            // プレイヤー情報をFirebaseに登録
            const playerData = {
                id: this.playerId,
                name: name,
                inQueue: true,
                lastSeen: firebase.database.ServerValue.TIMESTAMP,
                // **新機能：ゲーム設定を含める**
                gameSettings: this.gameSettings
            };

            console.log('プレイヤーデータ:', playerData);
            await this.database.ref('players/' + this.playerId).set(playerData);
            console.log('プレイヤー登録完了');

            // **新機能：マッチタイプに応じてキューに参加**
            const queuePath = this.gameSettings.matchType === 'password'
                ? `passwordQueue/${this.gameSettings.roomPassword}`
                : 'queue';

            const queueData = {
                id: this.playerId,
                name: name,
                timestamp: firebase.database.ServerValue.TIMESTAMP,
                gameSettings: this.gameSettings
            };

            console.log('キューデータ:', queueData, 'パス:', queuePath);
            await this.database.ref(queuePath + '/' + this.playerId).set(queueData);
            console.log('キュー参加完了');

            this.showQueueStatus();
            this.listenToGameStart();

        } catch (error) {
            console.error('ゲーム参加エラー:', error);
            alert('ゲーム参加に失敗しました: ' + error.message);
        }
    }

    // **新機能：CPU対戦開始**
    startCPUGame(playerName) {
        console.log('🤖 CPU対戦開始:', { player: playerName, difficulty: this.gameSettings.cpuDifficulty });

        this.playerName = playerName;
        this.isCPUGame = true;
        this.cpuAI = new GomokuCPU(this.gameSettings.cpuDifficulty);

        // CPU対戦用のゲームデータを作成
        const gameData = {
            id: 'cpu_game_' + Date.now(),
            players: [this.playerId, 'cpu'],
            board: Array(15).fill().map(() => Array(15).fill(0)),
            currentPlayer: 1, // プレイヤーが先手（黒）
            gameState: 'playing',
            blackPlayer: playerName,
            whitePlayer: `CPU (${this.gameSettings.cpuDifficulty === 'easy' ? '初級' : '上級'})`,
            createdAt: Date.now(),
            gameSettings: this.gameSettings
        };

        this.startGame(gameData);
    }

    // **新機能：既存ゲームのチェック**
    async checkForExistingGame(playerName) {
        try {
            console.log('🔍 既存ゲームをチェック中:', playerName);

            const gamesSnapshot = await this.database.ref('games').once('value');
            const games = gamesSnapshot.val() || {};

            for (const gameId in games) {
                const game = games[gameId];
                if (game.gameState === 'playing') {
                    // このプレイヤー名でゲーム中のものがあるかチェック
                    if (game.blackPlayer === playerName || game.whitePlayer === playerName) {
                        console.log('✅ 復帰可能なゲームを発見:', {
                            gameId: gameId,
                            blackPlayer: game.blackPlayer,
                            whitePlayer: game.whitePlayer
                        });

                        // プレイヤーIDを特定
                        const playersSnapshot = await this.database.ref('players').once('value');
                        const players = playersSnapshot.val() || {};

                        for (const playerId in players) {
                            const player = players[playerId];
                            if (player.name === playerName && player.gameId === gameId) {
                                return {
                                    id: gameId,
                                    data: game,
                                    playerId: playerId
                                };
                            }
                        }
                    }
                }
            }

            console.log('ℹ️ 復帰可能なゲームはありません');
            return null;
        } catch (error) {
            console.error('❌ 既存ゲームチェックエラー:', error);
            return null;
        }
    }

    // **新機能：ゲーム復帰**
    resumeGame(existingGame) {
        console.log('🔄 ゲーム復帰開始:', existingGame);

        // プレイヤー状態を更新
        this.database.ref('players/' + this.playerId).update({
            inQueue: false,
            gameId: existingGame.id,
            lastSeen: firebase.database.ServerValue.TIMESTAMP
        });

        // ゲーム画面に移行
        this.startGame(existingGame.data);

        // 復帰通知を表示
        this.showResumeNotification();
    }

    showResumeNotification() {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: #4CAF50;
            color: white;
            padding: 20px 30px;
            border-radius: 10px;
            font-size: 18px;
            font-weight: bold;
            z-index: 2000;
            box-shadow: 0 8px 32px rgba(0,0,0,0.3);
            text-align: center;
        `;

        notification.innerHTML = `
            <div style="margin-bottom: 10px;">🔄 ゲーム復帰</div>
            <div style="font-size: 14px; font-weight: normal;">進行中のゲームに復帰しました</div>
        `;

        document.body.appendChild(notification);

        // 3秒後に自動で削除
        setTimeout(() => {
            if (notification.parentNode) {
                document.body.removeChild(notification);
            }
        }, 3000);
    }

    async cleanupOldGames() {
        try {
            console.log('🧹 古いゲームデータのクリーンアップ開始');

            // 10分以上古いゲームを削除
            const cutoffTime = Date.now() - (10 * 60 * 1000); // 10分前
            const gamesSnapshot = await this.database.ref('games').once('value');
            const games = gamesSnapshot.val() || {};

            let deletedCount = 0;
            const deletePromises = [];

            for (const gameId in games) {
                const game = games[gameId];
                if (game.createdAt && game.createdAt < cutoffTime) {
                    console.log('🗑️ 古いゲームを削除:', { id: gameId, created: new Date(game.createdAt) });
                    deletePromises.push(this.database.ref('games/' + gameId).remove());
                    deletedCount++;
                }
            }

            if (deletePromises.length > 0) {
                await Promise.all(deletePromises);
                console.log(`✅ ${deletedCount}個の古いゲームを削除`);
            } else {
                console.log('ℹ️ 削除対象の古いゲームはありません');
            }

            // 古いプレイヤーデータもクリーンアップ
            await this.cleanupOldPlayers();

        } catch (error) {
            console.error('❌ ゲームクリーンアップエラー:', error);
        }
    }

    async cleanupOldPlayers() {
        try {
            console.log('👥 古いプレイヤーデータのクリーンアップ開始');

            // 30分以上古いプレイヤーを削除
            const cutoffTime = Date.now() - (30 * 60 * 1000); // 30分前
            const playersSnapshot = await this.database.ref('players').once('value');
            const players = playersSnapshot.val() || {};

            let deletedCount = 0;
            const deletePromises = [];

            for (const playerId in players) {
                const player = players[playerId];
                if (player.lastSeen && player.lastSeen < cutoffTime) {
                    console.log('🗑️ 古いプレイヤーを削除:', { id: playerId, name: player.name, lastSeen: new Date(player.lastSeen) });
                    deletePromises.push(this.database.ref('players/' + playerId).remove());
                    deletePromises.push(this.database.ref('queue/' + playerId).remove());
                    deletedCount++;
                }
            }

            if (deletePromises.length > 0) {
                await Promise.all(deletePromises);
                console.log(`✅ ${deletedCount}個の古いプレイヤーを削除`);
            } else {
                console.log('ℹ️ 削除対象の古いプレイヤーはありません');
            }

        } catch (error) {
            console.error('❌ プレイヤークリーンアップエラー:', error);
        }
    }

    async leaveQueue() {
        try {
            // **新機能：マッチタイプに応じてキューから削除**
            const queuePath = this.gameSettings.matchType === 'password'
                ? `passwordQueue/${this.gameSettings.roomPassword}`
                : 'queue';

            // キューから削除
            await this.database.ref(queuePath + '/' + this.playerId).remove();

            // プレイヤー状態を更新
            await this.database.ref('players/' + this.playerId).update({
                inQueue: false
            });

            this.hideQueueStatus();

        } catch (error) {
            console.error('キュー離脱エラー:', error);
        }
    }

    listenToGameStart() {
        // **新機能：マッチタイプに応じてキューを監視**
        const queuePath = this.gameSettings.matchType === 'password'
            ? `passwordQueue/${this.gameSettings.roomPassword}`
            : 'queue';

        // ゲーム開始の監視
        this.database.ref(queuePath).on('value', (snapshot) => {
            const queue = snapshot.val() || {};
            const queueArray = Object.values(queue)
                .sort((a, b) => a.timestamp - b.timestamp); // タイムスタンプでソート

            console.log('🎯 キュー状況:', {
                パス: queuePath,
                プレイヤー数: queueArray.length,
                プレイヤー: queueArray.map(p => ({
                    name: p.name,
                    timestamp: new Date(p.timestamp).toLocaleTimeString(),
                    timeLimit: p.gameSettings?.timeLimit || 30
                }))
            });

            if (queueArray.length >= 2) {
                // 自分が含まれているかチェック
                const myIndex = queueArray.findIndex(p => p.id === this.playerId);
                if (myIndex !== -1) {
                    console.log('🔍 自分のキュー位置:', myIndex);
                    // 2人揃ったらゲーム開始
                    this.tryStartGame(queueArray);
                }
            }
        });
    }

    async tryStartGame(queueArray) {
        if (queueArray.length < 2) return;

        // 最初の2人を取得（タイムスタンプ順）
        const player1 = queueArray[0]; // マスター（ゲーム作成者）
        const player2 = queueArray[1]; // セカンド（参加者）

        // 自分が含まれているかチェック
        if (player1.id !== this.playerId && player2.id !== this.playerId) return;

        // **新機能：制限時間の調整（長い方を優先）**
        const player1TimeLimit = player1.gameSettings?.timeLimit || 30;
        const player2TimeLimit = player2.gameSettings?.timeLimit || 30;
        const finalTimeLimit = Math.max(player1TimeLimit, player2TimeLimit);

        console.log('🎮 ゲーム開始処理:', {
            マスター: { id: player1.id, name: player1.name, timeLimit: player1TimeLimit },
            セカンド: { id: player2.id, name: player2.name, timeLimit: player2TimeLimit },
            最終制限時間: finalTimeLimit,
            自分: { id: this.playerId, role: player1.id === this.playerId ? 'マスター' : 'セカンド' }
        });

        // マスターのみがゲーム作成を実行
        if (player1.id === this.playerId) {
            console.log('👑 自分がマスター - ゲーム作成を開始');
            await this.createNewGame(player1, player2, finalTimeLimit);
        } else {
            console.log('👤 自分はセカンド - ゲーム作成を待機');
            await this.waitForGameCreation(player1, player2);
        }
    }

    async createNewGame(player1, player2, timeLimit) {
        // マスタープレイヤーの番号を使用して一意のゲームIDを作成
        const gameId = 'game_' + player1.timestamp + '_' + player1.id.split('_')[1];

        console.log('🆔 ゲームID生成:', gameId);

        try {
            // ゲーム状態を作成
            const gameData = {
                id: gameId,
                players: [player1.id, player2.id],
                board: Array(15).fill().map(() => Array(15).fill(0)),
                currentPlayer: 1, // 1: 黒, 2: 白
                gameState: 'playing',
                blackPlayer: player1.name,
                whitePlayer: player2.name,
                createdAt: firebase.database.ServerValue.TIMESTAMP,
                createdBy: player1.id,
                master: player1.id,
                // **新機能：ゲーム設定を保存**
                gameSettings: {
                    timeLimit: timeLimit,
                    matchType: this.gameSettings.matchType,
                    roomPassword: this.gameSettings.roomPassword
                }
            };

            console.log('🎯 ゲーム作成:', gameData);

            // ゲームをFirebaseに作成
            await this.database.ref('games/' + gameId).set(gameData);
            console.log('✅ ゲーム作成完了');

            // 後処理を実行
            await this.finalizeGameCreation(gameData, player1, player2);

        } catch (error) {
            console.error('❌ ゲーム作成エラー:', error);
            alert('ゲーム作成に失敗しました: ' + error.message);
        }
    }

    async waitForGameCreation(player1, player2) {
        console.log('⏳ マスターのゲーム作成を待機中...');

        // マスターが作成するゲームIDを予想
        const expectedGameId = 'game_' + player1.timestamp + '_' + player1.id.split('_')[1];
        console.log('🔮 予想されるゲームID:', expectedGameId);

        // 最大10秒間待機
        let attempts = 0;
        const maxAttempts = 20; // 500ms × 20 = 10秒

        const checkGameInterval = setInterval(async () => {
            attempts++;
            console.log(`🔍 ゲーム作成確認 (${attempts}/${maxAttempts})`);

            try {
                const gameSnapshot = await this.database.ref('games/' + expectedGameId).once('value');
                const gameData = gameSnapshot.val();

                if (gameData) {
                    console.log('✅ ゲーム発見 - 参加処理開始');
                    clearInterval(checkGameInterval);

                    // プレイヤー状態を更新
                    await this.database.ref('players/' + this.playerId).update({
                        inQueue: false,
                        gameId: expectedGameId
                    });

                    // キューから削除
                    await this.database.ref('queue/' + this.playerId).remove();

                    // ゲーム開始
                    this.startGame(gameData);
                    return;
                }

                if (attempts >= maxAttempts) {
                    console.error('⏰ ゲーム作成待機タイムアウト');
                    clearInterval(checkGameInterval);
                    alert('ゲーム作成を待機中にタイムアウトしました。再度お試しください。');

                    // キューから自分を削除
                    await this.database.ref('queue/' + this.playerId).remove();
                    await this.database.ref('players/' + this.playerId).update({ inQueue: false });
                    this.hideQueueStatus();
                }

            } catch (error) {
                console.error('❌ ゲーム確認エラー:', error);
                clearInterval(checkGameInterval);
            }
        }, 500); // 500ms間隔で確認
    }

    async finalizeGameCreation(gameData, player1, player2) {
        try {
            console.log('🎯 ゲーム作成後処理開始');

            // **新機能：マッチタイプに応じてキューから削除**
            const queuePath = this.gameSettings.matchType === 'password'
                ? `passwordQueue/${this.gameSettings.roomPassword}`
                : 'queue';

            // キューから両プレイヤーを削除
            await Promise.all([
                this.database.ref(queuePath + '/' + player1.id).remove(),
                this.database.ref(queuePath + '/' + player2.id).remove()
            ]);
            console.log('✅ プレイヤーをキューから削除');

            // プレイヤー状態を更新
            await Promise.all([
                this.database.ref('players/' + player1.id).update({
                    inQueue: false,
                    gameId: gameData.id
                }),
                this.database.ref('players/' + player2.id).update({
                    inQueue: false,
                    gameId: gameData.id
                })
            ]);
            console.log('✅ プレイヤー状態を更新');

            // ゲーム開始（マスターのみ）
            console.log('🚀 ゲーム開始呼び出し');
            this.startGame(gameData);

        } catch (error) {
            console.error('❌ ゲーム作成後処理エラー:', error);
        }
    }

    startGame(gameData) {
        console.log('🎮 ゲーム開始:', gameData);
        console.log('🔍 ゲーム詳細データ:', {
            gameId: gameData.id,
            players: gameData.players,
            blackPlayer: gameData.blackPlayer,
            whitePlayer: gameData.whitePlayer,
            currentPlayer: gameData.currentPlayer,
            boardInitialized: !!gameData.board,
            isCPUGame: this.isCPUGame,
            gameSettings: gameData.gameSettings
        });

        this.currentGameId = gameData.id;
        this.gameState = {
            board: gameData.board,
            currentPlayer: gameData.currentPlayer
        };

        // 自分の色を決定
        this.myColor = gameData.players[0] === this.playerId ? 1 : 2;
        this.isMyTurn = this.gameState.currentPlayer === this.myColor;

        // **新機能：制限時間を設定**
        const timeLimit = gameData.gameSettings?.timeLimit || this.gameSettings.timeLimit || 30;
        this.timeLeft = timeLimit;

        console.log('🎯 プレイヤー設定:', {
            playerId: this.playerId,
            playerName: this.playerName,
            myColor: this.myColor === 1 ? '黒(先手)' : '白(後手)',
            isMyTurn: this.isMyTurn,
            currentPlayer: this.gameState.currentPlayer,
            gameId: this.currentGameId,
            timeLimit: timeLimit,
            isCPUGame: this.isCPUGame
        });

        // Firebase接続状況を確認（CPU対戦以外）
        if (!this.isCPUGame) {
            this.database.ref('.info/connected').once('value').then((snapshot) => {
                const connected = snapshot.val();
                console.log('🌐 ゲーム開始時のFirebase接続状況:', connected ? '接続中' : '切断');
                if (!connected) {
                    alert('⚠️ Firebase接続が不安定です。ゲームの同期に問題が発生する可能性があります。');
                }
            });
        }

        // プレイヤー名の表示
        this.elements.blackPlayerName.textContent = gameData.blackPlayer;
        this.elements.whitePlayerName.textContent = gameData.whitePlayer;

        // **新機能：ゲーム設定の表示**
        this.updateGameSettingsDisplay(gameData.gameSettings || this.gameSettings);

        this.showScreen('game');
        this.drawBoard();
        this.updateTurnDisplay();

        // **新機能：制限時間に応じてタイマーを開始**
        if (timeLimit > 0) {
            if (this.isCPUGame) {
                this.startCPUTimer(timeLimit);
            } else {
                this.startSyncTimer();
            }
        } else {
            // 無制限の場合はタイマー表示を隠す
            this.elements.gameTimer.style.display = 'none';
        }

        // ゲーム状態のリアルタイム監視（CPU対戦以外）
        if (!this.isCPUGame) {
            this.stopGameUpdatesListener();
            this.listenToGameUpdates();

            // 5秒後に相手の接続状況を確認
            setTimeout(() => {
                this.checkOpponentConnection();
            }, 5000);
        } else {
            // CPU対戦の場合、CPUの手番なら自動で手を打つ
            if (!this.isMyTurn) {
                this.makeCPUMove();
            }
        }
    }

    // **新機能：ゲーム設定表示を更新**
    updateGameSettingsDisplay(settings) {
        const timeLimitText = settings.timeLimit === 0 ? '無制限' : `${settings.timeLimit}秒`;
        const matchTypeText = {
            'random': 'ランダムマッチ',
            'password': `合言葉マッチ (${settings.roomPassword})`,
            'cpu': `CPU対戦 (${settings.cpuDifficulty === 'easy' ? '初級' : '上級'})`
        }[settings.matchType] || 'ランダムマッチ';

        this.elements.gameSettings.innerHTML = `
            <div>⏱️ ${timeLimitText} | 🎯 ${matchTypeText}</div>
        `;
    }

    // **新機能：CPU用タイマー**
    startCPUTimer(timeLimit) {
        this.timeLeft = timeLimit;
        this.updateTimerDisplay();

        this.gameTimer = setInterval(() => {
            this.timeLeft--;
            this.updateTimerDisplay();

            if (this.timeLeft <= 0) {
                this.stopTimer();
                if (this.isMyTurn) {
                    this.handleTimeout();
                } else {
                    // CPUの時間切れ（通常は発生しない）
                    this.makeCPUMove();
                }
            }
        }, 1000);
    }

    // **新機能：CPU思考と手の実行**
    async makeCPUMove() {
        if (!this.cpuAI || this.isMyTurn || !this.gameState) return;

        console.log('🤖 CPU思考開始...');

        // 思考時間をシミュレート（500ms〜2000ms）
        const thinkTime = 500 + Math.random() * 1500;

        setTimeout(() => {
            const cpuColor = this.myColor === 1 ? 2 : 1;
            const move = this.cpuAI.getMove(this.gameState.board, cpuColor);

            if (move) {
                console.log('🤖 CPU手を決定:', move);
                this.makeCPUMoveInternal(move.x, move.y);
            } else {
                console.error('❌ CPUが手を見つけられませんでした');
            }
        }, thinkTime);
    }

    // **新機能：CPU内部での手の実行**
    makeCPUMoveInternal(x, y) {
        const cpuColor = this.myColor === 1 ? 2 : 1;

        if (this.gameState.board[y][x] !== 0) {
            console.error('❌ CPU: 既に石が置かれています:', x, y);
            return;
        }

        console.log(`🤖 CPU石を配置: (${x}, ${y}), 色: ${cpuColor}`);

        // 石を置く
        this.gameState.board[y][x] = cpuColor;

        // 勝利判定
        const winResult = this.checkWinner(this.gameState.board, x, y, cpuColor);

        if (winResult) {
            // ゲーム終了
            console.log('🏁 CPU勝利:', winResult);
            const result = {
                winner: cpuColor,
                reason: 'normal',
                winnerName: cpuColor === 1 ? this.elements.blackPlayerName.textContent : this.elements.whitePlayerName.textContent,
                winningLine: winResult.winningLine
            };
            this.endGame(result);
        } else {
            // 手番交代
            this.gameState.currentPlayer = this.gameState.currentPlayer === 1 ? 2 : 1;
            this.isMyTurn = this.gameState.currentPlayer === this.myColor;

            // 画面更新
            this.forceUpdateDisplay();

            // タイマーリセット
            if (this.gameSettings.timeLimit > 0) {
                this.timeLeft = this.gameSettings.timeLimit;
                this.updateTimerDisplay();
            }
        }
    }

    async checkOpponentConnection() {
        try {
            console.log('🔍 相手の接続状況を確認中...');

            // 現在のゲームデータを取得
            const gameSnapshot = await this.database.ref('games/' + this.currentGameId).once('value');
            const gameData = gameSnapshot.val();

            if (!gameData) {
                console.warn('❌ ゲームデータが見つかりません');
                return;
            }

            // 相手のプレイヤーIDを特定
            const opponentId = gameData.players.find(id => id !== this.playerId);
            console.log('🤝 相手のプレイヤーID:', opponentId);

            if (!opponentId) {
                console.warn('❌ 相手プレイヤーが見つかりません');
                return;
            }

            // 相手の接続状況を確認
            const playerSnapshot = await this.database.ref('players/' + opponentId).once('value');
            const playerData = playerSnapshot.val();

            console.log('👤 相手プレイヤー情報:', {
                exists: !!playerData,
                name: playerData?.name,
                inQueue: playerData?.inQueue,
                gameId: playerData?.gameId,
                lastSeen: playerData?.lastSeen
            });

            if (!playerData) {
                console.warn('⚠️ 相手プレイヤーがオンラインプレイヤーリストに見つかりません');
                // 通知を表示
                this.showConnectionAlert('相手プレイヤーの接続状況が不明です。同期に問題が発生する可能性があります。');
            } else if (playerData.gameId !== this.currentGameId) {
                console.warn('⚠️ 相手プレイヤーのゲームIDが一致しません:', {
                    相手のゲームID: playerData.gameId,
                    現在のゲームID: this.currentGameId
                });
                this.showConnectionAlert('相手プレイヤーとのゲーム同期に問題があります。');
            } else {
                console.log('✅ 相手プレイヤーとの接続は正常です');
            }

        } catch (error) {
            console.error('❌ 相手接続確認エラー:', error);
        }
    }

    showConnectionAlert(message) {
        const alert = document.createElement('div');
        alert.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: #ff6b35;
            color: white;
            padding: 20px 30px;
            border-radius: 10px;
            font-size: 16px;
            font-weight: bold;
            z-index: 2000;
            box-shadow: 0 8px 32px rgba(0,0,0,0.3);
            max-width: 400px;
            text-align: center;
        `;

        alert.innerHTML = `
            <div style="margin-bottom: 15px;">⚠️ 接続警告</div>
            <div style="font-weight: normal; margin-bottom: 15px;">${message}</div>
            <button onclick="this.parentNode.remove()" style="background: white; color: #ff6b35; border: none; padding: 8px 16px; border-radius: 5px; cursor: pointer; font-weight: bold;">
                確認
            </button>
        `;

        document.body.appendChild(alert);

        // 10秒後に自動で削除
        setTimeout(() => {
            if (alert.parentNode) {
                document.body.removeChild(alert);
            }
        }, 10000);
    }

    async checkCurrentGameState() {
        try {
            console.log('🔍 現在のゲーム状態を確認中...');
            const snapshot = await this.database.ref('games/' + this.currentGameId).once('value');
            const currentData = snapshot.val();

            console.log('📋 現在のFirebaseゲームデータ:', {
                exists: !!currentData,
                gameState: currentData?.gameState,
                currentPlayer: currentData?.currentPlayer,
                players: currentData?.players,
                boardHasStones: this.countStones(currentData?.board || []),
                lastMove: currentData?.lastMove
            });

            // 自分が正しくゲームに参加しているかチェック
            if (currentData && currentData.players) {
                const isPlayerInGame = currentData.players.includes(this.playerId);
                console.log('🎮 プレイヤー参加状況:', {
                    自分のID: this.playerId,
                    ゲーム内プレイヤー: currentData.players,
                    参加済み: isPlayerInGame
                });

                if (!isPlayerInGame) {
                    console.error('❌ 自分がゲームプレイヤーリストに含まれていません！');
                }
            }

        } catch (error) {
            console.error('❌ ゲーム状態確認エラー:', error);
        }
    }

    countStones(board) {
        if (!board) return 0;
        let count = 0;
        for (let y = 0; y < board.length; y++) {
            for (let x = 0; x < board[y].length; x++) {
                if (board[y][x] !== 0) count++;
            }
        }
        return count;
    }

    forceUpdateDisplay() {
        console.log('画面強制更新開始');
        try {
            // キャンバスコンテキストを再取得
            this.ctx = this.elements.gameBoard.getContext('2d');

            // ボードを強制再描画
            this.drawBoard();
            console.log('ボード再描画完了');

            // ターン表示を更新
            this.updateTurnDisplay();
            console.log('ターン表示更新完了');

            // タイマーをリセット
            this.resetTimer();
            console.log('タイマーリセット完了');

            // ブラウザの再描画を強制
            requestAnimationFrame(() => {
                console.log('ブラウザ再描画完了');
            });

        } catch (error) {
            console.error('画面更新エラー:', error);
        }
    }

    showTurnChangeNotification(wasMyTurn, isNowMyTurn) {
        // 手番変更の視覚的通知
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${isNowMyTurn ? '#4CAF50' : '#ff6b35'};
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            font-size: 16px;
            font-weight: bold;
            z-index: 1000;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            animation: slideIn 0.3s ease-out;
        `;

        notification.textContent = isNowMyTurn ? '🎯 あなたの番です！' : '⏳ 相手の番です';
        document.body.appendChild(notification);

        // 3秒後に削除
        setTimeout(() => {
            if (notification.parentNode) {
                notification.style.animation = 'slideOut 0.3s ease-in';
                setTimeout(() => {
                    if (notification.parentNode) {
                        document.body.removeChild(notification);
                    }
                }, 300);
            }
        }, 3000);

        console.log(`手番通知表示: ${isNowMyTurn ? 'あなたの番' : '相手の番'}`);
    }

    async testFirebaseWrite() {
        try {
            console.log('Firebase書き込みテスト開始...');
            const testRef = this.database.ref('games/' + this.currentGameId + '/test');
            await testRef.set({
                test: true,
                timestamp: firebase.database.ServerValue.TIMESTAMP,
                player: this.playerId
            });
            console.log('Firebase書き込みテスト成功');
            // テストデータを削除
            await testRef.remove();
        } catch (error) {
            console.error('Firebase書き込みテスト失敗:', error);
            alert('Firebase書き込み権限エラー: ' + error.message);
        }
    }

    async makeMove(x, y) {
        console.log('🎯 makeMove呼び出し:', { x, y, isMyTurn: this.isMyTurn, currentGameId: this.currentGameId, isCPUGame: this.isCPUGame });

        if (!this.isMyTurn || !this.gameState) {
            console.warn('❌ 手を打てない状態:', {
                isMyTurn: this.isMyTurn,
                gameState: !!this.gameState
            });
            return;
        }

        if (this.gameState.board[y][x] !== 0) {
            console.log('❌ 既に石が置かれています:', x, y);
            return;
        }

        console.log(`⚫ 石を配置開始: (${x}, ${y}), プレイヤー: ${this.myColor}`);

        try {
            // 石を置く
            const newBoard = this.gameState.board.map(row => [...row]);
            newBoard[y][x] = this.myColor;

            console.log('🆕 新しいボード状態作成 - 石の総数:', this.countStones(newBoard));

            // 勝利判定
            const winResult = this.checkWinner(newBoard, x, y, this.myColor);
            console.log('🏆 勝利判定結果:', winResult);

            // **新機能：CPU対戦の場合**
            if (this.isCPUGame) {
                // ローカルでゲーム状態を更新
                this.gameState.board = newBoard;

                if (winResult) {
                    // プレイヤー勝利
                    const result = {
                        winner: this.myColor,
                        reason: 'normal',
                        winnerName: this.myColor === 1 ? this.elements.blackPlayerName.textContent : this.elements.whitePlayerName.textContent,
                        winningLine: winResult.winningLine
                    };
                    this.endGame(result);
                } else {
                    // 手番交代
                    this.gameState.currentPlayer = this.gameState.currentPlayer === 1 ? 2 : 1;
                    this.isMyTurn = this.gameState.currentPlayer === this.myColor;

                    // 画面更新
                    this.forceUpdateDisplay();

                    // タイマーリセット
                    if (this.gameSettings.timeLimit > 0) {
                        this.timeLeft = this.gameSettings.timeLimit;
                        this.updateTimerDisplay();
                    }

                    // CPUの手番なら自動で手を打つ
                    if (!this.isMyTurn) {
                        this.makeCPUMove();
                    }
                }
                return;
            }

            // **オンライン対戦の場合（既存のFirebase処理）**
            const updateData = {
                board: newBoard,
                lastMove: {
                    x,
                    y,
                    player: this.myColor,
                    playerName: this.playerName,
                    timestamp: firebase.database.ServerValue.TIMESTAMP
                }
            };

            if (winResult) {
                // ゲーム終了
                updateData.gameState = 'ended';
                updateData.result = {
                    winner: winResult.winner,
                    reason: 'normal',
                    winnerName: this.myColor === 1 ? this.elements.blackPlayerName.textContent : this.elements.whitePlayerName.textContent,
                    winningLine: winResult.winningLine
                };
                console.log('🏁 勝利でゲーム終了データを準備:', updateData);
            } else {
                // 次のプレイヤーに交代
                const nextPlayer = this.gameState.currentPlayer === 1 ? 2 : 1;
                updateData.currentPlayer = nextPlayer;
                console.log(`🔄 手番交代データを準備: ${this.gameState.currentPlayer} → ${nextPlayer}`);
            }

            console.log('📤 Firebase更新開始:', {
                ゲームID: this.currentGameId,
                更新内容: {
                    boardStones: this.countStones(updateData.board),
                    currentPlayer: updateData.currentPlayer,
                    gameState: updateData.gameState,
                    lastMove: updateData.lastMove
                }
            });

            // Firebase更新前の状態を記録
            const beforeUpdate = Date.now();
            await this.database.ref('games/' + this.currentGameId).update(updateData);
            const afterUpdate = Date.now();

            console.log(`✅ Firebase更新完了 - 所要時間: ${afterUpdate - beforeUpdate}ms`);

            // 更新後の状態を再確認
            setTimeout(() => {
                this.checkCurrentGameState();
            }, 500);

        } catch (error) {
            console.error('❌ 手の送信エラー:', error);
            alert('手の送信に失敗しました: ' + error.message);
        }
    }

    checkWinner(board, lastX, lastY, color) {
        const directions = [
            [0, 1],   // 横
            [1, 0],   // 縦
            [1, 1],   // 右斜め
            [1, -1]   // 左斜め
        ];

        for (const [dx, dy] of directions) {
            let count = 1; // 置いた石を含む
            let winningLine = [[lastX, lastY]]; // 勝利ラインの座標

            // 正方向をチェック
            for (let i = 1; i < 5; i++) {
                const x = lastX + dx * i;
                const y = lastY + dy * i;
                if (x < 0 || x >= 15 || y < 0 || y >= 15 || board[y][x] !== color) break;
                count++;
                winningLine.push([x, y]);
            }

            // 負方向をチェック
            for (let i = 1; i < 5; i++) {
                const x = lastX - dx * i;
                const y = lastY - dy * i;
                if (x < 0 || x >= 15 || y < 0 || y >= 15 || board[y][x] !== color) break;
                count++;
                winningLine.unshift([x, y]); // 先頭に追加
            }

            if (count >= 5) {
                return {
                    winner: color,
                    winningLine: winningLine.slice(0, 5) // 最初の5個を勝利ライン
                };
            }
        }

        return null;
    }

    async surrender() {
        if (!confirm('本当に投了しますか？')) return;

        console.log('投了処理開始');
        try {
            const winner = this.myColor === 1 ? 2 : 1;
            const winnerName = winner === 1 ? this.elements.blackPlayerName.textContent : this.elements.whitePlayerName.textContent;
            const loserName = this.myColor === 1 ? this.elements.blackPlayerName.textContent : this.elements.whitePlayerName.textContent;

            const updateData = {
                gameState: 'ended',
                result: {
                    winner: winner,
                    reason: 'surrender',
                    winnerName: winnerName,
                    loserName: loserName,
                    surrenderedBy: this.playerId,
                    surrendererName: this.playerName,
                    winningLine: null,
                    timestamp: firebase.database.ServerValue.TIMESTAMP
                }
            };

            console.log('投了データをFirebaseに送信:', updateData);
            await this.database.ref('games/' + this.currentGameId).update(updateData);
            console.log('投了データ送信完了');

            // 投了者にも即座に結果を表示
            setTimeout(() => {
                this.endGame(updateData.result);
            }, 1000);

        } catch (error) {
            console.error('投了エラー:', error);
            alert('投了の送信に失敗しました: ' + error.message);
        }
    }

    async leaveGame() {
        if (!confirm('ゲームを離脱しますか？')) return;
        this.backToLobby();
    }

    endGame(result) {
        this.stopTimer();
        this.stopSyncTimer(); // **新機能：同期タイマーも停止**

        // **改善：最後の石を確実に描画**
        this.drawBoard();

        // **新機能：勝利演出を段階的に実行**
        this.executeVictorySequence(result);
    }

    // **新機能：勝利演出シーケンス**
    executeVictorySequence(result) {
        console.log('🎉 勝利演出開始:', result);

        // **改善：勝者・敗者関係なく最後の石を確実に描画**
        setTimeout(() => {
            this.drawBoard();
            console.log('✅ 最後の石配置確認完了');

            // 勝者判定
            const isWinner = this.isPlayerWinner(result);

            if (isWinner) {
                // **勝者側の演出**
                console.log('🏆 勝者側の演出を実行');

                // ボードにグロー効果を追加
                this.elements.gameBoard.classList.add('victory-board-glow');

                // 勝利ラインのアニメーション開始
                if (result.winningLine) {
                    this.animateWinningLine(result.winningLine);
                }

                // パーティクラッカー演出
                setTimeout(() => {
                    this.showPartyConfetti();
                }, 1000);

                // 3秒後に結果画面を表示
                setTimeout(() => {
                    this.showScreen('result');
                    // ボードのグロー効果を削除
                    this.elements.gameBoard.classList.remove('victory-board-glow');
                }, 3000);

            } else {
                // **敗者側の演出（シンプル）**
                console.log('😔 敗者側の演出を実行');

                // 勝利ラインのみ表示（アニメーションなし）
                if (result.winningLine) {
                    this.highlightWinningLineStatic(result.winningLine);
                }

                // 2秒後に結果画面を表示（短縮）
                setTimeout(() => {
                    this.showScreen('result');
                }, 2000);
            }

            // 結果メッセージの準備（勝者・敗者共通）
            this.prepareResultMessage(result);

        }, 500);
    }

    // **新機能：静的な勝利ライン表示（敗者用）**
    highlightWinningLineStatic(winningLine) {
        if (!winningLine || winningLine.length === 0) return;

        console.log('📍 静的勝利ライン表示:', winningLine);

        const ctx = this.ctx;

        // 元のボードを再描画
        this.drawBoard();

        // 静的な金色ライン
        ctx.save();
        ctx.strokeStyle = '#FFD700'; // 金色
        ctx.lineWidth = 4;
        ctx.shadowColor = '#FFD700';
        ctx.shadowBlur = 5;

        // 勝利ラインの石を強調
        winningLine.forEach(([x, y]) => {
            const centerX = x * this.cellSize + this.cellSize / 2;
            const centerY = y * this.cellSize + this.cellSize / 2;
            const radius = this.cellSize * 0.45;

            ctx.beginPath();
            ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
            ctx.stroke();
        });

        // 勝利ラインを線で結ぶ
        if (winningLine.length >= 2) {
            const startX = winningLine[0][0] * this.cellSize + this.cellSize / 2;
            const startY = winningLine[0][1] * this.cellSize + this.cellSize / 2;
            const endX = winningLine[winningLine.length - 1][0] * this.cellSize + this.cellSize / 2;
            const endY = winningLine[winningLine.length - 1][1] * this.cellSize + this.cellSize / 2;

            ctx.beginPath();
            ctx.moveTo(startX, startY);
            ctx.lineTo(endX, endY);
            ctx.stroke();
        }

        ctx.restore();
        console.log('✅ 静的勝利ライン表示完了');
    }

    // **新機能：勝者判定**
    isPlayerWinner(result) {
        if (result.winner === 'draw') return false;

        if (this.isCPUGame) {
            // CPU対戦の場合
            return result.winner === this.myColor;
        } else {
            // オンライン対戦の場合
            return result.winner === this.myColor;
        }
    }

    // **新機能：結果メッセージの準備**
    prepareResultMessage(result) {
        this.elements.resultTitle.textContent = 'ゲーム終了';

        let message = '';
        let isWinner = this.isPlayerWinner(result);

        if (result.winner === 'draw') {
            message = '引き分けです';
        } else if (isWinner) {
            message = '🎉 あなたの勝利です！ 🎉';
            if (result.reason === 'surrender') {
                message += `\n（${result.surrendererName || '相手'}が投了）`;
            } else if (result.reason === 'timeout') {
                message += '\n（相手が時間切れ）';
            }
        } else {
            message = 'あなたの敗北です';
            if (result.reason === 'surrender') {
                if (result.surrenderedBy === this.playerId) {
                    message = 'あなたが投了しました';
                } else {
                    message = `敗北です\n（${result.surrendererName || '相手'}が投了したため勝利）`;
                    isWinner = true;
                }
            } else if (result.reason === 'timeout') {
                message += '\n（時間切れ）';
            }
        }

        this.elements.resultMessage.textContent = message;

        // **新機能：勝利・敗北に応じてスタイルを変更**
        this.elements.resultMessage.style.color = isWinner ? '#4CAF50' : '#ff6b35';

        // 勝利時にアニメーションクラスを追加
        if (isWinner) {
            this.elements.resultMessage.classList.add('victory');
        } else {
            this.elements.resultMessage.classList.remove('victory');
        }
    }

    // **新機能：勝利ラインのアニメーション**
    animateWinningLine(winningLine) {
        if (!winningLine || winningLine.length === 0) return;

        console.log('✨ 勝利ラインアニメーション開始:', winningLine);

        const ctx = this.ctx;
        let animationFrame = 0;
        const maxFrames = 60; // 1秒間のアニメーション（60fps）

        const animate = () => {
            // 元のボードを再描画
            this.drawBoard();

            // アニメーション進行度（0-1）
            const progress = animationFrame / maxFrames;
            const pulseIntensity = Math.sin(progress * Math.PI * 4) * 0.5 + 0.5; // 脈動効果

            // 勝利ラインの描画
            ctx.save();

            // 金色のグラデーション
            const gradient = ctx.createLinearGradient(0, 0, this.elements.gameBoard.width, 0);
            gradient.addColorStop(0, '#FFD700');
            gradient.addColorStop(0.5, '#FFA500');
            gradient.addColorStop(1, '#FFD700');

            ctx.strokeStyle = gradient;
            ctx.lineWidth = 6 + pulseIntensity * 4; // 脈動する線幅
            ctx.shadowColor = '#FFD700';
            ctx.shadowBlur = 10 + pulseIntensity * 10;

            // 勝利ラインの石を強調
            winningLine.forEach(([x, y], index) => {
                const centerX = x * this.cellSize + this.cellSize / 2;
                const centerY = y * this.cellSize + this.cellSize / 2;
                const radius = this.cellSize * 0.45 + pulseIntensity * 5;

                // 遅延効果で順番に光らせる
                const stoneDelay = index * 0.1;
                if (progress >= stoneDelay) {
                    ctx.beginPath();
                    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
                    ctx.stroke();
                }
            });

            // 勝利ラインを線で結ぶ
            if (winningLine.length >= 2 && progress > 0.3) {
                const startX = winningLine[0][0] * this.cellSize + this.cellSize / 2;
                const startY = winningLine[0][1] * this.cellSize + this.cellSize / 2;
                const endX = winningLine[winningLine.length - 1][0] * this.cellSize + this.cellSize / 2;
                const endY = winningLine[winningLine.length - 1][1] * this.cellSize + this.cellSize / 2;

                ctx.beginPath();
                ctx.moveTo(startX, startY);
                ctx.lineTo(endX, endY);
                ctx.stroke();
            }

            ctx.restore();

            animationFrame++;
            if (animationFrame <= maxFrames) {
                requestAnimationFrame(animate);
            } else {
                console.log('✅ 勝利ラインアニメーション完了');
            }
        };

        animate();
    }

    // **新機能：パーティクラッカー演出**
    showPartyConfetti() {
        console.log('🎊 パーティクラッカー演出開始');

        // パーティクル用のキャンバスを作成
        const confettiCanvas = document.createElement('canvas');
        confettiCanvas.style.position = 'fixed';
        confettiCanvas.style.top = '0';
        confettiCanvas.style.left = '0';
        confettiCanvas.style.width = '100vw';
        confettiCanvas.style.height = '100vh';
        confettiCanvas.style.pointerEvents = 'none';
        confettiCanvas.style.zIndex = '9999';
        confettiCanvas.width = window.innerWidth;
        confettiCanvas.height = window.innerHeight;

        document.body.appendChild(confettiCanvas);

        const ctx = confettiCanvas.getContext('2d');
        const particles = [];
        const colors = ['#FFD700', '#FF6B35', '#4CAF50', '#2196F3', '#9C27B0', '#FF5722'];

        // パーティクルを生成
        for (let i = 0; i < 150; i++) {
            particles.push({
                x: Math.random() * confettiCanvas.width,
                y: -10,
                vx: (Math.random() - 0.5) * 8,
                vy: Math.random() * 3 + 2,
                color: colors[Math.floor(Math.random() * colors.length)],
                size: Math.random() * 8 + 4,
                rotation: Math.random() * 360,
                rotationSpeed: (Math.random() - 0.5) * 10,
                gravity: 0.1,
                life: 1.0,
                decay: Math.random() * 0.02 + 0.01
            });
        }

        let animationId;

        const animateConfetti = () => {
            ctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);

            for (let i = particles.length - 1; i >= 0; i--) {
                const p = particles[i];

                // 物理演算
                p.vy += p.gravity;
                p.x += p.vx;
                p.y += p.vy;
                p.rotation += p.rotationSpeed;
                p.life -= p.decay;

                // 描画
                ctx.save();
                ctx.globalAlpha = p.life;
                ctx.translate(p.x, p.y);
                ctx.rotate(p.rotation * Math.PI / 180);
                ctx.fillStyle = p.color;

                // 四角形のパーティクル
                ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);

                ctx.restore();

                // 寿命が尽きたパーティクルを削除
                if (p.life <= 0 || p.y > confettiCanvas.height + 50) {
                    particles.splice(i, 1);
                }
            }

            if (particles.length > 0) {
                animationId = requestAnimationFrame(animateConfetti);
            } else {
                // アニメーション終了
                document.body.removeChild(confettiCanvas);
                console.log('✅ パーティクラッカー演出完了');
            }
        };

        animateConfetti();

        // 勝利サウンド効果（ブラウザ対応）
        this.playVictorySound();

        // 5秒後に強制終了
        setTimeout(() => {
            if (confettiCanvas.parentNode) {
                cancelAnimationFrame(animationId);
                document.body.removeChild(confettiCanvas);
            }
        }, 5000);
    }

    // **新機能：勝利サウンド**
    playVictorySound() {
        try {
            // Web Audio APIを使用した簡単な勝利音
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();

            // 勝利のメロディー（ドミソド）
            const notes = [261.63, 329.63, 392.00, 523.25]; // C4, E4, G4, C5

            notes.forEach((frequency, index) => {
                const oscillator = audioContext.createOscillator();
                const gainNode = audioContext.createGain();

                oscillator.connect(gainNode);
                gainNode.connect(audioContext.destination);

                oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
                oscillator.type = 'triangle';

                const startTime = audioContext.currentTime + index * 0.2;
                const duration = 0.3;

                gainNode.gain.setValueAtTime(0, startTime);
                gainNode.gain.linearRampToValueAtTime(0.1, startTime + 0.05);
                gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration);

                oscillator.start(startTime);
                oscillator.stop(startTime + duration);
            });

            console.log('🔊 勝利サウンド再生');
        } catch (error) {
            console.log('🔇 サウンド再生をスキップ:', error.message);
        }
    }

    highlightWinningLine(winningLine) {
        // この関数は animateWinningLine に置き換えられました
        console.log('highlightWinningLine は animateWinningLine に置き換えられました');
    }

    async backToLobby() {
        this.stopTimer();
        this.stopSyncTimer(); // **新機能：同期タイマーも停止**

        // ゲーム状態の監視を停止
        this.stopGameUpdatesListener();

        // プレイヤー状態をリセット
        if (this.database && this.playerId) {
            try {
                await this.database.ref('players/' + this.playerId).update({
                    inQueue: false,
                    gameId: null
                });
                console.log('プレイヤー状態をリセット');
            } catch (error) {
                console.error('ロビー戻りエラー:', error);
            }
        }

        this.currentGameId = null;
        this.gameState = null;
        this.showScreen('lobby');
        this.hideQueueStatus();
        console.log('ロビーに戻りました');
    }

    playAgain() {
        this.showScreen('lobby');
        this.joinGame();
    }

    showQueueStatus() {
        this.elements.joinGameBtn.style.display = 'none';
        this.elements.leaveQueueBtn.style.display = 'inline-block';

        // **新機能：マッチタイプに応じてメッセージを変更**
        let statusMessage = 'マッチング中...';
        if (this.gameSettings.matchType === 'password') {
            statusMessage = `合言葉「${this.gameSettings.roomPassword}」でマッチング中...`;
        }

        this.elements.lobbyStatus.textContent = statusMessage;
        this.elements.lobbyStatus.style.background = 'rgba(255, 193, 7, 0.9)';
    }

    hideQueueStatus() {
        this.elements.joinGameBtn.style.display = 'inline-block';
        this.elements.leaveQueueBtn.style.display = 'none';
        this.elements.lobbyStatus.textContent = '';
        this.elements.lobbyStatus.style.background = '';
    }

    showScreen(screenName) {
        Object.keys(this.screens).forEach(name => {
            this.screens[name].classList.toggle('active', name === screenName);
        });
    }

    // ゲームボード関連（元のコードと同じ）
    initializeBoard() {
        this.elements.gameBoard.width = this.boardSize * this.cellSize;
        this.elements.gameBoard.height = this.boardSize * this.cellSize;
        this.drawBoard();
    }

    drawBoard() {
        console.log('drawBoard開始');
        const ctx = this.ctx;
        const size = this.cellSize;

        if (!ctx) {
            console.error('キャンバスコンテキストが取得できません');
            return;
        }

        // 背景をクリア
        ctx.clearRect(0, 0, this.elements.gameBoard.width, this.elements.gameBoard.height);
        console.log('キャンバスクリア完了');

        // 格子を描画
        ctx.strokeStyle = '#8B4513';
        ctx.lineWidth = 2;

        for (let i = 0; i < this.boardSize; i++) {
            // 縦線
            ctx.beginPath();
            ctx.moveTo(i * size + size / 2, size / 2);
            ctx.lineTo(i * size + size / 2, (this.boardSize - 1) * size + size / 2);
            ctx.stroke();

            // 横線
            ctx.beginPath();
            ctx.moveTo(size / 2, i * size + size / 2);
            ctx.lineTo((this.boardSize - 1) * size + size / 2, i * size + size / 2);
            ctx.stroke();
        }

        // 天元と星を描画
        const starPositions = [
            [3, 3], [3, 11], [11, 3], [11, 11], // 四隅の星
            [7, 7] // 天元
        ];

        ctx.fillStyle = '#8B4513';
        starPositions.forEach(([x, y]) => {
            ctx.beginPath();
            ctx.arc(x * size + size / 2, y * size + size / 2, 4, 0, 2 * Math.PI);
            ctx.fill();
        });

        console.log('格子と星の描画完了');

        // 石を描画
        if (this.gameState && this.gameState.board) {
            let stoneCount = 0;
            for (let y = 0; y < this.boardSize; y++) {
                for (let x = 0; x < this.boardSize; x++) {
                    const stone = this.gameState.board[y][x];
                    if (stone !== 0) {
                        this.drawStone(x, y, stone);
                        stoneCount++;
                    }
                }
            }
            console.log(`石の描画完了: ${stoneCount}個`);
        } else {
            console.log('ゲーム状態またはボードが未定義');
        }

        console.log('drawBoard完了');
    }

    drawStone(x, y, color) {
        const ctx = this.ctx;
        const centerX = x * this.cellSize + this.cellSize / 2;
        const centerY = y * this.cellSize + this.cellSize / 2;
        const radius = this.cellSize * 0.4;

        // 影を描画
        ctx.beginPath();
        ctx.arc(centerX + 2, centerY + 2, radius, 0, 2 * Math.PI);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.fill();

        // 石を描画
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);

        if (color === 1) { // 黒石
            ctx.fillStyle = '#000';
            ctx.fill();
            ctx.strokeStyle = '#333';
            ctx.lineWidth = 1;
            ctx.stroke();
        } else { // 白石
            ctx.fillStyle = '#fff';
            ctx.fill();
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 2;
            ctx.stroke();
        }
    }

    handleBoardClick(event) {
        if (!this.isMyTurn || !this.gameState) return;

        const coords = this.getBoardCoordinates(event.clientX, event.clientY);
        if (coords) {
            this.makeMove(coords.x, coords.y);
        }
    }

    // スマホのタッチイベント用のハンドラー
    handleBoardTouch(event) {
        if (!this.isMyTurn || !this.gameState) return;

        const touch = event.touches[0] || event.changedTouches[0];
        if (touch) {
            const coords = this.getBoardCoordinates(touch.clientX, touch.clientY);
            if (coords) {
                this.makeMove(coords.x, coords.y);
            }
        }
    }

    // 正確な座標変換を行う関数（CSS拡大縮小、デバイスピクセル比対応）
    getBoardCoordinates(clientX, clientY) {
        const canvas = this.elements.gameBoard;
        const rect = canvas.getBoundingClientRect();

        // Canvas実際のサイズと表示サイズの比率を計算
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;

        // 相対座標を計算（CSS変換考慮）
        const canvasX = (clientX - rect.left) * scaleX;
        const canvasY = (clientY - rect.top) * scaleY;

        // ボードの座標に変換
        const boardX = Math.floor(canvasX / this.cellSize);
        const boardY = Math.floor(canvasY / this.cellSize);

        // 有効範囲チェック
        if (boardX >= 0 && boardX < this.boardSize && boardY >= 0 && boardY < this.boardSize) {
            console.log(`📍 座標変換: タッチ(${clientX}, ${clientY}) → Canvas(${canvasX}, ${canvasY}) → Board(${boardX}, ${boardY})`);
            return { x: boardX, y: boardY };
        }

        return null;
    }

    updateTurnDisplay() {
        if (!this.gameState) return;

        const currentPlayerName = this.gameState.currentPlayer === 1 ?
            this.elements.blackPlayerName.textContent :
            this.elements.whitePlayerName.textContent;

        this.elements.currentTurn.textContent = this.isMyTurn ?
            'あなたの番です' : `${currentPlayerName}の番です`;

        this.elements.currentTurn.style.color = this.isMyTurn ? '#4CAF50' : '#ff6b35';
    }

    startTimer() {
        // 従来のタイマーは使わず、同期タイマーのみ使用
        console.log('従来のタイマーは同期タイマーに置き換えられます');
    }

    resetTimer() {
        // 同期タイマーの場合、手番変更時に自動リセット
        console.log('同期タイマーは手番変更時に自動リセットされます');
    }

    stopTimer() {
        if (this.gameTimer) {
            clearInterval(this.gameTimer);
            this.gameTimer = null;
        }
    }

    updateTimerDisplay() {
        this.elements.gameTimer.textContent = `残り時間: ${this.timeLeft}秒`;
        if (this.timeLeft <= 10) {
            this.elements.gameTimer.style.color = '#dc3545';
            // 時間切れ警告のスタイル追加
            this.elements.gameTimer.style.animation = this.timeLeft <= 5 ? 'pulse 1s infinite' : 'none';
        } else {
            this.elements.gameTimer.style.color = '#ff6b35';
            this.elements.gameTimer.style.animation = 'none';
        }
    }

    async cleanupGameData() {
        if (!this.currentGameId) return;

        console.log('ゲームデータクリーンアップ開始:', this.currentGameId);
        try {
            // ゲームデータを削除
            await this.database.ref('games/' + this.currentGameId).remove();

            // プレイヤー状態をクリーンアップ
            const playersRef = this.database.ref('players');
            const playersSnapshot = await playersRef.once('value');
            const players = playersSnapshot.val() || {};

            for (const playerId in players) {
                if (players[playerId].gameId === this.currentGameId) {
                    await this.database.ref('players/' + playerId).update({
                        inQueue: false,
                        gameId: null
                    });
                }
            }

            console.log('ゲームデータクリーンアップ完了');
        } catch (error) {
            console.error('ゲームデータクリーンアップエラー:', error);
        }
    }

    // **新機能：同期タイマー**
    startSyncTimer() {
        console.log('⏱️ 同期タイマー開始');

        // 既存のタイマーを停止
        this.stopSyncTimer();

        // タイマー状態をFirebaseで管理
        this.timerSyncRef = this.database.ref('games/' + this.currentGameId + '/timer');

        // 自分の番の場合、タイマーを初期化
        if (this.isMyTurn) {
            console.log('👤 自分の番 - タイマー初期化');
            this.timerSyncRef.set({
                timeLeft: 30,
                currentPlayer: this.myColor,
                lastUpdate: firebase.database.ServerValue.TIMESTAMP
            });
        }

        // タイマー状態の監視
        this.timerSyncRef.on('value', (snapshot) => {
            const timerData = snapshot.val();
            if (timerData) {
                this.syncTimerUpdate(timerData);
            }
        });
    }

    syncTimerUpdate(timerData) {
        // 現在の手番プレイヤーが変わった場合、タイマーをリセット
        if (timerData.currentPlayer !== this.gameState.currentPlayer) {
            console.log('🔄 手番変更によるタイマーリセット');
            if (this.isMyTurn) {
                this.timerSyncRef.update({
                    timeLeft: 30,
                    currentPlayer: this.myColor,
                    lastUpdate: firebase.database.ServerValue.TIMESTAMP
                });
            }
            return;
        }

        // 自分の番の場合、カウントダウンを管理
        if (this.isMyTurn && timerData.currentPlayer === this.myColor) {
            this.timeLeft = timerData.timeLeft;
            this.updateTimerDisplay();

            if (this.timeLeft <= 0) {
                console.log('⏰ 時間切れ - ランダム配置実行');
                this.handleTimeout();
            } else if (!this.gameTimer) {
                // タイマーが動いていない場合、開始
                this.gameTimer = setInterval(() => {
                    this.timeLeft--;
                    this.timerSyncRef.update({
                        timeLeft: this.timeLeft,
                        lastUpdate: firebase.database.ServerValue.TIMESTAMP
                    });

                    if (this.timeLeft <= 0) {
                        this.stopTimer();
                        this.handleTimeout();
                    }
                }, 1000);
            }
        } else {
            // 相手の番の場合、表示のみ更新
            this.timeLeft = timerData.timeLeft;
            this.updateTimerDisplay();
        }
    }

    stopSyncTimer() {
        if (this.timerSyncRef) {
            this.timerSyncRef.off('value');
            this.timerSyncRef = null;
        }
        this.stopTimer();
    }

    // **新機能：時間切れ時のランダム配置**
    async handleTimeout() {
        console.log('⏰ 時間切れ処理開始');

        if (!this.isMyTurn || !this.gameState) {
            console.log('❌ 時間切れ処理：条件不適合');
            return;
        }

        // 空いている位置を探す
        const emptyPositions = [];
        for (let y = 0; y < this.boardSize; y++) {
            for (let x = 0; x < this.boardSize; x++) {
                if (this.gameState.board[y][x] === 0) {
                    emptyPositions.push({ x, y });
                }
            }
        }

        if (emptyPositions.length === 0) {
            console.log('❌ 空いている位置がありません');
            return;
        }

        // ランダムな位置を選択
        const randomIndex = Math.floor(Math.random() * emptyPositions.length);
        const { x, y } = emptyPositions[randomIndex];

        console.log(`🎲 ランダム配置: (${x}, ${y})`);

        // タイムアウト通知を表示
        this.showTimeoutNotification(x, y);

        // 1秒後にランダム配置を実行
        setTimeout(() => {
            this.makeMove(x, y);
        }, 1000);
    }

    showTimeoutNotification(x, y) {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: #ff6b35;
            color: white;
            padding: 20px 30px;
            border-radius: 10px;
            font-size: 16px;
            font-weight: bold;
            z-index: 2000;
            box-shadow: 0 8px 32px rgba(0,0,0,0.3);
            text-align: center;
        `;

        notification.innerHTML = `
            <div style="margin-bottom: 10px;">⏰ 時間切れ</div>
            <div style="font-size: 14px; font-weight: normal;">ランダムな位置 (${x + 1}, ${y + 1}) に石を配置します</div>
        `;

        document.body.appendChild(notification);

        // 3秒後に自動で削除
        setTimeout(() => {
            if (notification.parentNode) {
                document.body.removeChild(notification);
            }
        }, 3000);
    }

    stopGameUpdatesListener() {
        if (this.currentGameId && this.database) {
            console.log('既存のゲーム監視を停止:', this.currentGameId);
            this.database.ref('games/' + this.currentGameId).off('value');
        }
    }

    listenToGameUpdates() {
        if (!this.currentGameId) {
            console.error('ゲームIDが設定されていません');
            return;
        }

        console.log('ゲーム状態の監視を開始:', this.currentGameId);
        console.log('プレイヤー情報:', {
            playerId: this.playerId,
            playerName: this.playerName,
            myColor: this.myColor
        });

        // Firebase書き込みテスト
        this.testFirebaseWrite();

        // ゲームデータの現在の状態を確認
        this.checkCurrentGameState();

        const gameRef = this.database.ref('games/' + this.currentGameId);

        // リスナーが正常に設定されたかログ出力
        console.log('Firebaseリスナー設定開始 - ゲームID:', this.currentGameId);

        gameRef.on('value', (snapshot) => {
            const gameData = snapshot.val();
            console.log('=== Firebase更新通知受信 ===');
            console.log('受信時刻:', new Date().toLocaleTimeString());
            console.log('スナップショット存在:', !!snapshot);
            console.log('ゲームデータ存在:', !!gameData);

            if (!gameData) {
                console.warn('❌ ゲームデータが見つかりません - ゲーム削除またはIDエラー');
                return;
            }

            console.log('📊 受信データ詳細:', {
                gameState: gameData.gameState,
                currentPlayer: gameData.currentPlayer,
                boardExists: !!gameData.board,
                players: gameData.players,
                lastMove: gameData.lastMove,
                timestamp: new Date().toLocaleTimeString()
            });

            if (gameData.gameState === 'ended') {
                console.log('🏁 ゲーム終了:', gameData.result);
                this.cleanupGameData();
                this.endGame(gameData.result);
                return;
            }

            // ゲーム状態を更新
            const previousPlayer = this.gameState ? this.gameState.currentPlayer : null;
            this.gameState = {
                board: gameData.board,
                currentPlayer: gameData.currentPlayer
            };

            const previousTurn = this.isMyTurn;
            this.isMyTurn = this.gameState.currentPlayer === this.myColor;

            console.log('🔄 手番更新:', {
                前の手番: previousPlayer,
                現在の手番: this.gameState.currentPlayer,
                自分の色: this.myColor,
                自分の番: this.isMyTurn,
                手番変更: previousPlayer !== this.gameState.currentPlayer
            });

            // 手番が変わった場合の処理
            if (previousPlayer !== null && previousPlayer !== this.gameState.currentPlayer) {
                console.log('✅ 手番変更を検出 - 画面更新実行');
                this.showTurnChangeNotification(previousTurn, this.isMyTurn);

                // **新機能：手番変更時にタイマーをリセット**
                if (this.isMyTurn && this.timerSyncRef) {
                    this.timerSyncRef.update({
                        timeLeft: gameData.gameSettings?.timeLimit || 30,
                        currentPlayer: this.myColor,
                        lastUpdate: firebase.database.ServerValue.TIMESTAMP
                    });
                }
            } else {
                console.log('ℹ️ 手番変更なし - 初期化または同じ手番');
            }

            // 強制的に画面を更新
            this.forceUpdateDisplay();

        }, (error) => {
            console.error('❌ ゲーム状態の監視エラー:', error);
            console.error('エラー詳細:', {
                code: error.code,
                message: error.message,
                gameId: this.currentGameId
            });
            alert('ゲーム同期エラー: ' + error.message);
        });

        // リスナー設定完了をログ
        console.log('✅ Firebaseリスナー設定完了');
    }
}

// ページ読み込み完了後にクライアントを初期化
document.addEventListener('DOMContentLoaded', () => {
    // DOMが完全に読み込まれた後、少し待ってから初期化
    setTimeout(() => {
        new GomokuFirebase();
    }, 200);
});
