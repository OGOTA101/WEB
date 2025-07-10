// Qix陣取りパズルゲーム
class QixGame {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        if (!this.canvas) {
            console.error('Canvas element not found');
            return;
        }
        this.ctx = this.canvas.getContext('2d');

        // ゲーム設定
        this.gridWidth = 120;
        this.gridHeight = 80;
        this.cellSize = 5;

        // Canvasサイズを設定
        this.canvas.width = this.gridWidth * this.cellSize;
        this.canvas.height = this.gridHeight * this.cellSize;

        // プレイヤー
        this.player = {
            x: 0,
            y: 40,
            trail: [],
            isDrawing: false,
            onBoundary: true,
            moveTimer: 0,
            moveDelay: 3 // 移動の遅延（フレーム数）
        };

        // Qix敵
        this.qixes = [];
        this.sparks = [];

        // ゲーム状態
        this.isGameRunning = false;
        this.isPaused = false;
        this.score = 0;
        this.level = 1;
        this.territory = 0;
        this.targetTerritory = 75;

        // グリッド（0=空白, 1=境界線, 2=占有地, 3=プレイヤーの線）
        this.grid = [];
        this.initializeGrid();

        // 入力状態
        this.keys = {
            up: false,
            down: false,
            left: false,
            right: false
        };

        this.setupEventListeners();
        this.loadQixSounds();
        this.renderGame();
    }

    initializeGrid() {
        this.grid = [];
        for (let y = 0; y < this.gridHeight; y++) {
            this.grid[y] = [];
            for (let x = 0; x < this.gridWidth; x++) {
                if (x === 0 || x === this.gridWidth - 1 || y === 0 || y === this.gridHeight - 1) {
                    this.grid[y][x] = 1; // 境界線
                } else {
                    this.grid[y][x] = 0; // 空白
                }
            }
        }
    }

    loadQixSounds() {
        if (!window.audioSystem) return;

        const audioContext = window.audioSystem.audioContext;
        if (!audioContext) return;

        // 線描画音
        const drawBuffer = this.generateDrawSound(audioContext);
        window.audioSystem.addSound('draw', drawBuffer);

        // 領域占拠音
        const captureBuffer = this.generateCaptureSound(audioContext);
        window.audioSystem.addSound('capture', captureBuffer);

        // 警告音
        const warningBuffer = this.generateWarningSound(audioContext);
        window.audioSystem.addSound('warning', warningBuffer);

        // ステージクリア音
        const clearBuffer = this.generateStageClearSound(audioContext);
        window.audioSystem.addSound('stage-clear', clearBuffer);
    }

    generateDrawSound(audioContext) {
        const sampleRate = audioContext.sampleRate;
        const duration = 0.1;
        const buffer = audioContext.createBuffer(1, sampleRate * duration, sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < data.length; i++) {
            const t = i / sampleRate;
            data[i] = Math.sin(2 * Math.PI * 1000 * t) * Math.exp(-t * 15) * 0.1;
        }

        return buffer;
    }

    generateCaptureSound(audioContext) {
        const sampleRate = audioContext.sampleRate;
        const duration = 0.5;
        const buffer = audioContext.createBuffer(1, sampleRate * duration, sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < data.length; i++) {
            const t = i / sampleRate;
            const freq = 440 + (t * 220); // 上昇音
            data[i] = Math.sin(2 * Math.PI * freq * t) * Math.exp(-t * 3) * 0.2;
        }

        return buffer;
    }

    generateWarningSound(audioContext) {
        const sampleRate = audioContext.sampleRate;
        const duration = 0.3;
        const buffer = audioContext.createBuffer(1, sampleRate * duration, sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < data.length; i++) {
            const t = i / sampleRate;
            const freq = 800 + Math.sin(t * 40) * 200; // 変調音
            data[i] = Math.sin(2 * Math.PI * freq * t) * 0.15;
        }

        return buffer;
    }

    generateStageClearSound(audioContext) {
        const sampleRate = audioContext.sampleRate;
        const duration = 1.0;
        const buffer = audioContext.createBuffer(1, sampleRate * duration, sampleRate);
        const data = buffer.getChannelData(0);

        const notes = [523.25, 659.25, 783.99, 1046.50, 1318.51]; // C5, E5, G5, C6, E6

        for (let i = 0; i < data.length; i++) {
            const t = i / sampleRate;
            const noteIndex = Math.floor(t * 5) % notes.length;
            const freq = notes[noteIndex];
            const envelope = Math.exp(-t * 1);

            data[i] = Math.sin(2 * Math.PI * freq * t) * envelope * 0.2;
        }

        return buffer;
    }

    setupEventListeners() {
        // キーボード操作
        document.addEventListener('keydown', (e) => {
            if (!this.isGameRunning) return;

            switch (e.code) {
                case 'ArrowUp':
                    this.keys.up = true;
                    e.preventDefault();
                    break;
                case 'ArrowDown':
                    this.keys.down = true;
                    e.preventDefault();
                    break;
                case 'ArrowLeft':
                    this.keys.left = true;
                    e.preventDefault();
                    break;
                case 'ArrowRight':
                    this.keys.right = true;
                    e.preventDefault();
                    break;
            }
        });

        document.addEventListener('keyup', (e) => {
            switch (e.code) {
                case 'ArrowUp':
                    this.keys.up = false;
                    break;
                case 'ArrowDown':
                    this.keys.down = false;
                    break;
                case 'ArrowLeft':
                    this.keys.left = false;
                    break;
                case 'ArrowRight':
                    this.keys.right = false;
                    break;
            }
        });

        // モバイルボタン
        const upButton = document.getElementById('upButton');
        if (upButton) {
            upButton.addEventListener('touchstart', () => {
                this.keys.up = true;
            });
            upButton.addEventListener('touchend', () => {
                this.keys.up = false;
            });
        }

        const downButton = document.getElementById('downButton');
        if (downButton) {
            downButton.addEventListener('touchstart', () => {
                this.keys.down = true;
            });
            downButton.addEventListener('touchend', () => {
                this.keys.down = false;
            });
        }

        const leftButton = document.getElementById('leftButton');
        if (leftButton) {
            leftButton.addEventListener('touchstart', () => {
                this.keys.left = true;
            });
            leftButton.addEventListener('touchend', () => {
                this.keys.left = false;
            });
        }

        const rightButton = document.getElementById('rightButton');
        if (rightButton) {
            rightButton.addEventListener('touchstart', () => {
                this.keys.right = true;
            });
            rightButton.addEventListener('touchend', () => {
                this.keys.right = false;
            });
        }
    }

    createQixes() {
        this.qixes = [];
        const qixCount = Math.min(4, 1 + Math.floor(this.level / 2)); // レベル2毎に1体ずつ増加、最大4体

        for (let i = 0; i < qixCount; i++) {
            const qix = {
                x: Math.random() * (this.gridWidth - 20) + 10,
                y: Math.random() * (this.gridHeight - 20) + 10,
                vx: (Math.random() - 0.5) * 2,
                vy: (Math.random() - 0.5) * 2,
                trail: [],
                color: `hsl(${Math.random() * 360}, 70%, 50%)`,
                spawnTime: 0,
                maxSpawnTime: 30,
                rotation: 0
            };

            this.qixes.push(qix);

            // 出現エフェクト
            this.createSpawnEffect(qix.x, qix.y);
        }

        // スパーク（境界線上を移動する敵）
        this.sparks = [];
        const sparkCount = Math.min(3, Math.floor(this.level / 3) + 1); // レベル3毎に1体ずつ増加、最大3体
        for (let i = 0; i < sparkCount; i++) {
            const spark = {
                x: 0,
                y: Math.random() * this.gridHeight,
                direction: 1,
                side: Math.floor(Math.random() * 4), // 0:上, 1:右, 2:下, 3:左
                speed: 0.5 + this.level * 0.1,
                spawnTime: 0,
                maxSpawnTime: 20
            };

            this.sparks.push(spark);

            // スパーク出現エフェクト
            this.createSparkSpawnEffect(spark.x, spark.y);
        }

        // 出現音
        if (window.audioSystem) window.audioSystem.play('warning', 0.4);
    }

    createSpawnEffect(x, y) {
        // 出現エフェクト用のパーティクル
        if (!this.spawnParticles) this.spawnParticles = [];

        // 出現位置に放射状のパーティクル
        for (let i = 0; i < 12; i++) {
            const angle = (i / 12) * Math.PI * 2;
            this.spawnParticles.push({
                x: x,
                y: y,
                vx: Math.cos(angle) * 3,
                vy: Math.sin(angle) * 3,
                life: 40,
                maxLife: 40,
                color: '#FF4500',
                size: 2
            });
        }

        // 中心に大きなフラッシュ
        this.spawnParticles.push({
            x: x,
            y: y,
            vx: 0,
            vy: 0,
            life: 20,
            maxLife: 20,
            color: '#FFFF00',
            size: 8
        });
    }

    createSparkSpawnEffect(x, y) {
        if (!this.spawnParticles) this.spawnParticles = [];

        // スパーク用の小さなエフェクト
        for (let i = 0; i < 6; i++) {
            const angle = (i / 6) * Math.PI * 2;
            this.spawnParticles.push({
                x: x,
                y: y,
                vx: Math.cos(angle) * 2,
                vy: Math.sin(angle) * 2,
                life: 25,
                maxLife: 25,
                color: '#00FFFF',
                size: 1.5
            });
        }
    }

    startGame() {
        this.resetGame();
        this.isGameRunning = true;
        this.hideStartScreen();
        const pauseBtn = document.getElementById('pauseBtn');
        if (pauseBtn) pauseBtn.style.display = 'inline-block';
        this.createQixes();
        this.gameLoop();
    }

    resetGame() {
        this.player = {
            x: 0,
            y: 40,
            trail: [],
            isDrawing: false,
            onBoundary: true,
            moveTimer: 0,
            moveDelay: 3
        };
        this.score = 0;
        this.level = 1;
        this.territory = 0;
        this.targetTerritory = 75;
        this.initializeGrid();
        this.updateUI();
    }

    update() {
        if (!this.isGameRunning || this.isPaused) return;

        // プレイヤー移動
        this.updatePlayer();

        // Qix移動
        this.updateQixes();

        // スパーク移動
        this.updateSparks();

        // 衝突判定
        this.checkCollisions();

        // UI更新
        this.updateUI();
    }

    updatePlayer() {
        // 移動タイマーを更新
        this.player.moveTimer++;
        if (this.player.moveTimer < this.player.moveDelay) {
            return; // まだ移動できない
        }

        let newX = this.player.x;
        let newY = this.player.y;
        let moved = false;

        // 移動処理
        if (this.keys.up && newY > 0) {
            newY--;
            moved = true;
        }
        if (this.keys.down && newY < this.gridHeight - 1) {
            newY++;
            moved = true;
        }
        if (this.keys.left && newX > 0) {
            newX--;
            moved = true;
        }
        if (this.keys.right && newX < this.gridWidth - 1) {
            newX++;
            moved = true;
        }

        // 移動した場合のみタイマーリセット
        if (!moved) return;

        // 境界線・占有地上でのみ移動可能（Qixの基本ルール）
        if (!this.player.isDrawing) {
            // 線を引いていない時は境界線・占有地上のみ移動可能
            if (this.grid[newY] && (this.grid[newY][newX] === 1 || this.grid[newY][newX] === 2)) {
                this.player.x = newX;
                this.player.y = newY;
                this.player.onBoundary = true;
                this.player.moveTimer = 0; // タイマーリセット

                // 境界線から空白エリアに向かう場合、線引き開始
                const directions = [
                    { x: 0, y: -1 }, { x: 0, y: 1 }, { x: -1, y: 0 }, { x: 1, y: 0 }
                ];

                for (let dir of directions) {
                    const checkX = newX + dir.x;
                    const checkY = newY + dir.y;
                    if (this.grid[checkY] && this.grid[checkY][checkX] === 0) {
                        // 隣接する空白エリアがある場合、そちらに移動できる
                        break;
                    }
                }
            }
        } else {
            // 線を引いている最中は空白エリアを移動可能
            if (this.grid[newY] && this.grid[newY][newX] === 0) {
                this.player.x = newX;
                this.player.y = newY;
                this.player.trail.push({ x: this.player.x, y: this.player.y });
                this.grid[newY][newX] = 3; // プレイヤーの線
                this.player.onBoundary = false;
                this.player.moveTimer = 0; // タイマーリセット
            } else if (this.grid[newY] && (this.grid[newY][newX] === 1 || this.grid[newY][newX] === 2)) {
                // 境界線・占有地に戻った - 領域を占拠
                this.player.x = newX;
                this.player.y = newY;
                this.captureArea();
                this.player.isDrawing = false;
                this.player.trail = [];
                this.player.onBoundary = true;
                this.player.moveTimer = 0; // タイマーリセット
            }
        }

        // 線引き開始判定（境界線から空白エリアに移動する時）
        if (!this.player.isDrawing && this.player.onBoundary) {
            const directions = [
                { x: 0, y: -1 }, { x: 0, y: 1 }, { x: -1, y: 0 }, { x: 1, y: 0 }
            ];

            for (let dir of directions) {
                const checkX = this.player.x + dir.x;
                const checkY = this.player.y + dir.y;
                if (this.keys.up && dir.y === -1 && this.grid[checkY] && this.grid[checkY][checkX] === 0) {
                    this.startDrawing(checkX, checkY);
                    break;
                } else if (this.keys.down && dir.y === 1 && this.grid[checkY] && this.grid[checkY][checkX] === 0) {
                    this.startDrawing(checkX, checkY);
                    break;
                } else if (this.keys.left && dir.x === -1 && this.grid[checkY] && this.grid[checkY][checkX] === 0) {
                    this.startDrawing(checkX, checkY);
                    break;
                } else if (this.keys.right && dir.x === 1 && this.grid[checkY] && this.grid[checkY][checkX] === 0) {
                    this.startDrawing(checkX, checkY);
                    break;
                }
            }
        }
    }

    startDrawing(x, y) {
        this.player.x = x;
        this.player.y = y;
        this.player.isDrawing = true;
        this.player.onBoundary = false;
        this.player.trail = [{ x: x, y: y }];
        this.grid[y][x] = 3;
        if (window.audioSystem) window.audioSystem.play('draw', 0.3);
    }

    canMoveTo(x, y) {
        if (x < 0 || x >= this.gridWidth || y < 0 || y >= this.gridHeight) return false;

        const cell = this.grid[y][x];
        // 空白、境界線、占有地には移動可能
        return cell === 0 || cell === 1 || cell === 2;
    }

    updateQixes() {
        this.qixes.forEach(qix => {
            // 出現アニメーション
            if (qix.spawnTime < qix.maxSpawnTime) {
                qix.spawnTime++;
                return; // 出現中は移動しない
            }

            // 回転
            qix.rotation += 0.05;

            // 移動
            qix.x += qix.vx;
            qix.y += qix.vy;

            // 境界でバウンス（占有地の境界も含む）
            if (qix.x <= 1 || qix.x >= this.gridWidth - 2) qix.vx *= -1;
            if (qix.y <= 1 || qix.y >= this.gridHeight - 2) qix.vy *= -1;

            // 占有地との衝突でバウンス
            const gridX = Math.floor(qix.x);
            const gridY = Math.floor(qix.y);
            if (gridX > 0 && gridX < this.gridWidth - 1 && gridY > 0 && gridY < this.gridHeight - 1) {
                if (this.grid[gridY][gridX] === 2) {
                    qix.vx *= -1;
                    qix.vy *= -1;
                }
            }

            // 軌跡を記録
            qix.trail.push({ x: qix.x, y: qix.y });
            if (qix.trail.length > 15) {
                qix.trail.shift();
            }

            // 位置を範囲内に制限
            qix.x = Math.max(1, Math.min(this.gridWidth - 2, qix.x));
            qix.y = Math.max(1, Math.min(this.gridHeight - 2, qix.y));
        });

        // パーティクル更新
        this.updateParticles();
    }

    updateParticles() {
        // 出現エフェクトパーティクル
        if (this.spawnParticles) {
            for (let i = this.spawnParticles.length - 1; i >= 0; i--) {
                const particle = this.spawnParticles[i];
                particle.x += particle.vx;
                particle.y += particle.vy;
                particle.life--;

                if (particle.life <= 0) {
                    this.spawnParticles.splice(i, 1);
                }
            }
        }

        // 占拠エフェクトパーティクル
        if (this.captureParticles) {
            for (let i = this.captureParticles.length - 1; i >= 0; i--) {
                const particle = this.captureParticles[i];
                particle.x += particle.vx;
                particle.y += particle.vy;
                particle.vx *= 0.98; // 減速
                particle.vy *= 0.98;
                particle.life--;

                if (particle.life <= 0) {
                    this.captureParticles.splice(i, 1);
                }
            }
        }
    }

    updateSparks() {
        this.sparks.forEach(spark => {
            // 出現アニメーション
            if (spark.spawnTime < spark.maxSpawnTime) {
                spark.spawnTime++;
                return; // 出現中は移動しない
            }

            switch (spark.side) {
                case 0: // 上辺
                    spark.x += spark.direction * spark.speed;
                    if (spark.x >= this.gridWidth - 1) {
                        spark.side = 1;
                        spark.y = 0;
                    } else if (spark.x <= 0) {
                        spark.side = 3;
                        spark.y = this.gridHeight - 1;
                    }
                    break;
                case 1: // 右辺
                    spark.y += spark.direction * spark.speed;
                    if (spark.y >= this.gridHeight - 1) {
                        spark.side = 2;
                        spark.x = this.gridWidth - 1;
                    } else if (spark.y <= 0) {
                        spark.side = 0;
                        spark.x = 0;
                    }
                    break;
                case 2: // 下辺
                    spark.x -= spark.direction * spark.speed;
                    if (spark.x <= 0) {
                        spark.side = 3;
                        spark.y = this.gridHeight - 1;
                    } else if (spark.x >= this.gridWidth - 1) {
                        spark.side = 1;
                        spark.y = 0;
                    }
                    break;
                case 3: // 左辺
                    spark.y -= spark.direction * spark.speed;
                    if (spark.y <= 0) {
                        spark.side = 0;
                        spark.x = 0;
                    } else if (spark.y >= this.gridHeight - 1) {
                        spark.side = 2;
                        spark.x = this.gridWidth - 1;
                    }
                    break;
            }
        });
    }

    checkCollisions() {
        const playerGridX = Math.floor(this.player.x);
        const playerGridY = Math.floor(this.player.y);

        // Qixとの衝突
        this.qixes.forEach(qix => {
            const distance = Math.sqrt(
                Math.pow(this.player.x - qix.x, 2) +
                Math.pow(this.player.y - qix.y, 2)
            );
            if (distance < 2) {
                this.gameOver();
                return;
            }

            // プレイヤーの線との衝突
            if (this.player.isDrawing) {
                this.player.trail.forEach(point => {
                    const trailDistance = Math.sqrt(
                        Math.pow(point.x - qix.x, 2) +
                        Math.pow(point.y - qix.y, 2)
                    );
                    if (trailDistance < 1.5) {
                        this.gameOver();
                        return;
                    }
                });
            }
        });

        // スパークとの衝突
        this.sparks.forEach(spark => {
            const distance = Math.sqrt(
                Math.pow(this.player.x - spark.x, 2) +
                Math.pow(this.player.y - spark.y, 2)
            );
            if (distance < 1.5) {
                this.gameOver();
                return;
            }
        });
    }

    captureArea() {
        if (this.player.trail.length < 3) return;

        // プレイヤーの線を一時的に境界線に変換（フラッドフィル用）
        this.player.trail.forEach(point => {
            this.grid[point.y][point.x] = 1;
        });

        // フラッドフィル アルゴリズムで領域を判定
        this.floodFillAreas();

        // 線を削除（占拠後は線を残さない）
        this.player.trail.forEach(point => {
            if (this.grid[point.y][point.x] !== 2) {
                this.grid[point.y][point.x] = 2; // 占有地に変換
            }
        });

        // 効果音
        if (window.audioSystem) window.audioSystem.play('capture');

        // スコア計算
        const newTerritory = this.calculateTerritory();
        const capturedArea = newTerritory - this.territory;
        this.score += capturedArea * 10;

        // 占拠エフェクト
        this.createCaptureEffect(capturedArea);

        this.territory = newTerritory;

        // ステージクリア判定
        if (this.territory >= this.targetTerritory) {
            this.stageClear();
        }
    }

    createCaptureEffect(capturedArea) {
        // 占拠エフェクト用のパーティクル
        if (!this.captureParticles) this.captureParticles = [];

        // 占拠された領域の中心付近にパーティクル生成
        for (let i = 0; i < Math.min(capturedArea, 20); i++) {
            this.captureParticles.push({
                x: Math.random() * this.gridWidth,
                y: Math.random() * this.gridHeight,
                vx: (Math.random() - 0.5) * 4,
                vy: (Math.random() - 0.5) * 4,
                life: 60,
                maxLife: 60,
                color: '#9370DB',
                size: Math.random() * 3 + 2
            });
        }
    }

    floodFillAreas() {
        const visited = Array(this.gridHeight).fill().map(() => Array(this.gridWidth).fill(false));

        // Qixがいる領域を特定
        const qixAreas = [];
        this.qixes.forEach(qix => {
            const x = Math.floor(qix.x);
            const y = Math.floor(qix.y);
            if (!visited[y][x] && this.grid[y][x] === 0) {
                const area = this.floodFill(x, y, visited);
                if (area.length > 0) {
                    qixAreas.push(area);
                }
            }
        });

        // Qixがいない領域を占有地にする
        for (let y = 1; y < this.gridHeight - 1; y++) {
            for (let x = 1; x < this.gridWidth - 1; x++) {
                if (!visited[y][x] && this.grid[y][x] === 0) {
                    const area = this.floodFill(x, y, visited);
                    // この領域にQixがいるかチェック
                    let hasQix = false;
                    for (let qixArea of qixAreas) {
                        if (qixArea.some(point =>
                            area.some(areaPoint => areaPoint.x === point.x && areaPoint.y === point.y)
                        )) {
                            hasQix = true;
                            break;
                        }
                    }

                    if (!hasQix) {
                        // Qixがいない領域を占有地にする
                        area.forEach(point => {
                            this.grid[point.y][point.x] = 2;
                        });
                    }
                }
            }
        }
    }

    floodFill(startX, startY, visited) {
        const stack = [{ x: startX, y: startY }];
        const area = [];

        while (stack.length > 0) {
            const { x, y } = stack.pop();

            if (x < 0 || x >= this.gridWidth || y < 0 || y >= this.gridHeight) continue;
            if (visited[y][x] || this.grid[y][x] !== 0) continue;

            visited[y][x] = true;
            area.push({ x, y });

            // 4方向をスタックに追加
            stack.push({ x: x + 1, y });
            stack.push({ x: x - 1, y });
            stack.push({ x, y: y + 1 });
            stack.push({ x, y: y - 1 });
        }

        return area;
    }

    calculateTerritory() {
        let occupiedCells = 0;
        let totalCells = 0;

        for (let y = 1; y < this.gridHeight - 1; y++) {
            for (let x = 1; x < this.gridWidth - 1; x++) {
                totalCells++;
                if (this.grid[y][x] === 2) {
                    occupiedCells++;
                }
            }
        }

        return Math.floor((occupiedCells / totalCells) * 100);
    }

    stageClear() {
        this.isGameRunning = false;

        // ボーナススコア
        const bonus = (this.territory - this.targetTerritory) * 50;
        this.score += bonus;

        // 効果音
        if (window.audioSystem) window.audioSystem.play('stage-clear');

        // 次のステージに自動で進む
        setTimeout(() => {
            this.nextStage();
        }, 2000);
    }

    nextStage() {
        this.level++;
        this.territory = 0;
        this.targetTerritory = Math.min(85, 75 + this.level * 2); // レベルが上がると必要領域も増加
        this.initializeGrid();
        this.player = {
            x: 0,
            y: 40,
            trail: [],
            isDrawing: false,
            onBoundary: true,
            moveTimer: 0,
            moveDelay: 3
        };

        // パーティクルをクリア
        this.spawnParticles = [];
        this.captureParticles = [];

        this.createQixes();
        this.isGameRunning = true;
        this.updateUI();
        this.gameLoop(); // ゲームループを再開
    }

    gameOver() {
        this.isGameRunning = false;

        // 効果音
        if (window.audioSystem) window.audioSystem.play('warning');

        // 統合されたゲームオーバー画面を表示
        const gameOverElement = document.getElementById('gameOverScreen');
        const finalScoreElement = document.getElementById('finalScore');
        const finalLevelElement = document.getElementById('finalLevel');
        const finalTerritoryElement = document.getElementById('finalTerritory');

        if (finalScoreElement) finalScoreElement.textContent = this.score;
        if (finalLevelElement) finalLevelElement.textContent = this.level;
        if (finalTerritoryElement) finalTerritoryElement.textContent = this.territory + '%';
        if (gameOverElement) gameOverElement.style.display = 'block';

        const pauseBtn = document.getElementById('pauseBtn');
        if (pauseBtn) pauseBtn.style.display = 'none';
    }

    updateUI() {
        const scoreElement = document.getElementById('score');
        const territoryElement = document.getElementById('territory');
        const levelElement = document.getElementById('level');
        const targetTerritoryElement = document.getElementById('targetTerritory');

        if (scoreElement) scoreElement.textContent = this.score;
        if (territoryElement) territoryElement.textContent = this.territory + '%';
        if (levelElement) levelElement.textContent = this.level;
        if (targetTerritoryElement) targetTerritoryElement.textContent = this.targetTerritory + '%';
    }

    renderGame() {
        // 背景をクリア
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // 背景グラデーション
        const gradient = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
        gradient.addColorStop(0, '#000011');
        gradient.addColorStop(1, '#000033');
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // グリッドを描画
        this.renderGrid();

        // プレイヤーの線を描画
        this.renderPlayerTrail();

        // Qixを描画
        this.renderQixes();

        // スパークを描画
        this.renderSparks();

        // プレイヤーを描画
        this.renderPlayer();

        // パーティクル描画
        this.renderParticles();

        // ゲーム実行中のみ再帰呼び出し
        if (this.isGameRunning) {
            requestAnimationFrame(() => {
                this.update();
                this.renderGame();
            });
        }
    }

    renderParticles() {
        // 出現エフェクトパーティクル
        if (this.spawnParticles) {
            this.spawnParticles.forEach(particle => {
                const alpha = particle.life / particle.maxLife;
                this.ctx.globalAlpha = alpha;
                this.ctx.fillStyle = particle.color;
                this.ctx.beginPath();
                this.ctx.arc(
                    particle.x * this.cellSize,
                    particle.y * this.cellSize,
                    particle.size,
                    0,
                    Math.PI * 2
                );
                this.ctx.fill();
            });
            this.ctx.globalAlpha = 1;
        }

        // 占拠エフェクトパーティクル
        if (this.captureParticles) {
            this.captureParticles.forEach(particle => {
                const alpha = particle.life / particle.maxLife;
                this.ctx.globalAlpha = alpha;
                this.ctx.fillStyle = particle.color;

                // 光る効果
                this.ctx.shadowColor = particle.color;
                this.ctx.shadowBlur = 8;

                this.ctx.beginPath();
                this.ctx.arc(
                    particle.x * this.cellSize,
                    particle.y * this.cellSize,
                    particle.size,
                    0,
                    Math.PI * 2
                );
                this.ctx.fill();

                this.ctx.shadowBlur = 0;
            });
            this.ctx.globalAlpha = 1;
        }
    }

    renderGrid() {
        for (let y = 0; y < this.gridHeight; y++) {
            for (let x = 0; x < this.gridWidth; x++) {
                const screenX = x * this.cellSize;
                const screenY = y * this.cellSize;

                switch (this.grid[y][x]) {
                    case 1: // 境界線
                        this.ctx.fillStyle = '#8A2BE2';
                        this.ctx.fillRect(screenX, screenY, this.cellSize, this.cellSize);
                        break;
                    case 2: // 占有地
                        this.ctx.fillStyle = '#4B0082';
                        this.ctx.fillRect(screenX, screenY, this.cellSize, this.cellSize);
                        break;
                    case 3: // プレイヤーの線
                        this.ctx.fillStyle = '#00FFFF';
                        this.ctx.fillRect(screenX, screenY, this.cellSize, this.cellSize);
                        break;
                }
            }
        }
    }

    renderPlayerTrail() {
        if (this.player.trail.length > 1) {
            this.ctx.strokeStyle = '#00FFFF';
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();

            const firstPoint = this.player.trail[0];
            this.ctx.moveTo(firstPoint.x * this.cellSize + this.cellSize / 2,
                firstPoint.y * this.cellSize + this.cellSize / 2);

            for (let i = 1; i < this.player.trail.length; i++) {
                const point = this.player.trail[i];
                this.ctx.lineTo(point.x * this.cellSize + this.cellSize / 2,
                    point.y * this.cellSize + this.cellSize / 2);
            }

            this.ctx.stroke();
        }
    }

    renderQixes() {
        this.qixes.forEach(qix => {
            // 出現アニメーション中は特別な描画
            if (qix.spawnTime < qix.maxSpawnTime) {
                const alpha = qix.spawnTime / qix.maxSpawnTime;
                const size = 3 * alpha + 2 * (1 - alpha);

                this.ctx.globalAlpha = alpha;
                this.ctx.fillStyle = qix.color;
                this.ctx.beginPath();
                this.ctx.arc(qix.x * this.cellSize, qix.y * this.cellSize, size, 0, Math.PI * 2);
                this.ctx.fill();

                // 出現エフェクトのリング
                this.ctx.strokeStyle = qix.color;
                this.ctx.lineWidth = 2;
                this.ctx.beginPath();
                this.ctx.arc(qix.x * this.cellSize, qix.y * this.cellSize, 8 * (1 - alpha), 0, Math.PI * 2);
                this.ctx.stroke();

                this.ctx.globalAlpha = 1;
                return;
            }

            // 軌跡を描画（美しいトレイル）
            if (qix.trail.length > 1) {
                for (let i = 1; i < qix.trail.length; i++) {
                    const alpha = i / qix.trail.length; // 徐々に薄くなる
                    const prevPoint = qix.trail[i - 1];
                    const currentPoint = qix.trail[i];

                    this.ctx.strokeStyle = qix.color + Math.floor(alpha * 128).toString(16).padStart(2, '0');
                    this.ctx.lineWidth = alpha * 2;
                    this.ctx.beginPath();
                    this.ctx.moveTo(prevPoint.x * this.cellSize, prevPoint.y * this.cellSize);
                    this.ctx.lineTo(currentPoint.x * this.cellSize, currentPoint.y * this.cellSize);
                    this.ctx.stroke();
                }
            }

            const screenX = qix.x * this.cellSize;
            const screenY = qix.y * this.cellSize;

            // 外側の輪郭線（白）
            this.ctx.strokeStyle = '#FFFFFF';
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();
            this.ctx.arc(screenX, screenY, 4, 0, Math.PI * 2);
            this.ctx.stroke();

            // Qix本体を描画（回転する多角形）
            this.ctx.save();
            this.ctx.translate(screenX, screenY);
            this.ctx.rotate(qix.rotation);

            // メイン図形（六角形）
            this.ctx.fillStyle = qix.color;
            this.ctx.beginPath();
            for (let i = 0; i < 6; i++) {
                const angle = (i / 6) * Math.PI * 2;
                const x = Math.cos(angle) * 3;
                const y = Math.sin(angle) * 3;
                if (i === 0) {
                    this.ctx.moveTo(x, y);
                } else {
                    this.ctx.lineTo(x, y);
                }
            }
            this.ctx.closePath();
            this.ctx.fill();

            // 内側のハイライト
            this.ctx.fillStyle = '#FFFFFF40';
            this.ctx.beginPath();
            this.ctx.arc(0, 0, 1.5, 0, Math.PI * 2);
            this.ctx.fill();

            this.ctx.restore();

            // 光る効果
            this.ctx.shadowColor = qix.color;
            this.ctx.shadowBlur = 15;
            this.ctx.fillStyle = qix.color;
            this.ctx.beginPath();
            this.ctx.arc(screenX, screenY, 2, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.shadowBlur = 0;
        });
    }

    renderSparks() {
        this.sparks.forEach(spark => {
            const screenX = spark.x * this.cellSize;
            const screenY = spark.y * this.cellSize;

            // 出現アニメーション中は特別な描画
            if (spark.spawnTime < spark.maxSpawnTime) {
                const alpha = spark.spawnTime / spark.maxSpawnTime;
                const size = 2 * alpha + 1 * (1 - alpha);

                this.ctx.globalAlpha = alpha;
                this.ctx.fillStyle = '#FF4500';
                this.ctx.beginPath();
                this.ctx.arc(screenX, screenY, size, 0, Math.PI * 2);
                this.ctx.fill();

                // 出現エフェクトのスパーク
                this.ctx.strokeStyle = '#FFFF00';
                this.ctx.lineWidth = 1;
                for (let i = 0; i < 4; i++) {
                    const angle = (i / 4) * Math.PI * 2;
                    const length = 6 * (1 - alpha);
                    this.ctx.beginPath();
                    this.ctx.moveTo(screenX, screenY);
                    this.ctx.lineTo(
                        screenX + Math.cos(angle) * length,
                        screenY + Math.sin(angle) * length
                    );
                    this.ctx.stroke();
                }

                this.ctx.globalAlpha = 1;
                return;
            }

            // 外側の輪郭線（白）
            this.ctx.strokeStyle = '#FFFFFF';
            this.ctx.lineWidth = 1.5;
            this.ctx.beginPath();
            this.ctx.arc(screenX, screenY, 2.5, 0, Math.PI * 2);
            this.ctx.stroke();

            // メイン図形（ダイヤモンド形）
            this.ctx.fillStyle = '#FF4500';
            this.ctx.beginPath();
            this.ctx.moveTo(screenX, screenY - 2);
            this.ctx.lineTo(screenX + 2, screenY);
            this.ctx.lineTo(screenX, screenY + 2);
            this.ctx.lineTo(screenX - 2, screenY);
            this.ctx.closePath();
            this.ctx.fill();

            // 内側のハイライト
            this.ctx.fillStyle = '#FFFF00';
            this.ctx.beginPath();
            this.ctx.arc(screenX, screenY, 0.8, 0, Math.PI * 2);
            this.ctx.fill();

            // 光る効果
            this.ctx.shadowColor = '#FF4500';
            this.ctx.shadowBlur = 12;
            this.ctx.fillStyle = '#FF4500';
            this.ctx.beginPath();
            this.ctx.arc(screenX, screenY, 1, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.shadowBlur = 0;
        });
    }

    renderPlayer() {
        const screenX = this.player.x * this.cellSize;
        const screenY = this.player.y * this.cellSize;

        // プレイヤーマーカー
        this.ctx.fillStyle = this.player.isDrawing ? '#FFFF00' : '#00FF00';
        this.ctx.beginPath();
        this.ctx.arc(screenX + this.cellSize / 2, screenY + this.cellSize / 2, 3, 0, Math.PI * 2);
        this.ctx.fill();

        // 光る効果
        this.ctx.shadowColor = this.player.isDrawing ? '#FFFF00' : '#00FF00';
        this.ctx.shadowBlur = 8;
        this.ctx.beginPath();
        this.ctx.arc(screenX + this.cellSize / 2, screenY + this.cellSize / 2, 2, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.shadowBlur = 0;
    }

    gameLoop() {
        if (this.isGameRunning) {
            this.update();
            this.renderGame();
        }
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

        const pauseBtn = document.getElementById('pauseBtn');

        if (this.isPaused) {
            // 再開
            this.isPaused = false;
            if (pauseBtn) pauseBtn.textContent = '一時停止';
            this.gameLoop();
        } else {
            // 一時停止
            this.isPaused = true;
            if (pauseBtn) pauseBtn.textContent = '再開';
        }
    }
}

// ゲーム初期化
document.addEventListener('DOMContentLoaded', () => {
    const game = new QixGame();

    // ゲーム開始ボタン
    const startBtn = document.getElementById('startBtn');
    if (startBtn) {
        startBtn.addEventListener('click', () => {
            if (window.audioSystem) window.audioSystem.play('click');
            game.startGame();
        });
    }

    // 遊び方ボタン
    const howToPlayBtn = document.getElementById('howToPlayBtn');
    if (howToPlayBtn) {
        howToPlayBtn.addEventListener('click', () => {
            if (window.audioSystem) window.audioSystem.play('click');
            game.showHowToPlayDialog();
        });
    }

    // 遊び方ダイアログを閉じる
    const closeDialog = document.getElementById('closeDialog');
    if (closeDialog) {
        closeDialog.addEventListener('click', () => {
            if (window.audioSystem) window.audioSystem.play('click');
            game.hideHowToPlayDialog();
        });
    }

    // リスタートボタン
    const restartBtn = document.getElementById('restartBtn');
    if (restartBtn) {
        restartBtn.addEventListener('click', () => {
            if (window.audioSystem) window.audioSystem.play('click');
            const gameOverScreen = document.getElementById('gameOverScreen');
            if (gameOverScreen) gameOverScreen.style.display = 'none';
            game.startGame();
        });
    }

    // 一時停止・再生ボタン
    const pauseBtn = document.getElementById('pauseBtn');
    if (pauseBtn) {
        pauseBtn.addEventListener('click', () => {
            if (window.audioSystem) window.audioSystem.play('click');
            game.togglePause();
        });
    }

    // リセットボタン
    const resetBtn = document.getElementById('resetBtn');
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            if (window.audioSystem) window.audioSystem.play('click');
            game.resetGame();
            const gameOverScreen = document.getElementById('gameOverScreen');
            if (gameOverScreen) gameOverScreen.style.display = 'none';
        });
    }

    // モバイルコントロール
    const upButton = document.getElementById('upButton');
    const downButton = document.getElementById('downButton');
    const leftButton = document.getElementById('leftButton');
    const rightButton = document.getElementById('rightButton');

    if (upButton) {
        upButton.addEventListener('touchstart', (e) => {
            e.preventDefault();
            game.keys.up = true;
        });
        upButton.addEventListener('touchend', (e) => {
            e.preventDefault();
            game.keys.up = false;
        });
    }

    if (downButton) {
        downButton.addEventListener('touchstart', (e) => {
            e.preventDefault();
            game.keys.down = true;
        });
        downButton.addEventListener('touchend', (e) => {
            e.preventDefault();
            game.keys.down = false;
        });
    }

    if (leftButton) {
        leftButton.addEventListener('touchstart', (e) => {
            e.preventDefault();
            game.keys.left = true;
        });
        leftButton.addEventListener('touchend', (e) => {
            e.preventDefault();
            game.keys.left = false;
        });
    }

    if (rightButton) {
        rightButton.addEventListener('touchstart', (e) => {
            e.preventDefault();
            game.keys.right = true;
        });
        rightButton.addEventListener('touchend', (e) => {
            e.preventDefault();
            game.keys.right = false;
        });
    }
});
