import { getCreatureArchetype } from "../content/creatures";
import { getPickupType } from "../content/pickups";
import type { Vec2 } from "../core/types";
import { circleIntersectsAabb } from "./Collision";
import {
  type LoadedPickupDef,
  type LoadedWorld,
  type MapDef,
  type MapPickupDef,
  type MapPropDef,
  type MapPropKind,
  type PropLayer,
  type WorldProp,
} from "./MapDef";

const TARGET_RADIUS = 22;
const PLAYER_RADIUS = 18;

const SOLID_PROP_KINDS: ReadonlySet<MapPropKind> = new Set([
  "tree",
  "boulder",
  "rock",
  "ruin-wall",
  "ruin-pillar",
  "crate",
  "barrel",
  "tent",
  "cart",
  "sign",
  "log",
]);

export function loadMap(def: MapDef): LoadedWorld {
  validateDimensions(def);

  const columns = Math.floor(def.width / def.tileSize);
  const rows = Math.floor(def.height / def.tileSize);
  const expectedTiles = columns * rows;

  if (def.terrain.length !== expectedTiles) {
    throw new Error(
      `Map "${def.id}" has ${def.terrain.length} terrain tiles; expected ${expectedTiles}`,
    );
  }

  const props: WorldProp[] = def.props.map((prop) =>
    normalizeProp(prop),
  );
  const solidProps = props.filter((prop) => prop.solid);
  const pickups = def.pickups.map((pickup) => normalizePickup(pickup));
  const spawn = def.entryPoints.start;

  if (!spawn) {
    throw new Error(`Map "${def.id}" requires a "start" entry point`);
  }

  const world: LoadedWorld = {
    id: def.id,
    name: def.name,
    width: def.width,
    height: def.height,
    tileSize: def.tileSize,
    columns,
    rows,
    terrain: def.terrain,
    decorations: def.decorations,
    props,
    solidProps,
    obstacles: solidProps,
    creatureSpawns: def.creatureSpawns,
    targets: def.targets,
    pickups,
    entryPoints: def.entryPoints,
    spawn: { ...spawn },
    pointsOfInterest: def.pointsOfInterest,
  };

  validateBounds(world);
  validateUniqueIds(world);
  validateEntryPoints(world);
  validateCreatureSpawns(world);
  validateTargets(world);
  validatePickups(world);

  return world;
}

function normalizeProp(prop: MapPropDef): WorldProp {
  return {
    ...prop,
    solid: prop.solid ?? SOLID_PROP_KINDS.has(prop.kind),
    layer: prop.layer ?? defaultLayer(prop.kind),
  };
}

function defaultLayer(kind: MapPropKind): PropLayer {
  return kind === "bridge" ? "ground" : "object";
}

function normalizePickup(pickup: MapPickupDef): LoadedPickupDef {
  const type = getPickupType(pickup.kind);

  return {
    ...pickup,
    amount: pickup.amount ?? type.amount,
    radius: pickup.radius ?? type.radius,
    respawnSeconds: pickup.respawnSeconds ?? type.respawnSeconds,
  };
}

function validateDimensions(def: MapDef): void {
  if (!def.id || !def.name) {
    throw new Error("Map requires an id and name");
  }

  if (
    !Number.isFinite(def.width) ||
    !Number.isFinite(def.height) ||
    !Number.isFinite(def.tileSize) ||
    def.width <= 0 ||
    def.height <= 0 ||
    def.tileSize <= 0
  ) {
    throw new Error(`Map "${def.id}" has invalid dimensions`);
  }

  if (def.width % def.tileSize !== 0 || def.height % def.tileSize !== 0) {
    throw new Error(`Map "${def.id}" dimensions must align to its tile size`);
  }
}

function validateBounds(world: LoadedWorld): void {
  for (const prop of world.props) {
    if (
      !Number.isFinite(prop.x) ||
      !Number.isFinite(prop.y) ||
      !Number.isFinite(prop.width) ||
      !Number.isFinite(prop.height) ||
      prop.width <= 0 ||
      prop.height <= 0 ||
      prop.x < 0 ||
      prop.y < 0 ||
      prop.x + prop.width > world.width ||
      prop.y + prop.height > world.height
    ) {
      throw new Error(`Prop "${prop.id}" is outside the map`);
    }
  }

  for (const decoration of world.decorations) {
    if (
      decoration.x < 0 ||
      decoration.y < 0 ||
      decoration.x > world.width ||
      decoration.y > world.height
    ) {
      throw new Error(`Decoration "${decoration.id}" is outside the map`);
    }
  }

  for (const poi of world.pointsOfInterest) {
    if (!isPointInBounds(poi, world)) {
      throw new Error(`Point of interest "${poi.id}" is outside the map`);
    }
  }
}

function validateUniqueIds(world: LoadedWorld): void {
  const ids = new Set<string>();

  for (const item of [
    ...world.props,
    ...world.decorations,
    ...world.creatureSpawns,
    ...world.targets,
    ...world.pickups,
    ...world.pointsOfInterest,
  ]) {
    if (ids.has(item.id)) {
      throw new Error(`Map "${world.id}" has duplicate id "${item.id}"`);
    }

    ids.add(item.id);
  }
}

function validateEntryPoints(world: LoadedWorld): void {
  for (const [id, point] of Object.entries(world.entryPoints)) {
    if (!isPointInBounds(point, world)) {
      throw new Error(`Entry point "${id}" is outside the map`);
    }

    if (isCircleBlocked(point, PLAYER_RADIUS, world)) {
      throw new Error(`Entry point "${id}" overlaps a solid prop`);
    }
  }
}

function validateCreatureSpawns(world: LoadedWorld): void {
  for (const spawn of world.creatureSpawns) {
    const archetype = getCreatureArchetype(spawn.archetypeId);

    if (!isCircleInBounds(spawn, archetype.radius, world)) {
      throw new Error(`Creature spawn "${spawn.id}" is outside the map`);
    }

    if (isCircleBlocked(spawn, archetype.radius, world)) {
      throw new Error(`Creature spawn "${spawn.id}" overlaps a solid prop`);
    }
  }
}

function validateTargets(world: LoadedWorld): void {
  for (const target of world.targets) {
    const radius = target.radius ?? TARGET_RADIUS;

    if (!isCircleInBounds(target, radius, world)) {
      throw new Error(`Target "${target.id}" is outside the map`);
    }

    if (isCircleBlocked(target, radius, world)) {
      throw new Error(`Target "${target.id}" overlaps a solid prop`);
    }
  }
}

function validatePickups(world: LoadedWorld): void {
  for (const pickup of world.pickups) {
    if (
      !Number.isFinite(pickup.amount) ||
      !Number.isFinite(pickup.radius) ||
      !Number.isFinite(pickup.respawnSeconds) ||
      pickup.amount <= 0 ||
      pickup.radius <= 0 ||
      pickup.respawnSeconds <= 0
    ) {
      throw new Error(`Pickup "${pickup.id}" has invalid recovery values`);
    }

    if (!isCircleInBounds(pickup, pickup.radius, world)) {
      throw new Error(`Pickup "${pickup.id}" is outside the map`);
    }

    if (isCircleBlocked(pickup, pickup.radius, world)) {
      throw new Error(`Pickup "${pickup.id}" overlaps a solid prop`);
    }
  }
}

function isPointInBounds(point: Vec2, world: LoadedWorld): boolean {
  return (
    Number.isFinite(point.x) &&
    Number.isFinite(point.y) &&
    point.x >= 0 &&
    point.y >= 0 &&
    point.x <= world.width &&
    point.y <= world.height
  );
}

function isCircleInBounds(
  point: Vec2,
  radius: number,
  world: LoadedWorld,
): boolean {
  return (
    point.x >= radius &&
    point.y >= radius &&
    point.x <= world.width - radius &&
    point.y <= world.height - radius
  );
}

function isCircleBlocked(
  point: Vec2,
  radius: number,
  world: LoadedWorld,
): boolean {
  return world.solidProps.some((prop) =>
    circleIntersectsAabb(point, radius, prop),
  );
}
