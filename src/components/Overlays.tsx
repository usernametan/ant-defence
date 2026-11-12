import { ACHIEVEMENT_DEFS } from '../game/achievements';
import { UPGRADE_DEFS } from '../game/config';
import { DIFFICULTY_IDS, DIFFICULTY_PRESETS } from '../game/difficulty';
import type { GameEngine } from '../game/engine';
import {
  MODE_IDS,
  MODE_META,
  MUTATOR_IDS,
  MUTATOR_META,
} from '../game/modes';
import { WORD_PACK_IDS, WORD_PACK_META } from '../game/settings';
import type { HudSnapshot } from '../game/types';
import { formatScore, formatTime } from '../utils/format';
import { SoundIcon } from './Icons';
import { WpmGraph } from './WpmGraph';

type OverlayProps = {
  hud: HudSnapshot;
  engine: GameEngine;
  onOpenRecords?: () => void;
};

export function Overlays({ hud, engine, onOpenRecords }: OverlayProps) {
  if (hud.phase === 'menu') {
    return (
      <StartOverlay hud={hud} engine={engine} onOpenRecords={onOpenRecords} />
    );
  }
  if (hud.phase === 'paused') {
    return <PauseOverlay hud={hud} engine={engine} />;
  }
  if (hud.phase === 'upgrade') {
    return <UpgradeOverlay hud={hud} engine={engine} />;
  }
  if (hud.phase === 'gameover') {
    return <GameOverOverlay hud={hud} engine={engine} />;
  }
  return null;
}

function StartOverlay({ hud, engine, onOpenRecords }: OverlayProps) {
  const unlockedMedals = hud.achievements.filter((a) => a.unlocked).length;
  const activeMode = MODE_META[hud.mode];

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
          TACTICAL TYPING DEFENSE
          <span className="kicker-line" />
        </div>

        <h1 className="game-title">
          <span className="title-ant">ANT</span>
          <span className="title-defense">DEFENSE</span>
        </h1>

        <p className="start-tagline">
          Four lanes. Evolving weaponry, chain lightning, mortar barrages, and
          every word you can type before the colony breaks the line.
        </p>

        <div className="start-records">
          <div className="start-records-row">
            <div className="record-cell">
              <span>BEST SCORE</span>
              <strong>{formatScore(hud.records.bestScore)}</strong>
            </div>
            <div className="record-cell">
              <span>PEAK SPEED</span>
              <strong>{hud.records.bestWpm} WPM</strong>
            </div>
            <div className="record-cell">
              <span>PRECISION</span>
              <strong>{hud.records.bestAccuracy.toFixed(1)}%</strong>
            </div>
            <div className="record-cell">
              <span>ANTS SLAIN</span>
              <strong>{formatScore(hud.records.totalAntsEliminated)}</strong>
            </div>
            <div className="record-cell">
              <span>MEDALS</span>
              <strong>
                {unlockedMedals}/{hud.achievements.length}
              </strong>
            </div>
          </div>
        </div>

        <div className="mode-deck">
          <div className="section-head-row">
            <span className="difficulty-label">OPERATION MODE</span>
            <span className="mode-brief">{activeMode.description}</span>
          </div>
          <div className="mode-cards">
            {MODE_IDS.map((modeId) => {
              const meta = MODE_META[modeId];
              const selected = hud.mode === modeId;
              return (
                <button
                  key={modeId}
                  type="button"
                  className={`mode-card ${selected ? 'is-selected' : ''}`}
                  onClick={() => engine.setMode(modeId)}
                  onMouseDown={(event) => event.preventDefault()}
                >
                  <div className="mode-card-top">
                    <span className="mode-icon">{meta.icon}</span>
                    <span className="mode-mult">
                      {meta.scoreMultiplier > 0
                        ? `×${meta.scoreMultiplier.toFixed(1)} SCORE`
                        : 'PRACTICE'}
                    </span>
                  </div>
                  <strong className="mode-name">{meta.label}</strong>
                  <span className="mode-tagline">{meta.tagline}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="start-config-grid">
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

          <div className="difficulty-select">
            <span className="difficulty-label">LEXICON PACK</span>
            <div className="difficulty-options">
              {WORD_PACK_IDS.map((pack) => (
                <button
                  key={pack}
                  type="button"
                  className={`difficulty-option ${
                    hud.wordPack === pack ? 'is-selected' : ''
                  }`}
                  onClick={() => engine.setWordPack(pack)}
                  onMouseDown={(event) => event.preventDefault()}
                >
                  <strong>{WORD_PACK_META[pack].label}</strong>
                  <span>{WORD_PACK_META[pack].description}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mutator-bar">
          <div className="section-head-row">
            <span className="difficulty-label">COMBAT MUTATORS (OPTIONAL)</span>
            <span className="multiplier-readout">
              TOTAL SCORE MULTIPLIER:{' '}
              <strong>
                {hud.scoreMultiplier > 0
                  ? `×${hud.scoreMultiplier.toFixed(2)}`
                  : 'PRACTICE (UNRANKED)'}
              </strong>
            </span>
          </div>
          <div className="mutator-pills">
            {MUTATOR_IDS.map((id) => {
              const meta = MUTATOR_META[id];
              const active = hud.mutators.includes(id);
              return (
                <button
                  key={id}
                  type="button"
                  className={`mutator-pill ${active ? 'is-active' : ''}`}
                  onClick={() => engine.toggleMutator(id)}
                  onMouseDown={(event) => event.preventDefault()}
                  title={meta.description}
                >
                  <span className="mutator-icon">{meta.icon}</span>
                  <span className="mutator-copy">
                    <strong>{meta.label}</strong>
                    <small>{meta.description}</small>
                  </span>
                  <span className="mutator-bonus">
                    ×{meta.scoreMultiplier.toFixed(2)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="start-actions-row">
          <button
            type="button"
            className="primary-button start-button"
            onClick={() => engine.startGame()}
          >
            <span>DEPLOY TO LINE</span>
            <kbd>ENTER</kbd>
          </button>

          <button
            type="button"
            className="ghost-button records-button"
            onClick={onOpenRecords}
          >
            ARCHIVE &amp; MEDALS ({unlockedMedals}/{hud.achievements.length}){' '}
            <kbd>L</kbd>
          </button>

          <button
            type="button"
            className="ghost-button records-button"
            onClick={() => engine.toggleSceneryMode()}
          >
            SCENERY: {hud.sceneryMode === 'photo' ? 'REAL PHOTO' : 'PROCEDURAL'}
          </button>
        </div>

        <div className="start-footer">
          <span>
            <kbd>A–Z</kbd> LOCK &amp; FIRE
          </span>
          <span>
            <kbd>1</kbd> FOCUS
          </span>
          <span>
            <kbd>2</kbd> AEGIS
          </span>
          <span>
            <kbd>3</kbd> POWER
          </span>
          <span>
            <kbd>4</kbd> MORTAR
          </span>
          <span>
            <kbd>ESC</kbd> PAUSE
          </span>
        </div>
      </div>
    </div>
  );
}

function UpgradeOverlay({ hud, engine }: OverlayProps) {
  return (
    <div className="overlay overlay-pause">
      <div className="modal upgrade-modal">
        <span className="modal-eyebrow">
          FIELD REQUISITION — WAVE {hud.wave} CLEARED
        </span>
        <h2 className="modal-title">TACTICAL UPGRADE</h2>
        <p className="modal-copy">
          Select one permanent field modification before Wave {hud.wave + 1}{' '}
          begins. Press <kbd>1</kbd>, <kbd>2</kbd>, or <kbd>3</kbd> to equip.
        </p>
        <div className="upgrade-grid">
          {hud.upgradeChoices.map((upgrade, index) => (
            <button
              key={upgrade.id}
              type="button"
              className="upgrade-card"
              onClick={() => engine.selectUpgrade(upgrade.id)}
            >
              <div className="upgrade-card-head">
                <span className="upgrade-badge">{upgrade.badge}</span>
                <kbd>{index + 1}</kbd>
              </div>
              <strong className="upgrade-name">{upgrade.name}</strong>
              <p className="upgrade-desc">{upgrade.description}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function PauseOverlay({ hud, engine }: OverlayProps) {
  return (
    <div className="overlay overlay-pause">
      <div className="modal">
        <span className="modal-eyebrow">
          {MODE_META[hud.mode].label} • SURVIVAL SUSPENDED
        </span>
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
        {hud.activeUpgrades.length > 0 && (
          <div className="pause-upgrades">
            {hud.activeUpgrades.map((id) => (
              <span key={id} className="upgrade-chip">
                {UPGRADE_DEFS[id].name}
              </span>
            ))}
          </div>
        )}
        <div className="modal-actions">
          <button
            type="button"
            className="primary-button"
            onClick={() => engine.resume()}
          >
            RESUME <kbd>ENTER</kbd>
          </button>
          {hud.mode === 'zen' && (
            <button
              type="button"
              className="ghost-button"
              onClick={() => engine.finishZenRun()}
            >
              FINISH DRILL
            </button>
          )}
          <button
            type="button"
            className="ghost-button"
            onClick={() => engine.startGame()}
          >
            RESTART <kbd>R</kbd>
          </button>
          <button
            type="button"
            className="ghost-button"
            onClick={() => engine.toMenu()}
          >
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
        <button
          type="button"
          className="inline-motion-toggle"
          onClick={() => engine.toggleSceneryMode()}
        >
          SCENERY: {hud.sceneryMode === 'photo' ? 'REAL PHOTO' : 'PROCEDURAL'}{' '}
          <kbd>B</kbd>
        </button>
        <button
          type="button"
          className="inline-motion-toggle"
          onClick={() => engine.toggleReducedMotion()}
        >
          EFFECTS {hud.reducedMotion ? 'REDUCED' : 'FULL'}
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
        <span className="modal-eyebrow danger">
          {hud.mode === 'zen' ? 'ZEN DRILL COMPLETE' : 'THE LINE HAS FALLEN'}
        </span>
        <h2 className="modal-title gameover-title">
          {hud.mode === 'zen' ? 'DRILL REPORT' : 'LAST STAND'}
        </h2>
        <p className="modal-copy">
          {hud.mode === 'zen'
            ? `Practice session concluded at wave ${hud.wave}.`
            : `The swarm broke through at wave ${hud.wave}. The pass is quiet now — but the colony remembers.`}
        </p>

        <div className="final-score-row">
          <div className="final-score">
            <span>FINAL SCORE</span>
            <strong>{formatScore(stats.score)}</strong>
            {hud.newRecords.score && <em className="record-flag">NEW BEST</em>}
            {hud.runRank !== null && (
              <em className="record-flag rank-flag">
                RECORD BOOK #{hud.runRank}
              </em>
            )}
          </div>
          <div className="grade-emblem">
            <span>RATING</span>
            <strong>{hud.grade}</strong>
          </div>
        </div>

        {hud.runAchievements.length > 0 && (
          <div className="run-medals-strip">
            <span className="bests-label">MEDALS EARNED THIS RUN</span>
            <div className="run-medals-list">
              {hud.runAchievements.map((id) => (
                <span key={id} className="run-medal-pill">
                  <i>{ACHIEVEMENT_DEFS[id].icon}</i>
                  {ACHIEVEMENT_DEFS[id].name}
                </span>
              ))}
            </div>
          </div>
        )}

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
          <button
            type="button"
            className="primary-button"
            onClick={() => engine.startGame()}
          >
            RISE AGAIN <kbd>ENTER</kbd>
          </button>
          <button
            type="button"
            className="ghost-button"
            onClick={() => engine.toMenu()}
          >
            MAIN MENU <kbd>ESC</kbd>
          </button>
        </div>
      </div>
    </div>
  );
}
