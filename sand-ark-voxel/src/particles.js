import * as THREE from 'three';

/**
 * インスタンス描画によるパーティクルシステム
 * 種類ごとに1つの InstancedMesh を使い回し、数千個の粒子を1ドローコールで描画する。
 *
 *  glow   : 加算合成の発光粒（火花・火球・閃光）。色を暗くしていくことでフェード
 *  streak : 速度方向に伸びる火花の線（金属に当たった時の飛び散り）
 *  smoke  : 通常合成の煙（膨らみながら上昇）
 *  debris : 金属片（PBRマテリアル。重力で落ち、甲板で跳ねる）
 */

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _s = new THREE.Vector3();
const _p = new THREE.Vector3();
const _c = new THREE.Color();
const _fwd = new THREE.Vector3(0, 0, 1);
const _dir = new THREE.Vector3();
const _e = new THREE.Euler();

class Pool {
  constructor(scene, geometry, material, capacity, opts = {}) {
    this.cap = capacity;
    this.mesh = new THREE.InstancedMesh(geometry, material, capacity);
    this.mesh.frustumCulled = false;
    this.mesh.castShadow = !!opts.castShadow;
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    // インスタンスカラーを初期化
    for (let i = 0; i < capacity; i++) {
      this.mesh.setColorAt(i, _c.setRGB(0, 0, 0));
      _m.makeScale(0, 0, 0);
      this.mesh.setMatrixAt(i, _m);
    }
    this.mesh.instanceColor.setUsage(THREE.DynamicDrawUsage);
    this.mesh.visible = false;
    scene.add(this.mesh);

    this.kind = opts.kind;
    this.pos = new Float32Array(capacity * 3);
    this.vel = new Float32Array(capacity * 3);
    this.rot = new Float32Array(capacity * 3);
    this.spin = new Float32Array(capacity * 3);
    this.col = new Float32Array(capacity * 3);
    this.life = new Float32Array(capacity);
    this.max = new Float32Array(capacity);
    this.size = new Float32Array(capacity);
    this.grow = new Float32Array(capacity);
    this.gravity = new Float32Array(capacity);
    this.drag = new Float32Array(capacity);
    this.stretch = new Float32Array(capacity);
    this.next = 0;
    this.active = 0;
  }

  spawn(pos, vel, color, size, life, o = {}) {
    const i = this.next;
    this.next = (this.next + 1) % this.cap;
    if (this.life[i] <= 0) this.active++;
    const i3 = i * 3;
    this.pos[i3] = pos.x; this.pos[i3 + 1] = pos.y; this.pos[i3 + 2] = pos.z;
    this.vel[i3] = vel.x; this.vel[i3 + 1] = vel.y; this.vel[i3 + 2] = vel.z;
    _c.set(color);
    const inten = o.intensity ?? 1;
    this.col[i3] = _c.r * inten; this.col[i3 + 1] = _c.g * inten; this.col[i3 + 2] = _c.b * inten;
    this.rot[i3] = Math.random() * 6; this.rot[i3 + 1] = Math.random() * 6; this.rot[i3 + 2] = 0;
    const sp = o.spin ?? 0;
    this.spin[i3] = (Math.random() - 0.5) * sp; this.spin[i3 + 1] = (Math.random() - 0.5) * sp; this.spin[i3 + 2] = 0;
    this.life[i] = life;
    this.max[i] = life;
    this.size[i] = size;
    this.grow[i] = o.grow ?? 0;
    this.gravity[i] = o.gravity ?? 0;
    this.drag[i] = o.drag ?? 0;
    this.stretch[i] = o.stretch ?? 0.06;
    this.mesh.visible = true;
  }

  update(dt) {
    if (this.active <= 0) return;
    const m = this.mesh;
    let alive = 0;
    for (let i = 0; i < this.cap; i++) {
      if (this.life[i] <= 0) continue;
      this.life[i] -= dt;
      const i3 = i * 3;
      if (this.life[i] <= 0) {
        this.life[i] = 0;
        _m.makeScale(0, 0, 0);
        m.setMatrixAt(i, _m);
        continue;
      }
      alive++;
      // 物理
      const dr = this.drag[i] ? Math.pow(1 - this.drag[i], dt * 60) : 1;
      this.vel[i3] *= dr; this.vel[i3 + 1] = this.vel[i3 + 1] * dr - this.gravity[i] * dt; this.vel[i3 + 2] *= dr;
      this.pos[i3] += this.vel[i3] * dt;
      this.pos[i3 + 1] += this.vel[i3 + 1] * dt;
      this.pos[i3 + 2] += this.vel[i3 + 2] * dt;
      // 金属片は甲板で跳ねる
      if (this.kind === 'debris' && this.pos[i3 + 1] < 0.1 && Math.abs(this.pos[i3]) < 38 && Math.abs(this.pos[i3 + 2]) < 58) {
        this.pos[i3 + 1] = 0.1;
        this.vel[i3 + 1] = Math.abs(this.vel[i3 + 1]) * 0.35;
        this.vel[i3] *= 0.6; this.vel[i3 + 2] *= 0.6;
        this.spin[i3] *= 0.5; this.spin[i3 + 1] *= 0.5;
      }
      const k = this.life[i] / this.max[i]; // 1→0
      let sc = this.size[i];
      if (this.grow[i]) sc *= (1 + (1 - k) * this.grow[i]) * Math.min(1, k * 4);
      else if (this.kind !== 'debris') sc *= 0.3 + 0.7 * k;
      else sc *= Math.min(1, k * 5);

      _p.set(this.pos[i3], this.pos[i3 + 1], this.pos[i3 + 2]);
      if (this.kind === 'streak') {
        _dir.set(this.vel[i3], this.vel[i3 + 1], this.vel[i3 + 2]);
        const sp = _dir.length();
        if (sp > 0.001) _q.setFromUnitVectors(_fwd, _dir.multiplyScalar(1 / sp));
        _s.set(sc, sc, Math.max(sc, sp * this.stretch[i]));
      } else {
        this.rot[i3] += this.spin[i3] * dt;
        this.rot[i3 + 1] += this.spin[i3 + 1] * dt;
        _q.setFromEuler(_e.set(this.rot[i3], this.rot[i3 + 1], this.rot[i3 + 2]));
        _s.set(sc, sc, sc);
      }
      _m.compose(_p, _q, _s);
      m.setMatrixAt(i, _m);
      // 加算合成は色を暗くしてフェード
      const f = this.kind === 'glow' || this.kind === 'streak' ? Math.pow(k, 0.7) : 1;
      _c.setRGB(this.col[i3] * f, this.col[i3 + 1] * f, this.col[i3 + 2] * f);
      m.setColorAt(i, _c);
    }
    this.active = alive;
    m.instanceMatrix.needsUpdate = true;
    m.instanceColor.needsUpdate = true;
    if (alive === 0) m.visible = false;
  }

  clear() {
    if (this.active <= 0) return;
    this.life.fill(0);
    this.active = 0;
    for (let i = 0; i < this.cap; i++) {
      _m.makeScale(0, 0, 0);
      this.mesh.setMatrixAt(i, _m);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
    this.mesh.visible = false;
  }
}

export class ParticleSystem {
  constructor(scene, opts = {}) {
    this.scene = scene;
    const mul = opts.scale ?? 1;
    const add = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
    const smokeMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.16, depthWrite: false });
    const debrisMat = new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.85, roughness: 0.35 });

    this.glow = new Pool(scene, new THREE.IcosahedronGeometry(1, 0), add, Math.round(900 * mul), { kind: 'glow' });
    this.streak = new Pool(scene, new THREE.BoxGeometry(0.5, 0.5, 1), add.clone(), Math.round(600 * mul), { kind: 'streak' });
    this.smoke = new Pool(scene, new THREE.IcosahedronGeometry(1, 1), smokeMat, Math.round(350 * mul), { kind: 'smoke' });
    this.debris = new Pool(scene, new THREE.BoxGeometry(1, 1, 1), debrisMat, Math.round(200 * mul), { kind: 'debris', castShadow: false });

    // 衝撃波リング・焦げ跡（個別マテリアルで透明度を下げていく）
    this.rings = [];
    this.scorches = [];
    this.ringGeo = new THREE.RingGeometry(0.82, 1, 36).rotateX(-Math.PI / 2);
    this.sphereGeo = new THREE.IcosahedronGeometry(1, 1);
    this.discGeo = new THREE.CircleGeometry(1, 18).rotateX(-Math.PI / 2);
    this.lights = [];
    const lightCount = opts.lightCount ?? 2;
    for (let i = 0; i < lightCount; i++) {
      const l = new THREE.PointLight(0xffaa55, 0, 36, 2);
      scene.add(l);
      this.lights.push({ light: l, life: 0, max: 1, peak: 0 });
    }
  }

  // ---------- 基本エミッタ ----------
  spark(pos, dir, color, count = 8, speed = 14, spread = 0.9) {
    for (let i = 0; i < count; i++) {
      const v = new THREE.Vector3(dir.x + (Math.random() - 0.5) * spread * 2, dir.y + (Math.random() - 0.2) * spread * 2, dir.z + (Math.random() - 0.5) * spread * 2)
        .normalize().multiplyScalar(speed * (0.4 + Math.random() * 0.8));
      this.streak.spawn(pos, v, i % 3 === 0 ? 0xffffff : color, 0.035 + Math.random() * 0.03, 0.25 + Math.random() * 0.35, { gravity: 16, drag: 0.02, stretch: 0.045, intensity: 2.2 });
    }
  }

  flash(pos, color, size = 1, life = 0.08) {
    this.glow.spawn(pos, new THREE.Vector3(), color, size, life, { intensity: 3, grow: 0.6 });
  }

  light(pos, color, intensity, life) {
    const fl = this.lights.reduce((a, b) => (a.life < b.life ? a : b));
    fl.light.position.copy(pos);
    fl.light.color.set(color);
    fl.peak = intensity;
    fl.light.intensity = intensity;
    fl.life = fl.max = life;
  }

  smokePuff(pos, color = 0x55555c, size = 1, life = 1.6, vel) {
    this.smoke.spawn(pos, vel || new THREE.Vector3((Math.random() - 0.5) * 1.5, 1.2 + Math.random() * 1.5, (Math.random() - 0.5) * 1.5), color, size, life, { grow: 1.8, drag: 0.02, spin: 1 });
  }

  ring(center, radius, color = 0xffb070, life = 0.5, y = 0.15) {
    const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
    const m = new THREE.Mesh(this.ringGeo, mat);
    m.position.set(center.x, y, center.z);
    this.scene.add(m);
    this.rings.push({ mesh: m, mat, life, max: life, radius, sphere: false });
  }

  sphereWave(center, radius, color, life = 0.35) {
    const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false });
    const m = new THREE.Mesh(this.sphereGeo, mat);
    m.position.copy(center);
    this.scene.add(m);
    this.rings.push({ mesh: m, mat, life, max: life, radius, sphere: true });
  }

  scorch(pos, radius) {
    if (pos.y > 1.5 || Math.abs(pos.x) > 38 || Math.abs(pos.z) > 58) return;
    const mat = new THREE.MeshBasicMaterial({ color: 0x050505, transparent: true, opacity: 0.55, depthWrite: false });
    const m = new THREE.Mesh(this.discGeo, mat);
    m.position.set(pos.x, 0.03 + Math.random() * 0.01, pos.z);
    m.scale.setScalar(radius);
    this.scene.add(m);
    this.scorches.push({ mesh: m, mat, life: 8, max: 8 });
    if (this.scorches.length > 40) {
      const o = this.scorches.shift();
      this.scene.remove(o.mesh);
      o.mat.dispose();
    }
  }

  // ---------- 複合エフェクト ----------

  /** 敵や機体に弾が当たった：閃光＋金属火花＋小さな金属片 */
  hitMetal(pos, normal, color = 0xffc46b, power = 1) {
    this.flash(pos, 0xffffff, 0.35 * power, 0.06);
    this.flash(pos, color, 0.6 * power, 0.1);
    this.spark(pos, normal, color, Math.round(7 * power), 12 * Math.sqrt(power), 0.8);
    if (power > 0.8) {
      for (let i = 0; i < 2; i++) {
        this.debris.spawn(pos, new THREE.Vector3((Math.random() - 0.5) * 6 + normal.x * 3, 3 + Math.random() * 4, (Math.random() - 0.5) * 6 + normal.z * 3), 0x6b7684, 0.08 + Math.random() * 0.06, 1.2, { gravity: 20, spin: 14 });
      }
    }
  }

  /** 光学兵器の着弾：色付きの閃光と粒子 */
  hitEnergy(pos, color, power = 1) {
    this.flash(pos, 0xffffff, 0.3 * power, 0.05);
    this.flash(pos, color, 0.8 * power, 0.14);
    for (let i = 0; i < 8 * power; i++) {
      const v = new THREE.Vector3((Math.random() - 0.5), (Math.random() - 0.5), (Math.random() - 0.5)).normalize().multiplyScalar(4 + Math.random() * 6);
      this.glow.spawn(pos, v, color, 0.07 + Math.random() * 0.06, 0.3 + Math.random() * 0.2, { drag: 0.06, intensity: 2.5 });
    }
  }

  /**
   * 爆発：閃光 → 火球（白→橙→赤で膨張）→ 火花の線 → 金属片 → 黒煙 → 衝撃波 → 焦げ跡
   */
  explosion(pos, color = 0xff8a30, size = 1, opt = {}) {
    const s = size;
    this.light(pos, color, 60 * s, 0.25 + 0.1 * s);
    this.flash(pos, 0xffffff, 1.4 * s, 0.09);
    // 火球（複数の発光球を少しずらして重ねる）
    const fire = [0xfff2c0, 0xffb347, color, 0xff4a1a];
    for (let i = 0; i < 10 * s; i++) {
      const off = new THREE.Vector3((Math.random() - 0.5), (Math.random() - 0.3), (Math.random() - 0.5)).multiplyScalar(1.6 * s);
      const v = off.clone().multiplyScalar(2.2).add(new THREE.Vector3(0, 1.2, 0));
      this.glow.spawn(pos.clone().add(off), v, fire[i % fire.length], (0.7 + Math.random() * 0.6) * s, 0.35 + Math.random() * 0.3, { grow: 1.2, drag: 0.08, intensity: 1.3 / Math.sqrt(Math.max(1, s)) });
    }
    // 火花の線
    this.spark(pos, new THREE.Vector3(0, 0.4, 0), 0xffd27a, Math.round(18 * s), 18 * Math.sqrt(s), 1.2);
    // 燃えさし（ゆっくり舞う）
    for (let i = 0; i < 8 * s; i++) {
      const v = new THREE.Vector3((Math.random() - 0.5) * 8, 4 + Math.random() * 8, (Math.random() - 0.5) * 8).multiplyScalar(Math.sqrt(s));
      this.glow.spawn(pos, v, 0xff8a30, 0.06 + Math.random() * 0.05, 1.0 + Math.random() * 0.8, { gravity: 4, drag: 0.03, intensity: 3 });
    }
    if (!opt.noDebris) {
      for (let i = 0; i < 7 * s; i++) {
        const v = new THREE.Vector3((Math.random() - 0.5) * 12, 5 + Math.random() * 9, (Math.random() - 0.5) * 12).multiplyScalar(Math.sqrt(s));
        this.debris.spawn(pos, v, i % 2 ? 0x3a414c : 0x6b7684, (0.12 + Math.random() * 0.18) * Math.sqrt(s), 2.2, { gravity: 22, spin: 16 });
      }
    }
    // 黒煙
    for (let i = 0; i < 6 * s; i++) {
      const off = new THREE.Vector3((Math.random() - 0.5) * s * 1.5, Math.random() * s, (Math.random() - 0.5) * s * 1.5);
      this.smokePuff(pos.clone().add(off), i % 2 ? 0x2a2a2e : 0x4a4448, (0.6 + Math.random() * 0.5) * s, 1.6 + Math.random() * 1.2);
    }
    this.sphereWave(pos, 3.2 * s, color, 0.3);
    if (pos.y < 2.5) {
      this.ring(pos, 5 * s, 0xffc080, 0.45);
      this.scorch(pos, 1.2 * s);
    }
  }

  update(dt) {
    this.glow.update(dt);
    this.streak.update(dt);
    this.smoke.update(dt);
    this.debris.update(dt);
    for (let i = this.rings.length - 1; i >= 0; i--) {
      const r = this.rings[i];
      r.life -= dt;
      const k = 1 - Math.max(0, r.life / r.max);
      const e = 1 - Math.pow(1 - k, 3);
      r.mesh.scale.setScalar(0.2 + e * r.radius);
      r.mat.opacity = (r.sphere ? 0.6 : 0.9) * (1 - k);
      if (r.life <= 0) {
        this.scene.remove(r.mesh);
        r.mat.dispose();
        this.rings.splice(i, 1);
      }
    }
    for (let i = this.scorches.length - 1; i >= 0; i--) {
      const s = this.scorches[i];
      s.life -= dt;
      s.mat.opacity = 0.55 * Math.min(1, s.life / 3);
      if (s.life <= 0) {
        this.scene.remove(s.mesh);
        s.mat.dispose();
        this.scorches.splice(i, 1);
      }
    }
    for (const fl of this.lights) {
      if (fl.life > 0) {
        fl.life -= dt;
        fl.light.intensity = Math.max(0, fl.peak * (fl.life / fl.max) ** 2);
      } else fl.light.intensity = 0;
    }
  }

  clear() {
    for (const p of [this.glow, this.streak, this.smoke, this.debris]) p.clear();
    for (const r of [...this.rings, ...this.scorches]) {
      this.scene.remove(r.mesh);
      r.mat.dispose();
    }
    this.rings = [];
    this.scorches = [];
  }
}
