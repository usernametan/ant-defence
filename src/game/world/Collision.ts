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
