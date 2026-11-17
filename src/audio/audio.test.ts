import { describe, expect, it } from 'vitest';
import { AudioEngine, computeStereoPan } from './AudioEngine';

describe('AudioEngine', () => {
  it('computes bounded stereo pan from world coordinates', () => {
    expect(computeStereoPan(500, 500)).toBe(0);
    expect(computeStereoPan(0, 1000)).toBe(-1);
    expect(computeStereoPan(2000, 500)).toBe(1);
    expect(computeStereoPan(780, 500, 560)).toBeCloseTo(0.5, 4);
  });

  it('safely handles initialization and playback in headless environments without AudioContext', () => {
    const engine = new AudioEngine();
    engine.init('player');
    engine.setVolumes({ master: 0.5, sfx: 0.7, music: 0.3 });
    engine.playUiHover();
    engine.playUiClick();
    engine.playWeaponShot('rifle', 0.25);
    engine.playDryFire();
    engine.playCountdownTick(true);
    engine.playStreakStinger(3);
    engine.update(0.016, 0.2, true);
    engine.destroy();
    expect(engine.computePan({ x: 960, y: 640 })).toBe(0);
  });
});
