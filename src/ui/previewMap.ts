import type { MapData, TileKind } from '../shared/types';

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Deterministic preview map generator for UI menus and the dev showcase.
 * Does not import src/sim/ to respect track ownership boundaries.
 */
export function generatePreviewMap(seed: number): MapData {
  const width = 60;
  const height = 40;
  const tileSize = 32;
  const rng = mulberry32(seed || 1337);

  const tiles: TileKind[][] = Array.from({ length: height }, (_, r) =>
    Array.from({ length: width }, (_, c) => {
      if (r === 0 || c === 0 || r === height - 1 || c === width - 1) {
        return 'wall';
      }
      return 'floor';
    }),
  );

  // Symmetric tactical blocks
  for (let i = 0; i < 24; i += 1) {
    const c = 7 + Math.floor(rng() * 21);
    const r = 4 + Math.floor(rng() * 32);
    const kind: TileKind = rng() > 0.45 ? 'lowCover' : 'wall';
    const mc = width - 1 - c;
    const mr = height - 1 - r;
    tiles[r][c] = kind;
    tiles[mr][mc] = kind;
    if (rng() > 0.4 && c + 1 < width - 2) {
      tiles[r][c + 1] = kind;
      tiles[mr][mc - 1] = kind;
    }
  }

  // Water pools in flanks
  for (let w = 0; w < 2; w += 1) {
    const baseR = w === 0 ? 7 : height - 11;
    const baseC = w === 0 ? width - 18 : 14;
    for (let dr = 0; dr < 4; dr += 1) {
      for (let dc = 0; dc < 5; dc += 1) {
        if (tiles[baseR + dr]?.[baseC + dc] === 'floor') {
          tiles[baseR + dr][baseC + dc] = 'water';
        }
      }
    }
  }

  // Clear zone centers
  const zoneSpecs = [
    { id: 'A', col: 18, row: 11 },
    { id: 'B', col: 30, row: 20 },
    { id: 'C', col: 42, row: 29 },
  ];

  for (const z of zoneSpecs) {
    for (let dr = -3; dr <= 3; dr += 1) {
      for (let dc = -3; dc <= 3; dc += 1) {
        if (tiles[z.row + dr]?.[z.col + dc]) {
          tiles[z.row + dr][z.col + dc] = 'floor';
        }
      }
    }
  }

  // Spawn pads
  for (let r = 18; r <= 21; r += 1) {
    for (let c = 3; c <= 5; c += 1) {
      tiles[r][c] = 'spawnPlayer';
    }
    for (let c = width - 6; c <= width - 4; c += 1) {
      tiles[r][c] = 'spawnEnemy';
    }
  }

  const coverHp: Record<string, number> = {};
  for (let r = 0; r < height; r += 1) {
    for (let c = 0; c < width; c += 1) {
      if (tiles[r][c] === 'lowCover') {
        coverHp[`${c},${r}`] = 100;
      }
    }
  }

  return {
    seed,
    width,
    height,
    tileSize,
    tiles,
    coverHp,
    zones: zoneSpecs.map((z) => ({
      id: z.id,
      center: { x: (z.col + 0.5) * tileSize, y: (z.row + 0.5) * tileSize },
      radius: 112,
    })),
    bases: [
      {
        team: 'player',
        center: { x: 4.5 * tileSize, y: 20 * tileSize },
        radius: 110,
        coreHp: 500,
      },
      {
        team: 'enemy',
        center: { x: (width - 4.5) * tileSize, y: 20 * tileSize },
        radius: 110,
        coreHp: 500,
      },
    ],
    crateSpawns: [
      { x: 30 * tileSize, y: 12 * tileSize },
      { x: 30 * tileSize, y: 28 * tileSize },
    ],
  };
}
