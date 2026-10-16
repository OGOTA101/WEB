/**
 * Cat Catch - Main Entry Point
 * メインのエントリーポイント（詳細実装版）
 */

// 現在の画面
let currentScreen = 'title';

// DOM要素のキャッシュ
const elements = {};

// アニメーション用
let titleAnimFrame = null;

/**
 * 初期化
 */
document.addEventListener('DOMContentLoaded', () => {
    console.log('Cat Catch - Initializing...');

    // データをロード
    DataManager.load();

    // DOM要素をキャッシュ
    cacheElements();

    // イベントリスナーを設定
    setupEventListeners();

    // ゲームを初期化
    const canvas = document.getElementById('game-canvas');
    if (canvas) {
        Game.init(canvas);
    }

    // オーディオを初期化
    if (typeof AudioManager !== 'undefined') {
        AudioManager.init();
    }

    // UIを更新
    updateTitleScreen();

    // 音量スライダーを初期化
    initVolumeSliders();

    // 最初の画面を表示
    showScreen('title');

    // タイトルアニメーション開始
    startTitleAnimation();

    console.log('Cat Catch - Ready!');
});

/**
 * DOM要素をキャッシュ
 */
function cacheElements() {
    elements.screens = {
        title: document.getElementById('screen-title'),
        game: document.getElementById('screen-game'),
        upgrade: document.getElementById('screen-upgrade'),
        gacha: document.getElementById('screen-gacha'),
        howto: document.getElementById('screen-howto'),
        credits: document.getElementById('screen-credits'),
        result: document.getElementById('screen-result'),
    };

    elements.modals = {
        pause: document.getElementById('pause-modal'),
    };

    elements.buttons = {
        start: document.getElementById('btn-start'),
        continue: document.getElementById('btn-continue'),
        upgrade: document.getElementById('btn-upgrade'),
        gacha: document.getElementById('btn-gacha'),
        howto: document.getElementById('btn-howto'),
        credits: document.getElementById('btn-credits'),
        pause: document.getElementById('btn-pause'),
        resume: document.getElementById('btn-resume'),
        quit: document.getElementById('btn-quit'),
        capture: document.getElementById('btn-capture'),
        eject: document.getElementById('btn-eject'),
        resultOk: document.getElementById('btn-result-ok'),
        upgradeBack: document.getElementById('btn-upgrade-back'),
        gachaBack: document.getElementById('btn-gacha-back'),
        howtoBack: document.getElementById('btn-howto-back'),
        creditsBack: document.getElementById('btn-credits-back'),
    };

    elements.displays = {
        titleCurrency: document.getElementById('title-currency'),
        upgradeCurrency: document.getElementById('upgrade-currency'),
        hpDisplay: document.getElementById('hp-display'),
        waveDisplay: document.getElementById('wave-display'),
        capacityDisplay: document.getElementById('capacity-display'),
        scoreDisplay: document.getElementById('score-display'),
    };
}

/**
 * イベントリスナーを設定
 */
function setupEventListeners() {
    // タイトル画面
    elements.buttons.start?.addEventListener('click', () => {
        playButtonSE();
        stopTitleAnimation();
        showScreen('game');
        Game.startGame(1);
        // BGM開始
        if (typeof AudioManager !== 'undefined') {
            AudioManager.playBgm();
        }
    });

    elements.buttons.continue?.addEventListener('click', () => {
        playButtonSE();
        stopTitleAnimation();
        const lastWave = Math.max(1, DataManager.data.maxWave || 1);
        showScreen('game');
        Game.startGame(lastWave);
        if (typeof AudioManager !== 'undefined') {
            AudioManager.playBgm();
        }
    });

    elements.buttons.upgrade?.addEventListener('click', () => {
        playButtonSE();
        showScreen('upgrade');
        updateUpgradeScreen();
    });

    elements.buttons.gacha?.addEventListener('click', () => {
        playButtonSE();
        showScreen('gacha');
    });

    elements.buttons.howto?.addEventListener('click', () => {
        playButtonSE();
        showScreen('howto');
    });

    elements.buttons.credits?.addEventListener('click', () => {
        playButtonSE();
        showScreen('credits');
    });

    // 戻るボタン
    elements.buttons.upgradeBack?.addEventListener('click', () => {
        playButtonSE();
        showScreen('title');
    });

    elements.buttons.gachaBack?.addEventListener('click', () => {
        playButtonSE();
        showScreen('title');
    });

    elements.buttons.howtoBack?.addEventListener('click', () => {
        playButtonSE();
        showScreen('title');
    });

    elements.buttons.creditsBack?.addEventListener('click', () => {
        playButtonSE();
        showScreen('title');
    });

    elements.buttons.resultOk?.addEventListener('click', () => {
        playButtonSE();
        showScreen('title');
        updateTitleScreen();
        startTitleAnimation();
        // BGM停止
        if (typeof AudioManager !== 'undefined') {
            AudioManager.stopBgm();
        }
    });

    // ゲーム画面
    elements.buttons.pause?.addEventListener('click', () => {
        playButtonSE();
        Game.pause();
        elements.modals.pause?.classList.remove('hidden');
        if (typeof AudioManager !== 'undefined') {
            AudioManager.pauseBgm();
        }
    });

    elements.buttons.resume?.addEventListener('click', () => {
        playButtonSE();
        elements.modals.pause?.classList.add('hidden');
        Game.resume();
        if (typeof AudioManager !== 'undefined') {
            AudioManager.resumeBgm();
        }
    });

    elements.buttons.quit?.addEventListener('click', () => {
        playButtonSE();
        elements.modals.pause?.classList.add('hidden');
        Game.stop();
        showScreen('title');
        updateTitleScreen();
        startTitleAnimation();
        if (typeof AudioManager !== 'undefined') {
            AudioManager.stopBgm();
        }
    });

    // アクションボタン
    elements.buttons.capture?.addEventListener('click', () => {
        Game.capture();
    });

    elements.buttons.eject?.addEventListener('click', () => {
        Game.eject();
    });

    // 音量スライダー
    document.getElementById('vol-bgm')?.addEventListener('input', (e) => {
        const volume = parseFloat(e.target.value);
        DataManager.updateSettings('bgmVolume', volume);
        if (typeof AudioManager !== 'undefined') {
            AudioManager.setBgmVolume(volume);
        }
    });

    document.getElementById('vol-se')?.addEventListener('input', (e) => {
        const volume = parseFloat(e.target.value);
        DataManager.updateSettings('seVolume', volume);
        if (typeof AudioManager !== 'undefined') {
            AudioManager.setSeVolume(volume);
        }
    });

    // ウィンドウリサイズ
    window.addEventListener('resize', () => {
        if (Game.canvas) {
            Game.resize();
        }
    });

    // キーボードショートカット（デバッグ用）
    document.addEventListener('keydown', (e) => {
        if (currentScreen === 'game' && !Game.state.isPaused) {
            if (e.key === ' ' || e.key === 'c') {
                Game.capture();
            } else if (e.key === 'e') {
                Game.eject();
            } else if (e.key === 'Escape') {
                Game.pause();
                elements.modals.pause?.classList.remove('hidden');
            }
        }
    });
}

/**
 * 音量スライダーを初期化
 */
function initVolumeSliders() {
    const bgmSlider = document.getElementById('vol-bgm');
    const seSlider = document.getElementById('vol-se');

    if (bgmSlider && DataManager.data) {
        bgmSlider.value = DataManager.data.settings.bgmVolume || 0.5;
    }
    if (seSlider && DataManager.data) {
        seSlider.value = DataManager.data.settings.seVolume || 0.5;
    }
}

/**
 * ボタンSEを再生
 */
function playButtonSE() {
    if (typeof AudioManager !== 'undefined') {
        AudioManager.playSE('BUTTON');
    }
}

/**
 * 画面を切り替える
 */
function showScreen(screenId, data = null) {
    // 全画面を非表示
    Object.values(elements.screens).forEach(screen => {
        if (screen) screen.classList.remove('active');
    });

    // 指定画面を表示
    const targetScreen = elements.screens[screenId];
    if (targetScreen) {
        targetScreen.classList.add('active');
        currentScreen = screenId;
    }

    // ゲーム画面かどうかでbodyクラスを切替
    if (screenId === 'game') {
        document.body.classList.add('game-active');
    } else {
        document.body.classList.remove('game-active');
    }

    // 画面固有の処理
    switch (screenId) {
        case 'game':
            // ゲーム画面に切り替え時
            // キャンバスのサイズを再調整
            if (Game.canvas) {
                setTimeout(() => Game.resize(), 100);
            }
            break;
        case 'result':
            // リザルト画面を更新
            if (data) {
                updateResultScreen(data);
            }
            break;
        case 'title':
            // タイトル画面に戻った時
            updateTitleScreen();
            break;
        case 'upgrade':
            updateUpgradeScreen();
            break;
    }
}

/**
 * タイトル画面を更新
 */
function updateTitleScreen() {
    // 通貨表示
    if (elements.displays.titleCurrency) {
        elements.displays.titleCurrency.textContent = DataManager.data.currency || 0;
    }

    // 続きからボタン
    const continueBtn = elements.buttons.continue;
    if (continueBtn) {
        if (DataManager.data.maxWave > 1) {
            continueBtn.style.display = 'block';
            continueBtn.textContent = `▶ Wave ${DataManager.data.maxWave} から`;
        } else {
            continueBtn.style.display = 'none';
        }
    }

    // ハイスコア表示（あれば）
    const highScoreDisplay = document.getElementById('high-score-display');
    if (highScoreDisplay && DataManager.data.highScore > 0) {
        highScoreDisplay.textContent = `ハイスコア: ${DataManager.data.highScore}`;
        highScoreDisplay.style.display = 'block';
    }
}

/**
 * タイトルアニメーション開始
 */
function startTitleAnimation() {
    // 既存のアニメーションを停止
    stopTitleAnimation();

    const logo = document.querySelector('.title-logo');
    if (!logo) return;

    let time = 0;

    function animate() {
        time += 0.05;
        const scale = 1 + Math.sin(time) * 0.02;
        const glow = 0.5 + Math.sin(time * 0.5) * 0.2;

        logo.style.transform = `scale(${scale})`;
        logo.style.textShadow = `
            3px 3px 0 #b8860b,
            -1px -1px 0 #fffacd,
            0 0 ${20 + glow * 20}px rgba(255, 215, 0, ${0.3 + glow * 0.3})
        `;

        titleAnimFrame = requestAnimationFrame(animate);
    }

    animate();
}

/**
 * タイトルアニメーション停止
 */
function stopTitleAnimation() {
    if (titleAnimFrame) {
        cancelAnimationFrame(titleAnimFrame);
        titleAnimFrame = null;
    }
}

/**
 * 強化画面を更新
 */
function updateUpgradeScreen() {
    // 通貨表示
    if (elements.displays.upgradeCurrency) {
        elements.displays.upgradeCurrency.textContent = DataManager.data.currency || 0;
    }

    // アップグレードリストを生成
    const categories = ['ufo', 'castle', 'skill'];

    categories.forEach(category => {
        const container = document.getElementById(`upgrade-list-${category}`);
        if (!container) return;

        container.innerHTML = '';

        Object.entries(CONFIG.UPGRADES).forEach(([id, upgrade]) => {
            if (upgrade.category !== category) return;

            const currentLevel = DataManager.data.upgrades[id] || 1;
            const isMaxed = currentLevel >= upgrade.maxLevel;
            const cost = Math.floor(upgrade.baseCost * Math.pow(1.5, currentLevel - 1));
            const canAfford = DataManager.data.currency >= cost;

            // 現在の効果値を計算
            const currentValue = upgrade.effect(currentLevel);
            const nextValue = !isMaxed ? upgrade.effect(currentLevel + 1) : null;

            const item = document.createElement('div');
            item.className = 'upgrade-item';
            item.innerHTML = `
                <div class="upgrade-item-info">
                    <span class="upgrade-item-name">${upgrade.name}</span>
                    <span class="upgrade-item-level">
                        Lv.${currentLevel}${isMaxed ? ' (MAX)' : ` → Lv.${currentLevel + 1}`}
                    </span>
                    <span class="upgrade-item-effect">
                        ${formatUpgradeValue(id, currentValue)}${!isMaxed ? ` → ${formatUpgradeValue(id, nextValue)}` : ''}
                    </span>
                </div>
                <button class="upgrade-item-btn" 
                        data-upgrade="${id}"
                        ${isMaxed || !canAfford ? 'disabled' : ''}>
                    ${isMaxed ? 'MAX' : `💎${cost}`}
                </button>
            `;

            container.appendChild(item);

            // ボタンのイベント
            const btn = item.querySelector('button');
            btn.addEventListener('click', () => {
                if (DataManager.upgrade(id)) {
                    playButtonSE();
                    updateUpgradeScreen();
                }
            });
        });
    });
}

/**
 * アップグレード値をフォーマット
 */
function formatUpgradeValue(id, value) {
    if (value === null) return '';

    switch (id) {
        case 'ufo_capacity':
            return `容量${value}`;
        case 'ufo_speed':
            return `${Math.round(value * 100)}%`;
        case 'ufo_capture_speed':
            return `${value}ms`;
        case 'ufo_capture_range':
            return `${value}px`;
        case 'castle_hp':
            return `HP${value}`;
        case 'skill_slow_aura':
            return `${Math.round(value * 100)}%減速`;
        default:
            return String(value);
    }
}

/**
 * リザルト画面を更新
 */
function updateResultScreen(data) {
    const titleEl = document.getElementById('result-title');
    const waveEl = document.getElementById('result-wave');
    const scoreEl = document.getElementById('result-score');
    const coinsEl = document.getElementById('result-coins');

    if (titleEl) {
        titleEl.textContent = data.isVictory ? '🎉 全ウェーブクリア！' : 'ゲームオーバー';
        titleEl.style.color = data.isVictory ? '#48bb78' : '#ff6b6b';
    }
    if (waveEl) {
        waveEl.textContent = data.wave;
    }
    if (scoreEl) {
        scoreEl.textContent = data.score.toLocaleString();
    }
    if (coinsEl) {
        coinsEl.textContent = `+${data.coins || 0}`;
    }

    // ハイスコア更新チェック
    const newRecordEl = document.getElementById('result-new-record');
    if (newRecordEl) {
        if (data.score >= DataManager.data.highScore) {
            newRecordEl.style.display = 'block';
            newRecordEl.textContent = '🏆 NEW RECORD!';
        } else {
            newRecordEl.style.display = 'none';
        }
    }
}

// グローバルに公開（Game.jsから呼び出せるように）
window.showScreen = showScreen;
