import * as THREE from 'three';
import { audio } from '../audio.js';
import { $, HW, HL, raySphere, rayAABB, obstacleBox, lerpAngle } from './util.js';

/**
 * 武器システム（SandArkGame に混ぜ込む）
 * - 1〜4キーで武器スロット切替、[R] リロード、撃ち切りで自動リロード
 * - 左右同一武器の DUAL LINK（右腕/左腕スロット選択時に両腕同時発射）
 * - 近接（斬撃・刺突・叩きつけ）、迫撃砲、頭部バルカン
 * - 自弾と敵弾は「出力」を比べて相殺
 */
export const WeaponSystem = {
  _initWeaponStates() {
    for (const ws of this.weaponStates || []) this._stopLoops(ws);
    this.weaponStates = this.stats.slots.map((s) => ({
      cooldown: 0, ammo: s.def.mag || 0, reloading: false, reloadT: 0,
      burstLeft: 0, burstTimer: 0, spin: 0, charge: 0, charging: false,
      beam: null, loop: null, recoil: 0, noAmmoSE: 0, melee: null
    }));
    this.activeSlot = this.stats.slots.findIndex((s) => s.def.behavior !== 'none');
    if (this.activeSlot < 0) this.activeSlot = 0;
    this.reticleSpread = 12;
    this._renderWeaponSlotsHUD();
  },

  _slotModel(slot) {
    const ud = this.player.mesh.userData;
    if (slot.mount === 'rarm') return { model: ud.rWeapon, arm: ud.rArmGroup };
    if (slot.mount === 'larm') return { model: ud.lWeapon, arm: ud.lArmGroup };
    const b = ud.builtins[slot.mount];
    return b ? { model: b.weapon, arm: b.group } : { model: null, arm: null };
  },

  _switchWeapon(i) {
    const slot = this.stats.slots[i];
    if (!slot || slot.def.behavior === 'none' || i === this.activeSlot) return;
    const prev = this.weaponStates[this.activeSlot];
    if (prev) this._stopLoops(prev, true);
    this.activeSlot = i;
    audio.play('weaponSwitch', { throttle: 0.05 });
    this._renderWeaponSlotsHUD();
  },

  _cycleWeapon(dir) {
    const n = this.stats.slots.length;
    for (let k = 1; k <= n; k++) {
      const i = (this.activeSlot + dir * k + n * 4) % n;
      if (this.stats.slots[i].def.behavior !== 'none') {
        this._switchWeapon(i);
        return;
      }
    }
  },

  _startReload(i, manual = false) {
    const slot = this.stats.slots[i];
    const ws = this.weaponStates[i];
    if (!slot || !slot.def.mag || ws.reloading || ws.ammo >= slot.def.mag) return;
    if (manual && ws.ammo === slot.def.mag) return;
    ws.reloading = true;
    ws.reloadT = 0;
    this._stopLoops(ws, true);
    if (i === this.activeSlot) audio.play('reloadStart', { throttle: 0.1 });
  },

  _stopLoops(ws, keepCharge = false) {
    if (!ws) return;
    if (ws.loop) { ws.loop.stop(); ws.loop = null; }
    if (ws.beam) { this.scene.remove(ws.beam); ws.beam = null; }
    if (!keepCharge) { ws.charging = false; ws.charge = 0; }
    else { ws.charging = false; ws.charge = 0; }
  },

  /** 弾を消費。足りなければ空撃ち音＋自動リロード */
  _useAmmo(i, n = 1) {
    const def = this.stats.slots[i].def;
    const ws = this.weaponStates[i];
    if (!def.mag) return true;
    if (ws.reloading) return false;
    if (ws.ammo < n) {
      if (ws.noAmmoSE <= 0) {
        audio.play('noAmmo', { throttle: 0.2 });
        ws.noAmmoSE = 0.5;
      }
      this._startReload(i);
      return false;
    }
    ws.ammo -= n;
    if (ws.ammo <= 0) this._startReload(i);
    return true;
  },

  _updateWeapons(dt) {
    const p = this.player;
    const pad = this._lastPad || {};
    const want = (this.mouse.left || pad.fireR) && !p.dead && p.stun <= 0 && this.state === 'playing';
    p.mesh.updateMatrixWorld(true);
    const aim = this._aimPoint();
    this.aimHit = aim.hit;

    // どのスロットを撃つか：DUAL LINK なら両腕
    const active = this.stats.slots[this.activeSlot];
    const firing = new Set();
    if (active && active.def.behavior !== 'none') {
      firing.add(this.activeSlot);
      if (this.stats.isDualLinked && (active.mount === 'rarm' || active.mount === 'larm')) {
        firing.add(0);
        firing.add(1);
      }
    }

    this.stats.slots.forEach((slot, i) => {
      const ws = this.weaponStates[i];
      const def = slot.def;
      ws.cooldown = Math.max(0, ws.cooldown - dt);
      ws.noAmmoSE = Math.max(0, ws.noAmmoSE - dt);
      ws.recoil = THREE.MathUtils.lerp(ws.recoil, 0, Math.min(1, dt * 9));
      const { model, arm } = this._slotModel(slot);
      if (arm && !ws.melee) {
        if (slot.mount === 'rarm' || slot.mount === 'larm') {
          arm.position.z = ws.recoil * 0.35;
          arm.rotation.set(0, 0, 0);
        }
      }
      // リロード進行
      if (ws.reloading) {
        ws.reloadT += dt;
        if (ws.reloadT >= def.reload) {
          ws.reloading = false;
          ws.ammo = def.mag;
          if (i === this.activeSlot || firing.has(i)) audio.play(def.reload >= 3 ? 'reloadHeavy' : 'reloadEnd', { throttle: 0.1 });
        }
      }
      if (def.behavior === 'none' || !model) return;
      const muzzle = model.group.localToWorld(model.muzzle.clone());
      const dir = aim.point.clone().sub(muzzle).normalize();
      const isFiring = firing.has(i) && want;
      this._runWeapon(def, ws, i, isFiring, muzzle, dir, model, arm, dt, aim);
    });

    this._updateReticle(dt, aim);
  },

  _runWeapon(def, ws, i, want, muzzle, dir, model, arm, dt, aim) {
    const p = this.player;
    const fireFx = (scale = 1) => {
      ws.recoil = Math.min(1.4, ws.recoil + def.recoil);
      this.cam.shake = Math.max(this.cam.shake, def.recoil * 0.32 * scale);
      this.reticleSpread += def.recoil * 14;
      this.px.flash(muzzle, def.color, 0.35 + def.recoil * 0.5, 0.06);
      this.px.light(muzzle, def.color, 18 * (0.4 + def.recoil), 0.06);
      if (def.fireSE) audio.play(def.fireSE, { throttle: def.behavior === 'gatling' || def.behavior === 'vulcan' ? 0.06 : 0.03 });
    };

    switch (def.behavior) {
      case 'gatling':
      case 'vulcan': {
        if (def.behavior === 'gatling') {
          ws.spin = want && !ws.reloading ? Math.min(1, ws.spin + dt * 1.4) : Math.max(0, ws.spin - dt);
          if (model.spinner) model.spinner.rotation.z += ws.spin * dt * 35;
        } else ws.spin = 1;
        if (want && ws.spin > 0.3 && ws.cooldown <= 0 && this._useAmmo(i)) {
          ws.cooldown = def.fireRate / Math.max(0.35, ws.spin);
          const sp = def.spread;
          const d = dir.clone().add(new THREE.Vector3((Math.random() - 0.5) * sp, (Math.random() - 0.5) * sp, (Math.random() - 0.5) * sp)).normalize();
          this._fireProjectile(def.behavior === 'vulcan' ? 'vulcan' : 'gatling', def, muzzle, d);
          fireFx(0.4);
          if (Math.random() < 0.5) {
            this.px.debris.spawn(muzzle, new THREE.Vector3((Math.random() - 0.5) * 3, 3, (Math.random() - 0.5) * 3), 0xc9a24a, 0.06, 0.8, { gravity: 18, spin: 20 });
            audio.play('casing', { throttle: 0.25, pos: muzzle });
          }
        }
        break;
      }
      case 'pulse': {
        if (want && ws.cooldown <= 0 && ws.burstLeft === 0 && this._useAmmo(i, def.burst)) {
          ws.cooldown = def.fireRate;
          ws.burstLeft = def.burst;
          ws.burstTimer = 0;
        }
        if (ws.burstLeft > 0) {
          ws.burstTimer -= dt;
          if (ws.burstTimer <= 0) {
            ws.burstLeft--;
            ws.burstTimer = 0.08;
            this._fireProjectile('pulse', def, muzzle, dir);
            fireFx(0.5);
          }
        }
        break;
      }
      case 'beam': {
        if (want && !ws.reloading && ws.ammo > 0) {
          ws.ammo = Math.max(0, ws.ammo - def.drain * dt);
          if (!ws.beam) {
            ws.beam = this._createBeamMesh(def.color, 0.16, 0.42);
            ws.loop = audio.loop('beamLoop');
            audio.play('beamStart', { throttle: 0.2 });
          }
          ws.recoil = 0.25;
          this.reticleSpread = Math.max(this.reticleSpread, 16);
          this._updatePlayerBeam(def, ws, muzzle, dir, dt);
          if (ws.ammo <= 0) this._startReload(i);
        } else {
          if (want && ws.reloading && ws.noAmmoSE <= 0) { audio.play('noAmmo', { throttle: 0.3 }); ws.noAmmoSE = 0.6; }
          if (ws.beam || ws.loop) this._stopLoops(ws);
        }
        break;
      }
      case 'flame': {
        if (want && !ws.reloading && ws.ammo > 0) {
          ws.ammo = Math.max(0, ws.ammo - def.drain * dt);
          if (!ws.loop) ws.loop = audio.loop('flameLoop');
          if (ws.cooldown <= 0) {
            ws.cooldown = def.fireRate;
            for (let k = 0; k < 2; k++) this._spawnFlame(def, muzzle, dir);
          }
          if (ws.ammo <= 0) this._startReload(i);
        } else if (ws.loop) {
          ws.loop.stop();
          ws.loop = null;
        }
        break;
      }
      case 'rail': {
        if (want && ws.cooldown <= 0 && !ws.reloading) {
          if (!ws.charging) {
            if (ws.ammo < 1) { this._useAmmo(i); break; }
            ws.charging = true;
            ws.charge = 0;
            audio.play('railCharge', { throttle: 0.1 });
          }
          ws.charge = Math.min(1, ws.charge + dt / def.chargeTime);
          if (Math.random() < 0.7) {
            const off = new THREE.Vector3((Math.random() - 0.5) * 2, (Math.random() - 0.5) * 2, (Math.random() - 0.5) * 2);
            this.px.glow.spawn(muzzle.clone().add(off), off.multiplyScalar(-3), def.color, 0.06, 0.3, { intensity: 3 });
          }
        } else if (ws.charging) {
          ws.charging = false;
          if (ws.charge >= 1 && this._useAmmo(i)) {
            ws.cooldown = def.fireRate;
            this._fireRail(def, muzzle, dir);
            fireFx(1.2);
            audio.play('fireRailBeam', { throttle: 0.05 });
          }
          ws.charge = 0;
        }
        break;
      }
      case 'missile': {
        if (want && ws.cooldown <= 0 && this._useAmmo(i, def.count)) {
          ws.cooldown = def.fireRate;
          fireFx(0.6);
          const target = this.lock.target || this._nearestTargetToRay(muzzle, dir);
          const { right } = this._camBasis();
          for (let k = 0; k < def.count; k++) {
            const side = (k - (def.count - 1) / 2) * 0.9;
            const d0 = dir.clone().multiplyScalar(6).addScaledVector(right, side * 4).add(new THREE.Vector3(0, 5 + Math.random() * 2, 0));
            setTimeout(() => {
              if (this.state === 'playing') this._fireProjectile('missile', def, muzzle.clone(), d0.clone().normalize(), { vel: d0, target });
            }, k * 80);
          }
        }
        break;
      }
      case 'shotgun': {
        if (want && ws.cooldown <= 0 && this._useAmmo(i)) {
          ws.cooldown = def.fireRate;
          for (let k = 0; k < def.pellets; k++) {
            const s = def.spread * 2;
            const d = dir.clone().add(new THREE.Vector3((Math.random() - 0.5) * s, (Math.random() - 0.5) * s, (Math.random() - 0.5) * s)).normalize();
            this._fireProjectile('shotgun', def, muzzle, d);
          }
          fireFx(1);
          for (let k = 0; k < 5; k++) this.px.smokePuff(muzzle.clone(), 0x9a9aa0, 0.25, 0.7, dir.clone().multiplyScalar(5).add(new THREE.Vector3((Math.random() - 0.5) * 2, Math.random(), (Math.random() - 0.5) * 2)));
          setTimeout(() => audio.play('shotgunPump', { throttle: 0.1 }), 380);
        }
        break;
      }
      case 'mortar': {
        if (want && ws.cooldown <= 0 && this._useAmmo(i)) {
          ws.cooldown = def.fireRate;
          // 照準点へ高い弧で落ちる初速を計算
          const target = aim.point.clone();
          const flat = Math.hypot(target.x - muzzle.x, target.z - muzzle.z);
          if (flat < 8) target.add(dir.clone().setY(0).normalize().multiplyScalar(8 - flat));
          if (target.y < 0) target.y = 0;
          const T = THREE.MathUtils.clamp(flat / 22, 1.2, 2.4);
          const g = 18;
          const v = target.clone().sub(muzzle).divideScalar(T).add(new THREE.Vector3(0, 0.5 * g * T, 0));
          this._fireProjectile('mortar', def, muzzle, v.clone().normalize(), { vel: v, gravity: g });
          fireFx(0.8);
          this.px.ring(target, 4.5, 0x40c0ff, T);
        }
        break;
      }
      case 'melee': {
        this._runMelee(def, ws, i, want, arm, dt);
        break;
      }
      default: {
        if (want && ws.cooldown <= 0 && this._useAmmo(i)) {
          ws.cooldown = def.fireRate;
          this._fireProjectile(def.behavior, def, muzzle, dir);
          fireFx(1);
        }
      }
    }
  },

  // =========================================================================
  // 近接攻撃
  // =========================================================================
  _runMelee(def, ws, i, want, arm, dt) {
    const p = this.player;
    if (!ws.melee && want && ws.cooldown <= 0 && !p.dodge) {
      if (def.mag && !this._useAmmo(i)) return;
      ws.cooldown = def.fireRate;
      // ロック中の敵（または正面の敵）へ踏み込む
      let target = this.lock.target;
      if (!target) target = this._nearestTargetToRay(p.pos.clone().add(new THREE.Vector3(0, 2, 0)), this._camBasis().forward, 0.6);
      let lungeDir = this._camBasis().forward;
      let dist = 1.5;
      if (target) {
        const tp = this._targetPos(target);
        const d = tp.clone().sub(p.pos).setY(0);
        const len = d.length();
        if (len < def.lunge + def.range) {
          lungeDir = d.normalize();
          dist = Math.max(0, Math.min(def.lunge, len - def.range * 0.6));
          p.yaw = Math.atan2(-lungeDir.x, -lungeDir.z);
        }
      }
      p.lunge = { dir: lungeDir.clone(), dist, t: 0, dur: def.hitTime + 0.04 };
      ws.melee = { t: 0, def, hit: false };
      audio.play(def.fireSE, { throttle: 0.05 });
      if (def.melee !== 'pile') audio.play('dodge', { throttle: 0.1, vol: 0.5 });
    }
    if (!ws.melee) return;
    const m = ws.melee;
    m.t += dt;
    const k = m.t / (def.hitTime + 0.25);
    // 腕のモーション
    if (arm) {
      if (def.melee === 'blade') {
        const sw = THREE.MathUtils.clamp(m.t / def.hitTime, 0, 1);
        arm.rotation.set(-0.3, 1.3 - sw * 2.6, 0);
      } else if (def.melee === 'pile') {
        arm.position.z = m.t < def.hitTime ? 0.4 : -0.6 * Math.max(0, 1 - (m.t - def.hitTime) * 4);
      } else {
        const sw = THREE.MathUtils.clamp(m.t / def.hitTime, 0, 1);
        arm.rotation.set(-1.9 + sw * 2.5, 0, 0);
      }
    }
    if (!m.hit && m.t >= def.hitTime) {
      m.hit = true;
      this._meleeHit(def);
    }
    if (k >= 1) {
      ws.melee = null;
      if (arm) { arm.rotation.set(0, 0, 0); arm.position.z = 0; }
    }
  },

  _meleeHit(def) {
    const p = this.player;
    const fwd = new THREE.Vector3(-Math.sin(p.yaw), 0, -Math.cos(p.yaw));
    const chest = p.pos.clone().add(new THREE.Vector3(0, 1.8, 0));
    const center = def.melee === 'hammer' ? p.pos.clone().addScaledVector(fwd, 3.2) : chest;
    const inArc = (pos, extra = 0) => {
      const d = pos.clone().sub(def.melee === 'hammer' ? center : chest);
      const flat = Math.hypot(d.x, d.z);
      if (flat > def.range + extra || Math.abs(d.y) > 4.5) return false;
      if (def.arc >= 6) return true;
      const ang = Math.acos(THREE.MathUtils.clamp((d.x * fwd.x + d.z * fwd.z) / Math.max(0.001, flat), -1, 1));
      return ang <= def.arc / 2 || flat < 1.6;
    };

    let hits = 0;
    for (const e of [...this.enemies]) {
      if (inArc(e.mesh.position, 1.4)) {
        hits++;
        const kb = e.mesh.position.clone().sub(p.pos).setY(0).normalize().multiplyScalar(def.knockback * 0.7);
        if (def.melee === 'hammer') kb.y = def.knockback * 0.6;
        e.vel.add(kb);
        this._damageEnemy(e, def.damage, { pos: e.mesh.position, normal: kb.clone().normalize(), melee: true });
      }
    }
    if (this.boss && this.boss.state !== 'dying') {
      for (const hp of this.boss.worldHits) {
        if (inArc(hp, this.boss.hitR)) {
          hits++;
          this._damageBoss(def.damage, hp.clone().lerp(chest, 0.5));
          break;
        }
      }
    }
    // 斬撃・叩きつけは敵弾を弾く
    if (def.melee !== 'pile') {
      for (let i = this.enemyBullets.length - 1; i >= 0; i--) {
        const b = this.enemyBullets[i];
        if (inArc(b.mesh.position, 1.0)) {
          this.px.spark(b.mesh.position, b.vel.clone().normalize().negate(), 0xffffff, 10, 12, 0.8);
          audio.play('deflect', { throttle: 0.05, pos: b.mesh.position });
          this.scene.remove(b.mesh);
          this.enemyBullets.splice(i, 1);
        }
      }
    }

    // 演出
    const color = def.color;
    if (def.melee === 'blade') {
      this._slashArc(chest, p.yaw, def.range, def.arc, color, false);
      if (hits) audio.play('meleeHit', { throttle: 0.05 });
      this.cam.shake = Math.max(this.cam.shake, hits ? 0.45 : 0.15);
    } else if (def.melee === 'pile') {
      const tip = chest.clone().addScaledVector(fwd, 3.2);
      this.px.spark(tip, fwd, 0xffe0a0, 30, 22, 0.5);
      this.px.flash(tip, 0xffffff, 1.2, 0.1);
      this.px.light(tip, 0xffc070, 50, 0.15);
      this.px.smokePuff(tip, 0x777777, 0.6, 1.0);
      audio.play('pileFire', { throttle: 0.05 });
      if (hits) audio.play('hitMetalHeavy', { throttle: 0.05 });
      this.cam.shake = Math.max(this.cam.shake, 0.8);
      this.player.knock.addScaledVector(fwd, -6); // 反動
    } else {
      const impact = center.clone().setY(0.2);
      this.px.ring(impact, def.range * 1.4, 0x8fb6ff, 0.5);
      this.px.explosion(impact, 0x8fb6ff, 0.8, { noDebris: false });
      audio.play('hammerHit', { throttle: 0.05 });
      audio.play('land', { throttle: 0.05 });
      this.cam.shake = Math.max(this.cam.shake, 0.9);
    }
    if (hits) this._hitMarker(false);
  },

  /** 斬撃の軌跡（光る弧）を一瞬表示 */
  _slashArc(pos, yaw, radius, arc, color, vertical) {
    const geo = new THREE.RingGeometry(radius * 0.55, radius, 32, 1, -arc / 2, arc);
    const mat = new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(2.5), transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
    const m = new THREE.Mesh(geo, mat);
    m.position.copy(pos);
    m.rotation.set(vertical ? 0 : -Math.PI / 2, 0, 0);
    const g = new THREE.Group();
    g.add(m);
    g.position.copy(pos);
    m.position.set(0, 0, 0);
    g.rotation.y = yaw + Math.PI / 2;
    this.scene.add(g);
    this.trails.push({ group: g, mat, geo, life: 0.22, max: 0.22, slash: true });
  },

  // =========================================================================
  // 照準・弾道
  // =========================================================================
  _aimPoint() {
    if (this.lock.target) return { point: this._targetPos(this.lock.target).clone(), hit: true };
    const o = this.camera.position;
    const d = this.cam.look.clone().sub(o).normalize();
    let best = 230, hit = false;
    for (const e of this.enemies) {
      const t = raySphere(o, d, e.mesh.position, 1.6);
      if (t < best) { best = t; hit = true; }
    }
    if (this.boss && this.boss.state !== 'dying') {
      for (const hp of this.boss.worldHits) {
        const t = raySphere(o, d, hp, this.boss.hitR);
        if (t < best) { best = t; hit = true; }
      }
    }
    return { point: o.clone().addScaledVector(d, best), hit };
  },

  _nearestTargetToRay(o, d, maxAng = 0.5) {
    let best = null, bestAng = maxAng;
    for (const t of this._allTargets()) {
      const ang = this._targetPos(t).clone().sub(o).angleTo(d);
      if (ang < bestAng) { bestAng = ang; best = t; }
    }
    return best;
  },

  _fireProjectile(kind, def, pos, dir, opt = {}) {
    const g = new THREE.Group();
    const glowMat = (c, o = 1, mul = 2.5) => this.glowMat(c, o, mul);
    switch (kind) {
      case 'shell':
      case 'mortar': {
        const body = new THREE.Mesh(this.geo.box, this.solidMat(0x2a2e35, 0.9, 0.3));
        body.scale.set(0.38, 0.38, 0.85);
        const tail = new THREE.Mesh(this.geo.sphere, glowMat(0xff8a00, 0.9, 3));
        tail.scale.set(0.3, 0.3, 0.5);
        tail.position.z = -0.45;
        g.add(body, tail);
        break;
      }
      case 'gatling':
      case 'vulcan': {
        const t = new THREE.Mesh(this.geo.box, glowMat(def.color, 1, 3));
        t.scale.set(0.06, 0.06, kind === 'vulcan' ? 1.0 : 1.6);
        g.add(t);
        break;
      }
      case 'pulse': {
        const core = new THREE.Mesh(this.geo.box, glowMat(0xffffff, 1, 3));
        core.scale.set(0.08, 0.08, 2.2);
        const outer = new THREE.Mesh(this.geo.box, glowMat(def.color, 0.7, 2.5));
        outer.scale.set(0.22, 0.22, 2.6);
        g.add(core, outer);
        break;
      }
      case 'missile': {
        const body = new THREE.Mesh(this.geo.box, this.solidMat(0xdddddd, 0.6, 0.4));
        body.scale.set(0.18, 0.18, 0.7);
        const tip = new THREE.Mesh(this.geo.box, this.solidMat(0xd32f2f, 0.5, 0.4, 0xff1744, 1));
        tip.scale.set(0.16, 0.16, 0.2);
        tip.position.z = 0.4;
        const fire = new THREE.Mesh(this.geo.sphere, glowMat(0xffa040, 1, 3.5));
        fire.scale.set(0.14, 0.14, 0.32);
        fire.position.z = -0.45;
        g.add(body, tip, fire);
        break;
      }
      case 'plasma': {
        const core = new THREE.Mesh(this.geo.sphere, glowMat(0xeaffef, 1, 3));
        core.scale.setScalar(0.35);
        const outer = new THREE.Mesh(this.geo.sphere, glowMat(def.color, 0.5, 2));
        outer.scale.setScalar(0.85);
        g.add(core, outer);
        g.userData.pulse = outer;
        break;
      }
      case 'shotgun': {
        const t = new THREE.Mesh(this.geo.box, glowMat(def.color, 1, 3));
        t.scale.set(0.1, 0.1, 0.7);
        g.add(t);
        break;
      }
      case 'gravity': {
        const core = new THREE.Mesh(this.geo.sphere, new THREE.MeshBasicMaterial({ color: 0x050008 }));
        core.scale.setScalar(0.55);
        const ring = new THREE.Mesh(this.geo.torus, glowMat(def.color, 1, 2.5));
        ring.scale.setScalar(0.9);
        const aura = new THREE.Mesh(this.geo.sphere, glowMat(def.color, 0.3, 1.5));
        aura.scale.setScalar(1.1);
        g.add(core, ring, aura);
        g.userData.ring = ring;
        break;
      }
      default: {
        const t = new THREE.Mesh(this.geo.box, glowMat(0x7dff9a, 1, 2.5));
        t.scale.set(0.12, 0.12, 1.2);
        g.add(t);
      }
    }
    g.position.copy(pos);
    g.lookAt(pos.clone().add(dir));
    this.scene.add(g);
    this.bullets.push({
      mesh: g, kind, def,
      vel: opt.vel ? opt.vel.clone() : dir.clone().multiplyScalar(def.speed || 80),
      life: def.life || (kind === 'missile' ? 5.5 : kind === 'gravity' ? 2.4 : kind === 'mortar' ? 5.5 : 4.2),
      damage: opt.damage ?? def.damage,
      power: def.power ?? 1,
      gravity: opt.gravity ?? (kind === 'shell' ? 4.5 : 0),
      target: opt.target || null,
      trail: 0,
      owner: opt.owner || 'player'
    });
  },

  _spawnFlame(def, pos, dir) {
    const m = new THREE.Mesh(this.geo.sphere, this.glowMat(Math.random() < 0.5 ? 0xff6a1a : 0xffb347, 0.8, 2.5));
    m.position.copy(pos);
    m.scale.setScalar(0.25);
    this.scene.add(m);
    const v = dir.clone().add(new THREE.Vector3((Math.random() - 0.5) * 0.22, (Math.random() - 0.5) * 0.22, (Math.random() - 0.5) * 0.22)).normalize().multiplyScalar(def.speed * (0.8 + Math.random() * 0.4));
    this.flames.push({ mesh: m, vel: v, life: def.life, max: def.life, def, hit: new Set() });
  },

  _createBeamMesh(color, coreR, outerR) {
    const g = new THREE.Group();
    const core = new THREE.Mesh(this.geo.cyl, this.glowMat(0xffffff, 1, 3));
    core.scale.set(coreR, coreR, 1);
    const outer = new THREE.Mesh(this.geo.cyl, this.glowMat(color, 0.5, 2.5));
    outer.scale.set(outerR, outerR, 1);
    core.position.z = outer.position.z = 0.5;
    g.add(core, outer);
    g.userData = { core, outer, coreR, outerR };
    this.scene.add(g);
    return g;
  },

  _setBeam(g, from, to, flicker = true) {
    g.position.copy(from);
    g.lookAt(to);
    g.scale.set(1, 1, Math.max(0.01, from.distanceTo(to)));
    if (flicker) {
      const f = 0.85 + Math.random() * 0.3;
      g.userData.core.scale.set(g.userData.coreR * f, g.userData.coreR * f, 1);
      g.userData.outer.scale.set(g.userData.outerR * f, g.userData.outerR * f, 1);
    }
  },

  _raycastWorld(o, d, maxDist) {
    let best = { t: maxDist, enemy: null, boss: false, wall: false };
    for (const e of this.enemies) {
      const t = raySphere(o, d, e.mesh.position, 1.5);
      if (t < best.t) best = { t, enemy: e, boss: false, wall: false };
    }
    if (this.boss && this.boss.state !== 'dying') {
      for (const hp of this.boss.worldHits) {
        const t = raySphere(o, d, hp, this.boss.hitR);
        if (t < best.t) best = { t, enemy: null, boss: true, wall: false };
      }
    }
    for (const ob of this.world.obstacles) {
      const [mn, mx] = obstacleBox(ob);
      const t = rayAABB(o, d, mn, mx);
      if (t < best.t) best = { t, enemy: null, boss: false, wall: true };
    }
    if (d.y < -0.001) {
      const t = -o.y / d.y;
      const hit = o.clone().addScaledVector(d, t);
      if (t > 0 && t < best.t && Math.abs(hit.x) < HW && Math.abs(hit.z) < HL) best = { t, enemy: null, boss: false, wall: true };
    }
    return best;
  },

  /** 線上の敵弾をすべて消す（ビーム・レール） */
  _clearBulletsOnLine(o, d, len, r = 1.2) {
    for (let i = this.enemyBullets.length - 1; i >= 0; i--) {
      const b = this.enemyBullets[i];
      if (raySphere(o, d, b.mesh.position, r + b.size * 0.4) < len) {
        this.px.hitEnergy(b.mesh.position, b.color, 0.6);
        audio.play('bulletClash', { throttle: 0.08, pos: b.mesh.position });
        this.scene.remove(b.mesh);
        this.enemyBullets.splice(i, 1);
      }
    }
  },

  _updatePlayerBeam(def, ws, muzzle, dir, dt) {
    const hit = this._raycastWorld(muzzle, dir, def.range);
    const end = muzzle.clone().addScaledVector(dir, hit.t);
    this._setBeam(ws.beam, muzzle, end);
    this._clearBulletsOnLine(muzzle, dir, hit.t, 0.8);
    if (hit.enemy) this._damageEnemy(hit.enemy, def.dps * dt, { silent: true, pos: end, energy: def.color, small: true });
    if (hit.boss) this._damageBoss(def.dps * dt, end, true);
    if (hit.enemy || hit.boss || hit.wall) {
      if (Math.random() < 0.6) this.px.spark(end, dir.clone().negate(), def.color, 2, 8, 1);
      if (Math.random() < 0.3) this.px.flash(end, def.color, 0.5, 0.06);
      if (hit.enemy || hit.boss) {
        audio.play('hitLaser', { throttle: 0.15, pos: end });
        if (Math.random() < dt * 8) this._hitMarker(false);
      }
    }
  },

  _fireRail(def, muzzle, dir) {
    let wallT = def.range;
    for (const ob of this.world.obstacles) {
      const [mn, mx] = obstacleBox(ob);
      wallT = Math.min(wallT, rayAABB(muzzle, dir, mn, mx));
    }
    const end = muzzle.clone().addScaledVector(dir, wallT);
    this._clearBulletsOnLine(muzzle, dir, wallT, 1.6);
    let hits = 0;
    for (const e of [...this.enemies]) {
      if (raySphere(muzzle, dir, e.mesh.position, 1.8) < wallT) {
        hits++;
        e.vel.addScaledVector(dir, def.knockback * 0.5);
        this._damageEnemy(e, def.damage, { pos: e.mesh.position.clone(), energy: def.color });
      }
    }
    if (this.boss && this.boss.state !== 'dying') {
      for (const hp of this.boss.worldHits) {
        if (raySphere(muzzle, dir, hp, this.boss.hitR) < wallT) { this._damageBoss(def.damage, hp); hits++; break; }
      }
    }
    const beam = this._createBeamMesh(def.color, 0.14, 0.6);
    this._setBeam(beam, muzzle, end, false);
    this.trails.push({ group: beam, life: 0.55, max: 0.55 });
    for (let t = 0; t < wallT; t += 2.5) {
      const p = muzzle.clone().addScaledVector(dir, t);
      this.px.glow.spawn(p, new THREE.Vector3((Math.random() - 0.5) * 2, (Math.random() - 0.5) * 2, (Math.random() - 0.5) * 2), def.color, 0.08, 0.6, { intensity: 3, drag: 0.05 });
    }
    this.px.explosion(end, def.color, 0.6, { noDebris: true });
    if (hits) this._hitMarker(false);
  },

  _updateBullets(dt) {
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      b.life -= dt;
      if (b.gravity) b.vel.y -= b.gravity * dt;
      if (b.kind === 'missile') {
        const sp = b.vel.length();
        const want = Math.min(b.def.speed, sp + 30 * dt);
        if (b.target && b.target.hp > 0 && !b.target.dying) {
          const desired = this._targetPos(b.target).clone().sub(b.mesh.position).normalize().multiplyScalar(want);
          b.vel.lerp(desired, Math.min(1, dt * 2.4));
        } else b.vel.setLength(want);
        b.trail -= dt;
        if (b.trail <= 0) {
          b.trail = 0.03;
          this.px.smokePuff(b.mesh.position.clone(), 0x9aa0a8, 0.18, 0.8, new THREE.Vector3(0, 0.4, 0));
          this.px.glow.spawn(b.mesh.position, new THREE.Vector3(), 0xffa040, 0.12, 0.08, { intensity: 3 });
        }
      }
      if (b.kind === 'plasma') {
        if (this.lock.target) {
          const desired = this._targetPos(this.lock.target).clone().sub(b.mesh.position).normalize().multiplyScalar(b.def.speed);
          b.vel.lerp(desired, Math.min(1, dt * 0.9));
        }
        b.mesh.userData.pulse.scale.setScalar(0.85 + Math.sin(performance.now() * 0.02) * 0.12);
        if (Math.random() < 0.5) this.px.glow.spawn(b.mesh.position, new THREE.Vector3(), b.def.color, 0.25, 0.25, { intensity: 1.5 });
      }
      if (b.kind === 'gravity') b.mesh.userData.ring.rotation.x += dt * 8;
      if (b.kind === 'shell' || b.kind === 'mortar') {
        b.trail -= dt;
        if (b.trail <= 0) {
          b.trail = 0.035;
          this.px.smokePuff(b.mesh.position.clone(), 0x6a6f78, 0.2, 0.7, new THREE.Vector3(0, 0.3, 0));
        }
      }

      b.mesh.position.addScaledVector(b.vel, dt);
      if (b.kind !== 'plasma' && b.kind !== 'gravity') b.mesh.lookAt(b.mesh.position.clone().add(b.vel));
      const pos = b.mesh.position;

      // ---- 敵弾との相殺（出力の比較） ----
      let destroyed = false;
      for (let j = this.enemyBullets.length - 1; j >= 0; j--) {
        const eb = this.enemyBullets[j];
        const r = 0.7 + eb.size * 0.45 + (b.kind === 'gravity' ? 1.5 : 0);
        if (pos.distanceToSquared(eb.mesh.position) > r * r) continue;
        const contact = pos.clone().lerp(eb.mesh.position, 0.5);
        this.px.spark(contact, b.vel.clone().normalize().negate(), 0xffffff, 8, 10, 1);
        this.px.flash(contact, eb.color, 0.6, 0.08);
        audio.play('bulletClash', { throttle: 0.06, pos: contact });
        if (b.power >= eb.power) {
          b.power -= eb.power;
          this.scene.remove(eb.mesh);
          this.enemyBullets.splice(j, 1);
          if (b.power <= 0.001) { destroyed = true; break; }
        } else {
          eb.power -= b.power;
          eb.outer.scale.multiplyScalar(0.8);
          destroyed = true;
          break;
        }
      }
      if (destroyed) {
        this.scene.remove(b.mesh);
        this.bullets.splice(i, 1);
        continue;
      }

      let hitEnemy = null, hitBoss = false, hitWall = false;
      const er = b.kind === 'plasma' || b.kind === 'gravity' ? 4 : 2.6;
      for (const e of this.enemies) {
        if (this.wasm.distSq3D(pos.x, pos.y, pos.z, e.mesh.position.x, e.mesh.position.y, e.mesh.position.z) < er) { hitEnemy = e; break; }
      }
      if (!hitEnemy && this.boss && this.boss.state !== 'dying') {
        for (const hp of this.boss.worldHits) if (pos.distanceTo(hp) < this.boss.hitR) { hitBoss = true; break; }
      }
      if (!hitEnemy && !hitBoss) {
        for (const ob of this.world.obstacles) {
          if (pos.x > ob.minX && pos.x < ob.maxX && pos.z > ob.minZ && pos.z < ob.maxZ && pos.y > 0 && pos.y < ob.maxY) { hitWall = true; break; }
        }
        if (pos.y < 0 && Math.abs(pos.x) < HW && Math.abs(pos.z) < HL) hitWall = true;
      }
      const expired = b.life <= 0 || pos.y < -15;
      if (hitEnemy || hitBoss || hitWall || expired) {
        this._bulletImpact(b, hitEnemy, hitBoss, hitWall, expired);
        this.scene.remove(b.mesh);
        this.bullets.splice(i, 1);
      }
    }
  },

  _bulletImpact(b, enemy, boss, wall, expired) {
    const pos = b.mesh.position.clone();
    const def = b.def;
    const normal = b.vel.clone().normalize().negate();
    switch (b.kind) {
      case 'shell':
      case 'mortar':
        if (expired && !wall) break;
        this.px.explosion(pos, 0xff8a30, b.kind === 'mortar' ? 1.6 : 1.3);
        audio.play(b.kind === 'mortar' ? 'explosionBig' : 'explosionMid', { pos, throttle: 0.05 });
        this._splash(pos, def.splash, def.damage, def.knockback);
        break;
      case 'missile':
        if (expired && !wall && !enemy && !boss) break;
        this.px.explosion(pos, 0xff6040, 0.7);
        audio.play('explosionSmall', { pos, throttle: 0.04 });
        this._splash(pos, def.splash, def.damage, def.knockback);
        break;
      case 'plasma':
        this.px.explosion(pos, def.color, 1.0, { noDebris: true });
        audio.play('explosionSmall', { pos, throttle: 0.05, rate: 1.3 });
        this._splash(pos, def.splash, def.damage, def.knockback);
        break;
      case 'gravity':
        this._createSingularity(pos, def);
        break;
      default: {
        if (expired) break;
        if (enemy) {
          enemy.vel.addScaledVector(b.vel.clone().normalize(), (def.knockback || 1) * 0.6);
          this._damageEnemy(enemy, b.damage, { pos, normal, energy: b.kind === 'pulse' ? def.color : null, small: b.kind === 'gatling' || b.kind === 'vulcan' || b.kind === 'shotgun' });
        }
        if (boss) this._damageBoss(b.damage, pos);
        if (wall) {
          this.px.spark(pos, normal, 0xffd27a, 5, 9, 0.9);
          this.px.flash(pos, 0xffd27a, 0.25, 0.05);
          audio.play('ricochet', { pos, throttle: 0.12 });
        }
      }
    }
  },

  _createSingularity(pos, def) {
    const g = new THREE.Group();
    const core = new THREE.Mesh(this.geo.sphere, new THREE.MeshBasicMaterial({ color: 0x050008 }));
    core.scale.setScalar(1.2);
    const aura = new THREE.Mesh(this.geo.sphere, this.glowMat(def.color, 0.35, 1.5));
    aura.scale.setScalar(2.4);
    const ring = new THREE.Mesh(this.geo.torus, this.glowMat(def.color, 0.9, 2.5));
    ring.scale.setScalar(3);
    ring.rotation.x = Math.PI / 2;
    g.add(core, aura, ring);
    g.position.copy(pos);
    this.scene.add(g);
    this.singularities.push({ group: g, ring, aura, life: 1.3, max: 1.3, def });
    audio.play('fireGravity', { pos, throttle: 0.1, rate: 0.7 });
  },

  _updateSingularities(dt) {
    for (let i = this.singularities.length - 1; i >= 0; i--) {
      const s = this.singularities[i];
      s.life -= dt;
      const pos = s.group.position;
      s.ring.rotation.z += dt * 6;
      s.ring.scale.setScalar(3 * (1 - (1 - s.life / s.max) * 0.6));
      s.aura.scale.setScalar(2.4 + Math.sin(performance.now() * 0.03) * 0.3);
      for (const e of this.enemies) {
        const d = pos.clone().sub(e.mesh.position);
        const dist = d.length();
        if (dist < s.def.pullRadius && dist > 0.5) e.vel.addScaledVector(d.normalize(), 14 * dt);
      }
      // 敵弾も吸い込んで消す
      for (let j = this.enemyBullets.length - 1; j >= 0; j--) {
        const b = this.enemyBullets[j];
        const d = pos.clone().sub(b.mesh.position);
        const dist = d.length();
        if (dist < s.def.pullRadius) b.vel.lerp(d.normalize().multiplyScalar(20), Math.min(1, dt * 4));
        if (dist < 1.5) { this.scene.remove(b.mesh); this.enemyBullets.splice(j, 1); }
      }
      const off = new THREE.Vector3((Math.random() - 0.5), (Math.random() - 0.5), (Math.random() - 0.5)).normalize().multiplyScalar(6);
      this.px.glow.spawn(pos.clone().add(off), off.clone().multiplyScalar(-1.6), s.def.color, 0.1, 0.4, { intensity: 3 });
      if (s.life <= 0) {
        this.px.explosion(pos, s.def.color, 1.8, { noDebris: true });
        audio.play('gravityImplode', { pos, throttle: 0.05 });
        this._splash(pos, s.def.splash, s.def.damage, 0);
        this.scene.remove(s.group);
        this.singularities.splice(i, 1);
      }
    }
  },

  _updateFlames(dt) {
    for (let i = this.flames.length - 1; i >= 0; i--) {
      const f = this.flames[i];
      f.life -= dt;
      f.vel.multiplyScalar(Math.pow(0.4, dt));
      f.vel.y += 2.5 * dt;
      f.mesh.position.addScaledVector(f.vel, dt);
      f.mesh.scale.setScalar(0.25 + (1 - f.life / f.max) * 1.6);
      for (const e of this.enemies) {
        if (f.hit.has(e)) continue;
        if (f.mesh.position.distanceTo(e.mesh.position) < 2.2) {
          f.hit.add(e);
          if (e.burn <= 0) audio.play('burn', { pos: e.mesh.position, throttle: 0.3, vol: 0.5 });
          e.burn = 3.0;
          this._damageEnemy(e, f.def.damage, { silent: true });
        }
      }
      // 火炎は敵弾を少し焼き消す
      for (let j = this.enemyBullets.length - 1; j >= 0; j--) {
        const b = this.enemyBullets[j];
        if (f.mesh.position.distanceTo(b.mesh.position) < 1.2) {
          b.power -= 0.15;
          if (b.power <= 0) { this.px.flash(b.mesh.position, 0xff8a30, 0.4, 0.06); this.scene.remove(b.mesh); this.enemyBullets.splice(j, 1); }
        }
      }
      if (this.boss && this.boss.state !== 'dying' && !f.hit.has(this.boss)) {
        for (const hp of this.boss.worldHits) {
          if (f.mesh.position.distanceTo(hp) < this.boss.hitR + 1) {
            f.hit.add(this.boss);
            this._damageBoss(f.def.damage * 1.5, f.mesh.position.clone(), true);
            break;
          }
        }
      }
      if (f.life <= 0) {
        this.scene.remove(f.mesh);
        this.flames.splice(i, 1);
      }
    }
  },

  _splash(pos, radius, damage, knock) {
    let hit = false;
    for (const e of [...this.enemies]) {
      const d = e.mesh.position.distanceTo(pos);
      if (d < radius + 1.2) {
        hit = true;
        const f = 1 - Math.min(1, d / (radius + 1.2)) * 0.6;
        if (knock) e.vel.addScaledVector(e.mesh.position.clone().sub(pos).normalize(), knock * 0.6);
        this._damageEnemy(e, damage * f, { silent: true, noFx: true });
      }
    }
    if (this.boss && this.boss.state !== 'dying') {
      for (const hp of this.boss.worldHits) {
        if (hp.distanceTo(pos) < radius + this.boss.hitR) { this._damageBoss(damage, pos, true); hit = true; break; }
      }
    }
    if (hit) this._hitMarker(false);
  },

  // =========================================================================
  // 照準UI
  // =========================================================================
  _renderWeaponSlotsHUD() {
    const box = $('weapon-slots');
    if (!box) return;
    box.innerHTML = '';
    this.stats.slots.forEach((s, i) => {
      const div = document.createElement('div');
      div.className = `ws${i === this.activeSlot ? ' active' : ''}${s.def.behavior === 'none' ? ' empty' : ''}`;
      div.innerHTML = `<span class="ws-key">${i + 1}</span><span class="ws-name">${s.label}：${s.def.behavior === 'none' ? '未装備' : s.def.name}</span><span class="ws-ammo" id="ws-ammo-${i}"></span>`;
      box.appendChild(div);
    });
  },

  _hitMarker(kill) {
    const el = $('hitmarker');
    el.classList.remove('show', 'kill');
    void el.offsetWidth;
    el.classList.add('show');
    if (kill) el.classList.add('kill');
  },

  _updateReticle(dt, aim) {
    const p = this.player;
    const slot = this.stats.slots[this.activeSlot];
    const ws = this.weaponStates[this.activeSlot];
    const def = slot?.def;
    const ret = $('reticle');

    // 拡散：移動・反動・ガトリング回転で広がり、静止すると締まる
    const moving = Math.hypot(p.vel.x, p.vel.z);
    let base = 10 + moving * 1.2 + (this.ads ? -4 : 0);
    if (def && (def.behavior === 'gatling' || def.behavior === 'shotgun')) base += def.behavior === 'shotgun' ? 18 : 8 * (ws?.spin || 0);
    this.reticleSpread = THREE.MathUtils.lerp(this.reticleSpread, base, Math.min(1, dt * 8));
    ret.style.setProperty('--spread', `${Math.min(46, this.reticleSpread).toFixed(1)}px`);

    // 色：敵に重なると赤、近接射程内は琥珀
    let melee = false;
    if (def && def.behavior === 'melee') {
      const t = this.lock.target || this._nearestTargetToRay(p.pos.clone().add(new THREE.Vector3(0, 2, 0)), this._camBasis().forward, 0.6);
      if (t && this._targetPos(t).distanceTo(p.pos) < def.range + def.lunge) melee = true;
    }
    ret.classList.toggle('on-enemy', !!aim.hit && !melee);
    ret.classList.toggle('melee-range', melee);

    // 残弾アーク・EPアーク
    const ammoArc = $('arc-ammo');
    const epArc = $('arc-ep');
    if (!this._arcLen) this._arcLen = ammoArc.getTotalLength();
    const L = this._arcLen;
    ammoArc.style.strokeDasharray = `${L}`;
    epArc.style.strokeDasharray = `${L}`;
    epArc.style.strokeDashoffset = `${L * (1 - p.ep / p.maxEp)}`;
    let ratio = 1, text = '∞';
    const reloading = ws && ws.reloading;
    if (def && def.mag) {
      ratio = reloading ? ws.reloadT / def.reload : ws.ammo / def.mag;
      text = def.drain ? `${Math.ceil(ws.ammo)}%` : `${Math.ceil(ws.ammo)} / ${def.mag}`;
    }
    ammoArc.style.strokeDashoffset = `${L * (1 - ratio)}`;
    ammoArc.classList.toggle('reloading', !!reloading);
    ammoArc.classList.toggle('low', !reloading && def && def.mag && ws.ammo / def.mag < 0.25);
    $('ret-weapon').textContent = def ? (this.stats.isDualLinked && (slot.mount === 'rarm' || slot.mount === 'larm') ? `${def.short} ×2` : def.short) : '---';
    $('ret-ammo').textContent = reloading ? '----' : text;
    $('ret-reload').classList.toggle('hidden', !reloading);
    const charge = ws && ws.charging ? ws.charge : 0;
    $('charge-circle').style.strokeDashoffset = `${188.5 * (1 - charge)}`;

    // 左上スロットの残弾
    this.stats.slots.forEach((s, i) => {
      const el = $(`ws-ammo-${i}`);
      if (!el) return;
      const w = this.weaponStates[i];
      if (!s.def.mag) { el.textContent = s.def.behavior === 'none' ? '' : '∞'; el.classList.remove('low'); return; }
      el.textContent = w.reloading ? 'RELOAD' : s.def.drain ? `${Math.ceil(w.ammo)}%` : `${Math.ceil(w.ammo)}/${s.def.mag}`;
      el.classList.toggle('low', !w.reloading && w.ammo / s.def.mag < 0.25);
    });
    void lerpAngle;
  }
};
