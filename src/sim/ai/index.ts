import { WEAPON_DEFS } from '../../shared/api';
import type { MapData, MatchConfig, MatchDifficulty, Team, Unit, Vec2, WeaponId } from '../../shared/types';
import {
  BOT_AGGRO_RANGE,
  BOT_MAX_HP,
  TILE_SIZE,
} from '../constants';
import { toDisplayState, type AiMode } from '../internal';
import { isPassable, tileCenter, worldToTile } from '../map';
import { hasLineOfSight } from '../physics';
import type { SimWorld } from '../world';

interface DifficultyProfile {
  reactionTime: number;
  aimError: number;
  aggression: number;
  aimSpeed: number;
}

const DIFFICULTY: Record<MatchDifficulty, DifficultyProfile> = {
  easy: { reactionTime: 0.78, aimError: 0.26, aggression: 0.35, aimSpeed: 3.4 },
  normal: { reactionTime: 0.48, aimError: 0.15, aggression: 0.58, aimSpeed: 5.2 },
  hard: { reactionTime: 0.24, aimError: 0.075, aggression: 0.82, aimSpeed: 8.5 },
};

const RARITY_RANK = { common: 0, rare: 1, epic: 2 };

/** Approached distance for each weapon, used by engage strafing. */
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

/** Nearest enemy the bot can actually see, with short-lived memory after LoS loss. */
function findVisibleTarget(
  world: SimWorld,
  unit: Unit,
  profile: DifficultyProfile,
): Unit | undefined {
  let best: Unit | undefined;
  let bestDistance = BOT_AGGRO_RANGE;
  for (const candidate of world.livingUnits()) {
    if (candidate.team === unit.team) continue;
    const range = distance(unit.pos, candidate.pos);
    if (range >= bestDistance) continue;
    if (!hasLineOfSight(world.state.map, unit.pos, candidate.pos)) continue;
    best = candidate;
    bestDistance = range;
  }

  const ai = world.runtime(unit).ai;
  if (best) {
    if (ai.targetId !== best.id) {
      ai.targetId = best.id;
      ai.reactionTimer = profile.reactionTime;
      ai.aimError = world.rng.spread(profile.aimError);
    } else if (world.rng.chance(0.012)) {
      ai.aimError = world.rng.spread(profile.aimError);
    }
    ai.lastSeenAt = world.state.time;
    return best;
  }

  if (ai.targetId && world.state.time - ai.lastSeenAt < 1.5) {
    const remembered = world.unitById(ai.targetId);
    if (remembered && !remembered.dead) return remembered;
  }
  return undefined;
}

function findBetterPickup(world: SimWorld, unit: Unit) {
  const currentRank = RARITY_RANK[WEAPON_DEFS[unit.weaponId].rarity];
  let best: (typeof world.state.pickups)[number] | undefined;
  let bestDistance = 420;
  for (const pickup of world.state.pickups) {
    if (RARITY_RANK[pickup.rarity] <= currentRank) continue;
    const range = distance(unit.pos, pickup.pos);
    if (range < bestDistance) {
      bestDistance = range;
      best = pickup;
    }
  }
  return best;
}

function shouldDefend(world: SimWorld, unit: Unit): boolean {
  const base = world.state.map.bases.find((candidate) => candidate.team === unit.team);
  if (!base) return false;
  return world.livingUnits().some(
    (other) => other.team !== unit.team && distance(other.pos, base.center) < base.radius + 150,
  );
}

function captureGoal(world: SimWorld, unit: Unit): Vec2 {
  const map = world.state.map;
  const candidates = map.zones.filter((zone) =>
    world.state.zones.find((state) => state.id === zone.id)?.owner !== unit.team,
  );
  if (candidates.length === 0) {
    const enemyBase = map.bases.find((base) => base.team !== unit.team);
    return enemyBase?.center ?? map.zones[0]?.center ?? unit.pos;
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

/** Find a passable point behind nearby cover that breaks the threat's line of sight. */
function findCoverSpot(world: SimWorld, unit: Unit, threat: Vec2): Vec2 | undefined {
  const map: MapData = world.state.map;
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

function chooseMode(
  world: SimWorld,
  unit: Unit,
  target: Unit | undefined,
  profile: DifficultyProfile,
): AiMode {
  const ai = world.runtime(unit).ai;
  const hpFraction = unit.hp / unit.maxHp;
  const recentlyHurt = world.state.time - world.runtime(unit).lastDamageAt < 2;

  if (hpFraction < 0.28 && recentlyHurt) return 'retreat';
  if (hpFraction < 0.5 && recentlyHurt) return 'seekCover';
  if (unit.reloading) return 'seekCover';

  if (target) {
    if (ai.mode === 'engage' || ai.mode === 'flank' || ai.mode === 'seekCover') {
      if (ai.mode === 'engage' && world.rng.chance(0.006)) return 'flank';
      if (ai.mode === 'flank' && world.rng.chance(0.01)) return 'engage';
      if (ai.mode === 'seekCover' && hpFraction > 0.7 && world.rng.chance(0.01)) return 'engage';
      return ai.mode;
    }
    return world.rng.chance(profile.aggression) ? 'engage' : 'seekCover';
  }

  if (findBetterPickup(world, unit)) return 'pickupWeapon';
  if (shouldDefend(world, unit)) return 'defend';
  return 'capture';
}

function steer(unit: Unit, point: Vec2): Vec2 {
  const dx = point.x - unit.pos.x;
  const dy = point.y - unit.pos.y;
  const range = Math.hypot(dx, dy);
  if (range < 8) return { x: 0, y: 0 };
  return { x: dx / range, y: dy / range };
}

/** Follow a cached A* route toward a world-space goal. */
function moveToward(world: SimWorld, unit: Unit, goal: Vec2, dt: number): void {
  const runtime = world.runtime(unit);
  const ai = runtime.ai;
  const goalTile = worldToTile(goal);
  const goalKey = `${goalTile.x},${goalTile.y}`;
  ai.repathTimer -= dt;

  if (
    ai.path.length === 0 ||
    ai.pathGoal !== goalKey ||
    ai.pathVersion !== world.mapVersion ||
    ai.repathTimer <= 0
  ) {
    ai.path = world.pathCache
      .get(world.state.map, worldToTile(unit.pos), goalTile, world.mapVersion)
      .slice();
    ai.pathGoal = goalKey;
    ai.pathVersion = world.mapVersion;
    ai.repathTimer = 0.6 + world.rng.next() * 0.4;
  }

  let waypoint = ai.path[0] ?? goal;
  while (ai.path.length > 1 && distance(unit.pos, waypoint) < 20) {
    ai.path.shift();
    waypoint = ai.path[0];
  }
  if (ai.path.length === 1 && distance(unit.pos, waypoint) < 16) {
    ai.path = [];
    waypoint = goal;
  }

  const direction = steer(unit, waypoint);
  runtime.intent.moveX = direction.x;
  runtime.intent.moveY = direction.y;
}

function engage(world: SimWorld, unit: Unit, target: Unit, dt: number): void {
  const ai = world.runtime(unit).ai;
  if (world.rng.chance(0.008)) ai.strafeSign *= -1;
  const range = distance(unit.pos, target.pos);
  const ideal = IDEAL_RANGE[unit.weaponId];
  const intent = world.runtime(unit).intent;

  if (range > ideal * 1.25) {
    moveToward(world, unit, target.pos, dt);
    return;
  }

  const toTargetX = (target.pos.x - unit.pos.x) / Math.max(range, 1);
  const toTargetY = (target.pos.y - unit.pos.y) / Math.max(range, 1);
  let dirX = -toTargetY * ai.strafeSign;
  let dirY = toTargetX * ai.strafeSign;
  if (range < ideal * 0.7) {
    dirX -= toTargetX;
    dirY -= toTargetY;
  }
  const length = Math.hypot(dirX, dirY) || 1;
  intent.moveX = dirX / length;
  intent.moveY = dirY / length;
}

function flank(world: SimWorld, unit: Unit, target: Unit, dt: number): void {
  const ai = world.runtime(unit).ai;
  const range = distance(unit.pos, target.pos);
  const side = ai.strafeSign;
  const goal: Vec2 = {
    x: target.pos.x - (target.pos.y - unit.pos.y) / Math.max(range, 1) * 220 * side,
    y: target.pos.y + (target.pos.x - unit.pos.x) / Math.max(range, 1) * 220 * side,
  };
  if (range < 160) {
    ai.mode = 'engage';
    return;
  }
  moveToward(world, unit, goal, dt);
}

function seekCover(world: SimWorld, unit: Unit, target: Unit | undefined, dt: number): void {
  if (!target) {
    const base = world.state.map.bases.find((candidate) => candidate.team === unit.team);
    if (base) moveToward(world, unit, base.center, dt);
    return;
  }
  const spot = findCoverSpot(world, unit, target.pos);
  if (!spot) {
    engage(world, unit, target, dt);
    return;
  }
  moveToward(world, unit, spot, dt);
}

function advanceMode(
  world: SimWorld,
  unit: Unit,
  mode: AiMode,
  target: Unit | undefined,
  dt: number,
): void {
  const intent = world.runtime(unit).intent;
  switch (mode) {
    case 'engage':
      if (target) engage(world, unit, target, dt);
      break;
    case 'flank':
      if (target) flank(world, unit, target, dt);
      break;
    case 'seekCover':
      seekCover(world, unit, target, dt);
      break;
    case 'retreat': {
      const base = world.state.map.bases.find((candidate) => candidate.team === unit.team);
      if (base) moveToward(world, unit, base.center, dt);
      break;
    }
    case 'capture':
      moveToward(world, unit, captureGoal(world, unit), dt);
      break;
    case 'defend': {
      const base = world.state.map.bases.find((candidate) => candidate.team === unit.team);
      if (base) moveToward(world, unit, base.center, dt);
      break;
    }
    case 'pickupWeapon': {
      const pickup = findBetterPickup(world, unit);
      if (pickup) {
        moveToward(world, unit, pickup.pos, dt);
        if (distance(unit.pos, pickup.pos) < 40) intent.interact = true;
      }
      break;
    }
  }
}

/** Update every bot's intent for one fixed step. Player intent is untouched. */
export function updateAi(world: SimWorld, dt: number): void {
  const profile = DIFFICULTY[world.state.matchConfig.difficulty];
  for (const unit of world.state.units) {
    if (unit.isPlayer || unit.dead) continue;
    updateBot(world, unit, profile, dt);
  }
}

function updateBot(world: SimWorld, unit: Unit, profile: DifficultyProfile, dt: number): void {
  const runtime = world.runtime(unit);
  const ai = runtime.ai;
  const intent = runtime.intent;

  intent.moveX = 0;
  intent.moveY = 0;
  intent.firing = false;
  intent.reload = false;
  intent.dash = false;
  intent.interact = false;
  intent.swapWeapon = false;

  const target = findVisibleTarget(world, unit, profile);
  ai.firePulse += 1;
  if (ai.reactionTimer > 0) ai.reactionTimer = Math.max(0, ai.reactionTimer - dt);

  const mode = chooseMode(world, unit, target, profile);
  if (mode !== ai.mode) {
    ai.mode = mode;
    ai.path = [];
    ai.repathTimer = 0;
  }
  unit.aiState = toDisplayState(mode);

  advanceMode(world, unit, mode, target, dt);

  if (target) {
    const baseAngle = Math.atan2(target.pos.y - unit.pos.y, target.pos.x - unit.pos.x);
    const aimAngle = baseAngle + ai.aimError;
    const range = distance(unit.pos, target.pos);
    intent.aimX = unit.pos.x + Math.cos(aimAngle) * range;
    intent.aimY = unit.pos.y + Math.sin(aimAngle) * range;

    const turn = normalizeAngle(aimAngle - unit.angle);
    const maxTurn = profile.aimSpeed * dt;
    unit.angle += Math.max(-maxTurn, Math.min(maxTurn, turn));

    const def = WEAPON_DEFS[unit.weaponId];
    const aligned = Math.abs(normalizeAngle(aimAngle - unit.angle)) < 0.18;
    const inRange = range <= def.range * 0.95;
    if (
      ai.reactionTimer <= 0 &&
      aligned &&
      inRange &&
      ai.firePulse % 50 < 32 &&
      hasLineOfSight(world.state.map, unit.pos, target.pos)
    ) {
      // Pulse the trigger in tactical bursts so semi-auto and automatic weapons pace cleanly.
      intent.firing = ai.firePulse % 2 === 0;
    }
  }

  if (unit.ammoInMag <= 0) intent.reload = true;
  if (
    world.state.matchConfig.difficulty !== 'easy' &&
    (mode === 'retreat' || mode === 'engage' || mode === 'flank') &&
    runtime.dashCooldown <= 0 &&
    world.rng.chance(0.004)
  ) {
    intent.dash = true;
  }
}

/** Spawn enemy bots plus allied bots (floor(enemyCount / 2)) at their bases. */
export function spawnBots(world: SimWorld, config: MatchConfig): void {
  const enemyCount = Math.max(0, Math.floor(config.enemyCount));
  const allyCount = Math.floor(enemyCount / 2);
  for (let index = 0; index < enemyCount; index += 1) {
    spawnBot(world, `enemy-${index + 1}`, 'enemy', config.startingWeapon);
  }
  for (let index = 0; index < allyCount; index += 1) {
    spawnBot(world, `ally-${index + 1}`, 'player', config.startingWeapon);
  }
}

function spawnBot(world: SimWorld, id: string, team: Team, weaponId: WeaponId): void {
  const base = world.state.map.bases.find((candidate) => candidate.team === team);
  const pos = base ? world.findFreeSpot(base.center, 5) : { x: 320, y: 320 };
  const def = WEAPON_DEFS[weaponId];
  const unit: Unit = {
    id,
    team,
    pos: { x: pos.x, y: pos.y },
    vel: { x: 0, y: 0 },
    angle: team === 'player' ? 0 : Math.PI,
    hp: BOT_MAX_HP,
    maxHp: BOT_MAX_HP,
    weaponId,
    ammoInMag: def.magSize,
    reserveAmmo: def.magSize * 5,
    reloading: false,
    reloadProgress: 0,
    isPlayer: false,
    dead: false,
    respawnIn: 0,
    kills: 0,
    deaths: 0,
  };
  world.addUnit(unit);
}
