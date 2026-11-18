import React from 'react';
import { getThemePalette } from '../../render/palette';
import type { GameState } from '../../shared/types';

export interface ObjectivesCardProps {
  state: Readonly<GameState>;
}

export const ObjectivesCard: React.FC<ObjectivesCardProps> = ({ state }) => {
  const theme = getThemePalette(state.map.theme);
  const ownedZones = state.zones.filter((z) => z.owner === 'player').length;
  const scoreGoal = state.matchConfig.scoreToWin;
  const reachedScore = state.score.player >= scoreGoal;
  const coreDestroyed = state.baseHp.enemy <= 0;
  const allZonesHeld = ownedZones === state.zones.length && state.zones.length > 0;

  const rows = [
    {
      label: `Hold Zones (${ownedZones}/${state.zones.length})`,
      done: allZonesHeld,
    },
    {
      label: `Reach ${scoreGoal} Score`,
      done: reachedScore,
    },
    {
      label: 'or Destroy Enemy Core',
      done: coreDestroyed,
    },
  ];

  return (
    <div className="ht-chamfer-panel ht-objectives-card">
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <div className="ht-objectives-title">OBJECTIVES</div>
        <span
          className="ht-display"
          style={{
            fontSize: 9,
            letterSpacing: '0.08em',
            color: theme.accent,
            textTransform: 'uppercase',
          }}
        >
          {theme.name}
        </span>
      </div>
      <div className="ht-objectives-list">
        {rows.map((row) => (
          <div key={row.label} className="ht-objective-row">
            <span className={`ht-objective-dot ${row.done ? 'is-done' : ''}`} />
            <span style={{ color: row.done ? 'var(--success)' : 'var(--text-hi)' }}>
              {row.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
