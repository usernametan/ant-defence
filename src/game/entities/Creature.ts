import type { CreatureMovementState } from "../ai/Brain";
import { decideMovement } from "../ai/behaviors";
import type {
  CreatureArchetype,
  CreatureArchetypeId,
  CreatureProjectileDef,
} from "../content/creatures";
import type {
  DamageContext,
  DamageResult,
  Damageable,
  Team,
} from "../combat/Damage";
import { hashString } from "../core/rng";
import { lerp } from "../core/math";
import type { Vec2 } from "../core/types";
import {
  hasLineOfSight,
  moveCircleWithCollision,
  type CollisionWorld,
} from "../world/Collision";

export type CreatureState =
  | CreatureMovementState
  | "windup"
  | "recover"
  | "dead";

export interface CreatureUpdateContext {
  world: CollisionWorld;
  target: Damageable | null;
  allies: readonly Creature[];
  time: number;
}

export interface CreatureAttackIntent {
  creatureId: string;
  archetypeId: CreatureArchetypeId;
  kind: CreatureArchetype["attack"]["kind"];
  x: number;
  y: number;
  angle: number;
  direction: Vec2;
  damage: number;
  range: number;
  projectile?: CreatureProjectileDef;
}

export interface CreatureRenderState {
  x: number;
  y: number;
  radius: number;
  facing: number;
  health: number;
  maxHealth: number;
  alive: boolean;
  state: CreatureState;
  archetypeId: CreatureArchetypeId;
  bodyColor: string;
  accentColor: string;
  coreColor: string;
  hitFlash: number;
  attackCharge: number;
}

export class Creature implements Damageable {
  readonly id: string;
  readonly team: Team = "hostile";
  readonly archetype: CreatureArchetype;
  readonly radius: number;
  readonly maxHealth: number;
  private position: Vec2;
  private previousPosition: Vec2;
  private velocityVector: Vec2 = { x: 0, y: 0 };
  private currentHealth: number;
  private facing = 0;
  private previousFacing = 0;
  private flash = 0;
  private currentState: CreatureState = "idle";
  private attackCooldownRemaining = 0;
  private windupRemaining = 0;
  private recoveryRemaining = 0;
  private target: Damageable | null = null;
  private targetVisible = false;
  private readonly orbitPhase: number;

  constructor(
    id: string,
    archetype: CreatureArchetype,
    spawn: Vec2,
  ) {
    this.id = id;
    this.archetype = archetype;
    this.radius = archetype.radius;
    this.maxHealth = archetype.maxHealth;
    this.position = { x: spawn.x, y: spawn.y };
    this.previousPosition = { x: spawn.x, y: spawn.y };
    this.currentHealth = archetype.maxHealth;
    this.orbitPhase = (hashString(id) % 1000) / 1000;
  }

  get x(): number {
    return this.position.x;
  }

  get y(): number {
    return this.position.y;
  }

  get health(): number {
    return this.currentHealth;
  }

  get alive(): boolean {
    return this.currentHealth > 0;
  }

  get state(): CreatureState {
    return this.currentState;
  }

  get facingAngle(): number {
    return this.facing;
  }

  get velocity(): Vec2 {
    return { ...this.velocityVector };
  }

  get hasTarget(): boolean {
    return this.target !== null;
  }

  get targetId(): string | null {
    return this.target?.id ?? null;
  }

  get hitFlash(): number {
    return this.flash;
  }

  get attackCooldown(): number {
    return this.attackCooldownRemaining;
  }

  get attackCharge(): number {
    if (this.currentState !== "windup") {
      return 0;
    }

    const duration = this.archetype.attack.windup;

    return duration <= 0 ? 1 : 1 - this.windupRemaining / duration;
  }

  takeDamage(amount: number, _context: DamageContext): DamageResult {
    if (!this.alive || !Number.isFinite(amount) || amount <= 0) {
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
      this.currentState = "dead";
      this.velocityVector = { x: 0, y: 0 };
      this.target = null;
      this.targetVisible = false;
    }

    return {
      applied,
      killed: this.currentHealth === 0,
      remainingHealth: this.currentHealth,
    };
  }

  update(
    deltaSeconds: number,
    context: CreatureUpdateContext,
  ): CreatureAttackIntent | null {
    if (!Number.isFinite(deltaSeconds) || deltaSeconds <= 0) {
      return null;
    }

    this.previousPosition = { ...this.position };
    this.previousFacing = this.facing;
    this.flash = Math.max(0, this.flash - deltaSeconds * 4);
    this.attackCooldownRemaining = Math.max(
      0,
      this.attackCooldownRemaining - deltaSeconds,
    );

    if (!this.alive) {
      return null;
    }

    this.refreshTarget(context);

    if (this.currentState === "windup") {
      return this.updateWindup(deltaSeconds, context);
    }

    if (this.currentState === "recover") {
      this.recoveryRemaining = Math.max(
        0,
        this.recoveryRemaining - deltaSeconds,
      );
      this.velocityVector = { x: 0, y: 0 };

      if (this.recoveryRemaining > 0) {
        return null;
      }
    }

    const target = this.target;

    if (!target) {
      this.currentState = "idle";
      this.velocityVector = { x: 0, y: 0 };
      return null;
    }

    const distance = this.distanceTo(target);
    this.faceToward(target);

    if (
      this.attackCooldownRemaining <= 0 &&
      distance <= this.archetype.attack.range
    ) {
      this.beginWindup(context);
      return null;
    }

    const decision = decideMovement(this.archetype.behavior, {
      position: this.position,
      target: { x: target.x, y: target.y },
      distance,
      time: context.time,
      phase: this.orbitPhase,
      allyCount: context.allies.length,
      attackRange: this.archetype.attack.range,
      preferredRange: this.archetype.preferredRange,
    });

    this.currentState = decision.state;
    this.applyMovement(deltaSeconds, context, decision.move, decision.speedScale);

    return null;
  }

  getRenderState(alpha: number): CreatureRenderState {
    return {
      x: lerp(this.previousPosition.x, this.position.x, alpha),
      y: lerp(this.previousPosition.y, this.position.y, alpha),
      radius: this.radius,
      facing: lerpAngle(this.previousFacing, this.facing, alpha),
      health: this.currentHealth,
      maxHealth: this.maxHealth,
      alive: this.alive,
      state: this.currentState,
      archetypeId: this.archetype.id,
      bodyColor: this.archetype.bodyColor,
      accentColor: this.archetype.accentColor,
      coreColor: this.archetype.coreColor,
      hitFlash: this.flash,
      attackCharge: this.attackCharge,
    };
  }

  private refreshTarget(context: CreatureUpdateContext): void {
    const candidate = context.target;

    if (!candidate || !candidate.alive) {
      this.target = null;
      this.targetVisible = false;
      return;
    }

    const distance = this.distanceTo(candidate);
    const visible = hasLineOfSight(this.position, candidate, context.world);

    if (this.target === candidate) {
      if (distance > this.archetype.loseRange || !visible) {
        this.target = null;
        this.targetVisible = false;
      } else {
        this.targetVisible = true;
      }

      return;
    }

    if (
      distance <= this.archetype.detectionRange &&
      visible
    ) {
      this.target = candidate;
      this.targetVisible = true;
    } else {
      this.targetVisible = false;
    }
  }

  private beginWindup(context: CreatureUpdateContext): void {
    this.currentState = "windup";
    this.windupRemaining = Math.max(0, this.archetype.attack.windup);
    this.velocityVector = { x: 0, y: 0 };

    if (this.target) {
      this.faceToward(this.target);
    }

    if (this.windupRemaining <= 1e-6) {
      this.releaseAttack(context);
    }
  }

  private updateWindup(
    deltaSeconds: number,
    context: CreatureUpdateContext,
  ): CreatureAttackIntent | null {
    this.velocityVector = { x: 0, y: 0 };
    this.windupRemaining = Math.max(0, this.windupRemaining - deltaSeconds);

    if (this.target) {
      this.faceToward(this.target);
    }

    if (this.windupRemaining > 0) {
      return null;
    }

    return this.releaseAttack(context);
  }

  private releaseAttack(
    context: CreatureUpdateContext,
  ): CreatureAttackIntent | null {
    const target = this.target;

    this.currentState = "recover";
    this.recoveryRemaining = Math.max(0, this.archetype.attack.recovery);
    this.attackCooldownRemaining = Math.max(0, this.archetype.attack.cooldown);

    if (!target || !target.alive || !this.targetVisible) {
      return null;
    }

    const distance = this.distanceTo(target);

    if (distance > this.archetype.attack.range + target.radius * 0.25) {
      return null;
    }

    if (!hasLineOfSight(this.position, target, context.world)) {
      return null;
    }

    const angle = Math.atan2(
      target.y - this.position.y,
      target.x - this.position.x,
    );

    return {
      creatureId: this.id,
      archetypeId: this.archetype.id,
      kind: this.archetype.attack.kind,
      x: this.position.x,
      y: this.position.y,
      angle,
      direction: { x: Math.cos(angle), y: Math.sin(angle) },
      damage: this.archetype.attack.damage,
      range: this.archetype.attack.range,
      projectile: this.archetype.attack.projectile,
    };
  }

  private applyMovement(
    deltaSeconds: number,
    context: CreatureUpdateContext,
    move: Vec2,
    speedScale: number,
  ): void {
    let desiredX = move.x;
    let desiredY = move.y;
    const target = this.target;

    for (const ally of context.allies) {
      if (ally === this || !ally.alive) {
        continue;
      }

      const deltaX = this.position.x - ally.x;
      const deltaY = this.position.y - ally.y;
      const distance = Math.hypot(deltaX, deltaY);
      const spacing = this.radius + ally.radius + 10;

      if (distance < 1e-6 || distance >= spacing) {
        continue;
      }

      const strength = (spacing - distance) / spacing;
      desiredX += (deltaX / distance) * strength * 1.35;
      desiredY += (deltaY / distance) * strength * 1.35;
    }

    if (target) {
      const deltaX = this.position.x - target.x;
      const deltaY = this.position.y - target.y;
      const distance = Math.hypot(deltaX, deltaY);
      const spacing = this.radius + target.radius + 5;

      if (distance > 1e-6 && distance < spacing) {
        const strength = (spacing - distance) / spacing;
        desiredX += (deltaX / distance) * strength * 1.6;
        desiredY += (deltaY / distance) * strength * 1.6;
      }
    }

    const length = Math.hypot(desiredX, desiredY);

    if (length < 1e-6 || !Number.isFinite(length)) {
      this.velocityVector = { x: 0, y: 0 };
      return;
    }

    const speed = this.archetype.moveSpeed * Math.max(0, speedScale);
    this.velocityVector = {
      x: (desiredX / length) * speed,
      y: (desiredY / length) * speed,
    };

    const collision = moveCircleWithCollision(
      this.position,
      {
        x: this.velocityVector.x * deltaSeconds,
        y: this.velocityVector.y * deltaSeconds,
      },
      this.radius,
      context.world,
    );

    this.position = collision.position;

    if (collision.hitX) {
      this.velocityVector.x = 0;
    }

    if (collision.hitY) {
      this.velocityVector.y = 0;
    }
  }

  private faceToward(target: Vec2): void {
    const deltaX = target.x - this.position.x;
    const deltaY = target.y - this.position.y;

    if (deltaX * deltaX + deltaY * deltaY > 1e-6) {
      this.facing = Math.atan2(deltaY, deltaX);
    }
  }

  private distanceTo(target: Vec2): number {
    return Math.hypot(
      target.x - this.position.x,
      target.y - this.position.y,
    );
  }
}

function lerpAngle(start: number, end: number, amount: number): number {
  const delta = Math.atan2(Math.sin(end - start), Math.cos(end - start));

  return start + delta * amount;
}
