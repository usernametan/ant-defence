import React, { useEffect, useState } from 'react';

export interface ActionBarProps {
  hasNearbyPickup: boolean;
  reloading: boolean;
  lowAmmo: boolean;
  dashReady?: boolean;
  grenades?: number;
}

export const ActionBar: React.FC<ActionBarProps> = ({
  hasNearbyPickup,
  reloading,
  lowAmmo,
  dashReady = true,
  grenades = 2,
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

  const slots = [
    {
      key: 'Q',
      title: 'Tactical Dash (Shift)',
      active: pressedKey === 'Q' || dashReady,
      highlight: pressedKey === 'Q',
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
      title: `Throw Grenade Straight (G) — ${grenades} left`,
      active: grenades > 0 || pressedKey === 'G',
      highlight: pressedKey === 'G',
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
            className={`ht-action-slot ${slot.highlight ? 'is-highlight' : ''} ${!slot.active ? 'is-dim' : ''}`}
          >
            {slot.icon}
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
