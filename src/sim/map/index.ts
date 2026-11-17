import type { MapData, TileKind, Vec2 } from '../../shared/types';
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
const ZONE_TILES: TileCoord[] = [
  { x: 15, y: 11 },
  { x: 30, y: 20 },
  { x: 44, y: 28 },
];

function mirrorX(x: number): number {
  return MAP_WIDTH - 1 - x;
}

function setTile(tiles: TileKind[][], x: number, y: number, kind: TileKind): void {
  if (x <= 0 || y <= 0 || x >= MAP_WIDTH - 1 || y >= MAP_HEIGHT - 1) return;
  tiles[y][x] = kind;
}

function nearAnchor(x: number, y: number): boolean {
  const anchors = [PLAYER_BASE, ENEMY_BASE, ...ZONE_TILES];
  return anchors.some((a) => Math.abs(a.x - x) <= 3 && Math.abs(a.y - y) <= 3);
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

function addClusters(tiles: TileKind[][], rng: Rng): void {
  for (let cluster = 0; cluster < 24; cluster += 1) {
    const cx = rng.int(3, MAP_WIDTH - 4);
    const cy = rng.int(3, MAP_HEIGHT - 4);
    if (nearAnchor(cx, cy)) continue;
    const radius = rng.int(1, 2);
    for (let dy = -radius; dy <= radius; dy += 1) {
      for (let dx = -radius; dx <= radius; dx += 1) {
        if (Math.abs(dx) + Math.abs(dy) > radius + 1) continue;
        if (!rng.chance(0.72)) continue;
        const x = cx + dx;
        const y = cy + dy;
        setTile(tiles, x, y, 'wall');
        setTile(tiles, mirrorX(x), y, 'wall');
      }
    }
  }
}

function addWater(tiles: TileKind[][], rng: Rng): void {
  for (let patch = 0; patch < 6; patch += 1) {
    const cx = rng.int(6, MAP_WIDTH - 7);
    const cy = rng.int(4, MAP_HEIGHT - 5);
    if (nearAnchor(cx, cy)) continue;
    const radius = rng.int(1, 2);
    for (let dy = -radius; dy <= radius; dy += 1) {
      for (let dx = -radius; dx <= radius; dx += 1) {
        if (dx * dx + dy * dy > radius * radius + 1) continue;
        const x = cx + dx;
        const y = cy + dy;
        setTile(tiles, x, y, 'water');
        setTile(tiles, mirrorX(x), y, 'water');
      }
    }
  }
}

function addCover(tiles: TileKind[][], rng: Rng): void {
  // Cover rings around each zone, with cardinal gaps always open.
  for (const zone of ZONE_TILES) {
    for (let dy = -3; dy <= 3; dy += 1) {
      for (let dx = -3; dx <= 3; dx += 1) {
        const ring = Math.max(Math.abs(dx), Math.abs(dy));
        if (ring !== 3) continue;
        if (dx === 0 || dy === 0) continue; // keep cardinal entrances clear
        if (!rng.chance(0.65)) continue;
        setTile(tiles, zone.x + dx, zone.y + dy, 'lowCover');
      }
    }
  }

  // Short cover rows along the three travel lanes.
  for (const lane of [8, 20, 31]) {
    for (let x = 7; x < MAP_WIDTH - 7; x += 1) {
      if (nearAnchor(x, lane) || !rng.chance(0.28)) continue;
      setTile(tiles, x, lane, 'lowCover');
    }
  }
}

function carveCorridors(tiles: TileKind[][]): void {
  const corridors: Array<[TileCoord, TileCoord]> = [
    [PLAYER_BASE, ZONE_TILES[0]],
    [ZONE_TILES[0], ZONE_TILES[1]],
    [ZONE_TILES[1], ZONE_TILES[2]],
    [ZONE_TILES[2], ENEMY_BASE],
    [PLAYER_BASE, ZONE_TILES[1]],
    [ZONE_TILES[1], ENEMY_BASE],
    [ZONE_TILES[0], ZONE_TILES[2]],
  ];
  for (const [from, to] of corridors) carveLine(tiles, from, to, 2);
}

/** Safety net: guarantee every required anchor is reachable from the player base. */
function ensureConnectivity(tiles: TileKind[][]): void {
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
  const required = [PLAYER_BASE, ENEMY_BASE, ...ZONE_TILES];
  for (let attempt = 0; attempt < required.length + 2; attempt += 1) {
    const reached = floodFill(map, PLAYER_BASE);
    const missing = required.find((point) => !reached.has(tileKey(point.x, point.y)));
    if (!missing) return;
    carveLine(tiles, PLAYER_BASE, missing, 2);
  }
}

function buildCrateSpawns(tiles: TileKind[][]): Vec2[] {
  const spawns: Vec2[] = [];
  for (const zone of ZONE_TILES) {
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

/** Generate a fully connected, mirrored-ish arena. Same seed -> same map. */
export function generateMap(seed: number): MapData {
  const rng = new Rng(seed ^ 0x51f0a2c3);
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

  addClusters(tiles, rng);
  addWater(tiles, rng);
  addCover(tiles, rng);
  carveCorridors(tiles);
  ensureConnectivity(tiles);

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
    width: MAP_WIDTH,
    height: MAP_HEIGHT,
    tileSize: TILE_SIZE,
    tiles,
    coverHp,
    zones: ZONE_TILES.map((tile, index) => ({
      id: `zone-${index + 1}`,
      center: tileCenter(tile.x, tile.y),
      radius: 112,
    })),
    bases: [
      { team: 'player', center: tileCenter(PLAYER_BASE.x, PLAYER_BASE.y), radius: 110, coreHp: 1000 },
      { team: 'enemy', center: tileCenter(ENEMY_BASE.x, ENEMY_BASE.y), radius: 110, coreHp: 1000 },
    ],
    crateSpawns: buildCrateSpawns(tiles),
  };
}

export const MAP_ANCHORS = {
  playerBase: PLAYER_BASE,
  enemyBase: ENEMY_BASE,
  zoneTiles: ZONE_TILES,
};
