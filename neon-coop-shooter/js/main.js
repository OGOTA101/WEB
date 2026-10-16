// ===== Main Entry Point =====
import { InputHandler } from './input.js';
import { Renderer } from './renderer.js';
import { SoundManager, CREDIT_INFO } from './sound.js';
import { GameEngine } from './game.js';
import { NetworkManager } from './network.js';
import { PARTS_DB, getPartById, getDefaultLoadout, getGachaPool } from './parts.js';

// === Constants ===
const CANVAS_W = 360;
const CANVAS_H = 640;

// === State ===
let currentScreen = 'title';
let gameMode = 'single'; // 'single' | 'randomMulti' | 'passwordMulti'
let loadout = null;
let ownedParts = {};
let energy = 0;
let selectedStageId = 1; // Track which stage was selected before lobby

// === DOM Elements ===
const canvas = document.getElementById('game-canvas');
const overlay = document.getElementById('screen-overlay');
const hud = document.getElementById('hud');

// Screens
const screens = {
    title: document.getElementById('screen-title'),
    lobby: document.getElementById('screen-lobby'),
    stage: document.getElementById('screen-stage'),
    result: document.getElementById('screen-result'),
    gacha: document.getElementById('screen-gacha'),
    customize: document.getElementById('screen-customize'),
    howto: document.getElementById('screen-howto'),
    credits: document.getElementById('screen-credits'),
};

// === Init modules ===
const renderer = new Renderer(canvas, onPhaserUpdate);
const sound = new SoundManager();
const engine = new GameEngine(renderer, sound);
const network = new NetworkManager();
const input = new InputHandler(canvas);

// === Screen Management ===
function showScreen(name) {
    currentScreen = name;
    if (name === 'game') {
        overlay.classList.add('hidden');
        hud.classList.remove('hidden');
        stopPreviewAnim();
        return;
    }
    overlay.classList.remove('hidden');
    hud.classList.add('hidden');
    for (const [k, el] of Object.entries(screens)) {
        if (k === name) {
            el.classList.add('active');
            el.classList.remove('hidden');
        } else {
            el.classList.remove('active');
            el.classList.add('hidden');
        }
    }
    // Stop customize preview when leaving
    if (name !== 'customize') {
        stopPreviewAnim();
    }
    // Play title typing animation when returning to title
    if (name === 'title') {
        playTitleTyping();
    }
}

// === Resize ===
// === Resize ===
const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

function resizeCanvas() {
    renderer.setMobileMode(false);
    renderer.resize(CANVAS_W, CANVAS_H);
}

// === Load saved data ===
function loadSaveData() {
    // Migration: check nf_coins first
    const legacyCoins = localStorage.getItem('nf_coins');
    if (legacyCoins !== null) {
        energy = parseInt(legacyCoins);
        localStorage.removeItem('nf_coins');
    } else {
        energy = parseInt(localStorage.getItem('nf_energy') || '0');
    }
    loadout = JSON.parse(localStorage.getItem('nf_loadout') || 'null') || getDefaultLoadout();
    ownedParts = JSON.parse(localStorage.getItem('nf_owned') || 'null') || {
        body: ['standard_frame'],
        mainWeapon: ['rapid_vulcan'],
        subWeapon: ['sniper_cannon'],
        backpack: ['boost_vernier'],
        accessory: ['none'],
    };
}

function saveSaveData() {
    localStorage.setItem('nf_energy', String(energy));
    localStorage.setItem('nf_loadout', JSON.stringify(loadout));
    localStorage.setItem('nf_owned', JSON.stringify(ownedParts));
    updateFooter();
}

function updateFooter() {
    const el = document.getElementById('energy-val');
    if (el) el.textContent = energy;
}

// === HUD Updates ===
function updateHPDisplay(hp, maxHp) {
    const container = document.getElementById('player-hp');
    container.innerHTML = '';
    for (let i = 0; i < maxHp; i++) {
        const pip = document.createElement('div');
        pip.className = 'hp-pip' + (i >= hp ? ' empty' : '');
        container.appendChild(pip);
    }
}

function updateBossHP(hp, maxHp) {
    const fill = document.getElementById('boss-hp-fill');
    const pct = Math.max(0, hp / maxHp * 100);
    fill.style.width = pct + '%';
}

function updateWaveDisplay(wave, total) {
    document.getElementById('wave-display').textContent = `WAVE ${wave + 1}/${total}`;
    document.getElementById('boss-name').textContent = engine.boss ? engine.boss.name : 'BOSS';
}

function updateBombCooldown(cd) {
    const icon = document.getElementById('bomb-icon');
    icon.classList.add('on-cooldown');
    setTimeout(() => icon.classList.remove('on-cooldown'), cd);
}

function updateEvadeCooldown(cd) {
    const icon = document.getElementById('evade-icon');
    icon.classList.add('on-cooldown');
    setTimeout(() => icon.classList.remove('on-cooldown'), cd);
}

// === Game Start ===
function startGame(stageId, playerCount) {
    sound.init();
    sound.startBGM();
    engine.start(stageId, playerCount, loadout);
    engine.onBossHPChange = updateBossHP;
    engine.onPlayerHPChange = updateHPDisplay;
    engine.onWaveChange = (wave, total) => {
        updateWaveDisplay(wave, total);
        if (gameMode !== 'single') {
            network.sendWave(wave);
        }
    };
    engine.onReviveAlly = (targetId) => {
        if (gameMode !== 'single') {
            // Signal to the target player that they were revived
            network.sendPlayerState({ revivingTarget: targetId });
        }
    };
    engine.onBombCooldown = updateBombCooldown;
    engine.onEvadeCooldown = updateEvadeCooldown;
    engine.onGameOver = () => {
        gameOver(false);
    };
    engine.onStageClear = (elapsed) => {
        gameClear(elapsed);
    };
    engine.onGainEnergy = (amount) => {
        energy += amount;
        saveSaveData();
        // Optional: show +Energy effect?
    };

    updateHPDisplay(engine.player.hp, engine.player.maxHp);
    showScreen('game');

    // Show/hide pause button (hidden in multiplayer)
    const pauseBtn = document.getElementById('btn-pause');
    if (playerCount > 1) {
        pauseBtn.classList.add('hidden');
    } else {
        pauseBtn.classList.remove('hidden');
    }
    document.getElementById('pause-overlay').classList.add('hidden');
}

function gameOver(won) {
    engine.running = false;
    sound.stopBGM();
    sound.playResult();
    const title = document.getElementById('result-title');
    title.innerHTML = 'ミッションシッパイ<span class="heading-en">MISSION FAILED</span>';
    title.style.color = '#ff2244';
    document.getElementById('res-time').textContent = formatTime(Date.now() - engine.startTime);
    document.getElementById('res-damage').textContent = '獲得エネルギー: 10⚡';

    energy += 10;
    saveSaveData();

    showScreen('result');
    network.leaveRoom();
}

function gameClear(elapsed) {
    engine.running = false;
    sound.stopBGM();
    sound.playResult();
    sound.playBossDeath();
    const title = document.getElementById('result-title');
    title.innerHTML = 'ミッションクリア<span class="heading-en">MISSION COMPLETE</span>';
    title.style.color = '#00ff88';
    document.getElementById('res-time').textContent = formatTime(elapsed);
    document.getElementById('res-damage').textContent = '✓ ALL BOSSES DEFEATED  |  獲得エネルギー: 100⚡';

    energy += 100;
    saveSaveData();

    showScreen('result');
    network.leaveRoom();
}

function formatTime(ms) {
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    return `${String(m).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

// === Stage Select ===
function openStageSelect() {
    const indicator = document.getElementById('stage-mode-indicator');
    if (gameMode === 'single') {
        indicator.textContent = 'SINGLE PLAY';
        indicator.className = 'stage-mode-indicator single';
    } else {
        const pw = document.getElementById('input-password').value.trim();
        if (pw) {
            indicator.textContent = `MULTI (合言葉: ${pw})`;
            indicator.className = 'stage-mode-indicator multi-pw';
        } else {
            indicator.textContent = 'MULTI (自動マッチ 2人)';
            indicator.className = 'stage-mode-indicator multi';
        }
    }
    showScreen('stage');
}

// Called when a stage is selected
function onStageSelected(stageId) {
    selectedStageId = stageId;

    if (gameMode === 'single') {
        // Single: start game immediately
        startGame(stageId, 1);
        return;
    }

    // Multi mode
    const password = document.getElementById('input-password').value.trim();

    if (password) {
        // Password match: go to lobby, wait for up to 4, all must Ready
        network.init().then(() => openLobby('passwordMulti', password, stageId));
    } else {
        // Auto match: go to lobby, auto-start when 2 found
        network.init().then(() => openLobby('randomMulti', null, stageId));
    }
}

// === Lobby ===
let lobbyInterval = null;

function openLobby(mode, password, stageId) {
    gameMode = mode;
    showScreen('lobby');

    const modeLabel = document.getElementById('lobby-mode-label');
    const statusEl = document.getElementById('lobby-status');
    const actionsEl = document.getElementById('lobby-actions');
    const readyBtn = document.getElementById('btn-ready');

    // Reset ready button
    readyBtn.textContent = '準備完了';
    readyBtn.style.borderColor = '';
    readyBtn.style.color = '';

    document.getElementById('lobby-players').innerHTML = '';
    actionsEl.classList.add('hidden');

    if (mode === 'randomMulti') {
        modeLabel.textContent = '自動マッチング（2人）';
        modeLabel.className = 'lobby-mode-label auto-match';
        statusEl.textContent = 'マッチング中...';
    } else {
        modeLabel.textContent = `合言葉マッチ: ${password}`;
        modeLabel.className = 'lobby-mode-label password-match';
        statusEl.textContent = '参加者を待っています...';
    }

    network.onPlayersChanged = (players) => {
        renderLobbyPlayers(players);
        const count = Object.keys(players).length;

        if (mode === 'randomMulti') {
            // Auto match: auto-start when 2 players found
            if (count >= 2) {
                statusEl.textContent = `${count}人が参加 — ゲーム開始！`;
                // Host auto-starts the game
                if (network.isHost) {
                    setTimeout(async () => {
                        await network.startGame(stageId || selectedStageId);
                    }, 1000);
                }
            }
        } else {
            // Password match: show ready button when 2+ players
            statusEl.textContent = `${count}人が参加中`;
            if (count >= 2) {
                actionsEl.classList.remove('hidden');
            }
        }
    };

    network.onGameStart = (playerCount, startStageId) => {
        startGame(startStageId, playerCount);
    };

    if (mode === 'randomMulti') {
        network.findRandomMatch();
    } else if (mode === 'passwordMulti') {
        network.findPasswordMatch(password);
    }
}

function renderLobbyPlayers(players) {
    const container = document.getElementById('lobby-players');
    container.innerHTML = '';
    let i = 0;
    for (const [pid, data] of Object.entries(players)) {
        const card = document.createElement('div');
        card.className = 'lobby-player-card' + (data.ready ? ' ready' : '');
        const icon = document.createElement('div');
        icon.className = 'player-icon';
        icon.style.backgroundColor = ['#00f0ff', '#ff00aa', '#00ff88', '#ffee00'][i % 4];
        card.appendChild(icon);
        const label = document.createElement('span');
        label.textContent = pid === network.playerId ? 'YOU' : `P${i + 1}`;
        card.appendChild(label);
        if (data.ready) {
            const rdyLabel = document.createElement('span');
            rdyLabel.textContent = 'READY';
            rdyLabel.style.color = '#00ff88';
            rdyLabel.style.fontSize = '8px';
            card.appendChild(rdyLabel);
        }
        container.appendChild(card);
        i++;
    }
}

// === Customize ===
let customizeSlot = null;

function openCustomize() {
    showScreen('customize');
    drawPreview();
    startPreviewAnim();
    openPartsList('body'); // Default to body slot
}

function updateCustomizeUI() {
    // No longer needed with radial button layout
}

function drawPreview() {
    const c = document.getElementById('preview-canvas');
    if (!c) return;
    const ctx = c.getContext('2d');
    ctx.clearRect(0, 0, c.width, c.height);

    // Build a mock player object from current loadout
    const body = getPartById('body', loadout.body);
    const main = getPartById('mainWeapon', loadout.mainWeapon);
    const sub = getPartById('subWeapon', loadout.subWeapon);
    const back = getPartById('backpack', loadout.backpack);
    const acc = getPartById('accessory', loadout.accessory);

    const time = Date.now();
    const mockPlayer = {
        x: 0, y: 0,
        color: body.color,
        isStopped: true,
        invincible: false,
        dead: false,
        jumpProgress: 0,
        jumping: false,
        touching: true,
        showTarget: false,
        showBits: sub.pattern === 'bits',
        bitsColor: sub.color,
        stoppedSince: time - 1000,
        chargeStart: time - 1000,
        mainDeploy: 1,
        subDeploy: 1,
        body, main, sub, back, acc,
    };

    // Use renderer's draw methods at 2x scale, centered
    ctx.save();
    ctx.translate(c.width / 2, c.height / 2);
    ctx.scale(2, 2);

    // Draw background glow
    ctx.fillStyle = body.color + '11';
    ctx.beginPath();
    ctx.arc(0, 0, 40, 0, Math.PI * 2);
    ctx.fill();

    // Use the renderer's part drawing methods
    renderer._drawBackpack(ctx, mockPlayer, time);
    renderer._drawBody(ctx, mockPlayer, time);
    renderer._drawMainWeapon(ctx, mockPlayer, time);
    renderer._drawSubWeapon(ctx, mockPlayer, time);
    renderer._drawAccessory(ctx, mockPlayer, time);

    // Hitbox dot
    ctx.fillStyle = '#fff';
    ctx.shadowBlur = 4;
    ctx.shadowColor = '#fff';
    ctx.fillRect(-1, -1, 2, 2);

    ctx.restore();
}

// Keep preview animating when on customize screen
let previewAnimId = null;

function animatePreview() {
    if (currentScreen === 'customize') {
        drawPreview();
    }
    previewAnimId = requestAnimationFrame(animatePreview);
}

// Start preview animation on customize open (called from openCustomize)
function startPreviewAnim() {
    if (previewAnimId) cancelAnimationFrame(previewAnimId);
    previewAnimId = requestAnimationFrame(animatePreview);
}

function stopPreviewAnim() {
    if (previewAnimId) {
        cancelAnimationFrame(previewAnimId);
        previewAnimId = null;
    }
}

function openPartsList(slot) {
    customizeSlot = slot;
    const titleEl = document.getElementById('parts-list-title');
    const itemsEl = document.getElementById('parts-list-items');

    // Highlight active slot button
    document.querySelectorAll('.slot-btn').forEach(b => b.classList.remove('active'));
    const slotBtnMap = { body: 'sbtn-body', mainWeapon: 'sbtn-main', subWeapon: 'sbtn-sub', backpack: 'sbtn-back', accessory: 'sbtn-acc' };
    const activeBtn = document.getElementById(slotBtnMap[slot]);
    if (activeBtn) activeBtn.classList.add('active');

    titleEl.textContent = slot.toUpperCase();
    itemsEl.innerHTML = '';
    sound.playSelect();

    const owned = ownedParts[slot] || [];
    const allParts = PARTS_DB[slot];

    for (const part of allParts) {
        if (!owned.includes(part.id)) continue;
        const btn = document.createElement('button');
        btn.className = 'part-item' + (loadout[slot] === part.id ? ' equipped' : '');
        btn.innerHTML = `<div class="part-item-name">${part.name}</div><div class="part-item-desc">${part.desc}</div>`;

        // Tap to equip (stay open)
        btn.addEventListener('click', () => {
            sound.playEquipSet();
            loadout[slot] = part.id;
            saveSaveData();
            drawPreview();
            // Refresh list to update equipped state without closing
            openPartsList(slot);
        });

        // Long-press to show detail dialog
        let longPressTimer = null;
        const startLongPress = (e) => {
            longPressTimer = setTimeout(() => {
                e.preventDefault();
                showPartDetail(slot, part);
            }, 500);
        };
        const cancelLongPress = () => {
            if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null; }
        };
        btn.addEventListener('touchstart', startLongPress, { passive: false });
        btn.addEventListener('touchend', cancelLongPress);
        btn.addEventListener('touchmove', cancelLongPress);
        btn.addEventListener('mousedown', startLongPress);
        btn.addEventListener('mouseup', cancelLongPress);
        btn.addEventListener('mouseleave', cancelLongPress);

        itemsEl.appendChild(btn);
    }
}

// === Part Detail Dialog ===
function showPartDetail(slot, part) {
    sound.playEquip();
    const dialog = document.getElementById('part-detail-dialog');
    dialog.classList.remove('hidden');

    document.getElementById('part-detail-name').textContent = part.name;
    document.getElementById('part-detail-name').style.color = part.color;

    // Rarity + Series badge
    const seriesColor = { 'Standard': '#888', 'Phantom': '#aa44ff', 'Apex': '#ffee00', 'Zero': '#ff00aa' };
    const sc = seriesColor[part.series] || '#666';
    document.getElementById('part-detail-rarity').innerHTML = `<span style="color:${part.color};font-family:Orbitron;font-weight:900;font-size:20px">${part.rarity}</span> <span style="color:${sc};font-size:11px;border:1px solid ${sc};padding:1px 6px;border-radius:3px;margin-left:4px">${part.series || '—'}</span>`;
    document.getElementById('part-detail-desc').textContent = part.desc;

    // Build stats text
    let stats = '';
    if (slot === 'body') {
        stats = `HP: ${part.hp}  |  ボム: ${part.bombType}\nクールダウン: ${part.bombCooldown / 1000}秒`;
    } else if (slot === 'mainWeapon') {
        stats = `ダメージ: ${part.damage}  |  発射間隔: ${part.fireRate}ms\nパターン: ${part.pattern}`;
    } else if (slot === 'subWeapon') {
        stats = `ダメージ: ${part.damage}  |  発射間隔: ${part.fireRate}ms\nパターン: ${part.pattern}`;
        if (part.healAmount) stats += `  |  回復量: ${part.healAmount}`;
    } else if (slot === 'backpack') {
        stats = `アクション: ${part.actionType}  |  CD: ${part.cooldown / 1000}秒\n移動速度: ${part.moveSpeed} (${part.moveSpeed <= 4 ? '遅' : part.moveSpeed <= 6 ? '普' : '速'})`;
    } else if (slot === 'accessory') {
        stats = `効果: ${part.effect}`;
        if (part.value !== undefined) stats += `  |  値: ${part.value}`;
        if (part.interval) stats += `  |  間隔: ${part.interval / 1000}秒`;
    }
    document.getElementById('part-detail-stats').textContent = stats;

    // Flavor text
    const flavorEl = document.getElementById('part-detail-flavor');
    if (flavorEl) {
        flavorEl.textContent = part.flavor || '';
    }

    // Draw part on detail canvas
    drawPartDetailCanvas(slot, part);
}

function drawPartDetailCanvas(slot, part) {
    const c = document.getElementById('part-detail-canvas');
    const ctx = c.getContext('2d');
    ctx.clearRect(0, 0, c.width, c.height);

    // Dark bg
    ctx.fillStyle = '#0a0a1a';
    ctx.fillRect(0, 0, c.width, c.height);

    // Grid lines
    ctx.strokeStyle = 'rgba(0,240,255,0.05)';
    ctx.lineWidth = 1;
    for (let x = 0; x < c.width; x += 20) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, c.height); ctx.stroke(); }
    for (let y = 0; y < c.height; y += 20) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(c.width, y); ctx.stroke(); }

    // Create a mock player to render the specific part
    const body = getPartById('body', loadout.body);
    const main = getPartById('mainWeapon', loadout.mainWeapon);
    const sub = getPartById('subWeapon', loadout.subWeapon);
    const back = getPartById('backpack', loadout.backpack);
    const acc = getPartById('accessory', loadout.accessory);

    // Override the slot with the selected part
    const parts = { body, main, sub, back, acc };
    if (slot === 'body') parts.body = part;
    else if (slot === 'mainWeapon') parts.main = part;
    else if (slot === 'subWeapon') parts.sub = part;
    else if (slot === 'backpack') parts.back = part;
    else if (slot === 'accessory') parts.acc = part;

    const mockPlayer = {
        x: 0, y: 0, color: parts.body.color,
        isStopped: true, invincible: false, dead: false,
        jumpProgress: 0, jumping: false, touching: false, showTarget: false,
        stoppedSince: performance.now() - 1000, chargeStart: performance.now() - 1000,
        body: parts.body, main: parts.main, sub: parts.sub, back: parts.back, acc: parts.acc,
    };

    ctx.save();
    ctx.translate(c.width / 2, c.height / 2);
    ctx.scale(3.5, 3.5);

    renderer._drawBackpack(ctx, mockPlayer, performance.now());
    renderer._drawBody(ctx, mockPlayer, performance.now());
    renderer._drawMainWeapon(ctx, mockPlayer, performance.now());
    renderer._drawSubWeapon(ctx, mockPlayer, performance.now());
    renderer._drawAccessory(ctx, mockPlayer, performance.now());

    ctx.restore();
}

// === Gacha ===
function openGacha() {
    showScreen('gacha');
    document.getElementById('gacha-result').classList.add('hidden');
}

function pullGacha() {
    if (energy < 500) {
        alert('エネルギーが足りません！ (必要: 500⚡)');
        return;
    }
    sound.init();
    energy -= 500;
    saveSaveData();
    updateFooter();

    const pool = getGachaPool();
    const item = pool[Math.floor(Math.random() * pool.length)];

    // Add to owned
    if (!ownedParts[item.slot]) ownedParts[item.slot] = [];
    if (!ownedParts[item.slot].includes(item.id)) {
        ownedParts[item.slot].push(item.id);
    }
    saveSaveData();

    // Show result
    const resultEl = document.getElementById('gacha-result');
    resultEl.classList.remove('hidden');
    const cardEl = document.getElementById('gacha-result-card');
    cardEl.style.borderColor = item.color;
    cardEl.style.boxShadow = `0 0 20px ${item.color}44`;
    cardEl.innerHTML = `<span style="color:${item.color};font-family:Orbitron;font-size:24px;font-weight:900">${item.rarity}</span>`;
    document.getElementById('gacha-result-name').textContent = item.name;
    document.getElementById('gacha-result-name').style.color = item.color;
    document.getElementById('gacha-result-desc').textContent = item.desc;

    sound.playGacha();
}

// === Event Listeners ===
function bindEvents() {
    // Title — SINGLE: go to stage select in single mode
    document.getElementById('btn-single').addEventListener('click', () => {
        sound.init();
        sound.playDecide();
        gameMode = 'single';
        openStageSelect();
    });

    // Title — MULTI: go to stage select in multi mode
    document.getElementById('btn-multi').addEventListener('click', () => {
        sound.init();
        sound.playDecide();
        gameMode = 'multi';
        openStageSelect();
    });

    document.getElementById('btn-customize').addEventListener('click', () => {
        sound.init();
        sound.playSelect();
        openCustomize();
    });
    document.getElementById('btn-gacha').addEventListener('click', () => {
        sound.init();
        sound.playSelect();
        openGacha();
    });
    document.getElementById('btn-howto').addEventListener('click', () => {
        sound.init();
        sound.playSelect();
        showScreen('howto');
        // Reset to page 1 and draw howto canvas
        document.getElementById('howto-page-1').classList.add('active');
        document.getElementById('howto-page-1').classList.remove('hidden');
        document.getElementById('howto-page-2').classList.remove('active');
        document.getElementById('howto-page-2').classList.add('hidden');
        drawHowtoCanvas();
    });
    document.getElementById('btn-credits').addEventListener('click', () => {
        sound.init();
        sound.playSelect();
        updateCreditsUI();
        showScreen('credits');
    });

    // Stage select — selecting a stage triggers mode-dependent behavior
    document.querySelectorAll('.stage-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            sound.playStageSelect();
            const stageId = parseInt(btn.dataset.stage);
            onStageSelected(stageId);
        });
    });
    document.getElementById('btn-stage-back').addEventListener('click', () => {
        sound.playCancel();
        showScreen('title');
    });

    // Lobby — Ready button (only used for password match)
    document.getElementById('btn-ready').addEventListener('click', async () => {
        await network.setReady(true);
        sound.playReady();
        const readyBtn = document.getElementById('btn-ready');
        readyBtn.querySelector('.btn-jp').textContent = 'ジュンビカンリョウ！';
        readyBtn.style.borderColor = '#00ff88';
        readyBtn.style.color = '#00ff88';

        // Check if all ready → host starts game
        setTimeout(async () => {
            const allReady = await network.checkAllReady();
            if (allReady && network.isHost) {
                await network.startGame(selectedStageId);
            }
        }, 500);
    });
    document.getElementById('btn-lobby-back').addEventListener('click', () => {
        sound.playCancel();
        network.leaveRoom();
        showScreen('title');
    });

    // Result
    document.getElementById('btn-result-title').addEventListener('click', () => {
        sound.playSelect();
        showScreen('title');
    });

    // Gacha
    document.getElementById('btn-gacha-pull').addEventListener('click', () => {
        sound.playDecide();
        pullGacha();
    });
    document.getElementById('btn-gacha-back').addEventListener('click', () => {
        sound.playCancel();
        showScreen('title');
    });

    // Customize - slot buttons
    document.querySelectorAll('.slot-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            sound.playEquip();
            openPartsList(btn.dataset.slot);
        });
    });
    document.getElementById('btn-customize-back').addEventListener('click', () => {
        sound.playCancel();
        showScreen('title');
    });

    // How to play
    document.getElementById('btn-howto-back').addEventListener('click', () => {
        sound.playCancel();
        showScreen('title');
    });

    // Credits
    document.getElementById('btn-credits-back').addEventListener('click', () => {
        sound.playCancel();
        sound.stopBGM();
        showScreen('title');
    });

    // Pause
    document.getElementById('btn-pause').addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        sound.playSelect();
        engine.paused = true;
        document.getElementById('pause-overlay').classList.remove('hidden');
    });
    document.getElementById('btn-resume').addEventListener('click', () => {
        sound.playDecide();
        engine.paused = false;
        document.getElementById('pause-overlay').classList.add('hidden');
    });
    document.getElementById('btn-pause-title').addEventListener('click', () => {
        sound.playCancel();
        engine.stop();
        document.getElementById('pause-overlay').classList.add('hidden');
        sound.stopBGM();
        showScreen('title');
    });

    // Footer volume
    document.getElementById('vol-bgm').addEventListener('input', (e) => {
        sound.setBGMVolume(parseFloat(e.target.value));
    });
    document.getElementById('vol-se').addEventListener('input', (e) => {
        sound.setSEVolume(parseFloat(e.target.value));
    });

    // Input
    input.onStart = (x, y) => engine.onTouchStart(x, y);
    input.onMove = (x, y) => engine.onTouchMove(x, y);
    input.onEnd = () => engine.onTouchEnd();
    input.onDoubleTap = () => engine.onDoubleTap();
    input.onSwipeUp = () => engine.onSwipeUp();

    // Network callbacks
    network.onRemotePlayerUpdate = (pid, state) => {
        engine.applyRemotePlayerState(pid, state);
    };
    network.onBossHPSync = (hp) => {
        engine.applyBossHP(hp);
    };
    network.onWaveSync = (wave) => {
        if (engine.currentWave !== wave) {
            engine.startWave(wave);
        }
    };
}

// === Credits UI ===
function updateCreditsUI() {
    // BGM list
    const listEl = document.getElementById('bgm-list-container');
    if (listEl) {
        listEl.innerHTML = '';
        if (sound.hasBGMFiles) {
            sound.bgmList.forEach((bgm, idx) => {
                const div = document.createElement('div');
                div.className = `bgm-item ${sound.currentBgmIndex === idx ? 'active' : ''}`;
                div.innerHTML = `<span>${bgm.name}</span>${sound.currentBgmIndex === idx ? '<span class="bgm-now">♪ NOW PLAYING</span>' : ''}`;
                div.addEventListener('click', () => {
                    sound.playSelect();
                    sound.changeBGM(idx);
                    updateCreditsUI();
                });
                listEl.appendChild(div);
            });
        } else {
            listEl.innerHTML = '<div style="font-size:12px; opacity:0.5; padding:8px;">BGMファイル未設定</div>';
        }
    }

    // Credit links
    const bgmLink = document.getElementById('bgm-credit-link');
    if (bgmLink) {
        bgmLink.textContent = CREDIT_INFO.bgm.source;
        bgmLink.href = CREDIT_INFO.bgm.url;
    }
    const seLink = document.getElementById('se-credit-link');
    if (seLink) {
        seLink.textContent = CREDIT_INFO.se.source;
        seLink.href = CREDIT_INFO.se.url;
    }
}

// === Title Typing Animation ===
let titleTypingTimer = null;

function playTitleTyping() {
    const titleEl = document.getElementById('title-text');
    const subtitleEl = document.getElementById('title-subtitle');
    const cursorEl = document.querySelector('.title-cursor');
    const fullText = 'GRID NOVA';
    let charIdx = 0;

    // Reset
    titleEl.innerHTML = '';
    subtitleEl.classList.remove('visible');
    cursorEl.classList.add('active');
    if (titleTypingTimer) clearInterval(titleTypingTimer);

    titleTypingTimer = setInterval(() => {
        if (charIdx < fullText.length) {
            const ch = fullText[charIdx];
            if (ch === ' ') {
                titleEl.innerHTML += '&nbsp;';
            } else {
                titleEl.innerHTML += ch;
                // Play keystroke SE every few chars
                if (charIdx % 2 === 0) {
                    sound._playSE('select');
                }
            }
            charIdx++;
        } else {
            clearInterval(titleTypingTimer);
            titleTypingTimer = null;
            // Impact SE when title complete
            setTimeout(() => {
                sound.init();
                sound._playSE('impact');
                cursorEl.classList.remove('active');
                subtitleEl.textContent = '対 GRID 掌討作戦';
                subtitleEl.classList.add('visible');
            }, 200);
        }
    }, 90);
}

// === Game Loop ===
let syncTimer = 0;

function onPhaserUpdate(time, delta) {
    if (currentScreen === 'game' && engine.running) {
        engine.update(delta);
        engine.draw(time);

        // Multiplayer sync
        if (gameMode !== 'single') {
            syncTimer += delta;
            if (syncTimer > 50) {
                syncTimer = 0;
                const state = engine.getPlayerState();
                if (state) network.sendPlayerState(state);
                if (engine.boss && network.isHost) {
                    network.sendBossHP(engine.boss.hp);
                }
            }
        }
    } else if (currentScreen === 'title') {
        // Animated background on title
        renderer.drawTitleBackground(time, loadout, gameMode);
    }
}

// The title background drawing is now handled by renderer.js and PixiJS

// === Howto Canvas Drawing ===
function drawHowtoCanvas() {
    const c = document.getElementById('howto-canvas');
    if (!c) return;
    const ctx = c.getContext('2d');
    ctx.clearRect(0, 0, c.width, c.height);

    // Dark bg with grid
    ctx.fillStyle = '#05050d';
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.strokeStyle = 'rgba(0,240,255,0.05)';
    ctx.lineWidth = 1;
    for (let x = 0; x < c.width; x += 20) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, c.height); ctx.stroke(); }
    for (let y = 0; y < c.height; y += 20) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(c.width, y); ctx.stroke(); }

    // Draw player mech (left side)
    const body = getPartById('body', loadout.body);
    const main = getPartById('mainWeapon', loadout.mainWeapon);
    const sub = getPartById('subWeapon', loadout.subWeapon);
    const back = getPartById('backpack', loadout.backpack);
    const acc = getPartById('accessory', loadout.accessory);
    const t = performance.now();

    const mockPlayer = {
        x: 0, y: 0, color: body.color,
        isStopped: true, invincible: false, dead: false,
        jumpProgress: 0, jumping: false, touching: false, showTarget: false,
        stoppedSince: t - 1000, chargeStart: t - 1000,
        body, main, sub, back, acc,
    };

    // Draw player at left
    ctx.save();
    ctx.translate(70, 90);
    ctx.scale(2.5, 2.5);
    renderer._drawBackpack(ctx, mockPlayer, t);
    renderer._drawBody(ctx, mockPlayer, t);
    renderer._drawMainWeapon(ctx, mockPlayer, t);
    renderer._drawSubWeapon(ctx, mockPlayer, t);
    renderer._drawAccessory(ctx, mockPlayer, t);
    ctx.restore();

    // "VS" text
    ctx.fillStyle = '#ff2244';
    ctx.font = '900 16px Orbitron';
    ctx.textAlign = 'center';
    ctx.shadowColor = '#ff2244';
    ctx.shadowBlur = 10;
    ctx.fillText('VS', c.width / 2, 95);
    ctx.shadowBlur = 0;

    // Draw enemy boss (right side) — geometric style
    ctx.save();
    ctx.translate(210, 60);
    // Boss body
    ctx.fillStyle = '#ff4466';
    ctx.shadowColor = '#ff4466';
    ctx.shadowBlur = 12;
    ctx.fillRect(-20, -20, 40, 40);
    ctx.shadowBlur = 0;
    // Inner detail
    ctx.strokeStyle = '#ff8844';
    ctx.lineWidth = 2;
    ctx.strokeRect(-12, -12, 24, 24);
    // Eyes
    ctx.fillStyle = '#ffee00';
    ctx.shadowColor = '#ffee00';
    ctx.shadowBlur = 6;
    ctx.fillRect(-8, -6, 5, 5);
    ctx.fillRect(3, -6, 5, 5);
    ctx.shadowBlur = 0;
    // HP bar
    ctx.fillStyle = '#333';
    ctx.fillRect(-22, -32, 44, 5);
    ctx.fillStyle = '#ff4466';
    ctx.fillRect(-22, -32, 30, 5);
    // Name
    ctx.fillStyle = '#ff4466';
    ctx.font = '700 11px Orbitron';
    ctx.textAlign = 'center';
    ctx.fillText('SCOUT', 0, 38);
    ctx.restore();

    // Bullets flying
    ctx.fillStyle = '#00f0ff';
    ctx.shadowColor = '#00f0ff';
    ctx.shadowBlur = 4;
    for (let i = 0; i < 3; i++) {
        ctx.fillRect(110 + i * 20, 70 - i * 12, 3, 8);
    }
    // Enemy bullets
    ctx.fillStyle = '#ff4466';
    ctx.shadowColor = '#ff4466';
    for (let i = 0; i < 3; i++) {
        ctx.fillRect(160 - i * 15, 80 + i * 8, 4, 4);
    }
    ctx.shadowBlur = 0;

    // Labels
    ctx.fillStyle = '#00f0ff';
    ctx.font = '500 12px Rajdhani';
    ctx.textAlign = 'center';
    ctx.fillText('YOUR MECH', 70, 20);
    ctx.fillStyle = '#ff4466';
    ctx.fillText('BOSS ENEMY', 210, 20);
}

// === Howto page navigation & detail dialog events ===
function bindHowtoAndDetailEvents() {
    // Howto page navigation
    document.getElementById('btn-howto-next').addEventListener('click', () => {
        sound.playSelect();
        document.getElementById('howto-page-1').classList.remove('active');
        document.getElementById('howto-page-1').classList.add('hidden');
        document.getElementById('howto-page-2').classList.add('active');
        document.getElementById('howto-page-2').classList.remove('hidden');
    });
    document.getElementById('btn-howto-prev').addEventListener('click', () => {
        sound.playSelect();
        document.getElementById('howto-page-2').classList.remove('active');
        document.getElementById('howto-page-2').classList.add('hidden');
        document.getElementById('howto-page-1').classList.add('active');
        document.getElementById('howto-page-1').classList.remove('hidden');
    });

    // Part detail dialog close
    document.getElementById('btn-detail-close').addEventListener('click', () => {
        sound.playCancel();
        document.getElementById('part-detail-dialog').classList.add('hidden');
    });
}

// === Init ===
function init() {
    resizeCanvas();
    loadSaveData();
    bindEvents();
    bindHowtoAndDetailEvents();

    // Footer & Volume init
    updateFooter();
    document.getElementById('vol-bgm').value = sound.bgmVolume;
    document.getElementById('vol-se').value = sound.seVolume;
    document.getElementById('vol-bgm').addEventListener('input', (e) => sound.setBGMVolume(e.target.value));
    document.getElementById('vol-se').addEventListener('input', (e) => sound.setSEVolume(e.target.value));

    showScreen('title');
    // Loop is now driven by Phaser's scene update via onPhaserUpdate callback
}

init();
