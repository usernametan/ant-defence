import { describe, expect, it } from 'vitest';
import type { MapTheme } from '../../shared/types';
import { MAP_ANCHORS, areTilesConnected, generateMap, isPassable, tileKey, worldToTile } from './index';
import { MAP_HEIGHT, MAP_WIDTH } from '../constants';

const THEMES: MapTheme[] = ['fortress', 'jungle', 'temple', 'slumside'];

function anchorsForMap(map: ReturnType<typeof generateMap>) {
  return [
    MAP_ANCHORS.playerBase,
    MAP_ANCHORS.enemyBase,
    ...map.zones.map((zone) => worldToTile(zone.center)),
  ];
}

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

  it('connects both bases and all three zones across themes and seeds', () => {
    for (const theme of THEMES) {
      for (let seed = 0; seed < 30; seed += 1) {
        const map = generateMap(seed * 7919 + 13, theme);
        expect(map.theme).toBe(theme);
        expect(areTilesConnected(map, anchorsForMap(map))).toBe(true);
      }
    }
  });

  it('never blocks a spawn or zone centre across themes and seeds', () => {
    for (const theme of THEMES) {
      for (let seed = 0; seed < 30; seed += 1) {
        const map = generateMap(seed, theme);
        for (const tile of anchorsForMap(map)) {
          expect(isPassable(map, tile.x, tile.y)).toBe(true);
        }
      }
    }
  });

  it('creates exactly three zones and two bases with crates near zones', () => {
    const map = generateMap(42, 'jungle');
    expect(map.zones).toHaveLength(3);
    expect(map.bases).toHaveLength(2);
    expect(map.crateSpawns.length).toBeGreaterThanOrEqual(3);
    for (const crate of map.crateSpawns) {
      expect(map.zones.some((zone) =>
        Math.hypot(zone.center.x - crate.x, zone.center.y - crate.y) < 300,
      )).toBe(true);
    }
  });

  it('moves capture zones when changing map themes or seeds', () => {
    const fortress = generateMap(4242, 'fortress');
    const jungle = generateMap(4242, 'jungle');
    const temple = generateMap(4242, 'temple');
    const slumside = generateMap(4242, 'slumside');

    expect(JSON.stringify(fortress.zones)).not.toBe(JSON.stringify(jungle.zones));
    expect(JSON.stringify(jungle.zones)).not.toBe(JSON.stringify(temple.zones));
    expect(JSON.stringify(slumside.zones)).not.toBe(JSON.stringify(fortress.zones));
    expect(JSON.stringify(slumside.zones)).not.toBe(JSON.stringify(jungle.zones));
    expect(JSON.stringify(slumside.zones)).not.toBe(JSON.stringify(temple.zones));

    const seedVariants = new Set(
      Array.from({ length: 12 }, (_, i) => JSON.stringify(generateMap(1000 + i * 73, 'jungle').zones)),
    );
    expect(seedVariants.size).toBeGreaterThan(1);
  });

  it('is deterministic for the same seed and theme and differs across seeds', () => {
    const a = generateMap(1234, 'temple');
    const b = generateMap(1234, 'temple');
    const c = generateMap(5678, 'temple');
    expect(a.tiles).toEqual(b.tiles);
    expect(a.zones).toEqual(b.zones);
    expect(a.coverHp).toEqual(b.coverHp);
    expect(JSON.stringify(a.tiles)).not.toBe(JSON.stringify(c.tiles));
  });

  it('records cover hp for every low-cover tile', () => {
    const map = generateMap(99, 'jungle');
    for (let y = 0; y < MAP_HEIGHT; y += 1) {
      for (let x = 0; x < MAP_WIDTH; x += 1) {
        if (map.tiles[y][x] === 'lowCover') {
          expect(map.coverHp[tileKey(x, y)]).toBeGreaterThan(0);
        }
      }
    }
  });

  it('keeps the eastern railway flank clear of walls in slumside maps', () => {
    const map = generateMap(4242, 'slumside');
    for (let y = 2; y <= 37; y += 1) {
      for (let x = 51; x <= 53; x += 1) {
        expect(map.tiles[y][x]).not.toBe('wall');
      }
    }
  });
});
