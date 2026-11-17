import type { CombatModifiers } from "../combat/CombatSystem";

export type EquipmentSlot = "plating" | "mobility" | "regulator";

export interface PlayerModifiers {
  maxHealthBonus?: number;
  maxArmorBonus?: number;
  armorAbsorbRatioBonus?: number;
  moveSpeedMultiplier?: number;
  sprintMultiplier?: number;
  dodgeCooldownMultiplier?: number;
  maxStaminaBonus?: number;
  staminaRegenRateMultiplier?: number;
}

export interface EquipmentDef {
  id: string;
  name: string;
  slot: EquipmentSlot;
  description: string;
  player: PlayerModifiers;
  combat: CombatModifiers;
}

export const EQUIPMENT_DEFS: readonly EquipmentDef[] = [
  {
    id: "reinforced-plating",
    name: "Reinforced Plating",
    slot: "plating",
    description:
      "Layered frontier alloy. Raises armor capacity and improves impact absorption.",
    player: {
      maxArmorBonus: 25,
      armorAbsorbRatioBonus: 0.05,
    },
    combat: {},
  },
  {
    id: "mobility-module",
    name: "Mobility Module",
    slot: "mobility",
    description:
      "Lightweight servo assist. Improves movement, stamina reserve, and dodge recovery.",
    player: {
      moveSpeedMultiplier: 1.08,
      dodgeCooldownMultiplier: 0.85,
      maxStaminaBonus: 10,
    },
    combat: {},
  },
  {
    id: "energy-regulator",
    name: "Energy Regulator",
    slot: "regulator",
    description:
      "Stabilized cell bridge. Expands weapon energy and accelerates recharge.",
    player: {},
    combat: {
      maxEnergyBonus: 25,
      energyRegenRateMultiplier: 1.2,
    },
  },
];

export const EQUIPMENT_BY_ID: ReadonlyMap<string, EquipmentDef> = new Map(
  EQUIPMENT_DEFS.map((equipment) => [equipment.id, equipment]),
);

export function getEquipmentDef(id: string): EquipmentDef | undefined {
  return EQUIPMENT_BY_ID.get(id);
}
