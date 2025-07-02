(function () {
    'use strict';

    // ゲーム設定
    const DIFFICULTIES = {
        easy: { cols: 15, rows: 10, colors: 4 },
        normal: { cols: 18, rows: 12, colors: 5 },
        hard: { cols: 20, rows: 15, colors: 6 }
    };

    // ゲーム状態
    let gameBoard = [];
    let gameState = 'menu'; // menu, playing, finished
    let currentDifficulty = 'easy';
    let score = 0;
    let highScore = 0;
    let selectedBlocks = [];
    let gameHistory = [];
    let animationInProgress = false;

    // DOM要素
    let gameBoardElement;
    let currentScoreElement;
    let highScoreElement;
    let remainingBlocksElement;
    let selectedCountElement;
    let gameOverModal;
    let modalTitle;
    let finalScore;
    let finalBlocks;
    let newHighScore;

    // 初期化
    function init() {
        setupElements();
        setupEventListeners();
        loadHighScore();
        loadCoins();
        initAudio();

        // 最初のゲームボードを生成
        generateBoard();
        renderBoard();
        updateUI();
    }

    // DOM要素の取得
    function setupElements() {
        gameBoardElement = document.getElementById('gameBoard');
        currentScoreElement = document.getElementById('currentScore');
        highScoreElement = document.getElementById('highScore');
        remainingBlocksElement = document.getElementById('remainingBlocks');
        selectedCountElement = document.getElementById('selectedCount');
        gameOverModal = document.getElementById('gameOverModal');
        modalTitle = document.getElementById('modalTitle');
        finalScore = document.getElementById('finalScore');
        finalBlocks = document.getElementById('finalBlocks');
        newHighScore = document.getElementById('newHighScore');
    }

    // イベントリスナーの設定
    function setupEventListeners() {
        // 難易度選択
        document.querySelectorAll('.difficulty-btn').forEach(btn => {
            btn.addEventListener('click', function () {
                if (animationInProgress) return;

                document.querySelectorAll('.difficulty-btn').forEach(b => b.classList.remove('active'));
                this.classList.add('active');
                currentDifficulty = this.dataset.difficulty;
                generateBoard();
                renderBoard();
                updateUI();
                playSound('click');
            });
        });

        // ゲームボタン
        document.getElementById('startBtn').addEventListener('click', startGame);
        document.getElementById('restartBtn').addEventListener('click', restartGame);
        document.getElementById('undoBtn').addEventListener('click', undoMove);
        document.getElementById('restartFromModalBtn').addEventListener('click', restartGame);
        document.getElementById('backToHomeBtn').addEventListener('click', () => {
            window.location.href = '../../index.html';
        });

        // キーボード操作
        document.addEventListener('keydown', (e) => {
            if (e.key === 'u' && gameState === 'playing') {
                undoMove();
            } else if (e.key === 'r') {
                restartGame();
            } else if (e.key === 'Escape') {
                clearSelection();
            }
        });
    }

    // ゲームボード生成
    function generateBoard() {
        const config = DIFFICULTIES[currentDifficulty];
        gameBoard = [];

        for (let row = 0; row < config.rows; row++) {
            gameBoard[row] = [];
            for (let col = 0; col < config.cols; col++) {
                gameBoard[row][col] = Math.floor(Math.random() * config.colors) + 1;
            }
        }

        // 必ず消せるペアがあることを保証
        ensurePlayable();
    }

    // プレイ可能性の保証
    function ensurePlayable() {
        const config = DIFFICULTIES[currentDifficulty];
        let hasPlayableMove = false;

        // 全ボードをチェック
        for (let row = 0; row < config.rows; row++) {
            for (let col = 0; col < config.cols; col++) {
                if (gameBoard[row][col] > 0) {
                    const connected = findConnectedBlocks(row, col);
                    if (connected.length >= 2) {
                        hasPlayableMove = true;
                        break;
                    }
                }
            }
            if (hasPlayableMove) break;
        }

        // プレイ可能な手がない場合は調整
        if (!hasPlayableMove) {
            // いくつかのセルを同じ色に変更
            for (let i = 0; i < 5; i++) {
                const row = Math.floor(Math.random() * config.rows);
                const col = Math.floor(Math.random() * config.cols);
                const color = Math.floor(Math.random() * config.colors) + 1;

                if (row > 0) gameBoard[row - 1][col] = color;
                gameBoard[row][col] = color;
            }
        }
    }

    // ゲームボード描画
    function renderBoard() {
        const config = DIFFICULTIES[currentDifficulty];
        gameBoardElement.innerHTML = '';
        gameBoardElement.style.gridTemplateColumns = `repeat(${config.cols}, 1fr)`;
        gameBoardElement.style.gridTemplateRows = `repeat(${config.rows}, 1fr)`;

        for (let row = 0; row < config.rows; row++) {
            for (let col = 0; col < config.cols; col++) {
                const cell = document.createElement('div');
                cell.className = 'board-cell';
                cell.dataset.row = row;
                cell.dataset.col = col;

                const color = gameBoard[row][col];
                if (color > 0) {
                    cell.classList.add(`cell-color-${color}`);
                    cell.textContent = getColorEmoji(color);
                } else {
                    cell.classList.add('empty');
                }

                cell.addEventListener('click', () => handleCellClick(row, col));
                cell.addEventListener('mouseenter', () => handleCellHover(row, col));
                cell.addEventListener('mouseleave', clearSelection);

                gameBoardElement.appendChild(cell);
            }
        }
    }

    // 色の絵文字を取得
    function getColorEmoji(color) {
        const emojis = ['', '🔴', '🟢', '🔵', '🟡', '🟣', '🟠'];
        return emojis[color] || '';
    }

    // セルクリック処理
    function handleCellClick(row, col) {
        if (animationInProgress || gameState !== 'playing') return;

        const color = gameBoard[row][col];
        if (color === 0) return;

        const connected = findConnectedBlocks(row, col);
        if (connected.length < 2) {
            playSound('error');
            return;
        }

        // 履歴保存
        saveGameState();

        // ブロック消去
        const points = calculateScore(connected.length);
        score += points;

        removeBlocks(connected);
        playSound('remove');
        updateUI();

        // ゲーム終了チェック
        setTimeout(() => {
            checkGameEnd();
        }, 500);
    }

    // セルホバー処理
    function handleCellHover(row, col) {
        if (animationInProgress || gameState !== 'playing') return;

        clearSelection();
        const color = gameBoard[row][col];
        if (color === 0) return;

        selectedBlocks = findConnectedBlocks(row, col);
        if (selectedBlocks.length >= 2) {
            highlightBlocks(selectedBlocks);
        }
        updateSelectedCount();
    }

    // 選択解除
    function clearSelection() {
        selectedBlocks = [];
        document.querySelectorAll('.board-cell.highlighted').forEach(cell => {
            cell.classList.remove('highlighted');
        });
        updateSelectedCount();
    }

    // ブロックのハイライト
    function highlightBlocks(blocks) {
        blocks.forEach(block => {
            const cell = getCellElement(block.row, block.col);
            if (cell) {
                cell.classList.add('highlighted');
            }
        });
    }

    // 接続されたブロックを検索
    function findConnectedBlocks(startRow, startCol) {
        const config = DIFFICULTIES[currentDifficulty];
        const color = gameBoard[startRow][startCol];
        if (color === 0) return [];

        const visited = new Set();
        const connected = [];
        const queue = [{ row: startRow, col: startCol }];

        while (queue.length > 0) {
            const { row, col } = queue.shift();
            const key = `${row},${col}`;

            if (visited.has(key)) continue;
            if (row < 0 || row >= config.rows || col < 0 || col >= config.cols) continue;
            if (gameBoard[row][col] !== color) continue;

            visited.add(key);
            connected.push({ row, col });

            // 4方向をチェック
            queue.push({ row: row - 1, col });
            queue.push({ row: row + 1, col });
            queue.push({ row, col: col - 1 });
            queue.push({ row, col: col + 1 });
        }

        return connected;
    }

    // ブロック削除
    function removeBlocks(blocks) {
        animationInProgress = true;

        // ブロックを削除
        blocks.forEach(block => {
            gameBoard[block.row][block.col] = 0;
        });

        // アニメーション
        blocks.forEach(block => {
            const cell = getCellElement(block.row, block.col);
            if (cell) {
                cell.style.animation = 'pulse 0.3s ease-out';
                setTimeout(() => {
                    cell.classList.add('empty');
                    cell.classList.remove(`cell-color-${cell.textContent}`);
                    cell.textContent = '';
                }, 150);
            }
        });

        // ブロック落下
        setTimeout(() => {
            dropBlocks();
            compressColumns();
            renderBoard();
            animationInProgress = false;
        }, 300);
    }

    // ブロック落下処理
    function dropBlocks() {
        const config = DIFFICULTIES[currentDifficulty];

        for (let col = 0; col < config.cols; col++) {
            let writePos = config.rows - 1;

            for (let row = config.rows - 1; row >= 0; row--) {
                if (gameBoard[row][col] > 0) {
                    if (writePos !== row) {
                        gameBoard[writePos][col] = gameBoard[row][col];
                        gameBoard[row][col] = 0;
                    }
                    writePos--;
                }
            }
        }
    }

    // 列の圧縮
    function compressColumns() {
        const config = DIFFICULTIES[currentDifficulty];
        const newBoard = [];

        // 新しいボードを初期化
        for (let row = 0; row < config.rows; row++) {
            newBoard[row] = new Array(config.cols).fill(0);
        }

        let writeCol = 0;

        for (let col = 0; col < config.cols; col++) {
            let hasBlocks = false;

            // この列にブロックがあるかチェック
            for (let row = 0; row < config.rows; row++) {
                if (gameBoard[row][col] > 0) {
                    hasBlocks = true;
                    break;
                }
            }

            // ブロックがある列だけコピー
            if (hasBlocks) {
                for (let row = 0; row < config.rows; row++) {
                    newBoard[row][writeCol] = gameBoard[row][col];
                }
                writeCol++;
            }
        }

        gameBoard = newBoard;
    }

    // スコア計算
    function calculateScore(blockCount) {
        if (blockCount < 2) return 0;
        return blockCount * (blockCount - 1) * 10;
    }

    // ゲーム終了チェック
    function checkGameEnd() {
        const remaining = getRemainingBlocks();

        if (remaining === 0) {
            // 完全クリア
            score += 1000; // ボーナス
            endGame(true);
        } else if (!hasPlayableMoves()) {
            // 手詰まり
            endGame(false);
        }
    }

    // プレイ可能な手があるかチェック
    function hasPlayableMoves() {
        const config = DIFFICULTIES[currentDifficulty];

        for (let row = 0; row < config.rows; row++) {
            for (let col = 0; col < config.cols; col++) {
                if (gameBoard[row][col] > 0) {
                    const connected = findConnectedBlocks(row, col);
                    if (connected.length >= 2) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    // 残りブロック数を取得
    function getRemainingBlocks() {
        const config = DIFFICULTIES[currentDifficulty];
        let count = 0;

        for (let row = 0; row < config.rows; row++) {
            for (let col = 0; col < config.cols; col++) {
                if (gameBoard[row][col] > 0) {
                    count++;
                }
            }
        }
        return count;
    }

    // ゲーム終了
    function endGame(isCleared) {
        gameState = 'finished';

        // ハイスコア更新
        if (score > highScore) {
            highScore = score;
            localStorage.setItem('sameGameHighScore', highScore);
            newHighScore.style.display = 'block';
        } else {
            newHighScore.style.display = 'none';
        }

        // コイン獲得
        awardCoins(isCleared);

        // モーダル表示
        modalTitle.textContent = isCleared ? '🎉 完全クリア！' : '😅 ゲーム終了';
        finalScore.textContent = score;
        finalBlocks.textContent = getRemainingBlocks();
        gameOverModal.style.display = 'flex';

        playSound(isCleared ? 'clear' : 'gameover');
    }

    // コイン獲得
    function awardCoins(isCleared) {
        let goldCoins = 0;
        let silverCoins = 0;
        let bronzeCoins = 0;

        // スコアベース
        if (score >= 10000) goldCoins += Math.floor(score / 10000);
        if (score >= 3000) silverCoins += Math.floor(score / 3000);
        if (score >= 1000) bronzeCoins += Math.floor(score / 1000);

        // クリアボーナス
        if (isCleared) {
            goldCoins += 2;
            silverCoins += 1;
        }

        // 難易度ボーナス
        if (currentDifficulty === 'hard') {
            goldCoins += 1;
            silverCoins += 1;
        } else if (currentDifficulty === 'normal') {
            silverCoins += 1;
        }
        bronzeCoins += 1;

        // 保存
        const currentGold = parseInt(localStorage.getItem('goldCoins') || '0');
        const currentSilver = parseInt(localStorage.getItem('silverCoins') || '0');
        const currentBronze = parseInt(localStorage.getItem('bronzeCoins') || '0');

        localStorage.setItem('goldCoins', currentGold + goldCoins);
        localStorage.setItem('silverCoins', currentSilver + silverCoins);
        localStorage.setItem('bronzeCoins', currentBronze + bronzeCoins);

        updateCoinDisplay();
    }

    // ゲーム状態保存
    function saveGameState() {
        const state = {
            board: gameBoard.map(row => [...row]),
            score: score
        };
        gameHistory.push(state);

        // 履歴を10手まで保持
        if (gameHistory.length > 10) {
            gameHistory.shift();
        }

        document.getElementById('undoBtn').disabled = false;
    }

    // 元に戻す
    function undoMove() {
        if (gameHistory.length === 0 || animationInProgress) return;

        const lastState = gameHistory.pop();
        gameBoard = lastState.board;
        score = lastState.score;

        renderBoard();
        updateUI();
        clearSelection();

        if (gameHistory.length === 0) {
            document.getElementById('undoBtn').disabled = true;
        }

        playSound('undo');
    }

    // UI更新
    function updateUI() {
        currentScoreElement.textContent = score;
        highScoreElement.textContent = highScore;
        remainingBlocksElement.textContent = getRemainingBlocks();
        updateSelectedCount();
    }

    // 選択数更新
    function updateSelectedCount() {
        selectedCountElement.textContent = selectedBlocks.length;
    }

    // ゲーム開始
    function startGame() {
        gameState = 'playing';
        score = 0;
        gameHistory = [];
        generateBoard();
        renderBoard();
        updateUI();
        clearSelection();
        document.getElementById('undoBtn').disabled = true;
        gameOverModal.style.display = 'none';
        playSound('start');
    }

    // ゲームリスタート
    function restartGame() {
        startGame();
    }

    // セル要素取得
    function getCellElement(row, col) {
        return document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
    }

    // ハイスコア読み込み
    function loadHighScore() {
        highScore = parseInt(localStorage.getItem('sameGameHighScore') || '0');
    }

    // コイン読み込み
    function loadCoins() {
        updateCoinDisplay();
    }

    // コイン表示更新
    function updateCoinDisplay() {
        const goldCoins = localStorage.getItem('goldCoins') || '0';
        const silverCoins = localStorage.getItem('silverCoins') || '0';
        const bronzeCoins = localStorage.getItem('bronzeCoins') || '0';

        document.getElementById('goldCoins').textContent = goldCoins;
        document.getElementById('silverCoins').textContent = silverCoins;
        document.getElementById('bronzeCoins').textContent = bronzeCoins;
    }

    // 音響効果初期化
    function initAudio() {
        if (!window.audioSystem) {
            console.log('AudioSystem not available');
            return;
        }

        setTimeout(() => {
            try {
                // 各種音響効果を生成
                const clickSound = generateClickSound();
                if (clickSound) window.audioSystem.addSound('click', clickSound);

                const removeSound = generateRemoveSound();
                if (removeSound) window.audioSystem.addSound('remove', removeSound);

                const clearSound = generateClearSound();
                if (clearSound) window.audioSystem.addSound('clear', clearSound);

                const gameoverSound = generateGameoverSound();
                if (gameoverSound) window.audioSystem.addSound('gameover', gameoverSound);

                const errorSound = generateErrorSound();
                if (errorSound) window.audioSystem.addSound('error', errorSound);

                const undoSound = generateUndoSound();
                if (undoSound) window.audioSystem.addSound('undo', undoSound);

                const startSound = generateStartSound();
                if (startSound) window.audioSystem.addSound('start', startSound);

                console.log('Same Game audio initialized');
            } catch (e) {
                console.warn('Failed to initialize audio:', e);
            }
        }, 100);
    }

    // 音響効果再生
    function playSound(soundName) {
        if (window.audioSystem && typeof window.audioSystem.play === 'function') {
            try {
                window.audioSystem.play(soundName);
            } catch (e) {
                console.warn(`Failed to play sound ${soundName}:`, e);
            }
        }
    }

    // 音響効果生成関数群
    function generateClickSound() {
        if (!window.audioSystem?.audioContext) return null;

        const audioContext = window.audioSystem.audioContext;
        const sampleRate = audioContext.sampleRate;
        const duration = 0.1;
        const buffer = audioContext.createBuffer(1, sampleRate * duration, sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < buffer.length; i++) {
            data[i] = Math.sin(2 * Math.PI * 800 * i / sampleRate) * 0.3 * (1 - i / buffer.length);
        }
        return buffer;
    }

    function generateRemoveSound() {
        if (!window.audioSystem?.audioContext) return null;

        const audioContext = window.audioSystem.audioContext;
        const sampleRate = audioContext.sampleRate;
        const duration = 0.3;
        const buffer = audioContext.createBuffer(1, sampleRate * duration, sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < buffer.length; i++) {
            const frequency = 600 - (i / buffer.length) * 200;
            data[i] = Math.sin(2 * Math.PI * frequency * i / sampleRate) * 0.4 * (1 - i / buffer.length);
        }
        return buffer;
    }

    function generateClearSound() {
        if (!window.audioSystem?.audioContext) return null;

        const audioContext = window.audioSystem.audioContext;
        const sampleRate = audioContext.sampleRate;
        const duration = 1.0;
        const buffer = audioContext.createBuffer(1, sampleRate * duration, sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < buffer.length; i++) {
            const frequency = 400 + (i / buffer.length) * 800;
            data[i] = Math.sin(2 * Math.PI * frequency * i / sampleRate) * 0.3 * (1 - i / buffer.length);
        }
        return buffer;
    }

    function generateGameoverSound() {
        if (!window.audioSystem?.audioContext) return null;

        const audioContext = window.audioSystem.audioContext;
        const sampleRate = audioContext.sampleRate;
        const duration = 0.8;
        const buffer = audioContext.createBuffer(1, sampleRate * duration, sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < buffer.length; i++) {
            const frequency = 300 - (i / buffer.length) * 200;
            data[i] = Math.sin(2 * Math.PI * frequency * i / sampleRate) * 0.3 * (1 - i / buffer.length);
        }
        return buffer;
    }

    function generateErrorSound() {
        if (!window.audioSystem?.audioContext) return null;

        const audioContext = window.audioSystem.audioContext;
        const sampleRate = audioContext.sampleRate;
        const duration = 0.2;
        const buffer = audioContext.createBuffer(1, sampleRate * duration, sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < buffer.length; i++) {
            data[i] = (Math.random() - 0.5) * 0.5 * (1 - i / buffer.length);
        }
        return buffer;
    }

    function generateUndoSound() {
        if (!window.audioSystem?.audioContext) return null;

        const audioContext = window.audioSystem.audioContext;
        const sampleRate = audioContext.sampleRate;
        const duration = 0.2;
        const buffer = audioContext.createBuffer(1, sampleRate * duration, sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < buffer.length; i++) {
            const frequency = 400 + Math.sin(i / sampleRate * 20) * 100;
            data[i] = Math.sin(2 * Math.PI * frequency * i / sampleRate) * 0.2 * (1 - i / buffer.length);
        }
        return buffer;
    }

    function generateStartSound() {
        if (!window.audioSystem?.audioContext) return null;

        const audioContext = window.audioSystem.audioContext;
        const sampleRate = audioContext.sampleRate;
        const duration = 0.5;
        const buffer = audioContext.createBuffer(1, sampleRate * duration, sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < buffer.length; i++) {
            const frequency = 300 + (i / buffer.length) * 400;
            data[i] = Math.sin(2 * Math.PI * frequency * i / sampleRate) * 0.3 * (1 - i / buffer.length);
        }
        return buffer;
    }

    // 初期化実行
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
