import { describe, expect, it } from 'vitest';
import {
  GREENREACH_MISSIONS,
  RECLAIM_GREENREACH_ID,
  type MissionDef,
} from '../content/missions';
import {
  MissionSystem,
  validateMissionDefinitions,
  type MissionSystemOptions,
} from './MissionSystem';

const AREAS = [
  {
    id: 'poi-watchpost',
    x: 100,
    y: 100,
    radius: 50,
  },
];

const INTERACTABLES = [
  {
    id: 'relay-watchpost',
    name: 'Watchpost Relay',
    x: 100,
    y: 100,
    radius: 20,
  },
];

const NESTS = [
  {
    id: 'nest-bloom-watchpost',
    x: 100,
    y: 100,
    radius: 80,
  },
];

const TERRITORIES = [
  {
    id: 'territory-watchpost',
    x: 100,
    y: 100,
    radius: 120,
  },
];

function createSystem(
  definitions: readonly MissionDef[] = GREENREACH_MISSIONS,
  options: MissionSystemOptions = {},
): MissionSystem {
  return new MissionSystem(definitions, {
    pointsOfInterest: AREAS,
    interactables: INTERACTABLES,
    nests: NESTS,
    territories: TERRITORIES,
    ...options,
  });
}

function findMission(system: MissionSystem, id = RECLAIM_GREENREACH_ID) {
  return system.snapshot().missions.find((mission) => mission.id === id);
}

function findObjective(system: MissionSystem, objectiveId: string) {
  return findMission(system)?.objectives.find(
    (objective) => objective.id === objectiveId,
  );
}

function missionDefinition(
  overrides: Partial<MissionDef> = {},
): MissionDef {
  return {
    id: 'test-mission',
    regionId: 'test-region',
    title: 'Test mission',
    description: 'Test description',
    briefing: 'Test briefing',
    objectives: [
      {
        id: 'kill-one',
        type: 'kill',
        title: 'Kill one creature',
        targetId: '*',
        count: 1,
      },
    ],
    completion: {
      objectiveIds: ['kill-one'],
    },
    ...overrides,
  };
}

describe('MissionSystem', () => {
  it('auto-activates the Greenreach mission and gates relay interaction', () => {
    const system = createSystem();
    const mission = findMission(system);

    expect(mission?.status).toBe('active');
    expect(findObjective(system, 'break-the-pack')?.status).toBe('active');
    expect(findObjective(system, 'reach-watchpost')?.status).toBe('active');
    expect(findObjective(system, 'destroy-nest')?.status).toBe('active');
    expect(findObjective(system, 'secure-watchpost')?.status).toBe('locked');
    expect(findObjective(system, 'restore-relay')?.status).toBe('locked');
    expect(system.snapshot().markers.map((marker) => marker.objectiveId)).toContain(
      'destroy-nest',
    );

    system.recordInteract('relay-watchpost');
    expect(system.canInteract('relay-watchpost')).toBe(false);
    expect(findObjective(system, 'restore-relay')?.progress).toBe(0);

    system.recordReach('poi-watchpost');
    expect(findObjective(system, 'reach-watchpost')?.status).toBe('completed');
    expect(findObjective(system, 'restore-relay')?.status).toBe('locked');

    for (let index = 0; index < 3; index += 1) {
      system.recordDestroy('nest-bloom-watchpost');
    }

    expect(findObjective(system, 'destroy-nest')?.status).toBe('completed');
    expect(findObjective(system, 'secure-watchpost')?.status).toBe('active');
    expect(system.canInteract('relay-watchpost')).toBe(false);

    system.recordSecure('territory-watchpost');
    expect(findObjective(system, 'secure-watchpost')?.status).toBe('completed');
    expect(findObjective(system, 'restore-relay')?.status).toBe('active');
    expect(system.canInteract('relay-watchpost')).toBe(true);
    expect(system.snapshot().markers.map((marker) => marker.objectiveId)).toContain(
      'restore-relay',
    );
  });

  it('counts kills and interactions, completes once, and reports rewards', () => {
    const system = createSystem();

    for (let index = 0; index < 8; index += 1) {
      system.recordCreatureKill('crawler', 0, 0);
    }

    expect(findObjective(system, 'break-the-pack')?.status).toBe('completed');

    system.recordReach('poi-watchpost');

    for (let index = 0; index < 3; index += 1) {
      system.recordDestroy('nest-bloom-watchpost');
    }

    system.recordSecure('territory-watchpost');
    system.recordInteract('relay-watchpost');

    const mission = findMission(system);
    expect(mission?.status).toBe('completed');
    expect(system.snapshot().active).toBeNull();
    expect(system.snapshot().completedCount).toBe(1);

    const events = system.drainEvents();
    expect(
      events.filter((event) => event.type === 'mission-completed'),
    ).toHaveLength(1);

    system.recordCreatureKill('crawler', 0, 0);
    system.recordReach('poi-watchpost');
    system.recordDestroy('nest-bloom-watchpost');
    system.recordSecure('territory-watchpost');
    system.recordInteract('relay-watchpost');

    expect(findMission(system)?.status).toBe('completed');
    expect(system.drainEvents()).toHaveLength(0);
  });

  it('tracks optional collection and clear-area objectives', () => {
    const system = createSystem();

    system.recordCollect('health', 2);
    expect(findObjective(system, 'recover-supplies')).toMatchObject({
      status: 'active',
      progress: 2,
      count: 3,
      optional: true,
    });

    system.recordCollect('armor', 4);
    expect(findObjective(system, 'recover-supplies')?.status).toBe('completed');

    system.recordCreatureKill('stalker', 100, 100);
    system.recordCreatureKill('spitter', 100, 100);

    expect(findObjective(system, 'clear-watchpost')?.status).toBe('completed');

    const optionalEvent = system
      .drainEvents()
      .find(
        (event) =>
          event.type === 'objective-completed' &&
          event.objectiveId === 'recover-supplies',
      );

    expect(optionalEvent).toMatchObject({ optional: true });
  });

  it('fails an active mission once and stops objective progress', () => {
    const system = createSystem();

    expect(system.failMission(RECLAIM_GREENREACH_ID, 'Uplink lost')).toBe(
      true,
    );
    expect(
      system.failMission(RECLAIM_GREENREACH_ID, 'Duplicate failure'),
    ).toBe(false);

    const mission = findMission(system);
    expect(mission?.status).toBe('failed');
    expect(mission?.failureReason).toBe('Uplink lost');

    system.recordCreatureKill('crawler', 100, 100);
    expect(findObjective(system, 'break-the-pack')?.progress).toBe(0);

    expect(
      system.drainEvents().filter((event) => event.type === 'mission-failed'),
    ).toHaveLength(1);
  });

  it('resets to a fresh active run', () => {
    const system = createSystem();

    system.failMission(RECLAIM_GREENREACH_ID, 'Retry');
    system.reset();

    expect(findMission(system)?.status).toBe('active');
    expect(system.snapshot().completedCount).toBe(0);
    expect(findObjective(system, 'break-the-pack')?.progress).toBe(0);
  });

  it('unlocks later missions only after prerequisites complete', () => {
    const first = missionDefinition({ id: 'first' });
    const second = missionDefinition({
      id: 'second',
      prerequisites: ['first'],
    });
    const system = createSystem([first, second]);

    expect(findMission(system, 'first')?.status).toBe('active');
    expect(findMission(system, 'second')?.status).toBe('locked');

    system.recordCreatureKill('crawler', 0, 0);

    expect(findMission(system, 'second')?.status).toBe('available');
    expect(system.activate('second')).toBe(true);
    expect(findMission(system, 'second')?.status).toBe('active');
  });
});

describe('validateMissionDefinitions', () => {
  it('rejects completion references to unknown objectives', () => {
    const mission = missionDefinition({
      completion: { objectiveIds: ['missing'] },
    });

    expect(() => validateMissionDefinitions([mission])).toThrow(
      /unknown objective/i,
    );
  });

  it('rejects duplicate objective ids', () => {
    const mission = missionDefinition({
      objectives: [
        { id: 'repeat', type: 'kill', title: 'First' },
        { id: 'repeat', type: 'kill', title: 'Second' },
      ],
      completion: { objectiveIds: ['repeat'] },
    });

    expect(() => validateMissionDefinitions([mission])).toThrow(
      /duplicate objective/i,
    );
  });

  it('rejects mission prerequisite cycles', () => {
    const first = missionDefinition({
      id: 'first',
      prerequisites: ['second'],
    });
    const second = missionDefinition({
      id: 'second',
      prerequisites: ['first'],
    });

    expect(() => validateMissionDefinitions([first, second])).toThrow(
      /cycle/i,
    );
  });
});
