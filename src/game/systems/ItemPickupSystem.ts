import { getItemType, type WorldItemTypeDef } from "../content/pickups";
import type { LoadedItemDef } from "../world/MapDef";

export interface ItemPickupTarget {
  readonly x: number;
  readonly y: number;
  readonly radius: number;
}

export interface ItemPickupState extends LoadedItemDef {
  active: boolean;
  phase: number;
}

export class ItemPickupSystem {
  private readonly itemsList: ItemPickupState[];

  constructor(spawns: readonly LoadedItemDef[]) {
    this.itemsList = spawns.map((spawn, index) => ({
      ...spawn,
      active: true,
      phase: index * 1.17,
    }));
  }

  get items(): readonly ItemPickupState[] {
    return this.itemsList;
  }

  get activeCount(): number {
    return this.itemsList.reduce(
      (total, item) => total + (item.active ? 1 : 0),
      0,
    );
  }

  get totalCount(): number {
    return this.itemsList.length;
  }

  collect(
    target: ItemPickupTarget,
    accept: (item: ItemPickupState) => boolean,
  ): ItemPickupState[] {
    const collected: ItemPickupState[] = [];

    for (const item of this.itemsList) {
      if (!item.active) {
        continue;
      }

      const distance = Math.hypot(item.x - target.x, item.y - target.y);

      if (distance > target.radius + item.radius) {
        continue;
      }

      if (!accept(item)) {
        continue;
      }

      item.active = false;
      collected.push(item);
    }

    return collected;
  }

  reset(): void {
    for (const item of this.itemsList) {
      item.active = true;
    }
  }

  getType(item: ItemPickupState): WorldItemTypeDef {
    return getItemType(item.kind);
  }
}
