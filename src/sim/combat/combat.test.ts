import { afterEach, describe, expect, it, vi } from 'vitest';
import { WEAPON_DEFS } from '../../shared/api';
import { bus } from '../../shared/events';
import type { MapData, Team, TileKind, Unit, WeaponId } from '../../shared/types';
import { COVER_HP, TILE_SIZE } from '../constants';
import { tileKey } from '../map';
import { SimWorld } from '../world';
import { explode, updatePickups, updateProjectiles, updateWeapons } from './index';

const unsubscribers: Array<() => void> = [];
afterEach(() => {
  unsubscribers.splice(0).forEach((unsubscribe) => unsubscribe());
  bus.clear();
});

function blankMap(rows = 20, cols = 20): MapData {
  const tiles: TileKind[][] = Array.from({ length: rows }, (_, y) =>
    Array.from({ length: cols }, (_, x): TileKind =>
      x === 0 || y === 0 || x === cols - 1 || y === rows - 1 ? 'wall' : 'floor',
    ),
  );
  return {
    seed: 1,
    width: cols,
    height: rows,
    tileSize: TILE_SIZE,
    tiles,
    coverHp: {},
    zones: [],
    bases: [
      { team: 'player', center: { x: 200, y: 200 }, radius: 100, coreHp: 1000 },
      { team: 'enemy', center: { x: 500, y: 200 }, radius: 100, coreHp: 1000 },
    ],
    crateSpawns: [{ x: 300, y: 300 }],
  };
}

function makeWorld(): SimWorld {
  return new SimWorld(
    { seed: 7, difficulty: 'normal', scoreToWin: 100, enemyCount: 2, startingWeapon: 'pistol' },
    blankMap(),
  );
}

function addUnit(world: SimWorld, id: string, team: Team, weaponId: WeaponId, x: number, y: number, isPlayer = false): Unit {
  const def = WEAPON_DEFS[weaponId];
  const unit: Unit = {
    id, team,
    pos: { x, y },
    vel: { x: 0, y: 0 },
    angle: 0,
    hp: 100, maxHp: 100,
    weaponId,
    ammoInMag: def.magSize,
    reserveAmmo: def.magSize * 5,
    reloading: false, reloadProgress: 0,
    isPlayer, dead: false, respawnIn: 0,
    kills: 0, deaths: 0,
  };
  world.addUnit(unit);
  world.spatial.insert(unit);
  return unit;
}

describe('weapons and combat', () => {
  it('respects fire rate with an automatic weapon', () => {
    const world = makeWorld();
    const shooter = addUnit(world, 'p', 'player', 'smg', 200, 200, true);
    world.runtime(shooter).intent.firing = true;
    shooter.angle = 0;

    updateWeapons(world, 1 / 60);
    expect(world.state.projectiles).toHaveLength(1);
    updateWeapons(world, 1 / 60);
    expect(world.state.projectiles).toHaveLength(1);
    for (let i = 0; i < 5; i += 1) updateWeapons(world, 1 / 60);
    expect(world.state.projectiles.length).toBeGreaterThanOrEqual(2);
  });

  it('reloads a magazine from reserve ammo over time', () => {
    const world = makeWorld();
    const shooter = addUnit(world, 'p', 'player', 'pistol', 200, 200, true);
    shooter.ammoInMag = 0;
    const start = vi.fn();
    const end = vi.fn();
    unsubscribers.push(bus.on('reload:start', start), bus.on('reload:end', end));

    world.runtime(shooter).intent.reload = true;
    updateWeapons(world, 1 / 60);
    expect(shooter.reloading).toBe(true);
    expect(start).toHaveBeenCalledTimes(1);

    for (let i = 0; i < 80; i += 1) updateWeapons(world, 1 / 60);
    expect(shooter.reloading).toBe(false);
    expect(shooter.ammoInMag).toBe(WEAPON_DEFS.pistol.magSize);
    expect(shooter.reserveAmmo).toBeLessThan(WEAPON_DEFS.pistol.magSize * 5);
    expect(end).toHaveBeenCalledTimes(1);
  });

  it('stops a projectile at a wall', () => {
    const world = makeWorld();
    const projectile = {
      id: 'proj-1', team: 'player' as const,
      pos: { x: 100, y: 300 }, vel: { x: 900, y: 0 },
      weaponId: 'pistol' as const, ownerId: 'p',
      life: 1, damage: 24, splashRadius: 0,
    };
    world.state.projectiles.push(projectile);
    world.projectileMeta.set(projectile.id, { initialLife: 1 });
    world.state.map.tiles[9][3] = 'wall';
    updateProjectiles(world, 1 / 60);
    expect(world.state.projectiles).toHaveLength(0);
  });

  it('destroys low cover with enough bullets', () => {
    const world = makeWorld();
    const tile = { x: 5, y: 5 };
    world.state.map.tiles[tile.y][tile.x] = 'lowCover';
    world.state.map.coverHp[tileKey(tile.x, tile.y)] = COVER_HP;
    const destroyed = vi.fn();
    unsubscribers.push(bus.on('cover:destroyed', destroyed));

    for (let shot = 0; shot < 6; shot += 1) {
      const projectile = {
        id: `proj-${shot}`, team: 'player' as const,
        pos: { x: 3 * TILE_SIZE + 16, y: 5 * TILE_SIZE + 16 },
        vel: { x: 900, y: 0 },
        weaponId: 'pistol' as const, ownerId: 'p',
        life: 1, damage: 24, splashRadius: 0,
      };
      world.state.projectiles.push(projectile);
      world.projectileMeta.set(projectile.id, { initialLife: 1 });
      for (let tick = 0; tick < 5; tick += 1) updateProjectiles(world, 1 / 60);
    }
    expect(world.state.map.coverHp[tileKey(tile.x, tile.y)]).toBe(0);
    expect(destroyed).toHaveBeenCalledWith({ tile: tileKey(tile.x, tile.y) });
  });

  it('swaps the current weapon onto the ground when collecting a new one', () => {
    const world = makeWorld();
    const player = addUnit(world, 'p', 'player', 'pistol', 300, 300, true);
    world.spawnPickup(player.pos, 'rifle');
    world.runtime(player).intent.interact = true;

    updatePickups(world, 1 / 60);
    expect(player.weaponId).toBe('rifle');
    expect(player.ammoInMag).toBe(WEAPON_DEFS.rifle.magSize);
    expect(world.state.pickups.some((pickup) => pickup.weaponId === 'pistol')).toBe(true);
  });

  it('applies splash damage and knockback away from an explosion', () => {
    const world = makeWorld();
    const enemy = addUnit(world, 'e', 'enemy', 'pistol', 420, 300);
    explode(world, { x: 400, y: 300 }, 120, 85, 'player', 'p');
    expect(enemy.hp).toBeLessThan(100);
    expect(world.runtime(enemy).knockback.x).toBeGreaterThan(0);
  });

  it('drops a weapon when a unit dies and emits kill', () => {
    const world = makeWorld();
    const killer = addUnit(world, 'p', 'player', 'pistol', 300, 300, true);
    const victim = addUnit(world, 'e', 'enemy', 'shotgun', 340, 300);
    const kill = vi.fn();
    unsubscribers.push(bus.on('kill', kill));

    world.damageUnit(victim, 200, killer.id, 'pistol', victim.pos);
    expect(victim.dead).toBe(true);
    expect(killer.kills).toBe(1);
    expect(world.state.pickups.some((pickup) => pickup.pos.x === victim.pos.x)).toBe(true);
    expect(kill).toHaveBeenCalledTimes(1);
  });
});
