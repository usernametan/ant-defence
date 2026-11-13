import type { SafeZoneDef } from "../content/territories";

export class SafeZone {
  readonly id: string;
  readonly name: string;
  readonly x: number;
  readonly y: number;
  readonly radius: number;
  private enabled = false;

  constructor(def: SafeZoneDef) {
    this.id = def.id;
    this.name = def.name;
    this.x = def.x;
    this.y = def.y;
    this.radius = def.radius;
  }

  get active(): boolean {
    return this.enabled;
  }

  activate(): void {
    this.enabled = true;
  }

  reset(): void {
    this.enabled = false;
  }
}
