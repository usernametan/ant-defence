import { InputState, MOVEMENT_BINDINGS } from "./InputState";

export type InputAction =
  | "start"
  | "pause"
  | "toggleDebug"
  | "dodge"
  | "weapon1"
  | "weapon2"
  | "weapon3";

export interface PointerState {
  x: number;
  y: number;
  normalizedX: number;
  normalizedY: number;
  inside: boolean;
  fireHeld: boolean;
}

export interface InputHandlers {
  onAction: (action: InputAction) => void;
  onBlur?: () => void;
  onPointerMove?: (pointer: PointerState) => void;
}

export const DEFAULT_BINDINGS: Record<InputAction, readonly string[]> = {
  start: ["Enter"],
  pause: ["Escape"],
  toggleDebug: ["F3"],
  dodge: ["Space"],
  weapon1: ["Digit1"],
  weapon2: ["Digit2"],
  weapon3: ["Digit3"],
};

const MOVEMENT_KEYS = new Set<string>(
  Object.values(MOVEMENT_BINDINGS).flat(),
);
const ACTION_BY_CODE = new Map<string, InputAction>();

for (const [action, codes] of Object.entries(DEFAULT_BINDINGS)) {
  for (const code of codes) {
    ACTION_BY_CODE.set(code, action as InputAction);
  }
}

export class InputRouter {
  private readonly state = new InputState();
  private attached = false;

  constructor(
    private readonly target: Window,
    private readonly canvas: HTMLCanvasElement,
    private readonly handlers: InputHandlers,
  ) {}

  attach(): void {
    if (this.attached) {
      return;
    }

    this.attached = true;
    this.target.addEventListener("keydown", this.handleKeyDown);
    this.target.addEventListener("keyup", this.handleKeyUp);
    this.target.addEventListener("blur", this.handleBlur);
    this.target.addEventListener("pointerup", this.handlePointerUp);
    this.target.addEventListener("pointercancel", this.handlePointerUp);
    this.canvas.addEventListener("pointermove", this.handlePointerMove);
    this.canvas.addEventListener("pointerenter", this.handlePointerMove);
    this.canvas.addEventListener("pointerleave", this.handlePointerLeave);
    this.canvas.addEventListener("pointerdown", this.handlePointerDown);
  }

  detach(): void {
    if (!this.attached) {
      return;
    }

    this.attached = false;
    this.target.removeEventListener("keydown", this.handleKeyDown);
    this.target.removeEventListener("keyup", this.handleKeyUp);
    this.target.removeEventListener("blur", this.handleBlur);
    this.target.removeEventListener("pointerup", this.handlePointerUp);
    this.target.removeEventListener("pointercancel", this.handlePointerUp);
    this.canvas.removeEventListener("pointermove", this.handlePointerMove);
    this.canvas.removeEventListener("pointerenter", this.handlePointerMove);
    this.canvas.removeEventListener("pointerleave", this.handlePointerLeave);
    this.canvas.removeEventListener("pointerdown", this.handlePointerDown);
    this.state.clear();
  }

  isKeyDown(code: string): boolean {
    return this.state.isKeyDown(code);
  }

  getMovementIntent() {
    return this.state.getMovementIntent();
  }

  isSprinting(): boolean {
    return this.state.isSprinting();
  }

  isFiring(): boolean {
    return this.state.isFiring();
  }

  getPointer(): PointerState {
    return this.state.getPointer();
  }

  private readonly handleKeyDown = (event: KeyboardEvent): void => {
    this.state.press(event.code);

    const action = ACTION_BY_CODE.get(event.code);

    if (action || MOVEMENT_KEYS.has(event.code)) {
      event.preventDefault();
    }

    if (!action || event.repeat) {
      return;
    }

    this.handlers.onAction(action);
  };

  private readonly handleKeyUp = (event: KeyboardEvent): void => {
    this.state.release(event.code);
  };

  private readonly handleBlur = (): void => {
    this.state.clear();
    this.state.setPointerInside(false);
    this.handlers.onBlur?.();
  };

  private readonly handlePointerMove = (event: PointerEvent): void => {
    this.updatePointer(event);
    this.handlers.onPointerMove?.(this.state.getPointer());
  };

  private readonly handlePointerDown = (event: PointerEvent): void => {
    if (event.button !== 0) {
      return;
    }

    event.preventDefault();
    this.updatePointer(event);
    this.state.setFireHeld(true);
    this.handlers.onPointerMove?.(this.state.getPointer());
  };

  private readonly handlePointerUp = (): void => {
    this.state.setFireHeld(false);
    this.handlers.onPointerMove?.(this.state.getPointer());
  };

  private readonly handlePointerLeave = (): void => {
    this.state.setPointerInside(false);
    this.state.setFireHeld(false);
    this.handlers.onPointerMove?.(this.state.getPointer());
  };

  private updatePointer(event: PointerEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    this.state.setPointer(x, y, rect.width, rect.height, true);
  }
}
