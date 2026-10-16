/**
 * ピクセル人生ゲーム - メインゲーム進行エンジン
 * ・最大6人（ソロCPU対戦・ローカル複数人・オンライン対戦）対応
 * ・ルーレット(1〜10)とダイス(1D6/2D6)の両方を使う移動＆イベント処理
 * ・就職、昇進、転職、結婚、出産、マイホーム購入、株、保険、借金（約束手形）、
 *   職業連動報酬、仕返し、決算日、ゴール後配当、最終資産精算を完全実装
 */
class PixelJinseiGameEngine {
  constructor() {
    this.state = null;
    this.boardRenderer = null;
    this.fastMode = false;
    this.isProcessingTurn = false;
    this.activeModalResolver = null;

    // ロビー設定用スロット（最大6人）
    this.localSlots = [
      { type: 'human', name: 'あなた', avatar: 0 },
      { type: 'cpu', name: 'タロウ(CPU)', avatar: 1, style: 'balanced' },
      { type: 'cpu', name: 'ハナコ(CPU)', avatar: 2, style: 'family' },
      { type: 'cpu', name: 'ハカセ(CPU)', avatar: 3, style: 'career' },
      { type: 'none', name: 'ケンジ(CPU)', avatar: 4, style: 'gambler' },
      { type: 'none', name: 'レイカ(CPU)', avatar: 5, style: 'rich' }
    ];
  }

  init() {
    this.boardRenderer = new window.BoardRenderer('boardCanvas');
    this.boardRenderer.onSpaceHover = (spaceId) => this.updateSpaceInspector(spaceId);
    this.boardRenderer.onSpaceClick = (spaceId) => this.updateSpaceInspector(spaceId, true);

    window.widgetsController.init('rouletteCanvas', 'diceCanvas');

    this.setupNetworkCallbacks();
    this.bindUIEvents();
    this.renderLocalSetupSlots();
    this.checkUrlRoomParam();
  }

  checkUrlRoomParam() {
    const params = new URLSearchParams(window.location.search);
    const room = params.get('room');
    if (room) {
      const joinInput = document.getElementById('joinRoomCodeInput');
      if (joinInput) joinInput.value = room.toUpperCase();
      this.switchLobbyTab('online');
    }
  }

  setupNetworkCallbacks() {
    const net = window.networkManager;
    net.onStatusChange = (text, isErr) => {
      const el = document.getElementById('onlineStatusBanner');
      if (el) {
        el.textContent = text;
        el.classList.toggle('is-error', !!isErr);
      }
    };

    net.onLobbyUpdate = (lobbyPlayers, roomCode) => {
      this.renderOnlineLobbyList(lobbyPlayers, roomCode);
    };

    net.onGameStart = (syncedState) => {
      this.state = syncedState;
      this.enterGameScreen();
      this.refreshAllUI();
    };

    net.onStateSync = (syncedState, banner) => {
      this.state = syncedState;
      this.refreshAllUI();
      if (banner) {
        this.showToastBanner(banner.title, banner.sub, banner.scene);
      }
    };

    net.onGuestAction = (peerId, action) => {
      if (net.mode !== 'host' || !this.state) return;
      const curP = this. getCurrentPlayer();
      if (!curP || curP.peerId !== peerId) return;

      if (action.kind === 'ROLL_MOVE') {
        this.executeTurnMove(action.method);
      } else if (action.kind === 'BUY_INSURANCE') {
        this.buyInsurance(curP, action.insType);
      } else if (action.kind === 'REPAY_DEBT') {
        this.repayOneDebt(curP);
      } else if (action.kind === 'BORROW_DEBT') {
        this.borrowOneDebt(curP);
      }
    };

    net.onChatMessage = (sender, text) => {
      this.addLog(`💬 [${sender}]: ${text}`, 'chat');
      this.showFloatingChat(sender, text);
    };
  }

  bindUIEvents() {
    // ロビータブ切替
    document.querySelectorAll('[data-lobby-tab]').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (window.soundEngine) window.soundEngine.playClick();
        this.switchLobbyTab(btn.dataset.lobbyTab);
      });
    });

    // ソロ・ローカル開始ボタン
    document.getElementById('startLocalGameBtn')?.addEventListener('click', () => {
      if (window.soundEngine) {
        window.soundEngine.playFanfare();
        window.soundEngine.startBgm();
      }
      this.startLocalGame();
    });

    // プリセット6人フル対戦ボタン
    document.getElementById('startSixPlayersBtn')?.addEventListener('click', () => {
      this.localSlots.forEach((s, idx) => {
        s.type = idx === 0 ? 'human' : 'cpu';
      });
      this.renderLocalSetupSlots();
      if (window.soundEngine) {
        window.soundEngine.playFanfare();
        window.soundEngine.startBgm();
      }
      this.startLocalGame();
    });

    // オンライン：ルーム作成
    document.getElementById('createOnlineRoomBtn')?.addEventListener('click', () => {
      if (window.soundEngine) window.soundEngine.playClick();
      const name = document.getElementById('onlinePlayerNameInput')?.value.trim() || 'プレイヤー1';
      const avatar = parseInt(document.getElementById('onlineAvatarSelect')?.value || '0', 10);
      window.networkManager.createRoom({ name, avatar });
      document.getElementById('onlineRoomPanel')?.classList.remove('is-hidden');
    });

    // オンライン：ルーム参加
    document.getElementById('joinOnlineRoomBtn')?.addEventListener('click', () => {
      if (window.soundEngine) window.soundEngine.playClick();
      const code = document.getElementById('joinRoomCodeInput')?.value.trim();
      if (!code) {
        alert('6文字のルームコードを入力してください');
        return;
      }
      const name = document.getElementById('onlinePlayerNameInput')?.value.trim() || 'ゲスト';
      const avatar = parseInt(document.getElementById('onlineAvatarSelect')?.value || '1', 10);
      window.networkManager.joinRoom(code, { name, avatar });
      document.getElementById('onlineRoomPanel')?.classList.remove('is-hidden');
    });

    // オンライン：CPU枠追加
    document.getElementById('addOnlineCpuBtn')?.addEventListener('click', () => {
      if (window.soundEngine) window.soundEngine.playClick();
      window.networkManager.addCpuToLobby();
    });

    // オンライン：ルームコード＆招待URLコピー
    document.getElementById('copyRoomCodeBtn')?.addEventListener('click', () => {
      const code = window.networkManager.roomCode;
      if (!code) return;
      const url = `${window.location.origin}${window.location.pathname}?room=${code}`;
      navigator.clipboard?.writeText(url).catch(() => {});
      if (window.soundEngine) window.soundEngine.playCashGain();
      window.networkManager.notifyStatus(`ルームコード【${code}】（招待URL）をクリップボードにコピーしました！`);
    });

    // オンライン：ホストがゲーム開始
    document.getElementById('startOnlineGameBtn')?.addEventListener('click', () => {
      if (window.networkManager.mode !== 'host') return;
      if (window.soundEngine) {
        window.soundEngine.playFanfare();
        window.soundEngine.startBgm();
      }
      this.startOnlineGameFromHost();
    });

    // ゲーム内トップバー操作
    document.getElementById('zoomInBtn')?.addEventListener('click', () => {
      this.boardRenderer.setZoom(this.boardRenderer.targetZoom * 1.2);
    });
    document.getElementById('zoomOutBtn')?.addEventListener('click', () => {
      this.boardRenderer.setZoom(this.boardRenderer.targetZoom * 0.82);
    });
    document.getElementById('focusCurrentBtn')?.addEventListener('click', () => {
      this.boardRenderer.autoFollow = true;
      const p = this.getCurrentPlayer();
      if (p) {
        this.boardRenderer.setZoom(0.95);
        this.boardRenderer.focusOnSpace(p.position);
      }
    });
    document.getElementById('viewWholeMapBtn')?.addEventListener('click', () => {
      this.boardRenderer.fitWholeBoard();
    });

    document.getElementById('fastModeCheck')?.addEventListener('change', (e) => {
      this.fastMode = e.target.checked;
    });

    document.getElementById('soundToggleBtn')?.addEventListener('click', (e) => {
      const muted = window.soundEngine.toggleMute();
      e.currentTarget.textContent = muted ? '🔇 音OFF' : '🔊 音ON';
    });

    document.getElementById('openCatalogBtn')?.addEventListener('click', () => {
      if (window.soundEngine) window.soundEngine.playClick();
      this.openAllSpacesCatalogModal();
    });

    document.getElementById('closeCatalogBtn')?.addEventListener('click', () => {
      if (window.soundEngine) window.soundEngine.playCancel();
      document.getElementById('catalogModal')?.classList.add('is-hidden');
    });

    document.getElementById('openBankModalBtn')?.addEventListener('click', () => {
      if (window.soundEngine) window.soundEngine.playClick();
      this.openBankAndAssetModal();
    });

    document.getElementById('closeBankModalBtn')?.addEventListener('click', () => {
      if (window.soundEngine) window.soundEngine.playCancel();
      document.getElementById('bankModal')?.classList.add('is-hidden');
    });

    document.getElementById('openFinalResultBtn')?.addEventListener('click', () => {
      if (window.soundEngine) window.soundEngine.playClick();
      this.showFinalStandingsModal(false);
    });

    document.getElementById('closeResultModalBtn')?.addEventListener('click', () => {
      document.getElementById('resultModal')?.classList.add('is-hidden');
    });

    document.getElementById('backToLobbyBtn')?.addEventListener('click', () => {
      if (window.soundEngine) window.soundEngine.playCancel();
      document.getElementById('resultModal')?.classList.add('is-hidden');
      document.getElementById('gameScreen')?.classList.add('is-hidden');
      document.getElementById('lobbyScreen')?.classList.remove('is-hidden');
      window.networkManager.cleanup();
    });

    // ルーレット＆ダイス行動ボタン
    document.getElementById('spinRouletteBtn')?.addEventListener('click', () => {
      this.handleHumanMoveInput('roulette');
    });
    document.getElementById('rollSingleDiceBtn')?.addEventListener('click', () => {
      this.handleHumanMoveInput('dice1');
    });
    document.getElementById('rollDoubleDiceBtn')?.addEventListener('click', () => {
      this.handleHumanMoveInput('dice2');
    });

    // チャットスタンプボタン
    document.querySelectorAll('[data-stamp]').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (window.soundEngine) window.soundEngine.playClick();
        const curP = this.getMyControllingPlayer() || this.getCurrentPlayer();
        const sender = curP ? curP.name : 'プレイヤー';
        window.networkManager.sendStamp(sender, btn.dataset.stamp);
      });
    });
  }

  switchLobbyTab(tab) {
    document.querySelectorAll('[data-lobby-tab]').forEach((b) => {
      b.classList.toggle('is-active', b.dataset.lobbyTab === tab);
    });
    document.getElementById('localLobbyPanel')?.classList.toggle('is-hidden', tab !== 'local');
    document.getElementById('onlineLobbyPanel')?.classList.toggle('is-hidden', tab !== 'online');
  }

  /**
   * ソロ・ローカル対戦用の6人スロットUIを描画
   */
  renderLocalSetupSlots() {
    const container = document.getElementById('localSlotsContainer');
    if (!container) return;
    container.innerHTML = '';

    this.localSlots.forEach((slot, idx) => {
      const col = window.GAME_DATA.PLAYER_COLORS[idx];
      const avatarUrl = window.pixelArt.getAvatarDataUrl(slot.avatar, 3);
      const carUrl = window.pixelArt.getCarSpriteCanvas(col.hex, col.dark, idx % 2 === 0, idx % 3, 0, 2).toDataURL();

      const card = document.createElement('div');
      card.className = `slot-card ${slot.type === 'none' ? 'is-disabled' : ''}`;
      card.style.borderColor = col.hex;

      card.innerHTML = `
        <div class="slot-header" style="background:${col.hex}">
          <span>PLAYER ${idx + 1} (${col.name})</span>
          <select class="pixel-select slot-type-select" data-idx="${idx}">
            <option value="human" ${slot.type === 'human' ? 'selected' : ''}>🎮 人間</option>
            <option value="cpu" ${slot.type === 'cpu' ? 'selected' : ''}>🤖 CPU</option>
            ${idx >= 2 ? `<option value="none" ${slot.type === 'none' ? 'selected' : ''}>✖ なし</option>` : ''}
          </select>
        </div>
        <div class="slot-body">
          <img class="slot-avatar" src="${avatarUrl}" alt="avatar" />
          <div class="slot-inputs">
            <input type="text" class="pixel-input slot-name-input" data-idx="${idx}" maxlength="10" value="${slot.name}" ${slot.type === 'none' ? 'disabled' : ''} />
            <div class="slot-sub">
              <img class="slot-car-preview" src="${carUrl}" alt="car" />
              <button type="button" class="pixel-mini-btn slot-avatar-btn" data-idx="${idx}" ${slot.type === 'none' ? 'disabled' : ''}>顔変更</button>
            </div>
          </div>
        </div>
      `;
      container.appendChild(card);
    });

    container.querySelectorAll('.slot-type-select').forEach((sel) => {
      sel.addEventListener('change', (e) => {
        const idx = parseInt(e.target.dataset.idx, 10);
        const newType = e.target.value;
        this.localSlots[idx].type = newType;
        if (newType === 'cpu' && this.localSlots[idx].name === 'あなた') {
          this.localSlots[idx].name = window.GAME_DATA.CPU_PROFILES[idx % 6].name;
        } else if (newType === 'human' && this.localSlots[idx].name.includes('(CPU)')) {
          this.localSlots[idx].name = `プレイヤー${idx + 1}`;
        }
        if (window.soundEngine) window.soundEngine.playClick();
        this.renderLocalSetupSlots();
      });
    });

    container.querySelectorAll('.slot-name-input').forEach((inp) => {
      inp.addEventListener('input', (e) => {
        const idx = parseInt(e.target.dataset.idx, 10);
        this.localSlots[idx].name = e.target.value || `P${idx + 1}`;
      });
    });

    container.querySelectorAll('.slot-avatar-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const idx = parseInt(e.currentTarget.dataset.idx, 10);
        this.localSlots[idx].avatar = (this.localSlots[idx].avatar + 1) % 8;
        if (window.soundEngine) window.soundEngine.playClick();
        this.renderLocalSetupSlots();
      });
    });
  }

  /**
   * オンラインロビーの参加者一覧描画
   */
  renderOnlineLobbyList(lobbyPlayers, roomCode) {
    const codeBadge = document.getElementById('activeRoomCodeBadge');
    if (codeBadge) codeBadge.textContent = roomCode || '------';

    const listEl = document.getElementById('onlinePlayersList');
    if (!listEl) return;
    listEl.innerHTML = '';

    for (let i = 0; i < 6; i++) {
      const p = lobbyPlayers[i];
      const col = window.GAME_DATA.PLAYER_COLORS[i];
      const row = document.createElement('div');
      row.className = 'online-slot-row';
      row.style.borderLeft = `6px solid ${col.hex}`;

      if (p) {
        const avatarUrl = window.pixelArt.getAvatarDataUrl(p.avatar || i, 2);
        row.innerHTML = `
          <img src="${avatarUrl}" class="mini-pixel-avatar" alt="" />
          <strong class="online-slot-name">${p.name}</strong>
          <span class="pixel-tag ${p.isCpu ? 'tag-cpu' : 'tag-human'}">${p.isCpu ? '🤖 CPU' : (p.isHost ? '👑 HOST' : '🌐 ONLINE')}</span>
          ${window.networkManager.mode === 'host' && i > 0 ? `<button type="button" class="pixel-mini-btn danger" data-remove-idx="${i}">外す</button>` : ''}
        `;
      } else {
        row.innerHTML = `<span class="empty-slot-text">空きスロット ${i + 1} (招待コードで参加可能またはCPU追加)</span>`;
      }
      listEl.appendChild(row);
    }

    listEl.querySelectorAll('[data-remove-idx]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const idx = parseInt(e.currentTarget.dataset.removeIdx, 10);
        window.networkManager.removePlayerFromLobby(idx);
      });
    });

    const startBtn = document.getElementById('startOnlineGameBtn');
    const addCpuBtn = document.getElementById('addOnlineCpuBtn');
    if (startBtn) {
      startBtn.disabled = window.networkManager.mode !== 'host' || lobbyPlayers.length < 2;
    }
    if (addCpuBtn) {
      addCpuBtn.disabled = window.networkManager.mode !== 'host' || lobbyPlayers.length >= 6;
    }
  }

  /**
   * プレイヤー初期オブジェクト生成
   */
  createPlayerObject(index, config) {
    return {
      id: `p_${index}`,
      peerId: config.peerId || 'local',
      name: config.name || `プレイヤー${index + 1}`,
      isCpu: !!config.isCpu,
      cpuStyle: config.style || 'balanced',
      avatar: config.avatar ?? index,
      colorIndex: index,
      position: 0,
      cash: 10000,          // 初期所持金 $10,000
      debts: 0,             // 約束手形枚数 (1枚=$20,000)
      jobId: 'freeter',     // 初期：フリーター
      isRankUp: false,      // 昇進フラグ
      married: false,       // 配偶者ピン
      children: 0,          // 子どもピン数
      houses: [],           // 所有マイホームID配列
      treasures: [],        // 所有お宝ID配列
      stocks: 0,            // 所有株券口数
      insurances: {         // 加入保険
        auto: false,
        fire: false,
        life: false
      },
      diceTickets: 3,       // 精密ダイス/ダブルダイス切替チケット初期3枚
      finished: false,
      finishOrder: null
    };
  }

  /**
   * ソロ・ローカルゲーム開始
   */
  startLocalGame() {
    window.networkManager.cleanup();
    const activeConfigs = this.localSlots
      .filter((s) => s.type !== 'none')
      .map((s, idx) => ({
        peerId: 'local',
        name: s.name || `プレイヤー${idx + 1}`,
        isCpu: s.type === 'cpu',
        style: s.style || window.GAME_DATA.CPU_PROFILES[idx % 6].style,
        avatar: s.avatar
      }));

    if (activeConfigs.length < 2) {
      activeConfigs.push({
        peerId: 'local',
        name: 'タロウ(CPU)',
        isCpu: true,
        style: 'balanced',
        avatar: 1
      });
    }

    this.initGameState(activeConfigs, 'LOCAL');
    this.enterGameScreen();
    this.refreshAllUI();
    this.addLog('🎉 人生ゲームがスタートしました！初期資金$10,000とダイスチケット3枚が配られました！', 'important');
    this.checkTurnStart();
  }

  /**
   * オンラインホストからゲーム開始
   */
  startOnlineGameFromHost() {
    const net = window.networkManager;
    if (net.lobbyPlayers.length < 2) {
      net.addCpuToLobby();
    }
    const configs = net.lobbyPlayers.slice(0, 6).map((lp, idx) => ({
      peerId: lp.peerId,
      name: lp.name,
      isCpu: lp.isCpu,
      style: lp.style || window.GAME_DATA.CPU_PROFILES[idx % 6].style,
      avatar: lp.avatar ?? idx
    }));

    this.initGameState(configs, net.roomCode);
    net.broadcastToAll({
      type: 'GAME_START',
      state: this.state
    });
    this.enterGameScreen();
    this.refreshAllUI();
    this.addLog(`🌐 オンラインルーム【${net.roomCode}】でゲーム開始！`, 'important');
    this.checkTurnStart();
  }

  initGameState(playerConfigs, roomCode) {
    this.state = {
      roomCode: roomCode || 'LOCAL',
      turnNumber: 1,
      currentPlayerIndex: 0,
      finishCounter: 0,
      stockPrice: 10000,
      players: playerConfigs.map((cfg, i) => this.createPlayerObject(i, cfg)),
      logs: []
    };
  }

  enterGameScreen() {
    document.getElementById('lobbyScreen')?.classList.add('is-hidden');
    document.getElementById('gameScreen')?.classList.remove('is-hidden');
    setTimeout(() => {
      window.dispatchEvent(new Event('resize'));
      const curP = this.getCurrentPlayer();
      if (curP) {
        this.boardRenderer.focusOnSpace(curP.position, true);
        this.boardRenderer.updateReachableFrom(curP.position);
        this.updateSpaceInspector(curP.position);
      }
    }, 60);
  }

  getCurrentPlayer() {
    if (!this.state || !this.state.players) return null;
    return this.state.players[this.state.currentPlayerIndex] || null;
  }

  getMyControllingPlayer() {
    const p = this.getCurrentPlayer();
    if (!p || p.isCpu) return null;
    const net = window.networkManager;
    if (net.mode === 'offline') return p;
    if (net.mode === 'host' && p.peerId === net.myPeerId) return p;
    if (net.mode === 'guest' && p.peerId === net.myPeerId) return p;
    return null;
  }

  getPlayerJobObj(player) {
    return window.GAME_DATA.JOBS_DATA.find((j) => j.id === player.jobId) || window.GAME_DATA.JOBS_DATA[0];
  }

  getPlayerSalary(player) {
    const job = this.getPlayerJobObj(player);
    return player.isRankUp ? job.rankUpSalary : job.salary;
  }

  getPlayerJobTitle(player) {
    const job = this.getPlayerJobObj(player);
    return player.isRankUp ? `${job.rankUpName}★` : job.name;
  }

  /**
   * 総資産評価額を計算
   */
  calculateTotalNetWorth(player, useHighRealEstate = false) {
    let total = player.cash;
    // マイホーム資産
    player.houses.forEach((hId) => {
      const h = window.GAME_DATA.HOUSES_DATA.find((item) => item.id === hId);
      if (h) {
        total += useHighRealEstate ? h.sellHigh : h.price;
      }
    });
    // お宝カード資産
    player.treasures.forEach((tId) => {
      const t = window.GAME_DATA.TREASURES_DATA.find((item) => item.id === tId);
      if (t) total += t.value;
    });
    // 株券評価額
    total += player.stocks * 20000;
    // 家族幸福ボーナス（配偶者+$15,000、子ども1人+$15,000）
    if (player.married) total += 15000;
    total += player.children * 15000;
    // 約束手形（負債：1枚-$20,000）
    total -= player.debts * 20000;
    return total;
  }

  /**
   * 現金の増減＆自動借金（約束手形）処理
   */
  modifyCash(player, delta, reason = '') {
    player.cash += delta;
    if (delta > 0 && window.soundEngine) {
      window.soundEngine.playCashGain();
    } else if (delta < 0 && window.soundEngine) {
      window.soundEngine.playCashLoss();
    }

    // 現金がマイナスになった場合、自動的に約束手形($20,000)を借り入れる
    let borrowed = 0;
    while (player.cash < 0) {
      player.cash += 20000;
      player.debts += 1;
      borrowed++;
    }
    if (borrowed > 0) {
      if (window.soundEngine) window.soundEngine.playDebt();
      this.addLog(`📜 ${player.name} は資金不足のため約束手形${borrowed}枚($${(borrowed * 20000).toLocaleString()})を借り入れました！`, 'debt');
    }
    this.refreshAllUI();
  }

  borrowOneDebt(player) {
    player.cash += 20000;
    player.debts += 1;
    if (window.soundEngine) window.soundEngine.playDebt();
    this.addLog(`📜 ${player.name} が約束手形1枚($20,000)を借り入れました。`, 'debt');
    this.syncStateToNetwork();
    this.refreshAllUI();
  }

  repayOneDebt(player) {
    if (player.debts <= 0 || player.cash < 20000) return false;
    player.cash -= 20000;
    player.debts -= 1;
    if (window.soundEngine) window.soundEngine.playCashGain();
    this.addLog(`✨ ${player.name} が約束手形1枚($20,000)を完済しました！`, 'good');
    this.syncStateToNetwork();
    this.refreshAllUI();
    return true;
  }

  buyInsurance(player, insType) {
    const ins = window.GAME_DATA.INSURANCES_DATA[insType];
    if (!ins || player.insurances[insType]) return false;
    this.modifyCash(player, -ins.cost, `${ins.name}加入`);
    player.insurances[insType] = true;
    this.addLog(`🛡️ ${player.name} が「${ins.name}($${ins.cost.toLocaleString()})」に加入しました！`, 'good');
    this.syncStateToNetwork();
    this.refreshAllUI();
    return true;
  }

  addLog(text, category = 'normal') {
    if (!this.state) return;
    this.state.logs.unshift({
      id: Date.now() + Math.random(),
      turn: this.state.turnNumber,
      text,
      category
    });
    if (this.state.logs.length > 80) {
      this.state.logs.pop();
    }
    this.renderLogs();
  }

  syncStateToNetwork(eventBanner = null) {
    if (window.networkManager.mode === 'host' && this.state) {
      window.networkManager.broadcastToAll({
        type: 'STATE_SYNC',
        state: this.state,
        eventBanner
      });
    }
  }

  /**
   * ターン開始時のチェック（CPU自動思考 または 人間入力待ち）
   */
  checkTurnStart() {
    if (!this.state) return;
    // ゲストの場合はホストからのSTATE_SYNCで描画更新のみ行う
    if (window.networkManager.mode === 'guest') {
      this.refreshAllUI();
      return;
    }

    // 全員ゴール済みなら最終精算モーダルを表示
    if (this.state.players.every((p) => p.finished)) {
      this.showFinalStandingsModal(true);
      return;
    }

    const curP = this.getCurrentPlayer();
    if (!curP) return;

    this.boardRenderer.updateReachableFrom(curP.position);
    if (this.boardRenderer.autoFollow) {
      this.boardRenderer.focusOnSpace(curP.position);
    }
    this.updateSpaceInspector(curP.position);
    this.refreshAllUI();

    // 借金があり所持金が$35,000以上あるCPUは自動で手形を返済する
    if (curP.isCpu && curP.debts > 0 && curP.cash >= 35000) {
      this.repayOneDebt(curP);
    }

    if (curP.isCpu) {
      const delay = this.fastMode ? 420 : 950;
      setTimeout(() => {
        if (!this.isProcessingTurn) {
          const method = this.decideCpuMoveMethod(curP);
          this.executeTurnMove(method);
        }
      }, delay);
    }
  }

  /**
   * CPUが「ルーレット(1〜10)」と「精密ダイス(1〜6) / 2D6」のどちらを使うか賢く判断
   */
  decideCpuMoveMethod(cpu) {
    if (cpu.finished || cpu.diceTickets <= 0) return 'roulette';
    // 前方1〜6マス以内に給料日・お宝・昇進があり、または7〜10マスにトラブルがある場合は精密ダイス(1D6)を使う
    const spaces = window.GAME_DATA.BOARD_SPACES;
    let curId = cpu.position;
    for (let step = 1; step <= 6; step++) {
      const sp = spaces[curId];
      if (!sp || !sp.next || sp.next.length === 0) break;
      curId = sp.next[0];
      const nextSp = spaces[curId];
      if (nextSp && (nextSp.type === 'treasure' || nextSp.type === 'rankup' || nextSp.type === 'dice_event')) {
        if (Math.random() < 0.45) return 'dice1';
      }
    }
    if (cpu.cpuStyle === 'gambler' && Math.random() < 0.35) {
      return 'dice2';
    }
    return 'roulette';
  }

  /**
   * 人間プレイヤーがルーレットまたはダイスボタンを押した時
   */
  handleHumanMoveInput(method) {
    if (this.isProcessingTurn) return;
    const myP = this.getMyControllingPlayer();
    if (!myP) return;

    if ((method === 'dice1' || method === 'dice2') && myP.diceTickets <= 0) {
      this.showToastBanner('🎲 ダイス切替チケットがありません', 'ルーレット(1〜10)を回してください', 'dice');
      return;
    }

    if (window.networkManager.mode === 'guest') {
      window.networkManager.sendActionToHost({ kind: 'ROLL_MOVE', method });
      return;
    }

    this.executeTurnMove(method);
  }

  /**
   * 手番の移動実行（ルーレット 1〜10 または ダイス 1D6 / 2D6）
   */
  async executeTurnMove(method = 'roulette') {
    if (this.isProcessingTurn || !this.state) return;
    this.isProcessingTurn = true;
    this.refreshActionButtonsState();

    const player = this.getCurrentPlayer();
    if (!player) {
      this.isProcessingTurn = false;
      return;
    }

    // すでにゴール済みのプレイヤーの番なら「ゴール後・大富豪の館ダイス配当」を行う
    if (player.finished) {
      const dieVal = Math.floor(Math.random() * 6) + 1;
      await window.widgetsController.rollDice([dieVal], this.fastMode);
      const bonus = dieVal * 4000;
      this.modifyCash(player, bonus, '億万長者の館・配当ダイス');
      this.addLog(`🏰 [ゴール後配当] ${player.name} はダイスで【${dieVal}】を出し、配当金 +$${bonus.toLocaleString()} を獲得！`, 'good');
      this.showToastBanner(`🏰 ${player.name} ゴール後ダイス配当!`, `🎲 出目【${dieVal}】 → +$${bonus.toLocaleString()} GET!`, 'goal');
      await this.sleep(this.fastMode ? 450 : 950);
      this.advanceToNextTurn();
      return;
    }

    // 1. 出目の決定とルーレット/ダイス演出
    let steps = 1;
    if (method === 'dice1' && player.diceTickets > 0) {
      player.diceTickets--;
      const d1 = Math.floor(Math.random() * 6) + 1;
      steps = d1;
      this.addLog(`🎲 ${player.name} は「精密ダイス(1D6)」を使用！出目は【${steps}】！`, 'dice');
      await window.widgetsController.rollDice([d1], this.fastMode);
    } else if (method === 'dice2' && player.diceTickets > 0) {
      player.diceTickets--;
      const d1 = Math.floor(Math.random() * 6) + 1;
      const d2 = Math.floor(Math.random() * 6) + 1;
      steps = d1 + d2;
      this.addLog(`🎲🎲 ${player.name} は「ダブルダイス(2D6)」を使用！出目は【${d1}+${d2}=${steps}】！`, 'dice');
      await window.widgetsController.rollDice([d1, d2], this.fastMode);
    } else {
      steps = Math.floor(Math.random() * 10) + 1;
      this.addLog(`🎡 ${player.name} がルーレットを回した！出目は【${steps}】！`, 'normal');
      await window.widgetsController.spinRoulette(steps, this.fastMode);
    }

    // 2. 1マスずつ移動＆通過イベント・ストップマス判定
    const spaces = window.GAME_DATA.BOARD_SPACES;
    let remaining = steps;

    while (remaining > 0) {
      const curSp = spaces[player.position];
      if (!curSp || !curSp.next || curSp.next.length === 0) break;

      // もし現在いるマスが分岐マスで、まだ進行先が決まっていない場合
      let nextSpaceId = curSp.next[0];
      if (curSp.next.length > 1) {
        if (player.chosenNextSpaceId && curSp.next.includes(player.chosenNextSpaceId)) {
          nextSpaceId = player.chosenNextSpaceId;
          player.chosenNextSpaceId = null;
        } else {
          nextSpaceId = await this.promptBranchChoice(player, curSp);
        }
      }

      const prevPos = player.position;
      player.position = nextSpaceId;
      remaining--;

      if (window.soundEngine) window.soundEngine.playStep(steps - remaining);
      await this.boardRenderer.animateStepMove(
        player.id,
        prevPos,
        nextSpaceId,
        this.fastMode ? 100 : 210
      );
      this.refreshAllUI();

      const landedSp = spaces[player.position];
      if (!landedSp) break;

      // 給料日マスは「通過時」にも給料がもらえる！（停止時は下の停止イベントで処理するため重複しないよう通過時のみここで付与）
      if (landedSp.type === 'payday' && remaining > 0) {
        const sal = this.getPlayerSalary(player);
        this.modifyCash(player, sal, '給料日通過');
        this.addLog(`💰 [給料日通過!] ${player.name} は給料 +$${sal.toLocaleString()} (${this.getPlayerJobTitle(player)}) を受け取りました！`, 'payday');
        this.showToastBanner(`💰 ${player.name} 給料日通過!`, `+$${sal.toLocaleString()} (${this.getPlayerJobTitle(player)})`, 'payday');
        await this.sleep(this.fastMode ? 280 : 550);
      }

      // ストップマスまたはゴールマスに到達したら、出目が余っていても強制停止！
      if (landedSp.type.startsWith('stop_') || landedSp.type === 'goal') {
        if (remaining > 0) {
          this.addLog(`🛑 ${player.name} はストップマス「${landedSp.title}」に到達したため停止します！`, 'important');
        }
        remaining = 0;
        break;
      }
    }

    // 3. 停止したマスのイベントを実行
    const finalSpace = spaces[player.position];
    if (finalSpace) {
      this.updateSpaceInspector(finalSpace.id);
      await this.resolveSpaceEvent(player, finalSpace);
    }

    this.syncStateToNetwork();
    await this.sleep(this.fastMode ? 320 : 650);
    this.advanceToNextTurn();
  }

  /**
   * 停止したマスのイベントを種類ごとに丁寧に処理
   */
  async resolveSpaceEvent(player, space) {
    const type = space.type;

    // ダイス切替チケットの付与ボーナスがあるマス
    if (space.giveDiceTicket) {
      player.diceTickets += space.giveDiceTicket;
      this.addLog(`🎫 ${player.name} は「🎲ダイス切替チケット」を${space.giveDiceTicket}枚獲得！（所持:${player.diceTickets}枚）`, 'dice');
    }

    switch (type) {
      case 'payday': {
        const sal = this.getPlayerSalary(player);
        this.modifyCash(player, sal, '給料日ストップ');
        const bonus = 5000;
        this.modifyCash(player, bonus, '給料日ピッタリ賞');
        this.addLog(`💰 ${player.name} が給料日マスにピッタリ停止！給料 $${sal.toLocaleString()} ＋ ピッタリ賞 $${bonus.toLocaleString()} を獲得！`, 'payday');
        await this.showEventCutinModal({
          player,
          space,
          headline: `💰 給料日ピッタリ停止ボーナス！`,
          detail: `${this.getPlayerJobTitle(player)} の給料 $${sal.toLocaleString()} に加え、ピッタリ停止ボーナス +$5,000 を獲得しました！`,
          amountText: `+$${(sal + bonus).toLocaleString()}`,
          isPositive: true
        });
        break;
      }

      case 'cash': {
        let amt = space.amount || 0;
        let extraMsg = '';

        // 子ども人数連動ボーナス
        if (space.id === 44 || space.id === 84) {
          const perKid = space.id === 44 ? 3000 : 5000;
          const kidBonus = player.children * perKid;
          if (kidBonus > 0) {
            amt += kidBonus;
            extraMsg = `（子ども${player.children}人ボーナス +$${kidBonus.toLocaleString()} 含む！）`;
          }
        }

        // 職業連動支払い（医師・料理人・建築士・弁護士・アイドル・パイロット・選手・科学者）
        if (amt < 0 && space.payToJob) {
          const targetJobOwner = this.state.players.find(
            (p) => p.jobId === space.payToJob || (space.payToJob === 'architect' && p.jobId === 'carpenter')
          );
          if (targetJobOwner && targetJobOwner.id === player.id) {
            // 自分自身がその職業なら支払いではなく特別報酬を受け取る！
            const selfReward = Math.abs(amt) + 5000;
            this.modifyCash(player, selfReward, '専門職自己ボーナス');
            this.addLog(`✨ ${player.name} は自身が「${this.getPlayerJobTitle(player)}」のため、特別報酬 +$${selfReward.toLocaleString()} を獲得！`, 'good');
            await this.showEventCutinModal({
              player,
              space,
              headline: `✨ 職業特権ボーナス発動！`,
              detail: `あなた自身が該当職業（${this.getPlayerJobTitle(player)}）のため、出費ではなく特別報酬を受け取ります！`,
              amountText: `+$${selfReward.toLocaleString()}`,
              isPositive: true
            });
            break;
          } else if (targetJobOwner) {
            const payAmt = Math.abs(amt);
            this.modifyCash(player, -payAmt, space.title);
            this.modifyCash(targetJobOwner, payAmt, `${space.title}報酬`);
            this.addLog(`💼 ${player.name} は「${this.getPlayerJobTitle(targetJobOwner)}」の ${targetJobOwner.name} へ $${payAmt.toLocaleString()} を支払いました！`, 'important');
            await this.showEventCutinModal({
              player,
              space,
              headline: `${space.title}`,
              detail: `${space.desc}\n👉 「${this.getPlayerJobTitle(targetJobOwner)}」の ${targetJobOwner.name} に $${payAmt.toLocaleString()} が支払われました！`,
              amountText: `-$${payAmt.toLocaleString()}`,
              isPositive: false
            });
            break;
          }
        }

        this.modifyCash(player, amt, space.title);
        this.addLog(`${amt >= 0 ? '💵' : '💸'} ${player.name}：「${space.title}」 (${amt >= 0 ? '+' : ''}$${amt.toLocaleString()}) ${extraMsg}`, amt >= 0 ? 'good' : 'bad');
        await this.showEventCutinModal({
          player,
          space,
          headline: space.title,
          detail: `${space.desc}\n${extraMsg}`,
          amountText: `${amt >= 0 ? '+' : ''}$${amt.toLocaleString()}`,
          isPositive: amt >= 0
        });
        break;
      }

      case 'stop_branch': {
        const chosenNext = await this.promptBranchChoice(player, space);
        player.chosenNextSpaceId = chosenNext;
        break;
      }

      case 'stop_job': {
        await this.handleJobSelectionEvent(player, space, space.pool === 'specialist', true);
        break;
      }

      case 'job_change': {
        await this.handleJobSelectionEvent(player, space, !!space.forceSpecialist, false);
        break;
      }

      case 'rankup': {
        if (!player.isRankUp) {
          player.isRankUp = true;
          const newSal = this.getPlayerSalary(player);
          if (window.soundEngine) window.soundEngine.playFanfare();
          this.addLog(`👑 ${player.name} が「${this.getPlayerJobTitle(player)}」へランクアップ昇進！給料が $${newSal.toLocaleString()} に大幅UP！`, 'good');
          await this.showEventCutinModal({
            player,
            space,
            headline: `👑 祝・ランクアップ昇進！！`,
            detail: `キャリアが認められ「${this.getPlayerJobTitle(player)}」に昇進しました！今後の給料日でもらえる給料が $${newSal.toLocaleString()} に跳ね上がります！`,
            amountText: `給料 $${newSal.toLocaleString()} にUP!`,
            isPositive: true
          });
        } else {
          const bonus = 24000;
          this.modifyCash(player, bonus, '昇進済み特別賞与');
          this.addLog(`👑 ${player.name} はすでに最高ランクのため、特別役員賞与 +$${bonus.toLocaleString()} を獲得！`, 'good');
          await this.showEventCutinModal({
            player,
            space,
            headline: `👑 最高ランク特別賞与！`,
            detail: `すでに昇進済みのため、特別賞与として +$${bonus.toLocaleString()} を受け取ります！`,
            amountText: `+$${bonus.toLocaleString()}`,
            isPositive: true
          });
        }
        break;
      }

      case 'stop_marriage': {
        await this.handleMarriageEvent(player, space);
        break;
      }

      case 'baby': {
        const addKids = space.count || 1;
        player.children += addKids;
        const perPlayerGift = addKids >= 2 ? 8000 : 5000;
        const bankGift = addKids >= 2 ? 15000 : 10000;
        let totalGift = bankGift;

        this.state.players.forEach((other) => {
          if (other.id !== player.id) {
            this.modifyCash(other, -perPlayerGift, '出産ご祝儀');
            totalGift += perPlayerGift;
          }
        });
        this.modifyCash(player, totalGift, '出産祝い＆手当');
        if (window.soundEngine) window.soundEngine.playWedding();
        this.addLog(`👶 ${player.name} に子どもが${addKids}人誕生！（計${player.children}人）全員からの祝儀と手当で +$${totalGift.toLocaleString()} 獲得！`, 'good');

        await this.showEventCutinModal({
          player,
          space,
          headline: `👶 祝・赤ちゃん${addKids > 1 ? '（双子）' : ''}誕生！`,
          detail: `車に可愛い「子どもピン」が${addKids}本乗りました！（現在子ども${player.children}人）\n全員からの出産祝いと育児手当で合計 +$${totalGift.toLocaleString()} を獲得！さらに決算日で子ども1人につき$30,000の仕送りがもらえます！`,
          amountText: `子ども+${addKids} / +$${totalGift.toLocaleString()}`,
          isPositive: true
        });
        break;
      }

      case 'stop_house': {
        await this.handleHousePurchaseEvent(player, space);
        break;
      }

      case 'treasure': {
        const count = space.count || 1;
        const gainedNames = [];
        let totalVal = 0;
        for (let i = 0; i < count; i++) {
          const available = window.GAME_DATA.TREASURES_DATA.filter((t) => !player.treasures.includes(t.id));
          const pool = available.length > 0 ? available : window.GAME_DATA.TREASURES_DATA;
          const picked = pool[Math.floor(Math.random() * pool.length)];
          player.treasures.push(picked.id);
          gainedNames.push(`${picked.name}(査定$${picked.value.toLocaleString()})`);
          totalVal += picked.value;
        }
        if (space.bonusCash) {
          this.modifyCash(player, space.bonusCash, 'お宝ボーナス');
        }
        if (window.soundEngine) window.soundEngine.playFanfare();
        this.addLog(`💎 ${player.name} がお宝「${gainedNames.join(' / ')}」を獲得！`, 'good');
        await this.showEventCutinModal({
          player,
          space,
          headline: `💎 お宝カード獲得！！`,
          detail: `獲得したお宝：${gainedNames.join('、')}\n${space.bonusCash ? `さらに賞金 +$${space.bonusCash.toLocaleString()} も獲得！` : '最終資産計算でそのまま査定額がプラスされます！'}`,
          amountText: `お宝価値 +$${totalVal.toLocaleString()}`,
          isPositive: true
        });
        break;
      }

      case 'stock': {
        await this.handleStockEvent(player, space);
        break;
      }

      case 'insurance': {
        const insType = space.insuranceType || 'auto';
        const ins = window.GAME_DATA.INSURANCES_DATA[insType];
        if (player.insurances[insType]) {
          const reward = ins.cost + 2000;
          this.modifyCash(player, reward, '無事故保険ボーナス');
          this.addLog(`🛡️ ${player.name} はすでに${ins.name}加入済みのため、無事故還付金 +$${reward.toLocaleString()} を受取！`, 'good');
          await this.showEventCutinModal({
            player,
            space,
            headline: `🛡️ ${ins.name} 無事故ボーナス！`,
            detail: `すでに${ins.name}に加入しているため、優良契約者ボーナスとして +$${reward.toLocaleString()} を受け取ります！`,
            amountText: `+$${reward.toLocaleString()}`,
            isPositive: true
          });
        } else {
          await this.promptInsuranceOffer(player, ins);
        }
        break;
      }

      case 'trouble': {
        const tType = space.troubleType || 'auto';
        const ins = window.GAME_DATA.INSURANCES_DATA[tType];
        const loss = space.amount || 15000;
        if (player.insurances[tType]) {
          const claim = 10000;
          this.modifyCash(player, claim, '保険金受取');
          if (window.soundEngine) window.soundEngine.playFanfare();
          this.addLog(`🛡️ [保険発動!] ${player.name} は「${ins.name}」で出費$${loss.toLocaleString()}を完全免除＆見舞金 +$${claim.toLocaleString()} を受取！`, 'good');
          await this.showEventCutinModal({
            player,
            space,
            headline: `🛡️ ${ins.name}で完全補償！！`,
            detail: `${space.title}（損害額 $${loss.toLocaleString()}）が発生しましたが、「${ins.name}」に加入していたため支払いゼロ！さらに見舞金 +$${claim.toLocaleString()} を受け取りました！`,
            amountText: `支払免除 & +$${claim.toLocaleString()}`,
            isPositive: true
          });
        } else {
          if (window.soundEngine) window.soundEngine.playTrouble();
          this.modifyCash(player, -loss, space.title);
          this.addLog(`💥 ${player.name} は「${space.title}」で -$${loss.toLocaleString()} を支払いました（${ins.name}未加入）`, 'bad');
          await this.showEventCutinModal({
            player,
            space,
            headline: `💥 ${space.title}`,
            detail: `${space.desc}\n（💡 銀行パネルから「${ins.name}」に加入しておくと、次回のトラブルを0円にできます）`,
            amountText: `-$${loss.toLocaleString()}`,
            isPositive: false
          });
        }
        break;
      }

      case 'dice_event': {
        await this.handleDiceChallengeEvent(player, space);
        break;
      }

      case 'roulette_event': {
        const spinVal = Math.floor(Math.random() * 10) + 1;
        await window.widgetsController.spinRoulette(spinVal, this.fastMode);
        const prize = spinVal === 10 ? 100000 : spinVal * 7000;
        this.modifyCash(player, prize, '10万ドル大抽選会');
        this.addLog(`🎡 ${player.name} は10万ドル大抽選会で【${spinVal}】を当て、賞金 +$${prize.toLocaleString()} を獲得！！`, 'good');
        await this.showEventCutinModal({
          player,
          space,
          headline: `🎡 大抽選会ルーレット結果：【${spinVal}】！`,
          detail: `${spinVal === 10 ? '大当たり10番ジャックポット！！10万ドル獲得！！' : `ルーレットで【${spinVal}】が出ました！賞金 +$${prize.toLocaleString()} を獲得！`}`,
          amountText: `+$${prize.toLocaleString()}`,
          isPositive: true
        });
        break;
      }

      case 'revenge': {
        if (space.revengeAll) {
          let totalCollected = 0;
          this.state.players.forEach((other) => {
            if (other.id !== player.id) {
              this.modifyCash(other, -12000, 'ガラパーティー参加費');
              totalCollected += 12000;
            }
          });
          this.modifyCash(player, totalCollected, 'ガラパーティー主催収益');
          this.addLog(`⚡ ${player.name} が全プレイヤーから $12,000 ずつ（計 +$${totalCollected.toLocaleString()}）を徴収！`, 'important');
          await this.showEventCutinModal({
            player,
            space,
            headline: `⚡ 全員から $12,000 ずつ徴収！`,
            detail: `他の全プレイヤーからパーティー参加費を徴収し、合計 +$${totalCollected.toLocaleString()} を獲得しました！`,
            amountText: `+$${totalCollected.toLocaleString()}`,
            isPositive: true
          });
        } else {
          const stealAmt = space.revengeAmount || 22000;
          const others = this.state.players.filter((p) => p.id !== player.id);
          others.sort((a, b) => b.cash - a.cash);
          const richest = others[0];
          if (richest && richest.cash > player.cash) {
            this.modifyCash(richest, -stealAmt, 'ライバル買収被害');
            this.modifyCash(player, stealAmt, 'ライバル買収成功');
            this.addLog(`⚡ ${player.name} がトップの ${richest.name} から $${stealAmt.toLocaleString()} を奪取しました！`, 'important');
            await this.showEventCutinModal({
              player,
              space,
              headline: `⚡ 大逆転！${richest.name} から奪取！`,
              detail: `現在現金トップの ${richest.name} から $${stealAmt.toLocaleString()} を奪い取りました！`,
              amountText: `+$${stealAmt.toLocaleString()}`,
              isPositive: true
            });
          } else {
            this.modifyCash(player, stealAmt, 'トップ独走ボーナス');
            this.addLog(`⚡ ${player.name} は自身がトップのため、銀行から市場制覇ボーナス +$${stealAmt.toLocaleString()} を獲得！`, 'good');
            await this.showEventCutinModal({
              player,
              space,
              headline: `⚡ トップ独走ボーナス！`,
              detail: `あなた自身が現在トップのため、銀行から特別報奨金 +$${stealAmt.toLocaleString()} を受け取ります！`,
              amountText: `+$${stealAmt.toLocaleString()}`,
              isPositive: true
            });
          }
        }
        break;
      }

      case 'stop_settlement': {
        await this.handleSettlementEvent(player, space);
        break;
      }

      case 'goal': {
        this.state.finishCounter++;
        player.finished = true;
        player.finishOrder = this.state.finishCounter;
        const orderPrizes = [100000, 60000, 40000, 25000, 20000, 15000];
        const prize = orderPrizes[player.finishOrder - 1] || 15000;
        if (window.soundEngine) window.soundEngine.playGoal();
        this.modifyCash(player, prize, `ゴール${player.finishOrder}着賞金`);
        this.addLog(`👑🎊 ${player.name} が第${player.finishOrder}着で「億万長者の館」にゴール！！到着賞金 +$${prize.toLocaleString()} 獲得！`, 'important');
        await this.showEventCutinModal({
          player,
          space,
          headline: `👑 祝・第 ${player.finishOrder} 着でゴール到着！！`,
          detail: `壮大な人生の旅路を完走し、「億万長者の館」に到着しました！\n第${player.finishOrder}着ボーナスとして +$${prize.toLocaleString()} を獲得！全員がゴールするまで、あなたの番が来るたびに「ゴール後ダイス配当」を獲得できます！`,
          amountText: `第${player.finishOrder}着 +$${prize.toLocaleString()}`,
          isPositive: true
        });
        break;
      }
    }
  }

  /**
   * 🎲 ダイスイベントマスの専用処理（実際にサイコロ1D6または2D6を振って結果に応じた報酬）
   */
  async handleDiceChallengeEvent(player, space) {
    const mode = space.mode || 'multiply';
    let diceCount = 1;
    if (['versus_all', 'jackpot', 'casino_double', 'everyone_gift', 'jackpot_big'].includes(mode)) {
      diceCount = 2;
    }

    const rolls = Array.from({ length: diceCount }, () => Math.floor(Math.random() * 6) + 1);
    await window.widgetsController.rollDice(rolls, this.fastMode);
    const sum = rolls.reduce((a, b) => a + b, 0);
    const isDouble = diceCount === 2 && rolls[0] === rolls[1];

    let reward = 0;
    let headline = `🎲 ダイス結果：【${rolls.join(' + ')}${diceCount === 2 ? ` = ${sum}` : ''}】！`;
    let detail = '';

    if (mode === 'multiply') {
      const mult = space.multiplier || 3000;
      reward = sum * mult;
      detail = `出目【${sum}】× $${mult.toLocaleString()} ＝ +$${reward.toLocaleString()} を獲得しました！`;
    } else if (mode === 'highlow') {
      reward = sum >= 4 ? 15000 : 5000;
      detail = sum >= 4 ? `大成功！4以上の目が出たので +$15,000 獲得！` : `出目は${sum}！売上 +$5,000 を獲得！`;
    } else if (mode === 'versus_all') {
      reward = sum >= 8 ? 20000 : 6000;
      detail = sum >= 8 ? `2D6合計【${sum}】でストライク優勝！賞金 +$20,000！` : `2D6合計【${sum}】！参加賞 +$6,000 を獲得！`;
    } else if (mode === 'jackpot') {
      if (isDouble) {
        reward = 50000;
        detail = `🎊 奇跡のゾロ目【${rolls[0]}・${rolls[1]}】！！1等宝くじ当選 +$50,000 獲得！！`;
      } else if (sum === 7) {
        reward = 30000;
        detail = `✨ ラッキーセブン合計【7】！2等当選 +$30,000 獲得！`;
      } else {
        reward = sum * 2000;
        detail = `合計【${sum}】× $2,000 ＝ 当選金 +$${reward.toLocaleString()} を獲得！`;
      }
    } else if (mode === 'casino_double') {
      if (sum % 2 === 0) {
        reward = 36000;
        detail = `🎰 合計【${sum}（偶数）】で大勝利！！カジノ賞金 +$36,000 を獲得！！`;
      } else {
        reward = -10000;
        detail = `合計【${sum}（奇数）】…チップ代 -$10,000 を支払います。`;
      }
    } else if (mode === 'treasure_dig') {
      reward = 15000;
      if (sum >= 4) {
        const available = window.GAME_DATA.TREASURES_DATA.filter((t) => !player.treasures.includes(t.id));
        const picked = (available.length > 0 ? available : window.GAME_DATA.TREASURES_DATA)[0];
        player.treasures.push(picked.id);
        detail = `出目【${sum}】で海底の宝箱を発見！「${picked.name}」と古代金貨 +$15,000 を獲得！`;
      } else {
        detail = `出目【${sum}】！海底から古代金貨 +$15,000 を引き揚げました！`;
      }
    } else if (mode === 'everyone_gift') {
      reward = sum * 5000;
      detail = `2D6合計【${sum}】× $5,000 ＝ +$${reward.toLocaleString()} を獲得！`;
      if (isDouble) {
        let extra = 0;
        this.state.players.forEach((other) => {
          if (other.id !== player.id) {
            this.modifyCash(other, -10000, 'ゾロ目祝儀');
            extra += 10000;
          }
        });
        reward += extra;
        detail += `\nさらにゾロ目ボーナスで他全員から $10,000 ずつ徴収！`;
      }
    } else if (mode === 'jackpot_big') {
      if (sum >= 8) {
        reward = 80000;
        detail = `🔥 2D6合計【${sum}】！！運命の10万ドルダイス大成功で +$80,000 獲得！！`;
      } else {
        reward = -20000;
        detail = `2D6合計【${sum}】…渓谷通行料 -$20,000 を支払います。`;
      }
    }

    this.modifyCash(player, reward, space.title);
    this.addLog(`🎲 ${player.name} [${space.title}] 出目:${rolls.join(',')} → ${reward >= 0 ? '+' : ''}$${reward.toLocaleString()}`, 'dice');

    await this.showEventCutinModal({
      player,
      space,
      headline,
      detail,
      amountText: `${reward >= 0 ? '+' : ''}$${reward.toLocaleString()}`,
      isPositive: reward >= 0
    });
  }

  /**
   * 💍 結婚ストップマスの処理（配偶者ピン追加＋ダイス/ルーレットでご祝儀徴収）
   */
  async handleMarriageEvent(player, space) {
    player.married = true;
    const roll = Math.floor(Math.random() * 6) + 1;
    await window.widgetsController.rollDice([roll], this.fastMode);

    const giftPerPlayer = roll >= 5 ? 15000 : (roll >= 3 ? 10000 : 5000);
    let totalGift = 10000; // 銀行からの結婚祝い金
    this.state.players.forEach((other) => {
      if (other.id !== player.id) {
        this.modifyCash(other, -giftPerPlayer, '結婚ご祝儀');
        totalGift += giftPerPlayer;
      }
    });
    this.modifyCash(player, totalGift, '結婚ご祝儀合計');
    if (window.soundEngine) window.soundEngine.playWedding();

    this.addLog(`💍💒 ${player.name} が結婚！！ご祝儀ダイス【${roll}】により全員から $${giftPerPlayer.toLocaleString()} ずつ＋銀行祝儀で計 +$${totalGift.toLocaleString()} 獲得！`, 'good');

    await this.showEventCutinModal({
      player,
      space,
      headline: `💍 ハッピーウェディング！！`,
      detail: `${player.name} の車にピンク色の「配偶者ピン」が乗りました！\nご祝儀ダイスの出目は【${roll}】！他の全プレイヤーから $${giftPerPlayer.toLocaleString()} ずつと銀行からの祝儀を合わせ、合計 +$${totalGift.toLocaleString()} を受け取りました！`,
      amountText: `配偶者GET & +$${totalGift.toLocaleString()}`,
      isPositive: true
    });
  }

  /**
   * 💼 就職・転職イベント（3つの職業カード候補から選択）
   */
  async handleJobSelectionEvent(player, space, isSpecialistPool, isFirstJob) {
    const pool = window.GAME_DATA.JOBS_DATA.filter((j) =>
      isSpecialistPool ? j.category === 'specialist' : j.category === 'business'
    );

    // シャッフルして3枚提示
    const shuffled = [...pool].sort(() => Math.random() - 0.5).slice(0, 3);

    if (player.isCpu || (window.networkManager.mode === 'host' && player.peerId !== window.networkManager.myPeerId)) {
      // CPUは給料が高い職業を選択
      shuffled.sort((a, b) => b.salary - a.salary);
      const chosen = shuffled[0];
      player.jobId = chosen.id;
      player.isRankUp = false;
      if (isFirstJob) this.modifyCash(player, 10000, '就職祝い金');
      if (window.soundEngine) window.soundEngine.playFanfare();
      this.addLog(`💼 ${player.name} が「${chosen.name}（給料$${chosen.salary.toLocaleString()}）」に就職しました！`, 'good');
      await this.showEventCutinModal({
        player,
        space,
        headline: `💼 ${player.name} が「${chosen.name}」に決定！`,
        detail: `${chosen.desc}\n給料：$${chosen.salary.toLocaleString()}（昇進後：$${chosen.rankUpSalary.toLocaleString()}）`,
        amountText: `給料 $${chosen.salary.toLocaleString()}`,
        isPositive: true
      });
      return;
    }

    const options = shuffled.map((job) => ({
      id: job.id,
      title: `💼 ${job.name} （給料 $${job.salary.toLocaleString()}）`,
      sub: `昇進後：${job.rankUpName} ($${job.rankUpSalary.toLocaleString()}) / ${job.desc}`,
      job
    }));

    if (!isFirstJob && player.jobId !== 'freeter') {
      const curJob = this.getPlayerJobObj(player);
      options.push({
        id: 'keep',
        title: `✋ 現職「${this.getPlayerJobTitle(player)}」を続ける`,
        sub: `現在の給料 $${this.getPlayerSalary(player).toLocaleString()} を維持して勤続ボーナス +$10,000 を受け取る`
      });
    }

    const picked = await this.promptChoiceModal({
      title: isFirstJob ? `💼 就職カード選択！（${player.name}）` : `🔄 転職・スカウト選択！（${player.name}）`,
      desc: isFirstJob
        ? 'あなたの新しい職業を3枚のカードから選んでください！（初任給ボーナス+$10,000付き）'
        : '新しい職業へ転職するか、現職を続けて勤続ボーナス(+$10,000)を受け取るか選べます。',
      scene: 'job',
      options
    });

    if (picked.id === 'keep') {
      this.modifyCash(player, 10000, '勤続ボーナス');
      this.addLog(`💼 ${player.name} は現職「${this.getPlayerJobTitle(player)}」を継続し、勤続ボーナス +$10,000 を獲得！`, 'good');
    } else {
      player.jobId = picked.job.id;
      player.isRankUp = false;
      if (isFirstJob) this.modifyCash(player, 10000, '初任給ボーナス');
      if (window.soundEngine) window.soundEngine.playFanfare();
      this.addLog(`💼 ${player.name} が「${picked.job.name}（給料$${picked.job.salary.toLocaleString()}）」に就きました！`, 'good');
    }
  }

  /**
   * 🏠 マイホーム購入イベント（ドット絵ハウスカタログから選択）
   */
  async handleHousePurchaseEvent(player, space) {
    const discount = player.jobId === 'architect' ? 15000 : (player.jobId === 'carpenter' ? 10000 : 0);
    const allHouses = window.GAME_DATA.HOUSES_DATA;
    // 手頃な物件〜高級物件まで4件をピックアップ
    const indices = space.isSecondHouse ? [3, 5, 6, 8, 9] : [0, 1, 2, 4, 6];
    const catalog = indices.map((i) => allHouses[i]);

    if (player.isCpu || (window.networkManager.mode === 'host' && player.peerId !== window.networkManager.myPeerId)) {
      const affordable = catalog.filter((h) => h.price - discount <= player.cash + 10000);
      const pickedH = affordable.length > 0 ? affordable[affordable.length - 1] : catalog[0];
      const finalCost = Math.max(5000, pickedH.price - discount);
      this.payHouseWithArchitectCommission(player, finalCost);
      player.houses.push(pickedH.id);
      if (window.soundEngine) window.soundEngine.playFanfare();
      this.addLog(`🏠 ${player.name} がマイホーム「${pickedH.name}($${finalCost.toLocaleString()})」を購入しました！`, 'good');
      await this.showEventCutinModal({
        player,
        space,
        headline: `🏠 ${player.name} が「${pickedH.name}」を購入！`,
        detail: `${pickedH.desc}\n購入額：$${finalCost.toLocaleString()}（高騰時査定：$${pickedH.sellHigh.toLocaleString()}）`,
        amountText: `🏠 ${pickedH.name}`,
        isPositive: true
      });
      return;
    }

    const options = catalog.map((h) => {
      const cost = Math.max(5000, h.price - discount);
      return {
        id: h.id,
        title: `🏠 ${h.name} — $${cost.toLocaleString()}${discount > 0 ? ' (職種割引!)' : ''}`,
        sub: `高騰査定:$${h.sellHigh.toLocaleString()} / ${h.desc}`,
        house: h,
        cost,
        imgUrl: window.pixelArt.getHouseDataUrl(h.style, 2)
      };
    });

    options.push({
      id: 'skip',
      title: space.isSecondHouse ? `💰 購入せず不動産投資ボーナス +$15,000 を受け取る` : `✋ 今回はマイホーム購入を見送る`,
      sub: space.isSecondHouse ? '現金 +$15,000 を手堅く受け取ります' : '現金を温存して先へ進みます'
    });

    const picked = await this.promptChoiceModal({
      title: `🏠 マイホーム購入カタログ（所持金: $${player.cash.toLocaleString()}）`,
      desc: discount > 0
        ? `🌟 建築職特典により全物件 $${discount.toLocaleString()} 引きで購入できます！（資金不足分は約束手形で借入可能）`
        : '夢のマイホームを選びましょう！購入した家は最終資産精算で高く評価されます。',
      scene: 'house',
      options
    });

    if (picked.id === 'skip') {
      if (space.isSecondHouse) {
        this.modifyCash(player, 15000, '不動産投資ボーナス');
        this.addLog(`💰 ${player.name} は別荘を見送り、不動産投資ボーナス +$15,000 を獲得！`, 'good');
      } else {
        this.addLog(`🏠 ${player.name} はマイホーム購入を見送りました。`, 'normal');
      }
    } else if (picked.house) {
      this.payHouseWithArchitectCommission(player, picked.cost);
      player.houses.push(picked.house.id);
      if (window.soundEngine) window.soundEngine.playFanfare();
      this.addLog(`🏠 ${player.name} がマイホーム「${picked.house.name}($${picked.cost.toLocaleString()})」を購入しました！`, 'good');
    }
  }

  payHouseWithArchitectCommission(buyer, cost) {
    this.modifyCash(buyer, -cost, 'マイホーム購入');
    const arch = this.state.players.find((p) => p.id !== buyer.id && (p.jobId === 'architect' || p.jobId === 'carpenter'));
    if (arch) {
      this.modifyCash(arch, 10000, '住宅設計コミッション');
      this.addLog(`📐 建築職の ${arch.name} に設計報酬 +$10,000 が入りました！`, 'good');
    }
  }

  /**
   * 📈 株イベント処理（配当受取＆追加購入）
   */
  async handleStockEvent(player, space) {
    // すでに株を持っていれば配当ボーナス
    if (player.stocks > 0) {
      const perStock = space.id === 86 ? 25000 : (space.id === 103 ? 20000 : 15000);
      const div = player.stocks * perStock;
      this.modifyCash(player, div, '株式配当金');
      this.addLog(`📈 ${player.name} は保有株${player.stocks}口の配当金 +$${div.toLocaleString()} を受け取りました！`, 'good');
    } else if (space.id === 86 || space.id === 103) {
      this.modifyCash(player, 10000, '市場活況ボーナス');
    }

    if (player.stocks >= 5 || space.id >= 86) {
      await this.showEventCutinModal({
        player,
        space,
        headline: `📈 ${space.title}`,
        detail: player.stocks > 0
          ? `保有している株券 ${player.stocks}口から配当金を受け取りました！`
          : `市場活況ボーナス +$10,000 を受け取りました！`,
        amountText: player.stocks > 0 ? `保有株 ${player.stocks}口` : `+$10,000`,
        isPositive: true
      });
      return;
    }

    const stockCost = player.jobId === 'fund_manager' ? 8000 : 10000;

    if (player.isCpu || (window.networkManager.mode === 'host' && player.peerId !== window.networkManager.myPeerId)) {
      if (player.cash >= stockCost * 2) {
        this.modifyCash(player, -stockCost * 2, '株券2口購入');
        player.stocks += 2;
        this.addLog(`📈 ${player.name} が株券を2口購入しました（計${player.stocks}口）`, 'good');
      } else if (player.cash >= stockCost) {
        this.modifyCash(player, -stockCost, '株券1口購入');
        player.stocks += 1;
        this.addLog(`📈 ${player.name} が株券を1口購入しました（計${player.stocks}口）`, 'good');
      }
      return;
    }

    const picked = await this.promptChoiceModal({
      title: `📈 株券購入チャンス！（1口 $${stockCost.toLocaleString()}）`,
      desc: `現在保有：${player.stocks}口（最大5口）。株券を持っていると後半の株式マスで高額配当がもらえ、最終精算で1口$20,000として評価されます！`,
      scene: 'stock',
      options: [
        { id: 'buy2', title: `📈 2口まとめて購入する (-$${(stockCost * 2).toLocaleString()})`, sub: '配当と最終資産を大きく増やす積極投資！', count: 2 },
        { id: 'buy1', title: `📈 1口購入する (-$${stockCost.toLocaleString()})`, sub: '手堅く1口買い増しします', count: 1 },
        { id: 'pass', title: `✋ 今回は購入しない`, sub: '現金を温存します', count: 0 }
      ]
    });

    if (picked.count > 0) {
      const canAdd = Math.min(picked.count, 5 - player.stocks);
      this.modifyCash(player, -stockCost * canAdd, `株券${canAdd}口購入`);
      player.stocks += canAdd;
      this.addLog(`📈 ${player.name} が株券を${canAdd}口購入しました！（保有:${player.stocks}口）`, 'good');
    }
  }

  /**
   * 🛡️ 保険加入オファー
   */
  async promptInsuranceOffer(player, ins) {
    if (player.isCpu || (window.networkManager.mode === 'host' && player.peerId !== window.networkManager.myPeerId)) {
      if (player.cash >= ins.cost) {
        this.buyInsurance(player, ins.id);
      }
      return;
    }

    const picked = await this.promptChoiceModal({
      title: `🛡️ ${ins.name}のご案内（保険料 $${ins.cost.toLocaleString()}）`,
      desc: ins.desc,
      scene: 'normal',
      options: [
        { id: 'join', title: `🛡️ ${ins.name}に加入する (-$${ins.cost.toLocaleString()})`, sub: '今後のトラブル出費を0円にし、見舞金も受け取れます！' },
        { id: 'skip', title: `✋ 加入しない`, sub: '現金を温存します（後で銀行パネルからでも加入可能）' }
      ]
    });

    if (picked.id === 'join') {
      this.buyInsurance(player, ins.id);
    }
  }

  /**
   * 🌉 決算日ストップマス処理（子ども仕送り＋借金返済＋最終ルート選択）
   */
  async handleSettlementEvent(player, space) {
    const childBonus = player.children * 30000;
    const basePension = 20000;
    const totalIn = childBonus + basePension;
    this.modifyCash(player, totalIn, '決算日・子ども仕送り＆精算金');

    // 返済できる約束手形があれば自動返済
    let repaidCount = 0;
    while (player.debts > 0 && player.cash >= 20000) {
      player.cash -= 20000;
      player.debts -= 1;
      repaidCount++;
    }

    if (window.soundEngine) window.soundEngine.playFanfare();
    this.addLog(`🌉 [決算日!] ${player.name} は子ども${player.children}人の仕送り＋精算金 +$${totalIn.toLocaleString()} を受取！${repaidCount > 0 ? `（約束手形${repaidCount}枚完済！）` : ''}`, 'important');

    await this.showEventCutinModal({
      player,
      space,
      headline: `🌉 決算日ゲート精算！！`,
      detail: `・子ども仕送りボーナス（${player.children}人 × $30,000）：+$${childBonus.toLocaleString()}\n・決算特別精算金：+$${basePension.toLocaleString()}\n${repaidCount > 0 ? `・約束手形 ${repaidCount}枚（$${(repaidCount * 20000).toLocaleString()}）を完済しました！` : '・借金なし！クリーンな資産状態です！'}`,
      amountText: `+$${totalIn.toLocaleString()}`,
      isPositive: true
    });

    const chosenNext = await this.promptBranchChoice(player, space);
    player.chosenNextSpaceId = chosenNext;
  }

  /**
   * 分岐ルートの選択モーダル
   */
  async promptBranchChoice(player, space) {
    const choices = space.branchChoices || [
      { nextId: space.next[0], label: '🅰️ 上ルートへ進む', desc: '上の街道を進みます' },
      { nextId: space.next[1], label: '🅱️ 下ルートへ進む', desc: '下の街道を進みます' }
    ];

    if (player.isCpu || (window.networkManager.mode === 'host' && player.peerId !== window.networkManager.myPeerId)) {
      let idx = 0;
      if (player.cpuStyle === 'career' || player.cpuStyle === 'gambler' || player.cpuStyle === 'investor') {
        idx = 1;
      } else if (Math.random() < 0.45) {
        idx = 1;
      }
      const picked = choices[idx] || choices[0];
      this.addLog(`🔀 ${player.name} は「${picked.label}」を選択しました！`, 'important');
      return picked.nextId;
    }

    const picked = await this.promptChoiceModal({
      title: `🔀 ルート分岐選択！（${player.name}）`,
      desc: space.desc,
      scene: space.scene || 'normal',
      options: choices.map((c) => ({
        id: c.nextId,
        title: c.label,
        sub: c.desc,
        nextId: c.nextId
      }))
    });

    this.addLog(`🔀 ${player.name} は「${picked.title}」を選択しました！`, 'important');
    return picked.nextId;
  }

  /**
   * 汎用ドット絵選択肢モーダルを表示し、ユーザーの選択をPromiseで返す
   */
  promptChoiceModal({ title, desc, scene = 'normal', options = [] }) {
    return new Promise((resolve) => {
      const modal = document.getElementById('choiceModal');
      const titleEl = document.getElementById('choiceModalTitle');
      const descEl = document.getElementById('choiceModalDesc');
      const artEl = document.getElementById('choiceModalArt');
      const listEl = document.getElementById('choiceModalOptions');

      if (!modal || !listEl) {
        resolve(options[0]);
        return;
      }

      if (titleEl) titleEl.textContent = title;
      if (descEl) descEl.textContent = desc;
      if (artEl && window.pixelArt) {
        artEl.src = window.pixelArt.renderSceneDataUrl(scene, 3);
      }

      listEl.innerHTML = '';
      options.forEach((opt) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'pixel-choice-btn';
        btn.innerHTML = `
          ${opt.imgUrl ? `<img src="${opt.imgUrl}" class="choice-opt-img" alt="" />` : ''}
          <div class="choice-opt-text">
            <strong>${opt.title}</strong>
            <span>${opt.sub || ''}</span>
          </div>
        `;
        btn.addEventListener('click', () => {
          if (window.soundEngine) window.soundEngine.playClick();
          modal.classList.add('is-hidden');
          resolve(opt);
        });
        listEl.appendChild(btn);
      });

      modal.classList.remove('is-hidden');
    });
  }

  /**
   * イベント発生時のドット絵カットイン演出モーダル（自動またはクリックで閉じる）
   */
  showEventCutinModal({ player, space, headline, detail, amountText, isPositive }) {
    this.syncStateToNetwork({
      title: `${player.name}: ${headline}`,
      sub: amountText,
      scene: space.scene || 'normal'
    });

    if (this.fastMode || player.isCpu) {
      this.showToastBanner(`${player.name}: ${headline}`, `${amountText} — ${detail.split('\n')[0]}`, space.scene || 'normal');
      return this.sleep(this.fastMode ? 320 : 850);
    }

    return new Promise((resolve) => {
      const modal = document.getElementById('eventCutinModal');
      if (!modal) {
        resolve();
        return;
      }
      const artEl = document.getElementById('cutinArtImg');
      const badgeEl = document.getElementById('cutinPlayerBadge');
      const titleEl = document.getElementById('cutinHeadline');
      const amountEl = document.getElementById('cutinAmountBadge');
      const detailEl = document.getElementById('cutinDetailText');
      const okBtn = document.getElementById('cutinOkBtn');

      const col = window.GAME_DATA.PLAYER_COLORS[player.colorIndex % 6];
      if (artEl && window.pixelArt) {
        artEl.src = window.pixelArt.renderSceneDataUrl(space.scene || 'normal', 4);
      }
      if (badgeEl) {
        badgeEl.textContent = `${player.name} （マス #${space.id}）`;
        badgeEl.style.backgroundColor = col.hex;
      }
      if (titleEl) titleEl.textContent = headline;
      if (amountEl) {
        amountEl.textContent = amountText;
        amountEl.className = `cutin-amount-badge ${isPositive ? 'is-plus' : 'is-minus'}`;
      }
      if (detailEl) detailEl.textContent = detail;

      const close = () => {
        if (window.soundEngine) window.soundEngine.playClick();
        modal.classList.add('is-hidden');
        okBtn?.removeEventListener('click', close);
        resolve();
      };

      okBtn?.addEventListener('click', close);
      modal.classList.remove('is-hidden');
    });
  }

  /**
   * 次のプレイヤーのターンへ進める
   */
  advanceToNextTurn() {
    this.isProcessingTurn = false;
    if (!this.state) return;

    const totalP = this.state.players.length;
    this.state.currentPlayerIndex = (this.state.currentPlayerIndex + 1) % totalP;
    if (this.state.currentPlayerIndex === 0) {
      this.state.turnNumber++;
    }

    this.syncStateToNetwork();
    this.checkTurnStart();
  }

  /**
   * 盤面上のマスをホバー/クリックした時に詳細インスペクターパネルを更新
   */
  updateSpaceInspector(spaceId, focusCamera = false) {
    const sp = window.GAME_DATA.BOARD_SPACES[spaceId];
    if (!sp) return;

    if (focusCamera) {
      this.boardRenderer.focusOnSpace(spaceId);
    }

    const titleEl = document.getElementById('inspectorSpaceTitle');
    const subEl = document.getElementById('inspectorSpaceSub');
    const descEl = document.getElementById('inspectorSpaceDesc');
    const iconEl = document.getElementById('inspectorSpaceIcon');
    const sceneEl = document.getElementById('inspectorSceneImg');
    const distEl = document.getElementById('inspectorDistBadge');

    if (titleEl) titleEl.textContent = `#${sp.id} ${sp.title}`;
    if (subEl) subEl.textContent = sp.subText || '';
    if (descEl) descEl.textContent = sp.desc || '';
    if (iconEl && window.pixelArt) {
      iconEl.src = window.pixelArt.getIconDataUrl(sp.icon || 'start', 3);
    }
    if (sceneEl && window.pixelArt) {
      sceneEl.src = window.pixelArt.renderSceneDataUrl(sp.scene || 'normal', 3);
    }
    if (distEl) {
      const dist = this.boardRenderer.reachableDistances.get(sp.id);
      if (dist !== undefined) {
        distEl.textContent = `🎯 現在の手番プレイヤーから【あと ${dist} マス】！`;
        distEl.className = 'inspector-dist-badge is-reachable';
      } else {
        distEl.textContent = `第${sp.chapter}章エリア （クリックでカメラ移動）`;
        distEl.className = 'inspector-dist-badge';
      }
    }
  }

  /**
   * 全UI（トップバー、プレイヤー一覧、手番ステータス、アクションボタン）の一括更新
   */
  refreshAllUI() {
    if (!this.state) return;

    const roomEl = document.getElementById('hudRoomCode');
    const turnEl = document.getElementById('hudTurnCount');
    if (roomEl) roomEl.textContent = this.state.roomCode;
    if (turnEl) turnEl.textContent = `TURN ${this.state.turnNumber}`;

    this.renderPlayersScoreboard();
    this.renderCurrentTurnBanner();
    this.refreshActionButtonsState();
    this.renderLogs();
  }

  renderPlayersScoreboard() {
    const listEl = document.getElementById('playersScoreList');
    if (!listEl || !this.state) return;
    listEl.innerHTML = '';

    this.state.players.forEach((p, idx) => {
      const isTurn = idx === this.state.currentPlayerIndex;
      const col = window.GAME_DATA.PLAYER_COLORS[p.colorIndex % 6];
      const avatarUrl = window.pixelArt.getAvatarDataUrl(p.avatar, 2);
      const netWorth = this.calculateTotalNetWorth(p);
      const sp = window.GAME_DATA.BOARD_SPACES[p.position];

      const card = document.createElement('div');
      card.className = `player-score-card ${isTurn ? 'is-current-turn' : ''}`;
      card.style.borderColor = isTurn ? '#facc15' : col.hex;

      const insBadges = [
        p.insurances.auto ? '🚗保' : '',
        p.insurances.fire ? '🏠保' : '',
        p.insurances.life ? '🏥保' : ''
      ].filter(Boolean).join(' ');

      card.innerHTML = `
        <div class="pcard-top" style="background:${col.hex}">
          <div class="pcard-name-wrap">
            <img src="${avatarUrl}" class="pcard-avatar" alt="" />
            <strong>${p.name}</strong>
          </div>
          <span class="pcard-pos">${p.finished ? `👑${p.finishOrder}着GOAL` : `#${p.position} ${sp ? sp.title.slice(0, 5) : ''}`}</span>
        </div>
        <div class="pcard-body">
          <div class="pcard-cash-row">
            <span class="pcard-cash">💵 $${p.cash.toLocaleString()}</span>
            <span class="pcard-worth">総資産 $${netWorth.toLocaleString()}</span>
          </div>
          <div class="pcard-meta-grid">
            <span>💼 ${this.getPlayerJobTitle(p)} ($${(this.getPlayerSalary(p)/1000).toFixed(0)}k)</span>
            <span>👨‍👩‍👧 ${p.married ? '既婚' : '独身'} / 子${p.children}人</span>
            <span>🏠 家:${p.houses.length} 💎宝:${p.treasures.length} 📈株:${p.stocks}</span>
            <span>🎫ダイス券:${p.diceTickets} ${p.debts > 0 ? `<b class="debt-tag">📜手形:${p.debts}枚</b>` : (insBadges || '借金なし')}</span>
          </div>
        </div>
      `;

      card.addEventListener('click', () => {
        this.boardRenderer.autoFollow = false;
        this.boardRenderer.focusOnSpace(p.position);
        this.updateSpaceInspector(p.position);
      });

      listEl.appendChild(card);
    });
  }

  renderCurrentTurnBanner() {
    const curP = this.getCurrentPlayer();
    if (!curP) return;

    const col = window.GAME_DATA.PLAYER_COLORS[curP.colorIndex % 6];
    const nameEl = document.getElementById('turnPlayerName');
    const jobEl = document.getElementById('turnPlayerJob');
    const cashEl = document.getElementById('turnPlayerCash');
    const debtEl = document.getElementById('turnPlayerDebt');
    const familyEl = document.getElementById('turnPlayerFamily');
    const ticketEl = document.getElementById('turnPlayerTickets');
    const carImgEl = document.getElementById('turnPlayerCarImg');

    if (nameEl) {
      nameEl.textContent = `${curP.name} の番です`;
      nameEl.style.color = col.light;
    }
    if (jobEl) jobEl.textContent = `${this.getPlayerJobTitle(curP)} (給料 $${this.getPlayerSalary(curP).toLocaleString()})`;
    if (cashEl) cashEl.textContent = `$${curP.cash.toLocaleString()}`;
    if (debtEl) {
      debtEl.textContent = curP.debts > 0 ? `${curP.debts}枚 (-$${(curP.debts * 20000).toLocaleString()})` : 'なし ($0)';
      debtEl.classList.toggle('is-danger', curP.debts > 0);
    }
    if (familyEl) {
      familyEl.textContent = `${curP.married ? '配偶者あり' : '独身'} / 子ども ${curP.children}人`;
    }
    if (ticketEl) {
      ticketEl.textContent = `残り ${curP.diceTickets} 枚`;
    }
    if (carImgEl && window.pixelArt) {
      carImgEl.src = window.pixelArt.getCarSpriteCanvas(col.hex, col.dark, curP.married, curP.children, curP.debts, 3).toDataURL();
    }
  }

  refreshActionButtonsState() {
    const myP = this.getMyControllingPlayer();
    const canAct = !!myP && !this.isProcessingTurn;

    const spinBtn = document.getElementById('spinRouletteBtn');
    const dice1Btn = document.getElementById('rollSingleDiceBtn');
    const dice2Btn = document.getElementById('rollDoubleDiceBtn');

    if (spinBtn) {
      spinBtn.disabled = !canAct;
      spinBtn.textContent = myP?.finished ? '🏰 ゴール配当を振る!' : '🎡 ルーレット (1〜10)';
    }
    if (dice1Btn) {
      dice1Btn.disabled = !canAct || !myP || myP.diceTickets <= 0 || myP.finished;
    }
    if (dice2Btn) {
      dice2Btn.disabled = !canAct || !myP || myP.diceTickets <= 0 || myP.finished;
    }
  }

  renderLogs() {
    const logEl = document.getElementById('gameEventLog');
    if (!logEl || !this.state) return;
    logEl.innerHTML = this.state.logs
      .slice(0, 35)
      .map((item) => `<div class="log-line log-${item.category}"><span class="log-turn">[T${item.turn}]</span> ${item.text}</div>`)
      .join('');
  }

  /**
   * 📖 全108マス＆ルート図鑑モーダルを開く
   */
  openAllSpacesCatalogModal() {
    const modal = document.getElementById('catalogModal');
    const grid = document.getElementById('catalogSpacesGrid');
    if (!modal || !grid) return;

    grid.innerHTML = '';
    const curP = this.getCurrentPlayer();

    window.GAME_DATA.BOARD_SPACES.forEach((sp) => {
      const iconUrl = window.pixelArt.getIconDataUrl(sp.icon || 'start', 2);
      const isHere = curP && curP.position === sp.id;
      const item = document.createElement('div');
      item.className = `catalog-space-item ${isHere ? 'is-player-here' : ''}`;
      item.innerHTML = `
        <div class="catalog-item-head">
          <img src="${iconUrl}" alt="" />
          <div>
            <strong>#${sp.id} ${sp.title}</strong>
            <span class="catalog-sub">${sp.subText || ''}</span>
          </div>
        </div>
        <p>${sp.desc}</p>
      `;
      item.addEventListener('click', () => {
        modal.classList.add('is-hidden');
        this.boardRenderer.autoFollow = false;
        this.boardRenderer.focusOnSpace(sp.id);
        this.updateSpaceInspector(sp.id);
      });
      grid.appendChild(item);
    });

    modal.classList.remove('is-hidden');
  }

  /**
   * 🏦 銀行・約束手形・保険・保有資産確認モーダルを開く
   */
  openBankAndAssetModal() {
    const modal = document.getElementById('bankModal');
    const body = document.getElementById('bankModalBody');
    if (!modal || !body || !this.state) return;

    const p = this.getMyControllingPlayer() || this.getCurrentPlayer();
    if (!p) return;

    const canControl = !!this.getMyControllingPlayer() && !this.isProcessingTurn;
    const housesHtml = p.houses.length === 0
      ? '<span class="muted-note">まだマイホームを所有していません</span>'
      : p.houses.map((hId) => {
          const h = window.GAME_DATA.HOUSES_DATA.find((x) => x.id === hId);
          return h ? `<div class="asset-pill"><img src="${window.pixelArt.getHouseDataUrl(h.style, 2)}" alt=""/> <b>${h.name}</b> (高騰査定:$${h.sellHigh.toLocaleString()})</div>` : '';
        }).join('');

    const treasuresHtml = p.treasures.length === 0
      ? '<span class="muted-note">まだお宝カードを所有していません</span>'
      : p.treasures.map((tId) => {
          const t = window.GAME_DATA.TREASURES_DATA.find((x) => x.id === tId);
          return t ? `<div class="asset-pill"><img src="${window.pixelArt.getIconDataUrl(t.icon, 2)}" alt=""/> <b>${t.name}</b> (+$${t.value.toLocaleString()})</div>` : '';
        }).join('');

    body.innerHTML = `
      <div class="bank-section">
        <h3>👤 ${p.name} の資産・ポートフォリオ</h3>
        <p>所持現金：<b>$${p.cash.toLocaleString()}</b> ／ 約束手形（借金）：<b class="debt-tag">${p.debts}枚 (-$${(p.debts * 20000).toLocaleString()})</b> ／ 推定総資産：<b>$${this.calculateTotalNetWorth(p).toLocaleString()}</b></p>
      </div>

      <div class="bank-section">
        <h3>📜 約束手形（借金・返済窓口）</h3>
        <p>1枚 $20,000 単位でいつでも借入・返済ができます。</p>
        <div class="bank-btn-row">
          <button type="button" id="modalBorrowBtn" class="pixel-btn danger" ${!canControl ? 'disabled' : ''}>📜 $20,000 借りる (手形+1)</button>
          <button type="button" id="modalRepayBtn" class="pixel-btn primary" ${!canControl || p.debts <= 0 || p.cash < 20000 ? 'disabled' : ''}>✨ $20,000 返済する (手形-1)</button>
        </div>
      </div>

      <div class="bank-section">
        <h3>🛡️ 保険証券カウンター</h3>
        <div class="bank-btn-row">
          ${Object.values(window.GAME_DATA.INSURANCES_DATA).map((ins) => `
            <button type="button" class="pixel-btn" data-buy-ins="${ins.id}" ${!canControl || p.insurances[ins.id] ? 'disabled' : ''}>
              ${p.insurances[ins.id] ? `✅ ${ins.name} 加入済` : `🛡️ ${ins.name} ($${ins.cost.toLocaleString()})`}
            </button>
          `).join('')}
        </div>
      </div>

      <div class="bank-section">
        <h3>🏠 所有マイホーム (${p.houses.length}軒) ＆ 💎 お宝カード (${p.treasures.length}枚)</h3>
        <div class="asset-pills-wrap">${housesHtml}</div>
        <div class="asset-pills-wrap" style="margin-top:8px">${treasuresHtml}</div>
      </div>
    `;

    body.querySelector('#modalBorrowBtn')?.addEventListener('click', () => {
      if (window.networkManager.mode === 'guest') {
        window.networkManager.sendActionToHost({ kind: 'BORROW_DEBT' });
      } else {
        this.borrowOneDebt(p);
      }
      this.openBankAndAssetModal();
    });

    body.querySelector('#modalRepayBtn')?.addEventListener('click', () => {
      if (window.networkManager.mode === 'guest') {
        window.networkManager.sendActionToHost({ kind: 'REPAY_DEBT' });
      } else {
        this.repayOneDebt(p);
      }
      this.openBankAndAssetModal();
    });

    body.querySelectorAll('[data-buy-ins]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const insType = e.currentTarget.dataset.buyIns;
        if (window.networkManager.mode === 'guest') {
          window.networkManager.sendActionToHost({ kind: 'BUY_INSURANCE', insType });
        } else {
          this.buyInsurance(p, insType);
        }
        this.openBankAndAssetModal();
      });
    });

    modal.classList.remove('is-hidden');
  }

  /**
   * 🏆 最終資産精算・ランキング表モーダル
   */
  showFinalStandingsModal(isGameComplete = false) {
    const modal = document.getElementById('resultModal');
    const titleEl = document.getElementById('resultModalTitle');
    const tableEl = document.getElementById('resultStandingsTable');
    if (!modal || !tableEl || !this.state) return;

    if (isGameComplete && window.soundEngine) {
      window.soundEngine.playGoal();
    }

    if (titleEl) {
      titleEl.textContent = isGameComplete ? '🎊 全員ゴール！最終総資産ランキング発表！！' : '📊 現在の総資産ランキング＆内訳表';
    }

    const ranked = [...this.state.players].map((p) => {
      const houseVal = p.houses.reduce((sum, hId) => {
        const h = window.GAME_DATA.HOUSES_DATA.find((x) => x.id === hId);
        return sum + (h ? h.sellHigh : 0);
      }, 0);
      const treasureVal = p.treasures.reduce((sum, tId) => {
        const t = window.GAME_DATA.TREASURES_DATA.find((x) => x.id === tId);
        return sum + (t ? t.value : 0);
      }, 0);
      const stockVal = p.stocks * 20000;
      const familyVal = (p.married ? 15000 : 0) + p.children * 15000;
      const debtVal = p.debts * 20000;
      const total = p.cash + houseVal + treasureVal + stockVal + familyVal - debtVal;
      return { p, houseVal, treasureVal, stockVal, familyVal, debtVal, total };
    }).sort((a, b) => b.total - a.total);

    tableEl.innerHTML = ranked.map((r, i) => {
      const col = window.GAME_DATA.PLAYER_COLORS[r.p.colorIndex % 6];
      const medal = i === 0 ? '👑 1位' : (i === 1 ? '🥈 2位' : (i === 2 ? '🥉 3位' : `${i + 1}位`));
      return `
        <div class="result-row ${i === 0 ? 'is-winner' : ''}" style="border-left:8px solid ${col.hex}">
          <div class="result-rank">${medal}</div>
          <img src="${window.pixelArt.getAvatarDataUrl(r.p.avatar, 3)}" class="result-avatar" alt="" />
          <div class="result-info">
            <strong>${r.p.name} <small>(${this.getPlayerJobTitle(r.p)})</small></strong>
            <div class="result-breakdown">
              <span>💵現金: $${r.p.cash.toLocaleString()}</span>
              <span>🏠不動産: +$${r.houseVal.toLocaleString()}</span>
              <span>💎お宝: +$${r.treasureVal.toLocaleString()}</span>
              <span>📈株: +$${r.stockVal.toLocaleString()}</span>
              <span>👨‍👩‍👧家族: +$${r.familyVal.toLocaleString()}</span>
              ${r.debtVal > 0 ? `<span class="debt-tag">📜手形精算: -$${r.debtVal.toLocaleString()}</span>` : ''}
            </div>
          </div>
          <div class="result-total">$${r.total.toLocaleString()}</div>
        </div>
      `;
    }).join('');

    modal.classList.remove('is-hidden');
  }

  showToastBanner(title, sub, scene = 'normal') {
    const banner = document.getElementById('toastBanner');
    if (!banner) return;
    const img = document.getElementById('toastSceneImg');
    const tEl = document.getElementById('toastTitle');
    const sEl = document.getElementById('toastSub');
    if (img && window.pixelArt) img.src = window.pixelArt.renderSceneDataUrl(scene, 2);
    if (tEl) tEl.textContent = title;
    if (sEl) sEl.textContent = sub;
    banner.classList.remove('is-hidden');
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => {
      banner.classList.add('is-hidden');
    }, 3200);
  }

  showFloatingChat(sender, text) {
    this.showToastBanner(`💬 ${sender}`, text, 'normal');
  }

  sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
  }
}

window.PixelJinseiGameEngine = PixelJinseiGameEngine;

window.addEventListener('DOMContentLoaded', () => {
  window.gameEngine = new PixelJinseiGameEngine();
  window.gameEngine.init();
});
