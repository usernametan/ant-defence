import { randomRange, type RandomSource } from "../core/rng";
import type { Vec2 } from "../core/types";
import { STARTER_WEAPONS } from "../content/equipment";
import type { ShotSpawn, WeaponDef } from "./WeaponDef";

export interface CombatConfig {
  maxEnergy: number;
  energyRegenRate: number;
  energyRegenDelay: number;
}

export const DEFAULT_COMBAT_CONFIG: CombatConfig = {
  maxEnergy: 100,
  energyRegenRate: 26,
  energyRegenDelay: 0.32,
};

export interface CombatFireInput {
  firing: boolean;
  origin: Vec2;
  aim: Vec2 | null;
}

export interface FireResult {
  weapon: WeaponDef;
  spawns: ShotSpawn[];
}

export class CombatSystem {
  private readonly weapons: readonly WeaponDef[];
  private readonly cooldowns: number[];
  private readonly config: CombatConfig;
  private currentIndex = 0;
  private energy: number;
  private energyRegenDelayRemaining = 0;

  constructor(
    weapons: readonly WeaponDef[] = STARTER_WEAPONS,
    config: CombatConfig = DEFAULT_COMBAT_CONFIG,
    private readonly random: RandomSource = Math.random,
  ) {
    if (weapons.length === 0) {
      throw new Error("CombatSystem requires at least one weapon");
    }

    this.weapons = weapons;
    this.cooldowns = weapons.map(() => 0);
    this.config = config;
    this.energy = config.maxEnergy;
  }

  get availableWeapons(): readonly WeaponDef[] {
    return this.weapons;
  }

  get currentWeapon(): WeaponDef {
    return this.weapons[this.currentIndex];
  }

  get selectedIndex(): number {
    return this.currentIndex;
  }

  get currentEnergy(): number {
    return this.energy;
  }

  get maxEnergy(): number {
    return this.config.maxEnergy;
  }

  get currentCooldownRemaining(): number {
    return this.cooldowns[this.currentIndex];
  }

  get currentCooldownMax(): number {
    return this.currentWeapon.cooldown;
  }

  get isReady(): boolean {
    return (
      this.currentCooldownRemaining <= 0 &&
      this.energy >= this.currentWeapon.energyCost
    );
  }

  selectWeapon(index: number): boolean {
    if (
      !Number.isInteger(index) ||
      index < 0 ||
      index >= this.weapons.length
    ) {
      return false;
    }

    this.currentIndex = index;
    return true;
  }

  update(deltaSeconds: number, input: CombatFireInput): FireResult | null {
    if (Number.isFinite(deltaSeconds) && deltaSeconds > 0) {
      this.tick(deltaSeconds);
    }

    return this.tryFire(input);
  }

  reset(): void {
    this.currentIndex = 0;
    this.energy = this.config.maxEnergy;
    this.energyRegenDelayRemaining = 0;

    for (let index = 0; index < this.cooldowns.length; index += 1) {
      this.cooldowns[index] = 0;
    }
  }

  private tick(deltaSeconds: number): void {
    for (let index = 0; index < this.cooldowns.length; index += 1) {
      this.cooldowns[index] = Math.max(
        0,
        this.cooldowns[index] - deltaSeconds,
      );
    }

    this.energyRegenDelayRemaining = Math.max(
      0,
      this.energyRegenDelayRemaining - deltaSeconds,
    );

    if (this.energyRegenDelayRemaining === 0) {
      this.energy = Math.min(
        this.config.maxEnergy,
        this.energy + this.config.energyRegenRate * deltaSeconds,
      );
    }
  }

  private tryFire(input: CombatFireInput): FireResult | null {
    if (!input.firing || !input.aim) {
      return null;
    }

    const deltaX = input.aim.x - input.origin.x;
    const deltaY = input.aim.y - input.origin.y;
    const distance = Math.hypot(deltaX, deltaY);

    if (distance < 4) {
      return null;
    }

    const weapon = this.currentWeapon;
    const cooldown = this.cooldowns[this.currentIndex];

    if (cooldown > 0 || this.energy < weapon.energyCost) {
      return null;
    }

    this.energy -= weapon.energyCost;
    this.energyRegenDelayRemaining = this.config.energyRegenDelay;
    this.cooldowns[this.currentIndex] = weapon.cooldown;

    const baseAngle = Math.atan2(deltaY, deltaX);
    const projectileCount = Math.max(
      1,
      Math.floor(weapon.projectile.projectileCount),
    );
    const spread = Math.max(0, weapon.projectile.spread);
    const spawns: ShotSpawn[] = [];

    for (let index = 0; index < projectileCount; index += 1) {
      let offset = 0;

      if (projectileCount === 1) {
        offset = spread > 0 ? randomRange(this.random, -spread, spread) : 0;
      } else {
        offset = (index / (projectileCount - 1) - 0.5) * 2 * spread;
      }

      spawns.push({
        angle: baseAngle + offset,
        damage: weapon.projectile.damage,
        speed: weapon.projectile.speed,
        life: weapon.projectile.life,
        radius: weapon.projectile.radius,
        pierce: weapon.projectile.pierce,
        weaponId: weapon.id,
        color: weapon.projectile.color,
        coreColor: weapon.projectile.coreColor,
      });
    }

    return {
      weapon,
      spawns,
    };
  }
}
