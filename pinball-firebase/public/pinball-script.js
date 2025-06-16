// Space Cadet 3D Pinball - JavaScript Implementation
class PinballGame {
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.ball = document.getElementById('ball');
        this.leftFlipper = document.getElementById('left-flipper');
        this.rightFlipper = document.getElementById('right-flipper');
        
        // ゲーム状態
        this.gameState = 'loading'; // loading, playing, paused, gameOver
        this.score = 0;
        this.highScore = parseInt(localStorage.getItem('pinball-high-score') || '0');
        this.ballsLeft = 3;
        this.currentBall = 1;
        
        // 物理エンジン設定
        this.physics = {
            gravity: 0.3,
            friction: 0.98,
            bounceDamping: 0.8,
            flipperForce: 15
        };
        
        // ボール状態
        this.ballState = {
            x: 380,
            y: 750,
            vx: 0,
            vy: 0,
            radius: 6,
            inPlay: false
        };
        
        // フリッパー状態
        this.flippers = {
            left: { active: false, angle: 0, targetAngle: 0 },
            right: { active: false, angle: 0, targetAngle: 0 }
        };
        
        // ゲーム要素
        this.bumpers = [
            { x: 140, y: 170, radius: 20, hit: false, points: 100 },
            { x: 220, y: 200, radius: 20, hit: false, points: 100 },
            { x: 300, y: 170, radius: 20, hit: false, points: 100 }
        ];
        
        this.targets = [
            { x: 120, y: 120, width: 30, height: 8, hit: false, points: 50 },
            { x: 170, y: 120, width: 30, height: 8, hit: false, points: 50 },
            { x: 220, y: 120, width: 30, height: 8, hit: false, points: 50 },
            { x: 270, y: 120, width: 30, height: 8, hit: false, points: 50 },
            { x: 320, y: 120, width: 30, height: 8, hit: false, points: 50 }
        ];
        
        this.lamps = [
            { x: 90, y: 270, lit: false, points: 200 },
            { x: 330, y: 270, lit: false, points: 200 }
        ];
        
        // 音声要素
        this.sounds = {
            flipper: document.getElementById('flipper-sound'),
            bumper: document.getElementById('bumper-sound'),
            target: document.getElementById('target-sound'),
            ballLost: document.getElementById('ball-lost-sound')
        };
        
        // アニメーションID
        this.animationId = null;
        
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.updateDisplay();
        this.hideLoading();
        this.startNewGame();
    }
    
    setupEventListeners() {
        // キーボード制御
        document.addEventListener('keydown', (e) => this.handleKeyDown(e));
        document.addEventListener('keyup', (e) => this.handleKeyUp(e));
        
        // モバイル制御
        document.getElementById('left-flipper-btn').addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.activateFlipper('left', true);
        });
        
        document.getElementById('left-flipper-btn').addEventListener('touchend', (e) => {
            e.preventDefault();
            this.activateFlipper('left', false);
        });
        
        document.getElementById('right-flipper-btn').addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.activateFlipper('right', true);
        });
        
        document.getElementById('right-flipper-btn').addEventListener('touchend', (e) => {
            e.preventDefault();
            this.activateFlipper('right', false);
        });
        
        // マウス制御（デスクトップ）
        document.getElementById('left-flipper-btn').addEventListener('mousedown', () => {
            this.activateFlipper('left', true);
        });
        
        document.getElementById('left-flipper-btn').addEventListener('mouseup', () => {
            this.activateFlipper('left', false);
        });
        
        document.getElementById('right-flipper-btn').addEventListener('mousedown', () => {
            this.activateFlipper('right', true);
        });
        
        document.getElementById('right-flipper-btn').addEventListener('mouseup', () => {
            this.activateFlipper('right', false);
        });
        
        // プランジャー
        document.getElementById('plunger').addEventListener('click', () => {
            this.launchBall();
        });
        
        // ゲーム制御ボタン
        document.getElementById('new-game-btn').addEventListener('click', () => {
            this.startNewGame();
        });
        
        document.getElementById('restart-btn').addEventListener('click', () => {
            this.hideGameOver();
            this.startNewGame();
        });
        
        document.getElementById('resume-btn').addEventListener('click', () => {
            this.resumeGame();
        });
        
        document.getElementById('quit-btn').addEventListener('click', () => {
            this.quitGame();
        });
        
        // ウィンドウフォーカス制御
        window.addEventListener('blur', () => {
            if (this.gameState === 'playing') {
                this.pauseGame();
            }
        });
    }
    
    handleKeyDown(e) {
        if (this.gameState !== 'playing') return;
        
        switch(e.code) {
            case 'KeyZ':
            case 'ArrowLeft':
                e.preventDefault();
                this.activateFlipper('left', true);
                break;
            case 'Slash':
            case 'ArrowRight':
                e.preventDefault();
                this.activateFlipper('right', true);
                break;
            case 'Space':
                e.preventDefault();
                this.launchBall();
                break;
            case 'KeyP':
                e.preventDefault();
                this.pauseGame();
                break;
        }
    }
    
    handleKeyUp(e) {
        if (this.gameState !== 'playing') return;
        
        switch(e.code) {
            case 'KeyZ':
            case 'ArrowLeft':
                e.preventDefault();
                this.activateFlipper('left', false);
                break;
            case 'Slash':
            case 'ArrowRight':
                e.preventDefault();
                this.activateFlipper('right', false);
                break;
        }
    }
    
    activateFlipper(side, active) {
        if (this.gameState !== 'playing') return;
        
        this.flippers[side].active = active;
        this.flippers[side].targetAngle = active ? (side === 'left' ? -30 : 30) : 0;
        
        // フリッパー音再生
        if (active) {
            this.playSound('flipper');
        }
        
        // ボールとの衝突チェック
        if (active && this.ballState.inPlay) {
            this.checkFlipperCollision(side);
        }
    }
    
    checkFlipperCollision(side) {
        const flipper = side === 'left' ? 
            { x: 80, y: 750, width: 60, height: 8 } :
            { x: 260, y: 750, width: 60, height: 8 };
        
        const ball = this.ballState;
        
        // 簡単な矩形衝突判定
        if (ball.x + ball.radius > flipper.x && 
            ball.x - ball.radius < flipper.x + flipper.width &&
            ball.y + ball.radius > flipper.y && 
            ball.y - ball.radius < flipper.y + flipper.height) {
            
            // フリッパーの力を適用
            const force = this.physics.flipperForce;
            const angle = side === 'left' ? -Math.PI/4 : -3*Math.PI/4;
            
            ball.vx += Math.cos(angle) * force;
            ball.vy += Math.sin(angle) * force;
            
            // 最大速度制限
            const maxSpeed = 20;
            const speed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
            if (speed > maxSpeed) {
                ball.vx = (ball.vx / speed) * maxSpeed;
                ball.vy = (ball.vy / speed) * maxSpeed;
            }
        }
    }
    
    launchBall() {
        if (this.gameState !== 'playing' || this.ballState.inPlay) return;
        
        // ボールを発射
        this.ballState.x = 380;
        this.ballState.y = 750;
        this.ballState.vx = -2 - Math.random() * 3;
        this.ballState.vy = -15 - Math.random() * 5;
        this.ballState.inPlay = true;
        
        // プランジャーアニメーション
        const plunger = document.getElementById('plunger');
        plunger.style.transform = 'translateY(10px)';
        setTimeout(() => {
            plunger.style.transform = 'translateY(0)';
        }, 100);
    }
    
    updatePhysics() {
        if (!this.ballState.inPlay) return;
        
        const ball = this.ballState;
        
        // 重力適用
        ball.vy += this.physics.gravity;
        
        // 摩擦適用
        ball.vx *= this.physics.friction;
        ball.vy *= this.physics.friction;
        
        // 位置更新
        ball.x += ball.vx;
        ball.y += ball.vy;
        
        // 壁との衝突
        this.checkWallCollisions();
        
        // ゲーム要素との衝突
        this.checkBumperCollisions();
        this.checkTargetCollisions();
        this.checkLampCollisions();
        
        // ボール落下チェック
        if (ball.y > 800) {
            this.ballLost();
        }
        
        // フリッパーアニメーション更新
        this.updateFlippers();
        
        // ボール位置をDOMに反映
        this.ball.style.left = (ball.x - ball.radius) + 'px';
        this.ball.style.top = (ball.y - ball.radius) + 'px';
    }
    
    checkWallCollisions() {
        const ball = this.ballState;
        const tableWidth = 400;
        const tableHeight = 800;
        
        // 左右の壁
        if (ball.x - ball.radius <= 0) {
            ball.x = ball.radius;
            ball.vx = -ball.vx * this.physics.bounceDamping;
        } else if (ball.x + ball.radius >= tableWidth) {
            ball.x = tableWidth - ball.radius;
            ball.vx = -ball.vx * this.physics.bounceDamping;
        }
        
        // 上の壁
        if (ball.y - ball.radius <= 0) {
            ball.y = ball.radius;
            ball.vy = -ball.vy * this.physics.bounceDamping;
        }
    }
    
    checkBumperCollisions() {
        const ball = this.ballState;
        
        this.bumpers.forEach((bumper, index) => {
            const dx = ball.x - bumper.x;
            const dy = ball.y - bumper.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < ball.radius + bumper.radius) {
                // 衝突処理
                const angle = Math.atan2(dy, dx);
                const force = 8;
                
                ball.vx = Math.cos(angle) * force;
                ball.vy = Math.sin(angle) * force;
                
                // ボールを押し出し
                const overlap = ball.radius + bumper.radius - distance;
                ball.x += Math.cos(angle) * overlap;
                ball.y += Math.sin(angle) * overlap;
                
                // スコア加算
                this.addScore(bumper.points);
                
                // バンパーアニメーション
                this.animateBumper(index);
                
                // 音再生
                this.playSound('bumper');
            }
        });
    }
    
    checkTargetCollisions() {
        const ball = this.ballState;
        
        this.targets.forEach((target, index) => {
            if (!target.hit &&
                ball.x + ball.radius > target.x && 
                ball.x - ball.radius < target.x + target.width &&
                ball.y + ball.radius > target.y && 
                ball.y - ball.radius < target.y + target.height) {
                
                target.hit = true;
                this.addScore(target.points);
                this.animateTarget(index);
                this.playSound('target');
                
                // 全ターゲット達成ボーナス
                if (this.targets.every(t => t.hit)) {
                    this.addScore(1000);
                    this.resetTargets();
                }
            }
        });
    }
    
    checkLampCollisions() {
        const ball = this.ballState;
        
        this.lamps.forEach((lamp, index) => {
            const dx = ball.x - lamp.x;
            const dy = ball.y - lamp.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < ball.radius + 10) {
                if (!lamp.lit) {
                    lamp.lit = true;
                    this.addScore(lamp.points);
                    this.animateLamp(index);
                    
                    // 両方のランプが点灯したらボーナス
                    if (this.lamps.every(l => l.lit)) {
                        this.addScore(500);
                        setTimeout(() => {
                            this.lamps.forEach(l => l.lit = false);
                            this.updateLampDisplay();
                        }, 2000);
                    }
                }
            }
        });
    }
    
    updateFlippers() {
        // フリッパーアニメーション
        Object.keys(this.flippers).forEach(side => {
            const flipper = this.flippers[side];
            const diff = flipper.targetAngle - flipper.angle;
            flipper.angle += diff * 0.3;
            
            const element = side === 'left' ? this.leftFlipper : this.rightFlipper;
            if (Math.abs(flipper.angle) > 1) {
                element.classList.add('active');
                element.style.transform = `rotate(${flipper.angle}deg)`;
            } else {
                element.classList.remove('active');
                element.style.transform = '';
            }
        });
    }
    
    animateBumper(index) {
        const bumper = document.getElementById(`bumper-${index + 1}`);
        bumper.classList.add('hit');
        setTimeout(() => {
            bumper.classList.remove('hit');
        }, 200);
    }
    
    animateTarget(index) {
        const target = document.getElementById(`target-${index + 1}`);
        target.classList.add('hit');
    }
    
    animateLamp(index) {
        const lamp = document.getElementById(`lamp-${index + 1}`);
        lamp.classList.add('lit');
    }
    
    updateLampDisplay() {
        this.lamps.forEach((lamp, index) => {
            const element = document.getElementById(`lamp-${index + 1}`);
            if (lamp.lit) {
                element.classList.add('lit');
            } else {
                element.classList.remove('lit');
            }
        });
    }
    
    resetTargets() {
        this.targets.forEach((target, index) => {
            target.hit = false;
            const element = document.getElementById(`target-${index + 1}`);
            element.classList.remove('hit');
        });
    }
    
    ballLost() {
        this.ballState.inPlay = false;
        this.ballsLeft--;
        
        this.playSound('ballLost');
        this.updateDisplay();
        
        if (this.ballsLeft <= 0) {
            this.gameOver();
        } else {
            // 次のボール準備
            setTimeout(() => {
                this.ballState.x = 380;
                this.ballState.y = 750;
                this.ballState.vx = 0;
                this.ballState.vy = 0;
            }, 1000);
        }
    }
    
    addScore(points) {
        this.score += points;
        this.updateDisplay();
        
        // スコア表示アニメーション
        const scoreElement = document.getElementById('current-score');
        scoreElement.classList.add('score-flash');
        setTimeout(() => {
            scoreElement.classList.remove('score-flash');
        }, 300);
        
        // ハイスコア更新
        if (this.score > this.highScore) {
            this.highScore = this.score;
            localStorage.setItem('pinball-high-score', this.highScore.toString());
        }
    }
    
    updateDisplay() {
        document.getElementById('current-score').textContent = this.score.toLocaleString();
        document.getElementById('high-score').textContent = this.highScore.toLocaleString();
        document.getElementById('balls-left').textContent = this.ballsLeft;
    }
    
    startNewGame() {
        this.gameState = 'playing';
        this.score = 0;
        this.ballsLeft = 3;
        this.currentBall = 1;
        
        // ボール状態リセット
        this.ballState = {
            x: 380,
            y: 750,
            vx: 0,
            vy: 0,
            radius: 6,
            inPlay: false
        };
        
        // ゲーム要素リセット
        this.resetTargets();
        this.lamps.forEach(lamp => lamp.lit = false);
        this.updateLampDisplay();
        
        this.updateDisplay();
        this.startGameLoop();
    }
    
    pauseGame() {
        if (this.gameState === 'playing') {
            this.gameState = 'paused';
            this.showPause();
            this.stopGameLoop();
        }
    }
    
    resumeGame() {
        if (this.gameState === 'paused') {
            this.gameState = 'playing';
            this.hidePause();
            this.startGameLoop();
        }
    }
    
    quitGame() {
        this.gameState = 'gameOver';
        this.hidePause();
        this.stopGameLoop();
        this.gameOver();
    }
    
    gameOver() {
        this.gameState = 'gameOver';
        this.stopGameLoop();
        
        document.getElementById('final-score').textContent = this.score.toLocaleString();
        
        if (this.score === this.highScore && this.score > 0) {
            document.getElementById('high-score-message').classList.remove('hidden');
        } else {
            document.getElementById('high-score-message').classList.add('hidden');
        }
        
        this.showGameOver();
    }
    
    startGameLoop() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
        
        const gameLoop = () => {
            if (this.gameState === 'playing') {
                this.updatePhysics();
                this.animationId = requestAnimationFrame(gameLoop);
            }
        };
        
        this.animationId = requestAnimationFrame(gameLoop);
    }
    
    stopGameLoop() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
    }
    
    playSound(soundName) {
        const sound = this.sounds[soundName];
        if (sound) {
            sound.currentTime = 0;
            sound.play().catch(() => {
                // 音声再生エラーを無視
            });
        }
    }
    
    // UI制御メソッド
    hideLoading() {
        document.getElementById('loading-screen').classList.add('hidden');
    }
    
    showGameOver() {
        document.getElementById('game-over-screen').classList.remove('hidden');
    }
    
    hideGameOver() {
        document.getElementById('game-over-screen').classList.add('hidden');
    }
    
    showPause() {
        document.getElementById('pause-screen').classList.remove('hidden');
    }
    
    hidePause() {
        document.getElementById('pause-screen').classList.add('hidden');
    }
}

// ゲーム初期化
document.addEventListener('DOMContentLoaded', () => {
    // ローディング画面を少し表示
    setTimeout(() => {
        window.pinballGame = new PinballGame();
    }, 1500);
});

// タッチデバイス対応
document.addEventListener('touchstart', function(e) {
    // デフォルトのタッチ動作を防止
    if (e.target.classList.contains('control-btn') || 
        e.target.id === 'plunger') {
        e.preventDefault();
    }
}, { passive: false });

// ページ離脱時の処理
window.addEventListener('beforeunload', () => {
    if (window.pinballGame) {
        window.pinballGame.stopGameLoop();
    }
}); 