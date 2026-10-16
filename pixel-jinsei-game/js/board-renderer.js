/**
 * ドット絵ボードゲーム盤面レンダラー (Canvas 2D Pixel Art Engine)
 * ・全108マス＋4大分岐ルートを、1マスずつイベント名・金額・ドット絵アイコンが
 *   はっきり読める大型ピクセルタイルとして描画します。
 * ・現在の手番プレイヤーから「あと何マス（出目いくつ）」で到達できるかを前方のマスに表示します。
 * ・6色の自動車コマ（配偶者ピン・子どもピン乗車）が1マスずつ跳ねて進むアニメーションを描画します。
 */
class BoardRenderer {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas ? this.canvas.getContext('2d') : null;

    // 1マスのグリッド間隔とタイル寸法（文字とドット絵がはっきり見える大きめ設計）
    this.cellW = 176;
    this.cellH = 114;
    this.tileW = 148;
    this.tileH = 86;
    this.padX = 140;
    this.padY = 120;

    // カメラ状態
    this.camX = 0;
    this.camY = 0;
    this.zoom = 0.95;
    this.targetCamX = 0;
    this.targetCamY = 0;
    this.targetZoom = 0.95;
    this.autoFollow = true;

    // インタラクション状態
    this.isDragging = false;
    this.dragStartX = 0;
    this.dragStartY = 0;
    this.camStartX = 0;
    this.camStartY = 0;
    this.hoveredSpaceId = null;
    this.selectedSpaceId = 0;
    this.reachableDistances = new Map(); // spaceId -> stepDistance (1..12)

    // アニメーション用車コマ座標オーバーライド (playerId -> {x, y, hopY})
    this.tokenAnimPositions = new Map();
    this.decorations = [];
    this.animTick = 0;

    this.onSpaceHover = null;
    this.onSpaceClick = null;

    this.initDecorations();
    this.bindEvents();
    this.startRenderLoop();
  }

  spaceToWorld(space) {
    return {
      x: this.padX + space.x * this.cellW,
      y: this.padY + space.y * this.cellH
    };
  }

  initDecorations() {
    // マスの周囲に配置するドット絵の木・花・海・家・ビル装飾データを生成
    this.decorations = [];
    const occupied = new Set();
    window.GAME_DATA.BOARD_SPACES.forEach((sp) => {
      occupied.add(`${sp.x},${sp.y}`);
    });

    for (let gx = -1; gx <= 13; gx++) {
      for (let gy = 0; gy <= 17; gy++) {
        if (occupied.has(`${gx},${gy}`)) continue;
        const hash = Math.abs(Math.sin(gx * 12.9898 + gy * 78.233) * 43758.5453) % 1;
        if (hash < 0.42) {
          let kind = 'tree';
          if (gy >= 9 && gy <= 11 && gx <= 6) kind = 'palm';
          else if (gy >= 13 && gx >= 7) kind = 'gold_tree';
          else if (hash < 0.12) kind = 'house_deco';
          else if (hash < 0.22) kind = 'flower';
          this.decorations.push({
            wx: this.padX + gx * this.cellW + (hash - 0.2) * 35,
            wy: this.padY + gy * this.cellH + ((hash * 7) % 1 - 0.5) * 25,
            kind,
            variant: Math.floor(hash * 10)
          });
        }
      }
    }
  }

  bindEvents() {
    if (!this.canvas) return;

    const resize = () => {
      const rect = this.canvas.parentElement.getBoundingClientRect();
      this.canvas.width = Math.max(320, Math.floor(rect.width));
      this.canvas.height = Math.max(260, Math.floor(rect.height));
      if (this.ctx) this.ctx.imageSmoothingEnabled = false;
    };
    window.addEventListener('resize', resize);
    setTimeout(resize, 30);

    // マウスドラッグ＆ホバー
    this.canvas.addEventListener('mousedown', (e) => {
      this.isDragging = true;
      this.dragMoved = false;
      this.dragStartX = e.clientX;
      this.dragStartY = e.clientY;
      this.camStartX = this.targetCamX;
      this.camStartY = this.targetCamY;
    });

    window.addEventListener('mousemove', (e) => {
      if (!this.canvas) return;
      if (this.isDragging) {
        const dx = e.clientX - this.dragStartX;
        const dy = e.clientY - this.dragStartY;
        if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
          this.dragMoved = true;
          this.autoFollow = false;
        }
        this.targetCamX = this.camStartX - dx / this.zoom;
        this.targetCamY = this.camStartY - dy / this.zoom;
        return;
      }

      const rect = this.canvas.getBoundingClientRect();
      if (
        e.clientX < rect.left || e.clientX > rect.right ||
        e.clientY < rect.top || e.clientY > rect.bottom
      ) {
        return;
      }
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const hit = this.hitTestSpace(mx, my);
      if (hit !== this.hoveredSpaceId) {
        this.hoveredSpaceId = hit;
        this.canvas.style.cursor = hit !== null ? 'pointer' : 'grab';
        if (hit !== null && this.onSpaceHover) {
          this.onSpaceHover(hit);
        }
      }
    });

    window.addEventListener('mouseup', () => {
      if (this.isDragging && !this.dragMoved && this.hoveredSpaceId !== null) {
        this.selectedSpaceId = this.hoveredSpaceId;
        if (window.soundEngine) window.soundEngine.playClick();
        if (this.onSpaceClick) this.onSpaceClick(this.hoveredSpaceId);
      }
      this.isDragging = false;
    });

    // ホイールズーム
    this.canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const factor = e.deltaY < 0 ? 1.12 : 0.89;
      this.setZoom(this.targetZoom * factor);
    }, { passive: false });

    // タッチ操作対応
    let touchStart = null;
    this.canvas.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        touchStart = {
          x: e.touches[0].clientX,
          y: e.touches[0].clientY,
          camX: this.targetCamX,
          camY: this.targetCamY,
          moved: false
        };
      }
    }, { passive: true });

    this.canvas.addEventListener('touchmove', (e) => {
      if (touchStart && e.touches.length === 1) {
        const dx = e.touches[0].clientX - touchStart.x;
        const dy = e.touches[0].clientY - touchStart.y;
        if (Math.abs(dx) > 6 || Math.abs(dy) > 6) {
          touchStart.moved = true;
          this.autoFollow = false;
        }
        this.targetCamX = touchStart.camX - dx / this.zoom;
        this.targetCamY = touchStart.camY - dy / this.zoom;
      }
    }, { passive: true });

    this.canvas.addEventListener('touchend', (e) => {
      if (touchStart && !touchStart.moved && e.changedTouches.length === 1) {
        const rect = this.canvas.getBoundingClientRect();
        const mx = e.changedTouches[0].clientX - rect.left;
        const my = e.changedTouches[0].clientY - rect.top;
        const hit = this.hitTestSpace(mx, my);
        if (hit !== null) {
          this.selectedSpaceId = hit;
          if (this.onSpaceHover) this.onSpaceHover(hit);
          if (this.onSpaceClick) this.onSpaceClick(hit);
        }
      }
      touchStart = null;
    });
  }

  setZoom(newZoom) {
    this.targetZoom = Math.max(0.38, Math.min(1.65, newZoom));
  }

  focusOnSpace(spaceId, immediate = false) {
    const sp = window.GAME_DATA.BOARD_SPACES[spaceId];
    if (!sp) return;
    const pos = this.spaceToWorld(sp);
    this.targetCamX = pos.x;
    this.targetCamY = pos.y;
    this.selectedSpaceId = spaceId;
    if (immediate) {
      this.camX = pos.x;
      this.camY = pos.y;
    }
  }

  fitWholeBoard() {
    this.autoFollow = false;
    this.targetCamX = this.padX + 6 * this.cellW;
    this.targetCamY = this.padY + 8.2 * this.cellH;
    this.targetZoom = 0.44;
  }

  hitTestSpace(screenX, screenY) {
    if (!this.canvas) return null;
    const worldX = (screenX - this.canvas.width / 2) / this.zoom + this.camX;
    const worldY = (screenY - this.canvas.height / 2) / this.zoom + this.camY;

    const spaces = window.GAME_DATA.BOARD_SPACES;
    for (let i = spaces.length - 1; i >= 0; i--) {
      const sp = spaces[i];
      const pos = this.spaceToWorld(sp);
      const halfW = this.tileW / 2;
      const halfH = this.tileH / 2;
      if (
        worldX >= pos.x - halfW && worldX <= pos.x + halfW &&
        worldY >= pos.y - halfH && worldY <= pos.y + halfH
      ) {
        return sp.id;
      }
    }
    return null;
  }

  /**
   * 現在のプレイヤー位置から到達可能なマスと必要歩数(1〜10)を計算
   */
  updateReachableFrom(startSpaceId) {
    this.reachableDistances.clear();
    const spaces = window.GAME_DATA.BOARD_SPACES;
    const queue = [{ id: startSpaceId, dist: 0 }];

    while (queue.length > 0) {
      const { id, dist } = queue.shift();
      if (dist >= 10) continue;
      const sp = spaces[id];
      if (!sp || !sp.next) continue;

      // ストップマスは（開始マス自身でない限り）そこで強制停止になる
      const isStop = dist > 0 && sp.type.startsWith('stop_');
      if (isStop) continue;

      sp.next.forEach((nextId) => {
        const nextDist = dist + 1;
        if (!this.reachableDistances.has(nextId) || this.reachableDistances.get(nextId) > nextDist) {
          this.reachableDistances.set(nextId, nextDist);
          queue.push({ id: nextId, dist: nextDist });
        }
      });
    }
  }

  /**
   * プレイヤーの車が1マス進んだ時のジャンプアニメーション
   */
  animateStepMove(playerId, fromSpaceId, toSpaceId, duration = 210) {
    const spaces = window.GAME_DATA.BOARD_SPACES;
    const fromSp = spaces[fromSpaceId];
    const toSp = spaces[toSpaceId];
    if (!fromSp || !toSp) return Promise.resolve();

    const p1 = this.spaceToWorld(fromSp);
    const p2 = this.spaceToWorld(toSp);
    const startTime = performance.now();

    if (this.autoFollow) {
      this.targetCamX = p2.x;
      this.targetCamY = p2.y;
    }

    return new Promise((resolve) => {
      const step = (now) => {
        const t = Math.min(1, (now - startTime) / duration);
        const curX = p1.x + (p2.x - p1.x) * t;
        const curY = p1.y + (p2.y - p1.y) * t;
        const hopY = -Math.sin(t * Math.PI) * 18;
        this.tokenAnimPositions.set(playerId, { x: curX, y: curY, hopY });

        if (t < 1) {
          requestAnimationFrame(step);
        } else {
          this.tokenAnimPositions.delete(playerId);
          resolve();
        }
      };
      requestAnimationFrame(step);
    });
  }

  startRenderLoop() {
    const loop = () => {
      this.animTick++;
      this.camX += (this.targetCamX - this.camX) * 0.18;
      this.camY += (this.targetCamY - this.camY) * 0.18;
      this.zoom += (this.targetZoom - this.zoom) * 0.2;
      this.render();
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  render() {
    const canvas = this.canvas;
    const ctx = this.ctx;
    if (!canvas || !ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    ctx.imageSmoothingEnabled = false;

    // 1. 画面全体のベース背景（ドット絵草原＆海）
    ctx.fillStyle = '#155e75';
    ctx.fillRect(0, 0, w, h);

    ctx.save();
    ctx.translate(Math.floor(w / 2), Math.floor(h / 2));
    ctx.scale(this.zoom, this.zoom);
    ctx.translate(-Math.floor(this.camX), -Math.floor(this.camY));

    this.drawWorldZones(ctx);
    this.drawDecorations(ctx);
    this.drawRoads(ctx);
    this.drawSpaces(ctx);
    this.drawPlayerCars(ctx);

    ctx.restore();
  }

  /**
   * 第1章〜第6章のエリア別ドット背景ゾーン描画
   */
  drawWorldZones(ctx) {
    const totalW = this.padX * 2 + 13 * this.cellW;
    const totalH = this.padY * 2 + 17 * this.cellH;

    // 外周の海ドット縁取り
    ctx.fillStyle = '#0ea5e9';
    ctx.fillRect(-120, -120, totalW + 240, totalH + 240);

    // 砂浜の縁
    ctx.fillStyle = '#fde68a';
    ctx.fillRect(-30, -30, totalW + 60, totalH + 60);

    // メイン大陸（草原グリーン）
    ctx.fillStyle = '#22c55e';
    ctx.fillRect(0, 0, totalW, totalH);

    // 章ごとのバイオーム色分け帯
    const zones = [
      { y1: 0, y2: 3.6, col: '#4ade80', label: '【第1章】青春・学園＆進路選択エリア' },
      { y1: 3.6, y2: 5.2, col: '#86efac', label: '【第2章】新社会人・キャリア＆結婚式エリア' },
      { y1: 5.2, y2: 9.5, col: '#34d399', label: '【第3章】家族誕生・マイホーム＆分岐エリア' },
      { y1: 9.5, y2: 12.6, col: '#38bdf8', label: '【第4章】世界一周バカンス海浜 ＆ エリート摩天楼エリア' },
      { y1: 12.6, y2: 14.3, col: '#fbbf24', label: '【第5章】後半資産形成・バブル＆決算ゲートエリア' },
      { y1: 14.3, y2: 17.5, col: '#fde047', label: '【第6章】ファイナル渓谷 ＆ 億万長者の館ゴールエリア' }
    ];

    zones.forEach((z) => {
      const sy = this.padY + (z.y1 - 0.5) * this.cellH;
      const sh = (z.y2 - z.y1) * this.cellH;
      ctx.fillStyle = z.col;
      ctx.fillRect(20, sy, totalW - 40, sh);

      // エリア見出し看板（ドット枠）
      ctx.fillStyle = 'rgba(20, 19, 26, 0.78)';
      ctx.fillRect(36, sy + 10, 360, 26);
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 2;
      ctx.strokeRect(36, sy + 10, 360, 26);
      ctx.font = 'bold 13px "DotGothic16", monospace';
      ctx.fillStyle = '#fef08a';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(z.label, 48, sy + 23);
    });
  }

  /**
   * 周囲のドット絵木・ヤシの木・花・ミニ建物の描画
   */
  drawDecorations(ctx) {
    this.decorations.forEach((d) => {
      const x = Math.round(d.wx);
      const y = Math.round(d.wy);
      if (d.kind === 'tree' || d.kind === 'gold_tree') {
        // ドット絵の木
        ctx.fillStyle = 'rgba(0,0,0,0.22)';
        ctx.fillRect(x - 10, y + 10, 20, 6);
        ctx.fillStyle = '#78350f';
        ctx.fillRect(x - 4, y, 8, 12);
        ctx.fillStyle = '#14131a';
        ctx.fillRect(x - 14, y - 16, 28, 18);
        ctx.fillStyle = d.kind === 'gold_tree' ? '#f59e0b' : '#15803d';
        ctx.fillRect(x - 12, y - 14, 24, 14);
        ctx.fillStyle = d.kind === 'gold_tree' ? '#fde047' : '#22c55e';
        ctx.fillRect(x - 8, y - 20, 16, 10);
      } else if (d.kind === 'palm') {
        // ヤシの木
        ctx.fillStyle = '#92400e';
        ctx.fillRect(x - 3, y - 6, 6, 18);
        ctx.fillStyle = '#16a34a';
        ctx.fillRect(x - 16, y - 14, 32, 6);
        ctx.fillRect(x - 10, y - 20, 20, 6);
      } else if (d.kind === 'flower') {
        ctx.fillStyle = '#166534';
        ctx.fillRect(x - 4, y, 8, 4);
        ctx.fillStyle = d.variant % 2 === 0 ? '#f43f5e' : '#ffffff';
        ctx.fillRect(x - 4, y - 4, 4, 4);
        ctx.fillRect(x + 2, y - 2, 4, 4);
      } else if (d.kind === 'house_deco' && window.pixelArt) {
        const hc = window.pixelArt.getHouseCanvas(d.variant % 6, 2);
        ctx.drawImage(hc, x - 24, y - 20);
      }
    });
  }

  /**
   * マス目間をつなぐドット絵道路と矢印を描画
   */
  drawRoads(ctx) {
    const spaces = window.GAME_DATA.BOARD_SPACES;

    spaces.forEach((sp) => {
      if (!sp.next || sp.next.length === 0) return;
      const p1 = this.spaceToWorld(sp);

      sp.next.forEach((nextId, branchIdx) => {
        const nextSp = spaces[nextId];
        if (!nextSp) return;
        const p2 = this.spaceToWorld(nextSp);

        // 道路の黒縁
        ctx.strokeStyle = '#14131a';
        ctx.lineWidth = 22;
        ctx.lineCap = 'square';
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();

        // アスファルト舗装（分岐時は色味を変えてわかりやすくする）
        ctx.strokeStyle = sp.next.length > 1
          ? (branchIdx === 0 ? '#2563eb' : '#9333ea')
          : '#475569';
        ctx.lineWidth = 16;
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();

        // センター破線
        ctx.save();
        ctx.strokeStyle = '#fef08a';
        ctx.lineWidth = 3;
        ctx.setLineDash([8, 8]);
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
        ctx.restore();

        // 進行方向矢印（中間点）
        const mx = (p1.x + p2.x) / 2;
        const my = (p1.y + p2.y) / 2;
        const ang = Math.atan2(p2.y - p1.y, p2.x - p1.x);
        ctx.save();
        ctx.translate(mx, my);
        ctx.rotate(ang);
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.moveTo(7, 0);
        ctx.lineTo(-5, -6);
        ctx.lineTo(-5, 6);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      });
    });
  }

  /**
   * 全108マスのタイル・アイコン・イベント名・金額を描画
   */
  drawSpaces(ctx) {
    const spaces = window.GAME_DATA.BOARD_SPACES;

    spaces.forEach((sp) => {
      const pos = this.spaceToWorld(sp);
      const x = Math.round(pos.x - this.tileW / 2);
      const y = Math.round(pos.y - this.tileH / 2);
      const w = this.tileW;
      const h = this.tileH;

      const isHovered = this.hoveredSpaceId === sp.id;
      const isSelected = this.selectedSpaceId === sp.id;
      const reachDist = this.reachableDistances.get(sp.id);

      // マス種別ごとのカラーテーマ設定
      const theme = this.getSpaceTheme(sp);

      // ドロップシャドウ
      ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
      ctx.fillRect(x + 4, y + 5, w, h);

      // ホバー・選択・到達可能枠ハイライト
      if (isHovered || isSelected) {
        ctx.fillStyle = '#facc15';
        ctx.fillRect(x - 4, y - 4, w + 8, h + 8);
      } else if (reachDist !== undefined) {
        ctx.fillStyle = 'rgba(250, 204, 21, 0.75)';
        ctx.fillRect(x - 2, y - 2, w + 4, h + 4);
      }

      // タイル外枠（黒ピクセル枠）
      ctx.fillStyle = '#14131a';
      ctx.fillRect(x, y, w, h);

      // タイル本体背景
      ctx.fillStyle = theme.bg;
      ctx.fillRect(x + 3, y + 3, w - 6, h - 6);

      // 上部ヘッダーバー
      ctx.fillStyle = theme.header;
      ctx.fillRect(x + 3, y + 3, w - 6, 22);
      ctx.fillStyle = '#14131a';
      ctx.fillRect(x + 3, y + 25, w - 6, 2);

      // マス番号バッジ & 種別ラベル
      ctx.font = 'bold 11px "DotGothic16", monospace';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = theme.headerText;
      ctx.fillText(`#${sp.id} ${theme.badge}`, x + 8, y + 14);

      // 16x16 ドット絵アイコン（2倍=32x32で左側に描画）
      if (window.pixelArt) {
        const iconCanvas = window.pixelArt.getIconCanvas(sp.icon || 'start', 2);
        ctx.drawImage(iconCanvas, x + 7, y + 32);
      }

      // マスのイベント名（タイトル）をくっきり描画
      ctx.font = 'bold 12px "DotGothic16", monospace';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillStyle = '#14131a';
      ctx.fillText(sp.title, x + 42, y + 31);

      // サブテキスト（金額・効果）を色分けバッジで下部に描画
      ctx.fillStyle = theme.subBg;
      ctx.fillRect(x + 41, y + 52, w - 47, 24);
      ctx.strokeStyle = '#14131a';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(x + 41, y + 52, w - 47, 24);

      ctx.font = 'bold 11px "DotGothic16", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = theme.subTextCol;
      ctx.fillText(sp.subText || '', x + 41 + (w - 47) / 2, y + 64);

      // 現在のプレイヤーから「あとNマス！」バッジ（右上）
      if (reachDist !== undefined) {
        const bx = x + w - 48;
        const by = y - 9;
        ctx.fillStyle = '#14131a';
        ctx.fillRect(bx, by, 52, 18);
        ctx.fillStyle = reachDist <= 6 ? '#38bdf8' : '#facc15';
        ctx.fillRect(bx + 2, by + 2, 48, 14);
        ctx.font = 'bold 10px "DotGothic16", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#14131a';
        ctx.fillText(`あと${reachDist}マス`, bx + 26, by + 9);
      }
    });
  }

  getSpaceTheme(sp) {
    if (sp.type === 'start') {
      return { bg: '#fef9c3', header: '#16a34a', headerText: '#ffffff', badge: 'START', subBg: '#dcfce7', subTextCol: '#166534' };
    }
    if (sp.type === 'goal') {
      return { bg: '#fef08a', header: '#b45309', headerText: '#fef08a', badge: '👑GOAL!', subBg: '#78350f', subTextCol: '#fef08a' };
    }
    if (sp.type.startsWith('stop_')) {
      return { bg: '#fae8ff', header: '#9333ea', headerText: '#ffffff', badge: '🛑STOP!', subBg: '#7e22ce', subTextCol: '#fef08a' };
    }
    if (sp.type === 'payday') {
      return { bg: '#fef9c3', header: '#eab308', headerText: '#14131a', badge: '💰給料日', subBg: '#ca8a04', subTextCol: '#ffffff' };
    }
    if (sp.type === 'dice_event') {
      return { bg: '#e0f2fe', header: '#0284c7', headerText: '#ffffff', badge: '🎲ダイス', subBg: '#0369a1', subTextCol: '#fef08a' };
    }
    if (sp.type === 'roulette_event') {
      return { bg: '#ffedd5', header: '#ea580c', headerText: '#ffffff', badge: '🎡抽選', subBg: '#c2410c', subTextCol: '#ffffff' };
    }
    if (sp.type === 'baby' || sp.type === 'wedding') {
      return { bg: '#fce7f3', header: '#db2777', headerText: '#ffffff', badge: '💖家族', subBg: '#fbcfe8', subTextCol: '#9d174d' };
    }
    if (sp.type === 'rankup' || sp.type === 'job_change') {
      return { bg: '#dcfce7', header: '#15803d', headerText: '#ffffff', badge: '💼仕事', subBg: '#bbf7d0', subTextCol: '#14532d' };
    }
    if (sp.type === 'treasure' || sp.type === 'stock' || sp.type === 'insurance') {
      return { bg: '#ede9fe', header: '#4f46e5', headerText: '#ffffff', badge: '💎資産', subBg: '#ddd6fe', subTextCol: '#312e81' };
    }
    if (sp.type === 'trouble' || (sp.type === 'cash' && sp.amount < 0)) {
      return { bg: '#fee2e2', header: '#dc2626', headerText: '#ffffff', badge: '💸出費', subBg: '#fecaca', subTextCol: '#991b1b' };
    }
    if (sp.type === 'revenge') {
      return { bg: '#fef3c7', header: '#b91c1c', headerText: '#fef08a', badge: '⚡逆転', subBg: '#991b1b', subTextCol: '#fef08a' };
    }
    return { bg: '#f0fdf4', header: '#2563eb', headerText: '#ffffff', badge: '✨イベント', subBg: '#dbeafe', subTextCol: '#1e40af' };
  }

  /**
   * 全プレイヤーの自動車コマ＋乗車している家族ピンを描画
   */
  drawPlayerCars(ctx) {
    if (!window.gameEngine || !window.gameEngine.state) return;
    const players = window.gameEngine.state.players || [];
    const currentTurnIdx = window.gameEngine.state.currentPlayerIndex;

    // 同じマスにいるプレイヤーをグループ化してオフセット計算
    const groups = new Map();
    players.forEach((p, idx) => {
      const list = groups.get(p.position) || [];
      list.push({ player: p, idx });
      groups.set(p.position, list);
    });

    players.forEach((p, idx) => {
      const colorObj = window.GAME_DATA.PLAYER_COLORS[p.colorIndex % window.GAME_DATA.PLAYER_COLORS.length];
      const carCanvas = window.pixelArt.getCarSpriteCanvas(
        colorObj.hex,
        colorObj.dark,
        p.married,
        p.children,
        p.debts,
        2
      );

      let wx = 0;
      let wy = 0;
      let hopY = 0;

      if (this.tokenAnimPositions.has(p.id)) {
        const anim = this.tokenAnimPositions.get(p.id);
        wx = anim.x;
        wy = anim.y;
        hopY = anim.hopY;
      } else {
        const sp = window.GAME_DATA.BOARD_SPACES[p.position] || window.GAME_DATA.BOARD_SPACES[0];
        const basePos = this.spaceToWorld(sp);
        const sameGroup = groups.get(p.position) || [{ player: p, idx }];
        const slot = sameGroup.findIndex((item) => item.player.id === p.id);
        const totalInSlot = sameGroup.length;

        const offsets = [
          { dx: -36, dy: -32 },
          { dx: 36, dy: -32 },
          { dx: -42, dy: 24 },
          { dx: 42, dy: 24 },
          { dx: 0, dy: -38 },
          { dx: 0, dy: 30 }
        ];
        const off = totalInSlot === 1 ? { dx: 0, dy: -26 } : offsets[slot % offsets.length];
        wx = basePos.x + off.dx;
        wy = basePos.y + off.dy;

        if (idx === currentTurnIdx) {
          hopY = Math.round(Math.sin(this.animTick * 0.12) * 4);
        }
      }

      const drawX = Math.round(wx - carCanvas.width / 2);
      const drawY = Math.round(wy - carCanvas.height / 2 + hopY);

      // 現在の手番プレイヤーには頭上に光る「▼ YOUR TURN」マーカーを表示
      if (idx === currentTurnIdx) {
        ctx.fillStyle = '#14131a';
        ctx.fillRect(drawX - 4, drawY - 20, carCanvas.width + 8, 16);
        ctx.fillStyle = colorObj.hex;
        ctx.fillRect(drawX - 2, drawY - 18, carCanvas.width + 4, 12);
        ctx.font = 'bold 10px "DotGothic16", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#ffffff';
        ctx.fillText(`▼${p.name.slice(0, 5)}`, Math.round(wx), drawY - 12);
      }

      ctx.drawImage(carCanvas, drawX, drawY);
    });
  }
}

window.BoardRenderer = BoardRenderer;
