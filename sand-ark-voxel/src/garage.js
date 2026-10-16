import * as THREE from 'three';
import { createVoxelMechModel, buildVoxelCluster } from './voxelBuilder.js';
import { buildWeaponModel, WEAPONS } from './weapons.js';
import { createDeckTexture } from './desertWorld.js';
import { ParticleSystem } from './particles.js';

/**
 * ガレージ（格納庫）シーン
 * - 機体は整備ターンテーブルの上。パーツを組み替えると即座にモデルが差し替わり、
 *   整備アームが動いて火花が散る
 * - 壁には予備の武器ラック、天井に照明、奥に出撃用の巨大シャッター
 */
export class Garage {
  constructor() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0b0e14);
    this.scene.fog = new THREE.Fog(0x0b0e14, 30, 70);
    this.camera = new THREE.PerspectiveCamera(42, innerWidth / innerHeight, 0.1, 200);
    this.orbit = { yaw: 0.55, pitch: 0.14, dist: 9.5, target: new THREE.Vector3(0, 1.6, 0), auto: true };
    this.particles = new ParticleSystem(this.scene, { scale: 0.2, lightCount: 1 });
    this.time = 0;
    this.armAnim = 0;
    this.sortie = null;

    this._buildHangar();
    this._buildPlatform();
    this._buildArms();
    this._buildRacks();
    this._buildShutter();
  }

  _buildHangar() {
    const s = this.scene;
    s.add(new THREE.HemisphereLight(0x6b7f99, 0x1a1410, 0.6));

    // 床：使い込まれた鉄板
    const tex = createDeckTexture();
    tex.repeat.set(8, 8);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(64, 64), new THREE.MeshStandardMaterial({ map: tex, metalness: 0.7, roughness: 0.38 }));
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    s.add(floor);

    // 壁と天井（パネル状の箱を並べる）
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x2a313c, metalness: 0.7, roughness: 0.5 });
    const ribMat = new THREE.MeshStandardMaterial({ color: 0x1a1f27, metalness: 0.8, roughness: 0.4 });
    const addBox = (w, h, d, x, y, z, mat) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
      m.position.set(x, y, z);
      s.add(m);
      return m;
    };
    addBox(40, 18, 1, 0, 9, -16, wallMat);           // 奥（シャッター側）
    addBox(1, 18, 40, -18, 9, 0, wallMat);
    addBox(1, 18, 40, 18, 9, 0, wallMat);
    addBox(40, 18, 1, 0, 9, 18, wallMat);
    addBox(40, 1, 40, 0, 18, 0, ribMat);
    for (let i = -16; i <= 16; i += 8) {
      addBox(0.6, 18, 0.8, -17.3, 9, i, ribMat);     // 壁の柱
      addBox(0.6, 18, 0.8, 17.3, 9, i, ribMat);
      addBox(36, 0.7, 0.6, 0, 17.2, i, ribMat);       // 天井の梁
    }

    // 警告ストライプ（床）
    const yA = new THREE.MeshStandardMaterial({ color: 0xffb300, metalness: 0.4, roughness: 0.5 });
    const yB = new THREE.MeshStandardMaterial({ color: 0x16181c, metalness: 0.4, roughness: 0.5 });
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      const m = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.03, 0.5), i % 2 ? yA : yB);
      m.position.set(Math.cos(a) * 5.6, 0.02, Math.sin(a) * 5.6);
      m.rotation.y = -a;
      s.add(m);
    }
    // 出撃レーン
    const laneMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0x00e5ff).multiplyScalar(1.5) });
    for (let z = -4; z > -15; z -= 2.2) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.03, 0.9), laneMat);
      m.position.set(-3.2, 0.02, z);
      const m2 = m.clone();
      m2.position.x = 3.2;
      s.add(m, m2);
    }

    // 天井照明（発光パネル＋メインライト）
    const lampMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xfff4e0).multiplyScalar(3) });
    for (const [x, z] of [[-6, -4], [6, -4], [-6, 6], [6, 6], [0, 0]]) addBox(3, 0.15, 0.6, x, 16.6, z, lampMat);
    const key = new THREE.DirectionalLight(0xfff0dd, 2.6);
    key.position.set(5, 14, 7);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.near = 2;
    key.shadow.camera.far = 30;
    Object.assign(key.shadow.camera, { left: -8, right: 8, top: 8, bottom: -8 });
    s.add(key);
    const rim = new THREE.DirectionalLight(0x5ab8ff, 1.4);
    rim.position.set(-7, 9, -8);
    s.add(rim);

    // 壁のモニター
    const cv = document.createElement('canvas');
    cv.width = 512; cv.height = 256;
    const g = cv.getContext('2d');
    g.fillStyle = '#021018'; g.fillRect(0, 0, 512, 256);
    g.strokeStyle = '#00e5ff'; g.lineWidth = 4; g.strokeRect(8, 8, 496, 240);
    g.fillStyle = '#00e5ff'; g.font = 'bold 44px Orbitron, sans-serif'; g.fillText('HANGAR 03', 30, 80);
    g.font = '24px sans-serif'; g.fillStyle = '#7fdcff';
    g.fillText('SAND ARK  MAINTENANCE BAY', 30, 130);
    g.fillText('STATUS : READY FOR SORTIE', 30, 170);
    for (let i = 0; i < 20; i++) { g.fillStyle = `rgba(0,229,255,${0.2 + Math.random() * 0.6})`; g.fillRect(30 + i * 22, 200, 16, 28 * Math.random() + 6); }
    const monTex = new THREE.CanvasTexture(cv);
    monTex.colorSpace = THREE.SRGBColorSpace;
    const mon = new THREE.Mesh(new THREE.PlaneGeometry(6, 3), new THREE.MeshBasicMaterial({ map: monTex, color: new THREE.Color(1.6, 1.6, 1.6) }));
    mon.position.set(-17.4, 6, -2);
    mon.rotation.y = Math.PI / 2;
    s.add(mon);

    // 背景のコンテナ
    const crateV = (w, h, d, color) => {
      const V = [];
      for (let x = 0; x < w; x++) for (let y = 0; y < h; y++) for (let z = 0; z < d; z++) {
        const edge = (x === 0 || x === w - 1) + (y === 0 || y === h - 1) + (z === 0 || z === d - 1);
        if (edge >= 1) V.push({ x, y: y + 0.5, z, color: edge >= 2 ? 0x22262e : color, metalness: 0.8, roughness: 0.4 });
      }
      return V;
    };
    for (const [x, z, c] of [[12, -10, 0x8a5a2b], [13, 8, 0x2f5670], [-13, 10, 0x4a5745], [11, 12, 0x6e3d33]]) {
      const cr = buildVoxelCluster(crateV(6, 5, 4, c), 0.6);
      cr.position.set(x, 0, z);
      s.add(cr);
    }
  }

  _buildPlatform() {
    const s = this.scene;
    const baseMat = new THREE.MeshStandardMaterial({ color: 0x3a424e, metalness: 0.85, roughness: 0.3 });
    const base = new THREE.Mesh(new THREE.CylinderGeometry(4.2, 4.5, 0.35, 48), baseMat);
    base.position.y = 0.17;
    base.receiveShadow = true;
    base.castShadow = true;
    s.add(base);
    this.turntable = new THREE.Group();
    this.turntable.position.y = 0.35;
    s.add(this.turntable);
    const top = new THREE.Mesh(new THREE.CylinderGeometry(3.6, 3.6, 0.08, 48), new THREE.MeshStandardMaterial({ color: 0x252b33, metalness: 0.9, roughness: 0.25 }));
    top.receiveShadow = true;
    this.turntable.add(top);
    // 発光リング
    this.ringMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0x00e5ff).multiplyScalar(2.2) });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(3.9, 0.06, 8, 96), this.ringMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.36;
    s.add(ring);

    // ガントリー（整備やぐら）
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x8a6a2a, metalness: 0.7, roughness: 0.45 });
    for (const [x, z] of [[-5, -3.5], [5, -3.5], [-5, 3.5], [5, 3.5]]) {
      const p = new THREE.Mesh(new THREE.BoxGeometry(0.45, 9, 0.45), frameMat);
      p.position.set(x, 4.5, z);
      p.castShadow = true;
      s.add(p);
    }
    for (const z of [-3.5, 3.5]) {
      const b = new THREE.Mesh(new THREE.BoxGeometry(10.4, 0.45, 0.45), frameMat);
      b.position.set(0, 9, z);
      s.add(b);
    }
    for (const x of [-5, 5]) {
      const b = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.45, 7.4), frameMat);
      b.position.set(x, 9, 0);
      s.add(b);
    }
    // 吊り下げクレーン
    const crane = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.6, 1.2), new THREE.MeshStandardMaterial({ color: 0x2a2f37, metalness: 0.9, roughness: 0.3 }));
    crane.position.set(0, 8.6, 0);
    s.add(crane);
    const cable = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 3.5, 6), new THREE.MeshStandardMaterial({ color: 0x111111 }));
    cable.position.set(0, 6.6, 0);
    s.add(cable);
    this.hook = new THREE.Mesh(new THREE.TorusGeometry(0.25, 0.07, 6, 16, Math.PI * 1.3), new THREE.MeshStandardMaterial({ color: 0xffb300, metalness: 0.8, roughness: 0.3 }));
    this.hook.position.set(0, 4.8, 0);
    s.add(this.hook);
  }

  _buildArms() {
    // 左右の整備アーム（パーツ交換時に機体へ伸びる）
    this.arms = [];
    const armMat = new THREE.MeshStandardMaterial({ color: 0xd08a1c, metalness: 0.6, roughness: 0.4 });
    const jointMat = new THREE.MeshStandardMaterial({ color: 0x2a2f37, metalness: 0.9, roughness: 0.3 });
    for (const side of [-1, 1]) {
      const base = new THREE.Group();
      base.position.set(side * 6.4, 0, 1.2);
      this.scene.add(base);
      const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.8, 0.6, 16), jointMat);
      foot.position.y = 0.3;
      base.add(foot);
      const shoulder = new THREE.Group();
      shoulder.position.y = 0.6;
      base.add(shoulder);
      const seg1 = new THREE.Mesh(new THREE.BoxGeometry(0.4, 3, 0.4), armMat);
      seg1.position.y = 1.5;
      seg1.castShadow = true;
      shoulder.add(seg1);
      const elbow = new THREE.Group();
      elbow.position.y = 3;
      shoulder.add(elbow);
      elbow.add(new THREE.Mesh(new THREE.SphereGeometry(0.32, 12, 8), jointMat));
      const seg2 = new THREE.Mesh(new THREE.BoxGeometry(0.32, 2.4, 0.32), armMat);
      seg2.position.y = 1.2;
      seg2.castShadow = true;
      elbow.add(seg2);
      const tool = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.35, 0.5), jointMat);
      tool.position.y = 2.5;
      elbow.add(tool);
      const tip = new THREE.Object3D();
      tip.position.y = 2.75;
      elbow.add(tip);
      this.arms.push({ base, shoulder, elbow, tip, side });
    }
  }

  _buildRacks() {
    // 壁の武器ラック：予備の武器を並べて格納庫らしさを出す（影計算をオフにして高速化）
    const rackMat = new THREE.MeshStandardMaterial({ color: 0x1e232b, metalness: 0.8, roughness: 0.4 });
    const shown = WEAPONS.filter((w) => w.behavior !== 'none').slice(0, 5);
    shown.forEach((w, i) => {
      const x = 17.2;
      const z = -9 + i * 4.5;
      const back = new THREE.Mesh(new THREE.BoxGeometry(0.3, 4.5, 2.6), rackMat);
      back.position.set(x, 3, z);
      this.scene.add(back);
      const model = buildWeaponModel(w);
      model.group.traverse((o) => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = false; } });
      model.group.rotation.set(Math.PI / 2, 0, 0);
      model.group.position.set(x - 0.6, 4.2, z);
      model.group.scale.setScalar(1.15);
      this.scene.add(model.group);
      const tag = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.12, 1.2), new THREE.MeshBasicMaterial({ color: new THREE.Color(w.color).multiplyScalar(2) }));
      tag.position.set(x - 0.2, 0.9, z);
      this.scene.add(tag);
    });
  }

  _buildShutter() {
    // 出撃シャッター（横板が上へ巻き上がる）
    this.shutter = new THREE.Group();
    const slatMat = new THREE.MeshStandardMaterial({ color: 0x3d4652, metalness: 0.8, roughness: 0.42 });
    for (let i = 0; i < 12; i++) {
      const slat = new THREE.Mesh(new THREE.BoxGeometry(14, 0.95, 0.3), slatMat);
      slat.position.y = 0.5 + i;
      this.shutter.add(slat);
    }
    this.shutter.position.set(0, 0, -15.3);
    this.scene.add(this.shutter);
    // シャッターの向こうの砂漠の夜光
    const glow = new THREE.Mesh(new THREE.PlaneGeometry(14, 12), new THREE.MeshBasicMaterial({ color: new THREE.Color(0x3a6fd0).multiplyScalar(1.4) }));
    glow.position.set(0, 6, -15.6);
    this.scene.add(glow);
  }

  /** 機体モデルの差し替え（changedSlot があれば整備アームと火花の演出） */
  setMech(stats, changedSlot) {
    if (this.mech) {
      this.turntable.remove(this.mech);
      this.mech.traverse((o) => { if (o.isInstancedMesh) o.dispose(); });
    }
    this.mech = createVoxelMechModel(stats);
    this.turntable.add(this.mech);
    if (changedSlot) {
      this.armAnim = 1;
      const y = { head: 2.6, body: 1.9, legs: 0.6, booster: 1.8, rarm: 1.7, larm: 1.7 }[changedSlot] ?? 1.5;
      const x = changedSlot === 'rarm' ? 1.1 : changedSlot === 'larm' ? -1.1 : 0;
      const p = new THREE.Vector3(x, y + 0.35, 0);
      this.turntable.localToWorld(p);
      this.particles.spark(p, new THREE.Vector3(0, 0.6, 0), 0xffc46b, 18, 7, 1.4);
      this.particles.flash(p, 0xffe0a0, 0.6, 0.12);
      this.particles.light(p, 0xffb060, 25, 0.3);
      for (let i = 0; i < 2; i++) this.particles.smokePuff(p.clone().add(new THREE.Vector3((Math.random() - 0.5), 0, (Math.random() - 0.5))), 0xbfc4cc, 0.35, 1.2);
    }
  }

  /** 出撃演出：シャッターが開き、カメラが格納庫の出口へ寄っていく */
  startSortie(done) {
    this.sortie = { t: 0, done };
  }

  resize() {
    this.camera.aspect = innerWidth / innerHeight;
    this.camera.updateProjectionMatrix();
  }

  update(dt) {
    this.time += dt;
    const o = this.orbit;
    if (o.auto && !this.sortie) o.yaw += dt * 0.12;
    this.ringMat.color.setRGB(0, 0.9 + Math.sin(this.time * 2) * 0.4, 1.4 + Math.sin(this.time * 2) * 0.5);
    this.hook.position.y = 4.8 + Math.sin(this.time * 0.8) * 0.08;

    // 整備アームの動き
    this.armAnim = Math.max(0, this.armAnim - dt * 1.1);
    const k = Math.sin(Math.min(1, this.armAnim) * Math.PI);
    for (const a of this.arms) {
      a.base.rotation.y = a.side * (Math.PI / 2) + Math.sin(this.time * 0.4 + a.side) * 0.1;
      a.shoulder.rotation.z = a.side * (0.25 + k * 0.55);
      a.elbow.rotation.z = a.side * (0.9 + k * 0.5);
      if (k > 0.6 && Math.random() < 0.4) {
        const p = a.tip.getWorldPosition(new THREE.Vector3());
        this.particles.spark(p, new THREE.Vector3(0, -0.3, 0), 0xffd27a, 3, 5, 1);
      }
    }

    let camPos;
    if (this.sortie) {
      const s = this.sortie;
      s.t += dt;
      // シャッター上昇
      this.shutter.position.y = Math.min(12, Math.max(0, (s.t - 0.3) * 7));
      const u = Math.min(1, s.t / 2.2);
      const e = u * u * (3 - 2 * u);
      camPos = new THREE.Vector3(0, 3.2, 9).lerp(new THREE.Vector3(0, 2.2, -10), e);
      this.camera.position.copy(camPos);
      this.camera.lookAt(0, 2 - e * 0.5, -20);
      if (s.t > 2.3 && s.done) {
        const d = s.done;
        s.done = null;
        d();
      }
    } else {
      this.shutter.position.y = Math.max(0, this.shutter.position.y - dt * 6);
      camPos = new THREE.Vector3(
        o.target.x + Math.sin(o.yaw) * Math.cos(o.pitch) * o.dist,
        o.target.y + Math.sin(o.pitch) * o.dist,
        o.target.z + Math.cos(o.yaw) * Math.cos(o.pitch) * o.dist
      );
      this.camera.position.lerp(camPos, 1 - Math.exp(-8 * dt));
      this.camera.lookAt(o.target);
    }
    this.particles.update(dt);
  }

  resetCamera() {
    this.sortie = null;
    this.shutter.position.y = 0;
  }
}
