import { describe, expect, it } from 'vitest';
import { hashString, mulberry32, randomInt, randomRange } from './rng';

describe('seeded RNG', () => {
  it('produces the same sequence for the same seed', () => {
    const first = mulberry32(0xdecafbad);
    const second = mulberry32(0xdecafbad);
    const firstSequence = Array.from({ length: 12 }, () => first());
    const secondSequence = Array.from({ length: 12 }, () => second());

    expect(firstSequence).toEqual(secondSequence);
  });

  it('produces different sequences for different seeds', () => {
    const first = mulberry32(17);
    const second = mulberry32(18);

    expect(first()).not.toBe(second());
  });

  it('emits values in the unit interval', () => {
    const random = mulberry32(42);

    for (let index = 0; index < 250; index += 1) {
      const value = random();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });
});

describe('RNG helpers', () => {
  it('hashes strings deterministically', () => {
    expect(hashString('greenreach')).toBe(hashString('greenreach'));
    expect(hashString('greenreach')).not.toBe(hashString('thornmaw'));
  });

  it('keeps ranged values inside their bounds', () => {
    const random = mulberry32(9);

    for (let index = 0; index < 100; index += 1) {
      const value = randomRange(random, 12, 18);
      const integer = randomInt(random, 3, 8);

      expect(value).toBeGreaterThanOrEqual(12);
      expect(value).toBeLessThan(18);
      expect(integer).toBeGreaterThanOrEqual(3);
      expect(integer).toBeLessThan(8);
      expect(Number.isInteger(integer)).toBe(true);
    }
  });
});
