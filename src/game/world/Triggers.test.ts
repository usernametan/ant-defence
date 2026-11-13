import { describe, expect, it } from 'vitest';
import type {
  LoadedInteractableDef,
  MapPointOfInterestDef,
} from './MapDef';
import { TriggerSystem } from './Triggers';

const POINTS: readonly MapPointOfInterestDef[] = [
  {
    id: 'poi-watchpost',
    name: 'Moss-Eaten Watchpost',
    kind: 'ruin',
    x: 120,
    y: 90,
    radius: 40,
  },
];

const INTERACTABLES: readonly LoadedInteractableDef[] = [
  {
    id: 'relay-watchpost',
    name: 'Watchpost Relay',
    kind: 'relay',
    x: 120,
    y: 90,
    radius: 18,
    prompt: 'Restore the watchpost relay',
  },
];

describe('TriggerSystem', () => {
  it('reports each point of interest entry once per run', () => {
    const triggers = new TriggerSystem(POINTS, INTERACTABLES);
    const target = { x: 120, y: 90, radius: 10 };

    expect(triggers.update(target).enteredPoints.map((point) => point.id)).toEqual(
      ['poi-watchpost'],
    );
    expect(triggers.update(target).enteredPoints).toHaveLength(0);

    triggers.reset();

    expect(triggers.update(target).enteredPoints.map((point) => point.id)).toEqual(
      ['poi-watchpost'],
    );
  });

  it('finds and activates a nearby interactable once', () => {
    const triggers = new TriggerSystem(POINTS, INTERACTABLES);
    const target = { x: 120, y: 100, radius: 10 };
    const update = triggers.update(target);

    expect(update.nearbyInteractable?.id).toBe('relay-watchpost');
    expect(triggers.activateNearby(target)?.id).toBe('relay-watchpost');
    expect(triggers.interactables[0].activated).toBe(true);
    expect(triggers.nearbyInteractable).toBeNull();
    expect(triggers.activateNearby(target)).toBeNull();
    expect(triggers.update(target).nearbyInteractable).toBeNull();
  });

  it('does not report interactables outside their interaction radius', () => {
    const triggers = new TriggerSystem(POINTS, INTERACTABLES);

    expect(
      triggers.update({ x: 200, y: 90, radius: 10 }).nearbyInteractable,
    ).toBeNull();
    expect(
      triggers.activateNearby({ x: 200, y: 90, radius: 10 }),
    ).toBeNull();
  });
});
