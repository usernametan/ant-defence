import { GRENADE_DEF, WEAPON_DEFS } from '../../shared/api';
import { bus } from '../../shared/events';
import type { KillSource, Team, Unit, Vec2, WeaponId } from '../../shared/types';
import {
  CRATE_SPAWN_INTERVAL,
  GRENADE_RADIUS,
  INTERACT_RADIUS,
  PICKUP_PICKUP_RADIUS,
  TILE_SIZE,
  UNIT_RADIUS,
} from '../constants';
import { worldToTile } from '../map';
import { damageHellcellBoss } from '../hellcell';
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

export function throwGrenade(world: SimWorld, unit: Unit): boolean {
  const count = unit.grenades ?? 0;
  const runtime = world.runtime(unit);
  if (unit.dead || count <= 0 || runtime.grenadeCooldown > 0) return false;

  unit.grenades = count - 1;
  runtime.grenadeCooldown = GRENADE_DEF.cooldown;

  const direction: Vec2 = { x: Math.cos(unit.angle), y: Math.sin(unit.angle) };
  const grenade = {
    id: world.nextId('gren'),
    ownerId: unit.id,
    team: unit.team,
    pos: {
      x: unit.pos.x + direction.x * (UNIT_RADIUS + 6),
      y: unit.pos.y + direction.y * (UNIT_RADIUS + 6),
    },
    vel: {
      x: direction.x * GRENADE_DEF.speed,
      y: direction.y * GRENADE_DEF.speed,
    },
    fuse: GRENADE_DEF.fuseTime,
    maxFuse: GRENADE_DEF.fuseTime,
    damage: GRENADE_DEF.damage,
    splashRadius: GRENADE_DEF.splashRadius,
  };
  if (!world.state.grenades) world.state.grenades = [];
  world.state.grenades.push(grenade);
  bus.emit('grenade:thrown', {
    unitId: unit.id,
    pos: { x: unit.pos.x, y: unit.pos.y },
    angle: unit.angle,
  });
  return true;
}

export function updateWeapons(world: SimWorld, dt: number): void {
  for (const unit of world.state.units) {
    if (unit.dead) continue;
    const def = WEAPON_DEFS[unit.weaponId];
    const runtime = world.runtime(unit);
    runtime.fireCooldown = Math.max(0, runtime.fireCooldown - dt);
    runtime.grenadeCooldown = Math.max(0, runtime.grenadeCooldown - dt);

    const wantsGrenade = Boolean(runtime.intent.throwGrenade);
    if (wantsGrenade && !runtime.wasThrowingGrenade) {
      throwGrenade(world, unit);
    }
    runtime.wasThrowingGrenade = wantsGrenade;

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

function sweepBossHit(
  from: Vec2,
  to: Vec2,
  radius: number,
  boss: { pos: Vec2; radius: number } | null | undefined,
  maxDist: number,
): Vec2 | null {
  if (!boss) return null;
  const total = Math.hypot(to.x - from.x, to.y - from.y);
  const steps = Math.max(1, Math.ceil(total / 6));
  for (let step = 1; step <= steps; step += 1) {
    const t = step / steps;
    const dist = total * t;
    if (dist > maxDist) return null;
    const point: Vec2 = {
      x: from.x + (to.x - from.x) * t,
      y: from.y + (to.y - from.y) * t,
    };
    if (Math.hypot(point.x - boss.pos.x, point.y - boss.pos.y) <= boss.radius + radius) {
      return point;
    }
  }
  return null;
}

export function explode(
  world: SimWorld,
  pos: Vec2,
  radius: number,
  damage: number,
  team: Team,
  ownerId: string,
  excludeId?: string,
  weaponSource: KillSource = 'rocket',
): void {
  bus.emit('explosion', { pos: { x: pos.x, y: pos.y }, radius });

  if (world.isCeasefireActive()) {
    const boss = world.state.hellcell?.boss;
    if (boss && boss.hp > 0) {
      const dist = Math.hypot(boss.pos.x - pos.x, boss.pos.y - pos.y);
      const effDist = Math.max(0, dist - boss.radius);
      if (effDist <= radius) {
        const falloff = 1 - effDist / radius;
        damageHellcellBoss(world, damage * (0.45 + 0.55 * falloff), team, pos);
      }
    }
  } else {
    const attacker = { id: ownerId, team };
    for (const unit of world.livingUnits()) {
      if (unit.id === excludeId || !world.areHostile(attacker, unit)) continue;
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
        weaponSource,
        { x: unit.pos.x, y: unit.pos.y },
        knockback,
      );
    }
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

export function updateGrenades(world: SimWorld, dt: number): void {
  const grenades = world.state.grenades;
  if (!grenades || grenades.length === 0) return;

  const freeForAll = world.isRampage();
  const ceasefire = world.isCeasefireActive();
  const boss = world.state.hellcell?.boss;

  for (let index = grenades.length - 1; index >= 0; index -= 1) {
    const grenade = grenades[index];
    const from = grenade.pos;
    const to: Vec2 = {
      x: from.x + grenade.vel.x * dt,
      y: from.y + grenade.vel.y * dt,
    };
    const victimTeam: Team = grenade.team === 'player' ? 'enemy' : 'player';
    const midpoint = { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 };
    const candidates = ceasefire
      ? []
      : world.spatial.query(
          midpoint,
          Math.hypot(to.x - from.x, to.y - from.y) / 2 + UNIT_RADIUS + 14,
        );
    const hit = sweepProjectile(
      world.state.map,
      from,
      to,
      GRENADE_RADIUS,
      candidates,
      victimTeam,
      grenade.ownerId,
      freeForAll,
    );
    const bossHitPos = ceasefire
      ? sweepBossHit(from, to, GRENADE_RADIUS, boss, hit ? hit.distance : Infinity)
      : null;

    grenade.fuse -= dt;
    if (bossHitPos || hit || grenade.fuse <= 0) {
      const detonatePos = bossHitPos ?? (hit ? hit.pos : to);
      if (bossHitPos) {
        damageHellcellBoss(world, grenade.damage * 0.5, grenade.team, bossHitPos);
      } else if (hit?.kind === 'cover' && hit.tile) {
        world.damageCover(hit.tile, grenade.damage * 0.6);
      } else if (hit?.kind === 'unit' && hit.unitId) {
        const directTarget = world.unitById(hit.unitId);
        if (directTarget) {
          world.damageUnit(directTarget, grenade.damage, grenade.ownerId, 'grenade', hit.pos);
        }
      }
      explode(
        world,
        detonatePos,
        grenade.splashRadius,
        grenade.damage,
        grenade.team,
        grenade.ownerId,
        hit?.kind === 'unit' ? hit.unitId : undefined,
        'grenade',
      );
      grenades.splice(index, 1);
    } else {
      grenade.pos = to;
    }
  }
}

export function updateProjectiles(world: SimWorld, dt: number): void {
  const projectiles = world.state.projectiles;
  const freeForAll = world.isRampage();
  const ceasefire = world.isCeasefireActive();
  const boss = world.state.hellcell?.boss;

  for (let index = projectiles.length - 1; index >= 0; index -= 1) {
    const projectile = projectiles[index];
    const from = projectile.pos;
    const to: Vec2 = {
      x: from.x + projectile.vel.x * dt,
      y: from.y + projectile.vel.y * dt,
    };
    const victimTeam: Team = projectile.team === 'player' ? 'enemy' : 'player';
    const midpoint = { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 };
    const queryUnits = world.spatial.query(
      midpoint,
      Math.hypot(to.x - from.x, to.y - from.y) / 2 + UNIT_RADIUS + 12,
    );
    const candidates = ceasefire ? [] : queryUnits;
    const hit = sweepProjectile(
      world.state.map,
      from,
      to,
      PROJECTILE_RADIUS,
      candidates,
      victimTeam,
      projectile.ownerId,
      freeForAll,
    );

    if (ceasefire) {
      for (const u of queryUnits) {
        if (u.dead || u.id === projectile.ownerId || u.team === projectile.team) continue;
        if (Math.hypot(to.x - u.pos.x, to.y - u.pos.y) <= UNIT_RADIUS + PROJECTILE_RADIUS + 2) {
          bus.emit('ceasefire:spark', { pos: { x: to.x, y: to.y } });
          break;
        }
      }
    }

    const bossHitPos = ceasefire
      ? sweepBossHit(from, to, PROJECTILE_RADIUS, boss, hit ? hit.distance : Infinity)
      : null;

    const meta = world.projectileMeta.get(projectile.id);
    const initialLife = meta?.initialLife ?? projectile.life;
    const travelledFraction = clamp01(1 - projectile.life / initialLife);
    const damage = projectile.damage * (1 - 0.45 * travelledFraction);

    let consumed = false;
    if (bossHitPos) {
      damageHellcellBoss(world, damage, projectile.team, bossHitPos);
      if (projectile.splashRadius > 0) {
        explode(
          world,
          bossHitPos,
          projectile.splashRadius,
          projectile.damage,
          projectile.team,
          projectile.ownerId,
        );
      }
      consumed = true;
    } else if (hit) {
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
  if (pickup.kind === 'shield') {
    const add = pickup.shieldAmount ?? 50;
    unit.maxShield = 50;
    unit.shield = Math.min(50, (unit.shield ?? 0) + add);
    bus.emit('pickup:collected', { unitId: unit.id, weaponId: unit.weaponId });
    world.state.pickups.splice(index, 1);
    return;
  }
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
    const wantsWeaponSwap =
      !unit.isPlayer ||
      world.runtime(unit).intent.interact ||
      world.runtime(unit).intent.swapWeapon;
    for (let index = world.state.pickups.length - 1; index >= 0; index -= 1) {
      const pickup = world.state.pickups[index];
      if (Math.hypot(unit.pos.x - pickup.pos.x, unit.pos.y - pickup.pos.y) > radius) continue;
      if (pickup.kind !== 'shield' && !wantsWeaponSwap) continue;
      collectPickup(world, unit, index);
      break;
    }
  }
}

