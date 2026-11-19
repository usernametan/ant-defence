import React, { useEffect, useState } from 'react';
import { Badge, Button, Panel } from '../design';
import { getSeenHints, markHintSeen } from '../settingsStore';

export interface HintItem {
  id: string;
  title: string;
  text: string;
}

const HINTS: HintItem[] = [
  {
    id: 'grenade',
    title: 'FRAG GRENADES',
    text: 'Press G to throw a grenade straight toward your cursor (2 per life).',
  },
  {
    id: 'cover',
    title: 'TACTICAL COVER',
    text: 'Take cover behind crates and sandbags to block incoming fire.',
  },
  {
    id: 'zones',
    title: 'SECTOR CONTROL',
    text: 'Stand in a zone (A, B, or C) to capture it and earn team score.',
  },
  {
    id: 'pickups',
    title: 'ARMORY DROPS',
    text: 'Walk over glowing weapons and press E to swap your firearm.',
  },
];

export interface MatchHintsProps {
  enabled: boolean;
}

export const MatchHints: React.FC<MatchHintsProps> = ({ enabled }) => {
  const [queue, setQueue] = useState<HintItem[]>(() => {
    if (!enabled) return [];
    const seen = getSeenHints();
    return HINTS.filter((h) => !seen.has(h.id));
  });

  useEffect(() => {
    if (!enabled) {
      setQueue([]);
      return;
    }
    const seen = getSeenHints();
    setQueue(HINTS.filter((h) => !seen.has(h.id)));
  }, [enabled]);

  if (!enabled || queue.length === 0) return null;

  const active = queue[0];
  const dismiss = () => {
    markHintSeen(active.id);
    setQueue((q) => q.slice(1));
  };

  return (
    <div style={{ pointerEvents: 'auto', marginTop: 8 }}>
      <Panel
        tone="default"
        style={{
          padding: '10px 14px',
          width: 260,
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Badge tone="gold">{active.title}</Badge>
          <Button variant="ghost" size="sm" onClick={dismiss}>
            Dismiss
          </Button>
        </div>
        <p style={{ fontSize: 12, color: 'var(--text-mid)', lineHeight: 1.4 }}>
          {active.text}
        </p>
      </Panel>
    </div>
  );
};
