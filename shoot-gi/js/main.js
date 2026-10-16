/* ========================================
   main.js - Game Controller / Entry Point
   ======================================== */

let game = null;
let ui = null;
let ai = null;
let playerClassChoice = null;
let enemyClassChoice = null;
let isAnimating = false;

// === Title Screen ===
function setupTitleScreen() {
  document.querySelectorAll('#player-class-cards .class-card').forEach(card => {
    card.addEventListener('click', () => {
      document.querySelectorAll('#player-class-cards .class-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      playerClassChoice = card.dataset.class;
      checkStartReady();
    });
  });

  document.querySelectorAll('#enemy-class-cards .class-card').forEach(card => {
    card.addEventListener('click', () => {
      document.querySelectorAll('#enemy-class-cards .class-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      enemyClassChoice = card.dataset.class;
      checkStartReady();
    });
  });

  document.getElementById('btn-start').addEventListener('click', startGame);
  document.getElementById('btn-restart').addEventListener('click', () => {
    document.getElementById('game-over-overlay').classList.add('hidden');
    document.getElementById('game-screen').classList.remove('active');
    document.getElementById('title-screen').classList.add('active');
  });
}

function checkStartReady() {
  const btn = document.getElementById('btn-start');
  btn.disabled = !(playerClassChoice && enemyClassChoice);
}

function startGame() {
  if (!playerClassChoice || !enemyClassChoice) return;

  game = new GameState(playerClassChoice, enemyClassChoice);
  ui = new GameUI();
  ai = new AIPlayer();

  document.getElementById('player-class-badge').textContent = CLASS_SKILLS[playerClassChoice].name;
  document.getElementById('enemy-class-badge').textContent = CLASS_SKILLS[enemyClassChoice].name;

  ui._onCellClick = handleCellClick;
  ui._onCardClick = handleCardClick;

  document.getElementById('btn-skip-place').addEventListener('click', async () => {
    if (game.phase === 'place' && game.currentPlayer === 'player' && !isAnimating) {
      game.phase = 'activate';
      ui.clearSelection();
      await ui.showPhaseBanner('計略');
      ui.renderFull(game);
    }
  });

  document.getElementById('btn-skip-activate').addEventListener('click', () => {
    if (game.phase === 'activate' && game.currentPlayer === 'player' && !isAnimating) {
      endPlayerTurn();
    }
  });

  document.getElementById('btn-end-turn').addEventListener('click', () => {
    if (game.currentPlayer === 'player' && !isAnimating) {
      endPlayerTurn();
    }
  });

  document.getElementById('title-screen').classList.remove('active');
  document.getElementById('game-screen').classList.add('active');

  game.addLog('― 合戦開始 ―', 'important');
  game.addLog(`自軍: ${CLASS_SKILLS[playerClassChoice].name}`, '');
  game.addLog(`敵軍: ${CLASS_SKILLS[enemyClassChoice].name}`, '');

  ui.renderFull(game);
  startPlayerTurn(game, ui);
}

// === Turn Flow ===
async function startPlayerTurn(g, u) {
  isAnimating = true;
  g.startTurn();
  
  await u.showPhaseBanner('軍議');
  g.phase = 'move';
  g.addLog(`自軍の軍議（ドロー）`, '');
  
  const drawn = g.drawCard('player');
  if (drawn) {
    await u.animateDrawCard('player', drawn.kanji);
  }
  
  u.clearSelection();
  u.renderFull(g);
  await u.showPhaseBanner('進軍');
  isAnimating = false;
}

async function endPlayerTurn() {
  if (game.gameOver) return;
  isAnimating = true;
  
  game.endTurn();
  ui.clearSelection();
  ui.renderFull(game);

  game.addLog('― 敵軍のターン ―', '');
  await ui.showPhaseBanner('敵軍のターン');
  
  await ai.executeTurn(game, ui, { startPlayerTurn });
  
  if (game.gameOver) {
    ui.showGameOver(game.winner);
  } else {
    isAnimating = false;
  }
}

// === Player Interaction ===
async function handleCellClick(row, col) {
  if (!game || game.gameOver || game.currentPlayer !== 'player' || isAnimating) return;

  if (ui.pendingSkill) {
    await handleSkillTarget(row, col);
    return;
  }

  const piece = game.board[row][col];

  switch (game.phase) {
    case 'move':
      await handleMovePhase(row, col, piece);
      break;
    case 'place':
      await handlePlacePhase(row, col, piece);
      break;
    case 'activate':
      await handleActivatePhase(row, col, piece);
      break;
  }
}

async function handleMovePhase(row, col, piece) {
  if (ui.selectedPiece) {
    const sp = ui.selectedPiece;

    // Check if moving to empty cell
    if (ui.validMoves.some(m => m.row === row && m.col === col)) {
      isAnimating = true;
      await ui.animateMovePiece(sp.row, sp.col, row, col);
      
      const result = game.movePiece(sp.row, sp.col, row, col);
      if (result.success) {
        game.phase = 'place';
        ui.clearSelection();
        
        ui.renderFull(game);
        
        const debuffs = game.getDebuffs('player');
        if (debuffs.noPlace) {
          game.phase = 'activate';
          game.addLog('四面楚歌の効果で召集不可！', 'important');
          await ui.showPhaseBanner('計略');
        } else {
          await ui.showPhaseBanner('召集');
        }

        ui.renderFull(game);
        checkGameOver();
      }
      isAnimating = false;
      return;
    }

    // Check if attacking
    if (ui.validAttacks.some(m => m.row === row && m.col === col)) {
      isAnimating = true;
      
      const target = game.board[row][col];
      await ui.animateMovePiece(sp.row, sp.col, row, col);

      // Check bodyguard intercept
      if (target && target.type === 'king') {
        const bodyguard = game.checkBodyguard(game.board[sp.row][sp.col], row, col);
        if (bodyguard && bodyguard.bodyguardActivated) {
          await new Promise(r => {
            ui.showCutIn('捨身飼虎', () => r());
          });
          game.board[sp.row][sp.col] = null;
          game.board[row][col] = game.board[sp.row][sp.col] || null;
          game.phase = 'place';
          ui.clearSelection();
          ui.renderFull(game);
          await ui.showPhaseBanner('召集');
          isAnimating = false;
          return;
        }
      }

      await ui.animateDestroyPiece(row, col);

      const result = game.movePiece(sp.row, sp.col, row, col);
      if (result.success || result.mutualDestroy) {
        if (result.mutualDestroy) {
          game.board[sp.row][sp.col] = null;
          await ui.animateDestroyPiece(sp.row, sp.col);
        }
        game.phase = 'place';
        ui.clearSelection();
        ui.renderFull(game);

        const debuffs = game.getDebuffs('player');
        if (debuffs.noPlace) {
          game.phase = 'activate';
          await ui.showPhaseBanner('計略');
        } else {
          await ui.showPhaseBanner('召集');
        }

        ui.renderFull(game);
        checkGameOver();
      }
      isAnimating = false;
      return;
    }

    ui.clearSelection();
    ui.renderFull(game);
    return;
  }

  if (piece && piece.owner === 'player') {
    ui.clearSelection();
    ui.selectedPiece = { row, col };
    const { moves, attacks } = game.getValidMoves(row, col);
    ui.validMoves = moves;
    ui.validAttacks = attacks;
    ui.renderFull(game);
  }
}

async function handlePlacePhase(row, col, piece) {
  if (ui.selectedCard !== null) {
    if (ui.placementCells.some(c => c.row === row && c.col === col)) {
      isAnimating = true;
      const card = game.getState('player').hand[ui.selectedCard];
      
      game.placePiece('player', ui.selectedCard, row, col);
      await ui.animatePlacePiece(row, col, true, card.kanji);
      
      game.phase = 'activate';
      ui.clearSelection();

      const debuffs = game.getDebuffs('player');
      if (debuffs.noActivate) {
        game.addLog('先手必勝の効果で計略不可！', 'important');
        endPlayerTurn();
        return;
      }

      await ui.showPhaseBanner('計略');
      ui.renderFull(game);
      isAnimating = false;
      return;
    }
  }

  ui.clearSelection();
  ui.renderFull(game);
}

async function handleActivatePhase(row, col, piece) {
  if (!piece || piece.owner !== 'player') return;
  if (!game.canActivate(piece)) return;

  isAnimating = true;
  ui.activatingPiece = { row, col };
  const result = game.activateSkill(row, col);

  if (result.success) {
    if (result.skillName) {
      await new Promise(r => {
        ui.showCutIn(result.skillName, () => r());
      });
      
      if (result.needsTarget) {
        ui.pendingSkill = result;
        highlightSkillTargets(result, row, col);
        isAnimating = false;
      } else if (result.needsDiscard) {
        const state = game.getState('player');
        if (state.hand.length > 0) {
          const discarded = state.hand.pop();
          state.graveyard.push(discarded);
          game.addLog(`${discarded.name}を手札から捨てた`, '');
        }
        ui.clearSelection();
        ui.renderFull(game);
        endPlayerTurn();
      } else {
        ui.clearSelection();
        ui.renderFull(game);
        checkGameOver();
        isAnimating = false;
      }
    } else {
      isAnimating = false;
    }
  } else {
    isAnimating = false;
  }
}

function highlightSkillTargets(result, sourceRow, sourceCol) {
  ui.clearSelection();
  ui.activatingPiece = { row: sourceRow, col: sourceCol };
  ui.pendingSkill = result;
  ui.pendingSkill.sourceRow = sourceRow;
  ui.pendingSkill.sourceCol = sourceCol;

  switch (result.targetType) {
    case 'enemyAwakened':
      for (let r = 0; r < 6; r++) {
        for (let c = 0; c < 6; c++) {
          const p = game.board[r][c];
          if (p && p.owner === 'enemy' && p.awakened) {
            ui.validAttacks.push({ row: r, col: c });
          }
        }
      }
      break;
    case 'area2x2':
      for (let r = 0; r < 5; r++) {
        for (let c = 0; c < 5; c++) {
          ui.validAttacks.push({ row: r, col: c });
        }
      }
      break;
    case 'ownTerritory':
      ui.placementCells = game.getPlacementCells('player');
      break;
    case 'allySwap':
      for (let r = 0; r < 6; r++) {
        for (let c = 0; c < 6; c++) {
          const p = game.board[r][c];
          if (p && p.owner === 'player' && p.id !== game.board[sourceRow][sourceCol]?.id) {
            ui.validMoves.push({ row: r, col: c });
          }
        }
      }
      break;
    case 'graveyard':
      const state = game.getState('player');
      if (state.graveyard.length > 0) {
        game.applyGraveyardRetrieve('player', 0);
      }
      ui.pendingSkill = null;
      ui.clearSelection();
      ui.renderFull(game);
      return;
  }

  ui.renderFull(game);
}

async function handleSkillTarget(row, col) {
  const result = ui.pendingSkill;
  if (!result || isAnimating) return;

  isAnimating = true;

  switch (result.targetType) {
    case 'enemyAwakened':
      if (ui.validAttacks.some(a => a.row === row && a.col === col)) {
        await ui.animateDestroyPiece(row, col);
        game.applyMeikyoShisui(row, col);
        await finishSkill();
      }
      break;
    case 'area2x2':
      if (ui.validAttacks.some(a => a.row === row && a.col === col)) {
        for(let r=row; r<=row+1; r++) {
          for(let c=col; c<=col+1; c++) {
             if(game.board[r][c]) await ui.animateDestroyPiece(r, c);
          }
        }
        game.applyScorechedEarth(row, col);
        await finishSkill();
      }
      break;
    case 'ownTerritory':
      if (ui.placementCells.some(c => c.row === row && c.col === col)) {
        await ui.animateMovePiece(result.sourceRow, result.sourceCol, row, col);
        game.applyWarp(result.sourceRow, result.sourceCol, row, col);
        await finishSkill();
      }
      break;
    case 'allySwap':
      if (ui.validMoves.some(m => m.row === row && m.col === col)) {
        // Swap animation is complex, just teleport for now
        game.applySwap(result.sourceRow, result.sourceCol, row, col);
        await finishSkill();
      }
      break;
  }
  isAnimating = false;
}

async function finishSkill() {
  ui.pendingSkill = null;
  ui.clearSelection();
  ui.renderFull(game);
  checkGameOver();
}

function handleCardClick(idx) {
  if (!game || game.gameOver || game.currentPlayer !== 'player' || isAnimating) return;

  if (game.phase === 'place') {
    const debuffs = game.getDebuffs('player');
    if (debuffs.noPlace) return;

    if (ui.selectedCard === idx) {
      ui.clearSelection();
    } else {
      ui.clearSelection();
      ui.selectedCard = idx;
      ui.placementCells = game.getPlacementCells('player');
    }
    ui.renderFull(game);
  }
}

function checkGameOver() {
  if (game.gameOver) {
    isAnimating = true;
    setTimeout(() => {
      ui.showGameOver(game.winner);
    }, 500);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  setupTitleScreen();
});

window.startPlayerTurn = startPlayerTurn;
