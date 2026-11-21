import React, { useEffect, useRef } from 'react';
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
  reloadProgress?: number | null;
  isLowAmmo?: boolean;
  scoped?: boolean;
}

export const CrosshairGlyph: React.FC<CrosshairGlyphProps> = ({
  style,
  gap,
  hitFlash,
  reloadProgress = null,
  isLowAmmo = false,
  scoped = false,
}) => {
  const stroke = isLowAmmo && reloadProgress === null ? 'var(--gold)' : 'var(--player-glow)';
  const g = Math.max(4, Math.min(26, gap));
  const reloadRadius = 19;
  const reloadCirc = 2 * Math.PI * reloadRadius;

  return (
    <svg
      width={68}
      height={68}
      viewBox="-34 -34 68 68"
      style={{
        overflow: 'visible',
        pointerEvents: 'none',
        filter: 'drop-shadow(0 0 1.5px #070B14) drop-shadow(0 0 2.5px rgba(7, 11, 20, 0.9))',
      }}
      aria-hidden="true"
    >
      {style === 'tactical' && (
        <g stroke={stroke} strokeWidth={2} strokeLinecap="round">
          <line x1={0} y1={-g - 7} x2={0} y2={-g} />
          <line x1={0} y1={g} x2={0} y2={g + 7} />
          <line x1={-g - 7} y1={0} x2={-g} y2={0} />
          <line x1={g} y1={0} x2={g + 7} y2={0} />
          <circle cx={0} cy={0} r={1.6} fill={stroke} />
        </g>
      )}
      {style === 'dot' && (
        <g>
          <circle cx={0} cy={0} r={2.6} fill={stroke} />
          <circle
            cx={0}
            cy={0}
            r={Math.max(5, g * 0.65)}
            fill="none"
            stroke="rgba(103, 232, 249, 0.42)"
            strokeWidth={1.2}
          />
        </g>
      )}
      {style === 'chevron' && (
        <g stroke={stroke} strokeWidth={2.1} fill="none" strokeLinecap="round">
          <polyline points={`${-7},${4 + g * 0.25} 0,${-3} ${7},${4 + g * 0.25}`} />
          <circle cx={0} cy={0} r={1.4} fill={stroke} />
        </g>
      )}
      {style === 'ring' && (
        <g stroke={stroke} strokeWidth={1.9} fill="none">
          <circle cx={0} cy={0} r={Math.max(6, g * 0.9)} />
          <circle cx={0} cy={0} r={1.6} fill={stroke} />
        </g>
      )}

      {scoped && (
        <g stroke="var(--player-glow)" fill="none" opacity={0.78}>
          <circle cx={0} cy={0} r={24} strokeWidth={1.3} strokeDasharray="7 5" />
          <line x1={0} y1={-29} x2={0} y2={-23} strokeWidth={1.6} strokeLinecap="round" />
          <line x1={0} y1={23} x2={0} y2={29} strokeWidth={1.6} strokeLinecap="round" />
          <line x1={-29} y1={0} x2={-23} y2={0} strokeWidth={1.6} strokeLinecap="round" />
          <line x1={23} y1={0} x2={29} y2={0} strokeWidth={1.6} strokeLinecap="round" />
        </g>
      )}

      {reloadProgress !== null && reloadProgress >= 0 && (
        <g>
          <circle
            cx={0}
            cy={0}
            r={reloadRadius}
            fill="none"
            stroke="rgba(15, 23, 42, 0.7)"
            strokeWidth={2.6}
          />
          <circle
            cx={0}
            cy={0}
            r={reloadRadius}
            fill="none"
            stroke="var(--gold)"
            strokeWidth={2.4}
            strokeLinecap="round"
            strokeDasharray={reloadCirc}
            strokeDashoffset={reloadCirc * (1 - Math.min(1, reloadProgress))}
            transform="rotate(-90)"
          />
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
  screenPos?: { x: number; y: number } | null;
  subscribeScreenPos?: (
    listener: (pos: { x: number; y: number } | null) => void,
  ) => () => void;
  style: CrosshairStyle;
  gap: number;
  hitFlash: 'hit' | 'kill' | null;
  damageIndicators: DamageIndicator[];
  reloadProgress?: number | null;
  isLowAmmo?: boolean;
  scoped?: boolean;
}

export const CrosshairOverlay = React.memo<CrosshairOverlayProps>(({
  screenPos = null,
  subscribeScreenPos,
  style,
  gap,
  hitFlash,
  damageIndicators,
  reloadProgress = null,
  isLowAmmo = false,
  scoped = false,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const lastPosRef = useRef<{ x: number; y: number } | null>(screenPos);
  if (screenPos) lastPosRef.current = screenPos;
  const activePos = screenPos ?? lastPosRef.current;
  const x = activePos?.x ?? (typeof window !== 'undefined' ? window.innerWidth * 0.5 : 640);
  const y = activePos?.y ?? (typeof window !== 'undefined' ? window.innerHeight * 0.5 : 360);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || !subscribeScreenPos) return;
    return subscribeScreenPos((pos) => {
      if (!pos) return;
      lastPosRef.current = pos;
      el.style.transform = `translate3d(${pos.x - 34}px, ${pos.y - 34}px, 0)`;
    });
  }, [subscribeScreenPos]);

  return (
    <div
      ref={containerRef}
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
      <CrosshairGlyph
        style={style}
        gap={gap}
        hitFlash={hitFlash}
        reloadProgress={reloadProgress}
        isLowAmmo={isLowAmmo}
        scoped={scoped}
      />

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
});
