export const DIFFICULTY_STORAGE_KEY = 'ant-defense:difficulty:v1';

export type DifficultyId = 'relaxed' | 'standard' | 'hard';

export interface DifficultyPreset {
  label: string;
  description: string;
  antSpeedScale: number;
  spawnIntervalScale: number;
  quotaScale: number;
  maxActiveBias: number;
}

export const DIFFICULTY_PRESETS: Record<DifficultyId, DifficultyPreset> = {
  relaxed: {
    label: 'RELAXED',
    description: 'SLOWER ANTS — LIGHTER WAVES',
    antSpeedScale: 0.82,
    spawnIntervalScale: 1.25,
    quotaScale: 0.78,
    maxActiveBias: -1,
  },
  standard: {
    label: 'STANDARD',
    description: 'THE INTENDED BALANCE',
    antSpeedScale: 1,
    spawnIntervalScale: 1,
    quotaScale: 1,
    maxActiveBias: 0,
  },
  hard: {
    label: 'HARD',
    description: 'FASTER ANTS — HEAVIER WAVES',
    antSpeedScale: 1.18,
    spawnIntervalScale: 0.8,
    quotaScale: 1.22,
    maxActiveBias: 1,
  },
};

export const DIFFICULTY_IDS: DifficultyId[] = ['relaxed', 'standard', 'hard'];

export const DEFAULT_DIFFICULTY: DifficultyId = 'standard';

export function isDifficultyId(value: unknown): value is DifficultyId {
  return (
    value === 'relaxed' || value === 'standard' || value === 'hard'
  );
}

export function loadDifficulty(): DifficultyId {
  try {
    const stored = window.localStorage.getItem(DIFFICULTY_STORAGE_KEY);
    return isDifficultyId(stored) ? stored : DEFAULT_DIFFICULTY;
  } catch {
    return DEFAULT_DIFFICULTY;
  }
}

export function saveDifficulty(id: DifficultyId): void {
  try {
    window.localStorage.setItem(DIFFICULTY_STORAGE_KEY, id);
  } catch {
    // Storage may be unavailable in private mode; the choice won't persist.
  }
}
