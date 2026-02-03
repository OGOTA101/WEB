/* ========================================
   Bar-Code Tactics: 凸（TOTSU）
   メインアプリケーション
   ======================================== */

// グローバル変数
let currentScreen = 'title';
let battleSystem = null;
let currentStage = null;
let selectedDeckSlot = null;

// 初期化
document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

function initApp() {
    // データ初期化
    Storage.getData();

    // イベントリスナー設定
    setupEventListeners();

    // 初期画面表示
    showScreen('title');
}

function setupEventListeners() {
    // タイトル画面
    document.getElementById('btn-campaign').addEventListener('click', () => {
        showStageSelect();
    });

    document.getElementById('btn-deck').addEventListener('click', () => {
        showDeckScreen();
    });

    document.getElementById('btn-scan').addEventListener('click', () => {
        showScanScreen();
    });

    // 戻るボタン
    document.getElementById('btn-back-title').addEventListener('click', () => {
        showScreen('title');
    });

    document.getElementById('btn-back-title2').addEventListener('click', () => {
        showScreen('title');
    });

    document.getElementById('btn-back-title3').addEventListener('click', () => {
        showScreen('title');
    });

    // スキャン画面
    document.getElementById('btn-manual-generate').addEventListener('click', () => {
        const input = document.getElementById('manual-barcode');
        if (input.value.trim()) {
            generateAndShowUnit(input.value.trim());
        }
    });

    // バトル画面
    document.getElementById('btn-pause').addEventListener('click', () => {
        if (battleSystem) {
            battleSystem.pause();
            document.getElementById('pause-overlay').classList.remove('hidden');
        }
    });

    document.getElementById('btn-surrender').addEventListener('click', () => {
        if (confirm('本当に降参しますか？')) {
            endBattle(false);
        }
    });

    // 一時停止オーバーレイ
    document.getElementById('btn-resume').addEventListener('click', () => {
        if (battleSystem) {
            battleSystem.resume();
            document.getElementById('pause-overlay').classList.add('hidden');
        }
    });

    document.getElementById('btn-quit-battle').addEventListener('click', () => {
        endBattle(false);
    });

    // 結果画面
    document.getElementById('btn-result-ok').addEventListener('click', () => {
        showScreen('title');
    });

    // ポップアップ
    document.getElementById('btn-close-popup').addEventListener('click', () => {
        document.getElementById('unit-popup').classList.add('hidden');
    });
}

// ========================================
// 画面遷移
// ========================================

function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    document.getElementById(screenId + '-screen').classList.add('active');
    currentScreen = screenId;
}

// ========================================
// ステージ選択
// ========================================

function showStageSelect() {
    const list = document.getElementById('stage-list');
    list.innerHTML = '';

    const clearedStages = Storage.getClearedStages();

    for (const stage of CONFIG.STAGES) {
        const isCleared = clearedStages.includes(stage.id);
        const isUnlocked = Storage.isStageUnlocked(stage.id);

        const item = document.createElement('div');
        item.className = 'stage-item';
        if (isCleared) item.classList.add('cleared');
        if (!isUnlocked) item.classList.add('locked');

        item.innerHTML = `
            <div class="stage-number">${stage.id}</div>
            <div class="stage-info">
                <div class="stage-name">${stage.name}</div>
                <div class="stage-desc">${stage.desc}</div>
            </div>
            <div class="stage-status">${isCleared ? '✓' : isUnlocked ? '→' : '🔒'}</div>
        `;

        if (isUnlocked) {
            item.addEventListener('click', () => startBattle(stage));
        }

        list.appendChild(item);
    }

    showScreen('stage-select');
}

// ========================================
// バトル
// ========================================

function startBattle(stage) {
    currentStage = stage;

    // プレイヤーデッキを取得
    const playerDeck = Storage.getDeck();

    if (playerDeck.length === 0) {
        alert('デッキにユニットがありません');
        return;
    }

    // 敵ユニットを生成
    const enemyUnits = stage.enemies.map((power, i) => {
        return UnitGenerator.generateEnemy(power, stage.type || null);
    });

    // 敵情報表示
    document.getElementById('enemy-name').textContent = stage.name;
    document.getElementById('enemy-remaining').textContent = `残り: ${enemyUnits.length}/${enemyUnits.length}`;

    // バトル画面表示
    showScreen('battle');

    // Canvasサイズ調整
    const canvas = document.getElementById('battle-canvas');

    // 出撃スロット作成
    createDeploySlots(playerDeck);

    // バトルシステム初期化
    setTimeout(() => {
        battleSystem = new BattleSystem(
            canvas,
            playerDeck,
            enemyUnits,
            (isWin, stats) => onBattleEnd(isWin, stats)
        );

        // コストUI初期化
        battleSystem.updateCostUI();
    }, 100);
}

function createDeploySlots(deck) {
    const container = document.getElementById('deploy-slots');
    container.innerHTML = '';

    deck.forEach((unit, index) => {
        const slot = document.createElement('div');
        slot.className = 'deploy-slot';
        slot.dataset.index = index;

        const classInfo = CONFIG.CLASS_DISPLAY[unit.class] || CONFIG.CLASS_DISPLAY.infantry;
        const deployCost = UnitGenerator.getDeployCost(unit);

        slot.innerHTML = `
            <div class="unit-symbol">${classInfo.symbol}</div>
            <div class="unit-name">${unit.name}</div>
            <div class="deploy-cost">コスト: ${deployCost}</div>
        `;

        slot.addEventListener('click', () => {
            if (slot.classList.contains('deployed') || slot.classList.contains('disabled')) return;

            if (battleSystem) {
                const success = battleSystem.deployUnit(index, false);
                if (success) {
                    slot.classList.add('deployed');
                }
            }
        });

        container.appendChild(slot);
    });
}

window.updateDeploySlots = function () {
    if (!battleSystem) return;

    const slots = document.querySelectorAll('.deploy-slot');
    const deck = battleSystem.playerDeck;

    slots.forEach((slot, index) => {
        if (deck[index].deployed) {
            slot.classList.add('deployed');
        }

        // コストチェック
        const deployCost = UnitGenerator.getDeployCost(deck[index]);
        if (battleSystem.cost < deployCost && !deck[index].deployed) {
            slot.classList.add('disabled');
        } else {
            slot.classList.remove('disabled');
        }
    });
};

function onBattleEnd(isWin, stats) {
    if (isWin && currentStage) {
        Storage.markStageCleared(currentStage.id);
    }

    endBattle(isWin, stats);
}

function endBattle(isWin, stats = null) {
    // バトルシステムクリーンアップ
    if (battleSystem) {
        battleSystem.destroy();
        battleSystem = null;
    }

    // 一時停止オーバーレイを閉じる
    document.getElementById('pause-overlay').classList.add('hidden');

    // 結果画面表示
    const title = document.getElementById('result-title');
    title.textContent = isWin ? '勝利！' : '敗北...';
    title.className = 'result-title ' + (isWin ? 'win' : 'lose');

    const statsContainer = document.getElementById('result-stats');
    if (stats) {
        statsContainer.innerHTML = `
            <p>撃破数: ${stats.playerKills}</p>
            <p>与ダメージ: ${stats.damageDealt}</p>
            <p>被ダメージ: ${stats.damageTaken}</p>
        `;
    } else {
        statsContainer.innerHTML = '';
    }

    showScreen('result');
}

// ========================================
// デッキ編成
// ========================================

function showDeckScreen() {
    renderDeckSlots();
    renderStockList();
    showScreen('deck');
}

function renderDeckSlots() {
    const container = document.getElementById('deck-slots');
    container.innerHTML = '';

    const deckIds = Storage.getData().deck;

    for (let i = 0; i < 4; i++) {
        const slot = document.createElement('div');
        slot.className = 'deck-slot';
        slot.dataset.index = i;

        const unitId = deckIds[i];
        const unit = unitId ? Storage.getUnitById(unitId) : null;

        if (unit) {
            slot.classList.add('filled');
            const classInfo = CONFIG.CLASS_DISPLAY[unit.class] || CONFIG.CLASS_DISPLAY.infantry;
            slot.innerHTML = `
                <div class="unit-symbol">${classInfo.symbol}</div>
                <div class="unit-name">${unit.name}</div>
                <div class="unit-cost">${unit.totalCost}pt</div>
            `;
        } else {
            slot.innerHTML = `<div style="color: var(--text-muted)">空</div>`;
        }

        slot.addEventListener('click', () => {
            selectedDeckSlot = i;
            document.querySelectorAll('.deck-slot').forEach(s => s.style.borderColor = '');
            slot.style.borderColor = 'var(--accent-blue)';
        });

        container.appendChild(slot);
    }
}

function renderStockList() {
    const container = document.getElementById('stock-list');
    container.innerHTML = '';

    const stock = Storage.getStock();

    for (const unit of stock) {
        const item = document.createElement('div');
        item.className = 'stock-item';

        const classInfo = CONFIG.CLASS_DISPLAY[unit.class] || CONFIG.CLASS_DISPLAY.infantry;

        item.innerHTML = `
            <div class="unit-symbol">${classInfo.symbol}</div>
            <div class="unit-name">${unit.name}</div>
            <div class="unit-power">${unit.totalCost}pt</div>
        `;

        item.addEventListener('click', () => {
            if (selectedDeckSlot !== null) {
                // デッキにセット
                const data = Storage.getData();
                data.deck[selectedDeckSlot] = unit.id;
                Storage.saveData(data);

                selectedDeckSlot = null;
                renderDeckSlots();
            } else {
                // 詳細表示
                showUnitPopup(unit);
            }
        });

        container.appendChild(item);
    }
}

function showUnitPopup(unit) {
    document.getElementById('popup-unit-name').textContent = unit.name;

    const classInfo = CONFIG.CLASS_DISPLAY[unit.class] || CONFIG.CLASS_DISPLAY.infantry;

    document.getElementById('popup-unit-stats').innerHTML = `
        <div class="stat-row">
            <span class="stat-label">クラス</span>
            <span class="stat-value">${classInfo.name}</span>
        </div>
        <div class="stat-row">
            <span class="stat-label">総合力</span>
            <span class="stat-value">${unit.totalCost}pt</span>
        </div>
        <div class="stat-row">
            <span class="stat-label">兵力 (HP)</span>
            <span class="stat-value">${unit.stats.hp}</span>
        </div>
        <div class="stat-row">
            <span class="stat-label">攻撃 (ATK)</span>
            <span class="stat-value">${unit.stats.atk}</span>
        </div>
        <div class="stat-row">
            <span class="stat-label">防御 (DEF)</span>
            <span class="stat-value">${unit.stats.def}</span>
        </div>
        <div class="stat-row">
            <span class="stat-label">射程 (RNG)</span>
            <span class="stat-value">${unit.stats.rng}</span>
        </div>
        <div class="stat-row">
            <span class="stat-label">機動 (SPD)</span>
            <span class="stat-value">${unit.stats.spd}</span>
        </div>
    `;

    document.getElementById('unit-popup').classList.remove('hidden');
}

// ========================================
// スキャン
// ========================================

function showScanScreen() {
    showScreen('scan');
    // カメラは手動入力で代用（HTTPSが必要なため）
}

function generateAndShowUnit(seed) {
    const unit = UnitGenerator.generate(seed);

    const rarityInfo = CONFIG.RARITY_DISPLAY[unit.rarity];
    const classInfo = CONFIG.CLASS_DISPLAY[unit.class];

    const resultEl = document.getElementById('scan-result');
    resultEl.classList.remove('hidden');
    resultEl.innerHTML = `
        <h3 style="color: ${rarityInfo.color}; text-align: center; margin-bottom: 12px;">
            【${rarityInfo.name}】${unit.name}
        </h3>
        <div class="stat-row">
            <span class="stat-label">クラス</span>
            <span class="stat-value">${classInfo.name}</span>
        </div>
        <div class="stat-row">
            <span class="stat-label">総合力</span>
            <span class="stat-value">${unit.totalCost}pt</span>
        </div>
        <div class="stat-row">
            <span class="stat-label">兵力</span>
            <span class="stat-value">${unit.stats.hp}</span>
        </div>
        <div class="stat-row">
            <span class="stat-label">攻撃</span>
            <span class="stat-value">${unit.stats.atk}</span>
        </div>
        <div class="stat-row">
            <span class="stat-label">防御</span>
            <span class="stat-value">${unit.stats.def}</span>
        </div>
        <div class="stat-row">
            <span class="stat-label">射程</span>
            <span class="stat-value">${unit.stats.rng}</span>
        </div>
        <div class="stat-row">
            <span class="stat-label">機動</span>
            <span class="stat-value">${unit.stats.spd}</span>
        </div>
        <div style="margin-top: 16px; display: flex; gap: 8px;">
            <button class="action-btn" onclick="saveGeneratedUnit()">ストックに追加</button>
        </div>
    `;

    // グローバルに保持
    window.lastGeneratedUnit = unit;
}

window.saveGeneratedUnit = function () {
    if (!window.lastGeneratedUnit) return;

    const result = Storage.addToStock(window.lastGeneratedUnit);
    alert(result.message);

    if (result.success) {
        document.getElementById('scan-result').classList.add('hidden');
        document.getElementById('manual-barcode').value = '';
        window.lastGeneratedUnit = null;
    }
};
