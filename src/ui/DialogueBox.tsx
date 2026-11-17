import React, { useEffect, useState } from 'react';
import { bus } from '../shared/events';
import type { DialogueChoice, DialogueNode } from '../shared/types';
import './ui.css';

export interface DialogueBoxProps {
  node: DialogueNode | null;
  onAdvance?: () => void;
  onSelectChoice?: (choice: DialogueChoice) => void;
  typewriterSpeedMs?: number;
  listenToBus?: boolean;
}

export const DialogueBox: React.FC<DialogueBoxProps> = ({
  node,
  onAdvance,
  onSelectChoice,
  typewriterSpeedMs = 20,
  listenToBus = false,
}) => {
  const [busNode, setBusNode] = useState<DialogueNode | null>(null);
  const activeNode = listenToBus ? (busNode ?? node) : node;

  const [revealedCount, setRevealedCount] = useState(0);

  useEffect(() => {
    if (!listenToBus) return;
    const offStart = bus.on('dialogue:start', ({ node: nextNode }) => {
      setBusNode(nextNode);
    });
    const offEnd = bus.on('dialogue:end', () => {
      setBusNode(null);
    });
    return () => {
      offStart();
      offEnd();
    };
  }, [listenToBus]);

  useEffect(() => {
    setRevealedCount(0);
  }, [activeNode?.id, activeNode?.text]);

  useEffect(() => {
    if (!activeNode) return;
    if (revealedCount >= activeNode.text.length) return;

    const timer = window.setTimeout(() => {
      setRevealedCount((count) => Math.min(count + 1, activeNode.text.length));
    }, typewriterSpeedMs);

    return () => window.clearTimeout(timer);
  }, [activeNode, revealedCount, typewriterSpeedMs]);

  if (!activeNode) {
    return null;
  }

  const isComplete = revealedCount >= activeNode.text.length;
  const visibleText = activeNode.text.slice(0, revealedCount);
  const hasChoices = Boolean(activeNode.choices && activeNode.choices.length > 0);

  const handleAdvance = () => {
    if (!isComplete) {
      setRevealedCount(activeNode.text.length);
      return;
    }
    if (!hasChoices) {
      onAdvance?.();
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleAdvance();
    }
  };

  return (
    <div
      className="aoa-ui-root aoa-panel aoa-dialogue-box"
      role="dialog"
      aria-label="Dialogue"
      tabIndex={0}
      onClick={handleAdvance}
      onKeyDown={handleKeyDown}
    >
      <div className="aoa-dialogue-speaker">{activeNode.speaker}</div>
      <div className="aoa-dialogue-text">{visibleText}</div>

      {isComplete && hasChoices && activeNode.choices && (
        <div
          className="aoa-dialogue-choices"
          onClick={(e) => e.stopPropagation()}
        >
          {activeNode.choices.map((choice) => (
            <button
              key={choice.next}
              type="button"
              className="aoa-btn aoa-dialogue-choice"
              onClick={() => onSelectChoice?.(choice)}
            >
              &gt; {choice.text}
            </button>
          ))}
        </div>
      )}

      {!hasChoices && (
        <div className="aoa-dialogue-advance">
          {isComplete ? '▼ CLICK OR PRESS SPACE' : '...'}
        </div>
      )}
    </div>
  );
};
