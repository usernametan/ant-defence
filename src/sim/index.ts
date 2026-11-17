import { WEAPON_DEFS, type SimApi } from '../shared/api';
import type {
  GameState,
  InputState,
  MapData,
  MatchConfig,
  TileKind,
  Unit,
  ZoneState,
} from '../shared/types';

const MAP_WIDTH = 20;
const MAP_HEIGHT = 14;
const TILE_SIZE = 48;

const DEFAULT_CONFIG: MatchConfig = {
  seed: 1337,
  difficulty: 'normal',
  scoreToWin: 100,
  enemyCount: 4,
  startingWeapon: 'pistol',
};

/** Deterministic small arena: walls on the border, fixed cover, water, and spawns. */
function createMap(): MapData {
  const tiles: TileKind[][] = [];
  for (let y = 0; y < MAP_HEIGHT; y += 1) {
    const row: TileKind[] = [];
    for (let x = 0; x < MAP_WIDTH; x += 1) {
      row.push(
        x === 0 || y === 0 || x === MAP_WIDTH - 1 || y === MAP_HEIGHT - 1
          ? 'wall'
          : 'floor',
      );
    }
    tiles.push(row);
  }

  tiles[7][2] = 'spawnPlayer';
  tiles[7][MAP_WIDTH - 3] = 'spawnEnemy';
  tiles[4][5] = 'lowCover';
  tiles[4][6] = 'lowCover';
  tiles[9][5] = 'lowCover';
  tiles[9][MAP_WIDTH - 6] = 'lowCover';
  tiles[4][MAP_WIDTH - 6] = 'lowCover';
  tiles[9][MAP_WIDTH - 6] = 'lowCover';
  tiles[6][9] = 'water';
  tiles[7][9] = 'water';
  tiles[6][10] = 'water';
  tiles[7][10] = 'water';

  return {
    seed: DEFAULT_CONFIG.seed,
    width: MAP_WIDTH,
    height: MAP_HEIGHT,
    tileSize: TILE_SIZE,
    tiles,
    coverHp: {
      '5,4': 100,
      '6,4': 100,
      '5,9': 100,
      '14,9': 100,
      '14,4': 100,
    },
    zones: [
      { id: 'zone-a', center: { x: 360, y: 336 }, radius: 70 },
      { id: 'zone-b', center: { x: 480, y: 336 }, radius: 70 },
      { id: 'zone-c', center: { x: 600, y: 336 }, radius: 70 },
    ],
    bases: [
      { team: 'player', center: { x: 96, y: 336 }, radius: 80, coreHp: 1000 },
      { team: 'enemy', center: { x: 864, y: 336 }, radius: 80, coreHp: 1000 },
    ],
    crateSpawns: [
      { x: 288, y: 192 },
      { x: 672, y: 192 },
      { x: 288, y: 480 },
      { x: 672, y: 480 },
    ],
  };
}

function createPlayer(config: MatchConfig): Unit {
  const weapon = WEAPON_DEFS[config.startingWeapon];
  return {
    id: 'player-1',
    team: 'player',
    pos: { x: 2 * TILE_SIZE + TILE_SIZE / 2, y: 7 * TILE_SIZE + TILE_SIZE / 2 },
    vel: { x: 0, y: 0 },
    angle: 0,
    hp: 100,
    maxHp: 100,
    weaponId: weapon.id,
    ammoInMag: weapon.magSize,
    reserveAmmo: weapon.magSize * 5,
    reloading: false,
    reloadProgress: 0,
    isPlayer: true,
    dead: false,
    respawnIn: 0,
    kills: 0,
    deaths: 0,
  };
}

function createInitialState(config: MatchConfig): GameState {
  const map = createMap();
  const zones: ZoneState[] = map.zones.map((zone) => ({
    id: zone.id,
    owner: 'neutral',
    progress: 0,
    contested: false,
  }));

  return {
    tick: 0,
    time: 0,
    map,
    units: [createPlayer(config)],
    projectiles: [],
    pickups: [],
    zones,
    score: { player: 0, enemy: 0 },
    baseHp: {
      player: map.bases[0].coreHp,
      enemy: map.bases[1].coreHp,
    },
    status: 'menu',
    playerId: 'player-1',
    matchConfig: { ...config },
  };
}

/**
 * Stub simulation. Produces a complete, static snapshot so the renderer, UI,
 * and audio tracks can be developed against the real contract immediately.
 */
export function createSim(): SimApi {
  let state = createInitialState(DEFAULT_CONFIG);

  return {
    start(config: MatchConfig): void {
      state = createInitialState(config);
      state.status = 'playing';
    },

    setInput(_input: InputState): void {
      // Stub: input is accepted but the snapshot stays static.
    },

    step(_dtSeconds: number): void {
      // Stub: fixed-step subdivision and movement arrive with the full sim.
    },

    getState(): Readonly<GameState> {
      return state;
    },

    pause(): void {
      if (state.status === 'playing') state.status = 'paused';
    },

    resume(): void {
      if (state.status === 'paused') state.status = 'playing';
    },

    restart(): void {
      state = createInitialState(state.matchConfig);
      state.status = 'playing';
    },
  };
}
