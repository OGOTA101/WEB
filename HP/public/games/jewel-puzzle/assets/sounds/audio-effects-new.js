// 💎 宝石パズルゲーム 音響効果システム - NEW FILE

class JewelAudioEffects {
    constructor() {
        this.audioContext = null;
        this.masterGain = null;
        this.initialized = false;
        this.init();
    }

    init() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.masterGain = this.audioContext.createGain();
            this.masterGain.connect(this.audioContext.destination);
            this.masterGain.gain.value = 0.3; // 音量を30%に設定
            this.initialized = true;
        } catch (error) {
            console.warn('Web Audio API not supported', error);
            this.initialized = false;
        }
    }

    // 音声コンテキストを有効化（ユーザーインタラクション後）
    async enable() {
        if (!this.initialized) return;

        try {
            if (this.audioContext.state === 'suspended') {
                await this.audioContext.resume();
            }
        } catch (error) {
            console.warn('Failed to enable audio context', error);
        }
    }

    // 宝石マッチ音
    playMatch(matchCount = 3) {
        if (!this.initialized) return;

        const frequency = 440 + (matchCount * 100); // マッチ数に応じて音程を上げる
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(this.masterGain);

        oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(frequency * 0.7, this.audioContext.currentTime + 0.3);

        gainNode.gain.setValueAtTime(0.4, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.3);

        oscillator.type = 'sine';
        oscillator.start();
        oscillator.stop(this.audioContext.currentTime + 0.3);
    }

    // コンボ音（強化版）
    playCombo(comboLevel) {
        if (!this.initialized) return;

        const baseFreq = 523; // C5
        let frequencies = [baseFreq, baseFreq * 1.25, baseFreq * 1.5]; // ドミソ

        // コンボレベルに応じて音を変更
        if (comboLevel >= 10) {
            // 10コンボ以上の場合：豪華なファンファーレ
            frequencies = [523, 659, 784, 1047]; // C-E-G-C
        } else if (comboLevel >= 5) {
            // 5コンボ以上の場合：華やかな音階
            frequencies = [523, 587, 659, 784]; // C-D-E-G
        }

        frequencies.forEach((freq, index) => {
            setTimeout(() => {
                const oscillator = this.audioContext.createOscillator();
                const gainNode = this.audioContext.createGain();

                oscillator.connect(gainNode);
                gainNode.connect(this.masterGain);

                oscillator.frequency.setValueAtTime(freq, this.audioContext.currentTime);
                oscillator.type = comboLevel >= 10 ? 'square' : 'triangle';

                const volume = comboLevel >= 10 ? 0.4 : 0.3;
                const duration = comboLevel >= 10 ? 0.3 : 0.2;

                gainNode.gain.setValueAtTime(volume, this.audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);

                oscillator.start();
                oscillator.stop(this.audioContext.currentTime + duration);
            }, index * (comboLevel >= 10 ? 80 : 50));
        });

        // 高コンボの場合は追加でエコー効果
        if (comboLevel >= 10) {
            setTimeout(() => {
                this.playEchoEffect();
            }, 400);
        }
    }

    // エコー効果
    playEchoEffect() {
        if (!this.initialized) return;

        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(this.masterGain);

        oscillator.frequency.setValueAtTime(1047, this.audioContext.currentTime); // 高いC
        oscillator.type = 'sine';

        gainNode.gain.setValueAtTime(0.2, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.5);

        oscillator.start();
        oscillator.stop(this.audioContext.currentTime + 0.5);
    }

    // 宝石選択音
    playSelect() {
        if (!this.initialized) return;

        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(this.masterGain);

        oscillator.frequency.setValueAtTime(800, this.audioContext.currentTime);
        oscillator.type = 'sine';

        gainNode.gain.setValueAtTime(0.2, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.1);

        oscillator.start();
        oscillator.stop(this.audioContext.currentTime + 0.1);
    }

    // 宝石移動音
    playMove() {
        if (!this.initialized) return;

        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(this.masterGain);

        oscillator.frequency.setValueAtTime(300, this.audioContext.currentTime);
        oscillator.frequency.linearRampToValueAtTime(600, this.audioContext.currentTime + 0.15);
        oscillator.type = 'square';

        gainNode.gain.setValueAtTime(0.1, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.15);

        oscillator.start();
        oscillator.stop(this.audioContext.currentTime + 0.15);
    }

    // 宝石落下音
    playDrop() {
        if (!this.initialized) return;

        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(this.masterGain);

        oscillator.frequency.setValueAtTime(1000, this.audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(200, this.audioContext.currentTime + 0.2);
        oscillator.type = 'sawtooth';

        gainNode.gain.setValueAtTime(0.15, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.2);

        oscillator.start();
        oscillator.stop(this.audioContext.currentTime + 0.2);
    }

    // 時間警告音
    playTimeWarning() {
        if (!this.initialized) return;

        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(this.masterGain);

        oscillator.frequency.setValueAtTime(880, this.audioContext.currentTime);
        oscillator.type = 'triangle';

        gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime);
        gainNode.gain.setValueAtTime(0.1, this.audioContext.currentTime + 0.1);
        gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime + 0.2);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.5);

        oscillator.start();
        oscillator.stop(this.audioContext.currentTime + 0.5);
    }

    // ゲームオーバー音
    playGameOver() {
        if (!this.initialized) return;

        const frequencies = [330, 294, 262, 220]; // 下降音階

        frequencies.forEach((freq, index) => {
            setTimeout(() => {
                const oscillator = this.audioContext.createOscillator();
                const gainNode = this.audioContext.createGain();

                oscillator.connect(gainNode);
                gainNode.connect(this.masterGain);

                oscillator.frequency.setValueAtTime(freq, this.audioContext.currentTime);
                oscillator.type = 'sine';

                gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.8);

                oscillator.start();
                oscillator.stop(this.audioContext.currentTime + 0.8);
            }, index * 200);
        });
    }

    // 音量設定
    setVolume(volume) {
        if (!this.initialized) return;
        this.masterGain.gain.value = Math.max(0, Math.min(1, volume));
    }
}

// グローバルインスタンス
window.jewelAudioEffects = new JewelAudioEffects();
console.log('🎵 宝石パズル音響システム NEW FILE 初期化完了');
