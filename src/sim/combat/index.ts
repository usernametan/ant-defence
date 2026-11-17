import { WEAPON_DEFS } from '../../shared/api';
import { bus } from '../../shared/events';
import type { Team, Unit, Vec2, WeaponId } from '../../shared/types';
import {
  CRATE_SPAWN_INTERVAL,
  INTERACT_RADIUS,
  PICKUP_PICKUP_RADIUS,
  TILE_SIZE,
  UNIT_RADIUS,
} from '../constants';
import { worldToTile } from '../map';
import { sweepProjectile } from '../physics';
import type { SimWorld } from '../world';

const CRATE_WEAPONS: WeaponId[] = ['shotgun', 'rifle', 'sniper', 'rocket'];
const PROJECTILE_RADIUS = 4;
const KNOCKBACK_FORCE = 340;

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

export function startReload(world: SimWorld, unit: Unit): void {
  const def = WEAPON_DEFS[unit.weaponId];
  if (unit.reloading || unit.reserveAmmo <= 0 || unit.ammoInMag >= def.magSize) return;
  unit.reloading = true;
  unit.reloadProgress = 0;
  world.runtime(unit).reloadRemaining = def.reloadTime;
  bus.emit('reload:start');
}

function finishReload(world: SimWorld, unit: Unit): void {
  const def = WEAPON_DEFS[unit.weaponId];
  const needed = def.magSize - unit.ammoInMag;
  const loaded = Math.min(needed, unit.reserveAmmo);
  unit.ammoInMag += loaded;
  unit.reserveAmmo -= loaded;
  unit.reloading = false;
  unit.reloadProgress = 1;
  world.runtime(unit).reloadRemaining = 0;
  bus.emit('reload:end');
}

export function fireWeapon(world: SimWorld, unit: Unit): void {
  const def = WEAPON_DEFS[unit.weaponId];
  if (unit.ammoInMag <= 0) return;
  unit.ammoInMag -= 1;
  world.runtime(unit).fireCooldown = 1 / def.fireRate;

  for (let pellet = 0; pellet < def.pellets; pellet += 1) {
    const angle = unit.angle + world.rng.spread(def.spread);
    const direction: Vec2 = { x: Math.cos(angle), y: Math.sin(angle) };
    const life = def.range / def.projectileSpeed;
    const projectile = {
      id: world.nextId('proj'),
      team: unit.team,
      pos: {
        x: unit.pos.x + direction.x * (UNIT_RADIUS + 5),
        y: unit.pos.y + direction.y * (UNIT_RADIUS + 5),
      },
      vel: {
        x: direction.x * def.projectileSpeed,
        y: direction.y * def.projectileSpeed,
      },
      weaponId: unit.weaponId,
      ownerId: unit.id,
      life,
      damage: def.damage,
      splashRadius: def.splashRadius,
    };
    world.state.projectiles.push(projectile);
    world.projectileMeta.set(projectile.id, { initialLife: life });
  }
  bus.emit('shot', {
    unitId: unit.id,
    weaponId: unit.weaponId,
    pos: { x: unit.pos.x, y: unit.pos.y },
    angle: unit.angle,
  });
}

export function updateWeapons(world: SimWorld, dt: number): void {
  for (const unit of world.state.units) {
    if (unit.dead) continue;
    const def = WEAPON_DEFS[unit.weaponId];
    const runtime = world.runtime(unit);
    runtime.fireCooldown = Math.max(0, runtime.fireCooldown - dt);

    if (unit.reloading) {
      runtime.reloadRemaining -= dt;
      unit.reloadProgress = clamp01(1 - runtime.reloadRemaining / def.reloadTime);
      if (runtime.reloadRemaining <= 0) finishReload(world, unit);
    }

    const wantsFire = runtime.intent.firing;
    if (runtime.intent.reload && !unit.reloading) startReload(world, unit);

    const trigger = def.automatic ? wantsFire : wantsFire && !runtime.wasFiring;
    if (trigger && !unit.reloading && runtime.fireCooldown <= 0 && unit.ammoInMag > 0) {
      fireWeapon(world, unit);
    }
    if (unit.ammoInMag <= 0 && wantsFire && !unit.reloading) startReload(world, unit);
    runtime.wasFiring = wantsFire;
  }
}

export function explode(
  world: SimWorld,
  pos: Vec2,
  radius: number,
  damage: number,
  team: Team,
  ownerId: string,
  excludeId?: string,
): void {
  bus.emit('explosion', { pos: { x: pos.x, y: pos.y }, radius });

  for (const unit of world.livingUnits()) {
    if (unit.id === excludeId || unit.team === team) continue;
    const distance = Math.hypot(unit.pos.x - pos.x, unit.pos.y - pos.y);
    if (distance > radius) continue;
    const falloff = 1 - distance / radius;
    const knockbackMagnitude = KNOCKBACK_FORCE * falloff;
    const inv = distance > 1e-4 ? 1 / distance : 0;
    const knockback: Vec2 = {
      x: (unit.pos.x - pos.x) * inv * knockbackMagnitude,
      y: (unit.pos.y - pos.y) * inv * knockbackMagnitude,
    };
    world.damageUnit(
      unit,
      damage * (0.35 + 0.65 * falloff),
      ownerId,
      'rocket',
      { x: unit.pos.x, y: unit.pos.y },
      knockback,
    );
  }

  const tile = worldToTile(pos);
  const span = Math.ceil(radius / TILE_SIZE);
  for (let y = tile.y - span; y <= tile.y + span; y += 1) {
    for (let x = tile.x - span; x <= tile.x + span; x += 1) {
      if (x < 0 || y < 0 || x >= world.state.map.width || y >= world.state.map.height) continue;
      if (world.state.map.tiles[y][x] !== 'lowCover') continue;
      const centre = { x: x * TILE_SIZE + TILE_SIZE / 2, y: y * TILE_SIZE + TILE_SIZE / 2 };
      const distance = Math.hypot(centre.x - pos.x, centre.y - pos.y);
      if (distance > radius) continue;
      world.damageCover({ x, y }, damage * (1 - distance / radius) * 0.8);
    }
  }
}

export function updateProjectiles(world: SimWorld, dt: number): void {
  const projectiles = world.state.projectiles;
  for (let index = projectiles.length - 1; index >= 0; index -= 1) {
    const projectile = projectiles[index];
    const from = projectile.pos;
    const to: Vec2 = {
      x: from.x + projectile.vel.x * dt,
      y: from.y + projectile.vel.y * dt,
    };
    const victimTeam: Team = projectile.team === 'player' ? 'enemy' : 'player';
    const midpoint = { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 };
    const candidates = world.spatial.query(midpoint, Math.hypot(to.x - from.x, to.y - from.y) / 2 + UNIT_RADIUS + 12);
    const hit = sweepProjectile(
      world.state.map,
      from,
      to,
      PROJECTILE_RADIUS,
      candidates,
      victimTeam,
      projectile.ownerId,
    );

    const meta = world.projectileMeta.get(projectile.id);
    const initialLife = meta?.initialLife ?? projectile.life;
    const travelledFraction = clamp01(1 - projectile.life / initialLife);
    const damage = projectile.damage * (1 - 0.45 * travelledFraction);

    let consumed = false;
    if (hit) {
      if (hit.kind === 'cover' && hit.tile) {
        world.damageCover(hit.tile, damage);
      }
      if (hit.kind === 'unit' && hit.unitId) {
        const target = world.unitById(hit.unitId);
        if (target) {
          world.damageUnit(target, damage, projectile.ownerId, projectile.weaponId, hit.pos);
        }
      }
      if (projectile.splashRadius > 0) {
        explode(
          world,
          hit.pos,
          projectile.splashRadius,
          projectile.damage,
          projectile.team,
          projectile.ownerId,
          hit.kind === 'unit' ? hit.unitId : undefined,
        );
      }
      consumed = true;
    } else {
      projectile.pos = to;
      projectile.life -= dt;
      if (projectile.life <= 0) consumed = true;
    }

    if (consumed) {
      world.projectileMeta.delete(projectile.id);
      projectiles.splice(index, 1);
    }
  }
}

function collectPickup(world: SimWorld, unit: Unit, index: number): void {
  const pickup = world.state.pickups[index];
  const def = WEAPON_DEFS[pickup.weaponId];
  const isSameWeapon = pickup.weaponId === unit.weaponId;

  if (!isSameWeapon) {
    world.spawnPickup(unit.pos, unit.weaponId, WEAPON_DEFS[unit.weaponId].rarity);
    unit.weaponId = pickup.weaponId;
    unit.ammoInMag = def.magSize;
    unit.reserveAmmo = def.magSize * 5;
  } else {
    unit.reserveAmmo += def.magSize * 2;
  }
  unit.reloading = false;
  unit.reloadProgress = 0;
  const runtime = world.runtime(unit);
  runtime.fireCooldown = Math.min(runtime.fireCooldown, 0.15);
  runtime.wasFiring = true;

  bus.emit('pickup:collected', { unitId: unit.id, weaponId: pickup.weaponId });
  world.state.pickups.splice(index, 1);
}

export function updatePickups(world: SimWorld, dt: number): void {
  world.crateTimer -= dt;
  if (world.crateTimer <= 0) {
    world.crateTimer = CRATE_SPAWN_INTERVAL;
    const spawns = world.state.map.crateSpawns;
    if (spawns.length > 0) {
      const pos = spawns[world.rng.int(0, spawns.length - 1)];
      world.spawnPickup(pos, world.rng.pick(CRATE_WEAPONS));
    }
  }

  for (let index = world.state.pickups.length - 1; index >= 0; index -= 1) {
    world.state.pickups[index].ttl -= dt;
    if (world.state.pickups[index].ttl <= 0) world.state.pickups.splice(index, 1);
  }

  for (const unit of world.livingUnits()) {
    const radius = unit.isPlayer ? INTERACT_RADIUS : PICKUP_PICKUP_RADIUS;
    if (unit.isPlayer && !world.runtime(unit).intent.interact && !world.runtime(unit).intent.swapWeapon) continue;
    for (let index = world.state.pickups.length - 1; index >= 0; index -= 1) {
      const pickup = world.state.pickups[index];
      if (Math.hypot(unit.pos.x - pickup.pos.x, unit.pos.y - pickup.pos.y) > radius) continue;
      collectPickup(world, unit, index);
      break;
    }
  }
}

