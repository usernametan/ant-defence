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
      className={`ht-chamfer-panel ht-operator-wrap ${isLowHp ? 'ht-is-lowhp' : ''} ${regenGlow ? 'ht-is-regen' : ''} ${damageFlash ? 'ht-is-damage-flash' : ''}`}
    >
      {/* Tactical Trooper Portrait */}
      <div className="ht-operator-portrait">
        <svg viewBox="0 0 64 64" width={54} height={54} aria-hidden="true">
          <defs>
            <linearGradient id="op-armor" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#38BDF8" />
              <stop offset="100%" stopColor="#1D4ED8" />
            </linearGradient>
          </defs>
          {/* Pauldrons & Collar */}
          <path
            d="M6 60 C9 45 20 40 32 40 C44 40 55 45 58 60 Z"
            fill="url(#op-armor)"
            stroke="#070B14"
            strokeWidth="2.4"
          />
          <path d="M22 42 L32 49 L42 42" fill="#0F172A" />
          {/* Helmet Crest & Shell */}
          <rect x="28" y="6" width="8" height="7" rx="2" fill="#67E8F9" stroke="#070B14" strokeWidth="1.8" />
          <path
            d="M16 30 C16 15 23 9 32 9 C41 9 48 15 48 30 L45 41 C40 45 24 45 19 41 Z"
            fill="url(#op-armor)"
            stroke="#070B14"
            strokeWidth="2.4"
          />
          {/* Ear Comm Pods */}
          <rect x="13" y="24" width="4" height="9" rx="1.5" fill="#1E293B" stroke="#070B14" strokeWidth="1.5" />
          <rect x="47" y="24" width="4" height="9" rx="1.5" fill="#1E293B" stroke="#070B14" strokeWidth="1.5" />
          {/* Tactical Visor + Specular Glint */}
          <path d="M19 23 L45 23 L43 33 C37 35 27 35 21 33 Z" fill="#070B14" />
          <path d="M22 26.5 L42 26.5" stroke="#67E8F9" strokeWidth="2.4" strokeLinecap="round" />
          <path d="M36 24.5 L42 24.5" stroke="#EAF2FF" strokeWidth="1.4" strokeLinecap="round" opacity="0.85" />
        </svg>
        <div className="ht-operator-lvl">LV.{level}</div>
      </div>

      {/* Vitals & Base Core Shield Bars */}
      <div className="ht-operator-bars">
        <div className="ht-vital-row">
          <span
            className="ht-vital-icon"
            style={{ color: isLowHp ? 'var(--danger)' : 'var(--success)' }}
          >
            +
          </span>
          <div className="ht-vital-track-col">
            <div className="ht-vital-nums">
              <AnimatedNumber value={hp} className="ht-vital-cur" />
              <span className="ht-vital-max">/{maxHp}</span>
              <span
                className="ht-vital-tag"
                style={{
                  color: isLowHp
                    ? 'var(--danger)'
                    : regenGlow
                      ? 'var(--success)'
                      : 'var(--text-low)',
                }}
              >
                {isLowHp ? 'LOW HP' : regenGlow ? 'REGEN' : 'HP'}
              </span>
            </div>
            <div className="ht-vital-track">
              <div
                className="ht-vital-fill"
                style={{
                  width: `${hpPct}%`,
                  background: isLowHp
                    ? 'linear-gradient(90deg, #F43F5E, #FF8A6B)'
                    : 'linear-gradient(90deg, #10B981, #34D399)',
                  boxShadow: isLowHp
                    ? '0 0 10px rgba(244,63,94,0.65)'
                    : '0 0 10px rgba(52,211,153,0.45)',
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
              <span className="ht-vital-tag" style={{ color: 'var(--text-low)' }}>
                CORE
              </span>
            </div>
            <div className="ht-vital-track">
              <div
                className="ht-vital-fill"
                style={{
                  width: `${shieldPct}%`,
                  background: 'linear-gradient(90deg, #0284C7, #38BDF8)',
                  boxShadow: '0 0 10px rgba(34,211,238,0.4)',
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
