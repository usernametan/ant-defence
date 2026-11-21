import { spawn } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { WEAPON_DEFS } from '../src/shared/api';
import { bus } from '../src/shared/events';
import type {
  GameState,
  InputState,
  KillSource,
  MapData,
  MatchConfig,
  MatchDifficulty,
  Team,
  Unit,
  Vec2,
  WeaponId,
} from '../src/shared/types';
import { createSim } from '../src/sim';
import { PathCache } from '../src/sim/ai/pathfinding';
import {
  BOT_AGGRO_RANGE,
  COVER_HP,
  FIXED_DT,
  MATCH_TIME_LIMIT,
  TILE_SIZE,
} from '../src/sim/constants';
import { isPassable, tileCenter, worldToTile } from '../src/sim/map';
import { hasLineOfSight, raycast } from '../src/sim/physics';
import { Rng } from '../src/sim/rng';

interface DifficultyProfile {
  reactionTime: number;
  aimError: number;
  aggression: number;
  aimSpeed: number;
  grenadeChance: number;
}

const DIFFICULTY_PROFILES: Record<MatchDifficulty, DifficultyProfile> = {
  easy: { reactionTime: 0.85, aimError: 0.28, aggression: 0.35, aimSpeed: 3.2, grenadeChance: 0.0012 },
  normal: { reactionTime: 0.45, aimError: 0.14, aggression: 0.58, aimSpeed: 5.5, grenadeChance: 0.0028 },
  hard: { reactionTime: 0.18, aimError: 0.05, aggression: 0.85, aimSpeed: 9.5, grenadeChance: 0.0048 },
};

const BOT_WEAPON_PREF: Record<WeaponId, number> = {
  pistol: 0,
  smg: 1,
  shotgun: 2,
  rifle: 2,
  sniper: 2,
  rocket: 2,
};

const IDEAL_RANGE: Record<WeaponId, number> = {
  pistol: 260,
  smg: 210,
  shotgun: 130,
  rifle: 420,
  sniper: 600,
  rocket: 360,
};

function distance(a: Vec2, b: Vec2): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function normalizeAngle(angle: number): number {
  let result = angle;
  while (result > Math.PI) result -= Math.PI * 2;
  while (result < -Math.PI) result += Math.PI * 2;
  return result;
}

/**
 * Deterministic Normal-AI bot controller driving the human player slot via SimApi.setInput().
 * Mirrors the decision tree in src/sim/ai/index.ts using only public GameState.
 */
class PlayerSlotBot {
  private readonly rng: Rng;
  private readonly profile: DifficultyProfile;
  private targetId: string | undefined;
  private lastSeenAt = -10;
  private reactionTimer = 0;
  private aimError = 0;
  private strafeSign = 1;
  private firePulse = 0;
  private mode: 'capture' | 'defend' | 'engage' | 'flank' | 'seekCover' | 'retreat' | 'pickupWeapon' = 'capture';
  private path: Vec2[] = [];
  private pathGoal = '';
  private pathVersion = -1;
  private repathTimer = 0;
  private readonly pathCache = new PathCache();
  private mapVersion = 0;
  private lastHp = -1;
  private lastDamageAt = -100;
  private currentAngle = 0;
  private initializedAngle = false;

  constructor(seed: number, difficulty: MatchDifficulty = 'normal') {
    this.rng = new Rng(seed ^ 0x517cc1b7);
    this.profile = DIFFICULTY_PROFILES[difficulty];
    if (this.rng.chance(0.5)) this.strafeSign = -1;
  }

  bumpMapVersion(): void {
    this.mapVersion += 1;
  }

  step(state: Readonly<GameState>, dt: number): InputState {
    const unit = state.units.find((u) => u.id === state.playerId);
    const empty: InputState = {
      moveX: 0,
      moveY: 0,
      aimX: unit ? unit.pos.x + 100 : 0,
      aimY: unit ? unit.pos.y : 0,
      firing: false,
      reload: false,
      interact: false,
      dash: false,
      throwGrenade: false,
    };
    if (!unit || unit.dead) {
      this.lastHp = unit ? unit.hp : -1;
      this.initializedAngle = false;
      return empty;
    }

    if (!this.initializedAngle) {
      this.currentAngle = unit.angle;
      this.initializedAngle = true;
    }
    if (this.lastHp >= 0 && unit.hp < this.lastHp) {
      this.lastDamageAt = state.time;
    }
    this.lastHp = unit.hp;

    this.firePulse += 1;
    if (this.reactionTimer > 0) this.reactionTimer = Math.max(0, this.reactionTimer - dt);

    // Ceasefire boss focus
    const boss = state.hellcell?.isCeasefireActive ? state.hellcell.boss : null;
    if (boss && boss.hp > 0) {
      const range = distance(unit.pos, boss.pos);
      const ideal = Math.min(310, Math.max(boss.radius + 115, IDEAL_RANGE[unit.weaponId] * 0.8));
      if (range > ideal * 1.18 || !hasLineOfSight(state.map, unit.pos, boss.pos)) {
        const move = this.computeMoveToward(state.map, unit, boss.pos, dt);
        empty.moveX = move.x;
        empty.moveY = move.y;
      } else {
        if (this.rng.chance(0.01)) this.strafeSign *= -1;
        const toBossX = (boss.pos.x - unit.pos.x) / Math.max(range, 1);
        const toBossY = (boss.pos.y - unit.pos.y) / Math.max(range, 1);
        let dirX = -toBossY * this.strafeSign;
        let dirY = toBossX * this.strafeSign;
        if (range < boss.radius + 95) {
          dirX -= toBossX;
          dirY -= toBossY;
        }
        const len = Math.hypot(dirX, dirY) || 1;
        empty.moveX = dirX / len;
        empty.moveY = dirY / len;
      }
      const aimAngle = Math.atan2(boss.pos.y - unit.pos.y, boss.pos.x - unit.pos.x) + this.aimError * 0.5;
      const turn = normalizeAngle(aimAngle - this.currentAngle);
      const maxTurn = this.profile.aimSpeed * dt;
      this.currentAngle += Math.max(-maxTurn, Math.min(maxTurn, turn));
      empty.aimX = unit.pos.x + Math.cos(this.currentAngle) * range;
      empty.aimY = unit.pos.y + Math.sin(this.currentAngle) * range;

      const def = WEAPON_DEFS[unit.weaponId];
      const aligned = Math.abs(normalizeAngle(aimAngle - this.currentAngle)) < 0.24;
      if (aligned && range <= def.range && this.firePulse % 48 < 36 && hasLineOfSight(state.map, unit.pos, boss.pos)) {
        empty.firing = def.automatic ? true : this.firePulse % 2 === 0;
      }
      if ((unit.grenades ?? 0) > 0 && aligned && range <= 460 && hasLineOfSight(state.map, unit.pos, boss.pos) && this.rng.chance(this.profile.grenadeChance)) {
        empty.throwGrenade = true;
      }
      if (unit.ammoInMag <= 0) empty.reload = true;
      return empty;
    }

    const target = this.findVisibleTarget(state, unit);
    const mode = this.chooseMode(state, unit, target);
    if (mode !== this.mode) {
      this.mode = mode;
      this.path = [];
      this.repathTimer = 0;
    }

    const move = this.advanceMode(state, unit, mode, target, dt);
    empty.moveX = move.x;
    empty.moveY = move.y;
    empty.interact = move.interact;

    if (target) {
      const baseAngle = Math.atan2(target.pos.y - unit.pos.y, target.pos.x - unit.pos.x);
      const aimAngle = baseAngle + this.aimError;
      const range = distance(unit.pos, target.pos);
      const turn = normalizeAngle(aimAngle - this.currentAngle);
      const maxTurn = this.profile.aimSpeed * dt;
      this.currentAngle += Math.max(-maxTurn, Math.min(maxTurn, turn));
      empty.aimX = unit.pos.x + Math.cos(this.currentAngle) * range;
      empty.aimY = unit.pos.y + Math.sin(this.currentAngle) * range;

      const def = WEAPON_DEFS[unit.weaponId];
      const aligned = Math.abs(normalizeAngle(aimAngle - this.currentAngle)) < 0.18;
      const inRange = range <= def.range * 0.95;
      if (this.reactionTimer <= 0 && aligned && inRange && this.firePulse % 50 < 32 && hasLineOfSight(state.map, unit.pos, target.pos)) {
        empty.firing = def.automatic ? true : this.firePulse % 2 === 0;
      }

      const hitCheck = raycast(state.map, unit.pos, target.pos);
      const canHitOrBlastCover = hitCheck === null || hitCheck.kind === 'cover';
      if ((unit.grenades ?? 0) > 0 && this.reactionTimer <= 0 && aligned && range >= 100 && range <= 470 && canHitOrBlastCover && this.rng.chance(this.profile.grenadeChance)) {
        empty.throwGrenade = true;
      }
    } else if (empty.moveX !== 0 || empty.moveY !== 0) {
      this.currentAngle = Math.atan2(empty.moveY, empty.moveX);
      empty.aimX = unit.pos.x + Math.cos(this.currentAngle) * 160;
      empty.aimY = unit.pos.y + Math.sin(this.currentAngle) * 160;
    }

    if (unit.ammoInMag <= 0) empty.reload = true;
    return empty;
  }

  private areHostile(state: Readonly<GameState>, a: Unit, b: Unit): boolean {
    if (a.id === b.id) return false;
    if (state.hellcell?.isCeasefireActive) return false;
    if (state.matchConfig.mode === 'rampage') return true;
    return a.team !== b.team;
  }

  private findVisibleTarget(state: Readonly<GameState>, unit: Unit): Unit | undefined {
    let best: Unit | undefined;
    let bestDistance = BOT_AGGRO_RANGE;
    for (const candidate of state.units) {
      if (candidate.dead || !this.areHostile(state, unit, candidate)) continue;
      const range = distance(unit.pos, candidate.pos);
      if (range >= bestDistance) continue;
      if (!hasLineOfSight(state.map, unit.pos, candidate.pos)) continue;
      best = candidate;
      bestDistance = range;
    }

    if (best) {
      if (this.targetId !== best.id) {
        this.targetId = best.id;
        this.reactionTimer = this.profile.reactionTime;
        this.aimError = this.rng.spread(this.profile.aimError);
      } else if (this.rng.chance(0.012)) {
        this.aimError = this.rng.spread(this.profile.aimError);
      }
      this.lastSeenAt = state.time;
      return best;
    }

    if (this.targetId && state.time - this.lastSeenAt < 1.5) {
      const remembered = state.units.find((u) => u.id === this.targetId);
      if (remembered && !remembered.dead && this.areHostile(state, unit, remembered)) return remembered;
    }
    return undefined;
  }

  private findBetterPickup(state: Readonly<GameState>, unit: Unit) {
    const currentPref = BOT_WEAPON_PREF[unit.weaponId];
    let best: (typeof state.pickups)[number] | undefined;
    let bestDistance = 420;
    for (const pickup of state.pickups) {
      if (pickup.kind === 'shield') continue;
      if (BOT_WEAPON_PREF[pickup.weaponId] <= currentPref) continue;
      const range = distance(unit.pos, pickup.pos);
      if (range < bestDistance) {
        bestDistance = range;
        best = pickup;
      }
    }
    return best;
  }

  private shouldDefend(state: Readonly<GameState>, unit: Unit): boolean {
    if (state.matchConfig.mode === 'rampage') return false;
    const base = state.map.bases.find((candidate) => candidate.team === unit.team);
    if (!base) return false;
    return state.units.some(
      (other) => !other.dead && other.team !== unit.team && distance(other.pos, base.center) < base.radius + 150,
    );
  }

  private chooseMode(state: Readonly<GameState>, unit: Unit, target: Unit | undefined) {
    const hpFraction = unit.hp / unit.maxHp;
    const recentlyHurt = state.time - this.lastDamageAt < 2;

    if (hpFraction < 0.28 && recentlyHurt) return 'retreat';
    if (hpFraction < 0.5 && recentlyHurt) return 'seekCover';
    if (unit.reloading) return 'seekCover';

    if (target) {
      if (this.mode === 'engage' || this.mode === 'flank' || this.mode === 'seekCover') {
        if (this.mode === 'engage' && this.rng.chance(0.006)) return 'flank';
        if (this.mode === 'flank' && this.rng.chance(0.01)) return 'engage';
        if (this.mode === 'seekCover' && hpFraction > 0.7 && this.rng.chance(0.01)) return 'engage';
        return this.mode;
      }
      return this.rng.chance(this.profile.aggression) ? 'engage' : 'seekCover';
    }

    if (this.findBetterPickup(state, unit)) return 'pickupWeapon';
    if (this.shouldDefend(state, unit)) return 'defend';
    return 'capture';
  }

  private captureGoal(state: Readonly<GameState>, unit: Unit): Vec2 {
    const map = state.map;
    if (state.matchConfig.mode === 'rampage') {
      let closest: Unit | undefined;
      let closestDist = Infinity;
      for (const candidate of state.units) {
        if (candidate.dead || !this.areHostile(state, unit, candidate)) continue;
        const d = distance(unit.pos, candidate.pos);
        if (d < closestDist) {
          closestDist = d;
          closest = candidate;
        }
      }
      if (closest) return closest.pos;
      return map.zones[1]?.center ?? map.zones[0]?.center ?? unit.pos;
    }

    let candidates = map.zones.filter((zone) =>
      state.zones.find((s) => s.id === zone.id)?.owner !== unit.team,
    );
    if (state.matchConfig.mode === 'hellcell' && state.hellcell && !state.hellcell.hasTriggered) {
      const outerUncaptured = map.zones.filter((zone) => {
        if (zone.id === 'zone-2' || zone.id === 'B') return false;
        const st = state.zones.find((s) => s.id === zone.id);
        return st !== undefined && st.owner === 'neutral';
      });
      if (outerUncaptured.length > 0) candidates = outerUncaptured;
      else {
        const outerContest = candidates.filter((z) => z.id !== 'zone-2' && z.id !== 'B');
        if (outerContest.length > 0) candidates = outerContest;
      }
    }
    if (candidates.length === 0) {
      const enemyBase = map.bases.find((base) => base.team !== unit.team);
      return enemyBase?.center ?? map.zones[0]?.center ?? unit.pos;
    }
    const ownedCount = map.zones.length - candidates.length;
    if (
      state.matchConfig.mode !== 'hellcell' &&
      ownedCount >= 2 &&
      (unit.id.endsWith('-1') || unit.id.endsWith('-3'))
    ) {
      const enemyBase = map.bases.find((base) => base.team !== unit.team);
      if (enemyBase) return enemyBase.center;
    }
    let best = candidates[0];
    let bestDistance = distance(unit.pos, best.center);
    for (const zone of candidates) {
      const range = distance(unit.pos, zone.center);
      if (range < bestDistance) {
        bestDistance = range;
        best = zone;
      }
    }
    return best.center;
  }

  private findCoverSpot(map: MapData, unit: Unit, threat: Vec2): Vec2 | undefined {
    const origin = worldToTile(unit.pos);
    let best: Vec2 | undefined;
    let bestDistance = 280;
    for (let dy = -8; dy <= 8; dy += 1) {
      for (let dx = -8; dx <= 8; dx += 1) {
        const x = origin.x + dx;
        const y = origin.y + dy;
        if (x < 0 || y < 0 || x >= map.width || y >= map.height) continue;
        const kind = map.tiles[y][x];
        if (kind !== 'lowCover' && kind !== 'wall') continue;
        if (kind === 'lowCover' && (map.coverHp[`${x},${y}`] ?? COVER_HP) <= 0) continue;
        const coverCenter = tileCenter(x, y);
        const awayX = coverCenter.x - threat.x;
        const awayY = coverCenter.y - threat.y;
        const length = Math.hypot(awayX, awayY);
        if (length < 1) continue;
        const hidden = worldToTile({
          x: coverCenter.x + (awayX / length) * TILE_SIZE * 1.7,
          y: coverCenter.y + (awayY / length) * TILE_SIZE * 1.7,
        });
        if (!isPassable(map, hidden.x, hidden.y)) continue;
        const spot = tileCenter(hidden.x, hidden.y);
        if (hasLineOfSight(map, threat, spot)) continue;
        const range = distance(unit.pos, spot);
        if (range < bestDistance) {
          bestDistance = range;
          best = spot;
        }
      }
    }
    return best;
  }

  private computeMoveToward(map: MapData, unit: Unit, goal: Vec2, dt: number): Vec2 {
    const goalTile = worldToTile(goal);
    const goalKey = `${goalTile.x},${goalTile.y}`;
    this.repathTimer -= dt;
    if (
      this.path.length === 0 ||
      this.pathGoal !== goalKey ||
      this.pathVersion !== this.mapVersion ||
      this.repathTimer <= 0
    ) {
      this.path = this.pathCache.get(map, worldToTile(unit.pos), goalTile, this.mapVersion).slice();
      this.pathGoal = goalKey;
      this.pathVersion = this.mapVersion;
      this.repathTimer = 0.6 + this.rng.next() * 0.4;
    }
    let waypoint = this.path[0] ?? goal;
    while (this.path.length > 1 && distance(unit.pos, waypoint) < 20) {
      this.path.shift();
      waypoint = this.path[0];
    }
    if (this.path.length === 1 && distance(unit.pos, waypoint) < 16) {
      this.path = [];
      waypoint = goal;
    }
    const dx = waypoint.x - unit.pos.x;
    const dy = waypoint.y - unit.pos.y;
    const range = Math.hypot(dx, dy);
    if (range < 8) return { x: 0, y: 0 };
    return { x: dx / range, y: dy / range };
  }

  private advanceMode(
    state: Readonly<GameState>,
    unit: Unit,
    mode: typeof this.mode,
    target: Unit | undefined,
    dt: number,
  ): { x: number; y: number; interact: boolean } {
    switch (mode) {
      case 'engage': {
        if (!target) return { x: 0, y: 0, interact: false };
        if (this.rng.chance(0.008)) this.strafeSign *= -1;
        const range = distance(unit.pos, target.pos);
        const ideal = IDEAL_RANGE[unit.weaponId];
        if (range > ideal * 1.25) {
          const m = this.computeMoveToward(state.map, unit, target.pos, dt);
          return { ...m, interact: false };
        }
        const toTargetX = (target.pos.x - unit.pos.x) / Math.max(range, 1);
        const toTargetY = (target.pos.y - unit.pos.y) / Math.max(range, 1);
        let dirX = -toTargetY * this.strafeSign;
        let dirY = toTargetX * this.strafeSign;
        if (range < ideal * 0.7) {
          dirX -= toTargetX;
          dirY -= toTargetY;
        }
        const len = Math.hypot(dirX, dirY) || 1;
        return { x: dirX / len, y: dirY / len, interact: false };
      }
      case 'flank': {
        if (!target) return { x: 0, y: 0, interact: false };
        const range = distance(unit.pos, target.pos);
        if (range < 160) {
          this.mode = 'engage';
          return { x: 0, y: 0, interact: false };
        }
        const side = this.strafeSign;
        const goal: Vec2 = {
          x: target.pos.x - ((target.pos.y - unit.pos.y) / Math.max(range, 1)) * 220 * side,
          y: target.pos.y + ((target.pos.x - unit.pos.x) / Math.max(range, 1)) * 220 * side,
        };
        const m = this.computeMoveToward(state.map, unit, goal, dt);
        return { ...m, interact: false };
      }
      case 'seekCover': {
        if (!target) {
          const base = state.map.bases.find((c) => c.team === unit.team);
          if (base) {
            const m = this.computeMoveToward(state.map, unit, base.center, dt);
            return { ...m, interact: false };
          }
          return { x: 0, y: 0, interact: false };
        }
        const spot = this.findCoverSpot(state.map, unit, target.pos);
        if (!spot) {
          const m = this.computeMoveToward(state.map, unit, target.pos, dt);
          return { ...m, interact: false };
        }
        const m = this.computeMoveToward(state.map, unit, spot, dt);
        return { ...m, interact: false };
      }
      case 'retreat': {
        const base = state.map.bases.find((c) => c.team === unit.team);
        if (base) {
          const m = this.computeMoveToward(state.map, unit, base.center, dt);
          return { ...m, interact: false };
        }
        return { x: 0, y: 0, interact: false };
      }
      case 'capture': {
        const m = this.computeMoveToward(state.map, unit, this.captureGoal(state, unit), dt);
        return { ...m, interact: false };
      }
      case 'defend': {
        const base = state.map.bases.find((c) => c.team === unit.team);
        if (base) {
          const m = this.computeMoveToward(state.map, unit, base.center, dt);
          return { ...m, interact: false };
        }
        return { x: 0, y: 0, interact: false };
      }
      case 'pickupWeapon': {
        const pickup = this.findBetterPickup(state, unit);
        if (pickup) {
          const m = this.computeMoveToward(state.map, unit, pickup.pos, dt);
          return { ...m, interact: distance(unit.pos, pickup.pos) < 40 };
        }
        return { x: 0, y: 0, interact: false };
      }
    }
  }
}

interface SingleMatchResult {
  seed: number;
  mirrored: boolean;
  winner: Team;
  endCondition: 'score' | 'core' | 'timer';
  duration: number;
  playerKills: number;
  enemyKills: number;
  hellcell?: {
    firstSpawnTime: number | null;
    bossCount: number;
    fightDurations: number[];
    majorityWinner: Team | null;
    stalled: boolean;
  };
}

function runSingleMatch(
  config: MatchConfig,
  mirrored: boolean,
  pickups: Record<WeaponId, number>,
  shots: Record<WeaponId, number>,
  killsByWeapon: Record<KillSource, number>,
): SingleMatchResult {
  const sim = createSim();
  const bot = new PlayerSlotBot(config.seed + (mirrored ? 7919 : 0), config.difficulty);

  let firstBossSpawnTime: number | null = null;
  let bossCount = 0;
  let currentBossStart: number | null = null;
  const fightDurations: number[] = [];
  let firstBossWinner: Team | null = null;

  const unsubCover = bus.on('cover:destroyed', () => {
    bot.bumpMapVersion();
  });
  const unsubPick = bus.on('pickup:collected', (ev) => {
    if (pickups[ev.weaponId] !== undefined) pickups[ev.weaponId] += 1;
  });
  const unsubShot = bus.on('shot', (ev) => {
    if (shots[ev.weaponId] !== undefined) shots[ev.weaponId] += 1;
  });
  const unsubKill = bus.on('kill', (ev) => {
    killsByWeapon[ev.weaponId] = (killsByWeapon[ev.weaponId] ?? 0) + 1;
  });
  const unsubHcStart = bus.on('hellcell:start', () => {
    const t = sim.getState().time;
    if (firstBossSpawnTime === null) firstBossSpawnTime = t;
    bossCount += 1;
    currentBossStart = t;
  });
  const unsubHcDefeat = bus.on('hellcell:defeated', (ev) => {
    if (currentBossStart !== null) {
      fightDurations.push(sim.getState().time - currentBossStart);
      currentBossStart = null;
    }
    if (firstBossWinner === null) firstBossWinner = ev.winner;
  });

  sim.start(config);

  if (mirrored) {
    const state = sim.getState() as GameState;
    const pBase = state.map.bases.find((b) => b.team === 'player');
    const eBase = state.map.bases.find((b) => b.team === 'enemy');
    if (pBase && eBase) {
      pBase.team = 'enemy';
      eBase.team = 'player';
      const pUnits = state.units.filter((u) => u.team === 'player');
      const eUnits = state.units.filter((u) => u.team === 'enemy');
      const pPos = pUnits.map((u) => ({ ...u.pos, angle: u.angle }));
      const ePos = eUnits.map((u) => ({ ...u.pos, angle: u.angle }));
      pUnits.forEach((u, idx) => {
        const src = ePos[idx % ePos.length];
        u.pos.x = src.x;
        u.pos.y = src.y;
        u.angle = src.angle;
      });
      eUnits.forEach((u, idx) => {
        const src = pPos[idx % pPos.length];
        u.pos.x = src.x;
        u.pos.y = src.y;
        u.angle = src.angle;
      });
    }
  }

  const maxSteps = Math.ceil((MATCH_TIME_LIMIT + 10) / FIXED_DT);
  for (let i = 0; i < maxSteps; i += 1) {
    const state = sim.getState();
    if (state.status !== 'playing') break;
    sim.setInput(bot.step(state, FIXED_DT));
    sim.step(FIXED_DT);
  }

  unsubCover();
  unsubPick();
  unsubShot();
  unsubKill();
  unsubHcStart();
  unsubHcDefeat();

  const finalState = sim.getState();
  const winner: Team = finalState.status === 'won' ? 'player' : 'enemy';

  let endCondition: 'score' | 'core' | 'timer' = 'timer';
  if (
    finalState.score.player >= config.scoreToWin ||
    finalState.score.enemy >= config.scoreToWin
  ) {
    endCondition = 'score';
  } else if (finalState.baseHp.player <= 0 || finalState.baseHp.enemy <= 0) {
    endCondition = 'core';
  }

  let playerKills = 0;
  let enemyKills = 0;
  for (const u of finalState.units) {
    if (u.team === 'player') playerKills += u.kills;
    else enemyKills += u.kills;
  }

  return {
    seed: config.seed,
    mirrored,
    winner,
    endCondition,
    duration: finalState.time,
    playerKills,
    enemyKills,
    ...(config.mode === 'hellcell'
      ? {
          hellcell: {
            firstSpawnTime: firstBossSpawnTime,
            bossCount,
            fightDurations,
            majorityWinner: firstBossWinner,
            stalled: Boolean(finalState.hellcell?.isCeasefireActive && finalState.status === 'playing'),
          },
        }
      : {}),
  };
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.floor((sorted.length - 1) * p)));
  return sorted[idx];
}

function summarizeGroup(
  label: string,
  matches: SingleMatchResult[],
  pickups: Record<WeaponId, number>,
  shots: Record<WeaponId, number>,
  killsByWeapon: Record<KillSource, number>,
) {
  const n = matches.length;
  const pWins = matches.filter((m) => m.winner === 'player').length;
  const eWins = n - pWins;
  const durations = matches.map((m) => m.duration).sort((a, b) => a - b);
  const totalKills = Object.values(killsByWeapon).reduce((a, b) => a + b, 0);

  const killShare: Record<string, { kills: number; sharePct: number }> = {};
  for (const [k, count] of Object.entries(killsByWeapon)) {
    killShare[k] = {
      kills: count,
      sharePct: totalKills > 0 ? Number(((count / totalKills) * 100).toFixed(2)) : 0,
    };
  }

  const endCounts = {
    score: matches.filter((m) => m.endCondition === 'score').length,
    core: matches.filter((m) => m.endCondition === 'core').length,
    timer: matches.filter((m) => m.endCondition === 'timer').length,
  };

  const base: Record<string, unknown> = {
    label,
    matches: n,
    winRate: {
      playerPct: Number(((pWins / n) * 100).toFixed(2)),
      enemyPct: Number(((eWins / n) * 100).toFixed(2)),
    },
    endConditions: {
      score: endCounts.score,
      scorePct: Number(((endCounts.score / n) * 100).toFixed(1)),
      core: endCounts.core,
      corePct: Number(((endCounts.core / n) * 100).toFixed(1)),
      timer: endCounts.timer,
      timerPct: Number(((endCounts.timer / n) * 100).toFixed(1)),
    },
    durationSeconds: {
      p10: Number(percentile(durations, 0.1).toFixed(2)),
      median: Number(percentile(durations, 0.5).toFixed(2)),
      p90: Number(percentile(durations, 0.9).toFixed(2)),
      mean: Number((durations.reduce((a, b) => a + b, 0) / n).toFixed(2)),
    },
    avgKillsPerTeam: {
      player: Number((matches.reduce((a, m) => a + m.playerKills, 0) / n).toFixed(2)),
      enemy: Number((matches.reduce((a, m) => a + m.enemyKills, 0) / n).toFixed(2)),
    },
    pickupsPerWeapon: pickups,
    shotsPerWeapon: shots,
    killSharePerWeapon: killShare,
  };

  const hcMatches = matches.filter((m) => m.hellcell !== undefined);
  if (hcMatches.length > 0) {
    const spawns = hcMatches
      .map((m) => m.hellcell!.firstSpawnTime)
      .filter((t): t is number => t !== null)
      .sort((a, b) => a - b);
    const allFights = hcMatches.flatMap((m) => m.hellcell!.fightDurations).sort((a, b) => a - b);
    const decided = hcMatches.filter(
      (m) => m.hellcell!.majorityWinner !== null && m.hellcell!.majorityWinner === m.winner,
    ).length;
    const withMajority = hcMatches.filter((m) => m.hellcell!.majorityWinner !== null).length;
    base.hellcell = {
      triggeredMatches: spawns.length,
      firstBossSpawnMedianSec: Number(percentile(spawns, 0.5).toFixed(2)),
      bossFightDurationMedianSec: Number(percentile(allFights, 0.5).toFixed(2)),
      bossFightDurationMeanSec:
        allFights.length > 0
          ? Number((allFights.reduce((a, b) => a + b, 0) / allFights.length).toFixed(2))
          : 0,
      avgBossSpawnCount: Number(
        (hcMatches.reduce((a, m) => a + m.hellcell!.bossCount, 0) / hcMatches.length).toFixed(2),
      ),
      rewardDecisivenessPct:
        withMajority > 0 ? Number(((decided / withMajority) * 100).toFixed(1)) : 0,
      stalls: hcMatches.filter((m) => m.hellcell!.stalled).length,
    };
  }

  return base;
}

interface SuiteSpec {
  id: string;
  label: string;
  kind: 'standard' | 'hellcell' | 'ladder';
  difficulty?: MatchDifficulty;
  higher?: MatchDifficulty;
  lower?: MatchDifficulty;
  seedsCount: number;
  mirrored: boolean;
}

interface WorkerPayload {
  id: string;
  results: SingleMatchResult[];
  pickups: Record<WeaponId, number>;
  shots: Record<WeaponId, number>;
  kills: Record<KillSource, number>;
}

const SUITE_SPECS: SuiteSpec[] = [
  { id: 'zc_easy', label: 'zoneControl_easy_mirrored', kind: 'standard', difficulty: 'easy', seedsCount: 50, mirrored: true },
  { id: 'zc_normal', label: 'zoneControl_normal_mirrored', kind: 'standard', difficulty: 'normal', seedsCount: 50, mirrored: true },
  { id: 'zc_hard', label: 'zoneControl_hard_mirrored', kind: 'standard', difficulty: 'hard', seedsCount: 50, mirrored: true },
  { id: 'hc_normal', label: 'hellcell_normal_45', kind: 'hellcell', difficulty: 'normal', seedsCount: 45, mirrored: false },
  { id: 'ladder_hn', label: 'ladder_hard_vs_normal_mirrored', kind: 'ladder', higher: 'hard', lower: 'normal', seedsCount: 50, mirrored: true },
  { id: 'ladder_ne', label: 'ladder_normal_vs_easy_mirrored', kind: 'ladder', higher: 'normal', lower: 'easy', seedsCount: 50, mirrored: true },
];

function emptyWeapons(): Record<WeaponId, number> {
  return { pistol: 0, smg: 0, shotgun: 0, rifle: 0, sniper: 0, rocket: 0 };
}

function emptyKills(): Record<KillSource, number> {
  return { pistol: 0, smg: 0, shotgun: 0, rifle: 0, sniper: 0, rocket: 0, grenade: 0, hazard: 0 };
}

function runWorkerChunk(spec: SuiteSpec, startIdx: number, endIdx: number): WorkerPayload {
  const pickups = emptyWeapons();
  const shots = emptyWeapons();
  const kills = emptyKills();
  const results: SingleMatchResult[] = [];

  for (let i = startIdx; i < endIdx; i += 1) {
    if (spec.kind === 'standard') {
      const seed = 10000 + i * 97;
      const cfg: MatchConfig = {
        seed,
        mode: 'zoneControl',
        difficulty: spec.difficulty!,
        scoreToWin: 600,
        enemyCount: 4,
        startingWeapon: 'pistol',
        mapTheme: 'fortress',
      };
      results.push(runSingleMatch(cfg, false, pickups, shots, kills));
      if (spec.mirrored) results.push(runSingleMatch(cfg, true, pickups, shots, kills));
    } else if (spec.kind === 'hellcell') {
      const seed = 60000 + i * 97;
      const cfg: MatchConfig = {
        seed,
        mode: 'hellcell',
        difficulty: 'normal',
        scoreToWin: 1000,
        enemyCount: 4,
        startingWeapon: 'pistol',
        mapTheme: 'fortress',
      };
      results.push(runSingleMatch(cfg, false, pickups, shots, kills));
    } else if (spec.kind === 'ladder') {
      const seed = 20000 + i * 101;
      results.push(
        runSingleMatch(
          {
            seed,
            mode: 'zoneControl',
            difficulty: spec.higher!,
            enemyDifficulty: spec.lower!,
            scoreToWin: 600,
            enemyCount: 4,
            startingWeapon: 'pistol',
            mapTheme: 'fortress',
          },
          false,
          pickups,
          shots,
          kills,
        ),
      );
      results.push(
        runSingleMatch(
          {
            seed,
            mode: 'zoneControl',
            difficulty: spec.lower!,
            enemyDifficulty: spec.higher!,
            scoreToWin: 600,
            enemyCount: 4,
            startingWeapon: 'pistol',
            mapTheme: 'fortress',
          },
          true,
          pickups,
          shots,
          kills,
        ),
      );
    }
  }

  return { id: spec.id, results, pickups, shots, kills };
}

function runWorkerTask(bundleFile: string, specId: string, start: number, end: number): Promise<WorkerPayload> {
  return new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      [bundleFile, '--worker', specId, String(start), String(end)],
      { stdio: ['ignore', 'pipe', 'pipe'] },
    );
    let out = '';
    let err = '';
    child.stdout.on('data', (d: Buffer) => {
      out += d.toString();
    });
    child.stderr.on('data', (d: Buffer) => {
      err += d.toString();
    });
    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`Worker ${specId}[${start}..${end}] exited ${code}: ${err}`));
        return;
      }
      resolve(JSON.parse(out.trim()) as WorkerPayload);
    });
  });
}

async function runParallel(): Promise<void> {
  const { buildSync } = await import('esbuild');
  const bundleFile = path.join(os.tmpdir(), `zc-balance-${process.pid}.mjs`);
  buildSync({
    entryPoints: [path.resolve(process.cwd(), 'scripts/balance-sim.ts')],
    bundle: true,
    platform: 'node',
    format: 'esm',
    outfile: bundleFile,
    external: ['esbuild'],
  });

  const tasks: Array<() => Promise<WorkerPayload>> = [];
  const chunkSize = 10;
  for (const spec of SUITE_SPECS) {
    for (let s = 0; s < spec.seedsCount; s += chunkSize) {
      const end = Math.min(spec.seedsCount, s + chunkSize);
      tasks.push(() => runWorkerTask(bundleFile, spec.id, s, end));
    }
  }

  const concurrency = Math.max(1, Math.min(os.cpus().length || 8, 12));
  const completed: WorkerPayload[] = new Array(tasks.length);
  let cursor = 0;
  async function workerLoop(): Promise<void> {
    while (cursor < tasks.length) {
      const idx = cursor;
      cursor += 1;
      completed[idx] = await tasks[idx]();
    }
  }
  await Promise.all(Array.from({ length: concurrency }, () => workerLoop()));
  try {
    fs.unlinkSync(bundleFile);
  } catch {
    // ignore cleanup failure
  }

  const suitesOut: Record<string, unknown>[] = [];
  const ladderOut: Record<string, unknown>[] = [];

  for (const spec of SUITE_SPECS) {
    const chunks = completed.filter((c) => c.id === spec.id);
    const allResults = chunks.flatMap((c) => c.results);
    const pickups = emptyWeapons();
    const shots = emptyWeapons();
    const kills = emptyKills();
    for (const c of chunks) {
      for (const k of Object.keys(pickups) as WeaponId[]) {
        pickups[k] += c.pickups[k];
        shots[k] += c.shots[k];
      }
      for (const k of Object.keys(kills) as KillSource[]) {
        kills[k] += c.kills[k];
      }
    }

    if (spec.kind === 'ladder') {
      let higherWins = 0;
      for (let i = 0; i < allResults.length; i += 2) {
        const resA = allResults[i];
        const resB = allResults[i + 1];
        if (resA?.winner === 'player') higherWins += 1;
        if (resB?.winner === 'enemy') higherWins += 1;
      }
      const total = allResults.length;
      ladderOut.push({
        label: spec.label,
        higher: spec.higher,
        lower: spec.lower,
        matches: total,
        higherWins,
        lowerWins: total - higherWins,
        higherWinRatePct: Number(((higherWins / Math.max(1, total)) * 100).toFixed(2)),
      });
    } else {
      suitesOut.push(summarizeGroup(spec.label, allResults, pickups, shots, kills));
    }
  }

  console.log(JSON.stringify({ suites: suitesOut, difficultyLadder: ladderOut }, null, 2));
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const workerIdx = args.indexOf('--worker');
  if (workerIdx !== -1) {
    const specId = args[workerIdx + 1];
    const start = Number(args[workerIdx + 2]);
    const end = Number(args[workerIdx + 3]);
    const spec = SUITE_SPECS.find((s) => s.id === specId);
    if (!spec) throw new Error(`Unknown spec: ${specId}`);
    const payload = runWorkerChunk(spec, start, end);
    process.stdout.write(JSON.stringify(payload));
    return;
  }
  await runParallel();
}

void main();
