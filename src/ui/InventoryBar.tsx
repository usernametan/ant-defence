import React, { useEffect, useState } from 'react';
import { bus } from '../shared/events';
import type { InventoryItem, Material } from '../shared/types';
import { MaterialBadge } from './MaterialBadge';
import './ui.css';

export interface InventoryBarProps {
  materials: Material[];
  inventory: InventoryItem[];
  selectedMaterialId?: string;
  onSelect?: (materialId: string) => void;
  listenToBus?: boolean;
}

export const InventoryBar: React.FC<InventoryBarProps> = ({
  materials,
  inventory,
  selectedMaterialId,
  onSelect,
  listenToBus = false,
}) => {
  const [busInventory, setBusInventory] = useState<InventoryItem[] | null>(null);

  useEffect(() => {
    if (!listenToBus) return;
    return bus.on('inventory:changed', ({ inventory: next }) => {
      setBusInventory(next);
    });
  }, [listenToBus]);

  const activeInventory = listenToBus ? (busInventory ?? inventory) : inventory;
  const materialMap = new Map(materials.map((m) => [m.id, m]));

  return (
    <div
      className="aoa-ui-root aoa-panel aoa-inventory-bar"
      role="toolbar"
      aria-label="Material Inventory"
    >
      {activeInventory.map((item) => {
        const mat = materialMap.get(item.materialId);
        if (!mat || item.quantity <= 0) return null;
        const isSelected = selectedMaterialId === item.materialId;

        return (
          <button
            key={item.materialId}
            type="button"
            className={`aoa-inv-slot ${isSelected ? 'is-selected' : ''}`}
            onClick={() => onSelect?.(item.materialId)}
            title={mat.description}
          >
            <MaterialBadge icon={mat.icon} name={mat.name} />
            <span>{mat.name.split(' ')[0]}</span>
            <span className="aoa-inv-count">x{item.quantity}</span>
          </button>
        );
      })}
    </div>
  );
};
