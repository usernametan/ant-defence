import { describe, expect, it } from 'vitest';
import { Camera } from './Camera';

function createCamera() {
  return new Camera({
    viewportWidth: 400,
    viewportHeight: 300,
    worldWidth: 1600,
    worldHeight: 1000,
  });
}

describe('Camera', () => {
  it('starts centered on the world', () => {
    const camera = createCamera();

    expect(camera.x).toBe(800);
    expect(camera.y).toBe(500);
    expect(camera.left).toBe(600);
    expect(camera.top).toBe(350);
  });

  it('clamps the camera center to the world bounds', () => {
    const camera = createCamera();

    camera.moveTo(-500, -500);
    expect(camera.x).toBe(200);
    expect(camera.y).toBe(150);

    camera.moveTo(5000, 5000);
    expect(camera.x).toBe(1400);
    expect(camera.y).toBe(850);
  });

  it('re-centers when the viewport is larger than the world', () => {
    const camera = createCamera();

    camera.setViewport(2000, 1400);

    expect(camera.x).toBe(800);
    expect(camera.y).toBe(500);
    expect(camera.left).toBe(-200);
    expect(camera.top).toBe(-200);
  });

  it('re-clamps when world bounds change', () => {
    const camera = createCamera();
    camera.moveTo(1400, 850);

    camera.setBounds(900, 600);

    expect(camera.x).toBe(700);
    expect(camera.y).toBe(450);
  });

  it('converts between world and screen coordinates', () => {
    const camera = createCamera();
    camera.moveTo(800, 500);

    expect(camera.worldToScreen({ x: 800, y: 500 })).toEqual({
      x: 200,
      y: 150,
    });
    expect(camera.screenToWorld({ x: 200, y: 150 })).toEqual({
      x: 800,
      y: 500,
    });
  });

  it('follows a target with smoothing instead of snapping', () => {
    const camera = createCamera();
    camera.moveTo(800, 500);

    camera.follow({ x: 1000, y: 500 }, 1, {
      smoothing: 8,
      deadzone: 0,
    });

    expect(camera.x).toBeGreaterThan(800);
    expect(camera.x).toBeLessThan(1000);
  });

  it('ignores small movements inside the deadzone', () => {
    const camera = createCamera();
    camera.moveTo(800, 500);

    camera.follow({ x: 820, y: 500 }, 1, { deadzone: 30 });
    expect(camera.x).toBe(800);

    camera.follow({ x: 900, y: 500 }, 1, { deadzone: 30 });
    expect(camera.x).toBeGreaterThan(800);
  });

  it('caps look-ahead and stays inside the world bounds', () => {
    const camera = createCamera();
    camera.moveTo(800, 500);

    camera.follow({ x: 800, y: 500 }, 1, {
      smoothing: 1,
      deadzone: 0,
      lookAhead: { x: 1000, y: 0 },
      maxLookAhead: 90,
    });
    expect(camera.x).toBeCloseTo(800 + 90 * (1 - Math.exp(-1)), 5);

    camera.moveTo(1400, 850);
    camera.follow({ x: 1500, y: 1200 }, 1, {
      smoothing: 8,
      deadzone: 0,
    });
    expect(camera.x).toBe(1400);
    expect(camera.y).toBe(850);
  });

  it('produces the same follow result at different frame rates', () => {
    const sixty = createCamera();
    const oneTwenty = createCamera();
    sixty.moveTo(800, 500);
    oneTwenty.moveTo(800, 500);

    sixty.follow({ x: 1000, y: 500 }, 1, {
      smoothing: 8,
      deadzone: 0,
    });

    for (let index = 0; index < 120; index += 1) {
      oneTwenty.follow({ x: 1000, y: 500 }, 1 / 120, {
        smoothing: 8,
        deadzone: 0,
      });
    }

    expect(oneTwenty.x).toBeCloseTo(sixty.x, 5);
  });

  it('keeps pointer aim offsets stable as the camera pans', () => {
    const camera = createCamera();
    const pointer = { x: 340, y: 210 };
    camera.moveTo(800, 500);

    const firstAim = camera.screenToWorld(pointer);
    expect(camera.worldToScreen(firstAim)).toEqual(pointer);
    expect(firstAim.x - pointer.x).toBe(camera.left);
    expect(firstAim.y - pointer.y).toBe(camera.top);

    camera.moveTo(1000, 600);

    const secondAim = camera.screenToWorld(pointer);
    expect(secondAim.x - firstAim.x).toBeCloseTo(200);
    expect(secondAim.y - firstAim.y).toBeCloseTo(100);
    expect(camera.worldToScreen(secondAim)).toEqual(pointer);
  });

  it('returns the visible world rectangle', () => {
    const camera = createCamera();
    camera.moveTo(800, 500);

    expect(camera.getViewRect()).toEqual({
      x: 600,
      y: 350,
      width: 400,
      height: 300,
    });
    expect(camera.getViewRect(50)).toEqual({
      x: 550,
      y: 300,
      width: 500,
      height: 400,
    });
  });
});
