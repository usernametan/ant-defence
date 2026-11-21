import type { GameState } from '../shared/types';

export interface Pose {
  x: number;
  y: number;
  angle: number;
}

const SNAP_DISTANCE_SQ = 64 * 64;

/** Shortest-arc angle interpolation in radians. */
export function lerpAngle(a: number, b: number, t: number): number {
  let diff = b - a;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return a + diff * t;
}

/**
 * Interpolate linearly between `prev` and `curr` by `alpha` (`0..1`),
 * snapping immediately to `curr` when `prev` is missing or moved `> snapDist` px.
 */
export function interpolatePose(
  prev: Pose | undefined,
  curr: Pose,
  alpha: number,
  snapDist = 64,
  out?: Pose,
): Pose {
  const target = out ?? { x: curr.x, y: curr.y, angle: curr.angle };
  if (!prev) {
    target.x = curr.x;
    target.y = curr.y;
    target.angle = curr.angle;
    return target;
  }

  const dx = curr.x - prev.x;
  const dy = curr.y - prev.y;
  const maxSq = snapDist === 64 ? SNAP_DISTANCE_SQ : snapDist * snapDist;
  if (dx * dx + dy * dy > maxSq || alpha >= 1) {
    target.x = curr.x;
    target.y = curr.y;
    target.angle = curr.angle;
    return target;
  }

  const t = alpha <= 0 ? 0 : alpha;
  target.x = prev.x + dx * t;
  target.y = prev.y + dy * t;
  target.angle = lerpAngle(prev.angle, curr.angle, t);
  return target;
}

/**
 * Render-side pose buffer capturing entity positions once per sim tick
 * so fixed 60 Hz steps render smoothly at 60/120/144+ Hz without mutating GameState.
 */
export class PoseHistory {
  private prev = new Map<string, Pose>();
  private curr = new Map<string, Pose>();
  private lastTick = -1;
  private lastTime = -1;

  clear(): void {
    this.prev.clear();
    this.curr.clear();
    this.lastTick = -1;
    this.lastTime = -1;
  }

  syncTick(state: Readonly<GameState>): void {
    if (state.tick === this.lastTick && state.time === this.lastTime) return;
    this.lastTick = state.tick;
    this.lastTime = state.time;

    const recycled = this.prev;
    this.prev = this.curr;
    this.curr = recycled;
    this.curr.clear();

    for (let i = 0; i < state.units.length; i += 1) {
      const u = state.units[i];
      if (!u.dead) {
        this.curr.set(u.id, { x: u.pos.x, y: u.pos.y, angle: u.angle });
      }
    }

    for (let i = 0; i < state.projectiles.length; i += 1) {
      const p = state.projectiles[i];
      this.curr.set(p.id, { x: p.pos.x, y: p.pos.y, angle: 0 });
    }

    const grenades = state.grenades;
    if (grenades) {
      for (let i = 0; i < grenades.length; i += 1) {
        const g = grenades[i];
        this.curr.set(g.id, { x: g.pos.x, y: g.pos.y, angle: 0 });
      }
    }

    const boss = state.hellcell?.boss;
    if (boss && boss.hp > 0) {
      this.curr.set(boss.id, { x: boss.pos.x, y: boss.pos.y, angle: boss.angle });
      const coaches = boss.trainState?.coaches;
      if (coaches) {
        for (let i = 0; i < coaches.length; i += 1) {
          const c = coaches[i];
          this.curr.set(`train-coach-${i}`, { x: c.pos.x, y: c.pos.y, angle: c.angle });
        }
      }
    }
  }

  resolve(id: string, x: number, y: number, angle: number, alpha: number, out?: Pose): Pose {
    const target = out ?? { x, y, angle };
    target.x = x;
    target.y = y;
    target.angle = angle;
    const prevPose = this.prev.get(id);
    if (!prevPose) return target;
    return interpolatePose(prevPose, { x, y, angle }, alpha, 64, target);
  }
}
