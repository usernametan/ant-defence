import type { Unit } from '../shared/types';
import {
  BOT_MAX_SPEED,
  DASH_COOLDOWN,
  DASH_DURATION,
  DASH_SPEED,
  HELLCELL_UNIT_SPEED_MULT,
  REGEN_DELAY,
  REGEN_RATE,
  UNIT_ACCEL,
  UNIT_FRICTION,
  UNIT_MAX_SPEED,
  UNIT_RADIUS,
} from './constants';
import { moveCircle } from './physics';
import type { SimWorld } from './world';

/** Per-tick unit motion, aim, regeneration, and respawn timers. */
export function updateUnits(world: SimWorld, dt: number): void {
  for (const unit of world.state.units) {
    if (unit.dead) {
      unit.respawnIn -= dt;
      if (unit.respawnIn <= 0) world.respawnUnit(unit);
      continue;
    }

    const runtime = world.runtime(unit);
    runtime.dashCooldown = Math.max(0, runtime.dashCooldown - dt);

    let moveX = runtime.intent.moveX;
    let moveY = runtime.intent.moveY;
    const magnitude = Math.hypot(moveX, moveY);
    if (magnitude > 1) {
      moveX /= magnitude;
      moveY /= magnitude;
    }

    if (runtime.intent.dash && runtime.dashCooldown <= 0 && runtime.dashRemaining <= 0) {
      runtime.dashRemaining = DASH_DURATION;
      runtime.dashCooldown = DASH_COOLDOWN;
      if (magnitude > 0.01) {
        runtime.dashDir = { x: moveX / magnitude, y: moveY / magnitude };
      } else {
        runtime.dashDir = { x: Math.cos(unit.angle), y: Math.sin(unit.angle) };
      }
    }

    const hellcellMult = world.isHellcell() ? HELLCELL_UNIT_SPEED_MULT : 1;
    if (runtime.dashRemaining > 0) {
      runtime.dashRemaining -= dt;
      const dashSpeed = (unit.isPlayer ? DASH_SPEED : DASH_SPEED * 0.8) * hellcellMult;
      unit.vel.x = runtime.dashDir.x * dashSpeed;
      unit.vel.y = runtime.dashDir.y * dashSpeed;
    } else {
      const maxSpeed = (unit.isPlayer ? UNIT_MAX_SPEED : BOT_MAX_SPEED) * hellcellMult;
      unit.vel.x += moveX * UNIT_ACCEL * hellcellMult * dt;
      unit.vel.y += moveY * UNIT_ACCEL * hellcellMult * dt;
      const decay = Math.exp(-UNIT_FRICTION * dt);
      unit.vel.x *= decay;
      unit.vel.y *= decay;
      const speed = Math.hypot(unit.vel.x, unit.vel.y);
      if (speed > maxSpeed) {
        unit.vel.x = (unit.vel.x / speed) * maxSpeed;
        unit.vel.y = (unit.vel.y / speed) * maxSpeed;
      }
    }

    unit.vel.x += runtime.knockback.x;
    unit.vel.y += runtime.knockback.y;
    const knockDecay = Math.exp(-9 * dt);
    runtime.knockback.x *= knockDecay;
    runtime.knockback.y *= knockDecay;

    const before = { x: unit.pos.x, y: unit.pos.y };
    const moved = moveCircle(
      world.state.map,
      before,
      UNIT_RADIUS,
      { x: unit.vel.x * dt, y: unit.vel.y * dt },
    );
    unit.pos = moved;
    if (Math.abs(moved.x - before.x) < Math.abs(unit.vel.x * dt) * 0.5) unit.vel.x = 0;
    if (Math.abs(moved.y - before.y) < Math.abs(unit.vel.y * dt) * 0.5) unit.vel.y = 0;

    if (unit.isPlayer) {
      const dx = runtime.intent.aimX - unit.pos.x;
      const dy = runtime.intent.aimY - unit.pos.y;
      if (Math.hypot(dx, dy) > 1) unit.angle = Math.atan2(dy, dx);
    }

    if (
      unit.hp < unit.maxHp &&
      world.state.time - runtime.lastDamageAt >= REGEN_DELAY
    ) {
      unit.hp = Math.min(unit.maxHp, unit.hp + REGEN_RATE * dt);
    }
  }
}

/** Rebuild the spatial index from current living unit positions. */
export function rebuildSpatial(world: SimWorld): void {
  world.spatial.clear();
  for (const unit of world.state.units) world.spatial.insert(unit);
}

/** Find the closest living enemy within a radius, used by AI perception. */
export function nearestEnemy(world: SimWorld, unit: Unit, radius: number): Unit | undefined {
  let best: Unit | undefined;
  let bestDistance = radius;
  for (const candidate of world.livingUnits()) {
    if (!world.areHostile(unit, candidate)) continue;
    const distance = Math.hypot(candidate.pos.x - unit.pos.x, candidate.pos.y - unit.pos.y);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = candidate;
    }
  }
  return best;
}
