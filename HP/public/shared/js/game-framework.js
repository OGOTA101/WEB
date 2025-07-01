// ゲーム共通フレームワーク
class GameFramework {
    constructor(config) {
        this.config = config;
        this.gameRunning = false;
        this.isPaused = false;
        this.gameLoop = null;

        this.init();
    }

    init() {
        // UI要素のイベントリスナー設定
        this.setupEventListeners();

        // 古いボタンを非表示
        const oldButtons = document.querySelector('.game-buttons');
        if (oldButtons) {
            oldButtons.style.display = 'none';
        }

        // 初期状態設定
        this.setInitialState();
    }

    setupEventListeners() {
        // ゲーム開始ボタン
        const startBtn = document.getElementById('startGameBtn');
        if (startBtn) {
            startBtn.addEventListener('click', () => this.startGame());
        }

        // 遊び方ボタン
        const howToPlayBtn = document.getElementById('howToPlayBtn');
        if (howToPlayBtn) {
            howToPlayBtn.addEventListener('click', () => this.showHowToPlay());
        }

        // 一時停止ボタン
        const pauseBtn = document.getElementById('pausePlayBtn');
        if (pauseBtn) {
            pauseBtn.addEventListener('click', () => this.togglePause());
        }

        // ダイアログ閉じるボタン
        const closeBtn = document.getElementById('closeDialog');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.hideHowToPlay());
        }

        // ダイアログオーバーレイクリック
        const dialog = document.getElementById('howToPlayDialog');
        if (dialog) {
            dialog.addEventListener('click', (e) => {
                if (e.target === dialog) this.hideHowToPlay();
            });
        }
    }

    setInitialState() {
        const startBtn = document.getElementById('startGameBtn');
        if (startBtn) {
            if (this.config.requiresImageLoading) {
                startBtn.disabled = true;
                startBtn.textContent = '画像読み込み中...';
            } else {
                startBtn.disabled = false;
                startBtn.textContent = this.config.startButtonText || '🎮 ゲーム開始';
            }
        }
    }

    onImagesLoaded() {
        const startBtn = document.getElementById('startGameBtn');
        if (startBtn) {
            startBtn.disabled = false;
            startBtn.textContent = this.config.startButtonText || '🎮 ゲーム開始';
        }
    }

    startGame() {
        if (!this.gameRunning) {
            this.gameRunning = true;
            this.isPaused = false;

            // UI更新
            const startScreen = document.getElementById('startScreen');
            const pauseBtn = document.getElementById('pausePlayBtn');
            const gameOver = document.getElementById('gameOver');

            if (startScreen) startScreen.style.display = 'none';
            if (pauseBtn) pauseBtn.style.display = 'block';
            if (gameOver) gameOver.style.display = 'none';

            // ゲーム固有の開始処理を呼び出し
            if (this.config.onGameStart) {
                this.config.onGameStart();
            }

            // ゲームループ開始
            if (this.config.gameUpdateFunction && this.config.gameSpeed) {
                this.gameLoop = setInterval(this.config.gameUpdateFunction, this.config.gameSpeed);
            }
        }
    }

    togglePause() {
        if (this.gameRunning) {
            const pauseBtn = document.getElementById('pausePlayBtn');

            if (this.isPaused) {
                // 再開
                if (this.config.gameUpdateFunction && this.config.gameSpeed) {
                    this.gameLoop = setInterval(this.config.gameUpdateFunction, this.config.gameSpeed);
                }
                if (pauseBtn) pauseBtn.textContent = '⏸️';
                this.isPaused = false;
            } else {
                // 一時停止
                clearInterval(this.gameLoop);
                if (pauseBtn) pauseBtn.textContent = '▶️';
                this.isPaused = true;
            }
        }
    }

    gameOver() {
        this.gameRunning = false;
        clearInterval(this.gameLoop);

        // UI更新
        const startScreen = document.getElementById('startScreen');
        const pauseBtn = document.getElementById('pausePlayBtn');
        const gameOverDiv = document.getElementById('gameOver');

        if (startScreen) startScreen.style.display = 'flex';
        if (pauseBtn) {
            pauseBtn.style.display = 'none';
            pauseBtn.textContent = '⏸️';
        }
        if (gameOverDiv) gameOverDiv.style.display = 'block';

        // ゲーム固有の終了処理を呼び出し
        if (this.config.onGameOver) {
            this.config.onGameOver();
        }
    }

    resetGame() {
        this.gameRunning = false;
        this.isPaused = false;
        clearInterval(this.gameLoop);

        // UI更新
        const startScreen = document.getElementById('startScreen');
        const pauseBtn = document.getElementById('pausePlayBtn');
        const gameOverDiv = document.getElementById('gameOver');

        if (startScreen) startScreen.style.display = 'flex';
        if (pauseBtn) {
            pauseBtn.style.display = 'none';
            pauseBtn.textContent = '⏸️';
        }
        if (gameOverDiv) gameOverDiv.style.display = 'none';

        // ゲーム固有のリセット処理を呼び出し
        if (this.config.onGameReset) {
            this.config.onGameReset();
        }
    }

    showHowToPlay() {
        const dialog = document.getElementById('howToPlayDialog');
        if (dialog) {
            dialog.style.display = 'flex';
        }
    }

    hideHowToPlay() {
        const dialog = document.getElementById('howToPlayDialog');
        if (dialog) {
            dialog.style.display = 'none';
        }
    }

    // ダイアログ管理のエイリアス
    showHowToPlayDialog() {
        this.showHowToPlay();
    }

    hideHowToPlayDialog() {
        this.hideHowToPlay();
    }

    showGameOverDialog() {
        const dialog = document.getElementById('gameOver');
        if (dialog) {
            dialog.style.display = 'block';
        }
    }

    hideGameOverDialog() {
        const dialog = document.getElementById('gameOver');
        if (dialog) {
            dialog.style.display = 'none';
        }
    }

    showStartScreen() {
        const startScreen = document.getElementById('startScreen');
        if (startScreen) {
            startScreen.style.display = 'flex';
        }
    }

    hideStartScreen() {
        const startScreen = document.getElementById('startScreen');
        if (startScreen) {
            startScreen.style.display = 'none';
        }
    }

    // 旧関数との互換性のため
    pauseGame() {
        this.togglePause();
    }
}

// グローバルに公開
window.GameFramework = GameFramework;
