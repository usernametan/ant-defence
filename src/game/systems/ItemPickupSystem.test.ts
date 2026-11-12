import { describe, expect, it } from 'vitest';
import type { LoadedItemDef } from '../world/MapDef';
import { ItemPickupSystem } from './ItemPickupSystem';

function item(
  id: string,
  kind: 'weapon' | 'equipment',
  itemId: string,
  x: number,
  y: number,
  overrides: Partial<LoadedItemDef> = {},
): LoadedItemDef {
  return {
    id,
    kind,
    itemId,
    x,
    y,
    radius: 16,
    ...overrides,
  };
}

describe('ItemPickupSystem', () => {
  it('collects only in-range items accepted by the inventory', () => {
    const system = new ItemPickupSystem([
      item('near', 'equipment', 'reinforced-plating', 500, 500),
      item('far', 'weapon', 'rapid-blaster', 900, 500),
    ]);
    const target = { x: 500, y: 500, radius: 18 };
    const accepted: string[] = [];

    const collected = system.collect(target, (pickup) => {
      accepted.push(pickup.id);
      return pickup.id !== 'ignored';
    });

    expect(collected.map((entry) => entry.id)).toEqual(['near']);
    expect(accepted).toEqual(['near']);
    expect(system.activeCount).toBe(1);
    expect(system.items[0].active).toBe(false);
  });

  it('leaves an item active when the inventory cannot accept it', () => {
    const system = new ItemPickupSystem([
      item('near', 'equipment', 'reinforced-plating', 500, 500),
    ]);
    const target = { x: 500, y: 500, radius: 18 };

    expect(system.collect(target, () => false)).toEqual([]);
    expect(system.activeCount).toBe(1);
    expect(system.items[0].active).toBe(true);

    expect(system.collect(target, () => true)).toHaveLength(1);
    expect(system.collect(target, () => true)).toEqual([]);
    expect(system.activeCount).toBe(0);
  });

  it('resets one-shot world items for a new run', () => {
    const system = new ItemPickupSystem([
      item('near', 'weapon', 'heavy-blaster', 500, 500),
    ]);
    const target = { x: 500, y: 500, radius: 18 };

    system.collect(target, () => true);
    expect(system.activeCount).toBe(0);

    system.reset();

    expect(system.activeCount).toBe(system.totalCount);
    expect(system.getType(system.items[0]).symbol).toBe('weapon');
  });
});
