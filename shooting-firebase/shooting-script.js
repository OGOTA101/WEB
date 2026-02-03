// SFミッション - ゲームスクリプト
// 4方向シューティングゲーム（マルチプレイ同期対応）

class ShootingGame {
    constructor() {
        // 設定を読み込み
        const cfg = window.GAME_CONFIG || {};
        this.config = cfg;

        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');

        // Assets
        this.images = {
            player: new Image(),
            enemy: new Image(),
            background: new Image()
        };
        this.images.player.src = 'images/player.png';
        this.images.enemy.src = 'images/enemy.png';

        // ゲーム状態
        this.state = 'start'; // start, playing, gameover
        this.width = window.innerWidth;
        this.height = window.innerHeight;

        // プレイヤー
        this.myId = 'pilot_' + Math.random().toString(36).substr(2, 9);
        this.playerName = 'パイロット';

        // 設定からパラメータを取得
        const playerCfg = cfg.player || {};
        const enemyCfg = cfg.enemy || {};
        const bulletCfg = cfg.bullet || {};
        const spawnCfg = cfg.spawn || {};
        const mpCfg = cfg.multiplayer || {};

        this.player = {
            x: 0,
            y: 0,
            targetX: 0,
            targetY: 0,
            speed: playerCfg.speed || 5,
            hp: playerCfg.maxHp || 100,
            maxHp: playerCfg.maxHp || 100,
            isMoving: false,
            lastShot: 0,
            score: 0,
            dead: false,
            respawnTime: playerCfg.respawnTime || 5
        };

        // エンティティ
        this.bullets = [];
        this.enemies = [];
        this.particles = [];
        this.items = []; // 強化アイテム
        this.remotePlayers = {}; // id -> {x, y, dead, name, targetX, targetY}

        // ゲームパラメータ（設定ファイルから）
        this.shotInterval = playerCfg.shotInterval || 500;
        this.bulletSpeed = bulletCfg.speed || 10;
        this.bulletHitRadius = bulletCfg.hitRadius || 20;

        this.enemyBaseSpeed = enemyCfg.baseSpeed || 1.5;
        this.enemySpeedVariation = enemyCfg.speedVariation || 0.5;
        this.enemyMaxCount = enemyCfg.maxCount || 30;
        this.enemyDamage = enemyCfg.damage || 10;
        this.enemyHitRadius = enemyCfg.hitRadius || 30;
        this.enemyScoreValue = enemyCfg.scoreValue || 100;

        this.spawnInitialRate = spawnCfg.initialRate || 2000;
        this.spawnMinRate = spawnCfg.minRate || 500;
        this.spawnRateDecrease = spawnCfg.rateDecrease || 5;
        this.spawnOffset = spawnCfg.spawnOffset || 50;

        this.enemySpawnRate = this.spawnInitialRate;
        this.lastSpawn = 0;
        this.currentSpeedMultiplier = 1.0;

        // Firebase（軽量化のため同期間隔を長く）
        this.database = null;
        this.lastSync = 0;
        this.syncInterval = mpCfg.syncInterval || 150; // 150msに変更（軽量化）

        // 強化アイテム状態
        this.powerups = {
            speedBoost: { active: false, endTime: 0, multiplier: 1.5 },
            rapidFire: { active: false, endTime: 0, multiplier: 0.5 },
            shield: { active: false, endTime: 0 },
            doubleScore: { active: false, endTime: 0, multiplier: 2 },
            eightWay: { active: false, endTime: 0 }
        };
        this.itemDropChance = 0.25; // 25%の確率でアイテムドロップ

        // 初期サイズ設定後にプレイヤー位置を設定
        this.player.x = this.width / 2;
        this.player.y = this.height / 2;
        this.player.targetX = this.player.x;
        this.player.targetY = this.player.y;

        // フレームタイム管理
        this.lastFrameTime = 0;
        this.deltaTime = 0;

        this.init();
    }

    async init() {
        // ウィンドウリサイズ処理
        window.addEventListener('resize', () => this.resize());

        // 入力設定
        this.setupInputs();

        // Firebase初期化
        await this.initFirebase();

        // ローダーを非表示
        document.getElementById('loading-screen').classList.add('hidden');

        // ゲームループ開始
        this.loop = this.loop.bind(this);
        requestAnimationFrame(this.loop);
    }

    async initFirebase() {
        try {
            // Firebaseホスティング環境から設定を取得
            const response = await fetch('/__/firebase/init.json');
            if (response.ok) {
                const config = await response.json();
                firebase.initializeApp(config);
            } else {
                console.warn('Firebase init.jsonを読み込めませんでした。ローカル実行時は手動設定が必要です。');
            }

            this.database = firebase.database();

            // 他のプレイヤーを監視
            const playersRef = this.database.ref('shooting_players');

            playersRef.on('child_added', (snapshot) => {
                const id = snapshot.key;
                if (id === this.myId) return;
                const data = snapshot.val();
                this.remotePlayers[id] = {
                    ...data,
                    displayX: data.x,
                    displayY: data.y
                };
                this.updateOnlineCount();
            });

            playersRef.on('child_changed', (snapshot) => {
                const id = snapshot.key;
                if (id === this.myId) return;
                const data = snapshot.val();
                if (this.remotePlayers[id]) {
                    // 補間用に前の位置を保持
                    this.remotePlayers[id] = {
                        ...data,
                        displayX: this.remotePlayers[id].displayX || data.x,
                        displayY: this.remotePlayers[id].displayY || data.y,
                        targetX: data.x,
                        targetY: data.y
                    };
                }
            });

            playersRef.on('child_removed', (snapshot) => {
                delete this.remotePlayers[snapshot.key];
                this.updateOnlineCount();
            });

            // 切断時の処理
            const myRef = this.database.ref(`shooting_players/${this.myId}`);
            myRef.onDisconnect().remove();

            // 接続状態
            this.database.ref('.info/connected').on('value', (snap) => {
                const el = document.getElementById('connection-status');
                if (snap.val() === true) {
                    el.textContent = 'システム オンライン';
                    el.classList.add('connected');
                    el.classList.remove('disconnected');
                } else {
                    el.textContent = 'オフライン モード';
                    el.classList.add('disconnected');
                    el.classList.remove('connected');
                }
            });

        } catch (e) {
            console.error('Firebase初期化エラー:', e);
            document.getElementById('connection-status').textContent = '接続失敗';
        }
    }

    resize() {
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.canvas.width = this.width;
        this.canvas.height = this.height;

        // 初期状態でプレイヤー位置をリセット
        if (this.state === 'start' && this.player) {
            this.player.x = this.width / 2;
            this.player.y = this.height / 2;
            this.player.targetX = this.player.x;
            this.player.targetY = this.player.y;
        }
    }

    setupInputs() {
        const visualCfg = this.config.visual || {};
        const colors = visualCfg.colors || {};
        const particleCount = visualCfg.particleCount || {};

        const handleInput = (x, y) => {
            if (this.state !== 'playing' || this.player.dead) return;
            this.player.targetX = x;
            this.player.targetY = y;
            this.player.isMoving = true;

            // クリックエフェクトを作成
            this.createParticles(x, y, particleCount.click || 5, colors.clickParticle || '#00f3ff');
        };

        this.canvas.addEventListener('mousedown', (e) => {
            handleInput(e.clientX, e.clientY);
        });

        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            handleInput(e.touches[0].clientX, e.touches[0].clientY);
        }, { passive: false });

        // スタートボタン
        document.getElementById('start-btn').addEventListener('click', () => {
            const name = document.getElementById('player-name-input').value.trim();
            if (name) this.playerName = name;
            this.startGame();
        });
    }

    startGame() {
        this.state = 'playing';
        document.getElementById('start-screen').classList.add('hidden');
        document.getElementById('game-over-screen').classList.add('hidden');

        // ゲーム設定をリセット
        this.enemySpawnRate = this.spawnInitialRate;
        this.currentSpeedMultiplier = 1.0;

        // パワーアップをリセット
        for (let key in this.powerups) {
            this.powerups[key].active = false;
            this.powerups[key].endTime = 0;
        }

        // ステータスをリセット
        this.player.score = 0;
        this.player.hp = this.player.maxHp;
        this.player.dead = false;
        this.player.x = this.width / 2;
        this.player.y = this.height / 2;
        this.player.targetX = this.player.x;
        this.player.targetY = this.player.y;
        this.player.isMoving = false;

        this.bullets = [];
        this.enemies = [];
        this.particles = [];
        this.items = [];

        this.updateUI();
        this.updatePowerupUI();

        // データベースに登録
        if (this.database) {
            this.database.ref(`shooting_players/${this.myId}`).set({
                name: this.playerName,
                x: this.player.x,
                y: this.player.y,
                dead: false,
                lastActive: firebase.database.ServerValue.TIMESTAMP
            });
        }
    }

    updateOnlineCount() {
        const count = Object.keys(this.remotePlayers).length + 1;
        document.getElementById('online-count').textContent = count;
    }

    loop(timestamp) {
        // デルタタイム計算
        this.deltaTime = timestamp - this.lastFrameTime;
        this.lastFrameTime = timestamp;

        if (this.state === 'playing') {
            this.update(timestamp);
        }
        this.draw();
        requestAnimationFrame(this.loop);
    }

    update(timestamp) {
        if (this.player.dead) return;

        // パワーアップの期限チェック
        this.checkPowerupExpiry(timestamp);

        // 1. プレイヤーを移動
        const p = this.player;
        const dx = p.targetX - p.x;
        const dy = p.targetY - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // スピードブースト適用
        let currentSpeed = p.speed;
        if (this.powerups.speedBoost.active) {
            currentSpeed *= this.powerups.speedBoost.multiplier;
        }

        if (dist > currentSpeed) {
            p.isMoving = true;
            const angle = Math.atan2(dy, dx);
            p.x += Math.cos(angle) * currentSpeed;
            p.y += Math.sin(angle) * currentSpeed;
        } else {
            p.x = p.targetX;
            p.y = p.targetY;
            p.isMoving = false;

            // 2. 自動射撃
            let shotInterval = this.shotInterval;
            if (this.powerups.rapidFire.active) {
                shotInterval *= this.powerups.rapidFire.multiplier;
            }

            if (timestamp - p.lastShot > shotInterval) {
                this.shoot();
                p.lastShot = timestamp;
            }
        }

        // Firebaseに同期（軽量化）
        if (this.database && timestamp - this.lastSync > this.syncInterval) {
            this.database.ref(`shooting_players/${this.myId}`).update({
                x: Math.round(p.x),
                y: Math.round(p.y),
                dead: p.dead
            });
            this.lastSync = timestamp;
        }

        // リモートプレイヤーの補間処理
        this.interpolateRemotePlayers();

        // 3. 弾丸を更新
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const b = this.bullets[i];
            b.x += b.vx;
            b.y += b.vy;

            if (b.x < 0 || b.x > this.width || b.y < 0 || b.y > this.height) {
                this.bullets.splice(i, 1);
            }
        }

        // 4. 敵を更新
        if (timestamp - this.lastSpawn > this.enemySpawnRate && this.enemies.length < this.enemyMaxCount) {
            this.spawnEnemy();
            this.lastSpawn = timestamp;

            if (this.enemySpawnRate > this.spawnMinRate) {
                this.enemySpawnRate -= this.spawnRateDecrease;
            }

            const diffCfg = this.config.difficulty || {};
            if (diffCfg.enabled) {
                const maxMult = diffCfg.maxSpeedMultiplier || 2.0;
                const increaseRate = diffCfg.speedIncreaseRate || 0.01;
                if (this.currentSpeedMultiplier < maxMult) {
                    this.currentSpeedMultiplier += increaseRate;
                }
            }
        }

        const visualCfg = this.config.visual || {};
        const colors = visualCfg.colors || {};
        const particleCount = visualCfg.particleCount || {};

        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const e = this.enemies[i];

            const ex = p.x - e.x;
            const ey = p.y - e.y;
            const edist = Math.sqrt(ex * ex + ey * ey);

            if (edist > 0) {
                e.x += (ex / edist) * e.speed;
                e.y += (ey / edist) * e.speed;
            }

            // プレイヤーとの衝突
            if (edist < this.enemyHitRadius) {
                // シールドがあればダメージ無効
                if (!this.powerups.shield.active) {
                    this.takeDamage(this.enemyDamage);
                }
                this.createParticles(e.x, e.y, particleCount.damage || 10, colors.damageParticle || '#ff3333');
                this.enemies.splice(i, 1);
                continue;
            }

            // 弾丸との衝突
            let hit = false;
            for (let j = this.bullets.length - 1; j >= 0; j--) {
                const b = this.bullets[j];
                const bdist = Math.sqrt((b.x - e.x) ** 2 + (b.y - e.y) ** 2);
                if (bdist < this.bulletHitRadius) {
                    this.bullets.splice(j, 1);
                    this.createParticles(e.x, e.y, particleCount.hit || 8, colors.hitParticle || '#ff9900');

                    // スコア（ダブルスコア適用）
                    let score = this.enemyScoreValue;
                    if (this.powerups.doubleScore.active) {
                        score *= this.powerups.doubleScore.multiplier;
                    }
                    p.score += score;
                    this.updateUI();
                    hit = true;
                    break;
                }
            }

            if (hit) {
                // アイテムドロップ判定
                if (Math.random() < this.itemDropChance) {
                    this.spawnItem(e.x, e.y);
                }
                this.enemies.splice(i, 1);
            }
        }

        // 5. アイテムを更新
        this.updateItems();

        // 6. パーティクルを更新
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const part = this.particles[i];
            part.x += part.vx;
            part.y += part.vy;
            part.life--;
            if (part.life <= 0) this.particles.splice(i, 1);
        }
    }

    interpolateRemotePlayers() {
        const interpSpeed = 0.15; // 補間速度

        Object.keys(this.remotePlayers).forEach(id => {
            const p = this.remotePlayers[id];
            if (p.targetX !== undefined && p.targetY !== undefined) {
                p.displayX += (p.targetX - p.displayX) * interpSpeed;
                p.displayY += (p.targetY - p.displayY) * interpSpeed;
            }
        });
    }

    checkPowerupExpiry(timestamp) {
        for (let key in this.powerups) {
            const pu = this.powerups[key];
            if (pu.active && timestamp > pu.endTime) {
                pu.active = false;
                this.updatePowerupUI();
            }
        }
    }

    spawnItem(x, y) {
        const types = ['speedBoost', 'rapidFire', 'shield', 'doubleScore', 'eightWay', 'heal'];
        const type = types[Math.floor(Math.random() * types.length)];

        this.items.push({
            x: x,
            y: y,
            type: type,
            life: 300, // 5秒間存在
            size: 20,
            pulse: 0
        });
    }

    updateItems() {
        const p = this.player;

        for (let i = this.items.length - 1; i >= 0; i--) {
            const item = this.items[i];
            item.life--;
            item.pulse += 0.1;

            // 寿命切れ
            if (item.life <= 0) {
                this.items.splice(i, 1);
                continue;
            }

            // プレイヤーとの接触
            const dx = p.x - item.x;
            const dy = p.y - item.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < 30) {
                this.collectItem(item);
                this.items.splice(i, 1);
            }
        }
    }

    collectItem(item) {
        const now = performance.now();
        const duration = 10000; // 10秒間効果持続

        switch (item.type) {
            case 'speedBoost':
                this.powerups.speedBoost.active = true;
                this.powerups.speedBoost.endTime = now + duration;
                break;
            case 'rapidFire':
                this.powerups.rapidFire.active = true;
                this.powerups.rapidFire.endTime = now + duration;
                break;
            case 'shield':
                this.powerups.shield.active = true;
                this.powerups.shield.endTime = now + duration;
                break;
            case 'doubleScore':
                this.powerups.doubleScore.active = true;
                this.powerups.doubleScore.endTime = now + duration;
                break;
            case 'eightWay':
                this.powerups.eightWay.active = true;
                this.powerups.eightWay.endTime = now + duration;
                break;
            case 'heal':
                this.player.hp = Math.min(this.player.hp + 30, this.player.maxHp);
                this.updateUI();
                break;
        }

        // 取得エフェクト
        this.createParticles(item.x, item.y, 15, this.getItemColor(item.type));
        this.updatePowerupUI();
    }

    getItemColor(type) {
        const colors = {
            speedBoost: '#00ff66',
            rapidFire: '#ffff00',
            shield: '#00aaff',
            doubleScore: '#ff00ff',
            eightWay: '#ff6600',
            heal: '#ff3366'
        };
        return colors[type] || '#ffffff';
    }

    getItemIcon(type) {
        const icons = {
            speedBoost: '⚡',
            rapidFire: '🔥',
            shield: '🛡️',
            doubleScore: '💎',
            eightWay: '✦',
            heal: '❤️'
        };
        return icons[type] || '?';
    }

    updatePowerupUI() {
        const container = document.getElementById('powerup-status');
        if (!container) return;

        let html = '';
        const now = performance.now();

        for (let key in this.powerups) {
            const pu = this.powerups[key];
            if (pu.active) {
                const remaining = Math.ceil((pu.endTime - now) / 1000);
                html += `<div class="powerup-item ${key}">${this.getItemIcon(key)} ${remaining}s</div>`;
            }
        }

        container.innerHTML = html || '<div class="powerup-none">-</div>';
    }

    spawnEnemy() {
        const side = Math.floor(Math.random() * 4);
        let x, y;
        const offset = this.spawnOffset;

        switch (side) {
            case 0: x = Math.random() * this.width; y = -offset; break;
            case 1: x = this.width + offset; y = Math.random() * this.height; break;
            case 2: x = Math.random() * this.width; y = this.height + offset; break;
            case 3: x = -offset; y = Math.random() * this.height; break;
        }

        const baseSpeed = this.enemyBaseSpeed + (Math.random() * this.enemySpeedVariation);
        const speed = baseSpeed * this.currentSpeedMultiplier;

        this.enemies.push({
            x: x,
            y: y,
            speed: speed,
            hp: 1
        });
    }

    shoot() {
        let dirs;

        // 8方向ショットがアクティブなら
        if (this.powerups.eightWay.active) {
            dirs = [
                { vx: 0, vy: -1 }, { vx: 0, vy: 1 }, { vx: -1, vy: 0 }, { vx: 1, vy: 0 },
                { vx: 0.707, vy: -0.707 }, { vx: 0.707, vy: 0.707 },
                { vx: -0.707, vy: -0.707 }, { vx: -0.707, vy: 0.707 }
            ];
        } else {
            dirs = [
                { vx: 0, vy: -1 }, { vx: 0, vy: 1 }, { vx: -1, vy: 0 }, { vx: 1, vy: 0 }
            ];
        }

        dirs.forEach(d => {
            this.bullets.push({
                x: this.player.x,
                y: this.player.y,
                vx: d.vx * this.bulletSpeed,
                vy: d.vy * this.bulletSpeed
            });
        });
    }

    takeDamage(amount) {
        this.player.hp -= amount;
        if (this.player.hp <= 0) {
            this.player.hp = 0;
            this.die();
        }
        this.updateUI();
    }

    die() {
        this.player.dead = true;

        const visualCfg = this.config.visual || {};
        const colors = visualCfg.colors || {};
        const particleCount = visualCfg.particleCount || {};

        this.createParticles(this.player.x, this.player.y, particleCount.death || 50, colors.deathParticle || '#ff00ff');

        if (this.database) {
            this.database.ref(`shooting_players/${this.myId}/dead`).set(true);
        }

        document.getElementById('final-score').textContent = this.player.score;
        document.getElementById('game-over-screen').classList.remove('hidden');

        let count = this.player.respawnTime;
        const cdEl = document.getElementById('respawn-count');
        cdEl.textContent = count;
        const timer = setInterval(() => {
            count--;
            cdEl.textContent = count;
            if (count <= 0) {
                clearInterval(timer);
                this.respawn();
            }
        }, 1000);
    }

    respawn() {
        this.player.hp = this.player.maxHp;
        this.player.dead = false;
        this.player.x = this.width / 2;
        this.player.y = this.height / 2;
        this.enemies = [];
        this.items = [];

        // パワーアップをリセット
        for (let key in this.powerups) {
            this.powerups[key].active = false;
        }

        this.updateUI();
        this.updatePowerupUI();

        document.getElementById('game-over-screen').classList.add('hidden');

        if (this.database) {
            this.database.ref(`shooting_players/${this.myId}`).update({
                dead: false,
                hp: this.player.maxHp
            });
        }
    }

    createParticles(x, y, count, color) {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 5 + 2;
            this.particles.push({
                x: x,
                y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 30 + Math.random() * 20,
                color: color,
                size: Math.random() * 3 + 1
            });
        }
    }

    updateUI() {
        document.getElementById('score-display').textContent = this.player.score;
        document.getElementById('hp-fill').style.width = (this.player.hp / this.player.maxHp * 100) + '%';
        document.getElementById('hp-text').textContent = this.player.hp + '%';
    }

    draw() {
        const visualCfg = this.config.visual || {};
        const colors = visualCfg.colors || {};

        this.ctx.clearRect(0, 0, this.width, this.height);

        // パーティクル描画
        this.ctx.globalCompositeOperation = 'lighter';
        this.particles.forEach(p => {
            this.ctx.fillStyle = p.color;
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            this.ctx.fill();
        });

        this.ctx.globalCompositeOperation = 'source-over';

        // リモートプレイヤー描画（補間後の位置を使用）
        const remoteSize = visualCfg.remotePlayerSize || 40;
        const remoteOpacity = visualCfg.remotePlayerOpacity || 0.5;

        Object.keys(this.remotePlayers).forEach(id => {
            const p = this.remotePlayers[id];
            if (p.dead) return;

            const drawX = p.displayX || p.x;
            const drawY = p.displayY || p.y;

            this.ctx.globalAlpha = remoteOpacity;
            this.ctx.drawImage(this.images.player, drawX - remoteSize / 2, drawY - remoteSize / 2, remoteSize, remoteSize);

            this.ctx.fillStyle = colors.bullet || '#00f3ff';
            this.ctx.font = '12px "Noto Sans JP", Orbitron';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(p.name || '???', drawX, drawY - remoteSize / 2 - 10);
            this.ctx.globalAlpha = 1.0;
        });

        const playerSize = visualCfg.playerSize || 50;
        const enemySize = visualCfg.enemySize || 40;

        if (this.state === 'playing' && !this.player.dead) {
            // 弾丸描画
            this.ctx.fillStyle = colors.bullet || '#00f3ff';
            this.bullets.forEach(b => {
                this.ctx.shadowBlur = 10;
                this.ctx.shadowColor = colors.bullet || '#00f3ff';
                this.ctx.fillRect(b.x - 2, b.y - 2, 4, 4);
                this.ctx.shadowBlur = 0;
            });

            // ターゲットマーカー描画（移動中でなくても目標地点を表示）
            if (this.player.isMoving || (this.player.targetX !== this.player.x || this.player.targetY !== this.player.y)) {
                // 外円（点線）
                this.ctx.strokeStyle = 'rgba(0, 243, 255, 0.5)';
                this.ctx.lineWidth = 2;
                this.ctx.setLineDash([5, 5]);
                this.ctx.beginPath();
                this.ctx.arc(this.player.targetX, this.player.targetY, 15, 0, Math.PI * 2);
                this.ctx.stroke();

                // 内円（実線）
                this.ctx.setLineDash([]);
                this.ctx.strokeStyle = 'rgba(0, 243, 255, 0.8)';
                this.ctx.beginPath();
                this.ctx.arc(this.player.targetX, this.player.targetY, 5, 0, Math.PI * 2);
                this.ctx.stroke();

                // 十字
                this.ctx.beginPath();
                this.ctx.moveTo(this.player.targetX - 20, this.player.targetY);
                this.ctx.lineTo(this.player.targetX + 20, this.player.targetY);
                this.ctx.moveTo(this.player.targetX, this.player.targetY - 20);
                this.ctx.lineTo(this.player.targetX, this.player.targetY + 20);
                this.ctx.stroke();
            }

            // シールドエフェクト
            if (this.powerups.shield.active) {
                this.ctx.strokeStyle = 'rgba(0, 170, 255, 0.5)';
                this.ctx.lineWidth = 3;
                this.ctx.beginPath();
                this.ctx.arc(this.player.x, this.player.y, playerSize / 2 + 10, 0, Math.PI * 2);
                this.ctx.stroke();
            }

            // プレイヤー描画
            this.ctx.shadowBlur = 20;
            this.ctx.shadowColor = colors.playerGlow || '#00f3ff';
            this.ctx.drawImage(this.images.player, this.player.x - playerSize / 2, this.player.y - playerSize / 2, playerSize, playerSize);
            this.ctx.shadowBlur = 0;
        }

        // アイテム描画
        this.items.forEach(item => {
            const pulseSize = item.size + Math.sin(item.pulse) * 5;
            const alpha = item.life < 60 ? item.life / 60 : 1; // 残り1秒で点滅

            this.ctx.globalAlpha = alpha;
            this.ctx.fillStyle = this.getItemColor(item.type);
            this.ctx.shadowBlur = 15;
            this.ctx.shadowColor = this.getItemColor(item.type);
            this.ctx.beginPath();
            this.ctx.arc(item.x, item.y, pulseSize / 2, 0, Math.PI * 2);
            this.ctx.fill();

            // アイコン
            this.ctx.shadowBlur = 0;
            this.ctx.fillStyle = '#ffffff';
            this.ctx.font = '16px sans-serif';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText(this.getItemIcon(item.type), item.x, item.y);
            this.ctx.globalAlpha = 1;
        });

        // 敵描画
        this.enemies.forEach(e => {
            this.ctx.shadowBlur = 15;
            this.ctx.shadowColor = colors.enemyGlow || '#ff3333';
            this.ctx.drawImage(this.images.enemy, e.x - enemySize / 2, e.y - enemySize / 2, enemySize, enemySize);
            this.ctx.shadowBlur = 0;
        });

        // デバッグ表示
        const debugCfg = this.config.debug || {};
        if (debugCfg.enabled) {
            this.drawDebugInfo();
        }
    }

    drawDebugInfo() {
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.ctx.fillRect(10, 10, 220, 140);

        this.ctx.fillStyle = '#00ff00';
        this.ctx.font = '12px monospace';
        this.ctx.textAlign = 'left';

        const lines = [
            `敵の数: ${this.enemies.length} / ${this.enemyMaxCount}`,
            `アイテム数: ${this.items.length}`,
            `スポーン間隔: ${Math.round(this.enemySpawnRate)}ms`,
            `速度倍率: ${this.currentSpeedMultiplier.toFixed(2)}x`,
            `オンライン: ${Object.keys(this.remotePlayers).length + 1}`,
            `同期間隔: ${this.syncInterval}ms`,
        ];

        lines.forEach((line, i) => {
            this.ctx.fillText(line, 20, 30 + i * 18);
        });
    }
}

// ゲーム開始
window.onload = () => {
    window.game = new ShootingGame();
};
