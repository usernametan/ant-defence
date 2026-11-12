import { describe, expect, it } from 'vitest';
import type { CollisionWorld } from '../world/Collision';
import { DEFAULT_PLAYER_CONFIG, Player } from './Player';

const OPEN_WORLD: CollisionWorld = {
  width: 2048,
  height: 1280,
  obstacles: [],
};

function simulate(
  player: Player,
  seconds: number,
  intent: { x: number; y: number },
  sprintHeld = false,
  aimWorld: { x: number; y: number } | null = null,
): void {
  const step = 1 / 60;
  const steps = Math.round(seconds / step);

  for (let index = 0; index < steps; index += 1) {
    player.update(step, intent, sprintHeld, OPEN_WORLD, aimWorld);
  }
}

describe('Player movement', () => {
  it('moves in all four cardinal directions', () => {
    const right = new Player({ x: 500, y: 500 });
    const left = new Player({ x: 500, y: 500 });
    const down = new Player({ x: 500, y: 500 });
    const up = new Player({ x: 500, y: 500 });

    simulate(right, 0.5, { x: 1, y: 0 });
    simulate(left, 0.5, { x: -1, y: 0 });
    simulate(down, 0.5, { x: 0, y: 1 });
    simulate(up, 0.5, { x: 0, y: -1 });

    expect(right.x).toBeGreaterThan(500);
    expect(left.x).toBeLessThan(500);
    expect(down.y).toBeGreaterThan(500);
    expect(up.y).toBeLessThan(500);
  });

  it('normalizes diagonal movement to the same speed', () => {
    const cardinal = new Player({ x: 500, y: 500 });
    const diagonal = new Player({ x: 500, y: 500 });

    simulate(cardinal, 1, { x: 1, y: 0 });
    simulate(diagonal, 1, { x: 1, y: 1 });

    expect(cardinal.velocity.x).toBeCloseTo(
      DEFAULT_PLAYER_CONFIG.moveSpeed,
      1,
    );
    expect(diagonal.velocity.x).toBeCloseTo(diagonal.velocity.y, 5);
    expect(diagonal.speed).toBeCloseTo(cardinal.speed, 1);
  });

  it('is not tied to a single frame rate', () => {
    const sixty = new Player({ x: 500, y: 500 });
    const oneTwenty = new Player({ x: 500, y: 500 });

    simulate(sixty, 1, { x: 1, y: 0 });

    for (let index = 0; index < 120; index += 1) {
      oneTwenty.update(1 / 120, { x: 1, y: 0 }, false, OPEN_WORLD);
    }

    expect(Math.abs(sixty.x - oneTwenty.x)).toBeLessThan(2);
    expect(Math.abs(sixty.y - oneTwenty.y)).toBeLessThan(0.001);
  });

  it('decelerates to a stop when input is released', () => {
    const player = new Player({ x: 500, y: 500 });

    simulate(player, 0.5, { x: 1, y: 0 });
    simulate(player, 0.5, { x: 0, y: 0 });

    expect(player.speed).toBe(0);
    expect(player.velocity).toEqual({ x: 0, y: 0 });
  });

  it('faces the mouse aim position', () => {
    const player = new Player({ x: 500, y: 500 });

    player.update(1 / 60, { x: 0, y: 0 }, false, OPEN_WORLD, {
      x: 700,
      y: 500,
    });
    expect(player.facingAngle).toBeCloseTo(0);

    player.update(1 / 60, { x: 0, y: 0 }, false, OPEN_WORLD, {
      x: 500,
      y: 700,
    });
    expect(player.facingAngle).toBeCloseTo(Math.PI / 2);
  });
});

describe('Player sprint and stamina', () => {
  it('sprints faster and drains stamina, then recovers', () => {
    const player = new Player({ x: 500, y: 500 });

    simulate(player, 1, { x: 1, y: 0 }, true);

    expect(player.isSprinting).toBe(true);
    expect(player.currentStamina).toBeLessThan(player.maxStamina);
    expect(player.speed).toBeGreaterThan(
      DEFAULT_PLAYER_CONFIG.moveSpeed * 1.25,
    );

    const drainedStamina = player.currentStamina;
    simulate(player, 1, { x: 1, y: 0 }, false);

    expect(player.currentStamina).toBeGreaterThan(drainedStamina);
  });
});

describe('Player dodge', () => {
  it('bursts in the requested direction and enforces its cooldown', () => {
    const player = new Player({ x: 500, y: 500 });
    const startX = player.x;

    expect(player.requestDodge({ x: 1, y: 0 })).toBe(true);
    expect(player.isDodging).toBe(true);
    expect(player.isInvulnerable).toBe(true);
    expect(player.dodgeCooldownRemaining).toBeCloseTo(
      DEFAULT_PLAYER_CONFIG.dodgeCooldown,
    );
    expect(player.requestDodge({ x: 1, y: 0 })).toBe(false);

    simulate(player, 0.3, { x: 0, y: 0 });

    expect(player.x).toBeGreaterThan(startX + 50);
    expect(player.isDodging).toBe(false);
    expect(player.requestDodge({ x: 1, y: 0 })).toBe(false);

    simulate(player, 0.6, { x: 0, y: 0 });

    expect(player.requestDodge({ x: 1, y: 0 })).toBe(true);
  });

  it('respects collision during a dodge', () => {
    const world: CollisionWorld = {
      width: 1000,
      height: 1000,
      obstacles: [{ x: 150, y: 150, width: 50, height: 200 }],
    };
    const player = new Player({ x: 100, y: 250 });

    expect(player.requestDodge({ x: 1, y: 0 })).toBe(true);

    for (let index = 0; index < 20; index += 1) {
      player.update(1 / 60, { x: 0, y: 0 }, false, world);
    }

    expect(player.x).toBeCloseTo(132);
    expect(player.velocity.x).toBe(0);
  });
});
