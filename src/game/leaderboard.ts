import { isDifficultyId } from './difficulty';
import type { DifficultyId } from './difficulty';

export const LEADERBOARD_STORAGE_KEY = 'ant-defense:leaderboard:v1';
export const LEADERBOARD_MAX_ENTRIES = 10;

export interface LeaderboardEntry {
  id: number;
  score: number;
  wave: number;
  wpm: number;
  accuracy: number;
  antsEliminated: number;
  bestCombo: number;
  time: number;
  difficulty: DifficultyId;
  date: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isNonNegativeNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

function isPositiveInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0;
}

function isValidEntry(value: unknown): value is LeaderboardEntry {
  if (!isRecord(value)) return false;
  return (
    isPositiveInteger(value.id) &&
    isNonNegativeNumber(value.score) &&
    isPositiveInteger(value.wave) &&
    isNonNegativeNumber(value.wpm) &&
    isNonNegativeNumber(value.accuracy) &&
    isNonNegativeNumber(value.antsEliminated) &&
    isNonNegativeNumber(value.bestCombo) &&
    isNonNegativeNumber(value.time) &&
    isDifficultyId(value.difficulty) &&
    Number.isFinite(value.date)
  );
}

export function parseLeaderboard(raw: unknown): LeaderboardEntry[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(isValidEntry)
    .slice(0, LEADERBOARD_MAX_ENTRIES)
    .sort((a, b) => b.score - a.score);
}

export function loadLeaderboard(): LeaderboardEntry[] {
  try {
    const raw = window.localStorage.getItem(LEADERBOARD_STORAGE_KEY);
    if (raw === null) return [];
    return parseLeaderboard(JSON.parse(raw));
  } catch {
    // Storage may be unavailable in private mode; the run still counts in memory.
    return [];
  }
}

export function saveLeaderboard(entries: LeaderboardEntry[]): void {
  try {
    window.localStorage.setItem(
      LEADERBOARD_STORAGE_KEY,
      JSON.stringify(entries.slice(0, LEADERBOARD_MAX_ENTRIES)),
    );
  } catch {
    // Storage may be unavailable in private mode; the leaderboard is not persisted.
  }
}

export function addRun(
  entries: LeaderboardEntry[],
  run: Omit<LeaderboardEntry, 'id'>,
): { entries: LeaderboardEntry[]; rank: number | null } {
  if (!Number.isFinite(run.score) || run.score <= 0) {
    return { entries, rank: null };
  }
  const id = entries.reduce((max, entry) => Math.max(max, entry.id), 0) + 1;
  const entry: LeaderboardEntry = { ...run, id };
  const next = [...entries, entry].sort((a, b) => b.score - a.score);
  const rank = next.indexOf(entry) + 1;
  if (rank > LEADERBOARD_MAX_ENTRIES) {
    return { entries: next.slice(0, LEADERBOARD_MAX_ENTRIES), rank: null };
  }
  return { entries: next.slice(0, LEADERBOARD_MAX_ENTRIES), rank };
}
