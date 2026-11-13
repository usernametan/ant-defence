import {
  CREATURE_SPAWNS,
  getCreatureArchetype,
  type CreatureSpawnPoint,
} from "../content/creatures";
import type { Vec2 } from "../core/types";
import { circleIntersectsAabb } from "../world/Collision";
import { Creature } from "../entities/Creature";
import type { CollisionWorld } from "../world/Collision";

export interface SpawnDirectorConfig {
  maxAlive: number;
  initialSpawnCount: number;
  respawnDelay: number;
}

export interface SpawnSuppressionZone extends Vec2 {
  radius: number;
}

export const DEFAULT_SPAWN_CONFIG: SpawnDirectorConfig = {
  maxAlive: 8,
  initialSpawnCount: 6,
  respawnDelay: 2.4,
};

export class SpawnDirector {
  private readonly config: SpawnDirectorConfig;
  private readonly spawnPoints: readonly CreatureSpawnPoint[];
  private readonly creaturesList: Creature[] = [];
  private readonly sourceTags = new Map<string, string>();
  private suppressionZones: readonly SpawnSuppressionZone[] = [];
  private nextPointIndex = 0;
  private serial = 0;
  private spawnTimer = 0;
  private defeated = 0;
  private spawnedTotal = 0;

  constructor(
    spawnPoints: readonly CreatureSpawnPoint[] = CREATURE_SPAWNS,
    config: Partial<SpawnDirectorConfig> = {},
  ) {
    this.config = {
      ...DEFAULT_SPAWN_CONFIG,
      ...config,
    };
    this.spawnPoints = spawnPoints;
  }

  get creatures(): readonly Creature[] {
    return this.creaturesList;
  }

  get maxAlive(): number {
    return this.config.maxAlive;
  }

  get aliveCount(): number {
    return this.creaturesList.reduce(
      (total, creature) => total + (creature.alive ? 1 : 0),
      0,
    );
  }

  get defeatedCount(): number {
    return this.defeated;
  }

  get totalSpawned(): number {
    return this.spawnedTotal;
  }

  setSuppressionZones(zones: readonly SpawnSuppressionZone[]): void {
    this.suppressionZones = zones.map((zone) => ({ ...zone }));
  }

  aliveCountForSource(sourceId: string): number {
    let alive = 0;

    for (const creature of this.creaturesList) {
      if (
        creature.alive &&
        this.sourceTags.get(creature.id) === sourceId
      ) {
        alive += 1;
      }
    }

    return alive;
  }

  spawnNestCreature(
    point: CreatureSpawnPoint,
    world: CollisionWorld,
    sourceId: string,
  ): boolean {
    if (
      this.creaturesList.length >= this.config.maxAlive ||
      !this.canSpawnAt(point, world, true)
    ) {
      return false;
    }

    const creature = this.createCreature(point, sourceId);

    if (!creature) {
      return false;
    }

    this.creaturesList.push(creature);
    this.spawnedTotal += 1;

    return true;
  }

  reset(world: CollisionWorld): void {
    this.creaturesList.length = 0;
    this.sourceTags.clear();
    this.nextPointIndex = 0;
    this.serial = 0;
    this.spawnTimer = this.config.respawnDelay;
    this.defeated = 0;
    this.spawnedTotal = 0;

    const initialCount = Math.min(
      this.config.maxAlive,
      Math.max(0, Math.floor(this.config.initialSpawnCount)),
    );

    for (let index = 0; index < initialCount; index += 1) {
      this.spawnOne(world);
    }
  }

  update(deltaSeconds: number, world: CollisionWorld): void {
    if (!Number.isFinite(deltaSeconds) || deltaSeconds <= 0) {
      return;
    }

    const before = this.creaturesList.length;

    for (let index = this.creaturesList.length - 1; index >= 0; index -= 1) {
      const creature = this.creaturesList[index];

      if (!creature.alive) {
        this.sourceTags.delete(creature.id);
        this.creaturesList.splice(index, 1);
      }
    }

    this.defeated += before - this.creaturesList.length;

    if (this.creaturesList.length >= this.config.maxAlive) {
      return;
    }

    this.spawnTimer = Math.max(0, this.spawnTimer - deltaSeconds);

    if (this.spawnTimer > 0) {
      return;
    }

    if (this.spawnOne(world)) {
      this.spawnTimer = this.config.respawnDelay;
    }
  }

  private spawnOne(world: CollisionWorld): Creature | null {
    if (this.spawnPoints.length === 0) {
      return null;
    }

    for (let attempt = 0; attempt < this.spawnPoints.length; attempt += 1) {
      const point =
        this.spawnPoints[this.nextPointIndex % this.spawnPoints.length];
      this.nextPointIndex = (this.nextPointIndex + 1) % this.spawnPoints.length;

      if (!this.canSpawnAt(point, world)) {
        continue;
      }

      const creature = this.createCreature(point);

      if (!creature) {
        continue;
      }

      this.creaturesList.push(creature);
      this.spawnedTotal += 1;

      return creature;
    }

    return null;
  }

  private createCreature(
    point: CreatureSpawnPoint,
    sourceId?: string,
  ): Creature | null {
    if (this.creaturesList.length >= this.config.maxAlive) {
      return null;
    }

    const archetype = getCreatureArchetype(point.archetypeId);
    const creature = new Creature(
      `${archetype.id}-${this.serial + 1}`,
      archetype,
      point,
    );

    this.serial += 1;

    if (sourceId) {
      this.sourceTags.set(creature.id, sourceId);
    }

    return creature;
  }

  private canSpawnAt(
    point: CreatureSpawnPoint,
    world: CollisionWorld,
    ignoreSuppression = false,
  ): boolean {
    const archetype = getCreatureArchetype(point.archetypeId);

    if (
      !ignoreSuppression &&
      this.suppressionZones.some(
        (zone) =>
          Math.hypot(point.x - zone.x, point.y - zone.y) <= zone.radius,
      )
    ) {
      return false;
    }

    for (const obstacle of world.obstacles) {
      if (circleIntersectsAabb(point, archetype.radius, obstacle)) {
        return false;
      }
    }

    for (const creature of this.creaturesList) {
      if (!creature.alive) {
        continue;
      }

      const distance = Math.hypot(creature.x - point.x, creature.y - point.y);

      if (distance < creature.radius + archetype.radius + 24) {
        return false;
      }
    }

    return true;
  }
}
