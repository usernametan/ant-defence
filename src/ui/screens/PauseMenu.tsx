import React, { useRef } from 'react';
import { Badge, Button, Icon, Panel, useMenuNavigation } from '../design';
import '../ui.css';

export interface PauseMenuProps {
  onResume: () => void;
  onSettings: () => void;
  onRestart: () => void;
  onQuit: () => void;
}

export const PauseMenu: React.FC<PauseMenuProps> = ({
  onResume,
  onSettings,
  onRestart,
  onQuit,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  useMenuNavigation({ containerRef, onEscape: onResume });

  return (
    <div ref={containerRef} className="ht-root ht-blur-backdrop">
      <Panel
        bracketed
        style={{
          width: 'min(400px, 100%)',
          padding: 28,
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: 8 }}>
          <Badge tone="player">SIMULATION SUSPENDED</Badge>
          <h2 className="ht-display" style={{ fontSize: 28, marginTop: 6 }}>
            PAUSED
          </h2>
        </div>

        <Button variant="primary" size="lg" onClick={onResume}>
          <Icon name="play" size={16} /> Resume Match
        </Button>
        <Button variant="secondary" onClick={onSettings}>
          <Icon name="settings" size={16} /> Settings
        </Button>
        <Button variant="secondary" onClick={onRestart}>
          Restart Sector
        </Button>
        <Button variant="danger" onClick={onQuit}>
          Quit to Command
        </Button>
      </Panel>
    </div>
  );
};
