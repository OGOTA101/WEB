/* ========================================
   QR Code Battle: 凸（TOTSU）
   メインアプリケーション
   ======================================== */

// グローバル変数
let currentScreen = 'title';
let battleSystem = null;
let currentStage = null;
let selectedDeckSlot = null;
let scanner = null;

// 初期化
document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

function initApp() {
    // データ初期化
    Storage.getData();

    // バージョン表示
    const verEl = document.getElementById('app-version');
    if (verEl && window.CONFIG) {
        verEl.textContent = 'v' + window.CONFIG.VERSION;
    }

    // イベントリスナー設定
    setupEventListeners();

    // 初期画面表示
    showScreen('title');

    // 初回BGM再生（ユーザーアクション待ちの場合は再生されないが、予約として）
    if (window.soundManager) {
        window.soundManager.playBGM('title');
    }
}

function setupEventListeners() {
    // 音量設定
    document.getElementById('vol-bgm').addEventListener('input', (e) => {
        if (window.soundManager) window.soundManager.setBgmVolume(e.target.value);
    });
    document.getElementById('vol-se').addEventListener('input', (e) => {
        if (window.soundManager) window.soundManager.setSeVolume(e.target.value);
    });

    // タイトル画面
    document.getElementById('btn-campaign').addEventListener('click', () => {
        if (window.soundManager) window.soundManager.playSE('se_click');
        showStageSelect();
    });

    document.getElementById('btn-deck').addEventListener('click', () => {
        if (window.soundManager) window.soundManager.playSE('se_click');
        showDeckScreen();
    });

    document.getElementById('btn-scan').addEventListener('click', () => {
        if (window.soundManager) window.soundManager.playSE('se_click');
        showScanScreen();
    });

    // 戻るボタン
    document.getElementById('btn-back-title').addEventListener('click', () => {
        if (window.soundManager) window.soundManager.playSE('se_click');
        showScreen('title');
    });

    document.getElementById('btn-back-title2').addEventListener('click', () => {
        if (window.soundManager) window.soundManager.playSE('se_click');
        showScreen('title');
    });

    document.getElementById('btn-back-scan').addEventListener('click', () => {
        if (window.soundManager) window.soundManager.playSE('se_click');
        showScreen('title');
    });

    // スキャン画面：ガチャ
    document.getElementById('btn-gacha').addEventListener('click', () => {
        if (window.soundManager) window.soundManager.playSE('se_click');

        // コインチェック
        const currentCoins = Storage.getCoins();
        const cost = 100;

        if (currentCoins < cost) {
            showAlertDialog('コインが足りません！\nステージをクリアしてコインを集めましょう。');
            return;
        }

        showConfirmDialog(`100コイン消費して人材を発掘しますか？\n(所持: ${currentCoins}G)`, () => {
            if (Storage.removeCoins(cost)) {
                updateCoinDisplay();
                // ランダムシード生成
                const seed = 'gacha_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
                generateAndShowUnit(seed);
            } else {
                showAlertDialog('エラー：コイン消費に失敗しました');
            }
        });
    });

    // 画像からQRスキャン
    document.getElementById('btn-scan-image').addEventListener('click', () => {
        if (window.soundManager) window.soundManager.playSE('se_click');
        document.getElementById('qr-input-file').click();
    });

    document.getElementById('btn-manual').addEventListener('click', () => {
        if (window.soundManager) window.soundManager.playSE('se_click');
        showScreen('manual');
    });

    document.getElementById('btn-back-manual').addEventListener('click', () => {
        if (window.soundManager) window.soundManager.playSE('se_cancel');
        showScreen('title');
    });

    document.getElementById('qr-input-file').addEventListener('change', async (e) => {
        if (e.target.files.length === 0) return;

        const file = e.target.files[0];
        const errorEl = document.getElementById('qr-scan-error');
        if (errorEl) {
            errorEl.style.display = 'none';
            errorEl.textContent = '';
        }

        try {
            // 一時的な要素を作成（ライブラリの要件回避のため）
            if (!document.getElementById('qr-reader-temp')) {
                const div = document.createElement('div');
                div.id = 'qr-reader-temp';
                div.style.display = 'none';
                document.body.appendChild(div);
            }

            // 要素が存在することを確認してからインスタンス化
            const html5QrCode = new Html5Qrcode("qr-reader-temp");

            const decodedText = await html5QrCode.scanFile(file, true);
            // 成功
            if (window.soundManager) window.soundManager.playSE('se_koto');

            showAlertDialog('読み取り成功！', () => {
                generateAndShowUnit(decodedText); // コイン消費なし
            });
        } catch (err) {
            console.error(err);
            if (errorEl) {
                errorEl.textContent = 'QRコードが認識できませんでした';
                errorEl.style.display = 'block';
            }
        }

        // inputをリセット
        e.target.value = '';
    });

    // バトル画面
    const btnAuto = document.getElementById('btn-auto-toggle');
    if (btnAuto) {
        btnAuto.addEventListener('click', (e) => {
            if (window.soundManager) window.soundManager.playSE('se_click');
            if (battleSystem) {
                battleSystem.isAutoMode = !battleSystem.isAutoMode;
                const btn = e.currentTarget;
                if (battleSystem.isAutoMode) {
                    btn.textContent = 'AUTO ON';
                    btn.classList.add('active');
                    btn.style.background = '#e6b422';
                    btn.style.color = '#000';
                    // 即座に行動開始
                    if (battleSystem.ai) {
                        battleSystem.ai.lastThinkTime = 0; // 次のupdateで即think
                        battleSystem.ai.think(); // 今すぐthink
                    }
                } else {
                    btn.textContent = 'AUTO OFF';
                    btn.classList.remove('active');
                    btn.style.background = ''; // Reset
                    btn.style.color = '';
                }
            }
        });
    }

    const btnPause = document.getElementById('btn-pause');
    if (btnPause) {
        btnPause.addEventListener('click', () => {
            if (window.soundManager) window.soundManager.playSE('se_click');
            if (battleSystem) {
                battleSystem.pause();
                document.getElementById('pause-overlay').classList.remove('hidden');
            }
        });
    }

    const btnResume = document.getElementById('btn-resume');
    if (btnResume) {
        btnResume.addEventListener('click', () => {
            if (window.soundManager) window.soundManager.playSE('se_click');
            if (battleSystem) {
                battleSystem.resume();
                document.getElementById('pause-overlay').classList.add('hidden');
            }
        });
    }

    document.getElementById('btn-surrender').addEventListener('click', () => {
        if (window.soundManager) window.soundManager.playSE('se_click');
        showConfirmDialog('本当に降参しますか？', () => {
            endBattle(false);
        });
    });

    // PvP
    document.getElementById('btn-versus').addEventListener('click', () => {
        if (window.soundManager) window.soundManager.playSE('se_click');
        showPvPLobby();
    });

    document.getElementById('btn-back-pvp').addEventListener('click', () => {
        if (window.soundManager) window.soundManager.playSE('se_click');
        Network.leaveRoom();
        document.getElementById('match-status').classList.add('hidden');
        showScreen('title');
    });

    document.getElementById('btn-match-random').addEventListener('click', async () => {
        if (window.soundManager) window.soundManager.playSE('se_click');

        const deck = Storage.getDeck();
        if (deck.length === 0) {
            showAlertDialog('デッキにユニットがいません。編成してください。');
            return;
        }

        document.getElementById('match-status').textContent = '対戦相手を探しています...';
        document.getElementById('match-status').classList.remove('hidden');

        // ネットワーク接続確認
        if (!Network.isConnected) {
            await Network.init();
        }

        const result = await Network.findRandomMatch(deck);
        if (!result) {
            showAlertDialog('ネットワークエラーが発生しました');
            document.getElementById('match-status').classList.add('hidden');
        }
    });

    document.getElementById('btn-match-password').addEventListener('click', async () => {
        if (window.soundManager) window.soundManager.playSE('se_click');

        const pass = document.getElementById('match-password').value.trim();
        if (!pass) {
            showAlertDialog('合言葉を入力してください');
            return;
        }

        const deck = Storage.getDeck();
        if (deck.length === 0) {
            showAlertDialog('デッキにユニットがいません。編成してください。');
            return;
        }

        document.getElementById('match-status').textContent = '部屋に入室中...';
        document.getElementById('match-status').classList.remove('hidden');

        if (!Network.isConnected) {
            await Network.init();
        }

        const result = await Network.joinPrivateMatch(pass, deck);
        if (result.error) {
            showAlertDialog(result.error);
            document.getElementById('match-status').classList.add('hidden');
        } else if (!result.success) {
            showAlertDialog('エラーが発生しました');
            document.getElementById('match-status').classList.add('hidden');
        } else {
            document.getElementById('match-status').textContent = '対戦相手を待っています...';
        }
    });

    // ネットワークコールバック設定
    Network.onMatchFound = () => {
        document.getElementById('match-status').textContent = 'マッチ成立！準備中...';
    };

    Network.onBattleStart = (data) => {
        startPvPBattle(data.opponentDeck, data.seed);
    };

    Network.onOpponentDisconnected = () => {
        if (currentScreen === 'battle') {
            showAlertDialog('相手が切断しました。', () => {
                showPvPLobby();
            });
        }
    };
} // end setupEventListeners

const PVP_STAGE_DATA = {
    id: 'pvp',
    name: '通信対戦',
    desc: 'オンラインプレイヤーとの対戦',
    map: { terrain: [], objects: [] },
    enemies: [] // 動的に設定
};

// ========================================
// 画面遷移
// ========================================

function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    document.getElementById(screenId + '-screen').classList.add('active');
    currentScreen = screenId;
    updateCoinDisplay();

    // BGM切り替えロジック
    if (window.soundManager) {
        if (screenId === 'battle') {
            window.soundManager.playBGM('battle');
        } else if (screenId === 'result') {
            // リザルト画面は何もしない（ジングル再生中のため、曲は止めたまま）
        } else {
            // その他の画面（タイトル、ステージ選択、編成、ロビーなど）はタイトルBGM
            window.soundManager.playBGM('title');
        }
    }
}

function updateCoinDisplay() {
    const amount = Storage.getCoins();
    const display = document.getElementById('coin-amount');
    if (display) {
        display.textContent = amount;
    }
}

// ========================================
// ステージ選択
// ========================================

function showStageSelect() {
    const list = document.getElementById('stage-list');
    list.innerHTML = '';

    const clearedStages = Storage.getClearedStages();

    // ハードモード解放チェック（ステージ10クリア）
    const isHardUnlocked = clearedStages.includes(10);
    const NORMAL_STAGE_MAX = 10;

    for (const stage of CONFIG.STAGES) {
        // ハードモード(ID>10)は、解放条件を満たしていない場合はリストに出さない
        if (stage.id > NORMAL_STAGE_MAX && !isHardUnlocked) {
            continue;
        }

        const isCleared = clearedStages.includes(stage.id);
        const isUnlocked = Storage.isStageUnlocked(stage.id);

        const item = document.createElement('div');
        item.className = 'stage-item';
        if (isCleared) item.classList.add('cleared');
        if (!isUnlocked) item.classList.add('locked');
        if (stage.isHard) {
            item.style.borderColor = '#9B59B6'; // 紫色で強調
            item.style.backgroundColor = 'rgba(155, 89, 182, 0.1)';
        }

        // 報酬計算（ハードなら600固定）
        const reward = stage.isHard ? 600 : (100 + stage.id * 50);

        item.innerHTML = `
            <div class="stage-number" ${stage.isHard ? 'style="color:#d4a853;"' : ''}>${stage.id}</div>
            <div class="stage-info">
                <div class="stage-name">${stage.name}</div>
                <div class="stage-desc">${stage.desc}</div>
                <div class="stage-reward" style="font-size:12px; color:gold;">💰 クリア報酬: ${reward}G</div>
            </div>
            <div class="stage-status">${isCleared ? '✓' : isUnlocked ? '→' : '🔒'}</div>
        `;

        // アンロックされているか、ハードモードで前のステージ未クリアでも強制表示はしない（Storage.isStageUnlockedに従う）
        // ただしハードモード突入時はisStageUnlockedが正しく機能する前提
        if (isUnlocked) {
            item.addEventListener('click', () => startBattle(stage));
        }

        list.appendChild(item);
    }

    showScreen('stage-select');
}

function showPvPLobby() {
    showScreen('pvp-lobby');
    document.getElementById('match-status').classList.add('hidden');
    Network.init(); // 前もって初期化
}

// ========================================
// バトル
// ========================================

function startBattle(stage) {
    currentStage = stage;
    currentGameMode = 'story'; // モード設定

    // プレイヤーデッキを取得
    const playerDeck = Storage.getDeck();

    if (playerDeck.length === 0) {
        showAlertDialog('デッキにユニットがありません');
        return;
    }

    // 敵ユニットを生成
    const enemyUnits = stage.enemies.map((power, i) => {
        return UnitGenerator.generateEnemy(power, stage.type || null);
    });

    setupBattle(playerDeck, enemyUnits, stage.name, stage.map || null);
}

function startPvPBattle(opponentDeck, seed) {
    currentStage = PVP_STAGE_DATA;
    currentGameMode = 'pvp'; // モード設定

    const playerDeck = Storage.getDeck();

    // 相手のデッキは既にUnit Objectになっている
    const enemyUnits = opponentDeck;

    setupBattle(playerDeck, enemyUnits, '対戦相手', PVP_STAGE_DATA.map, seed);
}

function setupBattle(playerDeck, enemyUnits, enemyName, mapData, seed = null) {
    // 敵情報表示
    document.getElementById('enemy-name').textContent = enemyName;
    document.getElementById('enemy-remaining').textContent = `残り: ${enemyUnits.length}/${enemyUnits.length}`;

    // バトル画面表示
    showScreen('battle');

    // Canvasサイズ調整
    const canvas = document.getElementById('battle-canvas');

    // SE再生（BGMはshowScreenで自動再生）
    if (window.soundManager) {
        window.soundManager.playSE('se_hyoshigi');
        setTimeout(() => window.soundManager.playSE('se_start'), 500);
    }

    // バトルシステム初期化
    setTimeout(() => {
        battleSystem = new BattleSystem(
            canvas,
            playerDeck,
            enemyUnits,
            mapData,
            (isWin, stats) => onBattleEnd(isWin, stats),
            seed
        );
    }, 100);
}

function onBattleEnd(isWin, stats) {
    if (window.soundManager) window.soundManager.stopBGM();

    let titleText = isWin ? '勝利！' : '敗北...';
    let reward = 0;
    let message = '';

    if (currentGameMode === 'pvp') {
        // PvP報酬
        reward = isWin ? 1000 : 100;
        Storage.addCoins(reward);
        message = `対戦報酬: ${reward} G 獲得！`;
        Network.leaveRoom(); // 対戦終了で退出
    } else if (currentGameMode === 'story' && isWin && currentStage) {
        // ストーリー報酬
        Storage.markStageCleared(currentStage.id);

        if (currentStage.isHard) {
            reward = 600;
        } else {
            const baseReward = 100;
            const stageBonus = currentStage.id * 50;
            reward = baseReward + stageBonus;
        }

        Storage.addCoins(reward);
        message = `報酬: ${reward} G 獲得！`;
    }

    // 結果表示UI
    const resultStats = document.getElementById('result-stats');
    if (currentGameMode === 'pvp' || (currentGameMode === 'story' && isWin)) {
        resultStats.innerHTML = `
            <p>クリアタイム: ${Math.floor(stats.time || 0)}秒</p>
            <p>撃破数: ${stats.kills || 0}</p>
            <p style="color:gold; font-size:20px; font-weight:bold; margin-top:10px;">
                ${message}
            </p>
        `;
    } else {
        // 敗北時（ストーリー）
        resultStats.innerHTML = '';
        showAlertDialog('敗北...', () => {
            showStageSelect();
        });
        if (window.soundManager) window.soundManager.playSE('se_lose');
        return; // 結果画面出さない既存ロジックの場合はここでreturn
    }

    const title = document.getElementById('result-title');
    title.textContent = titleText;
    title.className = 'result-title ' + (isWin ? 'win' : 'lose');

    showScreen('result');

    // 音
    if (window.soundManager) {
        if (isWin) window.soundManager.playSE('se_win');
        else window.soundManager.playSE('se_lose');
    }

    // OKボタンの挙動設定
    const btnOk = document.getElementById('btn-result-ok');
    if (btnOk) {
        btnOk.onclick = () => {
            if (window.soundManager) window.soundManager.playSE('se_click');
            if (currentGameMode === 'pvp') {
                showPvPLobby();
            } else {
                showStageSelect();
            }
        };
    }

    // バトルシステム破棄（重要：裏で動かないように）
    if (battleSystem) {
        battleSystem.destroy();
        battleSystem = null;
    }
}

function endBattle(isWin, stats = null) {
    // 降参などで外部から強制終了する場合
    if (battleSystem) {
        battleSystem.destroy();
    }
    // 共通処理へ
    onBattleEnd(isWin, stats || { time: 0, kills: 0 });
}
// Delete/Overwrite existing endBattle if possible, or ensure it redirects.
// The code below just exports helpers.


// ========================================
// デッキ編成
// ========================================

function showDeckScreen() {
    renderDeckSlots();
    renderStockList();
    showScreen('deck');
}

function setupInteraction(element, unit, onClick) {
    let pressTimer = null;
    let isLongPress = false;
    let startX, startY;
    let lastTapTime = 0;

    const startPress = (x, y) => {
        isLongPress = false;
        startX = x;
        startY = y;
        pressTimer = setTimeout(() => {
            isLongPress = true;
            window.showUnitPopup(unit);
        }, 500);
    };

    const cancelPress = () => {
        if (pressTimer) {
            clearTimeout(pressTimer);
            pressTimer = null;
        }
    };

    const endPress = () => {
        if (pressTimer) {
            clearTimeout(pressTimer);
            pressTimer = null;
        }

        if (!isLongPress) {
            const now = Date.now();
            if (now - lastTapTime < 300) {
                // ダブルタップ
                window.showUnitPopup(unit);
            } else {
                // シングルタップ
                if (onClick) onClick();
            }
            lastTapTime = now;
        }
    };

    // タッチイベント
    element.addEventListener('touchstart', (e) => {
        startPress(e.touches[0].clientX, e.touches[0].clientY);
    }, { passive: true });

    element.addEventListener('touchend', (e) => {
        endPress();
    });

    element.addEventListener('touchmove', (e) => {
        const moveX = e.touches[0].clientX;
        const moveY = e.touches[0].clientY;
        if (Math.abs(moveX - startX) > 10 || Math.abs(moveY - startY) > 10) {
            cancelPress();
        }
    }, { passive: true });

    // マウスイベント
    element.addEventListener('mousedown', (e) => {
        startPress(e.clientX, e.clientY);
    });

    element.addEventListener('mouseup', (e) => {
        endPress();
    });

    element.addEventListener('mouseleave', () => {
        cancelPress();
    });
}
window.setupInteraction = setupInteraction;

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
            const char = classInfo.char || classInfo.symbol.charAt(0);

            // SVG 生成
            const fillColor = '#FFFFFF';
            const strokeColor = '#3A5DAE';
            const textColor = '#000000';

            const svgHtml = `
            <svg width="40" height="40" viewBox="0 0 100 100" style="display:block;">
                <path d="M 25 5 L 75 5 L 75 35 L 95 35 L 95 95 L 5 95 L 5 35 L 25 35 Z" fill="${fillColor}" stroke="${strokeColor}" stroke-width="5" />
                <text x="50" y="65" font-family="sans-serif" font-weight="bold" font-size="40" text-anchor="middle" fill="${textColor}">${char}</text>
            </svg>
            `;

            slot.innerHTML = `
                    <div class="unit-symbol-wrapper">${svgHtml}</div>
                    <div class="unit-name">${unit.name}</div>
                    <div class="unit-cost">${unit.totalCost}pt</div>
                `;

            setupInteraction(slot, unit, () => {
                if (selectedDeckSlot === i) {
                    // 既に選択中の場合は外す確認
                    showConfirmDialog(`「${unit.name}」をデッキから外しますか？`, () => {
                        const data = Storage.getData();
                        data.deck[i] = null;
                        Storage.saveData(data);
                        selectedDeckSlot = null;
                        renderDeckSlots();
                    });
                } else {
                    selectedDeckSlot = i;
                    document.querySelectorAll('.deck-slot').forEach(s => s.style.borderColor = '');
                    slot.style.borderColor = 'var(--accent-blue)';
                }
            });
        } else {
            slot.innerHTML = `<div style="color: var(--text-muted)">空</div>`;

            slot.addEventListener('click', () => {
                selectedDeckSlot = i;
                document.querySelectorAll('.deck-slot').forEach(s => s.style.borderColor = '');
                slot.style.borderColor = 'var(--accent-blue)';
            });
        }

        container.appendChild(slot);
    }
}

function renderStockList() {
    const container = document.getElementById('stock-list');
    container.innerHTML = '';

    // リスト表示にするため、グリッド列数を1に変更
    container.style.gridTemplateColumns = '1fr';

    const stock = Storage.getStock();

    for (const unit of stock) {
        const item = document.createElement('div');
        item.className = 'stock-item';
        // 横長にするためスタイル調整
        // item.style.display = 'flex'; // innerHTMLで制御するのでここではclassのみ

        const classInfo = CONFIG.CLASS_DISPLAY[unit.class] || CONFIG.CLASS_DISPLAY.infantry;
        const char = classInfo.char || classInfo.symbol.charAt(0);

        // SVG 生成
        const fillColor = '#FFFFFF';
        const strokeColor = '#3A5DAE';
        const textColor = '#000000';

        const svgHtml = `
        <svg width="40" height="40" viewBox="0 0 100 100" style="display:block;">
            <path d="M 25 5 L 75 5 L 75 35 L 95 35 L 95 95 L 5 95 L 5 35 L 25 35 Z" fill="${fillColor}" stroke="${strokeColor}" stroke-width="5" />
            <text x="50" y="65" font-family="sans-serif" font-weight="bold" font-size="40" text-anchor="middle" fill="${textColor}">${char}</text>
        </svg>
        `;

        item.innerHTML = `
                <div style="display: flex; align-items: center; width: 100%; gap: 12px; text-align: left;">
                    <div class="unit-symbol-wrapper" style="flex-shrink: 0;">${svgHtml}</div>
                    
                    <div style="flex: 1; min-width: 0;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; border-bottom: 1px solid #555; padding-bottom: 2px;">
                            <span class="unit-name" style="font-weight: bold; font-size: 14px; color: #FFF;">${unit.name}</span>
                            <span style="font-size: 11px; color: var(--accent-gold); font-weight: bold;">${classInfo.name} / ${unit.totalCost}pt</span>
                        </div>
                        
                        <div style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 4px; font-size: 11px; color: #EEE;">
                            <div><span style="color:#AAA; font-size:9px;">HP</span> ${unit.stats.hp}</div>
                            <div><span style="color:#AAA; font-size:9px;">攻</span> ${unit.stats.atk}</div>
                            <div><span style="color:#AAA; font-size:9px;">防</span> ${unit.stats.def}</div>
                            <div><span style="color:#AAA; font-size:9px;">射</span> ${unit.stats.rng}</div>
                            <div><span style="color:#AAA; font-size:9px;">機</span> ${unit.stats.spd}</div>
                        </div>
                    </div>
                </div>
            `;

        setupInteraction(item, unit, () => {
            if (selectedDeckSlot !== null) {
                // 重複チェック
                const currentDeck = Storage.getData().deck;

                if (currentDeck.includes(unit.id)) {
                    if (currentDeck[selectedDeckSlot] === unit.id) {
                        return;
                    }
                    showAlertDialog('このユニットは既に編成されています。\n同じユニットを複数編成することはできません。');
                    return;
                }

                // デッキにセット
                const data = Storage.getData();
                data.deck[selectedDeckSlot] = unit.id;
                Storage.saveData(data);

                selectedDeckSlot = null;
                renderDeckSlots();
            } else {
                // 通常クリック時
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
        ${currentScreen === 'battle' ? '' : `
        <div style="margin-top:16px; text-align:center;">
             <button id="btn-delete-unit" class="action-btn danger small" style="width:100%;">ユニットを破棄</button>
        </div>`}
    `;

    if (currentScreen !== 'battle') {
        document.getElementById('btn-delete-unit').onclick = () => {
            showConfirmDialog(`本当に「${unit.name}」を破棄しますか？\n（二度と戻りません）`, () => {
                const result = Storage.removeFromStock(unit.id);
                if (result.success) {
                    hideUnitPopup();
                    if (currentScreen === 'deck') {
                        renderStockList();
                        renderDeckSlots(); // デッキからも消えている可能性があるため更新
                    }
                } else {
                    showAlertDialog(result.message);
                }
            });
        };
    }

    // 閉じるボタンの再設定（念のため）
    const closeBtn = document.getElementById('btn-close-popup');
    if (closeBtn) {
        closeBtn.onclick = () => {
            if (window.soundManager) window.soundManager.playSE('se_cancel');
            hideUnitPopup();
        };
    }

    document.getElementById('unit-popup').classList.remove('hidden');
}

window.showUnitPopup = showUnitPopup;

window.hideUnitPopup = function () {
    document.getElementById('unit-popup').classList.add('hidden');
};


// ========================================
// スキャン
// ========================================

function showScanScreen() {
    showScreen('scan');
}

function generateAndShowUnit(seed) {
    if (window.soundManager) window.soundManager.playSE('se_koto');
    const unit = UnitGenerator.generate(seed);

    // グローバルに保持
    window.lastGeneratedUnit = unit;

    // ダイアログ表示
    showGachaPopup(unit);
}

function showGachaPopup(unit) {
    document.getElementById('popup-unit-name').textContent = '【' + CONFIG.RARITY_DISPLAY[unit.rarity].name + '】' + unit.name;
    document.getElementById('popup-unit-name').style.color = CONFIG.RARITY_DISPLAY[unit.rarity].color;

    const classInfo = CONFIG.CLASS_DISPLAY[unit.class];

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
        <div style="margin-top:24px; display:flex; gap:10px;">
             <button id="btn-discard-unit" class="action-btn danger small" style="flex:1;">破棄</button>
             <button id="btn-save-unit" class="action-btn small" style="flex:1;">ストックへ追加</button>
        </div>
    `;

    // 破棄
    document.getElementById('btn-discard-unit').onclick = () => {
        if (window.soundManager) window.soundManager.playSE('se_cancel');
        hideUnitPopup();
    };

    // 追加
    document.getElementById('btn-save-unit').onclick = () => {
        if (window.soundManager) window.soundManager.playSE('se_koto');

        const data = Storage.getData();
        const exists = data.stock.some(u => u.id === unit.id);
        if (exists) {
            showAlertDialog('エラー：既に同じIDのユニットが存在します');
            return;
        }

        data.stock.push(unit);
        Storage.saveData(data);

        hideUnitPopup();
        showAlertDialog('ユニットをストックに追加しました！', () => {
            if (currentScreen === 'deck') {
                renderStockList();
            }
        });
    };

    document.getElementById('unit-popup').classList.remove('hidden');
}

window.saveGeneratedUnit = function () {
    if (!window.lastGeneratedUnit) return;

    if (window.soundManager) window.soundManager.playSE('se_bell');
    const result = Storage.addToStock(window.lastGeneratedUnit);
    showAlertDialog(result.message);

    if (result.success) {
        document.getElementById('scan-result').classList.add('hidden');
        document.getElementById('manual-barcode').value = '';
        window.lastGeneratedUnit = null;
    }
};

function showConfirmDialog(message, onYes) {
    const dialog = document.getElementById('confirm-dialog');
    const msgEl = document.getElementById('confirm-message');
    const yesBtn = document.getElementById('btn-confirm-yes');
    const noBtn = document.getElementById('btn-confirm-no');

    msgEl.textContent = message;
    dialog.classList.remove('hidden');

    const cleanup = () => {
        yesBtn.onclick = null;
        noBtn.onclick = null;
        dialog.classList.add('hidden');
    };

    yesBtn.onclick = () => {
        if (window.soundManager) window.soundManager.playSE('se_click');
        onYes();
        cleanup();
    };

    noBtn.onclick = () => {
        if (window.soundManager) window.soundManager.playSE('se_cancel');
        cleanup();
    };
}

function showAlertDialog(message, onOk = null) {
    const dialog = document.getElementById('alert-dialog');
    const msgEl = document.getElementById('alert-message');
    const okBtn = document.getElementById('btn-alert-ok');

    msgEl.textContent = message;
    dialog.classList.remove('hidden');

    const cleanup = () => {
        okBtn.onclick = null;
        dialog.classList.add('hidden');
    };

    okBtn.onclick = () => {
        if (window.soundManager) window.soundManager.playSE('se_click');
        cleanup();
        if (onOk) onOk();
    };
}

// Export for other scripts (scanner.js etc)
window.showAlertDialog = showAlertDialog;
window.showConfirmDialog = showConfirmDialog;
