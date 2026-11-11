import type { GameEngine } from '../game/engine';
import type { HudSnapshot } from '../game/types';
import {
  DIFFICULTY_IDS,
  DIFFICULTY_PRESETS,
} from '../game/difficulty';
import { formatScore, formatTime } from '../utils/format';
import { AntIcon, CrosshairIcon, SoundIcon } from './Icons';
import { WpmGraph } from './WpmGraph';

type OverlayProps = {
  hud: HudSnapshot;
  engine: GameEngine;
};

export function Overlays({ hud, engine }: OverlayProps) {
  if (hud.phase === 'menu') {
    return <StartOverlay hud={hud} engine={engine} />;
  }
  if (hud.phase === 'paused') {
    return <PauseOverlay hud={hud} engine={engine} />;
  }
  if (hud.phase === 'gameover') {
    return <GameOverOverlay hud={hud} engine={engine} />;
  }
  return null;
}

function StartOverlay({ hud, engine }: OverlayProps) {
  return (
    <div className="overlay overlay-start">
      <button
        type="button"
        className="icon-button overlay-sound"
        aria-label={hud.muted ? 'Unmute audio' : 'Mute audio'}
        onClick={() => engine.toggleMute()}
      >
        <SoundIcon muted={hud.muted} className="mute-icon" />
      </button>

      <div className="start-content">
        <div className="start-kicker">
          <span className="kicker-line" />
          A TYPING DEFENSE
          <span className="kicker-line" />
        </div>

        <h1 className="game-title">
          <span className="title-ant">ANT</span>
          <span className="title-defense">DEFENSE</span>
        </h1>

        <p className="start-tagline">
          They come in waves. You have a pistol, a line in the sand, and every
          word you can type.
        </p>

        {hud.records.gamesPlayed > 0 && (
          <div className="start-records">
            <span className="start-records-label">SERVICE RECORD</span>
            <div className="start-records-row">
              <div className="record-cell">
                <span>BEST SCORE</span>
                <strong>{formatScore(hud.records.bestScore)}</strong>
              </div>
              <div className="record-cell">
                <span>BEST WPM</span>
                <strong>{hud.records.bestWpm}</strong>
              </div>
              <div className="record-cell">
                <span>BEST ACCURACY</span>
                <strong>{hud.records.bestAccuracy.toFixed(1)}%</strong>
              </div>
            </div>
            <p className="start-records-note">
              {hud.records.gamesPlayed} GAMES PLAYED —{' '}
              {formatScore(hud.records.totalAntsEliminated)} ANTS ELIMINATED
            </p>
          </div>
        )}

        <div className="instruction-row">
          <article className="instruction">
            <span className="instruction-index">01</span>
            <CrosshairIcon className="instruction-icon" />
            <h2>READ</h2>
            <p>A word floats above every ant. Pick it out of the swarm.</p>
          </article>
          <article className="instruction">
            <span className="instruction-index">02</span>
            <span className="instruction-glyph">A–Z</span>
            <h2>TYPE</h2>
            <p>Type the word to lock on. The last letter fires the shot.</p>
          </article>
          <article className="instruction">
            <span className="instruction-index">03</span>
            <AntIcon className="instruction-icon ant-icon-large" />
            <h2>HOLD</h2>
            <p>Let one cross the red line and the colony takes your blood.</p>
          </article>
        </div>

        <div className="difficulty-select">
          <span className="difficulty-label">THREAT LEVEL</span>
          <div className="difficulty-options">
            {DIFFICULTY_IDS.map((id) => (
              <button
                key={id}
                type="button"
                className={`difficulty-option ${
                  hud.difficulty === id ? 'is-selected' : ''
                }`}
                onClick={() => engine.setDifficulty(id)}
                onMouseDown={(event) => event.preventDefault()}
              >
                <strong>{DIFFICULTY_PRESETS[id].label}</strong>
                <span>{DIFFICULTY_PRESETS[id].description}</span>
              </button>
            ))}
          </div>
        </div>

        <button
          type="button"
          className="primary-button start-button"
          onClick={() => engine.startGame()}
        >
          <span>BEGIN DEFENSE</span>
          <kbd>ENTER</kbd>
        </button>

        <div className="start-footer">
          <span><kbd>A–Z</kbd> TYPE</span>
          <span><kbd>BKSP</kbd> ERASE</span>
          <span><kbd>ESC</kbd> PAUSE</span>
          <span><kbd>1–3</kbd> ABILITIES</span>
          <span className="audio-note">HEADPHONES RECOMMENDED</span>
        </div>
      </div>
    </div>
  );
}

function PauseOverlay({ hud, engine }: OverlayProps) {
  return (
    <div className="overlay overlay-pause">
      <div className="modal">
        <span className="modal-eyebrow">SURVIVAL SUSPENDED</span>
        <h2 className="modal-title">PAUSED</h2>
        <p className="modal-copy">
          The colony waits. Take a breath, steady your hand, and return to the
          line.
        </p>
        <div className="pause-stats">
          <div>
            <span>WAVE</span>
            <strong>{String(hud.wave).padStart(2, '0')}</strong>
          </div>
          <div>
            <span>SCORE</span>
            <strong>{formatScore(hud.score)}</strong>
          </div>
          <div>
            <span>ELIMINATED</span>
            <strong>{hud.eliminated}</strong>
          </div>
        </div>
        <div className="modal-actions">
          <button type="button" className="primary-button" onClick={() => engine.resume()}>
            RESUME <kbd>ENTER</kbd>
          </button>
          <button type="button" className="ghost-button" onClick={() => engine.startGame()}>
            RESTART <kbd>R</kbd>
          </button>
          <button type="button" className="ghost-button" onClick={() => engine.toMenu()}>
            ABANDON
          </button>
        </div>
        <button
          type="button"
          className="inline-audio-toggle"
          onClick={() => engine.toggleMute()}
        >
          <SoundIcon muted={hud.muted} className="inline-audio-icon" />
          AUDIO {hud.muted ? 'OFF' : 'ON'} <kbd>M</kbd>
        </button>
      </div>
    </div>
  );
}

function GameOverOverlay({ hud, engine }: OverlayProps) {
  const stats = hud.stats;
  return (
    <div className="overlay overlay-gameover">
      <div className="modal gameover-modal">
        <span className="modal-eyebrow danger">THE LINE HAS FALLEN</span>
        <h2 className="modal-title gameover-title">LAST STAND</h2>
        <p className="modal-copy">
          The swarm broke through at wave {hud.wave}. The pass is quiet now —
          but the colony remembers.
        </p>

        <div className="final-score">
          <span>FINAL SCORE</span>
          <strong>{formatScore(stats.score)}</strong>
          {hud.newRecords.score && <em className="record-flag">NEW BEST</em>}
        </div>

        <div className="results-grid">
          <div className="result-card">
            <span>WAVES</span>
            <strong>{stats.wavesSurvived}</strong>
          </div>
          <div className="result-card">
            <span>ELIMINATED</span>
            <strong>{stats.antsEliminated}</strong>
          </div>
          <div className="result-card">
            <span>ACCURACY</span>
            <strong>{stats.accuracy.toFixed(1)}%</strong>
            {hud.newRecords.accuracy && (
              <em className="record-flag">NEW BEST</em>
            )}
          </div>
          <div className="result-card">
            <span>BEST STREAK</span>
            <strong>{stats.bestCombo}</strong>
          </div>
          <div className="result-card">
            <span>WPM</span>
            <strong>{stats.wpm}</strong>
            {hud.newRecords.wpm && <em className="record-flag">NEW BEST</em>}
          </div>
          <div className="result-card">
            <span>TIME</span>
            <strong>{formatTime(stats.time)}</strong>
          </div>
          <div className="result-card">
            <span>WORDS</span>
            <strong>{stats.correctWords}</strong>
          </div>
          <div className="result-card">
            <span>MISFIRES</span>
            <strong>{stats.mistakes}</strong>
          </div>
        </div>

        <WpmGraph samples={stats.wpmHistory} />

        <div className="bests-strip">
          <span className="bests-label">PERSONAL BESTS</span>
          <div className="bests-cells">
            <div className="best-cell">
              <span>SCORE</span>
              <strong>{formatScore(hud.records.bestScore)}</strong>
            </div>
            <div className="best-cell">
              <span>WPM</span>
              <strong>{hud.records.bestWpm}</strong>
            </div>
            <div className="best-cell">
              <span>ACCURACY</span>
              <strong>{hud.records.bestAccuracy.toFixed(1)}%</strong>
            </div>
            <div className="best-cell">
              <span>GAMES</span>
              <strong>{hud.records.gamesPlayed}</strong>
            </div>
            <div className="best-cell">
              <span>ANTS</span>
              <strong>{formatScore(hud.records.totalAntsEliminated)}</strong>
            </div>
          </div>
        </div>

        <div className="modal-actions">
          <button type="button" className="primary-button" onClick={() => engine.startGame()}>
            RISE AGAIN <kbd>ENTER</kbd>
          </button>
          <button type="button" className="ghost-button" onClick={() => engine.toMenu()}>
            MAIN MENU <kbd>ESC</kbd>
          </button>
        </div>
      </div>
    </div>
  );
}
