/**
 * Cat Catch - Game Logic
 * メインのゲームロジック（詳細実装版）
 */

const Game = {
    // ゲーム状態
    state: {
        isPlaying: false,
        isPaused: false,
        currentWave: 1,
        castleHp: 3,
        maxCastleHp: 3,
        score: 0,
        capturedEnemies: [],  // 格納中の敵
        waveTimer: 0,
        waveStartDelay: 2000, // ウェーブ開始前の遅延
        isWaveStarting: false,
        combo: 0,
        lastCaptureTime: 0,
    },

    // ゲームオブジェクト
    objects: {
        ufo: null,
        enemies: [],
        effects: [],
        particles: [],
    },

    // 読み込んだ画像
    images: {},
    imagesLoaded: false,

    // キャンバス関連
    canvas: null,
    ctx: null,
    fieldWidth: 0,
    fieldHeight: 0,

    // ゲームループ
    lastTime: 0,
    animationId: null,

    // 入力状態
    input: {
        targetX: null,
        targetY: null,
        isCapturing: false,
        isEjecting: false,
    },

    // フィールドオブジェクトの位置（ピクセル）
    fieldObjects: {
        castle: { x: 0, y: 0, width: 80, height: 80 },
        volcano: { x: 0, y: 0, width: 64, height: 64 },
        lake: { x: 0, y: 0, width: 64, height: 64 },
    },

    /**
     * ゲームを初期化
     */
    init(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.resize();

        // 画像をプリロード
        this.preloadImages();

        // イベントリスナー設定
        this.setupInputListeners();

        console.log('Game initialized');
    },

    /**
     * 画像をプリロード
     */
    preloadImages() {
        const imageSources = {
            bg_field: CONFIG.ASSETS.IMAGES.BG_FIELD,
            castle: CONFIG.ASSETS.IMAGES.CASTLE,
            volcano: CONFIG.ASSETS.IMAGES.VOLCANO,
            lake: CONFIG.ASSETS.IMAGES.LAKE,
            ufo: CONFIG.ASSETS.IMAGES.UFO,
            mouse_normal: CONFIG.ASSETS.IMAGES.MOUSE_NORMAL,
            mouse_fire: CONFIG.ASSETS.IMAGES.MOUSE_FIRE,
            mouse_water: CONFIG.ASSETS.IMAGES.MOUSE_WATER,
            mouse_fast: CONFIG.ASSETS.IMAGES.MOUSE_FAST,
            mouse_big: CONFIG.ASSETS.IMAGES.MOUSE_BIG,
            mouse_boss: CONFIG.ASSETS.IMAGES.MOUSE_BOSS,
            fx_capture: CONFIG.ASSETS.IMAGES.FX_CAPTURE,
            fx_fire: CONFIG.ASSETS.IMAGES.FX_FIRE,
            fx_splash: CONFIG.ASSETS.IMAGES.FX_SPLASH,
        };

        // 透過処理が必要な画像（黒背景のもののみ）
        // 注意: 湖は既に透過済み、ネズミは現状の画像が回転に不向きなのでフォールバック描画を使用
        const needsTransparency = [
            'castle', 'volcano', 'ufo'
        ];

        let loadedCount = 0;
        const totalCount = Object.keys(imageSources).length;

        Object.entries(imageSources).forEach(([key, src]) => {
            const img = new Image();
            img.onload = () => {
                // 透過処理が必要な場合
                if (needsTransparency.includes(key)) {
                    this.images[key] = this.makeTransparent(img);
                } else {
                    this.images[key] = img;
                }
                loadedCount++;
                if (loadedCount >= totalCount) {
                    this.imagesLoaded = true;
                    console.log('All images loaded');
                }
            };
            img.onerror = () => {
                console.warn(`Failed to load image: ${src}`);
                loadedCount++;
            };
            img.src = src;
        });
    },

    /**
     * 黒/白背景を透過にする
     */
    makeTransparent(img) {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');

        ctx.drawImage(img, 0, 0);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];

            // 黒に近い色を透過（閾値: 30）
            if (r < 30 && g < 30 && b < 30) {
                data[i + 3] = 0; // 完全透過
            }
            // 白に近い色も透過（閾値: 240）背景が白の画像用
            else if (r > 240 && g > 240 && b > 240) {
                data[i + 3] = 0;
            }
            // グレーの背景も薄く透過（閾値: 200-240）
            else if (r > 200 && g > 200 && b > 200 && r === g && g === b) {
                data[i + 3] = Math.max(0, (r - 200) * 255 / 40);
            }
        }

        ctx.putImageData(imageData, 0, 0);

        // 新しいImageを作成
        const newImg = new Image();
        newImg.src = canvas.toDataURL();
        return newImg;
    },

    /**
     * キャンバスのリサイズ
     */
    resize() {
        const container = this.canvas.parentElement;
        const containerRect = container.getBoundingClientRect();

        // 9:16のアスペクト比を維持
        const aspectRatio = 9 / 16;
        let width = containerRect.width;
        let height = containerRect.height;

        if (width / height > aspectRatio) {
            width = height * aspectRatio;
        } else {
            height = width / aspectRatio;
        }

        // 最小・最大サイズ
        width = Math.max(CONFIG.SCREEN.MIN_WIDTH, Math.min(CONFIG.SCREEN.MAX_WIDTH, width));
        height = width / aspectRatio;

        this.canvas.width = width;
        this.canvas.height = height;
        this.fieldWidth = width;
        this.fieldHeight = height;

        // フィールドオブジェクトの位置を更新
        this.updateFieldObjectPositions();
    },

    /**
     * フィールドオブジェクトの位置を更新
     */
    updateFieldObjectPositions() {
        this.fieldObjects.castle = {
            x: this.fieldWidth * CONFIG.FIELD.CASTLE.x,
            y: this.fieldHeight * CONFIG.FIELD.CASTLE.y,
            width: 80,
            height: 80,
            radius: 35,
        };
        this.fieldObjects.volcano = {
            x: this.fieldWidth * CONFIG.FIELD.VOLCANO.x,
            y: this.fieldHeight * CONFIG.FIELD.VOLCANO.y,
            width: 64,
            height: 64,
            radius: 45,
        };
        this.fieldObjects.lake = {
            x: this.fieldWidth * CONFIG.FIELD.LAKE.x,
            y: this.fieldHeight * CONFIG.FIELD.LAKE.y,
            width: 64,
            height: 48,
            radius: 45,
        };
    },

    /**
     * 入力リスナーを設定
     */
    setupInputListeners() {
        // タップ/クリックで移動先を指定
        this.canvas.addEventListener('click', (e) => {
            if (!this.state.isPlaying || this.state.isPaused) return;

            const rect = this.canvas.getBoundingClientRect();
            const x = (e.clientX - rect.left) * (this.canvas.width / rect.width);
            const y = (e.clientY - rect.top) * (this.canvas.height / rect.height);

            this.input.targetX = x;
            this.input.targetY = y;
        });

        // タッチイベント
        this.canvas.addEventListener('touchstart', (e) => {
            if (!this.state.isPlaying || this.state.isPaused) return;
            e.preventDefault();

            const rect = this.canvas.getBoundingClientRect();
            const touch = e.touches[0];
            const x = (touch.clientX - rect.left) * (this.canvas.width / rect.width);
            const y = (touch.clientY - rect.top) * (this.canvas.height / rect.height);

            this.input.targetX = x;
            this.input.targetY = y;
        }, { passive: false });
    },

    /**
     * 新しいゲームを開始
     */
    startGame(wave = 1) {
        // ステータス値を取得
        const maxHp = DataManager.getStatValue('castle_hp') || CONFIG.GAME.CASTLE_MAX_HP;
        const ufoCapacity = DataManager.getStatValue('ufo_capacity') || CONFIG.GAME.UFO_CAPACITY;
        const ufoSpeedMult = DataManager.getStatValue('ufo_speed') || 1;
        const captureRange = DataManager.getStatValue('ufo_capture_range') || CONFIG.GAME.CAPTURE_RANGE;

        // 状態をリセット
        this.state = {
            isPlaying: true,
            isPaused: false,
            currentWave: wave,
            castleHp: maxHp,
            maxCastleHp: maxHp,
            score: 0,
            capturedEnemies: [],
            waveTimer: 0,
            waveStartDelay: 2000,
            isWaveStarting: true,
            combo: 0,
            lastCaptureTime: 0,
        };

        // フィールド位置を更新
        this.updateFieldObjectPositions();

        // UFOを初期化
        this.objects.ufo = {
            x: this.fieldWidth / 2,
            y: this.fieldHeight * 0.25,
            width: 48,
            height: 48,
            speed: CONFIG.GAME.UFO_SPEED * ufoSpeedMult,
            capacity: ufoCapacity,
            captureRange: captureRange,
            isCapturing: false,
            captureProgress: 0,
            captureTarget: null,
            bobOffset: 0,
            bobSpeed: 3,
        };

        // 敵とエフェクトをクリア
        this.objects.enemies = [];
        this.objects.effects = [];
        this.objects.particles = [];

        // 入力をリセット
        this.input = {
            targetX: null,
            targetY: null,
            isCapturing: false,
            isEjecting: false,
        };

        // UIを更新
        this.updateUI();

        // ゲームループ開始
        this.lastTime = performance.now();
        this.gameLoop();

        console.log('Game started - Wave', wave);
    },

    /**
     * ウェーブを開始
     */
    startWave(waveNum) {
        this.state.currentWave = waveNum;
        this.state.isWaveStarting = true;
        this.state.waveTimer = 0;

        // ウェーブ表示エフェクト
        this.addEffect('wave_start', this.fieldWidth / 2, this.fieldHeight / 3, {
            wave: waveNum,
            duration: 1.5,
        });

        // UIを更新
        this.updateUI();

        console.log('Starting Wave', waveNum);
    },

    /**
     * 敵をスポーン
     */
    spawnEnemies(waveNum) {
        const castle = this.fieldObjects.castle;

        // ウェーブに基づいて敵データを生成
        let enemyCount = Math.min(3 + Math.floor(waveNum * 0.8), 20);
        const isBossWave = waveNum % 10 === 0;

        // 敵の種類を決定
        const types = ['normal'];
        if (waveNum >= 5) types.push('fast');
        if (waveNum >= 8) types.push('fire', 'water');
        if (waveNum >= 12) types.push('big');

        // 敵を生成
        for (let i = 0; i < enemyCount; i++) {
            const type = types[Math.floor(Math.random() * types.length)];
            this.spawnEnemy(type, i, castle);
        }

        // ボスウェーブにはボスを追加
        if (isBossWave) {
            this.spawnEnemy('boss', enemyCount, castle);
        }
    },

    /**
     * 単体の敵をスポーン
     */
    spawnEnemy(type, index, castle) {
        // スポーン位置を360度ランダムに決定
        const angle = Math.random() * Math.PI * 2;
        const distance = Math.max(this.fieldWidth, this.fieldHeight) * 0.7;
        const spawnX = castle.x + Math.cos(angle) * distance;
        const spawnY = castle.y + Math.sin(angle) * distance;

        const enemyDef = CONFIG.ENEMY.TYPES[type.toUpperCase()];
        if (!enemyDef) return;

        // スローオーラの効果を適用
        const slowAura = DataManager.getStatValue('skill_slow_aura') || 0;
        const actualSpeed = enemyDef.speed * (1 - slowAura);

        // サイズを決定
        let size = 16;
        if (type === 'boss') size = 40;
        else if (type === 'big') size = 28;
        else if (type === 'fast') size = 12;

        const enemy = {
            id: `enemy_${Date.now()}_${index}`,
            type: type,
            x: spawnX,
            y: spawnY,
            width: size,
            height: size,
            speed: actualSpeed,
            hp: enemyDef.hp,
            maxHp: enemyDef.hp,
            slots: enemyDef.slots,
            weakness: enemyDef.weakness,
            targetX: castle.x,
            targetY: castle.y,
            isActive: true,
            spawnDelay: index * 400 + Math.random() * 200, // 順番にスポーン
            angle: angle + Math.PI, // 進行方向
            wobble: 0,
            wobbleSpeed: 3 + Math.random() * 2,
        };

        this.objects.enemies.push(enemy);
    },

    /**
     * ゲームループ
     */
    gameLoop() {
        if (!this.state.isPlaying) return;

        const currentTime = performance.now();
        const deltaTime = Math.min((currentTime - this.lastTime) / 1000, 0.1); // 最大0.1秒
        this.lastTime = currentTime;

        if (!this.state.isPaused) {
            this.update(deltaTime);
        }

        this.render();

        this.animationId = requestAnimationFrame(() => this.gameLoop());
    },

    /**
     * ゲーム状態を更新
     */
    update(dt) {
        // ウェーブ開始処理
        if (this.state.isWaveStarting) {
            this.state.waveTimer += dt * 1000;
            if (this.state.waveTimer >= this.state.waveStartDelay) {
                this.state.isWaveStarting = false;
                this.spawnEnemies(this.state.currentWave);
            }
            // UFOの浮遊アニメーションは継続
            if (this.objects.ufo) {
                this.objects.ufo.bobOffset += this.objects.ufo.bobSpeed * dt;
            }
            this.updateEffects(dt);
            this.updateParticles(dt);
            return;
        }

        // UFOを更新
        this.updateUFO(dt);

        // 敵を更新
        this.updateEnemies(dt);

        // エフェクトを更新
        this.updateEffects(dt);

        // パーティクルを更新
        this.updateParticles(dt);

        // コンボタイマー
        if (this.state.combo > 0 && performance.now() - this.state.lastCaptureTime > 3000) {
            this.state.combo = 0;
        }

        // ウェーブクリアチェック
        this.checkWaveClear();

        // ゲームオーバーチェック
        if (this.state.castleHp <= 0) {
            this.gameOver();
        }
    },

    /**
     * UFOを更新
     */
    updateUFO(dt) {
        const ufo = this.objects.ufo;
        if (!ufo) return;

        // 浮遊アニメーション
        ufo.bobOffset += ufo.bobSpeed * dt;

        // 移動先に向かって移動
        if (this.input.targetX !== null && this.input.targetY !== null) {
            const dx = this.input.targetX - ufo.x;
            const dy = this.input.targetY - ufo.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance > 5) {
                const moveSpeed = ufo.speed * dt;
                const moveAmount = Math.min(moveSpeed, distance);
                ufo.x += (dx / distance) * moveAmount;
                ufo.y += (dy / distance) * moveAmount;
            } else {
                this.input.targetX = null;
                this.input.targetY = null;
            }
        }

        // 画面内に制限
        const margin = ufo.width / 2;
        ufo.x = Math.max(margin, Math.min(this.fieldWidth - margin, ufo.x));
        ufo.y = Math.max(margin, Math.min(this.fieldHeight - margin, ufo.y));

        // 格納中の処理
        if (ufo.isCapturing && ufo.captureTarget) {
            ufo.captureProgress += dt * 1000;
            const captureTime = DataManager.getStatValue('ufo_capture_speed') || CONFIG.GAME.CAPTURE_TIME;

            if (ufo.captureProgress >= captureTime) {
                // 格納完了
                this.completeCaptureEnemy(ufo.captureTarget);
                ufo.isCapturing = false;
                ufo.captureProgress = 0;
                ufo.captureTarget = null;
            }
        }
    },

    /**
     * 敵を更新
     */
    updateEnemies(dt) {
        const castle = this.fieldObjects.castle;

        this.objects.enemies.forEach(enemy => {
            if (!enemy.isActive) return;

            // スポーン遅延
            if (enemy.spawnDelay > 0) {
                enemy.spawnDelay -= dt * 1000;
                return;
            }

            // 蛇行アニメーション
            enemy.wobble += enemy.wobbleSpeed * dt;

            // 城に向かって移動
            const dx = enemy.targetX - enemy.x;
            const dy = enemy.targetY - enemy.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance > castle.radius) {
                const moveSpeed = enemy.speed * dt;
                // 少し蛇行させる
                const wobbleAmount = Math.sin(enemy.wobble) * 0.3;
                const moveAngle = Math.atan2(dy, dx) + wobbleAmount;

                enemy.x += Math.cos(moveAngle) * moveSpeed;
                enemy.y += Math.sin(moveAngle) * moveSpeed;
                enemy.angle = moveAngle;
            } else {
                // 城に到達 - ダメージを与える
                this.state.castleHp -= 1;
                enemy.isActive = false;
                this.state.combo = 0; // コンボリセット
                this.updateUI();

                // ダメージエフェクト
                this.addEffect('damage', castle.x, castle.y);
                this.addParticles('hit', castle.x, castle.y, '#ff0000', 10);

                // SE
                if (typeof AudioManager !== 'undefined') {
                    AudioManager.playSE('DAMAGE');
                }
            }
        });

        // 非アクティブな敵を削除
        this.objects.enemies = this.objects.enemies.filter(e => e.isActive);
    },

    /**
     * エフェクトを更新
     */
    updateEffects(dt) {
        this.objects.effects.forEach(effect => {
            effect.time += dt;
            if (effect.time >= effect.duration) {
                effect.isActive = false;
            }
        });

        this.objects.effects = this.objects.effects.filter(e => e.isActive);
    },

    /**
     * パーティクルを更新
     */
    updateParticles(dt) {
        this.objects.particles.forEach(particle => {
            particle.x += particle.vx * dt;
            particle.y += particle.vy * dt;
            particle.vy += 200 * dt; // 重力
            particle.life -= dt;
            particle.alpha = Math.max(0, particle.life / particle.maxLife);
        });

        this.objects.particles = this.objects.particles.filter(p => p.life > 0);
    },

    /**
     * 格納アクション
     */
    capture() {
        const ufo = this.objects.ufo;
        if (!ufo || ufo.isCapturing) return;

        // 格納上限チェック
        const usedSlots = this.state.capturedEnemies.reduce((sum, e) => sum + e.slots, 0);
        if (usedSlots >= ufo.capacity) {
            console.log('UFO is full!');
            this.addEffect('text', ufo.x, ufo.y - 40, { text: '満タン！', color: '#ff6b6b' });
            return;
        }

        // 範囲内の敵を探す
        const captureRange = ufo.captureRange;
        let nearestEnemy = null;
        let nearestDistance = Infinity;

        this.objects.enemies.forEach(enemy => {
            if (!enemy.isActive || enemy.spawnDelay > 0) return;
            const dx = enemy.x - ufo.x;
            const dy = enemy.y - ufo.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance <= captureRange && distance < nearestDistance) {
                nearestDistance = distance;
                nearestEnemy = enemy;
            }
        });

        if (nearestEnemy) {
            // 格納開始（大きい敵はスロット確認）
            if (usedSlots + nearestEnemy.slots > ufo.capacity) {
                this.addEffect('text', ufo.x, ufo.y - 40, { text: '容量不足', color: '#ff6b6b' });
                return;
            }

            ufo.isCapturing = true;
            ufo.captureProgress = 0;
            ufo.captureTarget = nearestEnemy;
            nearestEnemy.isBeingCaptured = true;

            // エフェクト
            this.addEffect('capture', ufo.x, ufo.y);

            // SE
            if (typeof AudioManager !== 'undefined') {
                AudioManager.playSE('CAPTURE');
            }
        } else {
            this.addEffect('text', ufo.x, ufo.y - 40, { text: '範囲外', color: '#888888' });
        }
    },

    /**
     * 格納完了
     */
    completeCaptureEnemy(enemy) {
        if (!enemy) return;

        enemy.isActive = false;
        this.state.capturedEnemies.push({
            type: enemy.type,
            slots: enemy.slots,
            weakness: enemy.weakness,
        });

        // コンボ
        this.state.combo++;
        this.state.lastCaptureTime = performance.now();

        // スコア加算（コンボボーナス）
        const baseScore = 10;
        const comboBonus = Math.min(this.state.combo, 10);
        this.state.score += baseScore * comboBonus;

        // エフェクト
        this.addParticles('capture', enemy.x, enemy.y, '#00ffff', 8);
        if (this.state.combo >= 3) {
            this.addEffect('text', this.objects.ufo.x, this.objects.ufo.y - 60, {
                text: `${this.state.combo} COMBO!`,
                color: '#ffd700',
            });
        }

        // UI更新
        this.updateUI();

        console.log('Captured:', enemy.type, 'Combo:', this.state.combo);
    },

    /**
     * 射出アクション
     */
    eject() {
        const ufo = this.objects.ufo;
        if (!ufo || this.state.capturedEnemies.length === 0) {
            if (this.state.capturedEnemies.length === 0) {
                this.addEffect('text', ufo.x, ufo.y - 40, { text: '空っぽ', color: '#888888' });
            }
            return;
        }

        const volcano = this.fieldObjects.volcano;
        const lake = this.fieldObjects.lake;

        const distToVolcano = Math.sqrt(Math.pow(ufo.x - volcano.x, 2) + Math.pow(ufo.y - volcano.y, 2));
        const distToLake = Math.sqrt(Math.pow(ufo.x - lake.x, 2) + Math.pow(ufo.y - lake.y, 2));

        let ejectType = null;
        let ejectX, ejectY;

        if (distToVolcano <= volcano.radius) {
            ejectType = 'fire';
            ejectX = volcano.x;
            ejectY = volcano.y;
        } else if (distToLake <= lake.radius) {
            ejectType = 'water';
            ejectX = lake.x;
            ejectY = lake.y;
        }

        if (ejectType) {
            // 格納した敵を処理
            const enemy = this.state.capturedEnemies.shift();

            // 属性相性チェック
            if (enemy.weakness === 'all' || enemy.weakness === ejectType) {
                // 撃退成功
                const baseScore = 100;
                const bonusMult = DataManager.getStatValue('bonus_score') || 1;
                this.state.score += Math.floor(baseScore * bonusMult);

                // エフェクト
                if (ejectType === 'fire') {
                    this.addEffect('fire', ejectX, ejectY);
                    this.addParticles('fire', ejectX, ejectY - 20, '#ff6347', 15);
                } else {
                    this.addEffect('splash', ejectX, ejectY);
                    this.addParticles('water', ejectX, ejectY, '#4169e1', 15);
                }

                this.addEffect('text', ejectX, ejectY - 50, { text: '+100', color: '#48bb78' });

                // SE
                if (typeof AudioManager !== 'undefined') {
                    AudioManager.playSE('EJECT');
                }

                console.log('Defeated:', enemy.type);
            } else {
                // 撃退失敗 - ペナルティ
                this.state.score = Math.max(0, this.state.score - 30);
                this.addEffect('text', ejectX, ejectY - 50, { text: '属性違い！', color: '#ff6b6b' });
                console.log('Wrong element! Enemy escaped:', enemy.type);
            }

            this.updateUI();
        } else {
            this.addEffect('text', ufo.x, ufo.y - 40, { text: '射出場所へ！', color: '#ffa500' });
        }
    },

    /**
     * エフェクトを追加
     */
    addEffect(type, x, y, options = {}) {
        this.objects.effects.push({
            type: type,
            x: x,
            y: y,
            time: 0,
            duration: options.duration || 0.5,
            isActive: true,
            ...options,
        });
    },

    /**
     * パーティクルを追加
     */
    addParticles(type, x, y, color, count) {
        for (let i = 0; i < count; i++) {
            const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
            const speed = 50 + Math.random() * 100;

            this.objects.particles.push({
                x: x,
                y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 50,
                color: color,
                size: 3 + Math.random() * 4,
                life: 0.5 + Math.random() * 0.5,
                maxLife: 1,
                alpha: 1,
            });
        }
    },

    /**
     * ウェーブクリアをチェック
     */
    checkWaveClear() {
        if (this.state.isWaveStarting) return;

        // 全ての敵がいなくなったらクリア
        const activeEnemies = this.objects.enemies.filter(e => e.isActive);
        const pendingEnemies = this.objects.enemies.filter(e => e.spawnDelay > 0);

        if (activeEnemies.length === 0 && pendingEnemies.length === 0 && this.state.capturedEnemies.length === 0) {
            // 最大ウェーブを更新
            DataManager.updateMaxWave(this.state.currentWave);

            // 通貨を獲得
            const waveBonus = this.state.currentWave * 10;
            DataManager.addCurrency(waveBonus);

            // クリアエフェクト
            this.addEffect('wave_clear', this.fieldWidth / 2, this.fieldHeight / 3, {
                wave: this.state.currentWave,
                bonus: waveBonus,
                duration: 2,
            });

            if (this.state.currentWave >= CONFIG.GAME.TOTAL_WAVES) {
                // 全クリア
                setTimeout(() => this.victory(), 2000);
            } else {
                // 次のウェーブへ
                setTimeout(() => this.startWave(this.state.currentWave + 1), 2500);
            }

            // 一旦ウェーブ開始中フラグを立てて敵スポーンを止める
            this.state.isWaveStarting = true;
            this.state.waveTimer = -1000; // 少し待つ
        }
    },

    /**
     * 描画
     */
    render() {
        const ctx = this.ctx;

        // クリア
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // 背景
        this.renderBackground(ctx);

        // 湖（後ろに描画）
        this.renderLake(ctx);

        // 城
        this.renderCastle(ctx);

        // 火山
        this.renderVolcano(ctx);

        // 敵
        this.renderEnemies(ctx);

        // UFO
        this.renderUFO(ctx);

        // エフェクト
        this.renderEffects(ctx);

        // パーティクル
        this.renderParticles(ctx);
    },

    /**
     * 背景を描画
     */
    renderBackground(ctx) {
        if (this.images.bg_field && this.images.bg_field.complete) {
            // 画像をタイル状に描画
            const img = this.images.bg_field;
            const scale = Math.max(this.fieldWidth / img.width, this.fieldHeight / img.height);
            const w = img.width * scale;
            const h = img.height * scale;
            const x = (this.fieldWidth - w) / 2;
            const y = (this.fieldHeight - h) / 2;
            ctx.drawImage(img, x, y, w, h);
        } else {
            // フォールバック
            ctx.fillStyle = '#4a7c59';
            ctx.fillRect(0, 0, this.fieldWidth, this.fieldHeight);

            // 草のパターン
            ctx.fillStyle = '#3d6b4a';
            for (let i = 0; i < 50; i++) {
                const x = (i * 47) % this.fieldWidth;
                const y = (i * 31) % this.fieldHeight;
                ctx.fillRect(x, y, 8, 4);
            }
        }
    },

    /**
     * 城を描画
     */
    renderCastle(ctx) {
        const castle = this.fieldObjects.castle;

        if (this.images.castle && this.images.castle.complete) {
            const img = this.images.castle;
            const scale = castle.width / Math.max(img.width, img.height) * 1.2;
            const w = img.width * scale;
            const h = img.height * scale;
            ctx.drawImage(img, castle.x - w / 2, castle.y - h / 2, w, h);
        } else {
            // フォールバック
            ctx.fillStyle = '#d4a373';
            ctx.fillRect(castle.x - castle.width / 2, castle.y - castle.height / 2, castle.width, castle.height);
            ctx.fillStyle = '#bc6c25';
            ctx.fillRect(castle.x - castle.width / 4, castle.y - castle.height / 2 - 20, castle.width / 2, 25);
        }

        // HP表示
        const hpRatio = this.state.castleHp / this.state.maxCastleHp;
        const barWidth = 60;
        const barHeight = 8;
        const barX = castle.x - barWidth / 2;
        const barY = castle.y + castle.height / 2 + 10;

        ctx.fillStyle = '#333333';
        ctx.fillRect(barX - 1, barY - 1, barWidth + 2, barHeight + 2);
        ctx.fillStyle = '#4a5568';
        ctx.fillRect(barX, barY, barWidth, barHeight);
        ctx.fillStyle = hpRatio > 0.3 ? '#48bb78' : '#ff6b6b';
        ctx.fillRect(barX, barY, barWidth * hpRatio, barHeight);
    },

    /**
     * 火山を描画
     */
    renderVolcano(ctx) {
        const volcano = this.fieldObjects.volcano;

        if (this.images.volcano && this.images.volcano.complete) {
            const img = this.images.volcano;
            const scale = volcano.width / Math.max(img.width, img.height) * 1.3;
            const w = img.width * scale;
            const h = img.height * scale;
            ctx.drawImage(img, volcano.x - w / 2, volcano.y - h / 2, w, h);
        } else {
            // フォールバック
            ctx.fillStyle = '#6b4423';
            ctx.beginPath();
            ctx.moveTo(volcano.x, volcano.y - volcano.height / 2);
            ctx.lineTo(volcano.x + volcano.width / 2, volcano.y + volcano.height / 2);
            ctx.lineTo(volcano.x - volcano.width / 2, volcano.y + volcano.height / 2);
            ctx.closePath();
            ctx.fill();

            // 溶岩
            ctx.fillStyle = '#ff6b35';
            ctx.beginPath();
            ctx.arc(volcano.x, volcano.y - volcano.height / 3, 8, 0, Math.PI * 2);
            ctx.fill();
        }

        // ラベル
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 10px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('🌋', volcano.x, volcano.y + volcano.height / 2 + 15);
    },

    /**
     * 湖を描画
     */
    renderLake(ctx) {
        const lake = this.fieldObjects.lake;

        if (this.images.lake && this.images.lake.complete) {
            const img = this.images.lake;
            const scale = lake.width / Math.max(img.width, img.height) * 1.3;
            const w = img.width * scale;
            const h = img.height * scale;
            ctx.drawImage(img, lake.x - w / 2, lake.y - h / 2, w, h);
        } else {
            // フォールバック
            ctx.fillStyle = '#4a90d9';
            ctx.beginPath();
            ctx.ellipse(lake.x, lake.y, lake.width / 2, lake.height / 2, 0, 0, Math.PI * 2);
            ctx.fill();

            // 波紋
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.ellipse(lake.x, lake.y, lake.width / 3, lake.height / 3, 0, 0, Math.PI * 2);
            ctx.stroke();
        }

        // ラベル
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 10px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('💧', lake.x, lake.y + lake.height / 2 + 15);
    },

    /**
     * 敵を描画
     */
    renderEnemies(ctx) {
        this.objects.enemies.forEach(enemy => {
            if (!enemy.isActive || enemy.spawnDelay > 0) return;

            const x = enemy.x;
            const y = enemy.y;
            const w = enemy.width;
            const h = enemy.height;

            // 影
            ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
            ctx.beginPath();
            ctx.ellipse(x, y + h / 2 + 2, w / 2 * 0.8, h / 4, 0, 0, Math.PI * 2);
            ctx.fill();

            // 敵タイプごとの色
            const colors = {
                normal: '#808080',
                fire: '#ff6347',
                water: '#4169e1',
                fast: '#90ee90',
                big: '#8b4513',
                boss: '#9932cc',
            };
            const color = colors[enemy.type] || '#808080';

            // 進行方向に回転して描画（真上から見たネズミ）
            ctx.save();
            ctx.translate(x, y);
            ctx.rotate(enemy.angle + Math.PI / 2);

            // 体（楕円形 - 縦長）
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.ellipse(0, 0, w / 3, h / 2, 0, 0, Math.PI * 2);
            ctx.fill();

            // 体の輪郭
            ctx.strokeStyle = this.darkenColor(color);
            ctx.lineWidth = 1;
            ctx.stroke();

            // 耳（頭側 = 上側）
            const earSize = w / 5;
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(-w / 4, -h / 2 + earSize / 2, earSize, 0, Math.PI * 2);
            ctx.arc(w / 4, -h / 2 + earSize / 2, earSize, 0, Math.PI * 2);
            ctx.fill();

            // 耳の内側（ピンク）
            ctx.fillStyle = '#ffb6c1';
            ctx.beginPath();
            ctx.arc(-w / 4, -h / 2 + earSize / 2, earSize * 0.5, 0, Math.PI * 2);
            ctx.arc(w / 4, -h / 2 + earSize / 2, earSize * 0.5, 0, Math.PI * 2);
            ctx.fill();

            // 目
            ctx.fillStyle = '#000000';
            ctx.beginPath();
            ctx.arc(-w / 6, -h / 4, 2, 0, Math.PI * 2);
            ctx.arc(w / 6, -h / 4, 2, 0, Math.PI * 2);
            ctx.fill();

            // 鼻
            ctx.fillStyle = '#ffb6c1';
            ctx.beginPath();
            ctx.arc(0, -h / 3, 2, 0, Math.PI * 2);
            ctx.fill();

            // 尻尾（後ろ側 = 下側）
            ctx.strokeStyle = '#ffb6c1';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(0, h / 3);
            ctx.quadraticCurveTo(w / 4, h * 0.6, w / 5, h * 0.8);
            ctx.stroke();

            ctx.restore();

            // ボスには王冠（回転なし、常に上向き）
            if (enemy.type === 'boss') {
                ctx.fillStyle = '#ffd700';
                ctx.beginPath();
                ctx.moveTo(x - 8, y - h / 2 - 3);
                ctx.lineTo(x - 5, y - h / 2 - 12);
                ctx.lineTo(x - 2, y - h / 2 - 6);
                ctx.lineTo(x, y - h / 2 - 15);
                ctx.lineTo(x + 2, y - h / 2 - 6);
                ctx.lineTo(x + 5, y - h / 2 - 12);
                ctx.lineTo(x + 8, y - h / 2 - 3);
                ctx.closePath();
                ctx.fill();
                ctx.strokeStyle = '#b8860b';
                ctx.lineWidth = 1;
                ctx.stroke();
            }

            // HPバー（ボスのみ）
            if (enemy.type === 'boss' && enemy.hp < enemy.maxHp) {
                const barWidth = w;
                const barHeight = 4;
                const barX = x - barWidth / 2;
                const barY = y - h / 2 - 20;

                ctx.fillStyle = '#333333';
                ctx.fillRect(barX, barY, barWidth, barHeight);
                ctx.fillStyle = '#ff6b6b';
                ctx.fillRect(barX, barY, barWidth * (enemy.hp / enemy.maxHp), barHeight);
            }

            // 格納中エフェクト
            if (enemy.isBeingCaptured) {
                ctx.strokeStyle = '#00ffff';
                ctx.lineWidth = 2;
                ctx.setLineDash([5, 5]);
                ctx.beginPath();
                ctx.arc(x, y, w / 2 + 5, 0, Math.PI * 2);
                ctx.stroke();
                ctx.setLineDash([]);
            }
        });
    },

    /**
     * 色を暗くする
     */
    darkenColor(color) {
        // 簡易的に暗い色を返す
        const darkColors = {
            '#808080': '#606060',
            '#ff6347': '#cc4f39',
            '#4169e1': '#3454b4',
            '#90ee90': '#72be72',
            '#8b4513': '#6e370f',
            '#9932cc': '#7a28a3',
        };
        return darkColors[color] || '#333333';
    },

    /**
     * UFOを描画
     */
    renderUFO(ctx) {
        const ufo = this.objects.ufo;
        if (!ufo) return;

        const bobY = Math.sin(ufo.bobOffset) * 3;
        const drawY = ufo.y + bobY;

        // 影
        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.beginPath();
        ctx.ellipse(ufo.x, ufo.y + ufo.height / 2 + 10, ufo.width / 2, ufo.height / 6, 0, 0, Math.PI * 2);
        ctx.fill();

        // 格納ビーム
        if (ufo.isCapturing) {
            const progress = ufo.captureProgress / (DataManager.getStatValue('ufo_capture_speed') || CONFIG.GAME.CAPTURE_TIME);
            ctx.fillStyle = `rgba(0, 255, 255, ${0.3 + progress * 0.3})`;
            ctx.beginPath();
            ctx.moveTo(ufo.x - 15, drawY + ufo.height / 4);
            ctx.lineTo(ufo.x - 30, drawY + 60);
            ctx.lineTo(ufo.x + 30, drawY + 60);
            ctx.lineTo(ufo.x + 15, drawY + ufo.height / 4);
            ctx.closePath();
            ctx.fill();
        }

        if (this.images.ufo && this.images.ufo.complete) {
            const img = this.images.ufo;
            const scale = ufo.width / Math.max(img.width, img.height) * 1.5;
            const w = img.width * scale;
            const h = img.height * scale;
            ctx.drawImage(img, ufo.x - w / 2, drawY - h / 2, w, h);
        } else {
            // フォールバック - UFO本体
            ctx.fillStyle = '#c0c0c0';
            ctx.beginPath();
            ctx.ellipse(ufo.x, drawY, ufo.width / 2, ufo.height / 4, 0, 0, Math.PI * 2);
            ctx.fill();

            // ドーム
            ctx.fillStyle = '#87ceeb';
            ctx.beginPath();
            ctx.arc(ufo.x, drawY - ufo.height / 6, ufo.width / 4, Math.PI, 0);
            ctx.fill();

            // 猫（仮）
            ctx.fillStyle = '#ffa500';
            ctx.beginPath();
            ctx.arc(ufo.x, drawY - ufo.height / 4, 8, 0, Math.PI * 2);
            ctx.fill();

            // 猫の耳
            ctx.beginPath();
            ctx.moveTo(ufo.x - 8, drawY - ufo.height / 4 - 5);
            ctx.lineTo(ufo.x - 5, drawY - ufo.height / 4 - 12);
            ctx.lineTo(ufo.x - 2, drawY - ufo.height / 4 - 5);
            ctx.fill();
            ctx.beginPath();
            ctx.moveTo(ufo.x + 8, drawY - ufo.height / 4 - 5);
            ctx.lineTo(ufo.x + 5, drawY - ufo.height / 4 - 12);
            ctx.lineTo(ufo.x + 2, drawY - ufo.height / 4 - 5);
            ctx.fill();
        }

        // 格納数表示
        const usedSlots = this.state.capturedEnemies.reduce((sum, e) => sum + e.slots, 0);
        ctx.fillStyle = usedSlots >= ufo.capacity ? '#ff6b6b' : '#ffffff';
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`${usedSlots}/${ufo.capacity}`, ufo.x, drawY + ufo.height / 2 + 20);

        // 格納範囲（デバッグ用 - コメントアウト可）
        // ctx.strokeStyle = 'rgba(0, 255, 255, 0.3)';
        // ctx.lineWidth = 1;
        // ctx.beginPath();
        // ctx.arc(ufo.x, drawY, ufo.captureRange, 0, Math.PI * 2);
        // ctx.stroke();
    },

    /**
     * エフェクトを描画
     */
    renderEffects(ctx) {
        this.objects.effects.forEach(effect => {
            const progress = effect.time / effect.duration;
            const alpha = 1 - progress;

            ctx.save();
            ctx.globalAlpha = alpha;

            switch (effect.type) {
                case 'capture':
                    ctx.translate(effect.x, effect.y);
                    ctx.strokeStyle = '#00ffff';
                    ctx.lineWidth = 3;
                    for (let i = 0; i < 3; i++) {
                        ctx.beginPath();
                        ctx.arc(0, 0, 20 + i * 15 + progress * 30, 0, Math.PI * 2);
                        ctx.globalAlpha = alpha * (1 - i * 0.3);
                        ctx.stroke();
                    }
                    break;

                case 'fire':
                    ctx.translate(effect.x, effect.y - progress * 30);
                    ctx.scale(1 + progress * 0.5, 1 + progress * 0.5);
                    if (this.images.fx_fire && this.images.fx_fire.complete) {
                        const img = this.images.fx_fire;
                        ctx.drawImage(img, -32, -32, 64, 64);
                    } else {
                        ctx.fillStyle = '#ff6347';
                        for (let i = 0; i < 8; i++) {
                            const angle = (i / 8) * Math.PI * 2;
                            const x = Math.cos(angle) * 20;
                            const y = Math.sin(angle) * 20;
                            ctx.beginPath();
                            ctx.arc(x, y, 10, 0, Math.PI * 2);
                            ctx.fill();
                        }
                    }
                    break;

                case 'splash':
                    ctx.translate(effect.x, effect.y - progress * 20);
                    ctx.scale(1 + progress * 0.3, 1 + progress * 0.3);
                    if (this.images.fx_splash && this.images.fx_splash.complete) {
                        const img = this.images.fx_splash;
                        ctx.drawImage(img, -32, -32, 64, 64);
                    } else {
                        ctx.fillStyle = '#4169e1';
                        for (let i = 0; i < 10; i++) {
                            const angle = (i / 10) * Math.PI * 2;
                            const r = 25 + progress * 20;
                            const x = Math.cos(angle) * r;
                            const y = Math.sin(angle) * r * 0.5 - 15;
                            ctx.beginPath();
                            ctx.arc(x, y, 6, 0, Math.PI * 2);
                            ctx.fill();
                        }
                    }
                    break;

                case 'damage':
                    ctx.translate(effect.x, effect.y);
                    ctx.scale(1 + progress, 1 + progress);
                    ctx.fillStyle = '#ff0000';
                    ctx.font = 'bold 32px Arial';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText('💥', 0, 0);
                    break;

                case 'text':
                    ctx.translate(effect.x, effect.y - progress * 30);
                    ctx.fillStyle = effect.color || '#ffffff';
                    ctx.font = 'bold 16px Arial';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(effect.text, 0, 0);
                    break;

                case 'wave_start':
                    ctx.globalAlpha = progress < 0.5 ? progress * 2 : (1 - progress) * 2;
                    ctx.fillStyle = '#ffd700';
                    ctx.font = 'bold 28px Arial';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(`Wave ${effect.wave}`, effect.x, effect.y);
                    ctx.font = '16px Arial';
                    ctx.fillStyle = '#ffffff';
                    ctx.fillText('準備！', effect.x, effect.y + 35);
                    break;

                case 'wave_clear':
                    ctx.globalAlpha = progress < 0.3 ? progress / 0.3 : 1 - (progress - 0.3) / 0.7;
                    ctx.fillStyle = '#48bb78';
                    ctx.font = 'bold 24px Arial';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(`Wave ${effect.wave} クリア！`, effect.x, effect.y);
                    ctx.font = '14px Arial';
                    ctx.fillStyle = '#ffd700';
                    ctx.fillText(`+${effect.bonus} 💎`, effect.x, effect.y + 30);
                    break;
            }

            ctx.restore();
        });
    },

    /**
     * パーティクルを描画
     */
    renderParticles(ctx) {
        this.objects.particles.forEach(particle => {
            ctx.save();
            ctx.globalAlpha = particle.alpha;
            ctx.fillStyle = particle.color;
            ctx.beginPath();
            ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        });
    },

    /**
     * UIを更新
     */
    updateUI() {
        // HP表示
        const hpDisplay = document.getElementById('hp-display');
        if (hpDisplay) {
            hpDisplay.textContent = '♥'.repeat(Math.max(0, this.state.castleHp));
        }

        // ウェーブ表示
        const waveDisplay = document.getElementById('wave-display');
        if (waveDisplay) {
            waveDisplay.textContent = `Wave ${this.state.currentWave}`;
        }

        // 格納数表示
        const capacityDisplay = document.getElementById('capacity-display');
        if (capacityDisplay) {
            const usedSlots = this.state.capturedEnemies.reduce((sum, e) => sum + e.slots, 0);
            const maxSlots = this.objects.ufo ? this.objects.ufo.capacity : CONFIG.GAME.UFO_CAPACITY;
            capacityDisplay.textContent = `${usedSlots}/${maxSlots}`;
        }

        // スコア表示
        const scoreDisplay = document.getElementById('score-display');
        if (scoreDisplay) {
            scoreDisplay.textContent = this.state.score;
        }
    },

    /**
     * ゲームを一時停止
     */
    pause() {
        this.state.isPaused = true;
    },

    /**
     * ゲームを再開
     */
    resume() {
        this.state.isPaused = false;
        this.lastTime = performance.now();
    },

    /**
     * ゲームオーバー
     */
    gameOver() {
        this.state.isPlaying = false;
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }

        // スコアと通貨を保存
        DataManager.updateHighScore(this.state.score);
        const earnedCoins = Math.floor(this.state.score / 10);
        DataManager.addCurrency(earnedCoins);

        console.log('Game Over! Score:', this.state.score, 'Coins:', earnedCoins);

        // 結果画面を表示
        if (typeof showScreen === 'function') {
            setTimeout(() => {
                showScreen('result', {
                    isVictory: false,
                    wave: this.state.currentWave,
                    score: this.state.score,
                    coins: earnedCoins,
                });
            }, 1000);
        }
    },

    /**
     * 勝利
     */
    victory() {
        this.state.isPlaying = false;
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }

        // スコアと通貨を保存
        DataManager.updateHighScore(this.state.score);
        DataManager.updateMaxWave(CONFIG.GAME.TOTAL_WAVES);
        const earnedCoins = Math.floor(this.state.score / 5) + 500; // クリアボーナス
        DataManager.addCurrency(earnedCoins);

        console.log('Victory! Score:', this.state.score, 'Coins:', earnedCoins);

        // 結果画面を表示
        if (typeof showScreen === 'function') {
            setTimeout(() => {
                showScreen('result', {
                    isVictory: true,
                    wave: CONFIG.GAME.TOTAL_WAVES,
                    score: this.state.score,
                    coins: earnedCoins,
                });
            }, 1000);
        }
    },

    /**
     * ゲームを停止
     */
    stop() {
        this.state.isPlaying = false;
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
    },
};

// エクスポート
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Game;
}
