import { describe, expect, it } from 'vitest';
import type { Material, PropertyTag, Reaction } from '../shared/types';
import { combine, deriveTagReaction, findExplicitReaction } from './engine';

function material(
  id: string,
  tags: PropertyTag[],
  name = id,
): Material {
  return {
    id,
    name,
    description: `fixture ${id}`,
    tags,
    icon: `icon:${id}`,
  };
}

const ACID = material('acid', ['acidic']);
const LYE = material('lye', ['basic']);
const OIL = material('oil', ['flammable']);
const SPIRIT = material('spirit', ['volatile']);
const OXIDIZER = material('oxidizer', ['oxidizing']);
const SAND = material('sand', ['inert']);
const VENOM = material('venom', ['toxic']);
const IRON = material('iron', ['conductive']);

const FIXTURE_MATERIALS: Material[] = [
  ACID,
  LYE,
  OIL,
  SPIRIT,
  OXIDIZER,
  SAND,
  VENOM,
  IRON,
];

const AUTHORED: Reaction[] = [
  {
    id: 'fixture:soap',
    inputs: ['lye', 'oil'],
    effect: {
      kind: 'shield',
      absorb: 20,
      durationMs: 5000,
      tint: 0xffffff,
    },
    discoveryText: 'A slippery film coats your hands.',
  },
  {
    id: 'fixture:catalyst_fire',
    inputs: ['oil', 'oxidizer'],
    catalyst: 'spark',
    effect: {
      kind: 'terrain',
      surface: 'fire_patch',
      radius: 30,
      durationMs: 4000,
      damagePerSecond: 5,
      tint: 0xff6622,
    },
    discoveryText: 'A spark turns the mixture into clinging fire.',
  },
];

describe('reaction engine', () => {
  it('matches authored reactions regardless of input order', () => {
    const forward = combine(FIXTURE_MATERIALS, AUTHORED, 'lye', 'oil');
    const reverse = combine(FIXTURE_MATERIALS, AUTHORED, 'oil', 'lye');

    expect(forward.reaction?.id).toBe('fixture:soap');
    expect(reverse.reaction?.id).toBe('fixture:soap');
    expect(forward.effect?.kind).toBe('shield');
  });

  it('requires the matching catalyst for catalyst recipes', () => {
    expect(
      findExplicitReaction(AUTHORED, 'oil', 'oxidizer')?.id,
    ).toBeUndefined();

    const withSpark = combine(
      FIXTURE_MATERIALS,
      AUTHORED,
      'oil',
      'oxidizer',
      'spark',
    );
    expect(withSpark.reaction?.id).toBe('fixture:catalyst_fire');
    expect(withSpark.effect?.kind).toBe('terrain');
  });

  it('derives neutralization from acidic + basic tags', () => {
    const result = combine(FIXTURE_MATERIALS, [], 'acid', 'lye');
    expect(result.reaction?.id).toBe('tag:acid+lye:neutralize');
    expect(result.effect?.kind).toBe('neutralize');
  });

  it('derives a projectile from flammable + oxidizing tags', () => {
    const result = combine(FIXTURE_MATERIALS, [], 'oxidizer', 'oil');
    expect(result.effect?.kind).toBe('projectile');
    if (result.effect?.kind === 'projectile') {
      expect(result.effect.damage).toBeGreaterThan(0);
      expect(result.effect.radius).toBe(20);
    }
  });

  it('derives a wide blast from volatile + flammable tags', () => {
    const result = combine(FIXTURE_MATERIALS, [], 'spirit', 'oil');
    expect(result.effect?.kind).toBe('projectile');
    if (result.effect?.kind === 'projectile') {
      expect(result.effect.radius).toBe(44);
      expect(result.effect.damage).toBeGreaterThan(14);
    }
  });

  it('treats inert materials as non-reactive even with strong partners', () => {
    const result = combine(FIXTURE_MATERIALS, [], 'sand', 'acid');
    expect(result.reaction).toBeNull();
    expect(result.effect).toBeNull();
    expect(deriveTagReaction(SAND, ACID)).toBeNull();
  });

  it('derives a trap from toxic materials', () => {
    const result = combine(FIXTURE_MATERIALS, [], 'venom', 'iron');
    expect(result.effect?.kind).toBe('trap');
  });

  it('returns no reaction for unknown materials or unremarkable pairs', () => {
    expect(combine(FIXTURE_MATERIALS, [], 'unknown', 'acid').effect).toBeNull();
    expect(combine(FIXTURE_MATERIALS, [], 'iron', 'sand').effect).toBeNull();
  });
});
