import { useEffect } from 'react';
import { DIFFICULTY_PRESETS } from '../game/difficulty';
import type { HudSnapshot } from '../game/types';
import { formatDate, formatScore, formatTime } from '../utils/format';

type LeaderboardOverlayProps = {
  hud: HudSnapshot;
  onClose: () => void;
};

export function LeaderboardOverlay({ hud, onClose }: LeaderboardOverlayProps) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      const key = event.key.toLowerCase();
      if (key !== 'escape' && key !== 'l' && key !== 'enter' && key !== ' ') {
        return;
      }
      event.preventDefault();
      event.stopImmediatePropagation();
      onClose();
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [onClose]);

  return (
    <div className="overlay overlay-records">
      <div className="modal leaderboard-modal">
        <span className="modal-eyebrow">LOCAL RECORD BOOK</span>
        <h2 className="modal-title">HALL OF DEFENDERS</h2>
        <p className="modal-copy">
          The ten finest stands recorded on this machine. No names, no wires —
          only the score.
        </p>
        {hud.leaderboard.length === 0 ? (
          <p className="leaderboard-empty">
            NO RECORDS YET — THE COLONY AWAITS ITS FIRST DEFENDER.
          </p>
        ) : (
          <ol className="leaderboard-rows">
            {hud.leaderboard.map((entry, index) => (
              <li
                key={entry.id}
                className={`leaderboard-row ${index === 0 ? 'is-first' : ''}`}
              >
                <span className="leaderboard-rank">{index + 1}</span>
                <strong className="leaderboard-score">
                  {formatScore(entry.score)}
                </strong>
                <span className="leaderboard-cell">WAVE {entry.wave}</span>
                <span className="leaderboard-cell">{entry.wpm} WPM</span>
                <span className="leaderboard-cell">
                  {entry.accuracy.toFixed(1)}%
                </span>
                <span className="leaderboard-cell">
                  {formatTime(entry.time)}
                </span>
                <em className={`leaderboard-difficulty lb-${entry.difficulty}`}>
                  {DIFFICULTY_PRESETS[entry.difficulty].label}
                </em>
                <span className="leaderboard-date">
                  {formatDate(entry.date)}
                </span>
              </li>
            ))}
          </ol>
        )}
        <div className="modal-actions">
          <button type="button" className="ghost-button" onClick={onClose}>
            BACK TO THE LINE <kbd>ESC</kbd>
          </button>
        </div>
      </div>
    </div>
  );
}
