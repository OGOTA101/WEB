// エスケープ・ラン - SFサイバー回避アクションゲーム
class EscapeRunGame {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        if (!this.canvas) {
            console.error('Canvas element not found');
            return;
        }
        this.ctx = this.canvas.getContext('2d');

        // Canvas サイズ設定
        this.canvas.width = 800;
        this.canvas.height = 400;

        // ゲーム状態
        this.isRunning = false;
        this.isPaused = false;
        this.gameTime = 0;
        this.score = 0;
        this.dodgedCount = 0;
        this.itemCount = 0;

        // プレイヤー
        this.player = {
            x: 100,
            y: 300,
            width: 20,
            height: 20,
            velocityY: 0,
            onGround: true,
            isCharging: false,
            chargeStartTime: 0,
            maxCharge: 100,
            currentCharge: 0,
            glowPhase: 0,
            doubleJumpAvailable: false,
            hasDoubleJump: false,
            doubleJumpTimer: 0,
            isInvincible: false,
            invincibleTimer: 0
        };

        // ゲーム設定
        this.gravity = 0.6;
        this.groundY = 320;
        this.gameSpeed = 3;
        this.maxSpeed = 8;
        this.acceleration = 0.002;

        // 敵（赤い三角形）
        this.enemies = [];
        this.lastEnemySpawn = 0;
        this.enemySpawnRate = 0.02;

        // アイテム（青い図形）
        this.items = [];
        this.lastItemSpawn = 0;
        this.itemSpawnRate = 0.008;

        // エフェクト
        this.particles = [];
        this.backgroundParticles = [];
        this.screenFlash = 0;
        this.cameraShake = 0;

        // 背景
        this.stars = [];
        this.gridOffset = 0;

        // 入力処理
        this.keys = {};
        this.isJumpKeyDown = false;
        this.touchStartTime = 0;

        // スコア管理
        this.bestScore = localStorage.getItem('escapeRunBestScore') || 0;

        // UI要素
        this.chargeGauge = document.getElementById('chargeGauge');
        this.chargeFill = document.getElementById('chargeFill');

        this.init();
    }

    init() {
        this.initBackground();
        this.setupEventListeners();
        this.loadSounds();
        this.updateUI(); // 初期状態のUI更新
        this.showStartScreen();
    }

    initBackground() {
        // 星の初期化
        this.stars = [];
        for (let i = 0; i < 100; i++) {
            this.stars.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height,
                size: Math.random() * 2 + 1,
                speed: Math.random() * 0.5 + 0.2,
                opacity: Math.random() * 0.8 + 0.2
            });
        }

        // 背景パーティクル
        this.backgroundParticles = [];
        for (let i = 0; i < 20; i++) {
            this.backgroundParticles.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height,
                size: Math.random() * 3 + 1,
                speed: Math.random() * 1 + 0.5,
                opacity: Math.random() * 0.3 + 0.1,
                color: `hsl(${180 + Math.random() * 60}, 70%, 60%)`
            });
        }
    }

    loadSounds() {
        if (!window.audioSystem) return;

        const audioContext = window.audioSystem.audioContext;
        if (!audioContext) return;

        try {
            // ジャンプ音
            const jumpBuffer = this.generateJumpSound(audioContext);
            window.audioSystem.addSound('escape-jump', jumpBuffer);

            // アイテム音
            const itemBuffer = this.generateItemSound(audioContext);
            window.audioSystem.addSound('escape-item', itemBuffer);

            // 敵回避音
            const dodgeBuffer = this.generateDodgeSound(audioContext);
            window.audioSystem.addSound('escape-dodge', dodgeBuffer);

            // クラッシュ音
            const crashBuffer = this.generateCrashSound(audioContext);
            window.audioSystem.addSound('escape-crash', crashBuffer);

            // パワーアップ音
            const powerupBuffer = this.generatePowerupSound(audioContext);
            window.audioSystem.addSound('escape-powerup', powerupBuffer);

        } catch (e) {
            console.warn('Failed to load escape sounds:', e);
        }
    }

    generateJumpSound(audioContext) {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.frequency.setValueAtTime(400, audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(800, audioContext.currentTime + 0.1);

        gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);

        return { oscillator, gainNode };
    }

    generateItemSound(audioContext) {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(1200, audioContext.currentTime + 0.1);

        gainNode.gain.setValueAtTime(0.15, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);

        return { oscillator, gainNode };
    }

    generateDodgeSound(audioContext) {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.frequency.setValueAtTime(600, audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(400, audioContext.currentTime + 0.1);

        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);

        return { oscillator, gainNode };
    }

    generateCrashSound(audioContext) {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.frequency.setValueAtTime(200, audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(50, audioContext.currentTime + 0.5);

        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.8);

        return { oscillator, gainNode };
    }

    generatePowerupSound(audioContext) {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.frequency.setValueAtTime(500, audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(1000, audioContext.currentTime + 0.2);

        gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);

        return { oscillator, gainNode };
    }

    setupEventListeners() {
        // キーボード入力
        document.addEventListener('keydown', (e) => {
            this.keys[e.code] = true;

            if (e.code === 'Space' || e.code === 'ArrowUp') {
                e.preventDefault();
                this.startChargeJump();
            }
        });

        document.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;

            if (e.code === 'Space' || e.code === 'ArrowUp') {
                e.preventDefault();
                this.endChargeJump();
            }
        });

        // モバイル対応
        const jumpButton = document.getElementById('jumpBtn');
        if (jumpButton) {
            jumpButton.addEventListener('touchstart', (e) => {
                e.preventDefault();
                this.touchStartTime = Date.now();
                this.startChargeJump();
            });

            jumpButton.addEventListener('touchend', (e) => {
                e.preventDefault();
                this.endChargeJump();
            });

            jumpButton.addEventListener('mousedown', (e) => {
                e.preventDefault();
                this.touchStartTime = Date.now();
                this.startChargeJump();
            });

            jumpButton.addEventListener('mouseup', (e) => {
                e.preventDefault();
                this.endChargeJump();
            });
        }

        // ゲーム制御ボタン
        const startButton = document.getElementById('startButton');
        if (startButton) {
            startButton.addEventListener('click', () => this.startGame());
        }

        const restartButton = document.getElementById('restartButton');
        if (restartButton) {
            restartButton.addEventListener('click', () => this.restartGame());
        }

        const pauseButton = document.getElementById('pauseButton');
        if (pauseButton) {
            pauseButton.addEventListener('click', () => this.togglePause());
        }
    }

    startChargeJump() {
        if (!this.isRunning || this.isPaused) return;

        if (!this.isJumpKeyDown) {
            this.isJumpKeyDown = true;
            this.player.isCharging = true;
            this.player.chargeStartTime = Date.now();
            this.player.currentCharge = 0;

            // チャージゲージ表示
            if (this.chargeGauge) {
                this.chargeGauge.style.display = 'block';
            }
        }
    }

    endChargeJump() {
        if (!this.isRunning || this.isPaused) return;

        if (this.isJumpKeyDown) {
            this.isJumpKeyDown = false;
            this.player.isCharging = false;

            // チャージゲージ非表示
            if (this.chargeGauge) {
                this.chargeGauge.style.display = 'none';
            }

            this.executeJump();
        }
    }

    executeJump() {
        const canJump = this.player.onGround || (this.player.hasDoubleJump && this.player.doubleJumpAvailable);

        if (canJump) {
            // チャージ量に応じたジャンプ力
            const chargeMultiplier = Math.min(this.player.currentCharge / this.player.maxCharge, 1);
            const jumpPower = 8 + (chargeMultiplier * 12); // 8-20の範囲

            this.player.velocityY = -jumpPower;

            // 二段ジャンプ処理
            if (!this.player.onGround && this.player.hasDoubleJump && this.player.doubleJumpAvailable) {
                this.player.doubleJumpAvailable = false;
                this.createDoubleJumpParticles();
            }

            this.player.onGround = false;
            this.player.currentCharge = 0;

            // ジャンプパーティクル
            this.createJumpParticles();

            // ジャンプ音
            if (window.audioSystem) {
                window.audioSystem.play('escape-jump', 0.3);
            }
        }
    }

    startGame() {
        this.isRunning = true;
        this.isPaused = false;
        this.gameTime = 0;
        this.score = 0;
        this.dodgedCount = 0;
        this.itemCount = 0;
        this.gameSpeed = 3;

        // プレイヤーリセット
        this.player.x = 100;
        this.player.y = this.groundY;
        this.player.velocityY = 0;
        this.player.onGround = true;
        this.player.isCharging = false;
        this.player.currentCharge = 0;
        this.player.hasDoubleJump = false;
        this.player.doubleJumpAvailable = false;
        this.player.doubleJumpTimer = 0;
        this.player.isInvincible = false;
        this.player.invincibleTimer = 0;
        this.player.glowPhase = 0;

        // 配列リセット
        this.enemies = [];
        this.items = [];
        this.particles = [];
        this.screenFlash = 0;
        this.cameraShake = 0;

        // 背景リセット
        this.gridOffset = 0;
        this.lastEnemySpawn = 0;
        this.lastItemSpawn = 0;

        this.hideStartScreen();
        this.gameLoop();
    }

    restartGame() {
        this.hideGameOverScreen();
        this.startGame();
    }

    togglePause() {
        this.isPaused = !this.isPaused;

        // ゲームエリア内の一時停止ボタン
        const pauseButton = document.getElementById('pauseButton');
        if (pauseButton) {
            pauseButton.textContent = this.isPaused ? '▶️' : '⏸️';
        }

        // コントロールエリアの一時停止ボタン
        const pauseBtn = document.getElementById('pauseBtn');
        if (pauseBtn) {
            pauseBtn.textContent = this.isPaused ? '▶️ 再開' : '⏸️ 一時停止';
        }
    }

    update() {
        if (!this.isRunning || this.isPaused) return;

        this.gameTime++;

        // 速度上昇
        if (this.gameSpeed < this.maxSpeed) {
            this.gameSpeed += this.acceleration;
        }

        // スコア更新
        this.score += Math.floor(this.gameSpeed);

        this.updatePlayer();
        this.updateChargeSystem();
        this.updatePowerups();
        this.spawnEnemies();
        this.spawnItems();
        this.updateEnemies();
        this.updateItems();
        this.updateParticles();
        this.updateBackground();
        this.checkCollisions();
        this.updateUI();

        // エフェクト減衰
        if (this.screenFlash > 0) {
            this.screenFlash -= 0.05;
        }
        if (this.cameraShake > 0) {
            this.cameraShake *= 0.9;
        }

        // プレイヤーグロー効果
        this.player.glowPhase += 0.1;
    }

    updatePlayer() {
        // 重力適用
        if (!this.player.onGround) {
            this.player.velocityY += this.gravity;
        }

        // Y座標更新
        this.player.y += this.player.velocityY;

        // 地面判定
        if (this.player.y >= this.groundY) {
            this.player.y = this.groundY;
            this.player.velocityY = 0;
            this.player.onGround = true;

            // 二段ジャンプリセット
            if (this.player.hasDoubleJump) {
                this.player.doubleJumpAvailable = true;
            }
        }

        // 画面上部制限
        if (this.player.y < 0) {
            this.player.y = 0;
            this.player.velocityY = 0;
        }
    }

    updateChargeSystem() {
        if (this.player.isCharging) {
            const chargeTime = Date.now() - this.player.chargeStartTime;
            this.player.currentCharge = Math.min(chargeTime / 10, this.player.maxCharge);

            // チャージゲージ更新
            if (this.chargeFill) {
                const chargePercent = (this.player.currentCharge / this.player.maxCharge) * 100;
                this.chargeFill.style.width = `${chargePercent}%`;
            }
        }
    }

    updatePowerups() {
        // 二段ジャンプタイマー
        if (this.player.hasDoubleJump && this.player.doubleJumpTimer > 0) {
            this.player.doubleJumpTimer--;
            if (this.player.doubleJumpTimer <= 0) {
                this.player.hasDoubleJump = false;
                this.player.doubleJumpAvailable = false;
            }
        }

        // 無敵タイマー
        if (this.player.isInvincible && this.player.invincibleTimer > 0) {
            this.player.invincibleTimer--;
            if (this.player.invincibleTimer <= 0) {
                this.player.isInvincible = false;
            }
        }
    }

    spawnEnemies() {
        if (Math.random() < this.enemySpawnRate + (this.gameSpeed - 3) * 0.005) {
            const types = ['triangle-right', 'triangle-down'];
            const type = types[Math.floor(Math.random() * types.length)];

            let enemy = {
                x: this.canvas.width + 50,
                y: this.groundY - 20,
                width: 25,
                height: 20,
                type: type,
                speed: this.gameSpeed + Math.random() * 2,
                rotation: 0
            };

            // 高さバリエーション
            if (Math.random() < 0.3) {
                enemy.y = this.groundY - 60 - Math.random() * 80;
            }

            this.enemies.push(enemy);
        }
    }

    spawnItems() {
        if (Math.random() < this.itemSpawnRate) {
            const types = ['circle', 'star', 'diamond'];
            const type = types[Math.floor(Math.random() * types.length)];

            let item = {
                x: this.canvas.width + 50,
                y: this.groundY - 40 - Math.random() * 100,
                width: 15,
                height: 15,
                type: type,
                speed: this.gameSpeed * 0.8,
                bounce: Math.random() * Math.PI * 2,
                effect: this.getItemEffect(type)
            };

            this.items.push(item);
        }
    }

    getItemEffect(type) {
        switch (type) {
            case 'circle':
                return 'double-jump';
            case 'star':
                return 'invincible';
            case 'diamond':
                return 'score-boost';
            default:
                return 'score-boost';
        }
    }

    updateEnemies() {
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const enemy = this.enemies[i];
            enemy.x -= enemy.speed;
            enemy.rotation += 0.1;

            // 敵が画面外に出たら削除とスコア加算
            if (enemy.x < -enemy.width) {
                this.enemies.splice(i, 1);
                this.dodgedCount++;
                this.score += 50;

                // 回避音
                if (window.audioSystem) {
                    window.audioSystem.play('escape-dodge', 0.1);
                }
            }
        }
    }

    updateItems() {
        for (let i = this.items.length - 1; i >= 0; i--) {
            const item = this.items[i];
            item.x -= item.speed;
            item.bounce += 0.15;

            if (item.x < -item.width) {
                this.items.splice(i, 1);
            }
        }
    }

    updateParticles() {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const particle = this.particles[i];
            particle.x += particle.vx;
            particle.y += particle.vy;
            particle.life -= particle.decay;

            if (particle.gravity) {
                particle.vy += 0.1;
            }

            if (particle.life <= 0) {
                this.particles.splice(i, 1);
            }
        }
    }

    updateBackground() {
        this.gridOffset += this.gameSpeed;

        // 星の移動
        this.stars.forEach(star => {
            star.x -= star.speed;
            if (star.x < -star.size) {
                star.x = this.canvas.width + star.size;
            }
        });

        // 背景パーティクル
        this.backgroundParticles.forEach(particle => {
            particle.x -= particle.speed;
            if (particle.x < -particle.size) {
                particle.x = this.canvas.width + particle.size;
            }
        });
    }

    checkCollisions() {
        if (this.player.isInvincible) return;

        // 敵との衝突
        for (let enemy of this.enemies) {
            if (this.checkCollision(this.player, enemy)) {
                this.gameOver();
                return;
            }
        }

        // アイテムとの衝突
        for (let i = this.items.length - 1; i >= 0; i--) {
            const item = this.items[i];
            if (this.checkCollision(this.player, item)) {
                this.collectItem(item);
                this.items.splice(i, 1);
            }
        }
    }

    checkCollision(rect1, rect2) {
        return rect1.x < rect2.x + rect2.width &&
            rect1.x + rect1.width > rect2.x &&
            rect1.y < rect2.y + rect2.height &&
            rect1.y + rect1.height > rect2.y;
    }

    collectItem(item) {
        this.itemCount++;
        this.score += 100;

        // アイテム効果適用
        switch (item.effect) {
            case 'double-jump':
                this.player.hasDoubleJump = true;
                this.player.doubleJumpAvailable = true;
                this.player.doubleJumpTimer = 600; // 10秒
                break;
            case 'invincible':
                this.player.isInvincible = true;
                this.player.invincibleTimer = 300; // 5秒
                break;
            case 'score-boost':
                this.score += 500;
                break;
        }

        // アイテムパーティクル
        this.createItemParticles(item.x + item.width / 2, item.y + item.height / 2);

        // アイテム音
        if (window.audioSystem) {
            window.audioSystem.play('escape-powerup', 0.4);
        }
    }

    createJumpParticles() {
        for (let i = 0; i < 8; i++) {
            this.particles.push({
                x: this.player.x + Math.random() * this.player.width,
                y: this.player.y + this.player.height,
                vx: (Math.random() - 0.5) * 6,
                vy: -Math.random() * 4,
                life: 1,
                decay: 0.02,
                color: '#00ffff',
                size: 2 + Math.random() * 2,
                gravity: true
            });
        }
    }

    createDoubleJumpParticles() {
        for (let i = 0; i < 12; i++) {
            this.particles.push({
                x: this.player.x + this.player.width / 2,
                y: this.player.y + this.player.height / 2,
                vx: (Math.random() - 0.5) * 8,
                vy: (Math.random() - 0.5) * 8,
                life: 1,
                decay: 0.015,
                color: '#ff6600',
                size: 3 + Math.random() * 3,
                gravity: false
            });
        }
    }

    createItemParticles(x, y) {
        for (let i = 0; i < 15; i++) {
            this.particles.push({
                x: x,
                y: y,
                vx: (Math.random() - 0.5) * 8,
                vy: (Math.random() - 0.5) * 8,
                life: 1,
                decay: 0.01,
                color: '#0088ff',
                size: 2 + Math.random() * 3,
                gravity: false
            });
        }
    }

    gameOver() {
        this.isRunning = false;

        // 画面エフェクト
        this.screenFlash = 1;
        this.cameraShake = 30;

        // 爆発パーティクル
        for (let i = 0; i < 40; i++) {
            this.particles.push({
                x: this.player.x + this.player.width / 2,
                y: this.player.y + this.player.height / 2,
                vx: (Math.random() - 0.5) * 16,
                vy: (Math.random() - 0.5) * 16,
                life: 1,
                decay: 0.005,
                color: ['#ff0000', '#ff4400', '#ff6600', '#ff8800'][Math.floor(Math.random() * 4)],
                size: 3 + Math.random() * 5,
                gravity: false
            });
        }

        // クラッシュ音
        if (window.audioSystem) {
            window.audioSystem.play('escape-crash', 0.6);
        }

        // ベストスコア更新
        if (this.score > this.bestScore) {
            this.bestScore = this.score;
            localStorage.setItem('escapeRunBestScore', this.bestScore);
        }

        setTimeout(() => this.showGameOverScreen(), 1500);
    }

    draw() {
        // 画面クリア
        this.ctx.fillStyle = '#000011';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // カメラシェイク適用
        if (this.cameraShake > 0) {
            this.ctx.save();
            this.ctx.translate(
                (Math.random() - 0.5) * this.cameraShake,
                (Math.random() - 0.5) * this.cameraShake
            );
        }

        // 背景
        this.drawBackground();

        // プレイヤー
        this.drawPlayer();

        // 敵
        this.drawEnemies();

        // アイテム
        this.drawItems();

        // パーティクル
        this.drawParticles();

        // UI
        this.drawUI();

        // スクリーンフラッシュ
        if (this.screenFlash > 0) {
            this.ctx.fillStyle = `rgba(255, 0, 0, ${this.screenFlash * 0.3})`;
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        }

        // カメラシェイク復元
        if (this.cameraShake > 0) {
            this.ctx.restore();
        }
    }

    drawBackground() {
        // グリッド
        this.ctx.strokeStyle = 'rgba(0, 255, 255, 0.1)';
        this.ctx.lineWidth = 1;

        const gridSize = 40;
        const offsetX = -(this.gridOffset % gridSize);
        const offsetY = 0;

        for (let x = offsetX; x < this.canvas.width; x += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, this.canvas.height);
            this.ctx.stroke();
        }

        for (let y = offsetY; y < this.canvas.height; y += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(this.canvas.width, y);
            this.ctx.stroke();
        }

        // 星
        this.stars.forEach(star => {
            this.ctx.save();
            this.ctx.globalAlpha = star.opacity;
            this.ctx.fillStyle = '#ffffff';
            this.ctx.beginPath();
            this.ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.restore();
        });

        // 背景パーティクル
        this.backgroundParticles.forEach(particle => {
            this.ctx.save();
            this.ctx.globalAlpha = particle.opacity;
            this.ctx.fillStyle = particle.color;
            this.ctx.beginPath();
            this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.restore();
        });

        // 地面
        this.ctx.fillStyle = 'rgba(0, 255, 255, 0.2)';
        this.ctx.fillRect(0, this.groundY + 20, this.canvas.width, 10);
    }

    drawPlayer() {
        this.ctx.save();

        // 無敵モード時の点滅
        if (this.player.isInvincible && Math.floor(this.gameTime / 5) % 2 === 0) {
            this.ctx.globalAlpha = 0.5;
        }

        const x = this.player.x + this.player.width / 2;
        const y = this.player.y + this.player.height / 2;

        // グローエフェクト
        const glowSize = 8 + Math.sin(this.player.glowPhase) * 4;
        this.ctx.shadowBlur = glowSize;
        this.ctx.shadowColor = '#00ffff';

        // プレイヤー本体（白い四角）
        this.ctx.fillStyle = '#ffffff';
        this.ctx.fillRect(this.player.x, this.player.y, this.player.width, this.player.height);

        // 内側のサイバーエフェクト
        this.ctx.shadowBlur = 0;
        this.ctx.fillStyle = '#00ffff';
        this.ctx.fillRect(this.player.x + 2, this.player.y + 2, this.player.width - 4, this.player.height - 4);

        // 二段ジャンプ表示
        if (this.player.hasDoubleJump) {
            this.ctx.fillStyle = '#ff6600';
            this.ctx.fillRect(this.player.x + 6, this.player.y + 6, this.player.width - 12, this.player.height - 12);
        }

        this.ctx.restore();
    }

    drawEnemies() {
        this.enemies.forEach(enemy => {
            this.ctx.save();

            const x = enemy.x + enemy.width / 2;
            const y = enemy.y + enemy.height / 2;

            this.ctx.translate(x, y);
            this.ctx.rotate(enemy.rotation);

            // 敵の影
            this.ctx.shadowBlur = 10;
            this.ctx.shadowColor = '#ff0000';

            this.ctx.fillStyle = '#ff0000';

            if (enemy.type === 'triangle-right') {
                // 右向き三角形 ▶
                this.ctx.beginPath();
                this.ctx.moveTo(enemy.width / 2, 0);
                this.ctx.lineTo(-enemy.width / 2, -enemy.height / 2);
                this.ctx.lineTo(-enemy.width / 2, enemy.height / 2);
                this.ctx.closePath();
                this.ctx.fill();
            } else if (enemy.type === 'triangle-down') {
                // 下向き三角形 ▼
                this.ctx.beginPath();
                this.ctx.moveTo(0, enemy.height / 2);
                this.ctx.lineTo(-enemy.width / 2, -enemy.height / 2);
                this.ctx.lineTo(enemy.width / 2, -enemy.height / 2);
                this.ctx.closePath();
                this.ctx.fill();
            }

            this.ctx.restore();
        });
    }

    drawItems() {
        this.items.forEach(item => {
            this.ctx.save();

            const x = item.x + item.width / 2;
            const y = item.y + item.height / 2 + Math.sin(item.bounce) * 3;

            this.ctx.translate(x, y);

            // アイテムの影
            this.ctx.shadowBlur = 8;
            this.ctx.shadowColor = '#0088ff';

            this.ctx.fillStyle = '#0088ff';

            if (item.type === 'circle') {
                // 円 ●
                this.ctx.beginPath();
                this.ctx.arc(0, 0, item.width / 2, 0, Math.PI * 2);
                this.ctx.fill();
            } else if (item.type === 'star') {
                // 星 ★
                this.ctx.beginPath();
                for (let i = 0; i < 5; i++) {
                    const angle = (i * Math.PI * 2) / 5 - Math.PI / 2;
                    const x1 = Math.cos(angle) * item.width / 2;
                    const y1 = Math.sin(angle) * item.width / 2;
                    const x2 = Math.cos(angle + Math.PI / 5) * item.width / 4;
                    const y2 = Math.sin(angle + Math.PI / 5) * item.width / 4;

                    if (i === 0) {
                        this.ctx.moveTo(x1, y1);
                    } else {
                        this.ctx.lineTo(x1, y1);
                    }
                    this.ctx.lineTo(x2, y2);
                }
                this.ctx.closePath();
                this.ctx.fill();
            } else if (item.type === 'diamond') {
                // ダイヤモンド ◆
                this.ctx.beginPath();
                this.ctx.moveTo(0, -item.height / 2);
                this.ctx.lineTo(item.width / 2, 0);
                this.ctx.lineTo(0, item.height / 2);
                this.ctx.lineTo(-item.width / 2, 0);
                this.ctx.closePath();
                this.ctx.fill();
            }

            this.ctx.restore();
        });
    }

    drawParticles() {
        this.particles.forEach(particle => {
            this.ctx.save();
            this.ctx.globalAlpha = particle.life;
            this.ctx.fillStyle = particle.color;
            this.ctx.beginPath();
            this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.restore();
        });
    }

    drawUI() {
        // パワーアップ表示
        let yOffset = 20;

        if (this.player.hasDoubleJump) {
            const timeLeft = Math.ceil(this.player.doubleJumpTimer / 60);
            this.ctx.fillStyle = '#ff6600';
            this.ctx.font = 'bold 16px Arial';
            this.ctx.fillText(`二段ジャンプ: ${timeLeft}秒`, 20, yOffset);
            yOffset += 25;
        }

        if (this.player.isInvincible) {
            const timeLeft = Math.ceil(this.player.invincibleTimer / 60);
            this.ctx.fillStyle = '#00ff00';
            this.ctx.font = 'bold 16px Arial';
            this.ctx.fillText(`無敵: ${timeLeft}秒`, 20, yOffset);
            yOffset += 25;
        }

        // スコア表示
        this.ctx.fillStyle = '#00ffff';
        this.ctx.font = 'bold 18px Arial';
        this.ctx.fillText(`スコア: ${this.score}`, this.canvas.width - 150, 30);

        // 速度表示
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = '14px Arial';
        this.ctx.fillText(`速度: ${this.gameSpeed.toFixed(1)}`, this.canvas.width - 150, 50);
    }

    updateUI() {
        // ゲームヘッダーの統計を更新
        const scoreElements = document.querySelectorAll('#score');
        const dodgedElements = document.querySelectorAll('#dodged');
        const itemsElements = document.querySelectorAll('#items');
        const bestScoreElements = document.querySelectorAll('#bestScore');

        scoreElements.forEach(element => {
            element.textContent = this.score;
        });

        dodgedElements.forEach(element => {
            element.textContent = this.dodgedCount;
        });

        itemsElements.forEach(element => {
            element.textContent = this.itemCount;
        });

        bestScoreElements.forEach(element => {
            element.textContent = this.bestScore;
        });
    }

    showStartScreen() {
        const startScreen = document.getElementById('startScreen');
        if (startScreen) {
            startScreen.style.display = 'flex';
        }

        // 一時停止ボタンを非表示
        const pauseButton = document.getElementById('pauseButton');
        if (pauseButton) {
            pauseButton.style.display = 'none';
        }
    }

    hideStartScreen() {
        const startScreen = document.getElementById('startScreen');
        if (startScreen) {
            startScreen.style.display = 'none';
        }

        // 一時停止ボタンを表示
        const pauseButton = document.getElementById('pauseButton');
        if (pauseButton) {
            pauseButton.style.display = 'flex';
        }
    }

    showGameOverScreen() {
        const gameOverScreen = document.getElementById('gameOverScreen');
        const finalScore = document.getElementById('finalScore');
        const finalDodged = document.getElementById('finalDodged');
        const finalItems = document.getElementById('finalItems');
        const bestScoreElements = document.querySelectorAll('#bestScore');

        if (gameOverScreen) {
            gameOverScreen.style.display = 'block';
        }

        if (finalScore) finalScore.textContent = this.score;
        if (finalDodged) finalDodged.textContent = this.dodgedCount;
        if (finalItems) finalItems.textContent = this.itemCount;

        // 複数のbestScore要素を更新
        bestScoreElements.forEach(element => {
            element.textContent = this.bestScore;
        });

        // 一時停止ボタンを非表示
        const pauseButton = document.getElementById('pauseButton');
        if (pauseButton) {
            pauseButton.style.display = 'none';
        }
    }

    hideGameOverScreen() {
        const gameOverScreen = document.getElementById('gameOverScreen');
        if (gameOverScreen) {
            gameOverScreen.style.display = 'none';
        }
    }

    gameLoop() {
        if (this.isRunning) {
            this.update();
            this.draw();
            requestAnimationFrame(() => this.gameLoop());
        }
    }
}

// ゲーム初期化
let game;
window.addEventListener('load', () => {
    game = new EscapeRunGame();
});
