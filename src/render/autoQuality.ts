export type RenderQuality = 'low' | 'med' | 'high';
export type RenderQualitySetting = RenderQuality | 'auto';

const WINDOW_SIZE = 60;
const DOWN_THRESHOLD_MS = 20;
const DOWN_HOLD_SECONDS = 2.0;
const UP_THRESHOLD_MS = 12;
const UP_HOLD_SECONDS = 10.0;
const COOLDOWN_SECONDS = 10.0;

/**
 * Automatic quality controller with rolling 60-frame average, hysteresis
 * thresholds (`>20ms` for 2s down, `<12ms` for 10s up), and a 10s cooldown.
 */
export class AutoQualityController {
  private setting: RenderQualitySetting = 'auto';
  private activeQuality: RenderQuality = 'high';
  private windowMs: number[] = [];
  private windowSum = 0;
  private slowHold = 0;
  private fastHold = 0;
  private cooldown = 0;

  setSetting(setting: RenderQualitySetting): RenderQuality {
    this.setting = setting;
    if (setting !== 'auto') {
      this.activeQuality = setting;
      this.slowHold = 0;
      this.fastHold = 0;
    }
    return this.activeQuality;
  }

  getSetting(): RenderQualitySetting {
    return this.setting;
  }

  getActiveQuality(): RenderQuality {
    return this.activeQuality;
  }

  reset(): void {
    this.windowMs.length = 0;
    this.windowSum = 0;
    this.slowHold = 0;
    this.fastHold = 0;
    this.cooldown = 0;
    if (this.setting !== 'auto') {
      this.activeQuality = this.setting;
    } else {
      this.activeQuality = 'high';
    }
  }

  /** Record one rendered frame delta (`frameMs`) and step quality if `'auto'`. Returns true when quality changed. */
  recordFrame(frameMs: number, dtSeconds: number): boolean {
    if (this.setting !== 'auto') return false;

    const clampedFrame = Math.min(250, Math.max(0.5, frameMs));
    this.windowMs.push(clampedFrame);
    this.windowSum += clampedFrame;
    if (this.windowMs.length > WINDOW_SIZE) {
      this.windowSum -= this.windowMs.shift()!;
    }

    if (this.cooldown > 0) {
      this.cooldown = Math.max(0, this.cooldown - dtSeconds);
      return false;
    }

    if (this.windowMs.length < 20) return false;
    const avgMs = this.windowSum / this.windowMs.length;

    if (avgMs > DOWN_THRESHOLD_MS) {
      this.slowHold += dtSeconds;
      this.fastHold = 0;
      if (this.slowHold >= DOWN_HOLD_SECONDS) {
        this.slowHold = 0;
        if (this.activeQuality === 'high') {
          this.activeQuality = 'med';
          this.cooldown = COOLDOWN_SECONDS;
          return true;
        }
        if (this.activeQuality === 'med') {
          this.activeQuality = 'low';
          this.cooldown = COOLDOWN_SECONDS;
          return true;
        }
      }
    } else if (avgMs < UP_THRESHOLD_MS) {
      this.fastHold += dtSeconds;
      this.slowHold = 0;
      if (this.fastHold >= UP_HOLD_SECONDS) {
        this.fastHold = 0;
        if (this.activeQuality === 'low') {
          this.activeQuality = 'med';
          this.cooldown = COOLDOWN_SECONDS;
          return true;
        }
        if (this.activeQuality === 'med') {
          this.activeQuality = 'high';
          this.cooldown = COOLDOWN_SECONDS;
          return true;
        }
      }
    } else {
      this.slowHold = Math.max(0, this.slowHold - dtSeconds * 0.5);
      this.fastHold = Math.max(0, this.fastHold - dtSeconds * 0.5);
    }

    return false;
  }
}

export function dprCapForQuality(quality: RenderQuality): number {
  if (quality === 'high') return 2;
  if (quality === 'med') return 1.5;
  return 1;
}
