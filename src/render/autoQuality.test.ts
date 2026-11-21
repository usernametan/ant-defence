import { describe, expect, it } from 'vitest';
import { AutoQualityController, dprCapForQuality } from './autoQuality';

describe('AutoQualityController', () => {
  it('steps down from high -> med -> low under sustained >20ms frames and recovers slowly under <12ms', () => {
    const aq = new AutoQualityController();
    expect(aq.getActiveQuality()).toBe('high');
    expect(dprCapForQuality('high')).toBe(2);
    expect(dprCapForQuality('med')).toBe(1.5);
    expect(dprCapForQuality('low')).toBe(1);

    // Warmup (20 frames) + 2.0s of 32ms frames (~90 total frames) drops high -> med
    let stepped = false;
    for (let i = 0; i < 90; i += 1) {
      if (aq.recordFrame(32, 0.032)) stepped = true;
    }
    expect(stepped).toBe(true);
    expect(aq.getActiveQuality()).toBe('med');

    // Immediately after downshift, 10s cooldown prevents flickering even under slow frames
    let droppedDuringCooldown = false;
    for (let i = 0; i < 200; i += 1) {
      if (aq.recordFrame(32, 0.032)) droppedDuringCooldown = true;
    }
    expect(droppedDuringCooldown).toBe(false);
    expect(aq.getActiveQuality()).toBe('med');

    // Push past cooldown (~3.6s already elapsed -> +7s) then 2.2s more slow frames -> low
    for (let i = 0; i < 300; i += 1) {
      aq.recordFrame(32, 0.032);
    }
    expect(aq.getActiveQuality()).toBe('low');

    // Recover after cooldown (10s) + 10s under 12ms frames -> med
    for (let i = 0; i < 2600; i += 1) {
      aq.recordFrame(8, 0.01);
    }
    expect(aq.getActiveQuality()).toBe('med');
  });

  it('respects explicit manual quality overrides without auto-adjusting', () => {
    const aq = new AutoQualityController();
    aq.setSetting('med');
    expect(aq.getActiveQuality()).toBe('med');
    for (let i = 0; i < 200; i += 1) {
      expect(aq.recordFrame(45, 0.045)).toBe(false);
    }
    expect(aq.getActiveQuality()).toBe('med');
  });
});
