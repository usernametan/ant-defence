import { clamp, damp } from "../core/math";
import type { Rect, Vec2 } from "../core/types";

export interface CameraConfig {
  viewportWidth: number;
  viewportHeight: number;
  worldWidth: number;
  worldHeight: number;
}

export interface CameraFollowOptions {
  smoothing?: number;
  deadzone?: number;
  lookAhead?: Vec2;
  maxLookAhead?: number;
}

export class Camera {
  private viewportWidth: number;
  private viewportHeight: number;
  private worldWidth: number;
  private worldHeight: number;
  private centerX: number;
  private centerY: number;

  constructor(config: CameraConfig) {
    this.viewportWidth = config.viewportWidth;
    this.viewportHeight = config.viewportHeight;
    this.worldWidth = config.worldWidth;
    this.worldHeight = config.worldHeight;
    this.centerX = config.worldWidth / 2;
    this.centerY = config.worldHeight / 2;
    this.clampPosition();
  }

  get x(): number {
    return this.centerX;
  }

  get y(): number {
    return this.centerY;
  }

  get left(): number {
    return this.centerX - this.viewportWidth / 2;
  }

  get top(): number {
    return this.centerY - this.viewportHeight / 2;
  }

  get right(): number {
    return this.centerX + this.viewportWidth / 2;
  }

  get bottom(): number {
    return this.centerY + this.viewportHeight / 2;
  }

  get width(): number {
    return this.viewportWidth;
  }

  get height(): number {
    return this.viewportHeight;
  }

  setViewport(width: number, height: number): void {
    this.viewportWidth = width;
    this.viewportHeight = height;
    this.clampPosition();
  }

  setBounds(width: number, height: number): void {
    this.worldWidth = width;
    this.worldHeight = height;
    this.clampPosition();
  }

  moveTo(x: number, y: number): void {
    this.centerX = x;
    this.centerY = y;
    this.clampPosition();
  }

  panBy(deltaX: number, deltaY: number): void {
    this.moveTo(this.centerX + deltaX, this.centerY + deltaY);
  }

  follow(
    target: Vec2,
    deltaSeconds: number,
    options: CameraFollowOptions = {},
  ): void {
    if (!Number.isFinite(deltaSeconds) || deltaSeconds <= 0) {
      return;
    }

    const smoothing = options.smoothing ?? 8;
    const deadzone = Math.max(0, options.deadzone ?? 28);
    const maxLookAhead = Math.max(0, options.maxLookAhead ?? 90);
    const lookAhead = options.lookAhead ?? { x: 0, y: 0 };
    const lookAheadLength = Math.hypot(lookAhead.x, lookAhead.y);
    const lookAheadScale =
      lookAheadLength > maxLookAhead && lookAheadLength > 0
        ? maxLookAhead / lookAheadLength
        : 1;
    const desiredX = target.x + lookAhead.x * lookAheadScale;
    const desiredY = target.y + lookAhead.y * lookAheadScale;
    const followX = this.applyDeadzone(desiredX, this.centerX, deadzone);
    const followY = this.applyDeadzone(desiredY, this.centerY, deadzone);

    this.moveTo(
      damp(this.centerX, followX, smoothing, deltaSeconds),
      damp(this.centerY, followY, smoothing, deltaSeconds),
    );
  }

  worldToScreen(point: Vec2): Vec2 {
    return {
      x: point.x - this.left,
      y: point.y - this.top,
    };
  }

  screenToWorld(point: Vec2): Vec2 {
    return {
      x: point.x + this.left,
      y: point.y + this.top,
    };
  }

  getViewRect(margin = 0): Rect {
    const left = clamp(this.left - margin, 0, this.worldWidth);
    const top = clamp(this.top - margin, 0, this.worldHeight);
    const right = clamp(this.right + margin, 0, this.worldWidth);
    const bottom = clamp(this.bottom + margin, 0, this.worldHeight);

    return {
      x: left,
      y: top,
      width: Math.max(0, right - left),
      height: Math.max(0, bottom - top),
    };
  }

  private clampPosition(): void {
    this.centerX = this.clampAxis(
      this.centerX,
      this.viewportWidth,
      this.worldWidth,
    );
    this.centerY = this.clampAxis(
      this.centerY,
      this.viewportHeight,
      this.worldHeight,
    );
  }

  private clampAxis(value: number, viewport: number, world: number): number {
    if (world <= viewport) {
      return world / 2;
    }

    const halfViewport = viewport / 2;
    return clamp(value, halfViewport, world - halfViewport);
  }

  private applyDeadzone(
    desired: number,
    current: number,
    deadzone: number,
  ): number {
    if (deadzone <= 0) {
      return desired;
    }

    const delta = desired - current;

    if (Math.abs(delta) <= deadzone) {
      return current;
    }

    return desired - Math.sign(delta) * deadzone;
  }
}
