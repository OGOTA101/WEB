import { CARD_CATALOG, DEFAULT_DECK, getCard } from "./cards";

const STORAGE_KEY = "nanamoku.deck.v1";

export interface DeckValidation {
  ok: boolean;
  message: string;
}

export function loadDeck(): string[] {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [...DEFAULT_DECK];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && validateDeck(parsed).ok) return parsed;
  } catch {
    return [...DEFAULT_DECK];
  }
  return [...DEFAULT_DECK];
}

export function saveDeck(deck: string[]): DeckValidation {
  const validation = validateDeck(deck);
  if (!validation.ok) return validation;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(deck));
  return validation;
}

export function validateDeck(deck: string[]): DeckValidation {
  const unique = new Set(deck);
  if (deck.length !== 7) return { ok: false, message: "デッキは7枚です" };
  if (unique.size !== deck.length) return { ok: false, message: "同じカードは1枚までです" };
  if (deck.some((id) => !CARD_CATALOG.some((card) => card.id === id))) return { ok: false, message: "存在しないカードがあります" };

  const normal = deck.filter((id) => getCard(id).rarity === "normal").length;
  const strong = deck.filter((id) => getCard(id).rarity === "strong").length;
  const ultimate = deck.filter((id) => getCard(id).rarity === "ultimate").length;
  if (normal !== 4) return { ok: false, message: "通常カードは4枚必要です" };
  if (strong !== 2) return { ok: false, message: "強カードは2枚必要です" };
  if (ultimate !== 1) return { ok: false, message: "最強カードは1枚必要です" };
  return { ok: true, message: "保存しました" };
}

export function toggleCard(deck: string[], cardId: string): string[] {
  if (deck.includes(cardId)) return deck.filter((id) => id !== cardId);
  const card = getCard(cardId);
  const limits = { normal: 4, strong: 2, ultimate: 1 };
  const sameRarity = deck.filter((id) => getCard(id).rarity === card.rarity);
  if (sameRarity.length >= limits[card.rarity]) {
    const withoutFirstSame = deck.filter((id) => id !== sameRarity[0]);
    return [...withoutFirstSame, cardId].sort(sortDeck);
  }
  return [...deck, cardId].sort(sortDeck);
}

export function sortDeck(a: string, b: string): number {
  const rarityOrder = { normal: 0, strong: 1, ultimate: 2 };
  const cardA = getCard(a);
  const cardB = getCard(b);
  return rarityOrder[cardA.rarity] - rarityOrder[cardB.rarity] || cardA.id.localeCompare(cardB.id);
}

export function deckCounts(deck: string[]): { normal: number; strong: number; ultimate: number } {
  return {
    normal: deck.filter((id) => getCard(id).rarity === "normal").length,
    strong: deck.filter((id) => getCard(id).rarity === "strong").length,
    ultimate: deck.filter((id) => getCard(id).rarity === "ultimate").length
  };
}
