import type { Material, Reaction } from '../shared/types';
import { materials } from './materials';
import { reactions } from './reactions';

export { materials } from './materials';
export { reactions } from './reactions';

const materialById = new Map<string, Material>(
  materials.map((material) => [material.id, material]),
);

export function getMaterial(id: string): Material | undefined {
  return materialById.get(id);
}

export function findReaction(
  a: string,
  b: string,
  catalyst?: string,
): Reaction | undefined {
  const normalizedCatalyst = catalyst || undefined;

  return reactions.find((reaction) => {
    const [inA, inB] = reaction.inputs;
    const inputsMatch =
      (inA === a && inB === b) || (inA === b && inB === a);
    if (!inputsMatch) {
      return false;
    }
    const reactionCatalyst = reaction.catalyst || undefined;
    return reactionCatalyst === normalizedCatalyst;
  });
}

export function listDiscoverable(): Reaction[] {
  return [...reactions];
}
