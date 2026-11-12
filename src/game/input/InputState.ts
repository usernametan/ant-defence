import { clamp } from "../core/math";
import type { Vec2 } from "../core/types";
import type { PointerState } from "./InputRouter";

export const MOVEMENT_BINDINGS = {
  up: ["KeyW", "ArrowUp"],
  down: ["KeyS", "ArrowDown"],
  left: ["KeyA", "ArrowLeft"],
  right: ["KeyD", "ArrowRight"],
  sprint: ["ShiftLeft", "ShiftRight"],
} as const;

export class InputState {
  private readonly downKeys = new Set<string>();
  private pointer: PointerState = {
    x: 0,
    y: 0,
    normalizedX: 0.5,
    normalizedY: 0.5,
    inside: false,
  };

  press(code: string): void {
    this.downKeys.add(code);
  }

  release(code: string): void {
    this.downKeys.delete(code);
  }

  clear(): void {
    this.downKeys.clear();
  }

  isKeyDown(code: string): boolean {
    return this.downKeys.has(code);
  }

  isSprinting(): boolean {
    return this.anyDown(MOVEMENT_BINDINGS.sprint);
  }

  getMovementIntent(): Vec2 {
    return {
      x: Number(this.anyDown(MOVEMENT_BINDINGS.right)) -
        Number(this.anyDown(MOVEMENT_BINDINGS.left)),
      y: Number(this.anyDown(MOVEMENT_BINDINGS.down)) -
        Number(this.anyDown(MOVEMENT_BINDINGS.up)),
    };
  }

  getPointer(): PointerState {
    return { ...this.pointer };
  }

  setPointer(
    x: number,
    y: number,
    width: number,
    height: number,
    inside: boolean,
  ): void {
    const safeWidth = Math.max(1, width);
    const safeHeight = Math.max(1, height);

    this.pointer = {
      x,
      y,
      normalizedX: clamp(x / safeWidth, 0, 1),
      normalizedY: clamp(y / safeHeight, 0, 1),
      inside,
    };
  }

  setPointerInside(inside: boolean): void {
    this.pointer = {
      ...this.pointer,
      inside,
    };
  }

  private anyDown(codes: readonly string[]): boolean {
    return codes.some((code) => this.downKeys.has(code));
  }
}
