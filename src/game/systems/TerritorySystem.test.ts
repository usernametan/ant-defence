import { describe, expect, it } from 'vitest';
import type { DamageContext } from '../combat/Damage';
import type {
  NestDef,
  NestSpawnPointDef,
  TerritoryDef,
} from '../content/territories';
import type { CollisionWorld } from '../world/Collision';
import {
  TerritorySystem,
  type NestSpawner,
} from './TerritorySystem';

const WORLD: CollisionWorld = {
  width: 1000,
  height: 1000,
  obstacles: [],
};

const DAMAGE_CONTEXT: DamageContext = {
  weaponId: 'test-blaster',
  direction: { x: 1, y: 0 },
};

const TERRITORY: TerritoryDef = {
  id: 'territory-test',
  name: 'Test Territory',
  regionId: 'test-region',
  x: 0,
  y: 0,
  radius: 200,
  nestIds: ['nest-test'],
  captureSeconds: 1,
  safeZone: {
    id: 'safezone-test',
    name: 'Test Haven',
    x: 20,
    y: 20,
    radius: 30,
  },
  reward: {
    armor: 10,
    energy: 5,
    summary: 'Test territory secured',
  },
};

const NEST: NestDef = {
  id: 'nest-test',
  name: 'Test Nest',
  territoryId: TERRITORY.id,
  x: 0,
  y: 0,
  activationRadius: 120,
  nodes: [
    {
      id: 'node-test',
      x: 10,
      y: 0,
      radius: 15,
      maxHealth: 30,
    },
  ],
  spawn: {
    intervalSeconds: 2,
    maxActive: 2,
    points: [
      {
        id: 'spawn-test',
        archetypeId: 'crawler',
        x: 30,
        y: 0,
      },
    ],
  },
  reward: {
    armor: 4,
    energy: 2,
    summary: 'Test nest cleared',
  },
};

class TestSpawner implements NestSpawner {
  readonly spawned: { point: NestSpawnPointDef; sourceId: string }[] = [];
  alive = 0;
  allow = true;

  spawnNestCreature(
    point: NestSpawnPointDef,
    _world: CollisionWorld,
    sourceId: string,
  ): boolean {
    if (!this.allow) {
      return false;
    }

    this.spawned.push({ point, sourceId });
    this.alive += 1;

    return true;
  }

  aliveCountForSource(_sourceId: string): number {
    return this.alive;
  }
}

function createSystem(): TerritorySystem {
  return new TerritorySystem([TERRITORY], [NEST]);
}

describe('TerritorySystem', () => {
  it('activates a nearby nest and spawns within its active budget', () => {
    const system = createSystem();
    const spawner = new TestSpawner();
    const player = { x: 0, y: 0, radius: 12 };

    system.update(0.1, player, WORLD, spawner);

    expect(system.nestsList[0].state).toBe('active');
    expect(spawner.spawned).toHaveLength(0);

    system.update(0.8, player, WORLD, spawner);

    expect(spawner.spawned).toHaveLength(1);
    expect(spawner.spawned[0]).toMatchObject({
      point: { id: 'spawn-test' },
      sourceId: 'nest-test',
    });

    system.update(2.1, player, WORLD, spawner);

    expect(spawner.spawned).toHaveLength(2);

    system.update(2.1, player, WORLD, spawner);

    expect(spawner.spawned).toHaveLength(2);
  });

  it('spawns a nest guardian once when the nest activates', () => {
    const guardianNest: NestDef = {
      ...NEST,
      guardian: {
        id: 'guardian-test',
        name: 'Test Guardian',
        archetypeId: 'stalker',
        x: 40,
        y: 0,
      },
    };
    const system = new TerritorySystem([TERRITORY], [guardianNest]);
    const spawner = new TestSpawner();
    const player = { x: 0, y: 0, radius: 12 };

    system.update(0.1, player, WORLD, spawner);

    expect(spawner.spawned).toEqual([
      {
        point: guardianNest.guardian,
        sourceId: 'nest-test:guardian',
      },
    ]);
    expect(system.drainEvents()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'nest-guardian-spawned',
          guardianName: 'Test Guardian',
        }),
      ]),
    );

    system.update(3, player, WORLD, spawner);

    expect(
      spawner.spawned.filter(
        (entry) => entry.sourceId === 'nest-test:guardian',
      ),
    ).toHaveLength(1);
  });

  it('reports damage, destroys nodes once, and stops spawning when cleared', () => {
    const system = createSystem();
    const spawner = new TestSpawner();
    const player = { x: 500, y: 500, radius: 12 };
    const node = system.findNode('node-test');

    expect(node).not.toBeNull();
    node?.takeDamage(10, DAMAGE_CONTEXT);
    system.update(0.1, player, WORLD, spawner);

    expect(system.nestsList[0].state).toBe('weakened');
    expect(system.drainEvents()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: 'nest-weakened' }),
      ]),
    );

    node?.takeDamage(999, DAMAGE_CONTEXT);
    system.update(0.1, player, WORLD, spawner);

    expect(system.nestsList[0].state).toBe('cleared');
    expect(system.nestsList[0].clearingProgress).toBe(1);
    expect(system.drainEvents()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'nest-node-destroyed',
          remainingNodes: 0,
        }),
        expect.objectContaining({
          type: 'nest-cleared',
          reward: NEST.reward,
        }),
      ]),
    );

    const spawnedAfterClear = spawner.spawned.length;
    system.update(5, player, WORLD, spawner);

    expect(spawner.spawned).toHaveLength(spawnedAfterClear);
    expect(system.drainEvents()).toHaveLength(0);
  });

  it('secures a cleared territory, activates its safe zone, and suppresses spawns', () => {
    const system = createSystem();
    const spawner = new TestSpawner();
    const player = { x: 0, y: 0, radius: 12 };

    system.update(0.1, player, WORLD, spawner);
    expect(system.snapshot().territories[0].state).toBe('contested');

    system.findNode('node-test')?.takeDamage(999, DAMAGE_CONTEXT);
    system.update(0.6, player, WORLD, spawner);

    expect(system.snapshot().territories[0].state).toBe('securing');
    expect(system.snapshot().territories[0].captureProgress).toBeCloseTo(0.6);

    system.update(0.5, player, WORLD, spawner);

    const snapshot = system.snapshot();
    const events = system.drainEvents();

    expect(snapshot.territories[0].state).toBe('secured');
    expect(snapshot.territories[0].safeZone.active).toBe(true);
    expect(snapshot.securedCount).toBe(1);
    expect(system.activeSafeZone?.name).toBe('Test Haven');
    expect(system.suppressionZones()).toEqual([
      { x: 0, y: 0, radius: 200 },
    ]);
    expect(events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'territory-secured',
          safeZoneName: 'Test Haven',
          reward: TERRITORY.reward,
        }),
      ]),
    );

    system.update(1, player, WORLD, spawner);
    expect(system.drainEvents()).toHaveLength(0);
  });

  it('resets nests, territory state, and safe zones', () => {
    const system = createSystem();
    const spawner = new TestSpawner();
    const player = { x: 0, y: 0, radius: 12 };

    system.findNode('node-test')?.takeDamage(999, DAMAGE_CONTEXT);
    system.update(1.1, player, WORLD, spawner);
    expect(system.snapshot().territories[0].state).toBe('secured');

    system.reset();

    const snapshot = system.snapshot();

    expect(snapshot.territories[0].state).toBe('hostile');
    expect(snapshot.territories[0].safeZone.active).toBe(false);
    expect(snapshot.nests[0].state).toBe('inactive');
    expect(snapshot.nests[0].health).toBe(30);
    expect(system.drainEvents()).toHaveLength(0);
  });

  it('rejects nests that are not listed by their territory', () => {
    expect(
      () =>
        new TerritorySystem(
          [{ ...TERRITORY, nestIds: [] }],
          [NEST],
        ),
    ).toThrow();
  });
});
