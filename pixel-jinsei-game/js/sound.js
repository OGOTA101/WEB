/**
 * 8bit / 16bit レトロチップチューン音響エンジン (Web Audio API)
 * 外部音声ファイルに依存せず、ルーレット回転音、サイコロ音、コイン音、
 * イベントジングル、BGMをすべてドット絵の世界観に合わせて生成します。
 */
class RetroSoundEngine {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.bgmPlaying = false;
    this.bgmTimer = null;
    this.bgmStep = 0;
    this.volume = 0.28;
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.muted) {
      this.stopBgm();
    } else {
      this.init();
      this.startBgm();
    }
    return this.muted;
  }

  playTone(freq, duration = 0.1, type = 'square', gainVal = 0.18, delay = 0, slideTo = null) {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (slideTo !== null) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), now + duration);
    }

    const finalGain = gainVal * this.volume;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(finalGain, now + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  playNoise(duration = 0.08, gainVal = 0.15, delay = 0) {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime + delay;
    const bufferSize = Math.floor(this.ctx.sampleRate * duration);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1200, now);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(gainVal * this.volume, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    noise.start(now);
    noise.stop(now + duration);
  }

  // UIクリック音
  playClick() {
    this.playTone(660, 0.045, 'square', 0.16);
    this.playTone(880, 0.045, 'square', 0.14, 0.03);
  }

  // キャンセル・戻る音
  playCancel() {
    this.playTone(440, 0.05, 'square', 0.15);
    this.playTone(330, 0.07, 'square', 0.15, 0.04);
  }

  // ルーレットのピン弾き音
  playRouletteTick(pitchFactor = 1.0) {
    this.playTone(520 * pitchFactor, 0.028, 'triangle', 0.22);
    this.playNoise(0.015, 0.08);
  }

  // ルーレット決定音
  playRouletteResult() {
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((n, i) => {
      this.playTone(n, 0.11, 'square', 0.22, i * 0.06);
    });
  }

  // サイコロが転がる音
  playDiceRoll() {
    this.playNoise(0.035, 0.18);
    this.playTone(300 + Math.random() * 350, 0.03, 'triangle', 0.18);
  }

  // コマが1マス進むポコッという音
  playStep(stepIndex = 0) {
    const base = 360 + (stepIndex % 6) * 35;
    this.playTone(base, 0.065, 'square', 0.18, 0, base * 1.25);
  }

  // お金が増えるチャリン音
  playCashGain() {
    this.playTone(987.77, 0.07, 'square', 0.22, 0);
    this.playTone(1318.51, 0.22, 'square', 0.24, 0.07);
  }

  // お金が減る・支払い音
  playCashLoss() {
    this.playTone(392.0, 0.09, 'sawtooth', 0.2, 0);
    this.playTone(311.13, 0.11, 'sawtooth', 0.2, 0.09);
    this.playTone(261.63, 0.2, 'sawtooth', 0.22, 0.18);
  }

  // 借金（約束手形）スタンプ音
  playDebt() {
    this.playNoise(0.12, 0.3, 0);
    this.playTone(146.83, 0.25, 'sawtooth', 0.28, 0.02, 98.0);
  }

  // 結婚・お祝いファンファーレ
  playWedding() {
    const melody = [
      { f: 523.25, d: 0.14, t: 0.0 },
      { f: 523.25, d: 0.08, t: 0.16 },
      { f: 523.25, d: 0.08, t: 0.26 },
      { f: 523.25, d: 0.28, t: 0.36 },
      { f: 659.25, d: 0.18, t: 0.66 },
      { f: 783.99, d: 0.18, t: 0.86 },
      { f: 1046.5, d: 0.4, t: 1.06 }
    ];
    melody.forEach((m) => this.playTone(m.f, m.d, 'square', 0.24, m.t));
  }

  // 就職・ランクアップ・家購入のポジティブジングル
  playFanfare() {
    const melody = [
      { f: 440, d: 0.09, t: 0.0 },
      { f: 554.37, d: 0.09, t: 0.1 },
      { f: 659.25, d: 0.09, t: 0.2 },
      { f: 880, d: 0.32, t: 0.3 }
    ];
    melody.forEach((m) => this.playTone(m.f, m.d, 'square', 0.22, m.t));
  }

  // アクシデント・トラブル発生音
  playTrouble() {
    const melody = [
      { f: 466.16, d: 0.11, t: 0.0 },
      { f: 440.0, d: 0.11, t: 0.12 },
      { f: 415.3, d: 0.11, t: 0.24 },
      { f: 392.0, d: 0.35, t: 0.36 }
    ];
    melody.forEach((m) => this.playTone(m.f, m.d, 'sawtooth', 0.2, m.t));
  }

  // ゴール到着・優勝大ファンファーレ
  playGoal() {
    const melody = [
      { f: 523.25, d: 0.12, t: 0.0 },
      { f: 659.25, d: 0.12, t: 0.13 },
      { f: 783.99, d: 0.12, t: 0.26 },
      { f: 1046.5, d: 0.24, t: 0.4 },
      { f: 783.99, d: 0.12, t: 0.66 },
      { f: 1046.5, d: 0.48, t: 0.8 }
    ];
    melody.forEach((m) => this.playTone(m.f, m.d, 'square', 0.26, m.t));
  }

  // ほのぼのボードゲーム風チップチューンBGMループ
  startBgm() {
    if (this.muted || this.bgmPlaying) return;
    this.init();
    if (!this.ctx) return;

    this.bgmPlaying = true;
    const leadNotes = [
      523.25, 659.25, 783.99, 659.25, 880.0, 783.99, 659.25, 587.33,
      523.25, 587.33, 659.25, 783.99, 659.25, 587.33, 523.25, 392.0,
      440.0, 523.25, 659.25, 880.0, 783.99, 659.25, 587.33, 523.25,
      587.33, 659.25, 587.33, 493.88, 523.25, 0, 523.25, 0
    ];
    const bassNotes = [
      261.63, 196.0, 220.0, 196.0, 174.61, 196.0, 261.63, 196.0,
      261.63, 196.0, 220.0, 196.0, 174.61, 196.0, 261.63, 261.63,
      220.0, 164.81, 174.61, 220.0, 196.0, 146.83, 196.0, 246.94,
      196.0, 146.83, 196.0, 246.94, 261.63, 196.0, 130.81, 0
    ];

    this.bgmTimer = setInterval(() => {
      if (this.muted || !this.bgmPlaying) return;
      const idx = this.bgmStep % leadNotes.length;
      const lead = leadNotes[idx];
      const bass = bassNotes[idx];
      if (lead > 0) {
        this.playTone(lead, 0.16, 'triangle', 0.065, 0);
      }
      if (bass > 0 && idx % 2 === 0) {
        this.playTone(bass, 0.28, 'square', 0.04, 0);
      }
      this.bgmStep++;
    }, 240);
  }

  stopBgm() {
    this.bgmPlaying = false;
    if (this.bgmTimer) {
      clearInterval(this.bgmTimer);
      this.bgmTimer = null;
    }
  }
}

window.soundEngine = new RetroSoundEngine();
