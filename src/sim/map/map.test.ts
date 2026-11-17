import { describe, expect, it } from 'vitest';
import { MAP_ANCHORS, areTilesConnected, generateMap, isPassable, tileKey } from './index';
import { MAP_HEIGHT, MAP_WIDTH } from '../constants';

const requiredTiles = [
  MAP_ANCHORS.playerBase,
  MAP_ANCHORS.enemyBase,
  ...MAP_ANCHORS.zoneTiles,
];

describe('generateMap', () => {
  it('produces the configured dimensions and outer walls', () => {
    const map = generateMap(1);
    expect(map.width).toBe(MAP_WIDTH);
    expect(map.height).toBe(MAP_HEIGHT);
    expect(map.tileSize).toBe(32);
    for (let x = 0; x < MAP_WIDTH; x += 1) {
      expect(map.tiles[0][x]).toBe('wall');
      expect(map.tiles[MAP_HEIGHT - 1][x]).toBe('wall');
    }
    for (let y = 0; y < MAP_HEIGHT; y += 1) {
      expect(map.tiles[y][0]).toBe('wall');
      expect(map.tiles[y][MAP_WIDTH - 1]).toBe('wall');
    }
  });

  it('connects both bases and all three zones for 50 seeds', () => {
    for (let seed = 0; seed < 50; seed += 1) {
      const map = generateMap(seed * 7919 + 13);
      expect(areTilesConnected(map, requiredTiles)).toBe(true);
    }
  });

  it('never blocks a spawn or zone centre', () => {
    for (let seed = 0; seed < 50; seed += 1) {
      const map = generateMap(seed);
      for (const tile of requiredTiles) {
        expect(isPassable(map, tile.x, tile.y)).toBe(true);
      }
    }
  });

  it('creates exactly three zones and two bases with crates near zones', () => {
    const map = generateMap(42);
    expect(map.zones).toHaveLength(3);
    expect(map.bases).toHaveLength(2);
    expect(map.crateSpawns.length).toBeGreaterThanOrEqual(3);
    for (const crate of map.crateSpawns) {
      expect(map.zones.some((zone) =>
        Math.hypot(zone.center.x - crate.x, zone.center.y - crate.y) < 300,
      )).toBe(true);
    }
  });

  it('is deterministic for the same seed and differs across seeds', () => {
    const a = generateMap(1234);
    const b = generateMap(1234);
    const c = generateMap(5678);
    expect(a.tiles).toEqual(b.tiles);
    expect(a.coverHp).toEqual(b.coverHp);
    expect(JSON.stringify(a.tiles)).not.toBe(JSON.stringify(c.tiles));
  });

  it('records cover hp for every low-cover tile', () => {
    const map = generateMap(99);
    for (let y = 0; y < MAP_HEIGHT; y += 1) {
      for (let x = 0; x < MAP_WIDTH; x += 1) {
        if (map.tiles[y][x] === 'lowCover') {
          expect(map.coverHp[tileKey(x, y)]).toBeGreaterThan(0);
        }
      }
    }
  });
});
