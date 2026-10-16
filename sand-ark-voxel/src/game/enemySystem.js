import * as THREE from 'three';
import { createFloatingVoxelEnemy, createDropContainerModel } from '../voxelBuilder.js';
import { WEAPONS, getWeapon } from '../weapons.js';
import { pickDropPart, SLOT_LABELS } from '../partsData.js';
import { audio } from '../audio.js';
import { $, HW, HL, RED, ATTACK_HIT_SCALE, easeOutCubic, lerpAngle, disposeObject } from './util.js';

/** 敵タイプごとに装備しうるプレイヤー武器IDリスト */
const ENEMY_WEAPON_POOLS = {
  drone: ['w_cannon', 'w_gatling', 'w_pulse', 'w_shotgun', 'w_missile'],
  stunner: ['w_pulse', 'w_rail', 'w_beam', 'w_plasma'],
  burner: ['w_flame', 'w_cannon', 'w_missile', 'w_shotgun'],
  rammer: ['m_blade', 'm_hammer', 'm_pile', 'w_shotgun', 'w_gravity']
};

/**
 * 敵システム（プレイヤーの武器を装備した浮遊ボックス ＋ ドロップシステム）
 * 行動：接近（牽制射撃あり）→ 短い待機 → 予兆（コアが赤く発光）→ 武器別連射・突進攻撃 → 短硬直
 */
export const EnemySystem = {
  _pickEnemyWeapon(type) {
    const pool = ENEMY_WEAPON_POOLS[type] || ENEMY_WEAPON_POOLS.drone;
    const id = pool[Math.floor(Math.random() * pool.length)];
    return getWeapon(id) || WEAPONS[0];
  },

  _spawnEnemy(type, near) {
    const weaponDef = this._pickEnemyWeapon(type);
    const mesh = createFloatingVoxelEnemy(type, weaponDef);
    const side = Math.random() < 0.5 ? -1 : 1;
    const ref = this._livePlayerPos();
    const pos = near
      ? near.clone().add(new THREE.Vector3((Math.random() - 0.5) * 36, 3 + Math.random() * 7, (Math.random() - 0.5) * 36))
      : new THREE.Vector3(side * (HW + 34 + Math.random() * 26), 5 + Math.random() * 10, ref.z + (Math.random() - 0.5) * 110);
    mesh.position.copy(pos);
    mesh.scale.setScalar(0.01);
    this.scene.add(mesh);
    const maxHp = { drone: 260, stunner: 300, burner: 300, rammer: 380 }[type] * (1 + (this.stage.id - 1) * 0.25);
    const e = {
      mesh, type, weapon: weaponDef,
      hp: maxHp, maxHp, vel: new THREE.Vector3(),
      state: 'approach', timer: 0, spawnT: 0, anchor: new THREE.Vector3(),
      bob: Math.random() * 10, burn: 0, burnTick: 0,
      rushDir: null, hitPlayer: false, flash: 0,
      shotsLeft: 0, shotTimer: 0, aimDir: new THREE.Vector3(0, 0, 1), teleLine: null
    };
    this._pickAnchor(e);
    this.enemies.push(e);
    audio.play('enemySpawn', { pos, throttle: 0.08 });
    this.px.hitEnergy(pos, mesh.userData.baseCoreColor.getHex(), 1.6);
    this.px.ring(pos, 4.8, weaponDef.color || mesh.userData.baseCoreColor.getHex(), 0.45, pos.y);
  },

  /** 敵が狙う位置（大破中は残骸ではなく僚機・船上を狙う） */
  _livePlayerPos() {
    if (!this.player.dead) return this.player.pos;
    const al = this.allies.find((a) => a.state === 'alive');
    if (al) return al.mesh.position;
    return new THREE.Vector3(0, 0, 0);
  },

  /** 敵の標的選択：プレイヤーと生存NPCから、近いものを優先しつつ散らす */
  _pickEnemyTarget(e) {
    const cands = [];
    if (!this.player.dead) cands.push({ ally: null, d: e.mesh.position.distanceTo(this.player.pos) * 0.8 });
    for (const a of this.allies) if (a.state === 'alive') cands.push({ ally: a, d: e.mesh.position.distanceTo(a.mesh.position) * (0.9 + Math.random() * 0.5) });
    if (!cands.length) return { ally: null };
    cands.sort((x, y) => x.d - y.d);
    return cands[0];
  },

  _pickAnchor(e) {
    const ref = e.tgt && e.tgt.ally ? e.tgt.ally.mesh.position : this._livePlayerPos();
    const isClose = e.weapon.behavior === 'melee' || e.weapon.behavior === 'shotgun' || e.weapon.behavior === 'flame';
    const a = Math.random() * Math.PI * 2;
    const r = isClose ? (16 + Math.random() * 16) : (30 + Math.random() * 28);
    e.anchor.set(
      THREE.MathUtils.clamp(ref.x + Math.cos(a) * r, -(HW + 8), HW + 8),
      3.0 + Math.random() * 3.5,
      THREE.MathUtils.clamp(ref.z + Math.sin(a) * r, -(HL + 6), HL + 6)
    );
  },

  _updateEnemies(dt) {
    const p = this.player;
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      if (!this.enemies.includes(e)) continue;
      e.tgtT = (e.tgtT || 0) - dt;
      if (!e.tgt || e.tgtT <= 0 || (e.tgt.ally && e.tgt.ally.state !== 'alive')) { e.tgt = this._pickEnemyTarget(e); e.tgtT = 1.8 + Math.random() * 1.5; }
      const target = e.tgt.ally ? e.tgt.ally.mesh.position : this._livePlayerPos();
      const ud = e.mesh.userData;
      const pos = e.mesh.position;
      e.timer += dt;
      e.bob += dt;
      e.spawnT = Math.min(1, e.spawnT + dt * 2.0);
      e.flash = Math.max(0, e.flash - dt * 6);
      let scale = easeOutCubic(e.spawnT) * (1 + e.flash * 0.12);

      if (e.burn > 0) {
        e.burn -= dt;
        e.burnTick += dt;
        if (Math.random() < 0.35) this.px.glow.spawn(pos.clone().add(new THREE.Vector3((Math.random() - 0.5) * 1.5, 0, (Math.random() - 0.5) * 1.5)), new THREE.Vector3(0, 3, 0), 0xff6a1a, 0.25, 0.4, { intensity: 2, grow: 0.5 });
        if (e.burnTick > 0.4) {
          e.burnTick = 0;
          this._damageEnemy(e, 22, { silent: true, noFx: true });
          if (!this.enemies.includes(e)) continue;
        }
      }

      const toT = target.clone().add(new THREE.Vector3(0, 1.5, 0)).sub(pos);
      const aimNorm = toT.lengthSq() > 0.01 ? toT.clone().normalize() : new THREE.Vector3(0, 0, 1);
      let heat = 0;
      let maxSpeed = 3.2; // 動き自体は重厚で落ち着いた速度
      let desired = e.anchor.clone().sub(pos);
      desired.y += Math.sin(e.bob * 1.4) * 0.6;

      switch (e.state) {
        case 'approach':
          // 接近時間を短縮し、すぐ攻撃態勢へ入る
          if (desired.length() < 3.0 || e.timer > 2.0) {
            e.state = 'hover';
            e.timer = 0;
            e.hoverTime = 0.65 + Math.random() * 0.75; // 待機を大幅短縮し高頻度で攻撃
          }
          break;
        case 'hover':
          maxSpeed = 1.4;
          if (e.timer > e.hoverTime) {
            e.state = 'charge';
            e.timer = 0;
            e.aimDir.copy(aimNorm);
            audio.play('enemyCharge', { pos, throttle: 0.12 });
            // 攻撃予告ライン（全武器共通）：射線が赤く伸びて、狙いが一目で分かる
            e.teleLine = this._lineTelegraph();
          }
          break;
        case 'charge': {
          maxSpeed = 0.4;
          const dur = e.weapon.behavior === 'melee' ? 0.95 : e.weapon.behavior === 'rail' ? 1.05 : 0.95;
          heat = Math.min(1, e.timer / dur);
          e.aimDir.lerp(aimNorm, Math.min(1, dt * 5)).normalize();
          if (e.teleLine) {
            this._updateLineTelegraph(e.teleLine, pos, pos.clone().addScaledVector(e.aimDir, 90), heat, 1.7);
          }
          if (Math.random() < heat * 0.45) {
            this.px.glow.spawn(pos.clone().add(new THREE.Vector3((Math.random() - 0.5) * 2, (Math.random() - 0.5) * 2, (Math.random() - 0.5) * 2)), new THREE.Vector3(), 0xff2020, 0.08, 0.22, { intensity: 3 });
          }
          if (e.timer >= dur) {
            e.timer = 0;
            if (e.weapon.behavior === 'melee' || e.type === 'rammer' && e.weapon.behavior === 'none') {
              if (e.teleLine) { this._removeTelegraph(e.teleLine); e.teleLine = null; }
              e.state = 'rush';
              e.rushDir = aimNorm.clone();
              e.hitPlayer = false;
              audio.play('enemyRush', { pos, throttle: 0.08 });
            } else {
              this._startEnemyWeaponAttack(e, aimNorm);
            }
          }
          break;
        }
        case 'attack': {
          maxSpeed = 0.8;
          heat = 0.85;
          e.aimDir.lerp(aimNorm, Math.min(1, dt * 3.5)).normalize();
          if (e.teleLine) this._updateLineTelegraph(e.teleLine, pos, pos.clone().addScaledVector(e.aimDir, 90), 0.9, 1.7);
          if (ud.weaponModel?.spinner) ud.weaponModel.spinner.rotation.z += dt * 32;
          e.shotTimer -= dt;
          if (e.shotTimer <= 0 && e.shotsLeft > 0) {
            e.shotsLeft--;
            e.shotTimer = e.shotInterval;
            this._fireEnemyWeaponShot(e, e.aimDir);
          }
          if (e.shotsLeft <= 0 && e.timer > 0.25) {
            if (e.teleLine) { this._removeTelegraph(e.teleLine); e.teleLine = null; }
            e.state = 'recover';
            e.timer = 0;
          }
          break;
        }
        case 'rush':
          heat = 1;
          e.vel.copy(e.rushDir).multiplyScalar(19);
          desired = null;
          if (Math.random() < 0.5) this.px.glow.spawn(pos, e.rushDir.clone().multiplyScalar(-4), e.weapon.color || 0xff5c7a, 0.3, 0.2, { intensity: 2 });
          if (!e.hitPlayer && e.tgt && e.tgt.ally && e.tgt.ally.state === 'alive' && pos.distanceTo(e.tgt.ally.mesh.position.clone().add(new THREE.Vector3(0, 1.5, 0))) < 3.0 * ATTACK_HIT_SCALE) {
            e.hitPlayer = true;
            this._damageAlly(e.tgt.ally, e.weapon.behavior === 'melee' ? Math.round(e.weapon.damage * 0.55) : 120);
            this.px.hitMetal(pos, e.rushDir.clone().negate(), e.weapon.color || 0xffc46b, 1.6);
            audio.play('meleeHit', { pos, throttle: 0.1 });
          }
          if (!e.hitPlayer && !p.dead && pos.distanceTo(p.pos.clone().add(new THREE.Vector3(0, 1.5, 0))) < 3.0 * ATTACK_HIT_SCALE) {
            e.hitPlayer = true;
            const dmg = e.weapon.behavior === 'melee' ? Math.round(e.weapon.damage * 0.55) : 120;
            if (this._damagePlayer(dmg)) this._knockPlayer(e.rushDir.clone().setY(0.32).normalize().multiplyScalar(19));
            this.px.hitMetal(pos, e.rushDir.clone().negate(), e.weapon.color || 0xffc46b, 1.6);
            if (e.weapon.melee === 'hammer') {
              this.px.ring(pos.clone().setY(0.2), 6.5, 0x8fb6ff, 0.45);
              audio.play('hammerHit', { pos, throttle: 0.1 });
            } else {
              audio.play('meleeHit', { pos, throttle: 0.1 });
            }
          }
          if (e.timer > 1.0) {
            // 突進終了時にも周囲へ衝撃波または斬撃波を放つ
            if (e.weapon.behavior === 'melee') {
              this.px.ring(pos.clone(), 4.5, e.weapon.color, 0.35, pos.y);
            }
            e.state = 'recover';
            e.timer = 0;
          }
          break;
        case 'recover':
          maxSpeed = 1.8;
          heat = Math.max(0, 1 - e.timer * 2.5);
          if (e.timer > 0.65) {
            this._pickAnchor(e);
            e.state = 'approach';
            e.timer = 0;
          }
          break;
      }

      if (desired) {
        const want = desired.length() > 0.01 ? desired.clone().setLength(Math.min(maxSpeed, desired.length() * 0.75)) : new THREE.Vector3();
        e.vel.lerp(want, Math.min(1, dt * 1.8));
      }
      for (const o of this.enemies) {
        if (o === e) continue;
        const d = pos.clone().sub(o.mesh.position);
        const l = d.length();
        if (l < 18 && l > 0.01) e.vel.addScaledVector(d.normalize(), (18 - l) * dt * 3.2);
      }
      pos.addScaledVector(e.vel, dt);

      // コアの予兆発光＆武器マウントを常にプレイヤー方向へ照準
      ud.coreMat.color.copy(ud.baseCoreColor).lerp(RED, heat);
      ud.coreMat.emissive.copy(ud.baseCoreColor).lerp(RED, heat).lerp(new THREE.Color(1, 1, 1), e.flash);
      ud.coreMat.emissiveIntensity = 2.4 + heat * 6 + e.flash * 6 + (heat > 0.6 ? Math.sin(e.timer * 40) * 1.5 : 0);
      ud.core.scale.setScalar(1 + heat * 0.7);
      ud.ring.rotation.y += dt * (1.2 + heat * 10);

      const targetYaw = Math.atan2(toT.x, toT.z);
      const targetPitch = -Math.atan2(toT.y, Math.hypot(toT.x, toT.z));
      ud.frame.rotation.y = lerpAngle(ud.frame.rotation.y, targetYaw, Math.min(1, dt * 4.5));
      ud.frame.rotation.x = Math.sin(e.bob * 0.6) * 0.12;
      if (ud.weaponMount) {
        ud.weaponMount.rotation.y = ud.frame.rotation.y;
        ud.weaponMount.rotation.x = THREE.MathUtils.clamp(targetPitch, -0.6, 0.6);
      }
      if (e.state === 'charge' || e.state === 'rush' || e.state === 'attack') {
        scale *= 1 + Math.sin(e.timer * 30) * 0.03 * heat;
      }
      e.mesh.scale.setScalar(scale);
    }
  },

  /** 装備しているプレイヤー武器に応じた連射・バースト攻撃を開始 */
  _startEnemyWeaponAttack(e, dir) {
    e.state = 'attack';
    e.timer = 0;
    e.aimDir.copy(dir);
    const b = e.weapon.behavior;
    if (b === 'gatling') {
      e.shotsLeft = 9;
      e.shotInterval = 0.1;
    } else if (b === 'pulse') {
      e.shotsLeft = 5;
      e.shotInterval = 0.11;
    } else if (b === 'flame') {
      e.shotsLeft = 8;
      e.shotInterval = 0.09;
    } else if (b === 'beam') {
      e.shotsLeft = 6;
      e.shotInterval = 0.1;
    } else if (b === 'cannon' || b === 'shell' || b === 'shotgun' || b === 'plasma') {
      e.shotsLeft = 2;
      e.shotInterval = 0.42;
    } else {
      e.shotsLeft = 1;
      e.shotInterval = 0.2;
    }
    e.shotTimer = 0;
  },

  /** 雑魚敵が装備武器を使って発射する */
  _fireEnemyWeaponShot(e, dir) {
    const w = e.weapon;
    const ud = e.mesh.userData;
    const muzzle = e.mesh.position.clone();
    if (ud.weaponModel) {
      ud.weaponModel.group.getWorldPosition(muzzle);
    }
    const baseVariant = e.type === 'stunner' ? 'stunner' : e.type === 'burner' ? 'burner' : 'normal';
    const color = w.color || (baseVariant === 'stunner' ? 0x40e0ff : baseVariant === 'burner' ? 0xff6a1a : 0xff2a4a);

    this.px.flash(muzzle, color, 0.75, 0.08);
    if (w.fireSE) audio.play(w.fireSE, { pos: muzzle, throttle: 0.07, vol: 0.55 });
    else audio.play('enemyFire', { pos: muzzle, throttle: 0.07 });

    switch (w.behavior) {
      case 'gatling': {
        const sp = 0.06;
        const d = dir.clone().add(new THREE.Vector3((Math.random() - 0.5) * sp, (Math.random() - 0.5) * sp, (Math.random() - 0.5) * sp)).normalize();
        this._spawnEnemyBullet(muzzle, d, baseVariant, 34, 0.75, { color, dmg: 22, power: 0.6 });
        break;
      }
      case 'pulse': {
        const sp = 0.03;
        const d = dir.clone().add(new THREE.Vector3((Math.random() - 0.5) * sp, (Math.random() - 0.5) * sp, (Math.random() - 0.5) * sp)).normalize();
        this._spawnEnemyBullet(muzzle, d, baseVariant, 44, 0.85, { color, dmg: 32, power: 1.0 });
        break;
      }
      case 'shotgun': {
        for (let k = 0; k < 6; k++) {
          const sp = 0.18;
          const d = dir.clone().add(new THREE.Vector3((Math.random() - 0.5) * sp, (Math.random() - 0.5) * sp, (Math.random() - 0.5) * sp)).normalize();
          this._spawnEnemyBullet(muzzle, d, baseVariant, 28, 0.7, { color, dmg: 24, power: 0.7, life: 1.8 });
        }
        break;
      }
      case 'missile': {
        for (let k = -1; k <= 1; k++) {
          const d = dir.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), k * 0.24).add(new THREE.Vector3(0, 0.25, 0)).normalize();
          this._spawnEnemyBullet(muzzle, d, baseVariant, 20, 1.05, { color, dmg: 42, power: 1.3, homing: 1.4 });
        }
        break;
      }
      case 'rail': {
        this._spawnEnemyBullet(muzzle, dir, 'stunner', 68, 1.35, { color: 0xc77dff, dmg: 95, power: 3.5 });
        const beam = this._createBeamMesh(0xc77dff, 0.1, 0.35);
        this._setBeam(beam, muzzle, muzzle.clone().addScaledVector(dir, 85), false);
        this.trails.push({ group: beam, life: 0.35, max: 0.35 });
        break;
      }
      case 'beam': {
        this._spawnEnemyBullet(muzzle, dir, baseVariant, 48, 1.1, { color: 0x7df9ff, dmg: 28, power: 1.8 });
        break;
      }
      case 'plasma': {
        this._spawnEnemyBullet(muzzle, dir, baseVariant, 22, 1.5, { color: 0x5dff8a, dmg: 75, power: 2.2, homing: 0.6, splash: 3.2 });
        break;
      }
      case 'flame': {
        const sp = 0.16;
        const d = dir.clone().add(new THREE.Vector3((Math.random() - 0.5) * sp, (Math.random() - 0.5) * sp, (Math.random() - 0.5) * sp)).normalize();
        this._spawnEnemyBullet(muzzle, d, 'burner', 20, 1.15, { color: 0xff6a1a, dmg: 18, power: 0.6, life: 1.6 });
        break;
      }
      case 'gravity': {
        this._spawnEnemyBullet(muzzle, dir, 'stunner', 19, 1.6, { color: 0x9b5cff, dmg: 85, power: 3.0, pull: true, splash: 4.5 });
        break;
      }
      case 'shell':
      default: {
        const d = dir.clone().add(new THREE.Vector3(0, 0.12, 0)).normalize();
        this._spawnEnemyBullet(muzzle, d, baseVariant, 30, 1.25, { color: 0xff8a00, dmg: 68, power: 2.0, gravity: 4.5, splash: 3.5 });
        break;
      }
    }
  },

  _spawnEnemyBullet(pos, dir, variant, speed, size = 1, opt = {}) {
    const raw = opt.color || (variant === 'stunner' ? 0x40e0ff : variant === 'burner' ? 0xff6a1a : 0xff2a4a);
    const boss = !!opt.boss;
    const color = boss ? raw : new THREE.Color(raw).lerp(new THREE.Color(0xff1830), 0.42).getHex();
    const shotSpeed = speed * 3;
    const g = new THREE.Group();
    const core = new THREE.Mesh(this.geo.sphere, this.glowMat(boss ? 0xffffff : 0xffc4c8, 1, 3));
    core.scale.setScalar(0.25 * size);
    const outer = new THREE.Mesh(this.geo.sphere, this.glowMat(color, 0.65, 2.5));
    outer.scale.setScalar(0.6 * size);
    g.add(core, outer);
    g.position.copy(pos);
    this.scene.add(g);
    const power = opt.power ?? ((variant === 'burner' ? 1.2 : 1) * (size > 1.2 ? 2.5 : 1));
    this.enemyBullets.push({
      mesh: g, outer, vel: dir.clone().multiplyScalar(shotSpeed), speed: shotSpeed,
      variant, color, life: opt.life ?? 6.5, size, power, boss,
      dmg: opt.dmg ?? (variant === 'normal' ? 65 : 52),
      homing: opt.homing || 0, gravity: opt.gravity || 0, splash: opt.splash || 0, pull: !!opt.pull
    });
  },

  _updateEnemyBullets(dt) {
    const p = this.player;
    const chest = p.pos.clone().add(new THREE.Vector3(0, 1.5, 0));
    for (let i = this.enemyBullets.length - 1; i >= 0; i--) {
      const b = this.enemyBullets[i];
      b.life -= dt;
      if (b.gravity) b.vel.y -= b.gravity * dt;
      if (b.homing && !p.dead) {
        const want = chest.clone().sub(b.mesh.position).normalize().multiplyScalar(b.speed);
        b.vel.lerp(want, Math.min(1, dt * b.homing));
      }
      b.mesh.position.addScaledVector(b.vel, dt);
      b.outer.scale.setScalar(0.6 * b.size * (0.9 + Math.random() * 0.2));
      if (Math.random() < 0.25) this.px.glow.spawn(b.mesh.position, new THREE.Vector3(), b.color, 0.16 * b.size, 0.18, { intensity: 1.5 });
      const pos = b.mesh.position;
      let remove = b.life <= 0 || pos.y < -15;

      for (const ob of this.world.obstacles) {
        if (!remove && pos.x > ob.minX && pos.x < ob.maxX && pos.z > ob.minZ && pos.z < ob.maxZ && pos.y > 0 && pos.y < ob.maxY) {
          remove = true;
          audio.play('ricochet', { pos, throttle: 0.1 });
          this.px.hitEnergy(pos, b.color, 0.8);
          this.px.spark(pos, b.vel.clone().normalize().negate(), 0xffd27a, 5, 8, 1);
        }
      }
      if (!remove && pos.y < 0 && Math.abs(pos.x) < HW && Math.abs(pos.z) < HL) {
        remove = true;
        if (b.splash) {
          this.px.explosion(pos.clone().setY(0.2), b.color, 0.9, { noDebris: true });
          audio.play('explosionSmall', { pos, throttle: 0.08 });
          const splashR = (b.splash + 1.2) * (b.boss ? 1 : ATTACK_HIT_SCALE);
          if (!p.dead && pos.distanceTo(chest) < splashR) {
            if (this._damagePlayer(b.dmg * 0.8)) {
              this._knockPlayer(p.pos.clone().sub(pos).setY(0.3).normalize().multiplyScalar(8));
            }
          }
        } else {
          this.px.hitEnergy(pos, b.color, 0.8);
          this.px.scorch(pos, 0.6);
        }
      }
      const bodyR = (1.55 + b.size * 0.4) * (b.boss ? 1 : ATTACK_HIT_SCALE);
      if (!remove && !p.dead && pos.distanceTo(chest) < bodyR) {
        if (p.invuln > 0) continue;
        remove = true;
        if (this._damagePlayer(b.dmg)) {
          const kbDir = b.pull ? b.vel.clone().normalize().negate() : b.vel.clone().normalize();
          this._knockPlayer(kbDir.setY(0.2).multiplyScalar(6 * b.size));
          if (b.variant === 'stunner') { p.stun = Math.max(p.stun, 1.8); audio.play('stun', { throttle: 0.2 }); }
          else if (b.variant === 'burner') { if (p.burn <= 0) audio.play('burn', { throttle: 0.2 }); p.burn = Math.max(p.burn, 3.5); }
        }
        this.px.hitMetal(pos, b.vel.clone().normalize().negate(), b.color, 1.2);
      }
      if (!remove) {
        for (const a of this.allies) {
          if (a.state !== 'alive') continue;
          if (pos.distanceTo(a.mesh.position.clone().add(new THREE.Vector3(0, 1.5, 0))) < (1.6 + b.size * 0.4) * (b.boss ? 1 : ATTACK_HIT_SCALE)) {
            remove = true;
            this._damageAlly(a, b.dmg);
            this.px.hitMetal(pos, b.vel.clone().normalize().negate(), b.color, 1.0);
            break;
          }
        }
      }
      if (remove) {
        this.scene.remove(b.mesh);
        this.enemyBullets.splice(i, 1);
      }
    }
  },

  /**
   * 敵へのダメージ ＆ 撃破時ドロップ判定
   */
  _damageEnemy(e, dmg, opt = {}) {
    const idx = this.enemies.indexOf(e);
    if (idx < 0) return;
    e.hp -= dmg;
    e.flash = 1;
    const pos = opt.pos || e.mesh.position;
    if (!opt.noFx) {
      const normal = opt.normal || pos.clone().sub(this.player.pos).normalize();
      if (opt.energy) this.px.hitEnergy(pos, opt.energy, opt.small ? 0.5 : 1);
      else this.px.hitMetal(pos, normal, 0xffc46b, opt.melee ? 2 : opt.small ? 0.6 : 1);
    }
    if (!opt.silent) {
      audio.play(opt.melee || dmg > 150 ? 'hitMetalHeavy' : 'hitMetal', { pos, throttle: 0.05 });
      this._hitMarker(false);
    }
    if (e.hp <= 0) {
      if (e.teleLine) { this._removeTelegraph(e.teleLine); e.teleLine = null; }
      const ep = e.mesh.position.clone();
      this.px.explosion(ep, e.mesh.userData.baseCoreColor.getHex(), 1.2);
      for (let k = 0; k < 7; k++) {
        this.px.debris.spawn(ep, new THREE.Vector3((Math.random() - 0.5) * 14, 4 + Math.random() * 8, (Math.random() - 0.5) * 14), e.mesh.userData.baseCoreColor.clone().multiplyScalar(0.5).getHex(), 0.18 + Math.random() * 0.12, 2.2, { gravity: 20, spin: 18 });
      }
      audio.play('enemyDestroy', { pos: ep, throttle: 0.05 });
      audio.play('explosionSmall', { pos: ep, throttle: 0.05 });
      this.cam.shake = Math.max(this.cam.shake, 0.25);

      // たまに武器・パーツをドロップ（ステージ最初の撃破時は確実に1個ドロップしてすぐ楽しめるようにする）
      const roll = Math.random();
      if (roll < 0.1) this._spawnDropItem(ep, e.weapon?.id, false);
      else if (roll < 0.22) this._spawnDropItem(ep, null, false, 'heal');

      this.scene.remove(e.mesh);
      disposeObject(e.mesh);
      this.enemies.splice(idx, 1);
      this.runStats.kills++;
      this._hitMarker(true);
      this._onTargetLost(e);
    }
  },

  // =========================================================================
  // ドロップアイテム生成・更新・回収
  // =========================================================================
  _spawnDropItem(fromPos, enemyWeaponId = null, preferRare = false, kind = 'part') {
    const picked = kind === 'heal'
      ? { id: 'heal', slot: 'heal', part: { name: '修理キット', color: 0x44ff88 } }
      : pickDropPart(this.inventory, enemyWeaponId, preferRare);
    if (!picked) return;
    const isRare = !!picked.part.rare;
    const color = picked.part.color || 0xffc400;
    const mesh = createDropContainerModel(color, isRare);
    mesh.position.copy(fromPos);
    this.scene.add(mesh);

    // 船外の上空で倒された場合でも、甲板上の安全位置へ放物線で飛んでくる
    const pPos = this._livePlayerPos();
    const landX = THREE.MathUtils.clamp(
      Math.abs(fromPos.x) < HW - 4 ? fromPos.x : pPos.x + (Math.random() - 0.5) * 14,
      -(HW - 5), HW - 5
    );
    const landZ = THREE.MathUtils.clamp(
      Math.abs(fromPos.z) < HL - 4 ? fromPos.z : pPos.z + (Math.random() - 0.5) * 14,
      -(HL - 5), HL - 5
    );
    const flightT = 0.85;
    const g = 24;
    const vx = (landX - fromPos.x) / flightT;
    const vz = (landZ - fromPos.z) / flightT;
    const vy = (0.6 - fromPos.y + 0.5 * g * flightT * flightT) / flightT;

    this.drops.push({
      mesh,
      id: picked.id,
      kind,
      slot: picked.slot,
      part: picked.part,
      isRare,
      color,
      vel: new THREE.Vector3(vx, vy, vz),
      grounded: false,
      age: 0
    });
    this.px.ring(fromPos, 3.5, isRare ? 0xd580ff : 0xffd740, 0.45, fromPos.y);
  },

  _updateDrops(dt) {
    if (!this.drops || !this.drops.length) return;
    const p = this.player;
    const pCenter = p.pos.clone().add(new THREE.Vector3(0, 1.2, 0));

    for (let i = this.drops.length - 1; i >= 0; i--) {
      const d = this.drops[i];
      d.age += dt;
      const pos = d.mesh.position;
      const ud = d.mesh.userData;
      ud.boxGroup.rotation.y += dt * 2.6;
      ud.inner.rotation.x += dt * 3.5;

      if (!d.grounded) {
        d.vel.y -= 24 * dt;
        pos.addScaledVector(d.vel, dt);
        // 甲板範囲内に収める
        pos.x = THREE.MathUtils.clamp(pos.x, -(HW - 3), HW - 3);
        pos.z = THREE.MathUtils.clamp(pos.z, -(HL - 3), HL - 3);
        if (pos.y <= 0.65 && d.vel.y <= 0) {
          pos.y = 0.65;
          d.grounded = true;
          d.vel.set(0, 0, 0);
          this.px.ring(pos, 2.6, d.isRare ? 0xd580ff : 0xffd740, 0.4, 0.12);
        }
      } else {
        pos.y = 0.65 + Math.sin(d.age * 3.5) * 0.2;
      }

      // プレイヤーが近づくか、一定時間経過すると磁力でプレイヤーへ吸い寄せられる
      if (!p.dead) {
        const toP = pCenter.clone().sub(pos);
        const dist = toP.length();
        if (dist < 14 || d.age > 8.0) {
          const pullSpeed = d.age > 8.0 ? 28 : THREE.MathUtils.lerp(24, 7, dist / 14);
          pos.addScaledVector(toP.normalize(), pullSpeed * dt);
        }
        if (dist < 2.5) {
          this._collectDrop(d);
          this.scene.remove(d.mesh);
          disposeObject(d.mesh);
          this.drops.splice(i, 1);
        }
      }
    }
  },

  _collectDrop(d) {
    if (d.kind === 'heal') {
      this.healKits = Math.min(3, (this.healKits || 0) + 1);
      audio.play('garageWeapon', { throttle: 0, vol: 0.7 });
      this.px.ring(this.player.pos, 4.5, 0x44ff88, 0.45);
      this._showDropToast('修理キット入手 [H]で使用（大破時は5秒で蘇生）', false);
      return;
    }
    const isNew = !(this.inventory[d.id] > 0);
    this.inventory[d.id] = (this.inventory[d.id] || 0) + 1;
    this._saveInventory();
    if (this.runStats.drops) this.runStats.drops.push(d);

    audio.play('garageWeapon', { throttle: 0, vol: 0.7 });
    audio.play('stageClear', { throttle: 0, rate: 1.4, vol: 0.45 });
    this.px.ring(this.player.pos, 4.5, d.isRare ? 0xd580ff : 0xffd740, 0.45);

    const catLabel = d.slot === 'weapon' ? '武器' : SLOT_LABELS[d.slot] || 'パーツ';
    this._showDropToast(`${isNew ? 'NEW!' : 'GET!'} [${catLabel}] ${d.part.name}`, d.isRare);
  },

  _showDropToast(text, isRare = false) {
    const box = $('drop-toast');
    if (!box) return;
    box.textContent = `📦 ${text}`;
    box.className = `drop-toast show${isRare ? ' rare' : ''}`;
    clearTimeout(this._dropToastT);
    this._dropToastT = setTimeout(() => box.classList.remove('show'), 3200);
  }
};
