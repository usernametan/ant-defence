import { describe, expect, it } from 'vitest';
import {
  FixedStepLoop,
  type FrameScheduler,
  type FixedStepLoopOptions,
} from './Loop';

class FakeScheduler implements FrameScheduler {
  private currentTime = 0;
  private nextHandle = 1;
  private readonly callbacks = new Map<number, (time: number) => void>();

  now(): number {
    return this.currentTime;
  }

  requestFrame(callback: (time: number) => void): number {
    const handle = this.nextHandle;
    this.nextHandle += 1;
    this.callbacks.set(handle, callback);
    return handle;
  }

  cancelFrame(handle: number): void {
    this.callbacks.delete(handle);
  }

  advance(milliseconds: number): void {
    this.currentTime += milliseconds;
    const pending = [...this.callbacks.values()];
    this.callbacks.clear();

    for (const callback of pending) {
      callback(this.currentTime);
    }
  }
}

function createLoop(
  onUpdate: FixedStepLoopOptions['onUpdate'],
  onRender: FixedStepLoopOptions['onRender'],
  scheduler = new FakeScheduler(),
): FixedStepLoop {
  return new FixedStepLoop(scheduler, {
    fixedStep: 1 / 60,
    maxCatchUpSteps: 5,
    onUpdate,
    onRender,
  });
}

describe('FixedStepLoop', () => {
  it('advances fixed updates and preserves the remaining interpolation', () => {
    const updates: number[] = [];
    const loop = createLoop(
      (step) => updates.push(step),
      () => undefined,
    );

    const steps = loop.step(1 / 30);

    expect(steps).toBe(2);
    expect(updates).toHaveLength(2);
    expect(updates[0]).toBeCloseTo(1 / 60);
    expect(loop.alpha).toBeCloseTo(0);
  });

  it('accumulates sub-step time for later frames', () => {
    const updates: number[] = [];
    const loop = createLoop(
      (step) => updates.push(step),
      () => undefined,
    );

    expect(loop.step(1 / 120)).toBe(0);
    expect(loop.alpha).toBeCloseTo(0.5);
    expect(loop.step(1 / 120)).toBe(1);
    expect(updates).toHaveLength(1);
    expect(loop.alpha).toBeCloseTo(0);
  });

  it('caps catch-up work after a long frame', () => {
    const updates: number[] = [];
    const loop = createLoop(
      (step) => updates.push(step),
      () => undefined,
    );

    expect(loop.step(1)).toBe(5);
    expect(updates).toHaveLength(5);
    expect(loop.alpha).toBeLessThan(1);
  });

  it('drives updates and renders through the scheduler until stopped', () => {
    const scheduler = new FakeScheduler();
    const updates: number[] = [];
    const renders: number[] = [];
    const loop = createLoop(
      (step) => updates.push(step),
      (alpha) => renders.push(alpha),
      scheduler,
    );

    loop.start(0);
    scheduler.advance(20);

    expect(loop.isRunning).toBe(true);
    expect(updates.length).toBeGreaterThan(0);
    expect(renders).toHaveLength(1);

    loop.stop();
    scheduler.advance(20);

    expect(loop.isRunning).toBe(false);
    expect(renders).toHaveLength(1);
  });
});
