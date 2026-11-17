import React from 'react';
import type { GameState } from '../../shared/types';

export interface ObjectivesCardProps {
  state: Readonly<GameState>;
}

export const ObjectivesCard: React.FC<ObjectivesCardProps> = ({ state }) => {
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
      <div className="ht-objectives-title">OBJECTIVES</div>
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
