import { describe, expect, it } from 'vitest';
import type { DamageContext } from '../combat/Damage';
import type { CreatureSpawnPoint } from '../content/creatures';
import type { CollisionWorld } from '../world/Collision';
import { SpawnDirector } from './SpawnDirector';

const WORLD: CollisionWorld = {
  width: 1200,
  height: 800,
  obstacles: [],
};

const POINTS: readonly CreatureSpawnPoint[] = [
  { id: 'one', archetypeId: 'crawler', x: 100, y: 100 },
  { id: 'two', archetypeId: 'stalker', x: 400, y: 100 },
  { id: 'three', archetypeId: 'spitter', x: 700, y: 100 },
];

const DAMAGE_CONTEXT: DamageContext = {
  weaponId: 'test-blaster',
  direction: { x: 1, y: 0 },
};

describe('SpawnDirector', () => {
  it('spawns an initial encounter and respects the alive budget', () => {
    const director = new SpawnDirector(POINTS, {
      maxAlive: 3,
      initialSpawnCount: 2,
      respawnDelay: 1,
    });

    director.reset(WORLD);

    expect(director.creatures).toHaveLength(2);
    expect(director.aliveCount).toBe(2);
    expect(director.totalSpawned).toBe(2);
    expect(director.defeatedCount).toBe(0);

    for (let index = 0; index < 10; index += 1) {
      director.update(1, WORLD);
    }

    expect(director.creatures).toHaveLength(3);
    expect(director.aliveCount).toBe(3);
    expect(director.totalSpawned).toBe(3);
  });

  it('removes dead creatures, counts defeats, and refills later', () => {
    const director = new SpawnDirector(POINTS, {
      maxAlive: 3,
      initialSpawnCount: 2,
      respawnDelay: 1,
    });

    director.reset(WORLD);
    const first = director.creatures[0];

    expect(first.takeDamage(999, DAMAGE_CONTEXT).killed).toBe(true);

    director.update(0.1, WORLD);

    expect(director.creatures).toHaveLength(1);
    expect(director.defeatedCount).toBe(1);
    expect(director.aliveCount).toBe(1);
    expect(director.totalSpawned).toBe(2);

    director.update(1, WORLD);

    expect(director.creatures).toHaveLength(2);
    expect(director.aliveCount).toBe(2);
    expect(director.totalSpawned).toBe(3);
  });

  it('spawns tagged nest creatures and releases their source on death', () => {
    const director = new SpawnDirector(POINTS, {
      maxAlive: 3,
      initialSpawnCount: 0,
      respawnDelay: 1,
    });

    director.reset(WORLD);

    expect(director.spawnNestCreature(POINTS[0], WORLD, 'nest-test')).toBe(
      true,
    );
    expect(director.aliveCountForSource('nest-test')).toBe(1);
    expect(director.aliveCountForSource('other')).toBe(0);

    const creature = director.creatures[0];
    creature.takeDamage(999, DAMAGE_CONTEXT);
    director.update(0.1, WORLD);

    expect(director.aliveCountForSource('nest-test')).toBe(0);
    expect(director.creatures).toHaveLength(0);
  });

  it('respects the alive budget for nest spawns', () => {
    const director = new SpawnDirector(POINTS, {
      maxAlive: 1,
      initialSpawnCount: 0,
      respawnDelay: 1,
    });

    director.reset(WORLD);

    expect(director.spawnNestCreature(POINTS[0], WORLD, 'nest-test')).toBe(
      true,
    );
    expect(director.spawnNestCreature(POINTS[1], WORLD, 'nest-test')).toBe(
      false,
    );
    expect(director.creatures).toHaveLength(1);
  });

  it('suppresses ambient spawns inside secured safe zones', () => {
    const director = new SpawnDirector(POINTS, {
      maxAlive: 3,
      initialSpawnCount: 3,
      respawnDelay: 1,
    });

    director.setSuppressionZones([{ x: 100, y: 100, radius: 80 }]);
    director.reset(WORLD);

    expect(director.creatures).toHaveLength(2);
    expect(
      director.creatures.some((creature) =>
        creature.id.startsWith('crawler'),
      ),
    ).toBe(false);
  });

  it('skips spawn points blocked by solids', () => {
    const blockedWorld: CollisionWorld = {
      ...WORLD,
      obstacles: [{ x: 380, y: 80, width: 60, height: 40 }],
    };
    const director = new SpawnDirector(POINTS, {
      maxAlive: 3,
      initialSpawnCount: 3,
      respawnDelay: 1,
    });

    director.reset(blockedWorld);

    expect(director.creatures).toHaveLength(2);
    expect(director.creatures.some((creature) => creature.id.startsWith('stalker'))).toBe(false);
  });
});
