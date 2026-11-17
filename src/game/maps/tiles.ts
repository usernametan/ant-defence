/**
 * Tile vocabulary shared by the map builder and the procedural tileset.
 * Values index directly into the generated 4x4 village tileset atlas.
 */
export const TILE_SIZE = 16;

export const TILE = {
  GRASS: 0,
  GRASS_FLOWERS: 1,
  PATH: 2,
  PATH_PEBBLE: 3,
  WATER: 4,
  WATER_DEEP: 5,
  SHORE: 6,
  PLAZA: 7,
  FIELD: 8,
  CLIFF: 9,
  GRASS_DARK: 10,
  PLAZA_CRACKED: 11,
  GRASS_PATH: 12,
  GRASS_TUFTS: 13,
  DIRT: 14,
  FOREST_FLOOR: 15,
} as const;

export type TileId = (typeof TILE)[keyof typeof TILE];

export const TILE_COUNT = 16;

const SOLID_TILES: ReadonlySet<number> = new Set([
  TILE.WATER,
  TILE.WATER_DEEP,
  TILE.CLIFF,
  TILE.FOREST_FLOOR,
]);

export function isSolidTile(tile: number): boolean {
  if (tile < 0) return false;
  return SOLID_TILES.has(tile);
}

export function isWaterTile(tile: number): boolean {
  return tile === TILE.WATER || tile === TILE.WATER_DEEP;
}
