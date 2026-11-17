import type { InputState, Team, Vec2 } from '../shared/types';

/** Finer AI states than the shared display-only AiState union. */
export type AiMode =
  | 'capture'
  | 'engage'
  | 'seekCover'
  | 'flank'
  | 'defend'
  | 'pickupWeapon'
  | 'retreat';

export interface AiRuntime {
  mode: AiMode;
  targetId: string | null;
  path: Vec2[];
  pathGoal: string;
  pathVersion: number;
  repathTimer: number;
  reactionTimer: number;
  strafeSign: number;
  aimError: number;
  lastSeenAt: number;
  firePulse: number;
}

export interface UnitRuntime {
  intent: InputState;
  fireCooldown: number;
  wasFiring: boolean;
  reloadRemaining: number;
  dashCooldown: number;
  dashRemaining: number;
  dashDir: Vec2;
  knockback: Vec2;
  lastDamageAt: number;
  ai: AiRuntime;
}

export interface ProjectileMeta {
  initialLife: number;
}

export function createInput(): InputState {
  return {
    moveX: 0,
    moveY: 0,
    aimX: 0,
    aimY: 0,
    firing: false,
    reload: false,
    interact: false,
    swapWeapon: false,
    dash: false,
  };
}

export function createUnitRuntime(): UnitRuntime {
  return {
    intent: createInput(),
    fireCooldown: 0,
    wasFiring: false,
    reloadRemaining: 0,
    dashCooldown: 0,
    dashRemaining: 0,
    dashDir: { x: 0, y: 0 },
    knockback: { x: 0, y: 0 },
    lastDamageAt: -100,
    ai: {
      mode: 'capture',
      targetId: null,
      path: [],
      pathGoal: '',
      pathVersion: -1,
      repathTimer: 0,
      reactionTimer: 0,
      strafeSign: 1,
      aimError: 0,
      lastSeenAt: -100,
      firePulse: 0,
    },
  };
}

/** Map shared AiState display values onto internal modes. */
export function toDisplayState(mode: AiMode): 'idle' | 'advance' | 'engage' | 'takeCover' | 'reload' | 'seekPickup' | 'retreat' {
  switch (mode) {
    case 'capture': return 'advance';
    case 'engage': return 'engage';
    case 'seekCover': return 'takeCover';
    case 'flank': return 'advance';
    case 'defend': return 'idle';
    case 'pickupWeapon': return 'seekPickup';
    case 'retreat': return 'retreat';
  }
}

export type TeamScore = Record<Team, number>;
