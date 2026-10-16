// ===== Sound Manager =====
// BGM: nons works 様  https://x.com/nons_works
// SE: 効果音ラボ 様   https://soundeffect-lab.info/

const STORAGE_KEY = 'nf_audio_settings';

// === BGM Configuration ===
const BGM_LIST = [
    { file: 'assets/audio/【フリーBGM】Alone【戦闘・エレクトロ・かっこいい】.mp3', name: 'Alone' },
    { file: 'assets/audio/【フリーBGM】Midnight Assassin【戦闘・サイバー・疾走感・かっこいい】.mp3', name: 'Midnight Assassin' },
    { file: 'assets/audio/【フリーBGM】絶望から見いだした希望【戦闘・ピアノ・かっこいい】.mp3', name: '絶望から見いだした希望' },
];

// === SE Configuration ===
// ファイル名 → ゲーム内アクション マッピング
const SE_FILES = {
    // === 射撃系 ===
    shoot: 'assets/audio/se_shoot_weak.mp3',               // メインウェポン射撃 (Weak)
    shootSub: 'assets/audio/se_shoot_strong.mp3',          // サブウェポン射撃 (Strong)
    shotgun: 'assets/audio/ショットガン発射.mp3',          // 散弾系射撃
    bomb: 'assets/audio/se_bomb.mp3',                     // ボム発動 (Even Stronger)

    // === 銃操作系 ===
    reload: 'assets/audio/サブマシンガンのボルトリリース.mp3', // リロード・スキル準備完了
    equipSet: 'assets/audio/サブマシンガンの弾倉をセット.mp3',   // 装備セット
    equipRemove: 'assets/audio/サブマシンガンの弾倉を外す.mp3',     // 装備外し
    ready: 'assets/audio/ショットガンのポンプアクション1.mp3', // ロビー準備完了
    pumpAction: 'assets/audio/ショットガンのポンプアクション2.mp3', // ゲーム開始ジングル

    // === 拳銃系 ===
    empty: 'assets/audio/拳銃の弾切れ.mp3',             // スキルクールダウン中に押した
    equip: 'assets/audio/拳銃をチャッと構える.mp3',     // カスタマイズ・パーツ選択
    drop: 'assets/audio/拳銃を落とす.mp3',             // ダメージ・被弾

    // === 狙撃系 ===
    bolt: 'assets/audio/狙撃銃のボルトアクション.mp3', // ボスフェーズ移行
    snipeEquip: 'assets/audio/狙撃銃をチャッと構える.mp3',   // ステージ選択

    // === UI系 ===
    titleShow: 'assets/audio/ニュースタイトル表示1.mp3',    // タイトル画面表示
    scene: 'assets/audio/ニュースタイトル表示2.mp3',    // 画面遷移
    decide: 'assets/audio/ニュースタイトル表示3.mp3',    // 決定
    cancel: 'assets/audio/ニュースタイトル表示4.mp3',    // キャンセル
    result: 'assets/audio/プレゼンタイトル表示1.mp3',    // リザルト表示
    select: 'assets/audio/決定ボタンを押す18.mp3',       // 選択カーソル移動

    // === 演出系 ===
    impact: 'assets/audio/文字表示の衝撃音1.mp3',        // 大ダメージ
    warning: 'assets/audio/警告音1.mp3',                  // 警告・危険状態
    metalTitle: 'assets/audio/金属タイトル表示1.mp3',        // ステージクリア・ボス登場
    bossDeath: 'assets/audio/se_boss_death.mp3',          // ボス撃破
    evade: 'assets/audio/se_evade.mp3',                   // 回避行動 (Warp)
};

// === Credit Info (for dynamic credits UI) ===
export const CREDIT_INFO = {
    bgm: {
        source: 'nons works',
        url: 'https://x.com/nons_works',
    },
    se: {
        source: '効果音ラボ',
        url: 'https://soundeffect-lab.info/',
    }
};

export class SoundManager {
    constructor() {
        this.bgmVolume = 0.3;
        this.seVolume = 0.5;
        this.currentBgmIndex = 0;
        this.bgmAudio = new Audio();
        this.bgmAudio.loop = true;
        this.sounds = {};
        this.audioCtx = null;
        this._initialized = false;
        this._bgmTimer = null;

        this._loadSettings();
        this._preloadSE();
    }

    // Load saved audio settings
    _loadSettings() {
        try {
            const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
            if (saved) {
                if (saved.bgmVolume !== undefined) this.bgmVolume = saved.bgmVolume;
                if (saved.seVolume !== undefined) this.seVolume = saved.seVolume;
                if (saved.bgmIndex !== undefined) this.currentBgmIndex = saved.bgmIndex;
            }
        } catch (e) { /* ignore */ }
    }

    _saveSettings() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify({
                bgmVolume: this.bgmVolume,
                seVolume: this.seVolume,
                bgmIndex: this.currentBgmIndex,
            }));
        } catch (e) { /* ignore */ }
    }

    // Preload SE files
    _preloadSE() {
        for (const [key, path] of Object.entries(SE_FILES)) {
            const audio = new Audio(encodeURI(path));
            audio.preload = 'auto';
            this.sounds[key] = audio;
        }
    }

    // Init Web Audio context (for procedural fallback)
    init() {
        if (this._initialized) return;
        try {
            this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            this._seGain = this.audioCtx.createGain();
            this._seGain.gain.value = this.seVolume;
            this._seGain.connect(this.audioCtx.destination);
        } catch (e) { /* no web audio */ }
        this._initialized = true;
    }

    // === Volume Controls ===
    setBGMVolume(v) {
        this.bgmVolume = Math.max(0, Math.min(1, parseFloat(v)));
        this.bgmAudio.volume = this.bgmVolume;
        this._saveSettings();
    }

    setSEVolume(v) {
        this.seVolume = Math.max(0, Math.min(1, parseFloat(v)));
        if (this._seGain) this._seGain.gain.value = this.seVolume;
        this._saveSettings();
    }

    // === BGM ===
    get bgmList() { return BGM_LIST; }
    get hasBGMFiles() { return BGM_LIST.length > 0; }

    startBGM(index) {
        if (index === undefined) index = this.currentBgmIndex;
        if (index >= BGM_LIST.length) index = 0;
        this.currentBgmIndex = index;
        this.bgmAudio.src = encodeURI(BGM_LIST[index].file);
        this.bgmAudio.volume = this.bgmVolume;
        this.bgmAudio.play().catch(e => console.log('BGM autoplay blocked', e));
        this._saveSettings();
    }

    changeBGM(index) {
        this.stopBGM();
        this.startBGM(index);
    }

    stopBGM() {
        this.bgmAudio.pause();
        this.bgmAudio.currentTime = 0;
        if (this._bgmTimer) {
            clearTimeout(this._bgmTimer);
            this._bgmTimer = null;
        }
    }

    pauseBGM() {
        this.bgmAudio.pause();
    }

    resumeBGM() {
        if (this.bgmAudio.src) {
            this.bgmAudio.play().catch(() => { });
        } else {
            this.startBGM(0);
        }
    }

    // === SE (File-based) ===
    _playSE(name) {
        const audio = this.sounds[name];
        if (audio) {
            const clone = audio.cloneNode();
            clone.volume = this.seVolume;
            clone.play().catch(() => { });
            return true;
        }
        return false;
    }

    // === Game SE API ===
    // メインウェポン射撃
    playShoot() { this._playSE('shoot'); }

    // サブウェポン射撃
    playShootSub() { this._playSE('shootSub'); }

    // 散弾系 / ボム発動
    playBomb() { this._playSE('bomb'); }

    // 被弾・ダメージ
    playDamage() { this._playSE('drop'); }

    // ボス撃破
    playBossDeath() { this._playSE('bossDeath'); }

    // 回避行動
    playEvade() { this._playSE('evade'); }

    // ガチャ
    playGacha() { this._playSE('metalTitle'); }

    // ロビー準備完了
    playReady() { this._playSE('ready'); }

    // 蘇生完了
    playRevive() { this._playSE('pumpAction'); }

    // UI: 決定
    playDecide() { this._playSE('decide'); }

    // UI: キャンセル
    playCancel() { this._playSE('cancel'); }

    // UI: 画面遷移
    playScene() { this._playSE('scene'); }

    // UI: 選択
    playSelect() { this._playSE('select'); }

    // ステージ選択
    playStageSelect() { this._playSE('snipeEquip'); }

    // ボスフェーズ移行 / ウェーブ変更
    playWaveChange() { this._playSE('bolt'); }

    // 警告音
    playWarning() { this._playSE('warning'); }

    // リザルト表示
    playResult() { this._playSE('result'); }

    // タイトル画面表示
    playTitleShow() { this._playSE('titleShow'); }

    // パーツ選択（カスタマイズ画面）
    playEquip() { this._playSE('equip'); }

    // パーツ装着
    playEquipSet() { this._playSE('equipSet'); }

    // パーツ外し
    playEquipRemove() { this._playSE('equipRemove'); }

    // スキルクールダウン中操作
    playEmpty() { this._playSE('empty'); }

    // 被弾（命中時）
    playHit() { this._playSE('shoot'); }
}
