import { describe, expect, it } from 'vitest';
import type { DamageContext } from '../combat/Damage';
import {
  CREATURE_ARCHETYPE_BY_ID,
  type CreatureArchetypeId,
} from '../content/creatures';
import type { CollisionWorld } from '../world/Collision';
import { Creature, type CreatureAttackIntent } from './Creature';
import { TargetDummy } from './TargetDummy';

const WORLD: CollisionWorld = {
  width: 2000,
  height: 1200,
  obstacles: [],
};

const DAMAGE_CONTEXT: DamageContext = {
  weaponId: 'test-blaster',
  direction: { x: 1, y: 0 },
};

function createCreature(
  archetypeId: CreatureArchetypeId,
  x: number,
  y: number,
): Creature {
  return new Creature(
    `${archetypeId}-test`,
    CREATURE_ARCHETYPE_BY_ID[archetypeId],
    { x, y },
  );
}

function simulate(
  creature: Creature,
  target: TargetDummy,
  seconds: number,
  world: CollisionWorld = WORLD,
  allies: readonly Creature[] = [],
): CreatureAttackIntent[] {
  const attacks: CreatureAttackIntent[] = [];
  const step = 1 / 60;
  const steps = Math.max(1, Math.round(seconds / step));

  for (let index = 0; index < steps; index += 1) {
    const attack = creature.update(step, {
      world,
      target,
      allies,
      time: index * step,
    });

    if (attack) {
      attacks.push(attack);
    }
  }

  return attacks;
}

describe('Creature targeting', () => {
  it('acquires a visible target and chases it', () => {
    const target = new TargetDummy({
      id: 'target',
      x: 900,
      y: 500,
      radius: 18,
    });
    const crawler = createCreature('crawler', 500, 500);

    simulate(crawler, target, 1 / 60);

    expect(crawler.hasTarget).toBe(true);
    expect(crawler.targetId).toBe('target');
    expect(crawler.state).toBe('chase');
    expect(crawler.x).toBeGreaterThan(500);
  });

  it('does not acquire a target hidden behind an obstacle', () => {
    const target = new TargetDummy({
      id: 'target',
      x: 900,
      y: 500,
      radius: 18,
    });
    const crawler = createCreature('crawler', 500, 500);
    const blockedWorld: CollisionWorld = {
      ...WORLD,
      obstacles: [{ x: 680, y: 400, width: 40, height: 200 }],
    };

    simulate(crawler, target, 0.5, blockedWorld);

    expect(crawler.hasTarget).toBe(false);
    expect(crawler.state).toBe('idle');
    expect(crawler.x).toBe(500);
    expect(crawler.y).toBe(500);
  });

  it('loses a target when line of sight is broken', () => {
    const target = new TargetDummy({
      id: 'target',
      x: 900,
      y: 500,
      radius: 18,
    });
    const crawler = createCreature('crawler', 500, 500);

    simulate(crawler, target, 1 / 60);
    expect(crawler.hasTarget).toBe(true);

    const blockedWorld: CollisionWorld = {
      ...WORLD,
      obstacles: [{ x: 680, y: 400, width: 40, height: 200 }],
    };

    simulate(crawler, target, 1 / 60, blockedWorld);

    expect(crawler.hasTarget).toBe(false);
    expect(crawler.state).toBe('idle');
  });

  it('ignores a target outside its detection range', () => {
    const target = new TargetDummy({
      id: 'target',
      x: 1500,
      y: 500,
      radius: 18,
    });
    const crawler = createCreature('crawler', 500, 500);

    simulate(crawler, target, 0.5);

    expect(crawler.hasTarget).toBe(false);
    expect(crawler.state).toBe('idle');
  });
});

describe('Creature behaviors', () => {
  it('winds up a melee attack before releasing it', () => {
    const target = new TargetDummy({
      id: 'target',
      x: 550,
      y: 500,
      radius: 18,
    });
    const crawler = createCreature('crawler', 500, 500);

    crawler.update(1 / 60, {
      world: WORLD,
      target,
      allies: [],
      time: 0,
    });

    expect(crawler.state).toBe('windup');
    expect(crawler.attackCharge).toBeGreaterThanOrEqual(0);

    const attacks = simulate(crawler, target, 0.35);

    expect(attacks).toHaveLength(1);
    expect(attacks[0]).toMatchObject({
      archetypeId: 'crawler',
      kind: 'melee',
      damage: 9,
    });
    expect(crawler.state).toBe('recover');
  });

  it('strafes around a target instead of charging directly', () => {
    const target = new TargetDummy({
      id: 'target',
      x: 900,
      y: 500,
      radius: 18,
    });
    const stalker = createCreature('stalker', 700, 500);

    simulate(stalker, target, 1 / 60);

    expect(stalker.state).toBe('strafe');
    expect(Math.abs(stalker.velocity.y)).toBeGreaterThan(0);
  });

  it('keeps distance and fires visible projectiles as a Spitter', () => {
    const target = new TargetDummy({
      id: 'target',
      x: 800,
      y: 500,
      radius: 18,
    });
    const spitter = createCreature('spitter', 500, 500);

    spitter.update(1 / 60, {
      world: WORLD,
      target,
      allies: [],
      time: 0,
    });

    expect(spitter.state).toBe('windup');

    const attacks = simulate(spitter, target, 0.65);

    expect(attacks).toHaveLength(1);
    expect(attacks[0]).toMatchObject({
      archetypeId: 'spitter',
      kind: 'projectile',
      damage: 10,
    });
    expect(attacks[0].projectile).toMatchObject({
      speed: 260,
      radius: 6,
    });
  });

  it('separates from nearby allies while moving', () => {
    const target = new TargetDummy({
      id: 'target',
      x: 500,
      y: 900,
      radius: 18,
    });
    const crawler = createCreature('crawler', 500, 500);
    const ally = createCreature('crawler', 510, 500);

    simulate(crawler, target, 1 / 60, WORLD, [ally]);

    expect(crawler.velocity.x).toBeLessThan(0);
    expect(crawler.velocity.y).toBeGreaterThan(0);
  });
});

describe('Creature damage', () => {
  it('takes capped damage, dies at zero health, and stays dead', () => {
    const crawler = createCreature('crawler', 500, 500);
    const maxHealth = crawler.maxHealth;

    expect(crawler.takeDamage(0, DAMAGE_CONTEXT).applied).toBe(0);

    const first = crawler.takeDamage(10, DAMAGE_CONTEXT);

    expect(first).toEqual({
      applied: 10,
      killed: false,
      remainingHealth: maxHealth - 10,
    });
    expect(crawler.hitFlash).toBe(1);

    const lethal = crawler.takeDamage(999, DAMAGE_CONTEXT);

    expect(lethal.applied).toBe(maxHealth - 10);
    expect(lethal.killed).toBe(true);
    expect(crawler.alive).toBe(false);
    expect(crawler.state).toBe('dead');
    expect(crawler.takeDamage(10, DAMAGE_CONTEXT).applied).toBe(0);
  });
});
