import { describe, expect, it, vi } from 'vitest';
import { TypedEventBus } from '../shared/events';
import type { Material, PropertyTag } from '../shared/types';
import { ReactionRuntime } from './reactionRuntime';

function material(id: string, tags: PropertyTag[]): Material {
  return {
    id,
    name: id,
    description: id,
    tags,
    icon: `icon:${id}`,
  };
}

const MATERIALS: Material[] = [
  material('acid', ['acidic']),
  material('lye', ['basic']),
  material('sand', ['inert']),
];

describe('ReactionRuntime', () => {
  it('emits reaction:performed and discovers a reaction only once', () => {
    const localBus = new TypedEventBus();
    const performed = vi.fn();
    const discovered = vi.fn();
    localBus.on('reaction:performed', performed);
    localBus.on('reaction:discovered', discovered);

    const runtime = new ReactionRuntime({
      materials: MATERIALS,
      reactions: [],
      bus: localBus,
    });

    const first = runtime.combine('acid', 'lye', undefined, { x: 4, y: 9 });
    const second = runtime.combine('lye', 'acid');

    expect(first.effect?.kind).toBe('neutralize');
    expect(second.effect?.kind).toBe('neutralize');
    expect(performed).toHaveBeenCalledTimes(2);
    expect(performed).toHaveBeenNthCalledWith(1, {
      reactionId: 'tag:acid+lye:neutralize',
      effect: first.effect,
      origin: { x: 4, y: 9 },
    });
    expect(discovered).toHaveBeenCalledTimes(1);
    expect(runtime.discoveredReactions()).toEqual(['tag:acid+lye:neutralize']);
    expect(runtime.hasDiscovered('tag:acid+lye:neutralize')).toBe(true);
  });

  it('stays silent for non-reactive combinations', () => {
    const localBus = new TypedEventBus();
    const performed = vi.fn();
    const discovered = vi.fn();
    localBus.on('reaction:performed', performed);
    localBus.on('reaction:discovered', discovered);

    const runtime = new ReactionRuntime({
      materials: MATERIALS,
      reactions: [],
      bus: localBus,
    });

    const result = runtime.combine('sand', 'acid');

    expect(result.reaction).toBeNull();
    expect(performed).not.toHaveBeenCalled();
    expect(discovered).not.toHaveBeenCalled();
  });

  it('accepts previously discovered reactions', () => {
    const localBus = new TypedEventBus();
    const discovered = vi.fn();
    localBus.on('reaction:discovered', discovered);

    const runtime = new ReactionRuntime({
      materials: MATERIALS,
      reactions: [],
      bus: localBus,
      discovered: ['tag:acid+lye:neutralize'],
    });

    runtime.combine('acid', 'lye');
    expect(discovered).not.toHaveBeenCalled();
  });
});
