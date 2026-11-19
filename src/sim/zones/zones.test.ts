import { afterEach, describe, expect, it, vi } from 'vitest';
import { bus } from '../../shared/events';
import type { MapData, Team, Unit, WeaponId } from '../../shared/types';
import { MATCH_TIME_LIMIT, TILE_SIZE } from '../constants';
import { SimWorld } from '../world';
import { checkWin, updateBaseCores, updateZones } from './index';

const unsubscribers: Array<() => void> = [];
afterEach(() => {
  unsubscribers.splice(0).forEach((unsubscribe) => unsubscribe());
  bus.clear();
});

function makeMap(): MapData {
  const tiles = Array.from({ length: 20 }, (_, y) =>
    Array.from({ length: 30 }, (_, x): 'wall' | 'floor' =>
      x === 0 || y === 0 || x === 29 || y === 19 ? 'wall' : 'floor',
    ),
  );
  return {
    seed: 1, width: 30, height: 20, tileSize: TILE_SIZE,
    tiles, coverHp: {},
    zones: [{ id: 'zone-1', center: { x: 480, y: 320 }, radius: 112 }],
    bases: [
      { team: 'player', center: { x: 160, y: 320 }, radius: 110, coreHp: 1000 },
      { team: 'enemy', center: { x: 800, y: 320 }, radius: 110, coreHp: 1000 },
    ],
    crateSpawns: [],
  };
}

function makeWorld(): SimWorld {
  return new SimWorld(
    { seed: 5, difficulty: 'normal', scoreToWin: 100, enemyCount: 2, startingWeapon: 'pistol' },
    makeMap(),
  );
}

function addUnit(world: SimWorld, id: string, team: Team, x: number, y: number): Unit {
  const unit: Unit = {
    id, team, pos: { x, y }, vel: { x: 0, y: 0 }, angle: 0,
    hp: 100, maxHp: 100, weaponId: 'pistol' as WeaponId,
    ammoInMag: 12, reserveAmmo: 60,
    reloading: false, reloadProgress: 0, isPlayer: false,
    dead: false, respawnIn: 0, kills: 0, deaths: 0,
  };
  world.addUnit(unit);
  return unit;
}

function tickZones(world: SimWorld, ticks: number): void {
  for (let i = 0; i < ticks; i += 1) {
    world.state.time += 1 / 60;
    updateZones(world, 1 / 60);
  }
}

describe('zones and objectives', () => {
  it('captures a zone by presence and emits zone:captured', () => {
    const world = makeWorld();
    addUnit(world, 'p1', 'player', 480, 320);
    const captured = vi.fn();
    unsubscribers.push(bus.on('zone:captured', captured));

    tickZones(world, 300);
    expect(world.state.zones[0].owner).toBe('player');
    expect(world.state.zones[0].progress).toBe(1);
    expect(captured).toHaveBeenCalledWith({ zoneId: 'zone-1', team: 'player' });
  });

  it('contests a zone and freezes capture when counts are equal', () => {
    const world = makeWorld();
    addUnit(world, 'p1', 'player', 480, 320);
    addUnit(world, 'e1', 'enemy', 490, 320);
    const contested = vi.fn();
    unsubscribers.push(bus.on('zone:contested', contested));

    tickZones(world, 180);
    expect(world.state.zones[0].contested).toBe(true);
    expect(world.state.zones[0].progress).toBe(0);
    expect(contested).toHaveBeenCalledWith({ zoneId: 'zone-1' });
  });

  it('captures faster with a larger presence advantage', () => {
    const solo = makeWorld();
    addUnit(solo, 'p1', 'player', 480, 320);
    const squad = makeWorld();
    addUnit(squad, 'p1', 'player', 480, 320);
    addUnit(squad, 'p2', 'player', 490, 320);
    addUnit(squad, 'p3', 'player', 470, 330);

    tickZones(solo, 90);
    tickZones(squad, 90);
    expect(squad.state.zones[0].progress).toBeGreaterThan(solo.state.zones[0].progress);
  });

  it('awards score every second for an owned zone', () => {
    const world = makeWorld();
    addUnit(world, 'p1', 'player', 480, 320);
    tickZones(world, 300);
    const before = world.state.score.player;
    tickZones(world, 120);
    expect(world.state.score.player - before).toBeGreaterThanOrEqual(3);
  });

  it('damages an undefended enemy base core and stops when a defender arrives', () => {
    const world = makeWorld();
    addUnit(world, 'p1', 'player', 800, 320);
    const damaged = vi.fn();
    unsubscribers.push(bus.on('base:damaged', damaged));
    updateBaseCores(world, 1);
    expect(world.state.baseHp.enemy).toBeLessThan(1000);
    expect(damaged).toHaveBeenCalledWith({ team: 'enemy', hpLeft: expect.any(Number) });

    const defender = addUnit(world, 'e1', 'enemy', 810, 320);
    const before = world.state.baseHp.enemy;
    updateBaseCores(world, 1);
    expect(world.state.baseHp.enemy).toBe(before);

    defender.dead = true;
    world.baseDamageTimer.enemy = 0;
    updateBaseCores(world, 1);
    expect(world.state.baseHp.enemy).toBeLessThan(before);
  });

  it('wins immediately on reaching the score target', () => {
    const world = makeWorld();
    world.state.status = 'playing';
    world.state.score.player = 100;
    const ended = vi.fn();
    unsubscribers.push(bus.on('match:end', ended));
    checkWin(world);
    expect(world.state.status).toBe('won');
    expect(ended).toHaveBeenCalledWith({ winner: 'player' });
  });

  it('wins by destroying the enemy core', () => {
    const world = makeWorld();
    world.state.status = 'playing';
    world.state.baseHp.enemy = 0;
    checkWin(world);
    expect(world.state.status).toBe('won');
  });

  it('resolves the time limit using the higher score', () => {
    const world = makeWorld();
    world.state.status = 'playing';
    world.state.time = MATCH_TIME_LIMIT + 1;
    world.state.score.enemy = 12;
    world.state.score.player = 9;
    checkWin(world);
    expect(world.state.status).toBe('lost');
  });

  it('does nothing while not playing', () => {
    const world = makeWorld();
    world.state.score.player = 999;
    checkWin(world);
    expect(world.state.status).toBe('menu');
  });

  it('disables zones and base damage in Rampage and crowns the max-kill unit', () => {
    const world = new SimWorld(
      { seed: 5, mode: 'rampage', difficulty: 'normal', scoreToWin: 10, enemyCount: 3, startingWeapon: 'pistol' },
      makeMap(),
    );
    const player = addUnit(world, 'player-1', 'player', 480, 320);
    player.isPlayer = true;
    const bot1 = addUnit(world, 'bot-1', 'enemy', 800, 320);
    const bot2 = addUnit(world, 'bot-2', 'enemy', 160, 320);
    world.state.status = 'playing';

    tickZones(world, 180);
    updateBaseCores(world, 2);
    expect(world.state.zones[0].owner).toBe('neutral');
    expect(world.state.zones[0].progress).toBe(0);
    expect(world.state.baseHp.player).toBe(1000);
    expect(world.state.baseHp.enemy).toBe(1000);

    // Bot 1 reaches max kills at time limit -> bot wins (player loses)
    player.kills = 4;
    bot1.kills = 7;
    bot2.kills = 2;
    world.state.time = (world.state.timeLimit ?? 180) + 1;
    const ended = vi.fn();
    unsubscribers.push(bus.on('match:end', ended));

    checkWin(world);
    expect(world.state.status).toBe('lost');
    expect(world.state.winnerId).toBe('bot-1');
    expect(ended).toHaveBeenCalledWith({ winner: 'enemy', winnerId: 'bot-1' });
  });
});
