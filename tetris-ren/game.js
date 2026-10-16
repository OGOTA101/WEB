(() => {
  'use strict';

  const COLS = 10;
  const TOTAL_ROWS = 22;
  const HIDDEN_ROWS = 2;
  const VISIBLE_ROWS = 20;
  const CELL = 30;
  const PREVIEW_CELL = 14;
  const STORAGE_KEY = 'tetris-ren-best';
  const REN_START = 2;

  const COLORS = {
    I: '#59f3ff',
    J: '#6878ff',
    L: '#ff9852',
    O: '#ffe15a',
    S: '#a2ff66',
    T: '#c681ff',
    Z: '#ff5f7d',
  };

  const PIECES = {
    I: [
      [0, 0, 0, 0],
      [1, 1, 1, 1],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ],
    J: [
      [1, 0, 0],
      [1, 1, 1],
      [0, 0, 0],
    ],
    L: [
      [0, 0, 1],
      [1, 1, 1],
      [0, 0, 0],
    ],
    O: [
      [1, 1],
      [1, 1],
    ],
    S: [
      [0, 1, 1],
      [1, 1, 0],
      [0, 0, 0],
    ],
    T: [
      [0, 1, 0],
      [1, 1, 1],
      [0, 0, 0],
    ],
    Z: [
      [1, 1, 0],
      [0, 1, 1],
      [0, 0, 0],
    ],
  };

  const BASE_LINE_SCORE = [0, 100, 300, 500, 800];
  const pieceTypes = Object.keys(PIECES);

  const elements = {
    boardCanvas: document.querySelector('#gameCanvas'),
    nextCanvas: document.querySelector('#nextCanvas'),
    playfieldFrame: document.querySelector('#playfieldFrame'),
    gameOverlay: document.querySelector('#gameOverlay'),
    overlayKicker: document.querySelector('#overlayKicker'),
    overlayTitle: document.querySelector('#overlayTitle'),
    overlayCopy: document.querySelector('#overlayCopy'),
    overlayAction: document.querySelector('#overlayAction'),
    renCallout: document.querySelector('#renCallout'),
    renCalloutValue: document.querySelector('#renCalloutValue'),
    scoreValue: document.querySelector('#scoreValue'),
    scorePulse: document.querySelector('#scorePulse'),
    levelValue: document.querySelector('#levelValue'),
    linesValue: document.querySelector('#linesValue'),
    statusChip: document.querySelector('#statusChip'),
    statusTip: document.querySelector('#statusTip'),
    renValue: document.querySelector('#renValue'),
    renMeter: document.querySelector('#renMeter'),
    chainState: document.querySelector('#chainState'),
    chainMessage: document.querySelector('#chainMessage'),
    bestRenValue: document.querySelector('#bestRenValue'),
    eventLine: document.querySelector('#eventLine'),
    eventSubline: document.querySelector('#eventSubline'),
    piecesValue: document.querySelector('#piecesValue'),
    dropMeter: document.querySelector('#dropMeter'),
  };

  const contexts = {
    board: elements.boardCanvas.getContext('2d'),
    next: elements.nextCanvas.getContext('2d'),
  };

  const state = {
    board: createBoard(),
    bag: [],
    queue: [],
    active: null,
    started: false,
    paused: false,
    gameOver: false,
    score: 0,
    lines: 0,
    level: 1,
    ren: 0,
    bestRen: readBestRen(),
    pieces: 0,
    dropAccumulator: 0,
    lastFrame: performance.now(),
    flashEffects: [],
    lastEvent: '盤面を初期化しました',
    lastSubevent: '列重力オンライン',
  };

  let audioContext = null;
  let renCalloutTimer = null;
  let boardPointerStart = null;

  function createBoard() {
    return Array.from({ length: TOTAL_ROWS }, () => Array(COLS).fill(null));
  }

  function cloneMatrix(matrix) {
    return matrix.map((row) => row.slice());
  }

  function rotateMatrix(matrix) {
    const size = matrix.length;
    const rotated = Array.from({ length: size }, () => Array(size).fill(0));
    for (let row = 0; row < size; row += 1) {
      for (let column = 0; column < size; column += 1) {
        rotated[column][size - 1 - row] = matrix[row][column];
      }
    }
    return rotated;
  }

  function matrixFor(type, rotation) {
    let matrix = cloneMatrix(PIECES[type]);
    if (type === 'O') return matrix;
    for (let index = 0; index < rotation; index += 1) {
      matrix = rotateMatrix(matrix);
    }
    return matrix;
  }

  function shuffledBag() {
    const bag = pieceTypes.slice();
    for (let index = bag.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(Math.random() * (index + 1));
      [bag[index], bag[swapIndex]] = [bag[swapIndex], bag[index]];
    }
    return bag;
  }

  function fillQueue() {
    while (state.queue.length < 5) {
      if (state.bag.length === 0) state.bag = shuffledBag();
      state.queue.push(state.bag.shift());
    }
  }

  function takeNextType() {
    fillQueue();
    const nextType = state.queue.shift();
    fillQueue();
    return nextType;
  }

  function spawnPiece(type) {
    const matrix = matrixFor(type, 0);
    return {
      type,
      rotation: 0,
      matrix,
      x: Math.floor((COLS - matrix[0].length) / 2),
      y: 0,
    };
  }

  function pieceCells(piece, x = piece.x, y = piece.y, matrix = piece.matrix) {
    const cells = [];
    for (let row = 0; row < matrix.length; row += 1) {
      for (let column = 0; column < matrix[row].length; column += 1) {
        if (matrix[row][column]) cells.push({ x: x + column, y: y + row });
      }
    }
    return cells;
  }

  function isValid(piece, x = piece.x, y = piece.y, matrix = piece.matrix) {
    return pieceCells(piece, x, y, matrix).every(({ x: cellX, y: cellY }) => {
      if (cellX < 0 || cellX >= COLS || cellY >= TOTAL_ROWS) return false;
      if (cellY < 0) return true;
      return !state.board[cellY][cellX];
    });
  }

  function currentGhostY() {
    if (!state.active) return 0;
    let ghostY = state.active.y;
    while (isValid(state.active, state.active.x, ghostY + 1)) ghostY += 1;
    return ghostY;
  }

  function tryMove(deltaX, deltaY = 0) {
    if (!state.active || state.paused || state.gameOver) return false;
    const nextX = state.active.x + deltaX;
    const nextY = state.active.y + deltaY;
    if (!isValid(state.active, nextX, nextY)) return false;
    state.active.x = nextX;
    state.active.y = nextY;
    if (deltaY > 0) state.dropAccumulator = 0;
    return true;
  }

  function tryRotate(direction = 1) {
    if (!state.active || state.paused || state.gameOver || state.active.type === 'O') return false;
    const nextRotation = (state.active.rotation + direction + 4) % 4;
    const nextMatrix = matrixFor(state.active.type, nextRotation);
    const kicks = [
      [0, 0],
      [-1, 0],
      [1, 0],
      [-2, 0],
      [2, 0],
      [0, -1],
      [0, 1],
    ];
    for (const [offsetX, offsetY] of kicks) {
      if (isValid(state.active, state.active.x + offsetX, state.active.y + offsetY, nextMatrix)) {
        state.active.rotation = nextRotation;
        state.active.matrix = nextMatrix;
        state.active.x += offsetX;
        state.active.y += offsetY;
        playTone('rotate');
        return true;
      }
    }
    return false;
  }

  function softDrop() {
    if (tryMove(0, 1)) {
      state.score += 1;
      state.lastEvent = 'SOFT DROP';
      state.lastSubevent = '位置ボーナス +1';
      playTone('move');
      return true;
    }
    return false;
  }

  function hardDrop() {
    if (!state.active || state.paused || state.gameOver) return;
    let distance = 0;
    while (tryMove(0, 1)) distance += 1;
    state.score += distance * 2;
    state.dropAccumulator = 0;
    playTone('drop');
    lockPiece();
  }

  function compactColumns() {
    for (let column = 0; column < COLS; column += 1) {
      const occupied = [];
      for (let row = TOTAL_ROWS - 1; row >= 0; row -= 1) {
        if (state.board[row][column]) occupied.push(state.board[row][column]);
      }
      for (let row = 0; row < TOTAL_ROWS; row += 1) state.board[row][column] = null;
      occupied.forEach((value, index) => {
        state.board[TOTAL_ROWS - 1 - index][column] = value;
      });
    }
  }

  function resolveBoard() {
    const waves = [];
    let safety = 0;
    while (safety < TOTAL_ROWS) {
      safety += 1;
      compactColumns();
      const fullRows = [];
      for (let row = 0; row < TOTAL_ROWS; row += 1) {
        if (state.board[row].every(Boolean)) fullRows.push(row);
      }
      if (fullRows.length === 0) break;
      waves.push({ rows: fullRows, count: fullRows.length });
      for (const row of fullRows) state.board[row] = Array(COLS).fill(null);
    }
    compactColumns();
    return waves;
  }

  function lockPiece() {
    if (!state.active || state.paused || state.gameOver) return;

    const cells = pieceCells(state.active);
    let toppedOut = false;
    for (const { x, y } of cells) {
      if (y < 0) {
        toppedOut = true;
      } else if (y < TOTAL_ROWS && x >= 0 && x < COLS) {
        state.board[y][x] = state.active.type;
      }
    }
    state.pieces += 1;
    syncLevel();
    const waves = resolveBoard();
    const effectStart = performance.now();

    if (waves.length > 0) {
      let chain = state.ren > 0 ? state.ren : REN_START - 1;
      let totalCleared = 0;
      for (const [index, wave] of waves.entries()) {
        chain += 1;
        totalCleared += wave.count;
        state.lines += wave.count;
        const levelBefore = state.level;
        const baseScore = BASE_LINE_SCORE[Math.min(wave.count, 4)] || wave.count * 250;
        const renBonus = Math.max(0, chain - 1) * 50;
        const cascadeBonus = index > 0 ? 100 * index : 0;
        state.score += (baseScore + renBonus + cascadeBonus) * levelBefore;
        syncLevel();
        state.flashEffects.push({
          rows: wave.rows.slice(),
          started: effectStart + index * 145,
          duration: 300,
        });
      }
      state.ren = chain;
      state.bestRen = Math.max(state.bestRen, state.ren);
      saveBestRen(state.bestRen);
      const lineLabel = totalCleared === 4 ? 'TETRIS // QUAD SIGNAL' : `${totalCleared} LINE CLEAR`;
      const cascadeLabel = waves.length > 1 ? ` / CASCADE x${waves.length}` : '';
      state.lastEvent = lineLabel;
      state.lastSubevent = `REN ${String(state.ren).padStart(2, '0')}${cascadeLabel}`;
      triggerRenCallout();
      triggerShake(waves.length > 1 ? 'heavy' : 'light');
      playTone(totalCleared === 4 ? 'tetris' : 'clear');
    } else {
      state.ren = 0;
      state.lastEvent = 'NO-HOLE LOCK';
      state.lastSubevent = '空白を列重力で圧縮';
      playTone('lock');
    }

    state.dropAccumulator = 0;
    state.active = spawnPiece(takeNextType());
    if (toppedOut || !isValid(state.active)) endGame();
  }

  function getDropInterval() {
    return Math.max(78, 720 - (state.level - 1) * 52);
  }

  function syncLevel() {
    state.level = 1 + Math.floor(state.pieces / 8) + Math.floor(state.lines / 10);
  }

  function update(delta) {
    if (!state.started || state.paused || state.gameOver) return;
    state.dropAccumulator += delta;
    const interval = getDropInterval();
    if (state.dropAccumulator < interval) return;

    const steps = Math.min(3, Math.floor(state.dropAccumulator / interval));
    state.dropAccumulator -= steps * interval;
    for (let step = 0; step < steps; step += 1) {
      if (!tryMove(0, 1)) {
        state.dropAccumulator = 0;
        lockPiece();
        break;
      }
    }
  }

  function resetGameState() {
    state.board = createBoard();
    state.bag = [];
    state.queue = [];
    state.score = 0;
    state.lines = 0;
    state.level = 1;
    state.ren = 0;
    state.pieces = 0;
    state.dropAccumulator = 0;
    state.flashEffects = [];
    state.lastEvent = '盤面を初期化しました';
    state.lastSubevent = '列重力オンライン';
    fillQueue();
    state.active = spawnPiece(takeNextType());
  }

  function startGame() {
    resetGameState();
    state.started = true;
    state.paused = false;
    state.gameOver = false;
    state.lastFrame = performance.now();
    ensureAudio();
    playTone('start');
    hideOverlay();
    render();
  }

  function togglePause() {
    if (!state.started || state.gameOver) return;
    state.paused = !state.paused;
    if (state.paused) {
      showOverlay('PAUSED', 'PAUSE', '信号は止まっています。\n続きから再開できます。', 'RESUME');
      playTone('pause');
    } else {
      hideOverlay();
      state.lastFrame = performance.now();
      playTone('start');
    }
  }

  function endGame() {
    state.gameOver = true;
    state.paused = false;
    state.lastEvent = 'SIGNAL LOST';
    state.lastSubevent = `SCORE ${String(state.score).padStart(7, '0')}`;
    playTone('gameover');
    showOverlay(
      'GAME OVER',
      'STACK\nCOMPLETE',
      `SCORE ${String(state.score).padStart(7, '0')}\nBEST REN ${String(state.bestRen).padStart(2, '0')}`,
      'RESTART GAME',
    );
  }

  function showOverlay(kicker, title, copy, buttonLabel) {
    elements.overlayKicker.textContent = kicker;
    elements.overlayTitle.innerHTML = title.replace('\n', '<br><span>') + (title.includes('\n') ? '</span>' : '');
    elements.overlayCopy.innerHTML = copy.replace(/\n/g, '<br>');
    elements.overlayAction.innerHTML = `${buttonLabel} <span>↵</span>`;
    elements.gameOverlay.classList.remove('hidden');
  }

  function hideOverlay() {
    elements.gameOverlay.classList.add('hidden');
  }

  function triggerRenCallout() {
    elements.renCalloutValue.textContent = `REN ${String(state.ren).padStart(2, '0')}`;
    elements.renCallout.classList.remove('show');
    void elements.renCallout.offsetWidth;
    elements.renCallout.classList.add('show');
    clearTimeout(renCalloutTimer);
    renCalloutTimer = setTimeout(() => elements.renCallout.classList.remove('show'), 950);
  }

  function triggerShake(weight) {
    elements.playfieldFrame.classList.remove('shake', 'shake-heavy');
    void elements.playfieldFrame.offsetWidth;
    elements.playfieldFrame.classList.add(weight === 'heavy' ? 'shake-heavy' : 'shake');
  }

  function readBestRen() {
    try {
      return Number.parseInt(localStorage.getItem(STORAGE_KEY) || '0', 10) || 0;
    } catch {
      return 0;
    }
  }

  function saveBestRen(value) {
    try {
      localStorage.setItem(STORAGE_KEY, String(value));
    } catch {
      // Local storage can be unavailable in private or embedded contexts.
    }
  }

  function setupCanvas(canvas, context, width, height) {
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(width * ratio);
    canvas.height = Math.floor(height * ratio);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    canvas.dataset.logicalWidth = String(width);
    canvas.dataset.logicalHeight = String(height);
  }

  function resizeCanvases() {
    setupCanvas(elements.boardCanvas, contexts.board, COLS * CELL, VISIBLE_ROWS * CELL);
    setupCanvas(elements.nextCanvas, contexts.next, 224, 56);
    draw();
  }

  function drawBlock(context, x, y, size, color, alpha = 1, ghost = false) {
    const inset = Math.max(2, size * 0.1);
    context.save();
    context.globalAlpha = alpha;
    if (ghost) {
      context.strokeStyle = color;
      context.lineWidth = 1.5;
      context.setLineDash([4, 3]);
      context.strokeRect(x + inset, y + inset, size - inset * 2, size - inset * 2);
      context.restore();
      return;
    }
    context.shadowColor = color;
    context.shadowBlur = size * 0.22;
    const gradient = context.createLinearGradient(x, y, x + size, y + size);
    gradient.addColorStop(0, lighten(color, 0.18));
    gradient.addColorStop(0.48, color);
    gradient.addColorStop(1, darken(color, 0.2));
    context.fillStyle = gradient;
    if (typeof context.roundRect === 'function') {
      context.beginPath();
      context.roundRect(x + inset, y + inset, size - inset * 2, size - inset * 2, Math.max(2, size * 0.14));
      context.fill();
    } else {
      context.fillRect(x + inset, y + inset, size - inset * 2, size - inset * 2);
    }
    context.shadowBlur = 0;
    context.fillStyle = 'rgba(255,255,255,0.28)';
    context.fillRect(x + inset + 2, y + inset + 2, size - inset * 2 - 4, Math.max(2, size * 0.08));
    context.strokeStyle = 'rgba(3, 10, 13, 0.54)';
    context.lineWidth = 1;
    context.strokeRect(x + inset, y + inset, size - inset * 2, size - inset * 2);
    context.restore();
  }

  function lighten(hex, amount) {
    return blendColor(hex, '#ffffff', amount);
  }

  function darken(hex, amount) {
    return blendColor(hex, '#000000', amount);
  }

  function blendColor(first, second, amount) {
    const a = hexToRgb(first);
    const b = hexToRgb(second);
    const mix = (key) => Math.round(a[key] + (b[key] - a[key]) * amount);
    return `rgb(${mix('r')}, ${mix('g')}, ${mix('b')})`;
  }

  function hexToRgb(hex) {
    const value = hex.replace('#', '');
    return {
      r: Number.parseInt(value.slice(0, 2), 16),
      g: Number.parseInt(value.slice(2, 4), 16),
      b: Number.parseInt(value.slice(4, 6), 16),
    };
  }

  function drawBoard() {
    const context = contexts.board;
    const width = COLS * CELL;
    const height = VISIBLE_ROWS * CELL;
    context.clearRect(0, 0, width, height);
    const background = context.createLinearGradient(0, 0, width, height);
    background.addColorStop(0, '#071b20');
    background.addColorStop(0.52, '#061216');
    background.addColorStop(1, '#030a0d');
    context.fillStyle = background;
    context.fillRect(0, 0, width, height);

    context.strokeStyle = 'rgba(162, 255, 102, 0.095)';
    context.lineWidth = 1;
    for (let column = 0; column <= COLS; column += 1) {
      context.beginPath();
      context.moveTo(column * CELL + 0.5, 0);
      context.lineTo(column * CELL + 0.5, height);
      context.stroke();
    }
    for (let row = 0; row <= VISIBLE_ROWS; row += 1) {
      context.beginPath();
      context.moveTo(0, row * CELL + 0.5);
      context.lineTo(width, row * CELL + 0.5);
      context.stroke();
    }

    const now = performance.now();
    for (let row = HIDDEN_ROWS; row < TOTAL_ROWS; row += 1) {
      for (let column = 0; column < COLS; column += 1) {
        const type = state.board[row][column];
        if (type) drawBlock(context, column * CELL, (row - HIDDEN_ROWS) * CELL, CELL, COLORS[type]);
      }
    }

    if (state.active && !state.gameOver) {
      const ghostY = currentGhostY();
      if (ghostY > state.active.y) {
        for (const { x, y } of pieceCells(state.active, state.active.x, ghostY)) {
          if (y >= HIDDEN_ROWS) drawBlock(context, x * CELL, (y - HIDDEN_ROWS) * CELL, CELL, COLORS[state.active.type], 0.68, true);
        }
      }
      for (const { x, y } of pieceCells(state.active)) {
        if (y >= HIDDEN_ROWS) drawBlock(context, x * CELL, (y - HIDDEN_ROWS) * CELL, CELL, COLORS[state.active.type]);
      }
    }

    state.flashEffects = state.flashEffects.filter((effect) => now < effect.started + effect.duration);
    for (const effect of state.flashEffects) {
      if (now < effect.started) continue;
      const progress = (now - effect.started) / effect.duration;
      const alpha = Math.max(0, 1 - progress);
      for (const row of effect.rows) {
        const visualRow = row - HIDDEN_ROWS;
        if (visualRow < 0 || visualRow >= VISIBLE_ROWS) continue;
        context.fillStyle = `rgba(217, 255, 177, ${alpha * 0.68})`;
        context.fillRect(0, visualRow * CELL, width, CELL);
      }
    }

    context.fillStyle = 'rgba(255, 255, 255, 0.018)';
    for (let y = 0; y < height; y += 6) context.fillRect(0, y, width, 1);
  }

  function drawMiniPiece(context, type, centerX, topY, boxWidth, boxHeight) {
    if (!type) return;
    const matrix = matrixFor(type, 0);
    const cells = [];
    matrix.forEach((row, rowIndex) => row.forEach((filled, columnIndex) => {
      if (filled) cells.push({ x: columnIndex, y: rowIndex });
    }));
    const minX = Math.min(...cells.map((cell) => cell.x));
    const maxX = Math.max(...cells.map((cell) => cell.x));
    const minY = Math.min(...cells.map((cell) => cell.y));
    const maxY = Math.max(...cells.map((cell) => cell.y));
    const width = (maxX - minX + 1) * PREVIEW_CELL;
    const height = (maxY - minY + 1) * PREVIEW_CELL;
    const startX = centerX - width / 2 - minX * PREVIEW_CELL + PREVIEW_CELL / 2;
    const startY = topY + (boxHeight - height) / 2 - minY * PREVIEW_CELL + PREVIEW_CELL / 2;
    for (const cell of cells) {
      drawBlock(context, startX + cell.x * PREVIEW_CELL - PREVIEW_CELL / 2, startY + cell.y * PREVIEW_CELL - PREVIEW_CELL / 2, PREVIEW_CELL, COLORS[type]);
    }
  }

  function drawPreviews() {
    const nextContext = contexts.next;
    nextContext.clearRect(0, 0, 224, 56);
    nextContext.fillStyle = 'rgba(4, 13, 16, 0.74)';
    nextContext.fillRect(0, 0, 224, 56);
    nextContext.strokeStyle = 'rgba(162, 255, 102, 0.12)';
    nextContext.strokeRect(0.5, 0.5, 223, 55);
    for (let index = 0; index < 3; index += 1) {
      const left = index * 74;
      nextContext.strokeStyle = index === 0 ? 'rgba(255, 152, 82, 0.24)' : 'rgba(162, 255, 102, 0.1)';
      nextContext.beginPath();
      nextContext.moveTo(left + 73.5, 7);
      nextContext.lineTo(left + 73.5, 49);
      nextContext.stroke();
      nextContext.fillStyle = 'rgba(120, 144, 146, 0.65)';
      nextContext.font = '7px IBM Plex Mono, monospace';
      nextContext.fillText(`0${index + 1}`, left + 5, 10);
      drawMiniPiece(nextContext, state.queue[index], left + 37, 8, 68, 40);
    }
  }

  function draw() {
    drawBoard();
    drawPreviews();
  }

  function render() {
    elements.scoreValue.textContent = String(state.score).padStart(7, '0');
    elements.levelValue.textContent = String(state.level).padStart(2, '0');
    elements.linesValue.textContent = String(state.lines).padStart(3, '0');
    elements.renValue.textContent = String(state.ren).padStart(2, '0');
    elements.bestRenValue.textContent = String(state.bestRen).padStart(2, '0');
    elements.piecesValue.textContent = String(state.pieces).padStart(3, '0');
    elements.scorePulse.style.width = `${Math.min(100, 22 + (state.score % 1200) / 16)}%`;
    elements.renMeter.style.width = `${state.ren === 0 ? 0 : Math.min(100, 16 + state.ren * 8)}%`;
    elements.chainState.textContent = state.ren > 0 ? 'LIVE' : 'IDLE';
    elements.chainMessage.textContent = state.ren > 0
      ? `次の消去で REN BONUS +${Math.max(0, state.ren - 1) * 50}`
      : '次の消去でチェイン開始';
    elements.eventLine.textContent = state.lastEvent;
    elements.eventSubline.textContent = state.lastSubevent;
    elements.dropMeter.style.width = '0%';
    if (state.started && !state.paused && !state.gameOver) {
      elements.dropMeter.style.width = `${Math.min(100, (state.dropAccumulator / getDropInterval()) * 100)}%`;
    }

    const statusClass = state.gameOver ? 'over' : state.paused ? 'paused' : '';
    elements.statusChip.className = `status-chip ${statusClass}`.trim();
    elements.statusChip.innerHTML = `<i></i>${state.gameOver ? 'GAME OVER' : state.paused ? 'PAUSED' : state.started ? 'LIVE' : 'READY'}`;
    elements.statusTip.textContent = state.gameOver ? 'PRESS ENTER TO RESET' : state.paused ? 'PRESS P TO RESUME' : '↑ / SPACE = HARD DROP';
    elements.scoreValue.closest('.score-panel').classList.toggle('pulse', state.ren > 0);
    draw();
  }

  function animationFrame(now) {
    const delta = Math.min(50, now - state.lastFrame);
    state.lastFrame = now;
    update(delta);
    render();
    requestAnimationFrame(animationFrame);
  }

  function ensureAudio() {
    if (!audioContext) {
      const AudioCtor = window.AudioContext || window.webkitAudioContext;
      if (AudioCtor) audioContext = new AudioCtor();
    }
    if (audioContext?.state === 'suspended') audioContext.resume();
  }

  function playTone(kind) {
    if (!audioContext) return;
    const settings = {
      move: [180, 0.025, 'square'],
      rotate: [300, 0.035, 'triangle'],
      drop: [115, 0.06, 'sawtooth'],
      lock: [90, 0.045, 'square'],
      clear: [420, 0.15, 'triangle'],
      tetris: [680, 0.23, 'sawtooth'],
      start: [260, 0.08, 'triangle'],
      pause: [140, 0.07, 'square'],
      gameover: [70, 0.35, 'sawtooth'],
    }[kind];
    if (!settings) return;
    const [frequency, duration, wave] = settings;
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.type = wave;
    oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(40, frequency * 0.62), audioContext.currentTime + duration);
    gain.gain.setValueAtTime(0.0001, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.045, audioContext.currentTime + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + duration);
    oscillator.connect(gain).connect(audioContext.destination);
    oscillator.start();
    oscillator.stop(audioContext.currentTime + duration + 0.02);
  }

  function runAction(action) {
    ensureAudio();
    if (!state.started || state.gameOver) {
      startGame();
      return;
    }
    if (state.paused) return;
    switch (action) {
      case 'left':
        tryMove(-1);
        break;
      case 'right':
        tryMove(1);
        break;
      case 'down':
        softDrop();
        break;
      case 'rotate':
        tryRotate(1);
        break;
      case 'rotate-ccw':
        tryRotate(-1);
        break;
      case 'hard':
        hardDrop();
        break;
      default:
        break;
    }
    render();
  }

  function handleKeyDown(event) {
    const actionKeys = ['ArrowLeft', 'ArrowRight', 'ArrowDown', 'ArrowUp', 'Space', 'KeyZ', 'KeyX', 'KeyP', 'Enter'];
    if (!actionKeys.includes(event.code)) return;
    if (['ArrowLeft', 'ArrowRight', 'ArrowDown', 'ArrowUp', 'Space'].includes(event.code)) event.preventDefault();
    if (event.code === 'Enter') {
      if (!state.started || state.gameOver) startGame();
      else if (state.paused) togglePause();
      return;
    }
    if (event.code === 'Space') {
      if (!state.started || state.gameOver) startGame();
      else hardDrop();
      render();
      return;
    }
    if (event.code === 'KeyP') {
      togglePause();
      render();
      return;
    }
    if (!state.started || state.gameOver || state.paused) return;
    if (event.code === 'ArrowLeft') runAction('left');
    if (event.code === 'ArrowRight') runAction('right');
    if (event.code === 'ArrowDown') runAction('down');
    if (event.code === 'ArrowUp') {
      if (!event.repeat) {
        hardDrop();
        render();
      }
      return;
    }
    if (event.code === 'KeyX') runAction('rotate');
    if (event.code === 'KeyZ') runAction('rotate-ccw');
  }

  function isTouchLayout() {
    return window.matchMedia?.('(max-width: 680px)').matches
      || window.matchMedia?.('(pointer: coarse)').matches;
  }

  function handleBoardPointerDown(event) {
    if (!isTouchLayout() || event.target.closest('.game-overlay')) return;
    boardPointerStart = { x: event.clientX, y: event.clientY };
    event.preventDefault();
    try {
      elements.playfieldFrame.setPointerCapture?.(event.pointerId);
    } catch {
      // Some embedded browsers do not expose a capturable pointer id.
    }
  }

  function handleBoardPointerUp(event) {
    if (!boardPointerStart) return;
    const start = boardPointerStart;
    boardPointerStart = null;
    if (!isTouchLayout() || event.target.closest('.game-overlay')) return;

    const deltaX = event.clientX - start.x;
    const deltaY = event.clientY - start.y;
    if (!state.started || state.paused || state.gameOver) return;

    if (Math.abs(deltaY) >= 42 && Math.abs(deltaY) > Math.abs(deltaX)) {
      if (deltaY < 0) tryRotate(1);
      else hardDrop();
    } else if (Math.abs(deltaX) < 18 && Math.abs(deltaY) < 18) {
      const rect = elements.playfieldFrame.getBoundingClientRect();
      runAction(event.clientX < rect.left + rect.width / 2 ? 'left' : 'right');
    }
    render();
  }

  function bindTouchControls() {
    document.querySelectorAll('[data-action]').forEach((button) => {
      button.addEventListener('click', (event) => {
        event.preventDefault();
        runAction(button.dataset.action);
      });
    });
  }

  elements.overlayAction.addEventListener('click', () => {
    if (state.paused) togglePause();
    else startGame();
    render();
  });
  document.addEventListener('keydown', handleKeyDown);
  window.addEventListener('resize', resizeCanvases);
  elements.playfieldFrame.addEventListener('pointerdown', handleBoardPointerDown);
  elements.playfieldFrame.addEventListener('pointerup', handleBoardPointerUp);
  elements.playfieldFrame.addEventListener('pointercancel', () => {
    boardPointerStart = null;
  });
  bindTouchControls();
  resetGameState();
  resizeCanvases();
  render();
  requestAnimationFrame(animationFrame);
})();
