import { describe, expect, it } from 'vitest';
import type { HellcellBoss, HellcellState, MapData } from '../shared/types';
import { generateMap } from '../sim/map';
import { Camera, DEFAULT_BASE_ZOOM, DEFAULT_SCOPE_ZOOM } from './camera';
import { EffectsSystem } from './effects';
import { EnvironmentRenderer, formatZoneCode } from './environment';
import { drawHellcellEntities, drawHellcellGroundLayer } from './hellcell';
import { MAP_THEME_PALETTES, PALETTE, getThemePalette } from './palette';
import { decomposeFortressStructures } from './fortress';
import { decomposeJungleRuins } from './jungle';
import { decomposeSlumBuildings } from './slumside';
import { decomposeTempleStructures } from './temple';
import { VisibilityPolygonCache, computeVisibilityPolygon, hasLineOfSight } from './visibility';

function makeMiniMap(): MapData {
  const width = 10;
  const height = 10;
  const tiles: MapData['tiles'] = Array.from({ length: height }, () =>
    Array.from({ length: width }, () => 'floor' as const),
  );
  tiles[4][5] = 'wall';
  tiles[5][5] = 'wall';
  return {
    seed: 1,
    width,
    height,
    tileSize: 32,
    tiles,
    coverHp: {},
    zones: [],
    bases: [],
    crateSpawns: [],
  };
}

describe('Renderer math & palette', () => {
  it('uses exact Holo-Tactical palette tokens', () => {
    expect(PALETTE.bg0).toBe('#070B14');
    expect(PALETTE.player).toBe('#22D3EE');
    expect(PALETTE.enemy).toBe('#FF5A3C');
    expect(PALETTE.gold).toBe('#FACC15');
  });

  it('Camera screenToWorld and worldToScreen are exact inverses', () => {
    const cam = new Camera();
    cam.reset({ x: 320, y: 240 });
    cam.update({ x: 320, y: 240 }, { x: 0, y: 0 }, 0.016, 0);

    const vt = cam.getTransform(1280, 720, 1, 0, true);
    const screen = vt.worldToScreen(500, 120);
    const world = vt.screenToWorld(screen.x, screen.y);
    expect(world.x).toBeCloseTo(500, 4);
    expect(world.y).toBeCloseTo(120, 4);
  });

  it('keeps camera shake subtle even at max trauma', () => {
    const cam = new Camera();
    cam.reset({ x: 320, y: 240 });
    cam.addTrauma(1);
    cam.update({ x: 320, y: 240 }, { x: 0, y: 0 }, 0.016, 0);
    const vt = cam.getTransform(1280, 720, 1, 1, false);
    expect(Math.abs(vt.shakeX)).toBeLessThanOrEqual(7);
    expect(Math.abs(vt.shakeY)).toBeLessThanOrEqual(7);
    expect(Math.abs(vt.shakeAngle)).toBeLessThanOrEqual(0.003);
  });

  it('Camera zooms in smoothly when scoped and returns to base zoom when unscoped', () => {
    const cam = new Camera();
    cam.reset({ x: 320, y: 240 });
    expect(cam.zoom).toBeCloseTo(DEFAULT_BASE_ZOOM, 5);

    cam.setScoped(true);
    expect(cam.getTargetZoom()).toBe(DEFAULT_SCOPE_ZOOM);
    for (let i = 0; i < 60; i += 1) {
      cam.update({ x: 320, y: 240 }, { x: 0, y: 0 }, 1 / 60, 0);
    }
    expect(cam.zoom).toBeGreaterThan(DEFAULT_BASE_ZOOM);
    expect(cam.zoom).toBeCloseTo(DEFAULT_SCOPE_ZOOM, 2);

    cam.setScoped(false);
    expect(cam.getTargetZoom()).toBe(DEFAULT_BASE_ZOOM);
    for (let i = 0; i < 60; i += 1) {
      cam.update({ x: 320, y: 240 }, { x: 0, y: 0 }, 1 / 60, 0);
    }
    expect(cam.zoom).toBeCloseTo(DEFAULT_BASE_ZOOM, 2);
  });

  it('Line of sight detects walls and visibility polygon returns closed perimeter', () => {
    const map = makeMiniMap();
    expect(hasLineOfSight(map, { x: 48, y: 144 }, { x: 112, y: 144 })).toBe(true);
    expect(hasLineOfSight(map, { x: 48, y: 144 }, { x: 240, y: 144 })).toBe(false);

    const poly = computeVisibilityPolygon(map, { x: 96, y: 144 }, 300, 36);
    expect(poly.length).toBeGreaterThanOrEqual(36);

    // VisibilityPolygonCache skips recomputation for small <=6px jitter, recomputes on >6px or wallRevision bump
    const visCache = new VisibilityPolygonCache();
    expect(visCache.update(map, { x: 96, y: 144 }, 300, 48)).toBe(true);
    expect(visCache.update(map, { x: 99, y: 146 }, 300, 48)).toBe(false);
    expect(visCache.update(map, { x: 112, y: 144 }, 300, 48)).toBe(true);
    map.wallRevision = (map.wallRevision ?? 0) + 1;
    expect(visCache.update(map, { x: 112, y: 144 }, 300, 48)).toBe(true);
    expect(visCache.recomputeCount).toBe(3);
  });

  it('provides distinct theme palettes for fortress, jungle, temple, and slumside', () => {
    expect(Object.keys(MAP_THEME_PALETTES).sort()).toEqual([
      'fortress',
      'jungle',
      'slumside',
      'temple',
    ]);
    const jungle = getThemePalette('jungle');
    const temple = getThemePalette('temple');
    const slumside = getThemePalette('slumside');
    expect(jungle.floorBase).not.toBe(temple.floorBase);
    expect(jungle.wallTop).not.toBe(temple.wallTop);
    expect(slumside.name).toBe('Slumside');
    expect(slumside.floorBase).not.toBe(temple.floorBase);
    expect(slumside.wallTop).not.toBe(jungle.wallTop);
    expect(getThemePalette(undefined).id).toBe('fortress');
    expect(formatZoneCode('zone-1')).toBe('A');
    expect(formatZoneCode('zone-2')).toBe('B');
    expect(formatZoneCode('zone-3')).toBe('C');
  });

  it('decomposes Slumside wall tiles into varied non-overlapping buildings cleanly in Node', () => {
    const map = generateMap(4242, 'slumside');
    const buildings = decomposeSlumBuildings(map);
    const interior = buildings.filter((b) => !b.isBorder);

    expect(interior.length).toBeGreaterThan(10);
    const storyCounts = new Set(interior.map((b) => b.stories));
    const roofTypes = new Set(interior.map((b) => b.roofType));
    expect(storyCounts.size).toBeGreaterThanOrEqual(2);
    expect(roofTypes.size).toBeGreaterThanOrEqual(3);

    const covered = new Set<string>();
    for (const b of interior) {
      expect(b.bottomRow).toBe(b.row + b.h - 1);
      expect(b.bottomRow).toBeGreaterThanOrEqual(1);
      expect(b.bottomRow).toBeLessThan(map.height - 1);
      for (let r = b.row; r < b.row + b.h; r += 1) {
        for (let c = b.col; c < b.col + b.w; c += 1) {
          expect(map.tiles[r][c]).toBe('wall');
          const key = `${c},${r}`;
          expect(covered.has(key)).toBe(false);
          covered.add(key);
        }
      }
    }

    let interiorWallCount = 0;
    for (let r = 1; r < map.height - 1; r += 1) {
      for (let c = 1; c < map.width - 1; c += 1) {
        if (map.tiles[r][c] === 'wall') interiorWallCount += 1;
      }
    }
    expect(covered.size).toBe(interiorWallCount);
  });

  it('decomposes Jungle Outpost wall tiles into varied non-overlapping ruins cleanly in Node', () => {
    const map = generateMap(4242, 'jungle');
    const ruins = decomposeJungleRuins(map);
    const interior = ruins.filter((r) => !r.isBorder);

    expect(interior.length).toBeGreaterThan(10);
    const kinds = new Set(interior.map((r) => r.kind));
    expect(kinds.size).toBeGreaterThanOrEqual(2);

    const covered = new Set<string>();
    for (const ruin of interior) {
      expect(ruin.bottomRow).toBe(ruin.row + ruin.h - 1);
      expect(ruin.bottomRow).toBeGreaterThanOrEqual(1);
      expect(ruin.bottomRow).toBeLessThan(map.height - 1);
      for (let r = ruin.row; r < ruin.row + ruin.h; r += 1) {
        for (let c = ruin.col; c < ruin.col + ruin.w; c += 1) {
          expect(map.tiles[r][c]).toBe('wall');
          const key = `${c},${r}`;
          expect(covered.has(key)).toBe(false);
          covered.add(key);
        }
      }
    }

    let interiorWallCount = 0;
    for (let r = 1; r < map.height - 1; r += 1) {
      for (let c = 1; c < map.width - 1; c += 1) {
        if (map.tiles[r][c] === 'wall') interiorWallCount += 1;
      }
    }
    expect(covered.size).toBe(interiorWallCount);
  });

  it('decomposes Ancient Temple wall tiles into varied non-overlapping Egyptian structures cleanly in Node', () => {
    const map = generateMap(4242, 'temple');
    const structures = decomposeTempleStructures(map);
    const interior = structures.filter((s) => !s.isBorder);

    expect(interior.length).toBeGreaterThan(10);
    const kinds = new Set(interior.map((s) => s.kind));
    expect(kinds.size).toBeGreaterThanOrEqual(2);
    expect(kinds.has('colonnadePillar')).toBe(true);

    const covered = new Set<string>();
    for (const s of interior) {
      expect(s.bottomRow).toBe(s.row + s.h - 1);
      expect(s.bottomRow).toBeGreaterThanOrEqual(1);
      expect(s.bottomRow).toBeLessThan(map.height - 1);
      for (let r = s.row; r < s.row + s.h; r += 1) {
        for (let c = s.col; c < s.col + s.w; c += 1) {
          expect(map.tiles[r][c]).toBe('wall');
          const key = `${c},${r}`;
          expect(covered.has(key)).toBe(false);
          covered.add(key);
        }
      }
    }

    let interiorWallCount = 0;
    for (let r = 1; r < map.height - 1; r += 1) {
      for (let c = 1; c < map.width - 1; c += 1) {
        if (map.tiles[r][c] === 'wall') interiorWallCount += 1;
      }
    }
    expect(covered.size).toBe(interiorWallCount);
  });

  it('decomposes Sci-Fi Arena wall tiles into varied non-overlapping research structures cleanly in Node', () => {
    const map = generateMap(4242, 'fortress');
    const structures = decomposeFortressStructures(map);
    const interior = structures.filter((s) => !s.isBorder);

    expect(interior.length).toBeGreaterThan(10);
    const kinds = new Set(interior.map((s) => s.kind));
    expect(kinds.size).toBeGreaterThanOrEqual(2);

    const covered = new Set<string>();
    for (const s of interior) {
      expect(s.bottomRow).toBe(s.row + s.h - 1);
      expect(s.bottomRow).toBeGreaterThanOrEqual(1);
      expect(s.bottomRow).toBeLessThan(map.height - 1);
      for (let r = s.row; r < s.row + s.h; r += 1) {
        for (let c = s.col; c < s.col + s.w; c += 1) {
          expect(map.tiles[r][c]).toBe('wall');
          const key = `${c},${r}`;
          expect(covered.has(key)).toBe(false);
          covered.add(key);
        }
      }
    }

    let interiorWallCount = 0;
    for (let r = 1; r < map.height - 1; r += 1) {
      for (let c = 1; c < map.width - 1; c += 1) {
        if (map.tiles[r][c] === 'wall') interiorWallCount += 1;
      }
    }
    expect(covered.size).toBe(interiorWallCount);
  });

  it('draws Omega Dreadnought across idle, prep, recoil, hit flash, and shutdown without errors', () => {
    const noop = () => {};
    const gradientStub = { addColorStop: noop };
    const ctx = {
      save: noop,
      restore: noop,
      translate: noop,
      rotate: noop,
      scale: noop,
      beginPath: noop,
      closePath: noop,
      moveTo: noop,
      lineTo: noop,
      arc: noop,
      ellipse: noop,
      rect: noop,
      roundRect: noop,
      fill: noop,
      stroke: noop,
      clip: noop,
      fillRect: noop,
      strokeRect: noop,
      fillText: noop,
      setLineDash: noop,
      createRadialGradient: () => gradientStub,
      createLinearGradient: () => gradientStub,
    } as unknown as CanvasRenderingContext2D;

    const boss: HellcellBoss = {
      id: 'hellcell-boss',
      kind: 'rocketSiegeBot',
      name: 'OMEGA SIEGE DREADNOUGHT',
      pos: { x: 480, y: 320 },
      radius: 68.8,
      angle: 0.4,
      targetAngle: 0.4,
      moveAngle: 0.8,
      hp: 3000,
      maxHp: 7000,
      attackTimer: 0.2,
      attackAnim: 0.7,
    };

    const hellcell: HellcellState = {
      phase: 'CEASEFIRE_BOSS',
      isCeasefireActive: true,
      hasTriggered: true,
      bossDefeated: false,
      triggerTime: 0,
      countdown: 0,
      blueBossDamage: 2000,
      redBossDamage: 2000,
      boss,
      reticles: [],
      acidPools: [],
      bossProjectiles: [
        {
          id: 'r-1',
          kind: 'rocket',
          pos: { x: 520, y: 310 },
          vel: { x: 240, y: 0 },
          rotation: 0,
          spinSpeed: 0,
          bouncesLeft: 0,
          life: 1,
          damage: 45,
          splashRadius: 52,
        },
      ],
      venomCone: null,
    };

    expect(() =>
      drawHellcellEntities(ctx, hellcell, 4.2, {
        bossHitFlash: 0.9,
        shutdownBoss: { boss: { ...boss, hp: 0 }, progress: 0.45 },
      }),
    ).not.toThrow();
  });

  it('draws Jungle Centipede across crawling follow-chain, prep, lunge, damage, and defeat states', () => {
    const noop = () => {};
    const gradientStub = { addColorStop: noop };
    const ctx = {
      save: noop,
      restore: noop,
      translate: noop,
      rotate: noop,
      scale: noop,
      beginPath: noop,
      closePath: noop,
      moveTo: noop,
      lineTo: noop,
      quadraticCurveTo: noop,
      arc: noop,
      ellipse: noop,
      rect: noop,
      roundRect: noop,
      fill: noop,
      stroke: noop,
      clip: noop,
      fillRect: noop,
      strokeRect: noop,
      fillText: noop,
      setLineDash: noop,
      createRadialGradient: () => gradientStub,
      createLinearGradient: () => gradientStub,
    } as unknown as CanvasRenderingContext2D;

    const boss: HellcellBoss = {
      id: 'hellcell-boss',
      kind: 'venomCobra',
      name: 'JUNGLE CENTIPEDE',
      pos: { x: 420, y: 310 },
      radius: 68.8,
      angle: 0.25,
      targetAngle: 0.25,
      moveAngle: 0.35,
      hp: 2800,
      maxHp: 6600,
      attackTimer: 0.18,
      attackAnim: 0.65,
    };

    const hellcell: HellcellState = {
      phase: 'CEASEFIRE_BOSS',
      isCeasefireActive: true,
      hasTriggered: true,
      bossDefeated: false,
      triggerTime: 0,
      countdown: 0,
      blueBossDamage: 1800,
      redBossDamage: 1700,
      boss,
      reticles: [],
      acidPools: [],
      bossProjectiles: [
        {
          id: 'vb-1',
          kind: 'venomBlob',
          pos: { x: 470, y: 325 },
          vel: { x: 190, y: 40 },
          rotation: 0.2,
          spinSpeed: 8,
          bouncesLeft: 0,
          life: 0.3,
          damage: 30,
          splashRadius: 36,
        },
      ],
      venomCone: {
        pos: { x: 420, y: 310 },
        angle: 0.25,
        halfArc: 0.6,
        range: 230,
        ttl: 0.5,
        maxTtl: 0.72,
      },
    };

    expect(() => {
      drawHellcellEntities(ctx, hellcell, 2.0, { bossHitFlash: 0.8 });
      boss.pos.x += 12;
      boss.pos.y += 4;
      drawHellcellEntities(ctx, hellcell, 2.05, {
        bossHitFlash: 0,
        shutdownBoss: { boss: { ...boss, hp: 0 }, progress: 0.5 },
      });
    }).not.toThrow();
  });

  it('draws Pharaoh guardian across idle, walking, attack prep, release, damage, and dormancy states', () => {
    const noop = () => {};
    const gradientStub = { addColorStop: noop };
    const ctx = {
      save: noop,
      restore: noop,
      translate: noop,
      rotate: noop,
      scale: noop,
      beginPath: noop,
      closePath: noop,
      moveTo: noop,
      lineTo: noop,
      quadraticCurveTo: noop,
      arc: noop,
      ellipse: noop,
      rect: noop,
      roundRect: noop,
      fill: noop,
      stroke: noop,
      clip: noop,
      fillRect: noop,
      strokeRect: noop,
      fillText: noop,
      setLineDash: noop,
      createRadialGradient: () => gradientStub,
      createLinearGradient: () => gradientStub,
    } as unknown as CanvasRenderingContext2D;

    const boss: HellcellBoss = {
      id: 'hellcell-boss',
      kind: 'pharaohSkeleton',
      name: 'PHARAOH',
      pos: { x: 510, y: 340 },
      radius: 68.8,
      angle: 0.5,
      targetAngle: 0.5,
      moveAngle: 0.5,
      hp: 3100,
      maxHp: 6800,
      attackTimer: 0.2,
      attackAnim: 0.8,
    };

    const hellcell: HellcellState = {
      phase: 'CEASEFIRE_BOSS',
      isCeasefireActive: true,
      hasTriggered: true,
      bossDefeated: false,
      triggerTime: 0,
      countdown: 0,
      blueBossDamage: 1500,
      redBossDamage: 1400,
      boss,
      reticles: [],
      acidPools: [],
      bossProjectiles: [
        {
          id: 'bn-1',
          kind: 'bone',
          pos: { x: 560, y: 350 },
          vel: { x: 320, y: 40 },
          rotation: 1.1,
          spinSpeed: 16,
          bouncesLeft: 1,
          life: 2.2,
          damage: 56,
          splashRadius: 0,
        },
      ],
      venomCone: null,
    };

    expect(() =>
      drawHellcellEntities(ctx, hellcell, 3.1, {
        bossHitFlash: 0.85,
        shutdownBoss: { boss: { ...boss, hp: 0 }, progress: 0.55 },
      }),
    ).not.toThrow();
  });

  it('draws THE LAST LOCAL (Slumside Mumbai Local Train) across charge, electrical, hit flash, and defeat states', () => {
    const noop = () => {};
    const gradientStub = { addColorStop: noop };
    const ctx = {
      save: noop,
      restore: noop,
      translate: noop,
      rotate: noop,
      scale: noop,
      beginPath: noop,
      closePath: noop,
      moveTo: noop,
      lineTo: noop,
      quadraticCurveTo: noop,
      arc: noop,
      ellipse: noop,
      rect: noop,
      roundRect: noop,
      fill: noop,
      stroke: noop,
      clip: noop,
      fillRect: noop,
      strokeRect: noop,
      fillText: noop,
      setLineDash: noop,
      createRadialGradient: () => gradientStub,
      createLinearGradient: () => gradientStub,
    } as unknown as CanvasRenderingContext2D;

    const boss: HellcellBoss = {
      id: 'hellcell-boss',
      kind: 'mumbaiTrain',
      name: 'THE LAST LOCAL',
      subtitle: 'THE FINAL DEPARTURE',
      pos: { x: 600, y: 360 },
      radius: 68.8,
      angle: 0.25,
      targetAngle: 0.25,
      hp: 3600,
      maxHp: 7400,
      attackTimer: 0.4,
      attackAnim: 0.9,
      trainState: {
        coaches: [
          { pos: { x: 600, y: 360 }, angle: 0.25 },
          { pos: { x: 509, y: 337 }, angle: 0.2 },
          { pos: { x: 418, y: 320 }, angle: 0.14 },
        ],
        speed: 420,
        behavior: 'chargeWindup',
        behaviorTimer: 0.5,
        actionIndex: 1,
        chargeAngle: 0.25,
        chargeLength: 350,
        electricRadius: 128,
        hitUnitIds: [],
      },
    };

    const hellcell: HellcellState = {
      phase: 'CEASEFIRE_BOSS',
      isCeasefireActive: true,
      hasTriggered: true,
      bossDefeated: false,
      triggerTime: 0,
      countdown: 0,
      blueBossDamage: 1200,
      redBossDamage: 1000,
      boss,
      reticles: [],
      acidPools: [],
      bossProjectiles: [],
      venomCone: null,
    };

    expect(() => {
      drawHellcellGroundLayer(ctx, hellcell, 32, 2.5);
      drawHellcellEntities(ctx, hellcell, 2.5, { bossHitFlash: 0.8 });
      boss.trainState!.behavior = 'electricPulse';
      drawHellcellGroundLayer(ctx, hellcell, 32, 2.8);
      drawHellcellEntities(ctx, hellcell, 2.8, {
        shutdownBoss: { boss: { ...boss, hp: 0 }, progress: 0.5 },
      });
    }).not.toThrow();
  });

  it('uses dirty chunks and structure diffing instead of full ground-cache rebuilds when Hellcell crushes walls', () => {
    for (const theme of ['fortress', 'jungle', 'slumside', 'temple'] as const) {
      const env = new EnvironmentRenderer();
      const map = generateMap(4242, theme);
      const noop = () => {};
      const ctx = {
        save: noop,
        restore: noop,
        beginPath: noop,
        rect: noop,
        clip: noop,
        clearRect: noop,
        fillRect: noop,
        drawImage: noop,
        fill: noop,
        stroke: noop,
        strokeRect: noop,
        moveTo: noop,
        lineTo: noop,
        arc: noop,
        ellipse: noop,
        roundRect: noop,
        quadraticCurveTo: noop,
        translate: noop,
        rotate: noop,
        scale: noop,
        setLineDash: noop,
        closePath: noop,
        setTransform: noop,
        createLinearGradient: () => ({ addColorStop: noop }),
        createRadialGradient: () => ({ addColorStop: noop }),
      } as unknown as CanvasRenderingContext2D;

      env.drawGroundAndShadows(ctx, map, 1, 0, 0, 1280, 720);
      expect(env.getThemeCacheStats(theme).fullRebuilds).toBe(1);

      // Simulate crushing 10 interior walls one by one
      let crushed = 0;
      for (let r = 2; r < map.height - 2 && crushed < 10; r += 1) {
        for (let c = 2; c < map.width - 2 && crushed < 10; c += 1) {
          if (map.tiles[r][c] === 'wall') {
            map.tiles[r][c] = 'floor';
            env.markDirtyTile(`${c},${r}`, map);
            map.wallRevision = (map.wallRevision ?? 0) + 1;
            env.drawGroundAndShadows(ctx, map, 1 + crushed * 0.1, 0, 0, 1280, 720);
            crushed += 1;
          }
        }
      }

      const stats = env.getThemeCacheStats(theme);
      expect(stats.fullRebuilds).toBe(1); // Zero extra full rebuilds!
      expect(stats.chunkRebuilds).toBeGreaterThan(0);
      expect(stats.structuresReused).toBeGreaterThan(0);

      // Simulate restoreCrushedObstacles bumping wallRevision without dirty tiles
      map.wallRevision = (map.wallRevision ?? 0) + 1;
      env.drawGroundAndShadows(ctx, map, 3.0, 0, 0, 1280, 720);
      const afterRestore = env.getThemeCacheStats(theme);
      expect(afterRestore.fullRebuilds).toBe(1);
      expect(afterRestore.pendingChunks).toBeGreaterThan(0);
    }
  });

  it('compacts EffectsSystem arrays in-place and culls offscreen Hellcell entities/decals', () => {
    const fx = new EffectsSystem();
    const initialParticlesRef = fx.particles;
    const initialDecalsRef = fx.scorchDecals;
    for (let i = 0; i < 40; i += 1) {
      fx.spawnImpactSparks({ x: 100 + i * 50, y: 100 }, '#38BDF8', 10);
    }
    expect(fx.particles).toBe(initialParticlesRef);
    expect(fx.particles.length).toBe(340);

    fx.spawnExplosion({ x: 200, y: 200 }, 80);
    fx.spawnExplosion({ x: 2500, y: 2500 }, 80);
    expect(fx.scorchDecals).toBe(initialDecalsRef);

    fx.update(0.3, []);
    expect(fx.particles).toBe(initialParticlesRef);
    expect(fx.particles.length).toBeLessThan(340);

    let arcCount = 0;
    const noop = () => {};
    const ctx = {
      save: noop,
      restore: noop,
      translate: noop,
      rotate: noop,
      scale: noop,
      beginPath: noop,
      closePath: noop,
      moveTo: noop,
      lineTo: noop,
      arc: () => {
        arcCount += 1;
      },
      ellipse: noop,
      rect: noop,
      roundRect: noop,
      fill: noop,
      stroke: noop,
      clip: noop,
      fillRect: noop,
      strokeRect: noop,
      fillText: noop,
      setLineDash: noop,
      drawImage: noop,
      createRadialGradient: () => ({ addColorStop: noop }),
      createLinearGradient: () => ({ addColorStop: noop }),
    } as unknown as CanvasRenderingContext2D;

    fx.drawScorchDecals(ctx, { minX: 0, minY: 0, maxX: 500, maxY: 500 });
    expect(arcCount).toBe(1);

    arcCount = 0;
    const hellcell: HellcellState = {
      phase: 'CEASEFIRE_BOSS',
      hasTriggered: true,
      isCeasefireActive: true,
      bossDefeated: false,
      triggerTime: 0,
      countdown: 0,
      blueBossDamage: 0,
      redBossDamage: 0,
      boss: null,
      reticles: [
        {
          id: 'r-in',
          startPos: { x: 100, y: 100 },
          targetPos: { x: 200, y: 200 },
          splashRadius: 60,
          timer: 0.4,
          maxTimer: 1,
          damage: 40,
        },
        {
          id: 'r-out',
          startPos: { x: 2900, y: 2900 },
          targetPos: { x: 3000, y: 3000 },
          splashRadius: 60,
          timer: 0.4,
          maxTimer: 1,
          damage: 40,
        },
      ],
      acidPools: [],
      bossProjectiles: [
        {
          id: 'p-in',
          kind: 'venomBlob',
          pos: { x: 200, y: 200 },
          vel: { x: 0, y: 0 },
          rotation: 0,
          spinSpeed: 1,
          bouncesLeft: 0,
          life: 1,
          damage: 20,
          splashRadius: 30,
        },
        {
          id: 'p-out',
          kind: 'venomBlob',
          pos: { x: 3000, y: 3000 },
          vel: { x: 0, y: 0 },
          rotation: 0,
          spinSpeed: 1,
          bouncesLeft: 0,
          life: 1,
          damage: 20,
          splashRadius: 30,
        },
      ],
      venomCone: null,
    };

    drawHellcellGroundLayer(ctx, hellcell, 40, 1.0, undefined, {
      minX: 0,
      minY: 0,
      maxX: 500,
      maxY: 500,
    });
    const groundArcsWithCull = arcCount;
    arcCount = 0;
    drawHellcellGroundLayer(ctx, hellcell, 40, 1.0);
    expect(groundArcsWithCull).toBeLessThan(arcCount);

    let projArcsWithCull = 0;
    arcCount = 0;
    drawHellcellEntities(ctx, hellcell, 1.0, { view: { minX: 0, minY: 0, maxX: 500, maxY: 500 } });
    projArcsWithCull = arcCount;
    arcCount = 0;
    drawHellcellEntities(ctx, hellcell, 1.0);
    expect(projArcsWithCull).toBeLessThan(arcCount);
  });
});
