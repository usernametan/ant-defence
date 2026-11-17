import React from 'react';
import type { CrosshairStyle } from '../settingsStore';

export interface DamageIndicator {
  id: number;
  angleRad: number;
  ttl: number;
}

export interface CrosshairGlyphProps {
  style: CrosshairStyle;
  gap: number;
  hitFlash: 'hit' | 'kill' | null;
}

export const CrosshairGlyph: React.FC<CrosshairGlyphProps> = ({
  style,
  gap,
  hitFlash,
}) => {
  const stroke = 'var(--player-glow)';
  const g = Math.max(4, Math.min(26, gap));

  return (
    <svg
      width={68}
      height={68}
      viewBox="-34 -34 68 68"
      style={{ overflow: 'visible', pointerEvents: 'none' }}
      aria-hidden="true"
    >
      {style === 'tactical' && (
        <g stroke={stroke} strokeWidth={2} strokeLinecap="round">
          <line x1={0} y1={-g - 7} x2={0} y2={-g} />
          <line x1={0} y1={g} x2={0} y2={g + 7} />
          <line x1={-g - 7} y1={0} x2={-g} y2={0} />
          <line x1={g} y1={0} x2={g + 7} y2={0} />
          <circle cx={0} cy={0} r={1.5} fill={stroke} />
        </g>
      )}
      {style === 'dot' && (
        <g>
          <circle cx={0} cy={0} r={2.5} fill={stroke} />
          <circle
            cx={0}
            cy={0}
            r={Math.max(5, g * 0.65)}
            fill="none"
            stroke="rgba(103, 232, 249, 0.35)"
            strokeWidth={1}
          />
        </g>
      )}
      {style === 'chevron' && (
        <g stroke={stroke} strokeWidth={2} fill="none" strokeLinecap="round">
          <polyline points={`${-7},${4 + g * 0.25} 0,${-3} ${7},${4 + g * 0.25}`} />
          <circle cx={0} cy={0} r={1.3} fill={stroke} />
        </g>
      )}
      {style === 'ring' && (
        <g stroke={stroke} strokeWidth={1.8} fill="none">
          <circle cx={0} cy={0} r={Math.max(6, g * 0.9)} />
          <circle cx={0} cy={0} r={1.5} fill={stroke} />
        </g>
      )}

      {hitFlash && (
        <g
          stroke={hitFlash === 'kill' ? 'var(--gold)' : 'var(--text-hi)'}
          strokeWidth={hitFlash === 'kill' ? 2.6 : 2}
          strokeLinecap="round"
        >
          <line x1={-11} y1={-11} x2={-5} y2={-5} />
          <line x1={11} y1={-11} x2={5} y2={-5} />
          <line x1={-11} y1={11} x2={-5} y2={5} />
          <line x1={11} y1={11} x2={5} y2={5} />
        </g>
      )}
    </svg>
  );
};

export interface CrosshairOverlayProps {
  screenPos: { x: number; y: number } | null;
  style: CrosshairStyle;
  gap: number;
  hitFlash: 'hit' | 'kill' | null;
  damageIndicators: DamageIndicator[];
}

export const CrosshairOverlay: React.FC<CrosshairOverlayProps> = ({
  screenPos,
  style,
  gap,
  hitFlash,
  damageIndicators,
}) => {
  const x = screenPos?.x ?? (typeof window !== 'undefined' ? window.innerWidth * 0.5 : 640);
  const y = screenPos?.y ?? (typeof window !== 'undefined' ? window.innerHeight * 0.5 : 360);

  return (
    <div
      style={{
        position: 'fixed',
        left: 0,
        top: 0,
        transform: `translate3d(${x - 34}px, ${y - 34}px, 0)`,
        pointerEvents: 'none',
        zIndex: 'var(--z-overlay)',
      }}
      aria-hidden="true"
    >
      <CrosshairGlyph style={style} gap={gap} hitFlash={hitFlash} />

      {/* Damage direction arcs around crosshair */}
      {damageIndicators.map((ind) => (
        <svg
          key={ind.id}
          width={140}
          height={140}
          viewBox="-70 -70 140 140"
          style={{
            position: 'absolute',
            left: -36,
            top: -36,
            opacity: Math.min(1, ind.ttl * 1.4),
            transform: `rotate(${ind.angleRad}rad)`,
            pointerEvents: 'none',
          }}
        >
          <path
            d="M 46 -22 A 51 51 0 0 1 46 22"
            fill="none"
            stroke="var(--danger)"
            strokeWidth={5}
            strokeLinecap="round"
          />
        </svg>
      ))}
    </div>
  );
};
