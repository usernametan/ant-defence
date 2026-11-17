import { getCreatureArchetype } from "../content/creatures";
import { STARTER_WEAPONS } from "../content/equipment";
import { getItemType, getPickupType } from "../content/pickups";
import {
  type NestSpawnPointDef,
  validateTerritoryDefinitions,
} from "../content/territories";
import { EQUIPMENT_BY_ID } from "../content/upgrades";
import type { Vec2 } from "../core/types";
import { circleIntersectsAabb } from "./Collision";
import {
  type LoadedInteractableDef,
  type LoadedItemDef,
  type LoadedPickupDef,
  type LoadedWorld,
  type MapDef,
  type MapInteractableDef,
  type MapItemDef,
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
  const items = (def.items ?? []).map((item) => normalizeItem(item));
  const interactables = (def.interactables ?? []).map((interactable) =>
    normalizeInteractable(interactable),
  );
  const nests = def.nests ?? [];
  const territories = def.territories ?? [];
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
    items,
    interactables,
    nests,
    territories,
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
  validateItems(world);
  validateInteractables(world);
  validateTerritoryDefinitions(territories, nests);
  validateTerritories(world);

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

function normalizeItem(item: MapItemDef): LoadedItemDef {
  const type = getItemType(item.kind);

  return {
    ...item,
    radius: item.radius ?? type.radius,
  };
}

function normalizeInteractable(
  interactable: MapInteractableDef,
): LoadedInteractableDef {
  return {
    ...interactable,
    radius: interactable.radius ?? 42,
    prompt: interactable.prompt ?? `Activate ${interactable.name}`,
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

  for (const interactable of world.interactables) {
    if (!isCircleInBounds(interactable, interactable.radius, world)) {
      throw new Error(`Interactable "${interactable.id}" is outside the map`);
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
    ...world.items,
    ...world.interactables,
    ...world.pointsOfInterest,
    ...world.territories,
    ...world.territories.map((territory) => territory.safeZone),
    ...world.nests,
    ...world.nests.flatMap((nest) => nest.nodes),
    ...world.nests.flatMap((nest) => nest.spawn.points),
    ...world.nests.flatMap((nest) =>
      nest.guardian ? [nest.guardian] : [],
    ),
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

function validateItems(world: LoadedWorld): void {
  for (const item of world.items) {
    const known =
      item.kind === "weapon"
        ? STARTER_WEAPONS.some((weapon) => weapon.id === item.itemId)
        : EQUIPMENT_BY_ID.has(item.itemId);

    if (!item.itemId || !known) {
      throw new Error(`Item "${item.id}" has an unknown item id`);
    }

    if (!Number.isFinite(item.radius) || item.radius <= 0) {
      throw new Error(`Item "${item.id}" has an invalid radius`);
    }

    if (!isCircleInBounds(item, item.radius, world)) {
      throw new Error(`Item "${item.id}" is outside the map`);
    }

    if (isCircleBlocked(item, item.radius, world)) {
      throw new Error(`Item "${item.id}" overlaps a solid prop`);
    }
  }
}

function validateInteractables(world: LoadedWorld): void {
  for (const interactable of world.interactables) {
    if (
      !interactable.name ||
      !interactable.prompt ||
      !Number.isFinite(interactable.radius) ||
      interactable.radius <= 0
    ) {
      throw new Error(
        `Interactable "${interactable.id}" has invalid properties`,
      );
    }

    if (isCircleBlocked(interactable, interactable.radius, world)) {
      throw new Error(
        `Interactable "${interactable.id}" overlaps a solid prop`,
      );
    }
  }
}

function validateTerritories(world: LoadedWorld): void {
  for (const territory of world.territories) {
    if (!isCircleInBounds(territory, territory.radius, world)) {
      throw new Error(`Territory "${territory.id}" is outside the map`);
    }

    if (
      !isCircleInBounds(
        territory.safeZone,
        PLAYER_RADIUS,
        world,
      ) ||
      isCircleBlocked(territory.safeZone, PLAYER_RADIUS, world)
    ) {
      throw new Error(
        `Territory "${territory.id}" safe zone is blocked or outside the map`,
      );
    }
  }

  for (const nest of world.nests) {
    if (!isPointInBounds(nest, world)) {
      throw new Error(`Nest "${nest.id}" is outside the map`);
    }

    for (const node of nest.nodes) {
      const radius = node.radius ?? 15;

      if (!isCircleInBounds(node, radius, world)) {
        throw new Error(`Nest node "${node.id}" is outside the map`);
      }

      if (isCircleBlocked(node, radius, world)) {
        throw new Error(
          `Nest node "${node.id}" overlaps a solid prop`,
        );
      }
    }

    for (const point of nest.spawn.points) {
      validateNestSpawnPoint(point, world, "Nest spawn");
    }

    if (nest.guardian) {
      validateNestSpawnPoint(nest.guardian, world, "Nest guardian");
    }
  }
}

function validateNestSpawnPoint(
  point: NestSpawnPointDef,
  world: LoadedWorld,
  label: string,
): void {
  const archetype = getCreatureArchetype(point.archetypeId);

  if (!isCircleInBounds(point, archetype.radius, world)) {
    throw new Error(`${label} "${point.id}" is outside the map`);
  }

  if (isCircleBlocked(point, archetype.radius, world)) {
    throw new Error(`${label} "${point.id}" overlaps a solid prop`);
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
