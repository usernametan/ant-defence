import React from 'react';
import { AnimatedNumber } from '../design';

export interface OperatorCardProps {
  hp: number;
  maxHp: number;
  shield: number;
  maxShield: number;
  level?: number;
  isLowHp: boolean;
  damageFlash: boolean;
  regenGlow: boolean;
}

export const OperatorCard: React.FC<OperatorCardProps> = ({
  hp,
  maxHp,
  shield,
  maxShield,
  level = 1,
  isLowHp,
  damageFlash,
  regenGlow,
}) => {
  const hpPct = maxHp > 0 ? Math.max(0, Math.min(100, (hp / maxHp) * 100)) : 0;
  const shieldPct =
    maxShield > 0 ? Math.max(0, Math.min(100, (shield / maxShield) * 100)) : 0;

  return (
    <div
      className={`ht-operator-wrap ${isLowHp ? 'ht-is-lowhp' : ''} ${regenGlow ? 'ht-is-regen' : ''} ${damageFlash ? 'ht-is-damage-flash' : ''}`}
    >
      {/* Chamfered Operator Helmet Portrait */}
      <div className="ht-operator-portrait">
        <svg viewBox="0 0 64 64" width={54} height={54} aria-hidden="true">
          <defs>
            <linearGradient id="op-armor" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#38BDF8" />
              <stop offset="100%" stopColor="#1D4ED8" />
            </linearGradient>
          </defs>
          {/* Shoulders */}
          <path
            d="M8 60 C10 46 20 42 32 42 C44 42 54 46 56 60 Z"
            fill="url(#op-armor)"
            stroke="#070B14"
            strokeWidth="2.5"
          />
          {/* Helmet */}
          <path
            d="M17 30 C17 16 24 10 32 10 C40 10 47 16 47 30 L45 41 C40 45 24 45 19 41 Z"
            fill="url(#op-armor)"
            stroke="#070B14"
            strokeWidth="2.5"
          />
          {/* Visor */}
          <path
            d="M20 24 L44 24 L42 33 C36 35 28 35 22 33 Z"
            fill="#070B14"
          />
          <path
            d="M23 26 L41 26"
            stroke="#67E8F9"
            strokeWidth="2"
            strokeLinecap="round"
            opacity="0.75"
          />
        </svg>
        <div className="ht-operator-lvl">Lv. {level}</div>
      </div>

      {/* Vitals & Shield Bars */}
      <div className="ht-operator-bars">
        <div className="ht-vital-row">
          <span className="ht-vital-icon" style={{ color: isLowHp ? 'var(--danger)' : 'var(--success)' }}>
            +
          </span>
          <div className="ht-vital-track-col">
            <div className="ht-vital-nums">
              <AnimatedNumber value={hp} className="ht-vital-cur" />
              <span className="ht-vital-max">/{maxHp}</span>
            </div>
            <div className="ht-vital-track">
              <div
                className="ht-vital-fill"
                style={{
                  width: `${hpPct}%`,
                  background: isLowHp
                    ? 'linear-gradient(90deg, #F43F5E, #FF8A6B)'
                    : 'linear-gradient(90deg, #22C55E, #4ADE80)',
                  boxShadow: isLowHp
                    ? '0 0 10px rgba(244,63,94,0.65)'
                    : '0 0 10px rgba(52,211,153,0.5)',
                }}
              />
            </div>
          </div>
        </div>

        <div className="ht-vital-row">
          <svg
            width={15}
            height={15}
            viewBox="0 0 24 24"
            fill="var(--player)"
            aria-hidden="true"
          >
            <path d="M12 2L4 5v6.5c0 5 3.4 9.5 8 10.5 4.6-1 8-5.5 8-10.5V5l-8-3z" />
          </svg>
          <div className="ht-vital-track-col">
            <div className="ht-vital-nums">
              <AnimatedNumber value={shield} className="ht-vital-cur" />
              <span className="ht-vital-max">/{maxShield}</span>
            </div>
            <div className="ht-vital-track">
              <div
                className="ht-vital-fill"
                style={{
                  width: `${shieldPct}%`,
                  background: 'linear-gradient(90deg, #0EA5E9, #38BDF8)',
                  boxShadow: '0 0 10px rgba(34,211,238,0.5)',
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
