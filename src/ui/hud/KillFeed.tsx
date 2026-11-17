import React from 'react';
import type { Team, WeaponId } from '../../shared/types';
import { Badge, Icon, Panel } from '../design';

export interface KillFeedEntry {
  id: number;
  killerName: string;
  killerTeam: Team;
  victimName: string;
  victimTeam: Team;
  weaponId: WeaponId;
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

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
          alignItems: 'flex-end',
          maxWidth: 300,
        }}
        aria-live="polite"
      >
        {entries.map((entry) => (
          <div key={entry.id} className="ht-killfeed-row">
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
            <Badge tone="neutral">
              <Icon name={entry.weaponId} size={13} />
            </Badge>
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
        ))}
      </div>
    </>
  );
};
