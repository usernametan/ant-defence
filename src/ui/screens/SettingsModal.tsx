import React, { useState } from 'react';
import type { RenderQuality } from '../../render';
import {
  Button,
  Icon,
  KeyCap,
  Modal,
  Panel,
  Select,
  Slider,
  Tabs,
  Toggle,
} from '../design';
import type { CrosshairStyle, GameSettings } from '../settingsStore';
import { DEFAULT_SETTINGS } from '../settingsStore';
import { CrosshairGlyph } from '../hud/Crosshair';

export interface SettingsModalProps {
  open: boolean;
  settings: GameSettings;
  onChange: (next: GameSettings) => void;
  onClose: () => void;
}

type SettingsTab = 'gameplay' | 'video' | 'audio' | 'controls';

export const SettingsModal: React.FC<SettingsModalProps> = ({
  open,
  settings,
  onChange,
  onClose,
}) => {
  const [tab, setTab] = useState<SettingsTab>('gameplay');
  const [previewSpread, setPreviewSpread] = useState(8);

  const patch = <K extends keyof GameSettings>(key: K, value: GameSettings[K]) => {
    onChange({ ...settings, [key]: value });
  };

  return (
    <Modal open={open} title="System Settings" onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <Tabs
          active={tab}
          onChange={setTab}
          items={[
            { id: 'gameplay', label: 'Gameplay' },
            { id: 'video', label: 'Video' },
            { id: 'audio', label: 'Audio' },
            { id: 'controls', label: 'Controls' },
          ]}
        />

        {tab === 'gameplay' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 140px', gap: 14, alignItems: 'center' }}>
              <Select<CrosshairStyle>
                label="Crosshair Style"
                value={settings.crosshairStyle}
                options={[
                  { value: 'tactical', label: 'Tactical Cross' },
                  { value: 'dot', label: 'Precision Dot' },
                  { value: 'chevron', label: 'V-Chevron' },
                  { value: 'ring', label: 'Holo Ring' },
                ]}
                onChange={(v) => patch('crosshairStyle', v)}
              />
              <Panel
                tone="subtle"
                style={{
                  height: 76,
                  display: 'grid',
                  placeItems: 'center',
                  cursor: 'pointer',
                }}
                onMouseEnter={() => setPreviewSpread(16)}
                onMouseLeave={() => setPreviewSpread(8)}
                title="Hover to preview dynamic recoil spread"
              >
                <CrosshairGlyph
                  style={settings.crosshairStyle}
                  gap={previewSpread}
                  hitFlash={null}
                />
              </Panel>
            </div>

            <Slider
              label="HUD Scale"
              min={75}
              max={125}
              step={5}
              suffix="%"
              value={settings.hudScale}
              onChange={(v) => patch('hudScale', v)}
            />

            <Toggle
              label="Colorblind Assist"
              description="Enlarges shape pips (triangle ally / diamond enemy) on units and minimap"
              checked={settings.colorblindAssist}
              onChange={(v) => patch('colorblindAssist', v)}
            />

            <Toggle
              label="Contextual Match Hints"
              description="Show first-match tactical tips for cover, zones, and pickups"
              checked={settings.showHints}
              onChange={(v) => patch('showHints', v)}
            />
          </div>
        )}

        {tab === 'video' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Select<RenderQuality>
              label="Lighting & Bloom Quality"
              value={settings.quality}
              options={[
                { value: 'high', label: 'High (Dynamic Shadows + Bloom)' },
                { value: 'med', label: 'Medium (Dynamic Shadows)' },
                { value: 'low', label: 'Low (Max FPS)' },
              ]}
              onChange={(v) => patch('quality', v)}
            />

            <Slider
              label="Screen Shake Intensity"
              min={0}
              max={150}
              step={5}
              suffix="%"
              value={settings.screenShake}
              onChange={(v) => patch('screenShake', v)}
            />

            <Toggle
              label="Reduced Motion"
              description="Disables screen transitions, camera shake, and heavy animations"
              checked={settings.reducedMotion}
              onChange={(v) => patch('reducedMotion', v)}
            />
          </div>
        )}

        {tab === 'audio' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Slider
              label="Master Volume"
              min={0}
              max={100}
              suffix="%"
              value={settings.masterVolume}
              onChange={(v) => patch('masterVolume', v)}
            />
            <Slider
              label="SFX Volume"
              min={0}
              max={100}
              suffix="%"
              value={settings.sfxVolume}
              onChange={(v) => patch('sfxVolume', v)}
            />
            <Slider
              label="Ambient / Music Volume"
              min={0}
              max={100}
              suffix="%"
              value={settings.musicVolume}
              onChange={(v) => patch('musicVolume', v)}
            />
          </div>
        )}

        {tab === 'controls' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>
            {[
              { action: 'Move', keys: ['W', 'A', 'S', 'D'] },
              { action: 'Aim & Fire', keys: ['MOUSE', 'LMB'] },
              { action: 'Reload', keys: ['R'] },
              { action: 'Swap / Pickup', keys: ['E'] },
              { action: 'Tactical Dash', keys: ['SHIFT'] },
              { action: 'Pause Menu', keys: ['ESC'] },
            ].map((row) => (
              <Panel
                key={row.action}
                tone="subtle"
                style={{
                  padding: '10px 12px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <span style={{ fontSize: 12, color: 'var(--text-mid)' }}>{row.action}</span>
                <span style={{ display: 'inline-flex', gap: 4 }}>
                  {row.keys.map((k) => (
                    <KeyCap key={k} label={k} />
                  ))}
                </span>
              </Panel>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 8, borderTop: '1px solid var(--line)' }}>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onChange({ ...DEFAULT_SETTINGS })}
          >
            Reset Defaults
          </Button>
          <Button variant="primary" size="sm" onClick={onClose}>
            <Icon name="settings" size={14} /> Save & Close
          </Button>
        </div>
      </div>
    </Modal>
  );
};
