import { describe, expect, it } from 'vitest';
import { InputRouter, type InputAction } from './InputRouter';

class FakeWindow extends EventTarget {}

function createKeyboardEvent(
  type: 'keydown' | 'keyup',
  code: string,
  repeat = false,
): KeyboardEvent {
  const event = new Event(type, { cancelable: true });

  Object.defineProperties(event, {
    code: { value: code },
    repeat: { value: repeat },
  });

  return event as unknown as KeyboardEvent;
}

function createPointerEvent(
  clientX: number,
  clientY: number,
  type = 'pointermove',
  button = 0,
): PointerEvent {
  const event = new Event(type, { cancelable: true });

  Object.defineProperties(event, {
    clientX: { value: clientX },
    clientY: { value: clientY },
    button: { value: button },
  });

  return event as unknown as PointerEvent;
}

function createHarness() {
  const target = new FakeWindow() as unknown as Window;
  const canvas = new EventTarget() as unknown as HTMLCanvasElement;
  const actions: InputAction[] = [];
  let blurs = 0;

  Object.defineProperty(canvas, 'getBoundingClientRect', {
    value: () => ({
      left: 0,
      top: 0,
      width: 960,
      height: 540,
      right: 960,
      bottom: 540,
      x: 0,
      y: 0,
    }),
  });

  const router = new InputRouter(target, canvas, {
    onAction: (action) => actions.push(action),
    onBlur: () => {
      blurs += 1;
    },
  });

  return { target, canvas, actions, router, blurs: () => blurs };
}

describe('InputRouter', () => {
  it('tracks held movement keys and releases them', () => {
    const { target, router } = createHarness();
    router.attach();

    target.dispatchEvent(createKeyboardEvent('keydown', 'KeyW'));
    target.dispatchEvent(createKeyboardEvent('keydown', 'KeyD'));
    expect(router.getMovementIntent()).toEqual({ x: 1, y: -1 });

    target.dispatchEvent(createKeyboardEvent('keyup', 'KeyW'));
    expect(router.getMovementIntent()).toEqual({ x: 1, y: 0 });

    target.dispatchEvent(createKeyboardEvent('keydown', 'ShiftLeft'));
    expect(router.isSprinting()).toBe(true);

    router.detach();
  });

  it('dispatches actions once and ignores key repeat', () => {
    const { target, actions, router } = createHarness();
    router.attach();

    target.dispatchEvent(createKeyboardEvent('keydown', 'Enter'));
    target.dispatchEvent(createKeyboardEvent('keydown', 'Enter', true));
    target.dispatchEvent(createKeyboardEvent('keydown', 'Space'));
    target.dispatchEvent(createKeyboardEvent('keydown', 'Space', true));

    expect(actions).toEqual(['start', 'dodge']);

    router.detach();
  });

  it('dispatches weapon selection actions from number keys', () => {
    const { target, actions, router } = createHarness();
    router.attach();

    target.dispatchEvent(createKeyboardEvent('keydown', 'Digit1'));
    target.dispatchEvent(createKeyboardEvent('keydown', 'Digit2'));
    target.dispatchEvent(createKeyboardEvent('keydown', 'Digit3'));
    target.dispatchEvent(createKeyboardEvent('keydown', 'KeyI'));

    expect(actions).toEqual(['weapon1', 'weapon2', 'weapon3', 'inventory']);

    router.detach();
  });

  it('dispatches the interaction action from E', () => {
    const { target, actions, router } = createHarness();
    router.attach();

    target.dispatchEvent(createKeyboardEvent('keydown', 'KeyE'));
    target.dispatchEvent(createKeyboardEvent('keydown', 'KeyE', true));

    expect(actions).toEqual(['interact']);

    router.detach();
  });

  it('tracks left-button fire until pointer release', () => {
    const { target, canvas, router } = createHarness();
    router.attach();

    canvas.dispatchEvent(
      createPointerEvent(460, 250, 'pointerdown', 0),
    );
    expect(router.isFiring()).toBe(true);

    target.dispatchEvent(createPointerEvent(460, 250, 'pointerup', 0));
    expect(router.isFiring()).toBe(false);

    canvas.dispatchEvent(
      createPointerEvent(460, 250, 'pointerdown', 2),
    );
    expect(router.isFiring()).toBe(false);

    router.detach();
  });

  it('clears fire when the pointer leaves the canvas', () => {
    const { canvas, router } = createHarness();
    router.attach();

    canvas.dispatchEvent(
      createPointerEvent(300, 200, 'pointerdown', 0),
    );
    expect(router.isFiring()).toBe(true);

    canvas.dispatchEvent(createPointerEvent(300, 200, 'pointerleave'));
    expect(router.isFiring()).toBe(false);
    expect(router.getPointer().inside).toBe(false);

    router.detach();
  });

  it('returns relative pointer coordinates and clears state on blur', () => {
    const { target, canvas, router, blurs } = createHarness();
    router.attach();

    canvas.dispatchEvent(createPointerEvent(480, 135));
    expect(router.getPointer()).toMatchObject({
      x: 480,
      y: 135,
      normalizedX: 0.5,
      normalizedY: 0.25,
      inside: true,
    });

    target.dispatchEvent(createKeyboardEvent('keydown', 'KeyA'));
    target.dispatchEvent(new Event('blur'));

    expect(router.getMovementIntent()).toEqual({ x: 0, y: 0 });
    expect(blurs()).toBe(1);
    expect(router.getPointer().inside).toBe(false);

    router.detach();
  });
});
