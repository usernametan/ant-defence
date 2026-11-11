export const PROGRESS_STORAGE_KEY = 'ant-defense:progress:v1';

export interface PlayerProgress {
  gamesPlayed: number;
  bestScore: number;
  bestWpm: number;
  bestAccuracy: number;
  totalAntsEliminated: number;
}

export interface RunSummary {
  score: number;
  wpm: number;
  accuracy: number;
  antsEliminated: number;
  keysTyped: number;
}

export interface NewRecords {
  score: boolean;
  wpm: boolean;
  accuracy: boolean;
}

export interface AppliedRun {
  progress: PlayerProgress;
  newRecords: NewRecords;
}

export function emptyProgress(): PlayerProgress {
  return {
    gamesPlayed: 0,
    bestScore: 0,
    bestWpm: 0,
    bestAccuracy: 0,
    totalAntsEliminated: 0,
  };
}

function isNonNegativeInteger(value: unknown): value is number {
  return (
    typeof value === 'number' &&
    Number.isInteger(value) &&
    value >= 0
  );
}

function isNonNegativeNumber(value: unknown): value is number {
  return (
    typeof value === 'number' &&
    Number.isFinite(value) &&
    value >= 0
  );
}

function parseProgress(raw: string | null): PlayerProgress {
  if (!raw) return emptyProgress();
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) {
      return emptyProgress();
    }
    const value = parsed as Record<string, unknown>;
    if (
      !isNonNegativeInteger(value.gamesPlayed) ||
      !isNonNegativeNumber(value.bestScore) ||
      !isNonNegativeNumber(value.bestWpm) ||
      !isNonNegativeNumber(value.bestAccuracy) ||
      value.bestAccuracy > 100 ||
      !isNonNegativeInteger(value.totalAntsEliminated)
    ) {
      return emptyProgress();
    }
    return {
      gamesPlayed: value.gamesPlayed,
      bestScore: value.bestScore,
      bestWpm: value.bestWpm,
      bestAccuracy: value.bestAccuracy,
      totalAntsEliminated: value.totalAntsEliminated,
    };
  } catch {
    return emptyProgress();
  }
}

export function loadProgress(): PlayerProgress {
  try {
    return parseProgress(window.localStorage.getItem(PROGRESS_STORAGE_KEY));
  } catch {
    return emptyProgress();
  }
}

export function saveProgress(progress: PlayerProgress): void {
  try {
    window.localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(progress));
  } catch {
    // Storage may be unavailable in private mode; records just won't persist.
  }
}

export function applyRun(
  progress: PlayerProgress,
  run: RunSummary,
): AppliedRun {
  const qualifiesForAccuracy = run.keysTyped > 0;
  return {
    progress: {
      gamesPlayed: progress.gamesPlayed + 1,
      bestScore: Math.max(progress.bestScore, run.score),
      bestWpm: Math.max(progress.bestWpm, run.wpm),
      bestAccuracy: qualifiesForAccuracy
        ? Math.max(progress.bestAccuracy, run.accuracy)
        : progress.bestAccuracy,
      totalAntsEliminated:
        progress.totalAntsEliminated + run.antsEliminated,
    },
    newRecords: {
      score: run.score > progress.bestScore,
      wpm: run.wpm > progress.bestWpm,
      accuracy:
        qualifiesForAccuracy && run.accuracy > progress.bestAccuracy,
    },
  };
}
