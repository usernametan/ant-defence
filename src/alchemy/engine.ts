import type {
  Material,
  PropertyTag,
  Reaction,
  ReactionEffect,
} from '../shared/types';

/**
 * Result of combining two materials. `effect` is kept separate so callers can
 * apply gameplay effects without needing to know whether the reaction was
 * authored (explicit) or derived from property tags.
 */
export interface CombineResult {
  reaction: Reaction | null;
  effect: ReactionEffect | null;
}

export interface TagReaction {
  id: string;
  tags: PropertyTag[];
  effect: ReactionEffect;
  discoveryText: string;
}

const TAG_PRIORITY: PropertyTag[] = [
  'acidic',
  'basic',
  'volatile',
  'flammable',
  'oxidizing',
  'toxic',
];

function hasTag(material: Material, tag: PropertyTag): boolean {
  return material.tags.includes(tag);
}

function describe(material: Material): string {
  return material.name;
}

/**
 * Finds an explicit authored reaction for a material pair.
 *
 * Matching is order-independent. When a catalyst is supplied only reactions
 * bound to that catalyst match; when it is omitted only catalyst-free
 * reactions match. This keeps catalyst recipes explicit.
 */
export function findExplicitReaction(
  reactions: Reaction[],
  aId: string,
  bId: string,
  catalyst?: string,
): Reaction | null {
  for (const reaction of reactions) {
    const [x, y] = reaction.inputs;
    const pairMatches =
      (x === aId && y === bId) || (x === bId && y === aId);
    if (!pairMatches) continue;

    if (catalyst === undefined) {
      if (reaction.catalyst === undefined) return reaction;
    } else if (reaction.catalyst === catalyst) {
      return reaction;
    }
  }
  return null;
}

function sortIds(aId: string, bId: string): [string, string] {
  return aId <= bId ? [aId, bId] : [bId, aId];
}

function pairTags(
  a: Material,
  b: Material,
  tagA: PropertyTag,
  tagB: PropertyTag,
): boolean {
  return (
    (hasTag(a, tagA) && hasTag(b, tagB)) ||
    (hasTag(b, tagA) && hasTag(a, tagB))
  );
}

/**
 * Derives a reaction from property tags when no authored recipe exists.
 *
 * Priority (checked in order):
 *  1. inert + anything            -> no reaction
 *  2. acidic + basic              -> neutralize
 *  3. volatile + flammable        -> projectile with a large blast radius
 *  4. flammable + oxidizing       -> projectile
 *  5. toxic + anything            -> trap
 */
export function deriveTagReaction(
  a: Material,
  b: Material,
): TagReaction | null {
  if (hasTag(a, 'inert') || hasTag(b, 'inert')) {
    return null;
  }

  const [lowId, highId] = sortIds(a.id, b.id);
  const baseId = `tag:${lowId}+${highId}`;

  if (pairTags(a, b, 'acidic', 'basic')) {
    return {
      id: `${baseId}:neutralize`,
      tags: ['acidic', 'basic'],
      discoveryText: `${describe(a)} and ${describe(b)} cancel each other into harmless salt and steam.`,
      effect: {
        kind: 'neutralize',
        targetTags: ['acidic', 'basic'],
        radius: 60,
        bonusDamage: 16,
        tint: 0xcfe8d8,
      },
    };
  }

  if (pairTags(a, b, 'volatile', 'flammable')) {
    return {
      id: `${baseId}:blast`,
      tags: ['volatile', 'flammable'],
      discoveryText: `A volatile spirit catches the flame — a roaring blast blooms outward.`,
      effect: {
        kind: 'projectile',
        damage: 22,
        speed: 210,
        radius: 44,
        element: 'flammable',
        tint: 0xff8a3d,
      },
    };
  }

  if (pairTags(a, b, 'flammable', 'oxidizing')) {
    return {
      id: `${baseId}:flare`,
      tags: ['flammable', 'oxidizing'],
      discoveryText: `The oxidizer feeds the flame and launches a searing ember.`,
      effect: {
        kind: 'projectile',
        damage: 14,
        speed: 260,
        radius: 20,
        element: 'oxidizing',
        tint: 0xffb347,
      },
    };
  }

  const toxicSource = hasTag(a, 'toxic')
    ? a
    : hasTag(b, 'toxic')
      ? b
      : null;
  if (toxicSource) {
    return {
      id: `${baseId}:trap`,
      tags: ['toxic'],
      discoveryText: `${toxicSource.name} curdles the mixture into a creeping venom.`,
      effect: {
        kind: 'trap',
        damage: 9,
        radius: 36,
        durationMs: 3200,
        slowFactor: 0.45,
        tint: 0x7fbf5f,
      },
    };
  }

  return null;
}

/**
 * Pure combination: resolves an explicit recipe first, then falls back to
 * property-tag chemistry. No events are emitted here.
 */
export function combine(
  materials: Material[],
  reactions: Reaction[],
  aId: string,
  bId: string,
  catalyst?: string,
): CombineResult {
  const byId = new Map<string, Material>();
  for (const material of materials) {
    byId.set(material.id, material);
  }

  const a = byId.get(aId);
  const b = byId.get(bId);
  if (!a || !b) {
    return { reaction: null, effect: null };
  }

  const explicit = findExplicitReaction(reactions, aId, bId, catalyst);
  if (explicit) {
    return { reaction: explicit, effect: explicit.effect };
  }

  const derived = deriveTagReaction(a, b);
  if (!derived) {
    return { reaction: null, effect: null };
  }

  const reaction: Reaction = {
    id: derived.id,
    inputs: [aId, bId],
    effect: derived.effect,
    discoveryText: derived.discoveryText,
  };

  return { reaction, effect: reaction.effect };
}

/** Tags ordered by the fallback engine's priority, useful for UI sorting. */
export function tagPriority(): readonly PropertyTag[] {
  return TAG_PRIORITY;
}
