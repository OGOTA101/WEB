// スペースドッジゲーム
(function () {
    // キャンバス設定
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    const canvasWidth = 600;
    const canvasHeight = 600;

    // プレイヤー
    let player = {
        x: canvasWidth / 2 - 20,
        y: canvasHeight - 80,
        width: 40,
        height: 40,
        speed: 300,
        hitboxWidth: 4,
        hitboxHeight: 4,
        hitboxOffsetX: 18,
        hitboxOffsetY: 18,
        targetX: canvasWidth / 2 - 20,
        targetY: canvasHeight - 80,
        isMoving: false,
        attackMode: false,
        attackGauge: 0,
        maxAttackGauge: 300
    };

    // ゲーム状態
    let gameRunning = false;
    let score = 0;
    let energyCount = 0;
    let startTime = 0;
    let currentTime = 0;

    // ゲームオブジェクト
    let obstacles = [];
    let powerups = [];
    let particles = [];
    let stars = [];

    // 難易度設定
    let difficulty = 'easy';
    const difficultySettings = {
        easy: { spawnRate: 0.02, speed: 2, maxObstacles: 8 },
        normal: { spawnRate: 0.03, speed: 3, maxObstacles: 12 },
        hard: { spawnRate: 0.04, speed: 4, maxObstacles: 16 },
        extreme: { spawnRate: 0.06, speed: 5, maxObstacles: 20 }
    };

    // 画像リソース
    const gameImages = {};
    let imagesLoaded = 0;
    const totalImages = 4;

    // ローカルストレージ
    let highScore = localStorage.getItem('dodgeHighScore') || 0;
    let sessionHighScore = 0;
    let sessionHighTime = 0;
    let sessionHighEnergy = 0;

    // デバッグ用
    let showHitboxes = false;
    let lastUpdateTime = 0;

    // ターゲット表示用
    let target = {
        x: 0,
        y: 0,
        visible: false,
        lastUpdate: 0
    };

    // マウス状態管理
    let isMouseDown = false;

    // 星空背景生成
    function generateStars() {
        stars = [];
        for (let i = 0; i < 100; i++) {
            stars.push({
                x: Math.random() * canvasWidth,
                y: Math.random() * canvasHeight,
                size: Math.random() * 2 + 0.5,
                speed: Math.random() * 0.5 + 0.2,
                brightness: Math.random() * 0.8 + 0.2
            });
        }
    }

    // 画像読み込み
    function loadImages() {
        const imageNames = ['spaceship', 'asteroid', 'enemy', 'powerup'];

        imageNames.forEach(name => {
            const img = new Image();
            img.onload = () => {
                imagesLoaded++;
                if (imagesLoaded === totalImages) {
                    gameFramework.onImagesLoaded();
                }
            };
            img.onerror = () => {
                console.warn(`Failed to load image: ${name}.png`);
                imagesLoaded++;
                if (imagesLoaded === totalImages) {
                    gameFramework.onImagesLoaded();
                }
            };
            img.src = `assets/images/${name}.png`;
            gameImages[name] = img;
        });
    }

    // イベントリスナー設定
    function setupEventListeners() {
        // 難易度選択
        document.querySelectorAll('.difficulty-btn').forEach(btn => {
            btn.addEventListener('click', function () {
                setDifficulty(this.dataset.difficulty);
            });
        });

        // マウス操作
        canvas.addEventListener('mousemove', handleMouseMove);
        canvas.addEventListener('click', handleMouseClick);
        canvas.addEventListener('mousedown', handleMouseDown);
        canvas.addEventListener('mouseup', handleMouseUp);

        // タッチ操作
        canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
        canvas.addEventListener('touchstart', handleTouchStart, { passive: false });

        // リサイズ対応
        window.addEventListener('resize', adjustCanvasSize);
        adjustCanvasSize();
    }

    // マウスクリック処理
    function handleMouseClick(e) {
        if (!gameRunning || gameFramework.isPaused) return;

        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;

        const mouseX = (e.clientX - rect.left) * scaleX;
        const mouseY = (e.clientY - rect.top) * scaleY;

        setPlayerTarget(mouseX, mouseY);
    }

    // マウス移動処理
    function handleMouseMove(e) {
        if (!gameRunning || gameFramework.isPaused || !isMouseDown) return;

        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;

        const mouseX = (e.clientX - rect.left) * scaleX;
        const mouseY = (e.clientY - rect.top) * scaleY;

        setPlayerTarget(mouseX, mouseY);
    }

    // マウスダウン処理
    function handleMouseDown(e) {
        if (!gameRunning || gameFramework.isPaused) return;
        isMouseDown = true;
        handleMouseClick(e);
    }

    // マウスアップ処理
    function handleMouseUp(e) {
        isMouseDown = false;
    }

    // タッチ移動処理
    function handleTouchMove(e) {
        e.preventDefault();
        if (!gameRunning || gameFramework.isPaused) return;

        const touch = e.touches[0];
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;

        const touchX = (touch.clientX - rect.left) * scaleX;
        const touchY = (touch.clientY - rect.top) * scaleY;

        setPlayerTarget(touchX, touchY - 60);
    }

    // タッチ開始処理
    function handleTouchStart(e) {
        e.preventDefault();
        handleTouchMove(e);
    }

    // プレイヤーターゲット設定
    function setPlayerTarget(x, y) {
        const targetX = Math.max(player.width / 2, Math.min(canvasWidth - player.width / 2, x));
        const targetY = Math.max(player.height / 2, Math.min(canvasHeight - player.height / 2, y));

        player.targetX = targetX - player.width / 2;
        player.targetY = targetY - player.height / 2;
        player.isMoving = true;

        target.x = targetX;
        target.y = targetY;
        target.visible = true;
        target.lastUpdate = Date.now();
    }

    // キャンバスサイズ調整
    function adjustCanvasSize() {
        const container = document.querySelector('.game-container');
        const containerWidth = container.clientWidth - 40;

        if (containerWidth < 600) {
            canvas.style.width = (containerWidth - 20) + 'px';
            canvas.style.height = (containerWidth - 20) + 'px';
        } else {
            canvas.style.width = '600px';
            canvas.style.height = '600px';
        }
    }

    // 難易度設定
    function setDifficulty(level) {
        difficulty = level;
        document.querySelectorAll('.difficulty-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        event.target.classList.add('active');
    }

    // 当たり判定表示切り替え
    function toggleHitboxes() {
        showHitboxes = !showHitboxes;
        document.getElementById('hitboxStatus').textContent = showHitboxes ? 'ON' : 'OFF';
    }

    // ゲーム開始処理
    function onGameStart() {
        gameRunning = true;
        startTime = Date.now();

        // リセット
        obstacles = [];
        powerups = [];
        particles = [];
        score = 0;
        energyCount = 0;
        player.x = canvasWidth / 2 - player.width / 2;
        player.y = canvasHeight - 80;
        player.targetX = player.x;
        player.targetY = player.y;
        player.isMoving = false;
        player.attackMode = false;
        player.attackGauge = 0;
        target.visible = false;
        lastUpdateTime = 0;
    }

    // ゲーム終了処理
    function onGameOver() {
        document.getElementById('finalScore').textContent = score;
        document.getElementById('finalTime').textContent = currentTime.toFixed(1);
        document.getElementById('finalEnergy').textContent = energyCount;

        // ハイスコア更新
        if (score > highScore) {
            highScore = score;
            localStorage.setItem('dodgeHighScore', highScore);
            document.getElementById('highScore').textContent = highScore;
        }
    }

    // ゲームリセット処理
    function onGameReset() {
        gameRunning = false;
        obstacles = [];
        powerups = [];
        particles = [];
        score = 0;
        energyCount = 0;
        player.x = canvasWidth / 2 - player.width / 2;
        player.y = canvasHeight - 80;
        player.targetX = player.x;
        player.targetY = player.y;
        player.isMoving = false;
        player.attackMode = false;
        player.attackGauge = 0;
        target.visible = false;
        lastUpdateTime = 0;

        updateStats();
        drawGame();
    }

    // 障害物生成
    function spawnObstacle() {
        const settings = difficultySettings[difficulty];
        if (obstacles.length >= settings.maxObstacles) return;

        const type = Math.random() < 0.7 ? 'asteroid' : 'enemy';
        const size = type === 'asteroid' ? 30 : 35;
        const hitboxSize = type === 'asteroid' ? 20 : 24;
        const hitboxOffset = (size - hitboxSize) / 2;

        obstacles.push({
            x: Math.random() * (canvasWidth - size),
            y: -size,
            width: size,
            height: size,
            speed: settings.speed + Math.random() * 2,
            type: type,
            rotation: 0,
            rotationSpeed: (Math.random() - 0.5) * 0.2,
            hitboxWidth: hitboxSize,
            hitboxHeight: hitboxSize,
            hitboxOffsetX: hitboxOffset,
            hitboxOffsetY: hitboxOffset
        });
    }

    // パワーアップ生成
    function spawnPowerup() {
        if (Math.random() < 0.005) {
            const size = 25;
            const hitboxSize = 18;
            const hitboxOffset = (size - hitboxSize) / 2;

            powerups.push({
                x: Math.random() * (canvasWidth - size),
                y: -size,
                width: size,
                height: size,
                speed: 2,
                pulse: 0,
                hitboxWidth: hitboxSize,
                hitboxHeight: hitboxSize,
                hitboxOffsetX: hitboxOffset,
                hitboxOffsetY: hitboxOffset
            });
        }
    }

    // 衝突判定
    function checkCollision(obj1, obj2) {
        const obj1HitX = obj1.x + (obj1.hitboxOffsetX || 0);
        const obj1HitY = obj1.y + (obj1.hitboxOffsetY || 0);
        const obj1HitWidth = obj1.hitboxWidth || obj1.width;
        const obj1HitHeight = obj1.hitboxHeight || obj1.height;

        const obj2HitX = obj2.x + (obj2.hitboxOffsetX || 0);
        const obj2HitY = obj2.y + (obj2.hitboxOffsetY || 0);
        const obj2HitWidth = obj2.hitboxWidth || obj2.width;
        const obj2HitHeight = obj2.hitboxHeight || obj2.height;

        return obj1HitX < obj2HitX + obj2HitWidth &&
            obj1HitX + obj1HitWidth > obj2HitX &&
            obj1HitY < obj2HitY + obj2HitHeight &&
            obj1HitY + obj1HitHeight > obj2HitY;
    }

    // パーティクル生成
    function createParticles(x, y, color, count = 10) {
        for (let i = 0; i < count; i++) {
            particles.push({
                x: x,
                y: y,
                vx: (Math.random() - 0.5) * 10,
                vy: (Math.random() - 0.5) * 10,
                life: 1.0,
                decay: 0.02,
                color: color,
                size: Math.random() * 4 + 2
            });
        }
    }

    // プレイヤー移動更新
    function updatePlayerMovement(deltaTime) {
        if (!player.isMoving) return;

        const dx = player.targetX - player.x;
        const dy = player.targetY - player.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < 2) {
            player.x = player.targetX;
            player.y = player.targetY;
            player.isMoving = false;
            target.visible = false;
        } else {
            const moveDistance = player.speed * deltaTime;
            const ratio = Math.min(moveDistance / distance, 1);

            player.x += dx * ratio;
            player.y += dy * ratio;
        }
    }

    // 攻撃モード更新
    function updateAttackMode() {
        if (!player.attackMode) return;

        player.attackGauge--;
        if (player.attackGauge <= 0) {
            player.attackMode = false;
            player.attackGauge = 0;
        }
    }

    // ゲーム更新
    function updateGame() {
        if (!gameRunning || gameFramework.isPaused) return;

        const now = Date.now();
        const deltaTime = (now - (lastUpdateTime || now)) / 1000;
        lastUpdateTime = now;

        currentTime = (now - startTime) / 1000;

        updatePlayerMovement(deltaTime);
        updateAttackMode();

        const settings = difficultySettings[difficulty];
        if (Math.random() < settings.spawnRate) {
            spawnObstacle();
        }
        spawnPowerup();

        // 障害物の更新
        for (let i = obstacles.length - 1; i >= 0; i--) {
            const obstacle = obstacles[i];
            obstacle.y += obstacle.speed;
            obstacle.rotation += obstacle.rotationSpeed;

            if (obstacle.y > canvasHeight) {
                obstacles.splice(i, 1);
                score += 10;
                continue;
            }

            if (checkCollision(player, obstacle)) {
                if (player.attackMode) {
                    createParticles(obstacle.x + obstacle.width / 2, obstacle.y + obstacle.height / 2, '#ff6600', 20);
                    obstacles.splice(i, 1);
                    score += obstacle.type === 'asteroid' ? 50 : 75;
                } else {
                    createParticles(player.x + player.width / 2, player.y + player.height / 2, '#ff0000', 20);
                    gameFramework.gameOver();
                    return;
                }
            }
        }

        // パワーアップの更新
        for (let i = powerups.length - 1; i >= 0; i--) {
            const powerup = powerups[i];
            powerup.y += powerup.speed;
            powerup.pulse += 0.2;

            if (powerup.y > canvasHeight) {
                powerups.splice(i, 1);
                continue;
            }

            if (checkCollision(player, powerup)) {
                createParticles(powerup.x + powerup.width / 2, powerup.y + powerup.height / 2, '#00ffff', 15);
                powerups.splice(i, 1);
                energyCount++;
                score += 100;

                if (energyCount >= 10 && !player.attackMode) {
                    energyCount -= 10;
                    player.attackMode = true;
                    player.attackGauge = player.maxAttackGauge;
                    createParticles(player.x + player.width / 2, player.y + player.height / 2, '#ff0000', 25);
                }
            }
        }

        // パーティクルの更新
        for (let i = particles.length - 1; i >= 0; i--) {
            const particle = particles[i];
            particle.x += particle.vx;
            particle.y += particle.vy;
            particle.life -= particle.decay;

            if (particle.life <= 0) {
                particles.splice(i, 1);
            }
        }

        // 星の更新
        stars.forEach(star => {
            star.y += star.speed;
            if (star.y > canvasHeight) {
                star.y = -5;
                star.x = Math.random() * canvasWidth;
            }
        });

        score += Math.floor(currentTime / 10);

        if (target.visible && (now - target.lastUpdate) > 3000) {
            target.visible = false;
        }

        updateStats();
        drawGame();
    }

    // 統計更新
    function updateStats() {
        document.getElementById('score').textContent = score;
        document.getElementById('survivalTime').textContent = currentTime.toFixed(1) + 's';
        document.getElementById('energyCount').textContent = energyCount;

        if (score > sessionHighScore) {
            sessionHighScore = score;
            sessionHighTime = currentTime;
            sessionHighEnergy = energyCount;
            document.getElementById('sessionHigh').textContent = sessionHighScore;
            document.getElementById('sessionTime').textContent = sessionHighTime.toFixed(1);
            document.getElementById('sessionEnergy').textContent = sessionHighEnergy;
        }
    }

    // ゲーム描画
    function drawGame() {
        // 背景クリア
        const gradient = ctx.createLinearGradient(0, 0, 0, canvasHeight);
        gradient.addColorStop(0, '#000428');
        gradient.addColorStop(0.5, '#1a1a2e');
        gradient.addColorStop(1, '#16213e');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);

        // 星空描画
        stars.forEach(star => {
            ctx.fillStyle = `rgba(255, 255, 255, ${star.brightness})`;
            ctx.beginPath();
            ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
            ctx.fill();
        });

        // プレイヤー描画
        ctx.save();

        if (player.attackMode) {
            const auraSize = player.width + 20 + Math.sin(Date.now() / 100) * 5;
            const gradient = ctx.createRadialGradient(
                player.x + player.width / 2, player.y + player.height / 2, 0,
                player.x + player.width / 2, player.y + player.height / 2, auraSize / 2
            );
            gradient.addColorStop(0, 'rgba(255, 100, 0, 0.3)');
            gradient.addColorStop(0.7, 'rgba(255, 0, 0, 0.2)');
            gradient.addColorStop(1, 'rgba(255, 0, 0, 0)');
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(player.x + player.width / 2, player.y + player.height / 2, auraSize / 2, 0, Math.PI * 2);
            ctx.fill();
        }

        const playerImg = gameImages['spaceship'];
        if (playerImg && playerImg.complete) {
            ctx.drawImage(playerImg, player.x, player.y, player.width, player.height);
        } else {
            ctx.fillStyle = player.attackMode ? '#ff4500' : '#4a90e2';
            ctx.beginPath();
            ctx.moveTo(player.x + player.width / 2, player.y);
            ctx.lineTo(player.x, player.y + player.height);
            ctx.lineTo(player.x + player.width, player.y + player.height);
            ctx.closePath();
            ctx.fill();
        }

        ctx.restore();

        if (showHitboxes) {
            ctx.strokeStyle = '#00ff00';
            ctx.lineWidth = 2;
            ctx.strokeRect(
                player.x + player.hitboxOffsetX,
                player.y + player.hitboxOffsetY,
                player.hitboxWidth,
                player.hitboxHeight
            );
        }

        // 障害物描画
        obstacles.forEach(obstacle => {
            ctx.save();
            ctx.translate(obstacle.x + obstacle.width / 2, obstacle.y + obstacle.height / 2);
            ctx.rotate(obstacle.rotation);

            const img = gameImages[obstacle.type];
            if (img && img.complete) {
                ctx.drawImage(img, -obstacle.width / 2, -obstacle.height / 2, obstacle.width, obstacle.height);
            } else {
                ctx.fillStyle = obstacle.type === 'asteroid' ? '#8b4513' : '#dc143c';
                ctx.beginPath();
                ctx.arc(0, 0, obstacle.width / 2, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.restore();

            if (showHitboxes) {
                ctx.strokeStyle = '#ff0000';
                ctx.lineWidth = 2;
                ctx.strokeRect(
                    obstacle.x + obstacle.hitboxOffsetX,
                    obstacle.y + obstacle.hitboxOffsetY,
                    obstacle.hitboxWidth,
                    obstacle.hitboxHeight
                );
            }
        });

        // パワーアップ描画
        powerups.forEach(powerup => {
            ctx.save();
            ctx.translate(powerup.x + powerup.width / 2, powerup.y + powerup.height / 2);

            const pulseFactor = 1 + Math.sin(powerup.pulse) * 0.2;
            ctx.scale(pulseFactor, pulseFactor);

            const img = gameImages['powerup'];
            if (img && img.complete) {
                ctx.drawImage(img, -powerup.width / 2, -powerup.height / 2, powerup.width, powerup.height);
            } else {
                const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, powerup.width / 2);
                gradient.addColorStop(0, '#00ffff');
                gradient.addColorStop(0.7, '#0080ff');
                gradient.addColorStop(1, '#004080');
                ctx.fillStyle = gradient;
                ctx.beginPath();
                ctx.arc(0, 0, powerup.width / 2, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.restore();

            if (showHitboxes) {
                ctx.strokeStyle = '#00ffff';
                ctx.lineWidth = 2;
                ctx.strokeRect(
                    powerup.x + powerup.hitboxOffsetX,
                    powerup.y + powerup.hitboxOffsetY,
                    powerup.hitboxWidth,
                    powerup.hitboxHeight
                );
            }
        });

        // パーティクル描画
        particles.forEach(particle => {
            ctx.save();
            ctx.globalAlpha = particle.life;
            ctx.fillStyle = particle.color;
            ctx.beginPath();
            ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        });

        // 攻撃ゲージ描画
        if (player.attackMode) {
            const gaugeX = player.x + player.width / 2 - 30;
            const gaugeY = player.y - 15;
            const gaugeWidth = 60;
            const gaugeHeight = 6;
            const progress = player.attackGauge / player.maxAttackGauge;

            ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            ctx.fillRect(gaugeX - 1, gaugeY - 1, gaugeWidth + 2, gaugeHeight + 2);

            ctx.fillStyle = progress > 0.3 ? '#ff4500' : '#ff0000';
            ctx.fillRect(gaugeX, gaugeY, gaugeWidth * progress, gaugeHeight);

            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1;
            ctx.strokeRect(gaugeX, gaugeY, gaugeWidth, gaugeHeight);

            ctx.fillStyle = '#ffffff';
            ctx.font = '10px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('ATTACK', player.x + player.width / 2, gaugeY - 3);
        }

        // ターゲット描画
        if (target.visible) {
            const crossSize = 12;
            const crossThickness = 2;

            ctx.strokeStyle = '#00ff00';
            ctx.lineWidth = crossThickness;
            ctx.lineCap = 'round';

            ctx.beginPath();
            ctx.moveTo(target.x, target.y - crossSize);
            ctx.lineTo(target.x, target.y + crossSize);
            ctx.stroke();

            ctx.beginPath();
            ctx.moveTo(target.x - crossSize, target.y);
            ctx.lineTo(target.x + crossSize, target.y);
            ctx.stroke();

            ctx.fillStyle = '#00ff00';
            ctx.beginPath();
            ctx.arc(target.x, target.y, 2, 0, Math.PI * 2);
            ctx.fill();
        }

        // 一時停止表示
        if (gameFramework.isPaused) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            ctx.fillRect(0, 0, canvasWidth, canvasHeight);
            ctx.fillStyle = '#00ffff';
            ctx.font = '48px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('PAUSED', canvasWidth / 2, canvasHeight / 2);
            ctx.textAlign = 'left';
        }
    }

    // 初期化
    function init() {
        document.getElementById('highScore').textContent = highScore;

        loadImages();
        generateStars();
        setupEventListeners();
        drawGame();
    }

    // ゲームフレームワーク設定
    const gameFramework = new GameFramework({
        requiresImageLoading: true,
        startButtonText: '🚀 ゲーム開始',
        onGameStart: onGameStart,
        onGameOver: onGameOver,
        onGameReset: onGameReset,
        gameUpdateFunction: updateGame,
        gameSpeed: 16
    });

    // グローバル関数として公開（テンプレートとの互換性のため）
    window.toggleHitboxes = toggleHitboxes;
    window.startGame = () => gameFramework.startGame();
    window.pauseGame = () => gameFramework.togglePause();
    window.resetGame = () => gameFramework.resetGame();

    // ページ読み込み時に初期化
    window.addEventListener('load', init);
})();
