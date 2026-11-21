import React, { useEffect, useRef, useState } from 'react';
import { getThemePalette } from '../../render/palette';
import type { GameMode, MapTheme, MatchDifficulty } from '../../shared/types';
import './landing.css';

export interface CountdownOverlayProps {
  seconds?: number;
  mode?: GameMode;
  mapTheme?: MapTheme;
  difficulty?: MatchDifficulty;
  scoreToWin?: number;
  onTick?: (remaining: number) => void;
  onComplete: () => void;
}

export const CountdownOverlay: React.FC<CountdownOverlayProps> = ({
  seconds = 3,
  mode = 'zoneControl',
  mapTheme = 'fortress',
  difficulty = 'normal',
  scoreToWin = 120,
  onTick,
  onComplete,
}) => {
  const [remaining, setRemaining] = useState(seconds);
  const onTickRef = useRef(onTick);
  const onCompleteRef = useRef(onComplete);
  const theme = getThemePalette(mapTheme);

  useEffect(() => {
    onTickRef.current = onTick;
    onCompleteRef.current = onComplete;
  });

  // Keep the countdown timer stable even when the parent re-renders every frame.
  useEffect(() => {
    onTickRef.current?.(remaining);
    if (remaining <= 0) {
      const doneTimer = window.setTimeout(() => onCompleteRef.current(), 550);
      return () => window.clearTimeout(doneTimer);
    }
    const timer = window.setTimeout(() => {
      setRemaining((r) => r - 1);
    }, 950);
    return () => window.clearTimeout(timer);
  }, [remaining]);

  const modeLabel =
    mode === 'rampage' ? 'Rampage' : mode === 'hellcell' ? 'Hellcell' : 'Zone Control';
  const diffLabel =
    difficulty === 'easy' ? 'Easy' : difficulty === 'hard' ? 'Hard' : 'Normal';
  const goalLabel =
    mode === 'rampage' ? `${scoreToWin} kills to win` : `${scoreToWin} score to win`;

  return (
    <div
      className="zc-overlay-backdrop"
      style={{ zIndex: 'var(--z-transition)' }}
      aria-live="assertive"
    >
      <div className="zc-card-surface zc-countdown-card zc-enter">
        <div className="zc-countdown-context">
          {`${theme.name} · ${modeLabel}`}
        </div>

        <div key={remaining} className="zc-countdown-num">
          {remaining > 0 ? remaining : 'GO'}
        </div>

        <div className="zc-countdown-meta">
          {`${goalLabel} · ${diffLabel}`}
        </div>
      </div>
    </div>
  );
};
