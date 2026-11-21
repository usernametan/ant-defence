import React, { useEffect, useState } from 'react';

export interface ActionBarProps {
  hasNearbyPickup: boolean;
  reloading: boolean;
  lowAmmo: boolean;
  dashReady?: boolean;
  dashCooldown?: number;
  dashMaxCooldown?: number;
  grenades?: number;
  grenadeCooldown?: number;
  grenadeMaxCooldown?: number;
}

export const ActionBar: React.FC<ActionBarProps> = ({
  hasNearbyPickup,
  reloading,
  lowAmmo,
  dashReady = true,
  dashCooldown = 0,
  dashMaxCooldown = 3.2,
  grenades = 2,
  grenadeCooldown = 0,
  grenadeMaxCooldown = 3.0,
}) => {
  const [pressedKey, setPressedKey] = useState<string | null>(null);

  useEffect(() => {
    const onDown = (e: KeyboardEvent) => {
      const k = e.key.toUpperCase();
      if (k === 'Q' || k === 'SHIFT' || k === 'E' || k === 'R' || k === 'G') {
        setPressedKey(k === 'SHIFT' ? 'Q' : k);
      }
    };
    const onUp = () => setPressedKey(null);
    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    return () => {
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
    };
  }, []);

  const dashCooling = dashCooldown > 0.05;
  const dashRatio = dashCooling ? Math.max(0, Math.min(1, dashCooldown / Math.max(0.01, dashMaxCooldown))) : 0;
  const dashAvailable = dashReady && !dashCooling;

  const grenadeCooling = grenades > 0 && grenadeCooldown > 0.05;
  const grenadeRatio = grenadeCooling
    ? Math.max(0, Math.min(1, grenadeCooldown / Math.max(0.01, grenadeMaxCooldown)))
    : 0;
  const grenadeAvailable = grenades > 0 && !grenadeCooling;

  const slots = [
    {
      key: 'Q',
      title: dashCooling
        ? `Tactical Dash (Shift) — ${dashCooldown.toFixed(1)}s cooldown`
        : 'Tactical Dash (Shift) — Ready',
      active: dashAvailable,
      highlight: dashAvailable && pressedKey === 'Q',
      cooldown: dashCooling ? dashCooldown : 0,
      cooldownRatio: dashRatio,
      badge: null as number | null,
      icon: (
        <svg viewBox="0 0 24 24" width={24} height={24} fill="none" stroke="currentColor" strokeWidth={2}>
          <path d="M5 17l7-7-3-3 9-2-2 9-3-3-7 7z" fill="currentColor" stroke="none" />
          <path d="M4 11h5M3 15h4" strokeLinecap="round" />
        </svg>
      ),
    },
    {
      key: 'E',
      title: 'Swap / Interact (E)',
      active: hasNearbyPickup || pressedKey === 'E',
      highlight: hasNearbyPickup || pressedKey === 'E',
      cooldown: 0,
      cooldownRatio: 0,
      badge: hasNearbyPickup ? 1 : null,
      icon: (
        <svg viewBox="0 0 24 24" width={24} height={24} fill="none" stroke="currentColor" strokeWidth={2}>
          <rect x="4" y="6" width="16" height="12" rx="2" fill="currentColor" opacity="0.2" />
          <rect x="4" y="6" width="16" height="12" rx="2" />
          <path d="M12 9v6M9 12h6" strokeWidth={2.4} strokeLinecap="round" />
        </svg>
      ),
    },
    {
      key: 'R',
      title: 'Reload Weapon (R)',
      active: reloading || lowAmmo || pressedKey === 'R',
      highlight: reloading || lowAmmo || pressedKey === 'R',
      cooldown: 0,
      cooldownRatio: 0,
      badge: lowAmmo ? 1 : null,
      icon: (
        <svg viewBox="0 0 24 24" width={24} height={24} fill="none" stroke="currentColor" strokeWidth={2}>
          <path d="M4 12a8 8 0 0 1 13.7-5.6L20 8.5" strokeLinecap="round" />
          <path d="M20 4v4.5h-4.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M20 12a8 8 0 0 1-13.7 5.6L4 15.5" strokeLinecap="round" />
        </svg>
      ),
    },
    {
      key: 'G',
      title: grenadeCooling
        ? `Throw Grenade (G) — ${grenadeCooldown.toFixed(1)}s cooldown (${grenades} left)`
        : `Throw Grenade Straight (G) — ${grenades} left`,
      active: grenadeAvailable,
      highlight: grenadeAvailable && pressedKey === 'G',
      cooldown: grenadeCooling ? grenadeCooldown : 0,
      cooldownRatio: grenadeRatio,
      badge: grenades,
      icon: (
        <svg viewBox="0 0 24 24" width={24} height={24} fill="none" stroke="currentColor" strokeWidth={2}>
          <rect x="7" y="8" width="10" height="12" rx="4" fill="currentColor" opacity="0.18" />
          <rect x="7" y="8" width="10" height="12" rx="4" />
          <path d="M10 8V5h4v3M14 5l3 1.5M8 13h8" strokeLinecap="round" />
        </svg>
      ),
    },
  ];

  return (
    <div className="ht-action-bar" aria-label="Tactical Abilities">
      {slots.map((slot) => (
        <div
          key={slot.key}
          className="ht-action-slot-wrap"
          title={slot.title}
        >
          <div
            className={`ht-action-slot ${slot.highlight ? 'is-highlight' : ''} ${!slot.active ? 'is-dim' : ''} ${slot.cooldown > 0 ? 'is-cooldown' : ''}`}
          >
            {slot.icon}
            {slot.cooldown > 0 && (
              <>
                <span
                  className="ht-action-cooldown-fill"
                  style={{ height: `${Math.round(slot.cooldownRatio * 100)}%` }}
                  aria-hidden="true"
                />
                <span
                  className="ht-action-cooldown-text"
                  aria-label={`${slot.key} cooldown ${slot.cooldown.toFixed(1)} seconds`}
                >
                  {slot.cooldown.toFixed(1)}s
                </span>
              </>
            )}
            {slot.badge !== null && (
              <span className="ht-action-badge">{slot.badge}</span>
            )}
          </div>
          <span className="ht-action-key">{slot.key}</span>
        </div>
      ))}
    </div>
  );
};
