// 💎 宝石パズルゲーム JavaScript（完全リニューアル版）
// Version 4.0 - 2024年 タップ判定修正版

class JewelPuzzle {
    constructor() {
        // ゲーム設定
        this.boardSize = 10;
        this.cellSize = 80;
        this.boardPadding = 10;

        // 宝石タイプ（PNG画像）
        this.jewelTypes = [
            { name: 'gem1', image: 'assets/images/Gem (1).png', color: '#2196f3' },
            { name: 'gem2', image: 'assets/images/Gem (2).png', color: '#4caf50' },
            { name: 'gem3', image: 'assets/images/Gem (3).png', color: '#f44336' },
            { name: 'gem4', image: 'assets/images/Gem (4).png', color: '#3f51b5' },
            { name: 'gem5', image: 'assets/images/Gem (5).png', color: '#ff9800' },
            { name: 'gem6', image: 'assets/images/Gem (6).png', color: '#9c27b0' }
        ];

        // ゲーム状態
        this.board = [];
        this.isGameRunning = false;
        this.isPaused = false;
        this.isAnimating = false;
        this.score = 0;
        this.combo = 0;
        this.totalCleared = 0;
        this.timeLeft = 180;
        this.timeLimit = 180; // 固定3分
        this.timer = null;

        // 選択状態
        this.selectedCell = null;
        this.highlightedCells = [];

        // ドラッグアンドドロップ状態
        this.dragState = {
            isDragging: false,
            startRow: null,
            startCol: null,
            currentRow: null,
            currentCol: null
        };

        // 統計
        this.sessionHighScore = parseInt(localStorage.getItem('jewelPuzzle_highScore') || '0');
        this.sessionHighCombo = 0;
        this.sessionHighCleared = 0;

        // 音響効果
        this.audioEnabled = true;

        // 初期化
        this.init();

        // セッション記録を表示
        this.updateSessionDisplay();
    }

    updateSessionDisplay() {
        const sessionHighEl = document.getElementById('sessionHigh');
        if (sessionHighEl) sessionHighEl.textContent = this.sessionHighScore;

        const sessionComboEl = document.getElementById('sessionCombo');
        if (sessionComboEl) sessionComboEl.textContent = this.sessionHighCombo;

        const sessionClearedEl = document.getElementById('sessionCleared');
        if (sessionClearedEl) sessionClearedEl.textContent = this.sessionHighCleared;
    }

    init() {
        this.createBoard();
        this.bindEvents();
        this.bindGlobalEvents();
        this.updateDisplay();
        this.showStartScreen();
    }

    bindGlobalEvents() {
        // ドキュメント全体でのマウス/タッチイベント
        document.addEventListener('mousemove', (e) => {
            if (this.dragState.isDragging) {
                this.handleDragMove(e);
            }
        });

        document.addEventListener('mouseup', (e) => {
            if (this.dragState.isDragging) {
                this.handleDragEnd(e);
            }
        });

        document.addEventListener('touchmove', (e) => {
            if (this.dragState.isDragging) {
                this.handleDragMove(e.touches[0]);
            }
        });

        document.addEventListener('touchend', (e) => {
            if (this.dragState.isDragging) {
                this.handleDragEnd(e.changedTouches[0]);
            }
        });
    }

    createBoard() {
        const boardElement = document.getElementById('jewelBoard');
        boardElement.innerHTML = '';

        // ボードの初期化
        this.board = [];
        for (let row = 0; row < this.boardSize; row++) {
            this.board[row] = [];
            for (let col = 0; col < this.boardSize; col++) {
                this.board[row][col] = null;
            }
        }

        // HTMLセルの作成
        for (let row = 0; row < this.boardSize; row++) {
            for (let col = 0; col < this.boardSize; col++) {
                const cell = document.createElement('div');
                cell.className = 'jewel-cell';
                cell.dataset.row = row;
                cell.dataset.col = col;
                cell.style.width = this.cellSize + 'px';
                cell.style.height = this.cellSize + 'px';

                // 宝石画像要素
                const jewelImg = document.createElement('img');
                jewelImg.className = 'jewel-image';
                jewelImg.style.width = '100%';
                jewelImg.style.height = '100%';
                jewelImg.style.objectFit = 'contain';
                jewelImg.style.pointerEvents = 'none';
                cell.appendChild(jewelImg);

                boardElement.appendChild(cell);
                this.bindCellEvents(cell);
            }
        }

        // ボードサイズを調整
        const totalSize = this.boardSize * this.cellSize + (this.boardSize - 1) * 2 + this.boardPadding * 2;
        boardElement.style.width = totalSize + 'px';
        boardElement.style.height = totalSize + 'px';
    }

    bindEvents() {
        // 遊び方ダイアログ
        const howToPlayBtn = document.getElementById('howToPlayBtn');
        if (howToPlayBtn) {
            howToPlayBtn.addEventListener('click', () => this.showHowToPlay());
        }

        const closeDialog = document.getElementById('closeDialog');
        if (closeDialog) {
            closeDialog.addEventListener('click', () => this.hideHowToPlay());
        }

        // ゲームボタン
        const startBtn = document.getElementById('startBtn');
        if (startBtn) {
            startBtn.addEventListener('click', () => this.startGame());
        }

        const pauseBtn = document.getElementById('pauseBtn');
        if (pauseBtn) {
            pauseBtn.addEventListener('click', () => this.togglePause());
        }

        const resetBtn = document.getElementById('resetBtn');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => this.resetGame());
        }
    }

    bindCellEvents(cell) {
        const row = parseInt(cell.dataset.row);
        const col = parseInt(cell.dataset.col);

        // クリック/タッチイベント
        cell.addEventListener('click', (e) => {
            e.preventDefault();
            this.handleCellClick(row, col);
        });

        // ドラッグ開始
        cell.addEventListener('mousedown', (e) => {
            if (!this.isGameRunning || this.isPaused || this.isAnimating) return;
            if (this.board[row][col] === null) return;

            e.preventDefault();
            this.startDrag(row, col, e);
        });

        // タッチイベント
        cell.addEventListener('touchstart', (e) => {
            if (!this.isGameRunning || this.isPaused || this.isAnimating) return;
            if (this.board[row][col] === null) return;

            e.preventDefault();
            const touch = e.touches[0];
            this.startDrag(row, col, touch);
        });

        // ホバーエフェクト
        cell.addEventListener('mouseenter', () => {
            if (!this.isGameRunning || this.isPaused || this.isAnimating) return;
            if (this.board[row][col] !== null) {
                cell.style.transform = 'scale(1.05)';

                // ドラッグ中の場合はドロップターゲットとして処理
                if (this.dragState && this.dragState.isDragging) {
                    this.handleDragEnter(row, col);
                }
            }
        });

        cell.addEventListener('mouseleave', () => {
            if (!cell.classList.contains('selected') && !cell.classList.contains('highlighted')) {
                cell.style.transform = 'scale(1)';
            }

            // ドロップターゲットクラスを削除
            cell.classList.remove('drop-target');
        });
    }

    handleCellClick(row, col) {
        if (!this.isGameRunning || this.isPaused || this.isAnimating) return;
        if (this.board[row][col] === null) return;

        // 音響効果を有効化
        if (this.audioEnabled && window.jewelAudioEffects) {
            window.jewelAudioEffects.enable();
        }

        console.log(`🔘 セルクリック: (${row}, ${col})`);

        if (this.selectedCell === null) {
            // 最初の宝石を選択
            console.log(`✅ 宝石を選択: (${row}, ${col})`);
            this.selectCell(row, col);
        } else if (this.selectedCell.row === row && this.selectedCell.col === col) {
            // 同じセルをクリック - 選択解除
            console.log(`❌ 選択解除: (${row}, ${col})`);
            this.deselectCell();
        } else if (this.isAdjacent(this.selectedCell.row, this.selectedCell.col, row, col)) {
            // 隣接するセルをクリック - 交換
            console.log(`🔄 宝石交換: (${this.selectedCell.row}, ${this.selectedCell.col}) ↔ (${row}, ${col})`);
            this.swapJewels(this.selectedCell.row, this.selectedCell.col, row, col);
        } else {
            // 別のセルを選択
            console.log(`🔀 別の宝石を選択: (${row}, ${col})`);
            this.deselectCell();
            this.selectCell(row, col);
        }
    }

    selectCell(row, col) {
        this.selectedCell = { row, col };
        const cell = this.getCellElement(row, col);
        cell.classList.add('selected');
        cell.style.transform = 'scale(1.1)';

        // 隣接セルをハイライト
        this.highlightAdjacentCells(row, col);

        // 選択音を再生
        if (this.audioEnabled && window.jewelAudioEffects) {
            window.jewelAudioEffects.playSelect();
        }
    }

    deselectCell() {
        if (this.selectedCell) {
            const cell = this.getCellElement(this.selectedCell.row, this.selectedCell.col);
            cell.classList.remove('selected');
            cell.style.transform = 'scale(1)';
            this.selectedCell = null;
        }

        // ハイライト解除
        this.clearHighlights();
    }

    highlightAdjacentCells(row, col) {
        this.clearHighlights();

        const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];

        directions.forEach(([dr, dc]) => {
            const newRow = row + dr;
            const newCol = col + dc;

            if (this.isValidPosition(newRow, newCol) && this.board[newRow][newCol] !== null) {
                const cell = this.getCellElement(newRow, newCol);
                cell.classList.add('highlighted');
                this.highlightedCells.push({ row: newRow, col: newCol });
            }
        });
    }

    clearHighlights() {
        this.highlightedCells.forEach(({ row, col }) => {
            const cell = this.getCellElement(row, col);
            cell.classList.remove('highlighted');
        });
        this.highlightedCells = [];
    }

    getCellElement(row, col) {
        return document.querySelector(`.jewel-cell[data-row="${row}"][data-col="${col}"]`);
    }

    isValidPosition(row, col) {
        return row >= 0 && row < this.boardSize && col >= 0 && col < this.boardSize;
    }

    isAdjacent(row1, col1, row2, col2) {
        const dr = Math.abs(row1 - row2);
        const dc = Math.abs(col1 - col2);
        const isAdj = (dr === 1 && dc === 0) || (dr === 0 && dc === 1);
        console.log(`🔍 隣接判定: (${row1}, ${col1}) → (${row2}, ${col2}) = ${isAdj} (dr=${dr}, dc=${dc})`);
        return isAdj;
    }

    async swapJewels(row1, col1, row2, col2) {
        console.log(`🔄 宝石交換開始: (${row1}, ${col1}) ↔ (${row2}, ${col2})`);

        // 両方のセルに宝石があることを確認
        if (this.board[row1][col1] === null || this.board[row2][col2] === null) {
            console.log('❌ 空のセルとの交換はできません');
            this.deselectCell();
            return;
        }

        this.isAnimating = true;

        // 元の宝石を保存（正確な参照を保持）
        const originalJewel1 = this.board[row1][col1];
        const originalJewel2 = this.board[row2][col2];

        // 宝石を交換
        this.board[row1][col1] = originalJewel2;
        this.board[row2][col2] = originalJewel1;

        // 画面を更新
        this.renderBoard();

        // 移動音を再生
        if (this.audioEnabled && window.jewelAudioEffects) {
            window.jewelAudioEffects.playMove();
        }

        // 短い待機時間
        await this.sleep(200);

        // マッチをチェック
        const matches = this.findMatches();
        console.log(`🔍 マッチ検出: ${matches.length}個`);

        if (matches.length > 0) {
            // マッチがある場合は処理を続行
            this.deselectCell();
            await this.processMatches();
        } else {
            // マッチがない場合は元に戻す（正確な参照で復元）
            console.log('↩️ マッチなし - 元に戻す');
            this.board[row1][col1] = originalJewel1;
            this.board[row2][col2] = originalJewel2;
            this.renderBoard();
            this.deselectCell();
            this.isAnimating = false;
        }
    }

    findMatches() {
        const matches = [];

        // 横方向のマッチをチェック
        for (let row = 0; row < this.boardSize; row++) {
            let count = 1;
            let currentJewel = this.board[row][0];

            for (let col = 1; col < this.boardSize; col++) {
                if (this.board[row][col] !== null && currentJewel !== null &&
                    this.board[row][col].name === currentJewel.name) {
                    count++;
                } else {
                    if (count >= 3) {
                        for (let i = col - count; i < col; i++) {
                            matches.push({ row, col: i });
                        }
                    }
                    count = 1;
                    currentJewel = this.board[row][col];
                }
            }

            if (count >= 3) {
                for (let i = this.boardSize - count; i < this.boardSize; i++) {
                    matches.push({ row, col: i });
                }
            }
        }

        // 縦方向のマッチをチェック
        for (let col = 0; col < this.boardSize; col++) {
            let count = 1;
            let currentJewel = this.board[0][col];

            for (let row = 1; row < this.boardSize; row++) {
                if (this.board[row][col] !== null && currentJewel !== null &&
                    this.board[row][col].name === currentJewel.name) {
                    count++;
                } else {
                    if (count >= 3) {
                        for (let i = row - count; i < row; i++) {
                            matches.push({ row: i, col });
                        }
                    }
                    count = 1;
                    currentJewel = this.board[row][col];
                }
            }

            if (count >= 3) {
                for (let i = this.boardSize - count; i < this.boardSize; i++) {
                    matches.push({ row: i, col });
                }
            }
        }

        // 重複を除去
        const uniqueMatches = [];
        matches.forEach(match => {
            if (!uniqueMatches.some(m => m.row === match.row && m.col === match.col)) {
                uniqueMatches.push(match);
            }
        });

        console.log(`🔍 検出されたマッチ:`, uniqueMatches);
        return uniqueMatches;
    }

    async processMatches() {
        let totalMatches = 0;
        let comboLevel = 0;

        while (true) {
            const matches = this.findMatches();
            if (matches.length === 0) break;

            totalMatches += matches.length;
            comboLevel++;

            // マッチをアニメーション
            await this.animateMatches(matches);

            // 宝石を削除
            matches.forEach(({ row, col }) => {
                this.board[row][col] = null;
            });

            // 宝石を落下
            await this.dropJewels();

            // 新しい宝石を補充
            await this.fillEmptySpaces();

            // 短い休止
            await this.sleep(200);
        }

        if (totalMatches > 0) {
            this.updateScore(totalMatches, comboLevel);
            this.totalCleared += totalMatches;
            this.combo = Math.max(this.combo, comboLevel);
            this.sessionHighCombo = Math.max(this.sessionHighCombo, comboLevel);
            this.sessionHighCleared = Math.max(this.sessionHighCleared, this.totalCleared);

            // コンボ数を盤面に表示（2以上で）
            if (comboLevel >= 2) {
                this.showComboOnBoard(comboLevel);
            }

            // コンボ音を再生
            if (this.audioEnabled && window.jewelAudioEffects) {
                if (comboLevel > 1) {
                    window.jewelAudioEffects.playCombo(comboLevel);
                } else {
                    window.jewelAudioEffects.playMatch(totalMatches);
                }
            }

            // 10コンボ以上で時間ボーナス
            if (comboLevel >= 10) {
                this.timeLeft = Math.min(this.timeLeft + 1, 180);
            }

            this.updateDisplay();
        }

        this.isAnimating = false;
    }

    async animateMatches(matches) {
        matches.forEach(({ row, col }) => {
            const cell = this.getCellElement(row, col);
            const img = cell.querySelector('.jewel-image');
            if (img) {
                img.classList.add('matching');
                img.style.animation = 'match 0.5s ease-in-out';
            }
        });

        await this.sleep(300);

        // 豪華なパーティクル効果を作成
        this.createLuxuriousParticles(matches);

        await this.sleep(200);

        // アニメーションクラスを削除
        matches.forEach(({ row, col }) => {
            const cell = this.getCellElement(row, col);
            const img = cell.querySelector('.jewel-image');
            if (img) {
                img.classList.remove('matching');
                img.style.animation = '';
            }
        });
    }

    async dropJewels() {
        for (let col = 0; col < this.boardSize; col++) {
            // 各列で宝石を下に落とす
            const column = [];
            for (let row = this.boardSize - 1; row >= 0; row--) {
                if (this.board[row][col] !== null) {
                    column.push(this.board[row][col]);
                }
            }

            // 列をクリア
            for (let row = 0; row < this.boardSize; row++) {
                this.board[row][col] = null;
            }

            // 宝石を下から配置
            for (let i = 0; i < column.length; i++) {
                this.board[this.boardSize - 1 - i][col] = column[i];
            }
        }

        this.renderBoard();

        // 落下音を再生
        if (this.audioEnabled && window.jewelAudioEffects) {
            window.jewelAudioEffects.playDrop();
        }

        await this.sleep(300);
    }

    async fillEmptySpaces() {
        for (let col = 0; col < this.boardSize; col++) {
            for (let row = 0; row < this.boardSize; row++) {
                if (this.board[row][col] === null) {
                    // 新しい宝石を配置（マッチしないように）
                    let newJewel;
                    do {
                        newJewel = this.getRandomJewel();
                    } while (this.wouldCreateMatch(row, col, newJewel));

                    this.board[row][col] = newJewel;

                    // 落下アニメーションを適用
                    const cell = this.getCellElement(row, col);
                    const img = cell.querySelector('.jewel-image');
                    if (img) {
                        img.classList.add('falling');
                        setTimeout(() => {
                            img.classList.remove('falling');
                        }, 500);
                    }
                }
            }
        }

        this.renderBoard();
        await this.sleep(200);
    }

    getRandomJewel() {
        return this.jewelTypes[Math.floor(Math.random() * this.jewelTypes.length)];
    }

    wouldCreateMatch(row, col, jewel) {
        // 左に2つ同じ宝石があるかチェック
        if (col >= 2 &&
            this.board[row][col - 1] !== null &&
            this.board[row][col - 2] !== null &&
            this.board[row][col - 1].name === jewel.name &&
            this.board[row][col - 2].name === jewel.name) {
            return true;
        }

        // 上に2つ同じ宝石があるかチェック
        if (row >= 2 &&
            this.board[row - 1][col] !== null &&
            this.board[row - 2][col] !== null &&
            this.board[row - 1][col].name === jewel.name &&
            this.board[row - 2][col].name === jewel.name) {
            return true;
        }

        return false;
    }

    renderBoard() {
        for (let row = 0; row < this.boardSize; row++) {
            for (let col = 0; col < this.boardSize; col++) {
                const cell = this.getCellElement(row, col);
                const img = cell.querySelector('.jewel-image');

                if (this.board[row][col] !== null) {
                    img.src = this.board[row][col].image;
                    img.style.display = 'block';
                } else {
                    img.style.display = 'none';
                }
            }
        }
    }

    fillBoard() {
        for (let row = 0; row < this.boardSize; row++) {
            for (let col = 0; col < this.boardSize; col++) {
                if (this.board[row][col] === null) {
                    let jewel;
                    do {
                        jewel = this.getRandomJewel();
                    } while (this.wouldCreateMatch(row, col, jewel));

                    this.board[row][col] = jewel;
                }
            }
        }

        this.renderBoard();
    }

    updateScore(matches, comboLevel) {
        let baseScore = 0;
        if (matches <= 3) baseScore = 30;
        else if (matches <= 4) baseScore = 100;
        else baseScore = 200;

        const comboMultiplier = comboLevel > 1 ? comboLevel * 0.5 : 1;
        const scoreGain = Math.floor(baseScore * matches * comboMultiplier);

        this.score += scoreGain;
        this.sessionHighScore = Math.max(this.sessionHighScore, this.score);
        localStorage.setItem('jewelPuzzle_highScore', this.sessionHighScore.toString());
    }

    startGame() {
        this.score = 0;
        this.combo = 0;
        this.totalCleared = 0;
        this.timeLeft = this.timeLimit || 180;
        this.isGameRunning = true;
        this.isPaused = false;
        this.isAnimating = false;
        this.selectedCell = null;
        this.clearHighlights();
        this.resetDragState();

        // ゲームオーバー表示を隠す
        const gameOver = document.getElementById('gameOver');
        if (gameOver) gameOver.style.display = 'none';

        // ボタン状態を更新
        const startBtn = document.getElementById('startBtn');
        if (startBtn) startBtn.disabled = true;

        const pauseBtn = document.getElementById('pauseBtn');
        if (pauseBtn) {
            pauseBtn.disabled = false;
            pauseBtn.textContent = '⏸️ 一時停止';
        }

        const resetBtn = document.getElementById('resetBtn');
        if (resetBtn) resetBtn.disabled = false;

        this.fillBoard();
        this.updateDisplay();
        this.hideStartScreen();
        this.startTimer();

        // 音響効果を有効化
        if (this.audioEnabled && window.jewelAudioEffects) {
            window.jewelAudioEffects.enable();
        }

        console.log('🎮 ゲーム開始！');
    }

    startTimer() {
        this.stopTimer();
        this.timer = setInterval(() => {
            this.timeLeft--;
            this.updateDisplay();

            // 時間警告
            if (this.timeLeft <= 10 && this.timeLeft > 0) {
                if (this.audioEnabled && window.jewelAudioEffects) {
                    window.jewelAudioEffects.playTimeWarning();
                }
            }

            if (this.timeLeft <= 0) {
                this.gameOver();
            }
        }, 1000);
    }

    stopTimer() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
    }

    togglePause() {
        if (!this.isGameRunning) return;

        this.isPaused = !this.isPaused;
        const pauseBtn = document.getElementById('pauseBtn');

        if (this.isPaused) {
            this.stopTimer();
            if (pauseBtn) pauseBtn.textContent = '▶️ 再開';
            // ドラッグ状態もリセット
            this.resetDragState();
        } else {
            this.startTimer();
            if (pauseBtn) pauseBtn.textContent = '⏸️ 一時停止';
        }
    }

    gameOver() {
        this.isGameRunning = false;
        this.stopTimer();
        this.deselectCell();
        this.resetDragState();

        // 統計更新
        this.sessionHighScore = Math.max(this.sessionHighScore, this.score);
        this.sessionHighCombo = Math.max(this.sessionHighCombo, this.combo);
        this.sessionHighCleared = Math.max(this.sessionHighCleared, this.totalCleared);

        // ローカルストレージに保存
        localStorage.setItem('jewelPuzzle_highScore', this.sessionHighScore.toString());

        // ゲームオーバー音を再生
        if (this.audioEnabled && window.jewelAudioEffects) {
            window.jewelAudioEffects.playGameOver();
        }

        // 結果を表示
        setTimeout(() => {
            const finalScoreEl = document.getElementById('finalScore');
            if (finalScoreEl) finalScoreEl.textContent = this.score;

            const finalComboEl = document.getElementById('finalCombo');
            if (finalComboEl) finalComboEl.textContent = this.combo;

            const finalClearedEl = document.getElementById('finalCleared');
            if (finalClearedEl) finalClearedEl.textContent = this.totalCleared;

            // セッション最高記録を更新
            const sessionHighEl = document.getElementById('sessionHigh');
            if (sessionHighEl) sessionHighEl.textContent = this.sessionHighScore;

            const sessionComboEl = document.getElementById('sessionCombo');
            if (sessionComboEl) sessionComboEl.textContent = this.sessionHighCombo;

            const sessionClearedEl = document.getElementById('sessionCleared');
            if (sessionClearedEl) sessionClearedEl.textContent = this.sessionHighCleared;

            const gameOver = document.getElementById('gameOver');
            if (gameOver) gameOver.style.display = 'block';
        }, 500);
    }

    resetGame() {
        this.stopTimer();
        this.isGameRunning = false;
        this.isPaused = false;
        this.isAnimating = false;
        this.selectedCell = null;
        this.clearHighlights();
        this.resetDragState();
        this.score = 0;
        this.combo = 0;
        this.totalCleared = 0;
        this.timeLeft = this.timeLimit || 180;

        // ボードをクリア
        for (let row = 0; row < this.boardSize; row++) {
            for (let col = 0; col < this.boardSize; col++) {
                this.board[row][col] = null;
            }
        }
        this.renderBoard();

        // ボタン状態を更新
        const startBtn = document.getElementById('startBtn');
        if (startBtn) startBtn.disabled = false;

        const pauseBtn = document.getElementById('pauseBtn');
        if (pauseBtn) {
            pauseBtn.disabled = true;
            pauseBtn.textContent = '⏸️ 一時停止';
        }

        const resetBtn = document.getElementById('resetBtn');
        if (resetBtn) resetBtn.disabled = true;

        // ゲームオーバー表示を隠す
        const gameOver = document.getElementById('gameOver');
        if (gameOver) gameOver.style.display = 'none';

        this.updateDisplay();
        this.showStartScreen();

        console.log('🔄 ゲームリセット');
    }

    updateDisplay() {
        const scoreEl = document.getElementById('score');
        if (scoreEl) scoreEl.textContent = this.score;

        const comboEl = document.getElementById('combo');
        if (comboEl) comboEl.textContent = this.combo;

        const timeEl = document.getElementById('time');
        if (timeEl) {
            const minutes = Math.floor(this.timeLeft / 60);
            const seconds = this.timeLeft % 60;
            timeEl.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        }

        const levelEl = document.getElementById('level');
        if (levelEl) levelEl.textContent = Math.floor(this.score / 1000) + 1;
    }

    showStartScreen() {
        const startScreen = document.getElementById('startScreen');
        if (startScreen) startScreen.style.display = 'block';

        const pauseBtn = document.getElementById('pauseBtn');
        if (pauseBtn) pauseBtn.disabled = true;

        const gameOver = document.getElementById('gameOver');
        if (gameOver) gameOver.style.display = 'none';
    }

    hideStartScreen() {
        const startScreen = document.getElementById('startScreen');
        if (startScreen) startScreen.style.display = 'none';

        const pauseBtn = document.getElementById('pauseBtn');
        if (pauseBtn) pauseBtn.disabled = false;
    }

    showHowToPlay() {
        const howToPlayDialog = document.getElementById('howToPlayDialog');
        if (howToPlayDialog) howToPlayDialog.style.display = 'flex';
    }

    hideHowToPlay() {
        const howToPlayDialog = document.getElementById('howToPlayDialog');
        if (howToPlayDialog) howToPlayDialog.style.display = 'none';
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }



    createLuxuriousParticles(matches) {
        const boardElement = document.querySelector('.jewel-board');
        const particleTypes = ['star', 'sparkle', 'gem'];

        matches.forEach(({ row, col }) => {
            const cell = this.getCellElement(row, col);
            const cellRect = cell.getBoundingClientRect();
            const boardRect = boardElement.getBoundingClientRect();

            const centerX = cellRect.left - boardRect.left + cellRect.width / 2;
            const centerY = cellRect.top - boardRect.top + cellRect.height / 2;

            // 各マッチした宝石に対して3つのパーティクルを作成（数を減らして軽量化）
            for (let i = 0; i < 3; i++) {
                const particleType = particleTypes[Math.floor(Math.random() * particleTypes.length)];
                const particle = document.createElement('div');
                particle.className = `particle particle-${particleType}`;

                // ランダムな方向への移動
                const angle = (Math.PI * 2 * i) / 3 + Math.random() * 0.5;
                const distance = 30 + Math.random() * 40;
                const dx = Math.cos(angle) * distance;
                const dy = Math.sin(angle) * distance;

                particle.style.left = `${centerX - 4}px`;
                particle.style.top = `${centerY - 4}px`;
                particle.style.setProperty('--dx', `${dx}px`);
                particle.style.setProperty('--dy', `${dy}px`);

                boardElement.appendChild(particle);

                // パーティクルを短時間で削除
                setTimeout(() => {
                    if (particle.parentNode) {
                        particle.parentNode.removeChild(particle);
                    }
                }, 400);
            }
        });
    }

    showComboOnBoard(comboLevel) {
        const boardElement = document.querySelector('.jewel-board');
        const comboDisplay = document.createElement('div');
        comboDisplay.className = 'combo-display';
        comboDisplay.innerHTML = `${comboLevel} COMBO!`;

        // 盤面中央に表示
        const boardRect = boardElement.getBoundingClientRect();
        const centerX = boardRect.width / 2;
        const centerY = boardRect.height / 2;

        comboDisplay.style.left = `${centerX - 60}px`;
        comboDisplay.style.top = `${centerY - 20}px`;

        // コンボレベルによって色を変更
        if (comboLevel >= 10) {
            comboDisplay.style.color = '#ff0066';
            comboDisplay.style.borderColor = '#ff0066';
            comboDisplay.style.textShadow = '0 0 10px #ff0066';
        } else if (comboLevel >= 5) {
            comboDisplay.style.color = '#ff6600';
            comboDisplay.style.borderColor = '#ff6600';
            comboDisplay.style.textShadow = '0 0 8px #ff6600';
        }

        boardElement.appendChild(comboDisplay);

        // 表示を削除
        setTimeout(() => {
            if (comboDisplay.parentNode) {
                comboDisplay.parentNode.removeChild(comboDisplay);
            }
        }, 800);
    }

    // ドラッグアンドドロップ機能
    startDrag(row, col, event) {
        this.dragState = {
            isDragging: true,
            startRow: row,
            startCol: col,
            currentRow: row,
            currentCol: col
        };

        const cell = this.getCellElement(row, col);
        cell.classList.add('dragging');
        cell.style.cursor = 'grabbing';

        // 音響効果を有効化
        if (this.audioEnabled && window.jewelAudioEffects) {
            window.jewelAudioEffects.enable();
            window.jewelAudioEffects.playSelect();
        }

        console.log(`🔗 ドラッグ開始: (${row}, ${col})`);
    }

    handleDragMove(event) {
        if (!this.dragState.isDragging) return;

        // マウス位置から該当するセルを特定
        const elementBelow = document.elementFromPoint(event.clientX, event.clientY);
        if (elementBelow && elementBelow.classList.contains('jewel-cell')) {
            const row = parseInt(elementBelow.dataset.row);
            const col = parseInt(elementBelow.dataset.col);

            if (row !== this.dragState.currentRow || col !== this.dragState.currentCol) {
                this.dragState.currentRow = row;
                this.dragState.currentCol = col;
                this.updateDropTargets();
            }
        }
    }

    handleDragEnd(event) {
        if (!this.dragState.isDragging) return;

        const startRow = this.dragState.startRow;
        const startCol = this.dragState.startCol;

        // ドラッグ終了位置を特定
        const elementBelow = document.elementFromPoint(event.clientX, event.clientY);
        let endRow = startRow;
        let endCol = startCol;

        if (elementBelow && elementBelow.classList.contains('jewel-cell')) {
            endRow = parseInt(elementBelow.dataset.row);
            endCol = parseInt(elementBelow.dataset.col);
        }

        console.log(`🔗 ドラッグ終了: (${startRow}, ${startCol}) → (${endRow}, ${endCol})`);

        // ドラッグ状態をリセット
        this.resetDragState();

        // 隣接するセルに移動した場合は交換
        if (this.isAdjacent(startRow, startCol, endRow, endCol)) {
            console.log(`🔄 ドラッグで宝石交換: (${startRow}, ${startCol}) ↔ (${endRow}, ${endCol})`);
            this.swapJewels(startRow, startCol, endRow, endCol);
        } else {
            console.log('❌ ドラッグ終了: 隣接していません');
        }
    }

    handleDragEnter(row, col) {
        if (!this.dragState.isDragging) return;

        const startRow = this.dragState.startRow;
        const startCol = this.dragState.startCol;

        // 隣接セルの場合はドロップターゲットとして表示
        if (this.isAdjacent(startRow, startCol, row, col)) {
            const cell = this.getCellElement(row, col);
            cell.classList.add('drop-target');
        }
    }

    updateDropTargets() {
        // 全てのドロップターゲットをクリア
        document.querySelectorAll('.jewel-cell').forEach(cell => {
            cell.classList.remove('drop-target');
        });

        if (!this.dragState.isDragging) return;

        const startRow = this.dragState.startRow;
        const startCol = this.dragState.startCol;
        const currentRow = this.dragState.currentRow;
        const currentCol = this.dragState.currentCol;

        // 隣接セルをハイライト
        if (this.isAdjacent(startRow, startCol, currentRow, currentCol)) {
            const cell = this.getCellElement(currentRow, currentCol);
            cell.classList.add('drop-target');
        }
    }

    resetDragState() {
        if (this.dragState.startRow !== null && this.dragState.startCol !== null) {
            const startCell = this.getCellElement(this.dragState.startRow, this.dragState.startCol);
            startCell.classList.remove('dragging');
            startCell.style.cursor = 'grab';
        }

        // 全てのドロップターゲットをクリア
        document.querySelectorAll('.jewel-cell').forEach(cell => {
            cell.classList.remove('drop-target');
        });

        this.dragState = {
            isDragging: false,
            startRow: null,
            startCol: null,
            currentRow: null,
            currentCol: null
        };
    }
}

// ゲーム開始
let game;
document.addEventListener('DOMContentLoaded', () => {
    console.log('💎 宝石パズルゲーム v4.0 NEW FILE 読み込み完了');
    game = new JewelPuzzle();
});

// グローバル関数（ボタンから呼び出し用）
function startGame() {
    if (game) game.startGame();
}

function togglePause() {
    if (game) game.togglePause();
}

function restartGame() {
    if (game) {
        game.resetGame();
        setTimeout(() => {
            game.startGame();
        }, 100);
    }
}

function resetGame() {
    if (game) {
        game.resetGame();
    }
}



// グローバル変数としてゲームインスタンスを保存
window.jewelPuzzle = game;
