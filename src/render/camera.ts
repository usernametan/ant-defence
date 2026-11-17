import type { Vec2 } from '../shared/types';

export interface ViewTransform {
  camX: number;
  camY: number;
  zoom: number;
  shakeX: number;
  shakeY: number;
  shakeAngle: number;
  width: number;
  height: number;
  dpr: number;
  screenToWorld: (sx: number, sy: number) => Vec2;
  worldToScreen: (wx: number, wy: number) => Vec2;
}

export type ViewTransformHook = (transform: ViewTransform) => void;

export class Camera {
  x = 0;
  y = 0;
  zoom = 1;
  private targetZoom = 1;
  private trauma = 0;
  private shakeTime = 0;
  private initialized = false;

  reset(pos: Vec2): void {
    this.x = pos.x;
    this.y = pos.y;
    this.zoom = 1;
    this.targetZoom = 1;
    this.trauma = 0;
    this.initialized = true;
  }

  addTrauma(amount: number): void {
    this.trauma = Math.min(1, this.trauma + amount);
  }

  addZoomKick(kick: number): void {
    this.zoom = Math.min(1.09, this.zoom + kick);
  }

  update(
    targetPos: Vec2,
    aimDir: Vec2,
    dt: number,
    lookAheadDist = 72,
  ): void {
    const desiredX = targetPos.x + aimDir.x * lookAheadDist;
    const desiredY = targetPos.y + aimDir.y * lookAheadDist;

    if (!this.initialized) {
      this.x = desiredX;
      this.y = desiredY;
      this.initialized = true;
    } else {
      const followRate = 1 - Math.exp(-8.5 * dt);
      this.x += (desiredX - this.x) * followRate;
      this.y += (desiredY - this.y) * followRate;
    }

    const zoomRate = 1 - Math.exp(-12 * dt);
    this.zoom += (this.targetZoom - this.zoom) * zoomRate;

    this.trauma = Math.max(0, this.trauma - 1.9 * dt);
    this.shakeTime += dt * 42;
  }

  getTransform(
    width: number,
    height: number,
    dpr: number,
    shakeScale: number,
    reducedMotion: boolean,
  ): ViewTransform {
    const shakeStrength = reducedMotion ? 0 : this.trauma * this.trauma * shakeScale;
    const shakeX =
      shakeStrength *
      14 *
      (Math.sin(this.shakeTime * 1.7) + 0.5 * Math.cos(this.shakeTime * 2.9));
    const shakeY =
      shakeStrength *
      14 *
      (Math.cos(this.shakeTime * 2.1) + 0.5 * Math.sin(this.shakeTime * 3.1));
    const shakeAngle = shakeStrength * 0.014 * Math.sin(this.shakeTime * 2.5);

    const cx = this.x + shakeX;
    const cy = this.y + shakeY;
    const halfW = width * 0.5;
    const halfH = height * 0.5;
    const zoom = this.zoom;

    const screenToWorld = (sx: number, sy: number): Vec2 => ({
      x: (sx - halfW) / zoom + cx,
      y: (sy - halfH) / zoom + cy,
    });

    const worldToScreen = (wx: number, wy: number): Vec2 => ({
      x: (wx - cx) * zoom + halfW,
      y: (wy - cy) * zoom + halfH,
    });

    return {
      camX: cx,
      camY: cy,
      zoom,
      shakeX,
      shakeY,
      shakeAngle,
      width,
      height,
      dpr,
      screenToWorld,
      worldToScreen,
    };
  }
}
