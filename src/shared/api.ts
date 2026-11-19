import type {
  GameState,
  InputState,
  MatchConfig,
  WeaponDef,
  WeaponId,
} from './types';

/**
 * The contract between the pure simulation and every presentation track.
 * Only src/app/ owns an instance; render, UI, and audio read state via getState
 * and listen to the shared bus.
 */
export interface SimApi {
  start(config: MatchConfig): void;
  setInput(input: InputState): void;
  /** Advance the sim; fixed-step subdivision is handled internally. */
  step(dtSeconds: number): void;
  getState(): Readonly<GameState>;
  pause(): void;
  resume(): void;
  restart(): void;
}

/** Single source of truth for weapon stats. */
export const WEAPON_DEFS: Record<WeaponId, WeaponDef> = {
  pistol: {
    id: 'pistol',
    name: 'Pistol',
    damage: 24,
    fireRate: 5,
    magSize: 12,
    reloadTime: 1.2,
    spread: 0.035,
    projectileSpeed: 900,
    range: 600,
    pellets: 1,
    splashRadius: 0,
    rarity: 'common',
    automatic: false,
  },
  smg: {
    id: 'smg',
    name: 'SMG',
    damage: 13,
    fireRate: 12,
    magSize: 30,
    reloadTime: 1.6,
    spread: 0.11,
    projectileSpeed: 820,
    range: 420,
    pellets: 1,
    splashRadius: 0,
    rarity: 'common',
    automatic: true,
  },
  shotgun: {
    id: 'shotgun',
    name: 'Shotgun',
    damage: 11,
    fireRate: 1.4,
    magSize: 6,
    reloadTime: 2.1,
    spread: 0.22,
    projectileSpeed: 700,
    range: 320,
    pellets: 8,
    splashRadius: 0,
    rarity: 'rare',
    automatic: false,
  },
  rifle: {
    id: 'rifle',
    name: 'Rifle',
    damage: 30,
    fireRate: 6.5,
    magSize: 24,
    reloadTime: 1.8,
    spread: 0.05,
    projectileSpeed: 1100,
    range: 820,
    pellets: 1,
    splashRadius: 0,
    rarity: 'rare',
    automatic: true,
  },
  sniper: {
    id: 'sniper',
    name: 'Sniper',
    damage: 95,
    fireRate: 0.8,
    magSize: 5,
    reloadTime: 2.5,
    spread: 0.006,
    projectileSpeed: 1700,
    range: 1500,
    pellets: 1,
    splashRadius: 0,
    rarity: 'epic',
    automatic: false,
  },
  rocket: {
    id: 'rocket',
    name: 'Rocket',
    damage: 85,
    fireRate: 0.6,
    magSize: 3,
    reloadTime: 2.8,
    spread: 0.02,
    projectileSpeed: 500,
    range: 900,
    pellets: 1,
    splashRadius: 130,
    rarity: 'epic',
    automatic: false,
  },
};

/** Default grenade balance stats. Single source of truth for sim and presentation. */
export const GRENADE_DEF = {
  defaultCount: 2,
  speed: 440,
  fuseTime: 1.15,
  damage: 110,
  splashRadius: 145,
  cooldown: 0.65,
} as const;
