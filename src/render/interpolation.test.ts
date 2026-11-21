import { describe, expect, it } from 'vitest';
import { interpolatePose, lerpAngle } from './interpolation';

describe('Render interpolation helper', () => {
  it('interpolates position and shortest-arc angle across alpha 0, 0.5, and 1', () => {
    const prev = { x: 100, y: 200, angle: Math.PI - 0.1 };
    const curr = { x: 120, y: 210, angle: -Math.PI + 0.1 };

    const p0 = interpolatePose(prev, curr, 0);
    expect(p0.x).toBe(100);
    expect(p0.y).toBe(200);
    expect(p0.angle).toBeCloseTo(Math.PI - 0.1, 4);

    const pHalf = interpolatePose(prev, curr, 0.5);
    expect(pHalf.x).toBe(110);
    expect(pHalf.y).toBe(205);
    expect(Math.abs(lerpAngle(prev.angle, curr.angle, 0.5))).toBeCloseTo(Math.PI, 4);

    const p1 = interpolatePose(prev, curr, 1);
    expect(p1.x).toBe(120);
    expect(p1.y).toBe(210);
  });

  it('snaps instead of interpolating when entity teleports or jumps > 64px', () => {
    const prev = { x: 100, y: 100, angle: 0 };
    const curr = { x: 320, y: 100, angle: 1.2 };

    const snapped = interpolatePose(prev, curr, 0.25);
    expect(snapped.x).toBe(320);
    expect(snapped.y).toBe(100);
    expect(snapped.angle).toBe(1.2);
  });
});
