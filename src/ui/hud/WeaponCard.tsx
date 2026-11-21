import React from 'react';
import { GRENADE_DEF, WEAPON_DEFS } from '../../shared/api';
import type { WeaponId } from '../../shared/types';
import { AnimatedNumber, Icon } from '../design';

export interface WeaponCardProps {
  weaponId: WeaponId;
  ammoInMag: number;
  reserveAmmo: number;
  grenades?: number;
  maxGrenades?: number;
  grenadeCooldown?: number;
  reloading: boolean;
  reloadProgress: number;
  flipKey: number;
}

const WeaponSilhouette: React.FC<{ weaponId: WeaponId; accent: string }> = ({
  weaponId,
  accent,
}) => {
  const common = {
    width: 96,
    height: 46,
    viewBox: '0 0 96 46',
    'aria-hidden': true,
  };

  switch (weaponId) {
    case 'pistol':
      return (
        <svg {...common}>
          <path d="M22 20 H44 L39 25 H33 L28 38 H18 L22 21 Z" fill="#3B4963" />
          <path d="M19 12 H72 V20 H19 Z M72 14 H78 V17 H72 Z" fill="#D5E0F0" />
          <rect x="34" y="13.5" width="9" height="2.5" rx="0.5" fill="#64748B" />
          <rect x="68" y="9.5" width="3" height="2.5" rx="0.5" fill={accent} />
        </svg>
      );
    case 'smg':
      return (
        <svg {...common}>
          <path d="M10 17 H20 V22 H10 Z M44 22 H52 L48 36 H40 Z M24 22 H32 L28 36 H20 Z" fill="#3B4963" />
          <path d="M18 14 H68 V22 H18 Z M68 16 H84 V20 H68 Z" fill="#D5E0F0" />
          <rect x="36" y="9" width="16" height="5" rx="1" fill="#1E293B" />
          <rect x="42" y="10.5" width="5" height="2" rx="0.5" fill={accent} />
          <rect x="55" y="15.5" width="10" height="3" fill="#64748B" />
        </svg>
      );
    case 'shotgun':
      return (
        <svg {...common}>
          <path d="M6 23 L23 16 H35 V24 L26 33 H12 L17 25 H6 Z" fill="#8B5A2B" />
          <rect x="46" y="21" width="24" height="5" rx="1.5" fill="#A66E38" />
          <path d="M24 15 H84 V20 H24 Z" fill="#D5E0F0" />
          <rect x="40" y="16" width="10" height="2.5" fill="#475569" />
          <rect x="81" y="13" width="3" height="2" fill={accent} />
        </svg>
      );
    case 'rifle':
      return (
        <svg {...common}>
          <path d="M6 17 H20 V24 H13 L8 31 H6 Z M46 23 H54 L57 36 H49 Z M28 23 H36 L33 33 H25 Z" fill="#3B4963" />
          <path d="M18 15 H72 V23 H18 Z M72 17.5 H88 V20.5 H72 Z" fill="#D5E0F0" />
          <rect x="36" y="9.5" width="18" height="5.5" rx="1" fill="#1E293B" />
          <rect x="42" y="11" width="6" height="2.2" fill={accent} />
          <rect x="56" y="17" width="12" height="3.5" fill="#64748B" />
        </svg>
      );
    case 'sniper':
      return (
        <svg {...common}>
          <path d="M4 20 H22 V26 H14 L8 33 H4 Z M38 25 H46 L42 35 H34 Z M60 24 H64 L68 31 H64 Z" fill="#3B4963" />
          <path d="M20 18 H68 V24 H20 Z M68 19.5 H90 V22 H68 Z M88 18 H93 V23.5 H88 Z" fill="#D5E0F0" />
          <rect x="30" y="10" width="28" height="6" rx="1.5" fill="#1E293B" />
          <rect x="55" y="10.8" width="4" height="4.4" rx="0.5" fill="#C26BFF" />
          <rect x="36" y="12" width="10" height="2" fill={accent} />
        </svg>
      );
    case 'rocket':
      return (
        <svg {...common}>
          <rect x="6" y="12" width="6" height="17" rx="1" fill="#334155" />
          <path d="M12 13 H72 V28 H12 Z" fill="#64748B" />
          <rect x="26" y="12" width="5" height="19" fill="#334155" />
          <rect x="52" y="12" width="5" height="19" fill="#334155" />
          <rect x="36" y="7" width="12" height="6" rx="1" fill="#1E293B" />
          <rect x="40" y="9" width="4" height="2.5" fill={accent} />
          <path d="M72 14 L88 20.5 L72 27 Z" fill={accent} />
          <path d="M22 28 L17 37 H25 L29 28 Z M48 28 L51 37 H58 L55 28 Z" fill="#3B4963" />
        </svg>
      );
  }
};

export const WeaponCard: React.FC<WeaponCardProps> = ({
  weaponId,
  ammoInMag,
  reserveAmmo,
  grenades = GRENADE_DEF.defaultCount,
  maxGrenades = GRENADE_DEF.defaultCount,
  grenadeCooldown = 0,
  reloading,
  reloadProgress,
  flipKey,
}) => {
  const def = WEAPON_DEFS[weaponId];
  const isLowAmmo = ammoInMag <= Math.max(1, Math.floor(def.magSize * 0.25));
  const magPct = def.magSize > 0 ? Math.max(0, Math.min(100, (ammoInMag / def.magSize) * 100)) : 0;
  const rarityAccent =
    def.rarity === 'epic'
      ? 'var(--epic)'
      : def.rarity === 'rare'
        ? 'var(--rare)'
        : 'var(--player-glow)';
  const showPips = def.magSize <= 12;

  return (
    <div
      key={flipKey}
      className="ht-chamfer-panel ht-weapon-card ht-weapon-flip"
      style={{
        borderColor:
          def.rarity === 'epic'
            ? 'rgba(194, 107, 255, 0.5)'
            : def.rarity === 'rare'
              ? 'rgba(79, 140, 255, 0.45)'
              : undefined,
      }}
    >
      <div className="ht-weapon-silhouette" title={def.name}>
        <WeaponSilhouette
          weaponId={weaponId}
          accent={
            def.rarity === 'epic'
              ? '#C26BFF'
              : def.rarity === 'rare'
                ? '#4F8CFF'
                : '#67E8F9'
          }
        />
      </div>

      <div className="ht-weapon-ammo-block">
        <div className="ht-weapon-ammo-nums">
          <span
            className="ht-display"
            style={{
              fontSize: 32,
              lineHeight: 0.95,
              color: isLowAmmo ? 'var(--danger)' : 'var(--text-hi)',
            }}
          >
            <AnimatedNumber value={ammoInMag} durationMs={110} />
          </span>
          <span className="ht-num" style={{ fontSize: 15, color: 'var(--text-mid)' }}>
            / <AnimatedNumber value={reserveAmmo} durationMs={140} />
          </span>
        </div>

        <div className="ht-weapon-meta-row">
          <span
            className="ht-display"
            style={{
              fontSize: 10,
              color: rarityAccent,
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

        {reloading ? (
          <div className="ht-weapon-reload-bar">
            <div
              className="ht-weapon-reload-fill"
              style={{ width: `${Math.round(reloadProgress * 100)}%` }}
            />
          </div>
        ) : showPips ? (
          <div className="ht-weapon-pips" aria-label="Magazine rounds">
            {Array.from({ length: def.magSize }, (_, idx) => {
              const filled = idx < ammoInMag;
              return (
                <span
                  key={idx}
                  className={`ht-weapon-pip ${filled ? 'is-filled' : ''} ${isLowAmmo && filled ? 'is-danger' : ''}`}
                />
              );
            })}
          </div>
        ) : (
          <div className="ht-weapon-mag-bar">
            <div
              className="ht-weapon-mag-fill"
              style={{
                width: `${magPct}%`,
                background: isLowAmmo ? 'var(--danger)' : 'var(--player-glow)',
              }}
            />
          </div>
        )}
      </div>

      <div className="ht-weapon-grenade-block" title={`Frag Grenades (Press G): ${grenades}/${maxGrenades}`}>
        <div className="ht-weapon-grenade-top">
          <Icon
            name="grenade"
            size={18}
            color={grenades > 0 ? 'var(--gold)' : 'var(--text-low)'}
          />
          <span
            className="ht-display"
            style={{
              fontSize: 22,
              lineHeight: 1,
              color: grenades > 0 ? 'var(--text-hi)' : 'var(--text-low)',
            }}
          >
            {grenades}
          </span>
        </div>
        <div className="ht-weapon-grenade-pips" aria-label="Remaining grenades">
          {Array.from({ length: maxGrenades }, (_, idx) => (
            <span
              key={idx}
              className={`ht-weapon-grenade-pip ${idx < grenades ? 'is-ready' : ''}`}
            />
          ))}
        </div>
        <span
          className="ht-weapon-grenade-key"
          style={{
            color: grenades > 0 && grenadeCooldown > 0.05 ? 'var(--gold)' : undefined,
          }}
        >
          {grenades > 0 && grenadeCooldown > 0.05
            ? `${grenadeCooldown.toFixed(1)}s`
            : '[G] FRAG'}
        </span>
      </div>
    </div>
  );
};
