import type { SimApi } from '../shared/api';
import type { GameState, InputState, MatchConfig } from '../shared/types';
import { DEFAULT_CONFIG } from '../sim';
import { FIXED_DT, MAX_SUBSTEPS } from '../sim/constants';

/** Camera mapping supplied by the renderer: screen = world * scale + offset. */
export interface ViewTransform {
  offsetX: number;
  offsetY: number;
  scale: number;
}

const KEY_MOVE_UP = 'KeyW';
const KEY_MOVE_DOWN = 'KeyS';
const KEY_MOVE_LEFT = 'KeyA';
const KEY_MOVE_RIGHT = 'KeyD';
const KEY_RELOAD = 'KeyR';
const KEY_INTERACT = 'KeyE';
/** The HUD labels Q as Tactical Dash; Shift/Space remain aliases. */
const KEY_DASH = ['KeyQ', 'ShiftLeft', 'ShiftRight', 'Space'];

/**
 * Owns the SimApi instance, drives a fixed 60 Hz update loop, and translates
 * keyboard/mouse events into the shared InputState contract. Renderer code can
 * read live state through getState() every frame; HUD code uses the throttled
 * useGameState() hook.
 */
export class GameController {
  private readonly sim: SimApi;
  private readonly keys = new Set<string>();
  private readonly mouse = { x: 0, y: 0, down: false };
  private view: ViewTransform = { offsetX: 0, offsetY: 0, scale: 1 };
  private attached: HTMLElement | null = null;
  private rafId: number | null = null;
  private lastFrame: number | null = null;
  private accumulator = 0;
  private readonly input: InputState = {
    moveX: 0,
    moveY: 0,
    aimX: 0,
    aimY: 0,
    firing: false,
    reload: false,
    interact: false,
    swapWeapon: false,
    dash: false,
  };

  constructor(sim: SimApi) {
    this.sim = sim;
  }

  getSim(): SimApi {
    return this.sim;
  }

  startMatch(config: MatchConfig = DEFAULT_CONFIG): void {
    this.clearInput();
    this.sim.start(config);
  }

  togglePause(): void {
    const status = this.sim.getState().status;
    if (status === 'playing') this.sim.pause();
    else if (status === 'paused') this.sim.resume();
  }

  restartMatch(): void {
    this.clearInput();
    this.sim.restart();
  }

  /** Live snapshot for the renderer; never cache or mutate this object. */
  getState(): Readonly<GameState> {
    return this.sim.getState();
  }

  /** Camera mapping from the renderer, e.g. setViewTransform({ offsetX, offsetY, scale }). */
  setViewTransform(view: Partial<ViewTransform>): void {
    this.view = { ...this.view, ...view };
    if (!Number.isFinite(this.view.scale) || this.view.scale <= 0) this.view.scale = 1;
  }

  getViewTransform(): Readonly<ViewTransform> {
    return { ...this.view };
  }

  /** Attach DOM listeners. Returns a detach function for cleanup. */
  attach(target: HTMLElement = document.body): () => void {
    this.detach();
    this.attached = target;
    target.addEventListener('mousemove', this.onMouseMove);
    target.addEventListener('mousedown', this.onMouseDown);
    window.addEventListener('mouseup', this.onMouseUp);
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', this.onBlur);
    return () => this.detach();
  }

  detach(): void {
    if (this.attached) {
      this.attached.removeEventListener('mousemove', this.onMouseMove);
      this.attached.removeEventListener('mousedown', this.onMouseDown);
      this.attached = null;
    }
    window.removeEventListener('mouseup', this.onMouseUp);
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('blur', this.onBlur);
    this.keys.clear();
    this.mouse.down = false;
  }

  start(): void {
    if (this.rafId !== null) return;
    this.lastFrame = null;
    this.accumulator = 0;
    this.rafId = requestAnimationFrame(this.frame);
  }

  stop(): void {
    if (this.rafId !== null) cancelAnimationFrame(this.rafId);
    this.rafId = null;
    this.lastFrame = null;
    this.accumulator = 0;
  }

  /** Current intent, exposed for diagnostics and testing. */
  getInput(): Readonly<InputState> {
    return this.buildInput();
  }

  // --- Pure input handlers (also used by tests and non-DOM hosts) ---

  keyDown(code: string): void {
    this.keys.add(code);
  }

  keyUp(code: string): void {
    this.keys.delete(code);
  }

  mouseMove(clientX: number, clientY: number): void {
    const rect = this.attached?.getBoundingClientRect();
    this.mouse.x = clientX - (rect?.left ?? 0);
    this.mouse.y = clientY - (rect?.top ?? 0);
  }

  mouseDown(button = 0): void {
    if (button === 0) this.mouse.down = true;
  }

  mouseUp(button = 0): void {
    if (button === 0) this.mouse.down = false;
  }

  clearInput(): void {
    this.keys.clear();
    this.mouse.down = false;
  }

  private buildInput(): InputState {
    this.input.moveX = (this.keys.has(KEY_MOVE_RIGHT) ? 1 : 0) - (this.keys.has(KEY_MOVE_LEFT) ? 1 : 0);
    this.input.moveY = (this.keys.has(KEY_MOVE_DOWN) ? 1 : 0) - (this.keys.has(KEY_MOVE_UP) ? 1 : 0);
    this.input.aimX = (this.mouse.x - this.view.offsetX) / this.view.scale;
    this.input.aimY = (this.mouse.y - this.view.offsetY) / this.view.scale;
    this.input.firing = this.mouse.down;
    this.input.reload = this.keys.has(KEY_RELOAD);
    this.input.interact = this.keys.has(KEY_INTERACT);
    this.input.swapWeapon = false;
    this.input.dash = KEY_DASH.some((code) => this.keys.has(code));
    return this.input;
  }

  private readonly frame = (nowMs: number): void => {
    const delta = this.lastFrame === null ? 0 : (nowMs - this.lastFrame) / 1000;
    this.lastFrame = nowMs;
    this.accumulator += Math.min(Math.max(delta, 0), 0.25);

    let steps = 0;
    while (this.accumulator >= FIXED_DT && steps < MAX_SUBSTEPS) {
      this.sim.setInput(this.buildInput());
      this.sim.step(FIXED_DT);
      this.accumulator -= FIXED_DT;
      steps += 1;
    }
    if (steps === MAX_SUBSTEPS) this.accumulator = 0;

    this.rafId = requestAnimationFrame(this.frame);
  };

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    this.keyDown(event.code);
    if (event.code === 'Space' || event.code.startsWith('Arrow')) event.preventDefault();
  };

  private readonly onKeyUp = (event: KeyboardEvent): void => {
    this.keyUp(event.code);
  };

  private readonly onMouseMove = (event: MouseEvent): void => {
    this.mouseMove(event.clientX, event.clientY);
  };

  private readonly onMouseDown = (event: MouseEvent): void => {
    this.mouseDown(event.button);
  };

  private readonly onMouseUp = (event: MouseEvent): void => {
    this.mouseUp(event.button);
  };

  private readonly onBlur = (): void => {
    this.clearInput();
  };
}
