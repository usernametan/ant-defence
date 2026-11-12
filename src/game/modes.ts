import type { GameMode, MutatorId } from './types';

const MODE_STORAGE_KEY = 'ant-defense:mode:v1';
const MUTATOR_STORAGE_KEY = 'ant-defense:mutators:v1';

export interface ModeMeta {
  label: string;
  tagline: string;
  description: string;
  icon: string;
  scoreMultiplier: number;
  records: boolean;
}

export const MODE_IDS: GameMode[] = ['classic', 'bossrush', 'blackout', 'zen'];

export const MODE_META: Record<GameMode, ModeMeta> = {
  classic: {
    label: 'CAMPAIGN',
    tagline: 'THE ORIGINAL SIEGE',
    description: 'Escalating waves, a Queen every fifth wave, field upgrades between battles.',
    icon: '⚔',
    scoreMultiplier: 1,
    records: true,
  },
  bossrush: {
    label: 'BOSS RUSH',
    tagline: 'EVERY WAVE A QUEEN',
    description: 'Skip the scouts. Each wave is a royal assault with a Queen and her guard.',
    icon: '♛',
    scoreMultiplier: 1.4,
    records: true,
  },
  blackout: {
    label: 'BLACKOUT',
    tagline: 'FIGHT BY TORCHLIGHT',
    description: 'Words stay hidden in the dark until ants enter your flashlight beam.',
    icon: '◐',
    scoreMultiplier: 1.5,
    records: true,
  },
  zen: {
    label: 'ZEN DRILL',
    tagline: 'NO DAMAGE • PURE PRACTICE',
    description: 'The line cannot fall. Train speed and accuracy, end the drill from pause.',
    icon: '☯',
    scoreMultiplier: 0,
    records: false,
  },
};

export interface MutatorMeta {
  label: string;
  description: string;
  icon: string;
  scoreMultiplier: number;
}

export const MUTATOR_IDS: MutatorId[] = ['nobackspace', 'glass', 'swift', 'heavy'];

export const MUTATOR_META: Record<MutatorId, MutatorMeta> = {
  nobackspace: {
    label: 'NO RETREAT',
    description: 'Backspace is disabled.',
    icon: '⌫',
    scoreMultiplier: 1.25,
  },
  glass: {
    label: 'GLASS LINE',
    description: 'Start with half Vitality.',
    icon: '◇',
    scoreMultiplier: 1.5,
  },
  swift: {
    label: 'SWIFT SWARM',
    description: 'Ants march 25% faster.',
    icon: '»',
    scoreMultiplier: 1.3,
  },
  heavy: {
    label: 'IRON SHELLS',
    description: 'Many scouts arrive armored.',
    icon: '⬢',
    scoreMultiplier: 1.3,
  },
};

export function isGameMode(value: unknown): value is GameMode {
  return typeof value === 'string' && (MODE_IDS as string[]).includes(value);
}

export function isMutatorId(value: unknown): value is MutatorId {
  return typeof value === 'string' && (MUTATOR_IDS as string[]).includes(value);
}

export function loadMode(): GameMode {
  try {
    const stored = window.localStorage.getItem(MODE_STORAGE_KEY);
    return isGameMode(stored) ? stored : 'classic';
  } catch {
    return 'classic';
  }
}

export function saveMode(mode: GameMode): void {
  try {
    window.localStorage.setItem(MODE_STORAGE_KEY, mode);
  } catch {
    // Storage may be unavailable; the choice won't persist.
  }
}

export function loadMutators(): MutatorId[] {
  try {
    const raw = window.localStorage.getItem(MUTATOR_STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return MUTATOR_IDS.filter((id) => parsed.includes(id));
  } catch {
    return [];
  }
}

export function saveMutators(mutators: MutatorId[]): void {
  try {
    window.localStorage.setItem(MUTATOR_STORAGE_KEY, JSON.stringify(mutators));
  } catch {
    // Storage may be unavailable; the choice won't persist.
  }
}

export function scoreMultiplierFor(mode: GameMode, mutators: MutatorId[]): number {
  const base = MODE_META[mode].scoreMultiplier;
  if (base === 0) return 0;
  return mutators.reduce((acc, id) => acc * MUTATOR_META[id].scoreMultiplier, base);
}
