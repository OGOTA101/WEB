(() => {
  "use strict";

  const canvas = document.getElementById("gameCanvas");
  const ctx = canvas.getContext("2d");
  const seatMapEl = document.getElementById("seatMap");
  const partListEl = document.getElementById("partList");
  const controlPanelEl = document.getElementById("controlPanel");
  const scoreText = document.getElementById("scoreText");
  const moneyText = document.getElementById("moneyText");
  const bossText = document.getElementById("bossText");
  const crewText = document.getElementById("crewText");
  const distanceText = document.getElementById("distanceText");
  const seaLevelText = document.getElementById("seaLevelText");
  const shipHpBar = document.getElementById("shipHpBar");
  const shipHpText = document.getElementById("shipHpText");
  const seatNameText = document.getElementById("seatNameText");
  const seatHelpText = document.getElementById("seatHelpText");
  const combatLogEl = document.getElementById("combatLog");
  const upgradeModal = document.getElementById("upgradeModal");
  const upgradeHint = document.getElementById("upgradeHint");
  const upgradeOptions = document.getElementById("upgradeOptions");
  const startOverlay = document.getElementById("startOverlay");
  const soloStartButton = document.getElementById("soloStartButton");
  const quickStartButton = document.getElementById("quickStartButton");
  const createRoomButton = document.getElementById("createRoomButton");
  const joinRoomButton = document.getElementById("joinRoomButton");
  const roomCodeInput = document.getElementById("roomCodeInput");
  const lobbyOverlay = document.getElementById("lobbyOverlay");
  const lobbyTitle = document.getElementById("lobbyTitle");
  const lobbyCodeText = document.getElementById("lobbyCodeText");
  const lobbyPlayers = document.getElementById("lobbyPlayers");
  const lobbyLoadoutText = document.getElementById("lobbyLoadoutText");
  const lobbyLoadoutList = document.getElementById("lobbyLoadoutList");
  const readyButton = document.getElementById("readyButton");
  const leaveRoomButton = document.getElementById("leaveRoomButton");
  const profileMoneyText = document.getElementById("profileMoneyText");
  const partInventory = document.getElementById("partInventory");
  const loadoutSlotText = document.getElementById("loadoutSlotText");
  const autoLoadoutButton = document.getElementById("autoLoadoutButton");
  const homeLoadoutStrip = document.getElementById("homeLoadoutStrip");
  const gachaButton = document.getElementById("gachaButton");
  const grantMoneyButton = document.getElementById("grantMoneyButton");
  const gachaResult = document.getElementById("gachaResult");
  const recordList = document.getElementById("recordList");
  const onlineStatus = document.getElementById("onlineStatus");
  const resultOverlay = document.getElementById("resultOverlay");
  const resultStats = document.getElementById("resultStats");
  const resultHomeButton = document.getElementById("resultHomeButton");
  const resultRetryButton = document.getElementById("resultRetryButton");
  const toast = document.getElementById("toast");
  const modeButton = document.getElementById("modeButton");

  const seatDefs = [
    { id: "bridge", name: "艦橋", short: "艦橋", type: "bridge", help: "移動と前方固定魚雷", x: 0, y: -42, hp: 260 },
    { id: "mainL", name: "左主砲", short: "左主", type: "main", help: "制限角度で主砲発射 / 連打装填", x: -30, y: -18, hp: 230 },
    { id: "mainR", name: "右主砲", short: "右主", type: "main", help: "制限角度で主砲発射 / 連打装填", x: 30, y: -18, hp: 230 },
    { id: "subL", name: "左副砲", short: "左副", type: "secondary", help: "360度指定で副砲発射 / 連打装填", x: -38, y: 12, hp: 200 },
    { id: "subR", name: "右副砲", short: "右副", type: "secondary", help: "360度指定で副砲発射 / 連打装填", x: 38, y: 12, hp: 200 },
    { id: "mgFL", name: "前左機銃", short: "前左", type: "mg", help: "前方左の掃射と迎撃", x: -34, y: -55, hp: 170 },
    { id: "mgFR", name: "前右機銃", short: "前右", type: "mg", help: "前方右の掃射と迎撃", x: 34, y: -55, hp: 170 },
    { id: "mgBL", name: "後左機銃", short: "後左", type: "mg", help: "後方左の掃射と煙幕", x: -34, y: 42, hp: 170 },
    { id: "mgBR", name: "後右機銃", short: "後右", type: "mg", help: "後方右の掃射と煙幕", x: 34, y: 42, hp: 170 },
    { id: "torpedo", name: "魚雷管制室", short: "魚雷", type: "torpedo", help: "方向指定魚雷と機雷", x: 0, y: 58, hp: 210 }
  ];

  const upgrades = [
    {
      name: "推進器改良",
      rarity: "Rare",
      desc: "艦橋の移動速度 +12%。避ける船になります。",
      apply: () => {
        state.stats.speed += 0.12;
      }
    },
    {
      name: "応急工具箱",
      rarity: "Common",
      desc: "修理タップの回復量 +30%。壊れても戻しやすい。",
      apply: () => {
        state.stats.repair += 0.3;
      }
    },
    {
      name: "大口径主砲弾",
      rarity: "Rare",
      desc: "主砲ダメージ +22%。ボスに強い。",
      apply: () => {
        state.stats.mainDamage += 0.22;
      }
    },
    {
      name: "副砲連射機構",
      rarity: "Rare",
      desc: "副砲の基本リロード -16%。横湧きに強い。",
      apply: () => {
        state.stats.secondaryReload += 0.16;
      }
    },
    {
      name: "防空照準器",
      rarity: "Common",
      desc: "機銃ダメージ +20%、迎撃クールダウン短縮。",
      apply: () => {
        state.stats.mgDamage += 0.2;
        state.stats.mgReload += 0.15;
      }
    },
    {
      name: "重魚雷",
      rarity: "Epic",
      desc: "魚雷ダメージ +35%。ただし少し重くなる。",
      apply: () => {
        state.stats.torpedoDamage += 0.35;
        state.stats.speed -= 0.04;
      }
    },
    {
      name: "装甲隔壁",
      rarity: "Common",
      desc: "戦艦HPを120回復し、最大HP +80。",
      apply: () => {
        state.maxShipHp += 80;
        state.shipHp = Math.min(state.maxShipHp, state.shipHp + 120);
      }
    },
    {
      name: "AI砲手訓練",
      rarity: "Rare",
      desc: "空席AIとルーム試作の他プレイヤー操作効率 +18%。",
      apply: () => {
        state.stats.ai += 0.18;
      }
    },
    {
      name: "艦内通路整理",
      rarity: "Common",
      desc: "座席移動ロックが軽くなり、修理復帰も少し速い。",
      apply: () => {
        state.stats.repair += 0.12;
        state.stats.seatMove += 0.2;
      }
    },
    {
      name: "前へ前へ",
      rarity: "Legendary",
      desc: "距離が伸びるほど全武器が少し強くなる。",
      apply: () => {
        state.stats.forward += 1;
      }
    },
    {
      name: "連打装填訓練",
      rarity: "Epic",
      desc: "主砲と副砲の装填連打効果 +35%。忙しいほど強い。",
      apply: () => {
        state.stats.reloadTap += 0.35;
      }
    },
    {
      name: "サルベージ磁石",
      rarity: "Common",
      desc: "ボス報酬時に船体HPを80回復する。",
      apply: () => {
        state.shipHp = Math.min(state.maxShipHp, state.shipHp + 80);
      }
    }
  ];

  const firebaseConfig = {
    projectId: "sggame-hub",
    appId: "1:228141329072:web:66b1f70f1c16df891f6975",
    databaseURL: "https://sggame-hub-default-rtdb.asia-southeast1.firebasedatabase.app",
    storageBucket: "sggame-hub.firebasestorage.app",
    apiKey: "AIzaSyC16EouqGT7zq2S1KSSAFWnmgWPYb1r49E",
    authDomain: "sggame-hub.firebaseapp.com",
    messagingSenderId: "228141329072"
  };

  const partCatalog = [
    { id: "armor1", name: "予備装甲I", rarity: "Common", desc: "全体HP +4%。", effect: { maxShipHp: 40 } },
    { id: "armor2", name: "装甲隔壁", rarity: "Rare", desc: "全体HP +8%、部位HP +3%。", effect: { maxShipHp: 80, partHp: 0.03 } },
    { id: "bridge1", name: "艦橋クッション", rarity: "Common", desc: "艦橋HP +12%。", effect: { seatHp: { bridge: 0.12 } } },
    { id: "bridge2", name: "高応答舵", rarity: "Rare", desc: "移動速度 +8%。", effect: { speed: 0.08 } },
    { id: "repair1", name: "新品工具", rarity: "Common", desc: "修理速度 +8%。", effect: { repair: 0.08 } },
    { id: "repair2", name: "応急班契約", rarity: "Rare", desc: "修理速度 +16%、AI修理 +10%。", effect: { repair: 0.16, ai: 0.1 } },
    { id: "main1", name: "主砲点検済み", rarity: "Rare", desc: "主砲ダメージ +9%。", effect: { mainDamage: 0.09 } },
    { id: "main2", name: "超大型砲身", rarity: "Legendary", desc: "主砲ダメージ +18%、装填連打 +8%。", effect: { mainDamage: 0.18, reloadTap: 0.08 } },
    { id: "sub1", name: "副砲連射バネ", rarity: "Common", desc: "副砲リロード +8%。", effect: { secondaryReload: 0.08 } },
    { id: "sub2", name: "全周照準器", rarity: "Epic", desc: "副砲ダメージ +10%、リロード +10%。", effect: { secondaryDamage: 0.1, secondaryReload: 0.1 } },
    { id: "mg1", name: "防空照準器", rarity: "Rare", desc: "機銃ダメージ +10%。", effect: { mgDamage: 0.1 } },
    { id: "mg2", name: "冷却フィン", rarity: "Common", desc: "機銃リロード +12%。", effect: { mgReload: 0.12 } },
    { id: "torp1", name: "魚雷燃料改良", rarity: "Rare", desc: "魚雷ダメージ +10%。", effect: { torpedoDamage: 0.1 } },
    { id: "torp2", name: "重魚雷ラック", rarity: "Epic", desc: "魚雷ダメージ +20%、移動速度 -3%。", effect: { torpedoDamage: 0.2, speed: -0.03 } },
    { id: "ai1", name: "熟練AI砲手", rarity: "Epic", desc: "空席AI効率 +18%。", effect: { ai: 0.18 } },
    { id: "score1", name: "戦果記録班", rarity: "Rare", desc: "獲得スコア +8%。", effect: { scoreGain: 0.08 } },
    { id: "lucky1", name: "幸運の羅針盤", rarity: "Epic", desc: "ボス報酬でRare以上が出やすい。", effect: { luck: 0.12 } },
    { id: "last1", name: "不沈の誓い", rarity: "Legendary", desc: "一度だけHP1で耐える。", effect: { deathSave: 1 } },
    { id: "move1", name: "艦内通路整理", rarity: "Common", desc: "座席移動と応急復旧が少し早い。", effect: { seatMove: 0.1, repair: 0.05 } },
    { id: "morale1", name: "鉄の給食カレー", rarity: "Legendary", desc: "全武器 +5%、修理 +5%。", effect: { mainDamage: 0.05, secondaryDamage: 0.05, mgDamage: 0.05, torpedoDamage: 0.05, repair: 0.05 } }
  ];

  const rarityWeights = [
    ["Common", 52],
    ["Rare", 30],
    ["Epic", 14],
    ["Legendary", 4]
  ];

  const state = {
    running: false,
    mode: "solo",
    width: 390,
    height: 720,
    score: 0,
    distance: 0,
    distanceScoreMark: 0,
    elapsed: 0,
    seaLevel: 1,
    bossTimer: 75,
    bossCount: 0,
    shipHp: 1000,
    maxShipHp: 1000,
    ship: { x: 195, y: 520, vx: 0, vy: 0, radius: 42 },
    joystick: { x: 0, y: 0, active: false },
    currentSeatId: "bridge",
    seats: [],
    projectiles: [],
    enemyProjectiles: [],
    enemies: [],
    particles: [],
    boss: null,
    spawnTimer: 1,
    logTimer: 0,
    upgradeOpen: false,
    runStats: {
      kills: 0,
      bosses: 0,
      repairs: 0,
      breaks: 0,
      intercepts: 0
    },
    activeLoadout: [],
    angles: {
      main: 0,
      secondary: 270,
      mg: -90,
      torpedo: -90
    },
    stats: {
      speed: 1,
      repair: 1,
      mainDamage: 1,
      secondaryDamage: 1,
      mgDamage: 1,
      torpedoDamage: 1,
      secondaryReload: 1,
      mgReload: 1,
      ai: 1,
      seatMove: 1,
      reloadTap: 1,
      forward: 0,
      scoreGain: 1,
      luck: 0,
      deathSave: 0
    },
    cooldownBases: {
      bridge: 2.2,
      main: 3.4,
      secondary: 1.35,
      mg: 0.42,
      torpedo: 4.6,
      mine: 7.5
    },
    flash: 0
  };

  let lastTime = performance.now();
  let uiTimer = 0;
  let toastTimer = 0;
  let profile = loadProfile();
  let db = null;
  let onlineRoomRef = null;
  let onlineRoomValue = null;
  let onlineSeatRef = null;
  let onlinePlayerSeat = null;
  const playerId = profile.playerId;

  const online = {
    ready: false,
    roomId: null,
    hostId: null,
    mode: "solo",
    players: {},
    seats: {},
    isHost: false
  };

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function rand(min, max) {
    return min + Math.random() * (max - min);
  }

  function dist(a, b) {
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  function angleVector(deg) {
    const rad = (deg * Math.PI) / 180;
    return { x: Math.cos(rad), y: Math.sin(rad) };
  }

  function padScore(value) {
    return Math.floor(value).toString().padStart(6, "0");
  }

  function addScore(amount) {
    state.score += Math.max(0, Math.floor(amount * state.stats.scoreGain));
  }

  function formatTime(seconds) {
    const s = Math.max(0, Math.ceil(seconds));
    const m = Math.floor(s / 60).toString().padStart(2, "0");
    const r = (s % 60).toString().padStart(2, "0");
    return `${m}:${r}`;
  }

  function uid(prefix = "p") {
    return `${prefix}_${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36).slice(-4)}`;
  }

  function loadProfile() {
    const raw = localStorage.getItem("infiniteBattleshipProfileV2");
    if (raw) {
      try {
        const saved = JSON.parse(raw);
        return {
          playerId: saved.playerId || uid("captain"),
          name: saved.name || `艦長${Math.floor(Math.random() * 90 + 10)}`,
          money: Number(saved.money ?? 500),
          ownedParts: Array.isArray(saved.ownedParts) ? saved.ownedParts : starterParts(),
          loadoutIds: Array.isArray(saved.loadoutIds) ? saved.loadoutIds : [],
          bestScore: Number(saved.bestScore ?? 0),
          bestDistance: Number(saved.bestDistance ?? 0),
          totalRuns: Number(saved.totalRuns ?? 0)
        };
      } catch (error) {
        console.warn(error);
      }
    }
    return {
      playerId: uid("captain"),
      name: `艦長${Math.floor(Math.random() * 90 + 10)}`,
      money: 500,
      ownedParts: starterParts(),
      loadoutIds: [],
      bestScore: 0,
      bestDistance: 0,
      totalRuns: 0
    };
  }

  function starterParts() {
    return ["armor1", "repair1", "main1", "sub1", "mg1", "torp1", "move1", "ai1", "bridge2", "score1"].map((catalogId) => ({
      uid: uid("part"),
      catalogId
    }));
  }

  function saveProfile() {
    localStorage.setItem("infiniteBattleshipProfileV2", JSON.stringify(profile));
  }

  function getPart(catalogId) {
    return partCatalog.find((part) => part.id === catalogId) || partCatalog[0];
  }

  function ownedPartByUid(partUid) {
    const item = profile.ownedParts.find((part) => part.uid === partUid);
    return item ? getPart(item.catalogId) : null;
  }

  function loadoutLimit(playerCount = 1, playerIndex = 0) {
    const count = clamp(playerCount || 1, 1, 10);
    const base = Math.floor(10 / count);
    const extra = 10 % count;
    return base + (playerIndex < extra ? 1 : 0);
  }

  function currentLoadoutLimit() {
    if (!online.roomId) return 10;
    const players = Object.keys(online.players || {}).sort();
    return loadoutLimit(players.length || 1, Math.max(0, players.indexOf(playerId)));
  }

  function trimLoadoutForLimit() {
    const limit = currentLoadoutLimit();
    profile.loadoutIds = profile.loadoutIds.filter((uidValue) => profile.ownedParts.some((part) => part.uid === uidValue)).slice(0, limit);
    saveProfile();
  }

  function chooseRarity() {
    const total = rarityWeights.reduce((sum, item) => sum + item[1], 0);
    let roll = rand(0, total);
    for (const [rarity, weight] of rarityWeights) {
      roll -= weight;
      if (roll <= 0) return rarity;
    }
    return "Common";
  }

  function rollPart() {
    const rarity = chooseRarity();
    const pool = partCatalog.filter((part) => part.rarity === rarity);
    return pool[Math.floor(Math.random() * pool.length)] || partCatalog[0];
  }

  function renderHome() {
    profileMoneyText.textContent = Math.floor(profile.money).toString();
    trimLoadoutForLimit();
    const loadoutParts = profile.loadoutIds.map(ownedPartByUid).filter(Boolean);
    homeLoadoutStrip.innerHTML = `<span>持ち込み${loadoutParts.length}/${currentLoadoutLimit()}</span>${loadoutParts.map((part) => `<i>${part.name}</i>`).join("") || "<i>未設定</i>"}`;
    loadoutSlotText.textContent = `持ち込み ${loadoutParts.length}/${currentLoadoutLimit()}`;

    partInventory.innerHTML = "";
    for (const owned of profile.ownedParts) {
      const part = getPart(owned.catalogId);
      const selected = profile.loadoutIds.includes(owned.uid);
      const button = document.createElement("button");
      button.type = "button";
      button.className = `part-card${selected ? " selected" : ""}`;
      button.innerHTML = `<span><strong>${part.name}</strong><span>${part.desc}</span></span><b>${part.rarity}</b>`;
      button.addEventListener("click", () => toggleLoadout(owned.uid));
      partInventory.appendChild(button);
    }

    recordList.innerHTML = `
      <div><span>最高スコア</span><strong>${padScore(profile.bestScore)}</strong></div>
      <div><span>最高距離</span><strong>${(profile.bestDistance / 1000).toFixed(1)}km</strong></div>
      <div><span>総出撃</span><strong>${profile.totalRuns}</strong></div>
      <div><span>所持パーツ</span><strong>${profile.ownedParts.length}</strong></div>
    `;
  }

  function toggleLoadout(partUid) {
    const selected = profile.loadoutIds.includes(partUid);
    if (selected) {
      profile.loadoutIds = profile.loadoutIds.filter((uidValue) => uidValue !== partUid);
    } else {
      const limit = currentLoadoutLimit();
      if (profile.loadoutIds.length >= limit) {
        showToast(`持ち込み枠は${limit}個まで`);
        return;
      }
      profile.loadoutIds.push(partUid);
    }
    saveProfile();
    renderHome();
    publishPlayerState();
  }

  function autoLoadout() {
    profile.loadoutIds = profile.ownedParts.slice(0, currentLoadoutLimit()).map((part) => part.uid);
    saveProfile();
    renderHome();
    publishPlayerState();
  }

  function drawGacha() {
    if (profile.money < 100) {
      showToast("お金が足りません");
      return;
    }
    profile.money -= 100;
    const part = rollPart();
    profile.ownedParts.push({ uid: uid("part"), catalogId: part.id });
    gachaResult.textContent = `${part.rarity}: ${part.name} を入手`;
    saveProfile();
    renderHome();
  }

  function grantDebugMoney() {
    profile.money += 500;
    saveProfile();
    renderHome();
    showToast("試作用に+500 MONEY");
  }

  function showToast(message) {
    toast.textContent = message;
    toast.classList.remove("hidden");
    toastTimer = 2.4;
  }

  function initFirebase() {
    try {
      if (!window.firebase) throw new Error("Firebase SDK not loaded");
      if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
      db = firebase.database();
      onlineStatus.textContent = "Firebase接続OK";
      online.ready = true;
    } catch (error) {
      console.warn(error);
      onlineStatus.textContent = "Firebase未接続: ローカルで遊べます";
      online.ready = false;
    }
  }

  function roomCode() {
    return Math.random().toString(36).slice(2, 6).toUpperCase();
  }

  function roomPath(code) {
    return `infiniteBattleship/rooms/${code}`;
  }

  async function createRoom(mode = "private") {
    if (!online.ready || !db) {
      showToast("Firebase未接続のためソロで開始します");
      resetGame("solo");
      return;
    }
    const code = roomCode();
    online.roomId = code;
    online.mode = mode;
    online.hostId = playerId;
    online.isHost = true;
    onlineRoomRef = db.ref(roomPath(code));
    await onlineRoomRef.set({
      mode,
      status: "waiting",
      hostId: playerId,
      createdAt: firebase.database.ServerValue.TIMESTAMP,
      startedAt: null
    });
    await joinRoom(code, true);
  }

  async function joinRoom(code, created = false) {
    if (!online.ready || !db) {
      showToast("Firebase未接続です");
      return;
    }
    const cleanCode = (code || "").trim().toUpperCase();
    if (!cleanCode) {
      showToast("ルームコードを入力してください");
      return;
    }
    const ref = db.ref(roomPath(cleanCode));
    const snap = await ref.get();
    if (!snap.exists() && !created) {
      showToast("ルームが見つかりません");
      return;
    }
    online.roomId = cleanCode;
    onlineRoomRef = ref;
    const playerRef = ref.child(`players/${playerId}`);
    await playerRef.update({
      name: profile.name,
      ready: false,
      joinedAt: firebase.database.ServerValue.TIMESTAMP,
      loadoutIds: profile.loadoutIds
    });
    playerRef.onDisconnect().remove();
    ref.child(`seats/${onlinePlayerSeat || "bridge"}`).onDisconnect().remove();
    listenRoom();
    lobbyOverlay.classList.remove("hidden");
    lobbyCodeText.textContent = cleanCode;
    lobbyTitle.textContent = snap.val()?.mode === "quick" ? "即開始待機" : "ルーム待機";
    renderLobby();
  }

  async function quickMatch() {
    if (!online.ready || !db) {
      resetGame("solo");
      return;
    }
    const roomsSnap = await db.ref("infiniteBattleship/rooms").get();
    let target = null;
    roomsSnap.forEach((child) => {
      const room = child.val();
      const players = room.players ? Object.keys(room.players).length : 0;
      if (!target && room.mode === "quick" && room.status === "waiting" && players < 10) target = child.key;
    });
    if (target) {
      await joinRoom(target);
    } else {
      await createRoom("quick");
    }
    await setReady(true);
    setTimeout(() => {
      if (online.isHost && online.roomId && !state.running) startOnlineGame();
    }, 2500);
  }

  function listenRoom() {
    if (!onlineRoomRef) return;
    onlineRoomRef.off();
    onlineRoomRef.on("value", (snap) => {
      onlineRoomValue = snap.val() || {};
      online.players = onlineRoomValue.players || {};
      online.seats = onlineRoomValue.seats || {};
      online.hostId = onlineRoomValue.hostId;
      online.isHost = online.hostId === playerId;
      if (onlineRoomValue.mode) online.mode = onlineRoomValue.mode;
      if (onlineRoomValue.status === "playing" && !state.running) {
        lobbyOverlay.classList.add("hidden");
        resetGame("online");
      }
      syncOnlineSeats();
      renderLobby();
      renderHome();
    });
  }

  async function publishPlayerState() {
    if (!onlineRoomRef || !online.roomId) return;
    await onlineRoomRef.child(`players/${playerId}`).update({
      name: profile.name,
      loadoutIds: profile.loadoutIds
    });
  }

  async function setReady(ready) {
    if (!onlineRoomRef) return;
    trimLoadoutForLimit();
    await onlineRoomRef.child(`players/${playerId}`).update({
      ready,
      loadoutIds: profile.loadoutIds
    });
    const snap = await onlineRoomRef.child("players").get();
    const players = snap.val() || {};
    const allReady = Object.values(players).length > 0 && Object.values(players).every((player) => player.ready);
    if (allReady && (online.isHost || online.hostId === playerId)) startOnlineGame();
  }

  async function startOnlineGame() {
    if (!onlineRoomRef) return;
    await onlineRoomRef.update({
      status: "playing",
      startedAt: firebase.database.ServerValue.TIMESTAMP
    });
  }

  async function leaveRoom() {
    if (onlineRoomRef) {
      await onlineRoomRef.child(`players/${playerId}`).remove();
      if (onlinePlayerSeat) await onlineRoomRef.child(`seats/${onlinePlayerSeat}`).remove();
      onlineRoomRef.off();
    }
    online.roomId = null;
    online.players = {};
    online.seats = {};
    onlinePlayerSeat = null;
    onlineRoomRef = null;
    lobbyOverlay.classList.add("hidden");
    renderHome();
  }

  function renderLobby() {
    if (!lobbyOverlay || lobbyOverlay.classList.contains("hidden")) return;
    const players = online.players || {};
    const ids = Object.keys(players).sort();
    lobbyPlayers.innerHTML = "";
    ids.forEach((id, index) => {
      const player = players[id];
      const row = document.createElement("div");
      row.className = "player-row";
      const slots = loadoutLimit(ids.length || 1, index);
      row.innerHTML = `<span><strong>${player.name || "Player"}${id === online.hostId ? " / HOST" : ""}</strong><span>持ち込み枠 ${Math.min((player.loadoutIds || []).length, slots)}/${slots}</span></span><b>${player.ready ? "OK" : "待機"}</b>`;
      lobbyPlayers.appendChild(row);
    });
    const myIndex = Math.max(0, ids.indexOf(playerId));
    const limit = loadoutLimit(ids.length || 1, myIndex);
    lobbyLoadoutText.textContent = `あなたの持ち込み枠 ${profile.loadoutIds.length}/${limit} / チーム最大10`;
    lobbyLoadoutList.innerHTML = profile.loadoutIds.map(ownedPartByUid).filter(Boolean).slice(0, limit).map((part) => `<i>${part.name}</i>`).join("") || "<i>未設定</i>";
    readyButton.textContent = players[playerId]?.ready ? "OK解除" : "参加OK";
  }

  function syncOnlineSeats() {
    if (state.mode !== "online" || !state.seats.length) return;
    for (const seat of state.seats) {
      if (seat.occupant === "player" && seat.id === state.currentSeatId) continue;
      const claim = online.seats?.[seat.id];
      if (claim && claim.playerId !== playerId) {
        seat.occupant = "other";
        seat.occupantName = claim.name || "P";
      } else if (!seat.damaged) {
        seat.occupant = "ai";
        seat.occupantName = "AI";
      }
    }
  }

  async function claimOnlineSeat(seatId) {
    if (!onlineRoomRef || state.mode !== "online") return true;
    const seatRef = onlineRoomRef.child(`seats/${seatId}`);
    const result = await seatRef.transaction((current) => {
      if (!current || current.playerId === playerId) {
        return { playerId, name: profile.name, at: Date.now() };
      }
      return;
    });
    if (!result.committed) return false;
    if (onlinePlayerSeat && onlinePlayerSeat !== seatId) {
      await onlineRoomRef.child(`seats/${onlinePlayerSeat}`).remove();
    }
    onlinePlayerSeat = seatId;
    seatRef.onDisconnect().remove();
    return true;
  }

  function createSeat(def, index) {
    return {
      ...def,
      index,
      maxHp: def.hp,
      hp: def.hp,
      damaged: false,
      occupant: "ai",
      occupantName: "AI",
      cooldown: 0,
      specialCooldown: 0,
      aiTimer: rand(0.1, 0.8)
    };
  }

  function resetGame(mode) {
    state.mode = mode;
    state.running = true;
    state.score = 0;
    state.distance = 0;
    state.distanceScoreMark = 0;
    state.elapsed = 0;
    state.seaLevel = 1;
    state.bossTimer = 180;
    state.bossCount = 0;
    state.shipHp = 1000;
    state.maxShipHp = 1000;
    state.ship = { x: state.width * 0.5, y: state.height * 0.58, vx: 0, vy: 0, radius: 38 };
    state.joystick = { x: 0, y: 0, active: false };
    state.currentSeatId = "bridge";
    state.seats = seatDefs.map(createSeat);
    state.projectiles = [];
    state.enemyProjectiles = [];
    state.enemies = [];
    state.particles = [];
    state.boss = null;
    state.spawnTimer = 0.2;
    state.logTimer = 0;
    state.upgradeOpen = false;
    state.runStats = { kills: 0, bosses: 0, repairs: 0, breaks: 0, intercepts: 0 };
    state.activeLoadout = profile.loadoutIds.map(ownedPartByUid).filter(Boolean).slice(0, currentLoadoutLimit());
    state.angles = { main: 0, secondary: 270, mg: -90, torpedo: -90 };
    state.stats = {
      speed: 1,
      repair: 1,
      mainDamage: 1,
      secondaryDamage: 1,
      mgDamage: 1,
      torpedoDamage: 1,
      secondaryReload: 1,
      mgReload: 1,
      ai: 1,
      seatMove: 1,
      reloadTap: 1,
      forward: 0,
      scoreGain: 1,
      luck: 0,
      deathSave: 0
    };
    applyLoadoutEffects();
    state.shipHp = state.maxShipHp;

    for (const seat of state.seats) {
      seat.occupant = "ai";
      seat.occupantName = "AI";
    }

    getSeat("bridge").occupant = "player";
    getSeat("bridge").occupantName = "YOU";

    if (mode === "online") {
      claimOnlineSeat("bridge");
      syncOnlineSeats();
      log(`オンライン出撃: ${online.roomId}`);
    } else if (mode === "room") {
      setRoomOccupants();
      log("ルーム試作: 埋まっている席は移動不可");
    } else {
      log("ソロ出撃: 空席はAIが担当");
    }

    startOverlay.classList.add("hidden");
    resultOverlay.classList.add("hidden");
    upgradeModal.classList.add("hidden");
    modeButton.textContent = mode === "solo" ? "ソロ" : mode === "online" ? "ONLINE" : "ルーム";
    renderSeatMap();
    renderControls();
    updateHud();
  }

  function applyLoadoutEffects() {
    for (const part of state.activeLoadout) {
      const effect = part.effect || {};
      if (effect.maxShipHp) state.maxShipHp += effect.maxShipHp;
      if (effect.partHp) {
        for (const seat of state.seats) {
          seat.maxHp *= 1 + effect.partHp;
          seat.hp = seat.maxHp;
        }
      }
      if (effect.seatHp) {
        for (const [seatId, bonus] of Object.entries(effect.seatHp)) {
          const seat = getSeat(seatId);
          if (seat) {
            seat.maxHp *= 1 + bonus;
            seat.hp = seat.maxHp;
          }
        }
      }
      for (const key of ["speed", "repair", "mainDamage", "secondaryDamage", "mgDamage", "torpedoDamage", "secondaryReload", "mgReload", "ai", "seatMove", "reloadTap", "luck"]) {
        if (effect[key]) state.stats[key] += effect[key];
      }
      if (effect.scoreGain) state.stats.scoreGain += effect.scoreGain;
      if (effect.deathSave) state.stats.deathSave += effect.deathSave;
    }
  }

  function setRoomOccupants() {
    const occupants = [
      ["mainR", "P2"],
      ["subL", "P3"],
      ["mgFR", "P4"],
      ["torpedo", "P5"]
    ];
    for (const [id, name] of occupants) {
      const seat = getSeat(id);
      seat.occupant = "other";
      seat.occupantName = name;
    }
  }

  function getSeat(id = state.currentSeatId) {
    return state.seats.find((seat) => seat.id === id);
  }

  function isCurrentSeatLocked() {
    const seat = getSeat();
    return seat && seat.damaged;
  }

  function canMoveToSeat(seat) {
    if (!seat || seat.id === state.currentSeatId) return false;
    if (isCurrentSeatLocked()) return false;
    if (seat.damaged) return false;
    if ((state.mode === "room" || state.mode === "online") && seat.occupant === "other") return false;
    return true;
  }

  async function moveToSeat(id) {
    const target = getSeat(id);
    if (!canMoveToSeat(target)) {
      if (isCurrentSeatLocked()) log("破損中: 修理するまで移動不可");
      else if (target?.damaged) log("その席は破損中");
      else if (target?.occupant === "other") log("オンライン席: すでに埋まっています");
      return;
    }

    if (state.mode === "online") {
      const claimed = await claimOnlineSeat(id);
      if (!claimed) {
        log("オンライン席: 先に埋まりました");
        return;
      }
    }

    const current = getSeat();
    if (current && current.occupant === "player") {
      current.occupant = "ai";
      current.occupantName = "AI";
    }

    target.occupant = "player";
    target.occupantName = "YOU";
    state.currentSeatId = target.id;
    log(`${target.name}へ移動`);
    renderSeatMap();
    renderControls();
  }

  function renderSeatMap() {
    seatMapEl.innerHTML = "";
    for (const seat of state.seats) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "seat-button";
      if (seat.id === "bridge" || seat.id === "torpedo") {
        button.style.gridColumn = "1 / 3";
      }
      if (seat.id === state.currentSeatId) button.classList.add("current");
      if (seat.occupant === "ai") button.classList.add("ai");
      if (seat.occupant === "other") button.classList.add("occupied");
      if (seat.damaged) button.classList.add("damaged");
      if (!canMoveToSeat(seat) && seat.id !== state.currentSeatId) button.classList.add("locked");
      button.innerHTML = `<span>${seat.short}</span><b>${seat.damaged ? "破損" : seat.occupantName}</b>`;
      button.addEventListener("click", () => moveToSeat(seat.id));
      seatMapEl.appendChild(button);
    }
    renderPartList();
  }

  function renderPartList() {
    partListEl.innerHTML = "";
    for (const seat of state.seats) {
      const row = document.createElement("div");
      row.className = `part-row${seat.damaged ? " damaged" : ""}`;
      const ratio = clamp(seat.hp / seat.maxHp, 0, 1);
      row.innerHTML = `
        <div>
          <span>${seat.short}</span>
          <div class="bar"><i style="width:${ratio * 100}%"></i></div>
        </div>
        <b>${Math.round(ratio * 100)}%</b>
      `;
      partListEl.appendChild(row);
    }
  }

  function renderControls() {
    const seat = getSeat();
    controlPanelEl.dataset.seatType = seat.type;
    seatNameText.textContent = seat.name;
    seatHelpText.textContent = seat.damaged ? "破損中: 修理連打" : seat.help;

    if (seat.damaged) {
      controlPanelEl.innerHTML = `
        <div class="control-title">
          <span>${seat.name} 修理中</span>
          <strong id="repairPercent">${Math.round((seat.hp / seat.maxHp) * 100)}%</strong>
        </div>
        <button id="repairButton" class="repair-button" type="button">修理連打</button>
        <div class="reload-meter">
          <small><span>応急復旧 35%</span><span>完全修理 100%</span></small>
          <div class="bar"><i id="repairBar" style="width:${(seat.hp / seat.maxHp) * 100}%"></i></div>
        </div>
      `;
      document.getElementById("repairButton").addEventListener("pointerdown", () => repairSeat(seat, seat.maxHp * 0.055 * state.stats.repair, true));
      return;
    }

    if (seat.type === "bridge") {
      renderBridgeControls();
      return;
    }

    if (seat.type === "main") {
      renderMainControls(seat);
      return;
    }

    if (seat.type === "secondary") {
      renderSecondaryControls(seat);
      return;
    }

    if (seat.type === "mg") {
      renderMgControls(seat);
      return;
    }

    renderTorpedoControls(seat);
  }

  function renderBridgeControls() {
    controlPanelEl.innerHTML = `
      <div class="control-title">
        <span>艦橋操作</span>
        <strong id="reloadText">前方魚雷 READY</strong>
      </div>
      <div class="control-grid">
        <div class="joystick" id="joystick"><div class="stick" id="stick"></div></div>
        <div class="control-grid" style="grid-template-columns:1fr;">
          <button id="bridgeFire" class="fire-button" type="button">前方魚雷</button>
          <button id="brakeButton" class="secondary-button" type="button">急制動</button>
        </div>
      </div>
    `;

    const joy = document.getElementById("joystick");
    const stick = document.getElementById("stick");

    const updateStick = (event) => {
      const rect = joy.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = event.clientX - cx;
      const dy = event.clientY - cy;
      const max = rect.width * 0.34;
      const len = Math.hypot(dx, dy);
      const scale = len > max ? max / len : 1;
      state.joystick.x = (dx * scale) / max;
      state.joystick.y = (dy * scale) / max;
      state.joystick.active = true;
      stick.style.transform = `translate(calc(-50% + ${dx * scale}px), calc(-50% + ${dy * scale}px))`;
    };

    const resetStick = () => {
      state.joystick.x = 0;
      state.joystick.y = 0;
      state.joystick.active = false;
      stick.style.transform = "translate(-50%, -50%)";
    };

    joy.addEventListener("pointerdown", (event) => {
      joy.setPointerCapture(event.pointerId);
      updateStick(event);
    });
    joy.addEventListener("pointermove", (event) => {
      if (state.joystick.active) updateStick(event);
    });
    joy.addEventListener("pointerup", resetStick);
    joy.addEventListener("pointercancel", resetStick);
    document.getElementById("bridgeFire").addEventListener("pointerdown", () => fireWeapon("bridge", -90, getSeat("bridge")));
    document.getElementById("brakeButton").addEventListener("pointerdown", () => {
      state.ship.vx *= 0.25;
      state.ship.vy *= 0.25;
      log("急制動");
    });
  }

  function renderMainControls(seat) {
    controlPanelEl.innerHTML = `
      <div class="control-title">
        <span>${seat.name} / 角度制限あり</span>
        <strong id="reloadText">READY</strong>
      </div>
      <div class="slider-block">
        <label><span>砲角 -65°から+65°</span><b id="angleValue">${state.angles.main}°</b></label>
        <input id="mainAngle" type="range" min="-65" max="65" step="1" value="${state.angles.main}" />
      </div>
      <div class="control-grid">
        <button id="mainFire" class="fire-button" type="button">主砲発射</button>
        <button id="mainReload" class="secondary-button" type="button">装填連打</button>
      </div>
      <div class="reload-meter">
        <small><span>リロード</span><span id="reloadPercent">100%</span></small>
        <div class="bar"><i id="reloadBar"></i></div>
      </div>
    `;
    const slider = document.getElementById("mainAngle");
    const label = document.getElementById("angleValue");
    slider.addEventListener("input", () => {
      state.angles.main = Number(slider.value);
      label.textContent = `${state.angles.main}°`;
    });
    document.getElementById("mainFire").addEventListener("pointerdown", () => {
      fireWeapon("main", -90 + state.angles.main, seat);
    });
    document.getElementById("mainReload").addEventListener("pointerdown", () => tapReload(seat, "主砲装填"));
  }

  function renderSecondaryControls(seat) {
    controlPanelEl.innerHTML = `
      <div class="control-title">
        <span>${seat.name} / 360°自由砲角</span>
        <strong id="reloadText">READY</strong>
      </div>
      <div class="slider-block">
        <label><span>砲角 0°から359°</span><b id="angleValue">${state.angles.secondary}°</b></label>
        <input id="secondaryAngle" type="range" min="0" max="359" step="1" value="${state.angles.secondary}" />
      </div>
      <div class="control-grid">
        <button id="secondaryFire" class="fire-button" type="button">副砲発射</button>
        <button id="secondaryReload" class="secondary-button" type="button">装填連打</button>
      </div>
      <div class="reload-meter">
        <small><span>リロード</span><span id="reloadPercent">100%</span></small>
        <div class="bar"><i id="reloadBar"></i></div>
      </div>
    `;
    const slider = document.getElementById("secondaryAngle");
    const label = document.getElementById("angleValue");
    slider.addEventListener("input", () => {
      state.angles.secondary = Number(slider.value);
      label.textContent = `${state.angles.secondary}°`;
    });
    document.getElementById("secondaryFire").addEventListener("pointerdown", () => {
      fireWeapon("secondary", state.angles.secondary, seat);
    });
    document.getElementById("secondaryReload").addEventListener("pointerdown", () => tapReload(seat, "副砲装填"));
  }

  function renderMgControls(seat) {
    controlPanelEl.innerHTML = `
      <div class="control-title">
        <span>${seat.name} / 迎撃担当</span>
        <strong id="reloadText">READY</strong>
      </div>
      <div class="control-grid three">
        <button data-angle="-145" class="secondary-button mg-angle" type="button">左</button>
        <button data-angle="-90" class="secondary-button mg-angle" type="button">前</button>
        <button data-angle="-35" class="secondary-button mg-angle" type="button">右</button>
      </div>
      <div class="control-grid">
        <button id="mgFire" class="fire-button" type="button">掃射</button>
        <button id="mgIntercept" class="secondary-button" type="button">迎撃</button>
      </div>
      <div class="reload-meter">
        <small><span>オーバーヒート</span><span id="reloadPercent">100%</span></small>
        <div class="bar"><i id="reloadBar"></i></div>
      </div>
    `;
    for (const button of [...controlPanelEl.querySelectorAll(".mg-angle")]) {
      button.addEventListener("pointerdown", () => {
        state.angles.mg = Number(button.dataset.angle);
        log(`機銃角度 ${button.textContent}`);
      });
    }
    document.getElementById("mgFire").addEventListener("pointerdown", () => fireWeapon("mg", state.angles.mg, seat));
    document.getElementById("mgIntercept").addEventListener("pointerdown", () => {
      const target = nearestEnemyProjectile();
      if (target) {
        const angle = (Math.atan2(target.y - state.ship.y, target.x - state.ship.x) * 180) / Math.PI;
        fireWeapon("mg", angle, seat);
        log("迎撃射撃");
      } else {
        fireWeapon("mg", state.angles.mg, seat);
      }
    });
  }

  function renderTorpedoControls(seat) {
    controlPanelEl.innerHTML = `
      <div class="control-title">
        <span>魚雷管制 / 高火力</span>
        <strong id="reloadText">READY</strong>
      </div>
      <div class="control-grid three">
        <button data-angle="-160" class="secondary-button torp-angle" type="button">左舷</button>
        <button data-angle="-90" class="secondary-button torp-angle" type="button">前方</button>
        <button data-angle="-20" class="secondary-button torp-angle" type="button">右舷</button>
      </div>
      <div class="control-grid">
        <button id="torpedoFire" class="fire-button" type="button">魚雷発射</button>
        <button id="mineDrop" class="secondary-button" type="button">機雷投下</button>
      </div>
      <div class="reload-meter">
        <small><span>リロード</span><span id="reloadPercent">100%</span></small>
        <div class="bar"><i id="reloadBar"></i></div>
      </div>
    `;
    for (const button of [...controlPanelEl.querySelectorAll(".torp-angle")]) {
      button.addEventListener("pointerdown", () => {
        state.angles.torpedo = Number(button.dataset.angle);
        log(`魚雷方向 ${button.textContent}`);
      });
    }
    document.getElementById("torpedoFire").addEventListener("pointerdown", () => {
      fireWeapon("torpedo", state.angles.torpedo, seat);
    });
    document.getElementById("mineDrop").addEventListener("pointerdown", () => dropMine(seat));
  }

  function tapReload(seat, label) {
    if (seat.cooldown <= 0) {
      log(`${label}: 装填済み`);
      return;
    }
    const amount = 0.22 * state.stats.reloadTap;
    seat.cooldown = Math.max(0, seat.cooldown - amount);
    spawnParticles(state.ship.x + seat.x, state.ship.y + seat.y, "#ffb43d", 5);
  }

  function cooldownBase(type) {
    const base = state.cooldownBases[type] ?? 1;
    if (type === "secondary") return base / state.stats.secondaryReload;
    if (type === "mg") return base / state.stats.mgReload;
    return base;
  }

  function fireWeapon(kind, angleDeg, seat, byAi = false) {
    if (!state.running || state.upgradeOpen || !seat || seat.damaged) return false;
    const type = kind === "bridge" ? "bridge" : kind;
    if (seat.cooldown > 0) {
      if (!byAi) log("リロード中: 連打で短縮");
      return false;
    }

    const forwardBonus = 1 + state.stats.forward * Math.min(0.35, state.distance / 7000);
    let speed = 520;
    let damage = 20;
    let radius = 4;
    let color = "#eafcff";
    let life = 2.4;
    let shots = 1;
    let spread = 0;
    let cooldownType = type;

    if (kind === "bridge") {
      damage = 58 * state.stats.torpedoDamage * forwardBonus;
      speed = 470;
      radius = 6;
      color = "#5dff97";
      cooldownType = "bridge";
      log("艦橋: 前方魚雷");
    } else if (kind === "main") {
      damage = 126 * state.stats.mainDamage * forwardBonus;
      speed = 560;
      radius = 8;
      color = "#ffcc6a";
      life = 2.2;
      screenKick(5);
      log("主砲発射");
    } else if (kind === "secondary") {
      damage = 38 * state.stats.secondaryDamage * forwardBonus;
      speed = 500;
      radius = 5;
      color = "#74e5ff";
      life = 2;
      log("副砲発射");
    } else if (kind === "mg") {
      damage = 10 * state.stats.mgDamage * forwardBonus;
      speed = 570;
      radius = 2.5;
      color = "#dffaff";
      life = 1.1;
      shots = 5;
      spread = 16;
    } else if (kind === "torpedo") {
      damage = 170 * state.stats.torpedoDamage * forwardBonus;
      speed = 390;
      radius = 7;
      color = "#63ffa2";
      life = 3.1;
      screenKick(3);
      log("魚雷発射");
    }

    const muzzleX = state.ship.x + seat.x * 0.72;
    const muzzleY = state.ship.y + seat.y * 0.72;
    for (let i = 0; i < shots; i++) {
      const offset = shots === 1 ? 0 : rand(-spread, spread);
      const v = angleVector(angleDeg + offset);
      state.projectiles.push({
        x: muzzleX,
        y: muzzleY,
        vx: v.x * speed,
        vy: v.y * speed,
        damage,
        radius,
        color,
        life,
        kind,
        pierce: kind === "main" ? 1 : 0
      });
    }
    spawnParticles(muzzleX, muzzleY, color, kind === "main" ? 12 : 5);
    seat.cooldown = cooldownBase(cooldownType);
    return true;
  }

  function dropMine(seat) {
    if (seat.specialCooldown > 0 || seat.damaged) {
      log("機雷リロード中");
      return;
    }
    state.projectiles.push({
      x: state.ship.x,
      y: state.ship.y + 44,
      vx: 0,
      vy: 48,
      damage: 130 * state.stats.torpedoDamage,
      radius: 13,
      color: "#b98cff",
      life: 6,
      kind: "mine",
      mine: true,
      pierce: 3
    });
    seat.specialCooldown = state.cooldownBases.mine;
    log("機雷投下");
  }

  function nearestEnemyProjectile() {
    let best = null;
    let bestD = Infinity;
    for (const bullet of state.enemyProjectiles) {
      const d = dist(bullet, state.ship);
      if (d < bestD) {
        best = bullet;
        bestD = d;
      }
    }
    return best;
  }

  function update(dt) {
    toastTimer = Math.max(0, toastTimer - dt);
    if (toastTimer <= 0) toast.classList.add("hidden");
    if (!state.running) return;
    if (state.upgradeOpen) {
      updateControlReadouts();
      return;
    }

    state.elapsed += dt;
    state.distance += dt * (10 + state.seaLevel * 0.18);
    state.seaLevel = 1 + Math.floor(state.distance / 500) + Math.floor(state.elapsed / 90);

    const distanceBucket = Math.floor(state.distance / 100);
    if (distanceBucket > state.distanceScoreMark) {
      addScore(distanceBucket - state.distanceScoreMark);
      state.distanceScoreMark = distanceBucket;
    }

    updateCooldowns(dt);
    updateShip(dt);
    updateAiSeats(dt);
    updateSpawning(dt);
    updateEnemies(dt);
    updateProjectiles(dt);
    updateParticles(dt);
    updateBossTimer(dt);
    updateControlReadouts();

    state.logTimer = Math.max(0, state.logTimer - dt);
    if (state.logTimer <= 0) combatLogEl.textContent = "";

    uiTimer -= dt;
    if (uiTimer <= 0) {
      updateHud();
      renderSeatMap();
      uiTimer = 0.18;
    }

    if (state.shipHp <= 0 && state.stats.deathSave > 0) {
      state.stats.deathSave -= 1;
      state.shipHp = 1;
      log("不沈の誓い: HP1で耐えた");
    }

    if (state.shipHp <= 0) {
      endGame();
    }
  }

  function updateCooldowns(dt) {
    for (const seat of state.seats) {
      seat.cooldown = Math.max(0, seat.cooldown - dt);
      seat.specialCooldown = Math.max(0, seat.specialCooldown - dt);
    }
  }

  function updateShip(dt) {
    const bridge = getSeat("bridge");
    let inputX = 0;
    let inputY = 0;

    if (state.currentSeatId === "bridge" && !bridge.damaged) {
      inputX = state.joystick.x;
      inputY = state.joystick.y;
    } else if (bridge.occupant !== "player" && !bridge.damaged) {
      const threat = nearestThreat();
      if (threat) {
        inputX = clamp((state.ship.x - threat.x) / 140, -0.7, 0.7);
        inputY = clamp((state.ship.y - threat.y) / 220, -0.45, 0.45);
      } else {
        inputX = Math.sin(state.elapsed * 0.8) * 0.25;
        inputY = Math.cos(state.elapsed * 0.5) * 0.12;
      }
    }

    const speed = 175 * state.stats.speed * (bridge.damaged ? 0.16 : 1);
    state.ship.vx += inputX * speed * dt * 4;
    state.ship.vy += inputY * speed * dt * 4;
    state.ship.vx *= Math.pow(0.14, dt);
    state.ship.vy *= Math.pow(0.14, dt);
    state.ship.x += state.ship.vx * dt;
    state.ship.y += state.ship.vy * dt;
    state.ship.x = clamp(state.ship.x, 48, state.width - 48);
    state.ship.y = clamp(state.ship.y, state.height * 0.3, state.height * 0.64);
  }

  function nearestThreat() {
    const all = [...state.enemyProjectiles, ...state.enemies];
    let best = null;
    let bestD = Infinity;
    for (const item of all) {
      const d = dist(item, state.ship);
      if (d < bestD) {
        best = item;
        bestD = d;
      }
    }
    return best;
  }

  function updateAiSeats(dt) {
    for (const seat of state.seats) {
      if (seat.occupant === "player") continue;

      if (seat.damaged) {
        const repairRate = seat.maxHp * dt * (seat.occupant === "other" ? 0.13 : 0.08) * state.stats.ai;
        repairSeat(seat, repairRate, false);
        continue;
      }

      seat.aiTimer -= dt * (seat.occupant === "other" ? 1.2 : 1) * state.stats.ai;
      if (seat.aiTimer > 0) continue;
      seat.aiTimer = rand(0.45, 1.2);

      const target = pickAiTarget(seat);
      if (!target) continue;
      const angle = (Math.atan2(target.y - (state.ship.y + seat.y * 0.6), target.x - (state.ship.x + seat.x * 0.6)) * 180) / Math.PI;

      if (seat.type === "main") {
        const limited = clamp(angle, -155, -25);
        fireWeapon("main", limited, seat, true);
      } else if (seat.type === "secondary") {
        fireWeapon("secondary", angle, seat, true);
      } else if (seat.type === "mg") {
        fireWeapon("mg", angle, seat, true);
      } else if (seat.type === "torpedo") {
        if (target.isBoss || target.hp > 90) fireWeapon("torpedo", angle, seat, true);
      } else if (seat.type === "bridge") {
        fireWeapon("bridge", -90, seat, true);
      }
    }
  }

  function pickAiTarget(seat) {
    if (state.boss && state.boss.hp > 0 && (seat.type === "main" || seat.type === "torpedo")) return state.boss;
    let candidates = state.enemies;
    if (seat.type === "mg" && state.enemyProjectiles.length) candidates = state.enemyProjectiles;
    if (!candidates.length) return null;

    let best = null;
    let bestValue = Infinity;
    for (const target of candidates) {
      let value = dist({ x: state.ship.x + seat.x, y: state.ship.y + seat.y }, target);
      if (seat.id.includes("L") && target.x > state.ship.x) value += 90;
      if (seat.id.includes("R") && target.x < state.ship.x) value += 90;
      if (seat.type === "main") value -= (target.hp || 20) * 0.35;
      if (value < bestValue) {
        best = target;
        bestValue = value;
      }
    }
    return best;
  }

  function updateSpawning(dt) {
    state.spawnTimer -= dt;
    if (state.spawnTimer > 0) return;

    const interval = clamp(1.15 - state.seaLevel * 0.035, 0.38, 1.15);
    state.spawnTimer = interval;
    const count = 1 + (Math.random() < state.seaLevel * 0.025 ? 1 : 0);
    for (let i = 0; i < count; i++) spawnEnemy();
  }

  function spawnEnemy() {
    const roll = Math.random();
    const sideRoll = Math.random();
    let x = rand(36, state.width - 36);
    let y = -30;
    if (sideRoll < 0.28 + Math.min(0.28, state.seaLevel * 0.015)) {
      x = sideRoll < 0.28 ? -28 : state.width + 28;
      y = rand(110, state.height * 0.68);
    }

    let type = "scout";
    if (roll > 0.78) type = "missile";
    if (roll > 0.88) type = "armor";
    if (roll > 0.95) type = "drone";

    const stats = {
      scout: { hp: 28, speed: 52, radius: 13, score: 1, color: "#ffdf8f" },
      missile: { hp: 38, speed: 42, radius: 15, score: 2, color: "#ff7b63" },
      armor: { hp: 95, speed: 28, radius: 19, score: 4, color: "#c7d7e0" },
      drone: { hp: 18, speed: 88, radius: 9, score: 1, color: "#aef7ff" }
    }[type];

    const hpScale = 1 + state.seaLevel * 0.11;
    state.enemies.push({
      x,
      y,
      vx: 0,
      vy: 0,
      hp: stats.hp * hpScale,
      maxHp: stats.hp * hpScale,
      speed: stats.speed + state.seaLevel * 1.2,
      radius: stats.radius,
      score: stats.score,
      color: stats.color,
      type,
      fireTimer: rand(0.8, 2.2)
    });
  }

  function updateEnemies(dt) {
    for (const enemy of state.enemies) {
      const dx = state.ship.x - enemy.x;
      const dy = state.ship.y - enemy.y;
      const length = Math.hypot(dx, dy) || 1;
      enemy.vx += (dx / length) * enemy.speed * dt * 1.4;
      enemy.vy += (dy / length) * enemy.speed * dt * 1.4;
      enemy.vx *= Math.pow(0.3, dt);
      enemy.vy *= Math.pow(0.3, dt);
      enemy.y += 22 * dt;
      enemy.x += enemy.vx * dt;
      enemy.y += enemy.vy * dt;

      enemy.fireTimer -= dt;
      if ((enemy.type === "missile" || enemy.type === "armor") && enemy.fireTimer <= 0) {
        fireEnemyBullet(enemy);
        enemy.fireTimer = rand(1.6, 3.0) / (1 + state.seaLevel * 0.02);
      }

      if (dist(enemy, state.ship) < enemy.radius + state.ship.radius * 0.72) {
        damageShip(enemy.x, enemy.y, enemy.type === "armor" ? 58 : 34);
        enemy.hp = 0;
        screenKick(6);
      }
    }

    state.enemies = state.enemies.filter((enemy) => {
      if (enemy.hp <= 0) {
        addScore(enemy.score);
        state.runStats.kills += 1;
        spawnParticles(enemy.x, enemy.y, enemy.color, 12);
        return false;
      }
      return enemy.y < state.height + 70 && enemy.x > -90 && enemy.x < state.width + 90;
    });

    if (state.boss) updateBoss(dt);
  }

  function fireEnemyBullet(enemy) {
    const angle = Math.atan2(state.ship.y - enemy.y, state.ship.x - enemy.x);
    const speed = enemy.type === "armor" ? 190 : 230;
    state.enemyProjectiles.push({
      x: enemy.x,
      y: enemy.y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      damage: enemy.type === "armor" ? 34 : 22,
      radius: enemy.type === "armor" ? 6 : 5,
      color: enemy.type === "armor" ? "#ffb43d" : "#ff4b55",
      life: 4
    });
  }

  function updateBoss(dt) {
    const boss = state.boss;
    boss.phase += dt;
    boss.x = state.width * 0.5 + Math.sin(boss.phase * 0.65) * state.width * 0.28;
    boss.y = 92 + Math.sin(boss.phase * 1.1) * 18;
    boss.fireTimer -= dt;
    if (boss.fireTimer <= 0) {
      boss.fireTimer = clamp(1.4 - state.bossCount * 0.07, 0.65, 1.4);
      for (let i = -2; i <= 2; i++) {
        const angle = 90 + i * 16 + Math.sin(boss.phase) * 8;
        const v = angleVector(angle);
        state.enemyProjectiles.push({
          x: boss.x + i * 12,
          y: boss.y + 32,
          vx: v.x * 190,
          vy: v.y * 190,
          damage: 28 + state.bossCount * 5,
          radius: 6,
          color: "#ff4b55",
          life: 4
        });
      }
    }

    if (boss.hp <= 0) {
      addScore(50 + state.bossCount * 12);
      state.runStats.bosses += 1;
      state.boss = null;
      state.bossTimer = 180;
      spawnParticles(boss.x, boss.y, "#ffcc6a", 44);
      showUpgradeModal();
    }
  }

  function updateProjectiles(dt) {
    for (const p of state.projectiles) {
      if (p.mine) {
        p.vy *= Math.pow(0.7, dt);
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;

      for (const enemy of state.enemies) {
        if (enemy.hp > 0 && dist(p, enemy) < p.radius + enemy.radius) {
          enemy.hp -= p.damage;
          p.life -= p.pierce > 0 ? 0.12 : 99;
          p.pierce -= 1;
          spawnParticles(p.x, p.y, p.color, 5);
          break;
        }
      }

      if (state.boss && p.life > 0 && dist(p, state.boss) < p.radius + state.boss.radius) {
        state.boss.hp -= p.damage;
        p.life -= p.pierce > 0 ? 0.12 : 99;
        p.pierce -= 1;
        spawnParticles(p.x, p.y, p.color, 8);
      }
    }

    for (const p of state.enemyProjectiles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      if (dist(p, state.ship) < p.radius + state.ship.radius * 0.75) {
        damageShip(p.x, p.y, p.damage);
        p.life = 0;
        screenKick(5);
      }
    }

    state.projectiles = state.projectiles.filter((p) => p.life > 0 && p.x > -80 && p.x < state.width + 80 && p.y > -110 && p.y < state.height + 110);
    state.enemyProjectiles = state.enemyProjectiles.filter((p) => p.life > 0 && p.x > -80 && p.x < state.width + 80 && p.y > -110 && p.y < state.height + 110);
  }

  function damageShip(x, y, amount) {
    const part = nearestSeatPart(x, y);
    const shipDamage = amount * (part?.damaged ? 0.72 : 0.48);
    state.shipHp = Math.max(0, state.shipHp - shipDamage);
    state.flash = 0.18;

    if (part) {
      part.hp = Math.max(0, part.hp - amount * 0.85);
      if (part.hp <= 0 && !part.damaged) {
        part.damaged = true;
        part.cooldown = 0;
        state.runStats.breaks += 1;
        log(`${part.name} 破損`);
        if (part.id === state.currentSeatId) renderControls();
      }
    }
  }

  function nearestSeatPart(x, y) {
    let best = null;
    let bestD = Infinity;
    for (const seat of state.seats) {
      const px = state.ship.x + seat.x;
      const py = state.ship.y + seat.y;
      const d = Math.hypot(px - x, py - y);
      if (d < bestD) {
        bestD = d;
        best = seat;
      }
    }
    return best;
  }

  function repairSeat(seat, amount, manual) {
    seat.hp = clamp(seat.hp + amount, 0, seat.maxHp);
    if (manual) {
      spawnParticles(state.ship.x + seat.x, state.ship.y + seat.y, "#5dff97", 4);
    }

    if (seat.damaged && seat.hp >= seat.maxHp * 0.35) {
      seat.damaged = false;
      state.runStats.repairs += 1;
      log(`${seat.name} 応急復旧`);
      renderSeatMap();
      if (seat.id === state.currentSeatId) renderControls();
    } else if (seat.id === state.currentSeatId && seat.damaged) {
      const repairPercent = document.getElementById("repairPercent");
      const repairBar = document.getElementById("repairBar");
      const ratio = clamp(seat.hp / seat.maxHp, 0, 1);
      if (repairPercent) repairPercent.textContent = `${Math.round(ratio * 100)}%`;
      if (repairBar) repairBar.style.width = `${ratio * 100}%`;
    }
  }

  function updateBossTimer(dt) {
    if (state.boss) return;
    state.bossTimer -= dt;
    if (state.bossTimer <= 0) spawnBoss();
  }

  function spawnBoss() {
    state.bossCount += 1;
    const hp = 1600 * (1 + state.bossCount * 0.42);
    state.boss = {
      x: state.width * 0.5,
      y: 92,
      hp,
      maxHp: hp,
      radius: 48,
      phase: 0,
      fireTimer: 1,
      isBoss: true
    };
    log("BOSS接近");
    screenKick(7);
  }

  function showUpgradeModal() {
    state.upgradeOpen = true;
    upgradeHint.textContent = state.mode === "online" ? "オンライン投票風 / 5択" : "5択から1つ選択";
    const weighted = [...upgrades];
    if (state.stats.luck > 0) weighted.push(...upgrades.filter((upgrade) => upgrade.rarity !== "Common"));
    const picks = [...weighted].sort(() => Math.random() - 0.5).slice(0, 5);
    upgradeOptions.innerHTML = "";
    for (const upgrade of picks) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "upgrade-card";
      button.innerHTML = `
        <span><strong>${upgrade.name}</strong><span>${upgrade.desc}</span></span>
        <b>${upgrade.rarity}</b>
      `;
      button.addEventListener("click", () => {
        upgrade.apply();
        state.upgradeOpen = false;
        upgradeModal.classList.add("hidden");
        log(`${upgrade.name} 獲得`);
        updateHud();
      });
      upgradeOptions.appendChild(button);
    }
    upgradeModal.classList.remove("hidden");
  }

  function updateParticles(dt) {
    for (const p of state.particles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      p.size *= Math.pow(0.2, dt);
    }
    state.particles = state.particles.filter((p) => p.life > 0);
    state.flash = Math.max(0, state.flash - dt);
  }

  function spawnParticles(x, y, color, count) {
    for (let i = 0; i < count; i++) {
      const a = rand(0, Math.PI * 2);
      const speed = rand(25, 150);
      state.particles.push({
        x,
        y,
        vx: Math.cos(a) * speed,
        vy: Math.sin(a) * speed,
        size: rand(2, 6),
        color,
        life: rand(0.25, 0.7)
      });
    }
  }

  function screenKick(amount) {
    state.ship.vx += rand(-amount, amount) * 4;
    state.ship.vy += rand(-amount, amount) * 2;
  }

  function updateHud() {
    scoreText.textContent = padScore(state.score);
    moneyText.textContent = `+${padScore(state.score)}`;
    distanceText.textContent = `${(state.distance / 1000).toFixed(1)}km`;
    seaLevelText.textContent = `海域 Lv.${state.seaLevel}`;
    bossText.textContent = state.boss ? "交戦中" : formatTime(state.bossTimer);
    crewText.textContent = state.mode === "online" ? `${Object.keys(online.players || {}).length || 1}/10` : "1/10";
    const ratio = clamp(state.shipHp / state.maxShipHp, 0, 1);
    shipHpBar.style.width = `${ratio * 100}%`;
    shipHpText.textContent = `${Math.round(ratio * 100)}%`;
  }

  function updateControlReadouts() {
    const seat = getSeat();
    if (!seat || seat.damaged) return;
    const reloadText = document.getElementById("reloadText");
    const reloadBar = document.getElementById("reloadBar");
    const reloadPercent = document.getElementById("reloadPercent");
    if (!reloadText || !reloadBar) return;

    let base = cooldownBase(seat.type === "bridge" ? "bridge" : seat.type);
    if (seat.type === "torpedo") base = cooldownBase("torpedo");
    const ratio = clamp(1 - seat.cooldown / base, 0, 1);
    reloadText.textContent = ratio >= 1 ? "READY" : `${Math.ceil(seat.cooldown * 10) / 10}s`;
    reloadBar.style.width = `${ratio * 100}%`;
    if (reloadPercent) reloadPercent.textContent = `${Math.round(ratio * 100)}%`;
  }

  function log(message) {
    combatLogEl.textContent = message;
    state.logTimer = 1.9;
  }

  function endGame() {
    state.running = false;
    const earned = Math.floor(state.score);
    profile.money += earned;
    profile.bestScore = Math.max(profile.bestScore, earned);
    profile.bestDistance = Math.max(profile.bestDistance, Math.floor(state.distance));
    profile.totalRuns += 1;
    saveProfile();
    renderHome();

    resultStats.innerHTML = `
      <div><span>最終スコア</span><strong>${padScore(earned)}</strong></div>
      <div><span>獲得MONEY</span><strong>+${padScore(earned)}</strong></div>
      <div><span>進行距離</span><strong>${(state.distance / 1000).toFixed(1)}km</strong></div>
      <div><span>海域</span><strong>Lv.${state.seaLevel}</strong></div>
      <div><span>撃破数</span><strong>${state.runStats.kills}</strong></div>
      <div><span>ボス撃破</span><strong>${state.runStats.bosses}</strong></div>
      <div><span>修理</span><strong>${state.runStats.repairs}</strong></div>
      <div><span>破損</span><strong>${state.runStats.breaks}</strong></div>
    `;
    resultOverlay.classList.remove("hidden");
  }

  function draw() {
    const w = state.width;
    const h = state.height;
    ctx.clearRect(0, 0, w, h);
    drawOcean(w, h);
    drawCombatLanes(w, h);
    drawProjectiles(state.projectiles, false);
    drawEnemies();
    drawBoss();
    drawShip();
    drawProjectiles(state.enemyProjectiles, true);
    drawParticles();
    drawAimGuide();

    if (state.flash > 0) {
      ctx.save();
      ctx.globalAlpha = state.flash * 1.8;
      ctx.fillStyle = "#ff4b55";
      ctx.fillRect(0, 0, w, h);
      ctx.restore();
    }
  }

  function drawOcean(w, h) {
    const t = state.elapsed * 52;
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, "#103d4c");
    grad.addColorStop(0.55, "#0d2b3a");
    grad.addColorStop(1, "#071923");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    ctx.save();
    ctx.globalAlpha = 0.26;
    ctx.strokeStyle = "#63e8ff";
    ctx.lineWidth = 1;
    for (let y = -40 + (t % 46); y < h + 46; y += 46) {
      ctx.beginPath();
      for (let x = 0; x <= w; x += 18) {
        const yy = y + Math.sin((x + t) * 0.02) * 5;
        if (x === 0) ctx.moveTo(x, yy);
        else ctx.lineTo(x, yy);
      }
      ctx.stroke();
    }
    ctx.restore();

    ctx.save();
    ctx.globalAlpha = 0.12;
    ctx.fillStyle = "#ffffff";
    for (let i = 0; i < 20; i++) {
      const x = (i * 73 + t * 0.17) % (w + 80) - 40;
      const y = (i * 113 + t * (0.7 + (i % 4) * 0.12)) % (h + 80) - 40;
      ctx.fillRect(x, y, 18 + (i % 3) * 12, 1);
    }
    ctx.restore();
  }

  function drawCombatLanes(w, h) {
    ctx.save();
    ctx.globalAlpha = 0.28;
    ctx.strokeStyle = "#8eeeff";
    ctx.lineWidth = 1;
    for (const x of [w * 0.18, w * 0.5, w * 0.82]) {
      ctx.setLineDash([10, 14]);
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    ctx.setLineDash([]);
    ctx.globalAlpha = 0.5;
    ctx.strokeStyle = "#ffb43d";
    ctx.beginPath();
    ctx.moveTo(4, h * 0.18);
    ctx.lineTo(4, h * 0.86);
    ctx.moveTo(w - 4, h * 0.18);
    ctx.lineTo(w - 4, h * 0.86);
    ctx.stroke();
    ctx.restore();
  }

  function drawShip() {
    const s = state.ship;
    ctx.save();
    ctx.translate(s.x, s.y);

    ctx.fillStyle = "#1b3442";
    ctx.strokeStyle = "#9fc1cd";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -78);
    ctx.lineTo(46, -26);
    ctx.lineTo(38, 68);
    ctx.lineTo(0, 92);
    ctx.lineTo(-38, 68);
    ctx.lineTo(-46, -26);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#2b596b";
    ctx.fillRect(-18, -48, 36, 34);
    ctx.fillRect(-28, 2, 22, 20);
    ctx.fillRect(6, 2, 22, 20);
    ctx.fillRect(-13, 46, 26, 22);

    for (const seat of state.seats) {
      const ratio = clamp(seat.hp / seat.maxHp, 0, 1);
      ctx.fillStyle = seat.damaged ? "#ff4b55" : seat.occupant === "player" ? "#3de0ff" : seat.occupant === "other" ? "#ffb43d" : "#5dff97";
      ctx.globalAlpha = seat.damaged ? 0.9 : 0.72;
      ctx.beginPath();
      ctx.arc(seat.x, seat.y, seat.id === state.currentSeatId ? 7 : 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;

      if (ratio < 0.45 || seat.damaged) {
        ctx.strokeStyle = "#ff4b55";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(seat.x, seat.y, 10, 0, Math.PI * 2 * ratio);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  function drawEnemies() {
    for (const enemy of state.enemies) {
      ctx.save();
      ctx.translate(enemy.x, enemy.y);
      ctx.fillStyle = enemy.color;
      ctx.strokeStyle = "rgba(255,255,255,0.45)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      if (enemy.type === "drone") {
        ctx.arc(0, 0, enemy.radius, 0, Math.PI * 2);
      } else {
        ctx.moveTo(0, -enemy.radius);
        ctx.lineTo(enemy.radius, enemy.radius * 0.8);
        ctx.lineTo(-enemy.radius, enemy.radius * 0.8);
        ctx.closePath();
      }
      ctx.fill();
      ctx.stroke();

      const hpRatio = clamp(enemy.hp / enemy.maxHp, 0, 1);
      ctx.fillStyle = "#111";
      ctx.fillRect(-enemy.radius, enemy.radius + 5, enemy.radius * 2, 3);
      ctx.fillStyle = "#ff4b55";
      ctx.fillRect(-enemy.radius, enemy.radius + 5, enemy.radius * 2 * hpRatio, 3);
      ctx.restore();
    }
  }

  function drawBoss() {
    const boss = state.boss;
    if (!boss) return;
    ctx.save();
    ctx.translate(boss.x, boss.y);
    ctx.fillStyle = "#512a39";
    ctx.strokeStyle = "#ffb43d";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -52);
    ctx.lineTo(62, -12);
    ctx.lineTo(54, 42);
    ctx.lineTo(0, 62);
    ctx.lineTo(-54, 42);
    ctx.lineTo(-62, -12);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#ff4b55";
    ctx.fillRect(-34, -18, 68, 16);
    ctx.restore();

    const ratio = clamp(boss.hp / boss.maxHp, 0, 1);
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.fillRect(24, 70, state.width - 48, 8);
    ctx.fillStyle = "#ff4b55";
    ctx.fillRect(24, 70, (state.width - 48) * ratio, 8);
    ctx.strokeStyle = "rgba(255,180,61,0.7)";
    ctx.strokeRect(24, 70, state.width - 48, 8);
  }

  function drawProjectiles(list, enemy) {
    for (const p of list) {
      ctx.save();
      ctx.globalAlpha = enemy ? 0.92 : 1;
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = enemy ? 8 : 12;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();
      if (p.kind === "torpedo" || p.kind === "bridge") {
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(p.x - p.vx * 0.05, p.y - p.vy * 0.05);
        ctx.lineTo(p.x, p.y);
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  function drawParticles() {
    for (const p of state.particles) {
      ctx.save();
      ctx.globalAlpha = clamp(p.life * 2, 0, 1);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  function drawAimGuide() {
    const seat = getSeat();
    if (!seat || seat.damaged) return;
    let angle = null;
    if (seat.type === "main") angle = -90 + state.angles.main;
    if (seat.type === "secondary") angle = state.angles.secondary;
    if (seat.type === "mg") angle = state.angles.mg;
    if (seat.type === "torpedo") angle = state.angles.torpedo;
    if (seat.type === "bridge") angle = -90;
    if (angle === null) return;

    const v = angleVector(angle);
    const x = state.ship.x + seat.x * 0.72;
    const y = state.ship.y + seat.y * 0.72;
    ctx.save();
    ctx.strokeStyle = seat.type === "main" ? "#ffb43d" : "#3de0ff";
    ctx.globalAlpha = 0.55;
    ctx.setLineDash([7, 7]);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + v.x * 150, y + v.y * 150);
    ctx.stroke();
    ctx.restore();
  }

  function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    state.width = Math.max(240, rect.width);
    state.height = Math.max(360, rect.height);
    canvas.width = Math.floor(state.width * dpr);
    canvas.height = Math.floor(state.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    state.ship.x = clamp(state.ship.x || state.width * 0.5, 48, state.width - 48);
    state.ship.y = clamp(state.ship.y || state.height * 0.58, state.height * 0.3, state.height * 0.64);
  }

  function loop(now) {
    const dt = Math.min(0.033, (now - lastTime) / 1000 || 0);
    lastTime = now;
    update(dt);
    draw();
    requestAnimationFrame(loop);
  }

  soloStartButton.addEventListener("click", () => resetGame("solo"));
  quickStartButton.addEventListener("click", () => quickMatch());
  createRoomButton.addEventListener("click", () => createRoom("private"));
  joinRoomButton.addEventListener("click", () => joinRoom(roomCodeInput.value));
  readyButton.addEventListener("click", () => {
    const current = online.players?.[playerId]?.ready;
    setReady(!current);
  });
  leaveRoomButton.addEventListener("click", () => leaveRoom());
  autoLoadoutButton.addEventListener("click", () => autoLoadout());
  gachaButton.addEventListener("click", () => drawGacha());
  grantMoneyButton.addEventListener("click", () => grantDebugMoney());
  resultHomeButton.addEventListener("click", () => {
    resultOverlay.classList.add("hidden");
    startOverlay.classList.remove("hidden");
  });
  resultRetryButton.addEventListener("click", () => {
    resultOverlay.classList.add("hidden");
    resetGame(state.mode === "online" ? "online" : "solo");
  });
  for (const button of [...document.querySelectorAll(".tab-button")]) {
    button.addEventListener("click", () => {
      document.querySelectorAll(".tab-button").forEach((item) => item.classList.toggle("active", item === button));
      document.querySelectorAll(".home-tab").forEach((item) => item.classList.toggle("active", item.id === `${button.dataset.tab}Tab`));
      renderHome();
    });
  }
  modeButton.addEventListener("click", () => {
    if (state.running) {
      state.running = false;
      startOverlay.classList.remove("hidden");
      showToast("母港へ戻りました");
    }
  });

  window.addEventListener("resize", resizeCanvas);
  initFirebase();
  renderHome();
  resizeCanvas();
  resetGame("solo");
  startOverlay.classList.remove("hidden");
  requestAnimationFrame(loop);
})();
