export interface FrameScheduler {
  now(): number;
  requestFrame(callback: (time: number) => void): number;
  cancelFrame(handle: number): void;
}

export interface FixedStepLoopOptions {
  fixedStep?: number;
  maxCatchUpSteps?: number;
  maxFrameDelta?: number;
  onUpdate: (stepSeconds: number) => void;
  onRender: (interpolation: number) => void;
  onError?: (error: unknown) => void;
}

export const browserFrameScheduler: FrameScheduler = {
  now: () => performance.now(),
  requestFrame: (callback) => requestAnimationFrame(callback),
  cancelFrame: (handle) => cancelAnimationFrame(handle),
};

export class FixedStepLoop {
  private readonly fixedStep: number;
  private readonly maxCatchUpSteps: number;
  private readonly maxFrameDelta: number;
  private accumulatorSeconds = 0;
  private lastFrameTimeMs = 0;
  private frameHandle: number | null = null;
  private running = false;
  private interpolation = 0;

  constructor(
    private readonly scheduler: FrameScheduler,
    private readonly options: FixedStepLoopOptions,
  ) {
    this.fixedStep = options.fixedStep ?? 1 / 60;
    this.maxCatchUpSteps = options.maxCatchUpSteps ?? 5;
    this.maxFrameDelta = options.maxFrameDelta ?? 0.25;

    if (this.fixedStep <= 0) {
      throw new RangeError("fixedStep must be greater than zero");
    }

    if (this.maxCatchUpSteps < 1) {
      throw new RangeError("maxCatchUpSteps must be at least one");
    }
  }

  get isRunning(): boolean {
    return this.running;
  }

  get alpha(): number {
    return this.interpolation;
  }

  start(now = this.scheduler.now()): void {
    if (this.running) {
      return;
    }

    this.running = true;
    this.lastFrameTimeMs = now;
    this.frameHandle = this.scheduler.requestFrame(this.tick);
  }

  stop(): void {
    if (!this.running) {
      return;
    }

    this.running = false;

    if (this.frameHandle !== null) {
      this.scheduler.cancelFrame(this.frameHandle);
      this.frameHandle = null;
    }
  }

  step(deltaSeconds: number): number {
    if (!Number.isFinite(deltaSeconds) || deltaSeconds <= 0) {
      this.interpolation = this.accumulatorSeconds / this.fixedStep;
      return 0;
    }

    this.accumulatorSeconds += Math.min(
      deltaSeconds,
      this.maxFrameDelta,
    );

    let steps = 0;

    while (
      this.accumulatorSeconds + 1e-9 >= this.fixedStep &&
      steps < this.maxCatchUpSteps
    ) {
      this.accumulatorSeconds = Math.max(
        0,
        this.accumulatorSeconds - this.fixedStep,
      );
      steps += 1;
      this.options.onUpdate(this.fixedStep);
    }

    if (this.accumulatorSeconds >= this.fixedStep) {
      this.accumulatorSeconds %= this.fixedStep;
    }

    this.interpolation = this.accumulatorSeconds / this.fixedStep;
    return steps;
  }

  private readonly tick = (time: number): void => {
    if (!this.running) {
      return;
    }

    const deltaSeconds = (time - this.lastFrameTimeMs) / 1000;
    this.lastFrameTimeMs = time;

    try {
      this.step(deltaSeconds);
      this.options.onRender(this.interpolation);
    } catch (error) {
      this.options.onError?.(error);
    }

    if (this.running) {
      this.frameHandle = this.scheduler.requestFrame(this.tick);
    }
  };
}
