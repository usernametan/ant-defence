import React from 'react';
import { WEAPON_DEFS } from '../../shared/api';
import type { WeaponId } from '../../shared/types';
import { AnimatedNumber } from '../design';

export interface WeaponCardProps {
  weaponId: WeaponId;
  ammoInMag: number;
  reserveAmmo: number;
  reloading: boolean;
  reloadProgress: number;
  flipKey: number;
}

const WeaponSilhouette: React.FC<{ weaponId: WeaponId }> = ({ weaponId }) => {
  const common = {
    width: 88,
    height: 44,
    viewBox: '0 0 88 44',
    fill: 'currentColor',
    'aria-hidden': true,
  };

  switch (weaponId) {
    case 'pistol':
      return (
        <svg {...common}>
          <path d="M18 11 H66 V19 H42 L38 23 H31 L27 36 H17 L21 19 H18 Z M66 13 H72 V16 H66 Z" />
        </svg>
      );
    case 'smg':
      return (
        <svg {...common}>
          <path d="M10 14 H62 V21 H48 L45 33 H39 L41 21 H28 L24 34 H16 L20 21 H10 Z M62 16 H78 V19 H62 Z M32 10 H48 V14 H32 Z" />
        </svg>
      );
    case 'shotgun':
      return (
        <svg {...common}>
          <path d="M6 21 L22 15 H78 V20 H44 L34 25 L26 32 H12 L17 24 H6 Z M44 21 H68 V24 H44 Z" />
        </svg>
      );
    case 'rifle':
      return (
        <svg {...common}>
          <path d="M6 16 H68 V22 H50 L47 34 H40 L42 22 H27 L20 31 H12 L16 22 H6 Z M68 18 H82 V20 H68 Z M34 11 H50 V16 H34 Z" />
        </svg>
      );
    case 'sniper':
      return (
        <svg {...common}>
          <path d="M4 19 H66 V24 H44 L39 33 H32 L35 24 H21 L12 31 H6 L11 23 H4 Z M66 20 H86 V22 H66 Z M28 12 H52 V17 H28 Z" />
        </svg>
      );
    case 'rocket':
      return (
        <svg {...common}>
          <path d="M8 13 H70 V26 H8 Z M70 15 L82 19.5 L70 24 Z M22 26 L16 35 H24 L30 26 Z M48 26 L52 35 H59 L55 26 Z" />
        </svg>
      );
  }
};

export const WeaponCard: React.FC<WeaponCardProps> = ({
  weaponId,
  ammoInMag,
  reserveAmmo,
  reloading,
  reloadProgress,
  flipKey,
}) => {
  const def = WEAPON_DEFS[weaponId];
  const isLowAmmo = ammoInMag <= Math.max(1, Math.floor(def.magSize * 0.25));

  return (
    <div
      key={flipKey}
      className="ht-chamfer-panel ht-weapon-card ht-weapon-flip"
      style={{
        borderColor:
          def.rarity === 'epic'
            ? 'var(--epic)'
            : def.rarity === 'rare'
              ? 'var(--rare)'
              : 'var(--player)',
      }}
    >
      <div className="ht-weapon-silhouette" title={def.name}>
        <WeaponSilhouette weaponId={weaponId} />
      </div>

      <div className="ht-weapon-ammo-block">
        <div className="ht-weapon-ammo-nums">
          <span
            className="ht-display"
            style={{
              fontSize: 30,
              lineHeight: 1,
              color: isLowAmmo ? 'var(--danger)' : 'var(--text-hi)',
            }}
          >
            <AnimatedNumber value={ammoInMag} durationMs={110} />
          </span>
          <span className="ht-num" style={{ fontSize: 16, color: 'var(--text-mid)' }}>
            / <AnimatedNumber value={reserveAmmo} durationMs={140} />
          </span>
        </div>

        <div className="ht-weapon-meta-row">
          <span
            className="ht-display"
            style={{
              fontSize: 10,
              color:
                def.rarity === 'epic'
                  ? 'var(--epic)'
                  : def.rarity === 'rare'
                    ? 'var(--rare)'
                    : 'var(--player-glow)',
            }}
          >
            {def.name}
          </span>
          {reloading && (
            <span style={{ fontSize: 10, color: 'var(--gold)', fontWeight: 700 }}>
              {Math.round(reloadProgress * 100)}%
            </span>
          )}
        </div>

        {reloading && (
          <div className="ht-weapon-reload-bar">
            <div
              className="ht-weapon-reload-fill"
              style={{ width: `${Math.round(reloadProgress * 100)}%` }}
            />
          </div>
        )}
      </div>
    </div>
  );
};
