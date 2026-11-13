import type {
  LoadedInteractableDef,
  MapPointOfInterestDef,
} from "./MapDef";
import type { Vec2 } from "../core/types";

export interface TriggerTarget extends Vec2 {
  readonly radius: number;
}

export interface TriggerPointOfInterestState {
  id: string;
  name: string;
  x: number;
  y: number;
  radius: number;
}

export interface InteractableState extends LoadedInteractableDef {
  activated: boolean;
}

export interface TriggerUpdateResult {
  enteredPoints: readonly TriggerPointOfInterestState[];
  nearbyInteractable: InteractableState | null;
}

export class TriggerSystem {
  private readonly points: readonly TriggerPointOfInterestState[];
  private readonly interactablesList: InteractableState[];
  private readonly visitedPoints = new Set<string>();
  private nearby: InteractableState | null = null;

  constructor(
    points: readonly MapPointOfInterestDef[],
    interactables: readonly LoadedInteractableDef[] = [],
  ) {
    this.points = points.map((point) => ({
      id: point.id,
      name: point.name,
      x: point.x,
      y: point.y,
      radius: point.radius,
    }));
    this.interactablesList = interactables.map((interactable) => ({
      ...interactable,
      activated: false,
    }));
  }

  get interactables(): readonly InteractableState[] {
    return this.interactablesList;
  }

  get nearbyInteractable(): InteractableState | null {
    return this.nearby;
  }

  update(target: TriggerTarget): TriggerUpdateResult {
    const enteredPoints: TriggerPointOfInterestState[] = [];

    for (const point of this.points) {
      if (this.visitedPoints.has(point.id)) {
        continue;
      }

      if (this.containsPoint(point, target)) {
        this.visitedPoints.add(point.id);
        enteredPoints.push(point);
      }
    }

    this.nearby = this.findNearbyInteractable(target);

    return {
      enteredPoints,
      nearbyInteractable: this.nearby,
    };
  }

  findNearby(target: TriggerTarget): InteractableState | null {
    return this.findNearbyInteractable(target);
  }

  activateNearby(target: TriggerTarget): InteractableState | null {
    const interactable = this.findNearbyInteractable(target);

    if (!interactable) {
      this.nearby = null;
      return null;
    }

    interactable.activated = true;
    this.nearby = null;

    return interactable;
  }

  reset(): void {
    this.visitedPoints.clear();
    this.nearby = null;

    for (const interactable of this.interactablesList) {
      interactable.activated = false;
    }
  }

  private findNearbyInteractable(
    target: TriggerTarget,
  ): InteractableState | null {
    for (const interactable of this.interactablesList) {
      if (interactable.activated) {
        continue;
      }

      const distance = Math.hypot(
        interactable.x - target.x,
        interactable.y - target.y,
      );

      if (distance <= interactable.radius + target.radius) {
        return interactable;
      }
    }

    return null;
  }

  private containsPoint(
    point: TriggerPointOfInterestState,
    target: TriggerTarget,
  ): boolean {
    return (
      Math.hypot(point.x - target.x, point.y - target.y) <=
      point.radius + target.radius
    );
  }
}
