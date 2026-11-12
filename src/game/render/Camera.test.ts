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
