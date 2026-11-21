import React, { useRef, useState } from 'react';
import { WEAPON_DEFS } from '../../shared/api';
import type { GameMode, MapTheme, WeaponId } from '../../shared/types';
import { Icon, useMenuNavigation } from '../design';
import { playUiClick, playUiConfirm, playUiHover } from '../design/uiSound';
import { BattlefieldPreview } from './BattlefieldPreview';
import { TacticalSketchBackdrop } from './TacticalSketchBackdrop';
import './landing.css';

export interface MainMenuProps {
  onPlay: () => void;
  onLoadout?: () => void;
  onSettings: () => void;
  onHowToPlay: () => void;
  version?: string;
}

type LandingView = 'home' | 'about' | 'notes';

const WEAPON_ORDER: readonly WeaponId[] = [
  'pistol',
  'smg',
  'shotgun',
  'rifle',
  'sniper',
  'rocket',
];

const ZoneLogo: React.FC = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <rect
      x="2"
      y="2"
      width="20"
      height="20"
      rx="2"
      fill="#161C23"
      stroke="#3B4654"
      strokeWidth="1.5"
    />
    <path d="M7 12 A5 5 0 0 1 12 7" stroke="#5897BA" strokeWidth="2" strokeLinecap="round" />
    <path d="M17 12 A5 5 0 0 1 12 17" stroke="#C85D4C" strokeWidth="2" strokeLinecap="round" />
    <circle cx="12" cy="12" r="2.3" fill="#D99A38" />
  </svg>
);

export const MainMenu: React.FC<MainMenuProps> = ({
  onPlay,
  onSettings,
  onHowToPlay,
  version = 'v0.1.0',
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [view, setView] = useState<LandingView>('home');
  const [previewTheme, setPreviewTheme] = useState<MapTheme>('slumside');
  const [previewMode, setPreviewMode] = useState<GameMode>('zoneControl');
  const [selectedWeapon, setSelectedWeapon] = useState<WeaponId>('rifle');

  useMenuNavigation({
    containerRef,
    onEscape: view !== 'home' ? () => setView('home') : undefined,
  });

  const handlePlay = () => {
    playUiConfirm();
    onPlay();
  };

  const handleSwitchView = (next: LandingView) => {
    playUiClick();
    setView(next);
  };

  const activeWeaponDef = WEAPON_DEFS[selectedWeapon];
  const activeDamageLabel =
    activeWeaponDef.pellets > 1
      ? `${activeWeaponDef.damage}×${activeWeaponDef.pellets}`
      : `${activeWeaponDef.damage}`;

  return (
    <div ref={containerRef} className="zc-landing">
      <TacticalSketchBackdrop />
      <div className="zc-shell">
        <header className="zc-nav">
          <button
            type="button"
            className="zc-brand"
            onMouseEnter={() => playUiHover()}
            onClick={() => handleSwitchView('home')}
          >
            <ZoneLogo />
            <span className="zc-brand-name">Zone Control</span>
          </button>

          <div className="zc-nav-right">
            <nav className="zc-nav-links" aria-label="Main navigation">
              <button
                type="button"
                className={`zc-nav-link ${view === 'home' ? 'is-active' : ''}`}
                aria-current={view === 'home' ? 'page' : undefined}
                onMouseEnter={() => playUiHover()}
                onClick={() => handleSwitchView('home')}
              >
                Home
              </button>
              <button
                type="button"
                className={`zc-nav-link ${view === 'about' ? 'is-active' : ''}`}
                aria-current={view === 'about' ? 'page' : undefined}
                onMouseEnter={() => playUiHover()}
                onClick={() => handleSwitchView('about')}
              >
                About
              </button>
              <button
                type="button"
                className="zc-nav-link"
                onMouseEnter={() => playUiHover()}
                onClick={() => {
                  playUiClick();
                  onHowToPlay();
                }}
              >
                How to Play
              </button>
              <button
                type="button"
                className={`zc-nav-link ${view === 'notes' ? 'is-active' : ''}`}
                aria-current={view === 'notes' ? 'page' : undefined}
                onMouseEnter={() => playUiHover()}
                onClick={() => handleSwitchView('notes')}
              >
                Patch Notes
              </button>
            </nav>

            <button
              type="button"
              className="zc-settings-btn"
              aria-label="Settings"
              title="Settings"
              onMouseEnter={() => playUiHover()}
              onClick={() => {
                playUiClick();
                onSettings();
              }}
            >
              <Icon name="settings" size={16} />
            </button>
          </div>
        </header>

        <main className="zc-main">
          {view === 'home' && (
            <section className="zc-hero zc-enter" aria-label="Game overview">
              <div className="zc-hero-copy">
                <h1 className="zc-title">ZONE CONTROL</h1>
                <p className="zc-subtitle">
                  A tactical arena shooter built around capturing zones, controlling territory and defeating the opposing squad.
                </p>

                <div className="zc-actions">
                  <button
                    type="button"
                    className="zc-play-btn"
                    onMouseEnter={() => playUiHover()}
                    onClick={handlePlay}
                  >
                    <Icon name="play" size={15} />
                    <span>PLAY NOW</span>
                  </button>

                  <button
                    type="button"
                    className="zc-secondary-btn"
                    onMouseEnter={() => playUiHover()}
                    onClick={() => {
                      playUiClick();
                      onHowToPlay();
                    }}
                  >
                    How to Play
                  </button>
                </div>

                <ul className="zc-ledger" aria-label="Core match rules">
                  <li className="zc-ledger-row">
                    <span className="zc-ledger-idx zc-ledger-idx--steel">01</span>
                    <span className="zc-ledger-label">THREE CAPTURE ZONES</span>
                  </li>
                  <li className="zc-ledger-row">
                    <span className="zc-ledger-idx zc-ledger-idx--crimson">02</span>
                    <span className="zc-ledger-label">SQUAD-BASED COMBAT</span>
                  </li>
                  <li className="zc-ledger-row">
                    <span className="zc-ledger-idx zc-ledger-idx--amber">03</span>
                    <span className="zc-ledger-label">TARGET SCORE: 600</span>
                  </li>
                </ul>

                <div className="zc-loadout-strip" aria-label="Preview weapon loadout">
                  <div className="zc-loadout-meta">
                    <span>
                      Preview Weapon: <strong>{activeWeaponDef.name}</strong>
                    </span>
                    <span>
                      DMG {activeDamageLabel} · {activeWeaponDef.fireRate}/s · MAG {activeWeaponDef.magSize}
                    </span>
                  </div>
                  <div className="zc-weapon-tabs" role="group" aria-label="Select weapon preview">
                    {WEAPON_ORDER.map((id) => {
                      const def = WEAPON_DEFS[id];
                      const active = selectedWeapon === id;
                      return (
                        <button
                          key={id}
                          type="button"
                          aria-pressed={active}
                          className={`zc-weapon-tab ${active ? 'is-active' : ''}`}
                          onMouseEnter={() => playUiHover()}
                          onClick={() => {
                            playUiClick();
                            setSelectedWeapon(id);
                          }}
                        >
                          <Icon name={id} size={14} />
                          <span>{def.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="zc-hero-media">
                <BattlefieldPreview
                  theme={previewTheme}
                  onThemeChange={setPreviewTheme}
                  mode={previewMode}
                  onModeChange={setPreviewMode}
                  equippedWeapon={selectedWeapon}
                />
              </div>
            </section>
          )}

          {view === 'about' && (
            <section className="zc-subview zc-enter" aria-label="About Zone Control">
              <div className="zc-subview-header">
                <div>
                  <h1 className="zc-subview-title">About Zone Control</h1>
                  <p className="zc-subview-desc">
                    Top-down tactical combat on a deterministic 60 Hz simulation. Hold capture zones A, B, and C, shatter enemy cover, and adapt your loadout from field pickups.
                  </p>
                </div>
                <div className="zc-subview-actions">
                  <button
                    type="button"
                    className="zc-secondary-btn"
                    onMouseEnter={() => playUiHover()}
                    onClick={() => handleSwitchView('home')}
                  >
                    Back to Home
                  </button>
                  <button
                    type="button"
                    className="zc-play-btn"
                    onMouseEnter={() => playUiHover()}
                    onClick={handlePlay}
                  >
                    <Icon name="play" size={14} />
                    <span>PLAY NOW</span>
                  </button>
                </div>
              </div>

              <div className="zc-editorial-cols">
                <article className="zc-editorial-col">
                  <h2 className="zc-info-heading">Zone Control</h2>
                  <p className="zc-info-body">
                    Squad vs. squad territory control across three capture sectors. Holding zones earns points toward the 600-point win target, or breach the opposing team core.
                  </p>
                </article>
                <article className="zc-editorial-col">
                  <h2 className="zc-info-heading">Hellcell (PvPvE)</h2>
                  <p className="zc-info-body">
                    Capturing both Zone A and Zone C triggers a temporary ceasefire and releases a wall-crushing boss from Zone B. Majority boss damage claims bonus points and refills supplies.
                  </p>
                </article>
                <article className="zc-editorial-col">
                  <h2 className="zc-info-heading">Rampage (FFA)</h2>
                  <p className="zc-info-body">
                    Free-for-all arena skirmish where every operator competes independently for the highest elimination score before the timer expires.
                  </p>
                </article>
              </div>

              <table className="zc-arsenal-table" aria-label="Weapon specifications">
                <thead>
                  <tr>
                    <th>Weapon</th>
                    <th>Damage</th>
                    <th>Fire Rate</th>
                    <th>Magazine</th>
                    <th>Reload</th>
                  </tr>
                </thead>
                <tbody>
                  {WEAPON_ORDER.map((id) => {
                    const def = WEAPON_DEFS[id];
                    const dmgLabel =
                      def.pellets > 1 ? `${def.damage} × ${def.pellets}` : `${def.damage}`;
                    return (
                      <tr key={id}>
                        <td>{def.name}</td>
                        <td>{dmgLabel}</td>
                        <td>{def.fireRate}/s</td>
                        <td>{def.magSize}</td>
                        <td>{def.reloadTime.toFixed(1)}s</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </section>
          )}

          {view === 'notes' && (
            <section className="zc-subview zc-enter" aria-label="Patch Notes">
              <div className="zc-subview-header">
                <div>
                  <h1 className="zc-subview-title">Patch Notes — {version}</h1>
                  <p className="zc-subview-desc">
                    Current build highlights for maps, modes, combat mechanics, and audio-visual polish.
                  </p>
                </div>
                <div className="zc-subview-actions">
                  <button
                    type="button"
                    className="zc-secondary-btn"
                    onMouseEnter={() => playUiHover()}
                    onClick={() => handleSwitchView('home')}
                  >
                    Back to Home
                  </button>
                  <button
                    type="button"
                    className="zc-play-btn"
                    onMouseEnter={() => playUiHover()}
                    onClick={handlePlay}
                  >
                    <Icon name="play" size={14} />
                    <span>PLAY NOW</span>
                  </button>
                </div>
              </div>

              <div className="zc-editorial-cols zc-editorial-cols--two">
                <div className="zc-editorial-col">
                  <h2 className="zc-info-heading">Arenas &amp; Combat</h2>
                  <ul className="zc-notes-list">
                    <li className="zc-notes-item">
                      <strong>Four procedural 2.5D arenas:</strong> Slumside, Sci-Fi Arena, Jungle Outpost, and Ancient Temple with seeded layouts and destructible cover crates.
                    </li>
                    <li className="zc-notes-item">
                      <strong>Arsenal &amp; equipment:</strong> Six weapons with distinct ballistics, two frag grenades per life, tactical dash, and right-click scope zoom.
                    </li>
                    <li className="zc-notes-item">
                      <strong>Dynamic pickups:</strong> Defeated operators and timed supply drops leave weapon upgrades on the field.
                    </li>
                  </ul>
                </div>

                <div className="zc-editorial-col">
                  <h2 className="zc-info-heading">Modes &amp; Simulation</h2>
                  <ul className="zc-notes-list">
                    <li className="zc-notes-item">
                      <strong>Hellcell PvPvE:</strong> Team-size parity, ceasefire boss encounters emerging from Zone B, and destructible wall breaches.
                    </li>
                    <li className="zc-notes-item">
                      <strong>Spatial Web Audio &amp; Controls:</strong> Directional weapon audio, configurable HUD scale, crosshair styles, and reduced-motion accessibility.
                    </li>
                    <li className="zc-notes-item">
                      <strong>Deterministic engine:</strong> Fixed 60 Hz simulation step for reproducible seeded matches.
                    </li>
                  </ul>
                </div>
              </div>
            </section>
          )}
        </main>

        <footer className="zc-footer">
          <span className="zc-footer-controls">
            WASD Move · Mouse Aim &amp; Fire · RMB Scope · Q Dash · R Reload · E Swap · G Grenade
          </span>
          <span>{version}</span>
        </footer>
      </div>
    </div>
  );
};
