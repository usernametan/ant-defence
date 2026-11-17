import type { MapData, Team, Unit, Vec2 } from '../../shared/types';
import { COVER_HP, SPATIAL_CELL, TILE_SIZE, UNIT_RADIUS } from '../constants';
import { tileKey, worldToTile, type TileCoord } from '../map';

export interface SweepHit {
  kind: 'wall' | 'cover' | 'unit';
  pos: Vec2;
  distance: number;
  tile?: TileCoord;
  unitId?: string;
}

function distance(a: Vec2, b: Vec2): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/** Walls and intact low cover block movement, bullets, and sight. */
export function isSolidTile(map: MapData, x: number, y: number): boolean {
  if (x < 0 || y < 0 || x >= map.width || y >= map.height) return true;
  const kind = map.tiles[y][x];
  if (kind === 'wall') return true;
  if (kind === 'lowCover') return (map.coverHp[tileKey(x, y)] ?? COVER_HP) > 0;
  return false;
}

interface Penetration {
  nx: number;
  ny: number;
  depth: number;
}

function circleTilePenetration(
  pos: Vec2,
  radius: number,
  tileX: number,
  tileY: number,
): Penetration | null {
  const minX = tileX * TILE_SIZE;
  const minY = tileY * TILE_SIZE;
  const maxX = minX + TILE_SIZE;
  const maxY = minY + TILE_SIZE;
  const closestX = Math.max(minX, Math.min(pos.x, maxX));
  const closestY = Math.max(minY, Math.min(pos.y, maxY));
  const dx = pos.x - closestX;
  const dy = pos.y - closestY;
  const squared = dx * dx + dy * dy;

  if (squared > radius * radius) return null;

  if (squared > 1e-8) {
    const dist = Math.sqrt(squared);
    return { nx: dx / dist, ny: dy / dist, depth: radius - dist };
  }

  // Centre is inside the tile: push out along the nearest face.
  const left = pos.x - minX;
  const right = maxX - pos.x;
  const top = pos.y - minY;
  const bottom = maxY - pos.y;
  const min = Math.min(left, right, top, bottom);
  if (min === left) return { nx: -1, ny: 0, depth: left + radius };
  if (min === right) return { nx: 1, ny: 0, depth: right + radius };
  if (min === top) return { nx: 0, ny: -1, depth: top + radius };
  return { nx: 0, ny: 1, depth: bottom + radius };
}

/** Push a circle out of every overlapping solid tile. */
export function resolveCircle(map: MapData, pos: Vec2, radius: number): Vec2 {
  const result: Vec2 = { x: pos.x, y: pos.y };
  for (let pass = 0; pass < 4; pass += 1) {
    let moved = false;
    const tile = worldToTile(result);
    const range = Math.ceil(radius / TILE_SIZE) + 1;
    for (let y = tile.y - range; y <= tile.y + range; y += 1) {
      for (let x = tile.x - range; x <= tile.x + range; x += 1) {
        if (!isSolidTile(map, x, y)) continue;
        const penetration = circleTilePenetration(result, radius, x, y);
        if (!penetration) continue;
        result.x += penetration.nx * penetration.depth;
        result.y += penetration.ny * penetration.depth;
        moved = true;
      }
    }
    if (!moved) break;
  }
  return result;
}

/**
 * Axis-separated movement with substeps gives natural sliding and prevents a
 * large delta from tunnelling through a thin wall.
 */
export function moveCircle(
  map: MapData,
  pos: Vec2,
  radius: number,
  delta: Vec2,
): Vec2 {
  const steps = Math.max(1, Math.ceil(Math.hypot(delta.x, delta.y) / (radius * 0.5)));
  const stepX = delta.x / steps;
  const stepY = delta.y / steps;
  let current: Vec2 = { x: pos.x, y: pos.y };
  for (let step = 0; step < steps; step += 1) {
    current = resolveCircle(map, { x: current.x + stepX, y: current.y }, radius);
    current = resolveCircle(map, { x: current.x, y: current.y + stepY }, radius);
  }
  return current;
}

/** Uniform spatial hash for cheap unit neighbour queries. */
export class SpatialGrid {
  private readonly cells = new Map<string, Unit[]>();

  constructor(private readonly cellSize = SPATIAL_CELL) {}

  clear(): void {
    this.cells.clear();
  }

  private cellOf(pos: Vec2): TileCoord {
    return {
      x: Math.floor(pos.x / this.cellSize),
      y: Math.floor(pos.y / this.cellSize),
    };
  }

  insert(unit: Unit): void {
    if (unit.dead) return;
    const cell = this.cellOf(unit.pos);
    const key = tileKey(cell.x, cell.y);
    const bucket = this.cells.get(key);
    if (bucket) bucket.push(unit);
    else this.cells.set(key, [unit]);
  }

  query(pos: Vec2, radius: number): Unit[] {
    const result: Unit[] = [];
    const min = this.cellOf({ x: pos.x - radius, y: pos.y - radius });
    const max = this.cellOf({ x: pos.x + radius, y: pos.y + radius });
    for (let y = min.y; y <= max.y; y += 1) {
      for (let x = min.x; x <= max.x; x += 1) {
        const bucket = this.cells.get(tileKey(x, y));
        if (!bucket) continue;
        for (const unit of bucket) result.push(unit);
      }
    }
    return result;
  }
}

/**
 * Discretised sweep along a segment. Tiles are checked before units so cover
 * stops bullets before they reach a unit standing just behind it.
 */
export function sweepProjectile(
  map: MapData,
  from: Vec2,
  to: Vec2,
  radius: number,
  candidates: readonly Unit[],
  victimTeam: Team,
  ownerId: string,
): SweepHit | null {
  const total = distance(from, to);
  const steps = Math.max(1, Math.ceil(total / 6));
  for (let step = 1; step <= steps; step += 1) {
    const t = step / steps;
    const point: Vec2 = {
      x: from.x + (to.x - from.x) * t,
      y: from.y + (to.y - from.y) * t,
    };
    const tile = worldToTile(point);
    if (isSolidTile(map, tile.x, tile.y)) {
      return {
        kind: map.tiles[tile.y][tile.x] === 'wall' ? 'wall' : 'cover',
        pos: point,
        distance: total * t,
        tile,
      };
    }
    for (const unit of candidates) {
      if (unit.dead || unit.team !== victimTeam || unit.id === ownerId) continue;
      if (distance(point, unit.pos) <= radius + UNIT_RADIUS) {
        return {
          kind: 'unit',
          pos: point,
          distance: total * t,
          unitId: unit.id,
        };
      }
    }
  }
  return null;
}

/** Returns the first solid tile along a ray, or null when sight is clear. */
export function raycast(
  map: MapData,
  from: Vec2,
  to: Vec2,
): SweepHit | null {
  const total = distance(from, to);
  const steps = Math.max(1, Math.ceil(total / 6));
  for (let step = 1; step < steps; step += 1) {
    const t = step / steps;
    const point: Vec2 = {
      x: from.x + (to.x - from.x) * t,
      y: from.y + (to.y - from.y) * t,
    };
    const tile = worldToTile(point);
    if (isSolidTile(map, tile.x, tile.y)) {
      return {
        kind: map.tiles[tile.y][tile.x] === 'wall' ? 'wall' : 'cover',
        pos: point,
        distance: total * t,
        tile,
      };
    }
  }
  return null;
}

export function hasLineOfSight(map: MapData, from: Vec2, to: Vec2): boolean {
  return raycast(map, from, to) === null;
}
