import * as THREE from 'three';
import { PARTS_CATALOG, computeMechStats, getInitialInventory } from './partsData.js';
import { WasmPhysicsBridge } from './wasmKernel.js';
import { createVoxelMechModel } from './voxelBuilder.js';
import { DesertShipWorld } from './desertWorld.js';
import { CoopNetworkManager } from './networkCoop.js';
import { STAGES } from './stages.js';
import { audio } from './audio.js';
import { createRenderer, createPost, createEnvironment } from './render.js';
import { ParticleSystem } from './particles.js';
import { Garage } from './garage.js';
import { $, HW, HL, GRAVITY, MECH_LENGTH, REVIVE_RADIUS, WRECK_TIME, REVIVE_TIME, lerpAngle, easeOutCubic, disposeObject } from './game/util.js';
import { GarageUI } from './game/garageUI.js';
import { WeaponSystem } from './game/weaponSystem.js';
import { EnemySystem } from './game/enemySystem.js';
import { BossSystem } from './game/bossSystem.js';
import { DeathSystem } from './game/deathSystem.js';

/**
 * SAND ARK : VOXEL ARMOR メインエンジン（WebGPU版）
 *
 * - 描画：WebGPURenderer（非対応環境は自動でWebGL2）＋ブルームのポストプロセス
 * - ガレージ（格納庫）で組み替え → シャッターが開いて出撃 → ステージ → ガレージへ帰還
 * - 戦闘：武器スロット1〜4、近接、ADS、肩越しTPSカメラ、弾の相殺、大破と救援
 */
class SandArkGame {
  constructor() {
    this.container = $('canvas-container');
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(58, innerWidth / innerHeight, 0.2, 1800);
    this.wasm = new WasmPhysicsBridge();

    this.state = 'boot'; // boot | garage | playing | paused | result
    this.selectedStage = 1;
    this.progress = parseInt(localStorage.getItem('sandark_progress') || '0', 10);
    this.inventory = this._loadInventory();
    this.loadout = this._loadLoadout();
    this.stats = computeMechStats(this.loadout);

    this.player = {
      mesh: null, pos: new THREE.Vector3(0, 0, 18), vel: new THREE.Vector3(), knock: new THREE.Vector3(),
      yaw: 0, pitch: 0.12, hp: 1, maxHp: 1, ep: 1, maxEp: 1,
      grounded: true, landing: 0, walkCycle: 0, lastStepSign: 1,
      stun: 0, burn: 0, burnTick: 0, dodge: null, lunge: null, dodgeCd: 0, invuln: 0,
      hoverSE: 0, boosting: false, dead: false, downState: null
    };
    this.cam = { pos: new THREE.Vector3(0, 6, 30), look: new THREE.Vector3(0, 2, 0), init: false, shake: 0, fov: 58, dist: 10.5, shoulder: 1.5 };
    this.lock = { target: null };
    this.keys = {};
    this.lastTap = {};
    this.mouse = { left: false, right: false };
    this.ads = false;
    this.padPrev = {};

    this.bullets = [];
    this.enemyBullets = [];
    this.enemies = [];
    this.drops = [];
    this.telegraphs = [];
    this.trails = [];
    this.singularities = [];
    this.flames = [];
    this.meteors = [];
    this.allies = [];
    this.remoteMeshes = new Map();
    this.boss = null;
    this.bossIntroCam = null;
    this.flow = null;
    this.reserve = 2;     // 予備機（全機大破でゲームオーバー）
    this.healKits = 1;    // 修理キット
    this.runStats = { kills: 0, deaths: 0, time: 0, drops: [] };

    this.net = new CoopNetworkManager((id, d) => this._onRemoteUpdate(id, d), (s) => this._spawnRemoteShot(s), () => {});
    this.netTimer = 0;
    this._init();
  }

  _loadInventory() {
    const def = getInitialInventory();
    try {
      const saved = JSON.parse(localStorage.getItem('sandark_inventory_v2') || 'null');
      if (saved && typeof saved === 'object') {
        for (const [k, v] of Object.entries(saved)) {
          if (typeof v === 'number' && v > 0) def[k] = Math.max(def[k] || 0, v);
        }
      }
    } catch (e) { /* 破損データは無視 */ }
    return def;
  }

  _saveInventory() {
    try {
      localStorage.setItem('sandark_inventory_v2', JSON.stringify(this.inventory));
    } catch (e) { /* 無視 */ }
  }

  _loadLoadout() {
    // 初期状態は武器1個（w_cannon）のみ装備、左腕は未装着（w_none）からスタート
    const def = { head: 'head_sensor', body: 'body_std', rarm: 'w_cannon', larm: 'w_none', legs: 'legs_caterpillar', booster: 'boost_twin' };
    try {
      const saved = JSON.parse(localStorage.getItem('sandark_loadout_v2') || 'null');
      if (saved) {
        for (const k of Object.keys(def)) {
          const pid = saved[k];
          if (pid && PARTS_CATALOG[k].some((p) => p.id === pid) && (this.inventory[pid] || 0) > 0) {
            def[k] = pid;
          }
        }
        // 左右に同じ武器を付けているが1個しか所持していない場合は左腕を外す
        if (def.rarm === def.larm && def.rarm !== 'w_none' && (this.inventory[def.rarm] || 0) < 2) {
          def.larm = 'w_none';
        }
      }
    } catch (e) { /* 破損データは無視 */ }
    return def;
  }

  async _init() {
    await this.wasm.init();
    const { renderer, backend } = await createRenderer(this.container);
    this.renderer = renderer;
    this.backend = backend;
    $('backend-label').textContent = `RENDERER: ${backend}`;

    const env = createEnvironment(renderer);
    this.scene.environment = env;
    this.scene.environmentIntensity = 0.45;

    // 共有ジオメトリ
    const cyl = new THREE.CylinderGeometry(1, 1, 1, 12, 1, true);
    cyl.rotateX(Math.PI / 2);
    this.geo = {
      box: new THREE.BoxGeometry(1, 1, 1),
      sphere: new THREE.IcosahedronGeometry(1, 1),
      cyl,
      ring: new THREE.RingGeometry(0.9, 1, 56).rotateX(-Math.PI / 2),
      disc: new THREE.CircleGeometry(1, 48).rotateX(-Math.PI / 2),
      plane: new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2),
      torus: new THREE.TorusGeometry(1, 0.09, 6, 32)
    };
    this._mats = new Map();

    this.world = new DesertShipWorld(this.scene);
    this.px = new ParticleSystem(this.scene, { lightCount: 2 });
    this.garage = new Garage();
    this.garage.scene.environment = env;
    this.garage.scene.environmentIntensity = 0.55;

    this.battlePost = createPost(renderer, this.scene, this.camera, { strength: 0.6, radius: 0.45, threshold: 0.75 }).post;
    this.garagePost = createPost(renderer, this.garage.scene, this.garage.camera, { strength: 0.45, radius: 0.4, threshold: 0.9 }).post;

    this._rebuildPlayerMech();
    this._initGarageUI();
    this._initInput();
    this.world.applyTheme(STAGES[0].theme);

    addEventListener('resize', () => {
      this.camera.aspect = innerWidth / innerHeight;
      this.camera.updateProjectionMatrix();
      this.garage.resize();
      this.renderer.setSize(innerWidth, innerHeight);
    });

    this._showGarage();
    this.lastTime = performance.now();
    this.renderer.setAnimationLoop((t) => this._loop(t));
  }

  /** 発光（加算合成）マテリアル。mul>1 でHDR輝度にしてブルームを効かせる */
  glowMat(color, opacity = 1, mul = 2.5) {
    const key = `g_${color}_${opacity}_${mul}`;
    if (!this._mats.has(key)) {
      this._mats.set(key, new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(mul), transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false }));
    }
    return this._mats.get(key);
  }

  solidMat(color, metal = 0.85, rough = 0.3, emissive = 0, ei = 0) {
    const key = `s_${color}_${metal}_${rough}_${emissive}_${ei}`;
    if (!this._mats.has(key)) this._mats.set(key, new THREE.MeshStandardMaterial({ color, metalness: metal, roughness: rough, emissive, emissiveIntensity: ei }));
    return this._mats.get(key);
  }

  _rebuildPlayerMech() {
    if (this.player.mesh) {
      this.scene.remove(this.player.mesh);
      disposeObject(this.player.mesh);
    }
    this.stats = computeMechStats(this.loadout);
    this.player.mesh = createVoxelMechModel(this.stats);
    this.player.mesh.position.copy(this.player.pos);
    this.scene.add(this.player.mesh);
    this.player.maxHp = this.player.hp = this.stats.hp;
    this.player.maxEp = this.player.ep = this.stats.ep;
    localStorage.setItem('sandark_loadout_v2', JSON.stringify(this.loadout));
    this._initWeaponStates();
  }

  // =========================================================================
  // 入力
  // =========================================================================
  _initInput() {
    const unlock = () => {
      audio.unlock();
      if (this.state === 'garage' && !this.garageLoop) setTimeout(() => { if (this.state === 'garage' && !this.garageLoop) this.garageLoop = audio.loop('garageAmbient'); }, 600);
    };
    addEventListener('pointerdown', unlock);
    addEventListener('keydown', unlock);

    addEventListener('keydown', (e) => {
      this.keys[e.code] = true;
      if (this.state !== 'playing' || e.repeat) return;
      const p = this.player;
      if (['KeyW', 'KeyA', 'KeyS', 'KeyD'].includes(e.code)) {
        const now = performance.now();
        if (now - (this.lastTap[e.code] || 0) < 280) {
          const m = { KeyW: [0, -1], KeyS: [0, 1], KeyA: [-1, 0], KeyD: [1, 0] }[e.code];
          this._tryDodge(m[0], m[1]);
          this.lastTap[e.code] = 0;
        } else this.lastTap[e.code] = now;
      }
      if (e.code.startsWith('Digit')) {
        const n = parseInt(e.code.slice(5), 10);
        if (n >= 1 && n <= 4) this._switchWeapon(n - 1);
      }
      if (e.code === 'KeyR') this._startReload(this.activeSlot, true);
      if (e.code === 'KeyF') this._toggleLock();
      if (e.code === 'KeyH') this._useHealKit();
      if (e.code === 'KeyG' && p.dead && p.downState === 'wreck') {
        audio.play('uiClick', { throttle: 0 });
        this._announce('ガレージ帰還', `${30}秒後に再出撃します`);
        this._startRedeploy();
      }
      if (e.code === 'Space') this.jumpQueued = true;
    });
    addEventListener('keyup', (e) => (this.keys[e.code] = false));

    addEventListener('mousedown', (e) => {
      if (this.state !== 'playing') return;
      if (document.pointerLockElement !== this.renderer.domElement) {
        this._requestLock();
        return;
      }
      if (e.button === 0) this.mouse.left = true;
      if (e.button === 2) { this.mouse.right = true; this.ads = true; }
    });
    addEventListener('mouseup', (e) => {
      if (e.button === 0) this.mouse.left = false;
      if (e.button === 2) { this.mouse.right = false; this.ads = false; }
    });
    addEventListener('contextmenu', (e) => e.preventDefault());
    addEventListener('wheel', (e) => {
      if (this.state === 'playing' && document.pointerLockElement) this._cycleWeapon(e.deltaY > 0 ? 1 : -1);
    }, { passive: true });

    addEventListener('mousemove', (e) => {
      if (this.state !== 'playing' || document.pointerLockElement !== this.renderer.domElement) return;
      if (this.lock.target || this.player.dead) return;
      const dx = THREE.MathUtils.clamp(e.movementX, -60, 60);
      const dy = THREE.MathUtils.clamp(e.movementY, -60, 60);
      const sens = (this.player.stun > 0 ? 0.0006 : 0.0017) * (this.ads ? 0.6 : 1);
      this.player.yaw -= dx * sens;
      this.player.pitch = THREE.MathUtils.clamp(this.player.pitch - dy * sens, -0.4, 0.6);
    });

    document.addEventListener('pointerlockchange', () => {
      if (this.state === 'playing' && document.pointerLockElement !== this.renderer.domElement) this._pause();
    });
  }

  _pollGamepad(dt) {
    const gp = navigator.getGamepads ? navigator.getGamepads()[0] : null;
    const out = { mx: 0, mz: 0, jump: false, boost: false, fireR: false };
    if (!gp) return out;
    const dz = (v) => (Math.abs(v) > 0.18 ? v : 0);
    out.mx = dz(gp.axes[0] || 0);
    out.mz = dz(gp.axes[1] || 0);
    const pressed = (i) => !!gp.buttons[i]?.pressed;
    const edge = (i) => { const p = pressed(i); const was = this.padPrev[i]; this.padPrev[i] = p; return p && !was; };
    this.ads = pressed(6) || this.mouse.right;
    if (!this.lock.target && !this.player.dead) {
      const sens = (this.player.stun > 0 ? 0.7 : 1.9) * (this.ads ? 0.6 : 1);
      this.player.yaw -= dz(gp.axes[2] || 0) * sens * dt;
      this.player.pitch = THREE.MathUtils.clamp(this.player.pitch - dz(gp.axes[3] || 0) * sens * dt, -0.4, 0.6);
    }
    out.jump = pressed(0);
    out.boost = pressed(4);
    out.fireR = pressed(7);
    if (edge(1)) this._tryDodge(out.mx || 0, out.mz || -1);
    if (edge(3) || edge(11)) this._toggleLock();
    if (edge(2)) this._startReload(this.activeSlot, true);
    if (edge(5)) this._cycleWeapon(1);
    for (let k = 0; k < 4; k++) if (edge(12 + k)) this._switchWeapon([0, 3, 1, 2][k]);
    if (edge(9)) this._pause();
    return out;
  }

  // =========================================================================
  // ステージ進行
  // =========================================================================
  startStage(id) {
    const stage = STAGES.find((s) => s.id === id);
    this.stage = stage;
    this._endStage();
    this.world.applyTheme(stage.theme);
    if (this.garageLoop) { this.garageLoop.stop(); this.garageLoop = null; }

    this.state = 'playing';
    $('garage-ui').classList.add('hidden');
    $('result').classList.add('hidden');
    $('hud').classList.remove('hidden');
    $('boss-hud').classList.add('hidden');
    $('wreck-panel').classList.add('hidden');
    if (document.pointerLockElement !== this.renderer.domElement) this._requestLock();

    const p = this.player;
    p.pos.set(0, 0, 18);
    p.vel.set(0, 0, 0);
    p.knock.set(0, 0, 0);
    p.yaw = 0;
    p.pitch = 0.12;
    p.hp = p.maxHp;
    p.ep = p.maxEp;
    p.stun = p.burn = 0;
    p.dead = false;
    p.downState = null;
    p.mesh.visible = true;
    this.cam.init = false;
    this.bossIntroCam = null;
    this.reserve = 2;
    this.healKits = 1;
    p.itemRevive = 0;
    const fx = $('screen-effects');
    if (fx) fx.style.display = '';
    this.runStats = { kills: 0, deaths: 0, time: 0, drops: [] };
    this._initWeaponStates();
    this._setupAllies();
    this.flow = { phase: 'intro', wave: 0, timer: 2.6, queue: [], spawnTimer: 0 };
    $('wave-phase-text').textContent = `STAGE ${stage.id}`;
    $('wave-sub-text').textContent = stage.name;
    audio.play('sortieStart', { throttle: 0 });
    this._triggerScreenFlash('#6be6ff');
    this._showCinemaBanner(`STAGE ${stage.id} // SORTIE`, stage.name, 'wave', 2400);
    this._announce(`STAGE ${stage.id}  ${stage.name}`, stage.desc, 2800);
  }

  _endStage() {
    for (const list of [this.enemies, this.bullets, this.enemyBullets, this.telegraphs, this.trails, this.singularities, this.flames, this.meteors]) {
      for (const o of list) {
        const m = o.mesh || o.group;
        if (m) {
          this.scene.remove(m);
          disposeObject(m);
        }
      }
      list.length = 0;
    }
    for (const d of this.drops || []) {
      if (d.mesh) {
        this.scene.remove(d.mesh);
        disposeObject(d.mesh);
      }
    }
    this.drops = [];
    for (const a of this.allies) {
      this.scene.remove(a.mesh);
      disposeObject(a.mesh);
    }
    this.allies = [];
    if (this.boss) {
      this.scene.remove(this.boss.root);
      disposeObject(this.boss.root);
      if (this.boss.beamMesh) this.scene.remove(this.boss.beamMesh);
      this.boss = null;
    }
    this.bossIntroCam = null;
    for (const ws of this.weaponStates || []) this._stopLoops(ws);
    this._clearWreck();
    this._setLock(null, true);
    this.px.clear();
    this.world.setSandstormMode(false);
    this.flow = null;
  }

  _updateFlow(dt) {
    const f = this.flow;
    if (!f) return;
    f.timer -= dt;
    switch (f.phase) {
      case 'intro': if (f.timer <= 0) this._startStorm(); break;
      case 'storm': if (f.timer <= 0) this._startWave(); break;
      case 'wave':
        f.spawnTimer -= dt;
        if (f.queue.length && f.spawnTimer <= 0) {
          this._spawnEnemy(f.queue.shift());
          f.spawnTimer = 0.75;
        }
        $('wave-sub-text').textContent = `残敵 ${this.enemies.length + f.queue.length}`;
        if (!f.queue.length && !this.enemies.length) {
          if (f.wave < 3) this._startStorm();
          else this._startBossWarning();
        }
        break;
      case 'bossWarn':
        if (Math.random() < dt * 3.5) {
          this.cam.shake = Math.max(this.cam.shake, 0.35);
          // 警告中の砂煙・稲妻スパーク
          const rx = (Math.random() - 0.5) * HW * 2.2;
          const rz = -HL + Math.random() * 40;
          this.px.ring(new THREE.Vector3(rx, 0.3, rz), 8, 0xff3b2f, 0.45);
        }
        if (f.timer <= 0) this._spawnBoss();
        break;
      case 'clear': if (f.timer <= 0) this._showResult(); break;
    }
  }

  _startStorm() {
    const f = this.flow;
    f.phase = 'storm';
    f.timer = 2.8;
    this.world.setSandstormMode(true);
    audio.play('sandstorm', { throttle: 0 });
    this.cam.shake = Math.max(this.cam.shake, 0.35);
    $('wave-phase-text').textContent = `WAVE ${f.wave + 1}`;
    $('wave-sub-text').textContent = '強砂嵐接近・敵編隊ワープ反応';
    this._announce('SANDSTORM SURGE', `砂嵐の向こうから WAVE ${f.wave + 1} 武装浮遊体群が接近中`, 2400);
  }

  _startWave() {
    const f = this.flow;
    f.wave += 1;
    f.phase = 'wave';
    f.queue = [...this.stage.waves[f.wave - 1]];
    f.spawnTimer = 0.25;
    this.world.setSandstormMode(false);
    audio.play('waveStart', { throttle: 0 });
    this.cam.shake = Math.max(this.cam.shake, 0.75);
    this._triggerScreenFlash('#ffb14a');
    this._showCinemaBanner(`TACTICAL ALERT // WAVE ${f.wave} OF 3`, `ARMED SQUADRON INCOMING`, 'wave', 2300);

    // 開幕と同時に先発隊を一斉ワープ出現させ、甲板上に激しい衝撃リングを発生させる
    const initialBurst = Math.min(3, f.queue.length);
    for (let i = 0; i < initialBurst; i++) {
      const type = f.queue.shift();
      this._spawnEnemy(type);
    }
    this.px.ring(this.player.pos.clone().setY(0.25), 26, 0xffaa33, 0.55);
    $('wave-phase-text').textContent = `WAVE ${f.wave} / 3`;
    this._announce(`WAVE ${f.wave} ENGAGE`, '武装浮遊体群が甲板へ降下！ 撃破して武器・パーツを奪取せよ', 2600);
  }

  _startBossWarning() {
    const f = this.flow;
    f.phase = 'bossWarn';
    f.timer = 3.8;
    this.world.setSandstormMode(true);
    audio.play('sandstorm', { throttle: 0 });
    audio.play('bossSiren', { throttle: 0 });
    this.cam.shake = Math.max(this.cam.shake, 1.1);
    this._triggerScreenFlash('#ff2a1f');
    this._showCinemaBanner('EMERGENCY // MASSIVE SIGNATURE DETECTED', `COLOSSAL DREADNOUGHT : ${this.stage.bossName}`, 'boss', 3600);
    $('wave-phase-text').textContent = 'WARNING';
    $('wave-sub-text').textContent = '超巨大反応接近';
    this._announce('WARNING // CLASS-OMEGA', `超巨大艦 ${this.stage.bossName} が砂嵐から出現！`, 3600);
  }

  _stageCleared() {
    this.flow.phase = 'clear';
    this.flow.timer = 4.5;
    audio.play('stageClear', { throttle: 0 });
    this._triggerScreenFlash('#8cffb0');
    this._showCinemaBanner('MISSION ACCOMPLISHED', `${this.stage.bossName} DESTROYED`, 'wave', 3400);
    $('wave-phase-text').textContent = 'CLEAR';
    $('wave-sub-text').textContent = '';
    this._announce('STAGE CLEAR', `${this.stage.bossName} 撃破`, 4000);
    if (this.stage.id > this.progress) {
      this.progress = this.stage.id;
      localStorage.setItem('sandark_progress', String(this.progress));
    }
  }

  _bossHpMul() {
    // 自軍の機体数（自機＋NPC＋オンライン仲間）に応じてボスのHPだけが増減
    const n = 1 + this.allies.length + this.remoteMeshes.size;
    return 0.6 + 0.4 * n;
  }

  _gameOver() {
    if (this.state === 'result') return;
    this._showResult(true);
  }

  _showResult(failed = false) {
    audio.play(failed ? 'playerDestroyed' : 'victory', { throttle: 0 });
    $('wreck-panel').classList.add('hidden');
    const st = this.stage;
    const time = this.runStats.time;
    const next = STAGES.find((s) => s.id === st.id + 1);
    const dropCount = Array.isArray(this.runStats.drops) ? this.runStats.drops.length : (this.runStats.drops || 0);
    $('result-title').textContent = failed ? 'GAME OVER' : 'STAGE CLEAR';
    $('result-stage').textContent = `STAGE ${st.id}　${st.name}`;
    $('result-stats').innerHTML = `
      <div>撃破数<strong>${this.runStats.kills}</strong></div>
      <div>回収パーツ数<strong>${dropCount}</strong></div>
      <div>大破した回数<strong>${this.runStats.deaths}</strong></div>
      <div>クリアタイム<strong>${Math.floor(time / 60)}:${String(Math.floor(time % 60)).padStart(2, '0')}</strong></div>`;
    this._endStage();
    this.state = 'result';
    if (document.pointerLockElement) document.exitPointerLock();
    $('hud').classList.add('hidden');
    $('result').classList.remove('hidden');
    if (next && !failed) this.selectedStage = next.id;
  }

  _pause() {
    if (this.state !== 'playing') return;
    this.state = 'paused';
    this.mouse.left = this.mouse.right = false;
    this.ads = false;
    for (const ws of this.weaponStates) this._stopLoops(ws);
    audio.play('uiPause', { throttle: 0 });
    $('pause').classList.remove('hidden');
    if (document.pointerLockElement) document.exitPointerLock();
  }

  _resume() {
    this.state = 'playing';
    $('pause').classList.add('hidden');
    this._requestLock();
  }

  /** マウスロック要求（ユーザー操作外で拒否されても例外にしない。未取得なら「クリックで操作開始」を表示） */
  _requestLock() {
    try {
      const r = this.renderer.domElement.requestPointerLock();
      if (r && r.catch) r.catch(() => {});
    } catch (e) { /* 拒否された場合はクリック待ち */ }
  }

  _announce(title, desc, ms = 2800) {
    $('announce-title').textContent = title;
    $('announce-desc').textContent = desc;
    const box = $('center-announce');
    box.classList.remove('hidden');
    box.style.animation = 'none';
    void box.offsetWidth;
    box.style.animation = '';
    clearTimeout(this._announceT);
    this._announceT = setTimeout(() => box.classList.add('hidden'), ms);
  }

  /** 全画面フラッシュ演出 */
  _triggerScreenFlash(color = '#ffffff') {
    const el = $('screen-flash');
    if (!el) return;
    el.style.background = `radial-gradient(circle, ${color} 0%, transparent 75%)`;
    el.classList.remove('flash-active');
    void el.offsetWidth;
    el.classList.add('flash-active');
  }

  /** Wave開始・ボス出現時のシネマティック横断バナー */
  _showCinemaBanner(sub, main, type = 'wave', ms = 2500) {
    const box = $('cinema-banner');
    if (!box) return;
    $('cb-sub').textContent = sub;
    $('cb-main').textContent = main;
    box.classList.remove('hidden', 'boss-alert', 'wave-alert');
    box.classList.add(type === 'boss' ? 'boss-alert' : 'wave-alert');
    box.style.animation = 'none';
    void box.offsetWidth;
    box.style.animation = '';
    clearTimeout(this._cinemaT);
    this._cinemaT = setTimeout(() => box.classList.add('hidden'), ms);
  }

  // =========================================================================
  // プレイヤー
  // =========================================================================
  _camBasis() {
    const yaw = this.player.yaw;
    return { forward: new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw)), right: new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw)) };
  }

  _tryDodge(ix, iz) {
    const p = this.player;
    if (this.state !== 'playing' || p.dead || p.dodge || p.dodgeCd > 0 || p.stun > 0) return;
    if (p.ep < 110) { audio.play('noAmmo', { throttle: 0.4 }); return; }
    p.ep -= 110;
    const { forward, right } = this._camBasis();
    const dir = new THREE.Vector3().addScaledVector(right, ix).addScaledVector(forward, -iz);
    if (dir.lengthSq() < 0.01) dir.copy(forward).negate();
    dir.normalize();
    p.dodge = { dir, t: 0, dur: 0.42, dist: MECH_LENGTH * 2.9 };
    p.invuln = Math.max(p.invuln, 0.36);
    p.dodgeCd = 0.7;
    audio.play('dodge', { throttle: 0 });
    for (let i = 0; i < 8; i++) this.px.smokePuff(p.pos.clone().add(new THREE.Vector3((Math.random() - 0.5) * 2, 0.3, (Math.random() - 0.5) * 2)), 0xb9a58a, 0.4, 0.6, dir.clone().multiplyScalar(-3).add(new THREE.Vector3(0, Math.random() * 2, 0)));
  }

  /** dodge / lunge 共通の「すっと移動」 */
  _stepMove(s, dt) {
    if (!s) return [0, 0, true];
    const t0 = s.t / s.dur;
    s.t = Math.min(s.dur, s.t + dt);
    const step = (easeOutCubic(s.t / s.dur) - easeOutCubic(t0)) * s.dist;
    return [s.dir.x * step, s.dir.z * step, s.t >= s.dur];
  }

  _updatePlayer(dt) {
    const p = this.player;
    if (p.dead) { this._updateDown(dt); return; }
    p.invuln = Math.max(0, p.invuln - dt);
    p.dodgeCd = Math.max(0, p.dodgeCd - dt);

    if (p.stun > 0) p.stun = Math.max(0, p.stun - dt * (this.stats.processing / 100));
    $('badge-stun').classList.toggle('hidden', p.stun <= 0);
    $('stun-timer').textContent = p.stun.toFixed(1);
    $('stun-overlay').style.opacity = p.stun > 0 ? '0.75' : '0';
    if (p.burn > 0) {
      p.burn = Math.max(0, p.burn - dt);
      p.burnTick += dt;
      if (Math.random() < 0.4) this.px.glow.spawn(p.pos.clone().add(new THREE.Vector3((Math.random() - 0.5) * 2, 1.5, (Math.random() - 0.5) * 2)), new THREE.Vector3(0, 3, 0), 0xff6a1a, 0.3, 0.4, { intensity: 2, grow: 0.5 });
      if (p.burnTick >= 0.4) { p.burnTick = 0; this._damagePlayer(16, { flash: false }); audio.play('burnTick', { throttle: 0.3 }); }
    }
    $('badge-burn').classList.toggle('hidden', p.burn <= 0);
    $('burn-timer').textContent = p.burn.toFixed(1);
    $('burn-overlay').style.opacity = p.burn > 0 ? '0.6' : '0';

    const gp = this._pollGamepad(dt);
    this._lastPad = gp;
    let ix = gp.mx, iz = gp.mz;
    if (this.keys.KeyW) iz -= 1;
    if (this.keys.KeyS) iz += 1;
    if (this.keys.KeyA) ix -= 1;
    if (this.keys.KeyD) ix += 1;
    const wantJump = this.keys.Space || gp.jump;
    const wantBoost = this.keys.ShiftLeft || this.keys.ShiftRight || gp.boost;
    const { forward, right } = this._camBasis();
    const moveDir = new THREE.Vector3().addScaledVector(right, ix).addScaledVector(forward, -iz);
    if (moveDir.lengthSq() > 1) moveDir.normalize();

    let maxSpeed = (3.0 + (this.stats.mobility / 100) * 3.0) * (p.stun > 0 ? 0.2 : 1) * (this.ads ? 0.7 : 1);
    const boosting = wantBoost && p.ep > 10 && moveDir.lengthSq() > 0.01 && p.stun <= 0;
    if (boosting) {
      maxSpeed *= this.stats.hasBooster ? 1.5 : 1.15;
      p.ep = Math.max(0, p.ep - 110 * dt);
      if (!p.boosting) audio.play('boostStart', { throttle: 0.3 });
      if (this.stats.hasBooster && Math.random() < 0.5) this.px.smokePuff(p.pos.clone().add(new THREE.Vector3(0, 0.3, 0)).addScaledVector(moveDir, -1.5), 0xb9a58a, 0.35, 0.6);
    } else if (!p.dodge) p.ep = Math.min(p.maxEp, p.ep + 105 * dt);
    p.boosting = boosting;

    const accel = p.grounded ? 3.6 : 1.6;
    p.vel.x = THREE.MathUtils.lerp(p.vel.x, moveDir.x * maxSpeed, Math.min(1, dt * accel));
    p.vel.z = THREE.MathUtils.lerp(p.vel.z, moveDir.z * maxSpeed, Math.min(1, dt * accel));

    if ((wantJump || this.jumpQueued) && p.stun <= 0) {
      if (p.grounded && (!this._jumpHeld || this.jumpQueued)) {
        p.vel.y = Math.sqrt(2 * GRAVITY * (2.2 + (this.stats.jump / 100) * 0.6));
        p.grounded = false;
        p.landing = 0.3; // 踏み切りの沈み込み
        audio.play('jump', { throttle: 0.2 });
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2;
          this.px.smokePuff(p.pos.clone().add(new THREE.Vector3(Math.cos(a) * 1.2, 0.2, Math.sin(a) * 1.2)), 0xb9a58a, 0.35, 0.7, new THREE.Vector3(Math.cos(a) * 2.5, 0.5, Math.sin(a) * 2.5));
        }
      } else if (!p.grounded && this.stats.hasBooster && p.vel.y < 0 && p.ep > 5) {
        p.vel.y += GRAVITY * 0.72 * dt;
        p.ep = Math.max(0, p.ep - 70 * dt);
        p.hoverSE -= dt;
        if (p.hoverSE <= 0) { audio.play('hover', { throttle: 0 }); p.hoverSE = 0.7; }
      }
    }
    this._jumpHeld = wantJump;
    this.jumpQueued = false;
    // 上昇は軽く、落下は重く（空中の重量感）。ジャンプを早く離すと小ジャンプ
    const fallMul = p.vel.y < 0 ? 1.45 : (!wantJump && !p.grounded ? 1.6 : 1);
    p.vel.y -= GRAVITY * fallMul * dt;
    p.knock.multiplyScalar(Math.pow(0.1, dt));

    const [dx, dz, dDone] = this._stepMove(p.dodge, dt);
    if (dDone) p.dodge = null;
    const [lx, lz, lDone] = this._stepMove(p.lunge, dt);
    if (lDone) p.lunge = null;

    let nx = p.pos.x + (p.vel.x + p.knock.x) * dt + dx + lx;
    let nz = p.pos.z + (p.vel.z + p.knock.z) * dt + dz + lz;
    let ny = p.pos.y + (p.vel.y + p.knock.y) * dt;

    // 船端：歩行・回避・踏み込みでは止まる／ジャンプ中・大きな吹き飛びでは落ちる
    const onDeckArea = Math.abs(p.pos.x) <= HW + 0.5 && Math.abs(p.pos.z) <= HL + 0.5;
    const blasted = p.knock.lengthSq() > 100;
    const airborne = p.pos.y > 0.7 || !p.grounded;
    if (onDeckArea && ((!airborne && !blasted) || p.dodge || p.lunge)) {
      nx = THREE.MathUtils.clamp(nx, -(HW - 1.4), HW - 1.4);
      nz = THREE.MathUtils.clamp(nz, -(HL - 1.4), HL - 1.4);
    }
    p.pos.x = nx;
    p.pos.z = nz;
    $('badge-edge').classList.toggle('hidden', !(Math.abs(p.pos.x) > HW - 4 || Math.abs(p.pos.z) > HL - 4));

    const overDeck = Math.abs(p.pos.x) <= HW && Math.abs(p.pos.z) <= HL;
    let support = overDeck ? 0 : -999;
    const r = 1.35;
    for (const o of this.world.obstacles) {
      if (p.pos.x + r > o.minX && p.pos.x - r < o.maxX && p.pos.z + r > o.minZ && p.pos.z - r < o.maxZ) {
        if (p.pos.y >= o.maxY - 0.6) support = Math.max(support, o.maxY);
        else {
          const pen = [
            [Math.abs(p.pos.x + r - o.minX), () => (p.pos.x = o.minX - r)],
            [Math.abs(o.maxX - (p.pos.x - r)), () => (p.pos.x = o.maxX + r)],
            [Math.abs(p.pos.z + r - o.minZ), () => (p.pos.z = o.minZ - r)],
            [Math.abs(o.maxZ - (p.pos.z - r)), () => (p.pos.z = o.maxZ + r)]
          ].sort((a, b) => a[0] - b[0]);
          pen[0][1]();
        }
      }
    }
    if (this.boss && this.boss.onDeck) {
      const bp = this.boss.root.position;
      const ddx = p.pos.x - bp.x, ddz = p.pos.z - bp.z;
      const d = Math.hypot(ddx, ddz);
      const R = 16;
      if (d < R && d > 0.01) { p.pos.x = bp.x + (ddx / d) * R; p.pos.z = bp.z + (ddz / d) * R; }
    }

    const wasAir = !p.grounded;
    const impact = -p.vel.y;
    if (ny <= support && p.vel.y <= 0) {
      ny = support;
      p.vel.y = 0;
      p.grounded = true;
      if (wasAir && impact > 4) {
        p.landing = Math.min(0.5, impact * 0.03);
        this.cam.shake = Math.max(this.cam.shake, Math.min(0.5, impact * 0.03));
        audio.play(impact > 13 ? 'landHeavy' : 'land', { throttle: 0.15 });
        for (let i = 0; i < 10; i++) {
          const a = (i / 10) * Math.PI * 2;
          this.px.smokePuff(p.pos.clone().add(new THREE.Vector3(Math.cos(a), 0.2, Math.sin(a))), 0x9a8f80, 0.4, 0.8, new THREE.Vector3(Math.cos(a) * 4, 0.6, Math.sin(a) * 4));
        }
      }
    } else p.grounded = false;
    p.pos.y = ny;

    if (!overDeck && p.pos.y < 0.2) p.pos.z += this.stage.shipSpeed * 0.45 * dt;
    if (p.pos.y < -2 && !p._fallSE) { p._fallSE = true; audio.play('fall', { throttle: 0 }); }
    if (p.pos.y < -11) {
      p._fallSE = false;
      this._downPlayer('船外へ落下', false);
      return;
    }

    p.landing = THREE.MathUtils.lerp(p.landing, 0, Math.min(1, dt * 7));
    const hs = Math.hypot(p.vel.x, p.vel.z);
    if (p.grounded && hs > 0.6) {
      p.walkCycle += dt * hs * 0.95;
      const sign = Math.sign(Math.sin(p.walkCycle));
      if (sign !== p.lastStepSign) {
        p.lastStepSign = sign;
        const legType = this.stats.parts.legs.type;
        const heavy = this.stats.parts.body.style === 'heavy';
        audio.play(legType === 'caterpillar' ? 'crawler' : heavy ? 'footstepHeavy' : 'footstep', { throttle: 0.12 });
        this.cam.shake = Math.max(this.cam.shake, legType === 'caterpillar' ? 0.03 : 0.07);
      }
    }
    const bob = p.grounded ? Math.abs(Math.sin(p.walkCycle)) * 0.07 : 0;
    p.mesh.position.set(p.pos.x, p.pos.y - p.landing * 0.5 + bob, p.pos.z);

    const ud = p.mesh.userData;
    ud.upperPivot.rotation.y = p.yaw;
    const recoil = Math.max(...this.weaponStates.map((w) => w.recoil), 0);
    ud.upperPivot.rotation.x = recoil * 0.1;
    if (moveDir.lengthSq() > 0.04 || p.dodge || p.lunge) {
      const dir = p.dodge ? p.dodge.dir : p.lunge ? p.lunge.dir : moveDir;
      ud.legsGroup.rotation.y = lerpAngle(ud.legsGroup.rotation.y, Math.atan2(-dir.x, -dir.z), Math.min(1, dt * 5));
    }
    const flameTarget = p.dodge || p.lunge ? 1.8 : boosting ? 1.1 : !p.grounded && wantJump ? 0.8 : 0.3;
    for (const f of ud.boosterFlames) f.scale.y = THREE.MathUtils.lerp(f.scale.y, flameTarget * (0.9 + Math.random() * 0.2), Math.min(1, dt * 12));
    if (p.dodge) {
      // スライド中の残像・砂煙
      this.px.glow.spawn(p.pos.clone().add(new THREE.Vector3(0, 1.4, 0)), new THREE.Vector3(0, 0, 0), 0x6be6ff, 0.9, 0.22, { intensity: 1.6 });
      if (Math.random() < 0.7) this.px.smokePuff(p.pos.clone().add(new THREE.Vector3((Math.random() - 0.5), 0.2, (Math.random() - 0.5))), 0xb9a58a, 0.45, 0.6, p.dodge.dir.clone().multiplyScalar(-4));
    }
    if ((p.dodge || p.lunge) && ud.boosterFlames.length && Math.random() < 0.8) {
      const fp = ud.boosterFlames[0].getWorldPosition(new THREE.Vector3());
      this.px.glow.spawn(fp, new THREE.Vector3(0, 0, 0), this.stats.parts.booster.flameColor, 0.3, 0.15, { intensity: 2.5 });
    }
    audio.setListener(p.pos);
  }

  _damagePlayer(amount, opt = {}) {
    const p = this.player;
    if (p.dead || p.invuln > 0) return false;
    p.hp = Math.max(0, p.hp - amount);
    if (opt.flash !== false) {
      const v = $('damage-vignette');
      v.style.opacity = '1';
      setTimeout(() => (v.style.opacity = '0'), 200);
      audio.play(amount >= 100 ? 'playerHitHeavy' : 'playerHit', { throttle: 0.08 });
      this.cam.shake = Math.max(this.cam.shake, Math.min(0.8, amount / 200));
      this.px.spark(p.pos.clone().add(new THREE.Vector3(0, 1.8, 0)), new THREE.Vector3(0, 0.5, 0), 0xffc46b, 10, 9, 1.2);
    }
    if (p.hp <= 0) {
      const onDeck = Math.abs(p.pos.x) <= HW && Math.abs(p.pos.z) <= HL && p.pos.y > -1;
      this._downPlayer('機体大破', onDeck);
    }
    return true;
  }

  _knockPlayer(vec) {
    if (this.player.invuln > 0 || this.player.dead) return;
    this.player.knock.addScaledVector(vec, 1 - this.stats.knockResist);
    if (vec.length() > 12) audio.play('knockback', { throttle: 0.2 });
  }

  // =========================================================================
  // ロックオン
  // =========================================================================
  _targetPos(t) {
    if (t.isBoss) return t.core.mesh.getWorldPosition(new THREE.Vector3());
    return t.mesh.position;
  }

  _allTargets() {
    const list = this.enemies.slice();
    if (this.boss && this.boss.state !== 'dying' && this.boss.state !== 'enter') list.push(this.boss);
    return list;
  }

  _toggleLock() {
    if (this.state !== 'playing' || this.player.dead) return;
    if (this.lock.target) { this._setLock(null); return; }
    let best = null, bestScore = Infinity;
    for (const t of this._allTargets()) {
      const wp = this._targetPos(t);
      const d = wp.distanceTo(this.player.pos);
      if (d > 250) continue;
      const proj = wp.clone().project(this.camera);
      const inView = proj.z < 1 && Math.abs(proj.x) < 1 && Math.abs(proj.y) < 1;
      const score = inView ? Math.hypot(proj.x, proj.y) : 10 + d / 100;
      if (score < bestScore) { bestScore = score; best = t; }
    }
    if (best) this._setLock(best);
    else audio.play('noAmmo', { throttle: 0.3 });
  }

  _setLock(target, silent = false) {
    const had = !!this.lock.target;
    this.lock.target = target;
    if (!silent) {
      if (target) audio.play('lockOn', { throttle: 0.05 });
      else if (had) audio.play('lockOff', { throttle: 0.05 });
    }
    $('lock-row').classList.toggle('hidden', !target);
    if (target) $('lock-target-name').textContent = target.isBoss ? this.stage.bossName : `${target.type.toUpperCase()} [${target.weapon ? target.weapon.name : ''}]`;
    else $('target-box').classList.add('hidden');
  }

  _onTargetLost(t) {
    if (this.lock.target !== t) return;
    let best = null, bd = Infinity;
    for (const o of this._allTargets()) {
      if (o === t) continue;
      const d = this._targetPos(o).distanceTo(this.player.pos);
      if (d < bd && d < 220) { bd = d; best = o; }
    }
    this._setLock(best, !best);
    if (!best) audio.play('lockOff', { throttle: 0.05, vol: 0.6 });
  }

  // =========================================================================
  // カメラ（肩越しTPS／ADS／ボス出現時カメラフォーカス／大破時は残骸を周回）
  // =========================================================================
  _updateCamera(dt) {
    const p = this.player;
    if (p.dead) {
      const center = this.wreck ? this.wreck.position.clone() : new THREE.Vector3(0, 0, 20);
      this._downOrbit = (this._downOrbit || 0) + dt * 0.25;
      const want = center.clone().add(new THREE.Vector3(Math.sin(this._downOrbit) * 14, 8, Math.cos(this._downOrbit) * 14));
      this.cam.pos.lerp(want, 1 - Math.exp(-2 * dt));
      this.cam.look.lerp(center.clone().add(new THREE.Vector3(0, 1.5, 0)), 1 - Math.exp(-3 * dt));
    } else if (this.bossIntroCam && this.bossIntroCam.timer > 0 && this.boss) {
      // ボス出現時のみカメラ・機体の向きを巨大ボスへ自動的に向けて圧倒的なスケール感を見せる
      this.bossIntroCam.timer -= dt;
      const bossPos = this.boss.core.mesh.getWorldPosition(new THREE.Vector3());
      const pivot = p.pos.clone().add(new THREE.Vector3(0, 2.8, 0));
      const d = bossPos.clone().sub(pivot);
      const wantYaw = Math.atan2(-d.x, -d.z);
      const wantPitch = THREE.MathUtils.clamp(Math.atan2(d.y, Math.hypot(d.x, d.z)), -0.35, 0.55);
      p.yaw = lerpAngle(p.yaw, wantYaw, Math.min(1, dt * 5.5));
      p.pitch = THREE.MathUtils.lerp(p.pitch, wantPitch, Math.min(1, dt * 5.5));

      const toBossDir = d.clone().normalize();
      const right = new THREE.Vector3(Math.cos(p.yaw), 0, -Math.sin(p.yaw));
      const idealPos = p.pos.clone()
        .add(new THREE.Vector3(0, 4.4, 0))
        .addScaledVector(right, 3.2)
        .addScaledVector(toBossDir, -14.5);
      idealPos.y = Math.max(idealPos.y, p.pos.y + 1.6);
      this.cam.fov = THREE.MathUtils.lerp(this.cam.fov, 64, 1 - Math.exp(-6 * dt));
      this.cam.pos.lerp(idealPos, 1 - Math.exp(-7 * dt));
      this.cam.look.lerp(bossPos, 1 - Math.exp(-9 * dt));
      if (this.bossIntroCam.timer <= 0) this.bossIntroCam = null;
    } else {
      if (this.lock.target) {
        const tp = this._targetPos(this.lock.target);
        const pivot = p.pos.clone().add(new THREE.Vector3(0, 2.6, 0));
        const d = tp.clone().sub(pivot);
        const wantYaw = Math.atan2(-d.x, -d.z);
        const wantPitch = THREE.MathUtils.clamp(Math.atan2(d.y, Math.hypot(d.x, d.z)) + 0.08, -0.4, 0.6);
        const rate = Math.min(1, dt * 4.0 * (this.stats.processing / 100));
        p.yaw = lerpAngle(p.yaw, wantYaw, rate);
        p.pitch = THREE.MathUtils.lerp(p.pitch, wantPitch, rate);
      }
      // ADS（右クリック）で寄って狭く
      const k = 1 - Math.exp(-10 * dt);
      this.cam.dist = THREE.MathUtils.lerp(this.cam.dist, this.ads ? 6.4 : 10.5, k);
      this.cam.shoulder = THREE.MathUtils.lerp(this.cam.shoulder, this.ads ? 1.5 : 2.1, k);
      this.cam.fov = THREE.MathUtils.lerp(this.cam.fov, this.ads ? 42 : 58, k);
      const lookDir = new THREE.Vector3(-Math.sin(p.yaw) * Math.cos(p.pitch), Math.sin(p.pitch), -Math.cos(p.yaw) * Math.cos(p.pitch));
      const right = new THREE.Vector3(Math.cos(p.yaw), 0, -Math.sin(p.yaw));
      // 機体を画面の左に置き、照準を中央で見通しよく（肩越し）
      const idealPos = p.pos.clone().add(new THREE.Vector3(0, this.ads ? 3.0 : 3.6, 0)).addScaledVector(right, this.cam.shoulder).addScaledVector(lookDir, -this.cam.dist);
      idealPos.y = Math.max(idealPos.y, Math.max(1.1, p.pos.y + 0.8));
      const idealLook = p.pos.clone().add(new THREE.Vector3(0, 2.3, 0)).addScaledVector(right, this.cam.shoulder * 0.6).addScaledVector(lookDir, 45);
      if (!this.cam.init) {
        this.cam.pos.copy(idealPos);
        this.cam.look.copy(idealLook);
        this.cam.init = true;
      } else {
        this.cam.pos.lerp(idealPos, 1 - Math.exp(-12 * dt));
        this.cam.look.lerp(idealLook, 1 - Math.exp(-20 * dt));
      }
    }
    if (Math.abs(this.camera.fov - this.cam.fov) > 0.01) {
      this.camera.fov = this.cam.fov;
      this.camera.updateProjectionMatrix();
    }
    this.cam.shake = Math.max(0, this.cam.shake - dt * 2.2);
    const s = this.cam.shake * this.cam.shake;
    this.camera.position.copy(this.cam.pos).add(new THREE.Vector3((Math.random() - 0.5) * s, (Math.random() - 0.5) * s, (Math.random() - 0.5) * s));
    this.camera.lookAt(this.cam.look);
    this.world.updateObstacleTransparency(this.camera.position, (p.dead && this.wreck ? this.wreck.position : p.pos).clone().add(new THREE.Vector3(0, 2, 0)), dt);
    $('reticle').classList.toggle('hidden', p.dead);

    const box = $('target-box');
    if (this.lock.target) {
      const tp = this._targetPos(this.lock.target);
      const proj = tp.clone().project(this.camera);
      if (proj.z < 1) {
        box.classList.remove('hidden');
        box.style.left = `${(proj.x * 0.5 + 0.5) * innerWidth}px`;
        box.style.top = `${(-proj.y * 0.5 + 0.5) * innerHeight}px`;
        $('target-dist').textContent = `${Math.round(tp.distanceTo(p.pos))}m`;
      } else box.classList.add('hidden');
    }
  }

  // =========================================================================
  // AI僚機（大破した仲間の救援に向かう）
  // =========================================================================
  _setupAllies() {
    for (const a of this.allies) {
      this.scene.remove(a.mesh);
      disposeObject(a.mesh);
    }
    this.allies = [];
    const n = parseInt($('select-ai-allies').value, 10) || 0;
    const ranged = PARTS_CATALOG.rarm.filter((w) => w.behavior !== 'none' && w.behavior !== 'melee');
    for (let i = 0; i < n; i++) {
      const lo = {
        head: PARTS_CATALOG.head[i % 3].id, body: PARTS_CATALOG.body[i % 3].id,
        rarm: ranged[(i * 3) % ranged.length].id, larm: ranged[(i * 3 + 1) % ranged.length].id,
        legs: PARTS_CATALOG.legs[(i + 1) % 3].id, booster: PARTS_CATALOG.booster[i % 3].id
      };
      const mesh = createVoxelMechModel(computeMechStats(lo));
      const x = (i % 2 ? 1 : -1) * (9 + i * 3.5);
      const z = 14 + (i % 3) * 6;
      mesh.position.set(x, 0, z);
      this.scene.add(mesh);
      this.allies.push({ name: `ALLY-${i + 2}`, mesh, target: new THREE.Vector3(x, 0, z), shoot: 1.5 + Math.random(), walk: 0, hp: 700, maxHp: 700, state: 'alive', wreckT: 0, revive: 0, burst: 0, t: Math.random() * 10, fx: 0 });
    }
    const list = $('squad-list');
    list.innerHTML = '';
    for (const a of this.allies) {
      const s = document.createElement('span');
      s.className = 'squad-item-mini';
      s.textContent = `● ${a.name}`;
      list.appendChild(s);
    }
  }

  _damageAlly(a, amount) {
    if (a.state !== 'alive') return false;
    a.hp -= amount;
    this.px.spark(a.mesh.position.clone().add(new THREE.Vector3(0, 1.8, 0)), new THREE.Vector3(0, 0.5, 0), 0xffc46b, 8, 8, 1.1);
    audio.play('hitMetal', { pos: a.mesh.position, throttle: 0.08, vol: 0.6 });
    if (a.hp <= 0) {
      a.hp = 0;
      a.state = 'wreck';
      a.wreckT = WRECK_TIME;
      a.revive = 0;
      a.mesh.rotation.z = 0.35;
      this.px.explosion(a.mesh.position.clone().add(new THREE.Vector3(0, 1.5, 0)), 0xff6a3a, 1.3);
      audio.play('explosionMid', { pos: a.mesh.position, throttle: 0.1 });
      this._showDropToast(`${a.name} 大破！ 近づいて救援（5秒）`, false);
    }
    return true;
  }

  _updateAllies(dt) {
    const targets = this._allTargets();
    const p = this.player;
    const alive = this.allies.filter((a) => a.state === 'alive');
    // 救援担当（大破した対象ごとに最寄りの生存NPCを1機割り当て）
    const wrecks = [];
    if (p.dead && p.downState === 'wreck' && this.wreck) wrecks.push({ pos: this.wreck.position, owner: null });
    for (const a of this.allies) if (a.state === 'wreck') wrecks.push({ pos: a.mesh.position, owner: a });
    const medic = new Map();
    for (const w of wrecks) {
      let best = null, bd = Infinity;
      for (const a of alive) {
        if (a === w.owner || medic.has(a)) continue;
        const d = a.mesh.position.distanceTo(w.pos);
        if (d < bd) { bd = d; best = a; }
      }
      if (best) medic.set(best, w);
    }
    for (const a of this.allies) {
      const pos = a.mesh.position;
      a.t += dt;
      if (a.state === 'gone') continue;
      if (a.state === 'wreck') {
        a.wreckT -= dt;
        a.fx -= dt;
        if (a.fx <= 0) {
          a.fx = 0.18;
          this.px.smokePuff(pos.clone().add(new THREE.Vector3((Math.random() - 0.5), 1.8, (Math.random() - 0.5))), 0x2a2a2e, 0.6, 2.0, new THREE.Vector3(0, 2, 0));
        }
        let helper = false;
        if (!p.dead && p.pos.distanceTo(pos) < REVIVE_RADIUS) helper = true;
        for (const o of alive) if (o.mesh.position.distanceTo(pos) < REVIVE_RADIUS) helper = true;
        a.revive = helper ? Math.min(1, a.revive + dt / REVIVE_TIME) : Math.max(0, a.revive - dt * 0.05);
        if (helper && Math.random() < 0.5) this.px.glow.spawn(pos.clone().add(new THREE.Vector3((Math.random() - 0.5) * 3, 0.3, (Math.random() - 0.5) * 3)), new THREE.Vector3(0, 2.5, 0), 0x64ffda, 0.1, 0.7, { intensity: 2.5 });
        if (a.revive >= 1) {
          a.state = 'alive';
          a.hp = a.maxHp * 0.25;
          a.mesh.rotation.z = 0;
          this.px.ring(pos, 6, 0x00e676, 0.6);
          audio.play('revived', { pos, throttle: 0 });
        } else if (a.wreckT <= 0) {
          a.state = 'gone';
          this.px.explosion(pos.clone().add(new THREE.Vector3(0, 1, 0)), 0xff8a30, 1.4);
          this.scene.remove(a.mesh);
        }
        continue;
      }

      // ---- 生存中：状況に応じて動く ----
      let tgt = null, bd = Infinity;
      for (const t of targets) { const dd = this._targetPos(t).distanceTo(pos); if (dd < bd) { bd = dd; tgt = t; } }
      const goal = a.target;
      const mw = medic.get(a);
      let speed = 4.2;
      if (mw && (!tgt || bd > 22 || mw.owner === null)) {
        // 救援へ向かう
        goal.copy(mw.pos).add(new THREE.Vector3(Math.cos(a.t) * 1.5, 0, 2));
        speed = 6.5;
      } else if (tgt) {
        const tp = this._targetPos(tgt);
        const away = pos.clone().sub(tp).setY(0);
        if (away.lengthSq() < 0.01) away.set(1, 0, 0);
        away.normalize();
        const tangent = new THREE.Vector3(-away.z, 0, away.x);
        const pref = tgt.isBoss ? 38 : 15 + (a.name.charCodeAt(a.name.length - 1) % 3) * 3;
        goal.copy(tp).setY(0).addScaledVector(away, pref).addScaledVector(tangent, Math.sin(a.t * 0.5 + pref) * 7);
        // 被弾が多いときは後退して距離を取る
        if (a.hp < a.maxHp * 0.35) goal.addScaledVector(away, 10);
      } else {
        // 敵がいないときはプレイヤー周辺で編隊
        const pp = p.dead ? new THREE.Vector3(0, 0, 18) : p.pos;
        goal.set(pp.x + Math.cos(a.t * 0.2 + this.allies.indexOf(a)) * 9, 0, pp.z + Math.sin(a.t * 0.2 + this.allies.indexOf(a)) * 9);
      }
      goal.x = THREE.MathUtils.clamp(goal.x, -(HW - 3), HW - 3);
      goal.z = THREE.MathUtils.clamp(goal.z, -(HL - 3), HL - 3);
      const d = goal.clone().sub(pos).setY(0);
      const dl = d.length();
      if (dl > 0.6) {
        const dir = d.normalize();
        const step = Math.min(speed * Math.min(1, dl / 3 + 0.3) * dt, dl);
        pos.addScaledVector(dir, step);
        a.mesh.userData.legsGroup.rotation.y = lerpAngle(a.mesh.userData.legsGroup.rotation.y, Math.atan2(-dir.x, -dir.z), Math.min(1, dt * 5));
        a.walk += dt * speed;
        pos.y = Math.abs(Math.sin(a.walk)) * 0.06;
      }
      // 味方同士・プレイヤーとの重なり回避
      for (const o of alive) {
        if (o === a) continue;
        const sep = pos.clone().sub(o.mesh.position).setY(0);
        const l = sep.length();
        if (l < 4 && l > 0.01) pos.addScaledVector(sep.normalize(), (4 - l) * dt * 2);
      }
      // 障害物の押し出し
      for (const o of this.world.obstacles) {
        const r = 1.4;
        if (pos.x + r > o.minX && pos.x - r < o.maxX && pos.z + r > o.minZ && pos.z - r < o.maxZ) {
          const pen = [
            [Math.abs(pos.x + r - o.minX), () => (pos.x = o.minX - r)],
            [Math.abs(o.maxX - (pos.x - r)), () => (pos.x = o.maxX + r)],
            [Math.abs(pos.z + r - o.minZ), () => (pos.z = o.minZ - r)],
            [Math.abs(o.maxZ - (pos.z - r)), () => (pos.z = o.maxZ + r)]
          ].sort((m, n) => m[0] - n[0]);
          pen[0][1]();
        }
      }
      // 救援中は射撃しない
      if (mw && pos.distanceTo(mw.pos) < REVIVE_RADIUS) {
        a.mesh.userData.upperPivot.rotation.y = Math.atan2(-(mw.pos.x - pos.x), -(mw.pos.z - pos.z));
        continue;
      }
      if (!tgt) continue;
      const tp = this._targetPos(tgt);
      a.mesh.userData.upperPivot.rotation.y = lerpAngle(a.mesh.userData.upperPivot.rotation.y, Math.atan2(-(tp.x - pos.x), -(tp.z - pos.z)), Math.min(1, dt * 8));
      a.shoot -= dt;
      if (a.shoot <= 0 && bd < 90) {
        if (a.burst <= 0) a.burst = 3;
        a.burst--;
        a.shoot = a.burst > 0 ? 0.13 : 1.0 + Math.random() * 0.9;
        const muzzle = pos.clone().add(new THREE.Vector3(0, 2, 0));
        const dir = tp.clone().sub(muzzle).normalize();
        dir.x += (Math.random() - 0.5) * 0.03;
        dir.y += (Math.random() - 0.5) * 0.03;
        dir.normalize();
        this._fireProjectile('ally', { speed: 75, damage: 38, knockback: 1, color: 0x7dff9a, power: 0.8 }, muzzle, dir, { owner: 'ally' });
        this.px.flash(muzzle, 0x7dff9a, 0.4, 0.05);
        audio.play('fireGatling', { pos: muzzle, throttle: 0.15, vol: 0.5 });
      }
    }
    // 僚機の状態表示
    this._allyHudT = (this._allyHudT || 0) - dt;
    if (this._allyHudT <= 0) {
      this._allyHudT = 0.3;
      const items = $('squad-list').children;
      this.allies.forEach((a, i) => {
        if (!items[i]) return;
        items[i].textContent = a.state === 'alive' ? `● ${a.name} ${Math.ceil((a.hp / a.maxHp) * 100)}%`
          : a.state === 'wreck' ? `✖ ${a.name} 大破 ${Math.ceil(a.wreckT)}s` : `✖ ${a.name} 喪失`;
      });
    }
  }

  // =========================================================================
  // オンライン同期
  // =========================================================================
  _onRemoteUpdate(id, data) {
    if (!data) {
      const m = this.remoteMeshes.get(id);
      if (m) {
        this.scene.remove(m);
        disposeObject(m);
      }
      this.remoteMeshes.delete(id);
      return;
    }
    let m = this.remoteMeshes.get(id);
    if (!m) {
      m = createVoxelMechModel(computeMechStats(data.loadout || this.loadout));
      this.scene.add(m);
      this.remoteMeshes.set(id, m);
    }
    m.position.set(...data.pos);
    m.userData.upperPivot.rotation.y = data.yaw || 0;
    m.userData.wreck = !!data.wreck;
    m.rotation.z = data.wreck ? 0.35 : 0;
  }

  _spawnRemoteShot(s) {
    this._fireProjectile('ally', { speed: s.speed || 80, damage: s.damage || 40, color: s.color, power: 1 }, new THREE.Vector3(...s.pos), new THREE.Vector3(...s.dir), { owner: 'remote' });
  }

  // =========================================================================
  // エフェクト・HUD
  // =========================================================================
  _updateEffects(dt) {
    for (let i = this.trails.length - 1; i >= 0; i--) {
      const tr = this.trails[i];
      tr.life -= dt;
      const k = Math.max(0, tr.life / tr.max);
      if (tr.slash) {
        tr.mat.opacity = 0.85 * k;
        tr.group.scale.setScalar(1 + (1 - k) * 0.25);
      } else {
        const u = tr.group.userData;
        u.core.scale.set(u.coreR * k, u.coreR * k, 1);
        u.outer.scale.set(u.outerR * (2 - k), u.outerR * (2 - k), 1);
      }
      if (tr.life <= 0) {
        this.scene.remove(tr.group);
        if (tr.slash) { tr.mat.dispose(); tr.geo.dispose(); }
        this.trails.splice(i, 1);
      }
    }
    this.px.update(dt);
  }

  _updateHUD(dt) {
    const p = this.player;
    $('click-hint').classList.toggle('hidden', document.pointerLockElement === this.renderer.domElement);
    const hp = (p.hp / p.maxHp) * 100;
    $('hp-bar').style.width = `${hp}%`;
    $('hp-damage-bar').style.width = `${hp}%`;
    $('hp-text').textContent = Math.ceil(p.hp);
    $('ep-bar').style.width = `${(p.ep / p.maxEp) * 100}%`;
    $('ep-text').textContent = Math.ceil(p.ep);
    const hk = $('heal-count');
    if (hk) hk.textContent = `機体 ×${this.reserve + 1}　修理キット ×${this.healKits || 0} [H]`;
    this.netTimer += dt;
    if (this.netTimer > 0.1) {
      this.netTimer = 0;
      const pos = p.dead && this.wreck ? this.wreck.position : p.pos;
      this.net.broadcastState({ name: 'PILOT', pos: [pos.x, pos.y, pos.z], yaw: p.yaw, hp: p.hp, maxHp: p.maxHp, loadout: this.loadout, wreck: p.dead && p.downState === 'wreck' });
    }
  }

  // =========================================================================
  // メインループ
  // =========================================================================
  _loop(now) {
    const dt = Math.min(0.05, (now - this.lastTime) / 1000);
    this.lastTime = now;

    if (this.state === 'garage' || this.state === 'boot') {
      this._garageSkip = !this._garageSkip;
      if (this._garageSkip) { this._garageDt = (this._garageDt || 0) + dt; return; }
      this.garage.update(dt + (this._garageDt || 0));
      this._garageDt = 0;
      this.garagePost.render();
      return;
    }
    const shipSpeed = this.stage ? this.stage.shipSpeed : 55;
    if (this.state !== 'paused') this.world.update(dt, shipSpeed);

    if (this.state === 'playing') {
      this.runStats.time += dt;
      this._updateFlow(dt);
      this._updatePlayer(dt);
      this._updateCamera(dt);
      this._updateWeapons(dt);
      this._updateBullets(dt);
      this._updateFlames(dt);
      this._updateSingularities(dt);
      this._updateEnemies(dt);
      this._updateDrops(dt);
      this._updateEnemyBullets(dt);
      this._updateBoss(dt);
      this._updateAllies(dt);
      this._updateEffects(dt);
      this._updateHUD(dt);
    } else if (this.state === 'result') {
      this._updateEffects(dt);
    }
    this.battlePost.render();
  }
}

Object.assign(SandArkGame.prototype, GarageUI, WeaponSystem, EnemySystem, BossSystem, DeathSystem);

addEventListener('DOMContentLoaded', () => {
  window.sandArkGame = new SandArkGame();
});
