import {
  GREENREACH_NESTS,
  GREENREACH_TERRITORIES,
  validateTerritoryDefinitions,
  type NestDef,
  type NestSpawnPointDef,
  type RewardDef,
  type TerritoryDef,
} from "../content/territories";
import type { Vec2 } from "../core/types";
import type { CollisionWorld } from "../world/Collision";
import { Nest, type NestNode, type NestState } from "../world/Nest";
import { SafeZone } from "../world/SafeZone";

export type TerritoryState =
  | "hostile"
  | "contested"
  | "securing"
  | "secured";

export interface NestSpawner {
  spawnNestCreature(
    point: NestSpawnPointDef,
    world: CollisionWorld,
    sourceId: string,
  ): boolean;
  aliveCountForSource(sourceId: string): number;
}

export interface TerritoryTarget extends Vec2 {
  readonly radius: number;
}

export interface NestNodeSnapshot {
  id: string;
  x: number;
  y: number;
  radius: number;
  health: number;
  maxHealth: number;
  alive: boolean;
  hitFlash: number;
}

export interface NestSnapshot {
  id: string;
  name: string;
  territoryId: string;
  x: number;
  y: number;
  activationRadius: number;
  state: NestState;
  health: number;
  maxHealth: number;
  progress: number;
  destroyedNodes: number;
  nodeCount: number;
  nodes: readonly NestNodeSnapshot[];
}

export interface SafeZoneSnapshot {
  id: string;
  name: string;
  x: number;
  y: number;
  radius: number;
  active: boolean;
}

export interface TerritorySnapshot {
  id: string;
  name: string;
  regionId: string;
  x: number;
  y: number;
  radius: number;
  state: TerritoryState;
  captureProgress: number;
  requiredNestIds: readonly string[];
  clearedNestCount: number;
  safeZone: SafeZoneSnapshot;
  rewardSummary: string | null;
}

export interface TerritoriesSnapshot {
  territories: readonly TerritorySnapshot[];
  nests: readonly NestSnapshot[];
  activeTerritoryId: string | null;
  securedCount: number;
}

export type TerritoryEvent =
  | {
      type: "nest-node-destroyed";
      nestId: string;
      nestName: string;
      territoryId: string;
      nodeId: string;
      x: number;
      y: number;
      remainingNodes: number;
      totalNodes: number;
    }
  | {
      type: "nest-weakened";
      nestId: string;
      nestName: string;
      territoryId: string;
      remainingNodes: number;
      totalNodes: number;
    }
  | {
      type: "nest-cleared";
      nestId: string;
      nestName: string;
      territoryId: string;
      x: number;
      y: number;
      reward: RewardDef | null;
    }
  | {
      type: "nest-guardian-spawned";
      nestId: string;
      nestName: string;
      territoryId: string;
      guardianName: string;
      x: number;
      y: number;
    }
  | {
      type: "territory-contested";
      territoryId: string;
      name: string;
    }
  | {
      type: "territory-securing";
      territoryId: string;
      name: string;
      clearedNests: number;
      totalNests: number;
    }
  | {
      type: "territory-secured";
      territoryId: string;
      name: string;
      x: number;
      y: number;
      safeZoneId: string;
      safeZoneName: string;
      reward: RewardDef | null;
    };

interface TerritoryRuntime {
  def: TerritoryDef;
  nests: readonly Nest[];
  safeZone: SafeZone;
  state: TerritoryState;
  captureProgress: number;
}

export class TerritorySystem {
  private readonly territories: TerritoryRuntime[];
  private readonly nests: readonly Nest[];
  private readonly nestsById: ReadonlyMap<string, Nest>;
  private readonly nodeDestroyed = new Set<string>();
  private readonly nestStates = new Map<string, NestState>();
  private readonly territoryStates = new Map<string, TerritoryState>();
  private events: TerritoryEvent[] = [];

  constructor(
    territoryDefs: readonly TerritoryDef[] = GREENREACH_TERRITORIES,
    nestDefs: readonly NestDef[] = GREENREACH_NESTS,
  ) {
    validateTerritoryDefinitions(territoryDefs, nestDefs);

    this.nests = nestDefs.map((def) => new Nest(def));
    this.nestsById = new Map(this.nests.map((nest) => [nest.id, nest]));
    this.territories = territoryDefs.map((def) => ({
      def,
      nests: def.nestIds.map((id) => {
        const nest = this.nestsById.get(id);

        if (!nest) {
          throw new Error(
            `Territory "${def.id}" references unknown nest "${id}"`,
          );
        }

        return nest;
      }),
      safeZone: new SafeZone(def.safeZone),
      state: "hostile",
      captureProgress: 0,
    }));
    this.resetState();
  }

  get nestsList(): readonly Nest[] {
    return this.nests;
  }

  get damageTargets(): readonly NestNode[] {
    return this.nests.flatMap((nest) => nest.nodes);
  }

  get activeSafeZone(): SafeZone | null {
    for (const territory of this.territories) {
      if (territory.safeZone.active) {
        return territory.safeZone;
      }
    }

    return null;
  }

  update(
    deltaSeconds: number,
    player: TerritoryTarget,
    world: CollisionWorld,
    spawner: NestSpawner,
  ): void {
    if (!Number.isFinite(deltaSeconds) || deltaSeconds <= 0) {
      return;
    }

    for (const nest of this.nests) {
      this.updateNest(nest, deltaSeconds, player, world, spawner);
    }

    for (const territory of this.territories) {
      this.updateTerritory(territory, deltaSeconds, player);
    }
  }

  drainEvents(): TerritoryEvent[] {
    const events = this.events;
    this.events = [];

    return events;
  }

  snapshot(): TerritoriesSnapshot {
    const territories = this.territories.map((territory) =>
      this.territorySnapshot(territory),
    );

    return {
      territories,
      nests: this.nests.map((nest) => this.nestSnapshot(nest)),
      activeTerritoryId:
        territories.find(
          (territory) =>
            territory.state === "contested" ||
            territory.state === "securing",
        )?.id ??
        territories.find((territory) => territory.state !== "secured")?.id ??
        territories[0]?.id ??
        null,
      securedCount: territories.filter(
        (territory) => territory.state === "secured",
      ).length,
    };
  }

  findNest(id: string): Nest | null {
    return this.nestsById.get(id) ?? null;
  }

  findNode(id: string): NestNode | null {
    for (const nest of this.nests) {
      const node = nest.findNode(id);

      if (node) {
        return node;
      }
    }

    return null;
  }

  findTerritory(id: string): TerritorySnapshot | null {
    return (
      this.snapshot().territories.find(
        (territory) => territory.id === id,
      ) ?? null
    );
  }

  suppressionZones(): readonly TerritoryTarget[] {
    return this.territories
      .filter((territory) => territory.state === "secured")
      .map((territory) => ({
        x: territory.def.x,
        y: territory.def.y,
        radius: territory.def.radius,
      }));
  }

  reset(): void {
    for (const nest of this.nests) {
      nest.reset();
    }

    for (const territory of this.territories) {
      territory.safeZone.reset();
    }

    this.events = [];
    this.resetState();
  }

  private resetState(): void {
    this.nodeDestroyed.clear();
    this.nestStates.clear();
    this.territoryStates.clear();

    for (const nest of this.nests) {
      this.nestStates.set(nest.id, nest.state);
    }

    for (const territory of this.territories) {
      territory.state = "hostile";
      territory.captureProgress = 0;
      this.territoryStates.set(territory.def.id, territory.state);
    }
  }

  private updateNest(
    nest: Nest,
    deltaSeconds: number,
    player: TerritoryTarget,
    world: CollisionWorld,
    spawner: NestSpawner,
  ): void {
    nest.update(deltaSeconds);

    const damaged = nest.nodes.some((node) => node.health < node.maxHealth);

    if (
      !nest.isActivated &&
      !nest.isCleared &&
      (damaged ||
        Math.hypot(nest.x - player.x, nest.y - player.y) <=
          nest.activationRadius + player.radius)
    ) {
      nest.activate();
    }

    for (const node of nest.nodes) {
      if (node.alive || this.nodeDestroyed.has(node.id)) {
        continue;
      }

      this.nodeDestroyed.add(node.id);
      this.events.push({
        type: "nest-node-destroyed",
        nestId: nest.id,
        nestName: nest.name,
        territoryId: nest.territoryId,
        nodeId: node.id,
        x: node.x,
        y: node.y,
        remainingNodes: nest.nodes.filter((entry) => entry.alive).length,
        totalNodes: nest.nodes.length,
      });
    }

    const previousState = this.nestStates.get(nest.id) ?? "inactive";
    const currentState = nest.state;

    if (
      currentState === "weakened" &&
      previousState !== "weakened" &&
      previousState !== "cleared"
    ) {
      this.events.push({
        type: "nest-weakened",
        nestId: nest.id,
        nestName: nest.name,
        territoryId: nest.territoryId,
        remainingNodes: nest.nodes.filter((entry) => entry.alive).length,
        totalNodes: nest.nodes.length,
      });
    }

    if (
      currentState === "cleared" &&
      previousState !== "cleared"
    ) {
      this.events.push({
        type: "nest-cleared",
        nestId: nest.id,
        nestName: nest.name,
        territoryId: nest.territoryId,
        x: nest.x,
        y: nest.y,
        reward: nest.def.reward ?? null,
      });
    }

    this.nestStates.set(nest.id, currentState);

    if (nest.guardianReady && nest.guardian) {
      if (
        spawner.spawnNestCreature(
          nest.guardian,
          world,
          `${nest.id}:guardian`,
        )
      ) {
        nest.markGuardianSpawned();
        this.events.push({
          type: "nest-guardian-spawned",
          nestId: nest.id,
          nestName: nest.name,
          territoryId: nest.territoryId,
          guardianName: nest.guardian.name,
          x: nest.guardian.x,
          y: nest.guardian.y,
        });
      }
    }

    if (
      !nest.spawnReady ||
      spawner.aliveCountForSource(nest.id) >= nest.maxActive
    ) {
      return;
    }

    const point = nest.nextSpawnPoint();

    if (
      point &&
      spawner.spawnNestCreature(point, world, nest.id)
    ) {
      nest.confirmSpawn();
    } else {
      nest.retrySpawn();
    }
  }

  private updateTerritory(
    territory: TerritoryRuntime,
    deltaSeconds: number,
    player: TerritoryTarget,
  ): void {
    if (territory.state === "secured") {
      return;
    }

    const inside =
      Math.hypot(
        player.x - territory.def.x,
        player.y - territory.def.y,
      ) <= territory.def.radius + player.radius;
    const clearedNests = territory.nests.filter(
      (nest) => nest.isCleared,
    ).length;
    const totalNests = territory.nests.length;
    const allCleared = clearedNests === totalNests;
    const previousState =
      this.territoryStates.get(territory.def.id) ?? "hostile";

    if (inside && !allCleared && territory.state === "hostile") {
      territory.state = "contested";
      this.events.push({
        type: "territory-contested",
        territoryId: territory.def.id,
        name: territory.def.name,
      });
    }

    if (inside && allCleared) {
      if (territory.state !== "securing") {
        territory.state = "securing";
        this.events.push({
          type: "territory-securing",
          territoryId: territory.def.id,
          name: territory.def.name,
          clearedNests,
          totalNests,
        });
      }

      territory.captureProgress = Math.min(
        1,
        territory.captureProgress +
          deltaSeconds / territory.def.captureSeconds,
      );

      if (territory.captureProgress >= 1) {
        territory.state = "secured";
        territory.safeZone.activate();
        this.events.push({
          type: "territory-secured",
          territoryId: territory.def.id,
          name: territory.def.name,
          x: territory.def.x,
          y: territory.def.y,
          safeZoneId: territory.def.safeZone.id,
          safeZoneName: territory.def.safeZone.name,
          reward: territory.def.reward ?? null,
        });
      }
    }

    if (previousState !== territory.state) {
      this.territoryStates.set(territory.def.id, territory.state);
    }
  }

  private nestSnapshot(nest: Nest): NestSnapshot {
    return {
      id: nest.id,
      name: nest.name,
      territoryId: nest.territoryId,
      x: nest.x,
      y: nest.y,
      activationRadius: nest.activationRadius,
      state: nest.state,
      health: nest.health,
      maxHealth: nest.maxHealth,
      progress: nest.clearingProgress,
      destroyedNodes: nest.destroyedNodes,
      nodeCount: nest.nodes.length,
      nodes: nest.nodes.map((node) => ({
        id: node.id,
        x: node.x,
        y: node.y,
        radius: node.radius,
        health: node.health,
        maxHealth: node.maxHealth,
        alive: node.alive,
        hitFlash: node.hitFlash,
      })),
    };
  }

  private territorySnapshot(
    territory: TerritoryRuntime,
  ): TerritorySnapshot {
    return {
      id: territory.def.id,
      name: territory.def.name,
      regionId: territory.def.regionId,
      x: territory.def.x,
      y: territory.def.y,
      radius: territory.def.radius,
      state: territory.state,
      captureProgress: territory.captureProgress,
      requiredNestIds: [...territory.def.nestIds],
      clearedNestCount: territory.nests.filter(
        (nest) => nest.isCleared,
      ).length,
      safeZone: {
        id: territory.safeZone.id,
        name: territory.safeZone.name,
        x: territory.safeZone.x,
        y: territory.safeZone.y,
        radius: territory.safeZone.radius,
        active: territory.safeZone.active,
      },
      rewardSummary: territory.def.reward?.summary ?? null,
    };
  }
}
