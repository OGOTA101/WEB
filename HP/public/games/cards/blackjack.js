// ブラックジャック - カードゲーム
class BlackjackGame {
    constructor() {
        this.coins = 10;
        this.games = 0;
        this.wins = 0;
        this.bestCoins = this.loadBestScore();
        this.gameRunning = false;
        this.isPaused = false;
        this.deck = [];
        this.playerHand = [];
        this.dealerHand = [];
        this.gamePhase = 'betting'; // 'betting', 'playing', 'dealer', 'finished'

        this.suits = ['♠', '♥', '♦', '♣'];
        this.ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
        this.suitColors = {
            '♠': 'black',
            '♥': 'red',
            '♦': 'red',
            '♣': 'black'
        };

        this.audioContext = null;
        this.initAudio();
        this.updateDisplay();
    }

    initAudio() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {
            console.log('Audio not supported');
        }
    }

    playSound(type) {
        if (!this.audioContext) return;

        try {
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);

            let frequency;
            let duration;

            switch (type) {
                case 'deal':
                    frequency = 440;
                    duration = 0.1;
                    break;
                case 'win':
                    frequency = 660;
                    duration = 0.5;
                    break;
                case 'lose':
                    frequency = 220;
                    duration = 0.5;
                    break;
                case 'bust':
                    frequency = 180;
                    duration = 0.8;
                    break;
                case 'blackjack':
                    frequency = 880;
                    duration = 0.7;
                    break;
                case 'gameOver':
                    frequency = 160;
                    duration = 1.0;
                    break;
                default:
                    frequency = 440;
                    duration = 0.2;
            }

            oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
            oscillator.type = 'sine';

            gainNode.gain.setValueAtTime(0.05, this.audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);

            oscillator.start();
            oscillator.stop(this.audioContext.currentTime + duration);
        } catch (e) {
            console.log('Audio play error:', e);
        }
    }

    createDeck() {
        this.deck = [];
        for (let suit of this.suits) {
            for (let rank of this.ranks) {
                this.deck.push({
                    suit: suit,
                    rank: rank,
                    value: this.getCardValue(rank),
                    color: this.suitColors[suit]
                });
            }
        }
        this.shuffleDeck();
    }

    shuffleDeck() {
        for (let i = this.deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.deck[i], this.deck[j]] = [this.deck[j], this.deck[i]];
        }
    }

    getCardValue(rank) {
        if (rank === 'A') return 11;
        if (['J', 'Q', 'K'].includes(rank)) return 10;
        return parseInt(rank);
    }

    calculateHandValue(hand) {
        let value = 0;
        let aces = 0;

        for (let card of hand) {
            value += card.value;
            if (card.rank === 'A') aces++;
        }

        // エースの処理
        while (value > 21 && aces > 0) {
            value -= 10;
            aces--;
        }

        return value;
    }

    startGame() {
        this.coins = 10;
        this.games = 0;
        this.wins = 0;
        this.gameRunning = true;
        this.isPaused = false;

        this.showScreen('gameScreen');
        this.updateDisplay();
        this.startNewRound();
    }

    startNewRound() {
        if (this.coins <= 0) {
            this.endGame();
            return;
        }

        this.games++;
        this.gamePhase = 'playing';
        this.playerHand = [];
        this.dealerHand = [];

        this.createDeck();

        // 初期カードを配る
        this.playerHand.push(this.deck.pop());
        this.dealerHand.push(this.deck.pop());
        this.playerHand.push(this.deck.pop());
        this.dealerHand.push(this.deck.pop());

        this.playSound('deal');
        this.updateCardDisplay();
        this.updateDisplay();

        // ブラックジャックチェック
        const playerValue = this.calculateHandValue(this.playerHand);
        const dealerValue = this.calculateHandValue(this.dealerHand);

        if (playerValue === 21) {
            if (dealerValue === 21) {
                this.endRound('push', 'ダブルブラックジャック！引き分け');
            } else {
                this.endRound('blackjack', 'ブラックジャック！勝利！');
            }
        } else {
            this.gamePhase = 'playing';
            this.updateGameMessage();
            this.updateButtons();
        }
    }

    playerHit() {
        if (this.gamePhase !== 'playing' || this.isPaused) return;

        this.playerHand.push(this.deck.pop());
        this.playSound('deal');
        this.updateCardDisplay();

        const playerValue = this.calculateHandValue(this.playerHand);

        if (playerValue > 21) {
            this.endRound('bust', 'バスト！負け');
        } else if (playerValue === 21) {
            this.playerStand();
        } else {
            this.updateGameMessage();
        }
    }

    playerStand() {
        if (this.gamePhase !== 'playing' || this.isPaused) return;

        this.gamePhase = 'dealer';
        this.updateButtons();
        this.dealerPlay();
    }

    dealerPlay() {
        const dealerValue = this.calculateHandValue(this.dealerHand);

        if (dealerValue < 17) {
            setTimeout(() => {
                this.dealerHand.push(this.deck.pop());
                this.playSound('deal');
                this.updateCardDisplay();
                this.dealerPlay();
            }, 1000);
        } else {
            this.determineWinner();
        }
    }

    determineWinner() {
        const playerValue = this.calculateHandValue(this.playerHand);
        const dealerValue = this.calculateHandValue(this.dealerHand);

        if (dealerValue > 21) {
            this.endRound('win', 'ディーラーがバスト！勝利！');
        } else if (playerValue > dealerValue) {
            this.endRound('win', '勝利！');
        } else if (playerValue < dealerValue) {
            this.endRound('lose', '負け');
        } else {
            this.endRound('push', '引き分け');
        }
    }

    endRound(result, message) {
        this.gamePhase = 'finished';

        let coinChange = 0;

        switch (result) {
            case 'blackjack':
                coinChange = 2;
                this.wins++;
                this.playSound('blackjack');
                this.addBronzeCoins(2);
                break;
            case 'win':
                coinChange = 1;
                this.wins++;
                this.playSound('win');
                this.addBronzeCoins(1);
                break;
            case 'lose':
                coinChange = -1;
                this.playSound('lose');
                break;
            case 'bust':
                coinChange = -1;
                this.playSound('bust');
                break;
            case 'push':
                coinChange = 0;
                this.playSound('deal');
                break;
        }

        this.coins += coinChange;

        // ベストスコア更新
        if (this.coins > this.bestCoins) {
            this.bestCoins = this.coins;
            this.saveBestScore();
        }

        document.getElementById('gameMessage').textContent = message;
        this.updateDisplay();
        this.updateButtons();

        // 次のゲームまたは終了
        if (this.coins <= 0) {
            setTimeout(() => {
                this.endGame();
            }, 2000);
        }
    }

    updateCardDisplay() {
        this.updatePlayerCards();
        this.updateDealerCards();
    }

    updatePlayerCards() {
        const container = document.getElementById('playerCards');
        container.innerHTML = '';

        this.playerHand.forEach(card => {
            const cardElement = this.createCardElement(card);
            container.appendChild(cardElement);
        });

        const total = this.calculateHandValue(this.playerHand);
        document.getElementById('playerTotal').textContent = `(${total})`;

        if (total > 21) {
            document.getElementById('playerTotal').classList.add('bust');
        }
    }

    updateDealerCards() {
        const container = document.getElementById('dealerCards');
        container.innerHTML = '';

        this.dealerHand.forEach((card, index) => {
            let cardElement;
            if (index === 1 && this.gamePhase === 'playing') {
                // 2枚目のカードを隠す
                cardElement = this.createCardElement(null, true);
            } else {
                cardElement = this.createCardElement(card);
            }
            container.appendChild(cardElement);
        });

        let total;
        if (this.gamePhase === 'playing') {
            total = this.dealerHand[0].value;
            document.getElementById('dealerTotal').textContent = `(${total}+?)`;
        } else {
            total = this.calculateHandValue(this.dealerHand);
            document.getElementById('dealerTotal').textContent = `(${total})`;

            if (total > 21) {
                document.getElementById('dealerTotal').classList.add('bust');
            }
        }
    }

    createCardElement(card, isHidden = false) {
        const cardDiv = document.createElement('div');

        if (isHidden) {
            cardDiv.className = 'card card-back';
            cardDiv.innerHTML = '<div>?</div>';
        } else {
            cardDiv.className = `card ${card.color}`;
            cardDiv.innerHTML = `
                <div class="card-mini">${card.rank}</div>
                <div>${card.rank}</div>
                <div style="font-size: 16px;">${card.suit}</div>
                <div class="card-mini-bottom">${card.rank}</div>
            `;
        }

        return cardDiv;
    }

    updateGameMessage() {
        const playerValue = this.calculateHandValue(this.playerHand);

        if (this.gamePhase === 'playing') {
            document.getElementById('gameMessage').textContent =
                `あなたの手札: ${playerValue} - ヒットしますか？`;
        } else if (this.gamePhase === 'dealer') {
            document.getElementById('gameMessage').textContent = 'ディーラーのターン...';
        }
    }

    updateButtons() {
        const hitBtn = document.getElementById('hitBtn');
        const standBtn = document.getElementById('standBtn');
        const newGameBtn = document.getElementById('newGameBtn');

        if (this.gamePhase === 'playing') {
            hitBtn.style.display = 'inline-block';
            standBtn.style.display = 'inline-block';
            newGameBtn.style.display = 'none';
            hitBtn.disabled = false;
            standBtn.disabled = false;
        } else {
            hitBtn.style.display = 'none';
            standBtn.style.display = 'none';
            newGameBtn.style.display = 'inline-block';
        }
    }

    endGame() {
        this.gameRunning = false;
        this.playSound('gameOver');

        document.getElementById('finalCoins').textContent = this.coins;
        document.getElementById('finalWins').textContent = this.wins;
        document.getElementById('finalGames').textContent = this.games;
        document.getElementById('winRate').textContent =
            this.games > 0 ? Math.round((this.wins / this.games) * 100) : 0;
        document.getElementById('finalBest').textContent = this.bestCoins;

        this.showScreen('gameOverScreen');
    }

    updateDisplay() {
        document.getElementById('coins').textContent = this.coins;
        document.getElementById('games').textContent = this.games;
        document.getElementById('wins').textContent = this.wins;
        document.getElementById('bestCoins').textContent = this.bestCoins;
        document.getElementById('coinCount').textContent = this.coins;

        // ヘッダーの銅コイン数を更新
        this.updateCoinDisplay();
    }

    updateCoinDisplay() {
        const bronzeCoins = this.loadBronzeCoins();
        document.getElementById('bronzeCoins').textContent = bronzeCoins;
    }

    addBronzeCoins(amount) {
        let bronzeCoins = this.loadBronzeCoins();
        bronzeCoins += amount;
        localStorage.setItem('sggame_bronze_coins', bronzeCoins.toString());
        this.updateCoinDisplay();
    }

    loadBronzeCoins() {
        return parseInt(localStorage.getItem('sggame_bronze_coins') || '0');
    }

    saveBestScore() {
        localStorage.setItem('blackjack_best', this.bestCoins.toString());
    }

    loadBestScore() {
        return parseInt(localStorage.getItem('blackjack_best') || '10');
    }

    showScreen(screenId) {
        const screens = ['startScreen', 'gameScreen', 'gameOverScreen'];
        screens.forEach(screen => {
            document.getElementById(screen).style.display = 'none';
        });
        document.getElementById(screenId).style.display = 'block';
    }

    pauseGame() {
        if (!this.gameRunning) return;

        this.isPaused = !this.isPaused;
        const pauseBtn = document.querySelector('.pause-btn');

        if (this.isPaused) {
            pauseBtn.textContent = '▶️';
            document.getElementById('gameMessage').textContent = 'ゲーム一時停止中...';
            document.getElementById('hitBtn').disabled = true;
            document.getElementById('standBtn').disabled = true;
        } else {
            pauseBtn.textContent = '⏸️';
            this.updateGameMessage();
            if (this.gamePhase === 'playing') {
                document.getElementById('hitBtn').disabled = false;
                document.getElementById('standBtn').disabled = false;
            }
        }
    }
}

// グローバル変数
let game;

// ゲーム開始関数
function startGame() {
    game = new BlackjackGame();
    game.startGame();
}

// 新しいラウンド開始
function startNewRound() {
    if (game) {
        game.startNewRound();
    }
}

// プレイヤーアクション
function playerHit() {
    if (game) {
        game.playerHit();
    }
}

function playerStand() {
    if (game) {
        game.playerStand();
    }
}

// 一時停止関数
function pauseGame() {
    if (game) {
        game.pauseGame();
    }
}

// ページ読み込み完了時の処理
document.addEventListener('DOMContentLoaded', function () {
    game = new BlackjackGame();

    // キーボードイベント
    document.addEventListener('keydown', function (e) {
        if (!game || !game.gameRunning || game.isPaused) return;

        switch (e.key) {
            case 'h':
            case 'H':
            case ' ':
                e.preventDefault();
                playerHit();
                break;
            case 's':
            case 'S':
            case 'Enter':
                e.preventDefault();
                playerStand();
                break;
            case 'n':
            case 'N':
                e.preventDefault();
                if (game.gamePhase === 'finished') {
                    startNewRound();
                }
                break;
            case 'p':
            case 'P':
                e.preventDefault();
                pauseGame();
                break;
        }
    });

    // タッチイベント（モバイル対応）
    let startX = 0;
    document.addEventListener('touchstart', function (e) {
        startX = e.touches[0].clientX;
    });

    document.addEventListener('touchend', function (e) {
        if (!game || !game.gameRunning || game.isPaused || game.gamePhase !== 'playing') return;

        const endX = e.changedTouches[0].clientX;
        const diff = endX - startX;

        if (Math.abs(diff) > 50) {
            if (diff > 0) {
                playerHit();
            } else {
                playerStand();
            }
        }
    });

    console.log('ブラックジャック loaded successfully! 🃏');
});
