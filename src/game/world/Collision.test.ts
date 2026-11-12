import { describe, expect, it } from 'vitest';
import {
  circleIntersectsAabb,
  hasLineOfSight,
  moveCircleWithCollision,
  segmentAabbHit,
  segmentCircleHit,
  type CollisionWorld,
} from './Collision';

function createWorld(
  obstacles: CollisionWorld['obstacles'] = [],
): CollisionWorld {
  return {
    width: 1000,
    height: 1000,
    obstacles,
  };
}

describe('circleIntersectsAabb', () => {
  it('detects circles overlapping or touching an AABB', () => {
    expect(
      circleIntersectsAabb(
        { x: 20, y: 20 },
        10,
        { x: 10, y: 10, width: 20, height: 20 },
      ),
    ).toBe(true);
    expect(
      circleIntersectsAabb(
        { x: 0, y: 20 },
        10,
        { x: 10, y: 10, width: 20, height: 20 },
      ),
    ).toBe(false);
    expect(
      circleIntersectsAabb(
        { x: 4, y: 20 },
        10,
        { x: 10, y: 10, width: 20, height: 20 },
      ),
    ).toBe(true);
  });

  it('detects a circle inside an AABB', () => {
    expect(
      circleIntersectsAabb(
        { x: 20, y: 20 },
        5,
        { x: 10, y: 10, width: 20, height: 20 },
      ),
    ).toBe(true);
  });
});

describe('segment collisions', () => {
  it('finds the first segment-circle intersection', () => {
    expect(
      segmentCircleHit(
        { x: 0, y: 0 },
        { x: 100, y: 0 },
        { x: 50, y: 0 },
        10,
      ),
    ).toBeCloseTo(0.4);
    expect(
      segmentCircleHit(
        { x: 0, y: 100 },
        { x: 100, y: 100 },
        { x: 50, y: 0 },
        10,
      ),
    ).toBeNull();
    expect(
      segmentCircleHit(
        { x: 50, y: 0 },
        { x: 100, y: 0 },
        { x: 50, y: 0 },
        10,
      ),
    ).toBe(0);
  });

  it('finds the first segment-AABB intersection with padding', () => {
    const rect = { x: 40, y: -10, width: 20, height: 20 };

    expect(
      segmentAabbHit({ x: 0, y: 0 }, { x: 100, y: 0 }, rect),
    ).toBeCloseTo(0.4);
    expect(
      segmentAabbHit({ x: 0, y: 0 }, { x: 100, y: 0 }, rect, 10),
    ).toBeCloseTo(0.3);
    expect(
      segmentAabbHit(
        { x: 0, y: 40 },
        { x: 100, y: 40 },
        rect,
      ),
    ).toBeNull();
  });
});

describe('hasLineOfSight', () => {
  it('detects clear and blocked sight lines', () => {
    expect(
      hasLineOfSight({ x: 0, y: 100 }, { x: 300, y: 100 }, createWorld()),
    ).toBe(true);
    expect(
      hasLineOfSight(
        { x: 0, y: 100 },
        { x: 300, y: 100 },
        createWorld([{ x: 140, y: 60, width: 20, height: 80 }]),
      ),
    ).toBe(false);
  });
});

describe('moveCircleWithCollision', () => {
  it('blocks movement into a solid while allowing the other axis to slide', () => {
    const wall = { x: 200, y: 150, width: 50, height: 100 };
    const result = moveCircleWithCollision(
      { x: 100, y: 200 },
      { x: 200, y: 80 },
      10,
      createWorld([wall]),
    );

    expect(result.position.x).toBeCloseTo(190);
    expect(result.position.y).toBeCloseTo(280);
    expect(result.hitX).toBe(true);
    expect(result.hitY).toBe(false);
  });

  it('prevents tunnelling through a solid during a large step', () => {
    const wall = { x: 200, y: 150, width: 50, height: 100 };
    const result = moveCircleWithCollision(
      { x: 100, y: 200 },
      { x: 200, y: 0 },
      10,
      createWorld([wall]),
    );

    expect(result.position.x).toBeCloseTo(190);
    expect(result.hitX).toBe(true);
  });

  it('clamps movement to the world bounds', () => {
    const result = moveCircleWithCollision(
      { x: 20, y: 20 },
      { x: -100, y: -100 },
      8,
      createWorld(),
    );

    expect(result.position).toEqual({ x: 8, y: 8 });
    expect(result.hitX).toBe(true);
    expect(result.hitY).toBe(true);
  });

  it('leaves an unobstructed move unchanged', () => {
    const result = moveCircleWithCollision(
      { x: 100, y: 100 },
      { x: 32, y: -12 },
      10,
      createWorld(),
    );

    expect(result.position.x).toBeCloseTo(132);
    expect(result.position.y).toBeCloseTo(88);
    expect(result.hitX).toBe(false);
    expect(result.hitY).toBe(false);
  });
});
