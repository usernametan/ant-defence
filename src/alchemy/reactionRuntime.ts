import { TypedEventBus, bus } from '../shared/events';
import type { Material, Reaction, Vec2 } from '../shared/types';
import { combine, type CombineResult } from './engine';

export interface ReactionRuntimeOptions {
  materials: Material[];
  reactions: Reaction[];
  bus?: TypedEventBus;
  discovered?: Iterable<string>;
}

/**
 * Thin stateful wrapper around the pure `combine` function. All bus traffic
 * lives here so the chemistry itself stays testable and side-effect free.
 */
export class ReactionRuntime {
  private readonly materials: Material[];
  private readonly reactions: Reaction[];
  private readonly bus: TypedEventBus;
  private readonly discovered: Set<string>;

  constructor(options: ReactionRuntimeOptions) {
    this.materials = options.materials;
    this.reactions = options.reactions;
    this.bus = options.bus ?? bus;
    this.discovered = new Set(options.discovered ?? []);
  }

  combine(
    aId: string,
    bId: string,
    catalyst?: string,
    origin?: Vec2,
  ): CombineResult {
    const result = combine(
      this.materials,
      this.reactions,
      aId,
      bId,
      catalyst,
    );

    if (result.reaction && result.effect) {
      this.bus.emit('reaction:performed', {
        reactionId: result.reaction.id,
        effect: result.effect,
        origin,
      });

      if (!this.discovered.has(result.reaction.id)) {
        this.discovered.add(result.reaction.id);
        this.bus.emit('reaction:discovered', {
          reaction: result.reaction,
        });
      }
    }

    return result;
  }

  hasDiscovered(reactionId: string): boolean {
    return this.discovered.has(reactionId);
  }

  discoveredReactions(): string[] {
    return [...this.discovered];
  }
}
