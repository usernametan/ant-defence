export const MOTION_STORAGE_KEY = 'ant-defense:reduced-motion:v1';
export const SCENERY_MODE_STORAGE_KEY = 'ant-defense:scenery-mode:v1';
export const WORD_PACK_STORAGE_KEY = 'ant-defense:word-pack:v1';

export type SceneryMode = 'photo' | 'procedural';
export type WordPackId = 'standard' | 'code' | 'hardcore' | 'daily';

export const WORD_PACK_IDS: WordPackId[] = [
  'standard',
  'code',
  'hardcore',
  'daily',
];

export const WORD_PACK_META: Record<
  WordPackId,
  { label: string; description: string }
> = {
  standard: {
    label: 'SWARM',
    description: 'CLASSIC COLONY VOCABULARY',
  },
  code: {
    label: 'CODE',
    description: 'DEV & SYSTEM KEYWORDS',
  },
  hardcore: {
    label: 'LEXICON',
    description: 'COMPLEX TACTICAL DICTIONARY',
  },
  daily: {
    label: 'DAILY SEED',
    description: 'FIXED DAILY RNG SEQUENCE',
  },
};

export function prefersReducedMotion(): boolean {
  try {
    return (
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    );
  } catch {
    return false;
  }
}

export function loadReducedMotion(): boolean {
  try {
    const stored = window.localStorage.getItem(MOTION_STORAGE_KEY);
    if (stored === '1') return true;
    if (stored === '0') return false;
  } catch {
    // Storage may be unavailable in private mode; fall back to the OS preference.
  }
  return prefersReducedMotion();
}

export function saveReducedMotion(value: boolean): void {
  try {
    window.localStorage.setItem(MOTION_STORAGE_KEY, value ? '1' : '0');
  } catch {
    // Storage may be unavailable in private mode; the choice won't persist.
  }
}

export function loadSceneryMode(): SceneryMode {
  try {
    const stored = window.localStorage.getItem(SCENERY_MODE_STORAGE_KEY);
    if (stored === 'photo' || stored === 'procedural') return stored;
  } catch {
    // Ignore storage errors
  }
  return 'photo';
}

export function saveSceneryMode(mode: SceneryMode): void {
  try {
    window.localStorage.setItem(SCENERY_MODE_STORAGE_KEY, mode);
  } catch {
    // Ignore storage errors
  }
}

export function isWordPackId(value: unknown): value is WordPackId {
  return (
    value === 'standard' ||
    value === 'code' ||
    value === 'hardcore' ||
    value === 'daily'
  );
}

export function loadWordPack(): WordPackId {
  try {
    const stored = window.localStorage.getItem(WORD_PACK_STORAGE_KEY);
    return isWordPackId(stored) ? stored : 'standard';
  } catch {
    return 'standard';
  }
}

export function saveWordPack(pack: WordPackId): void {
  try {
    window.localStorage.setItem(WORD_PACK_STORAGE_KEY, pack);
  } catch {
    // Ignore storage errors
  }
}
