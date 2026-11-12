import { describe, expect, it } from 'vitest';
import {
  SnapshotStore,
  createInitialSnapshot,
  selectCameraReadout,
  selectDodgeLabel,
  selectDodgeReady,
  selectIsPaused,
  selectIsPlaying,
  selectPhaseLabel,
  selectPlayerReadout,
  selectStaminaPercent,
} from './UiSnapshot';

describe('SnapshotStore', () => {
  it('publishes the first update immediately', () => {
    const store = new SnapshotStore(createInitialSnapshot(), 100);
    let notifications = 0;
    store.subscribe(() => {
      notifications += 1;
    });

    store.update({ frame: 1 }, 0);

    expect(notifications).toBe(1);
    expect(store.getSnapshot().frame).toBe(1);
  });

  it('throttles updates and coalesces pending changes', () => {
    const store = new SnapshotStore(createInitialSnapshot(), 100);
    let notifications = 0;
    store.subscribe(() => {
      notifications += 1;
    });

    store.update({ frame: 1 }, 0);
    store.update({ frame: 2 }, 40);
    store.update({ frame: 3 }, 70);

    expect(notifications).toBe(1);
    expect(store.getSnapshot().frame).toBe(1);

    store.update({ elapsed: 0.5 }, 100);

    expect(notifications).toBe(2);
    expect(store.getSnapshot().frame).toBe(3);
    expect(store.getSnapshot().elapsed).toBe(0.5);
  });

  it('flushes pending changes once the interval has elapsed', () => {
    const store = new SnapshotStore(createInitialSnapshot(), 100);
    let notifications = 0;
    store.subscribe(() => {
      notifications += 1;
    });

    store.update({ frame: 1 }, 0);
    store.update({ frame: 2 }, 30);
    store.flush(99);

    expect(notifications).toBe(1);

    store.flush(100);

    expect(notifications).toBe(2);
    expect(store.getSnapshot().frame).toBe(2);
  });

  it('can force an immediate update', () => {
    const store = new SnapshotStore(createInitialSnapshot(), 1000);
    let notifications = 0;
    store.subscribe(() => {
      notifications += 1;
    });

    store.update({ phase: 'paused' }, 0, true);
    store.update({ debug: true }, 10, true);

    expect(notifications).toBe(2);
    expect(store.getSnapshot().debug).toBe(true);
  });

  it('notifies subscribers until they unsubscribe', () => {
    const store = new SnapshotStore(createInitialSnapshot(), 0);
    let notifications = 0;
    const unsubscribe = store.subscribe(() => {
      notifications += 1;
    });

    store.update({ frame: 1 }, 0);
    unsubscribe();
    store.update({ frame: 2 }, 1);

    expect(notifications).toBe(1);
  });
});

describe('UI selectors', () => {
  it('derives phase and camera labels from a snapshot', () => {
    const snapshot = {
      ...createInitialSnapshot(),
      phase: 'paused' as const,
      camera: {
        x: 812.4,
        y: 433.6,
        viewportWidth: 960,
        viewportHeight: 540,
      },
    };

    expect(selectIsPaused(snapshot)).toBe(true);
    expect(selectIsPlaying(snapshot)).toBe(false);
    expect(selectCameraReadout(snapshot)).toBe('812 / 434');
    expect(selectPhaseLabel(snapshot)).toBe('Expedition paused');
  });

  it('derives player, stamina, and dodge labels', () => {
    const snapshot = {
      ...createInitialSnapshot(),
      phase: 'playing' as const,
      player: {
        ...createInitialSnapshot().player,
        x: 512.4,
        y: 639.6,
        stamina: 42,
        maxStamina: 100,
        dodgeCooldown: 0.44,
        dodgeCooldownMax: 0.8,
      },
    };

    expect(selectIsPlaying(snapshot)).toBe(true);
    expect(selectPhaseLabel(snapshot)).toBe('Test arena online');
    expect(selectPlayerReadout(snapshot)).toBe('512 / 640');
    expect(selectStaminaPercent(snapshot)).toBe(42);
    expect(selectDodgeReady(snapshot)).toBe(false);
    expect(selectDodgeLabel(snapshot)).toBe('0.4s');

    const readySnapshot = {
      ...snapshot,
      player: { ...snapshot.player, dodgeCooldown: 0 },
    };

    expect(selectDodgeReady(readySnapshot)).toBe(true);
    expect(selectDodgeLabel(readySnapshot)).toBe('Ready');
  });
});
