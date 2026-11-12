import { describe, expect, it } from 'vitest';
import type { DamageContext } from '../combat/Damage';
import { Player } from '../entities/Player';
import type { LoadedPickupDef } from '../world/MapDef';
import { PickupSystem } from './PickupSystem';

const CONTEXT: DamageContext = {
  sourceId: 'crawler-1',
  weaponId: 'crawler-melee',
  direction: { x: 1, y: 0 },
};

function pickup(
  id: string,
  kind: 'health' | 'armor',
  x: number,
  y: number,
  overrides: Partial<LoadedPickupDef> = {},
): LoadedPickupDef {
  return {
    id,
    kind,
    x,
    y,
    amount: 30,
    radius: 14,
    respawnSeconds: 5,
    ...overrides,
  };
}

describe('PickupSystem', () => {
  it('does not consume a pickup when the player is already full', () => {
    const player = new Player({ x: 500, y: 500 });
    const pickups = new PickupSystem([
      pickup('health-1', 'health', 500, 500),
    ]);

    expect(pickups.collect(player)).toEqual([]);
    expect(pickups.activeCount).toBe(1);
    expect(player.health).toBe(player.maxHealth);
  });

  it('collects health only after damage and respawns it after its timer', () => {
    const player = new Player({ x: 500, y: 500 });
    const pickups = new PickupSystem([
      pickup('health-1', 'health', 500, 500),
    ]);

    player.takeDamage(100, CONTEXT);
    const damagedHealth = player.health;
    const collected = pickups.collect(player);

    expect(collected).toHaveLength(1);
    expect(collected[0].restored).toBe(30);
    expect(player.health).toBe(damagedHealth + 30);
    expect(pickups.activeCount).toBe(0);
    expect(pickups.pickups[0].respawnRemaining).toBe(5);

    pickups.update(4.9);
    expect(pickups.activeCount).toBe(0);
    expect(pickups.collect(player)).toEqual([]);

    pickups.update(0.2);
    expect(pickups.activeCount).toBe(1);
    expect(pickups.pickups[0].respawnRemaining).toBe(0);
  });

  it('collects armor independently of health', () => {
    const player = new Player({ x: 500, y: 500 });
    const pickups = new PickupSystem([
      pickup('armor-1', 'armor', 500, 500),
    ]);

    player.takeDamage(100, CONTEXT);
    const damagedArmor = player.armor;
    const collected = pickups.collect(player);

    expect(collected).toHaveLength(1);
    expect(collected[0].pickup.kind).toBe('armor');
    expect(collected[0].restored).toBe(30);
    expect(player.armor).toBe(damagedArmor + 30);
  });

  it('ignores out-of-range pickups and resets all caches', () => {
    const player = new Player({ x: 500, y: 500 });
    const pickups = new PickupSystem([
      pickup('health-1', 'health', 900, 500),
      pickup('armor-1', 'armor', 500, 500),
    ]);

    player.takeDamage(100, CONTEXT);

    expect(pickups.collect(player)).toHaveLength(1);
    expect(pickups.activeCount).toBe(1);

    pickups.reset();

    expect(pickups.activeCount).toBe(2);
    expect(
      pickups.pickups.every(
        (state) => state.active && state.respawnRemaining === 0,
      ),
    ).toBe(true);
  });
});
