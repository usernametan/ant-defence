import React from 'react';
import type { Material, Reaction } from '../shared/types';
import './ui.css';

export interface JournalProps {
  reactions: Reaction[];
  discoveredIds: string[];
  materials?: Material[];
  onClose?: () => void;
}

function formatReactionTitle(id: string): string {
  return id.replace(/_/g, ' ');
}

export const Journal: React.FC<JournalProps> = ({
  reactions,
  discoveredIds,
  materials = [],
  onClose,
}) => {
  const discovered = new Set(discoveredIds);
  const materialNames = new Map(
    materials.map((m) => [m.id, m.name.split(' ')[0]]),
  );

  return (
    <section
      className="aoa-ui-root aoa-panel aoa-journal"
      aria-label="Alchemist Journal"
    >
      <div className="aoa-panel-header">
        <span className="aoa-title">
          Alchemist Journal ({discovered.size}/{reactions.length})
        </span>
        {onClose && (
          <button type="button" className="aoa-btn" onClick={onClose}>
            Close
          </button>
        )}
      </div>

      <div className="aoa-journal-grid">
        {reactions.map((reaction) => {
          const isUnlocked = discovered.has(reaction.id);
          if (!isUnlocked) {
            return (
              <article
                key={reaction.id}
                className="aoa-journal-card is-locked"
              >
                <div className="aoa-journal-card-title">???</div>
                <div className="aoa-journal-meta">??? + ???</div>
                <p className="aoa-journal-desc">???</p>
              </article>
            );
          }

          const inA = materialNames.get(reaction.inputs[0]) ?? reaction.inputs[0];
          const inB = materialNames.get(reaction.inputs[1]) ?? reaction.inputs[1];
          const cat = reaction.catalyst
            ? ` (+ ${materialNames.get(reaction.catalyst) ?? reaction.catalyst})`
            : '';

          return (
            <article key={reaction.id} className="aoa-journal-card">
              <div className="aoa-journal-card-title">
                {formatReactionTitle(reaction.id)}
              </div>
              <div className="aoa-journal-meta">
                {inA} + {inB}
                {cat} · {reaction.effect.kind.toUpperCase()}
              </div>
              <p className="aoa-journal-desc">{reaction.discoveryText}</p>
            </article>
          );
        })}
      </div>
    </section>
  );
};
