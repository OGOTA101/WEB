import { PARTS_CATALOG, SLOT_LABELS, computeMechStats } from '../partsData.js';
import { BUILTIN_WEAPONS } from '../weapons.js';
import { STAGES } from '../stages.js';
import { partIcon } from '../iconRenderer.js';
import { audio } from '../audio.js';
import { $ } from './util.js';

/**
 * ガレージUI（倉庫からパーツを組み替える画面）
 * SandArkGame.prototype に混ぜ込んで使う
 */
const SLOT_ORDER = ['head', 'body', 'rarm', 'larm', 'legs', 'booster'];
const SLOT_EN = { head: 'HEAD', body: 'CORE', rarm: 'R-ARM', larm: 'L-ARM', legs: 'LEGS', booster: 'BOOSTER' };
const SPEC_DEF = [
  { k: 'hp', label: 'HP', max: 3000 },
  { k: 'ep', label: 'EP', max: 1600 },
  { k: 'mobility', label: '機動力', max: 200 },
  { k: 'jump', label: '跳躍力', max: 160 },
  { k: 'processing', label: '処理速度', max: 180 }
];

function weaponSpecText(w) {
  if (w.behavior === 'none') return `機動力 +${w.mobilityBonus}`;
  if (w.behavior === 'beam') return `DPS ${w.dps} ／ 照射 ${(w.mag / w.drain).toFixed(1)}s ／ 冷却 ${w.reload}s`;
  if (w.behavior === 'flame') return `炎上付与 ／ 燃料 ${(w.mag / w.drain).toFixed(1)}s`;
  if (w.behavior === 'melee') return `威力 ${w.damage} ／ 間隔 ${w.fireRate}s ／ 踏込 ${w.lunge}m${w.mag ? ` ／ 装填 ${w.mag}` : ''}`;
  const mul = w.burst || w.count || w.pellets;
  return `威力 ${w.damage}${mul ? '×' + mul : ''} ／ 弾数 ${w.mag} ／ 装填 ${w.reload}s ／ 出力 ${w.power}`;
}

function partSpecText(slot, p) {
  if (slot === 'head') return `処理速度 ${p.processing}`;
  if (slot === 'body') return `HP ${p.hp} ／ EP ${p.ep}`;
  if (slot === 'legs') return `機動 ${p.mobility} ／ 跳躍 ${p.jump}`;
  if (slot === 'booster') return `機動 +${p.mobilityBonus} ／ 跳躍 +${p.jumpBonus}`;
  return weaponSpecText(p);
}

export const GarageUI = {
  _initGarageUI() {
    this.garageSlot = 'head';

    document.querySelectorAll('.g-tab').forEach((tab) => {
      tab.addEventListener('click', () => {
        audio.play('uiClick', { throttle: 0 });
        document.querySelectorAll('.g-tab').forEach((t) => t.classList.toggle('active', t === tab));
        $('g-assemble').classList.toggle('hidden', tab.dataset.tab !== 'assemble');
        $('g-sortie').classList.toggle('hidden', tab.dataset.tab !== 'sortie');
      });
    });

    $('btn-launch').addEventListener('click', () => this._beginSortie());
    $('btn-resume').addEventListener('click', () => { audio.play('uiClick', { throttle: 0 }); this._resume(); });
    $('btn-retreat').addEventListener('click', () => { audio.play('uiClick', { throttle: 0 }); this._fadeToGarage(true); });
    $('btn-result-menu').addEventListener('click', () => { audio.play('uiClick', { throttle: 0 }); this._fadeToGarage(false); });

    const st = $('mp-status-text');
    $('btn-create-room').addEventListener('click', () => { audio.play('uiClick', { throttle: 0 }); this.net.createRoom((m) => (st.textContent = m)); });
    $('btn-join-room').addEventListener('click', () => { audio.play('uiClick', { throttle: 0 }); this.net.joinRoom($('input-room-id').value, (m) => (st.textContent = m)); });
    $('select-ai-allies').addEventListener('change', () => audio.play('uiSelect', { throttle: 0 }));

    const vol = $('volume-slider');
    vol.value = audio.volume;
    vol.addEventListener('input', () => audio.setVolume(parseFloat(vol.value)));

    // 機体プレビューのドラッグ回転
    const cv = this.renderer.domElement;
    cv.addEventListener('pointerdown', (e) => {
      if (this.state !== 'garage') return;
      this._drag = { x: e.clientX, y: e.clientY };
      this.garage.orbit.auto = false;
    });
    addEventListener('pointerup', () => (this._drag = null));
    addEventListener('pointermove', (e) => {
      if (!this._drag || this.state !== 'garage') return;
      const o = this.garage.orbit;
      o.yaw -= (e.clientX - this._drag.x) * 0.008;
      o.pitch = Math.max(-0.05, Math.min(0.7, o.pitch + (e.clientY - this._drag.y) * 0.004));
      this._drag = { x: e.clientX, y: e.clientY };
    });
    cv.addEventListener('wheel', (e) => {
      if (this.state !== 'garage') return;
      this.garage.orbit.dist = Math.max(5.5, Math.min(14, this.garage.orbit.dist + e.deltaY * 0.01));
    }, { passive: true });

    this._renderGarage();
  },

  _renderGarage() {
    this._renderSlots();
    this._renderInventory();
    this._renderSpec();
    this._renderWeaponKeys();
    this._renderStageList();
  },

  _renderSlots() {
    const list = $('slot-list');
    list.innerHTML = '';
    for (const slot of SLOT_ORDER) {
      const part = this.stats.parts[slot];
      const btn = document.createElement('button');
      btn.className = `slot-btn${slot === this.garageSlot ? ' active' : ''}`;
      const icon = partIcon(slot, part);
      btn.innerHTML = `${icon ? `<img src="${icon}" alt="">` : '<img alt="">'}<div><div class="sl">${SLOT_EN[slot]} ─ ${SLOT_LABELS[slot]}</div><div class="sn">${part.name}</div></div>`;
      btn.addEventListener('click', () => {
        this.garageSlot = slot;
        audio.play('garageArm', { throttle: 0.05 });
        this._renderSlots();
        this._renderInventory();
      });
      list.appendChild(btn);
    }
  },

  _renderInventory() {
    const slot = this.garageSlot;
    const isArm = slot === 'rarm' || slot === 'larm';
    const allParts = PARTS_CATALOG[slot];
    const ownedParts = allParts.filter((p) => (this.inventory[p.id] || 0) > 0 || p.id === 'w_none' || p.id === 'boost_none');
    const totalCollectible = allParts.filter((p) => p.id !== 'w_none' && p.id !== 'boost_none').length;
    const ownedCollectible = ownedParts.filter((p) => p.id !== 'w_none' && p.id !== 'boost_none').length;

    $('storage-title').textContent = `${SLOT_LABELS[slot]} （所持 ${ownedCollectible} / ${totalCollectible}）`;
    const grid = $('inv-grid');
    grid.innerHTML = '';
    for (const part of ownedParts) {
      const equipped = this.loadout[slot] === part.id;
      const otherSlot = slot === 'rarm' ? 'larm' : slot === 'larm' ? 'rarm' : null;
      const equippedOther = otherSlot && this.loadout[otherSlot] === part.id && part.id !== 'w_none';
      const count = this.inventory[part.id] || 0;

      const card = document.createElement('div');
      card.className = `inv-card${equipped ? ' equipped' : ''}`;
      const icon = partIcon(slot, part);
      const tags = [];
      if (equipped) tags.push('<span class="tag eq">EQUIP</span>');
      else if (equippedOther && count < 2) tags.push('<span class="tag swap">他腕装着中</span>');
      if (part.rare) tags.push('<span class="tag rare">内蔵武器</span>');
      else if (part.behavior === 'melee') tags.push('<span class="tag melee">近接</span>');
      else if (isArm && part.id !== 'w_none' && count >= 2) tags.push(`<span class="tag dual">×${count}</span>`);

      card.innerHTML = `${tags.join('')}${icon ? `<img src="${icon}" alt="">` : '<img alt="">'}<div class="in">${part.name}</div>`;
      card.addEventListener('mouseenter', () => {
        this._renderDetail(slot, part);
        const preview = { ...this.loadout, [slot]: part.id };
        if (equippedOther && count < 2) preview[otherSlot] = 'w_none';
        this._renderSpec(preview);
      });
      card.addEventListener('mouseleave', () => this._renderSpec());
      card.addEventListener('click', () => this._equip(slot, part.id));
      grid.appendChild(card);
    }

    // 未入手パーツがある場合のヒントカード
    const lockedCount = totalCollectible - ownedCollectible;
    if (lockedCount > 0) {
      const hint = document.createElement('div');
      hint.className = 'inv-card locked-hint';
      hint.innerHTML = `<div class="lock-icon">🔒</div><div class="in">未入手 ×${lockedCount}<br><span>敵撃破でドロップ</span></div>`;
      grid.appendChild(hint);
    }

    this._renderDetail(slot, this.stats.parts[slot]);
  },

  _renderDetail(slot, part) {
    const builtin = part.builtin ? BUILTIN_WEAPONS[part.builtin] : null;
    const count = this.inventory[part.id] || 0;
    const isArm = slot === 'rarm' || slot === 'larm';
    const countInfo = isArm && part.id !== 'w_none'
      ? ` ／ 所持数：${count}個${count < 2 ? '（2個入手で両腕同時装備可）' : '（両腕DUAL装備可）'}`
      : '';
    $('inv-detail').innerHTML = `
      <div class="dn">${part.name}</div>
      <div class="dc">${part.category || SLOT_LABELS[slot]}${part.rare ? ' ／ RARE' : ''}${countInfo}</div>
      <div class="ds">${partSpecText(slot, part)}</div>
      <div class="dd">${part.desc || ''}</div>
      ${builtin ? `<div class="ds" style="color:#c77dff">内蔵武器：${builtin.name} ─ ${weaponSpecText(builtin)}</div><div class="dd">${builtin.desc}</div>` : ''}`;
  },

  _renderSpec(previewLoadout) {
    const cur = this.stats;
    const pre = previewLoadout ? computeMechStats(previewLoadout) : null;
    const list = $('spec-list');
    list.innerHTML = '';
    for (const s of SPEC_DEF) {
      const a = cur[s.k];
      const b = pre ? pre[s.k] : a;
      const pa = Math.min(100, (a / s.max) * 100);
      const pb = Math.min(100, (b / s.max) * 100);
      const up = b > a, down = b < a;
      const diffStyle = up ? `left:${pa}%;width:${pb - pa}%` : down ? `left:${pb}%;width:${pa - pb}%` : 'width:0';
      const row = document.createElement('div');
      row.className = 'spec';
      row.innerHTML = `<span class="k">${s.label}</span>
        <div class="track"><div class="cur" style="width:${down ? pb : pa}%"></div><div class="diff ${up ? 'up' : 'down'}" style="${diffStyle}"></div></div>
        <span class="v">${b}${up || down ? ` <span class="d ${up ? 'up' : 'down'}">${up ? '+' : ''}${b - a}</span>` : ''}</span>`;
      list.appendChild(row);
    }
  },

  _renderWeaponKeys() {
    const list = $('wkey-list');
    list.innerHTML = '';
    for (let i = 0; i < 4; i++) {
      const slot = this.stats.slots[i];
      const row = document.createElement('div');
      const empty = !slot || slot.def.behavior === 'none';
      row.className = `wkey${empty ? ' empty' : ''}`;
      row.innerHTML = `<kbd>${i + 1}</kbd><span class="wm">${slot ? slot.label : '---'}</span><span>${slot && !empty ? slot.def.name : '未装備'}</span>`;
      list.appendChild(row);
    }
    if (this.stats.isDualLinked) {
      const row = document.createElement('div');
      row.className = 'wkey';
      row.innerHTML = '<kbd>⚡</kbd><span class="wm">DUAL</span><span style="color:#ffab00">左右同一武器 ─ 同時発射</span>';
      list.appendChild(row);
    }
  },

  _equip(slot, id) {
    if (this.loadout[slot] === id) return;
    const count = this.inventory[id] || 0;
    if (count <= 0 && id !== 'w_none' && id !== 'boost_none') return;
    // 1個しか持っていない武器を反対の腕に装着する場合は持ち替える
    if ((slot === 'rarm' || slot === 'larm') && id !== 'w_none') {
      const other = slot === 'rarm' ? 'larm' : 'rarm';
      if (this.loadout[other] === id && count < 2) {
        this.loadout[other] = 'w_none';
      }
    }
    this.loadout[slot] = id;
    const isWeapon = slot === 'rarm' || slot === 'larm';
    audio.play(isWeapon ? 'garageWeapon' : 'garageEquip', { throttle: 0 });
    audio.play('garageArm', { throttle: 0, vol: 0.7 });
    this._rebuildPlayerMech();
    this.garage.setMech(this.stats, slot);
    this._renderGarage();
  },

  _renderStageList() {
    const list = $('stage-list');
    list.innerHTML = '';
    for (const s of STAGES) {
      const locked = s.id > this.progress + 1;
      const cleared = s.id <= this.progress;
      const div = document.createElement('div');
      div.className = `stage-item${locked ? ' locked' : ''}${s.id === this.selectedStage ? ' selected' : ''}`;
      div.innerHTML = `<div class="stage-no">${s.id}</div><div><div class="stage-name">${s.name}</div><div class="stage-sub">${s.sub}</div></div><div class="stage-mark">${locked ? 'LOCKED' : cleared ? 'CLEAR' : 'NEW'}</div>`;
      div.addEventListener('click', () => {
        if (locked) { audio.play('noAmmo', { throttle: 0 }); return; }
        audio.play('uiStageSelect', { throttle: 0 });
        this.selectedStage = s.id;
        this._renderStageList();
      });
      list.appendChild(div);
    }
    const s = STAGES.find((x) => x.id === this.selectedStage);
    $('stage-detail').innerHTML = `${s.desc}<br>BOSS : <strong>${s.bossName}</strong>　／　WAVE × 3`;
  },

  /** 出撃：シャッターが開き、暗転して砂上船へ */
  _beginSortie() {
    if (this._sortieBusy) return;
    this._sortieBusy = true;
    this._requestLock(); // ボタン押下の瞬間でないとブラウザがロックを許可しない
    audio.play('sortieShutter', { throttle: 0 });
    audio.play('sortieStart', { throttle: 0, vol: 0.8 });
    $('garage-ui').classList.add('hidden');
    this.garage.startSortie(() => {
      $('fade').style.opacity = '1';
      setTimeout(() => {
        this._sortieBusy = false;
        this.startStage(this.selectedStage);
        setTimeout(() => ($('fade').style.opacity = '0'), 80);
      }, 600);
    });
  },

  /** 暗転してから倉庫へ戻す（船上の描画が残らないように） */
  _fadeToGarage(endStage) {
    if (this._returning) return;
    this._returning = true;
    $('fade').style.opacity = '1';
    setTimeout(() => {
      if (endStage) this._endStage();
      $('result').classList.add('hidden');
      $('pause').classList.add('hidden');
      this._rebuildPlayerMech();
      this._showGarage();
      setTimeout(() => { $('fade').style.opacity = '0'; this._returning = false; }, 120);
    }, 650);
  },

  _showGarage() {
    this.state = 'garage';
    const fx = $('screen-effects');
    if (fx) fx.style.display = 'none';
    $('wreck-panel').classList.add('hidden');
    $('hud').classList.add('hidden');
    $('pause').classList.add('hidden');
    $('garage-ui').classList.remove('hidden');
    this.progress = parseInt(localStorage.getItem('sandark_progress') || '0', 10);
    this.garage.resetCamera();
    this.garage.setMech(this.stats);
    this._renderGarage();
    if (document.pointerLockElement) document.exitPointerLock();
    if (!this.garageLoop && audio.ctx) this.garageLoop = audio.loop('garageAmbient');
  }
};
