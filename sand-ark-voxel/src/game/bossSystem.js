import * as THREE from 'three';
import { createBoss } from '../bossBuilder.js';
import { pickDropPart } from '../partsData.js';
import { audio } from '../audio.js';
import { $, HW, HL, RED, BOSS_SCALE, rayAABB, distPointSegment, lerpAngle, obstacleBox, disposeObject } from './util.js';

/**
 * ボスシステム（ボスはさらに2倍＝初期比4倍の超巨大スケール）
 * - 出現時はカメラが自動的にボスへ向き、砂海を割って現れる迫力の登場演出を行う
 * - 動きは巨大・重厚なまま、副砲弾幕と高頻度のメイン大技で圧倒的な脅威を与える
 */
export const BossSystem = {
  _spawnBoss() {
    const st = this.stage;
    const model = createBoss(st.boss);
    model.root.scale.setScalar(BOSS_SCALE);
    model.root.position.set(HW + 64, -125, -8);
    this.scene.add(model.root);
    this.boss = {
      isBoss: true, type: st.boss, model, root: model.root, core: model.core,
      hp: st.bossHp * this._bossHpMul(), maxHp: st.bossHp * this._bossHpMul(),
      hitR: model.radius * 0.68 * BOSS_SCALE,
      worldHits: model.hitPoints.map(() => new THREE.Vector3()),
      state: 'enter', timer: 0, t: 0, patterns: st.bossPatterns, pi: 0,
      side: 1, heat: 0, slam: 0, onDeck: false, atk: null, beamMesh: null, flash: 0,
      subTimer: 1.8, fxTimer: 0
    };
    this.flow.phase = 'boss';
    this.world.setSandstormMode(false);
    // 出現時だけカメラをボスの方へグッと向ける演出タイマー
    this.bossIntroCam = { timer: 4.4, max: 4.4 };

    $('boss-hud').classList.remove('hidden');
    $('boss-name').textContent = st.bossName;
    this._updateBossHUD();
    $('wave-phase-text').textContent = 'BOSS ENGAGED';
    $('wave-sub-text').textContent = st.bossName;
    audio.play('bossAppear', { throttle: 0 });
    audio.play('bossMotor', { throttle: 0 });
    audio.play('bossQuake', { throttle: 0 });
    audio.playBossVoice(st.boss, { throttle: 0, vol: 0.95, tag: 'appear' });
    this.cam.shake = 1.4;
    if (this._triggerScreenFlash) this._triggerScreenFlash('rgba(255,50,70,0.55)');
    if (this._showCinemaBanner) this._showCinemaBanner('WARNING // MASSIVE CLASS', st.bossName, 'danger', 4200);
    this._announce(st.bossName, '超巨大反応が砂海より浮上！', 3800);

    // 出現地点の海面に大爆発と衝撃波リング
    const emergePos = new THREE.Vector3(HW + 58, 0, -8);
    this.px.explosion(emergePos, 0xff5030, 3.0, { noDebris: true });
    this.px.ring(emergePos, 38, 0xff4040, 1.1, 0.5);
  },

  _bossHome(b) {
    const t = b.t;
    if (b.type === 'leviathan') return new THREE.Vector3(b.side * (HW + 54), 14 + Math.sin(t * 0.7) * 3.5, Math.sin(t * 0.2) * 28);
    if (b.type === 'prism') return new THREE.Vector3(b.side * (HW + 60), 34 + Math.sin(t * 0.65) * 4, -16 + Math.sin(t * 0.22) * 20);
    return new THREE.Vector3(b.side * (HW + 62), 30 + Math.sin(t * 0.8) * 3, Math.sin(t * 0.2) * 22);
  },

  _faceBoss(b, dt, target) {
    const d = target.clone().sub(b.root.position);
    b.root.rotation.y = lerpAngle(b.root.rotation.y, Math.atan2(-d.x, -d.z), Math.min(1, dt * 1.4));
  },

  _updateBoss(dt) {
    const b = this.boss;
    if (!b) return;
    const p = this.player;
    const tgt = this._livePlayerPos();
    b.t += dt;
    b.timer += dt;
    b.flash = Math.max(0, b.flash - dt * 5);
    b.model.animate(b.t, b.slam);
    b.model.hitPoints.forEach((hp, i) => b.worldHits[i].copy(b.root.localToWorld(hp.clone())));

    const core = b.core;
    core.mat.color.copy(core.baseColor).lerp(RED, b.heat);
    core.mat.emissive.copy(core.baseColor).lerp(RED, b.heat).lerp(new THREE.Color(1, 1, 1), b.flash * 0.6);
    core.mat.emissiveIntensity = 2.8 + b.heat * 6 + b.flash * 4 + (b.heat > 0.6 ? Math.sin(b.t * 30) * 1.5 : 0);
    core.halo.material.color.copy(core.baseColor).lerp(RED, b.heat);

    const root = b.root;
    const home = this._bossHome(b);
    const corePos = b.core.mesh.getWorldPosition(new THREE.Vector3());

    // 戦闘中はメイン行動と並行して副砲から定期的に弾幕・誘導弾を発射してプレッシャーを維持
    if (b.state === 'idle' || b.state === 'attack') {
      b.subTimer -= dt;
      if (b.subTimer <= 0) {
        b.subTimer = 1.65 - (this.stage.id - 1) * 0.15;
        const dir = tgt.clone().add(new THREE.Vector3(0, 1.5, 0)).sub(corePos).normalize();
        const variant = b.type === 'prism' ? 'stunner' : b.type === 'omega' ? 'burner' : 'normal';
        for (let k = -1; k <= 1; k++) {
          const d = dir.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), k * 0.16);
          this._spawnEnemyBullet(corePos.clone(), d, variant, 24, 1.4, { homing: k === 0 ? 0.5 : 0, dmg: 55, boss: true });
        }
        this.px.flash(corePos, 0xff4060, 1.8, 0.1);
        audio.play('enemyFire', { pos: corePos, throttle: 0.12, vol: 0.6 });
      }
    }

    switch (b.state) {
      case 'enter':
        root.position.lerp(home, 1 - Math.exp(-1.05 * dt));
        if (b.type !== 'leviathan') this._faceBoss(b, dt, tgt);
        b.fxTimer -= dt;
        if (b.fxTimer <= 0) {
          b.fxTimer = 0.22;
          const sp = root.position.clone().add(new THREE.Vector3((Math.random() - 0.5) * 45, -18, (Math.random() - 0.5) * 45));
          this.px.smokePuff(sp, 0xb9a58a, 4.2, 2.0, new THREE.Vector3(0, 10, 0));
          this.px.ring( new THREE.Vector3(root.position.x, 0.5, root.position.z), 28, 0xff6040, 0.55, 0.5);
        }
        this.cam.shake = Math.max(this.cam.shake, 0.35);
        if (b.timer > 4.4) {
          b.state = 'idle';
          b.timer = 0;
          b.idleTime = 0.7; // 登場直後にすぐ攻撃開始
          audio.play('bossRoar', { throttle: 0 });
          audio.playBossVoice(b.type, { throttle: 0, vol: 0.7, tag: 'enter' });
          this.cam.shake = 1.2;
          this.px.sphereWave(corePos, 42, 0xff3050, 0.6);
          this.px.ring(corePos, 55, 0xff5060, 0.7, corePos.y);
          if (this._triggerScreenFlash) this._triggerScreenFlash('rgba(255,255,255,0.45)');
        }
        break;
      case 'idle':
        b.heat = Math.max(0, b.heat - dt * 1.5);
        b.slam = THREE.MathUtils.lerp(b.slam, 0, Math.min(1, dt * 3));
        root.position.lerp(home, 1 - Math.exp(-0.7 * dt));
        if (b.type === 'leviathan') root.rotation.y = lerpAngle(root.rotation.y, 0, Math.min(1, dt * 1.2));
        else this._faceBoss(b, dt, tgt);
        if (b.timer > b.idleTime) this._startBossPattern();
        break;
      case 'attack':
        this._runBossPattern(b, dt, home, tgt);
        break;
      case 'dying':
        b.heat = 1;
        root.position.y -= dt * 6;
        root.rotation.z += dt * 0.15;
        b.fxTimer -= dt;
        if (b.fxTimer <= 0) {
          b.fxTimer = 0.25;
          const off = new THREE.Vector3((Math.random() - 0.5) * 45, (Math.random() - 0.5) * 30, (Math.random() - 0.5) * 45);
          this.px.explosion(root.position.clone().add(off), 0xffa040, 2.0, { noDebris: true });
          audio.play('explosionBig', { throttle: 0.15 });
          this.cam.shake = Math.max(this.cam.shake, 0.45);
        }
        if (b.timer > 3.2) {
          this.px.explosion(corePos, 0xffffff, 3.2, { noDebris: true });
          this.px.sphereWave(corePos, 60, 0xffaa40, 0.7);
          audio.play('bossDefeat', { throttle: 0 });
          audio.play('bossCollapse', { throttle: 0 });
          audio.play('bossDeathCrack', { throttle: 0 });
          audio.playBossVoice(b.type, { throttle: 0, rate: 0.72, vol: 1, tag: 'deathEnd' });
          this.cam.shake = 1.5;
          if (this._triggerScreenFlash) this._triggerScreenFlash('rgba(255,255,255,0.75)');

          // ボス撃破ボーナス：レアパーツ優先で2個ドロップ＆即回収
          for (let k = 0; k < 2; k++) {
            const picked = this._spawnDropItem ? pickDropPart(this.inventory, null, true) : null;
            if (picked) {
              this._collectDrop({ id: picked.id, slot: picked.slot, part: picked.part, isRare: !!picked.part.rare });
            }
          }

          this.scene.remove(root);
          disposeObject(root);
          if (b.beamMesh) this.scene.remove(b.beamMesh);
          this.boss = null;
          $('boss-hud').classList.add('hidden');
          this._stageCleared();
        }
        break;
    }
    if (b.state === 'enter' || b.state === 'idle' || b.state === 'attack') {
      b.stepCd = (b.stepCd || 0) - dt;
      const moving = b.state === 'enter' || root.position.distanceTo(home) > 3;
      if (b.stepCd <= 0 && moving) {
        b.stepCd = b.state === 'enter' ? 0.48 : 1.15;
        audio.play(b.type === 'leviathan' ? 'bossMove' : 'bossMoveHeavy', { pos: root.position, throttle: 0 });
        if (b.state !== 'attack') audio.playBossVoice(b.type, { vol: 0.38, throttle: 1.1, tag: 'move' });
      }
    }
    void p;
  },

  _startBossPattern() {
    const b = this.boss;
    const name = b.patterns[b.pi % b.patterns.length];
    b.pi++;
    b.state = 'attack';
    b.timer = 0;
    b.atk = { name, fired: 0, tele: [] };
    audio.play('bossCharge', { throttle: 0 });
    audio.play('bossTelegraph', { throttle: 0 });
    audio.playBossVoice(b.type, { throttle: 0, rate: 1.06, vol: 0.82, tag: 'tele' });
  },

  _endBossPattern(idle = 1.0) {
    const b = this.boss;
    if (b.atk) for (const t of b.atk.tele) this._removeTelegraph(t);
    if (b.beamMesh) { this.scene.remove(b.beamMesh); b.beamMesh = null; }
    b.state = 'idle';
    b.timer = 0;
    b.idleTime = idle; // 攻撃間隔を短縮して常に脅威に
    b.onDeck = false;
    b.atk = null;
  },

  _runBossPattern(b, dt, home, tgt) {
    const a = b.atk;
    const t = b.timer;
    const p = this.player;
    const root = b.root;
    const corePos = b.core.mesh.getWorldPosition(new THREE.Vector3());

    switch (a.name) {
      case 'volley': {
        root.position.lerp(home, 1 - Math.exp(-0.7 * dt));
        if (b.type !== 'leviathan') this._faceBoss(b, dt, tgt);
        b.heat = Math.min(1, t / 1.0);
        const times = [1.0, 1.45, 1.9, 2.35];
        if (a.fired < times.length && t >= times[a.fired]) {
          a.fired++;
          const base = tgt.clone().add(new THREE.Vector3(0, 1.5, 0)).sub(corePos).normalize();
          const variants = b.type === 'prism' ? ['normal', 'stunner', 'normal'] : b.type === 'omega' ? ['burner', 'normal', 'burner'] : ['normal', 'normal', 'normal'];
          for (let k = -3; k <= 3; k++) {
            const d = base.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), k * 0.13 + (a.fired % 2 ? 0.05 : -0.05));
            this._spawnEnemyBullet(corePos.clone(), d, variants[Math.abs(k) % 3], 24, 1.8, { dmg: 75, boss: true });
          }
          // 中央に高威力の誘導プラズマ弾も同時発射
          this._spawnEnemyBullet(corePos.clone(), base, 'burner', 20, 2.4, { color: 0xff9100, dmg: 95, homing: 0.8, splash: 4.5, boss: true });
          this.px.flash(corePos, 0xff3050, 4, 0.15);
          audio.play('bossVolley', { throttle: 0.08 });
          this.cam.shake = Math.max(this.cam.shake, 0.35);
        }
        if (t > 2.9) this._endBossPattern(0.9);
        break;
      }

      case 'beam': {
        root.position.lerp(home, 1 - Math.exp(-0.5 * dt));
        this._faceBoss(b, dt, tgt);
        if (!a.aim) {
          a.aim = tgt.clone().add(new THREE.Vector3(0, 1.5, 0));
          a.line = this._lineTelegraph();
          a.tele.push(a.line);
        }
        const tele = 1.4;
        a.aim.lerp(tgt.clone().add(new THREE.Vector3(0, 1.5, 0)), Math.min(1, dt * (t < tele ? 1.6 : 0.55)));
        if (t < tele) {
          b.heat = t / tele;
          if (Math.random() < 0.6) {
            const off = new THREE.Vector3((Math.random() - 0.5), (Math.random() - 0.5), (Math.random() - 0.5)).normalize().multiplyScalar(12);
            this.px.glow.spawn(corePos.clone().add(off), off.clone().multiplyScalar(-3.0), 0xff3050, 0.3, 0.35, { intensity: 3 });
          }
        }
        const dir = a.aim.clone().sub(corePos).normalize();
        this._updateLineTelegraph(a.line, corePos, corePos.clone().addScaledVector(dir, 260), t < tele ? t / tele : 0, 1.7);
        if (t >= tele) {
          if (!b.beamMesh) {
            b.beamMesh = this._createBeamMesh(0xff3050, 1.3, 3.8);
            audio.play('bossBeam', { throttle: 0 });
            this.cam.shake = 0.85;
          }
          // 遮蔽物の陰に入れば防げる
          let wallT = 260;
          for (const ob of this.world.obstacles) {
            const [mn, mx] = obstacleBox(ob);
            wallT = Math.min(wallT, rayAABB(corePos, dir, mn, mx));
          }
          if (dir.y < -0.001) {
            const tf = -corePos.y / dir.y;
            const hit = corePos.clone().addScaledVector(dir, tf);
            if (tf > 0 && tf < wallT && Math.abs(hit.x) < HW && Math.abs(hit.z) < HL) wallT = tf;
          }
          const bEnd = corePos.clone().addScaledVector(dir, wallT);
          this._setBeam(b.beamMesh, corePos, bEnd);
          const chest = p.pos.clone().add(new THREE.Vector3(0, 1.5, 0));
          if (!p.dead && distPointSegment(chest, corePos, bEnd) < 3.2) {
            if (this._damagePlayer(280 * dt, { flash: Math.random() < 0.2 })) this._knockPlayer(dir.clone().setY(0).normalize().multiplyScalar(12 * dt));
          }
          this.px.spark(bEnd, dir.clone().negate(), 0xff8090, 3, 14, 1.2);
          if (Math.random() < 0.25) this.px.smokePuff(bEnd, 0x403035, 1.0, 1.1);
          if (Math.random() < 0.12) this.px.scorch(bEnd, 1.2);
          this.px.light(bEnd, 0xff4060, 45, 0.05);
        }
        if (t > tele + 1.8) this._endBossPattern(1.1);
        break;
      }

      case 'rain': {
        root.position.lerp(home, 1 - Math.exp(-0.7 * dt));
        if (b.type !== 'leviathan') this._faceBoss(b, dt, tgt);
        if (!a.spots) {
          a.spots = [];
          for (let k = 0; k < 12; k++) {
            const x = THREE.MathUtils.clamp(tgt.x + (k < 2 ? (k * 4 - 2) : (Math.random() - 0.5) * 34), -HW + 3, HW - 3);
            const z = THREE.MathUtils.clamp(tgt.z + (k < 2 ? 0 : (Math.random() - 0.5) * 34), -HL + 3, HL - 3);
            const tel = this._circleTelegraph(x, z, 4.2);
            a.tele.push(tel);
            a.spots.push({ x, z, tel, meteor: null, done: false });
          }
          audio.play('bossMissile', { throttle: 0 });
        }
        b.heat = Math.min(1, t / 1.0);
        for (const s of a.spots) {
          this._updateCircleTelegraph(s.tel, Math.min(1, t / 1.7));
          if (t > 1.0 && !s.meteor) {
            s.meteor = new THREE.Mesh(this.geo.box, this.solidMat(0x3a2a40, 0.8, 0.3, 0xff3050, 2.5));
            s.meteor.scale.setScalar(1.8);
            this.scene.add(s.meteor);
            this.meteors.push({ mesh: s.meteor });
          }
          if (s.meteor && !s.done) {
            const k = Math.min(1, (t - 1.0) / 0.7);
            s.meteor.position.set(s.x, 50 * (1 - k), s.z);
            s.meteor.rotation.set(t * 5, t * 3, 0);
            if (Math.random() < 0.5) this.px.glow.spawn(s.meteor.position, new THREE.Vector3(0, 8, 0), 0xff6040, 0.5, 0.25, { intensity: 2 });
            if (k >= 1) {
              s.done = true;
              this.scene.remove(s.meteor);
              const pos = new THREE.Vector3(s.x, 0.5, s.z);
              this.px.explosion(pos, 0xff5040, 1.4, { noDebris: true });
              audio.play('explosionBig', { pos, throttle: 0.08 });
              const d = Math.hypot(p.pos.x - s.x, p.pos.z - s.z);
              if (!p.dead && d < 4.8 && p.pos.y < 4.5 && this._damagePlayer(140)) {
                this._knockPlayer(new THREE.Vector3(p.pos.x - s.x, 0, p.pos.z - s.z).normalize().multiplyScalar(11).setY(6));
              }
            }
          }
        }
        if (t > 1.7 && t < 2.0) this.cam.shake = Math.max(this.cam.shake, 0.5);
        if (t > 2.2) this._endBossPattern(0.95);
        break;
      }

      case 'summon': {
        root.position.lerp(home, 1 - Math.exp(-0.7 * dt));
        b.heat = Math.min(1, t / 0.8);
        if (t > 0.8 && !a.fired) {
          a.fired = 1;
          audio.play('bossRoar', { throttle: 0 });
          const types = b.type === 'omega' ? ['rammer', 'burner', 'stunner'] : b.type === 'prism' ? ['stunner', 'drone', 'stunner'] : ['drone', 'drone', 'stunner'];
          const at = corePos.clone();
          at.x = THREE.MathUtils.clamp(at.x, -HW - 10, HW + 10);
          types.forEach((ty, k) => setTimeout(() => this.boss && this.state === 'playing' && this._spawnEnemy(ty, at), k * 250));
          // 召喚と同時にボス自身も扇状弾幕を放つ
          const base = tgt.clone().add(new THREE.Vector3(0, 1.5, 0)).sub(corePos).normalize();
          for (let k = -2; k <= 2; k++) {
            const d = base.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), k * 0.16);
            this._spawnEnemyBullet(corePos.clone(), d, 'normal', 23, 1.6, { boss: true });
          }
        }
        if (t > 1.6) this._endBossPattern(0.9);
        break;
      }

      // 砂鯨：甲板を横切る超巨大跳躍（赤い帯＋クラスター爆撃）
      case 'leap': {
        const teleT = 2.0, jumpT = 2.6;
        if (!a.band) {
          a.bandZ = THREE.MathUtils.clamp(tgt.z, -HL + 12, HL - 12);
          a.band = this._bandTelegraph(a.bandZ, 22);
          a.tele.push(a.band);
          a.startX = b.side * (HW + 85);
          a.bombs = 0;
          audio.play('bossRoar', { throttle: 0 });
        }
        if (t < teleT) {
          b.heat = t / teleT;
          this._updateBandTelegraph(a.band, t / teleT);
          root.position.lerp(new THREE.Vector3(a.startX, -28, a.bandZ), 1 - Math.exp(-2.5 * dt));
          root.rotation.y = lerpAngle(root.rotation.y, b.side * Math.PI / 2, Math.min(1, dt * 2.5));
        } else {
          const u = Math.min(1, (t - teleT) / jumpT);
          const x = THREE.MathUtils.lerp(a.startX, -a.startX, u);
          const y = -28 + Math.sin(Math.PI * u) * 68;
          root.position.set(x, y, a.bandZ);
          root.rotation.y = b.side * Math.PI / 2;
          root.rotation.z = Math.cos(Math.PI * u) * 0.35 * b.side;
          if (!a.sfx) { a.sfx = 1; audio.play('bossAppear', { throttle: 0, rate: 1.1 }); audio.play('bossMove', { throttle: 0 }); audio.playBossVoice(b.type, { throttle: 0, vol: 0.7, tag: 'leap' }); this._updateBandTelegraph(a.band, 1); }

          // 甲板上空を通過中に爆弾を投下
          if (u > 0.25 && u < 0.75 && a.bombs < 5 && u >= 0.25 + a.bombs * 0.1) {
            a.bombs++;
            this._spawnEnemyBullet(new THREE.Vector3(x, Math.max(6, y - 8), a.bandZ + (Math.random() - 0.5) * 16), new THREE.Vector3(0, -1, 0), 'burner', 18, 1.8, { gravity: 12, splash: 5.0, dmg: 85, boss: true });
          }

          if (!a.hit && !p.dead && Math.abs(p.pos.z - a.bandZ) < 16 && Math.abs(p.pos.x - x) < 18 && Math.abs(p.pos.y - y) < 22) {
            a.hit = true;
            if (this._damagePlayer(240)) this._knockPlayer(new THREE.Vector3(-b.side * 26, 9, 0));
          }
          if (Math.abs(x) < HW + 12) {
            if (Math.random() < 0.6) this.px.smokePuff(new THREE.Vector3(x + (Math.random() - 0.5) * 14, 0.3, a.bandZ + (Math.random() - 0.5) * 22), 0xb9a58a, 2.0, 1.2, new THREE.Vector3(0, 5, 0));
            this.cam.shake = Math.max(this.cam.shake, 0.55);
          }
          if (u >= 1) {
            audio.play('bossQuake', { throttle: 0 });
            root.rotation.z = 0;
            b.side = -b.side;
            this._endBossPattern(1.1);
          }
        }
        break;
      }

      // 巨神：甲板に乗り上げて叩きつけ＋全方位弾幕
      case 'board': {
        const R = 16;
        if (!a.spot) {
          a.spot = new THREE.Vector3(THREE.MathUtils.clamp(tgt.x, -HW + 16, HW - 16), 0, THREE.MathUtils.clamp(tgt.z, -HL + 16, HL - 16));
          a.circle = this._circleTelegraph(a.spot.x, a.spot.z, R);
          a.tele.push(a.circle);
          audio.play('bossRoar', { throttle: 0 });
        }
        const teleT = 2.0, landY = 32;
        if (t < teleT) {
          b.heat = t / teleT;
          b.slam = Math.min(1, t / teleT);
          this._updateCircleTelegraph(a.circle, t / teleT);
          root.position.lerp(a.spot.clone().setY(75), 1 - Math.exp(-2.5 * dt));
          this._faceBoss(b, dt, tgt);
        } else if (t < teleT + 0.4) {
          const k = (t - teleT) / 0.4;
          root.position.set(a.spot.x, 75 - (75 - landY) * k * k, a.spot.z);
        } else {
          if (!a.landed) {
            a.landed = true;
            b.onDeck = true;
            b.slam = 0;
            this._removeTelegraph(a.circle);
            a.tele = a.tele.filter((x) => x !== a.circle);
            audio.play('bossLand', { throttle: 0 });
            audio.play('bossQuake', { throttle: 0 });
            this.cam.shake = 1.6;
            this.px.explosion(a.spot.clone().setY(0.5), 0xffa040, 3.0, { noDebris: true });
            this.px.ring(a.spot, R * 1.6, 0xffb070, 0.65);
            // 着地時に全方位10Way衝撃弾
            for (let k = 0; k < 10; k++) {
              const ang = (k / 10) * Math.PI * 2;
              this._spawnEnemyBullet(a.spot.clone().setY(1.4), new THREE.Vector3(Math.cos(ang), 0, Math.sin(ang)), 'burner', 22, 1.5, { boss: true });
            }
            const d = Math.hypot(p.pos.x - a.spot.x, p.pos.z - a.spot.z);
            if (!p.dead && d < R + 1 && p.pos.y < 6 && this._damagePlayer(200)) {
              this._knockPlayer(new THREE.Vector3(p.pos.x - a.spot.x, 0, p.pos.z - a.spot.z).normalize().multiplyScalar(24).setY(8));
            }
          }
          root.position.set(a.spot.x, landY + Math.sin(b.t * 2) * 0.4, a.spot.z);
          this._faceBoss(b, dt, tgt);
          b.heat = Math.max(0, b.heat - dt);
          const st = t - teleT - 0.4;
          for (const at of [1.6, 3.3]) {
            const key = `sub${at}`;
            if (st > at - 0.85 && !a[key]) {
              a[key] = { pos: tgt.clone(), circle: this._circleTelegraph(tgt.x, tgt.z, 8.5) };
              a.tele.push(a[key].circle);
              audio.play('bossCharge', { throttle: 0, vol: 0.6 });
            }
            const sub = a[key];
            if (sub && !sub.done) {
              const k = Math.min(1, (st - (at - 0.85)) / 0.85);
              this._updateCircleTelegraph(sub.circle, k);
              b.slam = k;
              if (k >= 1) {
                sub.done = true;
                b.slam = 0;
                this._removeTelegraph(sub.circle);
                this.px.explosion(sub.pos.clone().setY(0.4), 0xff6040, 1.8, { noDebris: true });
                this.px.ring(sub.pos, 11, 0xffb070, 0.45);
                audio.play('bossQuake', { throttle: 0, vol: 0.7 });
                audio.play('hammerHit', { throttle: 0, rate: 0.7 });
                this.cam.shake = 0.9;
                const d = Math.hypot(p.pos.x - sub.pos.x, p.pos.z - sub.pos.z);
                if (!p.dead && d < 8.8 && p.pos.y < 4.5 && this._damagePlayer(135)) {
                  this._knockPlayer(new THREE.Vector3(p.pos.x - sub.pos.x, 0, p.pos.z - sub.pos.z).normalize().multiplyScalar(16).setY(5));
                }
              }
            }
          }
          if (st > 4.5) {
            b.onDeck = false;
            root.position.lerp(home, 1 - Math.exp(-1.5 * dt));
            if (st > 5.6) this._endBossPattern(1.0);
          }
        }
        break;
      }
      default:
        this._endBossPattern();
    }
  },

  _damageBoss(dmg, pos, silent = false) {
    const b = this.boss;
    if (!b || b.state === 'dying') return;
    // 登場演出中も攻撃が当たれば少しダメージが入る（軽減あり）
    const mult = b.state === 'enter' ? 0.35 : 1;
    b.hp = Math.max(0, b.hp - dmg * mult);
    b.flash = Math.min(1, b.flash + 0.4);
    if (!silent) {
      audio.play('bossHit', { pos, throttle: 0.06 });
      this.px.hitMetal(pos, pos.clone().sub(this.player.pos).normalize().negate(), 0xffc46b, 1.2);
      this._hitMarker(false);
    }
    this._updateBossHUD();
    if (b.hp <= 0) {
      if (b.atk) this._endBossPattern();
      b.state = 'dying';
      b.timer = 0;
      b.fxTimer = 0;
      b.onDeck = false;
      audio.play('bossRoar', { throttle: 0, rate: 0.8 });
      audio.play('bossDeathBreak', { throttle: 0 });
      audio.playBossVoice(b.type, { throttle: 0, rate: 0.64, vol: 1, tag: 'death' });
      this._hitMarker(true);
      this._onTargetLost(b);
    }
  },

  _updateBossHUD() {
    const b = this.boss;
    if (!b) return;
    $('boss-hp-bar').style.width = `${(b.hp / b.maxHp) * 100}%`;
    $('boss-hp-text').textContent = `${Math.ceil(b.hp)}`;
  },

  // ---------- 攻撃予兆 ----------
  _circleTelegraph(x, z, r) {
    const g = new THREE.Group();
    const ringMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xff2a3a).multiplyScalar(2), transparent: true, opacity: 0.85, depthWrite: false });
    const fillMat = new THREE.MeshBasicMaterial({ color: 0xff2a3a, transparent: true, opacity: 0.25, depthWrite: false });
    const ring = new THREE.Mesh(this.geo.ring, ringMat);
    const fill = new THREE.Mesh(this.geo.disc, fillMat);
    ring.scale.setScalar(r);
    fill.scale.setScalar(0.01);
    g.add(ring, fill);
    g.position.set(x, 0.06, z);
    g.userData = { ring, fill, r, ringMat, fillMat };
    this.scene.add(g);
    const t = { group: g };
    this.telegraphs.push(t);
    return t;
  },

  _updateCircleTelegraph(t, k) {
    const u = t.group.userData;
    u.fill.scale.setScalar(Math.max(0.01, u.r * k));
    u.ringMat.opacity = 0.5 + Math.sin(performance.now() * 0.02) * 0.35;
  },

  _bandTelegraph(z, width) {
    const g = new THREE.Group();
    const mat = new THREE.MeshBasicMaterial({ color: 0xff2a3a, transparent: true, opacity: 0.2, depthWrite: false });
    const edgeMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xff2a3a).multiplyScalar(2), transparent: true, opacity: 0.9, depthWrite: false });
    const fill = new THREE.Mesh(this.geo.plane, mat);
    fill.scale.set(HW * 2, 1, width);
    const e1 = new THREE.Mesh(this.geo.plane, edgeMat);
    e1.scale.set(HW * 2, 1, 0.5);
    e1.position.z = -width / 2;
    const e2 = e1.clone();
    e2.position.z = width / 2;
    g.add(fill, e1, e2);
    g.position.set(0, 0.06, z);
    g.userData = { mat, edgeMat };
    this.scene.add(g);
    const t = { group: g };
    this.telegraphs.push(t);
    return t;
  },

  _updateBandTelegraph(t, k) {
    t.group.userData.mat.opacity = 0.15 + k * 0.35;
    t.group.userData.edgeMat.opacity = 0.5 + Math.sin(performance.now() * 0.02) * 0.4;
  },

  /**
   * 攻撃予兆ライン：極細＋点線＋流れるアニメーション。
   * 実際の攻撃（太い実体ビーム／弾）と一目で区別できるようにする。
   * WebGPU では ShaderMaterial が使えないため、点線はテクスチャ（アルファ）で表現する。
   */
  _lineTelegraph(color = 0xffb020) {
    if (!this._dashSource) this._dashSource = makeDashTexture();
    const tex = this._dashSource.clone();
    tex.needsUpdate = true;
    const mat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(color),
      map: tex,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
      side: THREE.DoubleSide,
      toneMapped: false
    });
    const m = new THREE.Mesh(this.geo.cyl, mat);
    const g = new THREE.Group();
    m.position.z = 0.5;
    g.add(m);
    g.userData = { m, mat, tex };
    this.scene.add(g);
    const t = { group: g };
    this.telegraphs.push(t);
    return t;
  },

  _updateLineTelegraph(t, from, to, k, widthMul = 1) {
    const g = t.group;
    const dist = from.distanceTo(to);
    g.visible = k > 0.02;
    if (!g.visible) return;
    g.position.copy(from);
    g.lookAt(to);
    // 極細：直径4cm→最大17cm（旧実装は最大1.8mあった）
    const w = (0.012 + k * 0.038) * widthMul;
    g.scale.set(1, 1, dist);
    g.userData.m.scale.set(w, w, 1);
    const u = g.userData;
    u.tex.repeat.y = Math.max(1, dist / DASH_PITCH);
    u.tex.offset.y = -(performance.now() * 0.001 * 3.4) / DASH_PITCH;  // 目標へ流れる
    u.mat.opacity = 0.5 + k * 0.45;
  },

  _removeTelegraph(t) {
    if (!t) return;
    const u = t.group.userData;
    if (u) {
      for (const m of [u.mat, u.ringMat, u.fillMat, u.edgeMat]) m?.dispose?.();
      u.tex?.dispose?.();
    }
    this.scene.remove(t.group);
    const i = this.telegraphs.indexOf(t);
    if (i >= 0) this.telegraphs.splice(i, 1);
  }
};

/** 予兆ライン用の点線テクスチャ（縦＝ライン軸方向。白＋アルファで、色は material.color で付ける） */
const DASH_PITCH = 1.7;   // 点線1周期の長さ(m)
function makeDashTexture() {
  const cv = document.createElement('canvas');
  cv.width = 8;
  cv.height = 128;
  const c = cv.getContext('2d');
  c.clearRect(0, 0, 8, 128);
  const dash = 54;                                   // 128px中54px＝約42%だけ描く＝点線
  const grd = c.createLinearGradient(0, 0, 0, dash);
  grd.addColorStop(0, 'rgba(255,255,255,0)');
  grd.addColorStop(0.3, 'rgba(255,255,255,1)');
  grd.addColorStop(0.7, 'rgba(255,255,255,1)');
  grd.addColorStop(1, 'rgba(255,255,255,0)');
  c.fillStyle = grd;
  c.fillRect(0, 0, 8, dash);
  const tex = new THREE.CanvasTexture(cv);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.generateMipmaps = false;                 // ミップマップで点線が潰れて実線に見えるのを防ぐ
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  return tex;
}
