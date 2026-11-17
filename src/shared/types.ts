/** Shared domain contract for Zone Control. No DOM, no framework, no runtime code. */

export interface Vec2 {
  x: number;
  y: number;
}

export type Team = 'player' | 'enemy';

export type WeaponId =
  | 'pistol'
  | 'smg'
  | 'shotgun'
  | 'rifle'
  | 'sniper'
  | 'rocket';

export type Rarity = 'common' | 'rare' | 'epic';

/** Balance stats for a weapon. Single source of truth lives in api.ts. */
export interface WeaponDef {
  id: WeaponId;
  name: string;
  /** Damage per projectile (shotgun damage is per pellet). */
  damage: number;
  /** Shots per second. */
  fireRate: number;
  magSize: number;
  /** Seconds to reload an empty magazine. */
  reloadTime: number;
  /** Max spread angle in radians. */
  spread: number;
  /** World units per second. */
  projectileSpeed: number;
  /** Max travel distance in world units. */
  range: number;
  /** Projectiles fired per trigger pull. */
  pellets: number;
  /** Explosion radius in world units; 0 means no splash. */
  splashRadius: number;
  rarity: Rarity;
  automatic: boolean;
}

export type TileKind =
  | 'floor'
  | 'wall'
  | 'lowCover'
  | 'water'
  | 'spawnPlayer'
  | 'spawnEnemy';

export interface ZoneDef {
  id: string;
  center: Vec2;
  radius: number;
}

export interface BaseDef {
  team: Team;
  center: Vec2;
  radius: number;
  coreHp: number;
}

export interface MapData {
  seed: number;
  /** Columns of the tile grid. */
  width: number;
  /** Rows of the tile grid. */
  height: number;
  tileSize: number;
  tiles: TileKind[][];
  /** Remaining hit points for destructible cover, keyed by "col,row". */
  coverHp: Record<string, number>;
  zones: ZoneDef[];
  bases: BaseDef[];
  crateSpawns: Vec2[];
}

/** High-level behaviour state used by AI units. */
export type AiState =
  | 'idle'
  | 'advance'
  | 'engage'
  | 'takeCover'
  | 'reload'
  | 'seekPickup'
  | 'retreat';

export interface Unit {
  id: string;
  team: Team;
  pos: Vec2;
  vel: Vec2;
  /** Facing / aim angle in radians. */
  angle: number;
  hp: number;
  maxHp: number;
  weaponId: WeaponId;
  ammoInMag: number;
  reserveAmmo: number;
  reloading: boolean;
  /** 0..1 while reloading. */
  reloadProgress: number;
  isPlayer: boolean;
  dead: boolean;
  /** Seconds remaining before respawn; 0 while alive. */
  respawnIn: number;
  aiState?: AiState;
  kills: number;
  deaths: number;
}

export interface Projectile {
  id: string;
  team: Team;
  pos: Vec2;
  vel: Vec2;
  weaponId: WeaponId;
  ownerId: string;
  /** Remaining lifetime in seconds. */
  life: number;
  damage: number;
  splashRadius: number;
}

export interface Pickup {
  id: string;
  pos: Vec2;
  weaponId: WeaponId;
  rarity: Rarity;
  /** Remaining lifetime in seconds. */
  ttl: number;
}

export interface ZoneState {
  id: string;
  owner: Team | 'neutral';
  /** -1 (fully enemy) .. 1 (fully player), 0 neutral. */
  progress: number;
  contested: boolean;
}

export type MatchDifficulty = 'easy' | 'normal' | 'hard';

export interface MatchConfig {
  seed: number;
  difficulty: MatchDifficulty;
  scoreToWin: number;
  enemyCount: number;
  startingWeapon: WeaponId;
}

export type MatchStatus = 'menu' | 'playing' | 'paused' | 'won' | 'lost';

export interface GameState {
  tick: number;
  /** Elapsed simulation time in seconds. */
  time: number;
  map: MapData;
  units: Unit[];
  projectiles: Projectile[];
  pickups: Pickup[];
  zones: ZoneState[];
  score: { player: number; enemy: number };
  baseHp: { player: number; enemy: number };
  status: MatchStatus;
  playerId: string;
  matchConfig: MatchConfig;
}

/** Per-frame control intent supplied by src/app/. */
export interface InputState {
  /** -1..1 strafe axis. */
  moveX: number;
  /** -1..1 forward axis. */
  moveY: number;
  /** Aim target in world coordinates. */
  aimX: number;
  /** Aim target in world coordinates. */
  aimY: number;
  firing: boolean;
  reload: boolean;
  interact: boolean;
  swapWeapon: boolean;
  dash: boolean;
}
