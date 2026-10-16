/* ========================================
   data.js - Piece Definitions, Movement, Skills
   ======================================== */

const PIECE_TYPES = {
  king:   { name: '王将', kanji: '王', count: 0 },
  rook:   { name: '飛車', kanji: '飛', count: 1 },
  bishop: { name: '角行', kanji: '角', count: 1 },
  gold:   { name: '金将', kanji: '金', count: 2 },
  silver: { name: '銀将', kanji: '銀', count: 2 },
  knight: { name: '桂馬', kanji: '桂', count: 2 },
  lance:  { name: '香車', kanji: '香', count: 2 },
  pawn:   { name: '歩兵', kanji: '歩', count: 9 },
};

// Movement definitions (from player's perspective: forward = row-1)
// Each direction is [dRow, dCol], 'slide' means repeat until blocked
const BASE_MOVES = {
  king: {
    steps: [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]],
    slide: false
  },
  rook: {
    steps: [[-1,0],[1,0],[0,-1],[0,1]],
    slide: true
  },
  bishop: {
    steps: [[-1,-1],[-1,1],[1,-1],[1,1]],
    slide: true
  },
  gold: {
    steps: [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,0]],
    slide: false
  },
  silver: {
    steps: [[-1,-1],[-1,0],[-1,1],[1,-1],[1,1]],
    slide: false
  },
  knight: {
    steps: [[-2,-1],[-2,1]],
    slide: false
  },
  lance: {
    steps: [[-1,0]],
    slide: true
  },
  pawn: {
    steps: [[-1,0]],
    slide: false
  }
};

// Class skill definitions
const CLASS_SKILLS = {
  mononofu: {
    name: '武士',
    nameKana: 'モノノフ',
    skills: {
      king:   { name: '深謀遠慮', type: 'active',  desc: '2枚ドローし、手札を1枚捨てる' },
      rook:   { name: '一騎当千', type: 'passive', desc: '攻撃時に相手の反撃を無視する' },
      bishop: { name: '明鏡止水', type: 'active',  desc: '敵駒1体を表に戻し裏返り不可にする' },
      gold:   { name: '先手必勝', type: 'active',  desc: '次の相手ターン、計略フェーズ不可' },
      silver: { name: '堅如磐石', type: 'passive', desc: 'スキル効果による破壊を受けない' },
      knight: { name: '疾風迅雷', type: 'passive', desc: '前方斜めにも移動可能になる' },
      lance:  { name: '電光石火', type: 'passive', desc: '味方を通り抜けて移動できる' },
      pawn:   { name: '勇往邁進', type: 'passive', desc: '前方に2マスまで移動可能' },
    }
  },
  shura: {
    name: '修羅',
    nameKana: 'シュラ',
    skills: {
      king:   { name: '破壊衝動', type: 'passive', desc: 'スキルで味方破壊時、1枚ドロー' },
      rook:   { name: '紫電一閃', type: 'active',  desc: '十字方向の全駒を除外(王含む)' },
      bishop: { name: '乾坤一擲', type: 'active',  desc: '斜め方向の全駒を除外(王含む)' },
      gold:   { name: '焦土作戦', type: 'active',  desc: '2x2範囲の全駒を破壊' },
      silver: { name: '背水之陣', type: 'passive', desc: '隣接味方の移動を全方向1マスに' },
      knight: { name: '玉石混交', type: 'active',  desc: '周囲8マスの全駒を破壊' },
      lance:  { name: '猪突猛進', type: 'active',  desc: '直線奥まで突進し経路上の全駒破壊' },
      pawn:   { name: '肉斬骨断', type: 'active',  desc: '自爆し正面最寄りの敵1体を破壊' },
    }
  },
  shinobi: {
    name: '忍',
    nameKana: 'シノビ',
    skills: {
      king:   { name: '出奇制勝', type: 'active',  desc: '墓地から1枚を手札に戻す' },
      rook:   { name: '捨身飼虎', type: 'counter', desc: '王が攻撃時、身代わりに破壊される' },
      bishop: { name: '鏡花水月', type: 'active',  desc: '自身を自陣の任意空きマスにワープ' },
      gold:   { name: '四面楚歌', type: 'active',  desc: '次の相手ターン、召集フェーズ不可' },
      silver: { name: '虚虚実実', type: 'counter', desc: '敵スキル対象時、その敵駒を破壊' },
      knight: { name: '神出鬼没', type: 'counter', desc: '攻撃回避し自陣の空きマスへ逃げる(表でも可)' },
      lance:  { name: '暗中飛躍', type: 'active',  desc: '味方駒1体と位置を入れ替える' },
      pawn:   { name: '一蓮托生', type: 'counter', desc: '討ち取られ時、攻撃者も道連れ(表でも可)' },
    }
  }
};

// Build a fixed deck (19 cards total)
function buildDeck(classId) {
  const deck = [];
  for (const [type, info] of Object.entries(PIECE_TYPES)) {
    if (type === 'king') continue; // King is pre-placed
    for (let i = 0; i < info.count; i++) {
      deck.push({
        type,
        name: info.name,
        kanji: info.kanji,
        skill: CLASS_SKILLS[classId].skills[type],
        owner: null, // set when assigned
        id: `${type}_${i}_${Math.random().toString(36).slice(2,6)}`,
        awakened: false,
        movedThisTurn: false,
        placedThisTurn: false,
        canFlipBack: true, // For mononofu bishop skill
      });
    }
  }
  return deck;
}

function shuffleDeck(deck) {
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}
