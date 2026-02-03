
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

// Firebase References (初期化後に設定)
let db = null;
let playersRef = null;
let worldRef = null;

// Firebase初期化
async function initFirebase() {
    try {
        // Firebaseホスティング環境から設定を取得
        const response = await fetch('/__/firebase/init.json');
        if (response.ok) {
            const config = await response.json();
            firebase.initializeApp(config);
            console.log('Firebase initialized successfully');
        } else {
            console.warn('Firebase init.jsonを読み込めませんでした。ローカル実行時は手動設定が必要です。');
            return;
        }

        db = firebase.database();
        playersRef = db.ref('games/deepsea/players');
        worldRef = db.ref('games/deepsea/world'); // 敵やアイテムの状態（ホスト管理）

        // プレイヤー同期リスナーを設定
        setupPlayerListeners();

        // 切断時の処理
        playersRef.child(myId).onDisconnect().remove();

    } catch (e) {
        console.error('Firebase初期化エラー:', e);
    }
}

// Firebase初期化を実行
initFirebase();

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
    down: false,
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
    player.invincible = 0;
    player.deathTime = null;
    player.direction = 1;

    // ゲーム状態リセット
    bullets = [];
    enemies = [];
    items = [];
    cameraY = 0;

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

// Controls - ボタン操作
const btnLeft = document.getElementById('btn-left');
const btnRight = document.getElementById('btn-right');
const btnUp = document.getElementById('btn-up');
const btnDown = document.getElementById('btn-down');
const btnAttack = document.getElementById('btn-attack');

// ボタンのタッチ/マウス操作を登録
function setupButtonControl(button, inputKey) {
    // マウスダウン
    button.addEventListener('mousedown', (e) => {
        e.preventDefault();
        inputs[inputKey] = true;
        button.classList.add('pressed');
    });
    // マウスアップ
    button.addEventListener('mouseup', (e) => {
        e.preventDefault();
        inputs[inputKey] = false;
        button.classList.remove('pressed');
    });
    // マウスがボタンから離れた時
    button.addEventListener('mouseleave', (e) => {
        inputs[inputKey] = false;
        button.classList.remove('pressed');
    });
    // タッチスタート
    button.addEventListener('touchstart', (e) => {
        e.preventDefault();
        inputs[inputKey] = true;
        button.classList.add('pressed');
    });
    // タッチエンド
    button.addEventListener('touchend', (e) => {
        e.preventDefault();
        inputs[inputKey] = false;
        button.classList.remove('pressed');
    });
    // タッチキャンセル
    button.addEventListener('touchcancel', (e) => {
        inputs[inputKey] = false;
        button.classList.remove('pressed');
    });
}

// 方向ボタンをセットアップ
setupButtonControl(btnLeft, 'left');
setupButtonControl(btnRight, 'right');
setupButtonControl(btnUp, 'up');
setupButtonControl(btnDown, 'down');

// 攻撃ボタン（押したら発射）
btnAttack.addEventListener('mousedown', (e) => {
    e.preventDefault();
    btnAttack.classList.add('pressed');
    fireBullet();
});
btnAttack.addEventListener('mouseup', (e) => {
    e.preventDefault();
    btnAttack.classList.remove('pressed');
});
btnAttack.addEventListener('mouseleave', () => {
    btnAttack.classList.remove('pressed');
});
btnAttack.addEventListener('touchstart', (e) => {
    e.preventDefault();
    btnAttack.classList.add('pressed');
    fireBullet();
});
btnAttack.addEventListener('touchend', (e) => {
    e.preventDefault();
    btnAttack.classList.remove('pressed');
});
btnAttack.addEventListener('touchcancel', () => {
    btnAttack.classList.remove('pressed');
});

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
        } else if (inputs.down) {
            // 下降ボタンで速く下がる
            player.y += GAME_CONFIG.player.floatSpeed * dt;
        } else {
            // 自然沈下（スクロール）
            player.y += GAME_CONFIG.depth.autoScrollSpeed * 0.5 * dt;
        }

        // 画面端制限（左右）
        const margin = 30;
        if (player.x < margin) player.x = margin;
        if (player.x > canvas.width - margin) player.x = canvas.width - margin;

        // 画面端制限（上下 - カメラ座標基準）
        const screenTop = cameraY + 50; // 画面上端から少し下
        const screenBottom = cameraY + canvas.height - 150; // 操作ボタン領域を考慮
        if (player.y < screenTop) player.y = screenTop;
        if (player.y > screenBottom) player.y = screenBottom;

        // 海面より上には行かない
        if (player.y < 50) player.y = 50;

        // 深度計算 (y座標ベースだが、下にいくほど増える)
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
    const maxEnemies = GAME_CONFIG.game.maxEnemiesOnScreen || 15;
    if (enemies.length < maxEnemies && Math.random() < 0.02) { // Spawn chance
        spawnEnemy();
    }
    // Item Spawn（アイテムは画面上に5個まで）
    if (items.length < 5 && Math.random() < 0.01) {
        spawnItem();
    }

    // Update Enemies
    for (let i = enemies.length - 1; i >= 0; i--) {
        let e = enemies[i];

        // 敵ごとの個別IDがない場合は作成（ユニークな動きのため）
        if (!e.id) e.id = Math.random() * 1000;

        // プレイヤーへの方向を計算
        const dx = player.x - e.x;
        const dy = player.y - e.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const dirX = dist > 0 ? dx / dist : 0;
        const dirY = dist > 0 ? dy / dist : 0;

        // タイプ別の動き
        if (e.type === 'fish') {
            // 魚: ふらふら動きながらプレイヤーに接近
            const wiggle = Math.sin((now() + e.id * 100) / 300) * 50;
            e.x += (dirX * e.speed * 0.5 + wiggle * 0.02) * dt;
            e.y += dirY * e.speed * 0.5 * dt;
        } else if (e.type === 'shark') {
            // サメ: 素早くプレイヤーを追跡
            e.x += dirX * e.speed * dt;
            e.y += dirY * e.speed * dt;
        } else if (e.type === 'jellyfish') {
            // クラゲ: ゆっくり浮遊しながらプレイヤーに接近
            const floatY = Math.sin((now() + e.id * 100) / 800) * 30;
            e.x += dirX * e.speed * 0.3 * dt;
            e.y += (dirY * e.speed * 0.3 + floatY * 0.01) * dt;
        } else if (e.type === 'anglerfish') {
            // アンコウ: ゆっくりだが確実に追跡
            e.x += dirX * e.speed * 0.4 * dt;
            e.y += dirY * e.speed * 0.4 * dt;
        } else if (e.type === 'giantSquid') {
            // 巨大イカ: 中速で追跡、たまに突進
            const burst = Math.sin((now() + e.id * 50) / 1000) > 0.8 ? 2 : 1;
            e.x += dirX * e.speed * 0.6 * burst * dt;
            e.y += dirY * e.speed * 0.6 * burst * dt;
        } else {
            // その他: プレイヤーに向かって移動
            e.x += dirX * e.speed * 0.5 * dt;
            e.y += dirY * e.speed * 0.5 * dt;
        }

        // 画面外判定（かなり離れた場合のみ削除 - 500px以上離れたら）
        const distFromCamera = Math.abs(e.y - (cameraY + canvas.height / 2));
        if (distFromCamera > 800 || e.x < -200 || e.x > canvas.width + 200) {
            enemies.splice(i, 1);
            continue;
        }

        // Collision with Player
        // 無敵時間のチェック（2秒間）
        const isInvincible = player.invincible && (Date.now() - player.invincible < 2000);
        if (!player.isDead && !isInvincible && checkCollision(player, e, 30)) {
            player.hp--;
            player.invincible = Date.now(); // 無敵開始
            updateUI();
            if (player.hp <= 0) {
                // HPが0になったら死亡状態に
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
    } else {
        // 死亡中の処理
        // 他のプレイヤーがいない、または3秒経過でゲームオーバー
        if (!player.deathTime) {
            player.deathTime = Date.now();
        }
        const deathDuration = Date.now() - player.deathTime;
        const hasOtherPlayers = Object.keys(otherPlayers).length > 0;

        // 5秒後にゲームオーバー（マルチの場合は救助待ち中）
        if (deathDuration > 5000) {
            gameOver('GAME OVER');
        }
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
    if (!playersRef) return; // Firebase未初期化の場合はスキップ
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

// setupPlayerListeners - Firebase初期化後に呼び出される
function setupPlayerListeners() {
    if (!playersRef || !db) return;

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

    // Listen for own revival
    db.ref('games/deepsea/events').on('child_added', snapshot => {
        const event = snapshot.val();
        if (event.type === 'revive' && event.targetId === myId) {
            if (player.isDead) { // 自分が死んでたら復活
                player.isDead = false;
                player.oxygen += event.amount;
                player.invincible = Date.now() + 2000;
            }
        }
    });
}

function checkReviveOthers() {
    if (!db) return; // Firebase未初期化の場合はスキップ
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
    // 無敵時間のエフェクト（2秒以内なら赤い点滅）
    const isInvincible = player.invincible && (Date.now() - player.invincible < 2000);
    if (isInvincible) {
        // 点滅エフェクト
        if (Math.sin(Date.now() / 100) > 0) {
            ctx.fillStyle = 'rgba(255,100,100,0.3)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
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
    if (playersRef) {
        playersRef.child(myId).remove();
    }
});
