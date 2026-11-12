export type WeaponCategory = "emitter" | "repeater" | "heavy";

export interface WeaponProjectileDef {
  damage: number;
  speed: number;
  life: number;
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
