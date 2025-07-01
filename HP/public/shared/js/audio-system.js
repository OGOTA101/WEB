// 音響システム - サイト全体で使用
class AudioSystem {
    constructor() {
        this.sounds = {};
        this.volume = this.loadVolume();
        this.isMuted = this.loadMuteState();
        this.audioContext = null;

        this.initializeAudioContext();
        this.createVolumeControl();
        this.loadCommonSounds();
    }

    initializeAudioContext() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.gainNode = this.audioContext.createGain();
            this.gainNode.connect(this.audioContext.destination);
            this.updateVolume();
        } catch (e) {
            console.warn('Web Audio API not supported');
        }
    }

    async loadCommonSounds() {
        const commonSounds = {
            'click': this.generateClickSound(),
            'success': this.generateSuccessSound(),
            'error': this.generateErrorSound(),
            'notification': this.generateNotificationSound()
        };

        for (const [name, audioBuffer] of Object.entries(commonSounds)) {
            this.sounds[name] = audioBuffer;
        }
    }

    generateClickSound() {
        if (!this.audioContext) return null;

        const sampleRate = this.audioContext.sampleRate;
        const duration = 0.1;
        const buffer = this.audioContext.createBuffer(1, sampleRate * duration, sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < data.length; i++) {
            const t = i / sampleRate;
            data[i] = Math.sin(2 * Math.PI * 800 * t) * Math.exp(-t * 20) * 0.3;
        }

        return buffer;
    }

    generateSuccessSound() {
        if (!this.audioContext) return null;

        const sampleRate = this.audioContext.sampleRate;
        const duration = 0.3;
        const buffer = this.audioContext.createBuffer(1, sampleRate * duration, sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < data.length; i++) {
            const t = i / sampleRate;
            const freq1 = 523.25; // C5
            const freq2 = 659.25; // E5
            const freq3 = 783.99; // G5
            const envelope = Math.exp(-t * 3);

            data[i] = (
                Math.sin(2 * Math.PI * freq1 * t) +
                Math.sin(2 * Math.PI * freq2 * t) +
                Math.sin(2 * Math.PI * freq3 * t)
            ) * envelope * 0.1;
        }

        return buffer;
    }

    generateErrorSound() {
        if (!this.audioContext) return null;

        const sampleRate = this.audioContext.sampleRate;
        const duration = 0.2;
        const buffer = this.audioContext.createBuffer(1, sampleRate * duration, sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < data.length; i++) {
            const t = i / sampleRate;
            const freq = 200 - (t * 100); // 下降音
            const envelope = Math.exp(-t * 5);

            data[i] = Math.sin(2 * Math.PI * freq * t) * envelope * 0.2;
        }

        return buffer;
    }

    generateNotificationSound() {
        if (!this.audioContext) return null;

        const sampleRate = this.audioContext.sampleRate;
        const duration = 0.15;
        const buffer = this.audioContext.createBuffer(1, sampleRate * duration, sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < data.length; i++) {
            const t = i / sampleRate;
            const freq = 440 + Math.sin(t * 20) * 100; // 変調音
            const envelope = Math.exp(-t * 8);

            data[i] = Math.sin(2 * Math.PI * freq * t) * envelope * 0.15;
        }

        return buffer;
    }

    play(soundName, customVolume = 1.0) {
        if (this.isMuted || !this.audioContext || !this.sounds[soundName]) return;

        try {
            if (this.audioContext.state === 'suspended') {
                this.audioContext.resume();
            }

            const source = this.audioContext.createBufferSource();
            const gainNode = this.audioContext.createGain();

            source.buffer = this.sounds[soundName];
            gainNode.gain.value = this.volume * customVolume;

            source.connect(gainNode);
            gainNode.connect(this.audioContext.destination);

            source.start();
        } catch (e) {
            console.warn('Failed to play sound:', e);
        }
    }

    setVolume(volume) {
        this.volume = Math.max(0, Math.min(1, volume));
        this.updateVolume();
        this.saveVolume();
        this.updateVolumeDisplay();
    }

    updateVolume() {
        if (this.gainNode) {
            this.gainNode.gain.value = this.isMuted ? 0 : this.volume;
        }
    }

    toggleMute() {
        this.isMuted = !this.isMuted;
        this.updateVolume();
        this.saveMuteState();
        this.updateVolumeDisplay();
    }

    createVolumeControl() {
        const volumeControl = document.createElement('div');
        volumeControl.className = 'volume-control';
        volumeControl.innerHTML = `
            <button id="muteBtn" title="ミュート切り替え">🔊</button>
            <input type="range" id="volumeSlider" class="volume-slider" min="0" max="100" value="${this.volume * 100}">
            <span class="volume-text" id="volumeText">${Math.round(this.volume * 100)}</span>
        `;

        document.body.appendChild(volumeControl);

        // イベントリスナー
        const muteBtn = document.getElementById('muteBtn');
        const volumeSlider = document.getElementById('volumeSlider');

        muteBtn.addEventListener('click', () => {
            this.toggleMute();
            this.play('click');
        });

        volumeSlider.addEventListener('input', (e) => {
            this.setVolume(e.target.value / 100);
        });

        volumeSlider.addEventListener('change', () => {
            this.play('click', 0.5);
        });

        this.updateVolumeDisplay();
    }

    updateVolumeDisplay() {
        const muteBtn = document.getElementById('muteBtn');
        const volumeSlider = document.getElementById('volumeSlider');
        const volumeText = document.getElementById('volumeText');

        if (muteBtn) {
            muteBtn.textContent = this.isMuted ? '🔇' : (this.volume > 0.5 ? '🔊' : this.volume > 0 ? '🔉' : '🔈');
        }

        if (volumeSlider) {
            volumeSlider.value = this.volume * 100;
        }

        if (volumeText) {
            volumeText.textContent = this.isMuted ? 'OFF' : Math.round(this.volume * 100);
        }
    }

    loadVolume() {
        try {
            const saved = localStorage.getItem('audio-volume');
            return saved ? parseFloat(saved) : 0.7;
        } catch {
            return 0.7;
        }
    }

    saveVolume() {
        try {
            localStorage.setItem('audio-volume', this.volume.toString());
        } catch {
            // ローカルストレージが使用できない場合は無視
        }
    }

    loadMuteState() {
        try {
            const saved = localStorage.getItem('audio-muted');
            return saved === 'true';
        } catch {
            return false;
        }
    }

    saveMuteState() {
        try {
            localStorage.setItem('audio-muted', this.isMuted.toString());
        } catch {
            // ローカルストレージが使用できない場合は無視
        }
    }

    // ゲーム固有の音を追加するメソッド
    addSound(name, audioBuffer) {
        this.sounds[name] = audioBuffer;
    }

    // 初期化メソッド（後方互換性のため）
    init() {
        console.log('AudioSystem initialized');
        if (this.audioContext && this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }
    }

    // ユーザーインタラクション後にオーディオコンテキストを有効化
    enableAudio() {
        if (this.audioContext && this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }
    }
}

// グローバル音響システムインスタンス
window.audioSystem = null;

// ページ読み込み時に初期化
document.addEventListener('DOMContentLoaded', () => {
    window.audioSystem = new AudioSystem();

    // 最初のユーザーインタラクションでオーディオを有効化
    const enableAudio = () => {
        if (window.audioSystem) {
            window.audioSystem.enableAudio();
        }
        document.removeEventListener('click', enableAudio);
        document.removeEventListener('touchstart', enableAudio);
        document.removeEventListener('keydown', enableAudio);
    };

    document.addEventListener('click', enableAudio);
    document.addEventListener('touchstart', enableAudio);
    document.addEventListener('keydown', enableAudio);
});
