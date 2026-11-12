import { describe, expect, it } from 'vitest';
import type { Damageable } from './Damage';
import {
  ProjectileSystem,
  type ProjectileSpawn,
} from './ProjectileSystem';
import type { CollisionWorld } from '../world/Collision';
import { TargetDummy } from '../entities/TargetDummy';

function createWorld(
  obstacles: CollisionWorld['obstacles'] = [],
): CollisionWorld {
  return {
    width: 1000,
    height: 1000,
    obstacles,
  };
}

function createSpawn(
  overrides: Partial<ProjectileSpawn> = {},
): ProjectileSpawn {
  return {
    x: 100,
    y: 100,
    angle: 0,
    speed: 200,
    life: 1,
    radius: 5,
    damage: 26,
    pierce: 0,
    weaponId: 'test-blaster',
    ownerTeam: 'player',
    color: '#67f5cf',
    coreColor: '#e9fff8',
    ...overrides,
  };
}

function projectileX(system: ProjectileSystem): number | null {
  let x: number | null = null;

  system.forEachActive((projectile) => {
    x = projectile.x;
  });

  return x;
}

describe('ProjectileSystem', () => {
  it('moves projectiles and expires them at the end of their life', () => {
    const system = new ProjectileSystem();

    expect(system.spawn(createSpawn())).toBe(true);
    expect(system.update(0.5, createWorld(), [])).toEqual([]);
    expect(system.activeCount).toBe(1);
    expect(projectileX(system)).toBeCloseTo(200);

    system.update(0.5, createWorld(), []);
    expect(system.activeCount).toBe(0);
  });

  it('reports a swept wall hit without tunnelling', () => {
    const system = new ProjectileSystem();
    const world = createWorld([
      { x: 200, y: 0, width: 20, height: 1000 },
    ]);

    system.spawn(createSpawn({ speed: 400 }));
    const impacts = system.update(0.5, world, []);

    expect(impacts).toHaveLength(1);
    expect(impacts[0]).toMatchObject({
      kind: 'wall',
      weaponId: 'test-blaster',
      direction: { x: 1, y: 0 },
    });
    expect(impacts[0].x).toBeCloseTo(195);
    expect(system.activeCount).toBe(0);
  });

  it('damages hostile targets and ignores same-team targets', () => {
    const system = new ProjectileSystem();
    const hostile = new TargetDummy({
      id: 'dummy',
      x: 250,
      y: 100,
      maxHealth: 120,
    });

    system.spawn(createSpawn({ speed: 400, damage: 26 }));
    const impacts = system.update(0.5, createWorld(), [hostile]);

    expect(impacts).toHaveLength(1);
    expect(impacts[0]).toMatchObject({
      kind: 'target',
      targetId: 'dummy',
      damageApplied: 26,
      killed: false,
    });
    expect(hostile.health).toBe(94);
    expect(system.activeCount).toBe(0);

    const friendly = new TargetDummy({
      id: 'friendly',
      x: 250,
      y: 100,
    });

    system.spawn(createSpawn({ speed: 400, ownerTeam: 'hostile' }));
    expect(system.update(0.5, createWorld(), [friendly])).toEqual([]);
    expect(friendly.health).toBe(friendly.maxHealth);
    expect(system.activeCount).toBe(1);
  });

  it('pierces the configured number of additional targets', () => {
    const system = new ProjectileSystem();
    const first = new TargetDummy({ id: 'first', x: 200, y: 100 });
    const second = new TargetDummy({ id: 'second', x: 300, y: 100 });

    system.spawn(
      createSpawn({ speed: 600, damage: 30, pierce: 1 }),
    );
    const impacts = system.update(0.5, createWorld(), [first, second]);

    expect(impacts.map((impact) => impact.targetId)).toEqual([
      'first',
      'second',
    ]);
    expect(first.health).toBe(90);
    expect(second.health).toBe(90);
    expect(system.activeCount).toBe(0);
  });

  it('caps the active pool and reuses cleared slots', () => {
    const system = new ProjectileSystem(2);

    expect(system.spawn(createSpawn())).toBe(true);
    expect(system.spawn(createSpawn())).toBe(true);
    expect(system.spawn(createSpawn())).toBe(false);
    expect(system.activeCount).toBe(2);
    expect(system.maxProjectiles).toBe(2);
    expect(system.allocatedCount).toBe(2);

    system.clear();
    expect(system.activeCount).toBe(0);
    expect(system.spawn(createSpawn())).toBe(true);
    expect(system.allocatedCount).toBe(2);
  });

  it('does not re-hit a target it has already damaged while piercing', () => {
    const system = new ProjectileSystem();
    const target: Damageable = new TargetDummy({
      id: 'tough',
      x: 200,
      y: 100,
      radius: 40,
      maxHealth: 500,
    });

    system.spawn(
      createSpawn({ speed: 600, damage: 10, pierce: 2, life: 0.6 }),
    );
    system.update(0.3, createWorld(), [target]);

    expect(target.health).toBe(490);
  });
});
