/**
 * audio.js
 * Manages BGM and SE playback.
 */

class AudioManager {
    constructor() {
        this.bgmVolume = 0.5;
        this.seVolume = 0.5;
        this.currentBgmIndex = 0;
        this.bgmAudio = new Audio();
        this.bgmAudio.loop = true;
        this.sounds = {};

        // Asset Paths (Encoded for safety)
        this.bgmList = [
            'assets/audio/ontama_piano2_milktea.mp3',
            'assets/audio/ontama_piano2_tsubomi.mp3',
            'assets/audio/ontama_piano2_yukidoke.mp3'
        ];

        // SE Map
        this.seFiles = {
            'tap': '決定ボタンを押す46.mp3', // Star Tap
            'decide': '決定ボタンを押す33.mp3', // UI OK
            'cancel': '決定ボタンを押す41.mp3', // UI Cancel
            'title': 'タイトル表示.mp3', // Title / Rare
            'scene': 'シーン切り替え2.mp3', // Scene Change
            'select': '決定ボタンを押す45.mp3' // Select Item
        };

        this.init();
    }

    init() {
        // Load Settings if possible
        const data = StorageManager.load();
        if (data.settings) {
            if (data.settings.bgmVolume !== undefined) this.bgmVolume = data.settings.bgmVolume;
            if (data.settings.seVolume !== undefined) this.seVolume = data.settings.seVolume;
        }

        // Setup BGM
        this.bgmAudio.volume = this.bgmVolume;

        // Preload SE
        for (const [key, filename] of Object.entries(this.seFiles)) {
            const audio = new Audio(`assets/audio/${encodeURIComponent(filename)}`);
            this.sounds[key] = audio;
        }
    }

    playBgm(index) {
        if (index === undefined) index = this.currentBgmIndex;
        if (index >= this.bgmList.length) index = 0;

        this.currentBgmIndex = index;
        this.bgmAudio.src = this.bgmList[this.currentBgmIndex];
        this.bgmAudio.play().catch(e => console.log('Autoplay blocked', e));
    }

    playNextBgm() {
        let next = this.currentBgmIndex + 1;
        if (next >= this.bgmList.length) next = 0;
        this.playBgm(next);
    }

    pauseBgm() {
        this.bgmAudio.pause();
    }

    stopBgm() {
        this.bgmAudio.pause();
        this.bgmAudio.currentTime = 0;
    }

    resumeBgm() {
        if (this.bgmAudio.src) {
            this.bgmAudio.play().catch(e => console.log('Autoplay blocked', e));
        } else {
            this.playBgm(0);
        }
    }

    playSE(name) {
        const audio = this.sounds[name];
        if (audio) {
            // Clone node to allow overlapping sounds
            const clone = audio.cloneNode();
            clone.volume = this.seVolume;
            clone.play().catch(e => { });
        }
    }

    setBgmVolume(vol) {
        this.bgmVolume = Math.max(0, Math.min(1, vol));
        this.bgmAudio.volume = this.bgmVolume;
        this.saveSettings();
    }

    setSeVolume(vol) {
        this.seVolume = Math.max(0, Math.min(1, vol));
        this.saveSettings();
    }

    saveSettings() {
        const data = StorageManager.load();
        if (!data.settings) data.settings = {};
        data.settings.bgmVolume = this.bgmVolume;
        data.settings.seVolume = this.seVolume;
        StorageManager.save(data);
    }
}
