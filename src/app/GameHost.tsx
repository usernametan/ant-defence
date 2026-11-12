import { useEffect, useRef, useState } from 'react';
import { FOUNDATION_CHECKS, GAME_IDENTITY } from '../game/content';
import { Game } from '../game/Game';
import {
  selectCameraReadout,
  selectPhaseLabel,
  type UiSnapshot,
} from '../game/ui/UiSnapshot';
import { useGameSnapshot } from './useGameSnapshot';

export function GameHost() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [game, setGame] = useState<Game | null>(null);
  const snapshot = useGameSnapshot(game?.snapshots ?? null);

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas) {
      return undefined;
    }

    const instance = new Game(canvas);
    setGame(instance);
    instance.start();

    return () => {
      instance.destroy();
      setGame(null);
    };
  }, []);

  return (
    <div className="game-shell" data-game="monster-frontier">
      <div className="game-frame">
        <canvas
          ref={canvasRef}
          className="game-canvas"
          aria-label="Monster Frontier foundation preview"
        />
        {snapshot.phase === 'menu' && (
          <MenuScreen snapshot={snapshot} game={game} />
        )}
        {snapshot.phase !== 'menu' && <Hud snapshot={snapshot} />}
        {snapshot.phase === 'paused' && (
          <PauseScreen snapshot={snapshot} game={game} />
        )}
        <div className="frame-edge" aria-hidden="true" />
      </div>
    </div>
  );
}

interface ScreenProps {
  snapshot: UiSnapshot;
  game: Game | null;
}

function MenuScreen({ snapshot, game }: ScreenProps) {
  return (
    <section className="mf-screen mf-menu" aria-labelledby="mf-menu-title">
      <div className="mf-menu-panel">
        <header className="mf-menu-header">
          <p className="mf-kicker">
            {snapshot.kicker}
            <span className="mf-kicker-divider" />
            {snapshot.stage}
          </p>
          <h1 className="mf-wordmark" id="mf-menu-title">
            {snapshot.title}
          </h1>
          <p className="mf-tagline">{GAME_IDENTITY.tagline}</p>
        </header>

        <div className="mf-actions">
          <button
            type="button"
            className="mf-button mf-button-primary"
            onClick={() => game?.enterPreview()}
            disabled={!game}
          >
            Enter Foundation Preview
            <kbd>Enter</kbd>
          </button>
          <p className="mf-action-note">
            Stage 1 establishes the simulation shell. Field agents, creatures,
            combat, and missions arrive in later stages.
          </p>
        </div>

        <ul className="mf-checks" aria-label="Foundation systems">
          {FOUNDATION_CHECKS.map((check) => (
            <li key={check.label} className="mf-check">
              <span className="mf-check-signal" aria-hidden="true" />
              <span>
                <strong>{check.label}</strong>
                <small>{check.detail}</small>
              </span>
            </li>
          ))}
        </ul>
      </div>

      <aside className="mf-briefing" aria-label="Foundation briefing">
        <p className="mf-briefing-label">First deployment</p>
        <p className="mf-briefing-region">{snapshot.region}</p>
        <p className="mf-briefing-copy">
          The old line held long enough to open the frontier. Beyond it, the
          Bloom is changing everything it touches.
        </p>
        <dl className="mf-specs">
          <div>
            <dt>Build</dt>
            <dd>{snapshot.version}</dd>
          </div>
          <div>
            <dt>Step</dt>
            <dd>60 Hz</dd>
          </div>
          <div>
            <dt>World</dt>
            <dd>
              {snapshot.world.width} × {snapshot.world.height}
            </dd>
          </div>
          <div>
            <dt>Bridge</dt>
            <dd>Snapshot</dd>
          </div>
        </dl>
        <p className="mf-briefing-footnote">
          F3 exposes camera and world diagnostics during preview.
        </p>
      </aside>
    </section>
  );
}

function Hud({ snapshot }: { snapshot: UiSnapshot }) {
  return (
    <div className="mf-hud" aria-live="polite">
      <div className="mf-hud-top">
        <div className="mf-locator">
          <span className="mf-locator-dot" aria-hidden="true" />
          <span>
            <small>{snapshot.region}</small>
            <strong>{selectPhaseLabel(snapshot)}</strong>
          </span>
        </div>
        <div className="mf-readout">
          <span>
            CAM <strong>{selectCameraReadout(snapshot)}</strong>
          </span>
          <span>
            FPS <strong>{Math.round(snapshot.fps || 60)}</strong>
          </span>
        </div>
      </div>

      {snapshot.debug && (
        <div className="mf-debug-panel">
          <span>FRAME {snapshot.frame}</span>
          <span>SIM {snapshot.elapsed.toFixed(1)}s</span>
          <span>ALPHA {snapshot.interpolation.toFixed(2)}</span>
          <span>FPS {snapshot.fps.toFixed(0)}</span>
          <span>
            VIEW {snapshot.camera.viewportWidth} ×{' '}
            {snapshot.camera.viewportHeight}
          </span>
        </div>
      )}

      <div className="mf-hud-bottom">
        <span className="mf-stage-stamp">
          {snapshot.stage} // no field agent assigned
        </span>
        <span className="mf-hud-controls">
          <kbd>Esc</kbd> pause <span aria-hidden="true">·</span>{' '}
          <kbd>F3</kbd> debug
        </span>
      </div>
    </div>
  );
}

function PauseScreen({ snapshot, game }: ScreenProps) {
  return (
    <div className="mf-screen mf-pause">
      <div className="mf-pause-card">
        <p className="mf-kicker">Signal held</p>
        <h2>Expedition paused</h2>
        <p>
          The {snapshot.region} simulation is suspended. Resume when you are
          ready to inspect the foundation shell.
        </p>
        <div className="mf-pause-actions">
          <button
            type="button"
            className="mf-button mf-button-primary"
            onClick={() => game?.resume()}
          >
            Resume
            <kbd>Esc</kbd>
          </button>
          <button
            type="button"
            className="mf-button mf-button-quiet"
            onClick={() => game?.returnToMenu()}
          >
            Return to menu
          </button>
        </div>
        <p className="mf-pause-footnote">
          Stage 1 / Project Foundation · build {snapshot.version}
        </p>
      </div>
    </div>
  );
}
