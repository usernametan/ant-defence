import { TILE, TILE_SIZE } from './tiles';

export const MAP_WIDTH = 56;
export const MAP_HEIGHT = 38;

export type PropKind = 'hut' | 'tree' | 'treeLarge' | 'well' | 'rock' | 'lamp';

export interface VillageProp {
  kind: PropKind;
  /** Tile column of the prop's bottom-centre anchor. */
  tileX: number;
  /** Tile row of the prop's bottom-centre anchor. */
  tileY: number;
  variant?: number;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface WorldPoint {
  x: number;
  y: number;
}

export interface VillageMap {
  width: number;
  height: number;
  tiles: number[][];
  props: VillageProp[];
  solids: Rect[];
  playerSpawn: WorldPoint;
  sonSpawn: WorldPoint;
  villagerSpawns: WorldPoint[];
  maskedSpawn: WorldPoint;
  wellPoint: WorldPoint;
  riverCenter: WorldPoint;
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function tileToWorld(tileX: number, tileY: number): WorldPoint {
  return {
    x: tileX * TILE_SIZE + TILE_SIZE / 2,
    y: tileY * TILE_SIZE + TILE_SIZE,
  };
}

function setTile(tiles: number[][], x: number, y: number, tile: number): void {
  if (y < 0 || y >= tiles.length) return;
  const row = tiles[y];
  if (!row || x < 0 || x >= row.length) return;
  row[x] = tile;
}

function fillRect(
  tiles: number[][],
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  tile: number,
): void {
  for (let y = y0; y <= y1; y += 1) {
    for (let x = x0; x <= x1; x += 1) {
      setTile(tiles, x, y, tile);
    }
  }
}

function propSolids(prop: VillageProp): Rect[] {
  const point = tileToWorld(prop.tileX, prop.tileY);
  switch (prop.kind) {
    case 'hut':
      return [
        {
          x: point.x - 22,
          y: point.y - 18,
          width: 44,
          height: 18,
        },
      ];
    case 'well':
      return [
        {
          x: point.x - 10,
          y: point.y - 12,
          width: 20,
          height: 12,
        },
      ];
    case 'tree':
      return [
        {
          x: point.x - 4,
          y: point.y - 6,
          width: 8,
          height: 6,
        },
      ];
    case 'treeLarge':
      return [
        {
          x: point.x - 6,
          y: point.y - 8,
          width: 12,
          height: 8,
        },
      ];
    case 'rock':
      return [
        {
          x: point.x - 7,
          y: point.y - 7,
          width: 14,
          height: 7,
        },
      ];
    case 'lamp':
      return [
        {
          x: point.x - 2,
          y: point.y - 4,
          width: 4,
          height: 4,
        },
      ];
    default:
      return [];
  }
}

function isDecorGround(tile: number): boolean {
  return (
    tile === TILE.GRASS ||
    tile === TILE.GRASS_FLOWERS ||
    tile === TILE.GRASS_TUFTS ||
    tile === TILE.GRASS_DARK ||
    tile === TILE.FOREST_FLOOR ||
    tile === TILE.GRASS_PATH
  );
}

function canPlaceProp(tiles: number[][], x: number, y: number, kind: PropKind): boolean {
  const tile = tiles[y]?.[x];
  if (tile === undefined) return false;
  if (kind === 'lamp' || kind === 'rock') {
    return isDecorGround(tile) || tile === TILE.PLAZA || tile === TILE.PLAZA_CRACKED;
  }
  return isDecorGround(tile);
}

/**
 * Builds the Act 1 village entirely in code: a 2D tile grid plus decorative
 * props with hand-authored collision footprints.
 */
export function buildVillageMap(): VillageMap {
  const random = mulberry32(0xa1c4e);
  const tiles: number[][] = Array.from({ length: MAP_HEIGHT }, () =>
    Array.from({ length: MAP_WIDTH }, () => TILE.GRASS),
  );

  // Sky strip above the treeline: -1 means "no tile" so the parallax shows.
  for (let y = 0; y < 11; y += 1) {
    for (let x = 0; x < MAP_WIDTH; x += 1) {
      setTile(tiles, x, y, -1);
    }
  }

  // Grass texture variation.
  for (let y = 11; y < MAP_HEIGHT; y += 1) {
    for (let x = 0; x < MAP_WIDTH; x += 1) {
      const roll = random();
      let tile: number = TILE.GRASS;
      if (roll < 0.055) tile = TILE.GRASS_FLOWERS;
      else if (roll < 0.14) tile = TILE.GRASS_TUFTS;
      else if (roll < 0.2) tile = TILE.GRASS_DARK;
      setTile(tiles, x, y, tile);
    }
  }

  // Forest border (top, left, bottom). The right edge is the river.
  for (let y = 11; y < MAP_HEIGHT; y += 1) {
    for (let x = 0; x < MAP_WIDTH; x += 1) {
      const topBorder = y <= 12;
      const leftBorder = x <= 1;
      const bottomBorder = y >= MAP_HEIGHT - 2;
      if (topBorder || leftBorder || bottomBorder) {
        setTile(tiles, x, y, TILE.FOREST_FLOOR);
      }
    }
  }

  // River and shore on the right edge.
  for (let y = 11; y < MAP_HEIGHT; y += 1) {
    for (let x = MAP_WIDTH - 8; x < MAP_WIDTH; x += 1) {
      if (x >= MAP_WIDTH - 7) {
        setTile(tiles, x, y, x >= MAP_WIDTH - 3 ? TILE.WATER_DEEP : TILE.WATER);
      } else if (x === MAP_WIDTH - 8) {
        setTile(tiles, x, y, TILE.SHORE);
      }
    }
  }

  // Main east-west road and the central north-south road.
  fillRect(tiles, 6, 20, 47, 21, TILE.PATH);
  fillRect(tiles, 25, 13, 26, 33, TILE.PATH);

  // Plaza around the well.
  fillRect(tiles, 22, 14, 30, 21, TILE.PLAZA);
  fillRect(tiles, 23, 15, 29, 20, TILE.PLAZA);

  // River ghat: stone steps down to the water.
  fillRect(tiles, 46, 20, 48, 22, TILE.PLAZA);
  setTile(tiles, 47, 21, TILE.PLAZA_CRACKED);
  setTile(tiles, 48, 22, TILE.SHORE);

  // Branches to each hut door.
  fillRect(tiles, 13, 19, 15, 20, TILE.PATH);
  fillRect(tiles, 14, 22, 15, 28, TILE.PATH);
  fillRect(tiles, 8, 14, 9, 20, TILE.PATH);
  fillRect(tiles, 36, 13, 37, 20, TILE.PATH);
  fillRect(tiles, 34, 25, 35, 34, TILE.PATH);

  // Fields on the south-west, ringed by packed dirt.
  fillRect(tiles, 3, 28, 12, 35, TILE.DIRT);
  fillRect(tiles, 4, 29, 11, 34, TILE.FIELD);
  for (let y = 31; y <= 32; y += 1) {
    for (let x = 5; x <= 10; x += 1) {
      if ((x + y) % 3 === 0) setTile(tiles, x, y, TILE.DIRT);
    }
  }

  // Path / plaza edge softness.
  const edgeSource = tiles.map((row) => [...row]);
  for (let y = 13; y < MAP_HEIGHT - 2; y += 1) {
    for (let x = 2; x < MAP_WIDTH - 8; x += 1) {
      const above = edgeSource[y - 1]?.[x];
      const here = edgeSource[y]?.[x];
      const walkableEdge =
        above === TILE.PATH ||
        above === TILE.PLAZA ||
        above === TILE.DIRT;
      if (walkableEdge && isDecorGround(here) && random() < 0.45) {
        setTile(tiles, x, y, TILE.GRASS_PATH);
      }
    }
  }

  // Randomise path/plaza/water variants for texture break-up.
  for (let y = 11; y < MAP_HEIGHT; y += 1) {
    for (let x = 0; x < MAP_WIDTH; x += 1) {
      const tile = tiles[y]?.[x];
      if (tile === TILE.PATH && random() < 0.22) {
        setTile(tiles, x, y, TILE.PATH_PEBBLE);
      } else if (tile === TILE.PLAZA && random() < 0.14) {
        setTile(tiles, x, y, TILE.PLAZA_CRACKED);
      }
    }
  }

  const props: VillageProp[] = [];
  const propKeys = new Set<string>();
  const addProp = (prop: VillageProp): void => {
    const key = `${prop.kind}:${prop.tileX}:${prop.tileY}`;
    if (propKeys.has(key)) return;
    if (!canPlaceProp(tiles, prop.tileX, prop.tileY, prop.kind)) return;
    propKeys.add(key);
    props.push(prop);
  };
  const addLandmark = (prop: VillageProp): void => {
    const key = `${prop.kind}:${prop.tileX}:${prop.tileY}`;
    if (propKeys.has(key)) return;
    propKeys.add(key);
    props.push(prop);
  };

  // Dense forest border.
  for (let x = 2; x <= MAP_WIDTH - 9; x += 3) {
    addProp({ kind: random() < 0.25 ? 'treeLarge' : 'tree', tileX: x, tileY: 12 });
    addProp({ kind: 'tree', tileX: x + 1, tileY: MAP_HEIGHT - 2 });
  }
  for (let y = 13; y <= MAP_HEIGHT - 3; y += 3) {
    addProp({ kind: y % 2 === 0 ? 'tree' : 'treeLarge', tileX: 1, tileY: y });
  }
  for (let y = 13; y <= MAP_HEIGHT - 4; y += 5) {
    addProp({ kind: 'tree', tileX: MAP_WIDTH - 9, tileY: y });
  }

  // Landmark trees that frame the plaza.
  addProp({ kind: 'treeLarge', tileX: 20, tileY: 13 });
  addProp({ kind: 'treeLarge', tileX: 32, tileY: 22 });
  addProp({ kind: 'treeLarge', tileX: 12, tileY: 31 });
  addProp({ kind: 'treeLarge', tileX: 43, tileY: 27 });

  // Scattered interior trees.
  addProp({ kind: 'tree', tileX: 5, tileY: 24 });
  addProp({ kind: 'tree', tileX: 19, tileY: 15 });
  addProp({ kind: 'tree', tileX: 44, tileY: 15 });
  addProp({ kind: 'tree', tileX: 42, tileY: 33 });
  addProp({ kind: 'tree', tileX: 6, tileY: 17 });

  // Rocks near the river and fields.
  addProp({ kind: 'rock', tileX: 45, tileY: 29 });
  addProp({ kind: 'rock', tileX: 47, tileY: 12 });
  addProp({ kind: 'rock', tileX: 12, tileY: 27 });
  addProp({ kind: 'rock', tileX: 39, tileY: 34 });
  addProp({ kind: 'rock', tileX: 30, tileY: 31 });

  // Diyas beside doors and the plaza.
  addProp({ kind: 'lamp', tileX: 12, tileY: 21 });
  addProp({ kind: 'lamp', tileX: 38, tileY: 21 });
  addProp({ kind: 'lamp', tileX: 22, tileY: 13 });
  addProp({ kind: 'lamp', tileX: 30, tileY: 13 });
  addProp({ kind: 'lamp', tileX: 21, tileY: 22 });
  addProp({ kind: 'lamp', tileX: 31, tileY: 22 });

  // Huts (props, not tiles; their footprints become collision rects).
  addLandmark({ kind: 'hut', tileX: 14, tileY: 19, variant: 0 });
  addLandmark({ kind: 'hut', tileX: 8, tileY: 14, variant: 1 });
  addLandmark({ kind: 'hut', tileX: 36, tileY: 13, variant: 2 });
  addLandmark({ kind: 'hut', tileX: 34, tileY: 24, variant: 1 });
  addLandmark({ kind: 'well', tileX: 26, tileY: 18 });

  const solids = props.flatMap((prop) => propSolids(prop));

  return {
    width: MAP_WIDTH,
    height: MAP_HEIGHT,
    tiles,
    props,
    solids,
    playerSpawn: tileToWorld(14, 24),
    sonSpawn: tileToWorld(17, 24),
    villagerSpawns: [
      tileToWorld(24, 20),
      tileToWorld(30, 19),
      tileToWorld(9, 18),
    ],
    maskedSpawn: tileToWorld(18, 22),
    wellPoint: tileToWorld(26, 17),
    riverCenter: tileToWorld(MAP_WIDTH - 4, 22),
  };
}
