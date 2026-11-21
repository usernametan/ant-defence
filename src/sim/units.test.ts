import { describe, expect, it } from 'vitest';
import { WEAPON_DEFS } from '../shared/api';
import type { MapData, Team, Unit, WeaponId } from '../shared/types';
import {
  DASH_COOLDOWN,
  DASH_SPEED,
  REGEN_DELAY,
  TILE_SIZE,
  UNIT_MAX_SPEED,
} from './constants';
import { SimWorld } from './world';
import { updateUnits } from './units';

function blankMap(): MapData {
  const tiles = Array.from({ length: 20 }, (_, y) =>
    Array.from({ length: 20 }, (_, x): 'wall' | 'floor' =>
      x === 0 || y === 0 || x === 19 || y === 19 ? 'wall' : 'floor',
    ),
  );
  return {
    seed: 1, width: 20, height: 20, tileSize: TILE_SIZE,
    tiles, coverHp: {}, zones: [],
    bases: [
      { team: 'player', center: { x: 160, y: 160 }, radius: 100, coreHp: 1000 },
      { team: 'enemy', center: { x: 500, y: 160 }, radius: 100, coreHp: 1000 },
    ],
    crateSpawns: [],
  };
}

function makeWorld(): SimWorld {
  return new SimWorld(
    { seed: 3, difficulty: 'normal', scoreToWin: 100, enemyCount: 2, startingWeapon: 'pistol' },
    blankMap(),
  );
}

function addUnit(world: SimWorld, id: string, team: Team, weapon: WeaponId, x: number, y: number, isPlayer = false): Unit {
  const def = WEAPON_DEFS[weapon];
  const unit: Unit = {
    id, team, pos: { x, y }, vel: { x: 0, y: 0 }, angle: 0,
    hp: 100, maxHp: 100, weaponId: weapon,
    ammoInMag: def.magSize, reserveAmmo: def.magSize * 5,
    reloading: false, reloadProgress: 0, isPlayer,
    dead: false, respawnIn: 0, kills: 0, deaths: 0,
  };
  world.addUnit(unit);
  return unit;
}

function tick(world: SimWorld, dt = 1 / 60): void {
  world.state.time += dt;
  world.state.tick += 1;
  updateUnits(world, dt);
}

describe('units', () => {
  it('accelerates toward the movement axis and stops at max speed', () => {
    const world = makeWorld();
    const player = addUnit(world, 'p', 'player', 'pistol', 300, 300, true);
    world.runtime(player).intent.moveX = 1;
    for (let i = 0; i < 120; i += 1) tick(world);
    expect(player.pos.x).toBeGreaterThan(300);
    expect(Math.hypot(player.vel.x, player.vel.y)).toBeLessThanOrEqual(UNIT_MAX_SPEED + 1);
  });

  it('applies friction when movement input stops', () => {
    const world = makeWorld();
    const player = addUnit(world, 'p', 'player', 'pistol', 300, 300, true);
    world.runtime(player).intent.moveX = 1;
    for (let i = 0; i < 30; i += 1) tick(world);
    const movingSpeed = Math.hypot(player.vel.x, player.vel.y);
    world.runtime(player).intent.moveX = 0;
    for (let i = 0; i < 60; i += 1) tick(world);
    expect(Math.hypot(player.vel.x, player.vel.y)).toBeLessThan(movingSpeed);
  });

  it('dashes with a cooldown', () => {
    const world = makeWorld();
    const player = addUnit(world, 'p', 'player', 'pistol', 300, 300, true);
    world.runtime(player).intent.moveX = 1;
    world.runtime(player).intent.dash = true;
    tick(world);
    expect(Math.hypot(player.vel.x, player.vel.y)).toBeGreaterThan(DASH_SPEED * 0.9);
    expect(world.runtime(player).dashCooldown).toBeGreaterThan(DASH_COOLDOWN - 0.1);
    expect(player.dashCooldown).toBe(world.runtime(player).dashCooldown);
    expect(player.dashMaxCooldown).toBe(DASH_COOLDOWN);

    world.runtime(player).intent.dash = false;
    for (let i = 0; i < 10; i += 1) tick(world);
    world.runtime(player).intent.dash = true;
    const speedBefore = Math.hypot(player.vel.x, player.vel.y);
    tick(world);
    expect(Math.hypot(player.vel.x, player.vel.y)).toBeLessThan(DASH_SPEED);
    expect(Math.hypot(player.vel.x, player.vel.y)).toBeLessThanOrEqual(speedBefore + 1);
  });

  it('aims the player at the aim point in world coordinates', () => {
    const world = makeWorld();
    const player = addUnit(world, 'p', 'player', 'pistol', 300, 300, true);
    world.runtime(player).intent.aimX = 300;
    world.runtime(player).intent.aimY = 400;
    tick(world);
    expect(player.angle).toBeCloseTo(Math.PI / 2, 3);
  });

  it('regenerates health only after the out-of-combat delay', () => {
    const world = makeWorld();
    const player = addUnit(world, 'p', 'player', 'pistol', 300, 300, true);
    player.hp = 50;
    world.runtime(player).lastDamageAt = 0;
    for (let i = 0; i < 60; i += 1) tick(world);
    expect(player.hp).toBe(50);
    for (let i = 0; i < REGEN_DELAY * 60 + 30; i += 1) tick(world);
    expect(player.hp).toBeGreaterThan(50);
    expect(player.hp).toBeLessThanOrEqual(100);
  });

  it('respawns a dead player with full health at the base', () => {
    const world = makeWorld();
    const player = addUnit(world, 'p', 'player', 'pistol', 300, 300, true);
    world.damageUnit(player, 200, 'enemy-1', 'pistol', player.pos);
    expect(player.dead).toBe(true);
    for (let i = 0; i < 300; i += 1) tick(world);
    expect(player.dead).toBe(false);
    expect(player.hp).toBe(100);
    expect(player.respawnIn).toBe(0);
  });

  it('staggers enemy respawns into waves', () => {
    const world = makeWorld();
    const first = addUnit(world, 'e1', 'enemy', 'pistol', 400, 400);
    const second = addUnit(world, 'e2', 'enemy', 'pistol', 420, 400);
    world.damageUnit(first, 200, 'p', 'pistol', first.pos);
    world.damageUnit(second, 200, 'p', 'pistol', second.pos);
    expect(second.respawnIn).toBeGreaterThan(first.respawnIn);
  });
});
