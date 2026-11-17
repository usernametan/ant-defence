import { describe, expect, it } from 'vitest';
import type { MapData, TileKind } from '../../shared/types';
import { TILE_SIZE } from '../constants';
import { tileCenter } from '../map';
import { findPath, PathCache } from './pathfinding';

function makeMap(width = 20, height = 12): MapData {
  const tiles: TileKind[][] = Array.from({ length: height }, (_, y) =>
    Array.from({ length: width }, (_, x): TileKind =>
      x === 0 || y === 0 || x === width - 1 || y === height - 1 ? 'wall' : 'floor',
    ),
  );
  return {
    seed: 1, width, height, tileSize: TILE_SIZE,
    tiles, coverHp: {}, zones: [], bases: [], crateSpawns: [],
  };
}

describe('A* pathfinding', () => {
  it('returns a straight route through an open map', () => {
    const map = makeMap();
    const path = findPath(map, { x: 2, y: 5 }, { x: 8, y: 5 });
    expect(path.length).toBeGreaterThan(0);
    expect(path[path.length - 1]).toEqual(tileCenter(8, 5));
    expect(path).toHaveLength(6);
  });

  it('routes around a solid wall', () => {
    const map = makeMap();
    for (let y = 2; y <= 8; y += 1) map.tiles[y][6] = 'wall';
    const path = findPath(map, { x: 2, y: 5 }, { x: 10, y: 5 });
    expect(path.length).toBeGreaterThan(0);
    expect(path.some((point) => Math.abs(point.y - 5 * TILE_SIZE - TILE_SIZE / 2) < 1 && point.x > 6 * TILE_SIZE)).toBe(true);
  });

  it('returns an empty path when the goal is blocked', () => {
    const map = makeMap();
    map.tiles[5][8] = 'wall';
    expect(findPath(map, { x: 2, y: 5 }, { x: 8, y: 5 })).toEqual([]);
  });

  it('caches by goal and invalidates on map version changes', () => {
    const map = makeMap();
    const cache = new PathCache();
    const first = cache.get(map, { x: 2, y: 5 }, { x: 8, y: 5 }, 0);
    expect(cache.get(map, { x: 2, y: 5 }, { x: 8, y: 5 }, 0)).toBe(first);
    map.tiles[5][5] = 'lowCover';
    map.coverHp['5,5'] = 100;
    const changed = cache.get(map, { x: 2, y: 5 }, { x: 8, y: 5 }, 1);
    expect(changed).not.toBe(first);
    expect(changed.length).toBeGreaterThan(0);
  });
});
