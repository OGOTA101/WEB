/**
 * SE（効果音）マネージャー
 * 素材：効果音ラボ（https://soundeffect-lab.info/）
 *   戦闘 / 戦闘2（銃・砲・爆発・ビーム） / 機械・乗り物（ロボット・メカ）
 *
 * ゲーム中の音は「重い金属の機体」らしく、金属音・機械音を中心に再選定。
 * UI音のみ従来の金具系の音を継続使用。
 */

/** 効果音ラボの動物声。低く重ね、金属音と混ぜてボスの声にする */
const VOICE_ANIMALS = ['lion-cry1', 'wolf-howling1', 'elephant1', 'boar-cry1'];
const VOICE_METAL = ['machine-hard-hit2', 'sword-clash3', 'union2'];
/** 混ぜた声を、ボスごとにピッチを変えて固有にする */
const BOSS_VOICE_PITCH = { leviathan: 0.56, prism: 1.24, omega: 0.78 };

export const SE_MAP = {
  // ---- UI（従来どおり） ----
  uiSelect: { file: 'sheath1', vol: 0.5 },
  uiClick: { file: 'setup1', vol: 0.5 },
  uiPause: { file: 'katana-storage1', vol: 0.5 },
  uiStageSelect: { file: 'katana-hold1', vol: 0.5 },

  // ---- ガレージ ----
  garageEquip: { file: 'union3', vol: 0.55 },             // パーツ装着：ガシャン（合体音・弱）
  garageArm: { file: 'arm-action2', vol: 0.45 },          // 整備アームが動く
  garageWeapon: { file: 'shotgun-pumpaction2', vol: 0.5 },// 武器装着：チャキッ
  garageAmbient: { file: 'giant-motor1', vol: 0.12, rate: 0.6 },
  sortieShutter: { file: 'giant-shutter1', vol: 0.6 },    // 出撃：巨大シャッターが開く
  sortieStart: { file: 'robot-startup2', vol: 0.55 },     // 起動：エネルギー充填完了

  // ---- 機体の挙動 ----
  footstep: { file: 'robot-footstep2', vol: 0.22 },       // ガション
  footstepHeavy: { file: 'robot-footstep3', vol: 0.3 },   // 巨大ロボの足音
  crawler: { file: 'robot-footstep1', vol: 0.12, rate: 1.6 },
  jump: { file: 'booster1', vol: 0.45, rate: 0.9 },
  land: { file: 'union2', vol: 0.45, rate: 1.1 },         // 着地の金属衝撃
  landHeavy: { file: 'robot-footstep3', vol: 0.6, rate: 0.85 },
  dodge: { file: 'booster1', vol: 0.6, rate: 1.35 },
  boostStart: { file: 'booster2', vol: 0.3, rate: 1.2 },
  hover: { file: 'booster2', vol: 0.12, rate: 0.8 },
  turret: { file: 'arm-action1', vol: 0.12, rate: 1.4 },  // 上半身旋回のモーター音
  lockOn: { file: 'robot-eye-flash1', vol: 0.55 },        // キューン
  lockOff: { file: 'arm-action2', vol: 0.4, rate: 1.3 },
  weaponSwitch: { file: 'handgun-ready1', vol: 0.55 },    // 武器切替：チャキッ
  noAmmo: { file: 'handgun-out-bullets1', vol: 0.5 },     // 弾切れ：カチッ
  reloadStart: { file: 'machinegun-magazine-remove1', vol: 0.45 },
  reloadEnd: { file: 'machinegun-magazine-set1', vol: 0.5 },
  reloadHeavy: { file: 'largerifle-magazine1', vol: 0.5 },

  // ---- 射撃 ----
  fireCannon: { file: 'cannon2', vol: 0.7 },
  fireGatling: { file: 'shot1', vol: 0.3, rate: 0.75 },
  firePulse: { file: 'beamgun-shot1', vol: 0.4 },
  beamStart: { file: 'beamgun2', vol: 0.5 },
  beamLoop: { file: 'beamgun1', vol: 0.3, rate: 0.9 },
  fireMissile: { file: 'missile1', vol: 0.5 },
  railCharge: { file: 'beam-gun-charge1', vol: 0.45, rate: 1.2 },
  fireRail: { file: 'largerifle-firing1', vol: 0.7 },
  fireRailBeam: { file: 'beamgun3', vol: 0.45, rate: 0.8 },
  firePlasma: { file: 'beamgun3', vol: 0.5, rate: 1.1 },
  fireShotgun: { file: 'shotgun-firing1', vol: 0.65 },
  shotgunPump: { file: 'shotgun-pumpaction1', vol: 0.45 },
  flameLoop: { file: 'magic-flame2', vol: 0.32 },
  fireGravity: { file: 'magic-gravity2', vol: 0.5 },
  gravityImplode: { file: 'big-explosion2', vol: 0.55, rate: 1.2 },
  fireMortar: { file: 'cannon1', vol: 0.6, rate: 0.9 },
  fireVulcan: { file: 'heavy-machine-gun1', vol: 0.2, rate: 1.4 },
  casing: { file: 'cartridge1', vol: 0.18 },

  // ---- 近接 ----
  meleeSwing: { file: 'wepon-swing1', vol: 0.55 },
  meleeSwingHeavy: { file: 'large-sword-slash1', vol: 0.5 },
  meleeHit: { file: 'sword-clash3', vol: 0.6 },            // 地面が揺れるほどの金属衝撃
  pileCharge: { file: 'largerifle-boltaction1', vol: 0.5 },
  pileFire: { file: 'cannon1', vol: 0.7, rate: 1.2 },
  hammerHit: { file: 'giant-robot-down1', vol: 0.45, rate: 1.6 },
  deflect: { file: 'bullets-bounce1', vol: 0.5 },          // 斬撃で弾を弾く

  // ---- 着弾・爆発 ----
  hitMetal: { file: 'machine-hit1', vol: 0.32, rate: 1.1 },
  hitMetalHeavy: { file: 'machine-hard-hit2', vol: 0.45 },
  hitLaser: { file: 'shot-struck1', vol: 0.3, rate: 1.3 },
  ricochet: { file: 'bullets-bounce1', vol: 0.32 },        // 遮蔽物に当たる・跳弾
  bulletClash: { file: 'bullets-bounce1', vol: 0.4, rate: 1.2 }, // 弾同士の相殺
  explosionSmall: { file: 'bomb2', vol: 0.45 },
  explosionMid: { file: 'bomb1', vol: 0.55 },
  explosionBig: { file: 'big-explosion1', vol: 0.6 },
  burnTick: { file: 'magic-flame1', vol: 0.22, rate: 1.3 },

  // ---- 敵 ----
  enemySpawn: { file: 'robot-eye-flash1', vol: 0.3, rate: 0.7 },
  enemyCharge: { file: 'beam-gun-charge1', vol: 0.3, rate: 0.9 },  // コアが赤くなる予兆
  enemyFire: { file: 'laser1', vol: 0.35, rate: 0.9 },
  enemyRush: { file: 'booster1', vol: 0.5, rate: 0.75 },
  enemyDestroy: { file: 'bomb3', vol: 0.5 },

  // ---- 被弾・状態異常・大破 ----
  playerHit: { file: 'machine-hard-hit1', vol: 0.6 },
  playerHitHeavy: { file: 'machine-hard-hit3', vol: 0.7 },
  knockback: { file: 'ship-collision1', vol: 0.35, rate: 1.4 },
  stun: { file: 'magic-electron2', vol: 0.5, rate: 0.8 },
  burn: { file: 'magic-flame1', vol: 0.45 },
  playerDestroyed: { file: 'giant-robot-down1', vol: 0.7 },
  wreckSpark: { file: 'machine-hard-hit2', vol: 0.18, rate: 1.3 },
  reviveTick: { file: 'computer1', vol: 0.2 },
  revived: { file: 'robot-startup1', vol: 0.6 },
  fall: { file: 'slow-motion1', vol: 0.5 },
  redeploy: { file: 'robot-startup2', vol: 0.55 },

  // ---- Wave・ボス・ステージ ----
  sandstorm: { file: 'magic-quake1', vol: 0.3, rate: 0.8 },
  waveStart: { file: 'machine-deformation1', vol: 0.45 },
  bossSiren: { file: 'base-siren1', vol: 0.4 },
  bossAppear: { file: 'dragon-cry1', vol: 0.7, rate: 0.6 },
  bossMotor: { file: 'giant-motor1', vol: 0.5, rate: 0.7 },
  bossRoar: { file: 'giant-arm-action1', vol: 0.6 },
  bossCharge: { file: 'beam-gun-charge1', vol: 0.55, rate: 0.6 },
  bossTelegraph: { file: 'magic-charge1', vol: 0.55, rate: 0.62 },
  bossMove: { file: 'monster-footstep1', vol: 0.5, rate: 0.58 },
  bossMoveHeavy: { file: 'machine-deformation1', vol: 0.42, rate: 0.7 },
  bossVolley: { file: 'cannon1', vol: 0.55, rate: 0.8 },
  bossBeam: { file: 'beamgun1', vol: 0.65, rate: 0.6 },
  bossLand: { file: 'union2', vol: 0.85, rate: 0.6 },
  bossQuake: { file: 'earth-tremor1', vol: 0.65 },
  bossMissile: { file: 'rocket-launcher1', vol: 0.5 },
  bossHit: { file: 'machine-hit3', vol: 0.35, rate: 0.8 },
  bossDefeat: { file: 'big-explosion2', vol: 0.9 },
  bossCollapse: { file: 'giant-robot-down1', vol: 0.8, rate: 0.7 },
  bossDeathBreak: { file: 'building-collapse1', vol: 0.75, rate: 0.72 },
  bossDeathCrack: { file: 'rock-break1', vol: 0.6, rate: 0.8 },
  guardOn: { file: 'shield1', vol: 0.45 },
  guardHit: { file: 'sword-clash3', vol: 0.42, rate: 0.85 },
  stageClear: { file: 'magic-statusup2', vol: 0.55 },
  victory: { file: 'magic-cure4', vol: 0.5 }
};

class AudioManager {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.buffers = new Map();
    this.bossVoice = null;
    this.lastPlayed = new Map();
    this.volume = parseFloat(localStorage.getItem('sandark_volume') ?? '0.8');
    this.listenerPos = { x: 0, y: 0, z: 0 };
  }

  /** 最初のユーザー操作で呼ぶ（自動再生制限対策） */
  unlock() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      // 大音量の爆発が重なっても割れないようコンプレッサーを挟む
      this.comp = this.ctx.createDynamicsCompressor();
      this.comp.threshold.value = -14;
      this.comp.ratio.value = 6;
      this.master = this.ctx.createGain();
      this.master.gain.value = this.volume;
      this.master.connect(this.comp).connect(this.ctx.destination);
      this._loadAll();
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }

  async _loadAll() {
    const files = [...new Set([...Object.values(SE_MAP).map((s) => s.file), ...VOICE_ANIMALS, ...VOICE_METAL])];
    await Promise.all(files.map(async (f) => {
      try {
        const res = await fetch(`/se/${f}.mp3`);
        this.buffers.set(f, await this.ctx.decodeAudioData(await res.arrayBuffer()));
      } catch (e) {
        console.warn('SE load failed:', f);
      }
    }));
    await this._buildBossVoice();
  }

  /**
   * ライオン・狼・象・猪の声を低く再生し、金属打撃を重ねた1本の声を作る。
   * 再生時にボスごとの playbackRate で個体差を付ける。
   */
  async _buildBossVoice() {
    const animals = VOICE_ANIMALS.map((f) => this.buffers.get(f)).filter(Boolean);
    const metals = VOICE_METAL.map((f) => this.buffers.get(f)).filter(Boolean);
    if (animals.length < 3 || !metals.length || !this.ctx) return;
    const seconds = 2.6;
    const offline = new OfflineAudioContext(2, Math.ceil(this.ctx.sampleRate * seconds), this.ctx.sampleRate);
    const mix = offline.createGain();
    mix.gain.value = 0.9;
    const low = offline.createBiquadFilter();
    low.type = 'lowpass';
    low.frequency.value = 340;
    low.Q.value = 0.7;
    mix.connect(low).connect(offline.destination);
    animals.forEach((buf, i) => {
      const src = offline.createBufferSource();
      src.buffer = buf;
      src.playbackRate.value = 0.4 + i * 0.035;
      const g = offline.createGain();
      g.gain.value = 0.62;
      src.connect(g).connect(mix);
      src.start(i * 0.04);
    });
    metals.forEach((buf, i) => {
      const src = offline.createBufferSource();
      src.buffer = buf;
      src.playbackRate.value = 0.5;
      const g = offline.createGain();
      g.gain.value = 0.38;
      src.connect(g).connect(mix);
      src.start(0.03 * i);
    });
    this.bossVoice = await offline.startRendering();
  }

  /** 合成した獣の声。type は leviathan / prism / omega */
  playBossVoice(type, opt = {}) {
    if (!this.ctx || !this.bossVoice) return null;
    const key = `bossVoice:${type}:${opt.tag || 'v'}`;
    const now = this.ctx.currentTime;
    const last = this.lastPlayed.get(key) ?? -1;
    if (now - last < (opt.throttle ?? 0.55)) return null;
    this.lastPlayed.set(key, now);
    const src = this.ctx.createBufferSource();
    src.buffer = this.bossVoice;
    const pitch = (BOSS_VOICE_PITCH[type] || 0.8) * (opt.rate ?? 1);
    src.playbackRate.value = pitch;
    const gain = this.ctx.createGain();
    gain.gain.value = opt.vol ?? 0.8;
    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 300 + pitch * 160;
    src.connect(lp).connect(gain).connect(this.master);
    src.start();
    return { src, gain };
  }

  setVolume(v) {
    this.volume = v;
    localStorage.setItem('sandark_volume', String(v));
    if (this.master) this.master.gain.value = v;
  }

  setListener(pos) {
    this.listenerPos.x = pos.x;
    this.listenerPos.y = pos.y;
    this.listenerPos.z = pos.z;
  }

  /**
   * @param {string} key SE_MAP のキー
   * @param {object} opt { pos, throttle, vol, rate, noJitter }
   */
  play(key, opt = {}) {
    if (!this.ctx) return null;
    const def = SE_MAP[key];
    const buf = def && this.buffers.get(def.file);
    if (!buf) return null;

    const now = this.ctx.currentTime;
    const last = this.lastPlayed.get(key) ?? -1;
    if (now - last < (opt.throttle ?? 0.04)) return null;
    this.lastPlayed.set(key, now);

    let vol = (def.vol ?? 0.5) * (opt.vol ?? 1);
    if (opt.pos) {
      const dx = opt.pos.x - this.listenerPos.x, dy = opt.pos.y - this.listenerPos.y, dz = opt.pos.z - this.listenerPos.z;
      vol *= Math.max(0.06, 1 - Math.sqrt(dx * dx + dy * dy + dz * dz) / 150);
    }
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.playbackRate.value = (def.rate ?? 1) * (opt.rate ?? 1) * (opt.noJitter ? 1 : 0.95 + Math.random() * 0.1);
    const gain = this.ctx.createGain();
    gain.gain.value = vol;
    src.connect(gain).connect(this.master);
    src.start();
    return { src, gain };
  }

  /** 持続音（ビーム・火炎・ガレージ環境音）。stop() で停止 */
  loop(key, opt = {}) {
    const def = SE_MAP[key];
    const buf = this.ctx && def && this.buffers.get(def.file);
    if (!buf) return { stop() {} };
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    src.playbackRate.value = (def.rate ?? 1) * (opt.rate ?? 1);
    const gain = this.ctx.createGain();
    gain.gain.value = (def.vol ?? 0.5) * (opt.vol ?? 1);
    src.connect(gain).connect(this.master);
    src.start();
    const ctx = this.ctx;
    return {
      stop() {
        try {
          gain.gain.setTargetAtTime(0, ctx.currentTime, 0.06);
          src.stop(ctx.currentTime + 0.3);
        } catch (e) { /* 停止済み */ }
      }
    };
  }
}

export const audio = new AudioManager();
