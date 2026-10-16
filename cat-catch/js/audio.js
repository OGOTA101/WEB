/**
 * Cat Catch - Audio Manager
 * 音声の管理（BGM/SE）
 */

const AudioManager = {
    // BGMプレイヤー
    bgm: null,
    bgmList: [],
    currentBgmIndex: 0,

    // SE用
    sePool: {},

    // 音量
    bgmVolume: 0.5,
    seVolume: 0.5,

    /**
     * 初期化
     */
    init() {
        // データから設定を読み込み
        if (DataManager.data) {
            this.bgmVolume = DataManager.data.settings.bgmVolume || 0.5;
            this.seVolume = DataManager.data.settings.seVolume || 0.5;
            this.currentBgmIndex = DataManager.data.settings.selectedBgm || 0;
        }

        // BGMリストを設定
        this.bgmList = CONFIG.ASSETS.AUDIO.BGM;

        // SEをプリロード
        this.preloadSE();

        // 音量スライダーの初期値を設定
        const bgmSlider = document.getElementById('vol-bgm');
        const seSlider = document.getElementById('vol-se');
        if (bgmSlider) bgmSlider.value = this.bgmVolume;
        if (seSlider) seSlider.value = this.seVolume;

        console.log('AudioManager initialized');
    },

    /**
     * SEをプリロード
     */
    preloadSE() {
        Object.entries(CONFIG.ASSETS.AUDIO.SE).forEach(([key, src]) => {
            const audio = new Audio(src);
            audio.preload = 'auto';
            this.sePool[key] = audio;
        });
    },

    /**
     * BGMを再生
     */
    playBgm(index = null) {
        if (index !== null) {
            this.currentBgmIndex = index;
        }

        const bgmData = this.bgmList[this.currentBgmIndex];
        if (!bgmData) return;

        // 既存のBGMを停止
        this.stopBgm();

        // 新しいBGMを再生
        this.bgm = new Audio(bgmData.src);
        this.bgm.loop = true;
        this.bgm.volume = this.bgmVolume;
        this.bgm.play().catch(e => {
            console.log('BGM autoplay blocked:', e);
        });
    },

    /**
     * BGMを停止
     */
    stopBgm() {
        if (this.bgm) {
            this.bgm.pause();
            this.bgm.currentTime = 0;
            this.bgm = null;
        }
    },

    /**
     * BGMを一時停止
     */
    pauseBgm() {
        if (this.bgm) {
            this.bgm.pause();
        }
    },

    /**
     * BGMを再開
     */
    resumeBgm() {
        if (this.bgm) {
            this.bgm.play().catch(e => console.log('Resume failed:', e));
        }
    },

    /**
     * SEを再生
     */
    playSE(key) {
        const audio = this.sePool[key];
        if (!audio) return;

        // 再生中なら最初から
        audio.currentTime = 0;
        audio.volume = this.seVolume;
        audio.play().catch(e => {
            console.log('SE play failed:', e);
        });
    },

    /**
     * BGM音量を設定
     */
    setBgmVolume(volume) {
        this.bgmVolume = volume;
        if (this.bgm) {
            this.bgm.volume = volume;
        }
    },

    /**
     * SE音量を設定
     */
    setSeVolume(volume) {
        this.seVolume = volume;
    },

    /**
     * 次のBGMに切り替え
     */
    nextBgm() {
        this.currentBgmIndex = (this.currentBgmIndex + 1) % this.bgmList.length;
        this.playBgm(this.currentBgmIndex);
        DataManager.updateSettings('selectedBgm', this.currentBgmIndex);
    },
};

// エクスポート
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AudioManager;
}
