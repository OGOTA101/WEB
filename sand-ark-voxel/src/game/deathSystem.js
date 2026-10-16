import * as THREE from 'three';
import { createWreckModel } from '../voxelBuilder.js';
import { audio } from '../audio.js';
import { $, WRECK_TIME, REDEPLOY_TIME, REVIVE_TIME, REVIVE_RADIUS, HW, HL } from './util.js';

/**
 * 大破・救援・再出撃
 *  - 船上でHP0 → その場に残骸が30秒残る（煙と火花）
 *  - 仲間（AI僚機／オンラインの味方）が残骸の近くにしばらく留まると復旧 → 即復帰（HP1割）
 *  - 30秒経過で完全大破、または [G] でガレージ帰還を選ぶと、30秒後に再出撃
 *  - 船外落下は残骸が残らないので、そのままガレージから30秒後に再出撃
 */
export const DeathSystem = {
  _downPlayer(title, onDeck) {
    const p = this.player;
    if (p.dead) return;
    p.dead = true;
    p.hp = 0;
    p.mesh.visible = false;
    p.lunge = null;
    p.dodge = null;
    this.runStats.deaths++;
    for (const ws of this.weaponStates) this._stopLoops(ws);
    this._setLock(null, true);
    this.mouse.left = false;
    this.ads = false;

    this.px.explosion(p.pos.clone().add(new THREE.Vector3(0, 1.5, 0)), 0xff6a3a, 1.8);
    audio.play('playerDestroyed', { throttle: 0 });
    audio.play('explosionBig', { throttle: 0 });
    this.cam.shake = 1.0;

    if (onDeck) {
      p.downState = 'wreck';
      p.wreckTimer = WRECK_TIME;
      p.revive = 0;
      p.reviveSE = 0;
      p.wreckFx = 0;
      this.wreck = createWreckModel(this.stats);
      this.wreck.position.copy(p.pos);
      this.wreck.position.y = Math.max(0, p.pos.y);
      this.wreck.rotation.y = p.yaw;
      this.scene.add(this.wreck);
      // 救援範囲を示す緑の円
      const ringMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0x00e676).multiplyScalar(1.8), transparent: true, opacity: 0.7, depthWrite: false });
      const fillMat = new THREE.MeshBasicMaterial({ color: 0x00e676, transparent: true, opacity: 0.22, depthWrite: false });
      const g = new THREE.Group();
      const ring = new THREE.Mesh(this.geo.ring, ringMat);
      ring.scale.setScalar(REVIVE_RADIUS);
      const fill = new THREE.Mesh(this.geo.disc, fillMat);
      fill.scale.setScalar(0.01);
      g.add(ring, fill);
      g.position.set(p.pos.x, 0.07, p.pos.z);
      this.scene.add(g);
      this.reviveMarker = { group: g, ring, fill, ringMat };
      this._announce(title, '残骸の近くに仲間が来ると復旧できます');
    } else {
      this._startRedeploy();
      this._announce(title, 'ガレージから再出撃します');
    }
    $('wreck-panel').classList.remove('hidden');
    this._updateWreckPanel();
  },

  _startRedeploy() {
    const p = this.player;
    // 予備機が尽きていたら再出撃できない（全機大破 → ゲームオーバー）
    if ((this.reserve || 0) <= 0) {
      this._clearWreck();
      this._gameOver();
      return;
    }
    this.reserve--;
    p.downState = 'redeploy';
    p.redeployTimer = REDEPLOY_TIME;
    if (this.wreck) {
      this.px.explosion(this.wreck.position.clone().add(new THREE.Vector3(0, 1, 0)), 0xff8a30, 1.4);
      audio.play('explosionMid', { pos: this.wreck.position, throttle: 0 });
    }
    this._clearWreck();
  },

  /** 修理キットで蘇生開始（5秒） */
  _useHealKit() {
    const p = this.player;
    if (this.state !== 'playing' || !(this.healKits > 0)) return;
    if (!p.dead) {
      if (p.hp >= p.maxHp) return;
      this.healKits--;
      p.hp = Math.min(p.maxHp, p.hp + p.maxHp * 0.5);
      audio.play('revived', { throttle: 0, vol: 0.6 });
      this.px.ring(p.pos, 5, 0x44ff88, 0.5);
    } else if (!(p.itemRevive > 0) && (p.downState === 'wreck' || p.downState === 'redeploy')) {
      this.healKits--;
      p.itemRevive = 5;
      audio.play('reviveTick', { throttle: 0 });
    }
  },

  _clearWreck() {
    if (this.wreck) { this.scene.remove(this.wreck); this.wreck = null; }
    if (this.reviveMarker) { this.scene.remove(this.reviveMarker.group); this.reviveMarker = null; }
  },

  /** 仲間による復旧 → 残骸の位置で即復帰（HP1割） */
  _revivePlayer() {
    const p = this.player;
    const at = this.wreck ? this.wreck.position.clone() : p.pos.clone();
    this._clearWreck();
    this._respawn(at, 0.1);
    audio.play('revived', { throttle: 0 });
    this.px.ring(at, 6, 0x00e676, 0.6);
    for (let i = 0; i < 20; i++) {
      this.px.glow.spawn(at.clone().add(new THREE.Vector3((Math.random() - 0.5) * 3, Math.random() * 3, (Math.random() - 0.5) * 3)), new THREE.Vector3(0, 3, 0), 0x64ffda, 0.12, 0.8, { intensity: 3, drag: 0.04 });
    }
    this._announce('REVIVED', '仲間の救援で復旧（HP 10%）');
  },

  _respawn(pos, hpRatio) {
    const p = this.player;
    p.dead = false;
    p.downState = null;
    p.hp = Math.max(1, Math.round(p.maxHp * hpRatio));
    p.ep = p.maxEp * (hpRatio < 1 ? 0.5 : 1);
    p.stun = p.burn = 0;
    p.pos.copy(pos);
    p.pos.y = Math.max(0, pos.y);
    p.vel.set(0, 0, 0);
    p.knock.set(0, 0, 0);
    p.mesh.visible = true;
    p.invuln = 2.5;
    this.cam.init = false;
    $('wreck-panel').classList.add('hidden');
  },

  _updateDown(dt) {
    const p = this.player;
    if (!p.dead) return;

    // 修理キットによる5秒蘇生
    if (p.itemRevive > 0) {
      p.itemRevive -= dt;
      if (Math.random() < 0.5 && this.wreck) this.px.glow.spawn(this.wreck.position.clone().add(new THREE.Vector3((Math.random() - 0.5) * 3, 0.3, (Math.random() - 0.5) * 3)), new THREE.Vector3(0, 3, 0), 0x44ff88, 0.12, 0.7, { intensity: 3 });
      if (p.itemRevive <= 0) {
        p.itemRevive = 0;
        const at = this.wreck ? this.wreck.position.clone() : new THREE.Vector3(0, 0, Math.min(HL - 8, 42));
        this._clearWreck();
        this._respawn(at, 0.3);
        audio.play('revived', { throttle: 0 });
        this.px.ring(at, 6, 0x44ff88, 0.6);
        this._announce('REVIVED', '修理キットで蘇生（HP 30%）');
        return;
      }
    }
    // 救援もキットも予備機も無ければ全機大破
    if (p.downState === 'wreck' && !(p.itemRevive > 0) && (this.reserve || 0) <= 0 && !(this.healKits > 0)
      && !this.allies.some((a) => a.state !== 'gone') && ![...this.remoteMeshes.values()].some((m) => !m.userData.wreck)) {
      this._clearWreck();
      this._gameOver();
      return;
    }

    if (p.downState === 'wreck') {
      p.wreckTimer -= dt;
      const wp = this.wreck.position;
      // 残骸から煙と火花
      p.wreckFx -= dt;
      if (p.wreckFx <= 0) {
        p.wreckFx = 0.12;
        this.px.smokePuff(wp.clone().add(new THREE.Vector3((Math.random() - 0.5) * 1.5, 1.8, (Math.random() - 0.5) * 1.5)), 0x2a2a2e, 0.7, 2.2, new THREE.Vector3((Math.random() - 0.5), 2.2, (Math.random() - 0.5)));
        if (Math.random() < 0.25) {
          const sp = wp.clone().add(new THREE.Vector3((Math.random() - 0.5) * 2, 1 + Math.random() * 1.5, (Math.random() - 0.5) * 2));
          this.px.spark(sp, new THREE.Vector3(0, 1, 0), 0xffd27a, 8, 6, 1);
          this.px.flash(sp, 0xffc070, 0.3, 0.06);
          audio.play('wreckSpark', { pos: sp, throttle: 0.3 });
        }
        if (Math.random() < 0.3) this.px.glow.spawn(wp.clone().add(new THREE.Vector3(0, 1.5, 0)), new THREE.Vector3(0, 2, 0), 0xff6a1a, 0.4, 0.5, { grow: 0.6, intensity: 2 });
      }
      // 救援者の数（AI僚機・オンラインの味方）
      let helpers = 0;
      for (const a of this.allies) if (a.state === 'alive' && a.mesh.position.distanceTo(wp) < REVIVE_RADIUS) helpers++;
      for (const m of this.remoteMeshes.values()) if (!m.userData.wreck && m.position.distanceTo(wp) < REVIVE_RADIUS) helpers++;
      if (helpers > 0) {
        p.revive = Math.min(1, p.revive + (dt / REVIVE_TIME) * Math.sqrt(helpers));
        p.reviveSE -= dt;
        if (p.reviveSE <= 0) { audio.play('reviveTick', { throttle: 0 }); p.reviveSE = 0.6; }
        if (Math.random() < 0.6) this.px.glow.spawn(wp.clone().add(new THREE.Vector3((Math.random() - 0.5) * 4, 0.2, (Math.random() - 0.5) * 4)), new THREE.Vector3(0, 2.5, 0), 0x64ffda, 0.1, 0.8, { intensity: 2.5 });
      } else {
        p.revive = Math.max(0, p.revive - dt * 0.05);
      }
      const rm = this.reviveMarker;
      if (rm) {
        rm.fill.scale.setScalar(Math.max(0.01, REVIVE_RADIUS * p.revive));
        rm.ringMat.opacity = 0.45 + Math.sin(performance.now() * 0.006) * 0.25;
      }
      this.helpersNow = helpers;
      if (p.revive >= 1) { this._revivePlayer(); return; }
      if (p.wreckTimer <= 0) {
        this._announce('完全大破', 'ガレージから再出撃します');
        this._startRedeploy();
      }
    } else if (p.downState === 'redeploy') {
      p.redeployTimer -= dt;
      if (p.redeployTimer <= 0) {
        // 船尾の安全な位置から再出撃
        this._respawn(new THREE.Vector3(0, 0, Math.min(HL - 8, 42)), 1);
        audio.play('redeploy', { throttle: 0 });
        this.px.ring(this.player.pos, 6, 0x00e5ff, 0.6);
        this._announce('REDEPLOYED', 'ガレージから再出撃');
      }
    }
    this._updateWreckPanel();
    void HW;
  },

  _updateWreckPanel() {
    const p = this.player;
    if (!p.dead) return;
    if (p.downState === 'wreck') {
      $('wreck-title').textContent = '機体大破';
      $('wreck-sub').textContent = this.helpersNow ? `復旧中… 救援 ${this.helpersNow} 機` : (this.allies.length || this.remoteMeshes.size ? '仲間が残骸へ向かっています' : '救援できる仲間がいません');
      $('wreck-revive-bar').style.width = `${p.revive * 100}%`;
      $('wreck-timer').textContent = `残骸保持 ${Math.ceil(p.wreckTimer)}s`;
      $('wreck-action').textContent = p.itemRevive > 0 ? `修理キット蘇生中… ${Math.ceil(p.itemRevive)}s` : `[G] ガレージから再出撃（${REDEPLOY_TIME}秒・予備機 残${this.reserve}）／ [H] 修理キットで5秒蘇生（所持${this.healKits || 0}）`;
      $('wreck-action').classList.remove('hidden');
    } else {
      $('wreck-title').textContent = 'ガレージ帰還中';
      $('wreck-sub').textContent = '予備機を整備しています';
      $('wreck-revive-bar').style.width = `${(1 - p.redeployTimer / REDEPLOY_TIME) * 100}%`;
      $('wreck-timer').textContent = `再出撃まで ${Math.ceil(p.redeployTimer)}s`;
      $('wreck-action').textContent = p.itemRevive > 0 ? `修理キット蘇生中… ${Math.ceil(p.itemRevive)}s` : `[H] 修理キットで5秒蘇生（所持${this.healKits || 0}）`;
      $('wreck-action').classList.remove('hidden');
    }
  }
};
