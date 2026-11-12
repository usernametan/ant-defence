import {
  ABILITIES,
  ANT_TYPES,
  COLOR,
  DIFFICULTY,
  LEECH,
  LANES,
  PLAYER,
  POWERUPS,
  POWERUP_DEFS,
  SPECIAL_ANTS,
  UPGRADE_DEFS,
  VIEW_HEIGHT,
  VIEW_WIDTH,
  WORLD,
} from './config';
import { AudioEngine } from './audio';
import {
  DIFFICULTY_PRESETS,
  loadDifficulty,
  saveDifficulty,
  type DifficultyId,
  type DifficultyPreset,
} from './difficulty';
import {
  antBodyCenter,
  drawAnt,
  drawAntLabels,
  drawTargetReticle,
  makeAnt,
  updateAnt,
} from './ants';
import {
  drawAcidGlobs,
  drawAcidLabels,
  drawBreachFlash,
  drawBullet,
  drawDefenseLine,
  drawFloatingTexts,
  drawParticles,
  drawPickupBodies,
  drawPickupLabels,
  drawRazorWire,
  drawVignette,
  spawnBreachBurst,
  spawnCritBlast,
  spawnDeathBurst,
  spawnHitSparks,
  spawnSpawnDust,
  updateParticles,
} from './effects';
import { Player } from './player';
import { Scenery, waveToBiome } from './scenery';
import {
  loadReducedMotion,
  loadSceneryMode,
  loadWordPack,
  saveReducedMotion,
  saveSceneryMode,
  saveWordPack,
  type SceneryMode,
  type WordPackId,
} from './settings';
import {
  addRun,
  loadLeaderboard,
  saveLeaderboard,
  type LeaderboardEntry,
} from './leaderboard';
import {
  applyRun,
  loadProgress,
  saveProgress,
  type PlayerProgress,
  type RunSummary,
} from './progress';
import type {
  AbilityId,
  AbilitySnapshot,
  AcidGlob,
  Ant,
  AntKind,
  BannerSnapshot,
  Bullet,
  FloatingText,
  GamePhase,
  HudSnapshot,
  Particle,
  Pickup,
  PowerupType,
  UpgradeId,
  UpgradeOption,
  WpmSample,
} from './types';
import { createDailyRng, pickAcidWord, pickWord, waveTitle } from './words';

type SnapshotListener = (snapshot: HudSnapshot) => void;

type WaveState = {
  spawned: number;
  quota: number;
  spawnTimer: number;
  intermission: number;
  bossSpawned: boolean;
};

const ABILITY_IDS: AbilityId[] = ['focus', 'aegis', 'power'];
const ALL_UPGRADE_IDS: UpgradeId[] = [
  'ricochet',
  'wire',
  'overclock',
  'hollow',
  'medic',
  'mag',
];

const WPM_SAMPLE_INTERVAL = 2.5;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export class GameEngine {
  private canvas: HTMLCanvasElement;

  private ctx: CanvasRenderingContext2D;

  private dpr: number;

  private listener: SnapshotListener;

  private phase: GamePhase = 'menu';

  private player = new Player();

  private scenery = new Scenery();

  private audio = new AudioEngine();

  private health = WORLD.health;

  private maxHealth = WORLD.health;

  private wave = 1;

  private elapsed = 0;

  private eliminated = 0;

  private score = 0;

  private typed = '';

  private targetId: number | null = null;

  private targetMistakeMade = false;

  private ants: Ant[] = [];

  private acidGlobs: AcidGlob[] = [];

  private nextAcidId = 1;

  private targetAcidId: number | null = null;

  private bullets: Bullet[] = [];

  private particles: Particle[] = [];

  private floaters: FloatingText[] = [];

  private nextId = 1;

  private nextBulletId = 1;

  private nextBannerId = 1;

  private visualTime = 0;

  private lastFrame = 0;

  private raf = 0;

  private lastEmit = 0;

  private combo = 0;

  private bestCombo = 0;

  private lastKillAt = -99;

  private correctWords = 0;

  private correctKeys = 0;

  private mistakes = 0;

  private inputError = 0;

  private breachFlash = 0;

  private shake = 0;

  private readyAt: Record<AbilityId, number> = {
    focus: 0,
    aegis: 0,
    power: 0,
  };

  private slowUntil = 0;

  private shieldUntil = 0;

  private powerCharges = 0;

  private pickups: Pickup[] = [];

  private nextPickupId = 1;

  private targetPickupId: number | null = null;

  private scoreSurgeUntil = 0;

  private heartbeatTimer = 0;

  private leechDrained = 0;

  private leaderboard: LeaderboardEntry[] = loadLeaderboard();

  private runRank: number | null = null;

  private reducedMotion = loadReducedMotion();

  private sceneryMode: SceneryMode = loadSceneryMode();

  private wordPack: WordPackId = loadWordPack();

  private rng: () => number = Math.random;

  private activeUpgrades: UpgradeId[] = [];

  private upgradeChoices: UpgradeOption[] = [];

  private lastAimTarget: { x: number; y: number } | null = null;

  private lastAimUntil = 0;

  private waveState: WaveState = {
    spawned: 0,
    quota: 0,
    spawnTimer: 0,
    intermission: 0,
    bossSpawned: false,
  };

  private banner: BannerSnapshot | null = null;

  private progress: PlayerProgress = loadProgress();

  private runRecorded = false;

  private newRecords = {
    score: false,
    wpm: false,
    accuracy: false,
  };

  private difficultyId: DifficultyId = loadDifficulty();

  private wpmHistory: WpmSample[] = [{ t: 0, wpm: 0 }];

  private wpmSampleTimer = 0;

  private destroyed = false;

  private boundKeyDown: (event: KeyboardEvent) => void;

  private boundWindowBlur: () => void;

  private boundVisibility: () => void;

  private boundPointerDown: () => void;

  constructor(canvas: HTMLCanvasElement, listener: SnapshotListener) {
    this.canvas = canvas;
    this.listener = listener;
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.floor(VIEW_WIDTH * this.dpr);
    canvas.height = Math.floor(VIEW_HEIGHT * this.dpr);
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) throw new Error('Canvas 2D is unavailable in this browser.');
    this.ctx = ctx;

    this.boundKeyDown = (event) => this.handleKeyDown(event);
    this.boundWindowBlur = () => {
      if (this.phase === 'playing') this.pause();
    };
    this.boundVisibility = () => {
      if (document.hidden && this.phase === 'playing') this.pause();
    };
    this.boundPointerDown = () => {
      this.audio.ensure();
    };

    window.addEventListener('keydown', this.boundKeyDown);
    window.addEventListener('blur', this.boundWindowBlur);
    document.addEventListener('visibilitychange', this.boundVisibility);
    canvas.addEventListener('pointerdown', this.boundPointerDown);

    if (import.meta.env.DEV) {
      const debugWindow = window as unknown as { __antGame?: GameEngine };
      debugWindow.__antGame = this;
    }

    this.emit();
    this.lastFrame = performance.now();
    this.raf = requestAnimationFrame(this.loop);
  }

  destroy(): void {
    this.destroyed = true;
    cancelAnimationFrame(this.raf);
    window.removeEventListener('keydown', this.boundKeyDown);
    window.removeEventListener('blur', this.boundWindowBlur);
    document.removeEventListener('visibilitychange', this.boundVisibility);
    this.canvas.removeEventListener('pointerdown', this.boundPointerDown);
    const debugWindow = window as unknown as { __antGame?: GameEngine };
    if (debugWindow.__antGame === this) delete debugWindow.__antGame;
  }

  startGame(): void {
    this.audio.ensure();
    this.resetRun();
    this.phase = 'playing';
    this.audio.wave();
    this.emit();
  }

  pause(): void {
    if (this.phase !== 'playing') return;
    this.phase = 'paused';
    this.typed = '';
    this.targetId = null;
    this.targetPickupId = null;
    this.targetAcidId = null;
    this.emit();
  }

  resume(): void {
    if (this.phase !== 'paused') return;
    this.audio.ensure();
    this.phase = 'playing';
    this.emit();
  }

  togglePause(): void {
    if (this.phase === 'playing') this.pause();
    else if (this.phase === 'paused') this.resume();
  }

  toMenu(): void {
    this.phase = 'menu';
    this.resetRun();
    this.emit();
  }

  toggleMute(): void {
    this.audio.toggle();
    this.emit();
  }

  setReducedMotion(value: boolean): void {
    if (this.reducedMotion === value) return;
    this.reducedMotion = value;
    saveReducedMotion(value);
    this.emit();
  }

  toggleReducedMotion(): void {
    this.setReducedMotion(!this.reducedMotion);
  }

  setSceneryMode(mode: SceneryMode): void {
    if (this.sceneryMode === mode) return;
    this.sceneryMode = mode;
    saveSceneryMode(mode);
    this.emit();
  }

  toggleSceneryMode(): void {
    this.setSceneryMode(this.sceneryMode === 'photo' ? 'procedural' : 'photo');
  }

  setWordPack(pack: WordPackId): void {
    if (this.phase !== 'menu') return;
    if (this.wordPack === pack) return;
    this.wordPack = pack;
    saveWordPack(pack);
    this.emit();
  }

  setDifficulty(id: DifficultyId): void {
    if (this.phase !== 'menu') return;
    if (this.difficultyId === id) return;
    this.difficultyId = id;
    saveDifficulty(id);
    this.emit();
  }

  private get difficulty(): DifficultyPreset {
    return DIFFICULTY_PRESETS[this.difficultyId];
  }

  private hasUpgrade(id: UpgradeId): boolean {
    return this.activeUpgrades.includes(id);
  }

  selectUpgrade(id: UpgradeId): void {
    if (this.phase !== 'upgrade') return;
    if (!this.upgradeChoices.some((u) => u.id === id)) return;
    this.activeUpgrades.push(id);
    this.upgradeChoices = [];
    if (id === 'medic') {
      this.maxHealth += 15;
      this.health = Math.min(this.maxHealth, this.health + 25);
    } else if (id === 'mag') {
      this.powerCharges = Math.min(
        POWERUPS.maxPowerCharges,
        this.powerCharges + 2,
      );
    }
    this.audio.pickupCollect();
    this.phase = 'playing';
    this.wave += 1;
    this.startWave();
    this.emit();
  }

  activateAbility(id: AbilityId): void {
    if (this.phase !== 'playing') return;
    if (this.readyAt[id] > this.elapsed) {
      this.audio.error();
      this.inputError = 0.16;
      this.emit();
      return;
    }
    const cdScale = this.hasUpgrade('overclock') ? 0.72 : 1;
    if (id === 'focus') {
      this.slowUntil = this.elapsed + ABILITIES.focus.duration;
      this.readyAt.focus = this.elapsed + ABILITIES.focus.cooldown * cdScale;
      this.floater(this.player.x + 30, this.player.y - 156, 'FOCUS', COLOR.blue, 21);
    } else if (id === 'aegis') {
      this.shieldUntil = this.elapsed + ABILITIES.aegis.duration;
      this.readyAt.aegis = this.elapsed + ABILITIES.aegis.cooldown * cdScale;
      this.floater(this.player.x + 30, this.player.y - 156, 'AEGIS', COLOR.blue, 21);
    } else {
      const bonusCharges = this.hasUpgrade('mag') ? 2 : 0;
      this.powerCharges = ABILITIES.power.charges + bonusCharges;
      this.readyAt.power = this.elapsed + ABILITIES.power.cooldown * cdScale;
      this.floater(this.player.x + 30, this.player.y - 156, 'POWER ROUNDS', COLOR.gold, 20);
    }
    this.audio.ability();
    this.emit();
  }

  getSnapshot(): HudSnapshot {
    return this.buildSnapshot();
  }

  private resetRun(): void {
    this.health = WORLD.health;
    this.maxHealth = WORLD.health;
    this.wave = 1;
    this.elapsed = 0;
    this.eliminated = 0;
    this.score = 0;
    this.typed = '';
    this.targetId = null;
    this.targetMistakeMade = false;
    this.ants = [];
    this.acidGlobs = [];
    this.targetAcidId = null;
    this.bullets = [];
    this.particles = [];
    this.floaters = [];
    this.combo = 0;
    this.bestCombo = 0;
    this.lastKillAt = -99;
    this.correctWords = 0;
    this.correctKeys = 0;
    this.mistakes = 0;
    this.inputError = 0;
    this.breachFlash = 0;
    this.shake = 0;
    this.readyAt = { focus: 0, aegis: 0, power: 0 };
    this.slowUntil = 0;
    this.shieldUntil = 0;
    this.powerCharges = 0;
    this.pickups = [];
    this.targetPickupId = null;
    this.scoreSurgeUntil = 0;
    this.heartbeatTimer = 0;
    this.leechDrained = 0;
    this.runRank = null;
    this.lastAimTarget = null;
    this.lastAimUntil = 0;
    this.banner = null;
    this.runRecorded = false;
    this.newRecords = { score: false, wpm: false, accuracy: false };
    this.wpmHistory = [{ t: 0, wpm: 0 }];
    this.wpmSampleTimer = 0;
    this.activeUpgrades = [];
    this.upgradeChoices = [];
    this.rng = this.wordPack === 'daily' ? createDailyRng() : Math.random;
    this.startWave();
  }

  private startWave(): void {
    const bossWave = this.wave % DIFFICULTY.bossEvery === 0;
    const quota = bossWave
      ? 6 + Math.floor(this.wave * 0.8)
      : Math.min(
          DIFFICULTY.maxQuota,
          DIFFICULTY.baseQuota + this.wave * DIFFICULTY.quotaPerWave,
        );
    const scaledQuota = Math.max(
      4,
      Math.round(quota * this.difficulty.quotaScale),
    );
    this.waveState = {
      spawned: 0,
      quota: scaledQuota,
      spawnTimer: bossWave ? 1.6 : 1.1,
      intermission: 0,
      bossSpawned: false,
    };
    const subtitle = bossWave
      ? `ROYAL ASSAULT — THE QUEEN APPROACHES`
      : waveTitle(this.wave);
    this.setBanner(`WAVE ${this.wave}`, subtitle, DIFFICULTY.waveBannerTime);
    if (bossWave) {
      this.audio.boss();
      if (!this.reducedMotion) this.scenery.triggerLightning();
    }
    this.emit();
  }

  private setBanner(title: string, subtitle: string, seconds: number): void {
    this.banner = {
      key: this.nextBannerId,
      title,
      subtitle,
      until: this.visualTime + seconds,
    };
    this.nextBannerId += 1;
  }

  private loop = (now: number): void => {
    if (this.destroyed) return;
    let dt = (now - this.lastFrame) / 1000;
    this.lastFrame = now;
    dt = clamp(dt, 0, 0.05);
    this.visualTime += dt;
    this.scenery.update(this.reducedMotion ? 0 : dt);

    if (this.phase === 'playing') {
      this.updateGame(dt);
    } else if (
      this.phase === 'menu' ||
      this.phase === 'gameover' ||
      this.phase === 'upgrade'
    ) {
      this.player.update(dt, null, false);
      updateParticles(this.particles, dt);
      this.updateFloaters(dt);
      this.breachFlash = Math.max(0, this.breachFlash - dt * 2);
      this.shake = Math.max(0, this.shake - dt * 50);
    }

    this.render();
    if (now - this.lastEmit > 90) {
      this.lastEmit = now;
      this.emit();
    }
    this.raf = requestAnimationFrame(this.loop);
  };

  private updateGame(dt: number): void {
    this.elapsed += dt;
    this.inputError = Math.max(0, this.inputError - dt);
    this.breachFlash = Math.max(0, this.breachFlash - dt * 2.15);
    this.shake = Math.max(0, this.shake - dt * 46);
    this.wpmSampleTimer += dt;
    if (this.wpmSampleTimer >= WPM_SAMPLE_INTERVAL) {
      this.wpmSampleTimer -= WPM_SAMPLE_INTERVAL;
      this.wpmHistory.push({ t: this.elapsed, wpm: this.currentWpm() });
    }

    const targetAnt = this.ants.find(
      (ant) => ant.id === this.targetId && ant.alive && !ant.burrowed,
    );
    const targetPickup =
      this.targetPickupId === null
        ? null
        : this.pickups.find((item) => item.id === this.targetPickupId) ?? null;
    const targetAcid =
      this.targetAcidId === null
        ? null
        : this.acidGlobs.find((g) => g.id === this.targetAcidId) ?? null;
    let aimTarget: { x: number; y: number } | null = null;
    if (targetAnt) {
      aimTarget = antBodyCenter(targetAnt);
    } else if (targetAcid) {
      aimTarget = { x: targetAcid.x, y: targetAcid.y };
    } else if (targetPickup) {
      aimTarget = {
        x: targetPickup.x,
        y: targetPickup.y + Math.sin(targetPickup.bobPhase) * 5 - 26,
      };
    } else if (this.lastAimTarget && this.elapsed < this.lastAimUntil) {
      aimTarget = this.lastAimTarget;
    }
    this.player.update(dt, aimTarget, true);

    const slowActive = this.elapsed < this.slowUntil;
    const speedScale = slowActive ? ABILITIES.focus.slowFactor : 1;

    // Pheromone carrier aura computation
    const carriers = this.ants.filter(
      (ant) => ant.alive && ant.kind === 'pheromone',
    );
    for (const ant of this.ants) {
      if (!ant.alive) {
        ant.boosted = false;
        continue;
      }
      ant.boosted =
        ant.kind !== 'pheromone' &&
        carriers.some(
          (c) =>
            Math.hypot(c.x - ant.x, c.y - ant.y) <=
            SPECIAL_ANTS.pheromoneRadius,
        );
    }

    const wireActive = this.hasUpgrade('wire');

    for (const ant of this.ants) {
      if (!ant.alive) {
        updateAnt(ant, dt, speedScale);
        continue;
      }

      // Burrower underground transition
      if (ant.kind === 'burrower') {
        if (
          !ant.hasBurrowed &&
          !ant.burrowed &&
          ant.x <= SPECIAL_ANTS.burrowTriggerX
        ) {
          ant.burrowed = true;
          ant.hasBurrowed = true;
          ant.burrowTimer = SPECIAL_ANTS.burrowDuration;
          spawnSpawnDust(this.particles, ant.x, ant.y);
          this.floater(ant.x, ant.y - 48, 'BURROWED', '#e4b97c', 15);
          if (this.targetId === ant.id) {
            this.targetId = null;
            this.typed = '';
          }
        } else if (ant.burrowed) {
          ant.burrowTimer -= dt;
          if (Math.random() < 0.35) {
            spawnSpawnDust(this.particles, ant.x, ant.y);
          }
          if (ant.burrowTimer <= 0 || ant.x <= WORLD.lineX + 210) {
            ant.burrowed = false;
            spawnSpawnDust(this.particles, ant.x, ant.y);
            const activeWords = this.allActiveWords(ant.id);
            ant.word = pickWord(
              this.wave,
              3,
              4,
              activeWords,
              this.typed,
              this.rng,
              this.wordPack,
            );
            this.floater(ant.x, ant.y - 48, 'SURFACED!', '#ffd7a3', 15);
          }
        }
      }

      // Spitter ranged acid attack
      if (ant.kind === 'spitter' && ant.x <= SPECIAL_ANTS.spitterStopX + 120) {
        ant.spitTimer -= dt * speedScale;
        if (ant.spitTimer <= 0) {
          ant.spitTimer = SPECIAL_ANTS.spitterInterval;
          this.spawnAcidGlob(ant);
        }
      }

      updateAnt(ant, dt, speedScale);

      // Razor Barricade wire check
      if (
        wireActive &&
        !ant.wireTriggered &&
        !ant.burrowed &&
        ant.x <= WORLD.wireX
      ) {
        ant.wireTriggered = true;
        spawnHitSparks(this.particles, ant.x, ant.y - 20, false);
        if (ant.hp > 1) {
          ant.hp -= 1;
          ant.hitFlash = 0.14;
          this.floater(ant.x, ant.y - 48, 'WIRE -1 HP', '#b6dcff', 14);
        } else {
          ant.x += 28;
          this.floater(ant.x, ant.y - 48, 'SNAGGED', '#b6dcff', 14);
        }
      }

      if (ant.boss && ant.alive) {
        ant.minionTimer -= dt * speedScale;
        if (ant.minionTimer <= 0) {
          ant.minionTimer = DIFFICULTY.bossMinionEvery;
          this.spawnMinion();
        }
      }
      if (ant.alive && ant.x <= WORLD.lineX + 6) {
        this.breachAnt(ant);
      } else if (
        ant.alive &&
        ant.kind === 'leech' &&
        ant.x < LEECH.drainZoneX
      ) {
        this.updateLeechDrain(ant, dt);
      }
    }

    this.ants = this.ants.filter(
      (ant) => (ant.alive || ant.deathTimer > 0) && ant.x > -120,
    );
    this.updateAcidGlobs(dt, speedScale);
    this.updatePickups(dt);

    this.updateBullets(dt);
    updateParticles(this.particles, dt);
    this.updateFloaters(dt);
    this.updateWave(dt, speedScale);

    if (this.health <= 30) {
      this.heartbeatTimer -= dt;
      if (this.heartbeatTimer <= 0) {
        this.heartbeatTimer = 1.4;
        this.audio.heartbeat();
      }
    } else {
      this.heartbeatTimer = 0;
    }

    if (this.health <= 0) {
      this.endGame();
    }
  }

  private allActiveWords(excludeAntId?: number): string[] {
    const words = this.ants
      .filter((ant) => ant.alive && ant.id !== excludeAntId)
      .map((ant) => ant.word);
    for (const glob of this.acidGlobs) {
      words.push(glob.word);
    }
    for (const pickup of this.pickups) {
      words.push(pickup.word);
    }
    return words;
  }

  private spawnAcidGlob(spitter: Ant): void {
    if (this.acidGlobs.length >= 2) return;
    const word = pickAcidWord(this.allActiveWords(), this.typed, this.rng);
    const startX = spitter.x - 24;
    const startY = spitter.y - 36;
    const travelTime = SPECIAL_ANTS.acidTravelTime;
    const vx = (WORLD.lineX - startX) / travelTime;
    const vy = -115;
    this.acidGlobs.push({
      id: this.nextAcidId,
      x: startX,
      y: startY,
      vx,
      vy,
      word,
      damage: SPECIAL_ANTS.acidDamage,
      life: travelTime + 0.4,
      maxLife: travelTime + 0.4,
    });
    this.nextAcidId += 1;
    this.floater(startX, startY - 26, 'ACID SPIT', '#8ef2b6', 14);
  }

  private updateAcidGlobs(dt: number, speedScale: number): void {
    const effDt = dt * speedScale;
    for (let i = this.acidGlobs.length - 1; i >= 0; i -= 1) {
      const glob = this.acidGlobs[i];
      glob.life -= effDt;
      glob.vy += 82 * effDt;
      glob.x += glob.vx * effDt;
      glob.y += glob.vy * effDt;

      if (glob.x <= WORLD.lineX + 8 || glob.life <= 0) {
        this.acidGlobs.splice(i, 1);
        if (this.targetAcidId === glob.id) {
          this.targetAcidId = null;
          this.typed = '';
        }
        const shielded = this.elapsed < this.shieldUntil;
        if (shielded) {
          this.floater(WORLD.lineX + 24, glob.y, 'AEGIS BLOCK', COLOR.blue, 16);
          this.audio.hit();
        } else {
          this.health = Math.max(0, this.health - glob.damage);
          this.breachFlash = Math.max(this.breachFlash, 0.65);
          this.shake = Math.max(this.shake, 9);
          spawnBreachBurst(this.particles, WORLD.lineX, glob.y);
          this.floater(
            WORLD.lineX + 28,
            glob.y - 16,
            `-${glob.damage} ACID`,
            '#ff7d74',
            18,
          );
          this.audio.breach();
        }
        this.emit();
      }
    }
  }

  private interceptAcidGlob(glob: AcidGlob): void {
    this.acidGlobs = this.acidGlobs.filter((g) => g.id !== glob.id);
    this.targetAcidId = null;
    this.typed = '';
    this.correctWords += 1;
    this.score += 55;
    this.player.shoot({ x: glob.x, y: glob.y });
    spawnHitSparks(this.particles, glob.x, glob.y, false);
    this.floater(glob.x, glob.y - 20, '+55 INTERCEPT', '#8ef2b6', 16);
    this.audio.shoot(false);
    this.audio.hit(this.xToPan(glob.x));
    this.emit();
  }

  private updateBullets(dt: number): void {
    for (let i = this.bullets.length - 1; i >= 0; i -= 1) {
      const bullet = this.bullets[i];
      bullet.life -= dt;
      const target = this.ants.find(
        (ant) => ant.id === bullet.targetId && ant.alive,
      );
      if (target) {
        const point = antBodyCenter(target);
        bullet.targetX = point.x;
        bullet.targetY = point.y;
      }

      const dx = bullet.targetX - bullet.x;
      const dy = bullet.targetY - bullet.y;
      const dist = Math.hypot(dx, dy);
      const step = bullet.speed * dt;

      if (dist <= 24 || step >= dist) {
        bullet.x = bullet.targetX;
        bullet.y = bullet.targetY;
        if (target && target.alive) {
          this.hitAnt(target, bullet.damage, bullet.powered);
        } else {
          spawnHitSparks(this.particles, bullet.x, bullet.y, bullet.powered);
        }
        this.bullets.splice(i, 1);
        continue;
      }

      bullet.x += (dx / dist) * step;
      bullet.y += (dy / dist) * step;
      bullet.trail.push({ x: bullet.x, y: bullet.y });
      if (bullet.trail.length > 11) bullet.trail.shift();

      if (bullet.life <= 0) {
        this.bullets.splice(i, 1);
      }
    }
  }

  private updateFloaters(dt: number): void {
    for (let i = this.floaters.length - 1; i >= 0; i -= 1) {
      const text = this.floaters[i];
      text.life -= dt;
      text.y -= dt * 34;
      if (text.life <= 0) this.floaters.splice(i, 1);
    }
  }

  private updateWave(dt: number, speedScale: number): void {
    if (this.waveState.intermission > 0) {
      this.waveState.intermission -= dt;
      if (this.waveState.intermission <= 0) {
        if (this.shouldOfferUpgrade()) {
          this.openUpgradeSelection();
          return;
        }
        this.wave += 1;
        this.startWave();
      }
      return;
    }

    const bossWave = this.wave % DIFFICULTY.bossEvery === 0;
    const maxActive = this.currentMaxActive();
    const livingCount = this.ants.filter((ant) => ant.alive).length;

    if (this.waveState.spawned < this.waveState.quota) {
      this.waveState.spawnTimer -= dt * speedScale;
      if (this.waveState.spawnTimer <= 0) {
        if (livingCount < maxActive) {
          if (bossWave && !this.waveState.bossSpawned) {
            this.spawnAnt('queen');
            this.waveState.bossSpawned = true;
            this.setBanner('THE QUEEN', 'SHE BROKE THE TREELINE', 2.6);
            this.shake = Math.max(this.shake, 12);
          } else {
            this.spawnAnt(this.chooseKind(bossWave));
          }
          this.waveState.spawned += 1;
        }
        const base =
          DIFFICULTY.baseSpawnInterval -
          this.wave * DIFFICULTY.spawnIntervalPerWave;
        const scaled =
          (base * (0.84 + this.rng() * 0.34) + (bossWave ? 0.55 : 0)) *
          this.difficulty.spawnIntervalScale;
        const interval = Math.max(DIFFICULTY.minSpawnInterval, scaled);
        this.waveState.spawnTimer = interval;
      }
    } else if (livingCount === 0 && this.acidGlobs.length === 0) {
      const bonus = 60 * this.wave;
      this.score += bonus;
      this.setBanner(
        'WAVE CLEARED',
        `+${bonus} SCORE — HOLD THE LINE`,
        2.7,
      );
      this.audio.wave();
      this.waveState.intermission = DIFFICULTY.intermission;
      this.emit();
    }
  }

  private shouldOfferUpgrade(): boolean {
    if (this.wave % 3 !== 0 && this.wave % 5 !== 0) return false;
    const remaining = ALL_UPGRADE_IDS.filter(
      (id) => !this.activeUpgrades.includes(id),
    );
    return remaining.length > 0;
  }

  private openUpgradeSelection(): void {
    const remaining = ALL_UPGRADE_IDS.filter(
      (id) => !this.activeUpgrades.includes(id),
    );
    const shuffled = remaining.slice().sort(() => this.rng() - 0.5);
    this.upgradeChoices = shuffled.slice(0, 3).map((id) => UPGRADE_DEFS[id]);
    this.phase = 'upgrade';
    this.typed = '';
    this.targetId = null;
    this.targetPickupId = null;
    this.targetAcidId = null;
    this.emit();
  }

  private currentMaxActive(): number {
    return clamp(
      DIFFICULTY.maxActiveAtStart +
        Math.floor(this.wave * DIFFICULTY.maxActivePerWave) +
        this.difficulty.maxActiveBias,
      1,
      WORLD.maxActiveAnts,
    );
  }

  private chooseKind(bossWave: boolean): AntKind {
    if (this.wave <= 1) return 'normal';
    const roll = this.rng();
    if (this.wave === 2) return roll < 0.72 ? 'normal' : 'fast';
    if (this.wave === 3) {
      if (roll < 0.42) return 'normal';
      if (roll < 0.74) return 'fast';
      return 'armored';
    }
    if (this.wave === 4) {
      if (roll < 0.24) return 'normal';
      if (roll < 0.5) return 'fast';
      if (roll < 0.76) return 'armored';
      if (roll < 0.9) return 'giant';
      return 'burrower';
    }
    if (bossWave) {
      if (roll < 0.3) return 'normal';
      if (roll < 0.58) return 'fast';
      if (roll < 0.78) return 'armored';
      if (roll < 0.9) return 'giant';
      return 'pheromone';
    }
    if (this.wave === 5) {
      if (roll < 0.18) return 'normal';
      if (roll < 0.36) return 'fast';
      if (roll < 0.56) return 'armored';
      if (roll < 0.74) return 'giant';
      if (roll < 0.88) return 'weaver';
      return 'burrower';
    }
    if (this.wave <= 7) {
      if (roll < 0.15) return 'normal';
      if (roll < 0.3) return 'fast';
      if (roll < 0.46) return 'armored';
      if (roll < 0.62) return 'giant';
      if (roll < 0.73) return 'weaver';
      if (roll < 0.83) return 'splitter';
      if (roll < 0.92) return 'burrower';
      return 'pheromone';
    }
    if (roll < 0.13) return 'normal';
    if (roll < 0.26) return 'fast';
    if (roll < 0.41) return 'armored';
    if (roll < 0.56) return 'giant';
    if (roll < 0.66) return 'weaver';
    if (roll < 0.75) return 'splitter';
    if (roll < 0.83) return 'leech';
    if (roll < 0.9) return 'burrower';
    if (roll < 0.95) return 'pheromone';
    return 'spitter';
  }

  private spawnAnt(kind: AntKind): void {
    const lane = this.pickLane();
    const x = WORLD.spawnX + this.rng() * 56 + (lane % 2) * 30;
    this.spawnAntAt(kind, lane, x);
  }

  private spawnAntAt(kind: AntKind, lane: number, x: number): void {
    const laneInfo = LANES[lane];
    const config = ANT_TYPES[kind];
    const waveBonus = Math.min(3, Math.floor((this.wave - 1) / 4));
    const minLength = Math.min(12, config.wordRange[0] + waveBonus);
    const maxLength = Math.min(12, config.wordRange[1] + waveBonus);
    const activeWords = this.allActiveWords();
    const word = pickWord(
      this.wave,
      minLength,
      maxLength,
      activeWords,
      this.typed,
      this.rng,
      this.wordPack,
    );
    const speedMultiplier =
      Math.min(
        DIFFICULTY.maxSpeedMultiplier,
        1 + (this.wave - 1) * DIFFICULTY.speedPerWave,
      ) * this.difficulty.antSpeedScale;
    const jitter = 0.92 + this.rng() * 0.16;
    const isCritical =
      kind !== 'queen' &&
      this.wave >= 2 &&
      this.rng() < SPECIAL_ANTS.criticalChance;
    const ant = makeAnt(
      this.nextId,
      kind,
      lane,
      x,
      laneInfo.y,
      laneInfo.scale,
      word,
      speedMultiplier * jitter,
      this.wave,
      isCritical,
    );
    this.nextId += 1;
    if (ant.boss) {
      ant.minionTimer = DIFFICULTY.bossMinionEvery;
    }
    this.ants.push(ant);
    spawnSpawnDust(this.particles, ant.x, ant.y);
  }

  private splitAnt(parent: Ant): void {
    const baseX = clamp(parent.x, WORLD.lineX + 140, WORLD.spawnX);
    const secondLane = parent.lane > 0 ? parent.lane - 1 : parent.lane + 1;
    this.spawnAntAt('fast', parent.lane, baseX + 26);
    this.spawnAntAt('fast', secondLane, baseX - 26);
  }

  private spawnMinion(): void {
    const livingCount = this.ants.filter((ant) => ant.alive).length;
    if (livingCount >= this.currentMaxActive()) return;
    this.spawnAnt(this.rng() < 0.6 ? 'fast' : 'normal');
  }

  private pickLane(): number {
    let bestLane = 0;
    let bestSpace = -Infinity;
    for (let lane = 0; lane < LANES.length; lane += 1) {
      const laneAnts = this.ants.filter(
        (ant) => ant.alive && ant.lane === lane,
      );
      const nearest = laneAnts.reduce(
        (min, ant) =>
          ant.x > WORLD.spawnX - 100
            ? Math.min(min, Math.abs(ant.x - WORLD.spawnX))
            : min,
        Infinity,
      );
      const space = nearest === Infinity ? 9999 : nearest + this.rng() * 80;
      if (space > bestSpace) {
        bestSpace = space;
        bestLane = lane;
      }
    }
    return bestLane;
  }

  private xToPan(x: number): number {
    return clamp((x / VIEW_WIDTH) * 2 - 1, -1, 1);
  }

  private hitAnt(ant: Ant, damage: number, powered: boolean): void {
    if (!ant.alive) return;
    const point = antBodyCenter(ant);
    ant.hp -= damage;
    ant.hitFlash = 0.13;
    spawnHitSparks(this.particles, point.x, point.y, powered);
    if (ant.hp <= 0) {
      this.killAnt(ant);
    } else {
      this.audio.hit(this.xToPan(point.x));
      this.floater(point.x, point.y - 20, `${Math.max(0, ant.hp)} HIT`, '#ffd7a3', 15);
      this.shake = Math.max(this.shake, powered ? 6 : 2.5);
      if (ant.boss) this.rotateBossWord(ant);
      this.emit();
    }
  }

  private rotateBossWord(ant: Ant): void {
    const config = ANT_TYPES[ant.kind];
    const waveBonus = Math.min(3, Math.floor((this.wave - 1) / 4));
    const activeWords = this.allActiveWords(ant.id);
    activeWords.push(ant.word);
    ant.word = pickWord(
      this.wave,
      Math.min(12, config.wordRange[0] + waveBonus),
      Math.min(12, config.wordRange[1] + waveBonus),
      activeWords,
      this.typed,
      this.rng,
      this.wordPack,
    );
    if (this.targetId === ant.id) {
      this.targetId = null;
      this.typed = '';
    }
    const point = antBodyCenter(ant);
    this.floater(point.x, point.y - 54, 'NEW WORD', '#ffd7a3', 14);
  }

  private killAnt(ant: Ant): void {
    if (!ant.alive) return;
    ant.alive = false;
    ant.deathTimer = 0.42;
    const point = antBodyCenter(ant);
    spawnDeathBurst(this.particles, point.x, point.y, ant.boss);
    this.eliminated += 1;

    if (this.elapsed - this.lastKillAt <= PLAYER.comboWindow) {
      this.combo += 1;
    } else {
      this.combo = 1;
    }
    this.lastKillAt = this.elapsed;
    this.bestCombo = Math.max(this.bestCombo, this.combo);
    const multiplier = 1 + Math.min(2.2, (this.combo - 1) * 0.14);
    const surgeActive = this.elapsed < this.scoreSurgeUntil;
    const gained = Math.round(
      ANT_TYPES[ant.kind].score *
        multiplier *
        (surgeActive ? POWERUPS.surgeMultiplier : 1),
    );
    this.score += gained;
    this.floater(
      point.x,
      point.y - 36,
      surgeActive ? `+${gained} x2` : `+${gained}`,
      COLOR.goldBright,
      ant.boss ? 30 : 20,
    );
    if (this.combo >= 3) {
      this.floater(point.x, point.y - 66, `COMBO ${this.combo}`, '#ffe0a3', 15);
    }
    if (this.combo >= 5 && this.combo % 5 === 0) {
      this.audio.comboStreak(this.combo);
    }

    if (this.targetId === ant.id) {
      this.targetId = null;
      this.typed = '';
    }

    this.audio.kill(ANT_TYPES[ant.kind].scale, this.xToPan(point.x));
    this.shake = Math.max(this.shake, ant.boss ? 20 : 4);

    // Critical word clean-kill AoE shockwave blast
    if (ant.critical && !this.targetMistakeMade) {
      const hollow = this.hasUpgrade('hollow');
      const blastRadius =
        SPECIAL_ANTS.criticalBlastRadius * (hollow ? 1.5 : 1);
      const blastDmg = hollow ? 2 : 1;
      spawnCritBlast(this.particles, point.x, point.y, blastRadius);
      this.score += SPECIAL_ANTS.criticalBonusScore;
      this.floater(
        point.x,
        point.y - 84,
        `CRIT BLAST +${SPECIAL_ANTS.criticalBonusScore}`,
        COLOR.goldBright,
        18,
      );
      this.shake = Math.max(this.shake, 9);
      const victims = this.ants.filter(
        (other) =>
          other.alive &&
          !other.burrowed &&
          other.id !== ant.id &&
          Math.hypot(other.x - ant.x, other.y - ant.y) <= blastRadius,
      );
      for (const victim of victims) {
        victim.x = Math.min(WORLD.spawnX, victim.x + 36);
        this.hitAnt(victim, blastDmg, true);
      }
    }

    // Ricochet Rounds upgrade
    if (this.hasUpgrade('ricochet')) {
      const candidates = this.ants.filter(
        (other) =>
          other.alive &&
          !other.burrowed &&
          other.id !== ant.id &&
          Math.hypot(other.x - ant.x, other.y - ant.y) <= 260,
      );
      if (candidates.length > 0) {
        const ricochetTarget = candidates.reduce((best, item) =>
          Math.hypot(item.x - ant.x, item.y - ant.y) <
          Math.hypot(best.x - ant.x, best.y - ant.y)
            ? item
            : best,
        );
        this.floater(
          ricochetTarget.x,
          ricochetTarget.y - 46,
          'RICOCHET',
          COLOR.blue,
          14,
        );
        this.hitAnt(ricochetTarget, 1, false);
      }
    }

    if (ant.kind === 'splitter') {
      this.splitAnt(ant);
      this.audio.split();
      this.floater(point.x, point.y - 66, 'SPLIT', '#ffd7a3', 16);
    }
    this.maybeDropPickup(point);

    if (ant.boss) {
      this.score += 1000;
      this.setBanner('QUEEN SLAIN', '+1000 BONUS — THE COLONY RECOILS', 3.2);
      this.audio.boss();
      if (!this.reducedMotion) this.scenery.triggerLightning();
      this.floater(point.x, point.y - 90, 'QUEEN SLAIN', COLOR.red, 26);
    }
    this.emit();
  }

  private breachAnt(ant: Ant): void {
    if (!ant.alive) return;
    ant.alive = false;
    const shielded = this.elapsed < this.shieldUntil;
    const damage = shielded ? 0 : ANT_TYPES[ant.kind].damage;
    this.breachFlash = 1;
    this.shake = Math.max(this.shake, 16);
    spawnBreachBurst(this.particles, WORLD.lineX, ant.y - 26);
    this.combo = 0;

    if (this.targetId === ant.id) {
      this.targetId = null;
      this.typed = '';
    }

    if (shielded) {
      this.floater(WORLD.lineX + 32, ant.y - 64, 'AEGIS ABSORB', COLOR.blue, 18);
      this.audio.hit();
    } else {
      this.health = Math.max(0, this.health - damage);
      this.floater(
        WORLD.lineX + 32,
        ant.y - 64,
        `-${damage} HP`,
        '#ff7d74',
        21,
      );
      this.audio.breach();
      if (damage > 0) this.inputError = 0.22;
    }
    this.emit();
  }

  private isTargetable(ant: Ant): boolean {
    return ant.alive && !ant.burrowed && ant.x <= VIEW_WIDTH - 8;
  }

  private typeCharacter(char: string): void {
    if (this.phase !== 'playing') return;
    const next = `${this.typed}${char}`;

    // 1. Check incoming Acid Globs first (urgent priority if matching)
    const acidCandidate = this.acidGlobs.find((glob) =>
      glob.word.startsWith(next),
    );
    const antCandidates = this.ants.filter(
      (ant) => this.isTargetable(ant) && ant.word.startsWith(next),
    );

    if (acidCandidate && antCandidates.length === 0) {
      this.correctKeys += 1;
      this.typed = next;
      this.targetId = null;
      this.targetPickupId = null;
      this.targetAcidId = acidCandidate.id;
      this.lastAimTarget = { x: acidCandidate.x, y: acidCandidate.y };
      this.lastAimUntil = this.elapsed + PLAYER.aimHoldTime;
      this.audio.typingTick(this.typed.length / acidCandidate.word.length);
      if (this.typed === acidCandidate.word) {
        this.interceptAcidGlob(acidCandidate);
      }
      this.emit();
      return;
    }

    if (antCandidates.length > 0) {
      if (this.typed.length === 0) {
        this.targetMistakeMade = false;
      }
      this.correctKeys += 1;
      this.typed = next;
      this.targetPickupId = null;
      this.targetAcidId = null;
      const target = antCandidates.reduce((best, ant) =>
        ant.x < best.x ? ant : best,
      );
      this.targetId = target.id;
      const point = antBodyCenter(target);
      this.lastAimTarget = point;
      this.lastAimUntil = this.elapsed + PLAYER.aimHoldTime;
      this.audio.typingTick(this.typed.length / target.word.length);
      if (this.typed === target.word) {
        this.fireAt(target);
      }
      this.emit();
      return;
    }

    if (acidCandidate) {
      this.correctKeys += 1;
      this.typed = next;
      this.targetId = null;
      this.targetPickupId = null;
      this.targetAcidId = acidCandidate.id;
      this.lastAimTarget = { x: acidCandidate.x, y: acidCandidate.y };
      this.lastAimUntil = this.elapsed + PLAYER.aimHoldTime;
      this.audio.typingTick(this.typed.length / acidCandidate.word.length);
      if (this.typed === acidCandidate.word) {
        this.interceptAcidGlob(acidCandidate);
      }
      this.emit();
      return;
    }

    const pickup = this.pickups.find((item) => item.word.startsWith(next));
    if (pickup) {
      this.correctKeys += 1;
      this.typed = next;
      this.targetId = null;
      this.targetAcidId = null;
      this.targetPickupId = pickup.id;
      const aim = { x: pickup.x, y: pickup.y - 26 };
      this.lastAimTarget = aim;
      this.lastAimUntil = this.elapsed + PLAYER.aimHoldTime;
      this.audio.typingTick(this.typed.length / pickup.word.length);
      if (this.typed === pickup.word) {
        this.collectPickup(pickup);
      }
      this.emit();
      return;
    }

    this.mistakes += 1;
    this.targetMistakeMade = true;
    this.inputError = 0.22;
    this.audio.error();
    this.emit();
  }

  private collectPickup(pickup: Pickup): void {
    this.pickups = this.pickups.filter((item) => item.id !== pickup.id);
    this.typed = '';
    this.targetPickupId = null;
    if (pickup.type === 'med') {
      this.health = Math.min(this.maxHealth, this.health + POWERUPS.medHeal);
      this.floater(
        pickup.x,
        pickup.y - 60,
        `+${POWERUPS.medHeal} HP`,
        COLOR.green,
        20,
      );
    } else if (pickup.type === 'amp') {
      const extra = this.hasUpgrade('mag') ? 2 : 0;
      this.powerCharges = Math.min(
        POWERUPS.maxPowerCharges,
        this.powerCharges + POWERUPS.ampCharges + extra,
      );
      this.floater(pickup.x, pickup.y - 60, 'POWER ROUNDS', COLOR.gold, 20);
    } else {
      this.scoreSurgeUntil = this.elapsed + POWERUPS.surgeDuration;
      this.floater(pickup.x, pickup.y - 60, 'SCORE SURGE', COLOR.goldBright, 20);
    }
    this.audio.pickupCollect();
    this.emit();
  }

  private maybeDropPickup(point: { x: number; y: number }): void {
    if (this.wave < POWERUPS.minWave) return;
    if (this.pickups.length >= POWERUPS.maxOnField) return;
    if (this.rng() >= POWERUPS.dropChance) return;
    const roll = this.rng();
    let type: PowerupType;
    if (this.health >= this.maxHealth) {
      type = roll < 0.5 ? 'amp' : 'gold';
    } else {
      type = roll < 0.4 ? 'med' : roll < 0.7 ? 'amp' : 'gold';
    }
    const x = clamp(point.x, WORLD.lineX + 140, WORLD.spawnX - 80);
    const y = clamp(point.y + 42, WORLD.lineTop + 20, WORLD.lineBottom - 10);
    this.pickups.push({
      id: this.nextPickupId,
      type,
      word: POWERUP_DEFS[type].word,
      x,
      y,
      life: POWERUPS.lifetime,
      maxLife: POWERUPS.lifetime,
      bobPhase: this.rng() * Math.PI * 2,
    });
    this.nextPickupId += 1;
    this.audio.pickupDrop();
    this.floater(x, y - 84, 'SUPPLY DROP', COLOR.green, 15);
  }

  private updatePickups(dt: number): void {
    for (let i = this.pickups.length - 1; i >= 0; i -= 1) {
      const pickup = this.pickups[i];
      pickup.life -= dt;
      pickup.bobPhase += dt * 3.2;
      if (pickup.life <= 0) {
        this.pickups.splice(i, 1);
        if (this.targetPickupId === pickup.id) {
          this.targetPickupId = null;
          this.typed = '';
        }
      }
    }
  }

  private updateLeechDrain(ant: Ant, dt: number): void {
    const remaining = LEECH.maxDrainPerRun - this.leechDrained;
    if (remaining <= 0) return;
    ant.drainTimer -= dt;
    if (ant.drainTimer > 0) return;
    ant.drainTimer = LEECH.drainTickInterval;
    const drain = Math.min(LEECH.drainPerTick, remaining);
    this.leechDrained += drain;
    this.score = Math.max(0, this.score - drain);
    this.floater(ant.x + 8, ant.y - 58, `-${drain}`, '#ff7d74', 15);
    this.audio.drainTick();
    if (this.leechDrained >= LEECH.maxDrainPerRun) {
      this.floater(
        WORLD.lineX + 60,
        ant.y - 96,
        'LEECHES SATIATED',
        '#ffd7a3',
        18,
      );
    }
    this.emit();
  }

  private fireAt(ant: Ant): void {
    const point = antBodyCenter(ant);
    const powered = this.powerCharges > 0;
    if (powered) this.powerCharges -= 1;

    this.player.shoot(point);
    const muzzle = this.player.getMuzzle(this.combo, powered);
    this.bullets.push({
      id: this.nextBulletId,
      x: muzzle.x,
      y: muzzle.y,
      targetId: ant.id,
      targetX: point.x,
      targetY: point.y,
      damage: powered ? PLAYER.poweredDamage : PLAYER.baseDamage,
      speed: PLAYER.bulletSpeed,
      trail: [],
      life: PLAYER.bulletLife,
      powered,
    });
    this.nextBulletId += 1;

    for (let i = 0; i < (powered ? 8 : 4); i += 1) {
      this.particles.push({
        x: muzzle.x,
        y: muzzle.y,
        vx: Math.cos(this.player.aimAngle) * (60 + Math.random() * 140) + (Math.random() - 0.5) * 40,
        vy: Math.sin(this.player.aimAngle) * (60 + Math.random() * 140) + (Math.random() - 0.5) * 40,
        life: 0.12 + Math.random() * 0.25,
        maxLife: 0.37,
        size: 1 + Math.random() * 2.4,
        color: i % 2 === 0 ? 'rgba(255, 216, 150, 0.8)' : 'rgba(255, 249, 221, 0.7)',
        gravity: -20,
        drag: 2,
        shape: 'spark',
      });
    }

    this.correctWords += 1;
    this.typed = '';
    this.targetId = null;
    this.lastAimTarget = point;
    this.lastAimUntil = this.elapsed + PLAYER.aimHoldTime;
    this.shake = Math.max(this.shake, powered ? 7 : 3);
    this.audio.shoot(powered);
  }

  private floater(
    x: number,
    y: number,
    text: string,
    color: string,
    size: number,
  ): void {
    this.floaters.push({
      x,
      y,
      text,
      color,
      life: 1,
      maxLife: 1,
      size,
    });
  }

  private endGame(): void {
    if (this.phase === 'gameover') return;
    this.phase = 'gameover';
    this.typed = '';
    this.targetId = null;
    this.targetPickupId = null;
    this.targetAcidId = null;
    this.player.update(0, null, false);
    const lastSample = this.wpmHistory[this.wpmHistory.length - 1];
    if (this.elapsed - lastSample.t > 0.2) {
      this.wpmHistory.push({ t: this.elapsed, wpm: this.currentWpm() });
    }
    this.recordCurrentRun();
    this.audio.gameover();
    this.emit();
  }

  private recordCurrentRun(): void {
    if (this.runRecorded) return;
    this.runRecorded = true;
    const run: RunSummary = {
      score: this.score,
      wpm: this.currentWpm(),
      accuracy: this.currentAccuracy(),
      antsEliminated: this.eliminated,
      keysTyped: this.correctKeys + this.mistakes,
    };
    const applied = applyRun(this.progress, run);
    this.progress = applied.progress;
    this.newRecords = applied.newRecords;
    saveProgress(this.progress);
    const added = addRun(this.leaderboard, {
      score: this.score,
      wave: this.wave,
      wpm: this.currentWpm(),
      accuracy: this.currentAccuracy(),
      antsEliminated: this.eliminated,
      bestCombo: this.bestCombo,
      time: this.elapsed,
      difficulty: this.difficultyId,
      date: Date.now(),
    });
    this.leaderboard = added.entries;
    this.runRank = added.rank;
    saveLeaderboard(this.leaderboard);
  }

  private handleKeyDown(event: KeyboardEvent): void {
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    this.audio.ensure();

    if (this.phase === 'menu') {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        this.startGame();
      }
      return;
    }

    if (this.phase === 'upgrade') {
      if (
        (event.code === 'Digit1' || event.key === '1') &&
        this.upgradeChoices[0]
      ) {
        event.preventDefault();
        this.selectUpgrade(this.upgradeChoices[0].id);
      } else if (
        (event.code === 'Digit2' || event.key === '2') &&
        this.upgradeChoices[1]
      ) {
        event.preventDefault();
        this.selectUpgrade(this.upgradeChoices[1].id);
      } else if (
        (event.code === 'Digit3' || event.key === '3') &&
        this.upgradeChoices[2]
      ) {
        event.preventDefault();
        this.selectUpgrade(this.upgradeChoices[2].id);
      }
      return;
    }

    if (this.phase === 'gameover') {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        this.startGame();
      } else if (event.key === 'Escape') {
        event.preventDefault();
        this.toMenu();
      }
      return;
    }

    if (this.phase === 'paused') {
      if (event.key === 'Escape' || event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        this.resume();
      } else if (event.key.toLowerCase() === 'r') {
        event.preventDefault();
        this.startGame();
      } else if (event.key.toLowerCase() === 'm') {
        event.preventDefault();
        this.toggleMute();
      } else if (event.key.toLowerCase() === 'b') {
        event.preventDefault();
        this.toggleSceneryMode();
      }
      return;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      this.pause();
      return;
    }

    if (event.key === 'Backspace') {
      event.preventDefault();
      if (this.typed.length > 0) {
        this.typed = this.typed.slice(0, -1);
        if (this.typed.length === 0) {
          this.targetId = null;
          this.targetPickupId = null;
          this.targetAcidId = null;
        } else {
          const candidates = this.ants.filter(
            (ant) => this.isTargetable(ant) && ant.word.startsWith(this.typed),
          );
          if (candidates.length > 0) {
            this.targetId =
              candidates.reduce((best, ant) => (ant.x < best.x ? ant : best))
                .id;
            this.targetPickupId = null;
            this.targetAcidId = null;
          } else {
            const acid = this.acidGlobs.find((g) =>
              g.word.startsWith(this.typed),
            );
            if (acid) {
              this.targetAcidId = acid.id;
              this.targetId = null;
              this.targetPickupId = null;
            } else {
              const pickup = this.pickups.find((item) =>
                item.word.startsWith(this.typed),
              );
              if (pickup) {
                this.targetPickupId = pickup.id;
                this.targetId = null;
                this.targetAcidId = null;
              } else {
                this.targetId = null;
                this.targetPickupId = null;
                this.targetAcidId = null;
                this.typed = '';
              }
            }
          }
        }
        this.emit();
      }
      return;
    }

    if (event.key === ' ' || event.key === 'Tab') {
      event.preventDefault();
      return;
    }

    if (event.code === 'Digit1') {
      event.preventDefault();
      this.activateAbility('focus');
      return;
    }
    if (event.code === 'Digit2') {
      event.preventDefault();
      this.activateAbility('aegis');
      return;
    }
    if (event.code === 'Digit3') {
      event.preventDefault();
      this.activateAbility('power');
      return;
    }

    if (event.repeat) return;
    if (/^[a-zA-Z]$/.test(event.key)) {
      this.typeCharacter(event.key.toUpperCase());
    }
  }

  private render(): void {
    const ctx = this.ctx;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);

    const shakeActive = this.shake > 0 && !this.reducedMotion;
    const shakeX = shakeActive
      ? Math.sin(this.visualTime * 91) * this.shake * 0.32 +
        Math.sin(this.visualTime * 53) * this.shake * 0.16
      : 0;
    const shakeY = shakeActive
      ? Math.cos(this.visualTime * 77) * this.shake * 0.22
      : 0;

    const biome = waveToBiome(this.wave);
    this.scenery.drawBack(ctx, shakeX, shakeY, this.sceneryMode, biome);

    ctx.save();
    ctx.translate(shakeX, shakeY);

    const shieldActive =
      this.phase !== 'menu' && this.elapsed < this.shieldUntil;
    drawDefenseLine(ctx, this.visualTime, this.breachFlash, shieldActive);
    if (this.hasUpgrade('wire')) {
      drawRazorWire(ctx, this.visualTime);
    }

    const lockedAnt = this.ants.find(
      (ant) => ant.id === this.targetId && ant.alive && !ant.burrowed,
    );
    const lockedPoint = lockedAnt ? antBodyCenter(lockedAnt) : null;
    this.player.draw(
      ctx,
      shieldActive,
      this.combo,
      this.powerCharges > 0,
      biome,
      lockedPoint,
    );
    drawPickupBodies(ctx, this.pickups);

    const sortedAnts = this.ants
      .filter((ant) => ant.alive || ant.deathTimer > 0)
      .slice()
      .sort((a, b) => a.y - b.y);
    for (const ant of sortedAnts) {
      drawAnt(ctx, ant, this.visualTime, ant.id === this.targetId);
    }

    drawAcidGlobs(ctx, this.acidGlobs, this.visualTime);

    for (const pickup of this.pickups) {
      if (pickup.id === this.targetPickupId) {
        drawTargetReticle(
          ctx,
          pickup.x,
          pickup.y + Math.sin(pickup.bobPhase) * 5 - 26,
          0.62,
          this.visualTime,
        );
      }
    }

    for (const bullet of this.bullets) {
      drawBullet(ctx, bullet);
    }
    drawParticles(ctx, this.particles);
    drawAntLabels(
      ctx,
      sortedAnts,
      this.phase === 'playing' || this.phase === 'paused' ? this.typed : '',
      this.targetId,
    );
    drawAcidLabels(
      ctx,
      this.acidGlobs,
      this.phase === 'playing' || this.phase === 'paused' ? this.typed : '',
      this.targetAcidId,
    );
    drawPickupLabels(
      ctx,
      this.pickups,
      this.phase === 'playing' || this.phase === 'paused' ? this.typed : '',
      this.targetPickupId,
    );
    drawFloatingTexts(ctx, this.floaters);

    ctx.restore();

    drawVignette(ctx);
    drawBreachFlash(ctx, this.reducedMotion ? 0 : this.breachFlash);
  }

  private currentAccuracy(): number {
    const totalKeys = this.correctKeys + this.mistakes;
    return totalKeys === 0 ? 100 : (this.correctKeys / totalKeys) * 100;
  }

  private currentWpm(): number {
    const minutes = this.elapsed / 60;
    return minutes > 0.03 ? Math.round(this.correctKeys / 5 / minutes) : 0;
  }

  private buildSnapshot(): HudSnapshot {
    const target = this.ants.find(
      (ant) => ant.id === this.targetId && ant.alive && !ant.burrowed,
    );
    const targetPickup =
      this.targetPickupId === null
        ? null
        : this.pickups.find((item) => item.id === this.targetPickupId) ?? null;
    const targetAcid =
      this.targetAcidId === null
        ? null
        : this.acidGlobs.find((g) => g.id === this.targetAcidId) ?? null;
    const accuracy = this.currentAccuracy();
    const wpm = this.currentWpm();
    const leechDraining =
      this.leechDrained < LEECH.maxDrainPerRun &&
      this.ants.some(
        (ant) => ant.alive && ant.kind === 'leech' && ant.x < LEECH.drainZoneX,
      );

    const abilities = ABILITY_IDS.map((id): AbilitySnapshot => {
      const config = ABILITIES[id];
      let active = 0;
      if (id === 'focus') active = Math.max(0, this.slowUntil - this.elapsed);
      if (id === 'aegis') active = Math.max(0, this.shieldUntil - this.elapsed);
      if (id === 'power') active = this.powerCharges;
      return {
        id,
        key: config.key,
        name: config.name,
        description: config.description,
        cooldown: Math.max(0, this.readyAt[id] - this.elapsed),
        active,
        charges: id === 'power' ? this.powerCharges : 0,
      };
    });

    const banner =
      this.banner && this.visualTime < this.banner.until
        ? { ...this.banner }
        : null;

    return {
      phase: this.phase,
      health: this.health,
      maxHealth: this.maxHealth,
      wave: this.wave,
      elapsed: this.elapsed,
      eliminated: this.eliminated,
      score: this.score,
      typed: this.typed,
      targetWord:
        target?.word ?? targetAcid?.word ?? targetPickup?.word ?? '',
      targetSelected:
        Boolean(target) || Boolean(targetAcid) || Boolean(targetPickup),
      targetIsPickup: targetPickup !== null,
      targetIsAcid: targetAcid !== null,
      targetCritical: Boolean(target?.critical),
      scoreSurgeSeconds: Math.max(0, this.scoreSurgeUntil - this.elapsed),
      leechDraining,
      runRank: this.runRank,
      leaderboard: this.leaderboard.map((entry) => ({ ...entry })),
      combo: this.combo,
      bestCombo: this.bestCombo,
      correctWords: this.correctWords,
      mistakes: this.mistakes,
      accuracy,
      wpm,
      muted: this.audio.muted,
      reducedMotion: this.reducedMotion,
      sceneryMode: this.sceneryMode,
      biome: waveToBiome(this.wave),
      wordPack: this.wordPack,
      activeUpgrades: [...this.activeUpgrades],
      upgradeChoices: this.upgradeChoices.map((u) => ({ ...u })),
      abilities,
      shieldSeconds: Math.max(0, this.shieldUntil - this.elapsed),
      slowSeconds: Math.max(0, this.slowUntil - this.elapsed),
      powerCharges: this.powerCharges,
      banner,
      records: { ...this.progress },
      newRecords: { ...this.newRecords },
      difficulty: this.difficultyId,
      inputError: this.inputError > 0,
      breached: this.breachFlash > 0.16,
      waveProgress:
        this.waveState.quota > 0
          ? clamp(this.waveState.spawned / this.waveState.quota, 0, 1)
          : 0,
      stats: {
        wavesSurvived: this.wave,
        antsEliminated: this.eliminated,
        score: this.score,
        accuracy,
        bestCombo: this.bestCombo,
        correctWords: this.correctWords,
        mistakes: this.mistakes,
        time: this.elapsed,
        wpm,
        wpmHistory: this.wpmHistory,
      },
    };
  }

  private emit(): void {
    if (this.destroyed) return;
    this.listener(this.buildSnapshot());
  }
}
