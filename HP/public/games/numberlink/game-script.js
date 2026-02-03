// Firebase設定
const firebaseConfig = {
    apiKey: "AIzaSyC16EouqGT7zq2S1KSSAFWnmgWPYb1r49E",
    authDomain: "sggame-hub.firebaseapp.com",
    databaseURL: "https://sggame-hub-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "sggame-hub",
    storageBucket: "sggame-hub.firebasestorage.app",
    messagingSenderId: "228141329072",
    appId: "1:228141329072:web:66b1f70f1c16df891f6975"
};

// Firebase初期化
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// グローバル変数
let playerName = '';
let playerId = '';
let currentRoom = null;
let currentRoomCode = '';
let isHost = false;
let myCard = null;
let hasPlayedCard = false;
let hasSubmittedDescription = false;
let isCheckingCards = false; // ローカル判定フラグ（Firebase書き込み不要）
let lastJudgeTimestamp = 0; // 演出の重複表示防止用

// テーマプリセット（20種類）
const themePresets = [
    "好きな食べ物",
    "行ってみたい場所",
    "怖いもの",
    "得意なこと",
    "好きな季節",
    "好きな色",
    "大切なもの",
    "欲しいもの",
    "幸せを感じる瞬間",
    "ストレス解消法",
    "好きな動物",
    "理想の休日",
    "好きな音楽",
    "得意料理",
    "苦手なこと",
    "思い出の場所",
    "好きな映画",
    "趣味",
    "子供の頃の夢",
    "最近嬉しかったこと"
];

// ページ読み込み時の初期化
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🎮 ナンバーリンク - ゲーム開始');
    generatePlayerId();
    showScreen('startScreen');
    
    // Firebase接続テスト
    try {
        console.log('🔗 Firebase接続テスト中...');
        const testRef = database.ref('.info/connected');
        const snapshot = await testRef.once('value');
        const connected = snapshot.val();
        
        if (connected) {
            console.log('✅ Firebase接続成功！');
        } else {
            console.warn('⚠️ Firebaseに接続できていません');
        }
    } catch (error) {
        console.error('❌ Firebase接続エラー:', error);
        console.log('💡 Firebase Consoleを確認してください:');
        console.log('   https://console.firebase.google.com/project/sggame-hub/database');
    }
});

// プレイヤーID生成
function generatePlayerId() {
    playerId = 'player_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// 画面切り替え
function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    document.getElementById(screenId).classList.add('active');
}

// ローディング表示/非表示
function showLoading() {
    document.getElementById('loadingOverlay').classList.add('active');
}

function hideLoading() {
    document.getElementById('loadingOverlay').classList.remove('active');
}

// ============================================
// ルーム作成・参加機能
// ============================================

function showCreateRoom() {
    const name = document.getElementById('playerNameInput').value.trim();
    if (!name) {
        alert('プレイヤー名を入力してください');
        return;
    }
    playerName = name;
    
    showScreen('createRoomScreen');
}

function showJoinRoom() {
    const name = document.getElementById('playerNameInput').value.trim();
    if (!name) {
        alert('プレイヤー名を入力してください');
        return;
    }
    playerName = name;
    showScreen('joinRoomScreen');
}

function backToStart() {
    if (currentRoomCode) {
        leaveRoom();
    }
    showScreen('startScreen');
}

function copyLobbyRoomCode() {
    const roomCode = document.getElementById('lobbyRoomCode').textContent;
    navigator.clipboard.writeText(roomCode).then(() => {
        addLog('ルームコードをコピーしました', 'success');
        const btn = document.querySelector('.copy-btn');
        const originalText = btn.textContent;
        btn.textContent = '✅ コピー済';
        setTimeout(() => btn.textContent = originalText, 2000);
    }).catch(err => {
        console.error('コピー失敗:', err);
        alert('コピーに失敗しました: ' + roomCode);
    });
}

async function createRoom() {
    showLoading();
    
    const maxPlayers = parseInt(document.getElementById('maxPlayers').value);
    
    const roomCode = Math.floor(100000 + Math.random() * 900000).toString();
    currentRoomCode = roomCode;
    
    console.log('🏠 ルーム作成開始:', roomCode);
    
    try {
        const roomRef = database.ref('numberlink_rooms/' + roomCode);
        
        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('接続タイムアウト')), 10000)
        );
        
        const snapshot = await Promise.race([
            roomRef.once('value'),
            timeoutPromise
        ]);
        
        console.log('✅ Firebase接続成功');
        
        if (snapshot.exists()) {
            alert('このルームコードは既に使用されています。もう一度お試しください。');
            hideLoading();
            showCreateRoom();
            return;
        }
        
        const roomData = {
            roomCode: roomCode,
            hostId: playerId,
            maxPlayers: maxPlayers,
            players: {},
            gameState: 'waiting',
            level: 1,
            lives: 3,
            currentTheme: '',
            themeSelectorId: '',
            playedCards: [],
            currentTurn: 0,
            createdAt: Date.now(),
            isChecking: false
        };
        
        roomData.players[playerId] = {
            id: playerId,
            name: playerName,
            isHost: true,
            card: null,
            description: '',
            hasPlayed: false,
            joinedAt: Date.now()
        };
        
        console.log('💾 ルームデータを保存中...');
        await roomRef.set(roomData);
        console.log('✅ ルーム作成完了');
        
        isHost = true;
        currentRoom = roomData;
        
        listenToRoom(roomCode);
        
        hideLoading();
        showLobby();
        addLog('ルームを作成しました');
        
    } catch (error) {
        console.error('❌ ルーム作成エラー:', error);
        hideLoading();
        alert('ルームの作成に失敗しました: ' + error.message);
    }
}

async function joinRoom() {
    const roomCode = document.getElementById('roomCodeInput').value.trim();
    
    if (!roomCode || roomCode.length !== 6) {
        alert('6桁のルームコードを入力してください');
        return;
    }
    
    showLoading();
    currentRoomCode = roomCode;
    
    console.log('🚪 ルーム参加開始:', roomCode);
    
    try {
        const roomRef = database.ref('numberlink_rooms/' + roomCode);
        
        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('接続タイムアウト')), 10000)
        );
        
        const snapshot = await Promise.race([
            roomRef.once('value'),
            timeoutPromise
        ]);
        
        console.log('✅ Firebase接続成功');
        
        if (!snapshot.exists()) {
            alert('ルームが見つかりません');
            hideLoading();
            return;
        }
        
        const roomData = snapshot.val();
        
        const playerCount = Object.keys(roomData.players || {}).length;
        if (playerCount >= roomData.maxPlayers) {
            alert('ルームが満員です');
            hideLoading();
            return;
        }
        
        if (roomData.gameState !== 'waiting') {
            alert('ゲームが既に開始されています');
            hideLoading();
            return;
        }
        
        console.log('💾 プレイヤー情報を保存中...');
        
        await roomRef.child('players/' + playerId).set({
            id: playerId,
            name: playerName,
            isHost: false,
            card: null,
            description: '',
            hasPlayed: false,
            joinedAt: Date.now()
        });
        
        console.log('✅ ルーム参加完了');
        
        isHost = false;
        currentRoom = roomData;
        
        listenToRoom(roomCode);
        
        hideLoading();
        showLobby();
        addLog('ルームに参加しました');
        
    } catch (error) {
        console.error('❌ ルーム参加エラー:', error);
        hideLoading();
        alert('ルームへの参加に失敗しました: ' + error.message);
    }
}

// ルームの変更をリッスン
function listenToRoom(roomCode) {
    const roomRef = database.ref('numberlink_rooms/' + roomCode);
    
    roomRef.on('value', (snapshot) => {
        if (!snapshot.exists()) {
            alert('ルームが終了しました');
            backToStart();
            return;
        }
        
        currentRoom = snapshot.val();
        updateUI();
        
        // ホストのみ：全員が出したかチェックして判定
        // ローカルフラグでチェック（Firebase書き込み不要）
        if (isHost && currentRoom.gameState === 'playing' && !isCheckingCards) {
            checkAllPlayed(currentRoom);
        }
    });
}

function checkAllPlayed(roomData) {
    // レベルに応じた必要カード枚数を計算
    const level = roomData.level || 1;
    const totalPlayers = Object.keys(roomData.players).length;
    const requiredCards = totalPlayers * level; // レベル1なら1枚ずつ、レベル2なら2枚ずつ...
    
    const playedCount = (roomData.playedCards || []).length;
    
    if (playedCount >= requiredCards) {
        console.log(`🎉 全員が出しました！(${playedCount}/${requiredCards}) 判定を開始します...`);
        
        if (isHost && !isCheckingCards) {
            // ローカルフラグを立てる（Firebase書き込み不要で高速）
            isCheckingCards = true;
            setTimeout(() => checkCardsOrder(roomData), 1000);
        }
    }
}

function showLobby() {
    document.getElementById('lobbyRoomCode').textContent = currentRoomCode;
    showScreen('lobbyScreen');
    updateLobbyUI();
}

function updateLobbyUI() {
    if (!currentRoom) return;
    
    const players = currentRoom.players || {};
    const playerCount = Object.keys(players).length;
    const maxPlayers = currentRoom.maxPlayers;
    
    document.getElementById('currentPlayerCount').textContent = playerCount;
    document.getElementById('maxPlayerCount').textContent = maxPlayers;
    
    const playersList = document.getElementById('playersList');
    playersList.innerHTML = '';
    
    Object.values(players).forEach(player => {
        const playerItem = document.createElement('div');
        playerItem.className = 'player-item' + (player.isHost ? ' host' : '');
        playerItem.innerHTML = `
            <span class="player-icon">${player.isHost ? '👑' : '👤'}</span>
            <span class="player-name">${player.name}</span>
            ${player.isHost ? '<span class="host-badge">ホスト</span>' : ''}
        `;
        playersList.appendChild(playerItem);
    });
    
    const startBtn = document.getElementById('startGameBtn');
    if (isHost) {
        startBtn.disabled = playerCount < 2;
    } else {
        startBtn.style.display = 'none';
    }
}

async function leaveRoom() {
    if (!currentRoomCode) return;
    
    try {
        const roomRef = database.ref('numberlink_rooms/' + currentRoomCode);
        
        await roomRef.child('players/' + playerId).remove();
        
        if (isHost) {
            await roomRef.remove();
        }
        
        roomRef.off();
        
        currentRoom = null;
        currentRoomCode = '';
        isHost = false;
        
    } catch (error) {
        console.error('退出エラー:', error);
    }
}

// ============================================
// ゲーム開始・進行
// ============================================

async function startGame() {
    if (!isHost) return;
    
    showLoading();
    
    try {
        const roomRef = database.ref('numberlink_rooms/' + currentRoomCode);
        const players = Object.keys(currentRoom.players);
        
        // レベル1なので1枚ずつ配布
        const hands = distributeCards(players.length, 1);
        
        const updates = {};
        players.forEach((playerId, index) => {
            // 配列で保存（1枚でも配列）
            updates[`players/${playerId}/card`] = hands[index];
            updates[`players/${playerId}/hasPlayed`] = false;
            updates[`players/${playerId}/description`] = '';
        });
        
        const themeSelectorId = players[Math.floor(Math.random() * players.length)];
        
        updates['gameState'] = 'selectingTheme';
        updates['level'] = 1;
        updates['lives'] = 3;
        updates['themeSelectorId'] = themeSelectorId;
        updates['playedCards'] = [];
        updates['currentTurn'] = 0;
        updates['currentTheme'] = '';
        updates['judgeResult'] = null; // リセット
        
        await roomRef.update(updates);
        
        // ローカルフラグリセット
        isCheckingCards = false;
        
        hideLoading();
        addLog('ゲームを開始しました！');
        
    } catch (error) {
        console.error('ゲーム開始エラー:', error);
        alert('ゲームの開始に失敗しました');
        hideLoading();
    }
}

function distributeCards(playerCount, cardsPerPlayer = 1) {
    const allNumbers = Array.from({length: 100}, (_, i) => i + 1);
    for (let i = allNumbers.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [allNumbers[i], allNumbers[j]] = [allNumbers[j], allNumbers[i]];
    }
    
    // 各プレイヤーに複数枚配布（レベルに応じて）
    const totalCards = playerCount * cardsPerPlayer;
    const selectedNumbers = allNumbers.slice(0, totalCards);
    
    // プレイヤーごとに分割
    const hands = [];
    for (let i = 0; i < playerCount; i++) {
        hands.push(selectedNumbers.slice(i * cardsPerPlayer, (i + 1) * cardsPerPlayer));
    }
    
    return hands;
}

function updateUI() {
    if (!currentRoom) return;
    
    const gameState = currentRoom.gameState;
    
    // 判定結果の表示（タイムスタンプチェックで重複防止）
    if (currentRoom.judgeResult && currentRoom.judgeResult.timestamp !== lastJudgeTimestamp) {
        lastJudgeTimestamp = currentRoom.judgeResult.timestamp;
        showJudgeResult(currentRoom.judgeResult.isCorrect, currentRoom.judgeResult.message);
    }
    
    if (gameState === 'waiting') {
        updateLobbyUI();
    } else if (gameState === 'selectingTheme' || gameState === 'playing') {
        if (!document.getElementById('gameScreen').classList.contains('active')) {
            showGameScreen();
        } else {
            updateGameUI();
        }
    } else if (gameState === 'finished') {
        showResult();
    }
}

function showGameScreen() {
    showScreen('gameScreen');
    setupDragAndDrop();
    updateGameUI();
}

let selectedCard = null;

function setupDragAndDrop() {
    const myCards = document.querySelectorAll('.my-card');
    const playArea = document.querySelector('.played-cards-area');
    
    if (!playArea) return;
    
    // 各カードにドラッグイベントを設定
    myCards.forEach(cardEl => {
        cardEl.setAttribute('draggable', true);
        
        cardEl.addEventListener('dragstart', (e) => {
            if (!currentRoom.currentTheme) {
                e.preventDefault();
                return;
            }
            
            selectedCard = parseInt(cardEl.dataset.cardValue);
            e.dataTransfer.setData('text/plain', selectedCard);
            e.dataTransfer.effectAllowed = 'move';
            cardEl.classList.add('dragging');
            
            const dragImg = cardEl.cloneNode(true);
            dragImg.style.position = 'absolute';
            dragImg.style.top = '-1000px';
            document.body.appendChild(dragImg);
            e.dataTransfer.setDragImage(dragImg, 50, 80);
            setTimeout(() => document.body.removeChild(dragImg), 0);
        });
        
        cardEl.addEventListener('dragend', () => {
            cardEl.classList.remove('dragging');
            playArea.classList.remove('drag-over');
        });
        
        // タッチ操作
        cardEl.addEventListener('touchstart', (e) => handleTouchStart(e, cardEl), {passive: false});
        cardEl.addEventListener('touchmove', handleTouchMove, {passive: false});
        cardEl.addEventListener('touchend', (e) => handleTouchEnd(e, cardEl));
    });
    
    // ドロップゾーン（場）
    playArea.addEventListener('dragover', (e) => {
        if (!currentRoom.currentTheme) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        playArea.classList.add('drag-over');
    });
    
    playArea.addEventListener('dragleave', () => {
        playArea.classList.remove('drag-over');
    });
    
    playArea.addEventListener('drop', (e) => {
        e.preventDefault();
        playArea.classList.remove('drag-over');
        
        if (currentRoom.currentTheme && selectedCard) {
            playCard(selectedCard);
        }
    });
}

let touchStartX, touchStartY;
let touchCard;

function handleTouchStart(e, cardEl) {
    if (!currentRoom.currentTheme) return;
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
    touchCard = cardEl;
    selectedCard = parseInt(cardEl.dataset.cardValue);
    touchCard.classList.add('dragging');
}

function handleTouchMove(e) {
    if (!touchCard) return;
    e.preventDefault();
    
    const touch = e.touches[0];
    const deltaX = touch.clientX - touchStartX;
    const deltaY = touch.clientY - touchStartY;
    
    touchCard.style.transform = `translate(${deltaX}px, ${deltaY}px) scale(1.1)`;
}

function handleTouchEnd(e, cardEl) {
    if (!touchCard) return;
    touchCard.classList.remove('dragging');
    touchCard.style.transform = '';
    
    const touch = e.changedTouches[0];
    const playArea = document.querySelector('.played-cards-area');
    const rect = playArea.getBoundingClientRect();
    
    if (touch.clientX >= rect.left && touch.clientX <= rect.right &&
        touch.clientY >= rect.top && touch.clientY <= rect.bottom) {
        if (currentRoom.currentTheme && selectedCard) {
            playCard(selectedCard);
        }
    }
    
    touchCard = null;
}

function updateGameUI() {
    if (!currentRoom) return;
    
    const gameScreen = document.getElementById('gameScreen');
    if (!gameScreen.classList.contains('active')) return;
    
    const levelEl = document.getElementById('currentLevel');
    if (levelEl) levelEl.textContent = currentRoom.level || 1;
    updateLivesDisplay();
    
    const players = currentRoom.players || {};
    const myPlayerData = players[playerId];
    
    if (!myPlayerData) return;
    
    // 手札を取得（配列または単一値）
    let hand = myPlayerData.card;
    if (!Array.isArray(hand)) hand = [hand];
    // null除外
    hand = hand.filter(c => c !== null && c !== undefined);
    
    hasPlayedCard = myPlayerData.hasPlayed;
    
    // 複数カードを表示
    const cardsContainer = document.getElementById('myCardsContainer');
    if (cardsContainer) {
        cardsContainer.innerHTML = ''; // クリア
        
        if (hand.length > 0 && !hasPlayedCard) {
            hand.forEach((cardValue, index) => {
                const cardEl = document.createElement('div');
                cardEl.className = 'card my-card';
                cardEl.dataset.cardValue = cardValue;
                cardEl.innerHTML = `
                    <div class="card-number">${cardValue}</div>
                    <div class="card-symbol">${getSymbolForCard(cardValue)}</div>
                `;
                cardsContainer.appendChild(cardEl);
            });
            
            // ドラッグ＆ドロップのセットアップ（全カードに適用）
            setupDragAndDrop();
        } else if (hasPlayedCard) {
            cardsContainer.innerHTML = '<p style="color: white;">手札なし</p>';
        }
    }
    
    const isThemeSelector = currentRoom.themeSelectorId === playerId;
    const hasTheme = currentRoom.currentTheme;
    const themeSelector = document.getElementById('themeSelector');
    const themeDisplay = document.getElementById('themeDisplay');
    const currentThemeEl = document.getElementById('currentTheme');
    const selectorNameEl = document.getElementById('themeSelectorName');
    
    if (themeSelector && themeDisplay) {
        if (!hasTheme && isThemeSelector) {
            themeSelector.style.display = 'block';
            themeDisplay.style.display = 'none';
        } else if (hasTheme) {
            themeSelector.style.display = 'none';
            themeDisplay.style.display = 'block';
            if (currentThemeEl) currentThemeEl.textContent = currentRoom.currentTheme;
            
            const selector = Object.values(players).find(p => p.id === currentRoom.themeSelectorId);
            if (selectorNameEl) selectorNameEl.textContent = selector ? selector.name : '---';
        } else {
            themeSelector.style.display = 'none';
            themeDisplay.style.display = 'block';
            if (currentThemeEl) currentThemeEl.textContent = '選択中...';
        }
    }
    
    const hasDescription = myPlayerData.description;
    const descInput = document.getElementById('cardDescription');
    const submitBtn = document.getElementById('submitDescriptionBtn');
    
    if (descInput) descInput.value = hasDescription || '';
    if (submitBtn) submitBtn.disabled = !hasTheme || hasPlayedCard;
    
    updatePlayedCards();
    updateOtherPlayers();
    
    const playedCount = (currentRoom.playedCards || []).length;
    const totalPlayers = Object.keys(players).length;
    const turnEl = document.getElementById('currentTurn');
    const totalEl = document.getElementById('totalTurns');
    if (turnEl) turnEl.textContent = playedCount + 1;
    if (totalEl) totalEl.textContent = totalPlayers;
}

function updateLivesDisplay() {
    const lives = currentRoom.lives || 0;
    const hearts = '❤️'.repeat(lives) + '🖤'.repeat(3 - lives);
    document.getElementById('lifeDisplay').textContent = hearts;
}

function updateCardSymbol(elementId, cardValue) {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    let symbol = '';
    if (cardValue <= 20) {
        symbol = '🌱';
    } else if (cardValue <= 40) {
        symbol = '🐣';
    } else if (cardValue <= 60) {
        symbol = '🌟';
    } else if (cardValue <= 80) {
        symbol = '🔥';
    } else {
        symbol = '👑';
    }
    
    element.textContent = symbol;
}

function updatePlayedCards() {
    const playedCards = currentRoom.playedCards || [];
    const playedCardsContainer = document.getElementById('playedCards');
    playedCardsContainer.innerHTML = '';
    
    playedCards.forEach(cardData => {
        const cardEl = document.createElement('div');
        cardEl.className = 'played-card';
        cardEl.innerHTML = `
            <div class="card-number">${cardData.card}</div>
            <div class="card-symbol" id="symbol-${cardData.playerId}">${getSymbolForCard(cardData.card)}</div>
            <div class="card-description">"${cardData.description}"</div>
            <div class="player-name">${cardData.playerName}</div>
        `;
        playedCardsContainer.appendChild(cardEl);
    });
}

function getSymbolForCard(cardValue) {
    if (cardValue <= 20) return '🌱';
    if (cardValue <= 40) return '🐣';
    if (cardValue <= 60) return '🌟';
    if (cardValue <= 80) return '🔥';
    return '👑';
}

function updateOtherPlayers() {
    const players = currentRoom.players || {};
    const otherPlayersContainer = document.getElementById('otherPlayersList');
    otherPlayersContainer.innerHTML = '';
    
    Object.values(players).forEach(player => {
        if (player.id === playerId) return;
        
        const playerEl = document.createElement('div');
        const hasPlayed = player.hasPlayed;
        const hasDescription = player.description;
        
        playerEl.className = 'other-player-item';
        if (hasPlayed) {
            playerEl.classList.add('played');
        } else if (hasDescription) {
            playerEl.classList.add('active');
        }
        
        playerEl.innerHTML = `
            <div class="player-icon">${player.isHost ? '👑' : '👤'}</div>
            <div class="player-name">${player.name}</div>
            <div class="player-status">${hasPlayed ? 'カード提出済' : hasDescription ? '説明済' : '考え中...'}</div>
            ${hasDescription ? `<div class="player-description">"${player.description}"</div>` : ''}
        `;
        
        otherPlayersContainer.appendChild(playerEl);
    });
}

// 判定結果を表示する関数
function showJudgeResult(isSuccess, message) {
    const overlay = document.getElementById('judgeOverlay');
    const icon = document.getElementById('judgeIcon');
    const title = document.getElementById('judgeTitle');
    const msg = document.getElementById('judgeMessage');
    
    if (overlay.classList.contains('active')) return;
    
    overlay.classList.remove('success', 'fail');
    overlay.classList.add(isSuccess ? 'success' : 'fail');
    overlay.classList.add('active');
    
    if (isSuccess) {
        icon.textContent = '🎉';
        title.textContent = '成功！';
        createConfetti();
    } else {
        icon.textContent = '💀';
        title.textContent = '失敗...';
    }
    
    msg.textContent = message;
    
    setTimeout(() => {
        overlay.classList.remove('active');
    }, 3500);
}

function createConfetti() {
    for (let i = 0; i < 50; i++) {
        const confetti = document.createElement('div');
        confetti.style.position = 'fixed';
        confetti.style.left = Math.random() * 100 + 'vw';
        confetti.style.top = '-10px';
        confetti.style.width = '10px';
        confetti.style.height = '10px';
        confetti.style.backgroundColor = ['#f00', '#0f0', '#00f', '#ff0', '#0ff', '#f0f'][Math.floor(Math.random() * 6)];
        confetti.style.zIndex = '3000';
        confetti.style.animation = `fall ${Math.random() * 2 + 1}s linear forwards`;
        document.body.appendChild(confetti);
        setTimeout(() => confetti.remove(), 3000);
    }
}

const style = document.createElement('style');
style.textContent = `@keyframes fall { to { transform: translateY(100vh) rotate(720deg); } }`;
document.head.appendChild(style);

async function playCard(cardValue) {
    showLoading();
    try {
        const roomRef = database.ref('numberlink_rooms/' + currentRoomCode);
        await roomRef.transaction((roomData) => {
            if (!roomData) return roomData;
            const myPlayerData = roomData.players[playerId];
            
            // 手札を取得
            let hand = myPlayerData.card;
            if (!Array.isArray(hand)) hand = [hand];
            hand = hand.filter(c => c !== null && c !== undefined);
            
            // 指定されたカードが手札にあるかチェック
            const cardIndex = hand.indexOf(cardValue);
            if (cardIndex === -1) return; // 持っていないカードは出せない
            
            // 手札から削除
            hand.splice(cardIndex, 1);
            
            if (!roomData.playedCards) roomData.playedCards = [];
            roomData.playedCards.push({
                playerId: playerId,
                playerName: myPlayerData.name,
                card: cardValue,
                description: myPlayerData.description || ''
            });
            
            if (roomData.players[playerId]) {
                roomData.players[playerId].card = hand.length > 0 ? hand : null;
                roomData.players[playerId].hasPlayed = hand.length === 0; // 全て出し切ったら完了
            }
            
            return roomData;
        });
        addLog(`カード ${cardValue} を出しました`, 'success');
        hideLoading();
    } catch (error) {
        console.error('カード提出エラー:', error);
        alert('カードの提出に失敗しました');
        hideLoading();
    }
}

async function checkCardsOrder(roomData) {
    if (!isHost) return;
    
    console.log('🔍 カード順序判定中...', roomData.playedCards);
    const playedCards = roomData.playedCards || [];
    const cardValues = playedCards.map(pc => parseInt(pc.card));
    
    console.log('提出されたカード順:', cardValues);
    
    let isCorrect = true;
    let failIndex = -1;
    
    // 正しいロジック: 直前のカードより今のカードが小さければアウト（昇順でない）
    for (let i = 1; i < cardValues.length; i++) {
        if (cardValues[i] < cardValues[i - 1]) {
            isCorrect = false;
            failIndex = i;
            console.log(`❌ 順序不正: ${cardValues[i-1]} -> ${cardValues[i]}`);
            break;
        }
    }
    
    const roomRef = database.ref('numberlink_rooms/' + currentRoomCode);
    
    // 判定結果を保存（全員に通知）
    await roomRef.update({
        judgeResult: {
            isCorrect: isCorrect,
            message: isCorrect ? '素晴らしい連携です！' : `残念... ${cardValues[failIndex]} が ${cardValues[failIndex-1]} より先に出るべきでした`,
            timestamp: Date.now()
        }
    });
    
    // 演出待機後、次へ
    setTimeout(async () => {
        if (isCorrect) {
            addLog('正解！次のレベルへ', 'success');
            await nextLevel(roomData);
        } else {
            addLog('残念...順番が間違っていました', 'error');
            await loseLife(roomData);
        }
        // 結果リセット
        await roomRef.update({ judgeResult: null });
        // ローカルフラグもリセット
        isCheckingCards = false;
    }, 4000);
}

// テーマ選択
function showThemeList() {
    const modal = document.getElementById('themeListModal');
    const themeList = document.getElementById('themeList');
    themeList.innerHTML = '';
    themePresets.forEach(theme => {
        const btn = document.createElement('button');
        btn.className = 'theme-list-btn';
        btn.textContent = theme;
        btn.onclick = () => selectTheme(theme);
        themeList.appendChild(btn);
    });
    modal.classList.add('active');
}

function closeThemeList() {
    document.getElementById('themeListModal').classList.remove('active');
}

function showCustomTheme() {
    document.getElementById('customThemeModal').classList.add('active');
}

function closeCustomTheme() {
    document.getElementById('customThemeModal').classList.remove('active');
    document.getElementById('customThemeInput').value = '';
}

async function setCustomTheme() {
    const customTheme = document.getElementById('customThemeInput').value.trim();
    if (!customTheme) {
        alert('テーマを入力してください');
        return;
    }
    await selectTheme(customTheme);
    closeCustomTheme();
}

async function selectTheme(theme) {
    try {
        const roomRef = database.ref('numberlink_rooms/' + currentRoomCode);
        await roomRef.update({
            currentTheme: theme,
            gameState: 'playing'
        });
        closeThemeList();
        addLog(`テーマ「${theme}」が選ばれました`, 'success');
    } catch (error) {
        console.error('テーマ選択エラー:', error);
        alert('テーマの選択に失敗しました');
    }
}

async function submitDescription() {
    const description = document.getElementById('cardDescription').value.trim();
    if (!description) {
        alert('説明を入力してください');
        return;
    }
    try {
        const roomRef = database.ref('numberlink_rooms/' + currentRoomCode);
        await roomRef.child(`players/${playerId}/description`).set(description);
        addLog(`${playerName}が説明を提出しました`);
    } catch (error) {
        console.error('説明提出エラー:', error);
        alert('説明の提出に失敗しました');
    }
}

async function nextLevel(currentRoomData) {
    if (!isHost) return;
    const roomRef = database.ref('numberlink_rooms/' + currentRoomCode);
    const currentLevel = currentRoomData.level;
    
    if (currentLevel >= 3) {
        await roomRef.update({
            gameState: 'finished',
            result: 'clear',
            lastResult: null
        });
        return;
    }
    
    const nextLvl = currentLevel + 1;
    const players = Object.keys(currentRoomData.players);
    // レベルに応じて枚数を増やす（レベル2なら2枚、レベル3なら3枚）
    const hands = distributeCards(players.length, nextLvl);
    const updates = {};
    players.forEach((playerId, index) => {
        updates[`players/${playerId}/card`] = hands[index];
        updates[`players/${playerId}/hasPlayed`] = false;
        updates[`players/${playerId}/description`] = '';
    });
    
    const themeSelectorId = players[Math.floor(Math.random() * players.length)];
    updates['level'] = currentLevel + 1;
    updates['lives'] = currentLevel + 1 === 2 ? 2 : 1;
    updates['themeSelectorId'] = themeSelectorId;
    updates['playedCards'] = [];
    updates['currentTheme'] = '';
    updates['gameState'] = 'selectingTheme';
    updates['lastResult'] = null;
    
    await roomRef.update(updates);
    
    // ローカルフラグリセット
    isCheckingCards = false;
}

async function loseLife(currentRoomData) {
    if (!isHost) return;
    const roomRef = database.ref('numberlink_rooms/' + currentRoomCode);
    const currentLives = currentRoomData.lives;
    
    if (currentLives <= 1) {
        await roomRef.update({
            gameState: 'finished',
            result: 'gameover',
            lastResult: null
        });
        // ローカルフラグリセット
        isCheckingCards = false;
        return;
    }
    
    const currentLevel = currentRoomData.level;
    const players = Object.keys(currentRoomData.players);
    // 現在のレベルと同じ枚数を再配布
    const hands = distributeCards(players.length, currentLevel);
    const updates = {};
    players.forEach((playerId, index) => {
        updates[`players/${playerId}/card`] = hands[index];
        updates[`players/${playerId}/hasPlayed`] = false;
        updates[`players/${playerId}/description`] = '';
    });
    
    updates['lives'] = currentLives - 1;
    updates['playedCards'] = [];
    updates['currentTheme'] = '';
    updates['gameState'] = 'selectingTheme';
    updates['lastResult'] = null;
    
    await roomRef.update(updates);
    
    // ローカルフラグリセット
    isCheckingCards = false;
}

function showResult() {
    showScreen('resultScreen');
    const result = currentRoom.result;
    const level = currentRoom.level;
    if (result === 'clear') {
        document.getElementById('gameOverResult').style.display = 'none';
        document.getElementById('gameClearResult').classList.add('active');
        document.getElementById('gameClearResult').style.display = 'block';
        addLog('🎉 ゲームクリア！おめでとうございます！', 'success');
    } else {
        document.getElementById('gameClearResult').style.display = 'none';
        document.getElementById('gameOverResult').classList.add('active');
        document.getElementById('gameOverResult').style.display = 'block';
        document.getElementById('reachedLevel').textContent = level;
        addLog('💔 ゲームオーバー', 'error');
    }
}

function backToLobby() {
    if (isHost) {
        const roomRef = database.ref('numberlink_rooms/' + currentRoomCode);
        roomRef.update({
            gameState: 'waiting',
            level: 1,
            lives: 3,
            currentTheme: '',
            themeSelectorId: '',
            playedCards: [],
            currentTurn: 0
        });
    }
    showLobby();
}

function addLog(message, type = '') {
    const logContent = document.getElementById('logContent');
    const logItem = document.createElement('div');
    logItem.className = 'log-item' + (type ? ' ' + type : '');
    const time = new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
    logItem.innerHTML = `<span class="log-time">[${time}]</span> ${message}`;
    logContent.appendChild(logItem);
    logContent.scrollTop = logContent.scrollHeight;
    while (logContent.children.length > 50) {
        logContent.removeChild(logContent.firstChild);
    }
}

function toggleLog() {
    const logContent = document.getElementById('logContent');
    const toggleBtn = document.querySelector('.log-toggle');
    if (logContent.classList.contains('collapsed')) {
        logContent.classList.remove('collapsed');
        toggleBtn.textContent = '_';
    } else {
        logContent.classList.add('collapsed');
        toggleBtn.textContent = '□';
    }
}

function showRules() {
    document.getElementById('rulesModal').classList.add('active');
}

function closeRules() {
    document.getElementById('rulesModal').classList.remove('active');
}

window.onclick = function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.classList.remove('active');
    }
}

window.addEventListener('beforeunload', (e) => {
    if (currentRoomCode) {
        e.preventDefault();
        e.returnValue = '';
        return '';
    }
});

window.addEventListener('unload', () => {
    if (currentRoomCode) {
        leaveRoom();
    }
});

console.log('🎮 ナンバーリンク - スクリプト読み込み完了');
