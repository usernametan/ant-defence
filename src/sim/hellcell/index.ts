import { WEAPON_DEFS } from '../../shared/api';
import { bus } from '../../shared/events';
import type {
  BossKind,
  HellcellBoss,
  HellcellState,
  MapData,
  MapTheme,
  Team,
  Unit,
  Vec2,
} from '../../shared/types';
import { COVER_HP, TILE_SIZE, UNIT_RADIUS } from '../constants';
import { isPassable, tileCenter, tileKey, worldToTile } from '../map';
import { isSolidTile, moveCircle, resolveCircle } from '../physics';
import type { Rng } from '../rng';
import type { SimWorld } from '../world';

/** Seconds between defeating a Hellcell monster and the next random-location breach. */
export const HELLCELL_RESPAWN_INTERVAL = 15;

/** Per-player HP contribution for each Hellcell Boss kind (scales linearly with total players = 2 * teamSize). */
export const HELLCELL_BOSS_HP_PER_PLAYER: Record<BossKind, number> = {
  rocketSiegeBot: 1450,
  venomCobra: 1350,
  pharaohSkeleton: 1350,
};

/** Base max HP for a 2v2 (4-player) match; scales up proportionally as team size increases. */
export const HELLCELL_BOSS_MAX_HP: Record<BossKind, number> = {
  rocketSiegeBot: HELLCELL_BOSS_HP_PER_PLAYER.rocketSiegeBot * 4,
  venomCobra: HELLCELL_BOSS_HP_PER_PLAYER.venomCobra * 4,
  pharaohSkeleton: HELLCELL_BOSS_HP_PER_PLAYER.pharaohSkeleton * 4,
};

/** Compute total Boss max HP proportional to the number of players in the match (2 * teamSize). */
export function computeBossMaxHp(world: SimWorld, kind: BossKind): number {
  const teamSize = Math.max(2, Math.floor(world.state.matchConfig.enemyCount || 2));
  const totalPlayers = Math.max(teamSize * 2, world.state.units.length);
  return HELLCELL_BOSS_HP_PER_PLAYER[kind] * totalPlayers;
}

export function bossKindForTheme(theme?: MapTheme): { kind: BossKind; name: string } {
  switch (theme) {
    case 'jungle':
      return { kind: 'venomCobra', name: 'COLOSSAL HYDRA-VIPER LEVIATHAN' };
    case 'temple':
      return { kind: 'pharaohSkeleton', name: 'COLOSSAL NECRO-PHARAOH TITAN' };
    case 'fortress':
    default:
      return { kind: 'rocketSiegeBot', name: 'OMEGA SIEGE DREADNOUGHT' };
  }
}

export function createInitialHellcellState(rng: Rng): HellcellState {
  return {
    phase: 'NORMAL',
    isCeasefireActive: false,
    hasTriggered: false,
    bossDefeated: false,
    bossCount: 0,
    nextSpawnIn: 0,
    crushedTiles: [],
    triggerTime: rng.range(15, 25),
    countdown: 0,
    blueBossDamage: 0,
    redBossDamage: 0,
    boss: null,
    reticles: [],
    acidPools: [],
    bossProjectiles: [],
    venomCone: null,
  };
}

function normalizeAngle(angle: number): number {
  let result = angle;
  while (result > Math.PI) result -= Math.PI * 2;
  while (result < -Math.PI) result += Math.PI * 2;
  return result;
}

/** True when both Zone A (zone-1) and Zone C (zone-3) have been captured by either team. */
export function areZonesAandCCaptured(world: SimWorld): boolean {
  const zones = world.state.zones;
  const zoneA = zones.find((z) => z.id === 'zone-1' || z.id === 'A') ?? zones[0];
  const zoneC = zones.find((z) => z.id === 'zone-3' || z.id === 'C') ?? zones[2];
  if (!zoneA || !zoneC) return false;
  return zoneA.owner !== 'neutral' && zoneC.owner !== 'neutral';
}

/** True when no flat block wall ('wall') lies along the segment; crates do not count as walls. */
export function hasWallOnlyLineOfSight(map: MapData, from: Vec2, to: Vec2): boolean {
  const dist = Math.hypot(to.x - from.x, to.y - from.y);
  const steps = Math.max(1, Math.ceil(dist / 6));
  for (let i = 1; i < steps; i += 1) {
    const t = i / steps;
    const px = from.x + (to.x - from.x) * t;
    const py = from.y + (to.y - from.y) * t;
    const tile = worldToTile({ x: px, y: py });
    if (tile.x < 0 || tile.y < 0 || tile.x >= map.width || tile.y >= map.height) return false;
    if (map.tiles[tile.y][tile.x] === 'wall') return false;
  }
  return true;
}

/** Check whether any intact 1x1 crate ('lowCover') lies along the segment. */
export function hasCrateAlongSegment(map: MapData, from: Vec2, to: Vec2): boolean {
  const dist = Math.hypot(to.x - from.x, to.y - from.y);
  const steps = Math.max(1, Math.ceil(dist / 6));
  for (let i = 1; i < steps; i += 1) {
    const t = i / steps;
    const px = from.x + (to.x - from.x) * t;
    const py = from.y + (to.y - from.y) * t;
    const tile = worldToTile({ x: px, y: py });
    if (tile.x < 0 || tile.y < 0 || tile.x >= map.width || tile.y >= map.height) continue;
    if (
      map.tiles[tile.y][tile.x] === 'lowCover' &&
      (map.coverHp[tileKey(tile.x, tile.y)] ?? COVER_HP) > 0
    ) {
      return true;
    }
  }
  return false;
}

function zoneBCenterPos(world: SimWorld): Vec2 {
  const zoneB =
    world.state.map.zones.find((z) => z.id === 'zone-2' || z.id === 'B') ??
    world.state.map.zones[1] ??
    world.state.map.zones[0];
  if (zoneB) return { x: zoneB.center.x, y: zoneB.center.y };
  return {
    x: (world.state.map.width * world.state.map.tileSize) * 0.5,
    y: (world.state.map.height * world.state.map.tileSize) * 0.5,
  };
}

function pickRandomBossSpawnPos(world: SimWorld): Vec2 {
  const map = world.state.map;
  const minCol = Math.min(map.width - 4, 6);
  const maxCol = Math.max(minCol, map.width - 7);
  const minRow = Math.min(map.height - 4, 4);
  const maxRow = Math.max(minRow, map.height - 5);

  for (let attempt = 0; attempt < 36; attempt += 1) {
    const tx = world.rng.int(minCol, maxCol);
    const ty = world.rng.int(minRow, maxRow);
    const candidate = tileCenter(tx, ty);
    const nearBase = map.bases.some(
      (b) => Math.hypot(b.center.x - candidate.x, b.center.y - candidate.y) < TILE_SIZE * 5,
    );
    if (nearBase) continue;
    if (map.tiles[ty]?.[tx] === 'floor') return candidate;
  }

  // Fallback to any interior tile
  const fallbackX = world.rng.int(minCol, maxCol);
  const fallbackY = world.rng.int(minRow, maxRow);
  return tileCenter(fallbackX, fallbackY);
}

/** Crush interior block walls and destructible cover blocks touched by the monster's colossal frame. */
export function crushObstaclesInRadius(world: SimWorld, center: Vec2, radius: number): void {
  const map = world.state.map;
  const hc = world.state.hellcell;
  const centerTile = worldToTile(center);
  const span = Math.ceil(radius / TILE_SIZE);
  let wallChanged = false;

  for (let y = centerTile.y - span; y <= centerTile.y + span; y += 1) {
    for (let x = centerTile.x - span; x <= centerTile.x + span; x += 1) {
      // Preserve outer perimeter border walls so units & boss stay inside the arena
      if (x <= 0 || y <= 0 || x >= map.width - 1 || y >= map.height - 1) continue;

      const kind = map.tiles[y][x];
      if (kind !== 'wall' && kind !== 'lowCover') continue;

      const tc = tileCenter(x, y);
      if (Math.hypot(tc.x - center.x, tc.y - center.y) > radius) continue;

      if (kind === 'wall') {
        if (hc) {
          if (!hc.crushedTiles) hc.crushedTiles = [];
          if (!hc.crushedTiles.some((t) => t.x === x && t.y === y)) {
            hc.crushedTiles.push({ x, y, prevKind: 'wall' });
          }
        }
        map.tiles[y][x] = 'floor';
        wallChanged = true;
        bus.emit('cover:destroyed', { tile: tileKey(x, y) });
      } else {
        const key = tileKey(x, y);
        const hp = map.coverHp[key] ?? COVER_HP;
        if (hp > 0) {
          if (hc) {
            if (!hc.crushedTiles) hc.crushedTiles = [];
            if (!hc.crushedTiles.some((t) => t.x === x && t.y === y)) {
              hc.crushedTiles.push({ x, y, prevKind: 'lowCover' });
            }
          }
          world.damageCover({ x, y }, 999);
        }
      }
    }
  }

  if (wallChanged) {
    world.mapVersion += 1;
    map.wallRevision = (map.wallRevision ?? 0) + 1;
  }
}

/** Restore every wall and block crushed by the Hellcell monster and push any overlapping units clear. */
function restoreCrushedObstacles(world: SimWorld): void {
  const hc = world.state.hellcell;
  if (!hc || !hc.crushedTiles || hc.crushedTiles.length === 0) return;

  const map = world.state.map;
  for (const record of hc.crushedTiles) {
    if (record.x <= 0 || record.y <= 0 || record.x >= map.width - 1 || record.y >= map.height - 1) {
      continue;
    }
    map.tiles[record.y][record.x] = record.prevKind;
    if (record.prevKind === 'lowCover') {
      map.coverHp[tileKey(record.x, record.y)] = COVER_HP;
    }
  }

  hc.crushedTiles = [];
  world.mapVersion += 1;
  map.wallRevision = (map.wallRevision ?? 0) + 1;

  // Ensure no living unit gets trapped inside a newly restored wall or cover block
  for (const unit of world.livingUnits()) {
    const resolved = resolveCircle(map, unit.pos, UNIT_RADIUS);
    const tile = worldToTile(resolved);
    if (!isPassable(map, tile.x, tile.y)) {
      unit.pos = world.findFreeSpot(resolved, 4);
    } else {
      unit.pos = resolved;
    }
  }
}

/** Refuel health and weapon ammo for all living units once a Hellcell monster is defeated. */
function refuelAllUnits(world: SimWorld): void {
  for (const unit of world.state.units) {
    if (unit.dead) continue;
    const def = WEAPON_DEFS[unit.weaponId];
    unit.hp = unit.maxHp;
    unit.ammoInMag = def.magSize;
    unit.reserveAmmo = def.magSize * 5;
    unit.reloading = false;
    unit.reloadProgress = 0;
    const runtime = world.runtime(unit);
    runtime.reloadRemaining = 0;
    runtime.lastDamageAt = world.state.time;
  }
}

function pickRandomWalkableTileNear(world: SimWorld, center: Vec2, minTiles: number, maxTiles: number): Vec2 {
  const map = world.state.map;
  const origin = worldToTile(center);
  for (let attempt = 0; attempt < 28; attempt += 1) {
    const angle = world.rng.range(-Math.PI, Math.PI);
    const radius = world.rng.range(minTiles, maxTiles);
    const tx = Math.max(1, Math.min(map.width - 2, Math.round(origin.x + Math.cos(angle) * radius)));
    const ty = Math.max(1, Math.min(map.height - 2, Math.round(origin.y + Math.sin(angle) * radius)));
    if (isPassable(map, tx, ty)) {
      return tileCenter(tx, ty);
    }
  }
  return world.findFreeSpot(center, 6);
}

function findNearestLivingUnit(world: SimWorld, pos: Vec2): Unit | undefined {
  let best: Unit | undefined;
  let bestDist = Infinity;
  for (const unit of world.livingUnits()) {
    const d = Math.hypot(unit.pos.x - pos.x, unit.pos.y - pos.y);
    if (d < bestDist) {
      bestDist = d;
      best = unit;
    }
  }
  return best;
}

/** Apply damage to the active Hellcell Boss and track Blue vs. Red team contribution. */
export function damageHellcellBoss(
  world: SimWorld,
  amount: number,
  attackerTeam: Team,
  hitPos: Vec2,
): void {
  const hc = world.state.hellcell;
  if (!hc || !hc.isCeasefireActive || !hc.boss || hc.boss.hp <= 0 || amount <= 0) return;

  const boss = hc.boss;
  const dealt = Math.min(boss.hp, amount);
  boss.hp = Math.max(0, boss.hp - amount);
  if (attackerTeam === 'player') {
    hc.blueBossDamage += dealt;
  } else {
    hc.redBossDamage += dealt;
  }

  const killed = boss.hp <= 0;
  bus.emit('hit', {
    targetId: boss.id,
    damage: dealt,
    pos: { x: hitPos.x, y: hitPos.y },
    killed,
  });

  if (killed) {
    defeatBoss(world);
  }
}

function defeatBoss(world: SimWorld): void {
  const hc = world.state.hellcell;
  if (!hc || !hc.boss) return;
  const bossPos = { x: hc.boss.pos.x, y: hc.boss.pos.y };

  hc.bossDefeated = true;
  hc.bossCount = (hc.bossCount ?? 0) + 1;
  hc.nextSpawnIn = HELLCELL_RESPAWN_INTERVAL;
  const winnerTeam: Team = hc.blueBossDamage >= hc.redBossDamage ? 'player' : 'enemy';
  hc.majorityWinner = winnerTeam;

  // Majority Damage Bonus (> 50% of Boss max HP): +150 points toward the 1000-point goal
  const bonus =
    world.state.matchConfig.scoreToWin >= 500
      ? 150
      : Math.max(15, Math.round(world.state.matchConfig.scoreToWin * 0.15));
  world.state.score[winnerTeam] += bonus;

  // Refuel player & bot health and ammo, and restore crushed walls/blocks
  refuelAllUnits(world);
  restoreCrushedObstacles(world);

  // Center Loot Drops: full shield refills (+50 shield) and heavy weapons (SHG, SNI) in a ring
  const lootAngles = [0, Math.PI * 0.5, Math.PI, Math.PI * 1.5];
  const ringRadius = 96;
  lootAngles.forEach((angle, idx) => {
    const rawPos = {
      x: bossPos.x + Math.cos(angle) * ringRadius,
      y: bossPos.y + Math.sin(angle) * ringRadius,
    };
    const spot = world.findFreeSpot(rawPos, 3);
    if (idx % 2 === 0) {
      world.spawnShieldPickup(spot, 50);
    } else {
      world.spawnPickup(spot, idx === 1 ? 'shotgun' : 'sniper');
    }
  });

  bus.emit('explosion', { pos: bossPos, radius: 195 });
  bus.emit('hellcell:defeated', {
    winner: winnerTeam,
    blueDamage: hc.blueBossDamage,
    redDamage: hc.redBossDamage,
  });

  hc.boss = null;
  hc.reticles = [];
  hc.bossProjectiles = [];
  hc.venomCone = null;
  hc.phase = 'RESUME_COUNTDOWN';
  hc.countdown = 3.0;
}

function spawnBoss(world: SimWorld, spawnPos: Vec2): HellcellBoss {
  const { kind, name } = bossKindForTheme(world.state.map.theme);
  const maxHp = computeBossMaxHp(world, kind);
  const radius = TILE_SIZE * 2.15;
  const initialTimer = 0.85;
  const moveAngle = world.rng.range(-Math.PI, Math.PI);

  // Immediately crush any interior walls or cover crates in the boss emergence footprint
  crushObstaclesInRadius(world, spawnPos, radius + TILE_SIZE * 0.45);

  return {
    id: 'hellcell-boss',
    kind,
    name,
    pos: { x: spawnPos.x, y: spawnPos.y },
    radius,
    angle: moveAngle,
    targetAngle: moveAngle,
    moveAngle,
    moveTimer: world.rng.range(0.9, 1.9),
    hp: maxHp,
    maxHp,
    attackTimer: initialTimer,
    attackAnim: 1.0,
  };
}

function pushUnitsOutOfCenter(world: SimWorld, center: Vec2, clearRadius: number, dt: number, immediate = false): void {
  for (const unit of world.livingUnits()) {
    const dx = unit.pos.x - center.x;
    const dy = unit.pos.y - center.y;
    const dist = Math.hypot(dx, dy);
    if (dist >= clearRadius) continue;
    const nx = dist > 1e-3 ? dx / dist : 1;
    const ny = dist > 1e-3 ? dy / dist : 0;
    const pushDist = immediate ? clearRadius - dist + 4 : Math.min(clearRadius - dist, 280 * dt);
    unit.pos = moveCircle(world.state.map, unit.pos, UNIT_RADIUS, {
      x: nx * pushDist,
      y: ny * pushDist,
    });
  }
}

/** Move the monster fast in random directions across the whole arena, crushing walls and blocks in its path. */
function updateBossMotion(world: SimWorld, boss: HellcellBoss, dt: number): void {
  const map = world.state.map;
  const enraged = boss.hp < boss.maxHp * 0.5;
  const speedMult = enraged ? 1.28 : 1.0;

  let baseSpeed = 240;
  if (boss.kind === 'venomCobra') baseSpeed = 300;
  else if (boss.kind === 'pharaohSkeleton') baseSpeed = 265;
  const moveSpeed = baseSpeed * speedMult;

  boss.moveTimer = (boss.moveTimer ?? 0) - dt;
  if (boss.moveTimer <= 0 || boss.moveAngle === undefined) {
    boss.moveAngle = world.rng.range(-Math.PI, Math.PI);
    boss.moveTimer = world.rng.range(0.85, 1.85);
  }

  let vx = Math.cos(boss.moveAngle) * moveSpeed;
  let vy = Math.sin(boss.moveAngle) * moveSpeed;
  let nextX = boss.pos.x + vx * dt;
  let nextY = boss.pos.y + vy * dt;

  // Keep monster inside the outer perimeter walls; bounce inward with a randomized angle on edge contact
  const margin = TILE_SIZE + boss.radius + 4;
  const minX = margin;
  const minY = margin;
  const maxX = Math.max(minX, map.width * TILE_SIZE - margin);
  const maxY = Math.max(minY, map.height * TILE_SIZE - margin);
  let bounced = false;

  if (nextX < minX) {
    nextX = minX;
    vx = Math.abs(vx);
    bounced = true;
  } else if (nextX > maxX) {
    nextX = maxX;
    vx = -Math.abs(vx);
    bounced = true;
  }

  if (nextY < minY) {
    nextY = minY;
    vy = Math.abs(vy);
    bounced = true;
  } else if (nextY > maxY) {
    nextY = maxY;
    vy = -Math.abs(vy);
    bounced = true;
  }

  if (bounced) {
    boss.moveAngle = Math.atan2(vy, vx) + world.rng.spread(0.45);
    boss.moveTimer = world.rng.range(0.85, 1.75);
  }

  boss.pos.x = nextX;
  boss.pos.y = nextY;

  // Smash through interior walls and cover blocks anywhere along the boss's path
  crushObstaclesInRadius(world, boss.pos, boss.radius + 8);

  // Face toward movement direction between attacks (attack triggers snap targetAngle toward victims)
  if (boss.attackAnim < 0.25) {
    boss.targetAngle = boss.moveAngle;
  }
  const turnSpeed = (boss.kind === 'venomCobra' ? 16 : 12) * speedMult;
  const turn = normalizeAngle(boss.targetAngle - boss.angle);
  boss.angle += turn * Math.min(1, dt * turnSpeed);
}

function triggerRocketSalvo(world: SimWorld, boss: HellcellBoss): void {
  const hc = world.state.hellcell;
  if (!hc) return;
  const living = world.livingUnits();
  const count = world.rng.int(6, 7);
  boss.attackAnim = 1.0;

  for (let i = 0; i < count; i += 1) {
    let targetPos: Vec2;
    if (i > 0 && living.length > 0 && i % 2 === 1) {
      const unit = living[i % living.length];
      targetPos = pickRandomWalkableTileNear(world, unit.pos, 0, 3);
    } else {
      targetPos = pickRandomWalkableTileNear(world, boss.pos, 4, 14);
    }
    if (i === 0) {
      boss.targetAngle = Math.atan2(targetPos.y - boss.pos.y, targetPos.x - boss.pos.x);
    }
    const flightTime = 1.15;
    const splashRadius = TILE_SIZE * 1.65;
    hc.reticles.push({
      id: world.nextId('reticle'),
      startPos: { x: boss.pos.x, y: boss.pos.y },
      targetPos,
      timer: flightTime,
      maxTimer: flightTime,
      splashRadius,
      damage: 74,
    });
    const podSide = i % 2 === 0 ? 1 : -1;
    const perpAngle = boss.angle + (Math.PI / 2) * podSide;
    const launchPos = {
      x: boss.pos.x + Math.cos(perpAngle) * 44,
      y: boss.pos.y + Math.sin(perpAngle) * 44,
    };
    const dx = targetPos.x - launchPos.x;
    const dy = targetPos.y - launchPos.y;
    hc.bossProjectiles.push({
      id: world.nextId('bproj'),
      kind: 'rocket',
      pos: launchPos,
      vel: { x: dx / flightTime, y: dy / flightTime },
      targetPos,
      rotation: Math.atan2(dy, dx),
      spinSpeed: 0,
      bouncesLeft: 0,
      life: flightTime,
      damage: 0,
      splashRadius,
    });
  }
}

function triggerVenomSprayAndBlobs(world: SimWorld, boss: HellcellBoss): void {
  const hc = world.state.hellcell;
  if (!hc) return;
  const living = world.livingUnits();
  let sprayAngle = world.rng.range(-Math.PI, Math.PI);
  const nearest = findNearestLivingUnit(world, boss.pos);
  if (nearest) {
    sprayAngle =
      Math.atan2(nearest.pos.y - boss.pos.y, nearest.pos.x - boss.pos.x) + world.rng.spread(0.18);
  } else if (living.length > 0) {
    const pick = living[world.rng.int(0, living.length - 1)];
    sprayAngle =
      Math.atan2(pick.pos.y - boss.pos.y, pick.pos.x - boss.pos.x) + world.rng.spread(0.22);
  }
  boss.targetAngle = sprayAngle;
  boss.angle = sprayAngle;
  boss.attackAnim = 1.0;

  const halfArc = Math.PI / 5.2;
  const range = TILE_SIZE * 7.2;
  hc.venomCone = {
    pos: { x: boss.pos.x, y: boss.pos.y },
    angle: sprayAngle,
    halfArc,
    range,
    ttl: 0.72,
    maxTtl: 0.72,
  };

  for (const unit of living) {
    const dx = unit.pos.x - boss.pos.x;
    const dy = unit.pos.y - boss.pos.y;
    const dist = Math.hypot(dx, dy);
    if (dist > range) continue;
    const angleDiff = Math.abs(normalizeAngle(Math.atan2(dy, dx) - sprayAngle));
    if (angleDiff > halfArc) continue;
    if (!hasWallOnlyLineOfSight(world.state.map, boss.pos, unit.pos)) continue;

    const behindCrate = hasCrateAlongSegment(world.state.map, boss.pos, unit.pos);
    const dmg = behindCrate ? 34 : 68;
    world.damageUnit(unit, dmg, boss.id, 'boss', { x: unit.pos.x, y: unit.pos.y });
  }

  const blobCount = world.rng.int(5, 7);
  for (let i = 0; i < blobCount; i += 1) {
    const targetPos =
      living.length > 0 && i < living.length && world.rng.chance(0.6)
        ? pickRandomWalkableTileNear(world, living[i % living.length].pos, 0, 2)
        : pickRandomWalkableTileNear(world, boss.pos, 3, 11);
    const flightTime = 0.4;
    const dx = targetPos.x - boss.pos.x;
    const dy = targetPos.y - boss.pos.y;
    hc.bossProjectiles.push({
      id: world.nextId('bproj'),
      kind: 'venomBlob',
      pos: { x: boss.pos.x, y: boss.pos.y },
      vel: { x: dx / flightTime, y: dy / flightTime },
      targetPos,
      rotation: Math.atan2(dy, dx),
      spinSpeed: 9,
      bouncesLeft: 0,
      life: flightTime,
      damage: 30,
      splashRadius: TILE_SIZE * 1.15,
    });
  }
}

function triggerBoneBarrage(world: SimWorld, boss: HellcellBoss): void {
  const hc = world.state.hellcell;
  if (!hc) return;
  const boneCount = world.rng.int(6, 9);
  const nearest = findNearestLivingUnit(world, boss.pos);
  const baseAngle = nearest
    ? Math.atan2(nearest.pos.y - boss.pos.y, nearest.pos.x - boss.pos.x)
    : world.rng.range(-Math.PI, Math.PI);
  boss.targetAngle = baseAngle;
  boss.attackAnim = 1.0;

  for (let i = 0; i < boneCount; i += 1) {
    const angle = baseAngle + (i / boneCount) * Math.PI * 2 + world.rng.spread(0.22);
    const speed = 450;
    hc.bossProjectiles.push({
      id: world.nextId('bproj'),
      kind: 'bone',
      pos: {
        x: boss.pos.x + Math.cos(angle) * (boss.radius + 8),
        y: boss.pos.y + Math.sin(angle) * (boss.radius + 8),
      },
      vel: {
        x: Math.cos(angle) * speed,
        y: Math.sin(angle) * speed,
      },
      rotation: angle,
      spinSpeed: 16,
      bouncesLeft: 1,
      life: 3.8,
      damage: 56,
      splashRadius: 0,
    });
  }
}

function detonateReticle(world: SimWorld, targetPos: Vec2, splashRadius: number, damage: number): void {
  const map = world.state.map;
  bus.emit('explosion', { pos: { x: targetPos.x, y: targetPos.y }, radius: splashRadius });

  for (const unit of world.livingUnits()) {
    const dist = Math.hypot(unit.pos.x - targetPos.x, unit.pos.y - targetPos.y);
    if (dist > splashRadius) continue;
    if (!hasWallOnlyLineOfSight(map, targetPos, unit.pos)) continue;
    const falloff = 1 - dist / splashRadius;
    world.damageUnit(
      unit,
      damage * (0.45 + 0.55 * falloff),
      'hellcell-boss',
      'boss',
      { x: unit.pos.x, y: unit.pos.y },
    );
  }

  const centerTile = worldToTile(targetPos);
  const span = Math.ceil(splashRadius / TILE_SIZE);
  for (let y = centerTile.y - span; y <= centerTile.y + span; y += 1) {
    for (let x = centerTile.x - span; x <= centerTile.x + span; x += 1) {
      if (x < 0 || y < 0 || x >= map.width || y >= map.height) continue;
      if (map.tiles[y][x] !== 'lowCover') continue;
      const tc = tileCenter(x, y);
      if (Math.hypot(tc.x - targetPos.x, tc.y - targetPos.y) <= splashRadius + TILE_SIZE * 0.35) {
        world.damageCover({ x, y }, 999);
      }
    }
  }
}

function updateBossProjectiles(world: SimWorld, dt: number): void {
  const hc = world.state.hellcell;
  if (!hc) return;
  const map = world.state.map;

  for (let idx = hc.bossProjectiles.length - 1; idx >= 0; idx -= 1) {
    const proj = hc.bossProjectiles[idx];
    proj.life -= dt;
    proj.rotation += proj.spinSpeed * dt;

    if (proj.kind === 'rocket') {
      proj.pos.x += proj.vel.x * dt;
      proj.pos.y += proj.vel.y * dt;
      if (proj.life <= 0) {
        hc.bossProjectiles.splice(idx, 1);
      }
      continue;
    }

    if (proj.kind === 'venomBlob') {
      proj.pos.x += proj.vel.x * dt;
      proj.pos.y += proj.vel.y * dt;
      if (proj.life <= 0) {
        const landPos = proj.targetPos ?? proj.pos;
        const tile = worldToTile(landPos);
        const existing = hc.acidPools.find((p) => p.tileX === tile.x && p.tileY === tile.y);
        if (existing) {
          existing.ttl = 6.0;
          existing.maxTtl = 6.0;
        } else {
          hc.acidPools.push({
            id: world.nextId('acid'),
            pos: tileCenter(tile.x, tile.y),
            tileX: tile.x,
            tileY: tile.y,
            ttl: 6.0,
            maxTtl: 6.0,
            dps: 32,
          });
        }
        for (const unit of world.livingUnits()) {
          if (Math.hypot(unit.pos.x - landPos.x, unit.pos.y - landPos.y) <= proj.splashRadius) {
            world.damageUnit(unit, proj.damage, 'hellcell-boss', 'boss', {
              x: unit.pos.x,
              y: unit.pos.y,
            });
          }
        }
        hc.bossProjectiles.splice(idx, 1);
      }
      continue;
    }

    // kind === 'bone': single-bounce ricochet physics off flat axis-aligned block walls
    const totalStep = Math.hypot(proj.vel.x * dt, proj.vel.y * dt);
    const substeps = Math.max(1, Math.ceil(totalStep / 5));
    let consumed = proj.life <= 0;

    for (let s = 0; s < substeps && !consumed; s += 1) {
      const stepDt = dt / substeps;
      const nextX = proj.pos.x + proj.vel.x * stepDt;
      const tileX = worldToTile({ x: nextX, y: proj.pos.y });
      if (isSolidTile(map, tileX.x, tileX.y)) {
        if (map.tiles[tileX.y]?.[tileX.x] === 'lowCover') {
          world.damageCover(tileX, 36);
        }
        if (proj.bouncesLeft > 0) {
          proj.vel.x = -proj.vel.x;
          proj.bouncesLeft -= 1;
        } else {
          consumed = true;
          break;
        }
      } else {
        proj.pos.x = nextX;
      }

      const nextY = proj.pos.y + proj.vel.y * stepDt;
      const tileY = worldToTile({ x: proj.pos.x, y: nextY });
      if (isSolidTile(map, tileY.x, tileY.y)) {
        if (map.tiles[tileY.y]?.[tileY.x] === 'lowCover') {
          world.damageCover(tileY, 36);
        }
        if (proj.bouncesLeft > 0) {
          proj.vel.y = -proj.vel.y;
          proj.bouncesLeft -= 1;
        } else {
          consumed = true;
          break;
        }
      } else {
        proj.pos.y = nextY;
      }

      for (const unit of world.livingUnits()) {
        if (Math.hypot(unit.pos.x - proj.pos.x, unit.pos.y - proj.pos.y) <= UNIT_RADIUS + 9) {
          world.damageUnit(unit, proj.damage, 'hellcell-boss', 'boss', {
            x: proj.pos.x,
            y: proj.pos.y,
          });
          consumed = true;
          break;
        }
      }
    }

    if (consumed) {
      hc.bossProjectiles.splice(idx, 1);
    }
  }
}

function updateAcidPools(world: SimWorld, dt: number): void {
  const hc = world.state.hellcell;
  if (!hc || hc.acidPools.length === 0) return;

  for (let idx = hc.acidPools.length - 1; idx >= 0; idx -= 1) {
    const pool = hc.acidPools[idx];
    pool.ttl -= dt;
    if (pool.ttl <= 0) {
      hc.acidPools.splice(idx, 1);
      continue;
    }

    for (const unit of world.livingUnits()) {
      const uTile = worldToTile(unit.pos);
      if (
        (uTile.x === pool.tileX && uTile.y === pool.tileY) ||
        Math.hypot(unit.pos.x - pool.pos.x, unit.pos.y - pool.pos.y) <= TILE_SIZE * 0.68
      ) {
        world.damageUnit(unit, pool.dps * dt, 'hellcell-boss', 'boss', {
          x: unit.pos.x,
          y: unit.pos.y,
        });
      }
    }
  }
}

function beginHellcellWarning(world: SimWorld, hc: HellcellState, spawnPos: Vec2): void {
  hc.hasTriggered = true;
  hc.phase = 'WARNING';
  hc.countdown = 3.0;
  hc.spawnPos = { x: spawnPos.x, y: spawnPos.y };
  const zoneB =
    world.state.zones.find((z) => z.id === 'zone-2' || z.id === 'B') ??
    world.state.zones[1] ??
    world.state.zones[0];
  if (zoneB && (hc.bossCount ?? 0) === 0) {
    zoneB.owner = 'neutral';
    zoneB.progress = 0;
    zoneB.contested = false;
  }
  bus.emit('hellcell:warning', { countdown: 3 });
}

/** Advance the Hellcell PvPvE state machine, boss AI, random fast motion, wall crushing, and 15s respawn waves. */
export function updateHellcell(world: SimWorld, dt: number): void {
  if (!world.isHellcell()) return;
  const hc = world.state.hellcell;
  if (!hc) return;

  const activeSpawnPos = hc.spawnPos ?? zoneBCenterPos(world);
  updateAcidPools(world, dt);

  if (hc.venomCone) {
    hc.venomCone.ttl -= dt;
    if (hc.venomCone.ttl <= 0) hc.venomCone = null;
  }

  switch (hc.phase) {
    case 'NORMAL': {
      if (!hc.hasTriggered) {
        // First monster emerges from Zone B once both Zone A and Zone C are captured
        if (areZonesAandCCaptured(world)) {
          beginHellcellWarning(world, hc, zoneBCenterPos(world));
        }
      } else if ((hc.nextSpawnIn ?? 0) > 0) {
        // Subsequent monsters emerge at random map locations every 15 seconds after defeat
        hc.nextSpawnIn = Math.max(0, (hc.nextSpawnIn ?? 0) - dt);
        if (hc.nextSpawnIn <= 0) {
          beginHellcellWarning(world, hc, pickRandomBossSpawnPos(world));
        }
      }
      break;
    }

    case 'WARNING': {
      pushUnitsOutOfCenter(world, activeSpawnPos, TILE_SIZE * 2.5, dt, false);
      hc.countdown -= dt;
      if (hc.countdown <= 0) {
        hc.countdown = 0;
        hc.phase = 'CEASEFIRE_BOSS';
        hc.isCeasefireActive = true;
        hc.blueBossDamage = 0;
        hc.redBossDamage = 0;
        hc.boss = spawnBoss(world, activeSpawnPos);
        pushUnitsOutOfCenter(world, hc.boss.pos, hc.boss.radius + UNIT_RADIUS + 8, dt, true);
        bus.emit('hellcell:start', { boss: hc.boss });
      }
      break;
    }

    case 'CEASEFIRE_BOSS': {
      const boss = hc.boss;
      if (!boss) break;

      updateBossMotion(world, boss, dt);
      pushUnitsOutOfCenter(world, boss.pos, boss.radius + UNIT_RADIUS + 3, dt, true);
      boss.attackAnim = Math.max(0, boss.attackAnim - dt * 3.6);

      for (let i = hc.reticles.length - 1; i >= 0; i -= 1) {
        const ret = hc.reticles[i];
        ret.timer -= dt;
        if (ret.timer <= 0) {
          detonateReticle(world, ret.targetPos, ret.splashRadius, ret.damage);
          hc.reticles.splice(i, 1);
        }
      }

      updateBossProjectiles(world, dt);

      const enraged = boss.hp < boss.maxHp * 0.5;
      boss.attackTimer -= dt;
      if (boss.attackTimer <= 0) {
        if (boss.kind === 'rocketSiegeBot') {
          boss.attackTimer = enraged ? 1.1 : 1.5;
          triggerRocketSalvo(world, boss);
        } else if (boss.kind === 'venomCobra') {
          boss.attackTimer = enraged ? 0.95 : 1.3;
          triggerVenomSprayAndBlobs(world, boss);
        } else {
          boss.attackTimer = enraged ? 0.8 : 1.15;
          triggerBoneBarrage(world, boss);
        }
      }
      break;
    }

    case 'RESUME_COUNTDOWN': {
      if ((hc.nextSpawnIn ?? 0) > 0) {
        hc.nextSpawnIn = Math.max(0, (hc.nextSpawnIn ?? 0) - dt);
      }
      hc.countdown -= dt;
      if (hc.countdown <= 0) {
        hc.countdown = 0;
        hc.phase = 'NORMAL';
        hc.isCeasefireActive = false;
        const winnerTeam = hc.majorityWinner ?? 'player';
        const zoneB =
          world.state.zones.find((z) => z.id === 'zone-2' || z.id === 'B') ??
          world.state.zones[1] ??
          world.state.zones[0];
        if (zoneB && (hc.bossCount ?? 0) <= 1) {
          zoneB.owner = winnerTeam;
          zoneB.progress = winnerTeam === 'player' ? 1 : -1;
          zoneB.contested = false;
          bus.emit('zone:captured', { zoneId: zoneB.id, team: winnerTeam });
        }
        bus.emit('hellcell:resumed');
      }
      break;
    }
  }
}
