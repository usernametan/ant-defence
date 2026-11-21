import React from 'react';
import { getThemePalette } from '../../render/palette';
import type { GameState } from '../../shared/types';

export interface ObjectivesCardProps {
  state: Readonly<GameState>;
}

export const ObjectivesCard: React.FC<ObjectivesCardProps> = ({ state }) => {
  const theme = getThemePalette(state.map.theme);
  const isRampage = state.matchConfig.mode === 'rampage';

  if (isRampage) {
    const sorted = [...state.units].sort((a, b) => {
      if (b.kills !== a.kills) return b.kills - a.kills;
      if (a.deaths !== b.deaths) return a.deaths - b.deaths;
      return a.isPlayer ? -1 : 1;
    });
    const playerRank = Math.max(1, sorted.findIndex((u) => u.id === state.playerId) + 1);
    const killGoal = state.matchConfig.scoreToWin;
    const topUnits = sorted.slice(0, 4);

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
          <div className="ht-objectives-title">RAMPAGE RANK #{playerRank}</div>
          <span
            className="ht-display"
            style={{
              fontSize: 9,
              letterSpacing: '0.08em',
              color: 'var(--gold)',
              textTransform: 'uppercase',
            }}
          >
            GOAL {killGoal} KILLS
          </span>
        </div>
        <div className="ht-objectives-list">
          {topUnits.map((u, idx) => (
            <div
              key={u.id}
              className="ht-objective-row"
              style={{ justifyContent: 'space-between', width: '100%' }}
            >
              <span
                style={{
                  color: u.isPlayer ? 'var(--player-glow)' : 'var(--text-hi)',
                  fontWeight: u.isPlayer ? 800 : 600,
                }}
              >
                {idx + 1}. {u.isPlayer ? 'YOU' : (u.name ?? u.id)}
              </span>
              <span className="ht-num" style={{ color: 'var(--gold)', fontWeight: 700 }}>
                {u.kills}K
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const ownedZones = state.zones.filter((z) => z.owner === 'player').length;
  const scoreGoal = state.matchConfig.scoreToWin;
  const reachedScore = state.score.player >= scoreGoal;
  const coreDestroyed = state.baseHp.enemy <= 0;
  const allZonesHeld = ownedZones === state.zones.length && state.zones.length > 0;
  const bossActive = Boolean(state.hellcell?.isCeasefireActive && state.hellcell?.boss);
  const awaitingHellcellTrigger = Boolean(
    state.matchConfig.mode === 'hellcell' && state.hellcell && !state.hellcell.hasTriggered,
  );
  const nextBossSec =
    state.matchConfig.mode === 'hellcell' &&
    state.hellcell &&
    state.hellcell.phase === 'NORMAL' &&
    (state.hellcell.nextSpawnIn ?? 0) > 0
      ? Math.ceil(state.hellcell.nextSpawnIn ?? 0)
      : 0;
  const capturedZones = Math.min(
    2,
    state.zones.filter((z) => z.owner !== 'neutral').length,
  );

  const rows = [
    bossActive
      ? {
          label: 'Defeat Boss (0/1)',
          done: false,
        }
      : awaitingHellcellTrigger
        ? {
            label: `Capture Any 2 Zones (${capturedZones}/2) → Boss`,
            done: capturedZones >= 2,
          }
        : nextBossSec > 0
          ? {
              label: `Next Boss in ${nextBossSec}s`,
              done: false,
            }
          : {
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
