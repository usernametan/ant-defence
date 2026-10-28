import type { AntKind, AntTypeConfig } from './types';

export const VIEW_WIDTH = 1600;
export const VIEW_HEIGHT = 900;

export const WORLD = {
  playerX: 330,
  playerFeetY: 752,
  lineX: 560,
  lineTop: 236,
  lineBottom: 782,
  spawnX: 1650,
  maxActiveAnts: 9,
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
  bossBaseHp: 11,
  bossHpPerWave: 2,
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
    description: '3 piercing rounds',
    charges: 3,
    cooldown: 24,
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
