import type { CreatureBehaviorKind } from "../content/creatures";
import {
  directionTo,
  normalizeMove,
  type Brain,
  type BrainContext,
  type BrainDecision,
} from "./Brain";

const chaserBrain: Brain = {
  kind: "chaser",
  decide(context) {
    if (context.distance <= context.attackRange * 0.8) {
      return {
        move: { x: 0, y: 0 },
        state: "chase",
        speedScale: 0,
      };
    }

    return {
      move: directionTo(context),
      state: "chase",
      speedScale: 1 + Math.min(4, context.allyCount) * 0.035,
    };
  },
};

const straferBrain: Brain = {
  kind: "strafer",
  decide(context) {
    if (context.distance > context.preferredRange + 120) {
      return {
        move: directionTo(context),
        state: "chase",
        speedScale: 1,
      };
    }

    if (context.distance < context.preferredRange - 62) {
      return {
        move: directionTo(context).x === 0 && directionTo(context).y === 0
          ? { x: 0, y: 0 }
          : { x: -directionTo(context).x, y: -directionTo(context).y },
        state: "retreat",
        speedScale: 0.92,
      };
    }

    const radial = directionTo(context);
    const orbitSign =
      Math.sin(context.time * 0.9 + context.phase * Math.PI * 2) >= 0 ? 1 : -1;
    const tangent = {
      x: -radial.y * orbitSign,
      y: radial.x * orbitSign,
    };
    const radialCorrection = clamp(
      (context.distance - context.preferredRange) / 120,
      -0.55,
      0.55,
    );

    return {
      move: normalizeMove(
        tangent.x + radial.x * radialCorrection,
        tangent.y + radial.y * radialCorrection,
      ),
      state: "strafe",
      speedScale: 0.7,
    };
  },
};

const rangedBrain: Brain = {
  kind: "ranged",
  decide(context) {
    const radial = directionTo(context);

    if (context.distance < context.preferredRange - 70) {
      return {
        move: { x: -radial.x, y: -radial.y },
        state: "retreat",
        speedScale: 0.95,
      };
    }

    if (context.distance > context.preferredRange + 95) {
      return {
        move: radial,
        state: "chase",
        speedScale: 0.88,
      };
    }

    const orbitSign =
      Math.sin(context.time * 0.55 + context.phase * Math.PI * 2) >= 0 ? 1 : -1;

    return {
      move: normalizeMove(
        -radial.y * orbitSign + radial.x * 0.08,
        radial.x * orbitSign + radial.y * 0.08,
      ),
      state: "strafe",
      speedScale: 0.34,
    };
  },
};

export const CREATURE_BRAINS: Record<CreatureBehaviorKind, Brain> = {
  chaser: chaserBrain,
  strafer: straferBrain,
  ranged: rangedBrain,
};

export function decideMovement(
  kind: CreatureBehaviorKind,
  context: BrainContext,
): BrainDecision {
  return CREATURE_BRAINS[kind].decide(context);
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
