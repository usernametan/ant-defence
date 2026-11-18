import type { MapData, MapTheme, TileKind, Vec2 } from '../shared/types';

interface TileCoord {
  x: number;
  y: number;
}

class PreviewRng {
  private state: number;

  constructor(seed: number) {
    this.state = (seed >>> 0) || 0x6d2b79f5;
  }

  next(): number {
    this.state = (this.state + 0x6d2b79f5) >>> 0;
    let t = this.state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  int(min: number, max: number): number {
    return min + Math.floor(this.next() * (max - min + 1));
  }

  chance(probability: number): boolean {
    return this.next() < probability;
  }
}

const WIDTH = 60;
const HEIGHT = 40;
const TILE_SIZE = 32;
const PLAYER_BASE: TileCoord = { x: 4, y: 20 };
const ENEMY_BASE: TileCoord = { x: WIDTH - 5, y: 20 };

const ZONE_FORMATIONS: Record<MapTheme, TileCoord[][]> = {
  fortress: [
    [{ x: 15, y: 11 }, { x: 30, y: 20 }, { x: 44, y: 28 }],
    [{ x: 15, y: 29 }, { x: 30, y: 20 }, { x: 44, y: 11 }],
    [{ x: 19, y: 10 }, { x: 30, y: 28 }, { x: 41, y: 10 }],
    [{ x: 19, y: 30 }, { x: 30, y: 12 }, { x: 41, y: 30 }],
  ],
  jungle: [
    [{ x: 14, y: 15 }, { x: 29, y: 20 }, { x: 45, y: 24 }],
    [{ x: 17, y: 10 }, { x: 31, y: 22 }, { x: 43, y: 12 }],
    [{ x: 16, y: 26 }, { x: 30, y: 14 }, { x: 44, y: 27 }],
    [{ x: 18, y: 11 }, { x: 29, y: 28 }, { x: 42, y: 16 }],
  ],
  temple: [
    [{ x: 16, y: 17 }, { x: 30, y: 20 }, { x: 44, y: 23 }],
    [{ x: 18, y: 9 }, { x: 30, y: 20 }, { x: 42, y: 30 }],
    [{ x: 20, y: 29 }, { x: 30, y: 11 }, { x: 40, y: 29 }],
    [{ x: 16, y: 12 }, { x: 30, y: 26 }, { x: 44, y: 12 }],
  ],
};

function clampTileX(x: number): number {
  return Math.max(12, Math.min(WIDTH - 13, x));
}

function clampTileY(y: number): number {
  return Math.max(7, Math.min(HEIGHT - 8, y));
}

function selectZoneTiles(theme: MapTheme, rng: PreviewRng): TileCoord[] {
  const formations = ZONE_FORMATIONS[theme];
  const base = formations[rng.int(0, formations.length - 1)];
  const jx = rng.int(-2, 2);
  const jy = rng.int(-2, 2);
  const candidates = base.map((pt, idx) => {
    const signX = idx === 0 ? 1 : idx === 2 ? -1 : 0;
    const signY = idx === 1 ? 1 : idx === 0 ? 1 : -1;
    return {
      x: clampTileX(pt.x + jx * signX),
      y: clampTileY(pt.y + jy * signY),
    };
  });
  for (let i = 0; i < candidates.length; i += 1) {
    for (let j = i + 1; j < candidates.length; j += 1) {
      if (Math.hypot(candidates[i].x - candidates[j].x, candidates[i].y - candidates[j].y) < 10) {
        return base.map((p) => ({ ...p }));
      }
    }
  }
  return candidates;
}

function mirrorX(x: number): number {
  return WIDTH - 1 - x;
}

function setTile(tiles: TileKind[][], x: number, y: number, kind: TileKind): void {
  if (x <= 0 || y <= 0 || x >= WIDTH - 1 || y >= HEIGHT - 1) return;
  tiles[y][x] = kind;
}

function nearAnchor(x: number, y: number, anchors: TileCoord[], pad = 3): boolean {
  return anchors.some((a) => Math.abs(a.x - x) <= pad && Math.abs(a.y - y) <= pad);
}

function carveLine(tiles: TileKind[][], from: TileCoord, to: TileCoord, width: number): void {
  let x0 = from.x;
  let y0 = from.y;
  const x1 = to.x;
  const y1 = to.y;
  const dx = Math.abs(x1 - x0);
  const dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  const half = Math.floor(width / 2);

  for (;;) {
    for (let oy = -half; oy <= half; oy += 1) {
      for (let ox = -half; ox <= half; ox += 1) {
        setTile(tiles, x0 + ox, y0 + oy, 'floor');
      }
    }
    if (x0 === x1 && y0 === y1) break;
    const twice = 2 * err;
    if (twice >= dy) {
      err += dy;
      x0 += sx;
    }
    if (twice <= dx) {
      err += dx;
      y0 += sy;
    }
  }
}

function drawWallRect(
  tiles: TileKind[][],
  x: number,
  y: number,
  w: number,
  h: number,
  anchors: TileCoord[],
  kind: TileKind = 'wall',
): void {
  for (let dy = 0; dy < h; dy += 1) {
    for (let dx = 0; dx < w; dx += 1) {
      const tx = x + dx;
      const ty = y + dy;
      if (nearAnchor(tx, ty, anchors, 3)) continue;
      setTile(tiles, tx, ty, kind);
      setTile(tiles, mirrorX(tx), ty, kind);
    }
  }
}

function tileCenter(x: number, y: number): Vec2 {
  return { x: x * TILE_SIZE + TILE_SIZE / 2, y: y * TILE_SIZE + TILE_SIZE / 2 };
}

/**
 * Deterministic preview map generator mirroring the simulation layouts and
 * dynamic capture zone formations without importing src/sim/.
 */
export function generatePreviewMap(seed: number, theme: MapTheme = 'fortress'): MapData {
  const themeSalt = theme === 'jungle' ? 0x1a2b3c4d : theme === 'temple' ? 0x5e6f7a8b : 0;
  const rng = new PreviewRng((seed ^ 0x51f0a2c3 ^ themeSalt) >>> 0);
  const zoneTiles = selectZoneTiles(theme, rng);
  const anchors = [PLAYER_BASE, ENEMY_BASE, ...zoneTiles];

  const tiles: TileKind[][] = Array.from({ length: HEIGHT }, (_, r) =>
    Array.from({ length: WIDTH }, (_, c) =>
      r === 0 || c === 0 || r === HEIGHT - 1 || c === WIDTH - 1 ? 'wall' : 'floor',
    ),
  );

  if (theme === 'jungle') {
    const phase = rng.range(0, Math.PI * 2);
    for (let x = 8; x < WIDTH - 8; x += 1) {
      const curveY = Math.round(29 + Math.sin(x * 0.16 + phase) * 3.2 - (x - 30) * 0.14);
      for (let dy = -1; dy <= 1; dy += 1) {
        const ty = curveY + dy;
        if (!nearAnchor(x, ty, anchors, 3)) setTile(tiles, x, ty, 'water');
      }
    }
    const pondX = rng.int(14, 24);
    const pondY = rng.int(5, 8);
    for (let dy = -1; dy <= 1; dy += 1) {
      for (let dx = -2; dx <= 2; dx += 1) {
        if (dx * dx + dy * dy > 5) continue;
        if (!nearAnchor(pondX + dx, pondY + dy, anchors, 3)) {
          setTile(tiles, pondX + dx, pondY + dy, 'water');
          setTile(tiles, mirrorX(pondX + dx), pondY + dy, 'water');
        }
      }
    }
    for (const [wx, wy, ww, wh] of [
      [10, 8, 5, 1],
      [10, 9, 1, 4],
      [22, 11, 4, 1],
      [22, 12, 1, 3],
      [12, 27, 4, 1],
      [12, 24, 1, 3],
      [23, 27, 5, 1],
    ] as const) {
      drawWallRect(tiles, wx, wy, ww, wh, anchors);
    }
    for (let i = 0; i < 14; i += 1) {
      const cx = rng.int(8, Math.floor(WIDTH / 2) - 2);
      const cy = rng.int(4, HEIGHT - 5);
      const horizontal = rng.chance(0.5);
      const len = rng.int(2, 4);
      drawWallRect(tiles, cx, cy, horizontal ? len : 1, horizontal ? 1 : len, anchors);
    }
    for (let i = 0; i < 24; i += 1) {
      const cx = rng.int(7, Math.floor(WIDTH / 2) - 1);
      const cy = rng.int(4, HEIGHT - 5);
      if (nearAnchor(cx, cy, anchors, 3) || tiles[cy][cx] !== 'floor') continue;
      setTile(tiles, cx, cy, 'lowCover');
      setTile(tiles, mirrorX(cx), cy, 'lowCover');
    }
  } else if (theme === 'temple') {
    for (const [wx, wy, ww, wh] of [
      [9, 5, 8, 1],
      [9, 6, 1, 6],
      [9, 28, 1, 6],
      [9, 34, 8, 1],
      [19, 14, 5, 1],
      [19, 15, 1, 3],
      [20, 25, 4, 1],
      [23, 22, 1, 3],
    ] as const) {
      drawWallRect(tiles, wx, wy, ww, wh, anchors);
    }
    for (const py of [8, 16, 24, 31]) {
      for (const px of [13, 20, 26]) {
        if (rng.chance(0.32)) continue;
        drawWallRect(tiles, px, py, 1, 1, anchors);
      }
    }
    for (let i = 0; i < 8; i += 1) {
      const cx = rng.int(11, Math.floor(WIDTH / 2) - 3);
      const cy = rng.int(6, HEIGHT - 8);
      const w = rng.chance(0.5) ? rng.int(3, 5) : 1;
      const h = w === 1 ? rng.int(3, 5) : 1;
      drawWallRect(tiles, cx, cy, w, h, anchors);
    }
    for (const [ox, oy, ow, oh] of [
      [10, 6, 4, 3],
      [10, HEIGHT - 10, 4, 3],
    ] as const) {
      drawWallRect(tiles, ox, oy, ow, oh, anchors, 'water');
    }
    for (let i = 0; i < 20; i += 1) {
      const cx = rng.int(8, Math.floor(WIDTH / 2) - 1);
      const cy = rng.int(5, HEIGHT - 6);
      if (nearAnchor(cx, cy, anchors, 3) || tiles[cy][cx] !== 'floor') continue;
      setTile(tiles, cx, cy, 'lowCover');
      setTile(tiles, mirrorX(cx), cy, 'lowCover');
    }
  } else {
    for (let cluster = 0; cluster < 24; cluster += 1) {
      const cx = rng.int(3, WIDTH - 4);
      const cy = rng.int(3, HEIGHT - 4);
      if (nearAnchor(cx, cy, anchors)) continue;
      const radius = rng.int(1, 2);
      for (let dy = -radius; dy <= radius; dy += 1) {
        for (let dx = -radius; dx <= radius; dx += 1) {
          if (Math.abs(dx) + Math.abs(dy) > radius + 1) continue;
          if (!rng.chance(0.72)) continue;
          const x = cx + dx;
          const y = cy + dy;
          if (nearAnchor(x, y, anchors)) continue;
          setTile(tiles, x, y, 'wall');
          setTile(tiles, mirrorX(x), y, 'wall');
        }
      }
    }
    for (let patch = 0; patch < 6; patch += 1) {
      const cx = rng.int(6, WIDTH - 7);
      const cy = rng.int(4, HEIGHT - 5);
      if (nearAnchor(cx, cy, anchors)) continue;
      const radius = rng.int(1, 2);
      for (let dy = -radius; dy <= radius; dy += 1) {
        for (let dx = -radius; dx <= radius; dx += 1) {
          if (dx * dx + dy * dy > radius * radius + 1) continue;
          const x = cx + dx;
          const y = cy + dy;
          if (nearAnchor(x, y, anchors)) continue;
          setTile(tiles, x, y, 'water');
          setTile(tiles, mirrorX(x), y, 'water');
        }
      }
    }
    for (const lane of [8, 20, 31]) {
      for (let x = 7; x < WIDTH - 7; x += 1) {
        if (nearAnchor(x, lane, anchors) || !rng.chance(0.28)) continue;
        setTile(tiles, x, lane, 'lowCover');
      }
    }
  }

  for (const zone of zoneTiles) {
    for (let dy = -3; dy <= 3; dy += 1) {
      for (let dx = -3; dx <= 3; dx += 1) {
        const ring = Math.max(Math.abs(dx), Math.abs(dy));
        if (ring < 3) {
          if (tiles[zone.y + dy]?.[zone.x + dx] !== 'floor') {
            setTile(tiles, zone.x + dx, zone.y + dy, 'floor');
          }
          continue;
        }
        if (dx === 0 || dy === 0) continue;
        if (!rng.chance(0.62)) continue;
        setTile(tiles, zone.x + dx, zone.y + dy, 'lowCover');
      }
    }
  }

  const corridors: Array<[TileCoord, TileCoord]> = [
    [PLAYER_BASE, zoneTiles[0]],
    [zoneTiles[0], zoneTiles[1]],
    [zoneTiles[1], zoneTiles[2]],
    [zoneTiles[2], ENEMY_BASE],
    [PLAYER_BASE, zoneTiles[1]],
    [zoneTiles[1], ENEMY_BASE],
    [zoneTiles[0], zoneTiles[2]],
  ];
  for (const [from, to] of corridors) carveLine(tiles, from, to, 2);

  tiles[PLAYER_BASE.y][PLAYER_BASE.x] = 'spawnPlayer';
  tiles[ENEMY_BASE.y][ENEMY_BASE.x] = 'spawnEnemy';

  const coverHp: Record<string, number> = {};
  for (let r = 0; r < HEIGHT; r += 1) {
    for (let c = 0; c < WIDTH; c += 1) {
      if (tiles[r][c] === 'lowCover') coverHp[`${c},${r}`] = 100;
    }
  }

  return {
    seed,
    theme,
    width: WIDTH,
    height: HEIGHT,
    tileSize: TILE_SIZE,
    tiles,
    coverHp,
    zones: zoneTiles.map((tile, index) => ({
      id: `zone-${index + 1}`,
      center: tileCenter(tile.x, tile.y),
      radius: 112,
    })),
    bases: [
      { team: 'player', center: tileCenter(PLAYER_BASE.x, PLAYER_BASE.y), radius: 110, coreHp: 1000 },
      { team: 'enemy', center: tileCenter(ENEMY_BASE.x, ENEMY_BASE.y), radius: 110, coreHp: 1000 },
    ],
    crateSpawns: [],
  };
}
