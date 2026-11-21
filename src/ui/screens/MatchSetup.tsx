import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  SLUM_ROOF_PREVIEW_COLORS,
  formatZoneCode,
  slumRoofStyle,
} from '../../render/environment';
import { MAP_THEME_PALETTES, PALETTE, getThemePalette } from '../../render/palette';
import { WEAPON_DEFS } from '../../shared/api';
import type { GameMode, MapTheme, MatchConfig, MatchDifficulty, WeaponId } from '../../shared/types';
import { Icon, useMenuNavigation } from '../design';
import { playUiClick, playUiConfirm, playUiHover } from '../design/uiSound';
import { generatePreviewMap } from '../previewMap';
import { TacticalSketchBackdrop } from './TacticalSketchBackdrop';
import './landing.css';

export interface MatchSetupProps {
  initialConfig: MatchConfig;
  onDeploy: (config: MatchConfig) => void;
  onBack: () => void;
}

const DIFFICULTIES: ReadonlyArray<{ id: MatchDifficulty; label: string }> = [
  { id: 'easy', label: 'Easy' },
  { id: 'normal', label: 'Normal' },
  { id: 'hard', label: 'Hard' },
];

const WEAPON_LIST: readonly WeaponId[] = [
  'pistol',
  'smg',
  'shotgun',
  'rifle',
  'sniper',
  'rocket',
];

const MAP_THEMES: ReadonlyArray<{ id: MapTheme; label: string }> = [
  { id: 'slumside', label: 'Slumside' },
  { id: 'fortress', label: 'Sci-Fi Arena' },
  { id: 'jungle', label: 'Jungle Outpost' },
  { id: 'temple', label: 'Ancient Temple' },
];

const ZoneLogoMark: React.FC = () => (
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

export const MatchSetup: React.FC<MatchSetupProps> = ({
  initialConfig,
  onDeploy,
  onBack,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [config, setConfig] = useState<MatchConfig>(initialConfig);

  useMenuNavigation({ containerRef, onEscape: onBack });

  const activeTheme: MapTheme = config.mapTheme ?? 'fortress';
  const previewMap = useMemo(
    () => generatePreviewMap(config.seed, activeTheme),
    [config.seed, activeTheme],
  );

  useEffect(() => {
    const canvas = previewCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const tp = getThemePalette(previewMap.theme);
    const w = canvas.width;
    const h = canvas.height;
    const scaleX = w / previewMap.width;
    const scaleY = h / previewMap.height;

    ctx.fillStyle = tp.floorBase;
    ctx.fillRect(0, 0, w, h);

    if (previewMap.theme === 'slumside') {
      ctx.fillStyle = '#4D453C';
      ctx.fillRect(51 * scaleX, scaleY, scaleX * 3, (previewMap.height - 2) * scaleY);
      ctx.fillStyle = '#8C959F';
      ctx.fillRect(51.4 * scaleX, scaleY, Math.max(1, scaleX * 0.28), (previewMap.height - 2) * scaleY);
      ctx.fillRect(52.5 * scaleX, scaleY, Math.max(1, scaleX * 0.28), (previewMap.height - 2) * scaleY);
    }

    for (let r = 0; r < previewMap.height; r += 1) {
      for (let c = 0; c < previewMap.width; c += 1) {
        const tile = previewMap.tiles[r][c];
        const px = c * scaleX;
        const py = r * scaleY;
        if (tile === 'water') {
          ctx.fillStyle = tp.waterMid;
          ctx.fillRect(px, py, Math.ceil(scaleX), Math.ceil(scaleY));
        } else if (tile === 'spawnPlayer') {
          ctx.fillStyle = 'rgba(88, 151, 186, 0.35)';
          ctx.fillRect(px, py, Math.ceil(scaleX), Math.ceil(scaleY));
        } else if (tile === 'spawnEnemy') {
          ctx.fillStyle = 'rgba(200, 93, 76, 0.35)';
          ctx.fillRect(px, py, Math.ceil(scaleX), Math.ceil(scaleY));
        } else if (tile === 'lowCover') {
          ctx.fillStyle = tp.crateBody;
          ctx.fillRect(px, py, Math.ceil(scaleX), Math.ceil(scaleY));
        } else if (tile === 'wall') {
          ctx.fillStyle =
            previewMap.theme === 'slumside'
              ? SLUM_ROOF_PREVIEW_COLORS[slumRoofStyle(c, r, previewMap.seed)]
              : tp.wallTop;
          ctx.fillRect(px, py, Math.ceil(scaleX), Math.ceil(scaleY));
        }
      }
    }

    for (const z of previewMap.zones) {
      const zx = (z.center.x / previewMap.tileSize) * scaleX;
      const zy = (z.center.y / previewMap.tileSize) * scaleY;
      ctx.fillStyle = 'rgba(217, 154, 56, 0.2)';
      ctx.beginPath();
      ctx.arc(zx, zy, 13, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#D99A38';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      const zoneLabel = formatZoneCode(z.id);
      ctx.fillStyle = PALETTE.textHi;
      ctx.font = '700 10px "Space Grotesk", "IBM Plex Sans", system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(zoneLabel, zx, zy + 0.5);
    }
  }, [previewMap]);

  const activeMode: GameMode = config.mode ?? 'zoneControl';
  const isRampage = activeMode === 'rampage';
  const isHellcell = activeMode === 'hellcell';

  const switchMode = (nextMode: GameMode) => {
    setConfig((prev) => {
      if ((prev.mode ?? 'zoneControl') === nextMode) return prev;
      if (nextMode === 'rampage') {
        return {
          ...prev,
          mode: 'rampage',
          enemyCount: Math.max(4, Math.min(10, prev.enemyCount)),
          scoreToWin: prev.scoreToWin > 50 ? 15 : prev.scoreToWin,
        };
      }
      if (nextMode === 'hellcell') {
        return {
          ...prev,
          mode: 'hellcell',
          scoreToWin: 1000,
        };
      }
      return {
        ...prev,
        mode: 'zoneControl',
        scoreToWin: prev.scoreToWin <= 50 || prev.scoreToWin >= 800 ? 600 : prev.scoreToWin,
      };
    });
  };

  const randomizeSeed = () => {
    const next = Math.floor(1000 + Math.random() * 89999);
    setConfig((prev) => ({ ...prev, seed: next }));
  };

  const selectedWeapon = WEAPON_DEFS[config.startingWeapon];
  const activeDamageLabel =
    selectedWeapon.pellets > 1
      ? `${selectedWeapon.damage}×${selectedWeapon.pellets}`
      : `${selectedWeapon.damage}`;

  const enemyMin = isRampage ? 3 : 2;
  const enemyMax = isRampage ? 12 : 10;
  const enemyPct = Math.max(
    0,
    Math.min(100, ((config.enemyCount - enemyMin) / (enemyMax - enemyMin)) * 100),
  );

  const scoreMin = isRampage ? 5 : isHellcell ? 300 : 200;
  const scoreMax = isRampage ? 50 : isHellcell ? 1500 : 1000;
  const scoreStep = isRampage ? 5 : 50;
  const scorePct = Math.max(
    0,
    Math.min(100, ((config.scoreToWin - scoreMin) / (scoreMax - scoreMin)) * 100),
  );

  return (
    <div ref={containerRef} className="zc-landing">
      <TacticalSketchBackdrop />
      <div className="zc-shell">
        <header className="zc-nav">
          <button
            type="button"
            className="zc-brand"
            onMouseEnter={() => playUiHover()}
            onClick={() => {
              playUiClick();
              onBack();
            }}
          >
            <ZoneLogoMark />
            <span className="zc-brand-name">Zone Control</span>
          </button>

          <div className="zc-nav-right">
            <button
              type="button"
              className="zc-nav-link"
              onMouseEnter={() => playUiHover()}
              onClick={() => {
                playUiClick();
                onBack();
              }}
            >
              Back to Home
            </button>
          </div>
        </header>

        <main className="zc-main">
          <section className="zc-hero zc-enter" aria-label="Match Setup">
            {/* Left Column: Simple Flat Controls matching MainMenu */}
            <div className="zc-hero-copy">
              <h1 className="zc-title">MATCH SETUP</h1>
              <p className="zc-subtitle">
                Pick a game mode, adjust match rules, and choose your starting weapon.
              </p>

              <div className="zc-setup-block">
                <div className="zc-setup-row">
                  <div className="zc-setup-label-row">
                    <span>Game Mode</span>
                  </div>
                  <div className="zc-weapon-tabs" role="radiogroup" aria-label="Combat Mode">
                    <button
                      type="button"
                      role="radio"
                      aria-checked={activeMode === 'zoneControl'}
                      className={`zc-weapon-tab ${activeMode === 'zoneControl' ? 'is-active' : ''}`}
                      onMouseEnter={() => playUiHover()}
                      onClick={() => {
                        playUiClick();
                        switchMode('zoneControl');
                      }}
                    >
                      Zone Control
                    </button>
                    <button
                      type="button"
                      role="radio"
                      aria-checked={isHellcell}
                      className={`zc-weapon-tab ${isHellcell ? 'is-active' : ''}`}
                      onMouseEnter={() => playUiHover()}
                      onClick={() => {
                        playUiClick();
                        switchMode('hellcell');
                      }}
                    >
                      Hellcell
                    </button>
                    <button
                      type="button"
                      role="radio"
                      aria-checked={isRampage}
                      className={`zc-weapon-tab ${isRampage ? 'is-active' : ''}`}
                      onMouseEnter={() => playUiHover()}
                      onClick={() => {
                        playUiClick();
                        switchMode('rampage');
                      }}
                    >
                      Rampage
                    </button>
                  </div>
                  <p className="zc-setup-hint">
                    {isRampage
                      ? 'Free-for-all — every player for themselves. Most kills wins.'
                      : isHellcell
                        ? 'Capture any 2 zones to summon a boss monster at the 3rd zone.'
                        : 'Capture and hold zones A, B, and C to reach the target score.'}
                  </p>
                </div>

                <div className="zc-setup-row">
                  <div className="zc-setup-label-row">
                    <span>Difficulty</span>
                  </div>
                  <div className="zc-weapon-tabs" role="radiogroup" aria-label="Difficulty Tier">
                    {DIFFICULTIES.map((d) => {
                      const isSel = config.difficulty === d.id;
                      return (
                        <button
                          key={d.id}
                          type="button"
                          role="radio"
                          aria-checked={isSel}
                          className={`zc-weapon-tab ${isSel ? 'is-active' : ''}`}
                          onMouseEnter={() => playUiHover()}
                          onClick={() => {
                            playUiClick();
                            setConfig((p) => ({ ...p, difficulty: d.id }));
                          }}
                        >
                          {d.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="zc-slider-grid">
                  <label className="zc-slider-field">
                    <span className="zc-setup-label-row">
                      <span>{isRampage ? 'Bots' : 'Team Size'}</span>
                      <strong>
                        {isRampage ? config.enemyCount : `${config.enemyCount}v${config.enemyCount}`}
                      </strong>
                    </span>
                    <input
                      type="range"
                      className="zc-slider-input"
                      min={enemyMin}
                      max={enemyMax}
                      value={config.enemyCount}
                      style={{
                        background: `linear-gradient(to right, var(--zc-accent) ${enemyPct}%, var(--zc-border) ${enemyPct}%)`,
                      }}
                      onChange={(e) =>
                        setConfig((p) => ({ ...p, enemyCount: Number(e.target.value) }))
                      }
                    />
                  </label>

                  <label className="zc-slider-field">
                    <span className="zc-setup-label-row">
                      <span>{isRampage ? 'Target Kills' : 'Target Score'}</span>
                      <strong>{config.scoreToWin}</strong>
                    </span>
                    <input
                      type="range"
                      className="zc-slider-input"
                      min={scoreMin}
                      max={scoreMax}
                      step={scoreStep}
                      value={config.scoreToWin}
                      style={{
                        background: `linear-gradient(to right, var(--zc-accent) ${scorePct}%, var(--zc-border) ${scorePct}%)`,
                      }}
                      onChange={(e) =>
                        setConfig((p) => ({ ...p, scoreToWin: Number(e.target.value) }))
                      }
                    />
                  </label>
                </div>
              </div>

              <div className="zc-loadout-strip" aria-label="Starting weapon">
                <div className="zc-loadout-meta">
                  <span>
                    Starting Weapon: <strong>{selectedWeapon.name}</strong>
                  </span>
                  <span>
                    {`DMG ${activeDamageLabel} · ${selectedWeapon.fireRate.toFixed(1)}/s · MAG ${selectedWeapon.magSize}`}
                  </span>
                </div>
                <div className="zc-weapon-tabs" role="group" aria-label="Starting Weapon">
                  {WEAPON_LIST.map((wid) => {
                    const def = WEAPON_DEFS[wid];
                    const isSel = config.startingWeapon === wid;
                    return (
                      <button
                        key={wid}
                        type="button"
                        aria-pressed={isSel}
                        className={`zc-weapon-tab ${isSel ? 'is-active' : ''}`}
                        onMouseEnter={() => playUiHover()}
                        onClick={() => {
                          playUiClick();
                          setConfig((p) => ({ ...p, startingWeapon: wid }));
                        }}
                      >
                        <Icon name={wid} size={14} />
                        <span>{def.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="zc-actions">
                <button
                  type="button"
                  className="zc-play-btn"
                  onMouseEnter={() => playUiHover()}
                  onClick={() => {
                    playUiConfirm();
                    onDeploy(config);
                  }}
                >
                  <Icon name="play" size={15} />
                  <span>START MATCH</span>
                </button>

                <button
                  type="button"
                  className="zc-secondary-btn"
                  onMouseEnter={() => playUiHover()}
                  onClick={() => {
                    playUiClick();
                    onBack();
                  }}
                >
                  Back
                </button>
              </div>
            </div>

            {/* Right Column: Clean Map Preview Frame matching BattlefieldPreview */}
            <div className="zc-hero-media">
              <figure className="zc-preview-frame">
                <div className="zc-preview-viewport">
                  <canvas
                    ref={previewCanvasRef}
                    width={480}
                    height={300}
                    className="zc-preview-canvas"
                    aria-label={`Map preview: ${MAP_THEME_PALETTES[activeTheme].name}`}
                  />
                </div>

                <figcaption className="zc-preview-bar">
                  <div className="zc-theme-switcher" role="group" aria-label="Battleground Map">
                    {MAP_THEMES.map((m) => {
                      const active = activeTheme === m.id;
                      return (
                        <button
                          key={m.id}
                          type="button"
                          aria-pressed={active}
                          className={`zc-feed-tab ${active ? 'is-active' : ''}`}
                          onMouseEnter={() => playUiHover()}
                          onClick={() => {
                            playUiClick();
                            setConfig((p) => ({ ...p, mapTheme: m.id }));
                          }}
                        >
                          <span
                            className="zc-arena-dot"
                            style={{ backgroundColor: MAP_THEME_PALETTES[m.id].accent }}
                            aria-hidden="true"
                          />
                          <span>{m.label}</span>
                        </button>
                      );
                    })}
                  </div>

                  <div className="zc-seed-inline">
                    <label className="zc-seed-label-inline" htmlFor="zc-seed-input">
                      Seed
                    </label>
                    <input
                      id="zc-seed-input"
                      type="number"
                      className="zc-seed-input-inline"
                      value={config.seed}
                      onChange={(e) =>
                        setConfig((p) => ({
                          ...p,
                          seed: Math.max(1, Number(e.target.value) || 1),
                        }))
                      }
                    />
                    <button
                      type="button"
                      className="zc-feed-tab"
                      onMouseEnter={() => playUiHover()}
                      onClick={() => {
                        playUiClick();
                        randomizeSeed();
                      }}
                      aria-label="Randomize Seed"
                    >
                      <Icon name="dice" size={13} />
                      <span>Random</span>
                    </button>
                  </div>
                </figcaption>
              </figure>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
};
