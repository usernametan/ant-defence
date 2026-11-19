import { describe, expect, it } from 'vitest';
import type { MapData } from '../shared/types';
import { Camera } from './camera';
import { formatZoneCode } from './environment';
import { MAP_THEME_PALETTES, PALETTE, getThemePalette } from './palette';
import { computeVisibilityPolygon, hasLineOfSight } from './visibility';

function makeMiniMap(): MapData {
  const width = 10;
  const height = 10;
  const tiles: MapData['tiles'] = Array.from({ length: height }, () =>
    Array.from({ length: width }, () => 'floor' as const),
  );
  tiles[4][5] = 'wall';
  tiles[5][5] = 'wall';
  return {
    seed: 1,
    width,
    height,
    tileSize: 32,
    tiles,
    coverHp: {},
    zones: [],
    bases: [],
    crateSpawns: [],
  };
}

describe('Renderer math & palette', () => {
  it('uses exact Holo-Tactical palette tokens', () => {
    expect(PALETTE.bg0).toBe('#070B14');
    expect(PALETTE.player).toBe('#22D3EE');
    expect(PALETTE.enemy).toBe('#FF5A3C');
    expect(PALETTE.gold).toBe('#FACC15');
  });

  it('Camera screenToWorld and worldToScreen are exact inverses', () => {
    const cam = new Camera();
    cam.reset({ x: 320, y: 240 });
    cam.update({ x: 320, y: 240 }, { x: 0, y: 0 }, 0.016, 0);

    const vt = cam.getTransform(1280, 720, 1, 0, true);
    const screen = vt.worldToScreen(500, 120);
    const world = vt.screenToWorld(screen.x, screen.y);
    expect(world.x).toBeCloseTo(500, 4);
    expect(world.y).toBeCloseTo(120, 4);
  });

  it('keeps camera shake subtle even at max trauma', () => {
    const cam = new Camera();
    cam.reset({ x: 320, y: 240 });
    cam.addTrauma(1);
    cam.update({ x: 320, y: 240 }, { x: 0, y: 0 }, 0.016, 0);
    const vt = cam.getTransform(1280, 720, 1, 1, false);
    expect(Math.abs(vt.shakeX)).toBeLessThanOrEqual(7);
    expect(Math.abs(vt.shakeY)).toBeLessThanOrEqual(7);
    expect(Math.abs(vt.shakeAngle)).toBeLessThanOrEqual(0.003);
  });

  it('Line of sight detects walls and visibility polygon returns closed perimeter', () => {
    const map = makeMiniMap();
    expect(hasLineOfSight(map, { x: 48, y: 144 }, { x: 112, y: 144 })).toBe(true);
    expect(hasLineOfSight(map, { x: 48, y: 144 }, { x: 240, y: 144 })).toBe(false);

    const poly = computeVisibilityPolygon(map, { x: 96, y: 144 }, 300, 36);
    expect(poly.length).toBeGreaterThanOrEqual(36);
  });

  it('provides distinct theme palettes for fortress, jungle, and temple', () => {
    expect(Object.keys(MAP_THEME_PALETTES).sort()).toEqual(['fortress', 'jungle', 'temple']);
    const jungle = getThemePalette('jungle');
    const temple = getThemePalette('temple');
    expect(jungle.floorBase).not.toBe(temple.floorBase);
    expect(jungle.wallTop).not.toBe(temple.wallTop);
    expect(getThemePalette(undefined).id).toBe('fortress');
    expect(formatZoneCode('zone-1')).toBe('A');
    expect(formatZoneCode('zone-2')).toBe('B');
    expect(formatZoneCode('zone-3')).toBe('C');
  });
});
