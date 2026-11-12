import type { CombatModifiers } from "../combat/CombatSystem";
import { STARTER_WEAPONS } from "../content/equipment";
import {
  EQUIPMENT_DEFS,
  type EquipmentDef,
  type EquipmentSlot,
  type PlayerModifiers,
} from "../content/upgrades";
import type { WeaponDef } from "../combat/WeaponDef";

export type InventoryItemKind = "weapon" | "equipment";

export type InventoryAcquireStatus =
  | "added"
  | "equipped"
  | "duplicate"
  | "invalid"
  | "full";

export interface InventoryAcquireResult {
  status: InventoryAcquireStatus;
  kind: InventoryItemKind;
  itemId: string;
  slot?: EquipmentSlot;
  salvageArmor?: number;
  salvageEnergy?: number;
}

export interface InventoryWeaponSnapshot {
  id: string;
  name: string;
  slot: number;
  category: string;
  owned: boolean;
}

export interface InventoryEquipmentSnapshot {
  id: string;
  name: string;
  slot: EquipmentSlot;
  description: string;
  equipped: boolean;
}

export interface InventorySnapshot {
  capacity: number;
  used: number;
  weapons: readonly InventoryWeaponSnapshot[];
  equipped: readonly InventoryEquipmentSnapshot[];
  stored: readonly InventoryEquipmentSnapshot[];
  modifiers: PlayerModifiers;
  combatModifiers: CombatModifiers;
}

export interface InventoryOptions {
  capacity?: number;
  startingWeaponIds?: readonly string[];
  startingEquipmentIds?: readonly string[];
}

const DUPLICATE_WEAPON_ENERGY = 18;
const DUPLICATE_EQUIPMENT_ARMOR = 20;

export class InventorySystem {
  private readonly weapons: readonly WeaponDef[];
  private readonly equipmentDefs: readonly EquipmentDef[];
  private readonly capacity: number;
  private readonly startingWeaponIds: readonly string[];
  private readonly startingEquipmentIds: readonly string[];
  private ownedWeapons = new Set<string>();
  private ownedEquipment = new Set<string>();
  private equipped = new Map<EquipmentSlot, string>();

  constructor(
    weapons: readonly WeaponDef[] = STARTER_WEAPONS,
    equipment: readonly EquipmentDef[] = EQUIPMENT_DEFS,
    options: InventoryOptions = {},
  ) {
    this.weapons = weapons;
    this.equipmentDefs = equipment;
    this.capacity = Math.max(1, Math.floor(options.capacity ?? 6));
    this.startingWeaponIds =
      options.startingWeaponIds ?? weapons.map((weapon) => weapon.id);
    this.startingEquipmentIds = options.startingEquipmentIds ?? [];
    this.reset();
  }

  get weaponCount(): number {
    return this.ownedWeapons.size;
  }

  get equipmentCount(): number {
    return this.ownedEquipment.size;
  }

  get capacityMax(): number {
    return this.capacity;
  }

  get playerModifiers(): PlayerModifiers {
    const modifiers: PlayerModifiers = {
      moveSpeedMultiplier: 1,
      sprintMultiplier: 1,
      dodgeCooldownMultiplier: 1,
      staminaRegenRateMultiplier: 1,
    };

    for (const equipment of this.equippedDefs()) {
      modifiers.maxHealthBonus =
        (modifiers.maxHealthBonus ?? 0) +
        (equipment.player.maxHealthBonus ?? 0);
      modifiers.maxArmorBonus =
        (modifiers.maxArmorBonus ?? 0) +
        (equipment.player.maxArmorBonus ?? 0);
      modifiers.armorAbsorbRatioBonus =
        (modifiers.armorAbsorbRatioBonus ?? 0) +
        (equipment.player.armorAbsorbRatioBonus ?? 0);
      modifiers.maxStaminaBonus =
        (modifiers.maxStaminaBonus ?? 0) +
        (equipment.player.maxStaminaBonus ?? 0);
      modifiers.moveSpeedMultiplier =
        (modifiers.moveSpeedMultiplier ?? 1) *
        (equipment.player.moveSpeedMultiplier ?? 1);
      modifiers.sprintMultiplier =
        (modifiers.sprintMultiplier ?? 1) *
        (equipment.player.sprintMultiplier ?? 1);
      modifiers.dodgeCooldownMultiplier =
        (modifiers.dodgeCooldownMultiplier ?? 1) *
        (equipment.player.dodgeCooldownMultiplier ?? 1);
      modifiers.staminaRegenRateMultiplier =
        (modifiers.staminaRegenRateMultiplier ?? 1) *
        (equipment.player.staminaRegenRateMultiplier ?? 1);
    }

    return modifiers;
  }

  get combatModifiers(): CombatModifiers {
    const modifiers: CombatModifiers = {
      maxEnergyBonus: 0,
      energyRegenRateMultiplier: 1,
    };

    for (const equipment of this.equippedDefs()) {
      modifiers.maxEnergyBonus =
        (modifiers.maxEnergyBonus ?? 0) +
        (equipment.combat.maxEnergyBonus ?? 0);
      modifiers.energyRegenRateMultiplier =
        (modifiers.energyRegenRateMultiplier ?? 1) *
        (equipment.combat.energyRegenRateMultiplier ?? 1);
    }

    return modifiers;
  }

  hasWeapon(id: string): boolean {
    return this.ownedWeapons.has(id);
  }

  hasWeaponSlot(slot: number): boolean {
    return this.weapons.some(
      (weapon) => weapon.slot === slot && this.ownedWeapons.has(weapon.id),
    );
  }

  getWeaponBySlot(slot: number): WeaponDef | undefined {
    return this.weapons.find(
      (weapon) => weapon.slot === slot && this.ownedWeapons.has(weapon.id),
    );
  }

  acquire(
    kind: InventoryItemKind,
    itemId: string,
  ): InventoryAcquireResult {
    return kind === "weapon"
      ? this.acquireWeapon(itemId)
      : this.acquireEquipment(itemId);
  }

  acquireWeapon(itemId: string): InventoryAcquireResult {
    const weapon = this.weapons.find((entry) => entry.id === itemId);

    if (!weapon) {
      return { status: "invalid", kind: "weapon", itemId };
    }

    if (this.ownedWeapons.has(itemId)) {
      return {
        status: "duplicate",
        kind: "weapon",
        itemId,
        salvageEnergy: DUPLICATE_WEAPON_ENERGY,
      };
    }

    this.ownedWeapons.add(itemId);

    return { status: "added", kind: "weapon", itemId };
  }

  acquireEquipment(itemId: string): InventoryAcquireResult {
    const equipment = this.findEquipment(itemId);

    if (!equipment) {
      return { status: "invalid", kind: "equipment", itemId };
    }

    if (this.ownedEquipment.has(itemId)) {
      return {
        status: "duplicate",
        kind: "equipment",
        itemId,
        slot: equipment.slot,
        salvageArmor: DUPLICATE_EQUIPMENT_ARMOR,
      };
    }

    if (this.ownedEquipment.size >= this.capacity) {
      return { status: "full", kind: "equipment", itemId, slot: equipment.slot };
    }

    this.ownedEquipment.add(itemId);

    if (!this.equipped.has(equipment.slot)) {
      this.equipped.set(equipment.slot, itemId);
      return {
        status: "equipped",
        kind: "equipment",
        itemId,
        slot: equipment.slot,
      };
    }

    return {
      status: "added",
      kind: "equipment",
      itemId,
      slot: equipment.slot,
    };
  }

  equip(itemId: string): boolean {
    const equipment = this.findEquipment(itemId);

    if (!equipment || !this.ownedEquipment.has(itemId)) {
      return false;
    }

    this.equipped.set(equipment.slot, itemId);
    return true;
  }

  unequip(slot: EquipmentSlot): boolean {
    return this.equipped.delete(slot);
  }

  getEquipped(slot: EquipmentSlot): EquipmentDef | undefined {
    const id = this.equipped.get(slot);

    return id ? this.findEquipment(id) : undefined;
  }

  snapshot(): InventorySnapshot {
    const equipment = this.equipmentDefs
      .filter((entry) => this.ownedEquipment.has(entry.id))
      .map((entry) => ({
        id: entry.id,
        name: entry.name,
        slot: entry.slot,
        description: entry.description,
        equipped: this.equipped.get(entry.slot) === entry.id,
      }));

    return {
      capacity: this.capacity,
      used: this.ownedEquipment.size,
      weapons: this.weapons.map((weapon) => ({
        id: weapon.id,
        name: weapon.name,
        slot: weapon.slot,
        category: weapon.category,
        owned: this.ownedWeapons.has(weapon.id),
      })),
      equipped: equipment.filter((entry) => entry.equipped),
      stored: equipment.filter((entry) => !entry.equipped),
      modifiers: this.playerModifiers,
      combatModifiers: this.combatModifiers,
    };
  }

  reset(): void {
    this.ownedWeapons = new Set(
      this.startingWeaponIds.filter((id) =>
        this.weapons.some((weapon) => weapon.id === id),
      ),
    );
    this.ownedEquipment = new Set(
      this.startingEquipmentIds.filter(
        (id) => this.findEquipment(id) !== undefined,
      ),
    );
    this.equipped.clear();

    for (const id of this.ownedEquipment) {
      const equipment = this.findEquipment(id);

      if (equipment && !this.equipped.has(equipment.slot)) {
        this.equipped.set(equipment.slot, id);
      }
    }
  }

  private equippedDefs(): EquipmentDef[] {
    const definitions: EquipmentDef[] = [];

    for (const id of this.equipped.values()) {
      const equipment = this.findEquipment(id);

      if (equipment) {
        definitions.push(equipment);
      }
    }

    return definitions;
  }

  private findEquipment(id: string): EquipmentDef | undefined {
    return this.equipmentDefs.find((equipment) => equipment.id === id);
  }
}
