(() => {
  "use strict";

  const $ = (selector) => document.querySelector(selector);

  const elements = {
    introScreen: $("#introScreen"),
    gameScreen: $("#gameScreen"),
    startButton: $("#startButton"),
    weekLabel: $("#weekLabel"),
    weekTitle: $("#weekTitle"),
    weekProgressText: $("#weekProgressText"),
    weekDots: $("#weekDots"),
    weekProgressBar: $("#weekProgressBar"),
    levelEyebrow: $("#levelEyebrow"),
    levelHeading: $("#levelHeading"),
    levelDescription: $("#levelDescription"),
    hintButton: $("#hintButton"),
    fullResetButton: $("#fullResetButton"),
    bodyAvatar: $(".body-avatar"),
    avatarEmoji: $(".avatar-emoji"),
    weightValue: $("#weightValue"),
    waistValue: $("#waistValue"),
    fullnessValue: $("#fullnessValue"),
    completedValue: $("#completedValue"),
    bodyMeterLabel: $("#bodyMeterLabel"),
    bodyMeter: $("#bodyMeter"),
    bodyQuote: $("#bodyQuote"),
    boardTitle: $("#boardTitle"),
    currentSignal: $("#currentSignal"),
    boardInstruction: $("#boardInstruction"),
    boardWrap: $("#boardWrap"),
    pathLayer: $("#pathLayer"),
    boardGrid: $("#boardGrid"),
    invalidFlash: $("#invalidFlash"),
    undoButton: $("#undoButton"),
    resetRouteButton: $("#resetRouteButton"),
    routeStateChip: $("#routeStateChip"),
    routeStatusMessage: $("#routeStatusMessage"),
    calorieCount: $("#calorieCount"),
    calorieTarget: $("#calorieTarget"),
    stepCount: $("#stepCount"),
    stepTarget: $("#stepTarget"),
    dietCount: $("#dietCount"),
    calorieCondition: $("#calorieCondition"),
    stepCondition: $("#stepCondition"),
    dietCondition: $("#dietCondition"),
    logCount: $("#logCount"),
    activityLog: $("#activityLog"),
    feedbackModal: $("#feedbackModal"),
    feedbackCard: $("#feedbackCard"),
    feedbackIcon: $("#feedbackIcon"),
    feedbackKicker: $("#feedbackKicker"),
    feedbackTitle: $("#feedbackTitle"),
    feedbackBody: $("#feedbackBody"),
    feedbackStats: $("#feedbackStats"),
    feedbackDelta: $("#feedbackDelta"),
    feedbackAction: $("#feedbackAction"),
    feedbackSecondary: $("#feedbackSecondary"),
    toast: $("#toast"),
  };

  const FOOD_DECK = [
    { icon: "🍩", label: "とろけるドーナツ" },
    { icon: "🍟", label: "深夜ポテト" },
    { icon: "🍔", label: "ごほうびバーガー" },
    { icon: "🍰", label: "放課後ケーキ" },
    { icon: "🍕", label: "とろとろピザ" },
    { icon: "🍫", label: "ひとかけチョコ" },
    { icon: "🧋", label: "甘いミルクティー" },
    { icon: "🍜", label: "夜更けのラーメン" },
  ];

  const DIET_DECK = [
    { icon: "🥗", label: "サラダの理性" },
    { icon: "🏋️", label: "運動の気配" },
    { icon: "🥦", label: "野菜の記憶" },
    { icon: "🚶", label: "散歩の提案" },
  ];

  const BODY_QUOTES = [
    "「まだ、何も決まっていない。」",
    "「少しだけなら……もう少しだけ。」",
    "「この甘さ、脳の奥まで届いてる。」",
    "「食べたい気持ちが、考えるより先に来る。」",
    "「いつもの道が、少しだけ広くなった。」",
    "「満腹なのに、次の誘惑が見えている。」",
    "「体の中心に、甘い重さが定着してきた。」",
    "「もう理性より、誘惑のほうが近い。」",
    "「どこへ行っても、食べ物の回路が光る。」",
    "「10週間目。脳内の道は、すっかり甘く太い。」",
    ];

  const LEVEL_CONFIGS = [
    {
      week: 1,
      eyebrow: "FIRST SIGNAL",
      title: "はじめての空腹",
      boardTitle: "夕方の空腹をつなぐ",
      description: "夕方の脳の奥で、小さな空腹が鳴った。右上の近道は、すでに甘い匂いに染まっている。",
      startText: "空腹信号が点灯。まずは近くの甘いノードへ。",
      successText: "最初の誘惑が、食欲中枢まできれいにつながった。",
      size: 4,
      safeRoute: [[0, 0], [0, 1], [0, 2], [1, 2], [2, 2], [3, 2], [3, 3], [2, 3], [1, 3]],
      calories: [[0, 1], [0, 2], [1, 2], [3, 2], [3, 3], [2, 3]],
      diets: [[0, 3], [1, 1], [2, 1]],
      blocked: [[1, 0], [2, 0], [3, 0]],
      targetCalories: 4,
      minSteps: 8,
    },
    {
      week: 2,
      eyebrow: "SECOND BITE",
      title: "朝食の『ちょっとだけ』",
      boardTitle: "ちょっとだけを重ねる",
      description: "朝食の一口が、昼までの回路を作る。真っ直ぐ右へ行くと、運動の気配が待っている。",
      startText: "朝食の『ちょっとだけ』が、シナプスに残った。",
      successText: "小さな一口を重ねて、朝から食欲中枢を満たした。",
      size: 4,
      safeRoute: [[3, 0], [3, 1], [3, 2], [2, 2], [2, 1], [1, 1], [1, 0], [0, 0], [0, 1], [0, 2], [0, 3]],
      calories: [[3, 1], [2, 2], [2, 1], [1, 1], [0, 0], [0, 1], [0, 2]],
      diets: [[3, 3], [2, 3], [1, 3], [2, 0]],
      blocked: [[1, 2]],
      targetCalories: 5,
      minSteps: 10,
    },
    {
      week: 3,
      eyebrow: "WEEKEND LOOP",
      title: "休日の寄り道",
      boardTitle: "まっすぐ帰らない",
      description: "予定のない休日は、寄り道が増える。中央を横切るより、外周を回るほうが誘惑を拾える。",
      startText: "休日モード。脳が『少し遠くてもいい』とささやいた。",
      successText: "寄り道が積み重なり、休日の満腹回路が完成した。",
      size: 5,
      safeRoute: [[0, 0], [0, 1], [0, 2], [1, 2], [1, 1], [1, 0], [2, 0], [3, 0], [3, 1], [3, 2], [2, 2], [2, 3], [2, 4], [3, 4], [4, 4]],
      calories: [[0, 1], [0, 2], [1, 2], [1, 0], [2, 0], [3, 1], [3, 2], [2, 3]],
      diets: [[0, 3], [1, 3], [2, 1], [3, 3], [4, 3]],
      blocked: [[4, 0], [4, 1], [4, 2], [1, 4]],
      targetCalories: 6,
      minSteps: 12,
    },
    {
      week: 4,
      eyebrow: "AFTER WORK",
      title: "帰宅後の台所",
      boardTitle: "キッチンの光へ",
      description: "帰宅後の台所では、運動の回路も光っている。ミント色を踏まずに、冷蔵庫の向こうへ進む。",
      startText: "ドアが閉まった。キッチンから、甘い光が漏れている。",
      successText: "帰宅後の誘惑が、運動の気配をすり抜けて定着した。",
      size: 5,
      safeRoute: [[4, 0], [3, 0], [2, 0], [2, 1], [2, 2], [3, 2], [4, 2], [4, 3], [4, 4], [3, 4], [2, 4], [1, 4], [0, 4]],
      calories: [[3, 0], [2, 0], [2, 1], [2, 2], [4, 2], [4, 3], [4, 4], [2, 4], [1, 4]],
      diets: [[3, 1], [1, 0], [1, 1], [0, 3], [3, 3]],
      blocked: [[0, 0], [0, 1], [0, 2], [1, 2]],
      targetCalories: 7,
      minSteps: 11,
    },
    {
      week: 5,
      eyebrow: "MIDPOINT CRAVING",
      title: "小腹から夜食へ",
      boardTitle: "中央の誘惑を抜ける",
      description: "『小腹が空いた』だけのはずが、夜の習慣へつながっていく。中央の高カロリーを連続で拾う。",
      startText: "小腹信号が、夜まで残るルートを探している。",
      successText: "小腹の寄り道が、夜食の習慣にまで育った。",
      size: 5,
      safeRoute: [[2, 0], [1, 0], [0, 0], [0, 1], [0, 2], [1, 2], [2, 2], [3, 2], [4, 2], [4, 3], [4, 4], [3, 4], [2, 4]],
      calories: [[1, 0], [0, 0], [0, 1], [0, 2], [1, 2], [2, 2], [3, 2], [4, 2], [4, 3], [4, 4], [3, 4]],
      diets: [[2, 1], [1, 1], [1, 3], [2, 3], [3, 1], [3, 3]],
      blocked: [[3, 0], [4, 0], [4, 1], [0, 3], [0, 4], [1, 4]],
      targetCalories: 8,
      minSteps: 11,
    },
    {
      week: 6,
      eyebrow: "BRANCHING SIGNALS",
      title: "見える近道、見えない誘惑",
      boardTitle: "枝分かれを選ぶ",
      description: "ここから回路が複雑になる。見える近道ではなく、食べ物の光が連続する枝を選ぶ。",
      startText: "シナプスが枝分かれした。甘い光は、少し遠い場所にある。",
      successText: "枝分かれの中から、誘惑だけの長い回路を選び取った。",
      size: 6,
      safeRoute: [[5, 0], [5, 1], [5, 2], [4, 2], [3, 2], [3, 1], [2, 1], [1, 1], [1, 2], [1, 3], [2, 3], [2, 4], [3, 4], [4, 4], [4, 5], [3, 5], [2, 5], [1, 5], [0, 5]],
      calories: [[5, 1], [5, 2], [4, 2], [3, 2], [3, 1], [2, 1], [1, 1], [1, 2], [1, 3], [2, 3], [2, 4], [3, 4], [4, 4], [4, 5], [3, 5], [2, 5]],
      diets: [[5, 3], [4, 3], [3, 3], [2, 2], [0, 4], [1, 4], [5, 4]],
      blocked: [[0, 0], [0, 1], [0, 2], [0, 3], [1, 0], [2, 0], [3, 0], [4, 0], [5, 4]],
      targetCalories: 11,
      minSteps: 16,
    },
    {
      week: 7,
      eyebrow: "EMPTY AFTERNOON",
      title: "予定のない午後",
      boardTitle: "理性の枝をかわす",
      description: "予定のない午後は、理性の枝も複数ある。ミント色の光を横目に、甘い回路をつなぐ。",
      startText: "午後の予定が消えた。食欲中枢への枝が、いくつも開いている。",
      successText: "暇つぶしの誘惑が、午後いっぱいの満腹へ変わった。",
      size: 6,
      safeRoute: [[0, 0], [0, 1], [1, 1], [2, 1], [2, 2], [2, 3], [1, 3], [1, 4], [2, 4], [3, 4], [3, 3], [4, 3], [5, 3], [5, 4], [5, 5]],
      calories: [[0, 1], [1, 1], [2, 1], [2, 2], [2, 3], [1, 3], [1, 4], [2, 4], [3, 4], [3, 3], [4, 3], [5, 3], [5, 4]],
      diets: [[0, 2], [1, 2], [2, 0], [3, 1], [4, 4], [4, 5], [5, 2]],
      blocked: [[0, 5], [1, 5], [2, 5], [3, 5], [4, 0], [5, 0], [5, 1]],
      targetCalories: 9,
      minSteps: 12,
    },
    {
      week: 8,
      eyebrow: "BUSY DAY",
      title: "忙しさのすき間",
      boardTitle: "光るものだけ拾う",
      description: "忙しさのすき間に、誘惑の光だけが見える。ダイエットの提案を避け、回路を長く保つ。",
      startText: "忙しさで判断が鈍った。光るパネルだけが、やけに近く見える。",
      successText: "忙しさのすき間に、食欲だけがしっかり残った。",
      size: 6,
      safeRoute: [[5, 0], [4, 0], [3, 0], [3, 1], [3, 2], [4, 2], [5, 2], [5, 3], [4, 3], [3, 3], [2, 3], [2, 4], [1, 4], [0, 4], [0, 5]],
      calories: [[4, 0], [3, 0], [3, 1], [3, 2], [4, 2], [5, 2], [5, 3], [4, 3], [3, 3], [2, 3], [2, 4], [1, 4], [0, 4]],
      diets: [[4, 1], [2, 0], [2, 1], [4, 4], [1, 3], [1, 5], [5, 1], [3, 4]],
      blocked: [[0, 0], [0, 1], [0, 2], [0, 3], [1, 0], [2, 2], [3, 5], [4, 5], [5, 5]],
      targetCalories: 9,
      minSteps: 12,
    },
    {
      week: 9,
      eyebrow: "LAST RESISTANCE",
      title: "終盤の抵抗",
      boardTitle: "遠回りをあきらめない",
      description: "終盤は、距離も誘惑の密度も必要になる。あと少しの近道が、理性への出口になっている。",
      startText: "理性の出口が見えた。でも、食欲の回路はまだ伸ばせる。",
      successText: "最後の抵抗を越えて、長い誘惑の回路を保った。",
      size: 7,
      safeRoute: [[6, 0], [6, 1], [5, 1], [4, 1], [4, 2], [3, 2], [2, 2], [2, 3], [1, 3], [1, 4], [2, 4], [3, 4], [3, 5], [2, 5], [1, 5], [0, 5], [0, 6]],
      calories: [[6, 1], [5, 1], [4, 1], [4, 2], [3, 2], [2, 2], [2, 3], [1, 3], [1, 4], [2, 4], [3, 4], [3, 5], [2, 5], [1, 5], [0, 5]],
      diets: [[6, 2], [5, 2], [5, 3], [4, 3], [3, 3], [2, 1], [1, 2], [0, 4]],
      blocked: [[6, 3], [6, 4], [6, 5], [5, 0], [4, 0], [3, 0], [2, 0], [1, 0], [0, 0], [0, 1], [0, 2], [0, 3]],
      targetCalories: 11,
      minSteps: 14,
    },
    {
      week: 10,
      eyebrow: "FINAL APPETITE",
      title: "食欲中枢へ",
      boardTitle: "10週間目の完成形",
      description: "最後の一週間。すべての誘惑をつないで、食欲中枢へ。ここだけは、遠回りを惜しまない。",
      startText: "最後の空腹信号が点灯。脳内の回路が、食欲中枢を待っている。",
      successText: "10週間分の誘惑が一本につながり、食欲中枢が満たされた。",
      size: 7,
      safeRoute: [[0, 0], [0, 1], [0, 2], [1, 2], [2, 2], [2, 1], [3, 1], [4, 1], [4, 2], [4, 3], [3, 3], [3, 4], [2, 4], [1, 4], [1, 5], [2, 5], [3, 5], [4, 5], [5, 5], [5, 6], [6, 6]],
      calories: [[0, 1], [0, 2], [1, 2], [2, 2], [2, 1], [3, 1], [4, 1], [4, 2], [4, 3], [3, 3], [3, 4], [2, 4], [1, 4], [1, 5], [2, 5], [3, 5], [4, 5], [5, 5], [5, 6]],
      diets: [[0, 3], [1, 0], [1, 1], [2, 0], [2, 3], [3, 2], [4, 4], [5, 4], [6, 5], [5, 2], [6, 3]],
      blocked: [[0, 4], [0, 5], [0, 6], [1, 6], [2, 6], [3, 6], [4, 6], [5, 0], [5, 1], [6, 0], [6, 1], [6, 2]],
      targetCalories: 14,
      minSteps: 18,
    },
  ];

  const levels = LEVEL_CONFIGS.map(createLevel);
  levels.forEach(validateLevel);

  const state = {
    screen: "intro",
    levelIndex: 0,
    route: [],
    hintKey: null,
    invalidKey: null,
    feedback: null,
    body: {
      weight: 0,
      waist: 0,
      fullness: 0,
      completed: 0,
    },
    log: [],
  };

  let invalidTimer = 0;
  let toastTimer = 0;

  function createLevel(config) {
    const { size } = config;
    const cells = Array.from({ length: size }, (_, row) =>
      Array.from({ length: size }, (_, col) => ({
        row,
        col,
        key: toKey(row, col),
        type: "neutral",
        icon: "✦",
        label: "中継シナプス",
      })),
    );
    const blockedKeys = new Set(config.blocked.map(([row, col]) => toKey(row, col)));
    const safeKeys = new Set(config.safeRoute.map(([row, col]) => toKey(row, col)));
    const calorieKeys = new Set(config.calories.map(([row, col]) => toKey(row, col)));
    const dietKeys = new Set(config.diets.map(([row, col]) => toKey(row, col)));

    if (safeKeys.size !== config.safeRoute.length) {
      throw new Error(`Week ${config.week}: the safe route revisits a node.`);
    }
    if ([...safeKeys].some((key) => blockedKeys.has(key))) {
      throw new Error(`Week ${config.week}: the safe route crosses a blocked node.`);
    }
    if ([...calorieKeys].some((key) => dietKeys.has(key))) {
      throw new Error(`Week ${config.week}: calorie and diet panels overlap.`);
    }

    config.blocked.forEach(([row, col]) => {
      cellAt(cells, row, col).type = "blocked";
      cellAt(cells, row, col).icon = "×";
      cellAt(cells, row, col).label = "切断されたシナプス";
    });

    config.calories.forEach(([row, col], index) => {
      const cell = cellAt(cells, row, col);
      cell.type = "calorie";
      cell.icon = FOOD_DECK[(config.week + index) % FOOD_DECK.length].icon;
      cell.label = FOOD_DECK[(config.week + index) % FOOD_DECK.length].label;
      cell.value = 1;
    });

    config.diets.forEach(([row, col], index) => {
      const cell = cellAt(cells, row, col);
      cell.type = "diet";
      cell.icon = DIET_DECK[(config.week + index) % DIET_DECK.length].icon;
      cell.label = DIET_DECK[(config.week + index) % DIET_DECK.length].label;
      cell.value = 1;
    });

    const start = config.safeRoute[0];
    const goal = config.safeRoute[config.safeRoute.length - 1];
    const startCell = cellAt(cells, start[0], start[1]);
    startCell.type = "start";
    startCell.icon = "◉";
    startCell.label = "空腹信号 / START";
    const goalCell = cellAt(cells, goal[0], goal[1]);
    goalCell.type = "goal";
    goalCell.icon = "◎";
    goalCell.label = "食欲中枢 / GOAL";

    return {
      ...config,
      start,
      goal,
      startKey: toKey(start[0], start[1]),
      goalKey: toKey(goal[0], goal[1]),
      safeRouteKeys: config.safeRoute.map(([row, col]) => toKey(row, col)),
      cells,
    };
  }

  function validateLevel(level) {
    const route = level.safeRoute;
    route.slice(1).forEach((point, index) => {
      const previous = route[index];
      if (manhattan(previous, point) !== 1) {
        throw new Error(`Week ${level.week}: the safe route has a non-adjacent jump.`);
      }
    });

    const routeCells = route.map(([row, col]) => cellAt(level.cells, row, col));
    const calorieCount = routeCells.filter((cell) => cell.type === "calorie").length;
    const dietCount = routeCells.filter((cell) => cell.type === "diet").length;
    if (calorieCount < level.targetCalories || dietCount > 0 || route.length < level.minSteps) {
      throw new Error(`Week ${level.week}: the safe route does not satisfy its own conditions.`);
    }
  }

  function cellAt(cells, row, col) {
    return cells[row][col];
  }

  function toKey(row, col) {
    return `${row},${col}`;
  }

  function fromKey(key) {
    const [row, col] = key.split(",").map(Number);
    return { row, col };
  }

  function manhattan(first, second) {
    return Math.abs(first[0] - second[0]) + Math.abs(first[1] - second[1]);
  }

  function activeLevel() {
    return levels[state.levelIndex];
  }

  function getCell(level, key) {
    const { row, col } = fromKey(key);
    return cellAt(level.cells, row, col);
  }

  function startGame() {
    state.screen = "game";
    state.levelIndex = 0;
    state.route = [levels[0].startKey];
    state.hintKey = null;
    state.invalidKey = null;
    state.feedback = null;
    state.body = { weight: 0, waist: 0, fullness: 0, completed: 0 };
    state.log = [levels[0].startText];
    render();
  }

  function goToIntro() {
    state.screen = "intro";
    state.levelIndex = 0;
    state.route = [];
    state.hintKey = null;
    state.invalidKey = null;
    state.feedback = null;
    state.body = { weight: 0, waist: 0, fullness: 0, completed: 0 };
    state.log = [];
    render();
  }

  function addLog(message) {
    state.log = [message, ...state.log].slice(0, 7);
  }

  function resetRoute(message = "ルートを最初のシナプスへ戻した。") {
    const level = activeLevel();
    state.route = [level.startKey];
    state.hintKey = null;
    state.invalidKey = null;
    addLog(message);
    render();
  }

  function handleCellClick(key) {
    if (state.screen !== "game" || state.feedback) return;

    const level = activeLevel();
    const cell = getCell(level, key);
    const currentKey = state.route[state.route.length - 1];
    const current = getCell(level, currentKey);

    if (!cell || cell.type === "blocked") {
      showInvalid(key, "切断されたシナプスには進めない");
      return;
    }
    if (state.route.includes(key)) {
      showInvalid(key, "一筆書きなので、通ったノードには戻れない");
      return;
    }
    if (manhattan([current.row, current.col], [cell.row, cell.col]) !== 1) {
      showInvalid(key, "今いるノードの上下左右だけにつながる");
      return;
    }

    state.route.push(key);
    state.hintKey = null;
    if (cell.type === "calorie") {
      addLog(`${cell.icon} ${cell.label}を通過。誘惑がひとつ残った。`);
    } else if (cell.type === "diet") {
      addLog(`${cell.icon} ${cell.label}に触れた。理性の光が混ざった。`);
    } else if (cell.type === "goal") {
      addLog("食欲中枢に到達。ルートを判定する。");
    }

    if (cell.type === "goal") {
      finishRoute(evaluateRoute(level, state.route));
      return;
    }

    render();
  }

  function showInvalid(key, message) {
    state.invalidKey = key;
    render();
    showToast(message);
    window.clearTimeout(invalidTimer);
    invalidTimer = window.setTimeout(() => {
      state.invalidKey = null;
      render();
    }, 430);
  }

  function evaluateRoute(level, route) {
    const routeCells = route.map((key) => getCell(level, key));
    const calorieCount = routeCells.filter((cell) => cell.type === "calorie").reduce((sum, cell) => sum + (cell.value || 1), 0);
    const dietCount = routeCells.filter((cell) => cell.type === "diet").length;
    const stepCount = route.length;
    const conditions = {
      calories: calorieCount >= level.targetCalories,
      steps: stepCount >= level.minSteps,
      diet: dietCount === 0,
    };
    const success = conditions.calories && conditions.steps && conditions.diet;
    const reasons = [];

    if (!conditions.diet) {
      reasons.push(`ダイエットパネルを${dietCount}個踏んでいる`);
    }
    if (!conditions.steps) {
      reasons.push(`歩数が${level.minSteps - stepCount}足りず、近道になった`);
    }
    if (!conditions.calories) {
      reasons.push(`高カロリーがあと${level.targetCalories - calorieCount}個足りない`);
    }

    return {
      success,
      calorieCount,
      dietCount,
      stepCount,
      conditions,
      reason: success ? "" : reasons.join("。") + "。",
    };
  }

  function finishRoute(evaluation) {
    const level = activeLevel();
    if (evaluation.success) {
      const index = state.levelIndex;
      const delta = {
        weight: 0.8 + index * 0.24,
        waist: 0.8 + index * 0.19,
        fullness: 8 + index * 1.7,
      };
      state.body.weight += delta.weight;
      state.body.waist += delta.waist;
      state.body.fullness = Math.min(100, state.body.fullness + delta.fullness);
      state.body.completed = Math.max(state.body.completed, index + 1);
      addLog(level.successText);
      state.feedback = {
        type: index === levels.length - 1 ? "complete" : "success",
        level,
        evaluation,
        delta,
      };
    } else {
      addLog(`不正解。${evaluation.reason}`);
      state.feedback = {
        type: "failure",
        level,
        evaluation,
        delta: null,
      };
    }
    render();
  }

  function useHint() {
    if (state.screen !== "game" || state.feedback) return;
    const level = activeLevel();
    state.route = [level.startKey];
    state.hintKey = level.safeRouteKeys[1];
    addLog(`ヒント: ${getCell(level, state.hintKey).label}へつなぐ。`);
    render();
    showToast("正解ルートの最初の一手を点灯しました");
  }

  function advanceAfterSuccess() {
    const completedIndex = state.levelIndex;
    if (completedIndex >= levels.length - 1) {
      goToIntro();
      showToast("10週間の脳内ループをリセットしました");
      return;
    }
    state.levelIndex += 1;
    state.route = [activeLevel().startKey];
    state.hintKey = null;
    state.feedback = null;
    addLog(activeLevel().startText);
    render();
  }

  function retryAfterFailure() {
    state.feedback = null;
    resetRoute("同じ週をやり直す。今度は誘惑だけをつなぐ。");
  }

  function closeFeedback() {
    state.feedback = null;
    render();
  }

  function undoRoute() {
    if (state.screen !== "game" || state.feedback || state.route.length <= 1) return;
    const level = activeLevel();
    const removed = state.route.pop();
    state.hintKey = null;
    addLog(`${getCell(level, removed).label}からひとつ戻った。`);
    render();
  }

  function render() {
    const playing = state.screen === "game";
    elements.introScreen.classList.toggle("is-hidden", playing);
    elements.gameScreen.classList.toggle("is-hidden", !playing);
    renderWeekProgress();

    if (playing) {
      renderLevelHeader();
      renderBody();
      renderBoard();
      renderRouteReadout();
      renderLog();
    }
    renderFeedback();
  }

  function renderWeekProgress() {
    if (state.screen === "intro") {
      elements.weekLabel.textContent = "準備中";
      elements.weekTitle.textContent = "脳内ネットワークを起動";
      elements.weekProgressText.textContent = "00 / 10";
      elements.weekProgressBar.style.width = "0%";
      elements.weekDots.innerHTML = Array.from({ length: levels.length }, () => '<span class="week-dot"></span>').join("");
      return;
    }

    const level = activeLevel();
    const completed = state.body.completed;
    const final = state.feedback?.type === "complete";
    elements.weekLabel.textContent = final ? "COMPLETE" : `WEEK ${String(level.week).padStart(2, "0")}`;
    elements.weekTitle.textContent = final ? "10週間の誘惑が完成" : level.title;
    elements.weekProgressText.textContent = `${String(completed).padStart(2, "0")} / 10`;
    elements.weekProgressBar.style.width = `${(completed / levels.length) * 100}%`;
    elements.weekDots.innerHTML = levels
      .map((entry, index) => {
        const classes = ["week-dot"];
        if (index < completed) classes.push("completed");
        if (!final && index === state.levelIndex) classes.push("active");
        return `<span class="${classes.join(" ")}" title="WEEK ${entry.week}"></span>`;
      })
      .join("");
  }

  function renderLevelHeader() {
    const level = activeLevel();
    elements.levelEyebrow.textContent = `WEEK ${String(level.week).padStart(2, "0")} / ${level.eyebrow}`;
    elements.levelHeading.textContent = level.title;
    elements.levelDescription.textContent = level.description;
  }

  function renderBody() {
    const { body } = state;
    elements.weightValue.innerHTML = `+${body.weight.toFixed(1)} <small>kg</small>`;
    elements.waistValue.innerHTML = `+${body.waist.toFixed(1)} <small>cm</small>`;
    elements.fullnessValue.innerHTML = `${Math.round(body.fullness)} <small>%</small>`;
    elements.completedValue.innerHTML = `${body.completed} <small>/ 10</small>`;
    elements.bodyMeter.style.width = `${Math.min(100, body.fullness)}%`;
    elements.bodyMeterLabel.textContent = getBodyMeterLabel(body.completed);
    elements.bodyQuote.textContent = BODY_QUOTES[Math.min(body.completed, BODY_QUOTES.length - 1)];
    const scale = 1 + body.fullness / 260;
    elements.bodyAvatar.style.transform = `scaleX(${scale.toFixed(3)})`;
    elements.avatarEmoji.style.transform = `scale(${(2.68 + body.fullness / 105).toFixed(3)})`;
  }

  function getBodyMeterLabel(completed) {
    if (completed >= 10) return "誘惑で満たされた";
    if (completed >= 8) return "甘い習慣が定着";
    if (completed >= 5) return "食欲が定着中";
    if (completed >= 3) return "少しずつ膨らむ";
    if (completed >= 1) return "最初の変化";
    return "まだ静か";
  }

  function renderBoard() {
    const level = activeLevel();
    const routeKeys = new Set(state.route);
    elements.boardGrid.style.setProperty("--board-size", level.size);
    elements.boardGrid.innerHTML = "";

    level.cells.flat().forEach((cell) => {
      if (cell.type === "blocked") {
        const blocked = document.createElement("div");
        blocked.className = "node-blocked";
        blocked.textContent = "×";
        blocked.setAttribute("aria-label", cell.label);
        elements.boardGrid.appendChild(blocked);
        return;
      }

      const node = document.createElement("button");
      const visited = routeKeys.has(cell.key);
      const current = state.route[state.route.length - 1] === cell.key;
      const classes = ["node", `node-${cell.type}`];
      if (visited) classes.push("visited");
      if (current) classes.push("current");
      if (state.hintKey === cell.key) classes.push("hinted");
      if (state.invalidKey === cell.key) classes.push("invalid");
      node.className = classes.join(" ");
      node.type = "button";
      node.dataset.key = cell.key;
      node.setAttribute("aria-label", cell.label);
      node.title = cell.label;
      node.innerHTML = `<span class="node-icon">${cell.icon}</span><span class="node-label">${nodeLabel(cell)}</span>`;
      node.addEventListener("click", () => handleCellClick(cell.key));
      elements.boardGrid.appendChild(node);
    });

    const points = state.route.map((key) => {
      const { row, col } = fromKey(key);
      return `${((col + 0.5) / level.size) * 100},${((row + 0.5) / level.size) * 100}`;
    });
    const hasDiet = state.route.some((key) => getCell(level, key).type === "diet");
    elements.pathLayer.innerHTML = "";
    if (points.length > 1) {
      elements.pathLayer.insertAdjacentHTML(
        "beforeend",
        `<polyline class="route-line${hasDiet ? " has-diet" : ""}" points="${points.join(" ")}"></polyline>`,
      );
    }
    points.forEach((point, index) => {
      elements.pathLayer.insertAdjacentHTML(
        "beforeend",
        `<circle class="route-dot${index === points.length - 1 ? " current" : ""}" cx="${point.split(",")[0]}" cy="${point.split(",")[1]}" r="${index === points.length - 1 ? 1.8 : 1.25}"></circle>`,
      );
    });

    const current = getCell(level, state.route[state.route.length - 1]);
    elements.boardTitle.textContent = level.boardTitle;
    elements.currentSignal.textContent = current.label;
    elements.boardInstruction.textContent = current.type === "diet"
      ? "理性の光が混ざった。ゴールしても、この週は不正解になる。"
      : state.route.length === 1
        ? "空腹信号から、上下左右の隣へ進んでください。"
        : "次は上下左右の隣へ。通ったノードには戻れません。";
    elements.invalidFlash.classList.toggle("show", Boolean(state.invalidKey));
  }

  function nodeLabel(cell) {
    if (cell.type === "calorie") return "誘惑 +1";
    if (cell.type === "diet") return "理性";
    if (cell.type === "start") return "START";
    if (cell.type === "goal") return "GOAL";
    return "信号";
  }

  function renderRouteReadout() {
    const level = activeLevel();
    const routeCells = state.route.map((key) => getCell(level, key));
    const calorieCount = routeCells.filter((cell) => cell.type === "calorie").reduce((sum, cell) => sum + (cell.value || 1), 0);
    const dietCount = routeCells.filter((cell) => cell.type === "diet").length;
    const stepCount = state.route.length;
    const caloriePass = calorieCount >= level.targetCalories;
    const stepPass = stepCount >= level.minSteps;
    const dietPass = dietCount === 0;
    const current = routeCells[routeCells.length - 1];

    elements.calorieCount.textContent = calorieCount;
    elements.calorieTarget.textContent = ` / ${level.targetCalories}`;
    elements.stepCount.textContent = stepCount;
    elements.stepTarget.textContent = ` / ${level.minSteps}以上`;
    elements.dietCount.textContent = dietCount;
    setCondition(elements.calorieCondition, caloriePass, "高カロリーを規定数集める");
    setCondition(elements.stepCondition, stepPass, "最低歩数まで遠回りする");
    setCondition(elements.dietCondition, dietPass, "ダイエットパネルを0個にする");

    const ready = caloriePass && stepPass && dietPass;
    elements.routeStateChip.textContent = dietCount > 0 ? "理性混入" : ready ? "正解圏内" : "接続中";
    elements.routeStateChip.classList.toggle("ready", ready);
    elements.routeStateChip.classList.toggle("danger", dietCount > 0);

    if (dietCount > 0) {
      elements.routeStatusMessage.textContent = `ダイエットが${dietCount}個混ざった。食欲中枢へ着いても、正解にはならない。`;
    } else if (current.type === "calorie") {
      elements.routeStatusMessage.textContent = `${current.label}を通過。あと${Math.max(0, level.targetCalories - calorieCount)}個の誘惑を拾う。`;
    } else if (ready) {
      elements.routeStatusMessage.textContent = "条件はそろった。さらに欲張るか、食欲中枢へ進むか。";
    } else {
      elements.routeStatusMessage.textContent = `あと${Math.max(0, level.targetCalories - calorieCount)}個、${Math.max(0, level.minSteps - stepCount)}歩。まだ遠回りできる。`;
    }

    elements.undoButton.disabled = state.route.length <= 1;
  }

  function setCondition(element, pass, label) {
    element.classList.toggle("pass", pass);
    element.classList.toggle("fail", !pass && element.id === "dietCondition" && state.route.length > 1);
    element.querySelector("i").textContent = pass ? "✓" : "○";
    element.querySelector("span").textContent = label;
  }

  function renderLog() {
    elements.logCount.textContent = String(state.log.length).padStart(2, "0");
    elements.activityLog.innerHTML = state.log.map((entry) => `<li>${entry}</li>`).join("");
  }

  function renderFeedback() {
    const feedback = state.feedback;
    elements.feedbackModal.classList.toggle("is-hidden", !feedback);
    if (!feedback) return;

    const { level, evaluation } = feedback;
    const isFailure = feedback.type === "failure";
    const isComplete = feedback.type === "complete";
    elements.feedbackCard.className = `feedback-card ${feedback.type}`;
    elements.feedbackIcon.textContent = isComplete ? "🧠" : isFailure ? failureIcon(evaluation) : "🍔";
    elements.feedbackKicker.textContent = isComplete ? "10 WEEKS COMPLETE" : isFailure ? "不正解ルート" : "正解ルート";
    elements.feedbackKicker.className = `eyebrow ${isFailure ? "" : "coral-text"}`;
    elements.feedbackTitle.textContent = isComplete ? "誘惑の回路が完成した。" : isFailure ? failureTitle(evaluation) : "誘惑がつながった。";
    elements.feedbackBody.textContent = isComplete
      ? "10週間分の遠回りが、空腹信号から食欲中枢まで一本につながった。脳内はもう、誘惑のほうを近く感じている。"
      : isFailure
        ? `${level.title}は、${evaluation.reason}`
        : level.successText;

    elements.feedbackStats.innerHTML = [
      feedbackStat("高カロリー", `${evaluation.calorieCount}個`),
      feedbackStat("つないだ歩数", `${evaluation.stepCount}`),
      feedbackStat("ダイエット", `${evaluation.dietCount}個`),
    ].join("");

    if (isComplete) {
      elements.feedbackDelta.textContent = `最終変化  +${state.body.weight.toFixed(1)}kg / お腹 +${state.body.waist.toFixed(1)}cm`;
    } else if (isFailure) {
      elements.feedbackDelta.textContent = failureHint(evaluation);
    } else {
      elements.feedbackDelta.textContent = `今週の変化  +${feedback.delta.weight.toFixed(1)}kg / お腹 +${feedback.delta.waist.toFixed(1)}cm`;
    }

    elements.feedbackAction.textContent = isComplete ? "最初からもう一度" : isFailure ? "この週をやり直す" : "次の週へ";
    elements.feedbackSecondary.textContent = isComplete ? "タイトルへ戻る" : "ルートを見直す";
  }

  function feedbackStat(label, value) {
    return `<div class="feedback-stat"><span>${label}</span><strong>${value}</strong></div>`;
  }

  function failureIcon(evaluation) {
    if (evaluation.dietCount > 0) return "🥗";
    if (evaluation.stepCount < activeLevel().minSteps) return "↗";
    return "🍽️";
  }

  function failureTitle(evaluation) {
    if (evaluation.dietCount > 0) return "理性が混ざった。";
    if (evaluation.stepCount < activeLevel().minSteps) return "近道しすぎた。";
    return "誘惑が足りなかった。";
  }

  function failureHint(evaluation) {
    if (evaluation.dietCount > 0) return "次はミント色のパネルを避けて、同じ週をやり直そう。";
    if (evaluation.stepCount < activeLevel().minSteps) return "もう少しだけ遠回り。短いルートでは満腹にならない。";
    return "高カロリーの光を、もう少し拾ってからゴールへ。";
  }

  function showToast(message) {
    elements.toast.textContent = message;
    elements.toast.classList.add("show");
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => elements.toast.classList.remove("show"), 1900);
  }

  elements.startButton.addEventListener("click", startGame);
  elements.hintButton.addEventListener("click", useHint);
  elements.fullResetButton.addEventListener("click", goToIntro);
  elements.undoButton.addEventListener("click", undoRoute);
  elements.resetRouteButton.addEventListener("click", () => resetRoute());
  elements.feedbackAction.addEventListener("click", () => {
    if (!state.feedback) return;
    if (state.feedback.type === "failure") {
      retryAfterFailure();
    } else {
      advanceAfterSuccess();
    }
  });
  elements.feedbackSecondary.addEventListener("click", () => {
    if (state.feedback?.type === "complete") {
      goToIntro();
    } else {
      closeFeedback();
    }
  });

  elements.feedbackModal.addEventListener("click", (event) => {
    if (event.target === elements.feedbackModal && state.feedback?.type !== "complete") {
      closeFeedback();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && state.feedback && state.feedback.type !== "complete") {
      closeFeedback();
    }
  });

  render();
})();
