import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AudioEngine } from '../audio';
import { Renderer } from '../render';
import type { ViewTransform } from '../render';
import type { MatchConfig } from '../shared/types';
import {
  Badge,
  Button,
  Panel,
  registerUiSoundSink,
} from './design';
import { HUD } from './hud/HUD';
import { CountdownOverlay } from './screens/CountdownOverlay';
import { GameOver } from './screens/GameOver';
import { HowToPlayModal } from './screens/HowToPlayModal';
import { MainMenu } from './screens/MainMenu';
import { MatchSetup } from './screens/MatchSetup';
import { PauseMenu } from './screens/PauseMenu';
import { SettingsModal } from './screens/SettingsModal';
import {
  applySettingsToDom,
  loadSettings,
  resetSeenHints,
  saveSettings,
} from './settingsStore';
import { StubSim } from './stubSim';

type ShowcaseScreen =
  | 'hud'
  | 'menu'
  | 'setup'
  | 'countdown'
  | 'pause'
  | 'victory'
  | 'defeat';

export const Showcase: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rendererRef = useRef<Renderer | null>(null);
  const audioRef = useRef<AudioEngine | null>(null);
  const simRef = useRef<StubSim | null>(null);

  if (!simRef.current) {
    simRef.current = new StubSim();
  }

  const [screen, setScreen] = useState<ShowcaseScreen>('hud');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [howToPlayOpen, setHowToPlayOpen] = useState(false);
  const [dockOpen, setDockOpen] = useState(false);
  const [settings, setSettings] = useState(() => loadSettings());
  const [gameState, setGameState] = useState(() => simRef.current!.getState());
  const [viewTransform, setViewTransform] = useState<ViewTransform | null>(null);
  const [aimScreenPos, setAimScreenPos] = useState<{ x: number; y: number } | null>(null);
  const [matchConfig, setMatchConfig] = useState<MatchConfig>({
    seed: 4242,
    difficulty: 'normal',
    scoreToWin: 1000,
    enemyCount: 4,
    startingWeapon: 'pistol',
    mapTheme: 'jungle',
  });

  // Apply settings & audio sink
  useEffect(() => {
    applySettingsToDom(settings);
    saveSettings(settings);
    rendererRef.current?.setOptions({
      quality: settings.quality,
      screenShakeScale: settings.screenShake / 100,
      colorblindAssist: settings.colorblindAssist,
      reducedMotion: settings.reducedMotion,
    });
    audioRef.current?.setVolumes({
      master: settings.masterVolume / 100,
      sfx: settings.sfxVolume / 100,
      music: settings.musicVolume / 100,
    });
  }, [settings]);

  // Mount Renderer + AudioEngine + StubSim loop
  useEffect(() => {
    const canvas = canvasRef.current;
    const sim = simRef.current!;
    if (!canvas) return;

    const renderer = new Renderer();
    renderer.init(canvas);
    renderer.setViewTransform((vt) => setViewTransform(vt));
    renderer.setOptions({
      quality: settings.quality,
      screenShakeScale: settings.screenShake / 100,
      colorblindAssist: settings.colorblindAssist,
      reducedMotion: settings.reducedMotion,
    });
    rendererRef.current = renderer;

    const audio = new AudioEngine();
    audio.init('player');
    audio.setVolumes({
      master: settings.masterVolume / 100,
      sfx: settings.sfxVolume / 100,
      music: settings.musicVolume / 100,
    });
    audioRef.current = audio;

    registerUiSoundSink({
      hover: () => audio.playUiHover(),
      click: () => audio.playUiClick(),
      confirm: () => audio.playUiConfirm(),
      back: () => audio.playUiBack(),
    });

    const onResize = () => renderer.resize();
    window.addEventListener('resize', onResize);

    let rafId = 0;
    let prev = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(0.05, Math.max(0.001, (now - prev) / 1000));
      prev = now;

      if (screen === 'hud') {
        sim.step(dt);
      }
      const snapshot = sim.getState();
      setGameState(snapshot);
      renderer.draw(snapshot);

      const p = snapshot.units.find((u) => u.id === snapshot.playerId);
      if (p) {
        audio.setListenerPos(p.pos);
        audio.update(dt, p.hp / Math.max(1, p.maxHp), snapshot.projectiles.length > 0);
      }

      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', onResize);
      renderer.destroy();
      audio.destroy();
    };
  }, [screen]);

  const sim = simRef.current!;
  const mockStats = useMemo(
    () => ({
      kills: 18,
      deaths: 4,
      accuracyPct: 64,
      zonesCaptured: 5,
      damageDealt: 2480,
      elapsedSeconds: 214,
      bestWeapon: matchConfig.startingWeapon,
    }),
    [matchConfig.startingWeapon],
  );

  return (
    <div
      className="ht-root"
      style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden' }}
      onMouseMove={(e) => {
        const pt = { x: e.clientX, y: e.clientY };
        setAimScreenPos(pt);
        if (viewTransform) {
          const w = viewTransform.screenToWorld(pt.x, pt.y);
          rendererRef.current?.setAimTarget(w);
          sim.setInput({
            moveX: 0,
            moveY: 0,
            aimX: w.x,
            aimY: w.y,
            firing: false,
            reload: false,
            interact: false,
            dash: false,
          });
        }
      }}
    >
      <canvas
        ref={canvasRef}
        style={{ width: '100%', height: '100%', display: 'block' }}
      />

      {screen === 'hud' && (
        <HUD
          state={gameState}
          viewTransform={viewTransform}
          aimScreenPos={aimScreenPos}
          crosshairStyle={settings.crosshairStyle}
          colorblindAssist={settings.colorblindAssist}
          showHints={false}
          initialKillFeed={[
            {
              id: 1,
              killerName: 'YOU',
              killerTeam: 'player',
              victimName: 'RogueBot',
              victimTeam: 'enemy',
              weaponId: 'rifle',
            },
            {
              id: 2,
              killerName: 'Alpha-7',
              killerTeam: 'player',
              victimName: 'Kilo-3',
              victimTeam: 'enemy',
              weaponId: 'smg',
            },
            {
              id: 3,
              killerName: 'RogueBot',
              killerTeam: 'enemy',
              victimName: 'Delta-9',
              victimTeam: 'player',
              weaponId: 'rifle',
            },
          ]}
          onStreak={(count) => audioRef.current?.playStreakStinger(count)}
        />
      )}

      {screen === 'menu' && (
        <MainMenu
          onPlay={() => setScreen('setup')}
          onLoadout={() => setScreen('setup')}
          onSettings={() => setSettingsOpen(true)}
          onHowToPlay={() => setHowToPlayOpen(true)}
        />
      )}

      {screen === 'setup' && (
        <MatchSetup
          initialConfig={matchConfig}
          onDeploy={(cfg) => {
            setMatchConfig(cfg);
            sim.start(cfg);
            setScreen('countdown');
          }}
          onBack={() => setScreen('menu')}
        />
      )}

      {screen === 'countdown' && (
        <CountdownOverlay
          mapTheme={matchConfig.mapTheme}
          difficulty={matchConfig.difficulty}
          scoreToWin={matchConfig.scoreToWin}
          onTick={(rem) => audioRef.current?.playCountdownTick(rem <= 0)}
          onComplete={() => setScreen('hud')}
        />
      )}

      {screen === 'pause' && (
        <PauseMenu
          score={gameState.score}
          elapsedSeconds={gameState.time}
          mapTheme={gameState.map.theme}
          onResume={() => setScreen('hud')}
          onSettings={() => setSettingsOpen(true)}
          onRestart={() => {
            sim.restart();
            setScreen('countdown');
          }}
          onQuit={() => setScreen('menu')}
        />
      )}

      {(screen === 'victory' || screen === 'defeat') && (
        <GameOver
          winner={screen === 'victory' ? 'player' : 'enemy'}
          playerScore={screen === 'victory' ? 100 : 74}
          enemyScore={screen === 'victory' ? 81 : 100}
          stats={mockStats}
          onPlayAgain={() => {
            sim.restart();
            setScreen('countdown');
          }}
          onChangeSetup={() => setScreen('setup')}
          onMainMenu={() => setScreen('menu')}
        />
      )}

      <SettingsModal
        open={settingsOpen}
        settings={settings}
        onChange={setSettings}
        onClose={() => setSettingsOpen(false)}
      />

      <HowToPlayModal
        open={howToPlayOpen}
        onClose={() => setHowToPlayOpen(false)}
      />

      {/* Showcase Control Panel (above operator card, zero overlap with kill feed or action bar) */}
      <div
        style={{
          position: 'fixed',
          left: 16,
          bottom: 108,
          zIndex: 'var(--z-transition)',
          maxWidth: '420px',
        }}
      >
        <Panel bracketed style={{ padding: dockOpen ? 10 : 5 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <Badge tone="gold">SHOWCASE=1</Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDockOpen((o) => !o)}
            >
              {dockOpen ? 'Hide Controls' : 'Show Controls'}
            </Button>

            {dockOpen && (
              <>
                {(
                  [
                    ['hud', 'HUD'],
                    ['menu', 'Main Menu'],
                    ['setup', 'Setup'],
                    ['countdown', 'Countdown'],
                    ['pause', 'Pause'],
                    ['victory', 'Victory'],
                    ['defeat', 'Defeat'],
                  ] as const
                ).map(([id, label]) => (
                  <Button
                    key={id}
                    size="sm"
                    variant={screen === id ? 'primary' : 'secondary'}
                    onClick={() => setScreen(id)}
                  >
                    {label}
                  </Button>
                ))}

                <Button size="sm" variant="secondary" onClick={() => setSettingsOpen(true)}>
                  Settings
                </Button>
                <Button size="sm" variant="secondary" onClick={() => setHowToPlayOpen(true)}>
                  How To Play
                </Button>
              </>
            )}
          </div>

          {dockOpen && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
              <Button size="sm" variant="danger" onClick={() => sim.triggerDamage(22)}>
                Hit Damage
              </Button>
              <Button size="sm" variant="danger" onClick={() => sim.triggerLowHealth()}>
                Low HP (&lt;30%)
              </Button>
              <Button size="sm" variant="secondary" onClick={() => sim.triggerHeal()}>
                Regen +HP
              </Button>
              <Button size="sm" variant="secondary" onClick={() => sim.triggerZoneCapture('B', 'player')}>
                Capture Zone B
              </Button>
              <Button size="sm" variant="secondary" onClick={() => sim.triggerZoneContested('B')}>
                Zone Contested
              </Button>
              <Button size="sm" variant="secondary" onClick={() => sim.triggerKillStreak()}>
                Kill / Streak
              </Button>
              <Button size="sm" variant="secondary" onClick={() => sim.triggerExplosion()}>
                Explosion
              </Button>
              <Button size="sm" variant="secondary" onClick={() => sim.triggerSpawnPickup('sniper')}>
                Spawn Pickup
              </Button>
              <Button size="sm" variant="secondary" onClick={() => sim.triggerSwapWeapon()}>
                Swap Weapon
              </Button>
              <Button size="sm" variant="secondary" onClick={() => sim.triggerReload()}>
                Reload Ring
              </Button>
              <Button size="sm" variant="secondary" onClick={() => sim.triggerRespawnPreview()}>
                Respawn Screen
              </Button>
              {(['jungle', 'temple', 'fortress', 'slumside'] as const).map((theme) => (
                <Button
                  key={theme}
                  size="sm"
                  variant={matchConfig.mapTheme === theme ? 'primary' : 'secondary'}
                  onClick={() => {
                    const next = { ...matchConfig, mapTheme: theme };
                    setMatchConfig(next);
                    sim.start(next);
                    setGameState(sim.getState());
                  }}
                >
                  Map: {theme[0].toUpperCase() + theme.slice(1)}
                </Button>
              ))}
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  resetSeenHints();
                  setSettings((s) => ({ ...s, showHints: false }));
                  window.setTimeout(() => setSettings((s) => ({ ...s, showHints: true })), 20);
                }}
              >
                Reset Hints
              </Button>
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
};
