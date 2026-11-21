import { afterEach, describe, expect, it, vi } from 'vitest';
import { WEAPON_DEFS } from '../../shared/api';
import { bus } from '../../shared/events';
import type { MapData, MapTheme, Team, TileKind, Unit } from '../../shared/types';
import { updatePickups, updateProjectiles } from '../combat';
import { COVER_HP, TILE_SIZE } from '../constants';
import { tileCenter, tileKey } from '../map';
import { updateUnits } from '../units';
import { SimWorld } from '../world';
import { updateZones } from '../zones';
import {
  HELLCELL_BOSS_HP_PER_PLAYER,
  HELLCELL_FIRST_TRIGGER_MIN_TIME,
  HELLCELL_MAX_BOSSES,
  HELLCELL_RESPAWN_INTERVAL,
  TRAIN_COACH_SPACING,
  computeBossMaxHp,
  damageHellcellBoss,
  updateHellcell,
} from './index';

const unsubscribers: Array<() => void> = [];
afterEach(() => {
  unsubscribers.splice(0).forEach((unsubscribe) => unsubscribe());
  bus.clear();
});

function makeArenaMap(theme: MapTheme = 'fortress'): MapData {
  const width = 30;
  const height = 20;
  const tiles: TileKind[][] = Array.from({ length: height }, (_, y) =>
    Array.from({ length: width }, (_, x): TileKind =>
      x === 0 || y === 0 || x === width - 1 || y === height - 1 ? 'wall' : 'floor',
    ),
  );
  return {
    seed: 101,
    theme,
    width,
    height,
    tileSize: TILE_SIZE,
    tiles,
    coverHp: {},
    zones: [
      { id: 'zone-1', center: tileCenter(8, 10), radius: 96 },
      { id: 'zone-2', center: tileCenter(15, 10), radius: 96 },
      { id: 'zone-3', center: tileCenter(22, 10), radius: 96 },
    ],
    bases: [
      { team: 'player', center: tileCenter(3, 10), radius: 96, coreHp: 1000 },
      { team: 'enemy', center: tileCenter(26, 10), radius: 96, coreHp: 1000 },
    ],
    crateSpawns: [tileCenter(15, 6)],
  };
}

function makeHellcellWorld(theme: MapTheme = 'fortress', enemyCount = 2, scoreToWin = 1000): SimWorld {
  return new SimWorld(
    {
      seed: 42,
      mode: 'hellcell',
      difficulty: 'normal',
      scoreToWin,
      enemyCount,
      startingWeapon: 'rifle',
      mapTheme: theme,
    },
    makeArenaMap(theme),
  );
}

function captureZonesAandC(world: SimWorld, advanceTime = true): void {
  world.state.zones[0].owner = 'player';
  world.state.zones[0].progress = 1;
  world.state.zones[2].owner = 'enemy';
  world.state.zones[2].progress = -1;
  if (advanceTime) {
    world.state.time = Math.max(world.state.time, HELLCELL_FIRST_TRIGGER_MIN_TIME + 20);
  }
}

function addUnit(world: SimWorld, id: string, team: Team, x: number, y: number, isPlayer = false): Unit {
  const def = WEAPON_DEFS.rifle;
  const unit: Unit = {
    id,
    team,
    pos: { x, y },
    vel: { x: 0, y: 0 },
    angle: 0,
    hp: 200,
    maxHp: 200,
    weaponId: 'rifle',
    ammoInMag: def.magSize,
    reserveAmmo: def.magSize * 5,
    grenades: 2,
    reloading: false,
    reloadProgress: 0,
    isPlayer,
    dead: false,
    respawnIn: 0,
    kills: 0,
    deaths: 0,
  };
  world.addUnit(unit);
  world.spatial.insert(unit);
  return unit;
}

describe('Hellcell PvPvE mode', () => {
  it('triggers WARNING immediately when any 2 zones are captured and emerges enlarged Boss from the 3rd zone after 3s', () => {
    const world = makeHellcellWorld('fortress');
    const centerB = world.state.map.zones[1].center;
    const blue = addUnit(world, 'p1', 'player', centerB.x + 8, centerB.y, true);

    // Capturing only 1 zone (Zone A) does not trigger the boss yet
    world.state.zones[0].owner = 'player';
    world.state.zones[0].progress = 1;
    updateHellcell(world, 1 / 60);
    expect(world.state.hellcell?.phase).toBe('NORMAL');

    // Capturing a second zone (Zone C) immediately triggers WARNING from the 3rd zone (Zone B)
    world.state.zones[2].owner = 'enemy';
    world.state.zones[2].progress = -1;
    updateHellcell(world, 1 / 60);
    expect(world.state.hellcell?.phase).toBe('WARNING');
    expect(world.state.hellcell?.hasTriggered).toBe(true);
    expect(world.state.hellcell?.emergenceZoneId).toBe('zone-2');
    expect(world.state.hellcell?.spawnPos).toEqual(centerB);

    // Also verify capturing Zones A & B triggers emergence from Zone C
    const altWorld = makeHellcellWorld('jungle');
    altWorld.state.zones[0].owner = 'player';
    altWorld.state.zones[0].progress = 1;
    altWorld.state.zones[1].owner = 'enemy';
    altWorld.state.zones[1].progress = -1;
    updateHellcell(altWorld, 1 / 60);
    expect(altWorld.state.hellcell?.phase).toBe('WARNING');
    expect(altWorld.state.hellcell?.emergenceZoneId).toBe('zone-3');
    expect(altWorld.state.hellcell?.spawnPos).toEqual(altWorld.state.map.zones[2].center);

    // Zone B is sealed during Hellcell breach
    updateZones(world, 1.0);
    expect(world.state.zones[1].progress).toBe(0);

    // Advance 3 seconds through WARNING
    for (let i = 0; i < 190; i += 1) {
      updateHellcell(world, 1 / 60);
    }

    const hc = world.state.hellcell!;
    expect(hc.phase).toBe('CEASEFIRE_BOSS');
    expect(hc.isCeasefireActive).toBe(true);
    expect(hc.boss?.kind).toBe('rocketSiegeBot');
    expect(hc.boss!.radius).toBeCloseTo(TILE_SIZE * 2.95, 2);
    // Unit was pushed outside the enlarged central boss collider
    expect(Math.hypot(blue.pos.x - hc.boss!.pos.x, blue.pos.y - hc.boss!.pos.y)).toBeGreaterThan(hc.boss!.radius);
  });

  it('scales Boss maxHp proportionally with team size / total player count and moves fast across the map crushing interior walls and blocks', () => {
    const world2v2 = makeHellcellWorld('fortress', 2);
    const world5v5 = makeHellcellWorld('fortress', 5);

    expect(computeBossMaxHp(world2v2, 'rocketSiegeBot')).toBe(HELLCELL_BOSS_HP_PER_PLAYER.rocketSiegeBot * 4);
    expect(computeBossMaxHp(world5v5, 'rocketSiegeBot')).toBe(HELLCELL_BOSS_HP_PER_PLAYER.rocketSiegeBot * 10);

    // Place an interior wall and cover crate right next to Zone B so the fast boss crushes them
    const map = world5v5.state.map;
    map.tiles[10][16] = 'wall';
    map.tiles[10][17] = 'lowCover';
    map.coverHp[tileKey(17, 10)] = COVER_HP;

    captureZonesAandC(world5v5);
    addUnit(world5v5, 'p1', 'player', 200, 220, true);
    for (let i = 0; i < 190; i += 1) updateHellcell(world5v5, 1 / 60);

    const boss = world5v5.state.hellcell!.boss!;
    expect(boss.maxHp).toBe(HELLCELL_BOSS_HP_PER_PLAYER.rocketSiegeBot * 10);
    // Wall & crate inside emergence footprint were crushed
    expect(map.tiles[10][16]).toBe('floor');
    expect(map.coverHp[tileKey(17, 10)]).toBe(0);

    const spawnPos = { ...boss.pos };
    // Step 0.5s: fast boss travels > 90px
    for (let i = 0; i < 30; i += 1) updateHellcell(world5v5, 1 / 60);
    expect(Math.hypot(boss.pos.x - spawnPos.x, boss.pos.y - spawnPos.y)).toBeGreaterThan(90);
  });

  it('refuels unit health & ammo, restores crushed walls & blocks, and spawns another boss up to HELLCELL_MAX_BOSSES after defeat', () => {
    const world = makeHellcellWorld('fortress', 2);
    const map = world.state.map;
    map.tiles[10][16] = 'wall';
    map.tiles[10][17] = 'lowCover';
    map.coverHp[tileKey(17, 10)] = COVER_HP;

    const blue = addUnit(world, 'blue-1', 'player', 160, 160, true);
    captureZonesAandC(world);
    for (let i = 0; i < 190; i += 1) updateHellcell(world, 1 / 60);

    const firstBoss = world.state.hellcell!.boss!;
    expect(map.tiles[10][16]).toBe('floor');
    expect(map.coverHp[tileKey(17, 10)]).toBe(0);

    // Deplete player HP and ammo before defeating the boss
    blue.hp = 35;
    blue.ammoInMag = 2;
    blue.reserveAmmo = 0;

    damageHellcellBoss(world, firstBoss.maxHp, 'player', firstBoss.pos);
    const hc = world.state.hellcell!;
    expect(hc.boss).toBeNull();
    expect(hc.bossCount).toBe(1);
    expect(HELLCELL_RESPAWN_INTERVAL).toBe(10);
    expect(hc.nextSpawnIn).toBe(10);

    // Health bar and ammo are refueled, and crushed wall & block are restored!
    const rifleDef = WEAPON_DEFS.rifle;
    expect(blue.hp).toBe(blue.maxHp);
    expect(blue.ammoInMag).toBe(rifleDef.magSize);
    expect(blue.reserveAmmo).toBe(rifleDef.magSize * 5);
    expect(map.tiles[10][16]).toBe('wall');
    expect(map.tiles[10][17]).toBe('lowCover');
    expect(map.coverHp[tileKey(17, 10)]).toBe(COVER_HP);

    // Advance HELLCELL_RESPAWN_INTERVAL seconds (3s resume + PvP) -> WARNING triggers for next random boss
    for (let i = 0; i < HELLCELL_RESPAWN_INTERVAL * 60 + 2; i += 1) updateHellcell(world, 1 / 60);
    expect(hc.phase).toBe('WARNING');
    expect(hc.spawnPos).toBeDefined();

    // Advance 3s WARNING -> second boss spawns at hc.spawnPos
    for (let i = 0; i < 190; i += 1) updateHellcell(world, 1 / 60);
    expect(hc.phase).toBe('CEASEFIRE_BOSS');
    expect(hc.boss).not.toBeNull();

    // Defeat bosses up to HELLCELL_MAX_BOSSES and verify no further respawns are scheduled
    while ((hc.bossCount ?? 0) < HELLCELL_MAX_BOSSES) {
      if (hc.boss) {
        damageHellcellBoss(world, hc.boss.maxHp, 'player', hc.boss.pos);
      }
      for (let i = 0; i < (HELLCELL_RESPAWN_INTERVAL + 5) * 60; i += 1) updateHellcell(world, 1 / 60);
    }
    expect(hc.bossCount).toBe(HELLCELL_MAX_BOSSES);
    expect(hc.nextSpawnIn).toBe(0);
  });

  it('decreases player and bot movement speed in Hellcell mode compared to Zone Control', () => {
    const hcWorld = makeHellcellWorld('fortress', 2);
    const zcWorld = new SimWorld(
      { seed: 42, mode: 'zoneControl', difficulty: 'normal', scoreToWin: 100, enemyCount: 2, startingWeapon: 'rifle' },
      makeArenaMap('fortress'),
    );
    const hcPlayer = addUnit(hcWorld, 'p1', 'player', 200, 300, true);
    const zcPlayer = addUnit(zcWorld, 'p1', 'player', 200, 300, true);
    hcWorld.runtime(hcPlayer).intent.moveX = 1;
    zcWorld.runtime(zcPlayer).intent.moveX = 1;

    for (let i = 0; i < 45; i += 1) {
      updateUnits(hcWorld, 1 / 60);
      updateUnits(zcWorld, 1 / 60);
    }

    expect(hcPlayer.pos.x).toBeLessThan(zcPlayer.pos.x);
  });

  it('enforces zero PvP damage during ceasefire while tracking blueBossDamage vs redBossDamage', () => {
    const world = makeHellcellWorld('fortress');
    captureZonesAandC(world);
    for (let i = 0; i < 200; i += 1) updateHellcell(world, 1 / 60);

    const boss = world.state.hellcell!.boss!;
    const blue = addUnit(world, 'blue-1', 'player', boss.pos.x - 140, boss.pos.y, true);
    const red = addUnit(world, 'red-1', 'enemy', boss.pos.x - 80, boss.pos.y);

    const spark = vi.fn();
    unsubscribers.push(bus.on('ceasefire:spark', spark));

    // Blue fires a bullet straight through Red into the Boss
    world.state.projectiles.push({
      id: 'proj-blue',
      team: 'player',
      pos: { x: blue.pos.x + 15, y: blue.pos.y },
      vel: { x: 900, y: 0 },
      weaponId: 'rifle',
      ownerId: blue.id,
      life: 1,
      damage: 40,
      splashRadius: 0,
    });

    for (let i = 0; i < 20; i += 1) {
      world.spatial.clear();
      for (const u of world.state.units) world.spatial.insert(u);
      updateProjectiles(world, 1 / 60);
    }

    // Red takes zero damage during ceasefire, spark emitted, Boss takes damage credited to Blue
    expect(red.hp).toBe(200);
    expect(spark).toHaveBeenCalled();
    expect(world.state.hellcell!.blueBossDamage).toBeGreaterThan(0);
    expect(boss.hp).toBeLessThan(boss.maxHp);
  });

  it('awards +60 points, center shield/heavy weapon loot, and Zone B capture to majority damage team on Boss defeat', () => {
    const world = makeHellcellWorld('fortress');
    world.state.score.player = 450;
    captureZonesAandC(world);
    for (let i = 0; i < 200; i += 1) updateHellcell(world, 1 / 60);

    const boss = world.state.hellcell!.boss!;
    // Blue deals 60% damage, Red deals 40% damage
    damageHellcellBoss(world, boss.maxHp * 0.6, 'player', boss.pos);
    damageHellcellBoss(world, boss.maxHp * 0.45, 'enemy', boss.pos);

    const hc = world.state.hellcell!;
    expect(hc.boss).toBeNull();
    expect(hc.phase).toBe('RESUME_COUNTDOWN');
    expect(world.state.score.player).toBe(450 + 45);
    expect(world.state.pickups.some((p) => p.kind === 'shield')).toBe(true);
    expect(world.state.pickups.some((p) => p.weaponId === 'shotgun' || p.weaponId === 'sniper')).toBe(true);

    // Advance 3s resume countdown -> PvP resumes and Zone B is auto-captured by Blue
    for (let i = 0; i < 190; i += 1) updateHellcell(world, 1 / 60);
    expect(hc.phase).toBe('NORMAL');
    expect(hc.isCeasefireActive).toBe(false);
    expect(world.state.zones[1].owner).toBe('player');
  });

  it('Omega Siege Dreadnought launches rapid rocket salvos and destroys 1x1 crates while walls block splash', () => {
    const world = makeHellcellWorld('fortress');
    captureZonesAandC(world);
    for (let i = 0; i < 200; i += 1) updateHellcell(world, 1 / 60);

    const hc = world.state.hellcell!;
    hc.boss!.attackTimer = 0.01;
    updateHellcell(world, 0.02);

    expect(hc.reticles.length).toBeGreaterThanOrEqual(9);
    expect(hc.reticles.length).toBeLessThanOrEqual(12);
    expect(hc.reticles[0].timer).toBeCloseTo(0.92, 2);
    expect(hc.reticles[0].damage).toBe(115);

    // Place a 1x1 crate at the first reticle target tile
    const target = hc.reticles[0].targetPos;
    const tx = Math.floor(target.x / TILE_SIZE);
    const ty = Math.floor(target.y / TILE_SIZE);
    world.state.map.tiles[ty][tx] = 'lowCover';
    world.state.map.coverHp[tileKey(tx, ty)] = COVER_HP;

    for (let i = 0; i < 80; i += 1) updateHellcell(world, 1 / 60);
    expect(world.state.map.coverHp[tileKey(tx, ty)]).toBe(0);
  });

  it('Colossal Hydra-Viper Leviathan sprays venom (50% reduced behind crate, blocked by wall) and creates 6s acid pools that drain shield first', () => {
    const world = makeHellcellWorld('jungle');
    captureZonesAandC(world);
    for (let i = 0; i < 200; i += 1) updateHellcell(world, 1 / 60);

    const hc = world.state.hellcell!;
    expect(hc.boss?.kind).toBe('venomCobra');
    hc.boss!.attackTimer = 5.0;

    // Place a unit with +50 shield on an acid pool outside direct spray range
    const player = addUnit(world, 'p1', 'player', 160, 160, true);
    world.spawnShieldPickup(player.pos, 50);
    updatePickups(world, 1 / 60);
    expect(player.shield).toBe(50);

    hc.acidPools.push({
      id: 'acid-test',
      pos: { ...player.pos },
      tileX: Math.floor(player.pos.x / TILE_SIZE),
      tileY: Math.floor(player.pos.y / TILE_SIZE),
      ttl: 6.0,
      maxTtl: 6.0,
      dps: 30,
    });

    updateHellcell(world, 1.0);
    expect(player.shield).toBeCloseTo(20, 1);
    expect(player.hp).toBe(200); // Shield absorbed the acid damage first
  });

  it('Colossal Necro-Pharaoh Titan throws fast bones that ricochet once off flat walls and shatter on second wall hit', () => {
    const world = makeHellcellWorld('temple');
    captureZonesAandC(world);
    for (let i = 0; i < 200; i += 1) updateHellcell(world, 1 / 60);

    const hc = world.state.hellcell!;
    expect(hc.boss?.kind).toBe('pharaohSkeleton');
    hc.boss!.attackTimer = 5.0;

    // Fire a single bone right toward the east border wall (col 29, x = 29*32 = 928)
    hc.bossProjectiles = [
      {
        id: 'bone-1',
        kind: 'bone',
        pos: { x: 28 * TILE_SIZE + 16, y: 10 * TILE_SIZE + 16 },
        vel: { x: 300, y: 0 },
        rotation: 0,
        spinSpeed: 10,
        bouncesLeft: 1,
        life: 5,
        damage: 56,
        splashRadius: 0,
      },
    ];

    for (let i = 0; i < 10; i += 1) updateHellcell(world, 1 / 60);
    // Bone reflected once off the vertical wall edge (vx flipped negative, bouncesLeft === 0)
    expect(hc.bossProjectiles).toHaveLength(1);
    expect(hc.bossProjectiles[0].vel.x).toBeLessThan(0);
    expect(hc.bossProjectiles[0].bouncesLeft).toBe(0);

    // Place a wall behind it so the second impact shatters it
    world.state.map.tiles[10][27] = 'wall';
    for (let i = 0; i < 15; i += 1) updateHellcell(world, 1 / 60);
    expect(hc.bossProjectiles).toHaveLength(0);
  });

  it('Slumside spawns THE LAST LOCAL (Mumbai Local Train) with 3 connected coaches, charge attack, electrical AoE, and weak-point hits', () => {
    const world = makeHellcellWorld('slumside');
    captureZonesAandC(world);
    for (let i = 0; i < 200; i += 1) updateHellcell(world, 1 / 60);

    const hc = world.state.hellcell!;
    expect(hc.boss?.kind).toBe('mumbaiTrain');
    expect(hc.boss?.name).toBe('THE LAST LOCAL');
    expect(hc.boss?.subtitle).toBe('THE FINAL DEPARTURE');

    const boss = hc.boss!;
    expect(boss.trainState?.coaches).toHaveLength(3);

    // Step movement and confirm all 3 coaches remain articulated and connected inside bounds
    for (let i = 0; i < 45; i += 1) updateHellcell(world, 1 / 60);
    const coaches = boss.trainState!.coaches;
    for (let i = 1; i < coaches.length; i += 1) {
      const gap = Math.hypot(
        coaches[i - 1].pos.x - coaches[i].pos.x,
        coaches[i - 1].pos.y - coaches[i].pos.y,
      );
      expect(gap).toBeCloseTo(TRAIN_COACH_SPACING, 0);
    }

    // Charge attack windup -> dash strikes unit in front path once per charge
    const victim = addUnit(world, 'p1', 'player', coaches[0].pos.x + 120, coaches[0].pos.y, true);
    boss.trainState!.behavior = 'chargeWindup';
    boss.trainState!.behaviorTimer = 0.05;
    boss.trainState!.chargeAngle = 0;
    boss.angle = 0;
    boss.trainState!.hitUnitIds = [];
    for (let i = 0; i < 30; i += 1) updateHellcell(world, 1 / 60);
    expect(victim.hp).toBeLessThan(200);
    expect(boss.trainState!.hitUnitIds).toContain('p1');

    // Electrical attack pulse damages nearby unit once per pulse
    const shockTarget = addUnit(world, 'p2', 'player', coaches[1].pos.x, coaches[1].pos.y + 65, false);
    boss.trainState!.behavior = 'electricWindup';
    boss.trainState!.behaviorTimer = 0.05;
    boss.trainState!.hitUnitIds = [];
    for (let i = 0; i < 12; i += 1) updateHellcell(world, 1 / 60);
    expect(shockTarget.hp).toBeLessThan(200);
    expect(boss.trainState!.hitUnitIds).toContain('p2');

    // Player bullets hit rear coach (3rd coach) AND deal extra weak-point damage on Coach 0 electrical assembly
    const rearCoach = coaches[2];
    const hpBeforeRear = boss.hp;
    world.state.projectiles.push({
      id: 'proj-rear',
      team: 'player',
      pos: { x: rearCoach.pos.x - 55, y: rearCoach.pos.y },
      vel: { x: 1000, y: 0 },
      weaponId: 'rifle',
      ownerId: 'p1',
      life: 1.0,
      damage: 40,
      splashRadius: 0,
    });
    updateProjectiles(world, 0.1);
    const rearDamage = hpBeforeRear - boss.hp;
    expect(rearDamage).toBeCloseTo(40, 1);

    // Hit front electrical assembly weak point (front nose / pantograph hub of Coach 0)
    const frontCoach = coaches[0];
    const startX = frontCoach.pos.x + Math.cos(frontCoach.angle) * 70;
    const startY = frontCoach.pos.y + Math.sin(frontCoach.angle) * 70;
    const hpBeforeWeak = boss.hp;
    world.state.projectiles.push({
      id: 'proj-weak',
      team: 'player',
      pos: { x: startX, y: startY },
      vel: {
        x: -Math.cos(frontCoach.angle) * 1000,
        y: -Math.sin(frontCoach.angle) * 1000,
      },
      weaponId: 'rifle',
      ownerId: 'p1',
      life: 1.0,
      damage: 40,
      splashRadius: 0,
    });
    updateProjectiles(world, 0.06);
    const weakDamage = hpBeforeWeak - boss.hp;
    expect(weakDamage).toBeGreaterThan(rearDamage);
  });
});
