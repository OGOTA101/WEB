// マインスイーパーゲーム
class MinesweeperGame {
    constructor() {
        // ゲーム設定
        this.difficulties = {
            beginner: { width: 9, height: 9, mines: 10 },
            intermediate: { width: 16, height: 16, mines: 40 },
            expert: { width: 30, height: 16, mines: 99 }
        };

        this.currentDifficulty = 'beginner';
        this.config = this.difficulties[this.currentDifficulty];

        // ゲーム状態
        this.board = [];
        this.revealed = [];
        this.flagged = [];
        this.gameState = 'ready'; // ready, playing, won, lost
        this.firstClick = true;
        this.startTime = null;
        this.endTime = null;
        this.timer = null;
        this.mineCount = 0;

        // 統計
        this.stats = this.loadStats();

        // DOM要素
        this.minefield = document.getElementById('minefield');
        this.mineCountDisplay = document.getElementById('mineCount');
        this.timerDisplay = document.getElementById('timer');
        this.smileyBtn = document.getElementById('smileyBtn');

        this.initializeGame();
        this.setupEventListeners();
        this.updateStats();
        this.loadMineSounds();
    }

    initializeGame() {
        this.config = this.difficulties[this.currentDifficulty];
        this.board = Array(this.config.height).fill().map(() => Array(this.config.width).fill(0));
        this.revealed = Array(this.config.height).fill().map(() => Array(this.config.width).fill(false));
        this.flagged = Array(this.config.height).fill().map(() => Array(this.config.width).fill(false));
        this.gameState = 'ready';
        this.firstClick = true;
        this.startTime = null;
        this.endTime = null;
        this.mineCount = this.config.mines;

        this.clearTimer();
        this.updateMineCount();
        this.updateTimer();
        this.updateSmiley();
        this.createMinefield();
    }

    createMinefield() {
        this.minefield.innerHTML = '';
        this.minefield.style.gridTemplateColumns = `repeat(${this.config.width}, 1fr)`;
        this.minefield.style.gridTemplateRows = `repeat(${this.config.height}, 1fr)`;

        for (let row = 0; row < this.config.height; row++) {
            for (let col = 0; col < this.config.width; col++) {
                const cell = document.createElement('div');
                cell.className = 'cell';
                cell.dataset.row = row;
                cell.dataset.col = col;

                // イベントリスナー
                cell.addEventListener('click', (e) => this.handleCellClick(e, row, col));
                cell.addEventListener('contextmenu', (e) => this.handleRightClick(e, row, col));

                // モバイル対応
                let touchTimer = null;
                cell.addEventListener('touchstart', (e) => {
                    touchTimer = setTimeout(() => {
                        this.handleRightClick(e, row, col);
                    }, 500);
                });

                cell.addEventListener('touchend', (e) => {
                    if (touchTimer) {
                        clearTimeout(touchTimer);
                        touchTimer = null;
                        if (e.cancelable) {
                            e.preventDefault();
                        }
                    }
                });

                this.minefield.appendChild(cell);
            }
        }
    }

    placeMines(excludeRow, excludeCol) {
        const mines = [];
        const totalCells = this.config.width * this.config.height;
        const excludeIndex = excludeRow * this.config.width + excludeCol;

        // 除外するセル（最初にクリックしたセルとその周囲）の計算
        const excludeCells = new Set();
        for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
                const newRow = excludeRow + dr;
                const newCol = excludeCol + dc;
                if (newRow >= 0 && newRow < this.config.height &&
                    newCol >= 0 && newCol < this.config.width) {
                    excludeCells.add(newRow * this.config.width + newCol);
                }
            }
        }

        // 利用可能な位置のリストを作成
        const availablePositions = [];
        for (let i = 0; i < totalCells; i++) {
            if (!excludeCells.has(i)) {
                availablePositions.push(i);
            }
        }

        // ランダムに地雷を配置
        for (let i = 0; i < this.config.mines; i++) {
            const randomIndex = Math.floor(Math.random() * availablePositions.length);
            const position = availablePositions.splice(randomIndex, 1)[0];
            const row = Math.floor(position / this.config.width);
            const col = position % this.config.width;
            this.board[row][col] = -1; // -1は地雷
        }

        // 数字を計算
        this.calculateNumbers();
    }

    calculateNumbers() {
        for (let row = 0; row < this.config.height; row++) {
            for (let col = 0; col < this.config.width; col++) {
                if (this.board[row][col] !== -1) {
                    let count = 0;
                    for (let dr = -1; dr <= 1; dr++) {
                        for (let dc = -1; dc <= 1; dc++) {
                            const newRow = row + dr;
                            const newCol = col + dc;
                            if (newRow >= 0 && newRow < this.config.height &&
                                newCol >= 0 && newCol < this.config.width &&
                                this.board[newRow][newCol] === -1) {
                                count++;
                            }
                        }
                    }
                    this.board[row][col] = count;
                }
            }
        }
    }

    handleCellClick(event, row, col) {
        event.preventDefault();

        if (this.gameState === 'won' || this.gameState === 'lost') return;
        if (this.flagged[row][col]) return;
        if (this.revealed[row][col]) return;

        if (this.firstClick) {
            this.placeMines(row, col);
            this.firstClick = false;
            this.gameState = 'playing';
            this.startTimer();
        }

        if (this.board[row][col] === -1) {
            // 地雷を踏んだ
            if (window.audioSystem) window.audioSystem.play('explode');
            this.gameOver(row, col);
        } else {
            // 安全なセル
            if (window.audioSystem) window.audioSystem.play('cell-click');
            this.revealCell(row, col);
            this.checkWin();
        }
    }

    handleRightClick(event, row, col) {
        event.preventDefault();

        if (this.gameState === 'won' || this.gameState === 'lost') return;
        if (this.revealed[row][col]) return;

        this.flagged[row][col] = !this.flagged[row][col];
        this.mineCount += this.flagged[row][col] ? -1 : 1;

        if (window.audioSystem) window.audioSystem.play('flag');

        this.updateMineCount();
        this.updateCell(row, col);
    }

    revealCell(row, col) {
        if (row < 0 || row >= this.config.height || col < 0 || col >= this.config.width) return;
        if (this.revealed[row][col] || this.flagged[row][col]) return;

        this.revealed[row][col] = true;
        this.updateCell(row, col);

        // 空のセル（周囲に地雷がない）の場合、周囲も自動で開く
        if (this.board[row][col] === 0) {
            for (let dr = -1; dr <= 1; dr++) {
                for (let dc = -1; dc <= 1; dc++) {
                    this.revealCell(row + dr, col + dc);
                }
            }
        }
    }

    updateCell(row, col) {
        const cell = this.minefield.children[row * this.config.width + col];

        if (this.flagged[row][col]) {
            cell.className = 'cell flagged';
            cell.textContent = '🚩';
        } else if (this.revealed[row][col]) {
            cell.className = 'cell revealed';
            if (this.board[row][col] === -1) {
                cell.className += ' mine';
                cell.textContent = '💣';
            } else if (this.board[row][col] > 0) {
                cell.className += ` num-${this.board[row][col]}`;
                cell.textContent = this.board[row][col];
            } else {
                cell.textContent = '';
            }
        } else {
            cell.className = 'cell';
            cell.textContent = '';
        }
    }

    gameOver(explodedRow, explodedCol) {
        this.gameState = 'lost';
        this.endTime = Date.now();
        this.clearTimer();
        this.updateSmiley();

        // すべての地雷を表示
        for (let row = 0; row < this.config.height; row++) {
            for (let col = 0; col < this.config.width; col++) {
                if (this.board[row][col] === -1) {
                    this.revealed[row][col] = true;
                    const cell = this.minefield.children[row * this.config.width + col];
                    if (row === explodedRow && col === explodedCol) {
                        cell.className = 'cell revealed mine mine-exploded';
                    } else {
                        cell.className = 'cell revealed mine';
                    }
                    cell.textContent = '💣';
                }
                // 間違った旗を表示
                if (this.flagged[row][col] && this.board[row][col] !== -1) {
                    const cell = this.minefield.children[row * this.config.width + col];
                    cell.style.backgroundColor = '#FF8080';
                }
            }
        }

        // 統計更新
        this.stats.gamesPlayed++;
        this.saveStats();
        this.updateStats();

        // ゲームオーバーダイアログ表示
        setTimeout(() => {
            document.getElementById('finalTime').textContent = Math.floor((this.endTime - this.startTime) / 1000);
            document.getElementById('gameOverDialog').style.display = 'block';
        }, 1500);
    }

    checkWin() {
        let revealedCount = 0;
        for (let row = 0; row < this.config.height; row++) {
            for (let col = 0; col < this.config.width; col++) {
                if (this.revealed[row][col]) {
                    revealedCount++;
                }
            }
        }

        const totalSafeCells = this.config.width * this.config.height - this.config.mines;
        if (revealedCount === totalSafeCells) {
            this.gameWon();
        }
    }

    gameWon() {
        this.gameState = 'won';
        this.endTime = Date.now();
        this.clearTimer();
        this.updateSmiley();

        // すべての地雷に旗を立てる
        for (let row = 0; row < this.config.height; row++) {
            for (let col = 0; col < this.config.width; col++) {
                if (this.board[row][col] === -1 && !this.flagged[row][col]) {
                    this.flagged[row][col] = true;
                    this.updateCell(row, col);
                }
            }
        }

        this.mineCount = 0;
        this.updateMineCount();

        // 統計更新
        this.stats.gamesPlayed++;
        this.stats.gamesWon++;

        const playTime = Math.floor((this.endTime - this.startTime) / 1000);
        const isNewRecord = !this.stats.bestTimes[this.currentDifficulty] ||
            playTime < this.stats.bestTimes[this.currentDifficulty];

        if (isNewRecord) {
            this.stats.bestTimes[this.currentDifficulty] = playTime;
        }

        this.saveStats();
        this.updateStats();

        // 勝利音再生
        if (window.audioSystem) window.audioSystem.play('win');

        // 勝利ダイアログ表示
        setTimeout(() => {
            document.getElementById('winTime').textContent = playTime;
            document.getElementById('newRecord').style.display = isNewRecord ? 'block' : 'none';
            document.getElementById('winDialog').style.display = 'block';
        }, 1000);
    }

    startTimer() {
        this.startTime = Date.now();
        this.timer = setInterval(() => {
            this.updateTimer();
        }, 1000);
    }

    clearTimer() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
    }

    updateTimer() {
        if (this.gameState === 'playing' && this.startTime) {
            const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
            this.timerDisplay.textContent = elapsed.toString().padStart(3, '0');
        } else if (this.gameState === 'ready') {
            this.timerDisplay.textContent = '000';
        }
    }

    updateMineCount() {
        this.mineCountDisplay.textContent = Math.max(0, this.mineCount).toString().padStart(3, '0');
    }

    updateSmiley() {
        switch (this.gameState) {
            case 'ready':
            case 'playing':
                this.smileyBtn.textContent = '😊';
                break;
            case 'won':
                this.smileyBtn.textContent = '😎';
                break;
            case 'lost':
                this.smileyBtn.textContent = '😵';
                break;
        }
    }

    changeDifficulty(difficulty) {
        this.currentDifficulty = difficulty;
        this.initializeGame();
    }

    loadStats() {
        const defaultStats = {
            gamesPlayed: 0,
            gamesWon: 0,
            bestTimes: {}
        };

        try {
            const saved = localStorage.getItem('minesweeper-stats');
            return saved ? { ...defaultStats, ...JSON.parse(saved) } : defaultStats;
        } catch {
            return defaultStats;
        }
    }

    saveStats() {
        try {
            localStorage.setItem('minesweeper-stats', JSON.stringify(this.stats));
        } catch {
            // ローカルストレージが使用できない場合は無視
        }
    }

    updateStats() {
        document.getElementById('gamesPlayed').textContent = this.stats.gamesPlayed;
        document.getElementById('gamesWon').textContent = this.stats.gamesWon;

        const winRate = this.stats.gamesPlayed > 0 ?
            Math.round((this.stats.gamesWon / this.stats.gamesPlayed) * 100) : 0;
        document.getElementById('winRate').textContent = winRate + '%';

        const bestTime = this.stats.bestTimes[this.currentDifficulty];
        document.getElementById('bestTime').textContent = bestTime ? bestTime + '秒' : '---';
    }

    loadMineSounds() {
        if (!window.audioSystem) return;

        // マインスイーパー固有の音を生成
        const audioContext = window.audioSystem.audioContext;
        if (!audioContext) return;

        // セルクリック音
        const clickBuffer = this.generateCellClickSound(audioContext);
        window.audioSystem.addSound('cell-click', clickBuffer);

        // 旗設置音
        const flagBuffer = this.generateFlagSound(audioContext);
        window.audioSystem.addSound('flag', flagBuffer);

        // 地雷爆発音
        const explodeBuffer = this.generateExplodeSound(audioContext);
        window.audioSystem.addSound('explode', explodeBuffer);

        // 勝利音
        const winBuffer = this.generateWinSound(audioContext);
        window.audioSystem.addSound('win', winBuffer);
    }

    generateCellClickSound(audioContext) {
        const sampleRate = audioContext.sampleRate;
        const duration = 0.08;
        const buffer = audioContext.createBuffer(1, sampleRate * duration, sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < data.length; i++) {
            const t = i / sampleRate;
            data[i] = Math.sin(2 * Math.PI * 600 * t) * Math.exp(-t * 25) * 0.2;
        }

        return buffer;
    }

    generateFlagSound(audioContext) {
        const sampleRate = audioContext.sampleRate;
        const duration = 0.12;
        const buffer = audioContext.createBuffer(1, sampleRate * duration, sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < data.length; i++) {
            const t = i / sampleRate;
            const freq = 800 + (t * 200); // 上昇音
            data[i] = Math.sin(2 * Math.PI * freq * t) * Math.exp(-t * 15) * 0.15;
        }

        return buffer;
    }

    generateExplodeSound(audioContext) {
        const sampleRate = audioContext.sampleRate;
        const duration = 0.4;
        const buffer = audioContext.createBuffer(1, sampleRate * duration, sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < data.length; i++) {
            const t = i / sampleRate;
            const noise = (Math.random() - 0.5) * 2;
            const lowFreq = Math.sin(2 * Math.PI * 80 * t) * Math.exp(-t * 2);
            const envelope = Math.exp(-t * 3);

            data[i] = (noise * 0.3 + lowFreq * 0.7) * envelope * 0.3;
        }

        return buffer;
    }

    generateWinSound(audioContext) {
        const sampleRate = audioContext.sampleRate;
        const duration = 0.8;
        const buffer = audioContext.createBuffer(1, sampleRate * duration, sampleRate);
        const data = buffer.getChannelData(0);

        const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6

        for (let i = 0; i < data.length; i++) {
            const t = i / sampleRate;
            const noteIndex = Math.floor(t * 4) % notes.length;
            const freq = notes[noteIndex];
            const envelope = Math.exp(-t * 1.5);

            data[i] = Math.sin(2 * Math.PI * freq * t) * envelope * 0.2;
        }

        return buffer;
    }

    setupEventListeners() {
        // 難易度選択
        document.querySelectorAll('.difficulty-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                if (window.audioSystem) window.audioSystem.play('click');
                document.querySelectorAll('.difficulty-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.changeDifficulty(btn.dataset.difficulty);
            });
        });

        // スマイリーボタン
        this.smileyBtn.addEventListener('click', () => {
            if (window.audioSystem) window.audioSystem.play('click');
            this.initializeGame();
        });

        // 新しいゲームボタン
        document.getElementById('newGameBtn').addEventListener('click', () => {
            if (window.audioSystem) window.audioSystem.play('click');
            this.initializeGame();
        });

        // 遊び方ボタン
        document.getElementById('howToPlayBtn').addEventListener('click', () => {
            if (window.audioSystem) window.audioSystem.play('click');
            document.getElementById('howToPlayDialog').style.display = 'flex';
        });

        // ダイアログを閉じる
        document.getElementById('closeDialog').addEventListener('click', () => {
            if (window.audioSystem) window.audioSystem.play('click');
            document.getElementById('howToPlayDialog').style.display = 'none';
        });

        // リスタートボタン
        document.getElementById('restartBtn').addEventListener('click', () => {
            if (window.audioSystem) window.audioSystem.play('click');
            document.getElementById('gameOverDialog').style.display = 'none';
            this.initializeGame();
        });

        // もう一度プレイボタン
        document.getElementById('playAgainBtn').addEventListener('click', () => {
            if (window.audioSystem) window.audioSystem.play('click');
            document.getElementById('winDialog').style.display = 'none';
            this.initializeGame();
        });

        // ダイアログの背景クリックで閉じる
        document.querySelectorAll('.dialog').forEach(dialog => {
            dialog.addEventListener('click', (e) => {
                if (e.target === dialog) {
                    dialog.style.display = 'none';
                }
            });
        });

        // キーボードショートカット
        document.addEventListener('keydown', (e) => {
            if (e.key === 'r' || e.key === 'R') {
                this.initializeGame();
            } else if (e.key === 'Escape') {
                document.querySelectorAll('.dialog').forEach(dialog => {
                    dialog.style.display = 'none';
                });
            }
        });

        // 右クリック無効化（ゲーム領域以外）
        document.addEventListener('contextmenu', (e) => {
            if (!e.target.classList.contains('cell')) {
                e.preventDefault();
            }
        });
    }
}

// ゲーム初期化
document.addEventListener('DOMContentLoaded', () => {
    new MinesweeperGame();
});
