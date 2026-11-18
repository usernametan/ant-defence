import React, { useRef } from 'react';
import { getThemePalette } from '../../render/palette';
import type { MapTheme } from '../../shared/types';
import { Badge, Button, Icon, Panel, useMenuNavigation } from '../design';
import '../ui.css';

export interface PauseMenuProps {
  score?: { player: number; enemy: number };
  elapsedSeconds?: number;
  mapTheme?: MapTheme;
  onResume: () => void;
  onSettings: () => void;
  onRestart: () => void;
  onQuit: () => void;
}

function formatClock(sec: number): string {
  const total = Math.max(0, Math.floor(sec));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export const PauseMenu: React.FC<PauseMenuProps> = ({
  score,
  elapsedSeconds,
  mapTheme,
  onResume,
  onSettings,
  onRestart,
  onQuit,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  useMenuNavigation({ containerRef, onEscape: onResume });
  const theme = getThemePalette(mapTheme);

  return (
    <div ref={containerRef} className="ht-root ht-blur-backdrop">
      <Panel
        bracketed
        style={{
          width: 'min(420px, 100%)',
          padding: 28,
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: 4 }}>
          <Badge tone="player">SIMULATION SUSPENDED</Badge>
          <h2 className="ht-display" style={{ fontSize: 28, marginTop: 6 }}>
            PAUSED
          </h2>
        </div>

        {score && (
          <Panel
            tone="subtle"
            style={{
              padding: '10px 14px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: 12,
            }}
          >
            <span className="ht-display" style={{ fontSize: 14, color: 'var(--player-glow)' }}>
              {score.player}
            </span>
            <div style={{ textAlign: 'center' }}>
              <div className="ht-display" style={{ fontSize: 10, color: theme.accent }}>
                {theme.name}
              </div>
              {elapsedSeconds !== undefined && (
                <div className="ht-num" style={{ fontSize: 11, color: 'var(--text-mid)' }}>
                  {formatClock(elapsedSeconds)}
                </div>
              )}
            </div>
            <span className="ht-display" style={{ fontSize: 14, color: 'var(--enemy-glow)' }}>
              {score.enemy}
            </span>
          </Panel>
        )}

        <Button variant="primary" size="lg" onClick={onResume}>
          <Icon name="play" size={16} /> Resume Match
        </Button>
        <Button variant="secondary" onClick={onSettings}>
          <Icon name="settings" size={16} /> Settings
        </Button>
        <Button variant="secondary" onClick={onRestart}>
          Restart Sector
        </Button>
        <Button variant="danger" onClick={onQuit}>
          Quit to Command
        </Button>
      </Panel>
    </div>
  );
};
