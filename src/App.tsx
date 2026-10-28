import { useEffect, useRef, useState } from 'react';
import { Hud } from './components/Hud';
import { Overlays } from './components/Overlays';
import { GameEngine } from './game/engine';
import type { HudSnapshot } from './game/types';

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [engine, setEngine] = useState<GameEngine | null>(null);
  const [hud, setHud] = useState<HudSnapshot | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return undefined;
    const game = new GameEngine(canvasRef.current, setHud);
    setEngine(game);
    return () => {
      game.destroy();
      setEngine(null);
    };
  }, []);

  return (
    <div className="game-shell">
      <div className="game-frame">
        <canvas ref={canvasRef} className="game-canvas" aria-label="Ant Defense game arena" />
        {engine && hud && (
          <>
            <Hud hud={hud} engine={engine} />
            <Overlays hud={hud} engine={engine} />
          </>
        )}
        <div className="frame-edge" aria-hidden="true" />
      </div>
    </div>
  );
}
