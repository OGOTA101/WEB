/**
 * ドット絵ルーレット(1〜10) ＆ ドット絵ダイス(1D6/2D6) ウィジェットコントローラー
 * ルーレットとサイコロの両方をクリーンなピクセルアートCanvasで描画・アニメーションします。
 */
class PixelWidgetsController {
  constructor() {
    this.rouletteCanvas = null;
    this.rouletteCtx = null;
    this.rouletteAngle = 0;
    this.rouletteFlapper = 0;
    this.rouletteHighlight = null;
    this.isSpinning = false;

    this.diceCanvas = null;
    this.diceCtx = null;
    this.diceValues = [1, 6];
    this.diceCount = 1;
    this.isRolling = false;
  }

  init(rouletteCanvasId, diceCanvasId) {
    this.rouletteCanvas = document.getElementById(rouletteCanvasId);
    if (this.rouletteCanvas) {
      this.rouletteCtx = this.rouletteCanvas.getContext('2d');
      this.rouletteCtx.imageSmoothingEnabled = false;
      this.drawRoulette();
    }

    this.diceCanvas = document.getElementById(diceCanvasId);
    if (this.diceCanvas) {
      this.diceCtx = this.diceCanvas.getContext('2d');
      this.diceCtx.imageSmoothingEnabled = false;
      this.drawDice([1], false);
    }
  }

  /**
   * 1〜10のドット絵ルーレットを描画
   */
  drawRoulette(centerText = null) {
    const canvas = this.rouletteCanvas;
    const ctx = this.rouletteCtx;
    if (!canvas || !ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    const cx = Math.floor(w / 2);
    const cy = Math.floor(h / 2) + 3;
    const radius = Math.floor(Math.min(w, h) * 0.42);

    ctx.clearRect(0, 0, w, h);
    ctx.imageSmoothingEnabled = false;

    // 外枠のピクセルリング（黒縁＋金枠）
    ctx.fillStyle = '#14131a';
    ctx.beginPath();
    ctx.arc(cx, cy, radius + 7, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ca8a04';
    ctx.beginPath();
    ctx.arc(cx, cy, radius + 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#facc15';
    ctx.beginPath();
    ctx.arc(cx, cy, radius + 3, 0, Math.PI * 2);
    ctx.fill();

    const segColors = [
      '#ef4444', '#3b82f6', '#22c55e', '#eab308', '#a855f7',
      '#f97316', '#06b6d4', '#ec4899', '#10b981', '#6366f1'
    ];
    const segAngle = (Math.PI * 2) / 10;

    // 1〜10の扇形ポケット描画
    for (let i = 0; i < 10; i++) {
      const num = i + 1;
      const startA = this.rouletteAngle + i * segAngle - Math.PI / 2 - segAngle / 2;
      const endA = startA + segAngle;

      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, radius, startA, endA);
      ctx.closePath();

      const isHit = this.rouletteHighlight === num;
      ctx.fillStyle = isHit ? '#fef08a' : segColors[i];
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#14131a';
      ctx.stroke();

      // 数字ラベル
      const midA = (startA + endA) / 2;
      const tx = cx + Math.cos(midA) * (radius * 0.72);
      const ty = cy + Math.sin(midA) * (radius * 0.72);

      ctx.save();
      ctx.font = 'bold 12px "DotGothic16", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#14131a';
      ctx.fillText(String(num), Math.round(tx) + 1, Math.round(ty) + 1);
      ctx.fillStyle = isHit ? '#b91c1c' : '#ffffff';
      ctx.fillText(String(num), Math.round(tx), Math.round(ty));
      ctx.restore();

      // 境界の金属ピン（ドット矩形）
      const px = Math.round(cx + Math.cos(startA) * (radius - 2));
      const py = Math.round(cy + Math.sin(startA) * (radius - 2));
      ctx.fillStyle = '#14131a';
      ctx.fillRect(px - 2, py - 2, 4, 4);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(px - 1, py - 1, 2, 2);
    }

    // 中央のスピナーハブ
    ctx.fillStyle = '#14131a';
    ctx.beginPath();
    ctx.arc(cx, cy, 17, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.arc(cx, cy, 14, 0, Math.PI * 2);
    ctx.fill();

    // 中央の出目表示
    const label = centerText !== null ? String(centerText) : (this.rouletteHighlight ? String(this.rouletteHighlight) : '1-10');
    ctx.font = label.length > 2 ? 'bold 10px "DotGothic16", monospace' : 'bold 16px "DotGothic16", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#facc15';
    ctx.fillText(label, cx, cy + 1);

    // 上部の赤いドット絵ポインター針
    ctx.save();
    ctx.translate(cx, cy - radius - 4);
    ctx.rotate(this.rouletteFlapper);
    ctx.fillStyle = '#14131a';
    ctx.fillRect(-6, -6, 12, 10);
    ctx.fillRect(-4, 4, 8, 6);
    ctx.fillRect(-2, 10, 4, 4);
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(-4, -4, 8, 8);
    ctx.fillRect(-2, 4, 4, 6);
    ctx.fillStyle = '#fef08a';
    ctx.fillRect(-2, -2, 4, 4);
    ctx.restore();
  }

  /**
   * ルーレットを回転させ、targetValue(1〜10)で停止するアニメーションPromise
   */
  spinRoulette(targetValue, fastMode = false) {
    if (this.isSpinning) return Promise.resolve(targetValue);
    this.isSpinning = true;
    this.rouletteHighlight = null;

    const duration = fastMode ? 480 : 1250;
    const segAngle = (Math.PI * 2) / 10;
    // targetValue (1..10) がちょうど真上 (-PI/2) に来る角度を計算
    const targetIdx = (targetValue - 1 + 10) % 10;
    const targetAngleMod = (Math.PI * 2 - targetIdx * segAngle) % (Math.PI * 2);
    const currentMod = ((this.rouletteAngle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
    let delta = targetAngleMod - currentMod;
    if (delta < 0) delta += Math.PI * 2;

    const totalRot = (fastMode ? 2 : 4) * Math.PI * 2 + delta;
    const startAngle = this.rouletteAngle;
    const startTime = performance.now();
    let lastTickSeg = -1;

    return new Promise((resolve) => {
      const step = (now) => {
        const t = Math.min(1, (now - startTime) / duration);
        // イージング (easeOutCubic)
        const ease = 1 - Math.pow(1 - t, 3);
        this.rouletteAngle = startAngle + totalRot * ease;

        // 現在の真上のポケット番号を計算 (1..10)
        const normA = (((-this.rouletteAngle) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
        const curSeg = Math.round(normA / segAngle) % 10;
        const curNum = curSeg + 1;

        if (curSeg !== lastTickSeg) {
          lastTickSeg = curSeg;
          this.rouletteFlapper = -0.35 * (1 - t * 0.7);
          if (window.soundEngine) {
            window.soundEngine.playRouletteTick(0.85 + (1 - t) * 0.35);
          }
        } else {
          this.rouletteFlapper *= 0.78;
        }

        this.drawRoulette(curNum);

        if (t < 1) {
          requestAnimationFrame(step);
        } else {
          this.rouletteAngle = startAngle + totalRot;
          this.rouletteFlapper = 0;
          this.rouletteHighlight = targetValue;
          this.isSpinning = false;
          this.drawRoulette(targetValue);
          if (window.soundEngine) {
            window.soundEngine.playRouletteResult();
          }
          resolve(targetValue);
        }
      };
      requestAnimationFrame(step);
    });
  }

  /**
   * 1個または2個のドット絵サイコロを描画
   */
  drawDice(values = [1], isRolling = false, bounceOffset = 0) {
    const canvas = this.diceCanvas;
    const ctx = this.diceCtx;
    if (!canvas || !ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    ctx.imageSmoothingEnabled = false;

    // 背景マット（カジノグリーン風ドット枠）
    ctx.fillStyle = '#064e3b';
    ctx.fillRect(2, 2, w - 4, h - 4);
    ctx.strokeStyle = '#14131a';
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, w - 2, h - 2);

    const count = values.length;
    const dieSize = count === 1 ? 42 : 34;
    const gap = 8;
    const totalW = count * dieSize + (count - 1) * gap;
    const startX = Math.floor((w - totalW) / 2);
    const baseY = Math.floor((h - dieSize) / 2) - 4;

    const pipCoords = {
      1: [[0.5, 0.5]],
      2: [[0.26, 0.26], [0.74, 0.74]],
      3: [[0.26, 0.26], [0.5, 0.5], [0.74, 0.74]],
      4: [[0.26, 0.26], [0.74, 0.26], [0.26, 0.74], [0.74, 0.74]],
      5: [[0.26, 0.26], [0.74, 0.26], [0.5, 0.5], [0.26, 0.74], [0.74, 0.74]],
      6: [[0.26, 0.24], [0.74, 0.24], [0.26, 0.5], [0.74, 0.5], [0.26, 0.76], [0.74, 0.76]]
    };

    values.forEach((val, idx) => {
      const dx = startX + idx * (dieSize + gap);
      const dy = baseY + (idx % 2 === 0 ? bounceOffset : -bounceOffset);

      // 影
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      ctx.fillRect(dx + 3, baseY + dieSize + 1, dieSize, 4);

      // サイコロ外枠
      ctx.fillStyle = '#14131a';
      ctx.fillRect(dx - 2, dy - 2, dieSize + 4, dieSize + 4);

      // サイコロ立体下部シャドウ
      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(dx, dy, dieSize, dieSize);

      // サイコロ上面ホワイト
      ctx.fillStyle = isRolling ? '#fef9c3' : '#ffffff';
      ctx.fillRect(dx, dy, dieSize - 3, dieSize - 3);

      // ピップ（目）の描画
      const pips = pipCoords[val] || pipCoords[1];
      const pipSize = val === 1 ? 8 : 5;
      pips.forEach(([px, py]) => {
        const rx = Math.round(dx + (dieSize - 2) * px - pipSize / 2);
        const ry = Math.round(dy + (dieSize - 2) * py - pipSize / 2);
        ctx.fillStyle = val === 1 ? '#dc2626' : '#14131a';
        ctx.fillRect(rx, ry, pipSize, pipSize);
      });
    });

    // 下部合計ラベル
    const sum = values.reduce((a, b) => a + b, 0);
    ctx.font = 'bold 11px "DotGothic16", monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#fef08a';
    ctx.fillText(isRolling ? 'ROLLING...' : `出目: ${sum}`, Math.floor(w / 2), h - 6);
  }

  /**
   * サイコロを振るアニメーションPromise
   * @param {number[]} finalValues 最終出目の配列 (例: [4] または [3, 5])
   */
  rollDice(finalValues = [6], fastMode = false) {
    if (this.isRolling) return Promise.resolve(finalValues);
    this.isRolling = true;
    const duration = fastMode ? 360 : 820;
    const startTime = performance.now();
    let lastSound = 0;

    return new Promise((resolve) => {
      const step = (now) => {
        const elapsed = now - startTime;
        const t = Math.min(1, elapsed / duration);

        if (elapsed - lastSound > 85) {
          lastSound = elapsed;
          if (window.soundEngine) window.soundEngine.playDiceRoll();
        }

        const tempVals = finalValues.map(() => Math.floor(Math.random() * 6) + 1);
        const bounce = Math.round(Math.sin(t * Math.PI * 6) * 4 * (1 - t));
        this.drawDice(tempVals, true, bounce);

        if (t < 1) {
          requestAnimationFrame(step);
        } else {
          this.diceValues = finalValues;
          this.isRolling = false;
          this.drawDice(finalValues, false, 0);
          if (window.soundEngine) window.soundEngine.playRouletteResult();
          resolve(finalValues);
        }
      };
      requestAnimationFrame(step);
    });
  }
}

window.widgetsController = new PixelWidgetsController();
