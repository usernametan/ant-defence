import type { WeaponDef } from "../combat/WeaponDef";

export const BASIC_BLASTER: WeaponDef = {
  id: "basic-blaster",
  slot: 0,
  name: "Basic Blaster",
  category: "emitter",
  description: "Reliable single-bolt emitter with a balanced charge draw.",
  cooldown: 0.26,
  energyCost: 6,
  projectile: {
    damage: 26,
    speed: 720,
    life: 1.05,
    range: 756,
    radius: 5,
    pierce: 0,
    spread: 0.018,
    projectileCount: 1,
    color: "#67f5cf",
    coreColor: "#e9fff8",
  },
};

export const RAPID_BLASTER: WeaponDef = {
  id: "rapid-blaster",
  slot: 1,
  name: "Rapid Blaster",
  category: "repeater",
  description: "Fast, low-yield bolts for close pressure and quick corrections.",
  cooldown: 0.09,
  energyCost: 4,
  projectile: {
    damage: 12,
    speed: 860,
    life: 0.78,
    range: 671,
    radius: 3.5,
    pierce: 0,
    spread: 0.075,
    projectileCount: 1,
    color: "#f7bf5b",
    coreColor: "#fff0c4",
  },
};

export const HEAVY_BLASTER: WeaponDef = {
  id: "heavy-blaster",
  slot: 2,
  name: "Heavy Blaster",
  category: "heavy",
  description: "Slow, high-output bolt that punches through a second target.",
  cooldown: 0.72,
  energyCost: 18,
  projectile: {
    damage: 54,
    speed: 500,
    life: 1.35,
    range: 675,
    radius: 9,
    pierce: 1,
    spread: 0.012,
    projectileCount: 1,
    color: "#ff9466",
    coreColor: "#ffe0c4",
  },
};

export const STARTER_WEAPONS: readonly WeaponDef[] = [
  BASIC_BLASTER,
  RAPID_BLASTER,
  HEAVY_BLASTER,
];

export const DEFAULT_WEAPON_ID = BASIC_BLASTER.id;
