import { describe, expect, it } from 'vitest';
import type { ReactionEffect } from '../shared/types';
import {
  findReaction,
  getMaterial,
  listDiscoverable,
  materials,
  reactions,
} from './index';

describe('Alchemy data definitions', () => {
  it('defines 14 unique materials with valid ids and tags', () => {
    expect(materials).toHaveLength(14);

    const ids = new Set(materials.map((m) => m.id));
    expect(ids.size).toBe(materials.length);

    for (const material of materials) {
      expect(material.id).toBeTruthy();
      expect(material.name).toBeTruthy();
      expect(material.description).toBeTruthy();
      expect(material.tags.length).toBeGreaterThan(0);
      expect(material.icon).toBeTruthy();
      expect(getMaterial(material.id)).toEqual(material);
    }

    expect(getMaterial('nonexistent_material')).toBeUndefined();
  });

  it('defines 16 unique reactions referencing only existing materials', () => {
    expect(reactions).toHaveLength(16);

    const ids = new Set(reactions.map((r) => r.id));
    expect(ids.size).toBe(reactions.length);

    const pairKeys = new Set<string>();
    for (const reaction of reactions) {
      const [a, b] = reaction.inputs;
      expect(getMaterial(a)).toBeDefined();
      expect(getMaterial(b)).toBeDefined();
      if (reaction.catalyst !== undefined) {
        expect(getMaterial(reaction.catalyst)).toBeDefined();
      }
      expect(reaction.discoveryText.trim().length).toBeGreaterThan(0);

      const sortedInputs = [a, b].sort().join('+');
      const key = `${sortedInputs}|${reaction.catalyst ?? ''}`;
      expect(pairKeys.has(key)).toBe(false);
      pairKeys.add(key);
    }
  });

  it('covers all six ReactionEffect kinds', () => {
    const kinds = new Set<ReactionEffect['kind']>(
      reactions.map((r) => r.effect.kind),
    );
    expect(kinds).toEqual(
      new Set<ReactionEffect['kind']>([
        'projectile',
        'shield',
        'trap',
        'terrain',
        'heal',
        'neutralize',
      ]),
    );
  });

  it('findReaction is order-independent and respects catalyst', () => {
    for (const reaction of reactions) {
      const [a, b] = reaction.inputs;
      expect(findReaction(a, b, reaction.catalyst)).toEqual(reaction);
      expect(findReaction(b, a, reaction.catalyst)).toEqual(reaction);

      if (reaction.catalyst !== undefined) {
        expect(findReaction(a, b)).toBeUndefined();
        expect(findReaction(a, b, 'turmeric')).toBeUndefined();
      } else {
        expect(findReaction(a, b, 'lime')).toBeUndefined();
      }
    }

    expect(findReaction('unknown', 'lime')).toBeUndefined();
  });

  it('listDiscoverable returns all discoverable reactions', () => {
    const discoverable = listDiscoverable();
    expect(discoverable).toHaveLength(16);
    expect(discoverable).toEqual(reactions);
  });
});
