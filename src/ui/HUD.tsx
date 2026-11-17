import React, { useEffect, useState } from 'react';
import { bus } from '../shared/events';
import type { ReactionEffect } from '../shared/types';
import './ui.css';

export interface HUDProps {
  currentHp: number;
  maxHp: number;
  equippedEssence?: ReactionEffect | null;
  equippedLabel?: string;
  listenToBus?: boolean;
  onOpenGauntlet?: () => void;
  onOpenJournal?: () => void;
}

function toHexColor(tint: number): string {
  return `#${tint.toString(16).padStart(6, '0')}`;
}

function describeEssence(
  effect: ReactionEffect | null | undefined,
  label?: string,
): string {
  if (!effect) return 'None';
  if (label) return label;
  return effect.kind.toUpperCase();
}

export const HUD: React.FC<HUDProps> = ({
  currentHp,
  maxHp,
  equippedEssence = null,
  equippedLabel,
  listenToBus = false,
  onOpenGauntlet,
  onOpenJournal,
}) => {
  const [hpState, setHpState] = useState({ current: currentHp, max: maxHp });
  const [essenceState, setEssenceState] = useState<{
    effect: ReactionEffect | null;
    label?: string;
  }>({ effect: equippedEssence, label: equippedLabel });

  useEffect(() => {
    setHpState({ current: currentHp, max: maxHp });
  }, [currentHp, maxHp]);

  useEffect(() => {
    setEssenceState({ effect: equippedEssence, label: equippedLabel });
  }, [equippedEssence, equippedLabel]);

  useEffect(() => {
    if (!listenToBus) return;
    const offDamaged = bus.on('player:damaged', (payload) => {
      setHpState({ current: payload.currentHp, max: payload.maxHp });
    });
    const offReaction = bus.on('reaction:performed', ({ reactionId, effect }) => {
      setEssenceState({
        effect,
        label: reactionId.replace(/_/g, ' ').toUpperCase(),
      });
    });
    return () => {
      offDamaged();
      offReaction();
    };
  }, [listenToBus]);

  const pct =
    hpState.max > 0
      ? Math.max(0, Math.min(100, (hpState.current / hpState.max) * 100))
      : 0;

  return (
    <header className="aoa-ui-root aoa-panel aoa-hud" aria-label="Player HUD">
      <div className="aoa-hud-group">
        <div className="aoa-hp-wrap">
          <div className="aoa-hp-label">
            VITALITY {hpState.current}/{hpState.max}
          </div>
          <div className="aoa-hp-bar">
            <div className="aoa-hp-fill" style={{ width: `${pct}%` }} />
          </div>
        </div>

        <div className="aoa-essence-box">
          <span
            className="aoa-essence-swatch"
            style={{
              backgroundColor: essenceState.effect
                ? toHexColor(essenceState.effect.tint)
                : '#241b14',
            }}
          />
          <span>
            ESSENCE: {describeEssence(essenceState.effect, essenceState.label)}
          </span>
        </div>
      </div>

      <div className="aoa-hud-group">
        <button
          type="button"
          className="aoa-btn"
          onClick={() => {
            bus.emit('gauntlet:open', {});
            onOpenGauntlet?.();
          }}
        >
          Gauntlet
        </button>
        {onOpenJournal && (
          <button type="button" className="aoa-btn" onClick={onOpenJournal}>
            Journal
          </button>
        )}
      </div>
    </header>
  );
};
