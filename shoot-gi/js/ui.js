/* ========================================
   ui.js - UI Rendering and Interaction
   ======================================== */

class GameUI {
  constructor() {
    this.selectedCard = null;     // index in hand
    this.selectedPiece = null;    // { row, col }
    this.validMoves = [];
    this.validAttacks = [];
    this.placementCells = [];
    this.pendingSkill = null;     // Skill waiting for target selection
    this.activatingPiece = null;  // { row, col } of piece being activated
  }

  renderBoard(game) {
    const boardEl = document.getElementById('board');
    boardEl.innerHTML = '';

    for (let r = 0; r < 6; r++) {
      for (let c = 0; c < 6; c++) {
        const cell = document.createElement('div');
        cell.className = 'cell';
        cell.dataset.row = r;
        cell.dataset.col = c;

        // Highlight cells
        if (this.validMoves.some(m => m.row === r && m.col === c)) {
          cell.classList.add('highlight');
        }
        if (this.validAttacks.some(m => m.row === r && m.col === c)) {
          cell.classList.add('attack-target');
        }
        if (this.placementCells.some(m => m.row === r && m.col === c)) {
          cell.classList.add('place-target');
        }
        if (this.selectedPiece && this.selectedPiece.row === r && this.selectedPiece.col === c) {
          cell.classList.add('selected-cell');
        }

        // Territory dividing line visual at row 2
        // (handled via CSS)

        const piece = game.board[r][c];
        if (piece) {
          const pieceEl = document.createElement('div');
          pieceEl.className = `piece ${piece.owner === 'player' ? 'player-piece' : 'enemy-piece'}`;
          if (piece.awakened) pieceEl.classList.add('awakened');
          if (piece.movedThisTurn) pieceEl.classList.add('moved-this-turn');

          const nameEl = document.createElement('span');
          nameEl.className = 'piece-name';
          nameEl.textContent = piece.kanji;
          pieceEl.appendChild(nameEl);

          if (piece.awakened) {
            const statusEl = document.createElement('span');
            statusEl.className = 'piece-status';
            statusEl.textContent = '覚';
            pieceEl.appendChild(statusEl);
          }

          cell.appendChild(pieceEl);

          // Tooltip on hover
          cell.addEventListener('mouseenter', (e) => this.showTooltip(e, piece, game));
          cell.addEventListener('mouseleave', () => this.hideTooltip());
        }

        cell.addEventListener('click', () => this.onCellClick(r, c, game));
        boardEl.appendChild(cell);
      }
    }
  }

  renderHand(game, who) {
    const containerId = who === 'player' ? 'player-hand' : 'enemy-hand';
    const container = document.getElementById(containerId);
    container.innerHTML = '';

    const state = game.getState(who);
    state.hand.forEach((card, idx) => {
      const cardEl = document.createElement('div');
      
      if (who === 'player') {
        cardEl.className = 'hand-card player-card';
        if (this.selectedCard === idx) cardEl.classList.add('selected');

        const nameEl = document.createElement('span');
        nameEl.className = 'card-piece-name';
        nameEl.textContent = card.kanji;
        cardEl.appendChild(nameEl);

        const skillEl = document.createElement('span');
        skillEl.className = 'card-skill-name';
        skillEl.textContent = card.skill.name;
        cardEl.appendChild(skillEl);

        const typeEl = document.createElement('span');
        const typeClass = card.skill.type === 'passive' ? 'skill-type-passive' :
                          card.skill.type === 'active' ? 'skill-type-active' : 'skill-type-counter';
        typeEl.className = `card-skill-type ${typeClass}`;
        typeEl.textContent = card.skill.type === 'passive' ? '持続' :
                             card.skill.type === 'active' ? '発動' : '反撃';
        cardEl.appendChild(typeEl);

        cardEl.addEventListener('click', () => this.onCardClick(idx, game));
        // Card tooltip
        cardEl.addEventListener('mouseenter', (e) => this.showCardTooltip(e, card, game));
        cardEl.addEventListener('mouseleave', () => this.hideTooltip());
      } else {
        cardEl.className = 'hand-card enemy-card';
      }

      container.appendChild(cardEl);
    });
  }

  renderPhase(game) {
    const phases = ['draw', 'move', 'place', 'activate'];
    const phaseMap = { draw: 'draw', move: 'move', place: 'place', activate: 'activate' };
    
    document.querySelectorAll('.phase-step').forEach(el => {
      const phase = el.dataset.phase;
      el.classList.remove('active-phase', 'done-phase');
      
      const currentIdx = phases.indexOf(game.phase);
      const thisIdx = phases.indexOf(phase);
      
      if (phase === game.phase) {
        el.classList.add('active-phase');
      } else if (thisIdx < currentIdx) {
        el.classList.add('done-phase');
      }
    });

    // Show/hide action buttons
    const btnSkipPlace = document.getElementById('btn-skip-place');
    const btnSkipActivate = document.getElementById('btn-skip-activate');
    const btnEndTurn = document.getElementById('btn-end-turn');

    btnSkipPlace.classList.add('hidden');
    btnSkipActivate.classList.add('hidden');
    btnEndTurn.classList.add('hidden');

    if (game.currentPlayer === 'player' && !game.gameOver) {
      if (game.phase === 'place') {
        btnSkipPlace.classList.remove('hidden');
      }
      if (game.phase === 'activate') {
        btnSkipActivate.classList.remove('hidden');
        btnEndTurn.classList.remove('hidden');
      }
    }
  }

  renderInfo(game) {
    document.getElementById('turn-number').textContent = `第${game.turnNumber}陣`;
    document.getElementById('current-player-label').textContent = 
      game.currentPlayer === 'player' ? '― あなたのターン ―' : '― 敵のターン ―';
    
    document.getElementById('player-deck-count').textContent = game.player.deck.length;
    document.getElementById('player-grave-count').textContent = game.player.graveyard.length;
    document.getElementById('enemy-deck-count').textContent = game.enemy.deck.length;
    document.getElementById('enemy-grave-count').textContent = game.enemy.graveyard.length;
  }

  renderAll(game) {
    // Only update non-animated parts smoothly
    this.renderInfo(game);
    this.renderHand(game, 'player');
    this.renderHand(game, 'enemy');
    this.renderPhase(game);
    
    // We defer rendering log completely to prevent scroll jumps
    const logBody = document.getElementById('log-body');
    const currentCount = logBody.children.length;
    if (game.log.length > currentCount) {
      // Append only new logs
      for(let i = currentCount; i < game.log.length; i++) {
        const entry = game.log[i];
        const div = document.createElement('div');
        div.className = `log-entry ${entry.type}`;
        div.textContent = entry.msg;
        logBody.appendChild(div);
      }
      logBody.scrollTop = logBody.scrollHeight;
    }
  }

  // Force full re-render
  renderFull(game) {
    this.renderBoard(game);
    this.renderAll(game);
  }

  clearSelection() {
    this.selectedCard = null;
    this.selectedPiece = null;
    this.validMoves = [];
    this.validAttacks = [];
    this.placementCells = [];
    this.pendingSkill = null;
    this.activatingPiece = null;
  }

  // === Event Handlers (to be wired in main.js) ===

  onCellClick(row, col, game) {
    // Handled by main.js controller
    if (this._onCellClick) this._onCellClick(row, col, game);
  }

  onCardClick(idx, game) {
    if (this._onCardClick) this._onCardClick(idx, game);
  }

  // === Tooltips ===
  showTooltip(e, piece, game) {
    const tooltip = document.getElementById('piece-tooltip');
    const header = document.getElementById('tooltip-header');
    const body = document.getElementById('tooltip-body');

    const classId = game.getPlayerClassId(piece.owner);
    const className = CLASS_SKILLS[classId].name;

    header.textContent = `${piece.name} (${piece.owner === 'player' ? '味方' : '敵'})`;
    
    const typeLabel = piece.skill.type === 'passive' ? '持続' :
                      piece.skill.type === 'active' ? '発動' : '反撃';
    
    body.innerHTML = `
      <div>クラス: <span class="skill-label">${className}</span></div>
      <div>状態: ${piece.awakened ? '<span style="color:#e8d48b">覚醒</span>' : '通常'}</div>
      <div style="margin-top:4px">
        <span class="skill-label">【${typeLabel}】${piece.skill.name}</span><br>
        ${piece.skill.desc}
      </div>
      ${!piece.canFlipBack ? '<div style="color:#c44040;margin-top:4px">※封印済み</div>' : ''}
    `;

    tooltip.classList.remove('hidden');
    this.positionTooltip(e);
  }

  showCardTooltip(e, card, game) {
    const tooltip = document.getElementById('piece-tooltip');
    const header = document.getElementById('tooltip-header');
    const body = document.getElementById('tooltip-body');

    header.textContent = card.name;
    const typeLabel = card.skill.type === 'passive' ? '持続' :
                      card.skill.type === 'active' ? '発動' : '反撃';
    body.innerHTML = `
      <div><span class="skill-label">【${typeLabel}】${card.skill.name}</span></div>
      <div style="margin-top:4px">${card.skill.desc}</div>
    `;

    tooltip.classList.remove('hidden');
    this.positionTooltip(e);
  }

  positionTooltip(e) {
    const tooltip = document.getElementById('piece-tooltip');
    let x = e.clientX + 15;
    let y = e.clientY + 15;
    if (x + 200 > window.innerWidth) x = e.clientX - 200;
    if (y + 150 > window.innerHeight) y = e.clientY - 150;
    tooltip.style.left = x + 'px';
    tooltip.style.top = y + 'px';
  }

  hideTooltip() {
    document.getElementById('piece-tooltip').classList.add('hidden');
  }

  // Skill cut-in animation (Enhanced)
  showCutIn(skillName, callback) {
    const overlay = document.getElementById('skill-cutin');
    const text = document.getElementById('cutin-text');
    text.textContent = skillName;
    overlay.classList.remove('hidden');

    // Re-trigger animation by cloning and replacing
    const newText = text.cloneNode(true);
    text.parentNode.replaceChild(newText, text);
    
    // Add screen shake
    document.getElementById('game-screen').classList.add('anim-shake');

    setTimeout(() => {
      overlay.classList.add('hidden');
      document.getElementById('game-screen').classList.remove('anim-shake');
      if (callback) callback();
    }, 1200);
  }

  // --- New Animations ---

  async showPhaseBanner(phaseName) {
    return new Promise(resolve => {
      const banner = document.getElementById('phase-banner');
      const text = document.getElementById('phase-banner-text');
      text.textContent = phaseName;
      
      banner.classList.remove('hidden');
      // trigger animation
      const newBg = banner.querySelector('.phase-banner-bg').cloneNode(true);
      const newText = text.cloneNode(true);
      banner.replaceChild(newBg, banner.querySelector('.phase-banner-bg'));
      banner.replaceChild(newText, text);

      setTimeout(() => {
        banner.classList.add('hidden');
        resolve();
      }, 1500);
    });
  }

  async animateDrawCard(who, cardKanji) {
    return new Promise(resolve => {
      const effectLayer = document.getElementById('effects-layer');
      const cardEl = document.createElement('div');
      
      if (who === 'player') {
        cardEl.className = 'anim-draw-card';
        cardEl.innerHTML = `<span class="card-piece-name">${cardKanji}</span>`;
        // Target is player hand center roughly
        cardEl.style.setProperty('--target-x', 'calc(50vw - 26px)');
        cardEl.style.setProperty('--target-y', 'calc(90vh - 35px)');
      } else {
        cardEl.className = 'anim-draw-card enemy';
        cardEl.style.setProperty('--target-x', 'calc(50vw - 19px)');
        cardEl.style.setProperty('--target-y', 'calc(10vh - 25px)');
      }
      
      effectLayer.appendChild(cardEl);
      
      setTimeout(() => {
        cardEl.remove();
        resolve();
      }, 600);
    });
  }

  async animatePlacePiece(toRow, toCol, isPlayer, kanji) {
    return new Promise(resolve => {
      const cell = document.querySelector(`.cell[data-row="${toRow}"][data-col="${toCol}"]`);
      if (!cell) return resolve();
      
      const rect = cell.getBoundingClientRect();
      const effectLayer = document.getElementById('effects-layer');
      
      const pieceEl = document.createElement('div');
      pieceEl.className = `piece anim-place-piece ${isPlayer ? 'player-piece' : 'enemy-piece'}`;
      pieceEl.innerHTML = `<span class="piece-name">${kanji}</span>`;
      pieceEl.style.position = 'absolute';
      pieceEl.style.left = `${rect.left + (rect.width * 0.075)}px`;
      pieceEl.style.top = `${rect.top + (rect.height * 0.075)}px`;
      pieceEl.style.width = `${rect.width * 0.85}px`;
      pieceEl.style.height = `${rect.height * 0.85}px`;
      
      effectLayer.appendChild(pieceEl);
      document.getElementById('game-screen').classList.add('anim-shake');
      
      this.showVfxText('召集', rect.left + rect.width/2, rect.top + rect.height/2, 'heal');

      setTimeout(() => {
        pieceEl.remove();
        document.getElementById('game-screen').classList.remove('anim-shake');
        resolve();
      }, 400);
    });
  }

  async animateMovePiece(fromRow, fromCol, toRow, toCol) {
    return new Promise(resolve => {
      const fromCell = document.querySelector(`.cell[data-row="${fromRow}"][data-col="${fromCol}"]`);
      const toCell = document.querySelector(`.cell[data-row="${toRow}"][data-col="${toCol}"]`);
      const piece = fromCell ? fromCell.querySelector('.piece') : null;
      
      if (!piece || !toCell) return resolve();

      const fromRect = fromCell.getBoundingClientRect();
      const toRect = toCell.getBoundingClientRect();
      
      const dx = toRect.left - fromRect.left;
      const dy = toRect.top - fromRect.top;
      
      piece.classList.add('anim-move-piece');
      piece.style.transform = `translate(${dx}px, ${dy}px) ${piece.classList.contains('enemy-piece') ? 'rotate(180deg)' : ''}`;
      
      setTimeout(() => {
        piece.style.transform = '';
        piece.classList.remove('anim-move-piece');
        resolve();
      }, 400);
    });
  }

  async animateDestroyPiece(row, col) {
    return new Promise(resolve => {
      const cell = document.querySelector(`.cell[data-row="${row}"][data-col="${col}"]`);
      if (!cell) return resolve();
      const piece = cell.querySelector('.piece');
      if (!piece) return resolve();

      const rect = cell.getBoundingClientRect();
      
      // Impact flash
      const effectLayer = document.getElementById('effects-layer');
      const impact = document.createElement('div');
      impact.className = 'vfx-impact';
      impact.style.left = `${rect.left + rect.width / 2}px`;
      impact.style.top = `${rect.top + rect.height / 2}px`;
      effectLayer.appendChild(impact);
      
      piece.classList.add('anim-destroy');
      document.getElementById('game-screen').classList.add('anim-shake');
      this.showVfxText('撃破', rect.left + rect.width/2, rect.top + rect.height/2, 'damage');

      setTimeout(() => {
        if(impact.parentNode) impact.remove();
        document.getElementById('game-screen').classList.remove('anim-shake');
        resolve();
      }, 500);
    });
  }
  
  showVfxText(text, x, y, type) {
    const effectLayer = document.getElementById('effects-layer');
    const txt = document.createElement('div');
    txt.className = `vfx-text ${type}`;
    txt.textContent = text;
    txt.style.left = `${x}px`;
    txt.style.top = `${y}px`;
    effectLayer.appendChild(txt);
    
    setTimeout(() => {
      if(txt.parentNode) txt.remove();
    }, 1000);
  }

  showGameOver(winner) {
    const overlay = document.getElementById('game-over-overlay');
    const text = document.getElementById('game-over-text');
    text.textContent = winner === 'player' ? '勝 利' : '敗 北';
    text.style.color = winner === 'player' ? '#c9a84c' : '#c44040';
    overlay.classList.remove('hidden');
  }
}
