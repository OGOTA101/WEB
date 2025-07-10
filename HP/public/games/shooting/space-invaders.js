// スペースインベーダーゲーム
(function () {
    // キャンバス設定
    const canvas = document.getElementById('game-canvas');
    if (!canvas) {
        console.error('Canvas element not found');
        return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) {
        console.error('Could not get 2D context');
        return;
    }

    const canvasWidth = 800;
    const canvasHeight = 600;

    // Canvasサイズを設定
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;

    // ゲーム状態
    let gameState = 'menu'; // menu, playing, paused, gameOver, waveComplete
    let score = 0;
    let lives = 3;
    let wave = 1;
    let highScore = localStorage.getItem('spaceInvadersHighScore') || 0;
    let difficulty = 'easy';

    // プレイヤー
    let player = {
        x: canvasWidth / 2 - 20,
        y: canvasHeight - 60,
        width: 40,
        height: 30,
        speed: 150, // よりクラシックな速度に
        canShoot: true,
        shootCooldown: 0
    };

    // ゲームオブジェクト
    let playerBullets = [];
    let enemies = [];
    let enemyBullets = [];
    let barriers = [];
    let particles = [];
    let stars = [];
    let ufo = null;
    let ufoSpawnTimer = 0;

    // 敵の設定（より本格的なインベーダー風に）
    const enemyTypes = {
        easy: { rows: 5, cols: 10, speed: 800, shootChance: 0.0003 },
        normal: { rows: 5, cols: 11, speed: 600, shootChance: 0.0005 },
        hard: { rows: 6, cols: 11, speed: 400, shootChance: 0.0008 },
        extreme: { rows: 6, cols: 11, speed: 300, shootChance: 0.001 }
    };

    // アニメーション用
    let lastTime = 0;
    let enemyDirection = 1; // 1: 右, -1: 左
    let enemyMoveTimer = 0;

    // 入力状態
    let keys = {};
    let touches = {};

    // 星空背景生成
    function generateStars() {
        stars = [];
        for (let i = 0; i < 150; i++) {
            stars.push({
                x: Math.random() * canvasWidth,
                y: Math.random() * canvasHeight,
                size: Math.random() * 2 + 0.5,
                brightness: Math.random() * 0.8 + 0.2,
                twinkle: Math.random() * 0.02 + 0.01
            });
        }
    }

    // 敵の初期化
    function createEnemies() {
        enemies = [];
        const config = enemyTypes[difficulty];
        const enemyWidth = 30;
        const enemyHeight = 25;
        const spacingX = 50;
        const spacingY = 40;
        const startX = (canvasWidth - (config.cols * spacingX)) / 2;
        const startY = 80;

        for (let row = 0; row < config.rows; row++) {
            for (let col = 0; col < config.cols; col++) {
                let type = 'small';
                let points = 10;
                if (row === 0) {
                    type = 'large';
                    points = 30;
                } else if (row <= 2) {
                    type = 'medium';
                    points = 20;
                }

                enemies.push({
                    x: startX + col * spacingX,
                    y: startY + row * spacingY,
                    width: enemyWidth,
                    height: enemyHeight,
                    type: type,
                    points: points,
                    animFrame: 0,
                    alive: true
                });
            }
        }
    }

    // バリア生成
    function createBarriers() {
        barriers = [];
        const barrierCount = 4;
        const barrierWidth = 80;
        const barrierHeight = 60;
        const spacing = (canvasWidth - (barrierCount * barrierWidth)) / (barrierCount + 1);

        for (let i = 0; i < barrierCount; i++) {
            const barrier = {
                x: spacing + i * (barrierWidth + spacing),
                y: canvasHeight - 180,
                width: barrierWidth,
                height: barrierHeight,
                blocks: []
            };

            // バリアブロック生成
            const blockSize = 4;
            const blocksX = Math.floor(barrierWidth / blockSize);
            const blocksY = Math.floor(barrierHeight / blockSize);

            for (let by = 0; by < blocksY; by++) {
                barrier.blocks[by] = [];
                for (let bx = 0; bx < blocksX; bx++) {
                    // バリアの形状を作る
                    const centerX = blocksX / 2;
                    const centerY = blocksY / 2;
                    const distanceFromCenter = Math.sqrt(Math.pow(bx - centerX, 2) + Math.pow(by - centerY, 2));
                    const maxDistance = Math.min(centerX, centerY) * 0.8;

                    // 下部に隙間を作る
                    const hasGap = by > blocksY * 0.7 && Math.abs(bx - centerX) < blocksX * 0.3;

                    barrier.blocks[by][bx] = !hasGap && distanceFromCenter < maxDistance;
                }
            }
            barriers.push(barrier);
        }
    }

    // パーティクル生成
    function createParticles(x, y, color, count = 10) {
        for (let i = 0; i < count; i++) {
            particles.push({
                x: x,
                y: y,
                vx: (Math.random() - 0.5) * 200,
                vy: (Math.random() - 0.5) * 200,
                life: 1,
                decay: Math.random() * 0.02 + 0.01,
                color: color,
                size: Math.random() * 3 + 1
            });
        }
    }

    // UFO生成
    function spawnUFO() {
        if (ufo) return; // 既にUFOがいる場合はスポーンしない

        const direction = Math.random() > 0.5 ? 1 : -1;
        ufo = {
            x: direction === 1 ? -60 : canvasWidth + 60,
            y: 50,
            width: 60,
            height: 30,
            speed: 80 * direction,
            points: 500,
            alive: true
        };

        // UFO音響効果
        if (window.audioSystem && typeof window.audioSystem.play === 'function') {
            try {
                window.audioSystem.play('ufo');
            } catch (e) {
                console.warn('Failed to play UFO sound:', e);
            }
        }
    }

    // UFO更新
    function updateUFO(deltaTime) {
        if (!ufo) return;

        ufo.x += ufo.speed * deltaTime;

        // 画面外に出たらUFOを削除
        if (ufo.x < -100 || ufo.x > canvasWidth + 100) {
            ufo = null;
        }
    }

    // プレイヤーの弾発射
    function shootPlayerBullet() {
        if (player.canShoot && player.shootCooldown <= 0) {
            playerBullets.push({
                x: player.x + player.width / 2 - 2,
                y: player.y,
                width: 4,
                height: 10,
                speed: 300  // よりクラシックな速度に
            });
            player.canShoot = false;
            player.shootCooldown = 300; // 300ms cooldown

            // 音響効果
            if (window.audioSystem && typeof window.audioSystem.play === 'function') {
                try {
                    window.audioSystem.play('laser');
                } catch (e) {
                    console.warn('Failed to play laser sound:', e);
                }
            }
        }
    }

    // 敵の弾発射
    function shootEnemyBullet(enemy) {
        enemyBullets.push({
            x: enemy.x + enemy.width / 2 - 3,
            y: enemy.y + enemy.height,
            width: 6,
            height: 8,
            speed: 100  // よりクラシックな速度に
        });
    }

    // 衝突判定
    function checkCollision(rect1, rect2) {
        return rect1.x < rect2.x + rect2.width &&
            rect1.x + rect1.width > rect2.x &&
            rect1.y < rect2.y + rect2.height &&
            rect1.y + rect1.height > rect2.y;
    }

    // バリアとの衝突判定
    function checkBarrierCollision(bullet) {
        for (let barrier of barriers) {
            if (checkCollision(bullet, barrier)) {
                const blockSize = 4;
                const relativeX = bullet.x - barrier.x;
                const relativeY = bullet.y - barrier.y;
                const blockX = Math.floor(relativeX / blockSize);
                const blockY = Math.floor(relativeY / blockSize);

                if (blockY >= 0 && blockY < barrier.blocks.length &&
                    blockX >= 0 && blockX < barrier.blocks[blockY].length &&
                    barrier.blocks[blockY][blockX]) {

                    // バリアブロックを破壊
                    const destroyRadius = 2;
                    for (let dy = -destroyRadius; dy <= destroyRadius; dy++) {
                        for (let dx = -destroyRadius; dx <= destroyRadius; dx++) {
                            const targetY = blockY + dy;
                            const targetX = blockX + dx;
                            if (targetY >= 0 && targetY < barrier.blocks.length &&
                                targetX >= 0 && targetX < barrier.blocks[targetY].length) {
                                barrier.blocks[targetY][targetX] = false;
                            }
                        }
                    }

                    createParticles(bullet.x, bullet.y, 'yellow', 5);
                    return true;
                }
            }
        }
        return false;
    }

    // ゲーム更新
    function update(deltaTime) {
        if (gameState !== 'playing') return;

        // プレイヤー更新
        if (keys['ArrowLeft'] || keys['a'] || keys['A']) {
            player.x -= player.speed * deltaTime;
        }
        if (keys['ArrowRight'] || keys['d'] || keys['D']) {
            player.x += player.speed * deltaTime;
        }
        if (keys[' '] || keys['Space']) {
            shootPlayerBullet();
        }

        // プレイヤー境界チェック
        player.x = Math.max(0, Math.min(canvasWidth - player.width, player.x));

        // 射撃クールダウン
        if (player.shootCooldown > 0) {
            player.shootCooldown -= deltaTime * 1000;
            if (player.shootCooldown <= 0) {
                player.canShoot = true;
            }
        }

        // プレイヤーの弾更新
        for (let i = playerBullets.length - 1; i >= 0; i--) {
            const bullet = playerBullets[i];
            bullet.y -= bullet.speed * deltaTime;

            // 画面外チェック
            if (bullet.y < 0) {
                playerBullets.splice(i, 1);
                continue;
            }

            // バリア衝突チェック
            if (checkBarrierCollision(bullet)) {
                playerBullets.splice(i, 1);
                continue;
            }

            // UFOとの衝突チェック
            if (ufo && ufo.alive && checkCollision(bullet, ufo)) {
                score += ufo.points;
                createParticles(ufo.x + ufo.width / 2, ufo.y + ufo.height / 2, 'gold', 12);
                ufo = null;
                playerBullets.splice(i, 1);

                // UFO破壊音
                if (window.audioSystem && typeof window.audioSystem.play === 'function') {
                    try {
                        window.audioSystem.play('ufo-destroy');
                    } catch (e) {
                        console.warn('Failed to play UFO destroy sound:', e);
                    }
                }
                continue;
            }

            // 敵との衝突チェック
            for (let j = enemies.length - 1; j >= 0; j--) {
                const enemy = enemies[j];
                if (enemy.alive && checkCollision(bullet, enemy)) {
                    // 敵を破壊
                    enemy.alive = false;
                    score += enemy.points;
                    createParticles(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, 'red', 8);
                    playerBullets.splice(i, 1);

                    // 音響効果
                    if (window.audioSystem && typeof window.audioSystem.play === 'function') {
                        try {
                            window.audioSystem.play('explosion');
                        } catch (e) {
                            console.warn('Failed to play explosion sound:', e);
                        }
                    }
                    break;
                }
            }
        }

        // 敵の弾更新
        for (let i = enemyBullets.length - 1; i >= 0; i--) {
            const bullet = enemyBullets[i];
            bullet.y += bullet.speed * deltaTime;

            // 画面外チェック
            if (bullet.y > canvasHeight) {
                enemyBullets.splice(i, 1);
                continue;
            }

            // バリア衝突チェック
            if (checkBarrierCollision(bullet)) {
                enemyBullets.splice(i, 1);
                continue;
            }

            // プレイヤーとの衝突チェック
            if (checkCollision(bullet, player)) {
                enemyBullets.splice(i, 1);
                lives--;
                createParticles(player.x + player.width / 2, player.y + player.height / 2, 'blue', 12);

                // 音響効果
                if (window.audioSystem && typeof window.audioSystem.play === 'function') {
                    try {
                        window.audioSystem.play('damage');
                    } catch (e) {
                        console.warn('Failed to play damage sound:', e);
                    }
                }

                if (lives <= 0) {
                    gameOver();
                }
            }
        }

        // 敵の移動
        enemyMoveTimer += deltaTime * 1000;
        if (enemyMoveTimer >= enemyTypes[difficulty].speed) {
            enemyMoveTimer = 0;
            moveEnemies();
        }

        // 敵の射撃
        const aliveEnemies = enemies.filter(e => e.alive);
        for (let enemy of aliveEnemies) {
            if (Math.random() < enemyTypes[difficulty].shootChance) {
                shootEnemyBullet(enemy);
            }
        }

        // パーティクル更新
        for (let i = particles.length - 1; i >= 0; i--) {
            const particle = particles[i];
            particle.x += particle.vx * deltaTime;
            particle.y += particle.vy * deltaTime;
            particle.life -= particle.decay;

            if (particle.life <= 0) {
                particles.splice(i, 1);
            }
        }

        // 星の点滅
        for (let star of stars) {
            star.brightness += star.twinkle * (Math.random() - 0.5);
            star.brightness = Math.max(0.1, Math.min(1, star.brightness));
        }

        // UFOシステム
        ufoSpawnTimer += deltaTime * 1000;
        if (ufoSpawnTimer >= 15000 && Math.random() < 0.01 && !ufo) {
            spawnUFO();
            ufoSpawnTimer = 0;
        }
        updateUFO(deltaTime);

        // ウェーブクリアチェック
        if (aliveEnemies.length === 0) {
            nextWave();
        }

        // 敵が下まで来たかチェック
        for (let enemy of aliveEnemies) {
            if (enemy.y + enemy.height >= player.y) {
                gameOver();
                break;
            }
        }

        updateUI();
    }

    // 敵の移動
    function moveEnemies() {
        let shouldDrop = false;
        const aliveEnemies = enemies.filter(e => e.alive);

        // 端に到達したかチェック
        for (let enemy of aliveEnemies) {
            if ((enemyDirection > 0 && enemy.x + enemy.width >= canvasWidth - 10) ||
                (enemyDirection < 0 && enemy.x <= 10)) {
                shouldDrop = true;
                break;
            }
        }

        if (shouldDrop) {
            // 方向転換して下降
            enemyDirection *= -1;
            for (let enemy of aliveEnemies) {
                enemy.y += 20;
            }
        } else {
            // 横移動
            for (let enemy of aliveEnemies) {
                enemy.x += enemyDirection * 15;
                enemy.animFrame = (enemy.animFrame + 1) % 2;
            }
        }
    }

    // 次のウェーブ
    function nextWave() {
        wave++;
        gameState = 'waveComplete';

        // 音響効果
        if (window.audioSystem && typeof window.audioSystem.play === 'function') {
            try {
                window.audioSystem.play('levelup');
            } catch (e) {
                console.warn('Failed to play levelup sound:', e);
            }
        }

        // 2秒後に次のウェーブを開始
        setTimeout(() => {
            createEnemies();
            createBarriers();
            gameState = 'playing';
            // UFOタイマーをリセット
            ufoSpawnTimer = 0;
            ufo = null;
        }, 2000);
    }

    // 描画
    function draw() {
        // 背景クリア
        ctx.fillStyle = 'rgba(0, 4, 40, 0.1)';
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);

        // 星空描画
        for (let star of stars) {
            ctx.fillStyle = `rgba(255, 255, 255, ${star.brightness})`;
            ctx.fillRect(star.x, star.y, star.size, star.size);
        }

        if (gameState === 'playing' || gameState === 'paused') {
            // プレイヤー描画
            ctx.fillStyle = '#00ff00';
            ctx.fillRect(player.x, player.y, player.width, player.height);
            // プレイヤーの形状を詳細に
            ctx.fillStyle = '#00cc00';
            ctx.fillRect(player.x + 5, player.y - 5, 30, 10);
            ctx.fillRect(player.x + 15, player.y - 10, 10, 10);

            // 敵描画
            for (let enemy of enemies) {
                if (enemy.alive) {
                    let color = '#ff4444';
                    if (enemy.type === 'medium') color = '#ff8844';
                    if (enemy.type === 'large') color = '#ff0044';

                    ctx.fillStyle = color;
                    ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);

                    // 敵の詳細描画
                    ctx.fillStyle = enemy.animFrame === 0 ? '#fff' : '#ccc';
                    ctx.fillRect(enemy.x + 5, enemy.y + 5, 20, 15);
                    ctx.fillRect(enemy.x + 10, enemy.y + 2, 10, 8);
                }
            }

            // バリア描画
            ctx.fillStyle = '#00ff00';
            for (let barrier of barriers) {
                const blockSize = 4;
                for (let by = 0; by < barrier.blocks.length; by++) {
                    for (let bx = 0; bx < barrier.blocks[by].length; bx++) {
                        if (barrier.blocks[by][bx]) {
                            ctx.fillRect(
                                barrier.x + bx * blockSize,
                                barrier.y + by * blockSize,
                                blockSize,
                                blockSize
                            );
                        }
                    }
                }
            }

            // プレイヤーの弾描画
            ctx.fillStyle = '#00ff00';
            for (let bullet of playerBullets) {
                ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
            }

            // 敵の弾描画
            ctx.fillStyle = '#ff4444';
            for (let bullet of enemyBullets) {
                ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
            }

            // UFO描画
            if (ufo && ufo.alive) {
                // UFOの本体
                ctx.fillStyle = '#ffff00';
                ctx.fillRect(ufo.x, ufo.y, ufo.width, ufo.height);

                // UFOの詳細
                ctx.fillStyle = '#ffcc00';
                ctx.fillRect(ufo.x + 5, ufo.y + 5, ufo.width - 10, ufo.height - 10);

                // UFOのライト
                ctx.fillStyle = '#ffffff';
                for (let i = 0; i < 3; i++) {
                    ctx.fillRect(ufo.x + 15 + i * 15, ufo.y + ufo.height - 8, 6, 4);
                }

                // スコア表示
                ctx.fillStyle = '#ffff00';
                ctx.font = '14px Arial';
                ctx.textAlign = 'center';
                ctx.fillText(ufo.points.toString(), ufo.x + ufo.width / 2, ufo.y - 5);
            }

            // パーティクル描画
            for (let particle of particles) {
                ctx.fillStyle = particle.color;
                ctx.globalAlpha = particle.life;
                ctx.fillRect(particle.x, particle.y, particle.size, particle.size);
                ctx.globalAlpha = 1;
            }

            // ポーズ画面
            if (gameState === 'paused') {
                ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
                ctx.fillRect(0, 0, canvasWidth, canvasHeight);
                ctx.fillStyle = '#00ff00';
                ctx.font = '48px Arial';
                ctx.textAlign = 'center';
                ctx.fillText('PAUSED', canvasWidth / 2, canvasHeight / 2);
                ctx.font = '24px Arial';
                ctx.fillText('Press P to resume', canvasWidth / 2, canvasHeight / 2 + 60);
            }
        }

        // ゲームオーバー画面（キャンバス内）
        if (gameState === 'gameOver') {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
            ctx.fillRect(0, 0, canvasWidth, canvasHeight);

            ctx.fillStyle = '#ff0000';
            ctx.font = '64px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('GAME OVER', canvasWidth / 2, canvasHeight / 2 - 80);

            ctx.fillStyle = '#ffffff';
            ctx.font = '24px Arial';
            ctx.fillText(`スコア: ${score}`, canvasWidth / 2, canvasHeight / 2 - 20);
            ctx.fillText(`到達ウェーブ: ${wave}`, canvasWidth / 2, canvasHeight / 2 + 20);

            if (score > parseInt(localStorage.getItem('spaceInvadersHighScore') || '0')) {
                ctx.fillStyle = '#ffd700';
                ctx.fillText('🏆 新記録達成！', canvasWidth / 2, canvasHeight / 2 + 60);
            }

            ctx.fillStyle = '#00ff00';
            ctx.font = '18px Arial';
            ctx.fillText('クリックでリスタート', canvasWidth / 2, canvasHeight / 2 + 120);
        }

        // ウェーブクリア画面
        if (gameState === 'waveComplete') {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            ctx.fillRect(0, 0, canvasWidth, canvasHeight);

            ctx.fillStyle = '#00ff00';
            ctx.font = '48px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('WAVE COMPLETE!', canvasWidth / 2, canvasHeight / 2 - 40);

            ctx.fillStyle = '#ffffff';
            ctx.font = '24px Arial';
            ctx.fillText(`ウェーブ ${wave - 1} クリア！`, canvasWidth / 2, canvasHeight / 2 + 20);
            ctx.fillText('次のウェーブを準備中...', canvasWidth / 2, canvasHeight / 2 + 60);
        }

        // メニュー画面
        if (gameState === 'menu') {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
            ctx.fillRect(0, 0, canvasWidth, canvasHeight);

            ctx.fillStyle = '#00ff00';
            ctx.font = '32px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('SPACE INVADERS', canvasWidth / 2, canvasHeight / 2 - 60);

            ctx.fillStyle = '#ffffff';
            ctx.font = '18px Arial';
            ctx.fillText('クリックでゲーム開始', canvasWidth / 2, canvasHeight / 2 + 40);
        }
    }

    // UI更新
    function updateUI() {
        // 新しい統合UIの要素を更新
        const scoreElement = document.getElementById('score');
        const levelElement = document.getElementById('level');
        const livesElement = document.getElementById('lives');
        const killsElement = document.getElementById('kills');

        if (scoreElement) scoreElement.textContent = score;
        if (levelElement) levelElement.textContent = wave;
        if (livesElement) livesElement.textContent = lives;
        if (killsElement) {
            const aliveEnemies = enemies.filter(e => e.alive).length;
            const totalEnemies = enemies.length;
            killsElement.textContent = totalEnemies - aliveEnemies;
        }
    }

    // ゲームオーバー
    function gameOver() {
        gameState = 'gameOver';

        // ハイスコア更新
        if (score > highScore) {
            highScore = score;
            localStorage.setItem('spaceInvadersHighScore', highScore);
        }

        // コイン獲得
        awardCoins();

        // 最終スコアの表示
        const finalScoreElement = document.getElementById('finalScore');
        const finalLevelElement = document.getElementById('finalLevel');
        const finalKillsElement = document.getElementById('finalKills');
        const gameOverScreen = document.getElementById('gameOverScreen');

        if (finalScoreElement) finalScoreElement.textContent = score;
        if (finalLevelElement) finalLevelElement.textContent = wave;
        if (finalKillsElement) {
            const aliveEnemies = enemies.filter(e => e.alive).length;
            const totalEnemies = enemies.length;
            finalKillsElement.textContent = totalEnemies - aliveEnemies;
        }
        if (gameOverScreen) gameOverScreen.style.display = 'flex';

        // 音響効果
        if (window.audioSystem && typeof window.audioSystem.play === 'function') {
            try {
                window.audioSystem.play('gameover');
            } catch (e) {
                console.warn('Failed to play gameover sound:', e);
            }
        }
    }

    // コイン獲得
    function awardCoins() {
        let goldCoins = 0;
        let silverCoins = 0;
        let bronzeCoins = 0;

        // スコアベースでコイン計算
        if (score >= 5000) goldCoins += Math.floor(score / 5000);
        if (score >= 1000) silverCoins += Math.floor(score / 1000);
        if (score >= 100) bronzeCoins += Math.floor(score / 100);

        // ウェーブボーナス
        if (wave >= 5) goldCoins += 1;
        if (wave >= 3) silverCoins += 1;
        if (wave >= 2) bronzeCoins += 1;

        // 保存
        const currentGold = parseInt(localStorage.getItem('goldCoins') || '0');
        const currentSilver = parseInt(localStorage.getItem('silverCoins') || '0');
        const currentBronze = parseInt(localStorage.getItem('bronzeCoins') || '0');

        localStorage.setItem('goldCoins', currentGold + goldCoins);
        localStorage.setItem('silverCoins', currentSilver + silverCoins);
        localStorage.setItem('bronzeCoins', currentBronze + bronzeCoins);

        // 表示更新（要素が存在する場合のみ）
        const goldElement = document.getElementById('goldCoins');
        const silverElement = document.getElementById('silverCoins');
        const bronzeElement = document.getElementById('bronzeCoins');

        if (goldElement) goldElement.textContent = currentGold + goldCoins;
        if (silverElement) silverElement.textContent = currentSilver + silverCoins;
        if (bronzeElement) bronzeElement.textContent = currentBronze + bronzeCoins;
    }

    // ゲーム開始
    function startGame() {
        gameState = 'playing';
        score = 0;
        lives = 3;
        wave = 1;
        playerBullets = [];
        enemyBullets = [];
        particles = [];
        ufo = null;
        ufoSpawnTimer = 0;

        player.x = canvasWidth / 2 - 20;
        player.canShoot = true;
        player.shootCooldown = 0;

        createEnemies();
        createBarriers();

        // HTML要素の制御（存在する場合のみ）
        const startScreen = document.getElementById('startScreen');
        const gameOverScreen = document.getElementById('gameOverScreen');
        const pauseBtn = document.getElementById('pauseBtn');

        if (startScreen) startScreen.style.display = 'none';
        if (gameOverScreen) gameOverScreen.style.display = 'none';
        if (pauseBtn) pauseBtn.style.display = 'inline-block';

        updateUI();
    }

    // ゲームリスタート
    function restartGame() {
        startGame();
    }

    // ゲームループ
    function gameLoop(currentTime) {
        const deltaTime = (currentTime - lastTime) / 1000;
        lastTime = currentTime;

        update(deltaTime);
        draw();

        requestAnimationFrame(gameLoop);
    }

    // イベントリスナー
    function setupEventListeners() {
        // キーボード
        document.addEventListener('keydown', (e) => {
            keys[e.key] = true;
            if (e.key === 'p' || e.key === 'P') {
                if (gameState === 'playing') {
                    gameState = 'paused';
                } else if (gameState === 'paused') {
                    gameState = 'playing';
                }
            }
            e.preventDefault();
        });

        document.addEventListener('keyup', (e) => {
            keys[e.key] = false;
        });

        // ボタン（要素が存在する場合のみ）
        const startBtnElement = document.getElementById('startBtn');
        const pauseBtnElement = document.getElementById('pauseBtn');
        const restartBtnElement = document.getElementById('restartBtn');
        const startGameElement = document.getElementById('startGame');
        const restartGameElement = document.getElementById('restartGame');
        const instructionsToggleElement = document.getElementById('instructionsToggle');

        if (startBtnElement) startBtnElement.addEventListener('click', startGame);
        if (pauseBtnElement) pauseBtnElement.addEventListener('click', () => {
            gameState = gameState === 'playing' ? 'paused' : 'playing';
        });
        if (restartBtnElement) restartBtnElement.addEventListener('click', restartGame);
        if (startGameElement) startGameElement.addEventListener('click', startGame);
        if (restartGameElement) restartGameElement.addEventListener('click', restartGame);
        if (instructionsToggleElement) instructionsToggleElement.addEventListener('click', () => {
            const instructionsElement = document.getElementById('instructions');
            if (instructionsElement) {
                instructionsElement.style.display = instructionsElement.style.display === 'none' ? 'block' : 'none';
            }
        });

        // 難易度選択
        document.querySelectorAll('.difficulty-btn').forEach(btn => {
            btn.addEventListener('click', function () {
                document.querySelectorAll('.difficulty-btn').forEach(b => b.classList.remove('active'));
                this.classList.add('active');
                difficulty = this.dataset.difficulty;
            });
        });

        // タッチ操作
        canvas.addEventListener('touchstart', handleTouch, { passive: false });
        canvas.addEventListener('touchmove', handleTouch, { passive: false });
        canvas.addEventListener('touchend', handleTouchEnd, { passive: false });
        canvas.addEventListener('click', handleClick);

        // モバイルコントロール
        const leftBtn = document.getElementById('leftBtn');
        const rightBtn = document.getElementById('rightBtn');
        const shootBtn = document.getElementById('shootBtn');

        if (leftBtn) {
            leftBtn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                keys['ArrowLeft'] = true;
            });
            leftBtn.addEventListener('touchend', (e) => {
                e.preventDefault();
                keys['ArrowLeft'] = false;
            });
            leftBtn.addEventListener('click', (e) => {
                e.preventDefault();
                keys['ArrowLeft'] = true;
                setTimeout(() => keys['ArrowLeft'] = false, 100);
            });
        }

        if (rightBtn) {
            rightBtn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                keys['ArrowRight'] = true;
            });
            rightBtn.addEventListener('touchend', (e) => {
                e.preventDefault();
                keys['ArrowRight'] = false;
            });
            rightBtn.addEventListener('click', (e) => {
                e.preventDefault();
                keys['ArrowRight'] = true;
                setTimeout(() => keys['ArrowRight'] = false, 100);
            });
        }

        if (shootBtn) {
            shootBtn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                shootPlayerBullet();
            });
            shootBtn.addEventListener('click', (e) => {
                e.preventDefault();
                shootPlayerBullet();
            });
        }
    }

    // タッチ処理
    function handleTouch(e) {
        e.preventDefault();

        const rect = canvas.getBoundingClientRect();
        const touch = e.touches[0];
        const touchX = (touch.clientX - rect.left) * (canvasWidth / rect.width);
        const touchY = (touch.clientY - rect.top) * (canvasHeight / rect.height);

        if (gameState === 'menu') {
            startGame();
            return;
        } else if (gameState === 'gameOver') {
            restartGame();
            return;
        } else if (gameState === 'paused') {
            gameState = 'playing';
            return;
        } else if (gameState !== 'playing') {
            return;
        }

        // プレイ中のタッチ処理
        // 上部タッチで一時停止
        if (touchY < 60) {
            gameState = 'paused';
            return;
        }

        // プレイヤー移動（下部70%の領域）
        if (touchY > canvasHeight * 0.3) {
            player.x = touchX - player.width / 2;
            player.x = Math.max(0, Math.min(canvasWidth - player.width, player.x));
        }

        // 射撃（上部30%の領域、一時停止ボタン除く）
        if (touchY >= 60 && touchY < canvasHeight * 0.3) {
            shootPlayerBullet();
        }
    }

    function handleTouchEnd(e) {
        e.preventDefault();
    }

    function handleClick(e) {
        const rect = canvas.getBoundingClientRect();
        const clickX = (e.clientX - rect.left) * (canvasWidth / rect.width);
        const clickY = (e.clientY - rect.top) * (canvasHeight / rect.height);

        if (gameState === 'menu') {
            startGame();
        } else if (gameState === 'gameOver') {
            restartGame();
        } else if (gameState === 'playing') {
            // 上部クリックで一時停止
            if (clickY < 50) {
                gameState = 'paused';
            } else {
                shootPlayerBullet();
            }
        } else if (gameState === 'paused') {
            gameState = 'playing';
        }
    }

    // 音響効果の初期化
    function initAudio() {
        if (!window.audioSystem || !window.audioSystem.audioContext) {
            console.log('AudioSystem not available for game sounds');
            return;
        }

        try {
            // レーザー音
            const laserBuffer = generateLaserSound();
            if (laserBuffer) window.audioSystem.addSound('laser', laserBuffer);

            // 爆発音
            const explosionBuffer = generateExplosionSound();
            if (explosionBuffer) window.audioSystem.addSound('explosion', explosionBuffer);

            // ダメージ音
            const damageBuffer = generateDamageSound();
            if (damageBuffer) window.audioSystem.addSound('damage', damageBuffer);

            // レベルアップ音
            const levelupBuffer = generateLevelupSound();
            if (levelupBuffer) window.audioSystem.addSound('levelup', levelupBuffer);

            // ゲームオーバー音
            const gameoverBuffer = generateGameoverSound();
            if (gameoverBuffer) window.audioSystem.addSound('gameover', gameoverBuffer);

            // UFO音
            const ufoBuffer = generateUFOSound();
            if (ufoBuffer) window.audioSystem.addSound('ufo', ufoBuffer);

            // UFO破壊音
            const ufoDestroyBuffer = generateUFODestroySound();
            if (ufoDestroyBuffer) window.audioSystem.addSound('ufo-destroy', ufoDestroyBuffer);

            console.log('Game audio initialized successfully');
        } catch (e) {
            console.warn('Failed to initialize game audio:', e);
        }
    }

    // 音響効果生成
    function generateLaserSound() {
        if (!window.audioSystem?.audioContext) return null;

        const audioContext = window.audioSystem.audioContext;
        const sampleRate = audioContext.sampleRate;
        const duration = 0.1;
        const buffer = audioContext.createBuffer(1, sampleRate * duration, sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < buffer.length; i++) {
            const frequency = 800 - (i / buffer.length) * 400;
            data[i] = Math.sin(2 * Math.PI * frequency * i / sampleRate) * 0.3 * (1 - i / buffer.length);
        }
        return buffer;
    }

    function generateExplosionSound() {
        if (!window.audioSystem?.audioContext) return null;

        const audioContext = window.audioSystem.audioContext;
        const sampleRate = audioContext.sampleRate;
        const duration = 0.3;
        const buffer = audioContext.createBuffer(1, sampleRate * duration, sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < buffer.length; i++) {
            data[i] = (Math.random() - 0.5) * 0.5 * (1 - i / buffer.length);
        }
        return buffer;
    }

    function generateDamageSound() {
        if (!window.audioSystem?.audioContext) return null;

        const audioContext = window.audioSystem.audioContext;
        const sampleRate = audioContext.sampleRate;
        const duration = 0.2;
        const buffer = audioContext.createBuffer(1, sampleRate * duration, sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < buffer.length; i++) {
            const frequency = 200 - (i / buffer.length) * 150;
            data[i] = Math.sin(2 * Math.PI * frequency * i / sampleRate) * 0.4 * (1 - i / buffer.length);
        }
        return buffer;
    }

    function generateLevelupSound() {
        if (!window.audioSystem?.audioContext) return null;

        const audioContext = window.audioSystem.audioContext;
        const sampleRate = audioContext.sampleRate;
        const duration = 0.5;
        const buffer = audioContext.createBuffer(1, sampleRate * duration, sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < buffer.length; i++) {
            const frequency = 300 + (i / buffer.length) * 500;
            data[i] = Math.sin(2 * Math.PI * frequency * i / sampleRate) * 0.3 * (1 - i / buffer.length);
        }
        return buffer;
    }

    function generateGameoverSound() {
        if (!window.audioSystem?.audioContext) return null;

        const audioContext = window.audioSystem.audioContext;
        const sampleRate = audioContext.sampleRate;
        const duration = 1.0;
        const buffer = audioContext.createBuffer(1, sampleRate * duration, sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < buffer.length; i++) {
            const frequency = 150 - (i / buffer.length) * 100;
            data[i] = Math.sin(2 * Math.PI * frequency * i / sampleRate) * 0.3 * (1 - i / buffer.length);
        }
        return buffer;
    }

    function generateUFOSound() {
        if (!window.audioSystem?.audioContext) return null;

        const audioContext = window.audioSystem.audioContext;
        const sampleRate = audioContext.sampleRate;
        const duration = 2.0;
        const buffer = audioContext.createBuffer(1, sampleRate * duration, sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < buffer.length; i++) {
            const frequency = 220 + Math.sin(i / sampleRate * 8) * 50;
            data[i] = Math.sin(2 * Math.PI * frequency * i / sampleRate) * 0.2;
        }
        return buffer;
    }

    function generateUFODestroySound() {
        if (!window.audioSystem?.audioContext) return null;

        const audioContext = window.audioSystem.audioContext;
        const sampleRate = audioContext.sampleRate;
        const duration = 0.8;
        const buffer = audioContext.createBuffer(1, sampleRate * duration, sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < buffer.length; i++) {
            const frequency = 800 - (i / buffer.length) * 600;
            const noise = (Math.random() - 0.5) * 0.3;
            data[i] = (Math.sin(2 * Math.PI * frequency * i / sampleRate) * 0.4 + noise) * (1 - i / buffer.length);
        }
        return buffer;
    }

    // 初期化
    function init() {
        generateStars();
        setupEventListeners();

        // 音響システム初期化 - より長い遅延で確実に初期化
        const initAudioSystem = () => {
            if (window.audioSystem && window.audioSystem.audioContext) {
                console.log('AudioSystem found, initializing game sounds...');
                initAudio();
            } else {
                console.log('AudioSystem not ready, retrying...');
                setTimeout(initAudioSystem, 200);
            }
        };
        setTimeout(initAudioSystem, 200);

        // コイン表示更新
        updateCoinDisplay();

        // ハイスコア読み込み
        const highScoreElement = document.getElementById('highScore');
        if (highScoreElement) {
            highScoreElement.textContent = highScore;
        }

        // 初期画面設定
        const startScreen = document.getElementById('startScreen');
        const gameOverScreen = document.getElementById('gameOverScreen');

        if (startScreen) startScreen.style.display = 'flex';
        if (gameOverScreen) gameOverScreen.style.display = 'none';

        gameState = 'menu';

        // ゲームループ開始
        requestAnimationFrame(gameLoop);
    }

    // コイン表示更新
    function updateCoinDisplay() {
        const goldCoins = localStorage.getItem('goldCoins') || '0';
        const silverCoins = localStorage.getItem('silverCoins') || '0';
        const bronzeCoins = localStorage.getItem('bronzeCoins') || '0';

        const goldElement = document.getElementById('goldCoins');
        const silverElement = document.getElementById('silverCoins');
        const bronzeElement = document.getElementById('bronzeCoins');

        if (goldElement) goldElement.textContent = goldCoins;
        if (silverElement) silverElement.textContent = silverCoins;
        if (bronzeElement) bronzeElement.textContent = bronzeCoins;
    }

    // ページ読み込み完了後に初期化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
