import { describe, expect, it } from 'vitest';
import type { Vec2 } from '../core/types';
import { BASIC_BLASTER, RAPID_BLASTER } from '../content/equipment';
import {
  CombatSystem,
  DEFAULT_COMBAT_CONFIG,
  type CombatConfig,
} from './CombatSystem';
import type { WeaponDef } from './WeaponDef';

const ORIGIN: Vec2 = { x: 0, y: 0 };
const AIM: Vec2 = { x: 100, y: 0 };

function fire(
  combat: CombatSystem,
  overrides: Partial<{ firing: boolean; origin: Vec2; aim: Vec2 | null }> = {},
) {
  return combat.update(0, {
    firing: true,
    origin: ORIGIN,
    aim: AIM,
    ...overrides,
  });
}

describe('CombatSystem', () => {
  it('fires only with aim and input, draining energy and starting cooldown', () => {
    const combat = new CombatSystem([BASIC_BLASTER], DEFAULT_COMBAT_CONFIG, () => 0.5);

    expect(fire(combat, { firing: false })).toBeNull();
    expect(fire(combat, { aim: null })).toBeNull();

    const result = fire(combat);

    expect(result?.weapon.id).toBe(BASIC_BLASTER.id);
    expect(result?.spawns).toHaveLength(1);
    expect(result?.spawns[0].angle).toBeCloseTo(0);
    expect(combat.currentEnergy).toBeCloseTo(
      DEFAULT_COMBAT_CONFIG.maxEnergy - BASIC_BLASTER.energyCost,
    );
    expect(combat.currentCooldownRemaining).toBeCloseTo(0.26);
    expect(combat.isReady).toBe(false);
    expect(fire(combat)).toBeNull();
  });

  it('regenerates energy after the configured delay and tops out at max', () => {
    const combat = new CombatSystem([BASIC_BLASTER], DEFAULT_COMBAT_CONFIG, () => 0.5);
    const spent = DEFAULT_COMBAT_CONFIG.maxEnergy - BASIC_BLASTER.energyCost;

    fire(combat);
    combat.update(0.26, { firing: false, origin: ORIGIN, aim: AIM });

    expect(combat.currentCooldownRemaining).toBe(0);
    expect(combat.currentEnergy).toBeCloseTo(spent);

    combat.update(0.4, { firing: false, origin: ORIGIN, aim: AIM });

    expect(combat.currentEnergy).toBe(DEFAULT_COMBAT_CONFIG.maxEnergy);
    expect(combat.isReady).toBe(true);

    combat.update(10, { firing: false, origin: ORIGIN, aim: AIM });
    expect(combat.currentEnergy).toBe(DEFAULT_COMBAT_CONFIG.maxEnergy);
  });

  it('selects weapons by slot and ignores invalid indices', () => {
    const combat = new CombatSystem();

    expect(combat.currentWeapon.id).toBe(BASIC_BLASTER.id);
    expect(combat.selectWeapon(1)).toBe(true);
    expect(combat.currentWeapon.id).toBe(RAPID_BLASTER.id);
    expect(combat.selectWeapon(9)).toBe(false);
    expect(combat.currentWeapon.id).toBe(RAPID_BLASTER.id);

    combat.selectWeapon(2);
    combat.reset();
    expect(combat.currentWeapon.id).toBe(BASIC_BLASTER.id);
    expect(combat.currentEnergy).toBe(combat.maxEnergy);
  });

  it('keeps randomized spread inside the weapon bounds', () => {
    const testWeapon: WeaponDef = {
      ...BASIC_BLASTER,
      id: 'spread-test',
      cooldown: 0,
      energyCost: 0,
      projectile: {
        ...BASIC_BLASTER.projectile,
        spread: 0.1,
      },
    };
    const values = [1, 0];
    const random = () => values.shift() ?? 0.5;
    const combat = new CombatSystem([testWeapon], DEFAULT_COMBAT_CONFIG, random);

    expect(fire(combat)?.spawns[0].angle).toBeCloseTo(0.1);
    expect(fire(combat)?.spawns[0].angle).toBeCloseTo(-0.1);
  });

  it('refuses to fire without enough energy or when the target is too close', () => {
    const config: CombatConfig = {
      ...DEFAULT_COMBAT_CONFIG,
      maxEnergy: BASIC_BLASTER.energyCost - 1,
    };
    const combat = new CombatSystem([BASIC_BLASTER], config, () => 0.5);

    expect(fire(combat)).toBeNull();
    expect(combat.currentEnergy).toBe(config.maxEnergy);

    const closeCombat = new CombatSystem([BASIC_BLASTER]);
    expect(
      fire(closeCombat, { aim: { x: ORIGIN.x + 2, y: ORIGIN.y } }),
    ).toBeNull();
  });
});
