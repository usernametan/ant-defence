import type { Vec2 } from "../core/types";

export type Team = "player" | "hostile" | "neutral";

export interface DamageContext {
  sourceId?: string;
  weaponId?: string;
  direction: Vec2;
}

export interface DamageResult {
  applied: number;
  killed: boolean;
  remainingHealth: number;
}

export interface Damageable {
  readonly id: string;
  readonly team: Team;
  readonly radius: number;
  readonly x: number;
  readonly y: number;
  readonly health: number;
  readonly maxHealth: number;
  readonly alive: boolean;
  takeDamage(amount: number, context: DamageContext): DamageResult;
}

export function applyDamage(
  target: Damageable,
  amount: number,
  context: DamageContext,
): DamageResult {
  if (!target.alive || !Number.isFinite(amount) || amount <= 0) {
    return {
      applied: 0,
      killed: false,
      remainingHealth: target.health,
    };
  }

  return target.takeDamage(amount, context);
}
