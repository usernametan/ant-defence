import { afterEach, describe, expect, it } from 'vitest';
import { bus } from '../shared/events';
import { PerfMonitor, isPerfOverlayEnabled } from './perf';

afterEach(() => {
  bus.clear();
});

describe('PerfMonitor & ?perf=1 toggle', () => {
  it('enables overlay only when ?perf=1 is present in query string', () => {
    expect(isPerfOverlayEnabled('')).toBe(false);
    expect(isPerfOverlayEnabled('?perf=0')).toBe(false);
    expect(isPerfOverlayEnabled('?foo=bar&perf=1')).toBe(true);
  });

  it('tracks rolling 2s worst frame, >20ms frames, draw time, sim steps, and A* bursts when enabled', () => {
    const mon = new PerfMonitor();
    mon.setForceEnabled(true);
    mon.reset();

    mon.recordFrame(10, 2.5, 1, 100);
    mon.recordFrame(28, 12.0, 2, 1000);
    mon.recordFrame(12, 3.0, 1, 1500);
    mon.recordSubsystem('ensureCache', 45.2, 'slumside');
    mon.recordSubsystem('visibility', 2.1);
    mon.recordSubsystem('bloom', 6.4);
    mon.recordAstarBurst(14);

    let snap = mon.getSnapshot();
    expect(snap.enabled).toBe(true);
    expect(snap.worstFrameMs2s).toBeCloseTo(28, 2);
    expect(snap.framesOver20Ms2s).toBe(1);
    expect(snap.framesOver20MsTotal).toBe(1);
    expect(snap.avgDrawMs).toBeCloseTo((2.5 + 12.0 + 3.0) / 3, 2);
    expect(snap.simStepsPerFrame).toBeCloseTo(4 / 3, 2);
    expect(snap.lastCacheRebuildMs).toBeCloseTo(45.2, 2);
    expect(snap.cacheRebuildCount).toBe(1);
    expect(snap.lastVisibilityMs).toBeCloseTo(2.1, 2);
    expect(snap.lastBloomMs).toBeCloseTo(6.4, 2);
    expect(snap.maxAstarCallsPerTick).toBe(14);

    // Advance past the 2-second window for the 28ms frame
    mon.recordFrame(11, 2.0, 1, 3100);
    snap = mon.getSnapshot();
    expect(snap.worstFrameMs2s).toBeCloseTo(12, 2);
    expect(snap.worstFrameMsTotal).toBeCloseTo(28, 2);
    expect(snap.framesOver20Ms2s).toBe(0);
    expect(snap.framesOver20MsTotal).toBe(1);
  });
});
