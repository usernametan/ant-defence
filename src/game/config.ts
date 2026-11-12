import type {
  AntKind,
  AntTypeConfig,
  PowerupType,
  UpgradeId,
  UpgradeOption,
} from './types';

export const VIEW_WIDTH = 1600;
export const VIEW_HEIGHT = 900;

export const WORLD = {
  playerX: 330,
  playerFeetY: 752,
  lineX: 560,
  wireX: 770,
  lineTop: 236,
  lineBottom: 782,
  spawnX: 1650,
  maxActiveAnts: 10,
  health: 100,
};

export const LANES = [
  { y: 646, scale: 0.9 },
  { y: 678, scale: 1.0 },
  { y: 710, scale: 1.1 },
  { y: 741, scale: 1.22 },
] as const;

export const DIFFICULTY = {
  baseQuota: 5,
  quotaPerWave: 2,
  maxQuota: 26,
  baseSpawnInterval: 2.25,
  spawnIntervalPerWave: 0.12,
  minSpawnInterval: 0.62,
  maxActiveAtStart: 4,
  maxActivePerWave: 0.55,
  speedPerWave: 0.055,
  maxSpeedMultiplier: 2.05,
  bossEvery: 5,
  bossMinionEvery: 7.5,
  intermission: 3.6,
  waveBannerTime: 3.1,
};

export const ANT_TYPES: Record<AntKind, AntTypeConfig> = {
  normal: {
    hp: 1,
    speed: 52,
    scale: 1,
    damage: 5,
    score: 100,
    wordRange: [3, 4],
    label: 'NORMAL',
  },
  fast: {
    hp: 1,
    speed: 84,
    scale: 0.88,
    damage: 5,
    score: 145,
    wordRange: [4, 5],
    label: 'FAST',
  },
  armored: {
    hp: 2,
    speed: 40,
    scale: 1.1,
    damage: 10,
    score: 225,
    wordRange: [5, 6],
    label: 'ARMORED',
  },
  giant: {
    hp: 3,
    speed: 31,
    scale: 1.38,
    damage: 15,
    score: 340,
    wordRange: [6, 7],
    label: 'GIANT',
  },
  queen: {
    hp: 8,
    speed: 17,
    scale: 1.85,
    damage: 35,
    score: 1500,
    wordRange: [7, 9],
    label: 'QUEEN',
  },
  weaver: {
    hp: 1,
    speed: 58,
    scale: 0.95,
    damage: 8,
    score: 185,
    wordRange: [4, 5],
    label: 'WEAVER',
  },
  splitter: {
    hp: 1,
    speed: 46,
    scale: 1.15,
    damage: 8,
    score: 90,
    wordRange: [4, 6],
    label: 'SPLITTER',
  },
  leech: {
    hp: 2,
    speed: 34,
    scale: 1.05,
    damage: 6,
    score: 265,
    wordRange: [5, 6],
    label: 'LEECH',
  },
  burrower: {
    hp: 1,
    speed: 62,
    scale: 0.96,
    damage: 7,
    score: 215,
    wordRange: [4, 6],
    label: 'BURROWER',
  },
  pheromone: {
    hp: 2,
    speed: 38,
    scale: 1.12,
    damage: 8,
    score: 280,
    wordRange: [5, 7],
    label: 'CARRIER',
  },
  spitter: {
    hp: 2,
    speed: 35,
    scale: 1.08,
    damage: 8,
    score: 295,
    wordRange: [5, 6],
    label: 'SPITTER',
  },
};

export const LEECH = {
  drainZoneX: 900,
  drainPerTick: 25,
  drainTickInterval: 1,
  maxDrainPerRun: 1000,
} as const;

export const SPECIAL_ANTS = {
  burrowTriggerX: 1120,
  burrowDuration: 1.35,
  burrowSpeedMultiplier: 1.65,
  pheromoneRadius: 230,
  pheromoneSpeedBoost: 1.32,
  spitterStopX: 1020,
  spitterInterval: 4.4,
  acidDamage: 6,
  acidTravelTime: 2.8,
  criticalChance: 0.16,
  criticalBlastRadius: 155,
  criticalBonusScore: 75,
} as const;

export const UPGRADE_DEFS: Record<UpgradeId, UpgradeOption> = {
  ricochet: {
    id: 'ricochet',
    name: 'RICOCHET ROUNDS',
    description: 'Kills arc 1 damage to a nearby ant in range.',
    badge: 'OFFENSE',
  },
  wire: {
    id: 'wire',
    name: 'RAZOR BARRICADE',
    description: 'Barbed wire at mid-field deals 1 damage to multi-HP ants.',
    badge: 'FORTIFY',
  },
  overclock: {
    id: 'overclock',
    name: 'OVERCLOCKED RELAYS',
    description: 'Reduces all ability cooldowns by 28%.',
    badge: 'TECH',
  },
  hollow: {
    id: 'hollow',
    name: 'SHOCKWAVE CORE',
    description: 'Critical word blasts deal +1 damage in a 50% wider radius.',
    badge: 'ORDNANCE',
  },
  medic: {
    id: 'medic',
    name: 'FIELD TRAUMA KIT',
    description: 'Restores +25 Vitality immediately and raises Max HP by +15.',
    badge: 'SURVIVAL',
  },
  mag: {
    id: 'mag',
    name: 'EXTENDED CAPACITOR',
    description: 'Power ability and Overcharge drops grant +2 extra rounds.',
    badge: 'ORDNANCE',
  },
  chain: {
    id: 'chain',
    name: 'CHAIN LIGHTNING',
    description: 'Kills arc 1 damage to up to 3 ants whose words share the same first letter.',
    badge: 'STORM',
  },
  drone: {
    id: 'drone',
    name: 'DRONE WINGMAN',
    description: 'A hovering drone snipes the lead ant. Fires faster as your streak grows.',
    badge: 'SUPPORT',
  },
};

export const CHAIN = {
  maxTargets: 3,
  damage: 1,
} as const;

export const DRONE = {
  baseInterval: 4,
  minInterval: 1.5,
  comboSpeedup: 0.12,
  damage: 1,
} as const;

export const MORTAR = {
  fuse: 1.15,
  radius: 150,
  damage: 2,
  knockback: 34,
} as const;

export const OVERDRIVE = {
  perKey: 0.013,
  cleanWordBonus: 0.03,
  mistakePenalty: 0.22,
  breachPenalty: 0.3,
  duration: 8,
  scoreMultiplier: 2,
  bonusDamage: 1,
} as const;

export const POWERUPS = {
  minWave: 3,
  dropChance: 0.075,
  lifetime: 9,
  maxOnField: 2,
  medHeal: 15,
  ampCharges: 3,
  maxPowerCharges: 8,
  surgeDuration: 10,
  surgeMultiplier: 2,
} as const;

export const POWERUP_DEFS: Record<PowerupType, { word: string; name: string }> = {
  med: { word: 'MED', name: 'MEDKIT' },
  amp: { word: 'AMP', name: 'OVERCHARGE' },
  gold: { word: 'GOLD', name: 'GOLD SURGE' },
};

export const ABILITIES = {
  focus: {
    key: '1',
    name: 'FOCUS',
    description: 'Slows the colony',
    duration: 6,
    cooldown: 28,
    slowFactor: 0.38,
  },
  aegis: {
    key: '2',
    name: 'AEGIS',
    description: 'Absorbs breaches',
    duration: 8,
    cooldown: 34,
  },
  power: {
    key: '3',
    name: 'POWER',
    description: 'Piercing rounds',
    charges: 3,
    cooldown: 24,
  },
  mortar: {
    key: '4',
    name: 'MORTAR',
    description: 'Shells the densest cluster',
    cooldown: 30,
  },
} as const;

export const PLAYER = {
  bulletSpeed: 2350,
  bulletLife: 1.2,
  baseDamage: 1,
  poweredDamage: 3,
  recoilTime: 0.26,
  aimHoldTime: 1.6,
  muzzleFlashTime: 0.075,
  comboWindow: 5.5,
};

export const COLOR = {
  ink: '#050506',
  inkSoft: '#11131a',
  gold: '#f2c364',
  goldBright: '#ffe3a0',
  red: '#ff4646',
  green: '#7df0a9',
  cream: '#f4ead6',
  blue: '#8fc7ff',
};
