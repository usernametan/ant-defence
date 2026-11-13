import type { Vec2 } from "../core/types";
import type { CreatureArchetypeId } from "../content/creatures";
import type { CollisionWorld } from "./Collision";

export type TerrainKind =
  | "grass"
  | "grass-deep"
  | "meadow"
  | "dirt"
  | "path"
  | "water"
  | "bank"
  | "stone";

export type MapDecorationKind =
  | "grass-tuft"
  | "fern"
  | "flower"
  | "pebble"
  | "debris"
  | "mushroom"
  | "reeds";

export type MapPropKind =
  | "tree"
  | "bush"
  | "boulder"
  | "rock"
  | "ruin-wall"
  | "ruin-pillar"
  | "crate"
  | "barrel"
  | "fence"
  | "tent"
  | "cart"
  | "sign"
  | "log"
  | "bridge";

export type PropLayer = "ground" | "object";

export interface MapDecorationDef extends Vec2 {
  id: string;
  kind: MapDecorationKind;
  rotation?: number;
  scale?: number;
}

export interface MapPropDef extends Vec2 {
  id: string;
  kind: MapPropKind;
  width: number;
  height: number;
  solid?: boolean;
  layer?: PropLayer;
}

export interface WorldProp extends MapPropDef {
  solid: boolean;
  layer: PropLayer;
}

export interface MapSpawnPoint extends Vec2 {
  id: string;
  archetypeId: CreatureArchetypeId;
  zoneId: string;
}

export interface MapTargetDef extends Vec2 {
  id: string;
  radius?: number;
  maxHealth?: number;
}

export type PickupKind = "health" | "armor";

export interface MapPickupDef extends Vec2 {
  id: string;
  kind: PickupKind;
  amount?: number;
  radius?: number;
  respawnSeconds?: number;
}

export interface LoadedPickupDef extends Vec2 {
  id: string;
  kind: PickupKind;
  amount: number;
  radius: number;
  respawnSeconds: number;
}

export type MapItemKind = "weapon" | "equipment";

export interface MapItemDef extends Vec2 {
  id: string;
  kind: MapItemKind;
  itemId: string;
  radius?: number;
}

export interface LoadedItemDef extends Vec2 {
  id: string;
  kind: MapItemKind;
  itemId: string;
  radius: number;
}


export type InteractableKind = "relay" | "beacon";

export interface MapInteractableDef extends Vec2 {
  id: string;
  name: string;
  kind: InteractableKind;
  radius?: number;
  prompt?: string;
}

export interface LoadedInteractableDef extends Vec2 {
  id: string;
  name: string;
  kind: InteractableKind;
  radius: number;
  prompt: string;
}

export type PointOfInterestKind =
  | "waystation"
  | "ruin"
  | "meadow"
  | "crossing"
  | "rocky"
  | "forest";

export interface MapPointOfInterestDef extends Vec2 {
  id: string;
  name: string;
  kind: PointOfInterestKind;
  radius: number;
}

export interface MapDef {
  id: string;
  name: string;
  width: number;
  height: number;
  tileSize: number;
  terrain: readonly TerrainKind[];
  decorations: readonly MapDecorationDef[];
  props: readonly MapPropDef[];
  creatureSpawns: readonly MapSpawnPoint[];
  targets: readonly MapTargetDef[];
  pickups: readonly MapPickupDef[];
  items?: readonly MapItemDef[];
  interactables?: readonly MapInteractableDef[];
  entryPoints: Record<string, Vec2>;
  pointsOfInterest: readonly MapPointOfInterestDef[];
}

export interface LoadedWorld extends CollisionWorld {
  id: string;
  name: string;
  tileSize: number;
  columns: number;
  rows: number;
  terrain: readonly TerrainKind[];
  decorations: readonly MapDecorationDef[];
  props: readonly WorldProp[];
  solidProps: readonly WorldProp[];
  creatureSpawns: readonly MapSpawnPoint[];
  targets: readonly MapTargetDef[];
  pickups: readonly LoadedPickupDef[];
  items: readonly LoadedItemDef[];
  interactables: readonly LoadedInteractableDef[];
  entryPoints: Record<string, Vec2>;
  spawn: Vec2;
  pointsOfInterest: readonly MapPointOfInterestDef[];
}

export function terrainAt(
  world: LoadedWorld,
  tileX: number,
  tileY: number,
): TerrainKind {
  if (
    tileX < 0 ||
    tileY < 0 ||
    tileX >= world.columns ||
    tileY >= world.rows
  ) {
    return "grass";
  }

  return world.terrain[tileY * world.columns + tileX] ?? "grass";
}

export function terrainAtWorld(
  world: LoadedWorld,
  x: number,
  y: number,
): TerrainKind {
  return terrainAt(
    world,
    Math.floor(x / world.tileSize),
    Math.floor(y / world.tileSize),
  );
}
