import { CardDefinition } from "./types";

export const CARD_CATALOG: CardDefinition[] = [
  {
    id: "N01",
    name: "種まき",
    rarity: "normal",
    cost: { stones: 1, filter: "any" },
    target: { kind: "empty", min: 4, max: 4, exact: true },
    effect: "孤立した自石を4個置く。次の大技の燃料になる。",
    role: "資源",
    flavor: "勝ち筋から離れた場所に、あとで効く種を撒く。"
  },
  {
    id: "N02",
    name: "無縁の星",
    rarity: "normal",
    cost: { stones: 0, filter: "any", actionSkip: true },
    target: { kind: "empty", min: 3, max: 3, exact: true },
    effect: "通常行動を放棄し、孤立した自石を3個置く。",
    role: "資源",
    flavor: "線にならない星を置く。今は弱く、あとで高い。"
  },
  {
    id: "N03",
    name: "双打ち",
    rarity: "normal",
    cost: { stones: 1, filter: "any" },
    target: { kind: "empty", min: 2, max: 2, exact: true },
    effect: "起点から距離2以内に自石を2個置く。",
    role: "攻め",
    flavor: "軽く、素直で、いちばん信用できる二手。"
  },
  {
    id: "N04",
    name: "遠点",
    rarity: "normal",
    cost: { stones: 1, filter: "any" },
    target: { kind: "empty", min: 1, max: 1, exact: true },
    effect: "起点と同じ直線上、距離8以内に自石を1個置く。",
    role: "接続",
    flavor: "離れた線へ一点だけ針を通す。"
  },
  {
    id: "N05",
    name: "小割り",
    rarity: "normal",
    cost: { stones: 2, filter: "any" },
    target: { kind: "enemy", min: 1, max: 1, exact: true },
    effect: "起点から距離1以内の相手石を1個除去する。",
    role: "妨害",
    flavor: "小さく崩す。小さいのに結構痛い。"
  },
  {
    id: "N06",
    name: "橋渡し",
    rarity: "normal",
    cost: { stones: 1, filter: "edge" },
    target: { kind: "empty", min: 1, max: 1, exact: true },
    effect: "自石2個に挟まれた1マスの穴を埋める。",
    role: "接続",
    flavor: "切れた線に橋をかける。"
  },
  {
    id: "N07",
    name: "石寄せ",
    rarity: "normal",
    cost: { stones: 1, filter: "any", actionSkip: true },
    target: { kind: "empty", min: 1, max: 3 },
    effect: "通常行動を放棄し、起点付近へ最大3個の石を寄せる。",
    role: "整地",
    flavor: "ばらけた力を一か所に集める。"
  },
  {
    id: "N08",
    name: "外周投げ",
    rarity: "normal",
    cost: { stones: 0, filter: "any", noCostWhenLowStones: 3 },
    target: { kind: "empty", min: 2, max: 2, exact: true },
    effect: "自石が3個以下の時、外周に孤立石を2個置く。",
    role: "序盤",
    flavor: "隅へ投げた小石が、終盤の弾になる。"
  },
  {
    id: "N09",
    name: "予約石",
    rarity: "normal",
    cost: { stones: 1, filter: "any" },
    target: { kind: "empty", min: 2, max: 2, exact: true },
    effect: "距離4以内の空きセル2個を予約する。次の自ターンに石になる。",
    role: "予約",
    flavor: "未来のマスに名前を書く。"
  },
  {
    id: "N10",
    name: "押し出し",
    rarity: "normal",
    cost: { stones: 2, filter: "any" },
    target: { kind: "enemy", min: 1, max: 1, exact: true },
    effect: "起点に隣接する石を1マス押す。押せない時は除去する。",
    role: "妨害",
    flavor: "列を一拍ずらして、計算を狂わせる。"
  },
  {
    id: "N11",
    name: "反撃",
    rarity: "normal",
    cost: { stones: 1, filter: "any" },
    target: { kind: "enemy", min: 1, max: 1, exact: true },
    effect: "相手の脅威石を1個除去し、近くに自石を1個置く。",
    role: "防御",
    flavor: "受けた圧を、そのまま押し返す。"
  },
  {
    id: "N12",
    name: "捨て陣",
    rarity: "normal",
    cost: { stones: 3, filter: "any" },
    target: { kind: "empty", min: 3, max: 3, exact: true },
    effect: "孤立石を3個置く。次の自ターンまでカードコスト2個分になる。",
    role: "資源",
    flavor: "今の形を捨てて、次の怪物を呼ぶ。"
  },
  {
    id: "S01",
    name: "三連星",
    rarity: "strong",
    cost: { stones: 2, filter: "any" },
    target: { kind: "empty", min: 3, max: 3, exact: true },
    effect: "起点付近につながった自石を3個置く。",
    role: "攻め",
    flavor: "盤面に小さな星座を刻む。"
  },
  {
    id: "S02",
    name: "色替え",
    rarity: "strong",
    cost: { stones: 3, filter: "any" },
    target: { kind: "enemy", min: 1, max: 2 },
    effect: "距離2以内の相手石を最大2個、自石に変える。",
    role: "奪取",
    flavor: "相手の線が、突然こちらの線になる。"
  },
  {
    id: "S03",
    name: "大割り",
    rarity: "strong",
    cost: { stones: 2, filter: "any", actionSkip: true },
    target: { kind: "enemy", min: 1, max: 4 },
    effect: "通常行動を放棄し、距離3以内の相手石を最大4個除去する。",
    role: "防御",
    flavor: "一帯を割って、勝ち筋を消す。"
  },
  {
    id: "S04",
    name: "転移陣",
    rarity: "strong",
    cost: { stones: 2, filter: "isolated" },
    target: { kind: "empty", min: 1, max: 5 },
    effect: "孤立石を燃料に、起点付近へ最大5個の石を展開する。",
    role: "整地",
    flavor: "捨てた星が、戦場の中心へ集まる。"
  },
  {
    id: "S05",
    name: "沈黙",
    rarity: "strong",
    cost: { stones: 3, filter: "any" },
    target: { kind: "none", min: 0, max: 0, exact: true },
    effect: "相手の次ターンのカード使用を封じる。",
    role: "封印",
    flavor: "大技の前に、口を塞ぐ。"
  },
  {
    id: "S06",
    name: "二重守り",
    rarity: "strong",
    cost: { stones: 2, filter: "any" },
    target: { kind: "empty", min: 4, max: 4, exact: true },
    effect: "空きセル4個を2巡後まで封鎖する。",
    role: "防御",
    flavor: "置けない場所を作る。それだけで世界は変わる。"
  },
  {
    id: "S07",
    name: "再装填",
    rarity: "strong",
    cost: { stones: 4, filter: "any", nextCardLock: true },
    target: { kind: "none", min: 0, max: 0, exact: true },
    effect: "使用済みの通常カードを2枚まで未使用に戻す。次の自ターンはカード不可。",
    role: "資源",
    flavor: "使い切った札を、もう一度だけ噛ませる。"
  },
  {
    id: "S08",
    name: "連鎖打ち",
    rarity: "strong",
    cost: { stones: 3, filter: "line" },
    target: { kind: "none", min: 0, max: 0, exact: true },
    effect: "このターンの通常行動後、その周囲にさらに3個置く。",
    role: "攻め",
    flavor: "一手が四手に割れる。"
  },
  {
    id: "U01",
    name: "七星爆誕",
    rarity: "ultimate",
    cost: { stones: 7, filter: "any", actionSkip: true },
    target: { kind: "empty", min: 1, max: 7 },
    effect: "通常行動を放棄し、自石を最大7個まで自由に置く。これで勝ってよい。",
    role: "終局",
    flavor: "七つ置く。それで終わることがある。"
  },
  {
    id: "U02",
    name: "色彩簒奪",
    rarity: "ultimate",
    cost: { stones: 5, filter: "any" },
    target: { kind: "enemy", min: 1, max: 7 },
    effect: "同じ15x15範囲内の相手石を最大7個、自石に変える。",
    role: "奪取",
    flavor: "相手の美しい線を、こちらの色に塗り替える。"
  },
  {
    id: "U03",
    name: "時空裂き",
    rarity: "ultimate",
    cost: { stones: 4, filter: "any", nextCardLock: true },
    target: { kind: "none", min: 0, max: 0, exact: true },
    effect: "このターン通常行動を3回行う。使用済みカード1枚も戻る。",
    role: "加速",
    flavor: "一人だけ、ターンの枚数が違う。"
  },
  {
    id: "U04",
    name: "終局編集",
    rarity: "ultimate",
    cost: { stones: 6, filter: "any", actionSkip: true },
    target: { kind: "any", min: 1, max: 1, exact: true },
    effect: "選んだ地点の7x7内で相手石を最大6個除去し、自石を最大6個置く。",
    role: "改変",
    flavor: "局所盤面を、別の物語へ差し替える。"
  }
];

export const DEFAULT_DECK = ["N01", "N03", "N06", "N12", "S01", "S03", "U01"];

export function getCard(cardId: string): CardDefinition {
  const card = CARD_CATALOG.find((entry) => entry.id === cardId);
  if (!card) throw new Error(`Unknown card: ${cardId}`);
  return card;
}

export function cardsByRarity(rarity: CardDefinition["rarity"]): CardDefinition[] {
  return CARD_CATALOG.filter((card) => card.rarity === rarity);
}

export function rarityLabel(rarity: CardDefinition["rarity"]): string {
  if (rarity === "normal") return "通常";
  if (rarity === "strong") return "強";
  return "最強";
}
