import type { CreatureBehaviorKind } from "../content/creatures";
import type { Vec2 } from "../core/types";

export type CreatureMovementState = "idle" | "chase" | "strafe" | "retreat";

export interface BrainContext {
  position: Vec2;
  target: Vec2;
  distance: number;
  time: number;
  phase: number;
  allyCount: number;
  attackRange: number;
  preferredRange: number;
}

export interface BrainDecision {
  move: Vec2;
  state: CreatureMovementState;
  speedScale: number;
}

export interface Brain {
  readonly kind: CreatureBehaviorKind;
  decide(context: BrainContext): BrainDecision;
}

export const IDLE_DECISION: BrainDecision = {
  move: { x: 0, y: 0 },
  state: "idle",
  speedScale: 0,
};

export function normalizeMove(x: number, y: number): Vec2 {
  const length = Math.hypot(x, y);

  if (length < 1e-6) {
    return { x: 0, y: 0 };
  }

  return {
    x: x / length,
    y: y / length,
  };
}

export function directionTo(context: BrainContext): Vec2 {
  return normalizeMove(
    context.target.x - context.position.x,
    context.target.y - context.position.y,
  );
}
