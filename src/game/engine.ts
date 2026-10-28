import {
  ABILITIES,
  ANT_TYPES,
  COLOR,
  DIFFICULTY,
  LANES,
  PLAYER,
  VIEW_HEIGHT,
  VIEW_WIDTH,
  WORLD,
} from './config';
import { AudioEngine } from './audio';
import {
  antBodyCenter,
  drawAnt,
  drawAntLabels,
  makeAnt,
  updateAnt,
} from './ants';
import {
  drawBreachFlash,
  drawBullet,
  drawDefenseLine,
  drawFloatingTexts,
  drawParticles,
  drawVignette,
  spawnBreachBurst,
  spawnDeathBurst,
  spawnHitSparks,
  spawnSpawnDust,
  updateParticles,
} from './effects';
import { Player } from './player';
import { Scenery } from './scenery';
import type {
  AbilityId,
  AbilitySnapshot,
  Ant,
  AntKind,
  BannerSnapshot,
  Bullet,
  FloatingText,
  GamePhase,
  HudSnapshot,
  Particle,
} from './types';
import { pickWord, waveTitle } from './words';

type SnapshotListener = (snapshot: HudSnapshot) => void;

type WaveState = {
  spawned: number;
  quota: number;
  spawnTimer: number;
  intermission: number;
  bossSpawned: boolean;
};

const ABILITY_IDS: AbilityId[] = ['focus', 'aegis', 'power'];

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

  private ants: Ant[] = [];

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

  activateAbility(id: AbilityId): void {
    if (this.phase !== 'playing') return;
    if (this.readyAt[id] > this.elapsed) {
      this.audio.error();
      this.inputError = 0.16;
      this.emit();
      return;
    }
    if (id === 'focus') {
      this.slowUntil = this.elapsed + ABILITIES.focus.duration;
      this.readyAt.focus = this.elapsed + ABILITIES.focus.cooldown;
      this.floater(this.player.x + 30, this.player.y - 156, 'FOCUS', COLOR.blue, 21);
    } else if (id === 'aegis') {
      this.shieldUntil = this.elapsed + ABILITIES.aegis.duration;
      this.readyAt.aegis = this.elapsed + ABILITIES.aegis.cooldown;
      this.floater(this.player.x + 30, this.player.y - 156, 'AEGIS', COLOR.blue, 21);
    } else {
      this.powerCharges = ABILITIES.power.charges;
      this.readyAt.power = this.elapsed + ABILITIES.power.cooldown;
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
    this.ants = [];
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
    this.lastAimTarget = null;
    this.lastAimUntil = 0;
    this.banner = null;
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
    this.waveState = {
      spawned: 0,
      quota,
      spawnTimer: bossWave ? 1.6 : 1.1,
      intermission: 0,
      bossSpawned: false,
    };
    const subtitle = bossWave
      ? `ROYAL ASSAULT — THE QUEEN APPROACHES`
      : waveTitle(this.wave);
    this.setBanner(`WAVE ${this.wave}`, subtitle, DIFFICULTY.waveBannerTime);
    if (bossWave) this.audio.boss();
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
    this.scenery.update(dt);

    if (this.phase === 'playing') {
      this.updateGame(dt);
    } else if (this.phase === 'menu' || this.phase === 'gameover') {
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

    const targetAnt = this.ants.find(
      (ant) => ant.id === this.targetId && ant.alive,
    );
    let aimTarget: { x: number; y: number } | null = null;
    if (targetAnt) {
      aimTarget = antBodyCenter(targetAnt);
    } else if (this.lastAimTarget && this.elapsed < this.lastAimUntil) {
      aimTarget = this.lastAimTarget;
    }
    this.player.update(dt, aimTarget, true);

    const slowActive = this.elapsed < this.slowUntil;
    const speedScale = slowActive ? ABILITIES.focus.slowFactor : 1;

    for (const ant of this.ants) {
      if (!ant.alive) continue;
      updateAnt(ant, dt, speedScale);
      if (ant.boss && ant.alive && this.elapsed >= ant.nextMinionAt) {
        ant.nextMinionAt = this.elapsed + DIFFICULTY.bossMinionEvery;
        this.spawnMinion();
      }
      if (ant.alive && ant.x <= WORLD.lineX + 6) {
        this.breachAnt(ant);
      }
    }

    this.ants = this.ants.filter((ant) => ant.alive && ant.x > -120);

    this.updateBullets(dt);
    updateParticles(this.particles, dt);
    this.updateFloaters(dt);
    this.updateWave(dt);

    if (this.health <= 0) {
      this.endGame();
    }
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

  private updateWave(dt: number): void {
    if (this.waveState.intermission > 0) {
      this.waveState.intermission -= dt;
      if (this.waveState.intermission <= 0) {
        this.wave += 1;
        this.startWave();
      }
      return;
    }

    const bossWave = this.wave % DIFFICULTY.bossEvery === 0;
    const maxActive = Math.min(
      WORLD.maxActiveAnts,
      DIFFICULTY.maxActiveAtStart +
        Math.floor(this.wave * DIFFICULTY.maxActivePerWave),
    );

    if (this.waveState.spawned < this.waveState.quota) {
      this.waveState.spawnTimer -= dt;
      if (this.waveState.spawnTimer <= 0) {
        if (this.ants.length < maxActive) {
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
        const interval = Math.max(
          DIFFICULTY.minSpawnInterval,
          base * (0.84 + Math.random() * 0.34) + (bossWave ? 0.55 : 0),
        );
        this.waveState.spawnTimer = interval;
      }
    } else if (this.ants.length === 0) {
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

  private chooseKind(bossWave: boolean): AntKind {
    if (this.wave <= 1) return 'normal';
    const roll = Math.random();
    if (this.wave === 2) return roll < 0.72 ? 'normal' : 'fast';
    if (this.wave === 3) {
      if (roll < 0.42) return 'normal';
      if (roll < 0.74) return 'fast';
      return 'armored';
    }
    if (this.wave === 4) {
      if (roll < 0.26) return 'normal';
      if (roll < 0.53) return 'fast';
      if (roll < 0.83) return 'armored';
      return 'giant';
    }
    if (bossWave) {
      if (roll < 0.36) return 'normal';
      if (roll < 0.7) return 'fast';
      if (roll < 0.9) return 'armored';
      return 'giant';
    }
    if (roll < 0.24) return 'normal';
    if (roll < 0.48) return 'fast';
    if (roll < 0.74) return 'armored';
    return 'giant';
  }

  private spawnAnt(kind: AntKind): void {
    const lane = this.pickLane();
    const laneInfo = LANES[lane];
    const config = ANT_TYPES[kind];
    const waveBonus = Math.min(2, Math.floor((this.wave - 1) / 4));
    const minLength = Math.min(10, config.wordRange[0] + waveBonus);
    const maxLength = Math.min(10, config.wordRange[1] + waveBonus);
    const activeWords = this.ants
      .filter((ant) => ant.alive)
      .map((ant) => ant.word);
    const word = pickWord(
      minLength,
      maxLength,
      activeWords,
      this.typed,
      Math.random,
    );
    const speedMultiplier = Math.min(
      DIFFICULTY.maxSpeedMultiplier,
      1 + (this.wave - 1) * DIFFICULTY.speedPerWave,
    );
    const jitter = 0.92 + Math.random() * 0.16;
    const x = WORLD.spawnX + Math.random() * 56 + (lane % 2) * 30;
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
    );
    this.nextId += 1;
    if (ant.boss) {
      ant.nextMinionAt = this.elapsed + DIFFICULTY.bossMinionEvery;
    }
    this.ants.push(ant);
    spawnSpawnDust(this.particles, ant.x, ant.y);
  }

  private spawnMinion(): void {
    const maxActive = Math.min(
      WORLD.maxActiveAnts,
      DIFFICULTY.maxActiveAtStart +
        Math.floor(this.wave * DIFFICULTY.maxActivePerWave),
    );
    if (this.ants.length >= maxActive) return;
    this.spawnAnt(Math.random() < 0.6 ? 'fast' : 'normal');
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
      const space = nearest === Infinity ? 9999 : nearest + Math.random() * 80;
      if (space > bestSpace) {
        bestSpace = space;
        bestLane = lane;
      }
    }
    return bestLane;
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
      this.audio.hit();
      this.floater(point.x, point.y - 20, `${Math.max(0, ant.hp)} HIT`, '#ffd7a3', 15);
      this.shake = Math.max(this.shake, powered ? 6 : 2.5);
      if (ant.boss) this.rotateBossWord(ant);
      this.emit();
    }
  }

  private rotateBossWord(ant: Ant): void {
    const config = ANT_TYPES[ant.kind];
    const waveBonus = Math.min(2, Math.floor((this.wave - 1) / 4));
    const activeWords = this.ants
      .filter((other) => other.alive && other.id !== ant.id)
      .map((other) => other.word);
    activeWords.push(ant.word);
    ant.word = pickWord(
      Math.min(10, config.wordRange[0] + waveBonus),
      Math.min(10, config.wordRange[1] + waveBonus),
      activeWords,
      '',
      Math.random,
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
    const gained = Math.round(ANT_TYPES[ant.kind].score * multiplier);
    this.score += gained;
    this.floater(point.x, point.y - 36, `+${gained}`, COLOR.goldBright, ant.boss ? 30 : 20);
    if (this.combo >= 3) {
      this.floater(point.x, point.y - 66, `COMBO ${this.combo}`, '#ffe0a3', 15);
    }

    if (this.targetId === ant.id) {
      this.targetId = null;
      this.typed = '';
    }

    this.audio.kill();
    this.shake = Math.max(this.shake, ant.boss ? 20 : 4);

    if (ant.boss) {
      this.score += 1000;
      this.setBanner('QUEEN SLAIN', '+1000 BONUS — THE COLONY RECOILS', 3.2);
      this.audio.boss();
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
    return ant.alive && ant.x <= VIEW_WIDTH - 8;
  }

  private typeCharacter(char: string): void {
    if (this.phase !== 'playing') return;
    const next = `${this.typed}${char}`;
    const candidates = this.ants.filter(
      (ant) => this.isTargetable(ant) && ant.word.startsWith(next),
    );
    if (candidates.length === 0) {
      this.mistakes += 1;
      this.inputError = 0.22;
      this.audio.error();
      this.emit();
      return;
    }

    this.correctKeys += 1;
    this.typed = next;
    const target = candidates.reduce((best, ant) =>
      ant.x < best.x ? ant : best,
    );
    this.targetId = target.id;
    const point = antBodyCenter(target);
    this.lastAimTarget = point;
    this.lastAimUntil = this.elapsed + PLAYER.aimHoldTime;

    if (this.typed === target.word) {
      this.fireAt(target);
    }
    this.emit();
  }

  private fireAt(ant: Ant): void {
    const point = antBodyCenter(ant);
    const powered = this.powerCharges > 0;
    if (powered) this.powerCharges -= 1;

    this.player.shoot(point);
    const muzzle = this.player.getMuzzle();
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
    this.player.update(0, null, false);
    this.audio.gameover();
    this.emit();
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
        } else {
          const candidates = this.ants.filter(
            (ant) => this.isTargetable(ant) && ant.word.startsWith(this.typed),
          );
          this.targetId =
            candidates.length > 0
              ? candidates.reduce((best, ant) => (ant.x < best.x ? ant : best)).id
              : null;
          if (this.targetId === null) this.typed = '';
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

    const shakeX =
      this.shake > 0
        ? Math.sin(this.visualTime * 91) * this.shake * 0.32 +
          Math.sin(this.visualTime * 53) * this.shake * 0.16
        : 0;
    const shakeY =
      this.shake > 0
        ? Math.cos(this.visualTime * 77) * this.shake * 0.22
        : 0;

    this.scenery.drawBack(ctx, shakeX, shakeY);

    ctx.save();
    ctx.translate(shakeX, shakeY);

    const shieldActive =
      this.phase !== 'menu' && this.elapsed < this.shieldUntil;
    drawDefenseLine(ctx, this.visualTime, this.breachFlash, shieldActive);
    this.player.draw(ctx, shieldActive);

    const sortedAnts = this.ants
      .filter((ant) => ant.alive)
      .slice()
      .sort((a, b) => a.y - b.y);
    for (const ant of sortedAnts) {
      drawAnt(ctx, ant, this.visualTime, ant.id === this.targetId);
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
    drawFloatingTexts(ctx, this.floaters);

    ctx.restore();

    drawVignette(ctx);
    drawBreachFlash(ctx, this.breachFlash);
  }

  private buildSnapshot(): HudSnapshot {
    const target = this.ants.find(
      (ant) => ant.id === this.targetId && ant.alive,
    );
    const totalKeys = this.correctKeys + this.mistakes;
    const accuracy =
      totalKeys === 0 ? 100 : (this.correctKeys / totalKeys) * 100;
    const minutes = this.elapsed / 60;
    const wpm =
      minutes > 0.03 ? Math.round(this.correctKeys / 5 / minutes) : 0;

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
      targetWord: target?.word ?? '',
      targetSelected: Boolean(target),
      combo: this.combo,
      bestCombo: this.bestCombo,
      correctWords: this.correctWords,
      mistakes: this.mistakes,
      accuracy,
      wpm,
      muted: this.audio.muted,
      abilities,
      shieldSeconds: Math.max(0, this.shieldUntil - this.elapsed),
      slowSeconds: Math.max(0, this.slowUntil - this.elapsed),
      powerCharges: this.powerCharges,
      banner,
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
      },
    };
  }

  private emit(): void {
    if (this.destroyed) return;
    this.listener(this.buildSnapshot());
  }
}
