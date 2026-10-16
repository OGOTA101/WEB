(() => {
  "use strict";

  const COLORS = [
    "#ff665f",
    "#347fd9",
    "#6abf4b",
    "#f4b626",
    "#8b69d6",
    "#14aeb0",
    "#334155"
  ];

  const AI_NAMES = [
    "AI:ミライ",
    "AI:ソラ",
    "AI:コハル",
    "AI:レン",
    "AI:ナギ",
    "AI:ヒカリ"
  ];

  const CAREERS = [
    { id: "planner", name: "街づくりプランナー", ranks: ["設計補佐", "主任プランナー"], salaries: [18000, 39000], rankRoll: [6, 7, 8], category: "安定", flavor: "家や街イベントに強い" },
    { id: "developer", name: "アプリ開発者", ranks: ["実装担当", "テックリード"], salaries: [19000, 42000], rankRoll: [5, 7, 8], category: "技術", flavor: "成長ロードと相性が良い" },
    { id: "chef", name: "フードクリエイター", ranks: ["キッチン担当", "人気店オーナー"], salaries: [16000, 36000], rankRoll: [4, 6, 8], category: "サービス", flavor: "家族イベントで小ボーナス" },
    { id: "designer", name: "ゲームUIデザイナー", ranks: ["デザイナー", "アートディレクター"], salaries: [17000, 40000], rankRoll: [5, 6, 8], category: "創作", flavor: "お宝価値が伸びやすい" },
    { id: "teacher", name: "学びのコーチ", ranks: ["コーチ", "スクール代表"], salaries: [15000, 34000], rankRoll: [4, 5, 6], category: "安定", flavor: "序盤から扱いやすい" },
    { id: "researcher", name: "未来研究員", ranks: ["研究員", "主任研究員"], salaries: [18000, 44000], rankRoll: [6, 8], category: "専門", flavor: "成功時の伸びが高い" },
    { id: "creator", name: "動画クリエイター", ranks: ["配信者", "メディアスター"], salaries: [13000, 50000], rankRoll: [7, 8], category: "冒険", flavor: "不安定だが大化けする" },
    { id: "guide", name: "旅のガイド", ranks: ["ガイド", "ツアー設計者"], salaries: [15000, 35000], rankRoll: [4, 7, 8], category: "旅行", flavor: "移動保険と相性が良い" },
    { id: "analyst", name: "データ分析官", ranks: ["分析官", "戦略責任者"], salaries: [20000, 45000], rankRoll: [5, 6, 7], category: "専門", flavor: "株イベントで堅い" },
    { id: "inventor", name: "週末発明家", ranks: ["試作家", "発明ブランド"], salaries: [12000, 56000], rankRoll: [8], category: "冒険", flavor: "チャレンジ成功で強い" },
    { id: "medic", name: "ヘルスサポーター", ranks: ["サポーター", "ケアマネージャー"], salaries: [17000, 37000], rankRoll: [4, 6, 7], category: "安定", flavor: "生活保険と好相性" },
    { id: "eventer", name: "イベント運営", ranks: ["運営担当", "フェス主催者"], salaries: [16000, 43000], rankRoll: [5, 7, 8], category: "サービス", flavor: "人脈イベントで伸びる" }
  ];

  const TREASURES = [
    { id: "camera", name: "旅のカメラ", value: 16000, rarity: "N", effect: "旅行マスの思い出" },
    { id: "toolbox", name: "万能工具箱", value: 18000, rarity: "N", effect: "修理イベントの記念品" },
    { id: "recipe", name: "家族のレシピ帳", value: 22000, rarity: "N", effect: "家族ボーナス" },
    { id: "garden", name: "小さな庭", value: 24000, rarity: "N", effect: "住まいの彩り" },
    { id: "license", name: "専門ライセンス", value: 30000, rarity: "R", effect: "職業の証" },
    { id: "art", name: "一点ものの絵", value: 34000, rarity: "R", effect: "創作の記念" },
    { id: "drone", name: "空撮ドローン", value: 36000, rarity: "R", effect: "旅の味方" },
    { id: "studio", name: "ミニ配信スタジオ", value: 42000, rarity: "R", effect: "人気の源" },
    { id: "prototype", name: "発明プロトタイプ", value: 52000, rarity: "SR", effect: "未来の種" },
    { id: "heirloom", name: "思い出の時計", value: 58000, rarity: "SR", effect: "長く残る宝物" },
    { id: "solar", name: "自家発電キット", value: 62000, rarity: "SR", effect: "住まいの資産" },
    { id: "medal", name: "地域貢献メダル", value: 68000, rarity: "SR", effect: "名声ボーナス" }
  ];

  const HOMES = [
    { id: "studio-flat", name: "駅近ワンルーム", price: 35000, value: 45000 },
    { id: "green-house", name: "庭つきの家", price: 72000, value: 93000 },
    { id: "atelier", name: "アトリエ住宅", price: 98000, value: 132000 },
    { id: "smart-home", name: "スマートハウス", price: 138000, value: 188000 }
  ];

  const EVENTS = [
    { title: "臨時の仕事", text: "急ぎの依頼をうまく片付けた。", effects: [{ kind: "cash", amount: 12000 }] },
    { title: "資料の差し戻し", text: "大事な資料を作り直すことに。", effects: [{ kind: "charge", amount: 9000, category: "life" }] },
    { title: "フリーマーケット", text: "眠っていた品が思ったより高く売れた。", effects: [{ kind: "cash", amount: 8000 }] },
    { title: "オンライン講座", text: "学び直しで自信がついた。", effects: [{ kind: "cash", amount: -6000 }, { kind: "rankHint" }] },
    { title: "地域の手伝い", text: "手伝いのお礼を受け取った。", effects: [{ kind: "cash", amount: 7000 }] },
    { title: "スマホ破損", text: "移動中にスマホを落としてしまった。", effects: [{ kind: "charge", amount: 13000, category: "travel" }] },
    { title: "庭の収穫", text: "小さな畑が大豊作。", effects: [{ kind: "cash", amount: 9000 }] },
    { title: "節約成功", text: "固定費の見直しで余裕が出た。", effects: [{ kind: "cash", amount: 11000 }] },
    { title: "家電トラブル", text: "急な修理費が必要になった。", effects: [{ kind: "charge", amount: 15000, category: "home" }] },
    { title: "アイデア採用", text: "提案が採用されてボーナス。", effects: [{ kind: "cash", amount: 18000 }] },
    { title: "旅の思い出", text: "忘れられない品を手に入れた。", effects: [{ kind: "treasure" }] },
    { title: "株価ニュース", text: "市場全体が少し盛り上がった。", effects: [{ kind: "stock", amount: 10000 }] },
    { title: "景気後退", text: "株価が下がった。", effects: [{ kind: "stock", amount: -10000 }] },
    { title: "お祝い", text: "友人から思わぬお祝いが届いた。", effects: [{ kind: "cash", amount: 10000 }] },
    { title: "健康診断", text: "早めの対策で大きな出費を防いだ。", effects: [{ kind: "charge", amount: 7000, category: "life" }] },
    { title: "人気上昇", text: "小さな活動が話題になった。", effects: [{ kind: "cash", amount: 16000 }] },
    { title: "資格更新", text: "更新料は痛いが将来につながる。", effects: [{ kind: "charge", amount: 10000, category: "life" }] },
    { title: "抽選会", text: "商店街の抽選で当たり。", effects: [{ kind: "cash", amount: 14000 }] },
    { title: "水回り修理", text: "住まいのメンテナンス費。", effects: [{ kind: "charge", amount: 17000, category: "home" }] },
    { title: "副業ヒット", text: "週末の活動が収益になった。", effects: [{ kind: "cash", amount: 22000 }] },
    { title: "交通遅延", text: "予定変更で余計な出費。", effects: [{ kind: "charge", amount: 8000, category: "travel" }] },
    { title: "コレクターの出会い", text: "価値ある品を譲ってもらった。", effects: [{ kind: "treasure" }] },
    { title: "配当", text: "持っている株の恩恵を受けた。", effects: [{ kind: "stockDividend" }] },
    { title: "大掃除", text: "なくしたと思っていたお金を発見。", effects: [{ kind: "cash", amount: 6000 }] }
  ];

  const ROUTE_POINTS = [
    [9, 18],
    [24, 16],
    [37, 25],
    [51, 17],
    [70, 22],
    [88, 31],
    [78, 45],
    [57, 45],
    [42, 53],
    [20, 48],
    [10, 60],
    [24, 74],
    [43, 70],
    [54, 82],
    [73, 79],
    [87, 88],
    [78, 94],
    [60, 91],
    [48, 80],
    [36, 68],
    [53, 59],
    [70, 62],
    [84, 55],
    [91, 66],
    [82, 77]
  ];

  const TYPE_META = {
    start: { label: "開始", symbol: "S" },
    event: { label: "出来事", symbol: "" },
    income: { label: "収入", symbol: "+" },
    expense: { label: "支出", symbol: "-" },
    payday: { label: "給料", symbol: "給" },
    career: { label: "就職", symbol: "職" },
    rankUp: { label: "昇格", symbol: "↑" },
    careerChange: { label: "転職", symbol: "転" },
    branch: { label: "分岐", symbol: "↔" },
    family: { label: "家族", symbol: "家" },
    home: { label: "住まい", symbol: "住" },
    insurance: { label: "保険", symbol: "保" },
    stock: { label: "株", symbol: "株" },
    treasure: { label: "お宝", symbol: "宝" },
    challenge: { label: "挑戦", symbol: "!" },
    tax: { label: "税", symbol: "税" },
    debt: { label: "返済", symbol: "借" },
    settlement: { label: "決算", symbol: "決" },
    goal: { label: "ゴール", symbol: "G" }
  };

  const SAVE_KEY = "life-road-online-save-v1";
  const app = {
    game: null,
    board: [],
    routePath: "",
    pendingChoice: null,
    movePaydays: new Set(),
    aiTimer: null
  };

  const els = {};

  document.addEventListener("DOMContentLoaded", () => {
    cacheElements();
    populateLobbyControls();
    bindEvents();
    renderLobby();
  });

  function cacheElements() {
    [
      "lobby",
      "gameScreen",
      "playerNameInput",
      "totalPlayersSelect",
      "humanPlayersSelect",
      "gameLengthSelect",
      "startGameButton",
      "loadDemoButton",
      "roomCodeLabel",
      "turnLabel",
      "stockLabel",
      "phaseLabel",
      "fastModeToggle",
      "showResultsButton",
      "restartButton",
      "boardViewport",
      "routeSvg",
      "spacesLayer",
      "tokensLayer",
      "playersList",
      "clearLogButton",
      "eventLog",
      "currentPlayerDot",
      "currentPlayerLabel",
      "currentEventTitle",
      "currentEventText",
      "rouletteWheel",
      "spinValueLabel",
      "spinButton",
      "careerLabel",
      "familyLabel",
      "treasureLabel",
      "debtLabel",
      "choiceModal",
      "choiceTitle",
      "choiceMessage",
      "choiceOptions",
      "resultsModal",
      "resultsTitle",
      "resultsMessage",
      "resultsTable",
      "closeResultsButton",
      "resultsNewGameButton"
    ].forEach((id) => {
      els[id] = document.getElementById(id);
    });
  }

  function populateLobbyControls() {
    for (let i = 1; i <= 7; i += 1) {
      const option = document.createElement("option");
      option.value = String(i);
      option.textContent = `${i}人`;
      if (i === 4) option.selected = true;
      els.totalPlayersSelect.append(option);
    }
    syncHumanOptions();
    els.humanPlayersSelect.value = "1";
  }

  function bindEvents() {
    els.totalPlayersSelect.addEventListener("change", syncHumanOptions);
    els.startGameButton.addEventListener("click", () => {
      startGame({
        totalPlayers: Number(els.totalPlayersSelect.value),
        humanPlayers: Number(els.humanPlayersSelect.value),
        boardLength: Number(els.gameLengthSelect.value)
      });
    });
    els.loadDemoButton.addEventListener("click", handleSecondaryStart);
    els.spinButton.addEventListener("click", spinCurrentPlayer);
    els.fastModeToggle.addEventListener("change", () => {
      if (!app.game) return;
      app.game.fastMode = els.fastModeToggle.checked;
      persistGame();
    });
    els.restartButton.addEventListener("click", confirmRestart);
    els.clearLogButton.addEventListener("click", () => {
      if (!app.game) return;
      app.game.log = app.game.log.slice(0, 3);
      render();
      persistGame();
    });
    els.showResultsButton.addEventListener("click", () => openResults(false));
    els.closeResultsButton.addEventListener("click", closeResults);
    els.resultsNewGameButton.addEventListener("click", () => {
      closeResults();
      resetToLobby();
    });
  }

  function syncHumanOptions() {
    const total = Number(els.totalPlayersSelect.value);
    const current = Number(els.humanPlayersSelect.value || 1);
    els.humanPlayersSelect.innerHTML = "";
    for (let i = 1; i <= total; i += 1) {
      const option = document.createElement("option");
      option.value = String(i);
      option.textContent = `${i}人`;
      els.humanPlayersSelect.append(option);
    }
    els.humanPlayersSelect.value = String(Math.min(current, total));
  }

  function renderLobby() {
    const save = loadSavedGame();
    els.loadDemoButton.textContent = save ? "続きから" : "7人で開始";
    els.loadDemoButton.dataset.mode = save ? "resume" : "demo";
  }

  function handleSecondaryStart() {
    const save = loadSavedGame();
    if (els.loadDemoButton.dataset.mode === "resume" && save) {
      restoreGame(save);
      return;
    }
    els.totalPlayersSelect.value = "7";
    syncHumanOptions();
    els.humanPlayersSelect.value = "1";
    startGame({ totalPlayers: 7, humanPlayers: 1, boardLength: 72 });
  }

  function startGame({ totalPlayers, humanPlayers, boardLength }) {
    window.clearTimeout(app.aiTimer);
    app.board = buildBoard(boardLength);
    app.routePath = makeRoutePath(app.board);
    app.pendingChoice = null;
    app.movePaydays = new Set();

    const firstName = cleanName(els.playerNameInput.value) || "あなた";
    const players = Array.from({ length: totalPlayers }, (_, index) => {
      const isHuman = index < humanPlayers;
      return {
        id: `p${index + 1}`,
        seat: index,
        name: isHuman ? (index === 0 ? firstName : `プレイヤー${index + 1}`) : AI_NAMES[index - humanPlayers] || `AI:${index + 1}`,
        isHuman,
        color: COLORS[index],
        position: 0,
        cash: 20000,
        debt: 0,
        careerId: null,
        careerRank: 0,
        family: { partner: false, children: 0 },
        homeId: null,
        treasures: [],
        stocks: 0,
        insurance: { life: false, home: false, travel: false },
        routeStyle: "balanced",
        routeTurns: 0,
        finished: false,
        finishRank: null
      };
    });

    app.game = {
      roomCode: makeRoomCode(),
      players,
      currentPlayerIndex: 0,
      turn: 1,
      phase: "ready",
      boardLength,
      stockPrice: 10000,
      log: [],
      finishedOrder: [],
      spinValue: null,
      currentTitle: "ゲーム開始",
      currentText: "ルーレットを回してください",
      fastMode: false,
      rngSeed: Date.now() % 2147483647
    };

    addLog("ゲーム開始。Life Notesをいちばん多く残した人の勝ちです。", true);
    els.lobby.classList.add("is-hidden");
    els.gameScreen.classList.remove("is-hidden");
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    els.fastModeToggle.checked = false;
    render();
    persistGame();
    scheduleAI();
  }

  function restoreGame(saved) {
    app.board = buildBoard(saved.boardLength || 72);
    app.routePath = makeRoutePath(app.board);
    app.game = saved;
    app.game.phase = app.game.phase === "gameOver" ? "gameOver" : "ready";
    app.game.currentTitle = app.game.currentTitle || "再開";
    app.game.currentText = app.game.currentText || "ルーレットを回してください";
    app.pendingChoice = null;
    app.movePaydays = new Set();
    els.lobby.classList.add("is-hidden");
    els.gameScreen.classList.remove("is-hidden");
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    els.fastModeToggle.checked = Boolean(app.game.fastMode);
    render();
    scheduleAI();
  }

  function resetToLobby() {
    window.clearTimeout(app.aiTimer);
    localStorage.removeItem(SAVE_KEY);
    app.game = null;
    app.board = [];
    app.pendingChoice = null;
    closeChoice();
    els.gameScreen.classList.add("is-hidden");
    els.lobby.classList.remove("is-hidden");
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    els.loadDemoButton.textContent = "7人で開始";
    els.loadDemoButton.dataset.mode = "demo";
  }

  function confirmRestart() {
    if (!app.game) return;
    if (window.confirm("現在のゲームを終了して新規作成しますか？")) {
      resetToLobby();
    }
  }

  async function spinCurrentPlayer() {
    const game = app.game;
    if (!game || game.phase !== "ready") return;
    const player = currentPlayer();
    if (!player || player.finished) {
      endTurn();
      return;
    }
    if (!player.isHuman && game.phase !== "ready") return;

    game.phase = "moving";
    app.movePaydays = new Set();
    const spin = randomInt(1, 8);
    game.spinValue = spin;
    game.currentTitle = `${player.name}のスピン`;
    game.currentText = `${spin}マス進みます`;
    addLog(`${player.name}は${spin}を出しました。`);
    render();

    els.rouletteWheel.classList.add("spinning");
    await wait(game.fastMode ? 180 : 620);
    els.rouletteWheel.classList.remove("spinning");

    let remaining = spin;
    while (remaining > 0 && !player.finished) {
      const nextPosition = Math.min(player.position + 1, app.board.length - 1);
      player.position = nextPosition;
      const space = app.board[nextPosition];
      if (space.type === "payday" && !app.movePaydays.has(space.index)) {
        app.movePaydays.add(space.index);
        paySalary(player, "給料日");
      }
      render();
      await wait(game.fastMode ? 70 : 210);
      remaining -= 1;
      if (space.type === "goal" || space.stopRequired) break;
    }

    resolveSpace(player, app.board[player.position]);
  }

  function resolveSpace(player, space) {
    if (!app.game || !space) return;
    const meta = TYPE_META[space.type] || TYPE_META.event;
    app.game.currentTitle = `${meta.label}マス`;
    app.game.currentText = `${player.name}が${meta.label}に止まりました`;

    switch (space.type) {
      case "start":
        endTurn();
        break;
      case "goal":
        finishPlayer(player);
        break;
      case "payday":
        if (!app.movePaydays.has(space.index)) paySalary(player, "給料日");
        endTurn();
        break;
      case "income":
        applyCash(player, 10000 + randomInt(0, 8) * 1000, "臨時収入");
        endTurn();
        break;
      case "expense":
        charge(player, 9000 + randomInt(0, 10) * 1000, pick(["life", "home", "travel"]), "急な出費");
        endTurn();
        break;
      case "event":
        resolveRandomEvent(player);
        endTurn();
        break;
      case "career":
        offerCareerChoice(player, false);
        break;
      case "careerChange":
        offerCareerChoice(player, true);
        break;
      case "rankUp":
        resolveRankUp(player);
        endTurn();
        break;
      case "branch":
        offerBranchChoice(player);
        break;
      case "family":
        resolveFamily(player);
        endTurn();
        break;
      case "home":
        offerHomeChoice(player);
        break;
      case "insurance":
        offerInsuranceChoice(player);
        break;
      case "stock":
        offerStockChoice(player);
        break;
      case "treasure":
        addTreasure(player);
        endTurn();
        break;
      case "challenge":
        offerChallenge(player);
        break;
      case "tax":
        resolveTax(player);
        endTurn();
        break;
      case "debt":
      case "settlement":
        offerSettlement(player, space.type === "settlement");
        break;
      default:
        endTurn();
    }
    render();
  }

  function offerCareerChoice(player, isChange) {
    if (!isChange && player.careerId) {
      applyCash(player, 8000, "職業ボーナス");
      endTurn();
      return;
    }

    const choices = pickMany(availableCareers(player), 3);
    const title = isChange && player.careerId ? "転職する？" : "職業を選ぶ";
    const message = isChange && player.careerId
      ? "今の職業を続けるか、新しい仕事へ挑戦できます。"
      : "候補からひとつ選んでください。給料日に収入が入ります。";
    const options = choices.map((career) => ({
      label: career.name,
      detail: `${career.ranks[0]} / 給料 ${formatMoney(career.salaries[0])} / ${career.flavor}`,
      score: career.salaries[0] + career.salaries[1] * 0.35,
      action: () => {
        player.careerId = career.id;
        player.careerRank = 0;
        app.game.currentTitle = career.name;
        app.game.currentText = `${player.name}は${career.name}になりました`;
        addLog(`${player.name}は${career.name}になりました。`, true);
        endTurn();
      }
    }));

    if (isChange && player.careerId) {
      options.push({
        label: "今の職業を続ける",
        detail: "転職せず、5,000Lを受け取ります。",
        score: currentCareer(player).salaries[player.careerRank] + 5000,
        action: () => {
          applyCash(player, 5000, "継続ボーナス");
          endTurn();
        }
      });
    }

    presentChoice(player, title, message, options);
  }

  function resolveRankUp(player) {
    const career = currentCareer(player);
    if (!career) {
      applyCash(player, 7000, "学びの成果");
      return;
    }
    if (player.careerRank >= 1) {
      applyCash(player, 12000, "熟練ボーナス");
      return;
    }
    const roll = randomInt(1, 8);
    const growthBonus = player.routeStyle === "growth" ? 1 : 0;
    const success = career.rankRoll.includes(roll) || career.rankRoll.includes(Math.min(8, roll + growthBonus));
    if (success) {
      player.careerRank = 1;
      app.game.currentTitle = "ランクアップ成功";
      app.game.currentText = `${career.ranks[1]}になりました`;
      addLog(`${player.name}は${career.ranks[1]}へランクアップしました。`, true);
    } else {
      applyCash(player, 6000, "挑戦手当");
      app.game.currentTitle = "ランクアップならず";
      app.game.currentText = `出目${roll}。次のチャンスを待ちましょう`;
    }
  }

  function offerBranchChoice(player) {
    presentChoice(player, "ルートを選ぶ", "数ターンだけイベント傾向が変わります。", [
      {
        label: "安定ロード",
        detail: "5ターンのあいだ支出が3,000L軽くなります。",
        score: 45,
        action: () => setRouteStyle(player, "stable", "安定ロード")
      },
      {
        label: "冒険ロード",
        detail: "チャレンジ成功時の賞金が15,000L増えます。",
        score: player.cash > 30000 ? 54 : 35,
        action: () => setRouteStyle(player, "bold", "冒険ロード")
      },
      {
        label: "成長ロード",
        detail: "ランクアップ判定が少し有利になります。",
        score: currentCareer(player) && player.careerRank === 0 ? 60 : 42,
        action: () => setRouteStyle(player, "growth", "成長ロード")
      }
    ]);
  }

  function setRouteStyle(player, style, label) {
    player.routeStyle = style;
    player.routeTurns = 5;
    addLog(`${player.name}は${label}へ進みました。`, true);
    app.game.currentTitle = label;
    app.game.currentText = "しばらく特別効果が続きます";
    endTurn();
  }

  function resolveFamily(player) {
    if (!player.family.partner) {
      player.family.partner = true;
      applyCash(player, 18000, "パートナー祝い");
      app.game.currentTitle = "パートナー";
      app.game.currentText = "家族が増えました";
      addLog(`${player.name}にパートナーができました。`, true);
      return;
    }
    player.family.children += 1;
    applyCash(player, 12000, "家族祝い");
    app.game.currentTitle = "家族が増えた";
    app.game.currentText = `子どもが${player.family.children}人になりました`;
    addLog(`${player.name}の家族が増えました。`, true);
  }

  function offerHomeChoice(player) {
    const options = HOMES.map((home) => {
      const owned = currentHome(player);
      const sale = owned ? Math.floor(owned.value * 0.65) : 0;
      const netPrice = Math.max(0, home.price - sale);
      return {
        label: owned ? `${home.name}へ住み替え` : home.name,
        detail: `支払い ${formatMoney(netPrice)} / 最終価値 ${formatMoney(home.value)}`,
        score: home.value - netPrice + (player.insurance.home ? 5000 : 0),
        action: () => {
          if (owned) applyCash(player, sale, `${owned.name}の売却`);
          spend(player, home.price, `${home.name}を購入`);
          player.homeId = home.id;
          app.game.currentTitle = home.name;
          app.game.currentText = "住まいを手に入れました";
          addLog(`${player.name}は${home.name}を購入しました。`, true);
          endTurn();
        }
      };
    });
    options.push({
      label: "今回は買わない",
      detail: "5,000Lを受け取って次へ進みます。",
      score: player.homeId ? 35 : 15,
      action: () => {
        applyCash(player, 5000, "見学ボーナス");
        endTurn();
      }
    });
    presentChoice(player, "住まいを選ぶ", "家は最終決算で資産になります。", options);
  }

  function offerInsuranceChoice(player) {
    const plans = [
      { key: "life", name: "生活保険", price: 8000, detail: "生活・健康系の支出を70%軽減" },
      { key: "home", name: "住まい保険", price: 9000, detail: "家や修理系の支出を70%軽減" },
      { key: "travel", name: "移動保険", price: 7000, detail: "旅行・移動系の支出を70%軽減" }
    ];
    const options = plans
      .filter((plan) => !player.insurance[plan.key])
      .map((plan) => ({
        label: `${plan.name}に入る`,
        detail: `${formatMoney(plan.price)} / ${plan.detail}`,
        score: player.cash > plan.price + 12000 ? 45 : 20,
        action: () => {
          spend(player, plan.price, `${plan.name}に加入`);
          player.insurance[plan.key] = true;
          addLog(`${player.name}は${plan.name}に入りました。`, true);
          endTurn();
        }
      }));
    options.push({
      label: "加入しない",
      detail: "今回は見送ります。",
      score: player.cash < 25000 ? 50 : 16,
      action: () => {
        applyCash(player, 3000, "保険相談のお礼");
        endTurn();
      }
    });
    presentChoice(player, "保険を選ぶ", "保険は対応する支出を軽くします。", options);
  }

  function offerStockChoice(player) {
    const price = app.game.stockPrice;
    const options = [];
    if (player.stocks < 3) {
      options.push({
        label: "株を1枚買う",
        detail: `現在価格 ${formatMoney(price)} / 最大3枚まで`,
        score: player.cash > price + 15000 ? 52 : 18,
        action: () => {
          spend(player, price, "株を購入");
          player.stocks += 1;
          addLog(`${player.name}は株を1枚買いました。`, true);
          endTurn();
        }
      });
    }
    if (player.stocks > 0) {
      options.push({
        label: "株を1枚売る",
        detail: `${formatMoney(price)}を受け取ります。`,
        score: price >= 30000 || player.debt > 0 ? 60 : 22,
        action: () => {
          player.stocks -= 1;
          applyCash(player, price, "株を売却");
          endTurn();
        }
      });
    }
    options.push({
      label: "何もしない",
      detail: "市場を見送ります。",
      score: 24,
      action: () => {
        const delta = pick([-10000, 0, 10000, 10000]);
        adjustStock(delta);
        endTurn();
      }
    });
    presentChoice(player, "株式マーケット", "株はゴール時に現在価格で資産になります。", options);
  }

  function offerChallenge(player) {
    presentChoice(player, "チャレンジ", "大きく狙うか、堅く受け取るか選べます。", [
      {
        label: "安全に受け取る",
        detail: "12,000Lを受け取ります。",
        score: 38,
        action: () => {
          applyCash(player, 12000, "安全ボーナス");
          endTurn();
        }
      },
      {
        label: "大勝負する",
        detail: "出目5以上で高額賞金、4以下で支出。",
        score: player.routeStyle === "bold" ? 72 : 44,
        action: () => {
          const roll = randomInt(1, 8);
          if (roll >= 5) {
            const reward = 42000 + (player.routeStyle === "bold" ? 15000 : 0);
            applyCash(player, reward, "チャレンジ成功");
            addLog(`${player.name}は出目${roll}でチャレンジ成功。`, true);
          } else {
            charge(player, 16000, "life", "チャレンジ失敗");
            addLog(`${player.name}は出目${roll}でチャレンジ失敗。`);
          }
          endTurn();
        }
      }
    ]);
  }

  function offerSettlement(player, isBigSettlement) {
    const maxRepay = Math.min(player.debt, Math.floor(player.cash / 25000) * 25000);
    const options = [];
    if (maxRepay > 0) {
      options.push({
        label: "借金を返す",
        detail: `${formatMoney(maxRepay)}返済できます。`,
        score: 70,
        action: () => {
          player.cash -= maxRepay;
          player.debt -= maxRepay;
          addLog(`${player.name}は借金を${formatMoney(maxRepay)}返済しました。`, true);
          if (isBigSettlement) applyCash(player, 10000, "決算通過ボーナス");
          endTurn();
        }
      });
    }
    options.push({
      label: "このまま進む",
      detail: isBigSettlement ? "決算通過ボーナス10,000Lを受け取ります。" : "返済せず次へ進みます。",
      score: maxRepay > 0 ? 15 : 40,
      action: () => {
        if (isBigSettlement) applyCash(player, 10000, "決算通過ボーナス");
        endTurn();
      }
    });
    presentChoice(player, isBigSettlement ? "中間決算" : "返済タイミング", "資産を整理できます。", options);
  }

  function resolveRandomEvent(player) {
    const event = pick(EVENTS);
    app.game.currentTitle = event.title;
    app.game.currentText = event.text;
    addLog(`${player.name}: ${event.title}。${event.text}`);
    event.effects.forEach((effect) => applyEffect(player, effect));
  }

  function applyEffect(player, effect) {
    switch (effect.kind) {
      case "cash":
        if (effect.amount >= 0) applyCash(player, effect.amount, "イベント");
        else charge(player, Math.abs(effect.amount), effect.category || "life", "イベント支出");
        break;
      case "charge":
        charge(player, effect.amount, effect.category, "イベント支出");
        break;
      case "treasure":
        addTreasure(player);
        break;
      case "stock":
        adjustStock(effect.amount);
        break;
      case "stockDividend":
        if (player.stocks > 0) applyCash(player, player.stocks * 6000, "株の配当");
        else applyCash(player, 4000, "市場見学");
        break;
      case "rankHint":
        if (currentCareer(player) && player.careerRank === 0 && randomInt(1, 8) >= 7) {
          player.careerRank = 1;
          addLog(`${player.name}は学びを活かしてランクアップしました。`, true);
        }
        break;
      default:
        break;
    }
  }

  function resolveTax(player) {
    const amount = Math.max(5000, Math.floor(Math.max(0, player.cash) * 0.12 / 1000) * 1000);
    charge(player, amount, null, "税金");
  }

  function finishPlayer(player) {
    if (player.finished) return;
    const rank = app.game.finishedOrder.length + 1;
    const bonuses = [100000, 60000, 40000, 20000, 10000, 0, 0];
    const bonus = bonuses[rank - 1] || 0;
    player.finished = true;
    player.finishRank = rank;
    player.position = app.board.length - 1;
    app.game.finishedOrder.push(player.id);
    if (bonus > 0) applyCash(player, bonus, `${rank}位ゴール賞金`);
    app.game.currentTitle = `${rank}位でゴール`;
    app.game.currentText = `${player.name}がゴールしました`;
    addLog(`${player.name}が${rank}位でゴールしました。`, true);
    endTurn();
  }

  function endTurn() {
    const game = app.game;
    if (!game) return;

    currentPlayer()?.routeTurns && decrementRoute(currentPlayer());
    ensureSolvent(currentPlayer());

    if (game.players.every((player) => player.finished)) {
      game.phase = "gameOver";
      game.currentTitle = "ゲーム終了";
      game.currentText = "最終決算が完了しました";
      addLog("全員がゴールしました。最終決算です。", true);
      render();
      persistGame();
      openResults(true);
      return;
    }

    let guard = 0;
    do {
      game.currentPlayerIndex = (game.currentPlayerIndex + 1) % game.players.length;
      if (game.currentPlayerIndex === 0) game.turn += 1;
      guard += 1;
    } while (game.players[game.currentPlayerIndex].finished && guard < game.players.length + 1);

    game.phase = "ready";
    game.spinValue = null;
    const next = currentPlayer();
    game.currentTitle = `${next.name}の番`;
    game.currentText = next.isHuman ? "ルーレットを回してください" : "AIが考えています";
    render();
    persistGame();
    scheduleAI();
  }

  function decrementRoute(player) {
    player.routeTurns = Math.max(0, player.routeTurns - 1);
    if (player.routeTurns === 0) player.routeStyle = "balanced";
  }

  function presentChoice(player, title, message, options) {
    app.game.phase = "choice";
    app.pendingChoice = { playerId: player.id, title, message, options };
    app.game.currentTitle = title;
    app.game.currentText = message;
    renderChoice();
    render();

    if (!player.isHuman) {
      const best = options
        .map((option, index) => ({ option, index, score: option.score ?? 0 }))
        .sort((a, b) => b.score - a.score)[0];
      app.aiTimer = window.setTimeout(() => chooseOption(best.index), app.game.fastMode ? 180 : 650);
    }
  }

  function chooseOption(index) {
    const choice = app.pendingChoice;
    if (!choice) return;
    const option = choice.options[index];
    if (!option) return;
    const player = app.game.players.find((item) => item.id === choice.playerId);
    if (player && !player.isHuman) addLog(`${player.name}は「${option.label}」を選びました。`);
    app.pendingChoice = null;
    closeChoice();
    option.action();
    render();
  }

  function renderChoice() {
    const choice = app.pendingChoice;
    if (!choice) {
      closeChoice();
      return;
    }
    const player = app.game.players.find((item) => item.id === choice.playerId);
    if (!player || !player.isHuman) {
      els.choiceModal.classList.add("is-hidden");
      return;
    }
    els.choiceTitle.textContent = choice.title;
    els.choiceMessage.textContent = choice.message;
    els.choiceOptions.innerHTML = "";
    choice.options.forEach((option, index) => {
      const button = document.createElement("button");
      button.className = "choice-option";
      button.type = "button";
      button.innerHTML = `<strong>${escapeHtml(option.label)}</strong><span>${escapeHtml(option.detail || "")}</span>`;
      button.addEventListener("click", () => chooseOption(index));
      els.choiceOptions.append(button);
    });
    els.choiceModal.classList.remove("is-hidden");
  }

  function closeChoice() {
    els.choiceModal.classList.add("is-hidden");
    els.choiceOptions.innerHTML = "";
  }

  function scheduleAI() {
    window.clearTimeout(app.aiTimer);
    const game = app.game;
    if (!game || game.phase !== "ready") return;
    const player = currentPlayer();
    if (!player || player.isHuman || player.finished) return;
    app.aiTimer = window.setTimeout(spinCurrentPlayer, game.fastMode ? 260 : 900);
  }

  function render() {
    const game = app.game;
    if (!game) return;
    els.roomCodeLabel.textContent = game.roomCode;
    els.turnLabel.textContent = String(game.turn);
    els.stockLabel.textContent = formatMoney(game.stockPrice);
    els.phaseLabel.textContent = phaseText(game.phase);
    els.spinValueLabel.textContent = game.spinValue ? String(game.spinValue) : "?";
    renderBoard();
    renderPlayers();
    renderActionBar();
    renderLog();
    renderChoice();
  }

  function renderBoard() {
    els.routeSvg.innerHTML = `<polyline class="route-line" points="${app.routePath}"></polyline>`;
    els.spacesLayer.innerHTML = "";
    app.board.forEach((space) => {
      const div = document.createElement("div");
      div.className = `space ${space.type}${space.stopRequired ? " stop" : ""}`;
      div.style.left = `${space.x}%`;
      div.style.top = `${space.y}%`;
      div.title = `${space.index + 1}: ${TYPE_META[space.type].label}`;
      div.textContent = TYPE_META[space.type].symbol;
      els.spacesLayer.append(div);
    });

    els.tokensLayer.innerHTML = "";
    const groups = new Map();
    app.game.players.forEach((player) => {
      const list = groups.get(player.position) || [];
      list.push(player);
      groups.set(player.position, list);
    });
    groups.forEach((players, position) => {
      const space = app.board[position] || app.board[0];
      players.forEach((player, groupIndex) => {
        const token = document.createElement("div");
        const angle = (Math.PI * 2 * groupIndex) / Math.max(players.length, 1);
        const distance = players.length > 1 ? 2.2 : 0;
        token.className = `token${player.id === currentPlayer()?.id ? " current" : ""}`;
        token.style.background = player.color;
        token.style.left = `calc(${space.x}% + ${Math.cos(angle) * distance}vw)`;
        token.style.top = `calc(${space.y}% + ${Math.sin(angle) * distance}vw)`;
        token.textContent = String(player.seat + 1);
        token.title = player.name;
        els.tokensLayer.append(token);
      });
    });
  }

  function renderPlayers() {
    const ranked = [...app.game.players].sort((a, b) => finalWorth(b) - finalWorth(a));
    els.playersList.innerHTML = "";
    ranked.forEach((player, index) => {
      const card = document.createElement("article");
      card.className = `player-card${player.id === currentPlayer()?.id ? " current" : ""}${player.finished ? " finished" : ""}`;
      const career = currentCareer(player);
      card.innerHTML = `
        <div class="rank-badge" style="background:${player.color}">${index + 1}</div>
        <div class="player-main">
          <div class="player-name-row">
            <strong>${escapeHtml(player.name)}</strong>
            <span>${player.isHuman ? "HUMAN" : "AI"}</span>
          </div>
          <div class="player-money-row">
            <strong>${formatMoney(finalWorth(player))}</strong>
            <span>現金 ${formatMoney(player.cash)}</span>
          </div>
          <div class="player-meta">
            <span>${escapeHtml(career ? career.name : "未就職")}</span>
            <span>株${player.stocks}</span>
            <span>宝${player.treasures.length}</span>
            <span>${player.finished ? `${player.finishRank}位ゴール` : `${player.position + 1}/${app.board.length}`}</span>
          </div>
        </div>
      `;
      els.playersList.append(card);
    });
  }

  function renderActionBar() {
    const player = currentPlayer();
    if (!player) return;
    const career = currentCareer(player);
    els.currentPlayerDot.style.background = player.color;
    els.currentPlayerLabel.textContent = `${player.name}の番`;
    els.currentEventTitle.textContent = app.game.currentTitle;
    els.currentEventText.textContent = app.game.currentText;
    els.careerLabel.textContent = career ? `${career.name} ${career.ranks[player.careerRank]}` : "未定";
    els.familyLabel.textContent = String((player.family.partner ? 1 : 0) + player.family.children);
    els.treasureLabel.textContent = String(player.treasures.length);
    els.debtLabel.textContent = formatMoney(player.debt);
    const canSpin = app.game.phase === "ready" && player.isHuman && !player.finished;
    els.spinButton.disabled = !canSpin;
    els.spinButton.textContent = app.game.phase === "moving" ? "移動中" : player.isHuman ? "スピン" : "AI中";
  }

  function renderLog() {
    els.eventLog.innerHTML = "";
    app.game.log.slice(0, 80).forEach((entry) => {
      const div = document.createElement("div");
      div.className = `log-entry${entry.important ? " important" : ""}`;
      div.textContent = entry.text;
      els.eventLog.append(div);
    });
  }

  function openResults(forceGameOver) {
    if (!app.game) return;
    const standings = [...app.game.players].sort((a, b) => finalWorth(b) - finalWorth(a));
    els.resultsTitle.textContent = app.game.phase === "gameOver" || forceGameOver ? "最終結果" : "現在の成績";
    els.resultsMessage.textContent = app.game.phase === "gameOver"
      ? `${standings[0].name}が優勝しました。`
      : "いまの資産見込みです。";
    els.resultsTable.innerHTML = "";
    standings.forEach((player, index) => {
      const breakdown = worthBreakdown(player);
      const row = document.createElement("div");
      row.className = `result-row${index === 0 ? " winner" : ""}`;
      row.innerHTML = `
        <div class="rank-badge" style="background:${player.color}">${index + 1}</div>
        <div>
          <strong>${escapeHtml(player.name)}</strong>
          <div class="result-breakdown">${escapeHtml(breakdown.text)}</div>
        </div>
        <div class="result-total">${formatMoney(breakdown.total)}</div>
      `;
      els.resultsTable.append(row);
    });
    els.resultsModal.classList.remove("is-hidden");
  }

  function closeResults() {
    els.resultsModal.classList.add("is-hidden");
  }

  function buildBoard(length) {
    const coords = sampleRoute(ROUTE_POINTS, length);
    const specials = specialIndices(length);
    return coords.map((coord, index) => {
      const special = specials[index];
      const type = special || patternedType(index);
      return {
        index,
        id: `s${String(index).padStart(3, "0")}`,
        type,
        label: TYPE_META[type].label,
        x: coord.x,
        y: coord.y,
        stopRequired: ["career", "branch", "settlement", "goal"].includes(type)
      };
    });
  }

  function specialIndices(length) {
    const map = {};
    const set = (ratio, type) => {
      map[Math.max(1, Math.min(length - 2, Math.round((length - 1) * ratio)))] = type;
    };
    map[0] = "start";
    map[length - 1] = "goal";
    set(0.11, "career");
    set(0.24, "branch");
    set(0.35, "settlement");
    set(0.48, "home");
    set(0.58, "careerChange");
    set(0.68, "branch");
    set(0.79, "settlement");
    set(0.88, "rankUp");
    return map;
  }

  function patternedType(index) {
    const pattern = [
      "event",
      "income",
      "expense",
      "treasure",
      "event",
      "payday",
      "stock",
      "event",
      "insurance",
      "family",
      "event",
      "challenge",
      "home",
      "tax",
      "event",
      "rankUp",
      "debt",
      "careerChange"
    ];
    return pattern[index % pattern.length];
  }

  function sampleRoute(points, count) {
    const distances = [];
    let total = 0;
    for (let i = 0; i < points.length - 1; i += 1) {
      const [x1, y1] = points[i];
      const [x2, y2] = points[i + 1];
      const distance = Math.hypot(x2 - x1, y2 - y1);
      distances.push(distance);
      total += distance;
    }
    return Array.from({ length: count }, (_, index) => {
      const target = (index / (count - 1)) * total;
      let walked = 0;
      for (let segment = 0; segment < distances.length; segment += 1) {
        const distance = distances[segment];
        if (walked + distance >= target || segment === distances.length - 1) {
          const local = distance === 0 ? 0 : (target - walked) / distance;
          const [x1, y1] = points[segment];
          const [x2, y2] = points[segment + 1];
          return {
            x: x1 + (x2 - x1) * local,
            y: y1 + (y2 - y1) * local
          };
        }
        walked += distance;
      }
      const [x, y] = points[points.length - 1];
      return { x, y };
    });
  }

  function makeRoutePath(board) {
    return board.map((space) => `${space.x.toFixed(2)},${space.y.toFixed(2)}`).join(" ");
  }

  function applyCash(player, amount, reason) {
    player.cash += amount;
    if (amount !== 0) addLog(`${player.name}: ${reason} ${amount > 0 ? "+" : ""}${formatMoney(amount)}`);
    ensureSolvent(player);
  }

  function spend(player, amount, reason) {
    player.cash -= amount;
    addLog(`${player.name}: ${reason} -${formatMoney(amount)}`);
    ensureSolvent(player);
  }

  function charge(player, amount, category, reason) {
    let finalAmount = amount;
    if (category && player.insurance[category]) {
      finalAmount = Math.ceil(amount * 0.3 / 1000) * 1000;
      addLog(`${player.name}: 保険で${formatMoney(amount - finalAmount)}軽減。`, true);
    }
    if (player.routeStyle === "stable") {
      const reduction = Math.min(3000, finalAmount);
      finalAmount -= reduction;
      if (reduction > 0) addLog(`${player.name}: 安定ロードで${formatMoney(reduction)}軽減。`);
    }
    player.cash -= finalAmount;
    addLog(`${player.name}: ${reason} -${formatMoney(finalAmount)}`);
    ensureSolvent(player);
  }

  function ensureSolvent(player) {
    if (!player || player.cash >= 0) return;
    const units = Math.ceil(Math.abs(player.cash) / 20000);
    player.cash += units * 20000;
    player.debt += units * 25000;
    addLog(`${player.name}は${formatMoney(units * 20000)}借り、返済額が${formatMoney(units * 25000)}増えました。`, true);
  }

  function paySalary(player, reason) {
    const career = currentCareer(player);
    const salary = career ? career.salaries[player.careerRank] : 12000;
    applyCash(player, salary, career ? `${reason} ${career.name}` : `${reason} アルバイト`);
  }

  function addTreasure(player) {
    const owned = new Set(player.treasures);
    const candidates = TREASURES.filter((treasure) => !owned.has(treasure.id));
    const treasure = candidates.length ? pick(candidates) : pick(TREASURES);
    player.treasures.push(treasure.id);
    app.game.currentTitle = treasure.name;
    app.game.currentText = `${formatMoney(treasure.value)}相当のお宝です`;
    addLog(`${player.name}はお宝「${treasure.name}」を手に入れました。`, true);
  }

  function adjustStock(amount) {
    app.game.stockPrice = Math.max(0, Math.min(60000, app.game.stockPrice + amount));
    if (amount > 0) addLog(`株価が${formatMoney(amount)}上がりました。現在${formatMoney(app.game.stockPrice)}。`, true);
    else if (amount < 0) addLog(`株価が${formatMoney(Math.abs(amount))}下がりました。現在${formatMoney(app.game.stockPrice)}。`);
    else addLog(`株価は変わりません。現在${formatMoney(app.game.stockPrice)}。`);
  }

  function currentPlayer() {
    return app.game?.players[app.game.currentPlayerIndex] || null;
  }

  function currentCareer(player) {
    if (!player?.careerId) return null;
    return CAREERS.find((career) => career.id === player.careerId) || null;
  }

  function currentHome(player) {
    if (!player?.homeId) return null;
    return HOMES.find((home) => home.id === player.homeId) || null;
  }

  function availableCareers(player) {
    const occupied = new Set(app.game.players.filter((item) => item.id !== player.id).map((item) => item.careerId).filter(Boolean));
    const list = CAREERS.filter((career) => !occupied.has(career.id));
    return list.length >= 3 ? list : CAREERS;
  }

  function finalWorth(player) {
    return worthBreakdown(player).total;
  }

  function worthBreakdown(player) {
    const home = currentHome(player);
    const homeValue = home ? home.value : 0;
    const treasureValue = player.treasures.reduce((sum, id) => {
      const treasure = TREASURES.find((item) => item.id === id);
      return sum + (treasure?.value || 0);
    }, 0);
    const stockValue = player.stocks * app.game.stockPrice;
    const insuranceValue = Object.values(player.insurance).filter(Boolean).length * 5000;
    const familyValue = (player.family.partner ? 10000 : 0) + player.family.children * 6000;
    const total = player.cash + homeValue + treasureValue + stockValue + insuranceValue + familyValue - player.debt;
    return {
      total,
      text: `現金${formatMoney(player.cash)} / 家${formatMoney(homeValue)} / 宝${formatMoney(treasureValue)} / 株${formatMoney(stockValue)} / 家族${formatMoney(familyValue)} / 借金-${formatMoney(player.debt)}`
    };
  }

  function addLog(text, important = false) {
    if (!app.game) return;
    app.game.log.unshift({ text, important, time: Date.now() });
    app.game.log = app.game.log.slice(0, 120);
  }

  function persistGame() {
    if (!app.game || app.pendingChoice) return;
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(app.game));
    } catch {
      // Local storage can be unavailable in private modes.
    }
  }

  function loadSavedGame() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  function randomInt(min, max) {
    const game = app.game;
    if (!game) return Math.floor(Math.random() * (max - min + 1)) + min;
    game.rngSeed = (game.rngSeed * 48271) % 2147483647;
    const value = game.rngSeed / 2147483647;
    return Math.floor(value * (max - min + 1)) + min;
  }

  function pick(list) {
    return list[randomInt(0, list.length - 1)];
  }

  function pickMany(list, count) {
    const pool = [...list];
    const result = [];
    while (pool.length && result.length < count) {
      const index = randomInt(0, pool.length - 1);
      result.push(pool.splice(index, 1)[0]);
    }
    return result;
  }

  function wait(ms) {
    return new Promise((resolve) => window.setTimeout(resolve, ms));
  }

  function formatMoney(value) {
    const abs = Math.abs(Math.round(value));
    const sign = value < 0 ? "-" : "";
    return `${sign}${abs.toLocaleString("ja-JP")}L`;
  }

  function cleanName(value) {
    return String(value || "").trim().replace(/\s+/g, " ").slice(0, 12);
  }

  function makeRoomCode() {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "";
    for (let i = 0; i < 5; i += 1) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
  }

  function phaseText(phase) {
    return {
      ready: "入力待ち",
      moving: "移動中",
      choice: "選択中",
      gameOver: "終了"
    }[phase] || "進行中";
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }
})();
