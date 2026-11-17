import React, { useEffect, useState } from 'react';
import { Badge, Panel } from '../design';
import '../ui.css';

export interface CountdownOverlayProps {
  seconds?: number;
  onTick?: (remaining: number) => void;
  onComplete: () => void;
}

export const CountdownOverlay: React.FC<CountdownOverlayProps> = ({
  seconds = 3,
  onTick,
  onComplete,
}) => {
  const [remaining, setRemaining] = useState(seconds);

  useEffect(() => {
    onTick?.(remaining);
    if (remaining <= 0) {
      const doneTimer = window.setTimeout(onComplete, 550);
      return () => window.clearTimeout(doneTimer);
    }
    const timer = window.setTimeout(() => {
      setRemaining((r) => r - 1);
    }, 950);
    return () => window.clearTimeout(timer);
  }, [remaining, onTick, onComplete]);

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
            DEPLOYMENT IMMINENT
          </Badge>
          <h1
            className="ht-display"
            style={{ fontSize: 'clamp(28px, 5vw, 52px)', marginTop: 6 }}
          >
            ZONE CONTROL
          </h1>
        </Panel>

        <div key={remaining} className="ht-display ht-countdown-num">
          {remaining > 0 ? remaining : 'ENGAGE'}
        </div>
      </div>
    </div>
  );
};
