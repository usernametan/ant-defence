import { describe, expect, it } from 'vitest';
import { createGreenreachMap } from '../content/maps/greenreach';
import { loadMap } from './MapLoader';
import { terrainAtWorld } from './MapDef';

describe('Greenreach Wilds', () => {
  it('loads the authored world dimensions and terrain grid', () => {
    const world = loadMap(createGreenreachMap());

    expect(world.id).toBe('greenreach-wilds');
    expect(world.name).toBe('Greenreach Wilds');
    expect(world.width).toBe(2048);
    expect(world.height).toBe(1280);
    expect(world.tileSize).toBe(32);
    expect(world.columns).toBe(64);
    expect(world.rows).toBe(40);
    expect(world.terrain).toHaveLength(world.columns * world.rows);
    expect(world.decorations.length).toBeGreaterThan(100);
    expect(world.solidProps.length).toBeGreaterThan(40);
    expect(world.obstacles).toBe(world.solidProps);
    expect(world.pointsOfInterest).toHaveLength(6);
    expect(world.creatureSpawns).toHaveLength(9);
    expect(world.targets).toHaveLength(3);
    expect(world.pickups).toHaveLength(12);
    expect(world.pickups.filter((pickup) => pickup.kind === 'health')).toHaveLength(6);
    expect(world.pickups.filter((pickup) => pickup.kind === 'armor')).toHaveLength(6);
    expect(world.pickups[0]).toMatchObject({
      amount: 30,
      radius: 14,
      respawnSeconds: 18,
    });
  });

  it('keeps the start entry point clear and on the waystation', () => {
    const world = loadMap(createGreenreachMap());
    const waystation = world.pointsOfInterest.find(
      (poi) => poi.id === 'poi-waystation',
    );

    expect(world.spawn).toEqual(world.entryPoints.start);
    expect(world.spawn.x).toBeGreaterThan(250);
    expect(world.spawn.x).toBeLessThan(400);
    expect(world.spawn.y).toBeGreaterThan(600);
    expect(world.spawn.y).toBeLessThan(700);
    expect(waystation).toBeDefined();
    expect(
      Math.hypot(waystation!.x - world.spawn.x, waystation!.y - world.spawn.y),
    ).toBeLessThan(waystation!.radius);
  });

  it('normalizes prop layers and solid defaults', () => {
    const world = loadMap(createGreenreachMap());
    const bridge = world.props.find((prop) => prop.kind === 'bridge');
    const tree = world.props.find((prop) => prop.kind === 'tree');
    const bush = world.props.find((prop) => prop.kind === 'bush');

    expect(bridge).toMatchObject({ solid: false, layer: 'ground' });
    expect(tree).toMatchObject({ solid: true, layer: 'object' });
    expect(bush).toMatchObject({ solid: false, layer: 'object' });
  });

  it('assigns distinct ids across world content', () => {
    const world = loadMap(createGreenreachMap());
    const ids = [
      ...world.props,
      ...world.decorations,
      ...world.creatureSpawns,
      ...world.targets,
      ...world.pickups,
      ...world.pointsOfInterest,
    ].map((item) => item.id);

    expect(new Set(ids).size).toBe(ids.length);
  });

  it('samples terrain by world position and clamps outside the map', () => {
    const world = loadMap(createGreenreachMap());
    const terrainKinds = new Set(world.terrain);

    expect(
      terrainKinds.has(terrainAtWorld(world, world.spawn.x, world.spawn.y)),
    ).toBe(true);
    expect(terrainKinds.has(terrainAtWorld(world, 1270, 930))).toBe(true);
    expect(terrainAtWorld(world, -100, -100)).toBe('grass');
    expect(terrainAtWorld(world, world.width + 100, world.height + 100)).toBe(
      'grass',
    );
  });

  it('rejects maps without a start entry point', () => {
    const map = createGreenreachMap();

    expect(() =>
      loadMap({
        ...map,
        entryPoints: {},
      }),
    ).toThrow(/start/);
  });

  it('rejects pickups that overlap a solid prop', () => {
    const map = createGreenreachMap();
    const pickup = map.pickups[0];

    expect(() =>
      loadMap({
        ...map,
        props: [
          ...map.props,
          {
            id: 'invalid-pickup-blocker',
            kind: 'boulder',
            x: pickup.x - 10,
            y: pickup.y - 10,
            width: 20,
            height: 20,
            solid: true,
          },
        ],
      }),
    ).toThrow(/pickup.*overlap/i);
  });

  it('rejects pickups outside the map', () => {
    const map = createGreenreachMap();
    const pickup = map.pickups[0];

    expect(() =>
      loadMap({
        ...map,
        pickups: [
          ...map.pickups,
          { ...pickup, id: 'invalid-pickup-outside', x: -20 },
        ],
      }),
    ).toThrow(/pickup.*outside/i);
  });

  it('rejects creature spawns that overlap a solid prop', () => {
    const map = createGreenreachMap();
    const spawn = map.creatureSpawns[0];

    expect(() =>
      loadMap({
        ...map,
        props: [
          ...map.props,
          {
            id: 'invalid-spawn-blocker',
            kind: 'boulder',
            x: spawn.x - 18,
            y: spawn.y - 18,
            width: 36,
            height: 36,
            solid: true,
          },
        ],
      }),
    ).toThrow(/spawn/i);
  });
});
