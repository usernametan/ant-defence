import type { MapData, MapTheme, TileKind, Vec2 } from '../../shared/types';
import { COVER_HP, MAP_HEIGHT, MAP_WIDTH, TILE_SIZE } from '../constants';
import { Rng } from '../rng';

export interface TileCoord {
  x: number;
  y: number;
}

export function tileKey(x: number, y: number): string {
  return `${x},${y}`;
}

export function worldToTile(pos: Vec2): TileCoord {
  return {
    x: Math.floor(pos.x / TILE_SIZE),
    y: Math.floor(pos.y / TILE_SIZE),
  };
}

export function tileCenter(x: number, y: number): Vec2 {
  return {
    x: x * TILE_SIZE + TILE_SIZE / 2,
    y: y * TILE_SIZE + TILE_SIZE / 2,
  };
}

export function inBounds(map: MapData, x: number, y: number): boolean {
  return x >= 0 && y >= 0 && x < map.width && y < map.height;
}

export function tileBlocks(kind: TileKind, coverHpLeft = COVER_HP): boolean {
  return kind === 'wall' || (kind === 'lowCover' && coverHpLeft > 0);
}

/** A tile is walkable when it exists and is not a wall or intact low cover. */
export function isPassable(map: MapData, x: number, y: number): boolean {
  if (!inBounds(map, x, y)) return false;
  const kind = map.tiles[y][x];
  if (kind === 'lowCover') return (map.coverHp[tileKey(x, y)] ?? COVER_HP) <= 0;
  return kind !== 'wall';
}

/** Breadth-first flood fill over walkable tiles. */
export function floodFill(map: MapData, start: TileCoord): Set<string> {
  const visited = new Set<string>();
  if (!isPassable(map, start.x, start.y)) return visited;
  const queue: TileCoord[] = [start];
  visited.add(tileKey(start.x, start.y));
  let head = 0;
  while (head < queue.length) {
    const current = queue[head++];
    const neighbours: TileCoord[] = [
      { x: current.x + 1, y: current.y },
      { x: current.x - 1, y: current.y },
      { x: current.x, y: current.y + 1 },
      { x: current.x, y: current.y - 1 },
    ];
    for (const next of neighbours) {
      const key = tileKey(next.x, next.y);
      if (visited.has(key) || !isPassable(map, next.x, next.y)) continue;
      visited.add(key);
      queue.push(next);
    }
  }
  return visited;
}

/** Connectivity check used by generation and tests. */
export function areTilesConnected(map: MapData, points: TileCoord[]): boolean {
  if (points.length === 0) return true;
  const reached = floodFill(map, points[0]);
  return points.every((point) => reached.has(tileKey(point.x, point.y)));
}

const PLAYER_BASE: TileCoord = { x: 4, y: 20 };
const ENEMY_BASE: TileCoord = { x: MAP_WIDTH - 5, y: 20 };

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
  slumside: [
    [{ x: 16, y: 17 }, { x: 30, y: 23 }, { x: 44, y: 19 }],
    [{ x: 16, y: 23 }, { x: 30, y: 17 }, { x: 44, y: 21 }],
    [{ x: 17, y: 14 }, { x: 30, y: 22 }, { x: 43, y: 25 }],
    [{ x: 17, y: 26 }, { x: 30, y: 18 }, { x: 43, y: 15 }],
  ],
};

function clampTileX(x: number): number {
  return Math.max(12, Math.min(MAP_WIDTH - 13, x));
}

function clampTileY(y: number): number {
  return Math.max(7, Math.min(MAP_HEIGHT - 8, y));
}

function selectZoneTiles(theme: MapTheme, rng: Rng): TileCoord[] {
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
  // Verify pairwise spacing (>= 10 tiles) so capture radii never overlap
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
  return MAP_WIDTH - 1 - x;
}

function setTile(tiles: TileKind[][], x: number, y: number, kind: TileKind): void {
  if (x <= 0 || y <= 0 || x >= MAP_WIDTH - 1 || y >= MAP_HEIGHT - 1) return;
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

function buildFortressTerrain(tiles: TileKind[][], rng: Rng, anchors: TileCoord[]): void {
  for (let cluster = 0; cluster < 24; cluster += 1) {
    const cx = rng.int(3, MAP_WIDTH - 4);
    const cy = rng.int(3, MAP_HEIGHT - 4);
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
    const cx = rng.int(6, MAP_WIDTH - 7);
    const cy = rng.int(4, MAP_HEIGHT - 5);
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
    for (let x = 7; x < MAP_WIDTH - 7; x += 1) {
      if (nearAnchor(x, lane, anchors) || !rng.chance(0.28)) continue;
      setTile(tiles, x, lane, 'lowCover');
    }
  }
}

function buildJungleTerrain(tiles: TileKind[][], rng: Rng, anchors: TileCoord[]): void {
  // Winding jungle river cutting across lower-right / mid-diagonal + upper-left creek
  const phase = rng.range(0, Math.PI * 2);
  for (let x = 8; x < MAP_WIDTH - 8; x += 1) {
    const curveY = Math.round(29 + Math.sin(x * 0.16 + phase) * 3.2 - (x - 30) * 0.14);
    for (let dy = -1; dy <= 1; dy += 1) {
      const ty = curveY + dy;
      if (!nearAnchor(x, ty, anchors, 3)) {
        setTile(tiles, x, ty, 'water');
      }
    }
  }
  // Small mirrored mossy pond near top flank
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

  // Ruined mossy stone L-walls & outpost fragments (mirrored)
  const ruinedWalls: Array<[number, number, number, number]> = [
    [10, 8, 5, 1],
    [10, 9, 1, 4],
    [22, 11, 4, 1],
    [22, 12, 1, 3],
    [12, 27, 4, 1],
    [12, 24, 1, 3],
    [23, 27, 5, 1],
  ];
  for (const [wx, wy, ww, wh] of ruinedWalls) {
    drawWallRect(tiles, wx, wy, ww, wh, anchors);
  }
  // Seed-varied ruined stone pillars & overgrown alcoves
  for (let i = 0; i < 14; i += 1) {
    const cx = rng.int(8, Math.floor(MAP_WIDTH / 2) - 2);
    const cy = rng.int(4, MAP_HEIGHT - 5);
    const horizontal = rng.chance(0.5);
    const len = rng.int(2, 4);
    drawWallRect(tiles, cx, cy, horizontal ? len : 1, horizontal ? 1 : len, anchors);
  }

  // Scattered wooden crates & jungle barricades along clearings
  for (let i = 0; i < 24; i += 1) {
    const cx = rng.int(7, Math.floor(MAP_WIDTH / 2) - 1);
    const cy = rng.int(4, MAP_HEIGHT - 5);
    if (nearAnchor(cx, cy, anchors, 3) || tiles[cy][cx] !== 'floor') continue;
    setTile(tiles, cx, cy, 'lowCover');
    setTile(tiles, mirrorX(cx), cy, 'lowCover');
  }
}

function buildTempleTerrain(tiles: TileKind[][], rng: Rng, anchors: TileCoord[]): void {
  // Architectural sandstone temple rooms, colonnades & courtyards
  const templeWalls: Array<[number, number, number, number]> = [
    [9, 5, 8, 1],
    [9, 6, 1, 6],
    [9, 28, 1, 6],
    [9, 34, 8, 1],
    [19, 14, 5, 1],
    [19, 15, 1, 3],
    [20, 25, 4, 1],
    [23, 22, 1, 3],
  ];
  for (const [wx, wy, ww, wh] of templeWalls) {
    drawWallRect(tiles, wx, wy, ww, wh, anchors);
  }

  // Symmetrical temple colonnade pillars (1x1 fluted columns with real LoS/collision)
  const pillarRows = [8, 16, 24, 31];
  const pillarCols = [13, 20, 26];
  for (const py of pillarRows) {
    for (const px of pillarCols) {
      if (rng.chance(0.32)) continue;
      drawWallRect(tiles, px, py, 1, 1, anchors);
    }
  }

  // Seed-varied inner sanctuary walls
  for (let i = 0; i < 8; i += 1) {
    const cx = rng.int(11, Math.floor(MAP_WIDTH / 2) - 3);
    const cy = rng.int(6, MAP_HEIGHT - 8);
    const w = rng.chance(0.5) ? rng.int(3, 5) : 1;
    const h = w === 1 ? rng.int(3, 5) : 1;
    drawWallRect(tiles, cx, cy, w, h, anchors);
  }

  // Sacred turquoise oasis basins in outer temple alcoves
  const oasisPairs: Array<[number, number, number, number]> = [
    [10, 6, 4, 3],
    [10, MAP_HEIGHT - 10, 4, 3],
  ];
  for (const [ox, oy, ow, oh] of oasisPairs) {
    drawWallRect(tiles, ox, oy, ow, oh, anchors, 'water');
  }

  // Carved sandstone half-walls & temple supply crates
  for (let i = 0; i < 20; i += 1) {
    const cx = rng.int(8, Math.floor(MAP_WIDTH / 2) - 1);
    const cy = rng.int(5, MAP_HEIGHT - 6);
    if (nearAnchor(cx, cy, anchors, 3) || tiles[cy][cx] !== 'floor') continue;
    setTile(tiles, cx, cy, 'lowCover');
    setTile(tiles, mirrorX(cx), cy, 'lowCover');
  }
}

function isSlumFlankCorridor(x: number): boolean {
  return (x >= 6 && x <= 8) || (x >= 51 && x <= 53);
}

function buildSlumsideTerrain(
  tiles: TileKind[][],
  rng: Rng,
  anchors: TileCoord[],
): void {
  const drawSlumBlock = (
    x: number,
    y: number,
    w: number,
    h: number,
    kind: TileKind = 'wall',
  ): void => {
    for (let dy = 0; dy < h; dy += 1) {
      for (let dx = 0; dx < w; dx += 1) {
        const tx = x + dx;
        const ty = y + dy;
        const mx = mirrorX(tx);
        if (!nearAnchor(tx, ty, anchors, 3) && !isSlumFlankCorridor(tx)) {
          setTile(tiles, tx, ty, kind);
        }
        if (!nearAnchor(mx, ty, anchors, 3) && !isSlumFlankCorridor(mx)) {
          setTile(tiles, mx, ty, kind);
        }
      }
    }
  };

  const shantyBlocks: Array<[number, number, number, number]> = [
    // Upper staggered blocks separated by 2-tile alleys
    [11, 2, 4, 4],
    [17, 2, 4, 4],
    [23, 2, 5, 4],
    // Mid-upper residential & iconic central-north concrete compound above Zone B
    [10, 8, 4, 4],
    [24, 10, 5, 5],
    // Mid-lower compounds
    [10, 24, 5, 4],
    [18, 25, 4, 4],
    [25, 29, 4, 4],
    // Bottom staggered row
    [10, 33, 4, 4],
    [16, 32, 4, 4],
    [22, 33, 5, 4],
  ];
  for (const [wx, wy, ww, wh] of shantyBlocks) {
    drawSlumBlock(wx, wy, ww, wh);
  }

  // Seed-varied compact micro-shanties creating dense alleyways
  for (let i = 0; i < 6; i += 1) {
    const cx = rng.int(10, 27);
    const cy = rng.int(6, 32);
    const w = rng.int(2, 3);
    const h = rng.int(2, 3);
    drawSlumBlock(cx, cy, w, h);
  }

  // Two small recessed monsoon storm drains
  drawSlumBlock(16, 7, 2, 2, 'water');
  drawSlumBlock(16, 31, 2, 2, 'water');

  // Destructible wooden crate barricades across open alleyways
  for (let i = 0; i < 26; i += 1) {
    const cx = rng.int(9, 28);
    const cy = rng.int(5, 34);
    if (nearAnchor(cx, cy, anchors, 3) || isSlumFlankCorridor(cx)) continue;
    if (tiles[cy][cx] === 'floor') {
      setTile(tiles, cx, cy, 'lowCover');
    }
    const mx = mirrorX(cx);
    if (!nearAnchor(mx, cy, anchors, 3) && !isSlumFlankCorridor(mx) && tiles[cy][mx] === 'floor') {
      setTile(tiles, mx, cy, 'lowCover');
    }
  }
}

function placeSlumZoneBProps(tiles: TileKind[][], zoneTiles: TileCoord[]): void {
  // Signature street props flanking Zone B: auto-rickshaw (lower-left) & market stall (lower-right)
  const zoneB = zoneTiles[1];
  if (!zoneB) return;
  const spots: Array<[number, number]> = [
    [zoneB.x - 4, zoneB.y + 2],
    [zoneB.x + 4, zoneB.y + 2],
  ];
  for (const [sx, sy] of spots) {
    if (sx > 1 && sx < MAP_WIDTH - 2 && sy > 1 && sy < MAP_HEIGHT - 2 && tiles[sy][sx] === 'floor') {
      setTile(tiles, sx, sy, 'lowCover');
    }
  }
}

function carveSlumCorridors(tiles: TileKind[][], zoneTiles: TileCoord[]): void {
  const corridors: Array<[TileCoord, TileCoord]> = [
    [PLAYER_BASE, { x: 11, y: 20 }],
    [{ x: 11, y: 20 }, zoneTiles[0]],
    [zoneTiles[0], { x: zoneTiles[0].x, y: 21 }],
    [{ x: zoneTiles[0].x, y: 21 }, zoneTiles[1]],
    [zoneTiles[1], { x: zoneTiles[2].x, y: 21 }],
    [{ x: zoneTiles[2].x, y: 21 }, zoneTiles[2]],
    [zoneTiles[2], { x: 48, y: 20 }],
    [{ x: 48, y: 20 }, ENEMY_BASE],
    // Upper flanking street above the central-north compound
    [{ x: 8, y: 20 }, { x: 8, y: 7 }],
    [{ x: 8, y: 7 }, { x: 51, y: 7 }],
    [{ x: 51, y: 7 }, { x: 51, y: 20 }],
    [zoneTiles[0], { x: zoneTiles[0].x, y: 7 }],
    [zoneTiles[2], { x: zoneTiles[2].x, y: 7 }],
    // Lower flanking street below Zone B
    [{ x: 8, y: 20 }, { x: 8, y: 30 }],
    [{ x: 8, y: 30 }, { x: 51, y: 30 }],
    [{ x: 51, y: 30 }, { x: 51, y: 20 }],
  ];
  for (const [from, to] of corridors) carveLine(tiles, from, to, 2);
}

function addZoneCoverRings(tiles: TileKind[][], rng: Rng, zoneTiles: TileCoord[]): void {
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
        if (dx === 0 || dy === 0) continue; // keep cardinal entrances clear
        if (!rng.chance(0.62)) continue;
        setTile(tiles, zone.x + dx, zone.y + dy, 'lowCover');
      }
    }
  }
}

function carveCorridors(tiles: TileKind[][], zoneTiles: TileCoord[]): void {
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
}

/** Safety net: guarantee every required anchor is reachable from the player base. */
function ensureConnectivity(tiles: TileKind[][], zoneTiles: TileCoord[]): void {
  const map: MapData = {
    seed: 0,
    tiles,
    width: MAP_WIDTH,
    height: MAP_HEIGHT,
    tileSize: TILE_SIZE,
    coverHp: {},
    zones: [],
    bases: [],
    crateSpawns: [],
  };
  const required = [PLAYER_BASE, ENEMY_BASE, ...zoneTiles];
  for (let attempt = 0; attempt < required.length + 2; attempt += 1) {
    const reached = floodFill(map, PLAYER_BASE);
    const missing = required.find((point) => !reached.has(tileKey(point.x, point.y)));
    if (!missing) return;
    carveLine(tiles, PLAYER_BASE, missing, 2);
  }
}

function buildCrateSpawns(tiles: TileKind[][], zoneTiles: TileCoord[]): Vec2[] {
  const spawns: Vec2[] = [];
  for (const zone of zoneTiles) {
    for (const [dx, dy] of [[4, -3], [-4, 3]] as const) {
      let tileX = zone.x + dx;
      let tileY = zone.y + dy;
      if (tileX <= 1 || tileX >= MAP_WIDTH - 2 || tileY <= 1 || tileY >= MAP_HEIGHT - 2) {
        tileX = zone.x;
        tileY = zone.y;
      }
      if (tiles[tileY][tileX] !== 'floor') {
        tiles[tileY][tileX] = 'floor';
      }
      spawns.push(tileCenter(tileX, tileY));
    }
  }
  return spawns;
}

/** Generate a fully connected, themed arena with dynamic zone placement. */
export function generateMap(seed: number, theme: MapTheme = 'fortress'): MapData {
  const themeSalt =
    theme === 'jungle'
      ? 0x1a2b3c4d
      : theme === 'temple'
        ? 0x5e6f7a8b
        : theme === 'slumside'
          ? 0x3b7c9d2e
          : 0;
  const rng = new Rng((seed ^ 0x51f0a2c3 ^ themeSalt) >>> 0);
  const zoneTiles = selectZoneTiles(theme, rng);
  const anchors = [PLAYER_BASE, ENEMY_BASE, ...zoneTiles];

  const tiles: TileKind[][] = [];
  for (let y = 0; y < MAP_HEIGHT; y += 1) {
    const row: TileKind[] = [];
    for (let x = 0; x < MAP_WIDTH; x += 1) {
      row.push(
        x === 0 || y === 0 || x === MAP_WIDTH - 1 || y === MAP_HEIGHT - 1
          ? 'wall'
          : 'floor',
      );
    }
    tiles.push(row);
  }

  if (theme === 'jungle') {
    buildJungleTerrain(tiles, rng, anchors);
  } else if (theme === 'temple') {
    buildTempleTerrain(tiles, rng, anchors);
  } else if (theme === 'slumside') {
    buildSlumsideTerrain(tiles, rng, anchors);
  } else {
    buildFortressTerrain(tiles, rng, anchors);
  }

  addZoneCoverRings(tiles, rng, zoneTiles);
  if (theme === 'slumside') {
    carveSlumCorridors(tiles, zoneTiles);
    ensureConnectivity(tiles, zoneTiles);
    placeSlumZoneBProps(tiles, zoneTiles);
  } else {
    carveCorridors(tiles, zoneTiles);
    ensureConnectivity(tiles, zoneTiles);
  }

  tiles[PLAYER_BASE.y][PLAYER_BASE.x] = 'spawnPlayer';
  tiles[ENEMY_BASE.y][ENEMY_BASE.x] = 'spawnEnemy';

  const coverHp: Record<string, number> = {};
  for (let y = 0; y < MAP_HEIGHT; y += 1) {
    for (let x = 0; x < MAP_WIDTH; x += 1) {
      if (tiles[y][x] === 'lowCover') coverHp[tileKey(x, y)] = COVER_HP;
    }
  }

  return {
    seed,
    theme,
    width: MAP_WIDTH,
    height: MAP_HEIGHT,
    tileSize: TILE_SIZE,
    tiles,
    coverHp,
    zones: zoneTiles.map((tile, index) => ({
      id: `zone-${index + 1}`,
      center: tileCenter(tile.x, tile.y),
      radius: 112,
    })),
    bases: [
      { team: 'player', center: tileCenter(PLAYER_BASE.x, PLAYER_BASE.y), radius: 110, coreHp: 400 },
      { team: 'enemy', center: tileCenter(ENEMY_BASE.x, ENEMY_BASE.y), radius: 110, coreHp: 400 },
    ],
    crateSpawns: buildCrateSpawns(tiles, zoneTiles),
  };
}

export const MAP_ANCHORS = {
  playerBase: PLAYER_BASE,
  enemyBase: ENEMY_BASE,
  zoneTiles: ZONE_FORMATIONS.fortress[0],
};
