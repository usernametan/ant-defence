import React, { useEffect, useMemo, useRef, useState } from 'react';
import { PALETTE } from '../../render/palette';
import { WEAPON_DEFS } from '../../shared/api';
import type { MatchConfig, MatchDifficulty, WeaponId } from '../../shared/types';
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

  const previewMap = useMemo(() => generatePreviewMap(config.seed), [config.seed]);

  useEffect(() => {
    setSeedFlash(true);
    const id = window.setTimeout(() => setSeedFlash(false), 260);
    return () => window.clearTimeout(id);
  }, [config.seed]);

  useEffect(() => {
    const canvas = previewCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    const scaleX = w / previewMap.width;
    const scaleY = h / previewMap.height;

    ctx.fillStyle = PALETTE.bg0;
    ctx.fillRect(0, 0, w, h);

    for (let r = 0; r < previewMap.height; r += 1) {
      for (let c = 0; c < previewMap.width; c += 1) {
        const tile = previewMap.tiles[r][c];
        if (tile === 'wall') {
          ctx.fillStyle = PALETTE.wallTop;
          ctx.fillRect(c * scaleX, r * scaleY, Math.ceil(scaleX), Math.ceil(scaleY));
        } else if (tile === 'lowCover') {
          ctx.fillStyle = PALETTE.crateBody;
          ctx.fillRect(c * scaleX, r * scaleY, Math.ceil(scaleX), Math.ceil(scaleY));
        } else if (tile === 'water') {
          ctx.fillStyle = '#102A49';
          ctx.fillRect(c * scaleX, r * scaleY, Math.ceil(scaleX), Math.ceil(scaleY));
        } else if (tile === 'spawnPlayer') {
          ctx.fillStyle = 'rgba(34, 211, 238, 0.25)';
          ctx.fillRect(c * scaleX, r * scaleY, Math.ceil(scaleX), Math.ceil(scaleY));
        } else if (tile === 'spawnEnemy') {
          ctx.fillStyle = 'rgba(255, 90, 60, 0.25)';
          ctx.fillRect(c * scaleX, r * scaleY, Math.ceil(scaleX), Math.ceil(scaleY));
        }
      }
    }

    for (const z of previewMap.zones) {
      const zx = (z.center.x / previewMap.tileSize) * scaleX;
      const zy = (z.center.y / previewMap.tileSize) * scaleY;
      ctx.strokeStyle = PALETTE.gold;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(zx, zy, 12, 0, Math.PI * 2);
      ctx.stroke();

      const zoneLabel = z.id === 'A' ? 'Z1' : z.id === 'B' ? 'Z2' : z.id === 'C' ? 'Z3' : z.id.replace(/^zone-/i, 'Z');
      ctx.fillStyle = PALETTE.textHi;
      ctx.font = '800 10px Bahnschrift, "Segoe UI", system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(zoneLabel, zx, zy + 0.5);
    }
  }, [previewMap]);

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
              Difficulty Tier
            </div>
            <div className="ht-diff-grid">
              {DIFFICULTIES.map((d) => (
                <Card
                  key={d.id}
                  interactive
                  selected={config.difficulty === d.id}
                  onClick={() => setConfig((p) => ({ ...p, difficulty: d.id }))}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <Icon name={d.icon} size={18} color={`var(--${d.tone})`} />
                    <span className="ht-display" style={{ fontSize: 13 }}>
                      {d.label}
                    </span>
                  </div>
                  <p style={{ fontSize: 11, color: 'var(--text-mid)', lineHeight: 1.4 }}>
                    {d.desc}
                  </p>
                </Card>
              ))}
            </div>
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
              label="Enemy Bots"
              min={2}
              max={10}
              value={config.enemyCount}
              onChange={(enemyCount) => setConfig((p) => ({ ...p, enemyCount }))}
            />
            <Slider
              label="Score To Win"
              min={50}
              max={250}
              step={10}
              value={config.scoreToWin}
              onChange={(scoreToWin) => setConfig((p) => ({ ...p, scoreToWin }))}
            />
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', fontSize: 12, color: 'var(--text-mid)' }}>
            <Badge tone="player">
              BLUE SQUAD: YOU + {Math.floor(config.enemyCount / 2)} ALLIES
            </Badge>
            <Badge tone="enemy">
              RED SQUAD: {config.enemyCount} BOTS
            </Badge>
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
                value={Math.round(selectedWeapon.fireRate * 10)}
                max={120}
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
                LIVE SECTOR PREVIEW
              </span>
              <Badge tone="gold">SEED #{config.seed}</Badge>
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
                <Badge tone="gold">Z1 Z2 Z3</Badge> Capture Zones
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
