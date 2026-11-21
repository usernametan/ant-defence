/** Shared domain contract for Zone Control. No DOM, no framework, no runtime code. */

export interface Vec2 {
  x: number;
  y: number;
}

export type Team = 'player' | 'enemy';

export type GameMode = 'zoneControl' | 'rampage' | 'hellcell';

export type WeaponId =
  | 'pistol'
  | 'smg'
  | 'shotgun'
  | 'rifle'
  | 'sniper'
  | 'rocket';

export type KillSource = WeaponId | 'grenade' | 'boss';

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

export type MapTheme = 'fortress' | 'jungle' | 'temple' | 'slumside';

export interface MapData {
  seed: number;
  theme?: MapTheme;
  /** Columns of the tile grid. */
  width: number;
  /** Rows of the tile grid. */
  height: number;
  tileSize: number;
  tiles: TileKind[][];
  /** Remaining hit points for destructible cover, keyed by "col,row". */
  coverHp: Record<string, number>;
  /** Incremented when interior walls are crushed or restored (e.g. Hellcell bosses). */
  wallRevision?: number;
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
  name?: string;
  pos: Vec2;
  vel: Vec2;
  /** Facing / aim angle in radians. */
  angle: number;
  hp: number;
  maxHp: number;
  shield?: number;
  maxShield?: number;
  weaponId: WeaponId;
  ammoInMag: number;
  reserveAmmo: number;
  grenades?: number;
  /** Remaining dash cooldown in seconds (0 when ready). */
  dashCooldown?: number;
  /** Total dash cooldown duration in seconds. */
  dashMaxCooldown?: number;
  /** Remaining grenade throw cooldown in seconds (0 when ready). */
  grenadeCooldown?: number;
  /** Total grenade throw cooldown duration in seconds. */
  grenadeMaxCooldown?: number;
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

export interface Grenade {
  id: string;
  ownerId: string;
  team: Team;
  pos: Vec2;
  vel: Vec2;
  /** Remaining fuse / travel time in seconds before detonation. */
  fuse: number;
  maxFuse: number;
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
  kind?: 'weapon' | 'shield';
  shieldAmount?: number;
}

export type HellcellPhase = 'NORMAL' | 'WARNING' | 'CEASEFIRE_BOSS' | 'RESUME_COUNTDOWN';

export type BossKind = 'rocketSiegeBot' | 'venomCobra' | 'pharaohSkeleton' | 'mumbaiTrain';

export type TrainBehavior =
  | 'cruise'
  | 'chargeWindup'
  | 'chargeDash'
  | 'chargeRecover'
  | 'electricWindup'
  | 'electricPulse';

export interface TrainCoachState {
  pos: Vec2;
  angle: number;
}

export interface TrainBossState {
  coaches: TrainCoachState[];
  speed: number;
  behavior: TrainBehavior;
  behaviorTimer: number;
  actionIndex: number;
  chargeAngle: number;
  chargeLength: number;
  electricRadius: number;
  hitUnitIds: string[];
}

export interface HellcellBoss {
  id: string;
  kind: BossKind;
  name: string;
  subtitle?: string;
  pos: Vec2;
  radius: number;
  angle: number;
  targetAngle: number;
  moveAngle?: number;
  moveTimer?: number;
  hp: number;
  maxHp: number;
  attackTimer: number;
  /** 0..1 recoil/punch animation timer. */
  attackAnim: number;
  /** Articulated multi-coach state for the Slumside Mumbai Local Train boss. */
  trainState?: TrainBossState;
}

export interface BossReticle {
  id: string;
  startPos: Vec2;
  targetPos: Vec2;
  timer: number;
  maxTimer: number;
  splashRadius: number;
  damage: number;
}

export interface AcidPool {
  id: string;
  pos: Vec2;
  tileX: number;
  tileY: number;
  ttl: number;
  maxTtl: number;
  dps: number;
}

export interface VenomCone {
  pos: Vec2;
  angle: number;
  halfArc: number;
  range: number;
  ttl: number;
  maxTtl: number;
}

export interface BossProjectile {
  id: string;
  kind: 'rocket' | 'venomBlob' | 'bone';
  pos: Vec2;
  vel: Vec2;
  targetPos?: Vec2;
  rotation: number;
  spinSpeed: number;
  bouncesLeft: number;
  life: number;
  damage: number;
  splashRadius: number;
}

export interface CrushedTileRecord {
  x: number;
  y: number;
  prevKind: TileKind;
}

export interface HellcellState {
  phase: HellcellPhase;
  isCeasefireActive: boolean;
  hasTriggered: boolean;
  bossDefeated: boolean;
  bossCount?: number;
  nextSpawnIn?: number;
  spawnPos?: Vec2;
  /** Zone ID of the third uncaptured zone from which the first boss emerges. */
  emergenceZoneId?: string;
  crushedTiles?: CrushedTileRecord[];
  triggerTime: number;
  countdown: number;
  blueBossDamage: number;
  redBossDamage: number;
  majorityWinner?: Team;
  boss: HellcellBoss | null;
  reticles: BossReticle[];
  acidPools: AcidPool[];
  bossProjectiles: BossProjectile[];
  venomCone: VenomCone | null;
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
  mode?: GameMode;
  difficulty: MatchDifficulty;
  /** Optional difficulty override for the enemy team (used by headless balance suites). */
  enemyDifficulty?: MatchDifficulty;
  scoreToWin: number;
  enemyCount: number;
  startingWeapon: WeaponId;
  mapTheme?: MapTheme;
}

export type MatchStatus = 'menu' | 'playing' | 'paused' | 'won' | 'lost';

export interface GameState {
  tick: number;
  /** Elapsed simulation time in seconds. */
  time: number;
  timeLimit?: number;
  map: MapData;
  units: Unit[];
  projectiles: Projectile[];
  grenades?: Grenade[];
  pickups: Pickup[];
  zones: ZoneState[];
  score: { player: number; enemy: number };
  baseHp: { player: number; enemy: number };
  status: MatchStatus;
  playerId: string;
  winnerId?: string;
  hellcell?: HellcellState;
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
  dash: boolean;
  throwGrenade?: boolean;
}
