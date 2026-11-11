import { useEffect, useRef, useState } from 'react';
import { Hud } from './components/Hud';
import { LeaderboardOverlay } from './components/LeaderboardOverlay';
import { Overlays } from './components/Overlays';
import { GameEngine } from './game/engine';
import type { HudSnapshot } from './game/types';

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [engine, setEngine] = useState<GameEngine | null>(null);
  const [hud, setHud] = useState<HudSnapshot | null>(null);
  const [recordsOpen, setRecordsOpen] = useState(false);
  const phaseRef = useRef<HudSnapshot['phase']>('menu');

  useEffect(() => {
    if (!canvasRef.current) return undefined;
    const game = new GameEngine(canvasRef.current, setHud);
    setEngine(game);
    return () => {
      game.destroy();
      setEngine(null);
    };
  }, []);

  const phase = hud?.phase;
  useEffect(() => {
    if (hud) phaseRef.current = hud.phase;
    if (phase !== 'menu') setRecordsOpen(false);
  }, [hud, phase]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      if (event.key.toLowerCase() !== 'l') return;
      if (phaseRef.current !== 'menu') return;
      event.preventDefault();
      setRecordsOpen((open) => !open);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div
      className="game-shell"
      data-motion={hud?.reducedMotion ? 'reduced' : 'full'}
    >
      <div className="game-frame">
        <canvas ref={canvasRef} className="game-canvas" aria-label="Ant Defense game arena" />
        {engine && hud && (
          <>
            <Hud hud={hud} engine={engine} />
            <Overlays
              hud={hud}
              engine={engine}
              onOpenRecords={() => setRecordsOpen(true)}
            />
            {recordsOpen && hud.phase === 'menu' && (
              <LeaderboardOverlay
                hud={hud}
                onClose={() => setRecordsOpen(false)}
              />
            )}
          </>
        )}
        <div className="frame-edge" aria-hidden="true" />
      </div>
    </div>
  );
}
