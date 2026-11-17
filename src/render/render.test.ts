import { describe, expect, it } from 'vitest';
import type { MapData } from '../shared/types';
import { Camera } from './camera';
import { PALETTE } from './palette';
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

  it('Line of sight detects walls and visibility polygon returns closed perimeter', () => {
    const map = makeMiniMap();
    expect(hasLineOfSight(map, { x: 48, y: 144 }, { x: 112, y: 144 })).toBe(true);
    expect(hasLineOfSight(map, { x: 48, y: 144 }, { x: 240, y: 144 })).toBe(false);

    const poly = computeVisibilityPolygon(map, { x: 96, y: 144 }, 300, 36);
    expect(poly.length).toBeGreaterThanOrEqual(36);
  });
});
