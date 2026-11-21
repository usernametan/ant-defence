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

export const OperatorCard = React.memo<OperatorCardProps>(({
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
          {/* Segmented Pauldrons, Plate Carrier & Collar Gorget */}
          <path
            d="M5 60 C7 44 18 39 32 39 C46 39 57 44 59 60 Z"
            fill="url(#op-armor)"
            stroke="#070B14"
            strokeWidth="2.4"
          />
          <rect x="7" y="45" width="9" height="5" rx="1.5" fill="#38BDF8" stroke="#070B14" strokeWidth="1.4" />
          <rect x="48" y="45" width="9" height="5" rx="1.5" fill="#38BDF8" stroke="#070B14" strokeWidth="1.4" />
          <path d="M20 41 L32 49 L44 41" fill="#0F172A" />
          <rect x="25" y="50" width="14" height="7" rx="1.5" fill="#0F172A" stroke="#38BDF8" strokeWidth="1.2" />
          <rect x="28" y="52" width="8" height="3" rx="0.8" fill="#67E8F9" />
          {/* Whip Antenna & Helmet Crest */}
          <line x1="15" y1="22" x2="12" y2="6" stroke="#94A3B8" strokeWidth="1.8" strokeLinecap="round" />
          <circle cx="12" cy="6" r="1.8" fill="#67E8F9" />
          <rect x="27.5" y="5.5" width="9" height="7.5" rx="2" fill="#67E8F9" stroke="#070B14" strokeWidth="1.8" />
          {/* Ballistic Helmet Shell & Side ARC Rails */}
          <path
            d="M15 29 C15 14 23 8.5 32 8.5 C41 8.5 49 14 49 29 L45.5 41 C40 45 24 45 18.5 41 Z"
            fill="url(#op-armor)"
            stroke="#070B14"
            strokeWidth="2.4"
          />
          {/* Ear-Pro Comm Pods & Tactical Lamp Module */}
          <rect x="11.5" y="23" width="4.5" height="10" rx="1.5" fill="#1E293B" stroke="#070B14" strokeWidth="1.5" />
          <rect x="48" y="23" width="4.5" height="10" rx="1.5" fill="#1E293B" stroke="#070B14" strokeWidth="1.5" />
          <rect x="47.5" y="18" width="4" height="3.5" rx="0.8" fill="#E2E8F0" stroke="#070B14" strokeWidth="1.2" />
          {/* Panoramic HUD Visor + Dual Specular Glints */}
          <path d="M18 22.5 L46 22.5 L43.5 33.5 C37.5 35.8 26.5 35.8 20.5 33.5 Z" fill="#070B14" />
          <path d="M21.5 26.5 L42.5 26.5" stroke="#67E8F9" strokeWidth="2.6" strokeLinecap="round" />
          <path d="M35.5 24.5 L41.5 24.5" stroke="#EAF2FF" strokeWidth="1.5" strokeLinecap="round" opacity="0.9" />
          <path d="M23 29.5 L28 29.5" stroke="#38BDF8" strokeWidth="1.3" strokeLinecap="round" opacity="0.7" />
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
});
