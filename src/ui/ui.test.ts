import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, loadSettings } from './settingsStore';
import { StubSim } from './stubSim';

describe('UI StubSim and settings', () => {
  it('StubSim implements SimApi lifecycle and advances deterministic state', () => {
    const sim = new StubSim();
    const initial = sim.getState();
    expect(initial.status).toBe('playing');
    expect(initial.units.length).toBeGreaterThanOrEqual(4);
    expect(initial.map.zones).toHaveLength(3);

    sim.step(1 / 60);
    const stepped = sim.getState();
    expect(stepped.tick).toBe(1);
    expect(stepped.time).toBeGreaterThan(0);

    sim.pause();
    expect(sim.getState().status).toBe('paused');
    sim.resume();
    expect(sim.getState().status).toBe('playing');
  });

  it('loadSettings falls back cleanly to DEFAULT_SETTINGS in Node', () => {
    const loaded = loadSettings();
    expect(loaded).toEqual(DEFAULT_SETTINGS);
  });
});
