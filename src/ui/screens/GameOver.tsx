import React, { useRef } from 'react';
import { WEAPON_DEFS } from '../../shared/api';
import type { Team, WeaponId } from '../../shared/types';
import {
  AnimatedNumber,
  Badge,
  Button,
  Icon,
  Panel,
  useMenuNavigation,
} from '../design';
import '../ui.css';

export interface MatchStats {
  kills: number;
  deaths: number;
  accuracyPct: number;
  zonesCaptured: number;
  damageDealt: number;
  elapsedSeconds: number;
  bestWeapon: WeaponId;
}

export interface GameOverProps {
  winner: Team;
  playerScore: number;
  enemyScore: number;
  stats: MatchStats;
  onPlayAgain: () => void;
  onChangeSetup: () => void;
  onMainMenu: () => void;
}

function computeGrade(winner: Team, stats: MatchStats): 'S' | 'A' | 'B' | 'C' {
  const kd = stats.kills / Math.max(1, stats.deaths);
  const score =
    (winner === 'player' ? 40 : 10) +
    kd * 18 +
    stats.zonesCaptured * 10 +
    stats.accuracyPct * 0.3;
  if (score >= 95) return 'S';
  if (score >= 72) return 'A';
  if (score >= 50) return 'B';
  return 'C';
}

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export const GameOver: React.FC<GameOverProps> = ({
  winner,
  playerScore,
  enemyScore,
  stats,
  onPlayAgain,
  onChangeSetup,
  onMainMenu,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  useMenuNavigation({ containerRef });

  const isWin = winner === 'player';
  const grade = computeGrade(winner, stats);
  const kd = stats.kills / Math.max(1, stats.deaths);
  const bestWeaponDef = WEAPON_DEFS[stats.bestWeapon];

  return (
    <div ref={containerRef} className="ht-root ht-blur-backdrop">
      <Panel
        bracketed
        tone={isWin ? 'gold' : 'enemy'}
        style={{
          width: 'min(680px, 100%)',
          padding: 28,
          display: 'flex',
          flexDirection: 'column',
          gap: 20,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <Badge tone={isWin ? 'gold' : 'enemy'}>
              {isWin ? 'SECTOR SECURED' : 'SECTOR LOST'}
            </Badge>
            <h1
              className="ht-display"
              style={{
                fontSize: 'clamp(32px, 5vw, 52px)',
                color: isWin ? 'var(--gold)' : 'var(--enemy-glow)',
                marginTop: 4,
              }}
            >
              {isWin ? 'VICTORY' : 'DEFEAT'}
            </h1>
            <div style={{ fontSize: 13, color: 'var(--text-mid)', marginTop: 4 }}>
              Final Score:{' '}
              <span style={{ color: 'var(--player-glow)' }}>
                <AnimatedNumber value={playerScore} />
              </span>{' '}
              —{' '}
              <span style={{ color: 'var(--enemy-glow)' }}>
                <AnimatedNumber value={enemyScore} />
              </span>
            </div>
          </div>

          <div
            className="ht-grade-stamp"
            style={{
              width: 84,
              height: 84,
              borderRadius: 'var(--radius-md)',
              border: `3px solid ${grade === 'S' ? 'var(--gold)' : 'var(--player)'}`,
              display: 'grid',
              placeItems: 'center',
              boxShadow: grade === 'S' ? 'var(--glow-gold)' : 'var(--glow-player)',
              background: 'var(--bg-0)',
            }}
          >
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 9, color: 'var(--text-mid)', letterSpacing: '0.1em' }}>
                GRADE
              </div>
              <div
                className="ht-display"
                style={{
                  fontSize: 40,
                  lineHeight: 1,
                  color: grade === 'S' ? 'var(--gold)' : 'var(--player-glow)',
                }}
              >
                {grade}
              </div>
            </div>
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(135px, 1fr))',
            gap: 10,
          }}
        >
          {[
            { label: 'Kills', val: stats.kills, dec: 0, suffix: '' },
            { label: 'Deaths', val: stats.deaths, dec: 0, suffix: '' },
            { label: 'K/D Ratio', val: kd, dec: 2, suffix: '' },
            { label: 'Accuracy', val: stats.accuracyPct, dec: 0, suffix: '%' },
            { label: 'Zones Captured', val: stats.zonesCaptured, dec: 0, suffix: '' },
            { label: 'Damage Dealt', val: stats.damageDealt, dec: 0, suffix: '' },
          ].map((item, idx) => (
            <Panel
              key={item.label}
              tone="subtle"
              className="ht-stagger"
              style={{ padding: 12, ['--stagger-i' as string]: idx + 1 }}
            >
              <div style={{ fontSize: 10, color: 'var(--text-mid)', textTransform: 'uppercase' }}>
                {item.label}
              </div>
              <div className="ht-display" style={{ fontSize: 22, marginTop: 4 }}>
                <AnimatedNumber
                  value={item.val}
                  decimals={item.dec}
                  suffix={item.suffix}
                  durationMs={520}
                />
              </div>
            </Panel>
          ))}
        </div>

        <Panel
          tone="subtle"
          style={{
            padding: '10px 14px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 10,
          }}
        >
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
            <Icon name={stats.bestWeapon} size={18} color="var(--gold)" />
            Best Weapon:{' '}
            <strong style={{ color: 'var(--text-hi)' }}>{bestWeaponDef.name}</strong>
            <Badge tone={bestWeaponDef.rarity}>{bestWeaponDef.rarity}</Badge>
          </span>
          <span className="ht-num" style={{ fontSize: 12, color: 'var(--text-mid)' }}>
            Match Time: {formatDuration(stats.elapsedSeconds)}
          </span>
        </Panel>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'flex-end' }}>
          <Button variant="ghost" onClick={onMainMenu}>
            Main Menu
          </Button>
          <Button variant="secondary" onClick={onChangeSetup}>
            Change Setup
          </Button>
          <Button variant="primary" onClick={onPlayAgain}>
            <Icon name="play" size={16} /> Play Again
          </Button>
        </div>
      </Panel>
    </div>
  );
};
