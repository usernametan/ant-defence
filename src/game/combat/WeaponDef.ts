export type WeaponCategory = "emitter" | "repeater" | "heavy";

export interface WeaponProjectileDef {
  damage: number;
  speed: number;
  life: number;
  range: number;
  radius: number;
  pierce: number;
  spread: number;
  projectileCount: number;
  color: string;
  coreColor: string;
}

export interface WeaponDef {
  id: string;
  slot: number;
  name: string;
  category: WeaponCategory;
  description: string;
  cooldown: number;
  energyCost: number;
  projectile: WeaponProjectileDef;
}

export type CombatFireFailure =
  | "no-aim"
  | "cooldown"
  | "energy"
  | "range";

export function validateWeaponDefinitions(
  weapons: readonly WeaponDef[],
): void {
  if (weapons.length === 0) {
    throw new Error("CombatSystem requires at least one weapon");
  }

  const ids = new Set<string>();
  const slots = new Set<number>();

  for (const weapon of weapons) {
    if (!weapon.id || ids.has(weapon.id)) {
      throw new Error(`Weapon id "${weapon.id}" is empty or duplicated`);
    }

    if (slots.has(weapon.slot)) {
      throw new Error(`Weapon slot ${weapon.slot} is duplicated`);
    }

    if (
      !Number.isFinite(weapon.cooldown) ||
      !Number.isFinite(weapon.energyCost) ||
      weapon.cooldown < 0 ||
      weapon.energyCost < 0
    ) {
      throw new Error(`Weapon "${weapon.id}" has invalid firing values`);
    }

    const projectile = weapon.projectile;

    if (
      !Number.isFinite(projectile.damage) ||
      !Number.isFinite(projectile.speed) ||
      !Number.isFinite(projectile.life) ||
      !Number.isFinite(projectile.range) ||
      !Number.isFinite(projectile.radius) ||
      !Number.isFinite(projectile.spread) ||
      !Number.isFinite(projectile.projectileCount) ||
      projectile.damage <= 0 ||
      projectile.speed <= 0 ||
      projectile.life <= 0 ||
      projectile.range <= 0 ||
      projectile.radius <= 0 ||
      projectile.spread < 0 ||
      projectile.projectileCount < 1
    ) {
      throw new Error(`Weapon "${weapon.id}" has invalid projectile values`);
    }

    ids.add(weapon.id);
    slots.add(weapon.slot);
  }
}

export interface WeaponRuntime {
  definition: WeaponDef;
  cooldownRemaining: number;
}

export interface ShotSpawn {
  angle: number;
  damage: number;
  speed: number;
  life: number;
  radius: number;
  pierce: number;
  weaponId: string;
  color: string;
  coreColor: string;
}
