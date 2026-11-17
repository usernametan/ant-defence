import React, { useState } from 'react';
import { materials, reactions } from '../data';
import { act2Scene4 } from '../dialogue/scripts';
import type { DialogueChoice, InventoryItem } from '../shared/types';
import { DialogueBox } from './DialogueBox';
import { GauntletPanel } from './GauntletPanel';
import { HUD } from './HUD';
import { InventoryBar } from './InventoryBar';
import { Journal } from './Journal';
import './ui.css';

const MOCK_INVENTORY: InventoryItem[] = [
  { materialId: 'turmeric', quantity: 4 },
  { materialId: 'lime', quantity: 3 },
  { materialId: 'tamarind', quantity: 5 },
  { materialId: 'camphor', quantity: 2 },
  { materialId: 'alum', quantity: 3 },
  { materialId: 'copper', quantity: 2 },
  { materialId: 'honey', quantity: 2 },
  { materialId: 'suryakanti', quantity: 1 },
];

export const Showcase: React.FC = () => {
  const [selectedMat, setSelectedMat] = useState<string>('turmeric');
  const [nodeId, setNodeId] = useState<string>('a2s4_lesson_hub');
  const [discoveredIds, setDiscoveredIds] = useState<string[]>([
    'kumkum_reveal',
    'camphor_flare',
    'copper_patina_wash',
    'neem_honey_balm',
  ]);

  const activeNode =
    act2Scene4.find((n) => n.id === nodeId) ?? act2Scene4[0];

  const handleAdvance = () => {
    if (activeNode.next) {
      setNodeId(activeNode.next);
    }
  };

  const handleChoice = (choice: DialogueChoice) => {
    setNodeId(choice.next);
  };

  return (
    <main className="aoa-ui-root aoa-showcase">
      <div style={{ width: '100%', maxWidth: 960 }}>
        <HUD
          currentHp={76}
          maxHp={100}
          equippedEssence={reactions[0].effect}
          equippedLabel="KUMKUM REVEAL"
          listenToBus
          onOpenJournal={() => undefined}
        />
      </div>

      <div style={{ width: '100%', maxWidth: 960 }}>
        <InventoryBar
          materials={materials}
          inventory={MOCK_INVENTORY}
          selectedMaterialId={selectedMat}
          onSelect={setSelectedMat}
        />
      </div>

      <DialogueBox
        node={activeNode}
        onAdvance={handleAdvance}
        onSelectChoice={handleChoice}
      />

      <div className="aoa-showcase-row">
        <GauntletPanel
          materials={materials}
          inventory={MOCK_INVENTORY}
          onCombine={(a, b, cat) => {
            const match = reactions.find((r) => {
              const [x, y] = r.inputs;
              const samePair = (x === a && y === b) || (x === b && y === a);
              return samePair && (r.catalyst || undefined) === (cat || undefined);
            });
            if (match && !discoveredIds.includes(match.id)) {
              setDiscoveredIds((prev) => [...prev, match.id]);
            }
            return match;
          }}
        />

        <Journal
          reactions={reactions}
          discoveredIds={discoveredIds}
          materials={materials}
        />
      </div>
    </main>
  );
};
