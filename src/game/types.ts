export type GamePhase = 'menu' | 'playing' | 'paused' | 'gameover';

export type AntKind = 'normal' | 'fast' | 'armored' | 'giant' | 'queen';

export type AbilityId = 'focus' | 'aegis' | 'power';

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
  hitFlash: number;
  boss: boolean;
  nextMinionAt: number;
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

export interface AbilitySnapshot {
  id: AbilityId;
  key: string;
  name: string;
  description: string;
  cooldown: number;
  active: number;
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
  combo: number;
  bestCombo: number;
  correctWords: number;
  mistakes: number;
  accuracy: number;
  wpm: number;
  muted: boolean;
  abilities: AbilitySnapshot[];
  shieldSeconds: number;
  slowSeconds: number;
  powerCharges: number;
  banner: BannerSnapshot | null;
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
  };
}
