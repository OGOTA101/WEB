import type { HighScoreEntry } from "./types";

const KEY = "core-block-arena.highScores";

export function loadHighScores(): HighScoreEntry[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as HighScoreEntry[];
    return Array.isArray(parsed) ? parsed.slice(0, 10) : [];
  } catch {
    return [];
  }
}

export function saveHighScore(entry: HighScoreEntry): HighScoreEntry[] {
  const scores = [...loadHighScores(), entry].sort((a, b) => b.score - a.score).slice(0, 10);
  localStorage.setItem(KEY, JSON.stringify(scores));
  return scores;
}
