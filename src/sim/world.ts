import { WEAPON_DEFS } from '../shared/api';
import { bus } from '../shared/events';
import type {
  GameState,
  MapData,
  MatchConfig,
  Rarity,
  Team,
  Unit,
  Vec2,
  WeaponId,
} from '../shared/types';
import {
  COVER_HP,
  KILL_SCORE,
  PICKUP_LIFETIME,
  RESPAWN_DELAY_ENEMY,
  RESPAWN_DELAY_PLAYER,
  DROP_BETTER_CHANCE,
  UNIT_RADIUS,
} from './constants';
import { createUnitRuntime, type ProjectileMeta, type UnitRuntime } from './internal';
import { isPassable, tileCenter, tileKey, worldToTile } from './map';
import { SpatialGrid } from './physics';
import { Rng } from './rng';

const WEAPON_IDS: WeaponId[] = ['pistol', 'smg', 'shotgun', 'rifle', 'sniper', 'rocket'];
const RARITY_RANK: Record<Rarity, number> = { common: 0, rare: 1, epic: 2 };

/** Mutable simulation world. Public GameState is the only exposed projection. */
export class SimWorld {
  readonly state: GameState;
  readonly rng: Rng;
  readonly units = new Map<string, UnitRuntime>();
  readonly projectileMeta = new Map<string, ProjectileMeta>();
  readonly spatial = new SpatialGrid();
  mapVersion = 0;
  crateTimer = 18;
  readonly zoneContested = new Set<string>();
  readonly zoneOwner = new Map<string, Team | 'neutral'>();
  readonly baseDamageTimer: Record<Team, number> = { player: 0, enemy: 0 };
  readonly zoneScoreCarry: Record<string, number> = {};
  private idCounter = 0;

  constructor(config: MatchConfig, map: MapData) {
    this.rng = new Rng(config.seed ^ 0x9e3779b9);
    this.state = {
      tick: 0,
      time: 0,
      map,
      units: [],
      projectiles: [],
      pickups: [],
      zones: map.zones.map((zone) => ({
        id: zone.id,
        owner: 'neutral' as const,
        progress: 0,
        contested: false,
      })),
      score: { player: 0, enemy: 0 },
      baseHp: {
        player: map.bases.find((base) => base.team === 'player')?.coreHp ?? 1000,
        enemy: map.bases.find((base) => base.team === 'enemy')?.coreHp ?? 1000,
      },
      status: 'menu',
      playerId: 'player-1',
      matchConfig: { ...config },
    };
    for (const zone of this.state.zones) this.zoneOwner.set(zone.id, 'neutral');
  }

  nextId(prefix: string): string {
    this.idCounter += 1;
    return `${prefix}-${this.idCounter}`;
  }

  addUnit(unit: Unit): void {
    this.state.units.push(unit);
    this.units.set(unit.id, createUnitRuntime());
  }

  runtime(unit: Unit): UnitRuntime {
    const runtime = this.units.get(unit.id);
    if (!runtime) throw new Error(`Missing runtime for unit ${unit.id}`);
    return runtime;
  }

  unitById(id: string): Unit | undefined {
    return this.state.units.find((unit) => unit.id === id);
  }

  livingUnits(team?: Team): Unit[] {
    return this.state.units.filter(
      (unit) => !unit.dead && (team === undefined || unit.team === team),
    );
  }

  spawnPickup(pos: Vec2, weaponId: WeaponId, rarity?: Rarity): void {
    const pickup = {
      id: this.nextId('pickup'),
      pos: { x: pos.x, y: pos.y },
      weaponId,
      rarity: rarity ?? WEAPON_DEFS[weaponId].rarity,
      ttl: PICKUP_LIFETIME,
    };
    this.state.pickups.push(pickup);
    bus.emit('pickup:spawned', { pickup });
  }

  dropWeapon(unit: Unit): void {
    let weaponId = unit.weaponId;
    const rank = RARITY_RANK[WEAPON_DEFS[weaponId].rarity];
    if (this.rng.chance(DROP_BETTER_CHANCE)) {
      const better = WEAPON_IDS.filter(
        (id) => RARITY_RANK[WEAPON_DEFS[id].rarity] > rank,
      );
      if (better.length > 0) weaponId = this.rng.pick(better);
    }
    this.spawnPickup(unit.pos, weaponId);
  }

  damageCover(tile: { x: number; y: number }, amount: number): void {
    const key = tileKey(tile.x, tile.y);
    const previous = this.state.map.coverHp[key] ?? COVER_HP;
    if (previous <= 0) return;
    const hpLeft = Math.max(0, previous - amount);
    this.state.map.coverHp[key] = hpLeft;
    bus.emit('cover:damaged', { tile: key, hpLeft });
    if (hpLeft === 0) {
      this.mapVersion += 1;
      bus.emit('cover:destroyed', { tile: key });
    }
  }

  damageUnit(
    target: Unit,
    amount: number,
    attackerId: string,
    weaponId: WeaponId,
    pos: Vec2,
    knockback?: Vec2,
  ): void {
    if (target.dead || amount <= 0) return;
    const dealt = Math.min(target.hp, amount);
    target.hp -= amount;
    const runtime = this.runtime(target);
    runtime.lastDamageAt = this.state.time;
    if (knockback) {
      runtime.knockback.x += knockback.x;
      runtime.knockback.y += knockback.y;
    }
    const killed = target.hp <= 0;
    bus.emit('hit', { targetId: target.id, damage: dealt, pos, killed });
    if (killed) this.killUnit(target, attackerId, weaponId);
  }

  killUnit(victim: Unit, killerId: string, weaponId: WeaponId): void {
    if (victim.dead) return;
    victim.dead = true;
    victim.hp = 0;
    victim.vel.x = 0;
    victim.vel.y = 0;
    victim.reloading = false;
    victim.reloadProgress = 0;
    if (victim.isPlayer) {
      victim.respawnIn = RESPAWN_DELAY_PLAYER;
    } else {
      // Stagger enemy respawns so they return in small waves, not all at once.
      const deadEnemies = this.state.units.filter(
        (unit) => unit.team === 'enemy' && unit.dead,
      ).length;
      victim.respawnIn = RESPAWN_DELAY_ENEMY + deadEnemies * 0.4;
    }
    victim.deaths += 1;

    const killer = this.unitById(killerId);
    if (killer && killer.id !== victim.id) {
      killer.kills += 1;
      this.state.score[killer.team] += KILL_SCORE;
    }
    bus.emit('kill', { killerId, victimId: victim.id, weaponId });
    this.dropWeapon(victim);
  }

  findFreeSpot(center: Vec2, radiusTiles: number): Vec2 {
    const origin = worldToTile(center);
    for (let ring = 0; ring <= radiusTiles; ring += 1) {
      for (let dy = -ring; dy <= ring; dy += 1) {
        for (let dx = -ring; dx <= ring; dx += 1) {
          if (Math.max(Math.abs(dx), Math.abs(dy)) !== ring) continue;
          const x = origin.x + dx;
          const y = origin.y + dy;
          if (!isPassable(this.state.map, x, y)) continue;
          const candidate = tileCenter(x, y);
          const occupied = this.state.units.some(
            (unit) => !unit.dead && Math.hypot(unit.pos.x - candidate.x, unit.pos.y - candidate.y) < UNIT_RADIUS * 2.2,
          );
          if (!occupied) return candidate;
        }
      }
    }
    return { x: center.x, y: center.y };
  }

  respawnUnit(unit: Unit): void {
    let center: Vec2 | undefined;
    if (unit.isPlayer) {
      const owned = this.state.zones.filter((zone) => zone.owner === 'player');
      const candidates: Vec2[] = owned
        .map((zone) => this.state.map.zones.find((def) => def.id === zone.id)?.center)
        .filter((point): point is Vec2 => point !== undefined);
      const base = this.state.map.bases.find((b) => b.team === 'player');
      if (base) candidates.push(base.center);
      center = candidates.sort((a, b) =>
        Math.hypot(a.x - unit.pos.x, a.y - unit.pos.y) - Math.hypot(b.x - unit.pos.x, b.y - unit.pos.y),
      )[0];
    } else {
      center = this.state.map.bases.find((b) => b.team === 'enemy')?.center;
    }
    if (!center) center = this.state.map.bases[0].center;

    const spot = this.findFreeSpot(center, 5);
    const weapon = WEAPON_DEFS[unit.weaponId];
    unit.pos = spot;
    unit.vel.x = 0;
    unit.vel.y = 0;
    unit.dead = false;
    unit.hp = unit.maxHp;
    unit.respawnIn = 0;
    unit.reloading = false;
    unit.reloadProgress = 0;
    unit.ammoInMag = weapon.magSize;
    unit.reserveAmmo = weapon.magSize * 5;

    const runtime = this.runtime(unit);
    runtime.knockback.x = 0;
    runtime.knockback.y = 0;
    runtime.dashRemaining = 0;
    runtime.dashCooldown = 0;
    runtime.fireCooldown = 0;
    runtime.wasFiring = false;
    runtime.lastDamageAt = -100;
    bus.emit('unit:respawned', { unitId: unit.id });
  }
}
