// Firebase設定 - オセロ専用の新しいプロジェクト設定
const firebaseConfig = {
    apiKey: "AIzaSyAb_MdSdGZ1Pnr2o4sszSTlIteWKoQpAJQ",
    authDomain: "othello-online-2024.firebaseapp.com",
    databaseURL: "https://othello-online-2024-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "othello-online-2024",
    storageBucket: "othello-online-2024.firebasestorage.app",
    messagingSenderId: "807909379241",
    appId: "1:807909379241:web:1fddb480c7862ebaf92db8"
};

class OthelloFirebase {
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
        this.isCpuGame = false;
        this.cpuDifficulty = 'easy';
        this.cpuThinking = false;
        this.gameMode = 'pvp'; // 'pvp' or 'cpu'
        
        // オセロ特有の設定
        this.boardSize = 8;
        this.cellSize = 60;
        
        // CPU強度設定
        this.cpuSettings = {
            easy: { thinkTime: 500, depth: 1, name: '初心者レベル - CPU思考時間: 0.5秒' },
            normal: { thinkTime: 1000, depth: 2, name: '中級者レベル - CPU思考時間: 1秒' },
            hard: { thinkTime: 1500, depth: 3, name: '上級者レベル - CPU思考時間: 1.5秒' },
            expert: { thinkTime: 2000, depth: 4, name: 'エキスパートレベル - CPU思考時間: 2秒' }
        };
        
        // 操作制限フラグ
        this.isProcessingMove = false;
        this.isGameEnded = false;
        
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
            
            console.log('Firebase初期化完了 (Othello)');
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
            console.log('デモモード（CPU対戦のみ）で動作します');
        }
    }

    generatePlayerId() {
        return 'othello_player_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
    }

    async testConnection() {
        if (!this.database) return;
        
        try {
            console.log('Firebase接続テスト開始...');
            await this.database.ref('.info/connected').once('value');
            console.log('Firebase接続テスト成功');
        } catch (error) {
            console.error('Firebase接続テスト失敗:', error);
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
            pvpModeBtn: document.getElementById('pvpModeBtn'),
            cpuModeBtn: document.getElementById('cpuModeBtn'),
            cpuDifficultySection: document.getElementById('cpuDifficultySection'),
            easyBtn: document.getElementById('easyBtn'),
            normalBtn: document.getElementById('normalBtn'),
            hardBtn: document.getElementById('hardBtn'),
            expertBtn: document.getElementById('expertBtn'),
            difficultyDesc: document.getElementById('difficultyDesc'),
            joinGameBtn: document.getElementById('joinGameBtn'),
            leaveQueueBtn: document.getElementById('leaveQueueBtn'),
            lobbyStatus: document.getElementById('lobbyStatus'),
            playerCount: document.getElementById('playerCount'),
            playersUL: document.getElementById('playersUL'),
            gameBoard: document.getElementById('gameBoard'),
            blackPlayerName: document.getElementById('blackPlayerName'),
            whitePlayerName: document.getElementById('whitePlayerName'),
            blackCount: document.getElementById('blackCount'),
            whiteCount: document.getElementById('whiteCount'),
            currentTurn: document.getElementById('currentTurn'),
            gameTimer: document.getElementById('gameTimer'),
            cpuThinking: document.getElementById('cpuThinking'),
            passBtn: document.getElementById('passBtn'),
            surrenderBtn: document.getElementById('surrenderBtn'),
            leaveGameBtn: document.getElementById('leaveGameBtn'),
            resultTitle: document.getElementById('resultTitle'),
            resultMessage: document.getElementById('resultMessage'),
            finalBlackCount: document.getElementById('finalBlackCount'),
            finalWhiteCount: document.getElementById('finalWhiteCount'),
            backToLobbyBtn: document.getElementById('backToLobbyBtn'),
            playAgainBtn: document.getElementById('playAgainBtn'),
            connectionIndicator: document.getElementById('connectionIndicator'),
            connectionText: document.getElementById('connectionText')
        };

        // イベントリスナーの設定
        this.setupEventListeners();

        // キャンバスの初期化
        this.ctx = this.elements.gameBoard.getContext('2d');
        this.initializeBoard();

        // プレイヤーリストのリアルタイム監視
        this.listenToPlayersUpdate();
    }

    setupEventListeners() {
        // ゲームモード選択
        this.elements.pvpModeBtn.addEventListener('click', () => this.selectGameMode('pvp'));
        this.elements.cpuModeBtn.addEventListener('click', () => this.selectGameMode('cpu'));
        
        // CPU強度選択
        this.elements.easyBtn.addEventListener('click', () => this.selectCpuDifficulty('easy'));
        this.elements.normalBtn.addEventListener('click', () => this.selectCpuDifficulty('normal'));
        this.elements.hardBtn.addEventListener('click', () => this.selectCpuDifficulty('hard'));
        this.elements.expertBtn.addEventListener('click', () => this.selectCpuDifficulty('expert'));
        
        // ゲーム操作
        this.elements.joinGameBtn.addEventListener('click', () => this.joinGame());
        this.elements.leaveQueueBtn.addEventListener('click', () => this.leaveQueue());
        this.elements.passBtn.addEventListener('click', () => this.passMove());
        this.elements.surrenderBtn.addEventListener('click', () => this.surrender());
        this.elements.leaveGameBtn.addEventListener('click', () => this.leaveGame());
        this.elements.backToLobbyBtn.addEventListener('click', () => this.backToLobby());
        this.elements.playAgainBtn.addEventListener('click', () => this.playAgain());
        // ゲームボード（クリック＋タッチ対応）
        this.elements.gameBoard.addEventListener('click', (e) => this.handleBoardInteraction(e));
        this.elements.gameBoard.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.handleBoardInteraction(e.touches[0]);
        });
        
        // タッチデバイスでのダブルタップズーム防止
        this.elements.gameBoard.addEventListener('touchend', (e) => {
            e.preventDefault();
        });

        // プレイヤー名の入力処理
        this.elements.playerName.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.joinGame();
            }
        });
    }

    selectGameMode(mode) {
        this.gameMode = mode;
        
        // ボタンの状態を更新
        this.elements.pvpModeBtn.classList.toggle('active', mode === 'pvp');
        this.elements.cpuModeBtn.classList.toggle('active', mode === 'cpu');
        
        // CPU強度選択の表示/非表示
        this.elements.cpuDifficultySection.style.display = mode === 'cpu' ? 'block' : 'none';
        
        // ボタンテキストを更新
        this.elements.joinGameBtn.textContent = mode === 'cpu' ? 'CPU対戦開始' : 'ゲームに参加';
    }

    selectCpuDifficulty(difficulty) {
        this.cpuDifficulty = difficulty;
        
        // ボタンの状態を更新
        ['easy', 'normal', 'hard', 'expert'].forEach(level => {
            this.elements[level + 'Btn'].classList.toggle('active', level === difficulty);
        });
        
        // 説明文を更新
        this.elements.difficultyDesc.textContent = this.cpuSettings[difficulty].name;
    }

    updateConnectionStatus(connected) {
        if (!this.elements || !this.elements.connectionIndicator || !this.elements.connectionText) {
            return;
        }
        
        if (connected) {
            this.elements.connectionIndicator.className = 'indicator connected';
            this.elements.connectionText.textContent = 'Firebase接続済み';
        } else {
            this.elements.connectionIndicator.className = 'indicator disconnected';
            this.elements.connectionText.textContent = 'Firebase未接続（CPU対戦のみ）';
        }
    }

    listenToPlayersUpdate() {
        if (!this.database) {
            // デモ用のプレイヤーリスト
            this.updatePlayersList([{id: 'demo', name: 'Demo Player', inQueue: false}]);
            return;
        }

        // オンラインプレイヤーのリアルタイム監視
        this.database.ref('othello_players').on('value', (snapshot) => {
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

        this.playerName = name;

        if (this.gameMode === 'cpu') {
            // CPU対戦の場合
            this.startCpuGame();
        } else {
            // オンライン対戦の場合
            if (!this.database) {
                alert('オンライン対戦にはFirebase設定が必要です。CPU対戦モードをお試しください。');
                return;
            }
            this.startOnlineGame();
        }
    }

    startCpuGame() {
        // CPU対戦用のゲーム状態を初期化
        this.gameState = {
            board: this.createInitialBoard(),
            currentPlayer: 1, // 1: 黒（プレイヤー）, 2: 白（CPU）
            blackPlayer: this.playerName,
            whitePlayer: `CPU (${this.cpuDifficulty.toUpperCase()})`,
            gameState: 'playing'
        };
        
        this.myColor = 1; // プレイヤーは常に黒
        this.isMyTurn = true;
        this.isCpuGame = true;
        
        this.startGame(this.gameState);
    }

    async startOnlineGame() {
        try {
            // プレイヤー情報をデータベースに登録
            await this.database.ref('othello_players/' + this.playerId).set({
                id: this.playerId,
                name: this.playerName,
                inQueue: true,
                gameId: null,
                timestamp: firebase.database.ServerValue.TIMESTAMP
            });

            // キューに追加
            await this.database.ref('othello_queue/' + this.playerId).set({
                id: this.playerId,
                name: this.playerName,
                timestamp: firebase.database.ServerValue.TIMESTAMP
            });

            this.showQueueStatus();
            this.listenToGameStart();

        } catch (error) {
            console.error('ゲーム参加エラー:', error);
            alert('ゲームに参加できませんでした: ' + error.message);
        }
    }

    createInitialBoard() {
        const board = Array(8).fill().map(() => Array(8).fill(0));
        // 初期配置
        board[3][3] = 2; // 白
        board[3][4] = 1; // 黒
        board[4][3] = 1; // 黒
        board[4][4] = 2; // 白
        return board;
    }

    startGame(gameData) {
        this.gameState = gameData;
        this.elements.blackPlayerName.textContent = gameData.blackPlayer;
        this.elements.whitePlayerName.textContent = gameData.whitePlayer;
        
        this.showScreen('game');
        this.drawBoard();
        this.updateStoneCount();
        this.updateTurnDisplay();
        this.startTimer();
        
        if (!this.isCpuGame) {
            this.listenToGameUpdates();
        }
    }

    async makeMove(x, y, isCpuMove = false) {
        console.log('makeMove called:', {
            x, y, isCpuMove,
            isProcessingMove: this.isProcessingMove,
            isGameEnded: this.isGameEnded,
            isMyTurn: this.isMyTurn,
            cpuThinking: this.cpuThinking,
            currentPlayer: this.gameState?.currentPlayer
        });
        
        // 連打防止と基本チェック
        if (this.isProcessingMove || this.isGameEnded || !this.gameState) {
            console.log('Move blocked - basic conditions failed');
            return;
        }
        
        // プレイヤーの手の場合は追加チェック
        if (!isCpuMove && (!this.isMyTurn || this.cpuThinking)) {
            console.log('Player move blocked - not player turn or CPU thinking');
            return;
        }

        if (!this.canMakeMove(x, y)) {
            console.log('Invalid move - canMakeMove returned false');
            return;
        }

        this.isProcessingMove = true;

        try {
            const flippedStones = this.getFlippedStones(x, y, this.gameState.currentPlayer);
            if (flippedStones.length === 0) {
                console.log('No stones to flip');
                this.isProcessingMove = false;
                return;
            }

            console.log('Executing move:', {
                x, y,
                currentPlayer: this.gameState.currentPlayer,
                flippedStones: flippedStones.length
            });

            // 石を置く
            this.gameState.board[y][x] = this.gameState.currentPlayer;
            
            // ひっくり返す
            flippedStones.forEach(([fx, fy]) => {
                this.gameState.board[fy][fx] = this.gameState.currentPlayer;
            });

            this.drawBoard();
            this.updateStoneCount();

            // ターンを切り替え
            this.gameState.currentPlayer = this.gameState.currentPlayer === 1 ? 2 : 1;
            
            if (this.isCpuGame) {
                this.isMyTurn = (this.gameState.currentPlayer === this.myColor);
                this.updateTurnDisplay();
                this.resetTimer();
                
                console.log('Turn switched:', {
                    currentPlayer: this.gameState.currentPlayer,
                    myColor: this.myColor,
                    isMyTurn: this.isMyTurn
                });
                
                if (!this.isMyTurn && !isCpuMove) {
                    // プレイヤーの手の後にCPUの番
                    console.log('Calling CPU move after player move');
                    setTimeout(() => {
                        if (!this.isGameEnded && !this.cpuThinking) {
                            this.makeCpuMove();
                        }
                    }, 800);
                }
            } else {
                // オンライン対戦の場合は状態をFirebaseに送信
                if (this.database && this.currentGameId) {
                    await this.database.ref('othello_games/' + this.currentGameId).update({
                        board: this.gameState.board,
                        currentPlayer: this.gameState.currentPlayer,
                        lastMove: { x, y, player: this.myColor }
                    });
                }
            }

            // ゲーム終了チェック
            this.checkGameEnd();
        } catch (error) {
            console.error('手を打つ際のエラー:', error);
        } finally {
            this.isProcessingMove = false;
        }
    }

    async makeCpuMove() {
        console.log('=== CPU MOVE START ===');
        
        // 基本条件チェック
        if (this.cpuThinking || this.isGameEnded || !this.isCpuGame) {
            console.log('CPU move blocked:', {
                cpuThinking: this.cpuThinking,
                isGameEnded: this.isGameEnded,
                isCpuGame: this.isCpuGame
            });
            return;
        }
        
        // CPUのターンでない場合、強制的にCPUのターンにする
        if (this.gameState.currentPlayer !== 2) {
            console.log('Forcing CPU turn (player 2)');
            this.gameState.currentPlayer = 2;
            this.isMyTurn = false;
        }

        this.cpuThinking = true;
        this.elements.cpuThinking.style.display = 'block';
        this.updateTurnDisplay();

        console.log('CPU thinking started...');
        
        // 思考時間のシミュレート
        const settings = this.cpuSettings[this.cpuDifficulty];
        
        setTimeout(() => {
            if (this.isGameEnded) {
                this.cpuThinking = false;
                this.elements.cpuThinking.style.display = 'none';
                return;
            }

            console.log('=== CPU EXECUTING MOVE ===');
            
            // CPU用の有効手を取得
            const validMoves = this.getCpuValidMoves();
            console.log('CPU valid moves:', validMoves);

            if (validMoves.length === 0) {
                console.log('CPU has no valid moves - passing');
                this.completeCpuPass();
                return;
            }

            // 手を選択
            let selectedMove = this.selectCpuMove(validMoves);
            console.log('CPU selected move:', selectedMove);

            // 手を実行
            this.executeCpuMoveDirectly(selectedMove);
            
        }, settings.thinkTime);
    }

    getCpuValidMoves() {
        console.log('Getting valid moves for CPU (player 2)');
        const moves = [];
        
        for (let y = 0; y < 8; y++) {
            for (let x = 0; x < 8; x++) {
                if (this.gameState.board[y][x] === 0) {
                    const flipped = this.getFlippedStones(x, y, 2);
                    if (flipped.length > 0) {
                        moves.push({
                            x: x,
                            y: y,
                            score: flipped.length,
                            flipped: flipped
                        });
                    }
                }
            }
        }
        
        console.log(`Found ${moves.length} valid moves for CPU`);
        return moves;
    }

    selectCpuMove(validMoves) {
        console.log(`Selecting CPU move from ${validMoves.length} options`);
        
        switch (this.cpuDifficulty) {
            case 'easy':
                return validMoves[Math.floor(Math.random() * validMoves.length)];
            
            case 'normal':
                // 最も多くの石をひっくり返せる手を選択
                return validMoves.reduce((best, move) => 
                    move.score > best.score ? move : best
                );
            
            case 'hard':
            case 'expert':
                // より高度な評価（角や端を優先）
                return this.evaluateAdvancedMove(validMoves);
            
            default:
                return validMoves[0];
        }
    }

    evaluateAdvancedMove(validMoves) {
        let bestMove = validMoves[0];
        let bestScore = -Infinity;
        
        for (const move of validMoves) {
            let score = move.score;
            
            // 角の位置は高得点
            if ((move.x === 0 || move.x === 7) && (move.y === 0 || move.y === 7)) {
                score += 20;
            }
            // 端の位置は中得点
            else if (move.x === 0 || move.x === 7 || move.y === 0 || move.y === 7) {
                score += 5;
            }
            
            if (score > bestScore) {
                bestScore = score;
                bestMove = move;
            }
        }
        
        return bestMove;
    }

    executeCpuMoveDirectly(move) {
        console.log('=== EXECUTING CPU MOVE DIRECTLY ===');
        console.log('Move:', move);
        
        try {
            // 石を置く
            this.gameState.board[move.y][move.x] = 2; // CPU = white = 2
            console.log(`Placed CPU stone at (${move.x}, ${move.y})`);
            
            // 石をひっくり返す
            move.flipped.forEach(([fx, fy]) => {
                this.gameState.board[fy][fx] = 2;
                console.log(`Flipped stone at (${fx}, ${fy})`);
            });
            
            // 画面を更新
            this.drawBoard();
            this.updateStoneCount();
            
            // ターンをプレイヤーに戻す
            this.gameState.currentPlayer = 1;
            this.isMyTurn = true;
            this.cpuThinking = false;
            this.elements.cpuThinking.style.display = 'none';
            
            this.updateTurnDisplay();
            this.resetTimer();
            
            console.log('CPU move completed successfully');
            
            // ゲーム終了チェック
            setTimeout(() => {
                this.checkGameEnd();
            }, 500);
            
        } catch (error) {
            console.error('Error executing CPU move:', error);
            this.cpuThinking = false;
            this.elements.cpuThinking.style.display = 'none';
        }
    }

    completeCpuPass() {
        console.log('CPU passing turn');
        
        this.gameState.currentPlayer = 1;
        this.isMyTurn = true;
        this.cpuThinking = false;
        this.elements.cpuThinking.style.display = 'none';
        
        this.updateTurnDisplay();
        this.resetTimer();
        
        // パス後のゲーム終了チェック
        setTimeout(() => {
            this.checkGameEnd();
        }, 500);
    }

    updateStoneCount() {
        let blackCount = 0;
        let whiteCount = 0;
        
        for (let y = 0; y < 8; y++) {
            for (let x = 0; x < 8; x++) {
                if (this.gameState.board[y][x] === 1) blackCount++;
                else if (this.gameState.board[y][x] === 2) whiteCount++;
            }
        }
        
        this.elements.blackCount.textContent = blackCount;
        this.elements.whiteCount.textContent = whiteCount;
        
        return { blackCount, whiteCount };
    }

    checkGameEnd() {
        console.log('Checking game end state');
        const playerMoves = this.getValidMoves(1);
        const cpuMoves = this.getValidMoves(2);
        
        console.log('Valid moves check:', {
            playerMoves: playerMoves.length,
            cpuMoves: cpuMoves.length,
            currentPlayer: this.gameState.currentPlayer,
            isMyTurn: this.isMyTurn
        });
        
        if (playerMoves.length === 0 && cpuMoves.length === 0) {
            // 両方とも打てない場合、ゲーム終了
            console.log('No moves available for both players - ending game');
            this.endGame();
        } else if (this.isCpuGame && playerMoves.length === 0 && this.gameState.currentPlayer === 1) {
            // プレイヤーがパスする場合
            console.log('Player must pass - switching to CPU');
            this.gameState.currentPlayer = 2;
            this.isMyTurn = false;
            this.updateTurnDisplay();
            this.resetTimer();
            setTimeout(() => this.makeCpuMove(), 1000);
        } else if (this.isCpuGame && cpuMoves.length === 0 && this.gameState.currentPlayer === 2) {
            // CPUがパスする場合
            console.log('CPU must pass - switching to player');
            this.passCpuMove();
        }
    }

    passCpuMove() {
        console.log('CPU is passing turn to player');
        this.gameState.currentPlayer = 1;
        this.isMyTurn = true;
        this.updateTurnDisplay();
        this.resetTimer();
        
        // パス後に再度ゲーム終了チェック
        setTimeout(() => {
            const playerMoves = this.getValidMoves(1);
            if (playerMoves.length === 0) {
                console.log('Player also has no moves after CPU pass - checking game end');
                this.checkGameEnd();
            }
        }, 500);
    }

    passMove() {
        if (!this.isMyTurn) return;
        
        const validMoves = this.getValidMoves(this.gameState.currentPlayer);
        if (validMoves.length > 0) {
            alert('まだ打てる場所があります');
            return;
        }
        
        // パス
        this.gameState.currentPlayer = this.gameState.currentPlayer === 1 ? 2 : 1;
        
        if (this.isCpuGame) {
            this.isMyTurn = (this.gameState.currentPlayer === this.myColor);
            this.updateTurnDisplay();
            this.resetTimer();
            
            if (!this.isMyTurn) {
                setTimeout(() => this.makeCpuMove(), 1000);
            }
        }
        
        this.checkGameEnd();
    }

    endGame() {
        this.isGameEnded = true;
        this.isProcessingMove = false;
        this.cpuThinking = false;
        this.elements.cpuThinking.style.display = 'none';
        this.stopTimer();
        
        const counts = this.updateStoneCount();
        
        let result;
        if (counts.blackCount > counts.whiteCount) {
            result = this.isCpuGame ? 'プレイヤーの勝利！' : '黒の勝利！';
        } else if (counts.whiteCount > counts.blackCount) {
            result = this.isCpuGame ? 'CPUの勝利！' : '白の勝利！';
        } else {
            result = '引き分け！';
        }
        
        this.elements.resultTitle.textContent = 'ゲーム終了';
        this.elements.resultMessage.textContent = result;
        this.elements.finalBlackCount.textContent = counts.blackCount;
        this.elements.finalWhiteCount.textContent = counts.whiteCount;
        
        this.showScreen('result');
    }

    async surrender() {
        if (confirm('投了しますか？')) {
            this.endGame();
        }
    }

    async leaveGame() {
        if (confirm('ゲームを離脱しますか？')) {
            this.backToLobby();
        }
    }

    async backToLobby() {
        this.stopTimer();
        this.gameState = null;
        this.showScreen('lobby');
        this.hideQueueStatus();
    }

    playAgain() {
        this.showScreen('lobby');
        setTimeout(() => this.joinGame(), 100);
    }

    showQueueStatus() {
        this.elements.joinGameBtn.style.display = 'none';
        this.elements.leaveQueueBtn.style.display = 'inline-block';
        this.elements.lobbyStatus.textContent = 'マッチング中...';
    }

    hideQueueStatus() {
        this.elements.joinGameBtn.style.display = 'inline-block';
        this.elements.leaveQueueBtn.style.display = 'none';
        this.elements.lobbyStatus.textContent = '';
    }

    async leaveQueue() {
        if (this.database) {
            await this.database.ref('othello_queue/' + this.playerId).remove();
            await this.database.ref('othello_players/' + this.playerId).update({
                inQueue: false
            });
        }
        this.hideQueueStatus();
    }

    showScreen(screenName) {
        Object.keys(this.screens).forEach(name => {
            this.screens[name].classList.toggle('active', name === screenName);
        });
    }

    initializeBoard() {
        // スマホ用のサイズ調整
        const isMobile = window.innerWidth <= 768;
        if (isMobile) {
            this.cellSize = window.innerWidth <= 480 ? 35 : 40; // 極小画面は35px、通常スマホは40px
        } else {
            this.cellSize = 60; // デスクトップは60px
        }
        
        this.elements.gameBoard.width = this.boardSize * this.cellSize;
        this.elements.gameBoard.height = this.boardSize * this.cellSize;
        
        console.log('Board initialized:', {
            isMobile,
            cellSize: this.cellSize,
            boardWidth: this.elements.gameBoard.width,
            boardHeight: this.elements.gameBoard.height,
            windowWidth: window.innerWidth
        });
        
        this.drawBoard();
    }

    drawBoard() {
        const ctx = this.ctx;
        const size = this.cellSize;
        
        // 背景をクリア
        ctx.clearRect(0, 0, this.elements.gameBoard.width, this.elements.gameBoard.height);
        
        // 格子を描画
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        
        for (let i = 0; i <= this.boardSize; i++) {
            // 縦線
            ctx.beginPath();
            ctx.moveTo(i * size, 0);
            ctx.lineTo(i * size, this.boardSize * size);
            ctx.stroke();
            
            // 横線
            ctx.beginPath();
            ctx.moveTo(0, i * size);
            ctx.lineTo(this.boardSize * size, i * size);
            ctx.stroke();
        }

        // 石を描画
        if (this.gameState && this.gameState.board) {
            for (let y = 0; y < this.boardSize; y++) {
                for (let x = 0; x < this.boardSize; x++) {
                    const stone = this.gameState.board[y][x];
                    if (stone !== 0) {
                        this.drawStone(x, y, stone);
                    }
                }
            }
        }
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

    handleBoardInteraction(event) {
        // 操作制限チェック
        if (this.isProcessingMove || this.isGameEnded || !this.isMyTurn || !this.gameState || this.cpuThinking) {
            console.log('Operation blocked:', {
                isProcessingMove: this.isProcessingMove,
                isGameEnded: this.isGameEnded,
                isMyTurn: this.isMyTurn,
                cpuThinking: this.cpuThinking
            });
            return;
        }

        const rect = this.elements.gameBoard.getBoundingClientRect();
        let clientX, clientY;
        
        // タッチイベントとクリックイベントの両方に対応
        if (event.touches && event.touches.length > 0) {
            clientX = event.touches[0].clientX;
            clientY = event.touches[0].clientY;
        } else {
            clientX = event.clientX;
            clientY = event.clientY;
        }
        
        // Canvasの実際のサイズと表示サイズの比率を計算
        const canvasRect = this.elements.gameBoard.getBoundingClientRect();
        const scaleX = this.elements.gameBoard.width / canvasRect.width;
        const scaleY = this.elements.gameBoard.height / canvasRect.height;
        
        // スケーリングを考慮した座標計算
        const canvasX = (clientX - canvasRect.left) * scaleX;
        const canvasY = (clientY - canvasRect.top) * scaleY;
        
        const x = Math.floor(canvasX / this.cellSize);
        const y = Math.floor(canvasY / this.cellSize);

        console.log('Touch/Click position:', {
            clientX, clientY,
            canvasX, canvasY,
            boardX: x, boardY: y,
            scaleX, scaleY,
            cellSize: this.cellSize
        });

        if (x >= 0 && x < this.boardSize && y >= 0 && y < this.boardSize) {
            console.log('Making player move at:', x, y);
            this.makeMove(x, y, false); // プレイヤーの手
        } else {
            console.log('Invalid position clicked:', x, y);
        }
    }

    updateTurnDisplay() {
        if (!this.gameState) return;

        if (this.isCpuGame) {
            this.elements.currentTurn.textContent = this.isMyTurn ? 
                'あなたの番です' : 'CPUの番です';
        } else {
            const currentPlayerName = this.gameState.currentPlayer === 1 ? 
                this.elements.blackPlayerName.textContent : 
                this.elements.whitePlayerName.textContent;
            this.elements.currentTurn.textContent = this.isMyTurn ? 
                'あなたの番です' : `${currentPlayerName}の番です`;
        }
        
        this.elements.currentTurn.style.color = this.isMyTurn ? '#4CAF50' : '#ff6b35';
    }

    startTimer() {
        this.timeLeft = 30;
        this.updateTimerDisplay();
        this.gameTimer = setInterval(() => {
            this.timeLeft--;
            this.updateTimerDisplay();
            if (this.timeLeft <= 0) {
                this.stopTimer();
                if (this.isMyTurn) {
                    this.passMove();
                }
            }
        }, 1000);
    }

    resetTimer() {
        this.stopTimer();
        this.startTimer();
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
        } else {
            this.elements.gameTimer.style.color = '#ff6b35';
        }
    }

    getValidMoves(player) {
        const moves = [];
        for (let y = 0; y < 8; y++) {
            for (let x = 0; x < 8; x++) {
                if (this.gameState.board[y][x] === 0) {
                    const flipped = this.getFlippedStones(x, y, player);
                    if (flipped.length > 0) {
                        moves.push({ x, y, flipped: flipped.length });
                    }
                }
            }
        }
        return moves;
    }

    canMakeMove(x, y) {
        // ボード範囲チェック
        if (x < 0 || x >= 8 || y < 0 || y >= 8) return false;
        
        // 既に石がある場所はNG
        if (this.gameState.board[y][x] !== 0) return false;
        
        // 有効な手かチェック
        const flipped = this.getFlippedStones(x, y, this.gameState.currentPlayer);
        return flipped.length > 0;
    }

    getFlippedStones(x, y, player) {
        const flipped = [];
        const directions = [
            [-1, -1], [-1, 0], [-1, 1],
            [0, -1],           [0, 1],
            [1, -1],  [1, 0],  [1, 1]
        ];

        for (const [dx, dy] of directions) {
            const lineFlipped = [];
            let nx = x + dx;
            let ny = y + dy;

            while (nx >= 0 && nx < 8 && ny >= 0 && ny < 8) {
                const cell = this.gameState.board[ny][nx];
                if (cell === 0) break;
                if (cell === player) {
                    flipped.push(...lineFlipped);
                    break;
                }
                lineFlipped.push([nx, ny]);
                nx += dx;
                ny += dy;
            }
        }

        return flipped;
    }
}

// ページ読み込み完了後にクライアントを初期化
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        new OthelloFirebase();
    }, 200);
}); 