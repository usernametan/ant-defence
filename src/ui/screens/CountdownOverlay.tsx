import React, { useEffect, useRef, useState } from 'react';
import { getThemePalette } from '../../render/palette';
import type { MapTheme, MatchDifficulty } from '../../shared/types';
import { Badge, Panel } from '../design';
import '../ui.css';

export interface CountdownOverlayProps {
  seconds?: number;
  mapTheme?: MapTheme;
  difficulty?: MatchDifficulty;
  scoreToWin?: number;
  onTick?: (remaining: number) => void;
  onComplete: () => void;
}

export const CountdownOverlay: React.FC<CountdownOverlayProps> = ({
  seconds = 3,
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

  return (
    <div
      className="ht-root ht-blur-backdrop"
      style={{ zIndex: 'var(--z-transition)' }}
      aria-live="assertive"
    >
      <div style={{ textAlign: 'center', position: 'relative' }}>
        <Panel
          bracketed
          style={{
            padding: '18px 36px',
            marginBottom: 18,
            display: 'inline-block',
          }}
        >
          <Badge tone="gold" className="ht-stagger">
            DEPLOYING TO {theme.name.toUpperCase()}
          </Badge>
          <h1
            className="ht-display"
            style={{ fontSize: 'clamp(28px, 5vw, 52px)', marginTop: 6 }}
          >
            ZONE CONTROL
          </h1>
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              gap: 8,
              marginTop: 10,
              flexWrap: 'wrap',
            }}
          >
            <Badge tone="player">CAPTURE A · B · C</Badge>
            <Badge tone="gold">{scoreToWin} SCORE TO WIN</Badge>
            <Badge tone="common">{difficulty.toUpperCase()}</Badge>
          </div>
        </Panel>

        <div key={remaining} className="ht-display ht-countdown-num">
          {remaining > 0 ? remaining : 'ENGAGE'}
        </div>
      </div>
    </div>
  );
};
