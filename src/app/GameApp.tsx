import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent } from 'react';
import { AudioEngine } from '../audio';
import { Renderer } from '../render';
import type { ViewTransform as RenderViewTransform } from '../render';
import { bus } from '../shared/events';
import type { MatchConfig, Team } from '../shared/types';
import { createSim } from '../sim';
import {
  CountdownOverlay,
  GameOver,
  HowToPlayModal,
  HUD,
  MainMenu,
  MatchSetup,
  PauseMenu,
  SettingsModal,
  applySettingsToDom,
  loadSettings,
  registerUiSoundSink,
  saveSettings,
} from '../ui';
import type { GameSettings, MatchStats } from '../ui';
import { GameController } from './GameController';
import { GameProvider, useGameController, useGameState } from './useGameState';

const INITIAL_CONFIG: MatchConfig = {
  seed: 4242,
  difficulty: 'normal',
  scoreToWin: 120,
  enemyCount: 4,
  startingWeapon: 'rifle',
  mapTheme: 'jungle',
};

type Screen = 'menu' | 'setup' | 'countdown' | 'playing' | 'paused' | 'won' | 'lost';

/** Real-game entry point: Antigravity presentation tracks driven by the pure sim. */
export function GameApp() {
  const controller = useMemo(() => new GameController(createSim()), []);
  return (
    <GameProvider controller={controller}>
      <GameRoot />
    </GameProvider>
  );
}

function GameRoot() {
  const controller = useGameController();
  const state = useGameState();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<Renderer | null>(null);
  const audioRef = useRef<AudioEngine | null>(null);
  const viewRef = useRef<RenderViewTransform | null>(null);

  const [screen, setScreen] = useState<Screen>('menu');
  const [settings, setSettings] = useState<GameSettings>(() => loadSettings());
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [howToOpen, setHowToOpen] = useState(false);
  const [matchConfig, setMatchConfig] = useState<MatchConfig>(INITIAL_CONFIG);
  const [aimScreenPos, setAimScreenPos] = useState<{ x: number; y: number } | null>(null);
  const [viewTransform, setViewTransform] = useState<RenderViewTransform | null>(null);
  const [endStats, setEndStats] = useState<MatchStats | null>(null);
  const [endScore, setEndScore] = useState<{ player: number; enemy: number }>({
    player: 0,
    enemy: 0,
  });

  // Apply persisted settings to the DOM, renderer and audio engine.
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

  // Mount the renderer, audio engine, input capture and the fixed-step controller loop.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const renderer = new Renderer();
    renderer.init(canvas);
    rendererRef.current = renderer;
    renderer.setViewTransform((vt) => {
      viewRef.current = vt;
      controller.setViewTransform({
        offsetX: vt.width * 0.5 - vt.camX * vt.zoom,
        offsetY: vt.height * 0.5 - vt.camY * vt.zoom,
        scale: vt.zoom,
      });
    });

    const audio = new AudioEngine();
    audio.init('player-1');
    audioRef.current = audio;
    registerUiSoundSink({
      hover: () => audio.playUiHover(),
      click: () => audio.playUiClick(),
      confirm: () => audio.playUiConfirm(),
      back: () => audio.playUiBack(),
    });

    const detachInput = controller.attach(canvas);
    controller.start();

    const onResize = (): void => renderer.resize();
    window.addEventListener('resize', onResize);
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(onResize) : null;
    observer?.observe(canvas);

    let rafId = 0;
    let prev = 0;
    let lastViewPublish = 0;
    const frame = (now: number): void => {
      const dt = prev === 0 ? 1 / 60 : Math.min(0.05, Math.max(0.001, (now - prev) / 1000));
      prev = now;
      const live = controller.getState();
      renderer.draw(live);

      const player = live.units.find((unit) => unit.id === live.playerId);
      if (player) {
        audio.setListenerPos(player.pos);
        audio.update(dt, player.hp / Math.max(1, player.maxHp), live.projectiles.length > 0);
      }
      if (viewRef.current && now - lastViewPublish >= 50) {
        lastViewPublish = now;
        setViewTransform(viewRef.current);
      }
      rafId = requestAnimationFrame(frame);
    };
    rafId = requestAnimationFrame(frame);

    let playerShots = 0;
    let enemyHits = 0;
    let totalEnemyDamage = 0;
    let totalCaptures = 0;

    const offStart = bus.on('match:start', () => {
      playerShots = 0;
      enemyHits = 0;
      totalEnemyDamage = 0;
      totalCaptures = 0;
    });
    const offShot = bus.on('shot', ({ unitId }) => {
      if (unitId === controller.getState().playerId) playerShots += 1;
    });
    const offHit = bus.on('hit', ({ targetId, damage }) => {
      const live = controller.getState();
      const target = live.units.find((unit) => unit.id === targetId);
      if (target && target.team === 'enemy') {
        enemyHits += 1;
        totalEnemyDamage += damage;
      }
    });
    const offCap = bus.on('zone:captured', ({ team }) => {
      if (team === 'player') totalCaptures += 1;
    });

    const offEnd = bus.on('match:end', ({ winner }) => {
      const live = controller.getState();
      const player = live.units.find((unit) => unit.id === live.playerId);
      const ownedNow = live.zones.filter((zone) => zone.owner === 'player').length;
      const accuracyPct =
        playerShots > 0 ? Math.min(99, Math.round((enemyHits / playerShots) * 100)) : 0;
      setEndScore({ player: live.score.player, enemy: live.score.enemy });
      setEndStats({
        kills: player?.kills ?? 0,
        deaths: player?.deaths ?? 0,
        accuracyPct,
        zonesCaptured: Math.max(totalCaptures, ownedNow),
        damageDealt: Math.round(totalEnemyDamage),
        elapsedSeconds: live.time,
        bestWeapon: player?.weaponId ?? 'pistol',
      });
      setScreen(winner === 'player' ? 'won' : 'lost');
    });

    return () => {
      cancelAnimationFrame(rafId);
      offStart();
      offShot();
      offHit();
      offCap();
      offEnd();
      observer?.disconnect();
      window.removeEventListener('resize', onResize);
      controller.stop();
      detachInput();
      renderer.destroy();
      audio.destroy();
      rendererRef.current = null;
      audioRef.current = null;
    };
  }, [controller]);

  const beginMatch = useCallback(
    (config: MatchConfig) => {
      setMatchConfig(config);
      controller.startMatch(config);
      controller.getSim().pause();
      setAimScreenPos(null);
      setEndStats(null);
      setScreen('countdown');
    },
    [controller],
  );

  const playAgain = useCallback(() => {
    beginMatch({ ...matchConfig, seed: (Math.random() * 0xffffffff) >>> 0 });
  }, [beginMatch, matchConfig]);

  const togglePause = useCallback(() => {
    if (screen === 'playing') {
      controller.getSim().pause();
      setScreen('paused');
    } else if (screen === 'paused') {
      controller.getSim().resume();
      setScreen('playing');
    }
  }, [controller, screen]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      if (
        (event.code === 'Escape' || event.code === 'KeyP') &&
        !settingsOpen &&
        !howToOpen &&
        (screen === 'playing' || screen === 'paused')
      ) {
        event.preventDefault();
        togglePause();
      }
      if (event.code === 'Enter' && (screen === 'won' || screen === 'lost')) playAgain();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [screen, settingsOpen, howToOpen, togglePause, playAgain]);

  const onMouseMove = (event: ReactMouseEvent<HTMLDivElement>): void => {
    setAimScreenPos({ x: event.clientX, y: event.clientY });
    const vt = viewRef.current;
    if (vt) rendererRef.current?.setAimTarget(vt.screenToWorld(event.clientX, event.clientY));
  };

  const inMatch = screen === 'playing' || screen === 'paused';

  return (
    <div
      className="ht-root"
      style={{
        position: 'relative',
        width: '100vw',
        height: '100vh',
        cursor: screen === 'playing' ? 'none' : undefined,
      }}
      onMouseMove={onMouseMove}
    >
      <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} aria-label="Zone Control arena" />

      {inMatch && (
        <HUD
          state={state}
          viewTransform={viewTransform}
          aimScreenPos={aimScreenPos}
          crosshairStyle={settings.crosshairStyle}
          colorblindAssist={settings.colorblindAssist}
          showHints={settings.showHints}
          onStreak={(count) => audioRef.current?.playStreakStinger(count)}
        />
      )}

      {screen === 'menu' && (
        <MainMenu
          onPlay={() => setScreen('setup')}
          onLoadout={() => setScreen('setup')}
          onSettings={() => setSettingsOpen(true)}
          onHowToPlay={() => setHowToOpen(true)}
        />
      )}

      {screen === 'setup' && (
        <MatchSetup
          initialConfig={matchConfig}
          onDeploy={(cfg) => beginMatch(cfg)}
          onBack={() => setScreen('menu')}
        />
      )}

      {screen === 'countdown' && (
        <CountdownOverlay
          mapTheme={matchConfig.mapTheme}
          difficulty={matchConfig.difficulty}
          scoreToWin={matchConfig.scoreToWin}
          onTick={(remaining) => audioRef.current?.playCountdownTick(remaining <= 0)}
          onComplete={() => {
            controller.getSim().resume();
            setScreen('playing');
          }}
        />
      )}

      {screen === 'paused' && (
        <PauseMenu
          score={state.score}
          elapsedSeconds={state.time}
          mapTheme={state.map.theme}
          onResume={() => {
            controller.getSim().resume();
            setScreen('playing');
          }}
          onSettings={() => setSettingsOpen(true)}
          onRestart={playAgain}
          onQuit={() => setScreen('menu')}
        />
      )}

      {(screen === 'won' || screen === 'lost') && endStats && (
        <GameOver
          winner={(screen === 'won' ? 'player' : 'enemy') as Team}
          playerScore={endScore.player}
          enemyScore={endScore.enemy}
          stats={endStats}
          onPlayAgain={playAgain}
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
      <HowToPlayModal open={howToOpen} onClose={() => setHowToOpen(false)} />
    </div>
  );
}

