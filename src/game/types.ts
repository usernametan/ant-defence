import type { DifficultyId } from './difficulty';
import type { LeaderboardEntry } from './leaderboard';
import type { NewRecords, PlayerProgress } from './progress';
import type { SceneryMode, WordPackId } from './settings';

export type GamePhase = 'menu' | 'playing' | 'paused' | 'upgrade' | 'gameover';

export type BiomeId = 'dusk' | 'night' | 'ash';

export interface WpmSample {
  t: number;
  wpm: number;
}

export type AntKind =
  | 'normal'
  | 'fast'
  | 'armored'
  | 'giant'
  | 'queen'
  | 'weaver'
  | 'splitter'
  | 'leech'
  | 'burrower'
  | 'pheromone'
  | 'spitter';

export type PowerupType = 'med' | 'amp' | 'gold';

export type AbilityId = 'focus' | 'aegis' | 'power' | 'mortar';

export type GameMode = 'classic' | 'zen' | 'bossrush' | 'blackout';

export type MutatorId = 'nobackspace' | 'glass' | 'swift' | 'heavy';

export type AchievementId =
  | 'first_blood'
  | 'combo_10'
  | 'combo_25'
  | 'queen_slayer'
  | 'wave_10'
  | 'clean_wave'
  | 'speed_60'
  | 'speed_90'
  | 'overdrive'
  | 'mortar_triple'
  | 'chain_master'
  | 'untouched'
  | 'mutated'
  | 'blackout_5'
  | 'zen_100';

export type UpgradeId =
  | 'ricochet'
  | 'wire'
  | 'overclock'
  | 'hollow'
  | 'medic'
  | 'mag'
  | 'chain'
  | 'drone';

export interface UpgradeOption {
  id: UpgradeId;
  name: string;
  description: string;
  badge: string;
}

export interface AntTypeConfig {
  hp: number;
  speed: number;
  scale: number;
  damage: number;
  score: number;
  wordRange: readonly [number, number];
  label: string;
}

export interface Ant {
  id: number;
  kind: AntKind;
  x: number;
  y: number;
  lane: number;
  scale: number;
  speed: number;
  hp: number;
  maxHp: number;
  word: string;
  alive: boolean;
  deathTimer: number;
  spawnTimer: number;
  legPhase: number;
  swayPhase: number;
  drainTimer: number;
  hitFlash: number;
  boss: boolean;
  minionTimer: number;
  critical: boolean;
  burrowed: boolean;
  burrowTimer: number;
  hasBurrowed: boolean;
  spitTimer: number;
  wireTriggered: boolean;
  boosted: boolean;
}

export interface AcidGlob {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  word: string;
  damage: number;
  life: number;
  maxLife: number;
}

export interface Pickup {
  id: number;
  type: PowerupType;
  word: string;
  x: number;
  y: number;
  life: number;
  maxLife: number;
  bobPhase: number;
}

export interface Bullet {
  id: number;
  x: number;
  y: number;
  targetId: number;
  targetX: number;
  targetY: number;
  damage: number;
  speed: number;
  trail: Array<{ x: number; y: number }>;
  life: number;
  powered: boolean;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  gravity: number;
  drag: number;
  shape: 'spark' | 'dust' | 'leaf' | 'ring';
}

export interface FloatingText {
  x: number;
  y: number;
  text: string;
  color: string;
  life: number;
  maxLife: number;
  size: number;
}

export interface MortarShell {
  id: number;
  x: number;
  y: number;
  timer: number;
  maxTimer: number;
  radius: number;
}

export interface LightningArc {
  points: Array<{ x: number; y: number }>;
  life: number;
  maxLife: number;
  color: string;
  width: number;
}

export interface DroneState {
  x: number;
  y: number;
  timer: number;
  phase: number;
  flash: number;
}

export interface AchievementSnapshot {
  id: AchievementId;
  name: string;
  description: string;
  icon: string;
  unlocked: boolean;
}

export interface ToastSnapshot {
  key: number;
  title: string;
  subtitle: string;
  icon: string;
  until: number;
}

export interface AbilitySnapshot {
  id: AbilityId;
  key: string;
  name: string;
  description: string;
  cooldown: number;
  maxCooldown: number;
  active: number;
  maxActive: number;
  charges: number;
}

export interface BannerSnapshot {
  key: number;
  title: string;
  subtitle: string;
  until: number;
}

export interface HudSnapshot {
  phase: GamePhase;
  health: number;
  maxHealth: number;
  wave: number;
  elapsed: number;
  eliminated: number;
  score: number;
  typed: string;
  targetWord: string;
  targetSelected: boolean;
  targetIsPickup: boolean;
  targetIsAcid: boolean;
  targetCritical: boolean;
  scoreSurgeSeconds: number;
  leechDraining: boolean;
  runRank: number | null;
  leaderboard: LeaderboardEntry[];
  combo: number;
  bestCombo: number;
  correctWords: number;
  mistakes: number;
  accuracy: number;
  wpm: number;
  muted: boolean;
  reducedMotion: boolean;
  sceneryMode: SceneryMode;
  biome: BiomeId;
  wordPack: WordPackId;
  activeUpgrades: UpgradeId[];
  upgradeChoices: UpgradeOption[];
  abilities: AbilitySnapshot[];
  shieldSeconds: number;
  slowSeconds: number;
  powerCharges: number;
  banner: BannerSnapshot | null;
  records: PlayerProgress;
  newRecords: NewRecords;
  difficulty: DifficultyId;
  mode: GameMode;
  mutators: MutatorId[];
  scoreMultiplier: number;
  overdrive: number;
  overdriveSeconds: number;
  hasDrone: boolean;
  bossWave: boolean;
  achievements: AchievementSnapshot[];
  runAchievements: AchievementId[];
  toasts: ToastSnapshot[];
  streakPop: { key: number; value: number } | null;
  grade: string;
  inputError: boolean;
  breached: boolean;
  waveProgress: number;
  stats: {
    wavesSurvived: number;
    antsEliminated: number;
    score: number;
    accuracy: number;
    bestCombo: number;
    correctWords: number;
    mistakes: number;
    time: number;
    wpm: number;
    wpmHistory: WpmSample[];
  };
}
