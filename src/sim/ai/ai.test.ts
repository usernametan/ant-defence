import { afterEach, describe, expect, it, vi } from 'vitest';
import { bus } from '../../shared/events';
import type { MapData, Team, Unit } from '../../shared/types';
import { TILE_SIZE } from '../constants';
import { updateWeapons } from '../combat';
import { tileCenter } from '../map';
import { updateUnits } from '../units';
import { updateZones } from '../zones';
import { SimWorld } from '../world';
import { spawnBots, updateAi } from './index';

const unsubscribers: Array<() => void> = [];
afterEach(() => {
  unsubscribers.splice(0).forEach((unsubscribe) => unsubscribe());
  bus.clear();
});

function makeMap(width: number, height: number, zoneTile?: { x: number; y: number }): MapData {
  const tiles = Array.from({ length: height }, (_, y) =>
    Array.from({ length: width }, (_, x): 'wall' | 'floor' =>
      x === 0 || y === 0 || x === width - 1 || y === height - 1 ? 'wall' : 'floor',
    ),
  );
  return {
    seed: 1, width, height, tileSize: TILE_SIZE,
    tiles, coverHp: {},
    zones: zoneTile ? [{ id: 'zone-1', center: tileCenter(zoneTile.x, zoneTile.y), radius: 112 }] : [],
    bases: [
      { team: 'player', center: tileCenter(5, 10), radius: 110, coreHp: 1000 },
      { team: 'enemy', center: tileCenter(width - 6, 10), radius: 110, coreHp: 1000 },
    ],
    crateSpawns: [],
  };
}

function makeWorld(map: MapData, difficulty: 'easy' | 'normal' | 'hard' = 'normal'): SimWorld {
  return new SimWorld(
    { seed: 11, difficulty, scoreToWin: 100, enemyCount: 2, startingWeapon: 'pistol' },
    map,
  );
}

function addBot(world: SimWorld, id: string, team: Team, x: number, y: number, hp = 100): Unit {
  const unit: Unit = {
    id, team, pos: { x, y }, vel: { x: 0, y: 0 }, angle: team === 'enemy' ? Math.PI : 0,
    hp, maxHp: 100, weaponId: 'pistol', ammoInMag: 12, reserveAmmo: 60,
    reloading: false, reloadProgress: 0, isPlayer: false,
    dead: false, respawnIn: 0, kills: 0, deaths: 0,
  };
  world.addUnit(unit);
  return unit;
}

function tick(world: SimWorld): void {
  world.state.time += 1 / 60;
  world.state.tick += 1;
  updateAi(world, 1 / 60);
  updateUnits(world, 1 / 60);
  updateWeapons(world, 1 / 60);
  updateZones(world, 1 / 60);
}

describe('AI', () => {
  it('spawns enemy bots and allied bots so both teams have equal size', () => {
    const world = makeWorld(makeMap(30, 20));
    spawnBots(world, { seed: 1, difficulty: 'normal', scoreToWin: 100, enemyCount: 5, startingWeapon: 'pistol' });
    expect(world.livingUnits('enemy')).toHaveLength(5);
    expect(world.livingUnits('player')).toHaveLength(4);
  });

  it('navigates to and captures a neutral zone', () => {
    const zone = tileCenter(25, 10);
    const world = makeWorld(makeMap(40, 20, { x: 25, y: 10 }));
    const bot = addBot(world, 'enemy-1', 'enemy', 176, 336);
    let closestToZone = Infinity;

    for (let i = 0; i < 1500; i += 1) {
      tick(world);
      closestToZone = Math.min(closestToZone, Math.hypot(bot.pos.x - zone.x, bot.pos.y - zone.y));
    }

    expect(closestToZone).toBeLessThan(112);
    expect(world.state.zones[0].owner).toBe('enemy');
    expect(world.state.zones[0].progress).toBeLessThan(0);
  });

  it('takes cover when low on health and threatened', () => {
    const world = makeWorld(makeMap(30, 20));
    world.state.map.tiles[8][12] = 'lowCover';
    world.state.map.coverHp['12,8'] = 100;
    const bot = addBot(world, 'enemy-1', 'enemy', 336, 336, 45);
    addBot(world, 'player-1', 'player', 528, 336);
    world.runtime(bot).lastDamageAt = 0;

    updateAi(world, 1 / 60);
    expect(world.runtime(bot).ai.mode).toBe('seekCover');
    expect(bot.aiState).toBe('takeCover');

    for (let i = 0; i < 40; i += 1) {
      world.runtime(bot).lastDamageAt = world.state.time;
      tick(world);
    }
    // Cover sits above the bot; retreating toward it must reduce its y.
    expect(bot.pos.y).toBeLessThan(336 - 30);
  });

  it('engages and fires at a visible enemy', () => {
    const world = makeWorld(makeMap(30, 20), 'hard');
    addBot(world, 'enemy-1', 'enemy', 336, 336);
    addBot(world, 'player-1', 'player', 528, 336);
    const shot = vi.fn();
    unsubscribers.push(bus.on('shot', shot));

    for (let i = 0; i < 120; i += 1) tick(world);

    expect(shot.mock.calls.length).toBeGreaterThan(1);
  });

  it('scales reaction time and aim error with difficulty', () => {
    const easy = makeWorld(makeMap(30, 20), 'easy');
    const hard = makeWorld(makeMap(30, 20), 'hard');
    const easyBot = addBot(easy, 'e1', 'enemy', 336, 336);
    const hardBot = addBot(hard, 'e1', 'enemy', 336, 336);
    addBot(easy, 'p1', 'player', 528, 336);
    addBot(hard, 'p1', 'player', 528, 336);

    updateAi(easy, 1 / 60);
    updateAi(hard, 1 / 60);

    expect(reactionOf(easy, easyBot)).toBeGreaterThan(reactionOf(hard, hardBot));
    expect(Math.abs(aimErrorOf(easy, easyBot))).toBeGreaterThan(Math.abs(aimErrorOf(hard, hardBot)));
  });

  it('allows bots to throw grenades at visible enemies in range', () => {
    const world = makeWorld(makeMap(30, 20), 'hard');
    const bot = addBot(world, 'enemy-1', 'enemy', 240, 336);
    bot.grenades = 2;
    addBot(world, 'player-1', 'player', 480, 336);
    const thrown = vi.fn();
    unsubscribers.push(bus.on('grenade:thrown', thrown));

    for (let i = 0; i < 240; i += 1) tick(world);

    expect(thrown.mock.calls.length).toBeGreaterThanOrEqual(1);
    expect(bot.grenades).toBeLessThan(2);
  });

  it('batches map changes and caps A* searches to at most 3 per tick during repath bursts', () => {
    const world = makeWorld(makeMap(40, 20, { x: 25, y: 10 }), 'normal');
    spawnBots(world, { seed: 7, difficulty: 'normal', scoreToWin: 100, enemyCount: 10, startingWeapon: 'rifle' });

    for (let burst = 0; burst < 12; burst += 1) {
      // Simulate repeated map breaks across consecutive ticks
      world.damageCover({ x: 10 + (burst % 6), y: 10 }, 999);
      world.flushMapVersion(burst % 10 === 0);
      tick(world);
      expect(world.pathCache.misses).toBeLessThanOrEqual(3);
    }
  });
});

function reactionOf(world: SimWorld, unit: Unit): number {
  return world.runtime(unit).ai.reactionTimer;
}

function aimErrorOf(world: SimWorld, unit: Unit): number {
  return world.runtime(unit).ai.aimError;
}
