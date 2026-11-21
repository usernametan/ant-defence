import React, { useEffect, useState } from 'react';
import { isPerfOverlayEnabled, perfMonitor, type PerfSnapshot } from '../../render/perf';

/** Dev performance overlay rendered only when `?perf=1` is present in the URL. */
export const PerfOverlay: React.FC = () => {
  const [snap, setSnap] = useState<PerfSnapshot | null>(() =>
    isPerfOverlayEnabled() ? perfMonitor.getSnapshot() : null,
  );

  useEffect(() => {
    if (!isPerfOverlayEnabled()) return;
    perfMonitor.ensureBusSubscribed();
    const id = window.setInterval(() => {
      setSnap(perfMonitor.getSnapshot());
    }, 200);
    return () => window.clearInterval(id);
  }, []);

  if (!snap) return null;

  return (
    <div
      data-testid="perf-overlay"
      style={{
        position: 'fixed',
        top: 8,
        right: 8,
        zIndex: 9999,
        padding: '8px 10px',
        background: 'rgba(7, 11, 20, 0.88)',
        border: '1px solid rgba(56, 189, 248, 0.45)',
        borderRadius: 6,
        color: '#E2E8F0',
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
        fontSize: 11,
        lineHeight: 1.45,
        pointerEvents: 'none',
        minWidth: 210,
      }}
    >
      <div style={{ color: '#38BDF8', fontWeight: 700, marginBottom: 3 }}>
        PERF (?perf=1) · {snap.fps.toFixed(1)} FPS · {snap.quality.toUpperCase()}
      </div>
      <div>Avg frame: {snap.avgFrameMs.toFixed(2)} ms</div>
      <div>Worst (2s): {snap.worstFrameMs2s.toFixed(2)} ms (max {snap.worstFrameMsTotal.toFixed(1)})</div>
      <div>&gt;20ms frames: {snap.framesOver20Ms2s} (2s) / {snap.framesOver20MsTotal}</div>
      <div>Sim steps/frame: {snap.simStepsPerFrame.toFixed(2)}</div>
      <div>renderer.draw: {snap.avgDrawMs.toFixed(2)} ms (last {snap.lastDrawMs.toFixed(2)})</div>
      <div>ensureCache: {snap.lastCacheRebuildMs.toFixed(2)} ms ({snap.cacheRebuildCount}x)</div>
      <div>visibility / bloom: {snap.lastVisibilityMs.toFixed(2)} / {snap.lastBloomMs.toFixed(2)} ms</div>
      <div>A* / tick: {snap.lastAstarCalls} (max {snap.maxAstarCallsPerTick})</div>
    </div>
  );
};
