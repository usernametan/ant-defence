import { describe, expect, it } from 'vitest';
import type { MapData, TileKind, Unit } from '../../shared/types';
import { COVER_HP, TILE_SIZE } from '../constants';
import { tileKey } from '../map';
import { hasLineOfSight, moveCircle, raycast, resolveCircle, SpatialGrid, sweepProjectile } from './index';

function makeMap(rows: TileKind[][]): MapData {
  const coverHp: Record<string, number> = {};
  rows.forEach((row, y) => row.forEach((kind, x) => {
    if (kind === 'lowCover') coverHp[tileKey(x, y)] = COVER_HP;
  }));
  return {
    seed: 1,
    width: rows[0].length,
    height: rows.length,
    tileSize: TILE_SIZE,
    tiles: rows,
    coverHp,
    zones: [],
    bases: [],
    crateSpawns: [],
  };
}

function blank(rows = 10, cols = 10): TileKind[][] {
  return Array.from({ length: rows }, () => Array.from({ length: cols }, () => 'floor' as TileKind));
}

function fakeUnit(id: string, x: number, y: number, team: 'player' | 'enemy'): Unit {
  return {
    id,
    team,
    pos: { x, y },
    vel: { x: 0, y: 0 },
    angle: 0,
    hp: 100,
    maxHp: 100,
    weaponId: 'pistol',
    ammoInMag: 12,
    reserveAmmo: 60,
    reloading: false,
    reloadProgress: 0,
    isPlayer: false,
    dead: false,
    respawnIn: 0,
    kills: 0,
    deaths: 0,
  };
}

describe('physics', () => {
  it('pushes a circle out of a wall', () => {
    const tiles = blank();
    tiles[4][4] = 'wall';
    const map = makeMap(tiles);
    const resolved = resolveCircle(map, { x: 5 * TILE_SIZE + 5, y: 4 * TILE_SIZE + 16 }, 11);
    expect(resolved.x).toBeGreaterThanOrEqual(5 * TILE_SIZE + 11 - 0.01);
  });

  it('slides along a wall instead of stopping all motion', () => {
    const tiles = blank();
    tiles[4][4] = 'wall';
    const map = makeMap(tiles);
    const start = { x: 3 * TILE_SIZE + 16, y: 4 * TILE_SIZE + 16 };
    const moved = moveCircle(map, start, 11, { x: 40, y: 30 });
    expect(moved.y).toBeGreaterThan(start.y + 20);
    expect(moved.x).toBeLessThan(start.x + 40);
  });

  it('sweeps projectiles into walls and stops before units behind them', () => {
    const tiles = blank();
    tiles[4][4] = 'wall';
    const map = makeMap(tiles);
    const behind = fakeUnit('u1', 4 * TILE_SIZE + 16, 4 * TILE_SIZE + 16, 'enemy');
    const hit = sweepProjectile(
      map,
      { x: 2 * TILE_SIZE + 16, y: 4 * TILE_SIZE + 16 },
      { x: 6 * TILE_SIZE + 16, y: 4 * TILE_SIZE + 16 },
      4,
      [behind],
      'enemy',
      'owner',
    );
    expect(hit?.kind).toBe('wall');
    expect(hit?.unitId).toBeUndefined();
  });

  it('lets bullets pass through destroyed cover', () => {
    const tiles = blank();
    tiles[4][4] = 'lowCover';
    const map = makeMap(tiles);
    const from = { x: 2 * TILE_SIZE + 16, y: 4 * TILE_SIZE + 16 };
    const to = { x: 6 * TILE_SIZE + 16, y: 4 * TILE_SIZE + 16 };

    expect(sweepProjectile(map, from, to, 4, [], 'enemy', 'owner')?.kind).toBe('cover');
    map.coverHp[tileKey(4, 4)] = 0;
    expect(sweepProjectile(map, from, to, 4, [], 'enemy', 'owner')).toBeNull();
  });

  it('reports line of sight blocked by walls and low cover', () => {
    const tiles = blank();
    const from = { x: 1 * TILE_SIZE + 16, y: 5 * TILE_SIZE + 16 };
    const to = { x: 8 * TILE_SIZE + 16, y: 5 * TILE_SIZE + 16 };
    expect(hasLineOfSight(makeMap(tiles), from, to)).toBe(true);
    tiles[5][4] = 'wall';
    expect(hasLineOfSight(makeMap(tiles), from, to)).toBe(false);
    tiles[5][4] = 'lowCover';
    expect(hasLineOfSight(makeMap(tiles), from, to)).toBe(false);
    expect(raycast(makeMap(tiles), from, to)?.kind).toBe('cover');
  });

  it('queries nearby units through the spatial grid', () => {
    const grid = new SpatialGrid(64);
    const near = fakeUnit('near', 100, 100, 'enemy');
    const far = fakeUnit('far', 900, 900, 'enemy');
    grid.insert(near);
    grid.insert(far);
    const results = grid.query({ x: 110, y: 100 }, 64);
    expect(results.map((unit) => unit.id)).toContain('near');
    expect(results.map((unit) => unit.id)).not.toContain('far');
  });
});
