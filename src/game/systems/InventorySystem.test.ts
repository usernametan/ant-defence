import { describe, expect, it } from 'vitest';
import { STARTER_WEAPONS } from '../content/equipment';
import {
  EQUIPMENT_DEFS,
  type EquipmentDef,
} from '../content/upgrades';
import { InventorySystem } from './InventorySystem';

describe('InventorySystem', () => {
  it('starts with the three blasters and no equipment', () => {
    const inventory = new InventorySystem();

    expect(inventory.weaponCount).toBe(3);
    expect(inventory.equipmentCount).toBe(0);
    expect(inventory.hasWeaponSlot(0)).toBe(true);
    expect(inventory.hasWeaponSlot(1)).toBe(true);
    expect(inventory.hasWeaponSlot(2)).toBe(true);
    expect(inventory.getWeaponBySlot(2)?.id).toBe('heavy-blaster');

    const snapshot = inventory.snapshot();
    expect(snapshot.weapons.every((weapon) => weapon.owned)).toBe(true);
    expect(snapshot.capacity).toBe(6);
    expect(snapshot.used).toBe(0);
    expect(snapshot.equipped).toEqual([]);
  });

  it('auto-equips the first module in each socket and exposes its effects', () => {
    const inventory = new InventorySystem();

    expect(inventory.acquireEquipment('reinforced-plating')).toMatchObject({
      status: 'equipped',
      slot: 'plating',
    });
    expect(inventory.acquireEquipment('mobility-module')).toMatchObject({
      status: 'equipped',
      slot: 'mobility',
    });
    expect(inventory.acquireEquipment('energy-regulator')).toMatchObject({
      status: 'equipped',
      slot: 'regulator',
    });

    const snapshot = inventory.snapshot();
    expect(snapshot.used).toBe(3);
    expect(snapshot.equipped).toHaveLength(3);
    expect(snapshot.stored).toEqual([]);
    expect(snapshot.modifiers).toMatchObject({
      maxArmorBonus: 25,
      armorAbsorbRatioBonus: 0.05,
      maxStaminaBonus: 10,
      moveSpeedMultiplier: 1.08,
      dodgeCooldownMultiplier: 0.85,
    });
    expect(snapshot.combatModifiers).toMatchObject({
      maxEnergyBonus: 25,
      energyRegenRateMultiplier: 1.2,
    });
  });

  it('stores modules when a socket is occupied and can swap them safely', () => {
    const alternate: EquipmentDef = {
      ...EQUIPMENT_DEFS[0],
      id: 'scout-plating',
      name: 'Scout Plating',
      player: { maxArmorBonus: 10 },
    };
    const inventory = new InventorySystem(
      STARTER_WEAPONS,
      [...EQUIPMENT_DEFS, alternate],
    );

    expect(inventory.acquireEquipment('reinforced-plating').status).toBe(
      'equipped',
    );
    expect(inventory.acquireEquipment(alternate.id).status).toBe('added');
    expect(inventory.snapshot().equipped[0].id).toBe('reinforced-plating');
    expect(inventory.snapshot().stored[0].id).toBe(alternate.id);

    expect(inventory.equip(alternate.id)).toBe(true);
    expect(inventory.getEquipped('plating')?.id).toBe(alternate.id);
    expect(inventory.snapshot().equipped[0].id).toBe(alternate.id);
    expect(inventory.snapshot().stored[0].id).toBe('reinforced-plating');

    expect(inventory.unequip('plating')).toBe(true);
    expect(inventory.getEquipped('plating')).toBeUndefined();
    expect(inventory.snapshot().used).toBe(2);
  });

  it('rejects duplicate, invalid, and over-capacity additions', () => {
    const inventory = new InventorySystem(
      STARTER_WEAPONS,
      EQUIPMENT_DEFS,
      { capacity: 1 },
    );

    expect(inventory.acquireEquipment('reinforced-plating').status).toBe(
      'equipped',
    );
    expect(inventory.acquireEquipment('reinforced-plating')).toMatchObject({
      status: 'duplicate',
      salvageArmor: 20,
    });
    expect(inventory.acquireEquipment('mobility-module').status).toBe('full');
    expect(inventory.acquireEquipment('missing-module').status).toBe('invalid');
    expect(inventory.acquire('equipment', 'reinforced-plating').status).toBe(
      'duplicate',
    );
    expect(inventory.acquire('weapon', 'missing-weapon').status).toBe(
      'invalid',
    );
    expect(inventory.equipmentCount).toBe(1);
  });

  it('converts duplicate weapons to salvage energy', () => {
    const inventory = new InventorySystem(STARTER_WEAPONS, EQUIPMENT_DEFS, {
      startingWeaponIds: [],
    });

    expect(inventory.acquireWeapon('rapid-blaster').status).toBe('added');
    expect(inventory.acquireWeapon('rapid-blaster')).toMatchObject({
      status: 'duplicate',
      salvageEnergy: 18,
    });
    expect(inventory.hasWeaponSlot(1)).toBe(true);
    expect(inventory.hasWeaponSlot(0)).toBe(false);
  });

  it('resets loadout state without losing the configured starting items', () => {
    const inventory = new InventorySystem(STARTER_WEAPONS, EQUIPMENT_DEFS, {
      startingEquipmentIds: ['reinforced-plating'],
    });

    expect(inventory.getEquipped('plating')?.id).toBe('reinforced-plating');
    inventory.unequip('plating');
    inventory.acquireEquipment('mobility-module');
    expect(inventory.equipmentCount).toBe(2);

    inventory.reset();

    expect(inventory.weaponCount).toBe(3);
    expect(inventory.equipmentCount).toBe(1);
    expect(inventory.getEquipped('plating')?.id).toBe('reinforced-plating');
    expect(inventory.getEquipped('mobility')).toBeUndefined();
  });
});
