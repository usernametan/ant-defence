import { PICKUP_TYPES, type PickupTypeDef } from "../content/pickups";
import type { LoadedPickupDef, PickupKind } from "../world/MapDef";

export interface PickupTarget {
  readonly x: number;
  readonly y: number;
  readonly radius: number;
  readonly health: number;
  readonly maxHealth: number;
  readonly armor: number;
  readonly maxArmor: number;
  restoreHealth(amount: number): number;
  restoreArmor(amount: number): number;
}

export interface PickupState extends LoadedPickupDef {
  active: boolean;
  respawnRemaining: number;
  phase: number;
}

export interface PickupCollection {
  pickup: PickupState;
  restored: number;
}

export class PickupSystem {
  private readonly pickupsList: PickupState[];
  private readonly types: Record<PickupKind, PickupTypeDef>;

  constructor(
    spawns: readonly LoadedPickupDef[],
    types: Record<PickupKind, PickupTypeDef> = PICKUP_TYPES,
  ) {
    this.types = types;
    this.pickupsList = spawns.map((spawn, index) => ({
      ...spawn,
      active: true,
      respawnRemaining: 0,
      phase: index * 0.83,
    }));
  }

  get pickups(): readonly PickupState[] {
    return this.pickupsList;
  }

  get activeCount(): number {
    return this.pickupsList.reduce(
      (total, pickup) => total + (pickup.active ? 1 : 0),
      0,
    );
  }

  get totalCount(): number {
    return this.pickupsList.length;
  }

  update(deltaSeconds: number): void {
    if (!Number.isFinite(deltaSeconds) || deltaSeconds <= 0) {
      return;
    }

    for (const pickup of this.pickupsList) {
      if (pickup.active) {
        continue;
      }

      pickup.respawnRemaining = Math.max(
        0,
        pickup.respawnRemaining - deltaSeconds,
      );

      if (pickup.respawnRemaining === 0) {
        pickup.active = true;
      }
    }
  }

  collect(target: PickupTarget): PickupCollection[] {
    const collected: PickupCollection[] = [];

    for (const pickup of this.pickupsList) {
      if (!pickup.active) {
        continue;
      }

      const distance = Math.hypot(pickup.x - target.x, pickup.y - target.y);

      if (distance > target.radius + pickup.radius) {
        continue;
      }

      const restored =
        pickup.kind === "health"
          ? target.restoreHealth(pickup.amount)
          : target.restoreArmor(pickup.amount);

      if (restored <= 0) {
        continue;
      }

      pickup.active = false;
      pickup.respawnRemaining = pickup.respawnSeconds;
      collected.push({ pickup, restored });
    }

    return collected;
  }

  reset(): void {
    for (const pickup of this.pickupsList) {
      pickup.active = true;
      pickup.respawnRemaining = 0;
    }
  }

  getType(kind: PickupKind): PickupTypeDef {
    return this.types[kind];
  }
}
