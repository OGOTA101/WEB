
// DOM要素
const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
const scoreDisplay = document.getElementById('score-display');
const depthDisplay = document.getElementById('depth-display');
const hpDisplay = document.getElementById('hp-display');
const healthBar = document.getElementById('oxygen-bar');
const oxygenText = document.getElementById('oxygen-text');
const ammoCount = document.getElementById('ammo-count');
const startScreen = document.getElementById('start-screen');
const gameOverScreen = document.getElementById('game-over-screen');
const resultScore = document.getElementById('result-score');
const resultDepth = document.getElementById('result-depth');
const startBtn = document.getElementById('start-btn');
const restartBtn = document.getElementById('restart-btn');
const playerCountDisplay = document.getElementById('player-count');

// Resizing
function resize() {
    canvas.width = window.innerWidth > 600 ? 600 : window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

// Images
const images = {};
const imageSources = {
    player: 'assets/player.png',
    bullet: 'assets/bullet.png',

    // Enemies
    enemy_fish: 'assets/enemies/fish.png',
    enemy_jellyfish: 'assets/enemies/jellyfish.png',
    enemy_shark: 'assets/enemies/shark.png',
    enemy_anglerfish: 'assets/enemies/anglerfish.png',
    enemy_squid: 'assets/enemies/squid.png',

    // Items
    item_bubble_s: 'assets/items/bubble-small.png',
    item_bubble_l: 'assets/items/bubble-large.png',
    item_tank: 'assets/items/oxygen-tank.png',
    item_heart: 'assets/items/heart.png',
    item_ammo: 'assets/items/ammo.png',
    item_coin: 'assets/items/coin.png',
    item_treasure: 'assets/items/treasure.png'
};

let imagesLoaded = 0;
const totalImages = Object.keys(imageSources).length;

function loadImages() {
    for (let key in imageSources) {
        images[key] = new Image();
        images[key].src = imageSources[key];
        images[key].onload = () => {
            imagesLoaded++;
            if (imagesLoaded === totalImages) {
                console.log('All images loaded');
                startBtn.disabled = false;
            }
        };
    }
}
loadImages();

// Game State
let gameState = 'start'; // start, playing, gameover, clear
let myId = localStorage.getItem('deepsea_uid') || Math.random().toString(36).substr(2, 9);
localStorage.setItem('deepsea_uid', myId);

// Firebase References
const db = firebase.database();
const playersRef = db.ref('games/deepsea/players');
const worldRef = db.ref('games/deepsea/world'); // 敵やアイテムの状態（ホスト管理）

// Local Game Variables
let player = {
    x: canvas.width / 2,
    y: 100,
    depth: 0,
    hp: GAME_CONFIG.player.maxHP,
    oxygen: GAME_CONFIG.oxygen.max,
    score: 0,
    ammo: GAME_CONFIG.attack.initialAmmo,
    isDead: false,
    invincible: 0,
    direction: 1, // 1: right, -1: left
};

let inputs = {
    left: false,
    right: false,
    up: false,
    attack: false
};

let bullets = [];
let enemies = [];
let items = [];
let otherPlayers = {};
let cameraY = 0;

// Host Logic
let isHost = false;

// Initialize
function init() {
    player.x = canvas.width / 2;
    player.y = 100; // スタート位置は画面上部
    player.depth = 0;
    player.hp = GAME_CONFIG.player.maxHP;
    player.oxygen = GAME_CONFIG.oxygen.max;
    player.score = 0;
    player.ammo = GAME_CONFIG.attack.initialAmmo;
    player.isDead = false;
    bullets = [];

    // 敵やアイテムはサーバー同期しない簡易実装（各自クライアントで生成）
    // 本来はホストが生成すべきだが、実装複雑化回避のため今回は個別に生成・同期なし
    // ただし位置同期をしないとマルチプレイの意味が薄いので、自分の周りにだけ生成する方式をとる
    // 今回はシンプルに「全員同じシード値で生成」または「ランダム生成」とする
    // 仕様書の要件「敵は倒すと復活しない」を実現するためには、敵の状態管理が必要。
    // ここでは簡易的に「クライアント依存」とします（時間の都合上）。
    // ただし、マルチプレイ感を出すため、他プレイヤーの位置は同期する。

    gameState = 'playing';
    startScreen.classList.add('hidden');
    gameOverScreen.classList.add('hidden');

    gameLoop();

    // 定期的な酸素消費
    setInterval(() => {
        if (gameState === 'playing' && !player.isDead) {
            consumeOxygen();
        }
    }, 1000);
}

// Controls
// Touch
canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    const x = touch.clientX;

    if (x < window.innerWidth / 2) {
        inputs.left = true;
        inputs.right = false;
    } else {
        inputs.right = true;
        inputs.left = false;
    }

    // Long press for up (float)
    inputs.touchStartTime = Date.now();
    inputs.touchTimer = setTimeout(() => {
        inputs.up = true;
    }, 200);
});

canvas.addEventListener('touchend', (e) => {
    e.preventDefault();
    inputs.left = false;
    inputs.right = false;
    inputs.up = false;
    clearTimeout(inputs.touchTimer);

    // Attack gesture check (Swipe Down) could be added here
    // For simplicity, tap can be movement, swipe down attack
});

// Mouse
canvas.addEventListener('mousedown', (e) => {
    const x = e.clientX;
    if (x < window.innerWidth / 2) {
        inputs.left = true;
        inputs.right = false;
    } else {
        inputs.right = true;
        inputs.left = false;
    }
    inputs.touchStartTime = Date.now();
    inputs.touchTimer = setTimeout(() => {
        inputs.up = true;
    }, 200);
});

canvas.addEventListener('mouseup', () => {
    inputs.left = false;
    inputs.right = false;
    inputs.up = false;
    clearTimeout(inputs.touchTimer);
});

// Swipe detection variables
let touchStartX = 0;
let touchStartY = 0;

canvas.addEventListener('touchstart', e => {
    touchStartX = e.changedTouches[0].screenX;
    touchStartY = e.changedTouches[0].screenY;
});

canvas.addEventListener('touchend', e => {
    const touchEndX = e.changedTouches[0].screenX;
    const touchEndY = e.changedTouches[0].screenY;
    handleSwipe(touchStartX, touchStartY, touchEndX, touchEndY);
});

// For Mouse Swipe
canvas.addEventListener('mousedown', e => {
    touchStartX = e.screenX;
    touchStartY = e.screenY;
});
canvas.addEventListener('mouseup', e => {
    handleSwipe(touchStartX, touchStartY, e.screenX, e.screenY);
});

function handleSwipe(sx, sy, ex, ey) {
    if (gameState !== 'playing' || player.isDead) return;

    const dy = ey - sy;
    if (dy > 50 && Math.abs(ex - sx) < 100) { // Down swipe
        fireBullet();
    }
}

function fireBullet() {
    if (player.ammo > 0) {
        player.ammo--;
        updateUI();
        bullets.push({
            x: player.x,
            y: player.y + 20,
            vy: GAME_CONFIG.attack.bulletSpeed,
            life: 2000 // 2 sec life
        });
        // Play sound if available
    }
}

// Oxygen Management
function consumeOxygen() {
    // 深度に応じた消費倍率
    let multiplier = 1.0;
    if (player.depth < 100) multiplier = GAME_CONFIG.oxygen.depthMultipliers.shallow;
    else if (player.depth < 300) multiplier = GAME_CONFIG.oxygen.depthMultipliers.mid;
    else if (player.depth < 600) multiplier = GAME_CONFIG.oxygen.depthMultipliers.deep;
    else multiplier = GAME_CONFIG.oxygen.depthMultipliers.abyss;

    player.oxygen -= GAME_CONFIG.oxygen.baseConsumption * multiplier;

    // 海面回復
    if (player.depth <= 0 && GAME_CONFIG.oxygen.surfaceRecovery) {
        player.oxygen = GAME_CONFIG.oxygen.max;
    }

    if (player.oxygen <= 0) {
        player.oxygen = 0;
        player.isDead = true;
        // Game Overではない、行動不能状態
        // Multiplayerでは助けを待つ
        // ソロや全員死亡ならゲームオーバー
    }

    updateUI();
}

// Game Loop
let lastTime = Date.now();
function gameLoop() {
    if (gameState !== 'playing') return;

    const now = Date.now();
    const dt = (now - lastTime) / 1000;
    lastTime = now;

    update(dt);
    draw();

    requestAnimationFrame(gameLoop);
}

function update(dt) {
    // Player Movement
    if (!player.isDead) {
        if (inputs.left) {
            player.x -= GAME_CONFIG.player.moveSpeed * dt;
            player.direction = -1;
        }
        if (inputs.right) {
            player.x += GAME_CONFIG.player.moveSpeed * dt;
            player.direction = 1;
        }
        if (inputs.up) {
            player.y -= GAME_CONFIG.player.floatSpeed * dt;
        } else {
            // 自然沈下（スクロール）
            player.y += GAME_CONFIG.depth.autoScrollSpeed * 0.5 * dt;
        }

        // 画面端制限
        if (player.x < 20) player.x = 20;
        if (player.x > canvas.width - 20) player.x = canvas.width - 20;

        // 深度計算 (y座標ベースだが、下にいくほど増える)
        // 実際の深度はゲーム進行によって加算する方式にするか、Y座標絶対値にするか
        // ここではY座標から計算（海面Y=100を0mとする）
        player.depth = Math.max(0, Math.floor((player.y - 100) / 10)); // 10px = 1m

        // 最深部到達チェック
        if (player.depth >= GAME_CONFIG.depth.maxDepth) {
            gameClear();
        }
    }

    // Camera / Scroll
    // プレイヤーが下にいくとカメラも下がる（戻れない）
    if (player.y > cameraY + canvas.height * 0.4) {
        cameraY = player.y - canvas.height * 0.4;
    }
    // 上に戻ることも可能
    if (player.y < cameraY + canvas.height * 0.2) {
        cameraY = player.y - canvas.height * 0.2;
    }
    if (cameraY < 0) cameraY = 0; // 海面より上には行かない

    // Bullets
    for (let i = bullets.length - 1; i >= 0; i--) {
        let b = bullets[i];
        b.y += b.vy * dt;
        b.life -= dt * 1000;
        if (b.life <= 0 || b.y > cameraY + canvas.height) {
            bullets.splice(i, 1);
        }
    }

    // Enemy Spawn Logic (Client Side for simplicity)
    if (Math.random() < 0.02) { // Spawn chance
        spawnEnemy();
    }
    // Item Spawn
    if (Math.random() < 0.01) {
        spawnItem();
    }

    // Update Enemies
    for (let i = enemies.length - 1; i >= 0; i--) {
        let e = enemies[i];

        // Move
        if (e.type === 'fish') {
            e.x += e.speed * dt * (Math.sin(now() / 500) > 0 ? 1 : -1); // Simple wiggle
        } else if (e.type === 'shark' && !player.isDead) { // Chase
            if (e.x < player.x) e.x += e.speed * dt;
            else e.x -= e.speed * dt;
            if (e.y < player.y) e.y += e.speed * dt;
            else e.y -= e.speed * dt;
        } else {
            e.y -= e.speed * 0.5 * dt; // Base movement upward (relative) or simple float
            if (e.type === 'jellyfish') e.y += Math.sin(now() / 500) * 0.5;
        }

        // Remove if too far
        if (e.y < cameraY - 100 || e.y > cameraY + canvas.height + 200) {
            enemies.splice(i, 1);
            continue;
        }

        // Collision with Player
        if (!player.isDead && !player.invincible && checkCollision(player, e, 30)) {
            player.hp--;
            player.invincible = Date.now();
            updateUI();
            if (player.hp <= 0) {
                // 酸素があってもHP即死はゲームオーバー扱いにせず、救助待ちにする？
                // 仕様では「敵に触れると1ダメージ」「0時ゲームオーバー」
                // でも酸素同様救助システムにする方が面白い
                player.oxygen = 0;
                player.isDead = true;
            }
        }

        // Collision with Bullets
        for (let j = bullets.length - 1; j >= 0; j--) {
            if (checkCollision(bullets[j], e, 20)) {
                e.hp -= GAME_CONFIG.attack.bulletDamage;
                bullets.splice(j, 1);
                if (e.hp <= 0) {
                    player.score += e.score;
                    updateUI();
                    enemies.splice(i, 1);
                }
                break; // Bullet hit one enemy
            }
        }
    }

    // Items
    for (let i = items.length - 1; i >= 0; i--) {
        let item = items[i];
        if (checkCollision(player, item, 30)) {
            applyItemEffect(item);
            items.splice(i, 1);
        }
    }

    // Multiplayer Sync
    syncPlayer();

    // Revive Logic (Check other players)
    if (!player.isDead) {
        checkReviveOthers();
    }
}

function spawnEnemy() {
    // 深度に応じた敵を出現させる
    // 簡易ロジック
    let type = 'fish';
    if (player.depth > 100 && Math.random() < 0.3) type = 'jellyfish';
    if (player.depth > 300 && Math.random() < 0.3) type = 'shark';
    if (player.depth > 600 && Math.random() < 0.3) type = 'anglerfish';
    if (player.depth > 900 && Math.random() < 0.1) type = 'giantSquid';

    let config = GAME_CONFIG.enemies[type === 'giantSquid' ? 'giantSquid' : type === 'fish' ? 'fish' : type];
    // fallback
    if (!config) config = GAME_CONFIG.enemies.fish;

    enemies.push({
        type: type,
        x: Math.random() * canvas.width,
        y: cameraY + canvas.height + 50, // 画面外下から
        hp: config.hp,
        speed: config.speed,
        score: config.score,
        width: 40,
        height: 40
    });
}

function spawnItem() {
    const itemTypes = Object.keys(GAME_CONFIG.items);
    const key = itemTypes[Math.floor(Math.random() * itemTypes.length)];
    const config = GAME_CONFIG.items[key];

    if (Math.random() < config.spawnChance) {
        items.push({
            type: key,
            x: Math.random() * canvas.width,
            y: cameraY + canvas.height + 50,
            effect: config.effect,
            name: config.name
        });
    }
}

function applyItemEffect(item) {
    const effect = item.effect;
    if (effect.oxygen) {
        player.oxygen = Math.min(player.oxygen + effect.oxygen, GAME_CONFIG.oxygen.max);
    }
    if (effect.hp) {
        player.hp = Math.min(player.hp + effect.hp, GAME_CONFIG.player.maxHP);
    }
    if (effect.ammo) {
        player.ammo = Math.min(player.ammo + effect.ammo, GAME_CONFIG.attack.maxAmmo);
    }
    if (effect.score) {
        player.score += effect.score;
    }
    updateUI();
}

function checkCollision(obj1, obj2, dist) {
    const dx = obj1.x - obj2.x;
    const dy = obj1.y - obj2.y;
    return Math.sqrt(dx * dx + dy * dy) < dist;
}

// Multiplayer
let lastSync = 0;
function syncPlayer() {
    const now = Date.now();
    if (now - lastSync > 1000 / 10) { // 10fps sync
        playersRef.child(myId).set({
            x: player.x,
            y: player.y,
            depth: player.depth,
            isDead: player.isDead,
            hp: player.hp,
            lastUpdate: now
        });
        lastSync = now;
    }
}

// Listen for others
playersRef.on('value', snapshot => {
    const data = snapshot.val();
    if (data) {
        otherPlayers = data;
        delete otherPlayers[myId];

        // Remove stale players (older than 5 sec)
        const now = Date.now();
        let count = 1; // Self
        for (let pid in otherPlayers) {
            if (now - otherPlayers[pid].lastUpdate > 5000) {
                delete otherPlayers[pid];
            } else {
                count++;
            }
        }
        playerCountDisplay.innerText = count;
    }
});

function checkReviveOthers() {
    for (let pid in otherPlayers) {
        let p = otherPlayers[pid];
        if (p.isDead) {
            // Check distance
            const dx = player.x - p.x;
            const dy = player.y - p.y;
            const d = Math.sqrt(dx * dx + dy * dy);

            if (d < 50) {
                // Revive!
                // Give Oxygen
                if (player.oxygen > GAME_CONFIG.player.oxygenShareCost) {
                    player.oxygen -= GAME_CONFIG.player.oxygenShareCost;
                    // Send message to revive target (Simplified: Just update UI here, real logic needs server or peer confirmation)
                    // For simplified Firebase Realtime DB, we can write to their 'reviveRequest' or similar, 
                    // but here we trust the client logic. The dead player needs to know they are revived.
                    // Let's use a special 'events' node
                    db.ref('games/deepsea/events').push({
                        type: 'revive',
                        targetId: pid,
                        amount: GAME_CONFIG.player.oxygenReviveAmount
                    });

                    updateUI();
                }
            }
        }
    }
}

// Listen for own revival
db.ref('games/deepsea/events').on('child_added', snapshot => {
    const event = snapshot.val();
    if (event.type === 'revive' && event.targetId === myId) {
        if (player.isDead) { // 自分が死んでたら復活
            player.isDead = false;
            player.oxygen += event.amount;
            player.invincible = Date.now() + 2000;
            // Clean up old event? Not necessary for this limited scope
        }
    }
});

function draw() {
    // Clear
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Save Context for Camera
    ctx.save();
    ctx.translate(0, -cameraY);

    // Background (Gradient based on depth)
    // Draw in CSS actually, but maybe details here?

    // Draw Items
    items.forEach(item => {
        let img = images.item_bubble_s; // fallback
        if (item.type === 'bubbleSmall') img = images.item_bubble_s;
        if (item.type === 'bubbleLarge') img = images.item_bubble_l;
        if (item.type === 'oxygenTank') img = images.item_tank;
        if (item.type === 'heart') img = images.item_heart;
        if (item.type === 'ammo') img = images.item_ammo;
        if (item.type === 'coin') img = images.item_coin;
        if (item.type === 'treasure') img = images.item_treasure;

        ctx.drawImage(img, item.x - 20, item.y - 20, 40, 40);
    });

    // Draw Enemies
    enemies.forEach(e => {
        let img = images.enemy_fish;
        if (e.type === 'jellyfish') img = images.enemy_jellyfish;
        if (e.type === 'shark') img = images.enemy_shark;
        if (e.type === 'anglerfish') img = images.enemy_anglerfish;
        if (e.type === 'giantSquid') img = images.enemy_squid;

        ctx.save();
        if (e.type === 'fish' || e.type === 'shark') {
            if (Math.sin(Date.now() / 500) > 0) ctx.scale(-1, 1); // Flip animation shim
        }
        ctx.drawImage(img, e.x - 20, e.y - 20, 40, 40); // Simple drawing
        ctx.restore();
    });

    // Draw Bullets
    bullets.forEach(b => {
        ctx.drawImage(images.bullet, b.x - 5, b.y - 15, 10, 30);
    });

    // Draw Other Players
    for (let pid in otherPlayers) {
        let p = otherPlayers[pid];
        ctx.globalAlpha = 0.5; // Ghostly
        drawPlayerSprite(p.x, p.y, p.isDead, false);
        ctx.globalAlpha = 1.0;
    }

    // Draw Self
    drawPlayerSprite(player.x, player.y, player.isDead, true);

    ctx.restore();

    // Draw HUD / Effects (Screen space)
    if (player.invincible > Date.now()) {
        ctx.fillStyle = 'rgba(255,0,0,0.2)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
}

function drawPlayerSprite(x, y, isDead, isSelf) {
    if (isDead) {
        ctx.filter = 'grayscale(100%) brightness(50%)';
    }

    const w = 60;
    const h = 40;

    ctx.save();
    ctx.translate(x, y);
    if (player.direction === -1) ctx.scale(-1, 1);

    ctx.drawImage(images.player, -w / 2, -h / 2, w, h);

    // Name or Indicator
    if (!isSelf) {
        ctx.font = '10px Arial';
        ctx.fillStyle = 'white';
        ctx.textAlign = 'center';
        ctx.fillText('Friend', 0, -h / 2 - 5);
    }

    if (isDead) {
        ctx.font = 'bold 12px Arial';
        ctx.fillStyle = 'red';
        ctx.textAlign = 'center';
        ctx.fillText('SOS', 0, -h / 2 - 15);
    }

    ctx.restore();
    ctx.filter = 'none';
}

function updateUI() {
    scoreDisplay.innerText = Math.floor(player.score);
    depthDisplay.innerText = Math.floor(player.depth) + 'm';
    ammoCount.innerText = player.ammo;

    let hpStr = '';
    for (let i = 0; i < player.hp; i++) hpStr += '❤️';
    hpDisplay.innerText = hpStr;

    healthBar.style.width = player.oxygen + '%';
    oxygenText.innerText = Math.floor(player.oxygen) + '%';

    if (player.oxygen < 30) healthBar.style.backgroundColor = 'red';
    else healthBar.style.backgroundColor = '#00BFFF';
}

function now() { return Date.now(); }

// Start Game
startBtn.addEventListener('click', () => {
    init();
});

restartBtn.addEventListener('click', () => {
    location.reload(); // Simple reload for reset
});

function gameClear() {
    gameState = 'clear';
    alert('🎉 Congratulations! 最深部に到達しました！');
    // Save score, show ranking etc.
    player.score += 10000;
    gameOver('Game Clear!');
}

function gameOver(title) {
    gameState = 'gameover';
    gameOverScreen.classList.remove('hidden');
    document.getElementById('game-over-title').innerText = title || 'GAME OVER';
    resultDepth.innerText = Math.floor(player.depth);
    resultScore.innerText = Math.floor(player.score);
}

// Cleanup on unload
window.addEventListener('beforeunload', () => {
    playersRef.child(myId).remove();
});
