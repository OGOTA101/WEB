// Matter.js物理エンジンを使用したチャリ走ゲーム
class BikeGame {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');

        // Matter.js設定
        this.engine = Matter.Engine.create();
        this.world = this.engine.world;

        // 物理設定（重力を強く）
        this.engine.world.gravity.y = 1.2;

        // ゲーム設定
        this.baseSpeed = 2.0;    // 基本速度（常に右に進む）
        this.gameSpeed = 0.5;    // 追加速度
        this.maxSpeed = 4.0;     // 最高速度
        this.minSpeed = 1.5;     // 最低速度（逆方向防止）
        this.speedIncrement = 0.001;

        // プレイヤー
        this.player = null;
        this.playerBody = null;
        this.wheels = [];

        // ゲーム状態
        this.isGameRunning = false;
        this.isPaused = false;
        this.score = 0;
        this.distance = 0;
        this.currentSpeed = this.baseSpeed;
        this.maxSpeedReached = 1.0;

        // 地形とオブジェクト
        this.terrainBodies = [];
        this.obstacles = [];
        this.coins = [];
        this.particles = [];

        // カメラ
        this.camera = { x: 0, y: 0 };

        // 画像
        this.images = {};

        // 入力状態
        this.keys = {
            left: false,
            right: false,
            jump: false
        };

        // ゲーム状態
        this.isGameRunning = false;
        this.isPaused = false;

        this.setupEventListeners();
        this.loadImages();
        this.createPlayer();
        this.generateInitialTerrain();
        this.loadBikeSounds();

        // 初期レンダリング
        setTimeout(() => {
            this.renderGame();
        }, 100);
    }

    async loadImages() {
        const imageFiles = {
            bike: 'assets/images/bike.svg',
            obstacle: 'assets/images/obstacle.svg',
            coin: 'assets/images/coin.svg'
        };

        try {
            this.images = await this.loadGameImages(imageFiles);
        } catch (error) {
            console.log('画像読み込み失敗、フォールバック描画を使用');
        }
    }

    loadGameImages(imageFiles) {
        return new Promise((resolve) => {
            const images = {};
            const promises = [];

            for (const [key, src] of Object.entries(imageFiles)) {
                const promise = new Promise((imgResolve) => {
                    const img = new Image();
                    img.onload = () => {
                        images[key] = img;
                        imgResolve();
                    };
                    img.onerror = () => {
                        console.log(`画像読み込み失敗: ${src}`);
                        imgResolve();
                    };
                    img.src = src;
                });
                promises.push(promise);
            }

            Promise.all(promises).then(() => resolve(images));
        });
    }

    loadBikeSounds() {
        if (!window.audioSystem) return;

        // バイクゲーム固有の音を生成
        const audioContext = window.audioSystem.audioContext;
        if (!audioContext) return;

        // ジャンプ音
        const jumpBuffer = this.generateJumpSound(audioContext);
        window.audioSystem.addSound('jump', jumpBuffer);

        // コイン取得音
        const coinBuffer = this.generateCoinSound(audioContext);
        window.audioSystem.addSound('coin', coinBuffer);

        // 衝突音
        const crashBuffer = this.generateCrashSound(audioContext);
        window.audioSystem.addSound('crash', crashBuffer);

        // エンジン音（走行音）
        const engineBuffer = this.generateEngineSound(audioContext);
        window.audioSystem.addSound('engine', engineBuffer);
    }

    generateJumpSound(audioContext) {
        const sampleRate = audioContext.sampleRate;
        const duration = 0.3;
        const buffer = audioContext.createBuffer(1, sampleRate * duration, sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < data.length; i++) {
            const t = i / sampleRate;
            const freq = 400 + (t * 300); // 上昇音
            data[i] = Math.sin(2 * Math.PI * freq * t) * Math.exp(-t * 4) * 0.3;
        }

        return buffer;
    }

    generateCoinSound(audioContext) {
        const sampleRate = audioContext.sampleRate;
        const duration = 0.2;
        const buffer = audioContext.createBuffer(1, sampleRate * duration, sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < data.length; i++) {
            const t = i / sampleRate;
            const freq1 = 659.25; // E5
            const freq2 = 783.99; // G5
            const envelope = Math.exp(-t * 8);

            data[i] = (Math.sin(2 * Math.PI * freq1 * t) + Math.sin(2 * Math.PI * freq2 * t)) * envelope * 0.15;
        }

        return buffer;
    }

    generateCrashSound(audioContext) {
        const sampleRate = audioContext.sampleRate;
        const duration = 0.5;
        const buffer = audioContext.createBuffer(1, sampleRate * duration, sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < data.length; i++) {
            const t = i / sampleRate;
            const noise = (Math.random() - 0.5) * 2;
            const crash = Math.sin(2 * Math.PI * (150 - t * 100) * t);
            const envelope = Math.exp(-t * 2);

            data[i] = (noise * 0.4 + crash * 0.6) * envelope * 0.4;
        }

        return buffer;
    }

    generateEngineSound(audioContext) {
        const sampleRate = audioContext.sampleRate;
        const duration = 0.1;
        const buffer = audioContext.createBuffer(1, sampleRate * duration, sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < data.length; i++) {
            const t = i / sampleRate;
            const baseFreq = 80 + Math.sin(t * 40) * 20;
            const noise = (Math.random() - 0.5) * 0.3;

            data[i] = (Math.sin(2 * Math.PI * baseFreq * t) + noise) * 0.1;
        }

        return buffer;
    }

    setupEventListeners() {
        // キーボード操作
        document.addEventListener('keydown', (e) => {
            if (!this.isGameRunning) return;

            switch (e.code) {
                case 'ArrowLeft':
                    this.keys.left = true;
                    e.preventDefault();
                    break;
                case 'ArrowRight':
                    this.keys.right = true;
                    e.preventDefault();
                    break;
                case 'Space':
                    if (!this.keys.jump) {
                        this.jump();
                        this.keys.jump = true;
                    }
                    e.preventDefault();
                    break;
            }
        });

        document.addEventListener('keyup', (e) => {
            switch (e.code) {
                case 'ArrowLeft':
                    this.keys.left = false;
                    break;
                case 'ArrowRight':
                    this.keys.right = false;
                    break;
                case 'Space':
                    this.keys.jump = false;
                    break;
            }
        });

        // タッチ操作
        this.canvas.addEventListener('touchstart', (e) => {
            if (!this.isGameRunning) return;
            this.jump();
            e.preventDefault();
        });

        // モバイルボタン
        document.getElementById('leftButton').addEventListener('touchstart', () => {
            this.keys.left = true;
        });

        document.getElementById('leftButton').addEventListener('touchend', () => {
            this.keys.left = false;
        });

        document.getElementById('rightButton').addEventListener('touchstart', () => {
            this.keys.right = true;
        });

        document.getElementById('rightButton').addEventListener('touchend', () => {
            this.keys.right = false;
        });

        document.getElementById('jumpButton').addEventListener('touchstart', () => {
            this.jump();
        });
    }

    createPlayer() {
        // プレイヤーを球体に変更（坂道に沿って転がるように調整）
        this.playerBody = Matter.Bodies.circle(100, 320, 18, {
            density: 0.004,
            friction: 1.2,
            frictionAir: 0.005,
            restitution: 0.2,
            render: { fillStyle: '#e74c3c' }
        });

        // 世界に追加
        Matter.World.add(this.world, this.playerBody);

        this.player = {
            body: this.playerBody,
            jumpCount: 0,
            maxJumps: 2,
            onGround: false
        };

        this.wheels = []; // 車輪は不要
    }

    generateInitialTerrain() {
        // 地形の高さポイントを生成（直線的な地形用）
        this.terrainHeights = [];

        // 最初の500pxは平坦
        for (let x = 0; x <= 500; x += 100) {
            this.terrainHeights.push({ x: x, y: 350, type: 'flat' });
        }

        // その後はシンプルな変化のある地形
        for (let x = 600; x <= 2000; x += 200) {
            const rand = Math.random();
            let terrainType = 'flat';
            let terrainY = 350;

            if (rand < 0.15 && x > 800) {
                // 落とし穴（15%）
                terrainType = 'pit';
                this.terrainHeights.push({ x: x - 100, y: 350, type: 'flat' }); // 穴の手前
                this.terrainHeights.push({ x: x, y: 350, type: 'flat' }); // 穴の入り口
                this.terrainHeights.push({ x: x + 50, y: 450, type: 'pit' }); // 穴の底
                this.terrainHeights.push({ x: x + 150, y: 450, type: 'pit' }); // 穴の底続き
                this.terrainHeights.push({ x: x + 200, y: 350, type: 'flat' }); // 穴の出口
                x += 200; // スキップ
            } else if (rand < 0.4) {
                // 上り坂（25%）
                terrainType = 'uphill';
                terrainY = 280;
                this.terrainHeights.push({ x: x, y: 350, type: 'flat' });
                this.terrainHeights.push({ x: x + 100, y: terrainY, type: terrainType });
            } else if (rand < 0.65) {
                // 下り坂（25%）
                terrainType = 'downhill';
                terrainY = 420;
                this.terrainHeights.push({ x: x, y: 350, type: 'flat' });
                this.terrainHeights.push({ x: x + 100, y: terrainY, type: terrainType });
            } else {
                // 平坦（35%）
                terrainType = 'flat';
                terrainY = 350;
                this.terrainHeights.push({ x: x, y: terrainY, type: terrainType });
            }
        }

        // 直線的な地形セグメントを生成
        this.generateStraightTerrain();
    }

    generateStraightTerrain() {
        // 地形を坂道として物理的に正確に生成
        for (let i = 0; i < this.terrainHeights.length - 1; i++) {
            const current = this.terrainHeights[i];
            const next = this.terrainHeights[i + 1];

            const segmentWidth = next.x - current.x;
            const startY = current.y;
            const endY = next.y;

            // 坂道の角度を計算
            const angle = Math.atan2(endY - startY, segmentWidth);
            const centerX = current.x + segmentWidth / 2;
            const centerY = (startY + endY) / 2;

            // 地形の厚みを計算（下まで全部地面）
            const groundBottom = this.canvas.height;
            const terrainThickness = groundBottom - Math.min(startY, endY);
            const terrainCenterY = Math.min(startY, endY) + terrainThickness / 2;

            // 坂道の表面を物理ボディとして作成
            const slopeLength = Math.sqrt(segmentWidth * segmentWidth + (endY - startY) * (endY - startY));
            const slopeBody = Matter.Bodies.rectangle(
                centerX,
                centerY,
                slopeLength,
                20, // 坂道の厚み
                {
                    isStatic: true,
                    friction: 1.0,
                    angle: angle,
                    render: { fillStyle: '#666666' }
                }
            );

            // 地面の底部分（下まで埋める）
            const groundBody = Matter.Bodies.rectangle(
                centerX,
                terrainCenterY,
                segmentWidth,
                terrainThickness,
                {
                    isStatic: true,
                    friction: 0.8,
                    render: { fillStyle: '#666666' }
                }
            );

            Matter.World.add(this.world, [slopeBody, groundBody]);
            this.terrainBodies.push({
                body: slopeBody,
                groundBody: groundBody,
                x: current.x,
                width: segmentWidth,
                startY: startY,
                endY: endY,
                type: current.type || 'flat',
                angle: angle
            });

            // 障害物とコインを地形に沿って配置
            this.placeObjectsOnTerrain(current, next);
        }
    }

    placeObjectsOnTerrain(currentPoint, nextPoint) {
        const segmentWidth = nextPoint.x - currentPoint.x;
        const avgHeight = (currentPoint.y + nextPoint.y) / 2;
        const terrainType = currentPoint.type || 'flat';

        // 障害物の配置（平坦地のみ、15%確率、800px以降）
        if (terrainType === 'flat' && Math.random() < 0.15 && currentPoint.x > 800) {
            const obstacleX = currentPoint.x + segmentWidth * 0.5;
            const obstacleY = currentPoint.y - 15; // 地面の高さに正確に配置

            const obstacle = Matter.Bodies.rectangle(obstacleX, obstacleY, 20, 20, {
                isStatic: true,
                render: { fillStyle: '#333333' }
            });

            Matter.World.add(this.world, obstacle);
            this.obstacles.push({
                body: obstacle,
                x: obstacleX,
                y: obstacleY,
                width: 20,
                height: 20
            });
        }

        // コインの配置（40%確率）
        if (Math.random() < 0.4) {
            const coinX = currentPoint.x + segmentWidth * (0.3 + Math.random() * 0.4);
            const coinY = avgHeight - 30 - Math.random() * 50;

            const coin = Matter.Bodies.circle(coinX, coinY, 12, {
                isStatic: true,
                isSensor: true,
                render: { fillStyle: '#cccccc' }
            });

            Matter.World.add(this.world, coin);
            this.coins.push({
                body: coin,
                x: coinX,
                y: coinY,
                collected: false,
                bounce: 0
            });
        }
    }

    generateNewTerrainSegments() {
        // 最後に生成された地形から新しいセグメントを追加
        const startIndex = this.terrainBodies.length;
        const endIndex = this.terrainHeights.length - 1;

        for (let i = startIndex; i < endIndex; i++) {
            const current = this.terrainHeights[i];
            const next = this.terrainHeights[i + 1];

            if (!current || !next) continue;

            const segmentWidth = next.x - current.x;
            const startY = current.y;
            const endY = next.y;

            // 坂道の角度を計算
            const angle = Math.atan2(endY - startY, segmentWidth);
            const centerX = current.x + segmentWidth / 2;
            const centerY = (startY + endY) / 2;

            // 地形の厚みを計算（下まで全部地面）
            const groundBottom = this.canvas.height;
            const terrainThickness = groundBottom - Math.min(startY, endY);
            const terrainCenterY = Math.min(startY, endY) + terrainThickness / 2;

            // 坂道の表面を物理ボディとして作成
            const slopeLength = Math.sqrt(segmentWidth * segmentWidth + (endY - startY) * (endY - startY));
            const slopeBody = Matter.Bodies.rectangle(
                centerX,
                centerY,
                slopeLength,
                20, // 坂道の厚み
                {
                    isStatic: true,
                    friction: 1.0,
                    angle: angle,
                    render: { fillStyle: '#666666' }
                }
            );

            // 地面の底部分（下まで埋める）
            const groundBody = Matter.Bodies.rectangle(
                centerX,
                terrainCenterY,
                segmentWidth,
                terrainThickness,
                {
                    isStatic: true,
                    friction: 0.8,
                    render: { fillStyle: '#666666' }
                }
            );

            Matter.World.add(this.world, [slopeBody, groundBody]);
            this.terrainBodies.push({
                body: slopeBody,
                groundBody: groundBody,
                x: current.x,
                width: segmentWidth,
                startY: startY,
                endY: endY,
                type: current.type || 'flat',
                angle: angle
            });

            this.placeObjectsOnTerrain(current, next);
        }
    }

    jump() {
        if (this.player.jumpCount < this.player.maxJumps) {
            // プレイヤーに上向きの力を加える
            Matter.Body.applyForce(this.playerBody, this.playerBody.position, { x: 0, y: -0.015 });

            this.player.jumpCount++;

            // ジャンプ音再生
            if (window.audioSystem) window.audioSystem.play('jump');

            // ジャンプエフェクト
            this.createParticles(this.playerBody.position.x, this.playerBody.position.y + 20, 6, '#cccccc');
        }
    }

    createParticles(x, y, count, color) {
        for (let i = 0; i < count; i++) {
            this.particles.push({
                x: x,
                y: y,
                velocityX: (Math.random() - 0.5) * 6,
                velocityY: Math.random() * -5,
                life: 40,
                maxLife: 40,
                color: color,
                size: Math.random() * 3 + 1
            });
        }
    }

    update() {
        if (!this.isGameRunning || this.isPaused) return;

        // 物理エンジン更新
        Matter.Engine.update(this.engine);

        // プレイヤーの左右移動（速度制限：最低速度保証）
        if (this.keys.left) {
            Matter.Body.applyForce(this.playerBody, this.playerBody.position, { x: -0.004, y: 0 });
            this.currentSpeed = Math.max(this.minSpeed, this.currentSpeed - 0.05);
        }
        if (this.keys.right) {
            Matter.Body.applyForce(this.playerBody, this.playerBody.position, { x: 0.006, y: 0 });
            this.currentSpeed = Math.min(this.maxSpeed, this.currentSpeed + 0.05);
        }

        // 常に右に進む力（最低速度保証）
        const forceX = Math.max(this.minSpeed, this.currentSpeed) * 0.005;
        Matter.Body.applyForce(this.playerBody, this.playerBody.position, { x: forceX, y: 0 });

        // 自転車の回転制限（45度以内に制限）
        const maxAngle = Math.PI / 4; // 45度
        if (this.playerBody.angle > maxAngle) {
            Matter.Body.setAngle(this.playerBody, maxAngle);
            Matter.Body.setAngularVelocity(this.playerBody, 0);
        } else if (this.playerBody.angle < -maxAngle) {
            Matter.Body.setAngle(this.playerBody, -maxAngle);
            Matter.Body.setAngularVelocity(this.playerBody, 0);
        }

        // 角速度も制限
        if (Math.abs(this.playerBody.angularVelocity) > 0.3) {
            Matter.Body.setAngularVelocity(this.playerBody,
                this.playerBody.angularVelocity > 0 ? 0.3 : -0.3);
        }

        // 着地判定（物理エンジンの衝突検出を使用）
        this.player.onGround = false;

        // Matter.jsの衝突検出を使用して着地判定
        const collisions = Matter.Query.collides(this.playerBody, this.terrainBodies.map(t => t.body));
        if (collisions.length > 0) {
            this.player.onGround = true;
            this.player.jumpCount = 0;
        }

        // カメラ追従
        this.camera.x = this.playerBody.position.x - this.canvas.width / 3;
        this.camera.y = Math.max(0, this.playerBody.position.y - this.canvas.height * 0.7);

        // 距離とスコア更新
        this.distance += this.currentSpeed * 0.1;
        this.score += Math.floor(this.currentSpeed * 0.1);

        // スピード徐々に増加（開始を遅らせる）
        if (this.distance > 200) {
            this.currentSpeed = Math.min(this.maxSpeed, this.baseSpeed + (this.distance * this.speedIncrement));
            this.maxSpeedReached = Math.max(this.maxSpeedReached, this.currentSpeed / this.baseSpeed);
        }

        // 新しい地形を生成
        const playerX = this.playerBody.position.x;
        const lastHeight = this.terrainHeights[this.terrainHeights.length - 1];
        if (lastHeight && playerX > lastHeight.x - 500) {
            // 新しい高さポイントを追加（シンプルな地形）
            for (let x = lastHeight.x + 200; x <= lastHeight.x + 800; x += 200) {
                const rand = Math.random();
                let terrainType = 'flat';
                let terrainY = 350;

                if (rand < 0.15 && x > 800) {
                    // 落とし穴（15%）
                    terrainType = 'pit';
                    this.terrainHeights.push({ x: x - 100, y: 350, type: 'flat' });
                    this.terrainHeights.push({ x: x, y: 350, type: 'flat' });
                    this.terrainHeights.push({ x: x + 50, y: 450, type: 'pit' });
                    this.terrainHeights.push({ x: x + 150, y: 450, type: 'pit' });
                    this.terrainHeights.push({ x: x + 200, y: 350, type: 'flat' });
                    x += 200;
                } else if (rand < 0.4) {
                    // 上り坂（25%）
                    terrainType = 'uphill';
                    terrainY = 280;
                    this.terrainHeights.push({ x: x, y: 350, type: 'flat' });
                    this.terrainHeights.push({ x: x + 100, y: terrainY, type: terrainType });
                } else if (rand < 0.65) {
                    // 下り坂（25%）
                    terrainType = 'downhill';
                    terrainY = 420;
                    this.terrainHeights.push({ x: x, y: 350, type: 'flat' });
                    this.terrainHeights.push({ x: x + 100, y: terrainY, type: terrainType });
                } else {
                    // 平坦（35%）
                    terrainType = 'flat';
                    terrainY = 350;
                    this.terrainHeights.push({ x: x, y: terrainY, type: terrainType });
                }
            }

            // 新しいセグメントを生成
            this.generateNewTerrainSegments();
        }

        // 古い要素を削除
        this.cleanupOffscreenObjects();

        // コリジョン検出
        this.checkCollisions();

        // パーティクル更新
        this.updateParticles();

        // ゲームオーバー判定
        if (this.playerBody.position.y > this.canvas.height + 100) {
            // 衝突音再生
            if (window.audioSystem) window.audioSystem.play('crash');
            this.gameOver();
        }

        // UI更新
        this.updateUI();
    }

    checkCollisions() {
        const playerX = this.playerBody.position.x;
        const playerY = this.playerBody.position.y;

        // 障害物との衝突（小さな当たり判定）
        this.obstacles.forEach(obstacle => {
            const distance = Math.sqrt(
                Math.pow(playerX - obstacle.x, 2) +
                Math.pow(playerY - obstacle.y, 2)
            );

            // プレイヤーと障害物の当たり判定を小さく（15px）
            if (distance < 15) {
                // 衝突音再生
                if (window.audioSystem) window.audioSystem.play('crash');
                this.gameOver();
            }
        });

        // コインとの衝突（大きな当たり判定で取りやすく）
        this.coins.forEach(coin => {
            if (!coin.collected) {
                const distance = Math.sqrt(
                    Math.pow(playerX - coin.x, 2) +
                    Math.pow(playerY - coin.y, 2)
                );

                // コインの当たり判定を大きく（30px）
                if (distance < 30) {
                    coin.collected = true;
                    this.score += 10;

                    // コイン取得音再生
                    if (window.audioSystem) window.audioSystem.play('coin');

                    this.createParticles(coin.x, coin.y, 12, '#cccccc');

                    // コインを物理世界から削除
                    Matter.World.remove(this.world, coin.body);
                }
            }
        });

        // 落とし穴判定（Y座標が430以上で落下）
        if (playerY > 430) {
            // 衝突音再生
            if (window.audioSystem) window.audioSystem.play('crash');
            this.gameOver();
        }
    }

    updateParticles() {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            let particle = this.particles[i];
            particle.x += particle.velocityX;
            particle.y += particle.velocityY;
            particle.velocityY += 0.2; // 重力
            particle.life--;

            if (particle.life <= 0) {
                this.particles.splice(i, 1);
            }
        }
    }

    cleanupOffscreenObjects() {
        const cleanupX = this.playerBody.position.x - 400;

        // 地形の削除（坂道と地面の両方を削除）
        this.terrainBodies = this.terrainBodies.filter(terrain => {
            if (terrain.x < cleanupX) {
                Matter.World.remove(this.world, terrain.body);
                if (terrain.groundBody) {
                    Matter.World.remove(this.world, terrain.groundBody);
                }
                return false;
            }
            return true;
        });

        // 障害物の削除
        this.obstacles = this.obstacles.filter(obstacle => {
            if (obstacle.x < cleanupX) {
                Matter.World.remove(this.world, obstacle.body);
                return false;
            }
            return true;
        });

        // コインの削除
        this.coins = this.coins.filter(coin => {
            if (coin.x < cleanupX) {
                if (!coin.collected) {
                    Matter.World.remove(this.world, coin.body);
                }
                return false;
            }
            return true;
        });
    }

    updateUI() {
        document.getElementById('score').textContent = Math.floor(this.score);
        document.getElementById('distance').textContent = Math.floor(this.distance);
        document.getElementById('speed').textContent = (this.currentSpeed / this.baseSpeed).toFixed(1);
    }

    renderGame() {
        // 背景をクリア（背景なし）
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // カメラ変換
        this.ctx.save();
        this.ctx.translate(-this.camera.x, -this.camera.y);

        // 地形を描画
        this.renderTerrain();

        // オブジェクトを描画
        this.renderCoins();
        this.renderObstacles();
        this.renderPlayer();

        // ゲーム実行中のみパーティクルを描画
        if (this.isGameRunning) {
            this.renderParticles();
        }

        this.ctx.restore();

        // ゲーム実行中のみUIを描画
        if (this.isGameRunning) {
            this.renderUI();
        }
    }

    renderTerrain() {
        this.ctx.fillStyle = '#666666';  // 暗いグレー（地面）
        this.ctx.strokeStyle = '#333333'; // より暗いグレー（輪郭）
        this.ctx.lineWidth = 2;

        // 地形の描画（下まで全部地面として描画）
        if (this.terrainHeights && this.terrainHeights.length > 1) {
            // 地面全体を描画（浮島ではなく、下まで全部地面）
            this.ctx.beginPath();

            // 画面左端から開始
            const startX = Math.max(0, this.camera.x - 100);
            this.ctx.moveTo(startX, this.canvas.height);
            this.ctx.lineTo(startX, this.terrainHeights[0].y);

            // 地形の高さポイントを直線で繋げる
            this.terrainHeights.forEach((point, index) => {
                if (point.x > this.camera.x - 100 && point.x < this.camera.x + this.canvas.width + 100) {
                    this.ctx.lineTo(point.x, point.y);
                }
            });

            // 画面右端まで描画
            const endX = Math.min(this.canvas.width + this.camera.x + 100,
                this.terrainHeights[this.terrainHeights.length - 1].x);
            const lastPoint = this.terrainHeights[this.terrainHeights.length - 1];
            this.ctx.lineTo(endX, lastPoint.y);
            this.ctx.lineTo(endX, this.canvas.height);
            this.ctx.lineTo(startX, this.canvas.height);

            this.ctx.closePath();
            this.ctx.fill();
            this.ctx.stroke();

            // 地形表面の強調線
            this.ctx.strokeStyle = '#888888';
            this.ctx.lineWidth = 3;
            this.ctx.beginPath();
            this.terrainHeights.forEach((point, index) => {
                if (point.x > this.camera.x - 100 && point.x < this.camera.x + this.canvas.width + 100) {
                    if (index === 0) {
                        this.ctx.moveTo(point.x, point.y);
                    } else {
                        this.ctx.lineTo(point.x, point.y);
                    }
                }
            });
            this.ctx.stroke();
        }

        this.ctx.fillStyle = '#666666'; // リセット
        this.ctx.strokeStyle = '#333333'; // リセット
        this.ctx.lineWidth = 2; // リセット
    }

    renderPlayer() {
        if (!this.playerBody) return;

        const playerX = this.playerBody.position.x;
        const playerY = this.playerBody.position.y;
        const angle = this.playerBody.angle;

        if (this.images.bike) {
            this.ctx.save();
            this.ctx.translate(playerX, playerY);
            this.ctx.rotate(angle);
            this.ctx.drawImage(this.images.bike, -18, -18, 36, 36);
            this.ctx.restore();
        } else {
            // 球体として描画
            this.ctx.save();
            this.ctx.translate(playerX, playerY);
            this.ctx.rotate(angle);

            // 球体のメインボディ
            this.ctx.fillStyle = '#e74c3c';
            this.ctx.strokeStyle = '#c0392b';
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();
            this.ctx.arc(0, 0, 18, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.stroke();

            // 球体の中心マーク
            this.ctx.fillStyle = '#ffffff';
            this.ctx.beginPath();
            this.ctx.arc(0, 0, 4, 0, Math.PI * 2);
            this.ctx.fill();

            this.ctx.restore();
        }
    }

    renderObstacles() {
        this.obstacles.forEach(obstacle => {
            if (obstacle.x + obstacle.width > this.camera.x && obstacle.x < this.camera.x + this.canvas.width) {
                if (this.images.obstacle) {
                    this.ctx.drawImage(this.images.obstacle, obstacle.x - 10, obstacle.y - 10, 20, 20);
                } else {
                    this.ctx.fillStyle = '#333333';
                    this.ctx.fillRect(obstacle.x - 10, obstacle.y - 10, 20, 20);
                }
            }
        });
    }

    renderCoins() {
        this.coins.forEach(coin => {
            if (!coin.collected && coin.x + 20 > this.camera.x && coin.x < this.camera.x + this.canvas.width) {
                coin.bounce += 0.2;
                const bounceY = coin.y + Math.sin(coin.bounce) * 3;

                if (this.images.coin) {
                    this.ctx.save();
                    this.ctx.translate(coin.x, bounceY);
                    this.ctx.rotate(coin.bounce * 0.1);
                    this.ctx.drawImage(this.images.coin, -12, -12, 24, 24);
                    this.ctx.restore();
                } else {
                    this.ctx.fillStyle = '#cccccc';
                    this.ctx.strokeStyle = '#999999';
                    this.ctx.lineWidth = 2;
                    this.ctx.beginPath();
                    this.ctx.arc(coin.x, bounceY, 12, 0, Math.PI * 2);
                    this.ctx.fill();
                    this.ctx.stroke();
                }
            }
        });
    }

    renderParticles() {
        this.particles.forEach(particle => {
            const alpha = particle.life / particle.maxLife;
            this.ctx.fillStyle = particle.color + Math.floor(alpha * 255).toString(16).padStart(2, '0');
            this.ctx.fillRect(particle.x - particle.size / 2, particle.y - particle.size / 2, particle.size, particle.size);
        });
    }

    renderUI() {
        // スピードメーター
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        this.ctx.fillRect(this.canvas.width - 120, 10, 110, 60);

        const speedRatio = (this.currentSpeed - this.baseSpeed) / (this.maxSpeed - this.baseSpeed);
        const barWidth = 80 * Math.max(0, Math.min(1, speedRatio));

        this.ctx.fillStyle = speedRatio > 0.8 ? '#ff4444' : speedRatio > 0.5 ? '#ffaa00' : '#44ff44';
        this.ctx.fillRect(this.canvas.width - 110, 30, barWidth, 10);

        this.ctx.strokeStyle = '#fff';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(this.canvas.width - 110, 30, 80, 10);

        this.ctx.fillStyle = '#fff';
        this.ctx.font = '12px Arial';
        this.ctx.fillText('SPEED', this.canvas.width - 110, 25);
        this.ctx.fillText(`${(this.currentSpeed / this.baseSpeed).toFixed(1)}x`, this.canvas.width - 110, 55);
    }

    startGame() {
        this.resetGame();
        this.isGameRunning = true;
        this.hideStartScreen();
        document.getElementById('pausePlayBtn').style.display = 'block';

        // 初期カメラ位置を設定
        this.camera.x = 0;
        this.camera.y = 0;

        // 最初のフレームをレンダリング
        this.renderGame();

        // ゲームループ開始
        this.gameLoop();
    }

    resetGame() {
        // 物理世界をクリア
        Matter.World.clear(this.world);

        // プレイヤーリセット
        this.createPlayer();

        // ゲーム状態リセット
        this.currentSpeed = this.baseSpeed;
        this.distance = 0;
        this.score = 0;
        this.maxSpeedReached = 1.0;
        this.camera = { x: 0, y: 0 };

        // オブジェクトクリア
        this.terrainBodies = [];
        this.terrainHeights = [];
        this.obstacles = [];
        this.coins = [];
        this.particles = [];

        // 地形再生成
        this.generateInitialTerrain();
    }

    gameLoop() {
        if (this.isGameRunning) {
            this.update();
            this.renderGame();
            requestAnimationFrame(() => this.gameLoop());
        }
    }

    gameOver() {
        this.isGameRunning = false;

        // 最終スコア表示
        document.getElementById('finalScore').textContent = Math.floor(this.score);
        document.getElementById('finalDistance').textContent = Math.floor(this.distance);
        document.getElementById('maxSpeed').textContent = this.maxSpeedReached.toFixed(1);

        // セッション最高記録更新
        const currentHigh = parseInt(document.getElementById('sessionHigh').textContent) || 0;
        if (this.score > currentHigh) {
            document.getElementById('sessionHigh').textContent = Math.floor(this.score);
            document.getElementById('sessionDistance').textContent = Math.floor(this.distance);
            document.getElementById('sessionSpeed').textContent = this.maxSpeedReached.toFixed(1);
        }

        // 最高スコア更新
        const highScore = parseInt(document.getElementById('highScore').textContent) || 0;
        if (this.score > highScore) {
            document.getElementById('highScore').textContent = Math.floor(this.score);
        }

        this.showGameOverDialog();
        this.showStartScreen();
        document.getElementById('pausePlayBtn').style.display = 'none';
    }

    // UI制御メソッド
    showStartScreen() {
        const startScreen = document.getElementById('startScreen');
        if (startScreen) startScreen.style.display = 'flex';
    }

    hideStartScreen() {
        const startScreen = document.getElementById('startScreen');
        if (startScreen) startScreen.style.display = 'none';
    }

    showGameOverDialog() {
        const dialog = document.getElementById('gameOver');
        if (dialog) dialog.style.display = 'block';
    }

    hideGameOverDialog() {
        const dialog = document.getElementById('gameOver');
        if (dialog) dialog.style.display = 'none';
    }

    showHowToPlayDialog() {
        const dialog = document.getElementById('howToPlayDialog');
        if (dialog) dialog.style.display = 'flex';
    }

    hideHowToPlayDialog() {
        const dialog = document.getElementById('howToPlayDialog');
        if (dialog) dialog.style.display = 'none';
    }

    togglePause() {
        if (!this.isGameRunning) return;

        const pauseBtn = document.getElementById('pausePlayBtn');

        if (this.isPaused) {
            // 再開
            this.isPaused = false;
            if (pauseBtn) pauseBtn.textContent = '⏸️';
        } else {
            // 一時停止
            this.isPaused = true;
            if (pauseBtn) pauseBtn.textContent = '▶️';
        }
    }
}

// ゲーム初期化
document.addEventListener('DOMContentLoaded', () => {
    const game = new BikeGame();

    // ゲーム開始ボタン
    document.getElementById('startGameBtn').addEventListener('click', () => {
        if (window.audioSystem) window.audioSystem.play('click');
        game.startGame();
    });

    // 遊び方ボタン
    document.getElementById('howToPlayBtn').addEventListener('click', () => {
        if (window.audioSystem) window.audioSystem.play('click');
        game.showHowToPlayDialog();
    });

    // 遊び方ダイアログを閉じる
    document.getElementById('closeDialog').addEventListener('click', () => {
        if (window.audioSystem) window.audioSystem.play('click');
        game.hideHowToPlayDialog();
    });

    // リスタートボタン
    document.getElementById('restartBtn').addEventListener('click', () => {
        if (window.audioSystem) window.audioSystem.play('click');
        game.hideGameOverDialog();
        game.startGame();
    });

    // 一時停止・再生ボタン
    document.getElementById('pausePlayBtn').addEventListener('click', () => {
        if (window.audioSystem) window.audioSystem.play('click');
        game.togglePause();
    });
});
