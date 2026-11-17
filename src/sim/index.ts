import { WEAPON_DEFS, type SimApi } from '../shared/api';
import { bus } from '../shared/events';
import type { GameState, InputState, MatchConfig, Unit } from '../shared/types';
import { spawnBots, updateAi } from './ai';
import { updatePickups, updateProjectiles, updateWeapons } from './combat';
import { FIXED_DT, MAX_SUBSTEPS, PLAYER_MAX_HP } from './constants';
import { createInput } from './internal';
import { generateMap } from './map';
import { rebuildSpatial, updateUnits } from './units';
import { checkWin, updateBaseCores, updateZones } from './zones';
import { SimWorld } from './world';

export const DEFAULT_CONFIG: MatchConfig = {
  seed: 1337,
  difficulty: 'normal',
  scoreToWin: 100,
  enemyCount: 4,
  startingWeapon: 'pistol',
};

/** Full fixed-step simulation implementing the shared SimApi contract. */
export function createSim(): SimApi {
  let world = new SimWorld(DEFAULT_CONFIG, generateMap(DEFAULT_CONFIG.seed));
  let lastConfig: MatchConfig = { ...DEFAULT_CONFIG };
  let accumulator = 0;

  function buildMatch(config: MatchConfig): void {
    const normalized: MatchConfig = {
      seed: config.seed >>> 0,
      difficulty: config.difficulty,
      scoreToWin: Math.max(1, Math.floor(config.scoreToWin)),
      enemyCount: Math.max(0, Math.floor(config.enemyCount)),
      startingWeapon: config.startingWeapon,
    };
    lastConfig = { ...normalized };
    world = new SimWorld(normalized, generateMap(normalized.seed));
    world.state.playerId = 'player-1';
    addPlayer(world, normalized);
    spawnBots(world, normalized);
    world.state.status = 'playing';
    accumulator = 0;
    bus.emit('match:start', { config: { ...normalized } });
  }

  function tick(dt: number): void {
    const state = world.state;
    state.tick += 1;
    state.time += dt;

    updateAi(world, dt);
    updateUnits(world, dt);
    rebuildSpatial(world);
    updateWeapons(world, dt);
    updateProjectiles(world, dt);
    updatePickups(world, dt);
    updateZones(world, dt);
    updateBaseCores(world, dt);
    checkWin(world);
  }

  return {
    start(config: MatchConfig): void {
      buildMatch(config);
    },

    setInput(input: InputState): void {
      if (input === undefined) return;
      const player = world.unitById(world.state.playerId);
      if (!player) return;
      const intent = world.runtime(player).intent;
      intent.moveX = input.moveX;
      intent.moveY = input.moveY;
      intent.aimX = input.aimX;
      intent.aimY = input.aimY;
      intent.firing = input.firing;
      intent.reload = input.reload;
      intent.interact = input.interact;
      intent.swapWeapon = input.swapWeapon;
      intent.dash = input.dash;
    },

    step(dtSeconds: number): void {
      if (world.state.status !== 'playing') return;
      if (!Number.isFinite(dtSeconds) || dtSeconds <= 0) return;
      accumulator += Math.min(dtSeconds, 0.25);
      let steps = 0;
      while (accumulator >= FIXED_DT && steps < MAX_SUBSTEPS) {
        tick(FIXED_DT);
        accumulator -= FIXED_DT;
        steps += 1;
        if (world.state.status !== 'playing') break;
      }
      if (steps === MAX_SUBSTEPS) accumulator = 0;
    },

    getState(): Readonly<GameState> {
      return world.state;
    },

    pause(): void {
      if (world.state.status === 'playing') world.state.status = 'paused';
    },

    resume(): void {
      if (world.state.status === 'paused') world.state.status = 'playing';
    },

    restart(): void {
      buildMatch(lastConfig);
    },
  };
}

function addPlayer(world: SimWorld, config: MatchConfig): Unit {
  const base = world.state.map.bases.find((candidate) => candidate.team === 'player');
  const spawn = base ? world.findFreeSpot(base.center, 4) : { x: 160, y: 336 };
  const weapon = WEAPON_DEFS[config.startingWeapon];
  const player: Unit = {
    id: world.state.playerId,
    team: 'player',
    pos: { x: spawn.x, y: spawn.y },
    vel: { x: 0, y: 0 },
    angle: 0,
    hp: PLAYER_MAX_HP,
    maxHp: PLAYER_MAX_HP,
    weaponId: weapon.id,
    ammoInMag: weapon.magSize,
    reserveAmmo: weapon.magSize * 5,
    reloading: false,
    reloadProgress: 0,
    isPlayer: true,
    dead: false,
    respawnIn: 0,
    aiState: undefined,
    kills: 0,
    deaths: 0,
  };
  world.addUnit(player);
  world.runtime(player).intent = createInput();
  return player;
}
