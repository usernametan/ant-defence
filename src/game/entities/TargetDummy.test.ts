import { describe, expect, it } from 'vitest';
import type { DamageContext } from '../combat/Damage';
import { createTrainingDummies, TargetDummy } from './TargetDummy';

const CONTEXT: DamageContext = {
  weaponId: 'test-blaster',
  direction: { x: 1, y: 0 },
};

describe('TargetDummy', () => {
  it('applies capped damage, flashes, and dies at zero health', () => {
    const dummy = new TargetDummy({
      id: 'dummy',
      x: 0,
      y: 0,
      maxHealth: 100,
    });

    expect(dummy.alive).toBe(true);
    expect(dummy.takeDamage(0, CONTEXT)).toEqual({
      applied: 0,
      killed: false,
      remainingHealth: 100,
    });

    expect(dummy.takeDamage(40, CONTEXT)).toEqual({
      applied: 40,
      killed: false,
      remainingHealth: 60,
    });
    expect(dummy.hitFlash).toBe(1);

    dummy.update(0.1);
    expect(dummy.hitFlash).toBeCloseTo(0.6);

    expect(dummy.takeDamage(999, CONTEXT)).toEqual({
      applied: 60,
      killed: true,
      remainingHealth: 0,
    });
    expect(dummy.alive).toBe(false);
    expect(dummy.takeDamage(10, CONTEXT).applied).toBe(0);
  });

  it('respawns after its configured delay', () => {
    const dummy = new TargetDummy({
      id: 'dummy',
      x: 0,
      y: 0,
      maxHealth: 50,
    });

    dummy.takeDamage(50, CONTEXT);
    dummy.update(dummy.respawnDelay - 0.1);

    expect(dummy.alive).toBe(false);
    expect(dummy.respawnRemaining).toBeCloseTo(0.1);

    dummy.update(0.1);

    expect(dummy.alive).toBe(true);
    expect(dummy.health).toBe(50);
    expect(dummy.respawnRemaining).toBe(0);
    expect(dummy.hitFlash).toBe(0);
  });

  it('creates three distinct training dummies', () => {
    const dummies = createTrainingDummies();
    const ids = new Set(dummies.map((dummy) => dummy.id));

    expect(dummies).toHaveLength(3);
    expect(ids.size).toBe(3);
    expect(dummies.every((dummy) => dummy.alive)).toBe(true);
    expect(dummies.every((dummy) => dummy.team === 'hostile')).toBe(true);
  });
});
