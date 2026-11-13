import type { Vec2 } from "../core/types";
import {
  CREATURE_ARCHETYPE_BY_ID,
  type CreatureArchetypeId,
} from "./creatures";

export interface RewardDef {
  armor?: number;
  energy?: number;
  summary: string;
}

export interface NestNodeDef extends Vec2 {
  id: string;
  radius?: number;
  maxHealth?: number;
}

export interface NestSpawnPointDef extends Vec2 {
  id: string;
  archetypeId: CreatureArchetypeId;
}

export interface NestSpawnDef {
  intervalSeconds: number;
  maxActive: number;
  points: readonly NestSpawnPointDef[];
}

export interface NestGuardianDef extends NestSpawnPointDef {
  name: string;
}

export interface NestDef extends Vec2 {
  id: string;
  name: string;
  territoryId: string;
  activationRadius: number;
  nodes: readonly NestNodeDef[];
  spawn: NestSpawnDef;
  guardian?: NestGuardianDef;
  reward?: RewardDef;
}

export interface SafeZoneDef extends Vec2 {
  id: string;
  name: string;
  radius: number;
}

export interface TerritoryDef extends Vec2 {
  id: string;
  name: string;
  regionId: string;
  radius: number;
  nestIds: readonly string[];
  captureSeconds: number;
  safeZone: SafeZoneDef;
  reward?: RewardDef;
}

export const WATCHPOST_TERRITORY_ID = "territory-watchpost";
export const WATCHPOST_NEST_ID = "nest-bloom-watchpost";

export const GREENREACH_TERRITORIES: readonly TerritoryDef[] = [
  {
    id: WATCHPOST_TERRITORY_ID,
    name: "Moss-Eaten Watchpost",
    regionId: "greenreach-wilds",
    x: 1080,
    y: 780,
    radius: 250,
    nestIds: [WATCHPOST_NEST_ID],
    captureSeconds: 5.5,
    safeZone: {
      id: "safezone-watchpost",
      name: "Watchpost Haven",
      x: 1115,
      y: 870,
      radius: 34,
    },
    reward: {
      armor: 20,
      energy: 18,
      summary: "Watchpost secured · +20 plating · +18 cell · safe zone online",
    },
  },
];

export const GREENREACH_NESTS: readonly NestDef[] = [
  {
    id: WATCHPOST_NEST_ID,
    name: "Bloom Nest",
    territoryId: WATCHPOST_TERRITORY_ID,
    x: 1080,
    y: 790,
    activationRadius: 260,
    nodes: [
      {
        id: "nest-node-watchpost-1",
        x: 980,
        y: 745,
        radius: 15,
        maxHealth: 90,
      },
      {
        id: "nest-node-watchpost-2",
        x: 1160,
        y: 760,
        radius: 15,
        maxHealth: 90,
      },
      {
        id: "nest-node-watchpost-3",
        x: 1080,
        y: 865,
        radius: 15,
        maxHealth: 90,
      },
    ],
    spawn: {
      intervalSeconds: 4.5,
      maxActive: 3,
      points: [
        {
          id: "nest-spawn-watchpost-1",
          archetypeId: "crawler",
          x: 960,
          y: 800,
        },
        {
          id: "nest-spawn-watchpost-2",
          archetypeId: "stalker",
          x: 1110,
          y: 750,
        },
        {
          id: "nest-spawn-watchpost-3",
          archetypeId: "spitter",
          x: 1250,
          y: 870,
        },
        {
          id: "nest-spawn-watchpost-4",
          archetypeId: "crawler",
          x: 1005,
          y: 790,
        },
      ],
    },
    guardian: {
      id: "nest-guardian-watchpost",
      name: "Bloom Guardian",
      archetypeId: "stalker",
      x: 1080,
      y: 740,
    },
    reward: {
      armor: 14,
      energy: 12,
      summary: "Bloom Nest cleared · +14 plating · +12 cell",
    },
  },
];

export function validateTerritoryDefinitions(
  territories: readonly TerritoryDef[],
  nests: readonly NestDef[],
): void {
  const territoryIds = new Set<string>();
  const worldIds = new Set<string>();

  for (const territory of territories) {
    if (
      !territory.id ||
      !territory.name ||
      !territory.regionId ||
      !territory.safeZone.id ||
      !territory.safeZone.name
    ) {
      throw new Error("Territories require an id, name, region, and safe zone");
    }

    if (territoryIds.has(territory.id)) {
      throw new Error(`Duplicate territory id "${territory.id}"`);
    }

    if (worldIds.has(territory.id)) {
      throw new Error(`Duplicate world id "${territory.id}"`);
    }

    territoryIds.add(territory.id);
    worldIds.add(territory.id);

    if (!isPositive(territory.radius) || !isPositive(territory.captureSeconds)) {
      throw new Error(`Territory "${territory.id}" has invalid capture values`);
    }

    if (!isPoint(territory)) {
      throw new Error(`Territory "${territory.id}" has invalid coordinates`);
    }

    if (territory.nestIds.length === 0) {
      throw new Error(`Territory "${territory.id}" requires at least one nest`);
    }

    if (new Set(territory.nestIds).size !== territory.nestIds.length) {
      throw new Error(`Territory "${territory.id}" repeats a nest id`);
    }

    if (
      !isPoint(territory.safeZone) ||
      !isPositive(territory.safeZone.radius)
    ) {
      throw new Error(
        `Territory "${territory.id}" has an invalid safe zone`,
      );
    }

    if (worldIds.has(territory.safeZone.id)) {
      throw new Error(
        `Duplicate world id "${territory.safeZone.id}"`,
      );
    }

    worldIds.add(territory.safeZone.id);
    validateReward(territory.reward, `Territory "${territory.id}"`);
  }

  const nestIds = new Set<string>();

  for (const nest of nests) {
    if (!nest.id || !nest.name || !nest.territoryId) {
      throw new Error("Nests require an id, name, and territory id");
    }

    if (nestIds.has(nest.id)) {
      throw new Error(`Duplicate nest id "${nest.id}"`);
    }

    if (worldIds.has(nest.id)) {
      throw new Error(`Duplicate world id "${nest.id}"`);
    }

    nestIds.add(nest.id);
    worldIds.add(nest.id);

    if (!territoryIds.has(nest.territoryId)) {
      throw new Error(
        `Nest "${nest.id}" references unknown territory "${nest.territoryId}"`,
      );
    }

    if (
      !isPoint(nest) ||
      !isPositive(nest.activationRadius) ||
      nest.nodes.length === 0
    ) {
      throw new Error(`Nest "${nest.id}" has invalid properties`);
    }

    const nodeIds = new Set<string>();

    for (const node of nest.nodes) {
      if (!node.id) {
        throw new Error(`Nest "${nest.id}" has a node without an id`);
      }

      if (nodeIds.has(node.id) || worldIds.has(node.id)) {
        throw new Error(`Duplicate world id "${node.id}"`);
      }

      nodeIds.add(node.id);
      worldIds.add(node.id);

      if (
        !isPoint(node) ||
        !isPositive(node.radius ?? 15) ||
        !isPositive(node.maxHealth ?? 90)
      ) {
        throw new Error(`Nest node "${node.id}" has invalid properties`);
      }
    }

    if (
      !isPositive(nest.spawn.intervalSeconds) ||
      !isPositive(nest.spawn.maxActive) ||
      nest.spawn.points.length === 0
    ) {
      throw new Error(`Nest "${nest.id}" has an invalid spawn configuration`);
    }

    const spawnIds = new Set<string>();

    for (const point of nest.spawn.points) {
      if (!point.id || spawnIds.has(point.id) || worldIds.has(point.id)) {
        throw new Error(`Nest "${nest.id}" has a duplicate spawn point`);
      }

      if (
        !isPoint(point) ||
        !CREATURE_ARCHETYPE_BY_ID[point.archetypeId]
      ) {
        throw new Error(
          `Nest spawn "${point.id}" has an invalid archetype or position`,
        );
      }

      spawnIds.add(point.id);
      worldIds.add(point.id);
    }

    if (nest.guardian) {
      const guardian = nest.guardian;

      if (
        !guardian.id ||
        !guardian.name ||
        spawnIds.has(guardian.id) ||
        worldIds.has(guardian.id)
      ) {
        throw new Error(`Nest "${nest.id}" has a duplicate guardian`);
      }

      if (
        !isPoint(guardian) ||
        !CREATURE_ARCHETYPE_BY_ID[guardian.archetypeId]
      ) {
        throw new Error(
          `Nest guardian "${guardian.id}" has an invalid archetype or position`,
        );
      }

      worldIds.add(guardian.id);
    }

    validateReward(nest.reward, `Nest "${nest.id}"`);
  }

  for (const territory of territories) {
    for (const nestId of territory.nestIds) {
      if (!nestIds.has(nestId)) {
        throw new Error(
          `Territory "${territory.id}" references unknown nest "${nestId}"`,
        );
      }
    }
  }

  for (const nest of nests) {
    const territory = territories.find(
      (entry) => entry.id === nest.territoryId,
    );

    if (!territory?.nestIds.includes(nest.id)) {
      throw new Error(
        `Nest "${nest.id}" is not listed by territory "${nest.territoryId}"`,
      );
    }
  }
}

function validateReward(
  reward: RewardDef | undefined,
  label: string,
): void {
  if (!reward) {
    return;
  }

  if (!reward.summary) {
    throw new Error(`${label} reward requires a summary`);
  }

  for (const value of [reward.armor, reward.energy]) {
    if (
      value !== undefined &&
      (!Number.isFinite(value) || value < 0)
    ) {
      throw new Error(`${label} has an invalid reward`);
    }
  }
}

function isPoint(point: Vec2): boolean {
  return Number.isFinite(point.x) && Number.isFinite(point.y);
}

function isPositive(value: number): boolean {
  return Number.isFinite(value) && value > 0;
}
