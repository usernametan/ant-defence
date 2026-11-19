import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SimApi } from '../shared/api';
import type { GameState, InputState } from '../shared/types';
import { FIXED_DT } from '../sim/constants';
import { GameController } from './GameController';

interface MockSim extends SimApi {
  inputs: InputState[];
  steps: number[];
}

function makeSim(): MockSim {
  const state = {} as GameState;
  return {
    inputs: [],
    steps: [],
    start: vi.fn(),
    setInput(input: InputState) {
      this.inputs.push({ ...input });
    },
    step(dt: number) {
      this.steps.push(dt);
    },
    getState: () => state,
    pause: vi.fn(),
    resume: vi.fn(),
    restart: vi.fn(),
  };
}

interface PendingFrame {
  id: number;
  callback: FrameRequestCallback;
}

let frames: PendingFrame[];
let nextFrameId: number;

beforeEach(() => {
  frames = [];
  nextFrameId = 1;
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback): number => {
    const id = nextFrameId;
    nextFrameId += 1;
    frames.push({ id, callback });
    return id;
  });
  vi.stubGlobal('cancelAnimationFrame', (id: number): void => {
    const index = frames.findIndex((frame) => frame.id === id);
    if (index >= 0) frames.splice(index, 1);
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function advance(nowMs: number): void {
  const frame = frames.shift();
  if (frame) frame.callback(nowMs);
}

describe('GameController', () => {
  it('maps keyboard and mouse state into InputState with the camera transform', () => {
    const controller = new GameController(makeSim());
    controller.setViewTransform({ offsetX: 100, offsetY: 50, scale: 2 });
    controller.mouseMove(500, 250);
    controller.keyDown('KeyD');
    controller.keyDown('KeyW');
    controller.keyDown('KeyR');
    controller.keyDown('KeyE');
    controller.keyDown('KeyG');
    controller.keyDown('ShiftLeft');
    controller.mouseDown(0);

    const input = controller.getInput();
    expect(input.moveX).toBe(1);
    expect(input.moveY).toBe(-1);
    expect(input.aimX).toBe(200);
    expect(input.aimY).toBe(100);
    expect(input.firing).toBe(true);
    expect(input.reload).toBe(true);
    expect(input.interact).toBe(true);
    expect(input.throwGrenade).toBe(true);
    expect(input.dash).toBe(true);

    controller.mouseUp(0);
    controller.keyUp('KeyD');
    controller.keyUp('KeyG');
    expect(controller.getInput().firing).toBe(false);
    expect(controller.getInput().moveX).toBe(0);
    expect(controller.getInput().throwGrenade).toBe(false);
  });

  it('rejects a non-positive camera scale', () => {
    const controller = new GameController(makeSim());
    controller.setViewTransform({ scale: 0 });
    expect(controller.getViewTransform().scale).toBe(1);
  });

  it('drives the sim at a fixed 60 Hz through the frame accumulator', () => {
    const sim = makeSim();
    const controller = new GameController(sim);
    controller.start();
    expect(frames).toHaveLength(1);

    advance(0);
    expect(sim.steps).toHaveLength(0);

    advance(16.67);
    expect(sim.steps).toEqual([FIXED_DT]);
    expect(sim.inputs).toHaveLength(1);

    advance(33.34);
    expect(sim.steps).toHaveLength(2);
    expect(frames).toHaveLength(1);
  });

  it('carries fractional frame time instead of dropping it', () => {
    const sim = makeSim();
    const controller = new GameController(sim);
    controller.start();
    advance(0);
    advance(8);
    expect(sim.steps).toHaveLength(0);
    advance(25);
    expect(sim.steps).toHaveLength(1);
  });

  it('caps catch-up steps after a long stall', () => {
    const sim = makeSim();
    const controller = new GameController(sim);
    controller.start();
    advance(0);
    advance(1000);
    expect(sim.steps).toHaveLength(5);
  });

  it('stops scheduling frames when stopped', () => {
    const controller = new GameController(makeSim());
    controller.start();
    controller.stop();
    expect(frames).toHaveLength(0);
    controller.stop();
    expect(frames).toHaveLength(0);
  });
});
