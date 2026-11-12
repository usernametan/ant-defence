import type {
  DamageContext,
  DamageResult,
  Damageable,
  Team,
} from "../combat/Damage";
import { lerp } from "../core/math";
import type { Vec2 } from "../core/types";
import {
  moveCircleWithCollision,
  type CollisionWorld,
} from "../world/Collision";

export interface PlayerConfig {
  radius: number;
  maxHealth: number;
  moveSpeed: number;
  sprintMultiplier: number;
  acceleration: number;
  deceleration: number;
  dodgeSpeed: number;
  dodgeDuration: number;
  dodgeCooldown: number;
  dodgeInvulnerability: number;
  maxStamina: number;
  sprintStaminaDrain: number;
  staminaRegenDelay: number;
  staminaRegenRate: number;
}

export const DEFAULT_PLAYER_CONFIG: PlayerConfig = {
  radius: 18,
  maxHealth: 100,
  moveSpeed: 220,
  sprintMultiplier: 1.35,
  acceleration: 1800,
  deceleration: 2400,
  dodgeSpeed: 560,
  dodgeDuration: 0.22,
  dodgeCooldown: 0.8,
  dodgeInvulnerability: 0.26,
  maxStamina: 100,
  sprintStaminaDrain: 28,
  staminaRegenDelay: 0.7,
  staminaRegenRate: 20,
};

export interface PlayerRenderState {
  x: number;
  y: number;
  radius: number;
  facing: number;
  velocityX: number;
  velocityY: number;
  sprinting: boolean;
  dodging: boolean;
  invulnerable: boolean;
  stamina: number;
  maxStamina: number;
  dodgeCooldown: number;
  dodgeCooldownMax: number;
  health: number;
  maxHealth: number;
  alive: boolean;
  hitFlash: number;
}

export class Player implements Damageable {
  readonly id = "player";
  readonly team: Team = "player";
  readonly maxHealth: number;
  private readonly config: PlayerConfig;
  private position: Vec2;
  private previousPosition: Vec2;
  private velocityVector: Vec2 = { x: 0, y: 0 };
  private facing = 0;
  private previousFacing = 0;
  private currentHealth: number;
  private flash = 0;
  private stamina: number;
  private staminaRegenDelayRemaining = 0;
  private sprintingNow = false;
  private dodgeRemaining = 0;
  private dodgeCooldownRemainingSeconds = 0;
  private invulnerableRemaining = 0;
  private dodgeDirection: Vec2 = { x: 1, y: 0 };

  constructor(
    spawn: Vec2,
    config: PlayerConfig = DEFAULT_PLAYER_CONFIG,
  ) {
    this.config = config;
    this.maxHealth = config.maxHealth;
    this.position = { ...spawn };
    this.previousPosition = { ...spawn };
    this.currentHealth = config.maxHealth;
    this.stamina = config.maxStamina;
  }

  get x(): number {
    return this.position.x;
  }

  get y(): number {
    return this.position.y;
  }

  get radius(): number {
    return this.config.radius;
  }

  get facingAngle(): number {
    return this.facing;
  }

  get velocity(): Vec2 {
    return { ...this.velocityVector };
  }

  get speed(): number {
    return Math.hypot(this.velocityVector.x, this.velocityVector.y);
  }

  get currentStamina(): number {
    return this.stamina;
  }

  get maxStamina(): number {
    return this.config.maxStamina;
  }

  get health(): number {
    return this.currentHealth;
  }

  get alive(): boolean {
    return this.currentHealth > 0;
  }

  get hitFlash(): number {
    return this.flash;
  }

  get isSprinting(): boolean {
    return this.sprintingNow;
  }

  get isDodging(): boolean {
    return this.dodgeRemaining > 0;
  }

  get isInvulnerable(): boolean {
    return this.invulnerableRemaining > 0;
  }

  get dodgeCooldownRemaining(): number {
    return this.dodgeCooldownRemainingSeconds;
  }

  get dodgeCooldownMax(): number {
    return this.config.dodgeCooldown;
  }

  reset(spawn: Vec2): void {
    this.position = { ...spawn };
    this.previousPosition = { ...spawn };
    this.velocityVector = { x: 0, y: 0 };
    this.facing = 0;
    this.previousFacing = 0;
    this.currentHealth = this.maxHealth;
    this.flash = 0;
    this.stamina = this.config.maxStamina;
    this.staminaRegenDelayRemaining = 0;
    this.sprintingNow = false;
    this.dodgeRemaining = 0;
    this.dodgeCooldownRemainingSeconds = 0;
    this.invulnerableRemaining = 0;
    this.dodgeDirection = { x: 1, y: 0 };
  }

  takeDamage(amount: number, _context: DamageContext): DamageResult {
    if (
      !this.alive ||
      !Number.isFinite(amount) ||
      amount <= 0 ||
      this.isInvulnerable
    ) {
      return {
        applied: 0,
        killed: false,
        remainingHealth: this.currentHealth,
      };
    }

    const applied = Math.min(this.currentHealth, amount);
    this.currentHealth = Math.max(0, this.currentHealth - amount);
    this.flash = 1;

    if (this.currentHealth === 0) {
      this.velocityVector = { x: 0, y: 0 };
      this.dodgeRemaining = 0;
      this.invulnerableRemaining = 0;
    }

    return {
      applied,
      killed: this.currentHealth === 0,
      remainingHealth: this.currentHealth,
    };
  }

  requestDodge(intent: Vec2): boolean {
    if (this.dodgeRemaining > 0 || this.dodgeCooldownRemainingSeconds > 0) {
      return false;
    }

    const direction = normalizeVector(intent);

    this.dodgeDirection =
      direction.x === 0 && direction.y === 0
        ? { x: Math.cos(this.facing), y: Math.sin(this.facing) }
        : direction;
    this.dodgeRemaining = this.config.dodgeDuration;
    this.dodgeCooldownRemainingSeconds = this.config.dodgeCooldown;
    this.invulnerableRemaining = this.config.dodgeInvulnerability;
    this.velocityVector = {
      x: this.dodgeDirection.x * this.config.dodgeSpeed,
      y: this.dodgeDirection.y * this.config.dodgeSpeed,
    };
    return true;
  }

  update(
    deltaSeconds: number,
    intent: Vec2,
    sprintHeld: boolean,
    world: CollisionWorld,
    aimWorld: Vec2 | null = null,
  ): void {
    this.previousPosition = { ...this.position };
    this.previousFacing = this.facing;

    if (!Number.isFinite(deltaSeconds) || deltaSeconds <= 0) {
      return;
    }

    this.flash = Math.max(0, this.flash - deltaSeconds * 4);

    if (!this.alive) {
      this.velocityVector = { x: 0, y: 0 };
      return;
    }

    if (aimWorld) {
      const aimX = aimWorld.x - this.position.x;
      const aimY = aimWorld.y - this.position.y;

      if (aimX * aimX + aimY * aimY > 9) {
        this.facing = Math.atan2(aimY, aimX);
      }
    }

    const direction = normalizeVector(intent);
    const moving = direction.x !== 0 || direction.y !== 0;
    const dodgingThisStep = this.dodgeRemaining > 0;

    this.dodgeRemaining = Math.max(0, this.dodgeRemaining - deltaSeconds);
    this.dodgeCooldownRemainingSeconds = Math.max(
      0,
      this.dodgeCooldownRemainingSeconds - deltaSeconds,
    );
    this.invulnerableRemaining = Math.max(
      0,
      this.invulnerableRemaining - deltaSeconds,
    );

    const wantsSprint =
      sprintHeld && moving && !dodgingThisStep && this.stamina > 0;
    const targetSpeed =
      this.config.moveSpeed *
      (wantsSprint ? this.config.sprintMultiplier : 1);

    if (wantsSprint) {
      this.stamina = Math.max(
        0,
        this.stamina - this.config.sprintStaminaDrain * deltaSeconds,
      );
      this.staminaRegenDelayRemaining = this.config.staminaRegenDelay;
    } else {
      this.staminaRegenDelayRemaining = Math.max(
        0,
        this.staminaRegenDelayRemaining - deltaSeconds,
      );

      if (this.staminaRegenDelayRemaining === 0) {
        this.stamina = Math.min(
          this.config.maxStamina,
          this.stamina + this.config.staminaRegenRate * deltaSeconds,
        );
      }
    }

    this.sprintingNow = wantsSprint && this.stamina > 0;

    if (dodgingThisStep) {
      this.velocityVector = {
        x: this.dodgeDirection.x * this.config.dodgeSpeed,
        y: this.dodgeDirection.y * this.config.dodgeSpeed,
      };
    } else {
      const targetVelocityX = direction.x * targetSpeed;
      const targetVelocityY = direction.y * targetSpeed;
      const rate = moving
        ? this.config.acceleration
        : this.config.deceleration;
      const maxChange = rate * deltaSeconds;

      this.velocityVector = {
        x: approach(this.velocityVector.x, targetVelocityX, maxChange),
        y: approach(this.velocityVector.y, targetVelocityY, maxChange),
      };

      if (!moving && Math.hypot(this.velocityVector.x, this.velocityVector.y) < 1) {
        this.velocityVector = { x: 0, y: 0 };
      }
    }

    const collision = moveCircleWithCollision(
      this.position,
      {
        x: this.velocityVector.x * deltaSeconds,
        y: this.velocityVector.y * deltaSeconds,
      },
      this.config.radius,
      world,
    );

    this.position = collision.position;

    if (collision.hitX) {
      this.velocityVector.x = 0;
    }

    if (collision.hitY) {
      this.velocityVector.y = 0;
    }

    if (dodgingThisStep && this.dodgeRemaining === 0) {
      this.velocityVector = {
        x: this.velocityVector.x * 0.2,
        y: this.velocityVector.y * 0.2,
      };
    }
  }

  getRenderPosition(alpha: number): Vec2 {
    return {
      x: lerp(this.previousPosition.x, this.position.x, alpha),
      y: lerp(this.previousPosition.y, this.position.y, alpha),
    };
  }

  getRenderState(alpha: number): PlayerRenderState {
    const position = this.getRenderPosition(alpha);

    return {
      x: position.x,
      y: position.y,
      radius: this.config.radius,
      facing: lerpAngle(this.previousFacing, this.facing, alpha),
      velocityX: this.velocityVector.x,
      velocityY: this.velocityVector.y,
      sprinting: this.sprintingNow,
      dodging: this.isDodging,
      invulnerable: this.isInvulnerable,
      stamina: this.stamina,
      maxStamina: this.config.maxStamina,
      dodgeCooldown: this.dodgeCooldownRemainingSeconds,
      dodgeCooldownMax: this.config.dodgeCooldown,
      health: this.currentHealth,
      maxHealth: this.maxHealth,
      alive: this.alive,
      hitFlash: this.flash,
    };
  }
}

function normalizeVector(vector: Vec2): Vec2 {
  const length = Math.hypot(vector.x, vector.y);

  if (length < 1e-6) {
    return { x: 0, y: 0 };
  }

  return {
    x: vector.x / length,
    y: vector.y / length,
  };
}

function approach(current: number, target: number, maxChange: number): number {
  if (current < target) {
    return Math.min(current + maxChange, target);
  }

  if (current > target) {
    return Math.max(current - maxChange, target);
  }

  return target;
}

function lerpAngle(start: number, end: number, amount: number): number {
  const delta = Math.atan2(
    Math.sin(end - start),
    Math.cos(end - start),
  );

  return start + delta * amount;
}
