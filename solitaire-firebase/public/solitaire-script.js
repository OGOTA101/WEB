// ソリティア ゲーム (完全版)
class SolitaireGame {
    constructor() {
        // ゲーム状態
        this.gameState = null;
        this.difficulty = 'easy'; // easy: 1枚めくり, hard: 3枚めくり
        this.playerName = '';
        this.gameStartTime = null;
        this.gameScore = 0;
        this.moveCount = 0;
        this.gameTimer = null;
        this.undoStack = [];
        this.maxUndoSteps = 10;

        // カード関連
        this.suits = ['hearts', 'diamonds', 'clubs', 'spades'];
        this.ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
        this.suitSymbols = {
            hearts: '♥',
            diamonds: '♦',
            clubs: '♣',
            spades: '♠'
        };
        this.suitColors = {
            hearts: 'red',
            diamonds: 'red',
            clubs: 'black',
            spades: 'black'
        };

        // ドラッグ&ドロップ
        this.draggedCard = null;
        this.draggedFrom = null;
        this.dragOffset = { x: 0, y: 0 };
        this.isDragging = false;
        this.originalCardStyle = null;
        
        // ダブルタップ検出
        this.lastTapTime = 0;
        this.lastTappedCard = null;

        // 統計
        this.statistics = this.loadStatistics();

        this.initializeUI();
        this.setupEventListeners();
    }

    initializeUI() {
        // 画面要素の取得
        this.screens = {
            menu: document.getElementById('menu'),
            game: document.getElementById('game'),
            result: document.getElementById('result'),
            statistics: document.getElementById('statistics')
        };

        // UI要素の取得
        this.elements = {
            // メニュー画面
            playerName: document.getElementById('playerName'),
            easyBtn: document.getElementById('easyBtn'),
            hardBtn: document.getElementById('hardBtn'),
            difficultyDesc: document.getElementById('difficultyDesc'),
            startGameBtn: document.getElementById('startGameBtn'),
            statisticsBtn: document.getElementById('statisticsBtn'),

            // ゲーム画面
            gameScore: document.getElementById('gameScore'),
            gameTime: document.getElementById('gameTime'),
            moveCount: document.getElementById('moveCount'),
            newGameBtn: document.getElementById('newGameBtn'),
            undoBtn: document.getElementById('undoBtn'),
            hintBtn: document.getElementById('hintBtn'),
            backToMenuBtn: document.getElementById('backToMenuBtn'),

            // カード置き場
            stock: document.getElementById('stock'),
            waste: document.getElementById('waste'),
            foundations: [
                document.getElementById('foundation-0'),
                document.getElementById('foundation-1'),
                document.getElementById('foundation-2'),
                document.getElementById('foundation-3')
            ],
            tableau: [
                document.getElementById('tableau-0'),
                document.getElementById('tableau-1'),
                document.getElementById('tableau-2'),
                document.getElementById('tableau-3'),
                document.getElementById('tableau-4'),
                document.getElementById('tableau-5'),
                document.getElementById('tableau-6')
            ],

            // 結果画面
            resultTitle: document.getElementById('resultTitle'),
            resultMessage: document.getElementById('resultMessage'),
            finalScore: document.getElementById('finalScore'),
            finalTime: document.getElementById('finalTime'),
            finalMoves: document.getElementById('finalMoves'),
            playAgainBtn: document.getElementById('playAgainBtn'),
            backToMenuFromResultBtn: document.getElementById('backToMenuFromResultBtn'),

            // 統計画面
            totalGames: document.getElementById('totalGames'),
            wonGames: document.getElementById('wonGames'),
            winRate: document.getElementById('winRate'),
            bestScore: document.getElementById('bestScore'),
            bestTime: document.getElementById('bestTime'),
            averageTime: document.getElementById('averageTime'),
            clearStatsBtn: document.getElementById('clearStatsBtn'),
            backToMenuFromStatsBtn: document.getElementById('backToMenuFromStatsBtn')
        };

        // プレイヤー名の初期化
        const savedName = localStorage.getItem('solitaire_player_name');
        if (savedName && savedName.trim() !== '') {
            this.elements.playerName.value = savedName;
            this.playerName = savedName;
            console.log('Loaded saved player name:', this.playerName);
        } else {
            this.playerName = '';
            console.log('No saved player name found');
        }

        this.updateStatisticsDisplay();
        
        // 初期難易度設定
        this.selectDifficulty('easy');
    }

    setupEventListeners() {
        // メニュー画面
        this.elements.playerName.addEventListener('input', (e) => {
            this.playerName = e.target.value.trim();
            localStorage.setItem('solitaire_player_name', this.playerName);
            console.log('Player name updated:', this.playerName);
        });

        // Enterキーでゲーム開始
        this.elements.playerName.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.startNewGame();
            }
        });

        this.elements.easyBtn.addEventListener('click', () => this.selectDifficulty('easy'));
        this.elements.hardBtn.addEventListener('click', () => this.selectDifficulty('hard'));
        this.elements.startGameBtn.addEventListener('click', () => this.startNewGame());
        this.elements.statisticsBtn.addEventListener('click', () => this.showStatistics());

        // ゲーム画面
        this.elements.newGameBtn.addEventListener('click', () => this.startNewGame());
        this.elements.undoBtn.addEventListener('click', () => this.undoMove());
        this.elements.hintBtn.addEventListener('click', () => this.showHint());
        this.elements.backToMenuBtn.addEventListener('click', () => this.backToMenu());

        // 結果画面
        this.elements.playAgainBtn.addEventListener('click', () => this.startNewGame());
        this.elements.backToMenuFromResultBtn.addEventListener('click', () => this.backToMenu());

        // 統計画面
        this.elements.clearStatsBtn.addEventListener('click', () => this.clearStatistics());
        this.elements.backToMenuFromStatsBtn.addEventListener('click', () => this.backToMenu());

        // 山札クリック
        this.elements.stock.addEventListener('click', () => this.drawFromStock());

        // ドラッグ&ドロップイベント
        this.setupDragAndDrop();
    }

    selectDifficulty(difficulty) {
        console.log('Selecting difficulty:', difficulty);
        this.difficulty = difficulty;
        
        // 全てのボタンからactiveクラスを削除
        this.elements.easyBtn.classList.remove('active');
        this.elements.hardBtn.classList.remove('active');
        
        // 選択されたボタンにactiveクラスを追加
        if (difficulty === 'easy') {
            this.elements.easyBtn.classList.add('active');
        } else if (difficulty === 'hard') {
            this.elements.hardBtn.classList.add('active');
        }

        // 説明文更新
        const descriptions = {
            easy: '初心者モード - 山札から1枚ずつめくります',
            hard: '上級者モード - 山札から3枚ずつめくります'
        };
        this.elements.difficultyDesc.textContent = descriptions[difficulty];
        
        console.log('Difficulty set to:', this.difficulty);
    }

    startNewGame() {
        console.log('Starting new solitaire game');
        console.log('Player name:', this.playerName);
        console.log('Difficulty:', this.difficulty);
        
        // プレイヤー名のチェック
        if (!this.playerName || this.playerName.trim() === '') {
            alert('プレイヤー名を入力してください');
            this.elements.playerName.focus();
            return;
        }

        try {
            console.log('Initializing game...');
            this.initializeGame();
            console.log('Game initialized, showing game screen...');
            this.showScreen('game');
            console.log('Starting game timer...');
            this.startGameTimer();
            console.log('Game started successfully!');
        } catch (error) {
            console.error('Error starting game:', error);
            alert('ゲーム開始中にエラーが発生しました: ' + error.message);
        }
    }

    initializeGame() {
        console.log('Initializing game state');
        
        // ゲーム状態の初期化
        this.gameScore = 0;
        this.moveCount = 0;
        this.undoStack = [];
        
        // デッキ作成とシャッフル
        const deck = this.createDeck();
        this.shuffleDeck(deck);
        
        // ゲーム状態の設定
        this.gameState = {
            stock: [],
            waste: [],
            foundations: [[], [], [], []],
            tableau: [[], [], [], [], [], [], []],
            stockIndex: 0
        };
        
        // カードを配る
        this.dealCards(deck);
        
        // 画面を更新
        this.renderBoard();
        this.updateGameDisplay();
        
        console.log('Game initialized successfully');
    }

    createDeck() {
        const deck = [];
        let cardId = 0;
        
        for (const suit of this.suits) {
            for (const rank of this.ranks) {
                deck.push({
                    id: cardId++,
                    suit: suit,
                    rank: rank,
                    value: this.getCardValue(rank),
                    color: this.suitColors[suit],
                    faceUp: false
                });
            }
        }
        
        return deck;
    }

    getCardValue(rank) {
        if (rank === 'A') return 1;
        if (rank === 'J') return 11;
        if (rank === 'Q') return 12;
        if (rank === 'K') return 13;
        return parseInt(rank);
    }

    shuffleDeck(deck) {
        for (let i = deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [deck[i], deck[j]] = [deck[j], deck[i]];
        }
    }

    dealCards(deck) {
        let cardIndex = 0;
        
        // タブローに配る (1枚目から7枚目まで)
        for (let col = 0; col < 7; col++) {
            for (let row = 0; row <= col; row++) {
                const card = deck[cardIndex++];
                card.faceUp = (row === col); // 一番上のカードのみ表向き
                this.gameState.tableau[col].push(card);
            }
        }
        
        // 残りのカードは山札に
        this.gameState.stock = deck.slice(cardIndex);
        this.gameState.stockIndex = 0;
    }

    renderBoard() {
        this.renderStock();
        this.renderWaste();
        this.renderFoundations();
        this.renderTableau();
    }

    renderStock() {
        const stockElement = this.elements.stock;
        stockElement.innerHTML = '';
        
        if (this.gameState.stock.length > this.gameState.stockIndex) {
            const cardBack = document.createElement('div');
            cardBack.className = 'card card-back';
            cardBack.innerHTML = '<div class="card-pattern"></div>';
            stockElement.appendChild(cardBack);
        } else {
            const placeholder = document.createElement('div');
            placeholder.className = 'card-placeholder';
            placeholder.textContent = '山札';
            stockElement.appendChild(placeholder);
        }
    }

    renderWaste() {
        const wasteElement = this.elements.waste;
        wasteElement.innerHTML = '';
        
        if (this.gameState.waste.length > 0) {
            const visibleCards = this.difficulty === 'easy' ? 1 : Math.min(3, this.gameState.waste.length);
            const startIndex = Math.max(0, this.gameState.waste.length - visibleCards);
            
            for (let i = startIndex; i < this.gameState.waste.length; i++) {
                const card = this.gameState.waste[i];
                const cardElement = this.createCardElement(card, true);
                cardElement.style.position = 'absolute';
                cardElement.style.left = `${(i - startIndex) * 20}px`;
                cardElement.style.zIndex = i;
                wasteElement.appendChild(cardElement);
            }
        } else {
            const placeholder = document.createElement('div');
            placeholder.className = 'card-placeholder';
            placeholder.textContent = '捨て札';
            wasteElement.appendChild(placeholder);
        }
    }

    renderFoundations() {
        for (let i = 0; i < 4; i++) {
            const foundationElement = this.elements.foundations[i];
            foundationElement.innerHTML = '';
            
            const foundation = this.gameState.foundations[i];
            if (foundation.length > 0) {
                const topCard = foundation[foundation.length - 1];
                const cardElement = this.createCardElement(topCard, true);
                foundationElement.appendChild(cardElement);
            } else {
                const placeholder = document.createElement('div');
                placeholder.className = 'card-placeholder';
                placeholder.textContent = this.suitSymbols[this.suits[i]];
                foundationElement.appendChild(placeholder);
            }
        }
    }

    renderTableau() {
        for (let col = 0; col < 7; col++) {
            const tableauElement = this.elements.tableau[col];
            tableauElement.innerHTML = '';
            
            const column = this.gameState.tableau[col];
            if (column.length === 0) {
                const placeholder = document.createElement('div');
                placeholder.className = 'card-placeholder';
                tableauElement.appendChild(placeholder);
            } else {
                for (let i = 0; i < column.length; i++) {
                    const card = column[i];
                    const cardElement = this.createCardElement(card, card.faceUp);
                    cardElement.style.position = 'absolute';
                    cardElement.style.top = `${i * 25}px`;
                    cardElement.style.zIndex = i;
                    tableauElement.appendChild(cardElement);
                }
            }
        }
    }

    createCardElement(card, faceUp) {
        const cardElement = document.createElement('div');
        cardElement.className = `card ${faceUp ? 'face-up' : 'face-down'} ${card.color}`;
        cardElement.dataset.cardId = card.id;
        
        if (faceUp) {
            cardElement.innerHTML = `
                <div class="card-content">
                    <div class="card-rank">${card.rank}</div>
                    <div class="card-suit">${this.suitSymbols[card.suit]}</div>
                </div>
            `;
        } else {
            cardElement.innerHTML = '<div class="card-pattern"></div>';
        }
        
        return cardElement;
    }

    setupDragAndDrop() {
        document.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        document.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        document.addEventListener('mouseup', (e) => this.handleMouseUp(e));
        
        document.addEventListener('touchstart', (e) => this.handleTouchStart(e));
        document.addEventListener('touchmove', (e) => this.handleTouchMove(e));
        document.addEventListener('touchend', (e) => this.handleTouchEnd(e));
    }

    handleMouseDown(e) {
        const cardElement = e.target.closest('.card.face-up');
        if (cardElement && !this.isDragging) {
            // ダブルクリック検出
            const now = Date.now();
            if (this.lastTappedCard === cardElement && now - this.lastTapTime < 300) {
                // ダブルクリック - 自動移動を試行
                this.tryAutoMove(cardElement);
                this.lastTappedCard = null;
                this.lastTapTime = 0;
                return;
            }
            
            this.lastTappedCard = cardElement;
            this.lastTapTime = now;
            
            this.startDrag(cardElement, e.clientX, e.clientY);
        }
    }

    handleMouseMove(e) {
        if (this.isDragging) {
            this.updateDragPosition(e.clientX, e.clientY);
        }
    }

    handleMouseUp(e) {
        if (this.isDragging) {
            this.endDrag(e.clientX, e.clientY);
        }
    }

    handleTouchStart(e) {
        // マルチタッチを防ぐ
        if (e.touches.length > 1) {
            if (this.isDragging) {
                this.endDrag(0, 0); // 強制終了
            }
            return;
        }
        
        const touch = e.touches[0];
        const cardElement = touch.target.closest('.card.face-up');
        if (cardElement && !this.isDragging) {
            e.preventDefault();
            e.stopPropagation();
            
            // タッチフィードバック
            cardElement.style.transform = 'scale(1.05)';
            setTimeout(() => {
                if (cardElement && !this.isDragging) {
                    cardElement.style.transform = '';
                }
            }, 100);
            
            this.startDrag(cardElement, touch.clientX, touch.clientY);
        }
    }

    handleTouchMove(e) {
        if (this.isDragging) {
            e.preventDefault();
            e.stopPropagation();
            
            if (e.touches.length > 0) {
                const touch = e.touches[0];
                this.updateDragPosition(touch.clientX, touch.clientY);
            }
        }
    }

    handleTouchEnd(e) {
        if (this.isDragging) {
            e.preventDefault();
            e.stopPropagation();
            
            let touch = null;
            if (e.changedTouches.length > 0) {
                touch = e.changedTouches[0];
            } else if (e.touches.length > 0) {
                touch = e.touches[0];
            }
            
            if (touch) {
                this.endDrag(touch.clientX, touch.clientY);
            } else {
                // タッチ座標が取得できない場合は無効なドロップとして処理
                this.endDrag(0, 0);
            }
        }
    }

    startDrag(cardElement, x, y) {
        const cardId = parseInt(cardElement.dataset.cardId);
        const card = this.findCard(cardId);
        
        if (!card) {
            console.log('Card not found:', cardId);
            return;
        }
        
        // ドラッグ可能かチェック
        const location = this.findCardLocation(cardId);
        if (!this.canDragCard(cardId, location)) {
            console.log('Card cannot be dragged:', cardId);
            return;
        }
        
        console.log('Starting drag for card:', cardId, 'from:', location);
        
        this.isDragging = true;
        this.draggedCard = cardElement;
        this.draggedFrom = location;
        
        // 元の位置とスタイルを保存
        this.originalCardStyle = {
            position: cardElement.style.position,
            left: cardElement.style.left,
            top: cardElement.style.top,
            zIndex: cardElement.style.zIndex,
            pointerEvents: cardElement.style.pointerEvents,
            transform: cardElement.style.transform,
            opacity: cardElement.style.opacity
        };
        
        const rect = cardElement.getBoundingClientRect();
        this.dragOffset = {
            x: x - rect.left,
            y: y - rect.top
        };
        
        // ドラッグ中のスタイル設定
        cardElement.style.position = 'fixed';
        cardElement.style.zIndex = '1000';
        cardElement.style.pointerEvents = 'none';
        cardElement.style.opacity = '0.8';
        cardElement.style.transform = 'rotate(5deg)';
        cardElement.classList.add('dragging');
        
        this.updateDragPosition(x, y);
        
        // ドロップゾーンのハイライト
        this.highlightDropZones(true);
    }

    updateDragPosition(x, y) {
        if (this.draggedCard) {
            this.draggedCard.style.left = `${x - this.dragOffset.x}px`;
            this.draggedCard.style.top = `${y - this.dragOffset.y}px`;
        }
    }

    endDrag(x, y) {
        if (!this.isDragging) return;
        
        console.log('Ending drag at position:', x, y);
        
        this.isDragging = false;
        
        // ドロップゾーンのハイライトを削除
        this.highlightDropZones(false);
        
        const dropTarget = this.getDropTarget(x, y);
        console.log('Drop target:', dropTarget);
        
        if (dropTarget && this.canDropCard(dropTarget)) {
            console.log('Valid drop, moving card');
            this.dropCard(dropTarget);
        } else {
            console.log('Invalid drop, resetting card position');
            this.resetCardPosition();
            // 無効なドロップの場合は軽く振動効果
            if (this.draggedCard) {
                this.draggedCard.style.animation = 'shake 0.3s ease-in-out';
                setTimeout(() => {
                    if (this.draggedCard) {
                        this.draggedCard.style.animation = '';
                    }
                }, 300);
            }
        }
        
        // クリーンアップ
        this.cleanupDrag();
    }

    resetCardPosition() {
        if (this.draggedCard && this.originalCardStyle) {
            console.log('Resetting card to original position');
            
            // 元のスタイルを復元
            Object.keys(this.originalCardStyle).forEach(key => {
                this.draggedCard.style[key] = this.originalCardStyle[key];
            });
            
            this.draggedCard.classList.remove('dragging');
            
            // アニメーション効果で元の位置に戻る
            this.draggedCard.style.transition = 'all 0.3s ease-out';
            setTimeout(() => {
                if (this.draggedCard) {
                    this.draggedCard.style.transition = '';
                }
            }, 300);
        }
    }

    cleanupDrag() {
        if (this.draggedCard) {
            this.draggedCard.classList.remove('dragging');
            this.draggedCard.style.transition = '';
        }
        
        this.draggedCard = null;
        this.draggedFrom = null;
        this.originalCardStyle = null;
    }

    highlightDropZones(highlight) {
        // ファウンデーションのハイライト
        this.elements.foundations.forEach(foundation => {
            if (highlight) {
                foundation.classList.add('drop-zone-highlight');
            } else {
                foundation.classList.remove('drop-zone-highlight');
            }
        });
        
        // タブローのハイライト
        this.elements.tableau.forEach(tableau => {
            if (highlight) {
                tableau.classList.add('drop-zone-highlight');
            } else {
                tableau.classList.remove('drop-zone-highlight');
            }
        });
    }

    getDropTarget(x, y) {
        // タッチ座標での要素取得を改善
        const elements = document.elementsFromPoint(x, y);
        console.log('Elements at drop point:', elements.map(el => el.className));
        
        for (const element of elements) {
            // ファウンデーション
            if (element.classList.contains('foundation')) {
                const index = this.elements.foundations.indexOf(element);
                if (index >= 0) {
                    return { type: 'foundation', index: index };
                }
            }
            
            // タブロー
            if (element.classList.contains('tableau-pile')) {
                const index = parseInt(element.dataset.column);
                if (!isNaN(index)) {
                    return { type: 'tableau', index: index };
                }
            }
            
            // 親要素もチェック
            const parent = element.parentElement;
            if (parent) {
                if (parent.classList.contains('foundation')) {
                    const index = this.elements.foundations.indexOf(parent);
                    if (index >= 0) {
                        return { type: 'foundation', index: index };
                    }
                }
                
                if (parent.classList.contains('tableau-pile')) {
                    const index = parseInt(parent.dataset.column);
                    if (!isNaN(index)) {
                        return { type: 'tableau', index: index };
                    }
                }
            }
        }
        
        return null;
    }

    canDragCard(cardId, location) {
        if (location.type === 'waste') {
            // 捨て札の一番上のカードのみドラッグ可能
            return this.gameState.waste.length > 0 && 
                   this.gameState.waste[this.gameState.waste.length - 1].id === cardId;
        } else if (location.type === 'foundation') {
            // ファウンデーションの一番上のカードのみドラッグ可能
            const foundation = this.gameState.foundations[location.index];
            return foundation.length > 0 && foundation[foundation.length - 1].id === cardId;
        } else if (location.type === 'tableau') {
            // タブローでは表向きのカードのみドラッグ可能
            const column = this.gameState.tableau[location.index];
            const cardIndex = column.findIndex(c => c.id === cardId);
            return cardIndex >= 0 && column[cardIndex].faceUp;
        }
        
        return false;
    }

    canDropCard(dropTarget) {
        const cardId = parseInt(this.draggedCard.dataset.cardId);
        const card = this.findCard(cardId);
        
        if (dropTarget.type === 'foundation') {
            return this.canDropOnFoundation(card, dropTarget.index);
        } else if (dropTarget.type === 'tableau') {
            return this.canDropOnTableau(card, dropTarget.index);
        }
        
        return false;
    }

    canDropOnFoundation(card, foundationIndex) {
        const foundation = this.gameState.foundations[foundationIndex];
        
        if (foundation.length === 0) {
            return card.value === 1; // エースのみ
        } else {
            const topCard = foundation[foundation.length - 1];
            return card.suit === topCard.suit && card.value === topCard.value + 1;
        }
    }

    canDropOnTableau(card, tableauIndex) {
        const column = this.gameState.tableau[tableauIndex];
        
        if (column.length === 0) {
            return card.value === 13; // キングのみ
        } else {
            const topCard = column[column.length - 1];
            return card.color !== topCard.color && card.value === topCard.value - 1;
        }
    }

    dropCard(dropTarget) {
        const cardId = parseInt(this.draggedCard.dataset.cardId);
        console.log('Dropping card:', cardId, 'to:', dropTarget);
        
        // 移動前の状態を保存
        this.saveGameState();
        
        try {
            if (dropTarget.type === 'foundation') {
                this.moveToFoundation(cardId, dropTarget.index);
            } else if (dropTarget.type === 'tableau') {
                this.moveToTableau(cardId, dropTarget.index);
            }
            
            this.moveCount++;
            this.updateScore();
            
            // 成功のフィードバック
            if (this.draggedCard) {
                this.draggedCard.style.animation = 'dropSuccess 0.3s ease-out';
            }
            
            // 画面を更新
            setTimeout(() => {
                this.renderBoard();
                this.updateGameDisplay();
                this.checkWin();
            }, 100);
            
            console.log('Card moved successfully');
            
        } catch (error) {
            console.error('Error moving card:', error);
            this.resetCardPosition();
        }
    }

    moveToFoundation(cardId, foundationIndex) {
        const card = this.removeCard(cardId);
        if (card) {
            this.gameState.foundations[foundationIndex].push(card);
            this.revealTopCard();
        }
    }

    moveToTableau(cardId, tableauIndex) {
        const cards = this.removeCardSequence(cardId);
        if (cards.length > 0) {
            this.gameState.tableau[tableauIndex].push(...cards);
            this.revealTopCard();
        }
    }

    removeCard(cardId) {
        // 捨て札から削除
        const wasteIndex = this.gameState.waste.findIndex(c => c.id === cardId);
        if (wasteIndex >= 0) {
            return this.gameState.waste.splice(wasteIndex, 1)[0];
        }
        
        // ファウンデーションから削除
        for (let i = 0; i < 4; i++) {
            const foundation = this.gameState.foundations[i];
            const cardIndex = foundation.findIndex(c => c.id === cardId);
            if (cardIndex >= 0) {
                return foundation.splice(cardIndex, 1)[0];
            }
        }
        
        // タブローから削除
        for (let i = 0; i < 7; i++) {
            const column = this.gameState.tableau[i];
            const cardIndex = column.findIndex(c => c.id === cardId);
            if (cardIndex >= 0) {
                return column.splice(cardIndex, 1)[0];
            }
        }
        
        return null;
    }

    removeCardSequence(cardId) {
        // タブローからカードシーケンスを削除
        for (let i = 0; i < 7; i++) {
            const column = this.gameState.tableau[i];
            const cardIndex = column.findIndex(c => c.id === cardId);
            if (cardIndex >= 0) {
                return column.splice(cardIndex);
            }
        }
        
        // 単一カードの場合
        const card = this.removeCard(cardId);
        return card ? [card] : [];
    }

    revealTopCard() {
        // タブローの各列で裏向きの一番上のカードを表向きにする
        for (let i = 0; i < 7; i++) {
            const column = this.gameState.tableau[i];
            if (column.length > 0) {
                const topCard = column[column.length - 1];
                if (!topCard.faceUp) {
                    topCard.faceUp = true;
                }
            }
        }
    }

    findCard(cardId) {
        // 全ての場所からカードを検索
        const allCards = [
            ...this.gameState.stock,
            ...this.gameState.waste,
            ...this.gameState.foundations.flat(),
            ...this.gameState.tableau.flat()
        ];
        
        return allCards.find(card => card.id === cardId);
    }

    findCardLocation(cardId) {
        // 捨て札
        if (this.gameState.waste.some(c => c.id === cardId)) {
            return { type: 'waste' };
        }
        
        // ファウンデーション
        for (let i = 0; i < 4; i++) {
            if (this.gameState.foundations[i].some(c => c.id === cardId)) {
                return { type: 'foundation', index: i };
            }
        }
        
        // タブロー
        for (let i = 0; i < 7; i++) {
            if (this.gameState.tableau[i].some(c => c.id === cardId)) {
                return { type: 'tableau', index: i };
            }
        }
        
        return null;
    }

    tryAutoMove(cardElement) {
        const cardId = parseInt(cardElement.dataset.cardId);
        const card = this.findCard(cardId);
        const location = this.findCardLocation(cardId);
        
        if (!card || !this.canDragCard(cardId, location)) {
            return;
        }
        
        console.log('Trying auto move for card:', cardId);
        
        // ファウンデーションへの移動を優先
        for (let i = 0; i < 4; i++) {
            if (this.canDropOnFoundation(card, i)) {
                console.log('Auto moving to foundation:', i);
                this.saveGameState();
                this.moveToFoundation(cardId, i);
                this.moveCount++;
                this.updateScore();
                
                // 成功のフィードバック
                cardElement.style.animation = 'dropSuccess 0.5s ease-out';
                
                setTimeout(() => {
                    this.renderBoard();
                    this.updateGameDisplay();
                    this.checkWin();
                }, 100);
                return;
            }
        }
        
        // タブローへの移動を試行
        for (let i = 0; i < 7; i++) {
            if (this.canDropOnTableau(card, i)) {
                console.log('Auto moving to tableau:', i);
                this.saveGameState();
                this.moveToTableau(cardId, i);
                this.moveCount++;
                this.updateScore();
                
                // 成功のフィードバック
                cardElement.style.animation = 'dropSuccess 0.5s ease-out';
                
                setTimeout(() => {
                    this.renderBoard();
                    this.updateGameDisplay();
                    this.checkWin();
                }, 100);
                return;
            }
        }
        
        // 移動できない場合は振動効果
        cardElement.style.animation = 'shake 0.3s ease-in-out';
        console.log('No valid auto move found');
    }

    drawFromStock() {
        if (this.gameState.stock.length <= this.gameState.stockIndex) {
            // 山札が空の場合、捨て札を山札に戻す
            if (this.gameState.waste.length > 0) {
                this.gameState.stock = [...this.gameState.waste.reverse()];
                this.gameState.waste = [];
                this.gameState.stockIndex = 0;
                
                // 全て裏向きにする
                this.gameState.stock.forEach(card => card.faceUp = false);
            }
        }
        
        if (this.gameState.stock.length > this.gameState.stockIndex) {
            const drawCount = this.difficulty === 'easy' ? 1 : 3;
            
            for (let i = 0; i < drawCount && this.gameState.stockIndex < this.gameState.stock.length; i++) {
                const card = this.gameState.stock[this.gameState.stockIndex++];
                card.faceUp = true;
                this.gameState.waste.push(card);
            }
            
            this.renderBoard();
        }
    }

    updateScore() {
        // スコア計算
        let score = 0;
        
        // ファウンデーションのカード数 × 10
        for (const foundation of this.gameState.foundations) {
            score += foundation.length * 10;
        }
        
        // 時間ボーナス
        if (this.gameStartTime) {
            const timeElapsed = Math.floor((Date.now() - this.gameStartTime) / 1000);
            const timeBonus = Math.max(0, 1000 - timeElapsed);
            score += timeBonus;
        }
        
        this.gameScore = score;
    }

    updateGameDisplay() {
        this.elements.gameScore.textContent = this.gameScore;
        this.elements.moveCount.textContent = this.moveCount;
        this.elements.undoBtn.disabled = this.undoStack.length === 0;
    }

    startGameTimer() {
        this.gameStartTime = Date.now();
        this.gameTimer = setInterval(() => {
            const elapsed = Math.floor((Date.now() - this.gameStartTime) / 1000);
            const minutes = Math.floor(elapsed / 60);
            const seconds = elapsed % 60;
            this.elements.gameTime.textContent = 
                `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }, 1000);
    }

    stopGameTimer() {
        if (this.gameTimer) {
            clearInterval(this.gameTimer);
            this.gameTimer = null;
        }
    }

    saveGameState() {
        // アンドゥ用の状態保存
        const state = {
            stock: JSON.parse(JSON.stringify(this.gameState.stock)),
            waste: JSON.parse(JSON.stringify(this.gameState.waste)),
            foundations: JSON.parse(JSON.stringify(this.gameState.foundations)),
            tableau: JSON.parse(JSON.stringify(this.gameState.tableau)),
            stockIndex: this.gameState.stockIndex,
            score: this.gameScore,
            moveCount: this.moveCount
        };
        
        this.undoStack.push(state);
        if (this.undoStack.length > this.maxUndoSteps) {
            this.undoStack.shift();
        }
    }

    undoMove() {
        if (this.undoStack.length > 0) {
            const previousState = this.undoStack.pop();
            this.gameState = {
                stock: previousState.stock,
                waste: previousState.waste,
                foundations: previousState.foundations,
                tableau: previousState.tableau,
                stockIndex: previousState.stockIndex
            };
            this.gameScore = previousState.score;
            this.moveCount = previousState.moveCount;
            
            this.renderBoard();
            this.updateGameDisplay();
        }
    }

    showHint() {
        // 簡単なヒント機能
        const hints = [];
        
        // ファウンデーションに置けるカードをチェック
        for (let i = 0; i < 4; i++) {
            const foundation = this.gameState.foundations[i];
            const targetValue = foundation.length === 0 ? 1 : foundation[foundation.length - 1].value + 1;
            const targetSuit = foundation.length === 0 ? null : foundation[foundation.length - 1].suit;
            
            // 捨て札をチェック
            if (this.gameState.waste.length > 0) {
                const topWaste = this.gameState.waste[this.gameState.waste.length - 1];
                if ((foundation.length === 0 && topWaste.value === 1) ||
                    (foundation.length > 0 && topWaste.suit === targetSuit && topWaste.value === targetValue)) {
                    hints.push(`捨て札の${topWaste.rank}${this.suitSymbols[topWaste.suit]}をファウンデーションに移動できます`);
                }
            }
            
            // タブローをチェック
            for (let j = 0; j < 7; j++) {
                const column = this.gameState.tableau[j];
                if (column.length > 0) {
                    const topCard = column[column.length - 1];
                    if (topCard.faceUp && 
                        ((foundation.length === 0 && topCard.value === 1) ||
                         (foundation.length > 0 && topCard.suit === targetSuit && topCard.value === targetValue))) {
                        hints.push(`タブロー${j + 1}の${topCard.rank}${this.suitSymbols[topCard.suit]}をファウンデーションに移動できます`);
                    }
                }
            }
        }
        
        if (hints.length > 0) {
            alert(hints[0]);
        } else {
            alert('現在利用可能な明確な手がありません。山札をめくってみてください。');
        }
    }

    checkWin() {
        // 全てのファウンデーションが13枚揃っているかチェック
        const totalFoundationCards = this.gameState.foundations.reduce((sum, foundation) => sum + foundation.length, 0);
        if (totalFoundationCards === 52) {
            this.endGame(true);
        }
    }

    endGame(won) {
        this.stopGameTimer();
        
        const finalTime = this.gameStartTime ? Math.floor((Date.now() - this.gameStartTime) / 1000) : 0;
        
        // 統計更新
        this.updateStatistics(won, this.gameScore, finalTime);
        
        // 結果画面の設定
        this.elements.resultTitle.textContent = won ? 'ゲームクリア！' : 'ゲーム終了';
        this.elements.resultMessage.textContent = won ? 
            'おめでとうございます！全てのカードを並べました！' : 
            'お疲れ様でした！';
        this.elements.finalScore.textContent = this.gameScore;
        this.elements.finalTime.textContent = this.formatTime(finalTime);
        this.elements.finalMoves.textContent = this.moveCount;
        
        this.showScreen('result');
    }

    formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    updateStatistics(won, score, time) {
        this.statistics.totalGames++;
        if (won) {
            this.statistics.wonGames++;
            if (score > this.statistics.bestScore) {
                this.statistics.bestScore = score;
            }
            if (this.statistics.bestTime === 0 || time < this.statistics.bestTime) {
                this.statistics.bestTime = time;
            }
        }
        
        this.statistics.totalTime += time;
        this.saveStatistics();
    }

    loadStatistics() {
        const saved = localStorage.getItem('solitaire_statistics');
        if (saved) {
            return JSON.parse(saved);
        }
        return {
            totalGames: 0,
            wonGames: 0,
            bestScore: 0,
            bestTime: 0,
            totalTime: 0
        };
    }

    saveStatistics() {
        localStorage.setItem('solitaire_statistics', JSON.stringify(this.statistics));
    }

    updateStatisticsDisplay() {
        this.elements.totalGames.textContent = this.statistics.totalGames;
        this.elements.wonGames.textContent = this.statistics.wonGames;
        
        const winRate = this.statistics.totalGames > 0 ? 
            Math.round((this.statistics.wonGames / this.statistics.totalGames) * 100) : 0;
        this.elements.winRate.textContent = `${winRate}%`;
        
        this.elements.bestScore.textContent = this.statistics.bestScore;
        this.elements.bestTime.textContent = this.statistics.bestTime > 0 ? 
            this.formatTime(this.statistics.bestTime) : '--:--';
        
        const averageTime = this.statistics.wonGames > 0 ? 
            Math.floor(this.statistics.totalTime / this.statistics.wonGames) : 0;
        this.elements.averageTime.textContent = averageTime > 0 ? 
            this.formatTime(averageTime) : '--:--';
    }

    clearStatistics() {
        if (confirm('統計データをリセットしますか？')) {
            this.statistics = {
                totalGames: 0,
                wonGames: 0,
                bestScore: 0,
                bestTime: 0,
                totalTime: 0
            };
            this.saveStatistics();
            this.updateStatisticsDisplay();
        }
    }

    showStatistics() {
        this.updateStatisticsDisplay();
        this.showScreen('statistics');
    }

    backToMenu() {
        this.stopGameTimer();
        this.showScreen('menu');
    }

    showScreen(screenName) {
        console.log('Showing screen:', screenName);
        
        // 全ての画面を非表示
        Object.values(this.screens).forEach(screen => {
            screen.classList.remove('active');
        });
        
        // 指定された画面を表示
        if (this.screens[screenName]) {
            this.screens[screenName].classList.add('active');
            console.log('Screen', screenName, 'is now active');
        } else {
            console.error('Screen not found:', screenName);
        }
    }
}

// ゲーム開始
document.addEventListener('DOMContentLoaded', () => {
    console.log('Initializing Solitaire Game');
    window.solitaireGame = new SolitaireGame();
}); 