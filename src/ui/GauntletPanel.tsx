import React, { useState } from 'react';
import { findReaction } from '../data';
import { bus } from '../shared/events';
import type { InventoryItem, Material, Reaction } from '../shared/types';
import { MaterialBadge } from './MaterialBadge';
import './ui.css';

export interface GauntletPanelProps {
  isOpen?: boolean;
  materials: Material[];
  inventory: InventoryItem[];
  onCombine?: (
    reagentA: string,
    reagentB: string,
    catalyst?: string,
  ) => Reaction | undefined;
  onClose?: () => void;
}

type SlotKey = 'a' | 'b' | 'catalyst';

export const GauntletPanel: React.FC<GauntletPanelProps> = ({
  isOpen = true,
  materials,
  inventory,
  onCombine,
  onClose,
}) => {
  const [slotA, setSlotA] = useState<string | null>(null);
  const [slotB, setSlotB] = useState<string | null>(null);
  const [catalyst, setCatalyst] = useState<string | null>(null);
  const [activeSlot, setActiveSlot] = useState<SlotKey>('a');
  const [resultText, setResultText] = useState<string | null>(null);

  if (!isOpen) {
    return null;
  }

  const materialMap = new Map(materials.map((m) => [m.id, m]));
  const countMap = new Map(inventory.map((item) => [item.materialId, item.quantity]));

  const assignMaterial = (materialId: string) => {
    if (activeSlot === 'a') {
      setSlotA(materialId);
      if (!slotB) setActiveSlot('b');
    } else if (activeSlot === 'b') {
      setSlotB(materialId);
    } else {
      setCatalyst(materialId);
    }
  };

  const handleSlotClick = (slot: SlotKey) => {
    if (activeSlot === slot) {
      if (slot === 'a') setSlotA(null);
      if (slot === 'b') setSlotB(null);
      if (slot === 'catalyst') setCatalyst(null);
    } else {
      setActiveSlot(slot);
    }
  };

  const handleCombine = () => {
    if (!slotA || !slotB) return;
    const reaction = onCombine
      ? onCombine(slotA, slotB, catalyst ?? undefined)
      : findReaction(slotA, slotB, catalyst ?? undefined);

    if (reaction) {
      setResultText(
        `[${reaction.effect.kind.toUpperCase()}] ${reaction.discoveryText}`,
      );
      bus.emit('reaction:performed', {
        reactionId: reaction.id,
        effect: reaction.effect,
      });
      bus.emit('reaction:discovered', { reaction });
    } else {
      setResultText('The reagents rest inert — no reaction occurred.');
    }
  };

  const handleClose = () => {
    bus.emit('gauntlet:close');
    onClose?.();
  };

  const renderSlot = (slot: SlotKey, label: string, materialId: string | null) => {
    const mat = materialId ? materialMap.get(materialId) : undefined;
    return (
      <button
        type="button"
        className={`aoa-gauntlet-slot ${activeSlot === slot ? 'is-active' : ''}`}
        onClick={() => handleSlotClick(slot)}
      >
        <span className="aoa-gauntlet-slot-label">{label}</span>
        {mat ? (
          <>
            <MaterialBadge icon={mat.icon} name={mat.name} />
            <span>{mat.name.split(' ')[0]}</span>
          </>
        ) : (
          <span>Empty</span>
        )}
      </button>
    );
  };

  return (
    <section
      className="aoa-ui-root aoa-panel aoa-gauntlet"
      aria-label="Alchemical Gauntlet"
    >
      <div className="aoa-panel-header">
        <span className="aoa-title">Alchemical Gauntlet</span>
        {onClose && (
          <button type="button" className="aoa-btn" onClick={handleClose}>
            Close
          </button>
        )}
      </div>

      <div className="aoa-gauntlet-slots">
        {renderSlot('a', 'Reagent A', slotA)}
        {renderSlot('b', 'Reagent B', slotB)}
        {renderSlot('catalyst', 'Catalyst (Opt)', catalyst)}
      </div>

      <div className="aoa-gauntlet-picker" role="list" aria-label="Material Picker">
        {materials.map((mat) => {
          const qty = countMap.get(mat.id) ?? 0;
          return (
            <button
              key={mat.id}
              type="button"
              className="aoa-inv-slot"
              disabled={qty <= 0}
              onClick={() => assignMaterial(mat.id)}
            >
              <MaterialBadge icon={mat.icon} name={mat.name} />
              <span>{mat.name.split(' ')[0]}</span>
              <span className="aoa-inv-count">x{qty}</span>
            </button>
          );
        })}
      </div>

      <div className="aoa-gauntlet-actions">
        <button
          type="button"
          className="aoa-btn"
          onClick={() => {
            setSlotA(null);
            setSlotB(null);
            setCatalyst(null);
            setResultText(null);
          }}
        >
          Clear
        </button>
        <button
          type="button"
          className="aoa-btn aoa-btn-primary"
          disabled={!slotA || !slotB}
          onClick={handleCombine}
        >
          Combine
        </button>
      </div>

      {resultText && <div className="aoa-gauntlet-result">{resultText}</div>}
    </section>
  );
};
