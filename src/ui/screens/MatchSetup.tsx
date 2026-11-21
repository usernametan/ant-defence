import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  SLUM_ROOF_PREVIEW_COLORS,
  formatZoneCode,
  slumRoofStyle,
} from '../../render/environment';
import { MAP_THEME_PALETTES, PALETTE, getThemePalette } from '../../render/palette';
import { WEAPON_DEFS } from '../../shared/api';
import type { GameMode, MapTheme, MatchConfig, MatchDifficulty, WeaponId } from '../../shared/types';
import {
  Badge,
  Button,
  Card,
  Icon,
  Panel,
  Slider,
  StatBar,
  useMenuNavigation,
} from '../design';
import type { IconName } from '../design';
import { generatePreviewMap } from '../previewMap';
import '../ui.css';

export interface MatchSetupProps {
  initialConfig: MatchConfig;
  onDeploy: (config: MatchConfig) => void;
  onBack: () => void;
}

const DIFFICULTIES: Array<{
  id: MatchDifficulty;
  label: string;
  icon: IconName;
  desc: string;
  tone: 'success' | 'player' | 'enemy';
}> = [
  {
    id: 'easy',
    label: 'Recruit',
    icon: 'shield',
    desc: 'Relaxed bot reaction and lighter flanking pressure.',
    tone: 'success',
  },
  {
    id: 'normal',
    label: 'Operative',
    icon: 'crosshair',
    desc: 'Balanced tactical squads contesting every zone.',
    tone: 'player',
  },
  {
    id: 'hard',
    label: 'Vanguard',
    icon: 'skull',
    desc: 'Sharp accuracy, coordinated pushes, relentless cover fire.',
    tone: 'enemy',
  },
];

const WEAPON_LIST: WeaponId[] = [
  'pistol',
  'smg',
  'shotgun',
  'rifle',
  'sniper',
  'rocket',
];

const MAP_THEMES: Array<{
  id: MapTheme;
  label: string;
  tagline: string;
  tone: 'player' | 'success' | 'gold';
}> = [
  {
    id: 'fortress',
    label: 'Sci-Fi Arena',
    tagline: 'Steel walls, hazard stripes & yellow crates',
    tone: 'player',
  },
  {
    id: 'jungle',
    label: 'Jungle Outpost',
    tagline: 'Mossy stone walls, vines & brown crates',
    tone: 'success',
  },
  {
    id: 'temple',
    label: 'Ancient Temple',
    tagline: 'Glyph sandstone walls & dark-brown crates',
    tone: 'gold',
  },
  {
    id: 'slumside',
    label: 'Slumside',
    tagline: 'Tin roofs, blue tarps, crate alleys & railway flank',
    tone: 'gold',
  },
];

const MapThemeEmblem: React.FC<{ theme: MapTheme }> = ({ theme }) => {
  if (theme === 'slumside') {
    return (
      <svg width={24} height={24} viewBox="0 0 24 24" aria-hidden="true">
        <rect x="2" y="2" width="20" height="20" rx="4" fill="#4D453C" stroke="#F59E0B" strokeWidth="1.4" />
        <rect x="4" y="4" width="7" height="6" rx="1" fill="#2563EB" />
        <rect x="12" y="5" width="5" height="5" rx="1" fill="#B8532F" />
        <rect x="5" y="12" width="9" height="7" rx="1" fill="#9A9286" />
        <circle cx="9.5" cy="15.5" r="2.2" fill="#1D2228" stroke="#475569" strokeWidth="0.8" />
        <line x1="19" y1="3" x2="19" y2="21" stroke="#8C959F" strokeWidth="1.5" />
      </svg>
    );
  }
  if (theme === 'jungle') {
    return (
      <svg width={24} height={24} viewBox="0 0 24 24" aria-hidden="true">
        <rect x="2" y="2" width="20" height="20" rx="4" fill="#1D2A1E" stroke="#368247" strokeWidth="1.4" />
        <path d="M4 17 Q11 13 20 18" stroke="#176A7E" strokeWidth="3" fill="none" />
        <circle cx="9" cy="10" r="4" fill="#255E3D" />
        <circle cx="15" cy="9" r="3.5" fill="#3D8C52" />
      </svg>
    );
  }
  if (theme === 'temple') {
    return (
      <svg width={24} height={24} viewBox="0 0 24 24" aria-hidden="true">
        <rect x="2" y="2" width="20" height="20" rx="4" fill="#4A3C2A" stroke="#DFC79D" strokeWidth="1.4" />
        <path d="M5 18 L12 6 L19 18 Z" fill="#BCA178" stroke="#14100A" strokeWidth="1" />
        <rect x="10.5" y="13" width="3" height="5" fill="#1A7B8D" />
      </svg>
    );
  }
  return (
    <svg width={24} height={24} viewBox="0 0 24 24" aria-hidden="true">
      <rect x="2" y="2" width="20" height="20" rx="4" fill="#141D33" stroke="#22D3EE" strokeWidth="1.4" />
      <polygon points="12,5 18,8.5 18,15.5 12,19 6,15.5 6,8.5" fill="#2A3347" stroke="#67E8F9" strokeWidth="1.2" />
      <circle cx="12" cy="12" r="2.2" fill="#22D3EE" />
    </svg>
  );
};

export const MatchSetup: React.FC<MatchSetupProps> = ({
  initialConfig,
  onDeploy,
  onBack,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [config, setConfig] = useState<MatchConfig>(initialConfig);
  const [seedFlash, setSeedFlash] = useState(false);

  useMenuNavigation({ containerRef, onEscape: onBack });

  const activeTheme: MapTheme = config.mapTheme ?? 'fortress';
  const previewMap = useMemo(
    () => generatePreviewMap(config.seed, activeTheme),
    [config.seed, activeTheme],
  );

  useEffect(() => {
    setSeedFlash(true);
    const id = window.setTimeout(() => setSeedFlash(false), 260);
    return () => window.clearTimeout(id);
  }, [config.seed, activeTheme]);

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

    // Subtle thematic floor accents (drifted sand or mossy patches)
    for (let r = 0; r < previewMap.height; r += 2) {
      for (let c = 0; c < previewMap.width; c += 2) {
        if (previewMap.tiles[r][c] !== 'floor') continue;
        if ((c * 7 + r * 11 + previewMap.seed) % 13 !== 0) continue;
        if (previewMap.theme === 'temple') {
          ctx.fillStyle = 'rgba(212, 185, 134, 0.28)';
          ctx.fillRect(c * scaleX, r * scaleY, scaleX * 2.2, scaleY * 1.4);
        } else if (previewMap.theme === 'jungle') {
          ctx.fillStyle = 'rgba(54, 130, 71, 0.25)';
          ctx.fillRect(c * scaleX, r * scaleY, scaleX * 1.8, scaleY * 1.5);
        } else if (previewMap.theme === 'slumside') {
          ctx.fillStyle = 'rgba(154, 137, 112, 0.26)';
          ctx.fillRect(c * scaleX, r * scaleY, scaleX * 2, scaleY * 1.4);
        }
      }
    }

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
          ctx.fillStyle = 'rgba(34, 211, 238, 0.34)';
          ctx.fillRect(px, py, Math.ceil(scaleX), Math.ceil(scaleY));
        } else if (tile === 'spawnEnemy') {
          ctx.fillStyle = 'rgba(255, 90, 60, 0.34)';
          ctx.fillRect(px, py, Math.ceil(scaleX), Math.ceil(scaleY));
        }
      }
    }

    // Flat 2D top-down preview pass for 1x1 crates and flat block walls
    for (let r = 0; r < previewMap.height; r += 1) {
      for (let c = 0; c < previewMap.width; c += 1) {
        const tile = previewMap.tiles[r][c];
        const px = c * scaleX;
        const py = r * scaleY;
        if (tile === 'lowCover') {
          ctx.fillStyle = tp.crateBody;
          ctx.fillRect(px, py, Math.ceil(scaleX), Math.ceil(scaleY));
          ctx.strokeStyle = PALETTE.bg0;
          ctx.lineWidth = 0.8;
          ctx.strokeRect(px, py, Math.ceil(scaleX), Math.ceil(scaleY));
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
      ctx.fillStyle = 'rgba(34, 211, 238, 0.16)';
      ctx.beginPath();
      ctx.arc(zx, zy, 13, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = previewMap.theme === 'fortress' ? PALETTE.gold : PALETTE.playerGlow;
      ctx.lineWidth = 1.6;
      ctx.stroke();

      const zoneLabel = formatZoneCode(z.id);
      ctx.fillStyle = PALETTE.textHi;
      ctx.font = '800 10px Bahnschrift, "Segoe UI", system-ui, sans-serif';
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

  return (
    <div
      ref={containerRef}
      className="ht-root ht-screen-full ht-screen-enter"
      style={{ background: 'radial-gradient(circle at 50% 0%, #101A30 0%, #070B14 75%)' }}
    >
      <div className="ht-setup-grid">
        <Panel bracketed style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div className="ht-display" style={{ fontSize: 11, color: 'var(--player)' }}>
                OPERATION BRIEFING
              </div>
              <h2 className="ht-display" style={{ fontSize: 24, marginTop: 2 }}>
                MATCH SETUP
              </h2>
            </div>
            <Button variant="ghost" size="sm" onClick={onBack}>
              Back
            </Button>
          </div>

          <div className="ht-stagger" style={{ ['--stagger-i' as string]: 1 }}>
            <div className="ht-display" style={{ fontSize: 12, color: 'var(--text-mid)', marginBottom: 8 }}>
              Combat Mode
            </div>
            <div className="ht-diff-segmented" role="radiogroup" aria-label="Combat Mode" style={{ marginBottom: 14 }}>
              <button
                type="button"
                role="radio"
                aria-checked={activeMode === 'zoneControl'}
                className={`ht-diff-pill ${activeMode === 'zoneControl' ? 'is-selected' : ''}`}
                onClick={() => switchMode('zoneControl')}
              >
                <Icon name="zone" size={14} color="var(--player)" />
                <span>Zone Control</span>
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={isHellcell}
                className={`ht-diff-pill ${isHellcell ? 'is-selected' : ''}`}
                onClick={() => switchMode('hellcell')}
              >
                <Icon name="boss" size={14} color="var(--gold)" />
                <span>Hellcell (PvPvE)</span>
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={isRampage}
                className={`ht-diff-pill ${isRampage ? 'is-selected' : ''}`}
                onClick={() => switchMode('rampage')}
              >
                <Icon name="skull" size={14} color="var(--enemy)" />
                <span>Rampage (FFA)</span>
              </button>
            </div>
            <p style={{ fontSize: 11, color: 'var(--text-mid)', marginBottom: 14 }}>
              {isRampage
                ? 'No teams. All bots fight each other — highest kill count wins!'
                : isHellcell
                  ? 'Hellcell mode: PvPvE battle where capturing Zones A & C triggers a temporary ceasefire and unleashes a wall-crushing Boss from Zone B. Dealing majority damage scores bonus points and refuels HP/ammo.'
                  : 'Squad vs squad tactical battle for zones A, B, and C.'}
            </p>

            <div className="ht-display" style={{ fontSize: 12, color: 'var(--text-mid)', marginBottom: 8 }}>
              Difficulty Tier
            </div>
            <div className="ht-diff-segmented" role="radiogroup" aria-label="Difficulty Tier">
              {DIFFICULTIES.map((d) => {
                const isSel = config.difficulty === d.id;
                return (
                  <button
                    key={d.id}
                    type="button"
                    role="radio"
                    aria-checked={isSel}
                    className={`ht-diff-pill ${isSel ? 'is-selected' : ''}`}
                    onClick={() => setConfig((p) => ({ ...p, difficulty: d.id }))}
                  >
                    <Icon name={d.icon} size={14} color={`var(--${d.tone})`} />
                    <span>{d.label}</span>
                  </button>
                );
              })}
            </div>
            <p style={{ fontSize: 11, color: 'var(--text-mid)', marginTop: 6 }}>
              {DIFFICULTIES.find((d) => d.id === config.difficulty)?.desc}
            </p>
          </div>

          <div
            className="ht-stagger"
            style={{
              ['--stagger-i' as string]: 2,
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: 16,
            }}
          >
            <Slider
              label={isRampage ? 'Arena Bots' : 'Team Size'}
              min={isRampage ? 3 : 2}
              max={isRampage ? 12 : 10}
              value={config.enemyCount}
              onChange={(enemyCount) => setConfig((p) => ({ ...p, enemyCount }))}
            />
            <Slider
              label={isRampage ? 'Kills To Win' : 'Score To Win'}
              min={isRampage ? 5 : isHellcell ? 300 : 200}
              max={isRampage ? 50 : isHellcell ? 1500 : 1000}
              step={isRampage ? 5 : 50}
              value={config.scoreToWin}
              onChange={(scoreToWin) => setConfig((p) => ({ ...p, scoreToWin }))}
            />
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', fontSize: 12, color: 'var(--text-mid)' }}>
            {isRampage ? (
              <>
                <Badge tone="enemy">
                  FREE-FOR-ALL: YOU VS {config.enemyCount} BOTS
                </Badge>
                <Badge tone="gold">
                  NO TEAMS · MAX KILLS WINS · 2 GRENADES (G)
                </Badge>
              </>
            ) : (
              <>
                <Badge tone="player">
                  BLUE SQUAD: YOU + {Math.max(0, config.enemyCount - 1)} ALLIES
                </Badge>
                <Badge tone="enemy">
                  RED SQUAD: {config.enemyCount} BOTS
                </Badge>
              </>
            )}
          </div>

          <div className="ht-stagger" style={{ ['--stagger-i' as string]: 3 }}>
            <div className="ht-display" style={{ fontSize: 12, color: 'var(--text-mid)', marginBottom: 8 }}>
              Starting Weapon
            </div>
            <div className="ht-weapon-grid">
              {WEAPON_LIST.map((wid) => {
                const def = WEAPON_DEFS[wid];
                const isSel = config.startingWeapon === wid;
                return (
                  <Card
                    key={wid}
                    interactive
                    selected={isSel}
                    style={{ padding: 10 }}
                    onClick={() => setConfig((p) => ({ ...p, startingWeapon: wid }))}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Icon name={wid} size={20} color={isSel ? 'var(--player)' : 'var(--text-hi)'} />
                      <Badge tone={def.rarity}>{def.rarity}</Badge>
                    </div>
                    <div className="ht-display" style={{ fontSize: 12, marginTop: 6 }}>
                      {def.name}
                    </div>
                  </Card>
                );
              })}
            </div>

            <Panel tone="subtle" style={{ marginTop: 10, padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="ht-display" style={{ fontSize: 12, color: 'var(--player-glow)' }}>
                  {selectedWeapon.name} Telemetry
                </span>
                <Badge tone={selectedWeapon.rarity}>{selectedWeapon.automatic ? 'AUTO' : 'SEMI'}</Badge>
              </div>
              <StatBar
                label="Damage"
                value={selectedWeapon.damage * selectedWeapon.pellets}
                max={100}
              />
              <StatBar
                label="Fire Rate"
                value={selectedWeapon.fireRate}
                max={12}
                decimals={1}
                suffix="/s"
              />
              <StatBar
                label="Range"
                value={selectedWeapon.range}
                max={1500}
                color="var(--gold)"
              />
            </Panel>
          </div>
        </Panel>

        <Panel
          bracketed
          style={{
            padding: 24,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: 16,
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="ht-display" style={{ fontSize: 14 }}>
                {MAP_THEME_PALETTES[activeTheme].name}
              </span>
              <Badge tone="gold">SEED #{config.seed}</Badge>
            </div>

            <div>
              <div className="ht-display" style={{ fontSize: 11, color: 'var(--text-mid)', marginBottom: 6 }}>
                Battleground Map
              </div>
              <div className="ht-diff-grid">
                {MAP_THEMES.map((m) => {
                  const isSel = activeTheme === m.id;
                  return (
                    <Card
                      key={m.id}
                      interactive
                      selected={isSel}
                      style={{ padding: 10 }}
                      onClick={() => setConfig((p) => ({ ...p, mapTheme: m.id }))}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <MapThemeEmblem theme={m.id} />
                        <span className="ht-display" style={{ fontSize: 11 }}>
                          {m.label}
                        </span>
                      </div>
                      <p style={{ fontSize: 10, color: 'var(--text-mid)', lineHeight: 1.35 }}>
                        {m.tagline}
                      </p>
                    </Card>
                  );
                })}
              </div>
            </div>

            <div
              style={{
                position: 'relative',
                borderRadius: 'var(--radius-md)',
                overflow: 'hidden',
                border: '1px solid var(--line)',
                boxShadow: seedFlash ? 'var(--glow-player)' : 'var(--shadow-sm)',
                transition: 'box-shadow 220ms var(--ease-standard)',
              }}
            >
              <canvas
                ref={previewCanvasRef}
                width={420}
                height={280}
                style={{
                  width: '100%',
                  height: 'auto',
                  display: 'block',
                  transform: seedFlash ? 'scale(1.02)' : 'scale(1)',
                  transition: 'transform 220ms var(--ease-snappy)',
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <label style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ fontSize: 11, color: 'var(--text-mid)', textTransform: 'uppercase' }}>
                  Map Seed
                </span>
                <input
                  type="number"
                  className="ht-select ht-num"
                  value={config.seed}
                  onChange={(e) =>
                    setConfig((p) => ({
                      ...p,
                      seed: Math.max(1, Number(e.target.value) || 1),
                    }))
                  }
                />
              </label>
              <Button
                variant="secondary"
                style={{ marginTop: 18 }}
                onClick={randomizeSeed}
                aria-label="Randomize Seed"
              >
                <Icon name="dice" size={16} /> Randomize
              </Button>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, fontSize: 11, color: 'var(--text-mid)' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}>
                <Badge tone="player">BLUE</Badge> Friendly Base
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}>
                <Badge tone="enemy">ORANGE</Badge> Hostile Base
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}>
                <Badge tone="gold">A B C</Badge> Capture Zones
              </span>
            </div>
          </div>

          <Button
            variant="primary"
            size="lg"
            style={{ width: '100%' }}
            onClick={() => onDeploy(config)}
          >
            <Icon name="play" size={18} /> DEPLOY TO ARENA
          </Button>
        </Panel>
      </div>
    </div>
  );
};
