import React, { useRef } from 'react';
import { getThemePalette } from '../../render/palette';
import type { GameMode, MapTheme } from '../../shared/types';
import { Icon, useMenuNavigation } from '../design';
import { playUiClick, playUiConfirm, playUiHover } from '../design/uiSound';
import './landing.css';

export interface PauseMenuProps {
  mode?: GameMode;
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
  mode = 'zoneControl',
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
    <div ref={containerRef} className="zc-overlay-backdrop">
      <div className="zc-card-surface zc-pause-card zc-enter">
        <div className="zc-pause-header">
          <h2 className="zc-pause-title">Paused</h2>
          <span className="zc-pause-meta">
            {elapsedSeconds !== undefined
              ? `${theme.name} · ${formatClock(elapsedSeconds)}`
              : theme.name}
          </span>
        </div>

        {score && (
          <div className="zc-pause-scoreboard">
            <span className="zc-pause-team zc-pause-team--player">
              <span>You</span>
              <strong>{mode === 'rampage' ? `${score.player}K` : score.player}</strong>
            </span>
            <span className="zc-pause-vs">vs</span>
            <span className="zc-pause-team zc-pause-team--enemy">
              <strong>{mode === 'rampage' ? `${score.enemy}K` : score.enemy}</strong>
              <span>{mode === 'rampage' ? 'Top Bot' : 'Enemy'}</span>
            </span>
          </div>
        )}

        <div className="zc-pause-actions">
          <button
            type="button"
            className="zc-play-btn zc-pause-btn"
            onMouseEnter={() => playUiHover()}
            onClick={() => {
              playUiConfirm();
              onResume();
            }}
          >
            <Icon name="play" size={14} />
            <span>Resume</span>
          </button>

          <button
            type="button"
            className="zc-secondary-btn zc-pause-btn"
            onMouseEnter={() => playUiHover()}
            onClick={() => {
              playUiClick();
              onSettings();
            }}
          >
            <Icon name="settings" size={14} />
            <span>Settings</span>
          </button>

          <button
            type="button"
            className="zc-secondary-btn zc-pause-btn"
            onMouseEnter={() => playUiHover()}
            onClick={() => {
              playUiClick();
              onRestart();
            }}
          >
            <span>Restart Match</span>
          </button>

          <button
            type="button"
            className="zc-danger-btn"
            onMouseEnter={() => playUiHover()}
            onClick={() => {
              playUiClick();
              onQuit();
            }}
          >
            <span>Exit to Menu</span>
          </button>
        </div>
      </div>
    </div>
  );
};
