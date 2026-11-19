import { describe, expect, it } from 'vitest';
import { AudioEngine, computeBossProximity, computeStereoPan } from './AudioEngine';

describe('AudioEngine', () => {
  it('computes bounded stereo pan from world coordinates', () => {
    expect(computeStereoPan(500, 500)).toBe(0);
    expect(computeStereoPan(0, 1000)).toBe(-1);
    expect(computeStereoPan(2000, 500)).toBe(1);
    expect(computeStereoPan(780, 500, 560)).toBeCloseTo(0.5, 4);
  });

  it('fades monster proximity audio up when moving closer and down to 0 when far', () => {
    const close = computeBossProximity({ x: 560, y: 500 }, { x: 500, y: 500 });
    const mid = computeBossProximity({ x: 850, y: 500 }, { x: 500, y: 500 });
    const far = computeBossProximity({ x: 2000, y: 500 }, { x: 500, y: 500 });
    expect(close).toBeGreaterThan(mid);
    expect(mid).toBeGreaterThan(far);
    expect(far).toBe(0);
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
    engine.playHellcellWarning();
    engine.playBossRoar(0);
    engine.playMonsterVocal('rocketSiegeBot', 0.9, 0.2);
    engine.playMonsterVocal('pharaohSkeleton', 0.7, -0.3);
    engine.playMonsterVocal('venomCobra', 0.8, 0.1);
    engine.playBossDefeated();
    engine.playDash();
    engine.update(0.016, 0.2, true, {
      status: 'playing',
      mode: 'zoneControl',
      score: { player: 20, enemy: 45 },
      scoreToWin: 100,
      boss: { kind: 'venomCobra', pos: { x: 600, y: 600 }, hp: 5000, maxHp: 5400 },
    });
    engine.destroy();
    expect(engine.computePan({ x: 960, y: 640 })).toBe(0);
  });
});
