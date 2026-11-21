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
          {/* Polymer grip, mag baseplate & trigger guard */}
          <path d="M22 21 H42 L37 26 H31 L27 40 H16 L21 22 Z" fill="#293548" />
          <rect x="15" y="39" width="13" height="2.5" rx="0.8" fill="#0F172A" />
          <path d="M31 23 H39 V28 H31 Z" fill="none" stroke="#475569" strokeWidth="1.5" />
          {/* Underbarrel accessory rail + laser module */}
          <rect x="42" y="20" width="24" height="5" rx="1" fill="#334155" />
          <rect x="64" y="21" width="3" height="3" rx="0.6" fill={accent} />
          {/* Machined stainless slide + serrations & ejection port */}
          <rect x="18" y="11" width="54" height="10" rx="1.5" fill="#DCE6F5" />
          <rect x="36" y="12.5" width="12" height="3.2" rx="0.6" fill="#334155" />
          <path d="M22 13 V19 M25 13 V19 M28 13 V19 M31 13 V19" stroke="#64748B" strokeWidth="1.3" />
          {/* Threaded barrel & tritium sights */}
          <rect x="72" y="13.5" width="6" height="5" rx="0.8" fill="#64748B" />
          <rect x="20" y="9" width="3" height="2" rx="0.4" fill="#475569" />
          <rect x="67" y="8.8" width="3.5" height="2.2" rx="0.5" fill={accent} />
        </svg>
      );
    case 'smg':
      return (
        <svg {...common}>
          {/* Collapsible PDW stock & dual rails */}
          <rect x="6" y="15" width="4" height="13" rx="1" fill="#0F172A" />
          <rect x="10" y="17" width="10" height="2.2" fill="#475569" />
          <rect x="10" y="22" width="10" height="2.2" fill="#475569" />
          {/* Pistol grip & forward angled stick magazine */}
          <path d="M23 23 H31 L27 37 H19 Z" fill="#293548" />
          <path d="M46 23 H54 L51 39 H43 Z" fill="#1E293B" />
          <rect x="46" y="27" width="3" height="8" rx="0.6" fill={accent} opacity="0.85" />
          {/* Monolithic upper receiver & ventilated shroud */}
          <rect x="18" y="13.5" width="52" height="10" rx="1.5" fill="#D5E0F0" />
          <rect x="20" y="20" width="48" height="3.5" fill="#334155" />
          <rect x="50" y="15.5" width="4" height="2.5" rx="0.6" fill="#0F172A" />
          <rect x="57" y="15.5" width="4" height="2.5" rx="0.6" fill="#0F172A" />
          <rect x="64" y="15.5" width="4" height="2.5" rx="0.6" fill="#0F172A" />
          {/* Reflex red-dot sight & tri-lug compensator */}
          <rect x="33" y="8" width="16" height="5.5" rx="1" fill="#0F172A" />
          <rect x="38" y="9.5" width="6" height="2.4" rx="0.5" fill={accent} />
          <rect x="70" y="15.5" width="14" height="5.5" rx="1" fill="#64748B" />
          <rect x="75" y="16.8" width="4" height="3" fill="#0F172A" />
        </svg>
      );
    case 'shotgun':
      return (
        <svg {...common}>
          {/* Contoured combat buttstock + recoil pad */}
          <path d="M4 23 L19 17 H24 V24 L17 31 L4 32 Z" fill="#7C4A21" />
          <rect x="2" y="23" width="3" height="9" rx="0.8" fill="#0F172A" />
          {/* Machined receiver + silver bolt & side-saddle shells */}
          <rect x="22" y="14.5" width="24" height="8.5" rx="1.2" fill="#D5E0F0" />
          <rect x="29" y="16" width="10" height="2.6" rx="0.5" fill="#F8FAFC" />
          <rect x="25" y="20" width="2.5" height="2.2" fill="#DC2626" />
          <rect x="29" y="20" width="2.5" height="2.2" fill="#DC2626" />
          <rect x="33" y="20" width="2.5" height="2.2" fill="#DC2626" />
          {/* Long barrel with ventilated top rib & underbarrel mag tube */}
          <rect x="46" y="14.5" width="41" height="3.8" fill="#CBD5E1" />
          <rect x="46" y="18.8" width="35" height="3.2" fill="#475569" />
          {/* Ribbed pump forend & breacher muzzle choke */}
          <rect x="49" y="18" width="21" height="6.2" rx="1.2" fill="#8F582A" />
          <path d="M53 18.5 V24 M57 18.5 V24 M61 18.5 V24 M65 18.5 V24" stroke="#3B2311" strokeWidth="1.5" />
          <rect x="87" y="14" width="5" height="4.8" fill="#1E293B" />
          <rect x="82" y="12.4" width="3.5" height="2" rx="0.4" fill={accent} />
        </svg>
      );
    case 'rifle':
      return (
        <svg {...common}>
          {/* Crane tactical stock, grip & curved STANAG magazine */}
          <path d="M5 16 H20 V24 H13 L8 31 H5 Z" fill="#1E293B" />
          <rect x="3" y="16" width="2.5" height="15" rx="0.8" fill="#0F172A" />
          <path d="M27 23 H35 L31 35 H24 Z" fill="#293548" />
          <path d="M45 23 H54 L58 38 H49 Z" fill="#334155" />
          <rect x="48" y="28" width="6" height="2.2" rx="0.5" fill={accent} />
          {/* Forged receiver & M-LOK free-float handguard */}
          <rect x="19" y="14.5" width="54" height="9" rx="1.2" fill="#DCE6F5" />
          <rect x="20" y="20" width="52" height="3.5" fill="#334155" />
          <rect x="52" y="16.2" width="5" height="2.2" rx="0.5" fill="#0F172A" />
          <rect x="60" y="16.2" width="5" height="2.2" rx="0.5" fill="#0F172A" />
          <rect x="68" y="16.2" width="4" height="2.2" rx="0.5" fill="#0F172A" />
          {/* Holographic sight, PEQ laser box & compensator brake */}
          <rect x="33" y="8.5" width="18" height="6" rx="1.2" fill="#0F172A" />
          <rect x="39" y="10.2" width="7" height="2.5" rx="0.5" fill={accent} />
          <rect x="60" y="11" width="9" height="3.5" rx="0.8" fill="#1E293B" />
          <rect x="73" y="16.5" width="13" height="4.2" fill="#64748B" />
          <rect x="86" y="15.8" width="6" height="5.6" rx="0.8" fill="#1E293B" />
        </svg>
      );
    case 'sniper':
      return (
        <svg {...common}>
          {/* Precision chassis stock with cheek riser & grip */}
          <path d="M3 19 H21 V26 H14 L8 33 H3 Z" fill="#1E293B" />
          <rect x="7" y="16.5" width="11" height="3" rx="0.8" fill="#475569" />
          <path d="M24 24 H31 L28 34 H21 Z" fill="#293548" />
          <rect x="39" y="24" width="11" height="10" rx="1" fill="#334155" />
          {/* Machined chassis receiver, fluted bull barrel & arrowhead brake */}
          <rect x="19" y="17.5" width="46" height="7" rx="1.2" fill="#D5E0F0" />
          <rect x="65" y="19" width="23" height="3.5" fill="#94A3B8" />
          <path d="M88 17 L94 18.5 V23 L88 24.5 Z" fill="#0F172A" />
          {/* Folded bipod & high-magnification telescopic scope */}
          <path d="M56 24.5 H66 L69 31 H64 L61 26 H56 Z" fill="#475569" />
          <rect x="28" y="9" width="32" height="6.5" rx="1.5" fill="#0F172A" />
          <rect x="35" y="15.5" width="3.5" height="2.2" fill="#475569" />
          <rect x="50" y="15.5" width="3.5" height="2.2" fill="#475569" />
          <rect x="42" y="7" width="4.5" height="2.2" fill="#475569" />
          <rect x="56" y="10" width="3.5" height="4.5" rx="0.6" fill="#C26BFF" />
          <rect x="33" y="11.2" width="11" height="2.2" rx="0.5" fill={accent} />
        </svg>
      );
    case 'rocket':
      return (
        <svg {...common}>
          {/* Flared rear venturi cone & recoilless launcher tube */}
          <path d="M4 10 L12 13 V28 L4 31 Z" fill="#1E293B" />
          <rect x="12" y="12.5" width="60" height="16" rx="1.8" fill="#64748B" />
          <rect x="13" y="14" width="58" height="4" fill="#94A3B8" opacity="0.55" />
          {/* Dual structural clamp bands, grips & hazard trim */}
          <rect x="26" y="11" width="5.5" height="19" rx="0.8" fill="#1E293B" />
          <rect x="52" y="11" width="5.5" height="19" rx="0.8" fill="#1E293B" />
          <rect x="66" y="13" width="3.5" height="15" fill="#EAB308" />
          <path d="M22 28.5 L17 38 H25 L29 28.5 Z M47 28.5 L50 38 H57 L54 28.5 Z" fill="#293548" />
          {/* Top electro-optical targeting pod & protruding warhead */}
          <rect x="34" y="5.5" width="15" height="6.5" rx="1.2" fill="#0F172A" />
          <rect x="38" y="7.5" width="7" height="2.8" rx="0.6" fill={accent} />
          <path d="M72 13.5 L90 20.5 L72 27.5 Z" fill={accent} />
          <rect x="83" y="19.3" width="4" height="2.4" fill="#FEF08A" />
        </svg>
      );
  }
};

export const WeaponCard = React.memo<WeaponCardProps>(({
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
});
