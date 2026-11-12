import { useEffect, useRef, useState } from 'react';
import { GAME_IDENTITY, PROTOTYPE_CHECKS } from '../game/content';
import { Game } from '../game/Game';
import {
  selectCameraReadout,
  selectDodgeLabel,
  selectDodgeReady,
  selectPhaseLabel,
  selectPlayerReadout,
  selectStaminaPercent,
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
          aria-label="Monster Frontier test arena"
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
            Enter Test Arena
            <kbd>Enter</kbd>
          </button>
          <p className="mf-action-note">
            Stage 2 puts a field agent in the Greenreach test grounds. Move,
            sprint, dodge, and aim with the mouse. Combat comes later.
          </p>
        </div>

        <ul className="mf-checks" aria-label="Player prototype systems">
          {PROTOTYPE_CHECKS.map((check) => (
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

      <aside className="mf-briefing" aria-label="Player prototype briefing">
        <p className="mf-briefing-label">Deployment ready</p>
        <p className="mf-briefing-region">{snapshot.region}</p>
        <p className="mf-briefing-copy">
          The old line held long enough to open the frontier. The test grounds
          are live, and the first field agent is ready to move.
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
            <dt>Player</dt>
            <dd>Circle / 18u</dd>
          </div>
          <div>
            <dt>Collision</dt>
            <dd>Slide response</dd>
          </div>
          <div>
            <dt>Camera</dt>
            <dd>Damped follow</dd>
          </div>
          <div>
            <dt>World</dt>
            <dd>
              {snapshot.world.width} × {snapshot.world.height}
            </dd>
          </div>
        </dl>
        <p className="mf-briefing-footnote">
          WASD move · Shift sprint · Space dodge · F3 diagnostics
        </p>
      </aside>
    </section>
  );
}

function Hud({ snapshot }: { snapshot: UiSnapshot }) {
  const stamina = selectStaminaPercent(snapshot);
  const dodgeReady = selectDodgeReady(snapshot);

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
            POS <strong>{selectPlayerReadout(snapshot)}</strong>
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
          <span>VEL {snapshot.player.speed.toFixed(0)}</span>
          <span>DODGE {snapshot.player.dodgeCooldown.toFixed(2)}s</span>
          <span>STAM {stamina}%</span>
          <span>FPS {snapshot.fps.toFixed(0)}</span>
        </div>
      )}

      <div className="mf-hud-bottom">
        <div className="mf-status-stack">
          <span className="mf-stage-stamp">
            {snapshot.stage} // field agent active
          </span>
          <div className="mf-player-meters">
            <div className="mf-meter-row">
              <span>
                STAMINA <strong>{stamina}%</strong>
              </span>
              <span className="mf-meter" aria-hidden="true">
                <span
                  className="mf-meter-fill"
                  style={{ width: `${stamina}%` }}
                />
              </span>
            </div>
            <div
              className={`mf-dodge-chip${dodgeReady ? ' is-ready' : ''}`}
            >
              <span>DODGE</span>
              <strong>{selectDodgeLabel(snapshot)}</strong>
            </div>
          </div>
        </div>
        <span className="mf-hud-controls">
          <kbd>WASD</kbd> move <span aria-hidden="true">·</span>{' '}
          <kbd>Shift</kbd> sprint <span aria-hidden="true">·</span>{' '}
          <kbd>Space</kbd> dodge <span aria-hidden="true">·</span>{' '}
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
          The {snapshot.region} test arena is suspended. Resume when you are
          ready to continue the movement prototype.
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
          Stage 2 / Player Prototype · build {snapshot.version}
        </p>
      </div>
    </div>
  );
}
