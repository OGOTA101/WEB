// ハイアンドロー - カードゲーム
class HighAndLowGame {
    constructor() {
        this.coins = 10;
        this.round = 1;
        this.wins = 0;
        this.bestCoins = this.loadBestScore();
        this.currentCard = null;
        this.nextCard = null;
        this.gameRunning = false;
        this.isPaused = false;

        this.suits = ['♠', '♥', '♦', '♣'];
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
                case 'flip':
                    frequency = 440;
                    duration = 0.2;
                    break;
                case 'win':
                    frequency = 660;
                    duration = 0.3;
                    break;
                case 'lose':
                    frequency = 220;
                    duration = 0.5;
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

            gainNode.gain.setValueAtTime(0.1, this.audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);

            oscillator.start();
            oscillator.stop(this.audioContext.currentTime + duration);
        } catch (e) {
            console.log('Audio play error:', e);
        }
    }

    generateCard() {
        const value = Math.floor(Math.random() * 13) + 1;
        const suit = this.suits[Math.floor(Math.random() * this.suits.length)];
        return {
            value: value,
            suit: suit,
            color: this.suitColors[suit],
            display: value === 1 ? 'A' : value === 11 ? 'J' : value === 12 ? 'Q' : value === 13 ? 'K' : value.toString()
        };
    }

    startGame() {
        this.coins = 10;
        this.round = 1;
        this.wins = 0;
        this.gameRunning = true;
        this.isPaused = false;

        this.currentCard = this.generateCard();
        this.nextCard = this.generateCard();

        this.showScreen('gameScreen');
        this.updateDisplay();
        this.updateCardDisplay();

        document.getElementById('gameMessage').textContent = '次のカードは現在のカードより高い？低い？';
        document.getElementById('highBtn').disabled = false;
        document.getElementById('lowBtn').disabled = false;
    }

    makeChoice(choice) {
        if (!this.gameRunning || this.isPaused) return;

        // ボタンを無効化
        document.getElementById('highBtn').disabled = true;
        document.getElementById('lowBtn').disabled = true;

        // 次のカードを表示
        this.playSound('flip');
        this.revealNextCard();

        // 結果判定
        setTimeout(() => {
            this.checkResult(choice);
        }, 1000);
    }

    revealNextCard() {
        const nextCardElement = document.getElementById('nextCard');
        nextCardElement.className = `card ${this.nextCard.color}`;
        nextCardElement.innerHTML = `
            <div>${this.nextCard.display}</div>
            <div style="font-size: 24px;">${this.nextCard.suit}</div>
        `;
    }

    checkResult(choice) {
        let isCorrect = false;
        let message = '';

        if (this.nextCard.value > this.currentCard.value) {
            isCorrect = (choice === 'high');
            message = `${this.nextCard.display} > ${this.currentCard.display} - `;
        } else if (this.nextCard.value < this.currentCard.value) {
            isCorrect = (choice === 'low');
            message = `${this.nextCard.display} < ${this.currentCard.display} - `;
        } else {
            message = `${this.nextCard.display} = ${this.currentCard.display} - 引き分け！`;
        }

        if (isCorrect) {
            this.coins++;
            this.wins++;
            message += '正解！コイン+1';
            this.playSound('win');

            // 銅コインを追加
            this.addBronzeCoins(1);
        } else if (this.nextCard.value !== this.currentCard.value) {
            this.coins--;
            message += '不正解！コイン-1';
            this.playSound('lose');
        }

        document.getElementById('gameMessage').textContent = message;

        // ベストスコア更新
        if (this.coins > this.bestCoins) {
            this.bestCoins = this.coins;
            this.saveBestScore();
        }

        this.updateDisplay();

        // 次のラウンドまたはゲーム終了
        setTimeout(() => {
            if (this.coins <= 0) {
                this.endGame();
            } else {
                this.nextRound();
            }
        }, 2000);
    }

    nextRound() {
        this.round++;
        this.currentCard = this.nextCard;
        this.nextCard = this.generateCard();

        this.updateCardDisplay();
        document.getElementById('gameMessage').textContent = '次のカードは現在のカードより高い？低い？';

        // ボタンを再有効化
        document.getElementById('highBtn').disabled = false;
        document.getElementById('lowBtn').disabled = false;
    }

    updateCardDisplay() {
        const currentCardElement = document.getElementById('currentCard');
        currentCardElement.className = `card ${this.currentCard.color}`;
        currentCardElement.innerHTML = `
            <div>${this.currentCard.display}</div>
            <div style="font-size: 24px;">${this.currentCard.suit}</div>
        `;

        const nextCardElement = document.getElementById('nextCard');
        nextCardElement.className = 'card card-back';
        nextCardElement.innerHTML = '<div>?</div>';
    }

    endGame() {
        this.gameRunning = false;
        this.playSound('gameOver');

        document.getElementById('finalCoins').textContent = this.coins;
        document.getElementById('finalWins').textContent = this.wins;
        document.getElementById('finalBest').textContent = this.bestCoins;

        this.showScreen('gameOverScreen');
    }

    updateDisplay() {
        document.getElementById('coins').textContent = this.coins;
        document.getElementById('round').textContent = this.round;
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
        localStorage.setItem('high_and_low_best', this.bestCoins.toString());
    }

    loadBestScore() {
        return parseInt(localStorage.getItem('high_and_low_best') || '10');
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
            document.getElementById('highBtn').disabled = true;
            document.getElementById('lowBtn').disabled = true;
        } else {
            pauseBtn.textContent = '⏸️';
            document.getElementById('gameMessage').textContent = '次のカードは現在のカードより高い？低い？';
            document.getElementById('highBtn').disabled = false;
            document.getElementById('lowBtn').disabled = false;
        }
    }
}

// グローバル変数
let game;

// ゲーム開始関数
function startGame() {
    game = new HighAndLowGame();
    game.startGame();
}

// 選択関数
function makeChoice(choice) {
    if (game) {
        game.makeChoice(choice);
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
    game = new HighAndLowGame();

    // キーボードイベント
    document.addEventListener('keydown', function (e) {
        if (!game || !game.gameRunning || game.isPaused) return;

        switch (e.key) {
            case 'ArrowUp':
            case 'h':
            case 'H':
                e.preventDefault();
                makeChoice('high');
                break;
            case 'ArrowDown':
            case 'l':
            case 'L':
                e.preventDefault();
                makeChoice('low');
                break;
            case ' ':
                e.preventDefault();
                pauseGame();
                break;
        }
    });

    // タッチイベント（モバイル対応）
    let startY = 0;
    document.addEventListener('touchstart', function (e) {
        startY = e.touches[0].clientY;
    });

    document.addEventListener('touchend', function (e) {
        if (!game || !game.gameRunning || game.isPaused) return;

        const endY = e.changedTouches[0].clientY;
        const diff = startY - endY;

        if (Math.abs(diff) > 50) {
            if (diff > 0) {
                makeChoice('high');
            } else {
                makeChoice('low');
            }
        }
    });

    console.log('ハイアンドロー loaded successfully! 🎴');
});
