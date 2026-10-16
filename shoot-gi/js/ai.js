/* ========================================
   ai.js - CPU Opponent Logic (Enhanced)
   ======================================== */

class AIPlayer {
  constructor() {
    this.thinkDelay = 800; // ms delay to simulate thinking
  }

  async executeTurn(game, ui, controller) {
    const who = 'enemy';

    // Phase 1: Draw
    await this.delay(this.thinkDelay);
    const drawn = game.drawCard(who);
    if (drawn) {
      await ui.animateDrawCard(who, '？');
    }
    game.phase = 'move';
    game.addLog('敵軍が軍議（ドロー）', '');
    ui.renderFull(game);

    // Phase 2: Move (mandatory)
    await ui.showPhaseBanner('進軍');
    await this.delay(this.thinkDelay);
    await this.executeMove(game, ui);
    game.phase = 'place';
    ui.renderFull(game);

    // Phase 3: Place (optional)
    const debuffs = game.getDebuffs(who);
    if (!debuffs.noPlace) {
      await ui.showPhaseBanner('召集');
      await this.delay(this.thinkDelay);
      await this.executePlace(game, ui);
    }
    game.phase = 'activate';
    ui.renderFull(game);

    // Phase 4: Activate (optional)
    if (!debuffs.noActivate) {
      await ui.showPhaseBanner('計略');
      await this.delay(this.thinkDelay);
      await this.executeActivate(game, ui, controller);
    }
    ui.renderFull(game);

    // End turn
    await this.delay(400);
    if (!game.gameOver) {
      game.endTurn();
      game.addLog('― あなたのターン ―', 'important');
      controller.startPlayerTurn(game, ui);
    }
  }

  async executeMove(game, ui) {
    const pieces = game.getBoardPieces('enemy');
    if (pieces.length === 0) return;

    let bestMove = null;
    let bestScore = -Infinity;

    for (const { piece, row, col } of pieces) {
      const { moves, attacks } = game.getValidMoves(row, col);

      // Prioritize capturing enemy pieces
      for (const atk of attacks) {
        const target = game.board[atk.row][atk.col];
        if (!target) continue;
        let score = this.pieceValue(target.type) * 15;
        // Avoid king attacks that might be countered unless safe
        if (target.type === 'king') score += 500;
        // Penalize moving king aggressively
        if (piece.type === 'king') score -= 200;
        
        // Bonus if capturing safely (not defended)
        score += Math.random() * 5; 
        
        if (score > bestScore) {
          bestScore = score;
          bestMove = { from: { row, col }, to: atk, piece, isAttack: true };
        }
      }

      // Regular moves: prefer advancing
      for (const mv of moves) {
        let score = 0;
        // Prefer advancing towards player territory (larger row numbers for enemy)
        score += mv.row * 2;
        
        // Don't move king forward too much unless endgame
        if (piece.type === 'king' && mv.row > 1) {
            score -= 100;
        }

        // Prefer spreading out horizontally
        score -= Math.abs(mv.col - col) * 0.5;

        // Prefer moving non-king pieces
        if (piece.type !== 'king') score += 5;

        score += Math.random() * 2;

        if (score > bestScore) {
          bestScore = score;
          bestMove = { from: { row, col }, to: mv, piece, isAttack: false };
        }
      }
    }

    if (bestMove) {
      await ui.animateMovePiece(bestMove.from.row, bestMove.from.col, bestMove.to.row, bestMove.to.col);
      
      if (bestMove.isAttack) {
          await ui.animateDestroyPiece(bestMove.to.row, bestMove.to.col);
      }
      
      const result = game.movePiece(bestMove.from.row, bestMove.from.col, bestMove.to.row, bestMove.to.col);
      if (result.mutualDestroy) {
        game.board[bestMove.from.row][bestMove.from.col] = null;
        await ui.animateDestroyPiece(bestMove.from.row, bestMove.from.col);
      }
    }
  }

  async executePlace(game, ui) {
    const state = game.getState('enemy');
    if (state.hand.length === 0) return;

    const placeCells = game.getPlacementCells('enemy');
    if (placeCells.length === 0) return;

    let bestIdx = 0;
    let bestVal = -1;
    state.hand.forEach((card, idx) => {
      const val = this.pieceValue(card.type);
      if (val > bestVal) {
        bestVal = val;
        bestIdx = idx;
      }
    });

    const cell = this.pickPlacementCell(placeCells, game);
    const card = state.hand[bestIdx];
    
    game.placePiece('enemy', bestIdx, cell.row, cell.col);
    await ui.animatePlacePiece(cell.row, cell.col, false, card.kanji);
  }

  pickPlacementCell(cells, game) {
    let bestCell = cells[0];
    let bestScore = -Infinity;

    for (const cell of cells) {
      let score = 0;
      // Prefer center columns
      score -= Math.abs(cell.col - 2.5) * 3;
      // Prefer front of territory (row 2 for enemy)
      score += cell.row * 2;
      
      // Defend king if nearby
      const kingPos = game.findKing('enemy');
      if (kingPos && Math.abs(kingPos.col - cell.col) <= 1 && Math.abs(kingPos.row - cell.row) <= 1) {
          score += 10;
      }

      if (score > bestScore) {
        bestScore = score;
        bestCell = cell;
      }
    }

    return bestCell;
  }

  async executeActivate(game, ui, controller) {
    const pieces = game.getBoardPieces('enemy');
    
    // Evaluate if any piece's skill is worth activating
    for (const { piece, row, col } of pieces) {
      if (!game.canActivate(piece)) continue;
      if (piece.type === 'king') continue; // AI won't rush to flip king usually
      
      const shouldActivate = this.shouldActivate(piece, row, col, game);
      if (shouldActivate) {
        const result = game.activateSkill(row, col);
        if (result.success && result.skillName) {
          await new Promise(r => ui.showCutIn(result.skillName, r));

          if (result.needsTarget) {
            await this.handleAITargetSkill(result, piece, row, col, game, ui);
          }
        }
        break; // Activate max one skill per turn
      }
    }
  }

  shouldActivate(piece, row, col, game) {
    const classId = game.getPlayerClassId('enemy');
    
    if (classId === 'shura') {
      if (piece.type === 'pawn' || piece.type === 'knight' || piece.type === 'lance') {
        const playerPieces = game.getBoardPieces('player');
        if (playerPieces.length > 2) return true;
      }
      if (piece.type === 'rook' || piece.type === 'bishop') {
        const playerPieces = game.getBoardPieces('player');
        if (playerPieces.length > 3) return Math.random() > 0.4;
      }
    }

    if (classId === 'mononofu') {
      if (piece.skill.type === 'passive') return true;
      if (piece.type === 'gold') return Math.random() > 0.3;
      if (piece.type === 'silver') return true;
    }

    if (classId === 'shinobi') {
      if (piece.type === 'gold' || piece.type === 'bishop' || piece.type === 'lance') return Math.random() > 0.5;
    }

    return Math.random() > 0.8;
  }

  async handleAITargetSkill(result, piece, row, col, game, ui) {
    switch (result.targetType) {
      case 'enemyAwakened': {
        const targets = game.getBoardPieces('player').filter(p => p.piece.awakened);
        if (targets.length > 0) {
          const t = targets[Math.floor(Math.random() * targets.length)];
          await ui.animateDestroyPiece(t.row, t.col);
          game.applyMeikyoShisui(t.row, t.col);
        }
        break;
      }
      case 'area2x2': {
        let bestR = 0, bestC = 0, bestCount = 0;
        for (let r = 0; r < 5; r++) {
          for (let c = 0; c < 5; c++) {
            let count = 0;
            for (let dr = 0; dr <= 1; dr++) {
              for (let dc = 0; dc <= 1; dc++) {
                const p = game.board[r+dr][c+dc];
                if (p && p.owner === 'player') count++;
                if (p && p.owner === 'enemy') count -= 2; // avoid hitting own
              }
            }
            if (count > bestCount) {
              bestCount = count;
              bestR = r; bestC = c;
            }
          }
        }
        if (bestCount > 0) {
          game.applyScorechedEarth(bestR, bestC);
          for(let dr=0; dr<=1; dr++){
            for(let dc=0; dc<=1; dc++){
               if(game.board[bestR+dr][bestC+dc]) await ui.animateDestroyPiece(bestR+dr, bestC+dc);
            }
          }
        }
        break;
      }
      case 'ownTerritory': {
        const cells = game.getPlacementCells('enemy');
        if (cells.length > 0) {
          const cell = cells[Math.floor(Math.random() * cells.length)];
          await ui.animateMovePiece(row, col, cell.row, cell.col);
          game.applyWarp(row, col, cell.row, cell.col);
        }
        break;
      }
      case 'allySwap': {
        const allies = game.getBoardPieces('enemy').filter(
          p => p.piece.id !== piece.id && p.piece.type !== 'king'
        );
        if (allies.length > 0) {
          const ally = allies[Math.floor(Math.random() * allies.length)];
          game.applySwap(row, col, ally.row, ally.col);
        }
        break;
      }
      case 'graveyard': {
        const state = game.getState('enemy');
        if (state.graveyard.length > 0) {
          let bestIdx = 0;
          let bestVal = -1;
          state.graveyard.forEach((card, idx) => {
            const val = this.pieceValue(card.type);
            if (val > bestVal) { bestVal = val; bestIdx = idx; }
          });
          game.applyGraveyardRetrieve('enemy', bestIdx);
        }
        break;
      }
    }
  }

  pieceValue(type) {
    const values = {
      king: 1000, rook: 15, bishop: 12, gold: 8,
      silver: 6, knight: 5, lance: 4, pawn: 1
    };
    return values[type] || 0;
  }

  delay(ms) {
    return new Promise(r => setTimeout(r, ms));
  }
}
