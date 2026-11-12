import { clamp } from "../core/math";
import type { Rect, Size, Vec2 } from "../core/types";

export interface CollisionWorld extends Size {
  obstacles: readonly Rect[];
}

export interface CollisionResult {
  position: Vec2;
  hitX: boolean;
  hitY: boolean;
}

export function circleIntersectsAabb(
  center: Vec2,
  radius: number,
  rect: Rect,
): boolean {
  const nearestX = clamp(center.x, rect.x, rect.x + rect.width);
  const nearestY = clamp(center.y, rect.y, rect.y + rect.height);
  const deltaX = center.x - nearestX;
  const deltaY = center.y - nearestY;

  return deltaX * deltaX + deltaY * deltaY < radius * radius;
}

export function segmentCircleHit(
  start: Vec2,
  end: Vec2,
  center: Vec2,
  radius: number,
): number | null {
  const deltaX = end.x - start.x;
  const deltaY = end.y - start.y;
  const offsetX = start.x - center.x;
  const offsetY = start.y - center.y;
  const radiusSquared = radius * radius;

  if (offsetX * offsetX + offsetY * offsetY <= radiusSquared) {
    return 0;
  }

  const a = deltaX * deltaX + deltaY * deltaY;

  if (a < 1e-9) {
    return null;
  }

  const b = 2 * (offsetX * deltaX + offsetY * deltaY);
  const c = offsetX * offsetX + offsetY * offsetY - radiusSquared;
  const discriminant = b * b - 4 * a * c;

  if (discriminant < 0) {
    return null;
  }

  const t = (-b - Math.sqrt(discriminant)) / (2 * a);

  return t >= 0 && t <= 1 ? t : null;
}

export function segmentAabbHit(
  start: Vec2,
  end: Vec2,
  rect: Rect,
  padding = 0,
): number | null {
  const minX = rect.x - padding;
  const maxX = rect.x + rect.width + padding;
  const minY = rect.y - padding;
  const maxY = rect.y + rect.height + padding;
  const deltaX = end.x - start.x;
  const deltaY = end.y - start.y;
  let entry = 0;
  let exit = 1;

  if (Math.abs(deltaX) < 1e-9) {
    if (start.x < minX || start.x > maxX) {
      return null;
    }
  } else {
    let nearX = (minX - start.x) / deltaX;
    let farX = (maxX - start.x) / deltaX;

    if (nearX > farX) {
      [nearX, farX] = [farX, nearX];
    }

    entry = Math.max(entry, nearX);
    exit = Math.min(exit, farX);

    if (entry > exit) {
      return null;
    }
  }

  if (Math.abs(deltaY) < 1e-9) {
    if (start.y < minY || start.y > maxY) {
      return null;
    }
  } else {
    let nearY = (minY - start.y) / deltaY;
    let farY = (maxY - start.y) / deltaY;

    if (nearY > farY) {
      [nearY, farY] = [farY, nearY];
    }

    entry = Math.max(entry, nearY);
    exit = Math.min(exit, farY);

    if (entry > exit) {
      return null;
    }
  }

  return entry;
}

export function moveCircleWithCollision(
  position: Vec2,
  delta: Vec2,
  radius: number,
  world: CollisionWorld,
): CollisionResult {
  const maxStep = Math.max(1, radius * 0.75);
  const distance = Math.max(Math.abs(delta.x), Math.abs(delta.y));
  const steps = Math.max(1, Math.ceil(distance / maxStep));
  const stepX = delta.x / steps;
  const stepY = delta.y / steps;
  let current = { ...position };
  let hitX = false;
  let hitY = false;

  for (let step = 0; step < steps; step += 1) {
    const result = moveCircleWithCollisionStep(
      current,
      {
        x: hitX ? 0 : stepX,
        y: hitY ? 0 : stepY,
      },
      radius,
      world,
    );

    current = result.position;
    hitX = hitX || result.hitX;
    hitY = hitY || result.hitY;
  }

  return {
    position: current,
    hitX,
    hitY,
  };
}

function moveCircleWithCollisionStep(
  position: Vec2,
  delta: Vec2,
  radius: number,
  world: CollisionWorld,
): CollisionResult {
  const minX = Math.min(radius, world.width / 2);
  const maxX = Math.max(world.width - radius, world.width / 2);
  const minY = Math.min(radius, world.height / 2);
  const maxY = Math.max(world.height - radius, world.height / 2);
  const startY = clamp(position.y, minY, maxY);

  const requestedX = position.x + delta.x;
  let x = clamp(requestedX, minX, maxX);
  let hitX = x !== requestedX;

  for (const obstacle of world.obstacles) {
    if (!circleIntersectsAabb({ x, y: startY }, radius, obstacle)) {
      continue;
    }

    if (delta.x > 0) {
      x = Math.min(x, obstacle.x - radius);
    } else if (delta.x < 0) {
      x = Math.max(x, obstacle.x + obstacle.width + radius);
    } else {
      x = position.x;
    }

    hitX = true;
  }

  x = clamp(x, minX, maxX);

  const requestedY = position.y + delta.y;
  let y = clamp(requestedY, minY, maxY);
  let hitY = y !== requestedY;

  for (const obstacle of world.obstacles) {
    if (!circleIntersectsAabb({ x, y }, radius, obstacle)) {
      continue;
    }

    if (delta.y > 0) {
      y = Math.min(y, obstacle.y - radius);
    } else if (delta.y < 0) {
      y = Math.max(y, obstacle.y + obstacle.height + radius);
    } else {
      y = position.y;
    }

    hitY = true;
  }

  y = clamp(y, minY, maxY);

  return {
    position: { x, y },
    hitX,
    hitY,
  };
}
