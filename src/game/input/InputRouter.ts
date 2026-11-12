export type InputAction = "start" | "pause" | "toggleDebug";

export interface PointerState {
  x: number;
  y: number;
  inside: boolean;
}

export interface InputHandlers {
  onAction: (action: InputAction) => void;
  onBlur?: () => void;
  onPointerMove?: (pointer: PointerState) => void;
}

export const DEFAULT_BINDINGS: Record<InputAction, readonly string[]> = {
  start: ["Enter", "Space"],
  pause: ["Escape"],
  toggleDebug: ["F3"],
};

const ACTION_BY_CODE = new Map<string, InputAction>();

for (const [action, codes] of Object.entries(DEFAULT_BINDINGS)) {
  for (const code of codes) {
    ACTION_BY_CODE.set(code, action as InputAction);
  }
}

export class InputRouter {
  private readonly downKeys = new Set<string>();
  private pointer: PointerState = { x: 0, y: 0, inside: false };
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
    this.canvas.addEventListener("pointermove", this.handlePointerMove);
    this.canvas.addEventListener("pointerenter", this.handlePointerMove);
    this.canvas.addEventListener("pointerleave", this.handlePointerLeave);
  }

  detach(): void {
    if (!this.attached) {
      return;
    }

    this.attached = false;
    this.target.removeEventListener("keydown", this.handleKeyDown);
    this.target.removeEventListener("keyup", this.handleKeyUp);
    this.target.removeEventListener("blur", this.handleBlur);
    this.canvas.removeEventListener("pointermove", this.handlePointerMove);
    this.canvas.removeEventListener("pointerenter", this.handlePointerMove);
    this.canvas.removeEventListener("pointerleave", this.handlePointerLeave);
    this.downKeys.clear();
  }

  isKeyDown(code: string): boolean {
    return this.downKeys.has(code);
  }

  getPointer(): PointerState {
    return { ...this.pointer };
  }

  private readonly handleKeyDown = (event: KeyboardEvent): void => {
    this.downKeys.add(event.code);

    const action = ACTION_BY_CODE.get(event.code);

    if (!action) {
      return;
    }

    event.preventDefault();
    this.handlers.onAction(action);
  };

  private readonly handleKeyUp = (event: KeyboardEvent): void => {
    this.downKeys.delete(event.code);
  };

  private readonly handleBlur = (): void => {
    this.downKeys.clear();
    this.handlers.onBlur?.();
  };

  private readonly handlePointerMove = (event: PointerEvent): void => {
    const rect = this.canvas.getBoundingClientRect();
    this.pointer = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
      inside: true,
    };
    this.handlers.onPointerMove?.(this.getPointer());
  };

  private readonly handlePointerLeave = (): void => {
    this.pointer = {
      ...this.pointer,
      inside: false,
    };
    this.handlers.onPointerMove?.(this.getPointer());
  };
}
