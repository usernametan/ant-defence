import { describe, expect, it } from 'vitest';
import { createGreenreachMap } from '../content/maps/greenreach';
import { getCreatureArchetype } from '../content/creatures';
import { Player } from '../entities/Player';
import { Creature } from '../entities/Creature';
import { SpawnDirector } from '../systems/SpawnDirector';
import { circleIntersectsAabb, moveCircleWithCollision } from './Collision';
import { loadMap } from './MapLoader';

function createWorld() {
  return loadMap(createGreenreachMap());
}

describe('Greenreach collision and boundaries', () => {
  it('keeps the player outside solid world props', () => {
    const world = createWorld();
    const wall = world.solidProps.find((prop) => prop.kind === 'ruin-wall');

    expect(wall).toBeDefined();

    const player = new Player({
      x: wall!.x - 80,
      y: wall!.y + wall!.height / 2,
    });

    for (let index = 0; index < 180; index += 1) {
      player.update(1 / 60, { x: 1, y: 0 }, false, world);
    }

    expect(player.x).toBeLessThanOrEqual(wall!.x - player.radius + 0.001);
    expect(
      world.solidProps.some((prop) =>
        circleIntersectsAabb({ x: player.x, y: player.y }, player.radius, prop),
      ),
    ).toBe(false);
  });

  it('keeps a creature-sized body outside Greenreach solids', () => {
    const world = createWorld();
    const wall = world.solidProps.find((prop) => prop.kind === 'ruin-wall');
    const archetype = getCreatureArchetype('crawler');
    const creature = new Creature('collision-test', archetype, {
      x: wall!.x - 100,
      y: wall!.y + wall!.height / 2,
    });
    const result = moveCircleWithCollision(
      { x: creature.x, y: creature.y },
      { x: 320, y: 0 },
      creature.radius,
      world,
    );

    expect(result.position.x).toBeLessThanOrEqual(
      wall!.x - creature.radius + 0.001,
    );
  });

  it('clamps player movement to the world boundaries', () => {
    const world = createWorld();
    const player = new Player({ x: 20, y: 20 });

    for (let index = 0; index < 120; index += 1) {
      player.update(1 / 60, { x: -1, y: -1 }, true, world);
    }

    expect(player.x).toBeGreaterThanOrEqual(player.radius - 0.001);
    expect(player.y).toBeGreaterThanOrEqual(player.radius - 0.001);
  });

  it('spawns the initial Greenreach encounter at valid open points', () => {
    const world = createWorld();
    const director = new SpawnDirector(world.creatureSpawns, {
      maxAlive: 8,
      initialSpawnCount: 6,
      respawnDelay: 1,
    });

    director.reset(world);

    expect(director.creatures).toHaveLength(6);

    for (const creature of director.creatures) {
      expect(
        world.solidProps.some((prop) =>
          circleIntersectsAabb(
            { x: creature.x, y: creature.y },
            creature.radius,
            prop,
          ),
        ),
      ).toBe(false);
    }
  });

  it('refills from Greenreach spawn points without exceeding the budget', () => {
    const world = createWorld();
    const director = new SpawnDirector(world.creatureSpawns, {
      maxAlive: 3,
      initialSpawnCount: 2,
      respawnDelay: 0.1,
    });

    director.reset(world);

    for (let index = 0; index < 30; index += 1) {
      director.update(0.1, world);
    }

    expect(director.aliveCount).toBeLessThanOrEqual(3);
    expect(director.totalSpawned).toBeGreaterThanOrEqual(3);
  });
});
