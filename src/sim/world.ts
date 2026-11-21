import { GRENADE_DEF, WEAPON_DEFS } from '../shared/api';
import { PathCache } from './ai/pathfinding';
import { bus } from '../shared/events';
import type {
  GameState,
  KillSource,
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
  DASH_COOLDOWN,
  KILL_SCORE,
  MATCH_TIME_LIMIT,
  PICKUP_LIFETIME,
  RAMPAGE_RESPAWN_DELAY_BOT,
  RAMPAGE_RESPAWN_DELAY_PLAYER,
  RAMPAGE_TIME_LIMIT,
  RESPAWN_DELAY_ENEMY,
  RESPAWN_DELAY_PLAYER,
  DROP_BETTER_CHANCE,
  UNIT_RADIUS,
} from './constants';
import { createUnitRuntime, type ProjectileMeta, type UnitRuntime } from './internal';
import { createInitialHellcellState } from './hellcell';
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
  readonly pathCache = new PathCache();
  mapVersion = 0;
  crateTimer = 18;
  readonly zoneContested = new Set<string>();
  readonly zoneOwner = new Map<string, Team | 'neutral'>();
  readonly baseDamageTimer: Record<Team, number> = { player: 0, enemy: 0 };
  readonly zoneScoreCarry: Record<string, number> = {};
  private idCounter = 0;

  constructor(config: MatchConfig, map: MapData) {
    this.rng = new Rng(config.seed ^ 0x9e3779b9);
    const isRampage = config.mode === 'rampage';
    this.state = {
      tick: 0,
      time: 0,
      timeLimit: isRampage ? RAMPAGE_TIME_LIMIT : MATCH_TIME_LIMIT,
      map,
      units: [],
      projectiles: [],
      grenades: [],
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
      ...(config.mode === 'hellcell'
        ? { hellcell: createInitialHellcellState(this.rng) }
        : {}),
      matchConfig: { ...config },
    };
    for (const zone of this.state.zones) this.zoneOwner.set(zone.id, 'neutral');
  }

  isRampage(): boolean {
    return this.state.matchConfig.mode === 'rampage';
  }

  isHellcell(): boolean {
    return this.state.matchConfig.mode === 'hellcell';
  }

  isCeasefireActive(): boolean {
    return Boolean(this.state.hellcell?.isCeasefireActive);
  }

  areHostile(a: { id: string; team: Team }, b: { id: string; team: Team }): boolean {
    if (a.id === b.id) return false;
    if (this.isCeasefireActive()) return false;
    return this.isRampage() ? true : a.team !== b.team;
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
      kind: 'weapon' as const,
    };
    this.state.pickups.push(pickup);
    bus.emit('pickup:spawned', { pickup });
  }

  spawnShieldPickup(pos: Vec2, shieldAmount = 50): void {
    const pickup = {
      id: this.nextId('pickup'),
      pos: { x: pos.x, y: pos.y },
      weaponId: 'pistol' as WeaponId,
      rarity: 'rare' as Rarity,
      ttl: PICKUP_LIFETIME,
      kind: 'shield' as const,
      shieldAmount,
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
    weaponId: KillSource,
    pos: Vec2,
    knockback?: Vec2,
  ): void {
    if (target.dead || amount <= 0) return;
    // Zero PvP damage during Hellcell Ceasefire; only the Boss & environmental hazards hurt units
    if (this.isCeasefireActive() && attackerId !== 'hellcell-boss') return;

    let remaining = amount;
    if (target.shield !== undefined && target.shield > 0) {
      const absorbed = Math.min(target.shield, remaining);
      target.shield -= absorbed;
      remaining -= absorbed;
    }

    const dealt = Math.min(target.hp, remaining);
    target.hp -= remaining;
    const runtime = this.runtime(target);
    runtime.lastDamageAt = this.state.time;
    if (knockback) {
      runtime.knockback.x += knockback.x;
      runtime.knockback.y += knockback.y;
    }
    const killed = target.hp <= 0;
    bus.emit('hit', { targetId: target.id, damage: Math.max(1, dealt), pos, killed });
    if (killed) this.killUnit(target, attackerId, weaponId);
  }

  killUnit(victim: Unit, killerId: string, weaponId: KillSource): void {
    if (victim.dead) return;
    victim.dead = true;
    victim.hp = 0;
    victim.vel.x = 0;
    victim.vel.y = 0;
    victim.reloading = false;
    victim.reloadProgress = 0;
    if (this.isRampage()) {
      victim.respawnIn = victim.isPlayer
        ? RAMPAGE_RESPAWN_DELAY_PLAYER
        : RAMPAGE_RESPAWN_DELAY_BOT;
    } else if (victim.isPlayer) {
      victim.respawnIn = RESPAWN_DELAY_PLAYER;
    } else {
      // Stagger bot respawns per team so teammates return in small waves, not all at once.
      const deadTeammates = this.state.units.filter(
        (unit) => unit.team === victim.team && unit.dead,
      ).length;
      victim.respawnIn = RESPAWN_DELAY_ENEMY + deadTeammates * 0.4;
    }
    victim.deaths += 1;

    const killer = this.unitById(killerId);
    if (killer && killer.id !== victim.id) {
      killer.kills += 1;
      if (!killer.dead) {
        const weaponDef = WEAPON_DEFS[killer.weaponId];
        killer.reserveAmmo = Math.min(
          weaponDef.magSize * 6,
          killer.reserveAmmo + weaponDef.magSize,
        );
      }
      if (this.isRampage()) {
        const playerUnit = this.unitById(this.state.playerId);
        const topBotKills = this.state.units.reduce(
          (max, u) => (u.isPlayer ? max : Math.max(max, u.kills)),
          0,
        );
        this.state.score.player = playerUnit?.kills ?? 0;
        this.state.score.enemy = topBotKills;
      } else {
        const killPts =
          this.isHellcell() && this.state.matchConfig.scoreToWin >= 500
            ? 8
            : KILL_SCORE;
        this.state.score[killer.team] += killPts;
      }
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

  findRampageSpawnSpot(): Vec2 {
    const map = this.state.map;
    const anchors: Vec2[] = [
      ...map.bases.map((b) => b.center),
      ...map.zones.map((z) => z.center),
      ...map.crateSpawns,
    ];
    if (anchors.length === 0) {
      return { x: (map.width * map.tileSize) / 2, y: (map.height * map.tileSize) / 2 };
    }
    const living = this.livingUnits();
    let bestAnchor = anchors[this.rng.int(0, anchors.length - 1)];
    let bestMinDist = -1;
    for (const anchor of anchors) {
      let minDist = Infinity;
      for (const u of living) {
        const d = Math.hypot(u.pos.x - anchor.x, u.pos.y - anchor.y);
        if (d < minDist) minDist = d;
      }
      // Small jitter so identical distances still distribute cleanly.
      const score = (living.length === 0 ? 0 : minDist) + this.rng.next() * 24;
      if (score > bestMinDist) {
        bestMinDist = score;
        bestAnchor = anchor;
      }
    }
    return this.findFreeSpot(bestAnchor, 5);
  }

  respawnUnit(unit: Unit): void {
    let spot: Vec2;
    if (this.isRampage()) {
      spot = this.findRampageSpawnSpot();
    } else {
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
        center = this.state.map.bases.find((b) => b.team === unit.team)?.center;
      }
      if (!center) center = this.state.map.bases[0].center;
      spot = this.findFreeSpot(center, 5);
    }

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
    unit.grenades = GRENADE_DEF.defaultCount;
    unit.dashCooldown = 0;
    unit.dashMaxCooldown = DASH_COOLDOWN;
    unit.grenadeCooldown = 0;
    unit.grenadeMaxCooldown = GRENADE_DEF.cooldown;

    const runtime = this.runtime(unit);
    runtime.knockback.x = 0;
    runtime.knockback.y = 0;
    runtime.dashRemaining = 0;
    runtime.dashCooldown = 0;
    runtime.fireCooldown = 0;
    runtime.wasFiring = false;
    runtime.grenadeCooldown = 0;
    runtime.wasThrowingGrenade = false;
    runtime.lastDamageAt = -100;
    bus.emit('unit:respawned', { unitId: unit.id });
  }
}
