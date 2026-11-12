import type { AchievementId, AchievementSnapshot } from './types';

const STORAGE_KEY = 'ant-defense:achievements:v1';

export const ACHIEVEMENT_DEFS: Record<
  AchievementId,
  { name: string; description: string; icon: string }
> = {
  first_blood: { name: 'FIRST BLOOD', description: 'Eliminate your first ant.', icon: '✦' },
  combo_10: { name: 'CHAIN REACTION', description: 'Reach a 10-kill streak.', icon: '⚡' },
  combo_25: { name: 'UNSTOPPABLE', description: 'Reach a 25-kill streak.', icon: '☄' },
  queen_slayer: { name: 'REGICIDE', description: 'Slay a Queen.', icon: '♛' },
  wave_10: { name: 'IRON WALL', description: 'Reach wave 10.', icon: '⛨' },
  clean_wave: { name: 'SURGICAL', description: 'Clear a wave without a single misfire.', icon: '◎' },
  speed_60: { name: 'QUICK HANDS', description: 'Hold 60 WPM after 30 seconds.', icon: '➶' },
  speed_90: { name: 'LIGHTNING FINGERS', description: 'Hold 90 WPM after 30 seconds.', icon: '⚚' },
  overdrive: { name: 'REDLINE', description: 'Trigger Overdrive.', icon: '◉' },
  mortar_triple: { name: 'ARTILLERIST', description: 'Kill 3+ ants with one mortar shell.', icon: '✸' },
  chain_master: { name: 'STORM CALLER', description: 'Chain lightning through 3 ants at once.', icon: 'ϟ' },
  untouched: { name: 'UNTOUCHED', description: 'Clear wave 5 at full Vitality.', icon: '❖' },
  mutated: { name: 'MUTANT', description: 'Reach wave 5 with 2+ mutators active.', icon: '☣' },
  blackout_5: { name: 'NIGHT OWL', description: 'Reach wave 5 in Blackout.', icon: '◐' },
  zen_100: { name: 'INNER PEACE', description: 'Type 100 words in a Zen drill.', icon: '☯' },
};

export const ACHIEVEMENT_IDS = Object.keys(ACHIEVEMENT_DEFS) as AchievementId[];

export function loadAchievements(): Set<AchievementId> {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set();
    return new Set(ACHIEVEMENT_IDS.filter((id) => parsed.includes(id)));
  } catch {
    return new Set();
  }
}

export function saveAchievements(unlocked: Set<AchievementId>): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...unlocked]));
  } catch {
    // Storage may be unavailable; medals won't persist.
  }
}

export function achievementSnapshots(unlocked: Set<AchievementId>): AchievementSnapshot[] {
  return ACHIEVEMENT_IDS.map((id) => ({
    id,
    ...ACHIEVEMENT_DEFS[id],
    unlocked: unlocked.has(id),
  }));
}
