import * as THREE from 'three';
import { buildVoxelCluster } from './voxelBuilder.js';

/**
 * 舞台環境モジュール
 * - 広大な砂上船（76m×116m）。甲板は継ぎ目・リベット・擦り傷のある重金属プレート
 * - 幻想的な夜の砂漠（月と光のリング、星雲、発光する胞子）。ステージごとに色テーマ変更
 * - 細い風切りストリーク（常時）と、Wave間の砂嵐（フォグ）
 * - カメラが遮蔽物に入り込むと遮蔽物がすっと半透明になる
 */

export const SHIP_BOUNDS = {
  halfWidth: 38,
  halfLength: 58,
  deckY: 0
};

/** 甲板用：重金属プレートのテクスチャをCanvasで生成 */
export function createDeckTexture() {
  const size = 512;
  const cv = document.createElement('canvas');
  cv.width = cv.height = size;
  const g = cv.getContext('2d');

  g.fillStyle = '#3a4250';
  g.fillRect(0, 0, size, size);

  const plates = 4;
  const ps = size / plates;
  for (let i = 0; i < plates; i++) {
    for (let j = 0; j < plates; j++) {
      // プレートごとに微妙に色を変える（使い込まれた鉄板感）
      const v = 52 + Math.floor(Math.random() * 18);
      g.fillStyle = `rgb(${v},${v + 6},${v + 16})`;
      g.fillRect(i * ps + 3, j * ps + 3, ps - 6, ps - 6);

      // 擦り傷
      g.strokeStyle = 'rgba(160,175,195,0.10)';
      g.lineWidth = 1;
      for (let k = 0; k < 14; k++) {
        const x = i * ps + Math.random() * ps;
        const y = j * ps + Math.random() * ps;
        g.beginPath();
        g.moveTo(x, y);
        g.lineTo(x + (Math.random() - 0.5) * 50, y + (Math.random() - 0.5) * 12);
        g.stroke();
      }

      // 四隅のリベット
      for (const [rx, ry] of [[10, 10], [ps - 10, 10], [10, ps - 10], [ps - 10, ps - 10]]) {
        g.fillStyle = '#1a1e25';
        g.beginPath();
        g.arc(i * ps + rx + 1, j * ps + ry + 1, 4, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = '#9aa6b5';
        g.beginPath();
        g.arc(i * ps + rx, j * ps + ry, 3.2, 0, Math.PI * 2);
        g.fill();
      }
    }
  }
  // 継ぎ目（溶接線）
  g.strokeStyle = '#12161c';
  g.lineWidth = 5;
  for (let k = 0; k <= plates; k++) {
    g.beginPath(); g.moveTo(k * ps, 0); g.lineTo(k * ps, size); g.stroke();
    g.beginPath(); g.moveTo(0, k * ps); g.lineTo(size, k * ps); g.stroke();
  }

  const tex = new THREE.CanvasTexture(cv);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

export class DesertShipWorld {
  constructor(scene) {
    this.scene = scene;
    this.shipGroup = new THREE.Group();
    this.scene.add(this.shipGroup);

    this.obstacles = [];
    this.stormFactor = 0.0;
    this.targetStormFactor = 0.0;

    this.clearFogColor = new THREE.Color(0x0c1633);
    this.stormFogColor = new THREE.Color(0x6e4e32);

    this._setupSky();
    this._setupDunes();
    this._setupShip();
    this._setupWindStreaks();
  }

  _setupSky() {
    this.scene.background = new THREE.Color(0x070d21);
    this.scene.fog = new THREE.FogExp2(0x0c1633, 0.0022);

    this.hemi = new THREE.HemisphereLight(0x6f9ceb, 0x261b38, 0.9);
    this.scene.add(this.hemi);

    this.moonLight = new THREE.DirectionalLight(0xd8ecff, 2.4);
    this.moonLight.position.set(110, 160, -180);
    this.moonLight.castShadow = true;
    this.moonLight.shadow.mapSize.set(1024, 1024);
    this.moonLight.shadow.camera.near = 10;
    this.moonLight.shadow.camera.far = 450;
    const d = 80;
    Object.assign(this.moonLight.shadow.camera, { left: -d, right: d, top: d, bottom: -d });
    this.moonLight.shadow.bias = -0.0005;
    this.scene.add(this.moonLight);

    // 月と光のリング
    const moonGroup = new THREE.Group();
    this.moonCoreMat = new THREE.MeshBasicMaterial({ color: 0xf4faff, fog: false });
    moonGroup.add(new THREE.Mesh(new THREE.IcosahedronGeometry(34, 2), this.moonCoreMat));
    this.moonGlowMat = new THREE.MeshBasicMaterial({ color: 0x70c4ff, transparent: true, opacity: 0.22, fog: false, depthWrite: false });
    moonGroup.add(new THREE.Mesh(new THREE.IcosahedronGeometry(46, 2), this.moonGlowMat));
    this.moonGlowMat2 = new THREE.MeshBasicMaterial({ color: 0x4f75ff, transparent: true, opacity: 0.1, fog: false, depthWrite: false });
    moonGroup.add(new THREE.Mesh(new THREE.IcosahedronGeometry(66, 2), this.moonGlowMat2));
    this.ringMat = new THREE.MeshBasicMaterial({ color: 0x80e5ff, side: THREE.DoubleSide, transparent: true, opacity: 0.3, fog: false, depthWrite: false });
    const ring = new THREE.Mesh(new THREE.RingGeometry(52, 60, 64), this.ringMat);
    ring.rotation.set(Math.PI * 0.35, Math.PI * 0.15, 0);
    moonGroup.add(ring);
    moonGroup.position.set(150, 175, -380);
    this.scene.add(moonGroup);
    this.moonGroup = moonGroup;

    // 星空（インスタンス描画の発光キューブ）
    const starCount = 900;
    const palette = [0xffffff, 0x80e5ff, 0xc5a3ff, 0xffdf9e].map((c) => new THREE.Color(c));
    this.stars = new THREE.InstancedMesh(
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshBasicMaterial({ color: 0xffffff, fog: false }),
      starCount
    );
    const dm = new THREE.Object3D();
    for (let i = 0; i < starCount; i++) {
      const r = 600 + Math.random() * 150;
      const th = Math.random() * Math.PI * 2;
      const ph = Math.random() * Math.PI * 0.45;
      dm.position.set(Math.cos(th) * Math.cos(ph) * r, 30 + Math.sin(ph) * r, Math.sin(th) * Math.cos(ph) * r);
      dm.scale.setScalar(0.7 + Math.random() * 1.4);
      dm.rotation.set(Math.random() * 3, Math.random() * 3, 0);
      dm.updateMatrix();
      this.stars.setMatrixAt(i, dm.matrix);
      this.stars.setColorAt(i, palette[i % palette.length].clone().multiplyScalar(Math.random() < 0.08 ? 3 : 0.9));
    }
    this.stars.frustumCulled = false;
    this.scene.add(this.stars);
  }

  _setupDunes() {
    const floorGeo = new THREE.PlaneGeometry(1800, 1800, 80, 80);
    floorGeo.rotateX(-Math.PI / 2);
    const p = floorGeo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const vx = p.getX(i);
      const vz = p.getZ(i);
      const clear = Math.min(1, Math.max(0, (Math.abs(vx) - 52) / 55));
      const h = (Math.sin(vx * 0.016 + vz * 0.008) * Math.cos(vz * 0.014) * 26 + Math.sin(vz * 0.035 - vx * 0.02) * 10) * clear;
      p.setY(i, h - 12);
    }
    floorGeo.computeVertexNormals();
    this.duneMat = new THREE.MeshStandardMaterial({
      color: 0x1e294a, emissive: 0x0b132b, emissiveIntensity: 0.45, roughness: 0.7, metalness: 0.15, flatShading: true
    });
    this.duneMesh1 = new THREE.Mesh(floorGeo, this.duneMat);
    this.duneMesh2 = new THREE.Mesh(floorGeo, this.duneMat);
    this.duneMesh2.position.z = -1800;
    this.scene.add(this.duneMesh1, this.duneMesh2);

    // 砂丘に漂う光の胞子（インスタンス描画の発光粒）
    const n = 200;
    this.sporeData = [];
    for (let i = 0; i < n; i++) {
      const side = i % 2 === 0 ? 1 : -1;
      this.sporeData.push({ x: side * (60 + Math.random() * 320), y: -8 + Math.random() * 30, z: (Math.random() - 0.5) * 1000, s: 0.4 + Math.random() * 0.7, ph: Math.random() * 6 });
    }
    this.sporeMat = new THREE.MeshBasicMaterial({ color: 0x64ffda, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false });
    this.spores = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0), this.sporeMat, n);
    this.spores.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.spores.frustumCulled = false;
    this.scene.add(this.spores);
  }

  _setupShip() {
    const hw = SHIP_BOUNDS.halfWidth;
    const hl = SHIP_BOUNDS.halfLength;

    // 甲板：重金属プレート
    const deckTex = createDeckTexture();
    deckTex.repeat.set((hw * 2) / 8, (hl * 2) / 8);
    const deckTopMat = new THREE.MeshStandardMaterial({ map: deckTex, metalness: 0.75, roughness: 0.42 });
    const deckSideMat = new THREE.MeshStandardMaterial({ color: 0x1b222d, metalness: 0.8, roughness: 0.4 });
    const deck = new THREE.Mesh(new THREE.BoxGeometry(hw * 2, 3.0, hl * 2), [
      deckSideMat, deckSideMat, deckTopMat, deckSideMat, deckSideMat, deckSideMat
    ]);
    deck.position.y = -1.5;
    deck.receiveShadow = true;
    this.shipGroup.add(deck);

    // 船縁の発光ライン＋警告ストライプ
    const lineMat = new THREE.MeshStandardMaterial({ color: 0x00e5ff, emissive: 0x00b8d4, emissiveIntensity: 0.9 });
    const hazardA = new THREE.MeshStandardMaterial({ color: 0xffb300, metalness: 0.5, roughness: 0.5 });
    const hazardB = new THREE.MeshStandardMaterial({ color: 0x15171b, metalness: 0.5, roughness: 0.5 });
    for (const side of [-1, 1]) {
      const strip = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.08, hl * 2 - 2), lineMat);
      strip.position.set(side * (hw - 0.6), 0.04, 0);
      this.shipGroup.add(strip);
      for (let z = -hl + 2; z < hl - 2; z += 2) {
        const h = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.05, 1.0), (z / 2) % 2 === 0 ? hazardA : hazardB);
        h.position.set(side * (hw - 1.9), 0.03, z);
        h.receiveShadow = true;
        this.shipGroup.add(h);
      }
    }

    // 船体ハル＋船首
    const hullMat = new THREE.MeshStandardMaterial({ color: 0x131924, metalness: 0.85, roughness: 0.35 });
    const hull = new THREE.Mesh(new THREE.BoxGeometry(hw * 2 + 6, 9, hl * 2 + 16), hullMat);
    hull.position.y = -7.5;
    this.shipGroup.add(hull);
    const prow = new THREE.Mesh(new THREE.BoxGeometry(hw * 1.4, 5.5, 18), hullMat);
    prow.position.set(0, -2.5, -hl - 8);
    this.shipGroup.add(prow);

    // 船尾の推進器（青く光る）
    const jetMat = new THREE.MeshBasicMaterial({ color: 0x40e0ff });
    for (const tx of [-24, -8, 8, 24]) {
      const jet = new THREE.Mesh(new THREE.BoxGeometry(7, 4.5, 1.5), jetMat);
      jet.position.set(tx, -6, hl + 8.2);
      this.shipGroup.add(jet);
    }

    // 遮蔽物コンテナ
    const crates = [
      { x: -18, z: -28, w: 5.2, h: 4.0, d: 5.2, color: 0x8a5a2b },
      { x: 18, z: -28, w: 5.2, h: 4.0, d: 5.2, color: 0x2f5670 },
      { x: 0, z: -14, w: 7.0, h: 3.4, d: 4.2, color: 0x4a5745 },
      { x: -22, z: 4, w: 4.8, h: 4.2, d: 6.5, color: 0x6e3d33 },
      { x: 22, z: 4, w: 4.8, h: 4.2, d: 6.5, color: 0x8a5a2b },
      { x: -12, z: 24, w: 5.5, h: 3.6, d: 5.0, color: 0x2f5670 },
      { x: 12, z: 24, w: 5.5, h: 3.6, d: 5.0, color: 0x4a5745 },
      { x: 0, z: 38, w: 6.5, h: 3.4, d: 4.5, color: 0x3d4552 }
    ];
    for (const c of crates) {
      const mesh = this._createVoxelCrate(c.w, c.h, c.d, c.color);
      mesh.position.set(c.x, 0, c.z);
      this.shipGroup.add(mesh);
      this.obstacles.push({
        minX: c.x - c.w / 2, maxX: c.x + c.w / 2,
        minZ: c.z - c.d / 2, maxZ: c.z + c.d / 2,
        maxY: c.h,
        center: new THREE.Vector3(c.x, c.h / 2, c.z),
        mesh, currentOpacity: 1, targetOpacity: 1
      });
    }
  }

  _createVoxelCrate(w, h, d, baseColor) {
    const voxels = [];
    const scale = 0.72;
    const nx = Math.max(2, Math.round(w / scale));
    const ny = Math.max(2, Math.round(h / scale));
    const nz = Math.max(2, Math.round(d / scale));
    for (let ix = 0; ix < nx; ix++)
      for (let iy = 0; iy < ny; iy++)
        for (let iz = 0; iz < nz; iz++) {
          const surf = ix === 0 || ix === nx - 1 || iy === 0 || iy === ny - 1 || iz === 0 || iz === nz - 1;
          if (!surf) continue;
          const edges = (ix === 0 || ix === nx - 1) + (iy === 0 || iy === ny - 1) + (iz === 0 || iz === nz - 1);
          const isLight = iy === ny - 1 && edges === 3;
          // 波板コンテナ風の縦リブ
          const rib = edges < 2 && (ix + iz) % 2 === 0;
          voxels.push({
            x: ix - (nx - 1) / 2, y: iy + 0.5, z: iz - (nz - 1) / 2,
            color: isLight ? 0x00e5ff : edges >= 2 ? 0x22262e : rib ? new THREE.Color(baseColor).multiplyScalar(0.8).getHex() : baseColor,
            emissive: isLight ? 0x00e5ff : 0, emissiveIntensity: isLight ? 1.4 : 0,
            metalness: 0.8, roughness: 0.4
          });
        }
    return buildVoxelCluster(voxels, scale, true);
  }

  _setupWindStreaks() {
    const count = 130;
    this.windInst = new THREE.InstancedMesh(
      new THREE.BoxGeometry(0.04, 0.04, 8.5),
      new THREE.MeshBasicMaterial({ color: 0xc8f0ff, transparent: true, opacity: 0.3, depthWrite: false }),
      count
    );
    this.windInst.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.windData = [];
    const arr = this.windInst.instanceMatrix.array;
    for (let i = 0; i < count; i++) {
      const x = (Math.random() - 0.5) * 110;
      const y = 0.6 + Math.random() * 26;
      const z = (Math.random() - 0.5) * 150;
      this.windData.push({ x, y, z, speed: 55 + Math.random() * 35 });
      const b = i * 16;
      arr[b] = 1; arr[b + 5] = 1; arr[b + 10] = 1; arr[b + 15] = 1;
      arr[b + 12] = x; arr[b + 13] = y; arr[b + 14] = z;
    }
    this.scene.add(this.windInst);
  }

  /** ステージごとの色テーマを適用 */
  applyTheme(theme) {
    this.scene.background.setHex(theme.sky);
    this.clearFogColor.setHex(theme.fog);
    this.stormFogColor.setHex(theme.storm);
    this.moonCoreMat.color.setHex(theme.moon);
    this.moonGlowMat.color.setHex(theme.moonGlow);
    this.moonGlowMat2.color.setHex(theme.moonGlow);
    this.ringMat.color.setHex(theme.ring);
    this.moonLight.color.setHex(theme.moon);
    this.duneMat.color.setHex(theme.dune);
    this.duneMat.emissive.setHex(theme.duneEmissive);
    this.sporeMat.color.setHex(theme.spores);
    this.hemi.color.setHex(theme.hemiSky);
    this.hemi.groundColor.setHex(theme.hemiGround);
  }

  /** カメラが入り込んだ／視線を遮った遮蔽物を半透明化 */
  updateObstacleTransparency(cameraPos, playerPos, dt) {
    const seg = playerPos.clone().sub(cameraPos);
    const len = seg.length();
    if (len > 0.001) seg.divideScalar(len);

    for (const obs of this.obstacles) {
      const m = 1.8;
      const inside =
        cameraPos.x >= obs.minX - m && cameraPos.x <= obs.maxX + m &&
        cameraPos.z >= obs.minZ - m && cameraPos.z <= obs.maxZ + m &&
        cameraPos.y <= obs.maxY + m;

      let blocks = false;
      if (!inside) {
        const proj = obs.center.clone().sub(cameraPos).dot(seg);
        if (proj > 0 && proj < len) {
          const cp = cameraPos.clone().addScaledVector(seg, proj);
          blocks =
            cp.x >= obs.minX - 0.8 && cp.x <= obs.maxX + 0.8 &&
            cp.z >= obs.minZ - 0.8 && cp.z <= obs.maxZ + 0.8 &&
            cp.y <= obs.maxY + 0.6;
        }
      }

      obs.targetOpacity = inside || blocks ? 0.2 : 1;
      if (Math.abs(obs.currentOpacity - obs.targetOpacity) < 0.002) continue;
      obs.currentOpacity += (obs.targetOpacity - obs.currentOpacity) * Math.min(1, dt * 10);
      if (Math.abs(obs.currentOpacity - obs.targetOpacity) < 0.005) obs.currentOpacity = obs.targetOpacity;
      const translucent = obs.currentOpacity < 0.98;
      for (const mat of obs.mesh.userData.materials || []) {
        if (mat.transparent !== translucent) {
          mat.transparent = translucent;
          mat.depthWrite = !translucent;
          mat.needsUpdate = true;
        }
        mat.opacity = obs.currentOpacity;
      }
    }
  }

  setSandstormMode(heavy) {
    this.targetStormFactor = heavy ? 1 : 0;
    const overlay = document.getElementById('sandstorm-overlay');
    if (overlay) overlay.style.opacity = heavy ? '0.88' : '0';
  }

  update(dt, shipSpeed = 55) {
    this.stormFactor += (this.targetStormFactor - this.stormFactor) * Math.min(1, dt * 1.4);
    this.scene.fog.color.lerpColors(this.clearFogColor, this.stormFogColor, this.stormFactor);
    this.scene.fog.density = THREE.MathUtils.lerp(0.0018, 0.024, this.stormFactor);

    const scroll = shipSpeed * dt;
    for (const m of [this.duneMesh1, this.duneMesh2]) {
      m.position.z += scroll;
      if (m.position.z >= 1800) m.position.z -= 3600;
    }

    const t = performance.now() * 0.001;
    const sArr = this.spores.instanceMatrix.array;
    for (let i = 0; i < this.sporeData.length; i++) {
      const s = this.sporeData[i];
      s.z += scroll * 0.6;
      if (s.z > 500) s.z -= 1000;
      const sc = s.s * (0.7 + 0.3 * Math.sin(t * 2 + s.ph));
      const b = i * 16;
      sArr[b] = sc; sArr[b + 5] = sc; sArr[b + 10] = sc; sArr[b + 15] = 1;
      sArr[b + 12] = s.x;
      sArr[b + 13] = s.y + Math.sin(t * 0.8 + s.ph) * 1.5;
      sArr[b + 14] = s.z;
    }
    this.spores.instanceMatrix.needsUpdate = true;

    // 船体のわずかな振動
    this.shipGroup.position.y = Math.sin(t * 11) * 0.02;

    const wArr = this.windInst.instanceMatrix.array;
    const stormMul = 1 + this.stormFactor * 0.8;
    for (let i = 0; i < this.windData.length; i++) {
      const w = this.windData[i];
      w.z += (w.speed * stormMul + shipSpeed * 0.35) * dt;
      if (w.z > 75) {
        w.z = -75;
        w.x = (Math.random() - 0.5) * 110;
        w.y = 0.6 + Math.random() * 24;
      }
      const b = i * 16;
      wArr[b + 12] = w.x;
      wArr[b + 13] = w.y;
      wArr[b + 14] = w.z;
    }
    this.windInst.instanceMatrix.needsUpdate = true;
  }
}
