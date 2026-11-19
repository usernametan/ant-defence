import React from 'react';
import type { KillSource, Team } from '../../shared/types';
import { Icon, Panel } from '../design';

export interface KillFeedEntry {
  id: number;
  killerName: string;
  killerTeam: Team;
  victimName: string;
  victimTeam: Team;
  weaponId: KillSource;
}

export interface KillFeedProps {
  entries: KillFeedEntry[];
  streakText: string | null;
}

export const KillFeed: React.FC<KillFeedProps> = ({ entries, streakText }) => {
  return (
    <>
      {streakText && (
        <div className="ht-streak-toast">
          <Panel
            bracketed
            tone="gold"
            style={{
              padding: '8px 22px',
              textAlign: 'center',
              boxShadow: 'var(--glow-gold)',
            }}
          >
            <span
              className="ht-display"
              style={{ fontSize: 18, color: 'var(--gold)' }}
            >
              {streakText}
            </span>
          </Panel>
        </div>
      )}

      {entries.length > 0 && (
        <div className="ht-chamfer-panel ht-killfeed-panel" aria-live="polite">
          {entries.map((entry) => {
            const selfKill = entry.killerName === 'YOU';
            const selfDeath = entry.victimName === 'YOU';
            return (
              <div
                key={entry.id}
                className="ht-killfeed-line"
                style={{
                  padding: '3px 7px',
                  borderRadius: 'var(--radius-xs)',
                  background: selfKill
                    ? 'rgba(34, 211, 238, 0.14)'
                    : selfDeath
                      ? 'rgba(255, 90, 60, 0.14)'
                      : 'rgba(15, 23, 42, 0.6)',
                  borderLeft: selfKill
                    ? '2.5px solid var(--player)'
                    : selfDeath
                      ? '2.5px solid var(--enemy)'
                      : '2.5px solid transparent',
                }}
              >
                <span
                  style={{
                    fontWeight: 700,
                    color:
                      entry.killerTeam === 'player'
                        ? 'var(--player-glow)'
                        : 'var(--enemy-glow)',
                  }}
                >
                  {entry.killerName}
                </span>
                <span style={{ color: 'var(--text-mid)', display: 'inline-flex' }}>
                  <Icon name={entry.weaponId} size={13} />
                </span>
                <span
                  style={{
                    fontWeight: 700,
                    color:
                      entry.victimTeam === 'player'
                        ? 'var(--player-glow)'
                        : 'var(--enemy-glow)',
                  }}
                >
                  {entry.victimName}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
};
