/* ========================================
   game.js - Core Game Logic
   ======================================== */

class GameState {
  constructor(playerClass, enemyClass) {
    this.playerClass = playerClass;
    this.enemyClass = enemyClass;
    this.turnNumber = 1;
    this.currentPlayer = 'player'; // 'player' or 'enemy'
    this.phase = 'draw'; // draw, move, place, activate
    this.board = this.createEmptyBoard();
    this.gameOver = false;
    this.winner = null;

    // Debuffs
    this.playerDebuffs = { noActivate: false, noPlace: false };
    this.enemyDebuffs = { noActivate: false, noPlace: false };

    // Player state
    this.player = {
      classId: playerClass,
      className: CLASS_SKILLS[playerClass].name,
      deck: shuffleDeck(buildDeck(playerClass)),
      hand: [],
      graveyard: [],
      movedPieceId: null,
    };
    this.enemy = {
      classId: enemyClass,
      className: CLASS_SKILLS[enemyClass].name,
      deck: shuffleDeck(buildDeck(enemyClass)),
      hand: [],
      graveyard: [],
      movedPieceId: null,
    };

    // Assign owners
    this.player.deck.forEach(c => c.owner = 'player');
    this.enemy.deck.forEach(c => c.owner = 'enemy');

    // Place Kings
    this.placeKing('player');
    this.placeKing('enemy');

    // Draw initial hands (5 cards each)
    for (let i = 0; i < 5; i++) {
      this.drawCard('player');
      this.drawCard('enemy');
    }

    this.log = [];
  }

  createEmptyBoard() {
    const board = [];
    for (let r = 0; r < 6; r++) {
      board[r] = [];
      for (let c = 0; c < 6; c++) {
        board[r][c] = null;
      }
    }
    return board;
  }

  placeKing(who) {
    const kingSkill = CLASS_SKILLS[who === 'player' ? this.playerClass : this.enemyClass].skills.king;
    const king = {
      type: 'king',
      name: '王将',
      kanji: '王',
      skill: kingSkill,
      owner: who,
      id: `king_${who}`,
      awakened: false,
      movedThisTurn: false,
      placedThisTurn: false,
      canFlipBack: true,
    };
    if (who === 'player') {
      this.board[5][5] = king; // Bottom-right for player
    } else {
      this.board[0][0] = king; // Top-left for enemy (their "right bottom")
    }
  }

  drawCard(who) {
    const state = who === 'player' ? this.player : this.enemy;
    if (state.deck.length === 0) return null;
    const card = state.deck.pop();
    if (state.hand.length >= 9) {
      state.graveyard.push(card);
      this.addLog(`${who === 'player' ? '自軍' : '敵軍'}の手札が溢れ、${card.name}が墓地へ`, 'destroy');
      return null;
    }
    state.hand.push(card);
    return card;
  }

  addLog(msg, type = '') {
    this.log.push({ msg, type, turn: this.turnNumber });
  }

  getState(who) {
    return who === 'player' ? this.player : this.enemy;
  }

  getOpponent(who) {
    return who === 'player' ? 'enemy' : 'player';
  }

  getDebuffs(who) {
    return who === 'player' ? this.playerDebuffs : this.enemyDebuffs;
  }

  // Get valid moves for a piece at (row, col)
  getValidMoves(row, col) {
    const piece = this.board[row][col];
    if (!piece) return { moves: [], attacks: [] };

    const isPlayer = piece.owner === 'player';
    const dir = isPlayer ? -1 : 1; // Player moves "up" (row--), enemy moves "down"
    const moveDef = this.getMovement(piece, isPlayer);
    const moves = [];
    const attacks = [];

    for (const step of moveDef.steps) {
      const dr = step[0] * (isPlayer ? 1 : -1);
      const dc = step[1] * (isPlayer ? 1 : -1);

      if (moveDef.slide) {
        let r = row + dr;
        let c = col + dc;
        while (r >= 0 && r < 6 && c >= 0 && c < 6) {
          const target = this.board[r][c];
          if (target) {
            if (target.owner !== piece.owner) {
              attacks.push({ row: r, col: c });
            }
            // Check lance passthrough for mononofu
            if (piece.awakened && piece.type === 'lance' && 
                this.getPlayerClassId(piece.owner) === 'mononofu' &&
                target.owner === piece.owner) {
              r += dr; c += dc;
              continue;
            }
            break;
          }
          moves.push({ row: r, col: c });
          r += dr;
          c += dc;
        }
      } else {
        const r = row + dr;
        const c = col + dc;
        if (r >= 0 && r < 6 && c >= 0 && c < 6) {
          const target = this.board[r][c];
          if (!target) {
            moves.push({ row: r, col: c });
          } else if (target.owner !== piece.owner) {
            attacks.push({ row: r, col: c });
          }
        }
      }
    }

    // Awakened pawn: extra forward step (mononofu)
    if (piece.awakened && piece.type === 'pawn' && this.getPlayerClassId(piece.owner) === 'mononofu') {
      const dr = isPlayer ? -2 : 2;
      const midR = row + (isPlayer ? -1 : 1);
      const r2 = row + dr;
      if (r2 >= 0 && r2 < 6 && midR >= 0 && midR < 6) {
        if (!this.board[midR][col]) { // Can't jump
          if (!this.board[r2][col]) {
            if (!moves.some(m => m.row === r2 && m.col === col)) {
              moves.push({ row: r2, col: col });
            }
          } else if (this.board[r2][col].owner !== piece.owner) {
            if (!attacks.some(a => a.row === r2 && a.col === col)) {
              attacks.push({ row: r2, col: col });
            }
          }
        }
      }
    }

    return { moves, attacks };
  }

  getMovement(piece, isPlayer) {
    let moveDef = JSON.parse(JSON.stringify(BASE_MOVES[piece.type]));

    // Awakened knight (mononofu): add diagonal forward steps
    if (piece.awakened && piece.type === 'knight' && this.getPlayerClassId(piece.owner) === 'mononofu') {
      moveDef.steps.push([-1, -1], [-1, 1]);
    }

    return moveDef;
  }

  getPlayerClassId(who) {
    return who === 'player' ? this.playerClass : this.enemyClass;
  }

  // Get valid placement cells (own territory rows 3-5 for player, 0-2 for enemy)
  getPlacementCells(who) {
    const cells = [];
    const startRow = who === 'player' ? 3 : 0;
    const endRow = who === 'player' ? 5 : 2;
    for (let r = startRow; r <= endRow; r++) {
      for (let c = 0; c < 6; c++) {
        if (!this.board[r][c]) {
          cells.push({ row: r, col: c });
        }
      }
    }
    return cells;
  }

  // Execute a move
  movePiece(fromRow, fromCol, toRow, toCol) {
    const piece = this.board[fromRow][fromCol];
    if (!piece) return { success: false };

    const target = this.board[toRow][toCol];
    let capturedPiece = null;
    let counterTriggered = false;
    let counterResult = null;

    if (target && target.owner !== piece.owner) {
      // Check counter skills
      counterResult = this.checkCounter(piece, target, toRow, toCol);
      if (counterResult.prevented) {
        // Move was countered - piece stays or is destroyed
        return counterResult;
      }
      capturedPiece = target;
      // Send to owner's graveyard
      const ownerState = this.getState(target.owner);
      ownerState.graveyard.push(target);
      this.addLog(`${piece.owner === 'player' ? '自軍' : '敵軍'}の${piece.name}が${target.name}を撃破！`, 'destroy');

      // Check shura king passive: draw on ally destroy
      this.checkShuraKingPassive(target.owner, target);
    }

    this.board[fromRow][fromCol] = null;
    this.board[toRow][toCol] = piece;
    piece.movedThisTurn = true;

    const currentState = this.getState(this.currentPlayer);
    currentState.movedPieceId = piece.id;

    // Check win condition
    if (capturedPiece && capturedPiece.type === 'king') {
      this.gameOver = true;
      this.winner = piece.owner;
    }

    return { success: true, captured: capturedPiece, counterResult };
  }

  checkCounter(attacker, defender, defRow, defCol) {
    const defClassId = this.getPlayerClassId(defender.owner);
    const atkClassId = this.getPlayerClassId(attacker.owner);

    // Shinobi pawn counter: 一蓮托生 (works even when not awakened)
    if (defClassId === 'shinobi' && defender.type === 'pawn') {
      // Check if mononofu rook ignores counters
      if (atkClassId === 'mononofu' && attacker.type === 'rook' && attacker.awakened) {
        return { prevented: false };
      }
      // Mutual destruction
      const defState = this.getState(defender.owner);
      defState.graveyard.push(defender);
      const atkState = this.getState(attacker.owner);
      atkState.graveyard.push(attacker);
      this.board[defRow][defCol] = null;
      // Also remove attacker from its original position handled by caller
      this.addLog(`一蓮托生！${defender.name}と${attacker.name}が共に散る！`, 'destroy');
      
      // Check king destruction
      if (defender.type === 'king') {
        this.gameOver = true;
        this.winner = attacker.owner;
      }
      if (attacker.type === 'king') {
        this.gameOver = true;
        this.winner = defender.owner;
      }

      this.checkShuraKingPassive(defender.owner, defender);
      this.checkShuraKingPassive(attacker.owner, attacker);

      return { prevented: true, success: true, mutualDestroy: true, captured: defender };
    }

    // Shinobi knight counter: 神出鬼没 (works even when not awakened)
    if (defClassId === 'shinobi' && defender.type === 'knight') {
      if (atkClassId === 'mononofu' && attacker.type === 'rook' && attacker.awakened) {
        return { prevented: false };
      }
      // Knight escapes to own territory
      const escapeCells = this.getPlacementCells(defender.owner);
      if (escapeCells.length > 0) {
        const escapeCell = escapeCells[Math.floor(Math.random() * escapeCells.length)];
        this.board[defRow][defCol] = null;
        this.board[escapeCell.row][escapeCell.col] = defender;
        this.addLog(`神出鬼没！${defender.name}が攻撃を躱した！`, 'important');
        return { prevented: true, success: true, escaped: true };
      }
    }

    // Shinobi rook counter: 捨身飼虎 (bodyguard for king)
    // This triggers when KING is attacked, checking if rook is on board
    // We handle this in a separate check

    return { prevented: false };
  }

  // Check if shinobi rook can intercept an attack on king
  checkBodyguard(attackerPiece, kingRow, kingCol) {
    const king = this.board[kingRow][kingCol];
    if (!king || king.type !== 'king') return null;

    const defClassId = this.getPlayerClassId(king.owner);
    if (defClassId !== 'shinobi') return null;

    // Find the rook on the board
    for (let r = 0; r < 6; r++) {
      for (let c = 0; c < 6; c++) {
        const p = this.board[r][c];
        if (p && p.type === 'rook' && p.owner === king.owner) {
          // Swap positions: rook takes king's place
          this.board[r][c] = null;
          this.board[kingRow][kingCol] = p;
          // Place king where rook was
          this.board[r][c] = king;
          
          const rookState = this.getState(p.owner);
          rookState.graveyard.push(p);
          this.board[kingRow][kingCol] = null;

          this.addLog(`捨身飼虎！飛車が王の身代わりに散った！`, 'destroy');
          this.checkShuraKingPassive(p.owner, p);
          
          return { bodyguardActivated: true, rookPos: { row: r, col: c }, kingNewPos: { row: r, col: c } };
        }
      }
    }
    return null;
  }

  // Place a card from hand onto the board
  placePiece(who, cardIndex, row, col) {
    const state = this.getState(who);
    if (cardIndex < 0 || cardIndex >= state.hand.length) return false;

    const card = state.hand[cardIndex];
    card.placedThisTurn = true;
    this.board[row][col] = card;
    state.hand.splice(cardIndex, 1);
    this.addLog(`${who === 'player' ? '自軍' : '敵軍'}が${card.name}を配置`, 'important');
    return true;
  }

  // Activate (flip) a piece's skill
  activateSkill(row, col) {
    const piece = this.board[row][col];
    if (!piece || piece.awakened || !piece.canFlipBack) return { success: false };

    piece.awakened = true;
    const skillName = piece.skill.name;
    const skillType = piece.skill.type;

    this.addLog(`${piece.name}覚醒！『${skillName}』発動！`, 'important');

    // Handle active skills that have immediate effects
    if (skillType === 'active') {
      return this.executeActiveSkill(piece, row, col);
    }

    return { success: true, skillName, needsTarget: false };
  }

  executeActiveSkill(piece, row, col) {
    const classId = this.getPlayerClassId(piece.owner);
    const opponent = this.getOpponent(piece.owner);

    switch (classId) {
      case 'mononofu':
        return this.executeMononofuSkill(piece, row, col);
      case 'shura':
        return this.executeShuraSkill(piece, row, col);
      case 'shinobi':
        return this.executeShinobiSkill(piece, row, col);
    }
    return { success: true };
  }

  executeMononofuSkill(piece, row, col) {
    switch (piece.type) {
      case 'king': {
        // 深謀遠慮: Draw 2, discard 1
        const state = this.getState(piece.owner);
        this.drawCard(piece.owner);
        this.drawCard(piece.owner);
        this.addLog(`深謀遠慮：2枚ドロー、1枚を捨てる`, 'important');
        return { success: true, skillName: '深謀遠慮', needsDiscard: true };
      }
      case 'bishop': {
        // 明鏡止水: Target enemy piece, revert and lock
        return { success: true, skillName: '明鏡止水', needsTarget: true, targetType: 'enemyAwakened' };
      }
      case 'gold': {
        // 先手必勝: Block enemy activate phase
        const oppDebuffs = this.getDebuffs(this.getOpponent(piece.owner));
        oppDebuffs.noActivate = true;
        this.addLog(`先手必勝：敵の次ターン計略封印！`, 'important');
        return { success: true, skillName: '先手必勝' };
      }
      default:
        return { success: true };
    }
  }

  executeShuraSkill(piece, row, col) {
    switch (piece.type) {
      case 'rook': {
        // 紫電一閃: Destroy all in cross lines
        const destroyed = [];
        // Horizontal
        for (let c = 0; c < 6; c++) {
          if (c === col) continue;
          const p = this.board[row][c];
          if (p) {
            if (this.isProtectedFromSkill(p)) continue;
            destroyed.push({ piece: p, row, col: c });
          }
        }
        // Vertical
        for (let r = 0; r < 6; r++) {
          if (r === row) continue;
          const p = this.board[r][col];
          if (p) {
            if (this.isProtectedFromSkill(p)) continue;
            destroyed.push({ piece: p, row: r, col });
          }
        }
        this.destroyPieces(destroyed, true); // 'exclude' = removed from game
        return { success: true, skillName: '紫電一閃' };
      }
      case 'bishop': {
        // 乾坤一擲: Destroy all in diagonal lines
        const destroyed = [];
        const dirs = [[-1,-1],[-1,1],[1,-1],[1,1]];
        for (const [dr, dc] of dirs) {
          let r = row + dr, c = col + dc;
          while (r >= 0 && r < 6 && c >= 0 && c < 6) {
            const p = this.board[r][c];
            if (p) {
              if (!this.isProtectedFromSkill(p)) {
                destroyed.push({ piece: p, row: r, col: c });
              }
            }
            r += dr; c += dc;
          }
        }
        this.destroyPieces(destroyed, true);
        return { success: true, skillName: '乾坤一擲' };
      }
      case 'gold': {
        // 焦土作戦: 2x2 area destroy - needs target
        return { success: true, skillName: '焦土作戦', needsTarget: true, targetType: 'area2x2' };
      }
      case 'knight': {
        // 玉石混交: Destroy all in 8 surrounding cells
        const destroyed = [];
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            if (dr === 0 && dc === 0) continue;
            const r = row + dr, c = col + dc;
            if (r >= 0 && r < 6 && c >= 0 && c < 6) {
              const p = this.board[r][c];
              if (p && !this.isProtectedFromSkill(p)) {
                destroyed.push({ piece: p, row: r, col: c });
              }
            }
          }
        }
        this.destroyPieces(destroyed, false);
        return { success: true, skillName: '玉石混交' };
      }
      case 'lance': {
        // 猪突猛進: Charge forward, destroy all in path
        const dir = piece.owner === 'player' ? -1 : 1;
        const destroyed = [];
        let r = row + dir;
        let finalRow = row;
        while (r >= 0 && r < 6) {
          const p = this.board[r][col];
          if (p) {
            if (!this.isProtectedFromSkill(p)) {
              destroyed.push({ piece: p, row: r, col });
            }
          }
          finalRow = r;
          r += dir;
        }
        // Move the lance to the farthest position
        this.board[row][col] = null;
        this.destroyPieces(destroyed, false);
        this.board[finalRow][col] = piece;
        this.addLog(`猪突猛進！香車が突撃！`, 'important');
        return { success: true, skillName: '猪突猛進' };
      }
      case 'pawn': {
        // 肉斬骨断: Self-destruct, destroy nearest enemy in forward line
        const dir = piece.owner === 'player' ? -1 : 1;
        let r = row + dir;
        let targetPiece = null;
        let tr = -1;
        while (r >= 0 && r < 6) {
          const p = this.board[r][col];
          if (p && p.owner !== piece.owner) {
            if (!this.isProtectedFromSkill(p)) {
              targetPiece = p;
              tr = r;
            }
            break;
          }
          r += dir;
        }
        // Destroy self
        this.board[row][col] = null;
        const selfState = this.getState(piece.owner);
        selfState.graveyard.push(piece);
        this.checkShuraKingPassive(piece.owner, piece);

        if (targetPiece) {
          this.destroyPieces([{ piece: targetPiece, row: tr, col }], false);
          this.addLog(`肉斬骨断！歩兵が自爆特攻！`, 'destroy');
        }
        return { success: true, skillName: '肉斬骨断' };
      }
      default:
        return { success: true };
    }
  }

  executeShinobiSkill(piece, row, col) {
    switch (piece.type) {
      case 'king': {
        // 出奇制勝: Retrieve 1 from graveyard
        const state = this.getState(piece.owner);
        if (state.graveyard.length === 0) {
          this.addLog(`出奇制勝：墓地にカードがない`, '');
          return { success: true, skillName: '出奇制勝' };
        }
        return { success: true, skillName: '出奇制勝', needsTarget: true, targetType: 'graveyard' };
      }
      case 'bishop': {
        // 鏡花水月: Warp to own territory empty cell
        return { success: true, skillName: '鏡花水月', needsTarget: true, targetType: 'ownTerritory' };
      }
      case 'gold': {
        // 四面楚歌: Block enemy place phase
        const oppDebuffs = this.getDebuffs(this.getOpponent(piece.owner));
        oppDebuffs.noPlace = true;
        this.addLog(`四面楚歌：敵の次ターン召集封印！`, 'important');
        return { success: true, skillName: '四面楚歌' };
      }
      case 'lance': {
        // 暗中飛躍: Swap with ally
        return { success: true, skillName: '暗中飛躍', needsTarget: true, targetType: 'allySwap' };
      }
      default:
        return { success: true };
    }
  }

  isProtectedFromSkill(piece) {
    // Mononofu silver: 堅如磐石 - immune to skill destruction
    if (piece.awakened && piece.type === 'silver' && this.getPlayerClassId(piece.owner) === 'mononofu') {
      return true;
    }
    return false;
  }

  destroyPieces(list, exclude) {
    for (const { piece, row, col } of list) {
      // Check shinobi silver counter: 虚虚実実
      // (Handled separately for targeted skills)
      
      this.board[row][col] = null;
      const ownerState = this.getState(piece.owner);
      if (exclude) {
        // Excluded from game entirely
        this.addLog(`${piece.name}が除外された！`, 'destroy');
      } else {
        ownerState.graveyard.push(piece);
        this.addLog(`${piece.name}が破壊された！`, 'destroy');
      }

      if (piece.type === 'king') {
        this.gameOver = true;
        // The winner is whoever is NOT the king's owner
        this.winner = this.getOpponent(piece.owner);
      }

      this.checkShuraKingPassive(piece.owner, piece);
    }
  }

  checkShuraKingPassive(destroyedOwner, destroyedPiece) {
    // If shura king is awakened and an ally piece was destroyed by a skill
    if (this.getPlayerClassId(destroyedOwner) === 'shura' && destroyedPiece.type !== 'king') {
      // Find king on board
      for (let r = 0; r < 6; r++) {
        for (let c = 0; c < 6; c++) {
          const p = this.board[r][c];
          if (p && p.type === 'king' && p.owner === destroyedOwner && p.awakened) {
            this.drawCard(destroyedOwner);
            this.addLog(`破壊衝動：味方破壊で1枚ドロー`, 'important');
            return;
          }
        }
      }
    }
  }

  // Apply Mononofu Bishop skill on target
  applyMeikyoShisui(targetRow, targetCol) {
    const piece = this.board[targetRow][targetCol];
    if (piece && piece.awakened) {
      piece.awakened = false;
      piece.canFlipBack = false;
      this.addLog(`明鏡止水：${piece.name}のスキルが封印された！`, 'important');
      return true;
    }
    return false;
  }

  // Shura Gold skill: 焦土作戦
  applyScorechedEarth(topRow, topCol) {
    const destroyed = [];
    for (let dr = 0; dr <= 1; dr++) {
      for (let dc = 0; dc <= 1; dc++) {
        const r = topRow + dr, c = topCol + dc;
        if (r >= 0 && r < 6 && c >= 0 && c < 6) {
          const p = this.board[r][c];
          if (p && !this.isProtectedFromSkill(p)) {
            destroyed.push({ piece: p, row: r, col: c });
          }
        }
      }
    }
    this.destroyPieces(destroyed, false);
    return true;
  }

  // Shinobi Bishop: Warp to cell
  applyWarp(pieceRow, pieceCol, targetRow, targetCol) {
    const piece = this.board[pieceRow][pieceCol];
    if (!piece) return false;
    this.board[pieceRow][pieceCol] = null;
    this.board[targetRow][targetCol] = piece;
    this.addLog(`鏡花水月：${piece.name}がワープ！`, 'important');
    return true;
  }

  // Shinobi Lance: Swap with ally
  applySwap(lanceRow, lanceCol, allyRow, allyCol) {
    const lance = this.board[lanceRow][lanceCol];
    const ally = this.board[allyRow][allyCol];
    if (!lance || !ally) return false;
    this.board[lanceRow][lanceCol] = ally;
    this.board[allyRow][allyCol] = lance;
    this.addLog(`暗中飛躍：${lance.name}と${ally.name}が入替！`, 'important');
    return true;
  }

  // Shinobi King: Retrieve from graveyard
  applyGraveyardRetrieve(who, graveyardIndex) {
    const state = this.getState(who);
    if (graveyardIndex < 0 || graveyardIndex >= state.graveyard.length) return false;
    const card = state.graveyard.splice(graveyardIndex, 1)[0];
    if (state.hand.length < 9) {
      state.hand.push(card);
      this.addLog(`出奇制勝：${card.name}が墓地から帰還！`, 'important');
    }
    return true;
  }

  // Start of turn processing
  startTurn() {
    const who = this.currentPlayer;
    const state = this.getState(who);
    state.movedPieceId = null;

    // Clear per-turn flags
    for (let r = 0; r < 6; r++) {
      for (let c = 0; c < 6; c++) {
        const p = this.board[r][c];
        if (p && p.owner === who) {
          p.movedThisTurn = false;
          p.placedThisTurn = false;
        }
      }
    }

    this.phase = 'draw';
  }

  endTurn() {
    // Clear debuffs that were applied TO OPPONENT last turn
    const currentDebuffs = this.getDebuffs(this.currentPlayer);
    currentDebuffs.noActivate = false;
    currentDebuffs.noPlace = false;

    this.currentPlayer = this.currentPlayer === 'player' ? 'enemy' : 'player';
    if (this.currentPlayer === 'player') {
      this.turnNumber++;
    }

    this.startTurn();
  }

  // Get all pieces of a given owner on the board
  getBoardPieces(who) {
    const pieces = [];
    for (let r = 0; r < 6; r++) {
      for (let c = 0; c < 6; c++) {
        if (this.board[r][c] && this.board[r][c].owner === who) {
          pieces.push({ piece: this.board[r][c], row: r, col: c });
        }
      }
    }
    return pieces;
  }

  // Can a piece be activated?
  canActivate(piece) {
    if (piece.awakened) return false;
    if (!piece.canFlipBack) return false;
    if (piece.movedThisTurn) return false;
    return true;
  }
}
