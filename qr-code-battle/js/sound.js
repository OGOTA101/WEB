/* ========================================
   QR Code Battle: 凸（TOTSU）
   サウンドマネージャー（Web Audio API + HTML5 Audio）
   ======================================== */

class SoundManager {
    constructor() {
        // AudioContextの初期化
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AudioContext();

        this.bgmVolume = 0.3;
        this.seVolume = 0.5;

        // BGM管理
        this.bgmAudio = null;
        this.currentBgmKey = null;

        // BGM設定
        this.bgmFiles = {
            title: 'assets/audio/yowanotsuki_karakasa.mp3',
            battle: 'assets/audio/yowanotsukli_koujou.mp3'
        };

        // 設定ロード
        this.loadSettings();

        // ファイル音声マップ (SE)
        this.fileSounds = {
            se_click: 'assets/audio/taiko_don.mp3',
            se_cancel: 'assets/audio/taiko_dodon.mp3',
            se_start: 'assets/audio/jingle_start.mp3',
            se_win: 'assets/audio/jingle_win.mp3',
            se_lose: 'assets/audio/jingle_lose.mp3',
            se_charge: 'assets/audio/charge.mp3',
            se_shout: 'assets/audio/shout.mp3',
            se_cheer: 'assets/audio/win_cheer.mp3',
            se_applause: 'assets/audio/win_applause.mp3',
            se_koto: 'assets/audio/koto.mp3',
            se_shakuhachi: 'assets/audio/shakuhachi.mp3',
            se_tsuzumi: 'assets/audio/tsuzumi.mp3',
            se_bell: 'assets/audio/bell.mp3',
            se_hyoshigi: 'assets/audio/hyoshigi_1.mp3',
            se_hyoshigi2: 'assets/audio/hyoshigi_2.mp3'
        };

        // ユーザー操作が必要なため、一度resumeするハンドラをwindowに仕込む
        window.addEventListener('click', () => {
            if (this.ctx.state === 'suspended') {
                this.ctx.resume();
            }
        }, { once: true });
    }

    loadSettings() {
        const saved = localStorage.getItem('bt_sound_settings');
        if (saved) {
            const data = JSON.parse(saved);
            this.bgmVolume = data.bgm ?? 0.3;
            this.seVolume = data.se ?? 0.5;
        }
    }

    saveSettings() {
        localStorage.setItem('bt_sound_settings', JSON.stringify({
            bgm: this.bgmVolume,
            se: this.seVolume
        }));
    }

    setBgmVolume(val) {
        this.bgmVolume = Math.max(0, Math.min(1, val));
        if (this.bgmAudio) {
            this.bgmAudio.volume = this.bgmVolume;
        }
        this.saveSettings();
    }

    setSeVolume(val) {
        this.seVolume = Math.max(0, Math.min(1, val));
        this.saveSettings();
    }

    /**
     * BGM再生
     */
    playBGM(key) {
        // 同じ曲なら何もしない
        if (this.currentBgmKey === key && this.bgmAudio && !this.bgmAudio.paused) {
            return;
        }

        // 停止
        this.stopBGM();

        if (this.bgmFiles[key]) {
            const src = this.bgmFiles[key];
            this.bgmAudio = new Audio(src);
            this.bgmAudio.loop = true;
            this.bgmAudio.volume = this.bgmVolume;

            this.bgmAudio.play().catch(e => {
                console.warn('BGM play blocked:', e);
            });

            this.currentBgmKey = key;
        } else {
            console.warn('Unknown BGM key:', key);
        }
    }

    stopBGM() {
        if (this.bgmAudio) {
            this.bgmAudio.pause();
            this.bgmAudio.currentTime = 0;
            this.bgmAudio = null;
        }
        this.currentBgmKey = null;
    }

    /**
     * SE再生
     */
    playSE(key) {
        if (this.ctx.state === 'suspended') this.ctx.resume();

        // ファイル定義があればそれを再生
        if (this.fileSounds[key]) {
            const audio = new Audio(this.fileSounds[key]);
            audio.volume = this.seVolume;
            audio.play().catch(() => { });
            return;
        }

        // 定義がない場合はシンセノイズ（フォールバック）
        this.playNoise(0.1, 0.5);
    }

    /**
     * ノイズ生成（フォールバック用）
     */
    playNoise(duration, vol = 1.0) {
        const t = this.ctx.currentTime;
        const bufferSize = this.ctx.sampleRate * duration;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(this.seVolume * vol, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + duration);

        noise.connect(gain);
        gain.connect(this.ctx.destination);
        noise.start(t);
    }
}

window.soundManager = new SoundManager();
