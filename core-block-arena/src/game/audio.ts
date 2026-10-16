import type { GameFxEvent } from "./types";

export class GameAudio {
  private context?: AudioContext;
  private unlocked = false;

  unlock() {
    if (this.unlocked) return;
    const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextCtor) return;
    this.context = new AudioContextCtor();
    void this.context.resume();
    this.unlocked = true;
  }

  play(event: GameFxEvent) {
    if (!this.context || this.context.state === "suspended") return;
    if (event.type === "shoot") this.tone(520, 0.035, "square", 0.045);
    if (event.type === "hit") this.noise(0.045, 0.055);
    if (event.type === "break") this.tone(150, 0.12, "sawtooth", 0.07);
    if (event.type === "drop") this.tone(760, 0.09, "triangle", 0.06);
    if (event.type === "collect") this.arpeggio(event.core ? [640, 940, 1280] : [520, 780]);
    if (event.type === "gameover") this.arpeggio([360, 260, 160]);
  }

  private tone(freq: number, duration: number, type: OscillatorType, volume: number) {
    if (!this.context) return;
    const now = this.context.currentTime;
    const osc = this.context.createOscillator();
    const gain = this.context.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.connect(gain).connect(this.context.destination);
    osc.start(now);
    osc.stop(now + duration);
  }

  private arpeggio(freqs: number[]) {
    freqs.forEach((freq, index) => window.setTimeout(() => this.tone(freq, 0.07, "triangle", 0.055), index * 45));
  }

  private noise(duration: number, volume: number) {
    if (!this.context) return;
    const sampleRate = this.context.sampleRate;
    const buffer = this.context.createBuffer(1, Math.floor(sampleRate * duration), sampleRate);
    const channel = buffer.getChannelData(0);
    for (let i = 0; i < channel.length; i += 1) channel[i] = (Math.random() * 2 - 1) * (1 - i / channel.length);
    const source = this.context.createBufferSource();
    const gain = this.context.createGain();
    gain.gain.value = volume;
    source.buffer = buffer;
    source.connect(gain).connect(this.context.destination);
    source.start();
  }
}
