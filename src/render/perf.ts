import { bus } from '../shared/events';
import type { RenderQuality } from './autoQuality';

export type PerfSubsystem = 'ensureCache' | 'visibility' | 'bloom';

export interface PerfSnapshot {
  enabled: boolean;
  quality: RenderQuality;
  avgFrameMs: number;
  fps: number;
  worstFrameMs2s: number;
  framesOver20Ms2s: number;
  framesOver20MsTotal: number;
  simStepsPerFrame: number;
  avgDrawMs: number;
  lastDrawMs: number;
  lastCacheRebuildMs: number;
  cacheRebuildCount: number;
  lastVisibilityMs: number;
  lastBloomMs: number;
  lastAstarCalls: number;
  maxAstarCallsPerTick: number;
  totalAstarCalls: number;
  p99FrameMs: number;
  worstFrameMsTotal: number;
}

interface FrameSample {
  atMs: number;
  frameMs: number;
  drawMs: number;
  simSteps: number;
}

const WINDOW_2S_MS = 2000;
const MAX_ALL_FRAMES = 3600;

/** Returns true when `?perf=1` is present in the URL query string. */
export function isPerfOverlayEnabled(search?: string): boolean {
  if (search !== undefined) {
    return new URLSearchParams(search).get('perf') === '1';
  }
  if (typeof window === 'undefined' || !window.location) return false;
  return new URLSearchParams(window.location.search).get('perf') === '1';
}

export class PerfMonitor {
  private forceEnabled: boolean | null = null;
  private quality: RenderQuality = 'high';
  private recentSamples: FrameSample[] = [];
  private allFrameMs: number[] = [];
  private framesOver20MsTotal = 0;
  private worstFrameMsTotal = 0;

  private lastDrawMs = 0;
  private lastCacheRebuildMs = 0;
  private cacheRebuildCount = 0;
  private lastVisibilityMs = 0;
  private lastBloomMs = 0;

  private lastAstarCalls = 0;
  private maxAstarCallsPerTick = 0;
  private totalAstarCalls = 0;

  private busUnsub: (() => void) | null = null;

  get enabled(): boolean {
    if (this.forceEnabled !== null) return this.forceEnabled;
    return isPerfOverlayEnabled();
  }

  setForceEnabled(value: boolean | null): void {
    this.forceEnabled = value;
    if (value) this.ensureBusSubscribed();
  }

  setEffectiveQuality(quality: RenderQuality): void {
    this.quality = quality;
  }

  ensureBusSubscribed(): void {
    if (this.busUnsub || !this.enabled) return;
    this.busUnsub = bus.on('sim:tickPerf', ({ astarCalls }) => {
      this.recordAstarBurst(astarCalls);
    });
  }

  reset(): void {
    this.recentSamples.length = 0;
    this.allFrameMs.length = 0;
    this.framesOver20MsTotal = 0;
    this.worstFrameMsTotal = 0;
    this.lastDrawMs = 0;
    this.lastCacheRebuildMs = 0;
    this.cacheRebuildCount = 0;
    this.lastVisibilityMs = 0;
    this.lastBloomMs = 0;
    this.lastAstarCalls = 0;
    this.maxAstarCallsPerTick = 0;
    this.totalAstarCalls = 0;
  }

  recordFrame(frameMs: number, drawMs: number, simSteps: number, nowMs = performance.now()): void {
    if (!this.enabled) return;
    this.ensureBusSubscribed();

    const safeFrame = Math.max(0, frameMs);
    const safeDraw = Math.max(0, drawMs);

    this.recentSamples.push({
      atMs: nowMs,
      frameMs: safeFrame,
      drawMs: safeDraw,
      simSteps,
    });
    const cutoff = nowMs - WINDOW_2S_MS;
    while (this.recentSamples.length > 0 && this.recentSamples[0].atMs < cutoff) {
      this.recentSamples.shift();
    }

    if (this.allFrameMs.length >= MAX_ALL_FRAMES) {
      this.allFrameMs.shift();
    }
    this.allFrameMs.push(safeFrame);

    if (safeFrame > 20) this.framesOver20MsTotal += 1;
    if (safeFrame > this.worstFrameMsTotal) this.worstFrameMsTotal = safeFrame;
    this.lastDrawMs = safeDraw;

    if (typeof window !== 'undefined') {
      (window as unknown as { __ZONE_PERF__?: PerfSnapshot }).__ZONE_PERF__ =
        this.getSnapshot();
    }
  }

  recordSubsystem(subsystem: PerfSubsystem, durationMs: number, _detail?: string): void {
    if (!this.enabled) return;
    if (subsystem === 'ensureCache') {
      this.lastCacheRebuildMs = durationMs;
      this.cacheRebuildCount += 1;
    } else if (subsystem === 'visibility') {
      this.lastVisibilityMs = durationMs;
    } else if (subsystem === 'bloom') {
      this.lastBloomMs = durationMs;
    }
  }

  recordAstarBurst(calls: number): void {
    if (!this.enabled || calls <= 0) return;
    this.lastAstarCalls = calls;
    this.totalAstarCalls += calls;
    if (calls > this.maxAstarCallsPerTick) {
      this.maxAstarCallsPerTick = calls;
    }
  }

  getSnapshot(): PerfSnapshot {
    const count = this.recentSamples.length;
    let sumFrame = 0;
    let sumDraw = 0;
    let sumSteps = 0;
    let worst2s = 0;
    let over20_2s = 0;

    for (let i = 0; i < count; i += 1) {
      const s = this.recentSamples[i];
      sumFrame += s.frameMs;
      sumDraw += s.drawMs;
      sumSteps += s.simSteps;
      if (s.frameMs > worst2s) worst2s = s.frameMs;
      if (s.frameMs > 20) over20_2s += 1;
    }

    const avgFrameMs = count > 0 ? sumFrame / count : 0;
    const avgDrawMs = count > 0 ? sumDraw / count : 0;
    const simStepsPerFrame = count > 0 ? sumSteps / count : 0;
    const fps = avgFrameMs > 0.01 ? 1000 / avgFrameMs : 0;

    let p99FrameMs = 0;
    if (this.allFrameMs.length > 0) {
      const sorted = [...this.allFrameMs].sort((a, b) => a - b);
      const idx = Math.min(sorted.length - 1, Math.floor(sorted.length * 0.99));
      p99FrameMs = sorted[idx];
    }

    return {
      enabled: this.enabled,
      quality: this.quality,
      avgFrameMs,
      fps,
      worstFrameMs2s: worst2s,
      framesOver20Ms2s: over20_2s,
      framesOver20MsTotal: this.framesOver20MsTotal,
      simStepsPerFrame,
      avgDrawMs,
      lastDrawMs: this.lastDrawMs,
      lastCacheRebuildMs: this.lastCacheRebuildMs,
      cacheRebuildCount: this.cacheRebuildCount,
      lastVisibilityMs: this.lastVisibilityMs,
      lastBloomMs: this.lastBloomMs,
      lastAstarCalls: this.lastAstarCalls,
      maxAstarCallsPerTick: this.maxAstarCallsPerTick,
      totalAstarCalls: this.totalAstarCalls,
      p99FrameMs,
      worstFrameMsTotal: this.worstFrameMsTotal,
    };
  }
}

export const perfMonitor = new PerfMonitor();
