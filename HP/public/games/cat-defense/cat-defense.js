/**
 * ネズミ狩りの夜 - メインゲームスクリプト v2.0
 * グリッドベース移動、スキルツリーUI、ボス演出、スプライトアニメーション
 */

// ========== DOM要素 ==========
const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
const waveDisplay = document.getElementById('wave-display');
const cheeseHPBar = document.getElementById('cheese-hp-bar');
const cheeseHPText = document.getElementById('cheese-hp-text');
const playerCountDisplay = document.getElementById('player-count');
const killCountDisplay = document.getElementById('kill-count');
const spCountDisplay = document.getElementById('sp-count');
const startScreen = document.getElementById('start-screen');
const dayScreen = document.getElementById('day-screen');
const gameOverScreen = document.getElementById('game-over-screen');
const waveAnnounce = document.getElementById('wave-announce');
const waveAnnounceText = document.getElementById('wave-announce-text');
const startBtn = document.getElementById('start-btn');
const nextWaveBtn = document.getElementById('next-wave-btn');
const restartBtn = document.getElementById('restart-btn');
const roomCodeInput = document.getElementById('room-code');
const skillTreeScreen = document.getElementById('skill-tree-screen');

// ========== 定数 ==========
const TILE_SIZE = 32; // グリッドのタイルサイズ
const GRID_COLS = 15;
const GRID_ROWS = 18;

// ========== Canvas サイズ調整 ==========
function resize() {
    const maxWidth = TILE_SIZE * GRID_COLS;
    canvas.width = maxWidth;
    canvas.height = TILE_SIZE * GRID_ROWS;
}
window.addEventListener('resize', resize);
resize();

// ========== 画像読み込み ==========
const images = {};
const imageSources = {
    cat: 'assets/cat.png',
    mouse: 'assets/mouse.png',
    cheese: 'assets/cheese.png',
    effects: 'assets/effects.png',
    floor: 'assets/floor.png',
    skills: 'assets/skills.png',
};

let imagesLoaded = 0;
const totalImages = Object.keys(imageSources).length;

function loadImages() {
    for (let key in imageSources) {
        images[key] = new Image();
        images[key].src = imageSources[key];
        images[key].onload = () => {
            imagesLoaded++;
            if (imagesLoaded >= totalImages) {
                console.log('All images loaded');
                startBtn.disabled = false;
            }
        };
        images[key].onerror = () => {
            console.warn(`Failed to load ${key}`);
            imagesLoaded++;
        };
    }
}
loadImages();

// ========== スプライト定義 ==========
// 新しく生成された画像レイアウトに基づいた正確なスプライト座標
const SPRITES = {
    // 猫スプライト (512x512) - 4列×3行
    // 行1: 静止ポーズ4つ（正面、背面、左、右）
    // 行2-3: 歩行/攻撃アニメ
    cat: {
        cols: 4,
        rows: 3,
        frameW: 128,  // 512/4
        frameH: 170,  // 約512/3
    },
    // ネズミスプライト (512x512) - 2列×4行
    // 行0: 通常ネズミ（グレー）- 2フレーム
    // 行1: 速いネズミ（青）- 2フレーム  
    // 行2: 大きいネズミ（茶色）- 2フレーム
    // 行3: ボスネズミ（金色）- 2フレーム
    mouse: {
        cols: 2,
        rows: 4,
        frameW: 256,  // 512/2
        frameH: 128,  // 512/4
    },
    // チーズスプライト (512x512) - 2x2グリッド
    // 左上: 100% HP、右上: 75% HP、左下: 50% HP、右下: 25% HP
    cheese: {
        cols: 2,
        rows: 2,
        frameW: 256,  // 512/2
        frameH: 256,  // 512/2
    },
    // エフェクトスプライト (512x512) - 4列×5行
    // 行0: 爪マーク（3フレーム）
    // 行1: スターバースト（3フレーム）
    // 行2: 天使の羽（3フレーム）
    // 行3: ダメージ数字
    // 行4: キラキラ（4フレーム）
    effects: {
        cols: 4,
        rows: 5,
        frameW: 128,  // 512/4
        frameH: 102,  // 約512/5
    },
};

// ========== 効果音生成（Web Audio API） ==========
let audioCtx = null;

function initAudio() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
}

function playSound(type) {
    if (!audioCtx) return;

    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    switch (type) {
        case 'attack':
            oscillator.frequency.setValueAtTime(800, audioCtx.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(200, audioCtx.currentTime + 0.1);
            gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
            oscillator.type = 'square';
            oscillator.start();
            oscillator.stop(audioCtx.currentTime + 0.1);
            break;
        case 'kill':
            oscillator.frequency.setValueAtTime(400, audioCtx.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(800, audioCtx.currentTime + 0.15);
            gainNode.gain.setValueAtTime(0.2, audioCtx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
            oscillator.type = 'triangle';
            oscillator.start();
            oscillator.stop(audioCtx.currentTime + 0.15);
            break;
        case 'damage':
            oscillator.frequency.setValueAtTime(150, audioCtx.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(50, audioCtx.currentTime + 0.2);
            gainNode.gain.setValueAtTime(0.4, audioCtx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);
            oscillator.type = 'sawtooth';
            oscillator.start();
            oscillator.stop(audioCtx.currentTime + 0.2);
            break;
        case 'boss':
            oscillator.frequency.setValueAtTime(100, audioCtx.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(50, audioCtx.currentTime + 0.5);
            oscillator.frequency.exponentialRampToValueAtTime(100, audioCtx.currentTime + 1.0);
            gainNode.gain.setValueAtTime(0.5, audioCtx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 1.0);
            oscillator.type = 'square';
            oscillator.start();
            oscillator.stop(audioCtx.currentTime + 1.0);
            break;
        case 'levelup':
            const notes = [523, 659, 784, 1047]; // C5, E5, G5, C6
            notes.forEach((freq, i) => {
                const osc = audioCtx.createOscillator();
                const gain = audioCtx.createGain();
                osc.connect(gain);
                gain.connect(audioCtx.destination);
                osc.frequency.setValueAtTime(freq, audioCtx.currentTime + i * 0.1);
                gain.gain.setValueAtTime(0.2, audioCtx.currentTime + i * 0.1);
                gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + i * 0.1 + 0.2);
                osc.type = 'square';
                osc.start(audioCtx.currentTime + i * 0.1);
                osc.stop(audioCtx.currentTime + i * 0.1 + 0.2);
            });
            break;
        case 'move':
            oscillator.frequency.setValueAtTime(300, audioCtx.currentTime);
            gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.05);
            oscillator.type = 'sine';
            oscillator.start();
            oscillator.stop(audioCtx.currentTime + 0.05);
            break;
    }
}

// ========== ゲーム状態 ==========
let gameState = 'start'; // start, playing, day, skillTree, gameover, clear
let myId = localStorage.getItem('catdefense_uid') || Math.random().toString(36).substr(2, 9);
localStorage.setItem('catdefense_uid', myId);

let roomId = '';
let isHost = false;

// ========== Firebase ==========
let db = null;
let roomRef = null;
let playersRef = null;

async function initFirebase() {
    try {
        const response = await fetch('/__/firebase/init.json');
        if (response.ok) {
            const config = await response.json();
            firebase.initializeApp(config);
            console.log('Firebase initialized');
        } else {
            console.warn('Firebase init.json not found. Running in offline mode.');
            return;
        }
        db = firebase.database();
    } catch (e) {
        console.error('Firebase init error:', e);
    }
}

initFirebase();

// ========== グリッド管理 ==========
let grid = [];

function initGrid() {
    grid = [];
    for (let y = 0; y < GRID_ROWS; y++) {
        grid[y] = [];
        for (let x = 0; x < GRID_COLS; x++) {
            grid[y][x] = null; // null = 空き
        }
    }
}

function getGridPos(pixelX, pixelY) {
    return {
        gx: Math.floor(pixelX / TILE_SIZE),
        gy: Math.floor(pixelY / TILE_SIZE)
    };
}

function getPixelPos(gx, gy) {
    return {
        x: gx * TILE_SIZE + TILE_SIZE / 2,
        y: gy * TILE_SIZE + TILE_SIZE / 2
    };
}

function isValidTile(gx, gy) {
    return gx >= 0 && gx < GRID_COLS && gy >= 0 && gy < GRID_ROWS - 2; // 下2行はチーズエリア
}

function isTileOccupied(gx, gy, excludeId = null) {
    // ネズミがいるかチェック
    for (const mouse of mice) {
        if (mouse.id !== excludeId && mouse.gx === gx && mouse.gy === gy) {
            return true;
        }
    }
    // 猫がいるかチェック
    if (cat.gx === gx && cat.gy === gy) {
        return true;
    }
    return false;
}

// ========== ゲームオブジェクト ==========
let cat = {
    gx: 7, gy: 10, // グリッド座標
    x: 0, y: 0, // ピクセル座標（補間用）
    targetGx: 7, targetGy: 10,
    isMoving: false,
    moveProgress: 0,
    direction: 0, // 0=down, 1=up, 2=left, 3=right
    attackTimer: 0,
    animFrame: 0,
    sp: 0,
    skills: {},
    color: GAME_CONFIG.cat.colors[0],
};

let cheese = {
    hp: GAME_CONFIG.cheese.maxHP,
    maxHP: GAME_CONFIG.cheese.maxHP,
    gx: Math.floor(GRID_COLS / 2),
    gy: GRID_ROWS - 1,
};

let mice = [];
let otherPlayers = {};
let effects = [];

let wave = 1;
let totalKills = 0;
let waveKills = 0;
let miceSpawned = 0;
let miceToSpawn = 0;
let noCheeseeDamage = true;
let bossWarning = false;
let bossWarningTimer = 0;

// ========== 初期化 ==========
function init() {
    initAudio();
    initGrid();

    // 猫の初期位置
    cat.gx = Math.floor(GRID_COLS / 2);
    cat.gy = Math.floor(GRID_ROWS * 0.6);
    cat.targetGx = cat.gx;
    cat.targetGy = cat.gy;
    const pos = getPixelPos(cat.gx, cat.gy);
    cat.x = pos.x;
    cat.y = pos.y;
    cat.isMoving = false;
    cat.attackTimer = 0;
    cat.sp = 0;
    cat.skills = {};

    // チーズ
    cheese.hp = GAME_CONFIG.cheese.maxHP;
    cheese.maxHP = GAME_CONFIG.cheese.maxHP;

    // 状態リセット
    mice = [];
    effects = [];
    wave = 1;
    totalKills = 0;
    waveKills = 0;
    noCheeseeDamage = true;

    updateUI();
    startWave();
}

// ========== Wave 管理 ==========
function startWave() {
    gameState = 'playing';
    waveKills = 0;
    noCheeseeDamage = true;
    bossWarning = false;

    // Waveに応じたネズミ数
    miceToSpawn = GAME_CONFIG.game.baseMicePerWave + (wave - 1) * GAME_CONFIG.game.miceIncreasePerWave;
    miceSpawned = 0;

    // ボスwave（5の倍数）
    if (wave % 5 === 0 && wave >= 5) {
        showBossWarning();
    } else {
        showWaveAnnounce();
    }

    startScreen.classList.add('hidden');
    dayScreen.classList.add('hidden');
    gameOverScreen.classList.add('hidden');
    if (skillTreeScreen) skillTreeScreen.classList.add('hidden');

    updateUI();
}

function showWaveAnnounce() {
    waveAnnounceText.textContent = `🌙 Wave ${wave} - ネズミ狩りの夜が始まる`;
    waveAnnounce.classList.remove('hidden');

    setTimeout(() => {
        waveAnnounce.classList.add('hidden');
    }, GAME_CONFIG.game.waveAnnounceDuration);
}

function showBossWarning() {
    bossWarning = true;
    bossWarningTimer = 3;
    playSound('boss');

    waveAnnounceText.textContent = `⚠️ WARNING ⚠️\n👑 ボスネズミ出現！`;
    waveAnnounce.classList.remove('hidden');
    waveAnnounce.style.background = 'rgba(255, 0, 0, 0.8)';

    setTimeout(() => {
        waveAnnounce.classList.add('hidden');
        waveAnnounce.style.background = '';
        bossWarning = false;
    }, 3000);
}

function endWave() {
    gameState = 'day';

    // SP計算
    let earnedSP = GAME_CONFIG.sp.perWaveClear;
    earnedSP += Math.floor(waveKills / GAME_CONFIG.sp.perKills.count) * GAME_CONFIG.sp.perKills.sp;
    if (noCheeseeDamage) {
        earnedSP += GAME_CONFIG.sp.noDamageBonus;
    }
    cat.sp += earnedSP;

    // チーズ回復
    cheese.hp = Math.min(cheese.hp + GAME_CONFIG.cheese.dayRecovery, cheese.maxHP);

    playSound('levelup');

    // 昼画面表示
    document.getElementById('day-wave').textContent = wave;
    document.getElementById('day-kills').textContent = waveKills;
    document.getElementById('day-cheese-hp').textContent = Math.floor(cheese.hp);
    document.getElementById('day-sp').textContent = cat.sp;
    dayScreen.classList.remove('hidden');

    updateUI();
}

// ========== ネズミ生成 ==========
function spawnMouse() {
    if (miceSpawned >= miceToSpawn) return;

    // 種類を決定
    let type = 'normal';
    const rand = Math.random();

    // ボスwave
    if (wave % 5 === 0 && wave >= 5 && miceSpawned === 0) {
        type = 'boss';
    } else if (wave >= 6 && rand < 0.2) {
        type = 'fast';
    } else if (wave >= 11 && rand < 0.15) {
        type = 'big';
    } else if (wave >= 21 && rand < 0.3) {
        type = 'swarm';
    }

    const config = GAME_CONFIG.mice[type];

    // 空いているスポーンポイントを探す
    let spawnGx = Math.floor(Math.random() * GRID_COLS);
    let attempts = 0;
    while (isTileOccupied(spawnGx, 0) && attempts < 10) {
        spawnGx = Math.floor(Math.random() * GRID_COLS);
        attempts++;
    }

    const pos = getPixelPos(spawnGx, 0);

    mice.push({
        id: Math.random().toString(36).substr(2, 9),
        type: type,
        gx: spawnGx,
        gy: 0,
        x: pos.x,
        y: pos.y,
        targetGx: spawnGx,
        targetGy: 1,
        isMoving: false,
        moveProgress: 0,
        hp: config.hp,
        maxHP: config.hp,
        speed: config.speed,
        damage: config.damage,
        score: config.score,
        size: config.size,
        animFrame: Math.random() * 10,
        moveTimer: 0,
    });

    miceSpawned++;
}

// ========== 入力処理（グリッドベース） ==========
function handleInput(clientX, clientY) {
    if (gameState !== 'playing') return;
    if (cat.isMoving) return; // 移動中は入力受け付けない

    const rect = canvas.getBoundingClientRect();
    const x = (clientX - rect.left) * (canvas.width / rect.width);
    const y = (clientY - rect.top) * (canvas.height / rect.height);

    const clickGrid = getGridPos(x, y);

    // 有効なタイルかチェック
    if (!isValidTile(clickGrid.gx, clickGrid.gy)) return;

    // 移動先を設定
    cat.targetGx = clickGrid.gx;
    cat.targetGy = clickGrid.gy;

    // 移動開始
    moveToNextTile();
}

function moveToNextTile() {
    if (cat.gx === cat.targetGx && cat.gy === cat.targetGy) {
        cat.isMoving = false;
        return;
    }

    // 次の1マスを計算
    let nextGx = cat.gx;
    let nextGy = cat.gy;

    const dx = cat.targetGx - cat.gx;
    const dy = cat.targetGy - cat.gy;

    // 方向を決定（1マスずつ移動）
    if (Math.abs(dx) >= Math.abs(dy)) {
        nextGx += Math.sign(dx);
        cat.direction = dx > 0 ? 3 : 2; // right : left
    } else {
        nextGy += Math.sign(dy);
        cat.direction = dy > 0 ? 0 : 1; // down : up
    }

    // 衝突チェック（ネズミがいたら移動しない）
    if (isTileOccupied(nextGx, nextGy)) {
        // ネズミにぶつかった - 移動キャンセル
        cat.targetGx = cat.gx;
        cat.targetGy = cat.gy;
        cat.isMoving = false;
        return;
    }

    // 1マス移動開始
    cat.startGx = cat.gx;
    cat.startGy = cat.gy;
    cat.nextGx = nextGx;
    cat.nextGy = nextGy;
    cat.isMoving = true;
    cat.moveProgress = 0;

    playSound('move');
}

canvas.addEventListener('click', (e) => handleInput(e.clientX, e.clientY));
canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    if (e.touches.length > 0) {
        handleInput(e.touches[0].clientX, e.touches[0].clientY);
    }
});

// ========== ゲームループ ==========
let lastTime = Date.now();
function gameLoop() {
    const now = Date.now();
    const dt = (now - lastTime) / 1000;
    lastTime = now;

    update(dt);
    draw();

    requestAnimationFrame(gameLoop);
}

function update(dt) {
    if (gameState !== 'playing') return;

    updateCat(dt);
    updateMice(dt);
    updateEffects(dt);

    // ネズミ生成
    if (miceSpawned < miceToSpawn && Math.random() < 0.02 + wave * 0.003) {
        spawnMouse();
    }

    // Wave終了チェック
    if (mice.length === 0 && miceSpawned >= miceToSpawn) {
        if (wave >= GAME_CONFIG.game.maxWave) {
            gameClear();
        } else {
            wave++;
            endWave();
        }
    }

    // ゲームオーバーチェック
    if (cheese.hp <= 0) {
        gameOver();
    }

    syncPlayer();
    updateUI();
}

function updateCat(dt) {
    cat.animFrame += dt * 8;

    if (cat.isMoving) {
        // グリッド間の補間移動
        cat.moveProgress += dt * 8; // 移動速度

        if (cat.moveProgress >= 1) {
            // 1マス移動完了
            cat.gx = cat.nextGx;
            cat.gy = cat.nextGy;
            const pos = getPixelPos(cat.gx, cat.gy);
            cat.x = pos.x;
            cat.y = pos.y;
            cat.moveProgress = 0;
            cat.isMoving = false;

            // まだ目標に到達していなければ次へ
            if (cat.gx !== cat.targetGx || cat.gy !== cat.targetGy) {
                moveToNextTile();
            }
        } else {
            // 補間
            const startPos = getPixelPos(cat.startGx, cat.startGy);
            const endPos = getPixelPos(cat.nextGx, cat.nextGy);
            cat.x = startPos.x + (endPos.x - startPos.x) * cat.moveProgress;
            cat.y = startPos.y + (endPos.y - startPos.y) * cat.moveProgress;
        }
    } else {
        // 攻撃処理（停止中のみ）
        cat.attackTimer += dt;

        const attackInterval = getAttackInterval();

        if (cat.attackTimer >= attackInterval) {
            cat.attackTimer = 0;
            performAttack();
        }
    }
}

function getAttackInterval() {
    let interval = 1 / GAME_CONFIG.cat.attackSpeed;
    // スキル効果
    if (cat.skills.attackSpeed1) interval /= 1.3;
    if (cat.skills.attackSpeed2) interval /= 1.3;
    if (cat.skills.attackSpeed3) interval /= 1.25;
    if (cat.skills.machineGun) interval /= 2.0;
    return interval;
}

function getAttackRange() {
    let range = 1; // マス単位
    if (cat.skills.range1) range = 1.5;
    if (cat.skills.range2) range = 2;
    if (cat.skills.range3) range = 3;
    if (cat.skills.storm) range = 5;
    return range;
}

function performAttack() {
    const range = getAttackRange();
    let attacked = false;
    let multiTarget = cat.skills.multiHit ? 2 : 1;
    let targetsHit = 0;

    for (let i = mice.length - 1; i >= 0 && targetsHit < multiTarget; i--) {
        const mouse = mice[i];

        // マンハッタン距離でチェック
        const dist = Math.abs(mouse.gx - cat.gx) + Math.abs(mouse.gy - cat.gy);

        if (dist <= range) {
            // 攻撃エフェクト
            effects.push({
                type: 'slash',
                x: mouse.x,
                y: mouse.y,
                life: 0.3,
                maxLife: 0.3,
            });

            // ダメージ
            mouse.hp -= GAME_CONFIG.cat.attackDamage;
            attacked = true;
            targetsHit++;

            playSound('attack');

            if (mouse.hp <= 0) {
                killMouse(mouse, i);
            }
        }
    }

    if (attacked) {
        const range = getAttackRange();
        effects.push({
            type: 'catAttack',
            x: cat.x,
            y: cat.y,
            direction: cat.direction,
            range: range,
            life: 0.25,
            maxLife: 0.25,
        });
        // 追加の範囲波紋エフェクト
        effects.push({
            type: 'attackRange',
            x: cat.x,
            y: cat.y,
            range: range,
            life: 0.4,
            maxLife: 0.4,
        });
    }
}

function killMouse(mouse, index) {
    effects.push({
        type: 'ascend',
        x: mouse.x,
        y: mouse.y,
        startY: mouse.y,
        life: 1.0,
        maxLife: 1.0,
    });

    playSound('kill');

    totalKills++;
    waveKills++;
    if (mouse.type === 'boss') {
        cat.sp += GAME_CONFIG.sp.perBossKill;
    }

    mice.splice(index, 1);
}

function updateMice(dt) {
    for (let i = mice.length - 1; i >= 0; i--) {
        const mouse = mice[i];

        mouse.animFrame += dt * 6;
        mouse.moveTimer += dt;

        // 移動処理
        if (!mouse.isMoving) {
            // 移動間隔（種類による）
            const moveInterval = 60 / mouse.speed;

            if (mouse.moveTimer >= moveInterval) {
                mouse.moveTimer = 0;

                // 下へ移動を試みる
                let newGy = mouse.gy + 1;
                let newGx = mouse.gx;

                // 猫との衝突チェック
                if (cat.gx === newGx && cat.gy === newGy) {
                    // 猫がいる - 左右に迂回
                    const leftFree = newGx > 0 && !isTileOccupied(newGx - 1, mouse.gy, mouse.id);
                    const rightFree = newGx < GRID_COLS - 1 && !isTileOccupied(newGx + 1, mouse.gy, mouse.id);

                    if (leftFree && rightFree) {
                        newGx += Math.random() < 0.5 ? -1 : 1;
                        newGy = mouse.gy; // 横移動
                    } else if (leftFree) {
                        newGx -= 1;
                        newGy = mouse.gy;
                    } else if (rightFree) {
                        newGx += 1;
                        newGy = mouse.gy;
                    } else {
                        // 動けない - 待機
                        continue;
                    }
                } else if (isTileOccupied(newGx, newGy, mouse.id)) {
                    // 他のネズミがいる - 待機または迂回
                    continue;
                }

                // チーズエリアに到達
                if (newGy >= GRID_ROWS - 2) {
                    // ダメージ
                    cheese.hp -= mouse.damage;
                    noCheeseeDamage = false;

                    playSound('damage');

                    effects.push({
                        type: 'bite',
                        x: cheese.gx * TILE_SIZE + TILE_SIZE / 2,
                        y: cheese.gy * TILE_SIZE,
                        life: 0.3,
                        maxLife: 0.3,
                    });

                    document.getElementById('game-container').classList.add('shake');
                    setTimeout(() => {
                        document.getElementById('game-container').classList.remove('shake');
                    }, 200);

                    mice.splice(i, 1);
                    continue;
                }

                // 移動開始
                mouse.startGx = mouse.gx;
                mouse.startGy = mouse.gy;
                mouse.targetGx = newGx;
                mouse.targetGy = newGy;
                mouse.isMoving = true;
                mouse.moveProgress = 0;
            }
        } else {
            // 移動中
            mouse.moveProgress += dt * 4;

            if (mouse.moveProgress >= 1) {
                mouse.gx = mouse.targetGx;
                mouse.gy = mouse.targetGy;
                const pos = getPixelPos(mouse.gx, mouse.gy);
                mouse.x = pos.x;
                mouse.y = pos.y;
                mouse.isMoving = false;
                mouse.moveProgress = 0;
            } else {
                const startPos = getPixelPos(mouse.startGx, mouse.startGy);
                const endPos = getPixelPos(mouse.targetGx, mouse.targetGy);
                mouse.x = startPos.x + (endPos.x - startPos.x) * mouse.moveProgress;
                mouse.y = startPos.y + (endPos.y - startPos.y) * mouse.moveProgress;
            }
        }
    }
}

function updateEffects(dt) {
    for (let i = effects.length - 1; i >= 0; i--) {
        const effect = effects[i];
        effect.life -= dt;

        if (effect.type === 'ascend') {
            effect.y -= 80 * dt;
        }

        if (effect.life <= 0) {
            effects.splice(i, 1);
        }
    }
}

// ========== 描画 ==========
function draw() {
    // 背景
    drawBackground();

    // グリッド
    drawGrid();

    // チーズ
    drawCheese();

    // 他プレイヤー
    drawOtherPlayers();

    // ネズミ
    drawMice();

    // 猫
    drawCat();

    // エフェクト
    drawEffects();

    // ボス警告オーバーレイ
    if (bossWarning) {
        ctx.fillStyle = `rgba(255, 0, 0, ${0.3 + Math.sin(Date.now() / 100) * 0.2})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
}

function drawBackground() {
    // 床タイル（シームレスパターン）
    if (images.floor && images.floor.complete) {
        const pattern = ctx.createPattern(images.floor, 'repeat');
        ctx.fillStyle = pattern;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    } else {
        ctx.fillStyle = '#8B4513';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // 夜の雰囲気（青みがかった暗さ）
    ctx.fillStyle = 'rgba(0, 0, 40, 0.4)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
}


function drawGrid() {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;

    for (let x = 0; x <= GRID_COLS; x++) {
        ctx.beginPath();
        ctx.moveTo(x * TILE_SIZE, 0);
        ctx.lineTo(x * TILE_SIZE, canvas.height);
        ctx.stroke();
    }

    for (let y = 0; y <= GRID_ROWS; y++) {
        ctx.beginPath();
        ctx.moveTo(0, y * TILE_SIZE);
        ctx.lineTo(canvas.width, y * TILE_SIZE);
        ctx.stroke();
    }

    // チーズエリア
    ctx.fillStyle = 'rgba(255, 200, 0, 0.2)';
    ctx.fillRect(0, (GRID_ROWS - 2) * TILE_SIZE, canvas.width, TILE_SIZE * 2);
}

function drawCheese() {
    const x = canvas.width / 2;
    const y = (GRID_ROWS - 1) * TILE_SIZE;

    if (images.cheese && images.cheese.complete) {
        // HPに応じたスプライト選択（4段階）(2x2グリッド)
        // 左上: 100% HP、右上: 75% HP、左下: 50% HP、右下: 25% HP
        const frameW = SPRITES.cheese.frameW;
        const frameH = SPRITES.cheese.frameH;

        const hpRatio = cheese.hp / cheese.maxHP;
        let spriteIndex = 0;
        if (hpRatio <= 0.25) spriteIndex = 3;  // 右下：ほぼ無くなった
        else if (hpRatio <= 0.5) spriteIndex = 2;  // 左下：かじられた
        else if (hpRatio <= 0.75) spriteIndex = 1;  // 右上：少し欠けた
        // else 0 = 左上：完全

        const col = spriteIndex % 2;
        const row = Math.floor(spriteIndex / 2);
        const srcX = col * frameW;
        const srcY = row * frameH;

        const drawSize = 72;

        ctx.drawImage(
            images.cheese,
            srcX, srcY, frameW, frameH,
            x - drawSize / 2, y - drawSize / 2, drawSize, drawSize
        );
    } else {
        // フォールバック描画
        ctx.fillStyle = '#FFD700';
        ctx.beginPath();
        ctx.moveTo(x - 40, y + 16);
        ctx.lineTo(x + 40, y + 16);
        ctx.lineTo(x, y - 32);
        ctx.closePath();
        ctx.fill();
    }
}


function drawMice() {
    mice.forEach(mouse => {
        const x = mouse.x;
        const y = mouse.y;
        const size = mouse.size;

        ctx.save();
        ctx.translate(x, y);

        if (images.mouse && images.mouse.complete) {
            // スプライトシートから描画 (2列×4行)
            // 行0: 通常ネズミ、行1: 速いネズミ、行2: 大きいネズミ、行3: ボスネズミ
            const frameW = SPRITES.mouse.frameW;
            const frameH = SPRITES.mouse.frameH;

            // アニメーションフレーム（2フレーム）
            const col = Math.floor(mouse.animFrame) % 2;

            // 種類に応じた行を設定
            let row = 0;
            switch (mouse.type) {
                case 'normal':
                case 'swarm':
                    row = 0;
                    break;
                case 'fast':
                    row = 1;
                    break;
                case 'big':
                    row = 2;
                    break;
                case 'boss':
                    row = 3;
                    break;
            }

            const srcX = col * frameW;
            const srcY = row * frameH;
            const drawSize = size * 1.3;

            ctx.drawImage(
                images.mouse,
                srcX, srcY, frameW, frameH,
                -drawSize / 2, -drawSize / 2, drawSize, drawSize
            );
        } else {
            // フォールバック描画
            let color = '#888888';
            if (mouse.type === 'fast') color = '#4488FF';
            else if (mouse.type === 'big') color = '#8B4513';
            else if (mouse.type === 'boss') color = '#FFD700';

            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.ellipse(0, 0, size / 2, size / 3, 0, 0, Math.PI * 2);
            ctx.fill();

            // 耳
            ctx.beginPath();
            ctx.arc(-size / 3, -size / 4, size / 5, 0, Math.PI * 2);
            ctx.arc(size / 3, -size / 4, size / 5, 0, Math.PI * 2);
            ctx.fill();
        }

        // HPバー（ボスと大きいネズミ）
        if ((mouse.type === 'boss' || mouse.type === 'big') && mouse.hp < mouse.maxHP) {
            const barWidth = size * 1.2;
            ctx.fillStyle = '#333';
            ctx.fillRect(-barWidth / 2, -size / 2 - 10, barWidth, 6);
            ctx.fillStyle = mouse.type === 'boss' ? '#FFD700' : '#00FF00';
            ctx.fillRect(-barWidth / 2, -size / 2 - 10, barWidth * (mouse.hp / mouse.maxHP), 6);
        }

        ctx.restore();
    });
}


function drawCat() {
    const x = cat.x;
    const y = cat.y;
    const size = TILE_SIZE * 1.5; // 少し大きく表示

    ctx.save();
    ctx.translate(x, y);

    // 攻撃範囲表示（猫の下に描画）
    if (!cat.isMoving) {
        const range = getAttackRange();
        const rangePixels = range * TILE_SIZE;

        // グラデーション円で攻撃範囲を表示
        const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, rangePixels);
        gradient.addColorStop(0, 'rgba(255, 200, 0, 0.0)');
        gradient.addColorStop(0.5, 'rgba(255, 200, 0, 0.1)');
        gradient.addColorStop(0.8, 'rgba(255, 150, 0, 0.25)');
        gradient.addColorStop(1, 'rgba(255, 100, 0, 0.4)');

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(0, 0, rangePixels, 0, Math.PI * 2);
        ctx.fill();

        // 外枠
        ctx.strokeStyle = 'rgba(255, 180, 0, 0.6)';
        ctx.lineWidth = 3;
        ctx.setLineDash([8, 4]);
        ctx.beginPath();
        ctx.arc(0, 0, rangePixels, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
    }

    if (images.cat && images.cat.complete) {
        // スプライトシートから描画 (4列×3行)
        const frameW = SPRITES.cat.frameW;
        const frameH = SPRITES.cat.frameH;
        let col, row;

        if (cat.isMoving) {
            // 歩行アニメーション（2-3行目を使用）
            const walkFrame = Math.floor(cat.animFrame) % 4;
            col = walkFrame;
            row = 1 + Math.floor(cat.animFrame / 4) % 2;
        } else {
            // 静止ポーズ（1行目の4方向）
            // direction: 0=down, 1=up, 2=left, 3=right
            col = cat.direction;
            row = 0;
        }

        const srcX = col * frameW;
        const srcY = row * frameH;

        ctx.drawImage(
            images.cat,
            srcX, srcY, frameW, frameH,
            -size / 2, -size / 2, size, size
        );
    } else {
        // フォールバック描画
        ctx.fillStyle = '#FF8C00';
        ctx.beginPath();
        ctx.ellipse(0, 4, size / 2.5, size / 3, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.beginPath();
        ctx.arc(0, -size / 5, size / 3.5, 0, Math.PI * 2);
        ctx.fill();

        // 耳
        ctx.beginPath();
        ctx.moveTo(-size / 4, -size / 4);
        ctx.lineTo(-size / 5, -size / 2);
        ctx.lineTo(-size / 8, -size / 4);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(size / 4, -size / 4);
        ctx.lineTo(size / 5, -size / 2);
        ctx.lineTo(size / 8, -size / 4);
        ctx.fill();

        // 目
        ctx.fillStyle = '#00FF00';
        ctx.beginPath();
        ctx.arc(-size / 8, -size / 5, 3, 0, Math.PI * 2);
        ctx.arc(size / 8, -size / 5, 3, 0, Math.PI * 2);
        ctx.fill();
    }

    ctx.restore();
}


function drawOtherPlayers() {
    for (const pid in otherPlayers) {
        const p = otherPlayers[pid];

        ctx.save();
        ctx.globalAlpha = 0.6;
        ctx.translate(p.x, p.y);

        ctx.fillStyle = p.color || '#888';
        ctx.beginPath();
        ctx.arc(0, 0, 16, 0, Math.PI * 2);
        ctx.fill();

        ctx.font = '20px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('🐱', 0, 7);

        ctx.restore();
    }
}

function drawEffects() {
    effects.forEach(effect => {
        const progress = 1 - (effect.life / effect.maxLife);

        if (effect.type === 'slash') {
            ctx.save();
            ctx.translate(effect.x, effect.y);
            ctx.globalAlpha = 1 - progress;

            if (images.effects && images.effects.complete) {
                // スプライト画像から爪マークを描画 (行0)
                const frameW = SPRITES.effects.frameW;
                const frameH = SPRITES.effects.frameH;
                const frame = Math.floor(progress * 3) % 3;
                const srcX = frame * frameW;
                const srcY = 0;

                ctx.drawImage(
                    images.effects,
                    srcX, srcY, frameW, frameH,
                    -32, -24, 64, 48
                );
            } else {
                // フォールバック: 爪マーク描画
                ctx.strokeStyle = '#FFFFFF';
                ctx.lineWidth = 4;
                ctx.lineCap = 'round';

                for (let i = 0; i < 3; i++) {
                    const offset = (i - 1) * 10;
                    ctx.beginPath();
                    ctx.moveTo(offset - 15, -20 + i * 5);
                    ctx.lineTo(offset + 15, 20 - i * 5);
                    ctx.stroke();
                }
            }

            ctx.restore();
        }

        if (effect.type === 'catAttack') {
            ctx.save();
            ctx.translate(effect.x, effect.y);
            ctx.globalAlpha = (1 - progress) * 0.8;

            const range = effect.range || 1;
            const rangePixels = range * TILE_SIZE;

            if (images.effects && images.effects.complete) {
                // スプライト画像からスターバーストを描画 (行1)
                const frameW = SPRITES.effects.frameW;
                const frameH = SPRITES.effects.frameH;
                const frame = Math.floor(progress * 3) % 3;
                const srcX = frame * frameW;
                const srcY = frameH;  // 行1

                // 攻撃方向に描画
                const scale = 1.5 + progress;
                ctx.drawImage(
                    images.effects,
                    srcX, srcY, frameW, frameH,
                    -48 * scale / 2, -48 * scale / 2, 48 * scale, 48 * scale
                );
            } else {
                // フォールバック: 波紋エフェクト
                const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, rangePixels * progress);
                gradient.addColorStop(0, 'rgba(255, 255, 200, 0.8)');
                gradient.addColorStop(0.5, 'rgba(255, 200, 50, 0.4)');
                gradient.addColorStop(1, 'rgba(255, 150, 0, 0)');

                ctx.fillStyle = gradient;
                ctx.beginPath();
                ctx.arc(0, 0, rangePixels * (0.3 + progress * 0.7), 0, Math.PI * 2);
                ctx.fill();
            }

            ctx.restore();
        }

        if (effect.type === 'ascend') {
            ctx.save();
            ctx.translate(effect.x, effect.y);
            ctx.globalAlpha = 1 - progress;

            if (images.effects && images.effects.complete) {
                // スプライト画像から天使の羽を描画 (行2)
                const frameW = SPRITES.effects.frameW;
                const frameH = SPRITES.effects.frameH;
                const frame = Math.floor(progress * 3) % 3;
                const srcX = frame * frameW;
                const srcY = frameH * 2;  // 行2

                ctx.drawImage(
                    images.effects,
                    srcX, srcY, frameW, frameH,
                    -40, -50, 80, 60
                );
            } else {
                // フォールバック描画
                // 輪
                ctx.strokeStyle = '#FFD700';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.ellipse(0, -28, 16, 6, 0, 0, Math.PI * 2);
                ctx.stroke();
                ctx.fillStyle = 'rgba(255, 215, 0, 0.3)';
                ctx.fill();

                // 羽
                ctx.fillStyle = '#FFFFFF';
                ctx.shadowColor = '#FFFFFF';
                ctx.shadowBlur = 10;
                ctx.beginPath();
                ctx.moveTo(-8, -14);
                ctx.quadraticCurveTo(-32, -26, -26, 4);
                ctx.quadraticCurveTo(-18, -4, -8, -4);
                ctx.fill();
                ctx.beginPath();
                ctx.moveTo(8, -14);
                ctx.quadraticCurveTo(32, -26, 26, 4);
                ctx.quadraticCurveTo(18, -4, 8, -4);
                ctx.fill();
                ctx.shadowBlur = 0;
            }

            ctx.restore();
        }

        if (effect.type === 'bite') {
            ctx.save();
            ctx.translate(effect.x, effect.y);
            ctx.globalAlpha = 1 - progress;

            // ダメージエフェクト
            if (images.effects && images.effects.complete) {
                // スプライト画像からダメージ表示
                const srcX = Math.floor(progress * 4) * 128;
                const srcY = 256;
                const srcW = 128;
                const srcH = 48;

                ctx.drawImage(
                    images.effects,
                    srcX, srcY, srcW, srcH,
                    -32, -24, 64, 24
                );
            } else {
                // フォールバック
                ctx.font = 'bold 28px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillStyle = '#FF0000';
                ctx.strokeStyle = '#000';
                ctx.lineWidth = 3;
                ctx.strokeText('💥', 0, 10);
                ctx.fillText('💥', 0, 10);
            }

            ctx.restore();
        }

        // 攻撃範囲エフェクト（新規追加）
        if (effect.type === 'attackRange') {
            ctx.save();
            ctx.translate(effect.x, effect.y);
            ctx.globalAlpha = (1 - progress) * 0.5;

            const range = effect.range * TILE_SIZE;

            // 波紋エフェクト
            ctx.strokeStyle = '#FFD700';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(0, 0, range * (0.5 + progress * 0.5), 0, Math.PI * 2);
            ctx.stroke();

            ctx.restore();
        }
    });
}


// ========== UI更新 ==========
function updateUI() {
    waveDisplay.textContent = wave;
    killCountDisplay.textContent = totalKills;
    spCountDisplay.textContent = cat.sp;

    const hpPercent = Math.max(0, Math.floor((cheese.hp / cheese.maxHP) * 100));
    cheeseHPBar.style.width = hpPercent + '%';
    cheeseHPText.textContent = hpPercent + '%';

    if (hpPercent < 30) {
        cheeseHPBar.style.background = '#ff4444';
    } else if (hpPercent < 60) {
        cheeseHPBar.style.background = '#ffaa00';
    } else {
        cheeseHPBar.style.background = '#44ff44';
    }
}

// ========== Firebase同期 ==========
let lastSync = 0;
function syncPlayer() {
    if (!playersRef) return;

    const now = Date.now();
    if (now - lastSync < GAME_CONFIG.sync.intervalMs) return;
    lastSync = now;

    playersRef.child(myId).set({
        x: cat.x,
        y: cat.y,
        gx: cat.gx,
        gy: cat.gy,
        isMoving: cat.isMoving,
        direction: cat.direction,
        color: cat.color,
        lastUpdate: now,
    });
}

function setupFirebaseListeners() {
    if (!db || !roomId) return;

    roomRef = db.ref(`games/catdefense/rooms/${roomId}`);
    playersRef = roomRef.child('players');

    playersRef.on('value', snapshot => {
        const data = snapshot.val();
        if (data) {
            otherPlayers = { ...data };
            delete otherPlayers[myId];

            const now = Date.now();
            let count = 1;
            for (const pid in otherPlayers) {
                if (now - otherPlayers[pid].lastUpdate > GAME_CONFIG.sync.staleTimeout) {
                    delete otherPlayers[pid];
                } else {
                    count++;
                }
            }
            playerCountDisplay.textContent = count;
        }
    });

    playersRef.child(myId).onDisconnect().remove();
}

function createOrJoinRoom() {
    if (!db) {
        roomId = 'offline';
        return;
    }

    const inputCode = roomCodeInput.value.trim().toUpperCase();

    if (inputCode) {
        roomId = inputCode;
        isHost = false;
    } else {
        roomId = Math.random().toString(36).substr(2, 6).toUpperCase();
        isHost = true;
    }

    setupFirebaseListeners();
    console.log(`Room: ${roomId}, Host: ${isHost}`);
}

// ========== ゲーム終了 ==========
function gameOver() {
    gameState = 'gameover';

    document.getElementById('result-wave').textContent = wave;
    document.getElementById('result-kills').textContent = totalKills;
    gameOverScreen.classList.remove('hidden');
}

function gameClear() {
    gameState = 'clear';

    document.getElementById('game-over-title').textContent = '🎉 GAME CLEAR!';
    document.getElementById('result-wave').textContent = wave;
    document.getElementById('result-kills').textContent = totalKills;
    gameOverScreen.classList.remove('hidden');
}

// ========== イベントリスナー ==========
startBtn.addEventListener('click', () => {
    createOrJoinRoom();
    init();
    gameLoop();
});

nextWaveBtn.addEventListener('click', () => {
    startWave();
});

restartBtn.addEventListener('click', () => {
    location.reload();
});

window.addEventListener('beforeunload', () => {
    if (playersRef) {
        playersRef.child(myId).remove();
    }
});

updateUI();
