// Phaserシューティングゲーム
class ShootingGame extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });

        // ゲーム状態
        this.score = 0;
        this.level = 1;
        this.lives = 3;
        this.kills = 0;
        this.isGameRunning = false;
        this.isPaused = false;

        // プレイヤー強化状態
        this.playerPowerLevel = 1;
        this.playerSpeed = 300;

        // タイマー
        this.enemySpawnTimer = 0;
        this.powerupSpawnTimer = 0;

        // モバイル入力
        this.mobileInput = {
            left: false,
            right: false,
            shoot: false
        };

        // ゲームオブジェクト
        this.player = null;
        this.bullets = null;
        this.enemies = null;
        this.enemyBullets = null;
        this.powerups = null;
        this.explosions = null;
        this.stars = null;

        // 入力
        this.cursors = null;
        this.spaceKey = null;
        this.escKey = null;
    }

    preload() {
        this.createSprites();
        this.loadSounds();
    }

    createSprites() {
        // プレイヤー船（三角形を手動で描画）
        const playerGraphics = this.add.graphics()
            .fillStyle(0x00ffff);

        playerGraphics.beginPath();
        playerGraphics.moveTo(16, 0);   // 上の点
        playerGraphics.lineTo(0, 32);   // 左下の点
        playerGraphics.lineTo(32, 32);  // 右下の点
        playerGraphics.closePath();
        playerGraphics.fillPath();
        playerGraphics.generateTexture('player', 32, 32);

        // プレイヤーの弾
        this.add.graphics()
            .fillStyle(0x00ff00)
            .fillRect(0, 0, 4, 12)
            .generateTexture('bullet', 4, 12);

        // 敵1（小型）（三角形を手動で描画）
        const enemy1Graphics = this.add.graphics()
            .fillStyle(0xff4444);

        enemy1Graphics.beginPath();
        enemy1Graphics.moveTo(16, 32);  // 下の点
        enemy1Graphics.lineTo(0, 0);    // 左上の点
        enemy1Graphics.lineTo(32, 0);   // 右上の点
        enemy1Graphics.closePath();
        enemy1Graphics.fillPath();
        enemy1Graphics.generateTexture('enemy1', 32, 32);

        // 敵2（中型）
        const enemy2Graphics = this.add.graphics()
            .fillStyle(0xff8844)
            .fillRect(0, 0, 48, 32)
            .fillStyle(0xff4444);

        // 三角形を手動で描画
        enemy2Graphics.beginPath();
        enemy2Graphics.moveTo(24, 0);   // 上の点
        enemy2Graphics.lineTo(8, 16);   // 左の点
        enemy2Graphics.lineTo(40, 16);  // 右の点
        enemy2Graphics.closePath();
        enemy2Graphics.fillPath();
        enemy2Graphics.generateTexture('enemy2', 48, 32);

        // 敵3（大型）
        const enemy3Graphics = this.add.graphics()
            .fillStyle(0xff0044)
            .fillRect(0, 8, 64, 48)
            .fillStyle(0xff4488);

        // 三角形を手動で描画
        enemy3Graphics.beginPath();
        enemy3Graphics.moveTo(32, 0);   // 上の点
        enemy3Graphics.lineTo(16, 24);  // 左の点
        enemy3Graphics.lineTo(48, 24);  // 右の点
        enemy3Graphics.closePath();
        enemy3Graphics.fillPath();
        enemy3Graphics.generateTexture('enemy3', 64, 56);

        // 敵の弾
        this.add.graphics()
            .fillStyle(0xff4444)
            .fillCircle(4, 4, 4)
            .generateTexture('enemyBullet', 8, 8);

        // パワーアップアイテム（星形を手動で描画）
        const starGraphics = this.add.graphics()
            .fillStyle(0xffff00);

        // 星形のポイントを計算
        const centerX = 16;
        const centerY = 16;
        const outerRadius = 12;
        const innerRadius = 6;
        const points = 5;

        starGraphics.beginPath();
        for (let i = 0; i < points * 2; i++) {
            const angle = (i * Math.PI) / points;
            const radius = i % 2 === 0 ? outerRadius : innerRadius;
            const x = centerX + Math.cos(angle - Math.PI / 2) * radius;
            const y = centerY + Math.sin(angle - Math.PI / 2) * radius;

            if (i === 0) {
                starGraphics.moveTo(x, y);
            } else {
                starGraphics.lineTo(x, y);
            }
        }
        starGraphics.closePath();
        starGraphics.fillPath();
        starGraphics.generateTexture('powerup', 32, 32);

        // 爆発エフェクト
        for (let i = 0; i < 8; i++) {
            const size = 16 + i * 8;
            const alpha = 1 - (i * 0.1);
            this.add.graphics()
                .fillStyle(0xff4444, alpha)
                .fillCircle(size / 2, size / 2, size / 2)
                .fillStyle(0xffff44, alpha * 0.7)
                .fillCircle(size / 2, size / 2, size / 3)
                .generateTexture(`explosion${i}`, size, size);
        }

        // 星（背景）
        this.add.graphics()
            .fillStyle(0xffffff)
            .fillCircle(1, 1, 1)
            .generateTexture('star', 2, 2);
    }

    loadSounds() {
        if (!window.audioSystem || !window.audioSystem.audioContext) {
            console.log('AudioSystem not available, skipping sound loading');
            return;
        }

        const audioContext = window.audioSystem.audioContext;
        if (!audioContext) {
            console.log('AudioContext not available');
            return;
        }

        // レーザー音
        const laserBuffer = this.generateLaserSound(audioContext);
        window.audioSystem.addSound('laser', laserBuffer);

        // 爆発音
        const explosionBuffer = this.generateExplosionSound(audioContext);
        window.audioSystem.addSound('explosion', explosionBuffer);

        // パワーアップ音
        const powerupBuffer = this.generatePowerupSound(audioContext);
        window.audioSystem.addSound('powerup', powerupBuffer);

        // ダメージ音
        const damageBuffer = this.generateDamageSound(audioContext);
        window.audioSystem.addSound('damage', damageBuffer);

        // レベルアップ音
        const levelupBuffer = this.generateLevelupSound(audioContext);
        window.audioSystem.addSound('levelup', levelupBuffer);
    }

    generateLaserSound(audioContext) {
        const sampleRate = audioContext.sampleRate;
        const duration = 0.1;
        const buffer = audioContext.createBuffer(1, sampleRate * duration, sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < data.length; i++) {
            const t = i / sampleRate;
            const freq = 800 - (t * 400);
            data[i] = Math.sin(2 * Math.PI * freq * t) * Math.exp(-t * 10) * 0.3;
        }

        return buffer;
    }

    generateExplosionSound(audioContext) {
        const sampleRate = audioContext.sampleRate;
        const duration = 0.5;
        const buffer = audioContext.createBuffer(1, sampleRate * duration, sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < data.length; i++) {
            const t = i / sampleRate;
            const noise = (Math.random() - 0.5) * 2;
            const boom = Math.sin(2 * Math.PI * (100 - t * 80) * t);
            const envelope = Math.exp(-t * 3);

            data[i] = (noise * 0.6 + boom * 0.4) * envelope * 0.4;
        }

        return buffer;
    }

    generatePowerupSound(audioContext) {
        const sampleRate = audioContext.sampleRate;
        const duration = 0.3;
        const buffer = audioContext.createBuffer(1, sampleRate * duration, sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < data.length; i++) {
            const t = i / sampleRate;
            const freq = 440 + (t * 880);
            data[i] = Math.sin(2 * Math.PI * freq * t) * Math.exp(-t * 2) * 0.2;
        }

        return buffer;
    }

    generateDamageSound(audioContext) {
        const sampleRate = audioContext.sampleRate;
        const duration = 0.2;
        const buffer = audioContext.createBuffer(1, sampleRate * duration, sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < data.length; i++) {
            const t = i / sampleRate;
            const freq = 200 + Math.sin(t * 50) * 100;
            data[i] = Math.sin(2 * Math.PI * freq * t) * 0.3;
        }

        return buffer;
    }

    generateLevelupSound(audioContext) {
        const sampleRate = audioContext.sampleRate;
        const duration = 1.0;
        const buffer = audioContext.createBuffer(1, sampleRate * duration, sampleRate);
        const data = buffer.getChannelData(0);

        const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6

        for (let i = 0; i < data.length; i++) {
            const t = i / sampleRate;
            const noteIndex = Math.floor(t * 4) % notes.length;
            const freq = notes[noteIndex];
            const envelope = Math.exp(-t * 1);

            data[i] = Math.sin(2 * Math.PI * freq * t) * envelope * 0.2;
        }

        return buffer;
    }

    create() {
        // 背景の星
        this.stars = this.add.group();
        for (let i = 0; i < 100; i++) {
            const star = this.add.image(
                Phaser.Math.Between(0, 800),
                Phaser.Math.Between(0, 600),
                'star'
            );
            star.setAlpha(Math.random());
            this.stars.add(star);
        }

        // プレイヤー
        this.player = this.physics.add.sprite(400, 500, 'player');
        this.player.setCollideWorldBounds(true);

        // 弾グループ
        this.bullets = this.physics.add.group();
        this.enemyBullets = this.physics.add.group();

        // 敵グループ
        this.enemies = this.physics.add.group();

        // パワーアップグループ
        this.powerups = this.physics.add.group();

        // 爆発グループ
        this.explosions = this.add.group();

        // 入力設定
        this.cursors = this.input.keyboard.createCursorKeys();
        this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
        this.escKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);

        // 衝突判定
        this.physics.add.overlap(this.bullets, this.enemies, this.hitEnemy, null, this);
        this.physics.add.overlap(this.player, this.enemies, this.hitPlayer, null, this);
        this.physics.add.overlap(this.player, this.enemyBullets, this.hitPlayer, null, this);
        this.physics.add.overlap(this.player, this.powerups, this.collectPowerup, null, this);

        // ESCキーでポーズ
        this.escKey.on('down', () => {
            this.togglePause();
        });

        // ゲーム開始
        this.isGameRunning = true;
    }

    update() {
        if (!this.isGameRunning || this.isPaused) return;

        // プレイヤー移動
        this.updatePlayer();

        // 敵の生成
        this.updateEnemySpawn();

        // パワーアップの生成
        this.updatePowerupSpawn();

        // 弾の管理
        this.updateBullets();

        // 敵の管理
        this.updateEnemies();

        // 背景の星の移動
        this.updateStars();

        // レベルアップチェック
        this.checkLevelUp();
    }

    updatePlayer() {
        // プレイヤー移動
        if (this.cursors.left.isDown || this.mobileInput.left) {
            this.player.setVelocityX(-this.playerSpeed);
        } else if (this.cursors.right.isDown || this.mobileInput.right) {
            this.player.setVelocityX(this.playerSpeed);
        } else {
            this.player.setVelocityX(0);
        }

        // 射撃
        if (Phaser.Input.Keyboard.JustDown(this.spaceKey) || this.mobileInput.shoot) {
            this.shoot();
            this.mobileInput.shoot = false; // モバイル用にリセット
        }
    }

    shoot() {
        if (window.audioSystem && window.audioSystem.play) {
            window.audioSystem.play('laser', 0.3);
        }

        if (this.playerPowerLevel === 1) {
            // 通常弾
            const bullet = this.physics.add.sprite(this.player.x, this.player.y - 20, 'bullet');
            bullet.setVelocityY(-600);
            this.bullets.add(bullet);
        } else if (this.playerPowerLevel === 2) {
            // 2発同時
            const bullet1 = this.physics.add.sprite(this.player.x - 8, this.player.y - 20, 'bullet');
            const bullet2 = this.physics.add.sprite(this.player.x + 8, this.player.y - 20, 'bullet');
            bullet1.setVelocityY(-600);
            bullet2.setVelocityY(-600);
            this.bullets.add(bullet1);
            this.bullets.add(bullet2);
        } else {
            // 3発同時（拡散）
            const bullet1 = this.physics.add.sprite(this.player.x - 12, this.player.y - 20, 'bullet');
            const bullet2 = this.physics.add.sprite(this.player.x, this.player.y - 20, 'bullet');
            const bullet3 = this.physics.add.sprite(this.player.x + 12, this.player.y - 20, 'bullet');
            bullet1.setVelocity(-100, -600);
            bullet2.setVelocityY(-600);
            bullet3.setVelocity(100, -600);
            this.bullets.add(bullet1);
            this.bullets.add(bullet2);
            this.bullets.add(bullet3);
        }
    }

    updateEnemySpawn() {
        this.enemySpawnTimer++;
        const spawnRate = Math.max(60 - this.level * 5, 20);

        if (this.enemySpawnTimer >= spawnRate) {
            this.spawnEnemy();
            this.enemySpawnTimer = 0;
        }
    }

    spawnEnemy() {
        const x = Phaser.Math.Between(50, 750);
        const enemyType = Phaser.Math.Between(1, 3);
        let enemy;

        if (enemyType === 1) {
            enemy = this.physics.add.sprite(x, -50, 'enemy1');
            enemy.setVelocityY(100 + this.level * 20);
            enemy.health = 1;
            enemy.score = 10;
        } else if (enemyType === 2) {
            enemy = this.physics.add.sprite(x, -50, 'enemy2');
            enemy.setVelocityY(80 + this.level * 15);
            enemy.health = 2;
            enemy.score = 20;
        } else {
            enemy = this.physics.add.sprite(x, -50, 'enemy3');
            enemy.setVelocityY(60 + this.level * 10);
            enemy.health = 3;
            enemy.score = 50;
        }

        enemy.enemyType = enemyType;
        enemy.shootTimer = 0;
        this.enemies.add(enemy);
    }

    updatePowerupSpawn() {
        this.powerupSpawnTimer++;
        if (this.powerupSpawnTimer >= 600) {
            this.spawnPowerup();
            this.powerupSpawnTimer = 0;
        }
    }

    spawnPowerup() {
        const x = Phaser.Math.Between(50, 750);
        const powerup = this.physics.add.sprite(x, -50, 'powerup');
        powerup.setVelocityY(150);
        this.powerups.add(powerup);
    }

    updateBullets() {
        this.bullets.children.entries.forEach(bullet => {
            if (bullet.y < -10) {
                bullet.destroy();
            }
        });

        this.enemyBullets.children.entries.forEach(bullet => {
            if (bullet.y > 610) {
                bullet.destroy();
            }
        });
    }

    updateEnemies() {
        this.enemies.children.entries.forEach(enemy => {
            if (enemy.y > 650) {
                enemy.destroy();
                return;
            }

            enemy.shootTimer++;
            const shootRate = 120 - this.level * 10;
            if (enemy.shootTimer >= shootRate && enemy.y > 50) {
                this.enemyShoot(enemy);
                enemy.shootTimer = 0;
            }
        });
    }

    enemyShoot(enemy) {
        const bullet = this.physics.add.sprite(enemy.x, enemy.y + 20, 'enemyBullet');
        bullet.setVelocityY(200);
        this.enemyBullets.add(bullet);
    }

    updateStars() {
        this.stars.children.entries.forEach(star => {
            star.y += 1;
            if (star.y > 600) {
                star.y = -10;
                star.x = Phaser.Math.Between(0, 800);
            }
        });
    }

    hitEnemy(bullet, enemy) {
        bullet.destroy();
        enemy.health--;

        if (enemy.health <= 0) {
            this.score += enemy.score;
            this.kills++;
            this.createExplosion(enemy.x, enemy.y);
            enemy.destroy();

            if (window.audioSystem && window.audioSystem.play) {
                window.audioSystem.play('explosion', 0.4);
            }
        }

        this.updateUI();
    }

    hitPlayer(player, object) {
        object.destroy();
        this.lives--;
        this.createExplosion(player.x, player.y);

        if (window.audioSystem && window.audioSystem.play) {
            window.audioSystem.play('damage', 0.5);
        }

        if (this.lives <= 0) {
            this.gameOver();
        } else {
            player.setTint(0xff0000);
            this.time.delayedCall(1000, () => {
                player.clearTint();
            });
        }

        this.updateUI();
    }

    collectPowerup(player, powerup) {
        powerup.destroy();
        this.playerPowerLevel = Math.min(3, this.playerPowerLevel + 1);
        this.score += 100;

        if (window.audioSystem && window.audioSystem.play) {
            window.audioSystem.play('powerup', 0.4);
        }

        this.updateUI();
    }

    createExplosion(x, y) {
        const explosion = this.add.sprite(x, y, 'explosion0');
        this.explosions.add(explosion);

        let frame = 0;
        const explosionAnim = this.time.addEvent({
            delay: 50,
            callback: () => {
                frame++;
                if (frame < 8) {
                    explosion.setTexture(`explosion${frame}`);
                } else {
                    explosion.destroy();
                    explosionAnim.destroy();
                }
            },
            repeat: 7
        });
    }

    checkLevelUp() {
        const newLevel = Math.floor(this.kills / 10) + 1;
        if (newLevel > this.level) {
            this.level = newLevel;
            if (window.audioSystem && window.audioSystem.play) {
                window.audioSystem.play('levelup', 0.6);
            }
            this.updateUI();
        }
    }

    updateUI() {
        document.getElementById('score').textContent = this.score;
        document.getElementById('level').textContent = this.level;
        document.getElementById('lives').textContent = this.lives;
    }

    gameOver() {
        this.isGameRunning = false;

        document.getElementById('finalScore').textContent = this.score;
        document.getElementById('finalLevel').textContent = this.level;
        document.getElementById('finalKills').textContent = this.kills;
        document.getElementById('gameOverScreen').style.display = 'flex';

        this.awardCoins();
    }

    awardCoins() {
        let goldCoins = 0;
        let silverCoins = 0;
        let bronzeCoins = Math.floor(this.score / 100);

        if (this.score >= 5000) goldCoins = Math.floor(this.score / 5000);
        if (this.score >= 1000) silverCoins = Math.floor(this.score / 1000);

        const currentGold = parseInt(localStorage.getItem('goldCoins') || '0');
        const currentSilver = parseInt(localStorage.getItem('silverCoins') || '0');
        const currentBronze = parseInt(localStorage.getItem('bronzeCoins') || '0');

        localStorage.setItem('goldCoins', (currentGold + goldCoins).toString());
        localStorage.setItem('silverCoins', (currentSilver + silverCoins).toString());
        localStorage.setItem('bronzeCoins', (currentBronze + bronzeCoins).toString());
    }

    togglePause() {
        if (!this.isGameRunning) return;

        this.isPaused = !this.isPaused;
        const pauseBtn = document.getElementById('pauseBtn');

        if (this.isPaused) {
            pauseBtn.textContent = '▶️';
            this.physics.pause();
        } else {
            pauseBtn.textContent = '⏸️';
            this.physics.resume();
        }
    }

    restart() {
        this.score = 0;
        this.level = 1;
        this.lives = 3;
        this.kills = 0;
        this.playerPowerLevel = 1;
        this.playerSpeed = 300;
        this.enemySpawnTimer = 0;
        this.powerupSpawnTimer = 0;

        this.updateUI();
        this.isGameRunning = true;
        this.scene.restart();
    }
}

// ゲーム管理クラス
class GameManager {
    constructor() {
        this.game = null;
        this.gameScene = null;
        this.setupEventListeners();
    }

    setupEventListeners() {
        document.getElementById('startBtn').addEventListener('click', () => {
            if (window.audioSystem && window.audioSystem.play) {
                window.audioSystem.play('click');
            }
            this.startGame();
        });

        document.getElementById('instructionsBtn').addEventListener('click', () => {
            const instructions = document.getElementById('instructions');
            instructions.style.display = instructions.style.display === 'none' ? 'block' : 'none';
        });

        document.getElementById('restartBtn').addEventListener('click', () => {
            if (window.audioSystem && window.audioSystem.play) {
                window.audioSystem.play('click');
            }
            this.restartGame();
        });

        document.getElementById('backBtn').addEventListener('click', () => {
            window.location.href = '../../index.html';
        });

        document.getElementById('pauseBtn').addEventListener('click', () => {
            if (window.audioSystem && window.audioSystem.play) {
                window.audioSystem.play('click');
            }
            if (this.gameScene) {
                this.gameScene.togglePause();
            }
        });

        // モバイル操作
        document.getElementById('leftBtn').addEventListener('touchstart', () => {
            if (this.gameScene) this.gameScene.mobileInput.left = true;
        });
        document.getElementById('leftBtn').addEventListener('touchend', () => {
            if (this.gameScene) this.gameScene.mobileInput.left = false;
        });

        document.getElementById('rightBtn').addEventListener('touchstart', () => {
            if (this.gameScene) this.gameScene.mobileInput.right = true;
        });
        document.getElementById('rightBtn').addEventListener('touchend', () => {
            if (this.gameScene) this.gameScene.mobileInput.right = false;
        });

        document.getElementById('shootBtn').addEventListener('touchstart', () => {
            if (this.gameScene) this.gameScene.mobileInput.shoot = true;
        });
        document.getElementById('shootBtn').addEventListener('touchend', () => {
            if (this.gameScene) this.gameScene.mobileInput.shoot = false;
        });
    }

    startGame() {
        console.log('ゲーム開始');
        document.getElementById('startScreen').style.display = 'none';

        try {
            if (!this.game) {
                console.log('新しいPhaserゲームを作成');
                this.gameScene = new ShootingGame();

                const config = {
                    type: Phaser.AUTO,
                    width: 800,
                    height: 600,
                    parent: 'game-canvas',
                    backgroundColor: '#000011',
                    physics: {
                        default: 'arcade',
                        arcade: {
                            gravity: { y: 0 },
                            debug: false
                        }
                    },
                    scene: this.gameScene
                };

                this.game = new Phaser.Game(config);
            } else {
                console.log('既存のゲームをリスタート');
                this.restartGame();
            }
        } catch (error) {
            console.error('ゲーム開始エラー:', error);
            alert('ゲームの開始に失敗しました。ページを再読み込みしてください。');
        }
    }

    restartGame() {
        document.getElementById('gameOverScreen').style.display = 'none';

        if (this.gameScene) {
            this.gameScene.restart();
        }
    }
}

// ゲーム初期化
document.addEventListener('DOMContentLoaded', () => {
    if (typeof Phaser !== 'undefined') {
        const gameManager = new GameManager();
        window.shootingGame = gameManager;
    } else {
        console.error('Phaser.js が読み込まれていません');
        setTimeout(() => {
            if (typeof Phaser !== 'undefined') {
                const gameManager = new GameManager();
                window.shootingGame = gameManager;
            } else {
                console.error('Phaser.js の読み込みに失敗しました');
            }
        }, 1000);
    }
});
