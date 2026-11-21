import React, { useEffect, useState } from 'react';
import { Badge, Button, Icon, KeyCap, Modal, Panel } from '../design';

export interface HowToPlayModalProps {
  open: boolean;
  onClose: () => void;
}

export const HowToPlayModal: React.FC<HowToPlayModalProps> = ({
  open,
  onClose,
}) => {
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!open) return;
    const id = window.setInterval(() => {
      setStep((s) => (s + 1) % 4);
    }, 900);
    return () => window.clearInterval(id);
  }, [open]);

  const activeMove = ['W', 'D', 'S', 'A'][step];

  return (
    <Modal open={open} title="Combat Briefing" onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <Panel tone="subtle" style={{ padding: 14 }}>
          <div className="ht-display" style={{ fontSize: 12, color: 'var(--player-glow)', marginBottom: 10 }}>
            Field Controls
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 18, alignItems: 'center' }}>
            <div style={{ display: 'grid', gap: 4, justifyItems: 'center' }}>
              <KeyCap label="W" active={activeMove === 'W'} />
              <div style={{ display: 'flex', gap: 4 }}>
                <KeyCap label="A" active={activeMove === 'A'} />
                <KeyCap label="S" active={activeMove === 'S'} />
                <KeyCap label="D" active={activeMove === 'D'} />
              </div>
              <span style={{ fontSize: 10, color: 'var(--text-mid)' }}>MOVE</span>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
              {[
                { key: 'MOUSE', label: 'AIM & FIRE' },
                { key: 'RMB', label: 'SCOPE ZOOM' },
                { key: 'G', label: 'GRENADE (2x)' },
                { key: 'R', label: 'RELOAD' },
                { key: 'E', label: 'SWAP WEAPON' },
                { key: 'Q / SHIFT', label: 'DASH' },
              ].map((item, i) => (
                <div key={item.key} style={{ display: 'grid', gap: 4, justifyItems: 'center' }}>
                  <KeyCap label={item.key} active={step === i % 4} />
                  <span style={{ fontSize: 10, color: 'var(--text-mid)' }}>{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        </Panel>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 12 }}>
          {/* Looping Cover Demo */}
          <Panel tone="subtle" style={{ padding: 12 }}>
            <Badge tone="player">1. COVER</Badge>
            <div className="ht-display" style={{ fontSize: 12, marginTop: 6 }}>
              Destructible Crates
            </div>
            <svg viewBox="0 0 180 70" style={{ width: '100%', height: 64, marginTop: 6 }}>
              <rect x="76" y="16" width="28" height="28" rx="3" fill="#4E5D78" stroke="#889BBF" />
              {step >= 2 && (
                <path d="M80 20 L92 30 L85 41" stroke="#FF8A6B" strokeWidth="2" fill="none" />
              )}
              <circle cx="30" cy="30" r="8" fill="#22D3EE" />
              <circle cx={42 + step * 11} cy="30" r="3" fill="#FF8A6B" />
            </svg>
            <p style={{ fontSize: 11, color: 'var(--text-mid)' }}>
              Crates block bullets until shattered by sustained fire or rockets.
            </p>
          </Panel>

          {/* Looping Zone Capture Demo */}
          <Panel tone="subtle" style={{ padding: 12 }}>
            <Badge tone="gold">2. ZONES</Badge>
            <div className="ht-display" style={{ fontSize: 12, marginTop: 6 }}>
              Zone Control
            </div>
            <svg viewBox="0 0 180 70" style={{ width: '100%', height: 64, marginTop: 6 }}>
              <circle
                cx="90"
                cy="35"
                r="24"
                fill="none"
                stroke={step >= 2 ? '#22D3EE' : '#7C8BA8'}
                strokeWidth="3"
                strokeDasharray={`${(step + 1) * 38} 160`}
              />
              <circle cx="90" cy="35" r="8" fill="#0D1424" stroke="#FACC15" />
              <text x="90" y="38" textAnchor="middle" fill="#EAF2FF" fontSize="9" fontWeight="800">
                B
              </text>
            </svg>
            <p style={{ fontSize: 11, color: 'var(--text-mid)' }}>
              Stand inside Zones A, B, or C to claim them and generate team points.
            </p>
          </Panel>

          {/* Looping Weapon Pickup Demo */}
          <Panel tone="subtle" style={{ padding: 12 }}>
            <Badge tone="epic">3. PICKUPS</Badge>
            <div className="ht-display" style={{ fontSize: 12, marginTop: 6 }}>
              Rare Weapon Drops
            </div>
            <svg viewBox="0 0 180 70" style={{ width: '100%', height: 64, marginTop: 6 }}>
              <circle
                cx="90"
                cy={36 - (step % 2) * 4}
                r="14"
                fill="none"
                stroke="#C26BFF"
                strokeWidth="2"
              />
              <rect
                x="82"
                y={30 - (step % 2) * 4}
                width="16"
                height="12"
                fill="#141D33"
                stroke="#C26BFF"
              />
            </svg>
            <p style={{ fontSize: 11, color: 'var(--text-mid)' }}>
              Walk over glowing supply crates and press E to equip stronger gear.
            </p>
          </Panel>
        </div>

        <Panel tone="subtle" style={{ padding: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <Badge tone="gold">HELLCELL MODE</Badge>
            <span className="ht-display" style={{ fontSize: 12 }}>
              PvPvE Boss Event
            </span>
          </div>
          <p style={{ fontSize: 11, color: 'var(--text-mid)' }}>
            In Hellcell mode, capturing Zones A &amp; C triggers a temporary ceasefire and unleashes a wall-crushing Boss from Zone B. Dealing majority damage scores bonus points and refuels HP and ammo.
          </p>
        </Panel>

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button variant="primary" onClick={onClose}>
            <Icon name="play" size={14} /> Got It
          </Button>
        </div>
      </div>
    </Modal>
  );
};
