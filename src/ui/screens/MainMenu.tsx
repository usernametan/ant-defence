import React, { useEffect, useRef, useState } from 'react';
import { PALETTE } from '../../render/palette';
import { Badge, Button, Icon, KeyCap, Panel, useMenuNavigation } from '../design';
import { generatePreviewMap } from '../previewMap';
import '../ui.css';

export interface MainMenuProps {
  onPlay: () => void;
  onLoadout: () => void;
  onSettings: () => void;
  onHowToPlay: () => void;
  version?: string;
}

export const MainMenu: React.FC<MainMenuProps> = ({
  onPlay,
  onLoadout,
  onSettings,
  onHowToPlay,
  version = 'v0.1.0',
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mouseRef = useRef<{ x: number; y: number }>({ x: 0.5, y: 0.5 });
  const [hovered, setHovered] = useState<string>('Deploy into 3-zone tactical combat');

  useMenuNavigation({ containerRef });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const map = generatePreviewMap(4242);
    let rafId = 0;
    const start = performance.now();

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const particles = Array.from({ length: 42 }, (_, i) => ({
      x: (i * 173) % 1920,
      y: (i * 97) % 1080,
      vx: 14 + (i % 5) * 6,
      vy: -6 + (i % 3) * 4,
      r: 1.5 + (i % 3) * 0.9,
      gold: i % 7 === 0,
    }));

    const drawFrame = (now: number) => {
      const t = (now - start) / 1000;
      const w = canvas.width;
      const h = canvas.height;
      const mx = (mouseRef.current.x - 0.5) * 34;
      const my = (mouseRef.current.y - 0.5) * 24;

      ctx.fillStyle = PALETTE.bg0;
      ctx.fillRect(0, 0, w, h);

      // Slow cinematic pan across preview map
      const panX = Math.sin(t * 0.14) * 220 + mx;
      const panY = Math.cos(t * 0.11) * 140 + my;
      const ts = map.tileSize;
      const mapW = map.width * ts;
      const mapH = map.height * ts;

      ctx.save();
      ctx.translate(w * 0.5 - mapW * 0.5 - panX, h * 0.5 - mapH * 0.5 - panY);

      ctx.strokeStyle = PALETTE.line;
      ctx.lineWidth = 1;
      ctx.globalAlpha = 0.25;
      for (let c = 0; c <= map.width; c += 2) {
        ctx.beginPath();
        ctx.moveTo(c * ts, 0);
        ctx.lineTo(c * ts, mapH);
        ctx.stroke();
      }
      for (let r = 0; r <= map.height; r += 2) {
        ctx.beginPath();
        ctx.moveTo(0, r * ts);
        ctx.lineTo(mapW, r * ts);
        ctx.stroke();
      }

      ctx.globalAlpha = 0.65;
      for (let r = 0; r < map.height; r += 1) {
        for (let c = 0; c < map.width; c += 1) {
          const tile = map.tiles[r][c];
          if (tile === 'wall') {
            ctx.fillStyle = PALETTE.wallSide;
            ctx.fillRect(c * ts, r * ts, ts, ts);
          } else if (tile === 'lowCover') {
            ctx.fillStyle = PALETTE.crateBody;
            ctx.fillRect(c * ts + 4, r * ts + 4, ts - 8, ts - 8);
          } else if (tile === 'water') {
            ctx.fillStyle = PALETTE.waterDeep;
            ctx.fillRect(c * ts, r * ts, ts, ts);
          }
        }
      }

      for (const z of map.zones) {
        const col = z.id === 'A' ? PALETTE.player : z.id === 'C' ? PALETTE.enemy : PALETTE.gold;
        ctx.strokeStyle = col;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(z.center.x, z.center.y, z.radius, 0, Math.PI * 2);
        ctx.stroke();

        // Subtle sweeping radar arc
        ctx.save();
        ctx.translate(z.center.x, z.center.y);
        ctx.rotate(t * 0.55 + (z.id === 'B' ? 1.5 : 0));
        ctx.strokeStyle = col;
        ctx.globalAlpha = 0.4;
        ctx.lineWidth = 1.5;
        ctx.setLineDash([14, 10]);
        ctx.beginPath();
        ctx.arc(0, 0, z.radius * 0.72, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
      ctx.restore();

      // Drifting parallax particles
      for (const p of particles) {
        const px = ((p.x + t * p.vx + mx * 1.4) % w + w) % w;
        const py = ((p.y + t * p.vy + my * 1.4) % h + h) % h;
        ctx.fillStyle = p.gold ? PALETTE.gold : PALETTE.player;
        ctx.globalAlpha = p.gold ? 0.45 : 0.35;
        ctx.beginPath();
        ctx.arc(px, py, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      rafId = requestAnimationFrame(drawFrame);
    };

    rafId = requestAnimationFrame(drawFrame);
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="ht-root ht-screen-enter"
      style={{ position: 'fixed', inset: 0, zIndex: 'var(--z-menu)' }}
      onMouseMove={(e) => {
        mouseRef.current = {
          x: e.clientX / Math.max(1, window.innerWidth),
          y: e.clientY / Math.max(1, window.innerHeight),
        };
      }}
    >
      <canvas ref={canvasRef} className="ht-living-bg" aria-hidden="true" />
      <div className="ht-menu-scrim" aria-hidden="true" />

      <div className="ht-screen-full" style={{ zIndex: 2 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Badge tone="player">SECTOR COMMAND // ONLINE</Badge>
          <Badge tone="gold">{version}</Badge>
        </div>

        <div className="ht-menu-grid">
          <div style={{ maxWidth: 620 }}>
            <div className="ht-stagger" style={{ ['--stagger-i' as string]: 0 }}>
              <div
                className="ht-display"
                style={{ fontSize: 12, color: 'var(--player-glow)', marginBottom: 8 }}
              >
                TACTICAL ARENA PROTOCOL
              </div>
              <h1 className="ht-display ht-title-sweep">ZONE CONTROL</h1>
              <p style={{ color: 'var(--text-mid)', marginTop: 12, fontSize: 14, maxWidth: 480, lineHeight: 1.55 }}>
                Capture three tactical sectors, shatter enemy cover, and hold the line until your squad hits the score limit.
              </p>
            </div>

            <div className="ht-menu-stack" style={{ marginTop: 28 }}>
              <div className="ht-stagger" style={{ ['--stagger-i' as string]: 1 }}>
                <Button
                  variant="primary"
                  size="lg"
                  style={{ width: '100%', justifyContent: 'space-between' }}
                  onMouseEnter={() => setHovered('Launch match configuration & sector seed')}
                  onClick={onPlay}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
                    <Icon name="play" size={16} /> Play
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--player-glow)' }}>DEPLOY</span>
                </Button>
              </div>

              <div className="ht-stagger" style={{ ['--stagger-i' as string]: 2 }}>
                <Button
                  variant="secondary"
                  style={{ width: '100%', justifyContent: 'space-between' }}
                  onMouseEnter={() => setHovered('Inspect & pick starting firearm')}
                  onClick={onLoadout}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
                    <Icon name="rifle" size={16} /> Loadout
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--text-mid)' }}>ARMORY</span>
                </Button>
              </div>

              <div className="ht-stagger" style={{ ['--stagger-i' as string]: 3 }}>
                <Button
                  variant="secondary"
                  style={{ width: '100%', justifyContent: 'space-between' }}
                  onMouseEnter={() => setHovered('Audio, graphics quality, crosshair & accessibility')}
                  onClick={onSettings}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
                    <Icon name="settings" size={16} /> Settings
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--text-mid)' }}>SYSTEM</span>
                </Button>
              </div>

              <div className="ht-stagger" style={{ ['--stagger-i' as string]: 4 }}>
                <Button
                  variant="ghost"
                  style={{ width: '100%', justifyContent: 'space-between' }}
                  onMouseEnter={() => setHovered('Controls, cover mechanics & zone rules')}
                  onClick={onHowToPlay}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
                    <Icon name="zone" size={16} /> How to Play
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--text-mid)' }}>BRIEFING</span>
                </Button>
              </div>
            </div>

            <Panel
              tone="subtle"
              style={{
                marginTop: 20,
                padding: '10px 14px',
                width: 'min(420px, 100%)',
                fontSize: 12,
                color: 'var(--text-mid)',
              }}
            >
              {hovered}
            </Panel>
          </div>

          <Panel
            bracketed
            className="ht-menu-briefing ht-stagger"
            style={{ ['--stagger-i' as string]: 3, padding: 20 }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="ht-display" style={{ fontSize: 12, color: 'var(--player-glow)' }}>
                SECTOR INTEL
              </span>
              <Badge tone="gold">3 ZONES · 6 WEAPONS</Badge>
            </div>
            <div className="ht-menu-intel-grid">
              <div className="ht-menu-intel-cell">
                <span className="ht-menu-intel-k">OBJECTIVE</span>
                <span className="ht-menu-intel-v">Capture Z1–Z3 or breach Enemy Core</span>
              </div>
              <div className="ht-menu-intel-cell">
                <span className="ht-menu-intel-k">COVER</span>
                <span className="ht-menu-intel-v">Crates block gunfire until shattered</span>
              </div>
              <div className="ht-menu-intel-cell">
                <span className="ht-menu-intel-k">DROPS</span>
                <span className="ht-menu-intel-v">Press E over fallen rare/epic arms</span>
              </div>
              <div className="ht-menu-intel-cell">
                <span className="ht-menu-intel-k">VITALITY</span>
                <span className="ht-menu-intel-v">Regenerates after 4.5s out of combat</span>
              </div>
            </div>
          </Panel>
        </div>

        <footer className="ht-menu-footer">
          <div className="ht-menu-keys">
            <span><KeyCap label="WASD" /> Move</span>
            <span><KeyCap label="MOUSE" /> Aim & Fire</span>
            <span><KeyCap label="R" /> Reload</span>
            <span><KeyCap label="E" /> Swap</span>
            <span><KeyCap label="Q / SHIFT" /> Dash</span>
            <span><KeyCap label="ESC" /> Pause</span>
          </div>
          <span>Arrow Keys / Gamepad D-Pad to Navigate · {version}</span>
        </footer>
      </div>
    </div>
  );
};
