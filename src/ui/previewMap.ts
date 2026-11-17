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
 * Deterministic preview map generator with structured fortress walls,
 * sunken water courtyards, lane chokepoints, and clustered cover.
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

  const setSymWall = (c: number, r: number, w: number, h: number) => {
    for (let dr = 0; dr < h; dr += 1) {
      for (let dc = 0; dc < w; dc += 1) {
        if (tiles[r + dr]?.[c + dc]) tiles[r + dr][c + dc] = 'wall';
        const mc = width - 1 - (c + dc);
        const mr = height - 1 - (r + dr);
        if (tiles[mr]?.[mc]) tiles[mr][mc] = 'wall';
      }
    }
  };

  const setSymCover = (c: number, r: number, w: number, h: number) => {
    for (let dr = 0; dr < h; dr += 1) {
      for (let dc = 0; dc < w; dc += 1) {
        if (tiles[r + dr]?.[c + dc] === 'floor') tiles[r + dr][c + dc] = 'lowCover';
        const mc = width - 1 - (c + dc);
        const mr = height - 1 - (r + dr);
        if (tiles[mr]?.[mc] === 'floor') tiles[mr][mc] = 'lowCover';
      }
    }
  };

  // Sunken corner water courtyards enclosed by fortress walls (symmetric)
  const drawWaterBasin = (startC: number, startR: number, w: number, h: number) => {
    for (let dr = 0; dr < h; dr += 1) {
      for (let dc = 0; dc < w; dc += 1) {
        if (tiles[startR + dr]?.[startC + dc]) {
          tiles[startR + dr][startC + dc] = 'water';
        }
      }
    }
  };
  drawWaterBasin(6, 5, 8, 7);
  drawWaterBasin(width - 14, height - 12, 8, 7);
  drawWaterBasin(6, height - 11, 7, 6);
  drawWaterBasin(width - 13, 5, 7, 6);

  // Fortress L-walls & lane dividers framing the water basins and Zone B
  setSymWall(5, 4, 9, 1);
  setSymWall(5, 5, 1, 7);
  setSymWall(14, 4, 1, 4);
  setSymWall(5, 12, 5, 1);

  // Mid-arena tactical bastion walls (creating clear lane structure around A, B, C)
  setSymWall(22, 7, 1, 5);
  setSymWall(19, 13, 4, 1);
  setSymWall(25, 14, 3, 1);
  setSymWall(24, 15, 1, 3);
  setSymWall(21, 24, 5, 1);
  setSymWall(21, 25, 1, 4);
  setSymWall(14, 28, 1, 5);
  setSymWall(10, 32, 5, 1);

  // Seed-varied secondary tactical bunkers & supply crate clusters
  for (let i = 0; i < 6; i += 1) {
    const c = 11 + Math.floor(rng() * 14);
    const r = 7 + Math.floor(rng() * 25);
    if (rng() > 0.5) {
      setSymWall(c, r, 3, 1);
    } else {
      setSymCover(c, r, 2, 1);
    }
  }

  // Clustered crates & stone half-walls near mid-lanes
  setSymCover(24, 20, 1, 2);
  setSymCover(27, 17, 2, 1);
  setSymCover(18, 18, 2, 1);
  setSymCover(15, 11, 1, 2);
  setSymCover(26, 26, 2, 1);

  // Keep Zone A, B, C circles clear of walls/water
  const zoneSpecs = [
    { id: 'A', col: 18, row: 17 },
    { id: 'B', col: 30, row: 20 },
    { id: 'C', col: 42, row: 23 },
  ];

  for (const z of zoneSpecs) {
    for (let dr = -3; dr <= 3; dr += 1) {
      for (let dc = -3; dc <= 3; dc += 1) {
        const cell = tiles[z.row + dr]?.[z.col + dc];
        if (cell === 'wall' || cell === 'water') {
          tiles[z.row + dr][z.col + dc] = 'floor';
        }
      }
    }
  }

  // Spawn pads
  for (let r = 18; r <= 21; r += 1) {
    for (let c = 2; c <= 4; c += 1) {
      tiles[r][c] = 'spawnPlayer';
    }
    for (let c = width - 5; c <= width - 3; c += 1) {
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
        center: { x: 3.5 * tileSize, y: 20 * tileSize },
        radius: 110,
        coreHp: 500,
      },
      {
        team: 'enemy',
        center: { x: (width - 3.5) * tileSize, y: 20 * tileSize },
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
