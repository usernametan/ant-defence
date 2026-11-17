import { useEffect, useMemo, useRef } from 'react';
import { WEAPON_DEFS } from '../shared/api';
import { createSim } from '../sim';
import { MATCH_TIME_LIMIT } from '../sim/constants';
import { GameController } from './GameController';
import { GameRenderer } from './GameRenderer';
import { GameProvider, useGameState } from './useGameState';
import './game.css';

/** Self-contained playable entry point; presentation tracks can replace the view later. */
export function GameApp() {
  const controller = useMemo(() => new GameController(createSim()), []);
  return (
    <GameProvider controller={controller}>
      <GameShell controller={controller} />
    </GameProvider>
  );
}

function GameShell({ controller }: { controller: GameController }) {
  const state = useGameState();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const renderer = new GameRenderer(canvas, controller);
    const detachInput = controller.attach(canvas);
    controller.startMatch();
    controller.start();

    let renderFrame = 0;
    const draw = (): void => {
      renderer.render();
      renderFrame = requestAnimationFrame(draw);
    };
    renderFrame = requestAnimationFrame(draw);

    const onResize = (): void => renderer.resize();
    window.addEventListener('resize', onResize);
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(onResize) : null;
    observer?.observe(canvas);

    const onKeys = (event: KeyboardEvent): void => {
      if (event.code === 'KeyP') controller.togglePause();
      if (event.code === 'Enter') {
        const status = controller.getState().status;
        if (status === 'won' || status === 'lost') controller.restartMatch();
      }
    };
    window.addEventListener('keydown', onKeys);

    return () => {
      cancelAnimationFrame(renderFrame);
      window.removeEventListener('resize', onResize);
      observer?.disconnect();
      window.removeEventListener('keydown', onKeys);
      controller.stop();
      detachInput();
    };
  }, [controller]);

  const player = state.units.find((unit) => unit.id === state.playerId);
  const weapon = player ? WEAPON_DEFS[player.weaponId] : undefined;
  const hpRatio = player ? Math.max(0, player.hp / player.maxHp) : 0;
  const secondsLeft = Math.max(0, Math.ceil(MATCH_TIME_LIMIT - state.time));
  const ownedPlayer = state.zones.filter((zone) => zone.owner === 'player').length;
  const ownedEnemy = state.zones.filter((zone) => zone.owner === 'enemy').length;

  return (
    <div className="game-shell">
      <canvas ref={canvasRef} className="game-canvas" aria-label="Zone Control arena" />

      <div className="hud hud-top">
        <div className="hud-panel scoreboard">
          <span className="score score-player">{state.score.player}</span>
          <span className="score-label">SCORE</span>
          <span className="score score-enemy">{state.score.enemy}</span>
        </div>
        <div className="hud-panel timer">
          {String(Math.floor(secondsLeft / 60)).padStart(2, '0')}:
          {String(secondsLeft % 60).padStart(2, '0')}
        </div>
        <div className="hud-panel zones-summary">
          ZONES <b className="friendly">{ownedPlayer}</b> / <b className="hostile">{ownedEnemy}</b>
        </div>
      </div>

      <div className="hud hud-zones">
        {state.zones.map((zone) => (
          <div key={zone.id} className={`zone-row ${zone.owner} ${zone.contested ? 'contested' : ''}`}>
            <span className="zone-name">{zone.id.replace('zone-', 'ZONE ')}</span>
            <span className="zone-owner">{zone.contested ? 'CONTESTED' : zone.owner.toUpperCase()}</span>
            <div className="zone-bar">
              <div
                className="zone-fill"
                style={{
                  width: `${Math.abs(zone.progress) * 100}%`,
                  background: zone.progress >= 0 ? '#4dc9ff' : '#ff5d6c',
                }}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="hud hud-bottom">
        <div className="hud-panel vitals">
          <div className="vitals-label">HEALTH <b>{Math.ceil(player?.hp ?? 0)}</b></div>
          <div className="health-bar">
            <div className="health-fill" style={{ width: `${hpRatio * 100}%` }} />
          </div>
          {player?.dead && <div className="respawn">RESPAWNING IN {player.respawnIn.toFixed(1)}s</div>}
        </div>
        <div className="hud-panel weapon">
          <div className="weapon-name">{weapon?.name ?? '—'}</div>
          <div className="ammo">
            <b>{player?.ammoInMag ?? 0}</b><span> / {player?.reserveAmmo ?? 0}</span>
          </div>
          <div className="reload-bar">
            <div
              className="reload-fill"
              style={{ width: `${(player?.reloadProgress ?? 0) * 100}%` }}
            />
          </div>
        </div>
      </div>

      <div className="hud hud-controls">
        WASD move · MOUSE aim · LMB fire · R reload · E pickup · SHIFT/SPACE dash · P pause
      </div>

      {(state.status === 'paused' || state.status === 'won' || state.status === 'lost') && (
        <div className="overlay">
          <div className="overlay-card">
            <h2>{state.status === 'paused' ? 'PAUSED' : state.status === 'won' ? 'VICTORY' : 'DEFEAT'}</h2>
            <p>
              Score {state.score.player} — {state.score.enemy}
            </p>
            <button
              type="button"
              onClick={() => {
                if (state.status === 'paused') controller.togglePause();
                else controller.restartMatch();
              }}
            >
              {state.status === 'paused' ? 'RESUME' : 'PLAY AGAIN'}
            </button>
            {state.status !== 'paused' && <small>or press Enter</small>}
          </div>
        </div>
      )}
    </div>
  );
}
