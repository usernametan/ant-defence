import { hashString, mulberry32 } from "../../core/rng";
import { GREENREACH_ITEMS, GREENREACH_PICKUPS } from "../pickups";
import type { Rect, Vec2 } from "../../core/types";
import type {
  MapDecorationDef,
  MapDecorationKind,
  MapDef,
  MapInteractableDef,
  MapPointOfInterestDef,
  MapPropDef,
  MapPropKind,
  MapSpawnPoint,
  MapTargetDef,
  TerrainKind,
} from "../../world/MapDef";

const MAP_WIDTH = 2048;
const MAP_HEIGHT = 1280;
const TILE_SIZE = 32;
const COLUMNS = MAP_WIDTH / TILE_SIZE;
const ROWS = MAP_HEIGHT / TILE_SIZE;
const MAP_SEED = "greenreach-wilds-v1";

type TerrainGrid = TerrainKind[];

const MAIN_PATH: readonly Vec2[] = [
  { x: -20, y: 660 },
  { x: 240, y: 650 },
  { x: 480, y: 690 },
  { x: 700, y: 660 },
  { x: 880, y: 610 },
  { x: 1060, y: 620 },
  { x: 1260, y: 680 },
  { x: 1450, y: 650 },
  { x: 1650, y: 590 },
  { x: 1850, y: 540 },
  { x: 2068, y: 560 },
];

const NORTH_PATH: readonly Vec2[] = [
  { x: 880, y: 610 },
  { x: 940, y: 470 },
  { x: 1080, y: 360 },
  { x: 1300, y: 320 },
  { x: 1510, y: 340 },
  { x: 1730, y: 390 },
];

const SOUTH_PATH: readonly Vec2[] = [
  { x: 1260, y: 680 },
  { x: 1270, y: 820 },
  { x: 1280, y: 940 },
  { x: 1340, y: 1080 },
  { x: 1480, y: 1160 },
];

const RUIN_PATH: readonly Vec2[] = [
  { x: 1060, y: 620 },
  { x: 1070, y: 700 },
  { x: 1080, y: 760 },
];

const STREAM: readonly Vec2[] = [
  { x: -30, y: 942 },
  { x: 300, y: 900 },
  { x: 620, y: 925 },
  { x: 940, y: 995 },
  { x: 1260, y: 930 },
  { x: 1580, y: 980 },
  { x: 1840, y: 920 },
  { x: 2078, y: 960 },
];

const FOREST_PATCHES = [
  { x: 560, y: 220, rx: 340, ry: 150 },
  { x: 1600, y: 240, rx: 300, ry: 150 },
  { x: 470, y: 1080, rx: 330, ry: 170 },
  { x: 1720, y: 1090, rx: 300, ry: 155 },
  { x: 820, y: 980, rx: 190, ry: 115 },
  { x: 1390, y: 1010, rx: 180, ry: 100 },
] as const;

const CREATURE_SPAWNS: readonly MapSpawnPoint[] = [
  {
    id: "spawn-crawler-west",
    archetypeId: "crawler",
    zoneId: "west-meadow",
    x: 700,
    y: 560,
  },
  {
    id: "spawn-stalker-north",
    archetypeId: "stalker",
    zoneId: "north-trail",
    x: 1120,
    y: 260,
  },
  {
    id: "spawn-spitter-south",
    archetypeId: "spitter",
    zoneId: "south-woods",
    x: 1110,
    y: 1080,
  },
  {
    id: "spawn-crawler-southwest",
    archetypeId: "crawler",
    zoneId: "south-woods",
    x: 620,
    y: 820,
  },
  {
    id: "spawn-stalker-northeast",
    archetypeId: "stalker",
    zoneId: "north-trail",
    x: 1370,
    y: 225,
  },
  {
    id: "spawn-spitter-east",
    archetypeId: "spitter",
    zoneId: "east-meadow",
    x: 1870,
    y: 650,
  },
  {
    id: "spawn-crawler-southeast",
    archetypeId: "crawler",
    zoneId: "east-meadow",
    x: 1600,
    y: 790,
  },
  {
    id: "spawn-stalker-southwest",
    archetypeId: "stalker",
    zoneId: "south-woods",
    x: 400,
    y: 1110,
  },
  {
    id: "spawn-spitter-northwest",
    archetypeId: "spitter",
    zoneId: "north-trail",
    x: 860,
    y: 320,
  },
];

const TARGETS: readonly MapTargetDef[] = [
  { id: "dummy-alpha", x: 760, y: 585 },
  { id: "dummy-beta", x: 1370, y: 545 },
  { id: "dummy-gamma", x: 1600, y: 820 },
];

const INTERACTABLES: readonly MapInteractableDef[] = [
  {
    id: "relay-watchpost",
    name: "Watchpost Relay",
    kind: "relay",
    x: 1040,
    y: 790,
    radius: 44,
    prompt: "Restore the watchpost relay",
  },
];

const POINTS_OF_INTEREST: readonly MapPointOfInterestDef[] = [
  {
    id: "poi-waystation",
    name: "Waystation Echo",
    kind: "waystation",
    x: 320,
    y: 650,
    radius: 180,
  },
  {
    id: "poi-watchpost",
    name: "Moss-Eaten Watchpost",
    kind: "ruin",
    x: 1080,
    y: 780,
    radius: 210,
  },
  {
    id: "poi-north-meadow",
    name: "Sunken Meadow",
    kind: "meadow",
    x: 1130,
    y: 300,
    radius: 230,
  },
  {
    id: "poi-ford",
    name: "Broken Ford",
    kind: "crossing",
    x: 1275,
    y: 930,
    radius: 120,
  },
  {
    id: "poi-rocky-approach",
    name: "Thornmaw Approach",
    kind: "rocky",
    x: 1810,
    y: 360,
    radius: 280,
  },
  {
    id: "poi-south-glade",
    name: "Quiet Glade",
    kind: "forest",
    x: 1550,
    y: 1120,
    radius: 220,
  },
];

export function createGreenreachMap(): MapDef {
  const terrain = createTerrain();
  const props: MapPropDef[] = [];
  const decorations: MapDecorationDef[] = [];
  const random = mulberry32(hashString(MAP_SEED));
  const entryPoints: Record<string, Vec2> = {
    start: { x: 330, y: 650 },
  };
  const exclusions = [
    ...CREATURE_SPAWNS.map((spawn) => ({
      x: spawn.x,
      y: spawn.y,
      radius: 82,
    })),
    ...TARGETS.map((target) => ({
      x: target.x,
      y: target.y,
      radius: 62,
    })),
    {
      x: entryPoints.start.x,
      y: entryPoints.start.y,
      radius: 110,
    },
  ];

  addWaystation(props);
  addRuins(props);
  addRockyApproach(props);
  addBridge(props);
  addForests(props, terrain, random, exclusions);
  addBushes(props, terrain, random, exclusions);
  addForestDebris(props);
  addDecorations(decorations, terrain, props, random, exclusions);

  return {
    id: "greenreach-wilds",
    name: "Greenreach Wilds",
    width: MAP_WIDTH,
    height: MAP_HEIGHT,
    tileSize: TILE_SIZE,
    terrain,
    decorations,
    props,
    creatureSpawns: CREATURE_SPAWNS,
    targets: TARGETS,
    pickups: GREENREACH_PICKUPS,
    items: GREENREACH_ITEMS,
    interactables: INTERACTABLES,
    entryPoints,
    pointsOfInterest: POINTS_OF_INTEREST,
  };
}

function createTerrain(): TerrainGrid {
  const terrain: TerrainGrid = new Array(COLUMNS * ROWS);

  for (let tileY = 0; tileY < ROWS; tileY += 1) {
    for (let tileX = 0; tileX < COLUMNS; tileX += 1) {
      const noise =
        (hashString(`${MAP_SEED}:${tileX}:${tileY}`) % 1000) / 1000;
      const kind: TerrainKind =
        noise < 0.16
          ? "grass-deep"
          : noise > 0.84
            ? "meadow"
            : "grass";

      terrain[tileY * COLUMNS + tileX] = kind;
    }
  }

  stampEllipse(terrain, 1080, 300, 330, 175, "meadow");
  stampEllipse(terrain, 1510, 660, 280, 165, "meadow");
  stampEllipse(terrain, 1040, 1080, 250, 130, "meadow");
  stampEllipse(terrain, 310, 650, 205, 155, "stone");
  stampEllipse(terrain, 1080, 780, 225, 145, "stone");
  stampEllipse(terrain, 1810, 360, 310, 205, "stone");

  for (const patch of FOREST_PATCHES) {
    stampEllipse(
      terrain,
      patch.x,
      patch.y,
      patch.rx,
      patch.ry,
      "grass-deep",
    );
  }

  paintPolyline(terrain, STREAM, 96, "bank");
  paintPolyline(terrain, STREAM, 58, "water");

  paintPolyline(terrain, MAIN_PATH, 78, "dirt");
  paintPolyline(terrain, MAIN_PATH, 48, "path");
  paintPolyline(terrain, NORTH_PATH, 62, "dirt");
  paintPolyline(terrain, NORTH_PATH, 34, "path");
  paintPolyline(terrain, SOUTH_PATH, 58, "dirt");
  paintPolyline(terrain, SOUTH_PATH, 32, "path");
  paintPolyline(terrain, RUIN_PATH, 54, "dirt");
  paintPolyline(terrain, RUIN_PATH, 30, "path");

  return terrain;
}

function addWaystation(props: MapPropDef[]): void {
  addProp(props, "tent", 190, 525, 98, 72);
  addProp(props, "crate", 405, 570, 34, 34);
  addProp(props, "crate", 445, 600, 34, 34);
  addProp(props, "barrel", 468, 548, 28, 28);
  addProp(props, "cart", 420, 715, 76, 42);
  addProp(props, "sign", 510, 650, 18, 30);
  addProp(props, "crate", 255, 760, 30, 30);
  addProp(props, "log", 570, 745, 78, 24, true);
  addProp(props, "fence", 170, 700, 92, 16);
  addProp(props, "fence", 170, 744, 92, 16);
}

function addRuins(props: MapPropDef[]): void {
  addProp(props, "ruin-wall", 935, 690, 160, 28);
  addProp(props, "ruin-wall", 1155, 690, 132, 28);
  addProp(props, "ruin-wall", 935, 905, 120, 28);
  addProp(props, "ruin-wall", 1120, 905, 178, 28);
  addProp(props, "ruin-pillar", 915, 755, 32, 32);
  addProp(props, "ruin-pillar", 1245, 755, 32, 32);
  addProp(props, "ruin-pillar", 1005, 835, 28, 28);
  addProp(props, "ruin-pillar", 1185, 835, 28, 28);
  addProp(props, "crate", 1090, 805, 34, 34);
  addProp(props, "barrel", 1148, 842, 30, 30);
  addProp(props, "cart", 970, 850, 70, 38);
}

function addRockyApproach(props: MapPropDef[]): void {
  addProp(props, "boulder", 1690, 302, 84, 62);
  addProp(props, "boulder", 1790, 382, 68, 52);
  addProp(props, "boulder", 1858, 292, 74, 58);
  addProp(props, "rock", 1950, 412, 90, 68);
  addProp(props, "rock", 1600, 434, 62, 46);
  addProp(props, "rock", 1900, 486, 54, 40);
  addProp(props, "boulder", 1740, 468, 48, 36);
  addProp(props, "rock", 1625, 330, 42, 34);
}

function addBridge(props: MapPropDef[]): void {
  addProp(props, "bridge", 1228, 882, 104, 120, false, "ground");
}

function addForests(
  props: MapPropDef[],
  terrain: readonly TerrainKind[],
  random: () => number,
  exclusions: readonly { x: number; y: number; radius: number }[],
): void {
  for (const patch of FOREST_PATCHES) {
    for (let y = patch.y - patch.ry; y <= patch.y + patch.ry; y += 58) {
      for (let x = patch.x - patch.rx; x <= patch.x + patch.rx; x += 58) {
        const normalizedX = (x - patch.x) / patch.rx;
        const normalizedY = (y - patch.y) / patch.ry;

        if (normalizedX * normalizedX + normalizedY * normalizedY > 0.92) {
          continue;
        }

        if (random() > 0.5) {
          continue;
        }

        const treeX = x + (random() - 0.5) * 34;
        const treeY = y + (random() - 0.5) * 34;

        if (!canPlaceForestProp(treeX, treeY, terrain, props, exclusions)) {
          continue;
        }

        addProp(
          props,
          random() > 0.84 ? "bush" : "tree",
          treeX - 15,
          treeY - 15,
          30,
          30,
        );
      }
    }
  }
}

function addBushes(
  props: MapPropDef[],
  terrain: readonly TerrainKind[],
  random: () => number,
  exclusions: readonly { x: number; y: number; radius: number }[],
): void {
  let placed = 0;
  let attempts = 0;

  while (placed < 54 && attempts < 700) {
    attempts += 1;
    const x = 80 + random() * (MAP_WIDTH - 160);
    const y = 80 + random() * (MAP_HEIGHT - 160);
    const kind = terrainAtTile(terrain, x, y);

    if (kind !== "grass" && kind !== "grass-deep" && kind !== "meadow") {
      continue;
    }

    if (!canPlaceForestProp(x, y, terrain, props, exclusions)) {
      continue;
    }

    const nearForest = FOREST_PATCHES.some((patch) => {
      const nx = (x - patch.x) / (patch.rx + 60);
      const ny = (y - patch.y) / (patch.ry + 60);
      return nx * nx + ny * ny <= 1;
    });

    if (!nearForest && random() > 0.24) {
      continue;
    }

    addProp(props, "bush", x - 17, y - 17, 34, 34, false);
    placed += 1;
  }
}

function addForestDebris(props: MapPropDef[]): void {
  addProp(props, "log", 620, 260, 86, 24, true);
  addProp(props, "log", 1530, 1120, 94, 24, true);
  addProp(props, "rock", 520, 990, 46, 36);
  addProp(props, "rock", 1500, 1050, 50, 38);
  addProp(props, "log", 270, 1040, 72, 22, true);
}

function addDecorations(
  decorations: MapDecorationDef[],
  terrain: readonly TerrainKind[],
  props: readonly MapPropDef[],
  random: () => number,
  exclusions: readonly { x: number; y: number; radius: number }[],
): void {
  let placed = 0;
  let attempts = 0;

  while (placed < 180 && attempts < 1200) {
    attempts += 1;
    const x = 24 + random() * (MAP_WIDTH - 48);
    const y = 24 + random() * (MAP_HEIGHT - 48);
    const terrainKind = terrainAtTile(terrain, x, y);
    const nearWater = isNearTerrain(terrain, x, y, "water", 42);

    if (
      terrainKind === "path" ||
      terrainKind === "stone" ||
      terrainKind === "water"
    ) {
      continue;
    }

    if (isDecorationBlocked(x, y, props, exclusions)) {
      continue;
    }

    const kind = chooseDecoration(terrainKind, nearWater, random);

    decorations.push({
      id: `deco-${placed + 1}`,
      kind,
      x,
      y,
      rotation: (random() - 0.5) * Math.PI,
      scale: 0.72 + random() * 0.62,
    });
    placed += 1;
  }

  const equipment: Array<[number, number, MapDecorationKind]> = [
    [378, 676, "debris"],
    [500, 690, "debris"],
    [1010, 792, "debris"],
    [1168, 866, "debris"],
    [1660, 404, "debris"],
    [796, 594, "debris"],
    [1410, 572, "debris"],
    [1640, 842, "debris"],
  ];

  for (const [x, y, kind] of equipment) {
    decorations.push({
      id: `deco-equipment-${decorations.length + 1}`,
      kind,
      x,
      y,
      rotation: random() * Math.PI,
      scale: 0.9 + random() * 0.35,
    });
  }
}

function chooseDecoration(
  terrain: TerrainKind,
  nearWater: boolean,
  random: () => number,
): MapDecorationKind {
  const roll = random();

  if (nearWater) {
    return roll > 0.45 ? "reeds" : "pebble";
  }

  if (terrain === "grass-deep") {
    if (roll > 0.78) {
      return "mushroom";
    }

    if (roll > 0.42) {
      return "fern";
    }

    return roll > 0.18 ? "grass-tuft" : "pebble";
  }

  if (terrain === "meadow") {
    return roll > 0.62 ? "flower" : "grass-tuft";
  }

  if (roll > 0.8) {
    return "flower";
  }

  if (roll > 0.6) {
    return "pebble";
  }

  return "grass-tuft";
}

function canPlaceForestProp(
  x: number,
  y: number,
  terrain: readonly TerrainKind[],
  props: readonly MapPropDef[],
  exclusions: readonly { x: number; y: number; radius: number }[],
): boolean {
  const kind = terrainAtTile(terrain, x, y);

  if (
    kind === "path" ||
    kind === "dirt" ||
    kind === "water" ||
    kind === "bank" ||
    kind === "stone"
  ) {
    return false;
  }

  if (
    exclusions.some(
      (exclusion) =>
        Math.hypot(exclusion.x - x, exclusion.y - y) < exclusion.radius,
    )
  ) {
    return false;
  }

  const candidate: Rect = { x: x - 20, y: y - 20, width: 40, height: 40 };

  return !props.some((prop) => rectsOverlap(candidate, prop, 8));
}

function isDecorationBlocked(
  x: number,
  y: number,
  props: readonly MapPropDef[],
  exclusions: readonly { x: number; y: number; radius: number }[],
): boolean {
  if (
    exclusions.some(
      (exclusion) =>
        Math.hypot(exclusion.x - x, exclusion.y - y) < exclusion.radius * 0.7,
    )
  ) {
    return true;
  }

  return props.some((prop) =>
    rectContainsPoint(
      { x: prop.x - 6, y: prop.y - 6, width: prop.width + 12, height: prop.height + 12 },
      x,
      y,
    ),
  );
}

function addProp(
  props: MapPropDef[],
  kind: MapPropKind,
  x: number,
  y: number,
  width: number,
  height: number,
  solid?: boolean,
  layer?: "ground" | "object",
): void {
  const id = `prop-${kind}-${props.length + 1}`;

  props.push({
    id,
    kind,
    x,
    y,
    width,
    height,
    ...(solid === undefined ? {} : { solid }),
    ...(layer === undefined ? {} : { layer }),
  });
}

function paintPolyline(
  terrain: TerrainGrid,
  points: readonly Vec2[],
  width: number,
  kind: TerrainKind,
): void {
  const radius = width / 2;

  for (let index = 1; index < points.length; index += 1) {
    const start = points[index - 1];
    const end = points[index];
    const distance = Math.hypot(end.x - start.x, end.y - start.y);
    const steps = Math.max(1, Math.ceil(distance / 12));

    for (let step = 0; step <= steps; step += 1) {
      const amount = step / steps;
      stampCircle(
        terrain,
        start.x + (end.x - start.x) * amount,
        start.y + (end.y - start.y) * amount,
        radius,
        kind,
      );
    }
  }
}

function stampCircle(
  terrain: TerrainGrid,
  centerX: number,
  centerY: number,
  radius: number,
  kind: TerrainKind,
): void {
  const minX = Math.max(0, Math.floor((centerX - radius) / TILE_SIZE));
  const maxX = Math.min(
    COLUMNS - 1,
    Math.floor((centerX + radius) / TILE_SIZE),
  );
  const minY = Math.max(0, Math.floor((centerY - radius) / TILE_SIZE));
  const maxY = Math.min(
    ROWS - 1,
    Math.floor((centerY + radius) / TILE_SIZE),
  );

  for (let tileY = minY; tileY <= maxY; tileY += 1) {
    for (let tileX = minX; tileX <= maxX; tileX += 1) {
      const worldX = (tileX + 0.5) * TILE_SIZE;
      const worldY = (tileY + 0.5) * TILE_SIZE;

      if (Math.hypot(worldX - centerX, worldY - centerY) <= radius) {
        terrain[tileY * COLUMNS + tileX] = kind;
      }
    }
  }
}

function stampEllipse(
  terrain: TerrainGrid,
  centerX: number,
  centerY: number,
  radiusX: number,
  radiusY: number,
  kind: TerrainKind,
): void {
  const minX = Math.max(0, Math.floor((centerX - radiusX) / TILE_SIZE));
  const maxX = Math.min(
    COLUMNS - 1,
    Math.floor((centerX + radiusX) / TILE_SIZE),
  );
  const minY = Math.max(0, Math.floor((centerY - radiusY) / TILE_SIZE));
  const maxY = Math.min(
    ROWS - 1,
    Math.floor((centerY + radiusY) / TILE_SIZE),
  );

  for (let tileY = minY; tileY <= maxY; tileY += 1) {
    for (let tileX = minX; tileX <= maxX; tileX += 1) {
      const worldX = (tileX + 0.5) * TILE_SIZE;
      const worldY = (tileY + 0.5) * TILE_SIZE;
      const normalizedX = (worldX - centerX) / radiusX;
      const normalizedY = (worldY - centerY) / radiusY;

      if (normalizedX * normalizedX + normalizedY * normalizedY <= 1) {
        terrain[tileY * COLUMNS + tileX] = kind;
      }
    }
  }
}

function terrainAtTile(
  terrain: readonly TerrainKind[],
  x: number,
  y: number,
): TerrainKind {
  const tileX = Math.floor(x / TILE_SIZE);
  const tileY = Math.floor(y / TILE_SIZE);

  if (tileX < 0 || tileY < 0 || tileX >= COLUMNS || tileY >= ROWS) {
    return "grass";
  }

  return terrain[tileY * COLUMNS + tileX] ?? "grass";
}

function isNearTerrain(
  terrain: readonly TerrainKind[],
  x: number,
  y: number,
  kind: TerrainKind,
  radius: number,
): boolean {
  const minX = Math.max(0, Math.floor((x - radius) / TILE_SIZE));
  const maxX = Math.min(COLUMNS - 1, Math.floor((x + radius) / TILE_SIZE));
  const minY = Math.max(0, Math.floor((y - radius) / TILE_SIZE));
  const maxY = Math.min(ROWS - 1, Math.floor((y + radius) / TILE_SIZE));

  for (let tileY = minY; tileY <= maxY; tileY += 1) {
    for (let tileX = minX; tileX <= maxX; tileX += 1) {
      if (terrain[tileY * COLUMNS + tileX] !== kind) {
        continue;
      }

      const worldX = (tileX + 0.5) * TILE_SIZE;
      const worldY = (tileY + 0.5) * TILE_SIZE;

      if (Math.hypot(worldX - x, worldY - y) <= radius) {
        return true;
      }
    }
  }

  return false;
}

function rectsOverlap(
  first: Rect,
  second: Rect,
  padding: number,
): boolean {
  return (
    first.x < second.x + second.width + padding &&
    first.x + first.width > second.x - padding &&
    first.y < second.y + second.height + padding &&
    first.y + first.height > second.y - padding
  );
}

function rectContainsPoint(rect: Rect, x: number, y: number): boolean {
  return (
    x >= rect.x &&
    x <= rect.x + rect.width &&
    y >= rect.y &&
    y <= rect.y + rect.height
  );
}
