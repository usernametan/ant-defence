import { describe, expect, it } from 'vitest';
import { InputState } from './InputState';

describe('InputState', () => {
  it('reads WASD movement while keys are held', () => {
    const state = new InputState();

    expect(state.getMovementIntent()).toEqual({ x: 0, y: 0 });

    state.press('KeyW');
    state.press('KeyD');
    expect(state.getMovementIntent()).toEqual({ x: 1, y: -1 });

    state.release('KeyW');
    expect(state.getMovementIntent()).toEqual({ x: 1, y: 0 });

    state.release('KeyD');
    expect(state.getMovementIntent()).toEqual({ x: 0, y: 0 });
  });

  it('cancels opposing directions and clears stuck keys', () => {
    const state = new InputState();

    state.press('KeyW');
    state.press('KeyS');
    state.press('KeyA');
    state.press('KeyD');

    expect(state.getMovementIntent()).toEqual({ x: 0, y: 0 });

    state.clear();

    expect(state.getMovementIntent()).toEqual({ x: 0, y: 0 });
    expect(state.isSprinting()).toBe(false);
  });

  it('supports arrow-key movement and sprint modifiers', () => {
    const state = new InputState();

    state.press('ArrowLeft');
    state.press('ArrowDown');
    state.press('ShiftLeft');

    expect(state.getMovementIntent()).toEqual({ x: -1, y: 1 });
    expect(state.isSprinting()).toBe(true);

    state.release('ShiftLeft');
    state.press('ShiftRight');
    expect(state.isSprinting()).toBe(true);

    state.release('ShiftRight');
    expect(state.isSprinting()).toBe(false);
  });

  it('normalizes pointer position inside the canvas', () => {
    const state = new InputState();

    state.setPointer(480, 270, 960, 540, true);

    expect(state.getPointer()).toEqual({
      x: 480,
      y: 270,
      normalizedX: 0.5,
      normalizedY: 0.5,
      inside: true,
    });

    state.setPointer(1200, -20, 960, 540, true);

    expect(state.getPointer().normalizedX).toBe(1);
    expect(state.getPointer().normalizedY).toBe(0);

    state.setPointerInside(false);
    expect(state.getPointer().inside).toBe(false);
  });
});
