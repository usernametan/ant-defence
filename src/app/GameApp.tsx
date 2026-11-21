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
import type { GameSettings, MatchStats, RampageStanding } from '../ui';
import { GameController } from './GameController';
import { GameProvider, useGameController, useGameState } from './useGameState';

const INITIAL_CONFIG: MatchConfig = {
  seed: 4242,
  difficulty: 'normal',
  scoreToWin: 600,
  enemyCount: 4,
  startingWeapon: 'rifle',
  mapTheme: 'slumside',
};

type Screen = 'menu' | 'setup' | 'countdown' | 'playing' | 'paused' | 'won' | 'lost';

/** Real-game entry point: Holo-Tactical presentation wired to the pure sim. */
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
  const aimScreenRef = useRef<{ x: number; y: number } | null>(null);
  const scopedRef = useRef(false);

  const [screen, setScreen] = useState<Screen>('menu');
  const [settings, setSettings] = useState<GameSettings>(() => loadSettings());
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [howToOpen, setHowToOpen] = useState(false);
  const [matchConfig, setMatchConfig] = useState<MatchConfig>(INITIAL_CONFIG);
  const [aimScreenPos, setAimScreenPos] = useState<{ x: number; y: number } | null>(null);
  const [isScoped, setIsScoped] = useState(false);
  const [viewTransform, setViewTransform] = useState<RenderViewTransform | null>(null);
  const [endStats, setEndStats] = useState<MatchStats | null>(null);
  const [endScore, setEndScore] = useState<{ player: number; enemy: number }>({
    player: 0,
    enemy: 0,
  });
  const [endStandings, setEndStandings] = useState<RampageStanding[]>([]);
  const [endWinnerName, setEndWinnerName] = useState<string | undefined>(undefined);

  // Apply persisted settings to the DOM, controller, renderer and audio engine.
  useEffect(() => {
    applySettingsToDom(settings);
    saveSettings(settings);
    controller.setScopeMode(settings.scopeMode);
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
  }, [controller, settings]);

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
      if (aimScreenRef.current && viewRef.current) {
        renderer.setAimTarget(
          viewRef.current.screenToWorld(aimScreenRef.current.x, aimScreenRef.current.y),
        );
      }
      const live = controller.getState();
      const player = live.units.find((unit) => unit.id === live.playerId);
      const scoping =
        live.status === 'playing' &&
        Boolean(player && !player.dead) &&
        controller.isScoping();
      renderer.setScoped(scoping);
      if (scopedRef.current !== scoping) {
        scopedRef.current = scoping;
        setIsScoped(scoping);
      }
      renderer.draw(live);

      if (player) {
        audio.setListenerPos(player.pos);
        audio.update(dt, player.hp / Math.max(1, player.maxHp), live.projectiles.length > 0, {
          status: live.status,
          mode: live.matchConfig.mode ?? 'zoneControl',
          score: live.score,
          scoreToWin: live.matchConfig.scoreToWin,
          boss: live.hellcell?.boss ?? null,
        });
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
      const isHostile =
        target &&
        (live.matchConfig.mode === 'rampage'
          ? target.id !== live.playerId
          : target.team === 'enemy');
      if (isHostile) {
        enemyHits += 1;
        totalEnemyDamage += damage;
      }
    });
    const offCap = bus.on('zone:captured', ({ team }) => {
      if (team === 'player') totalCaptures += 1;
    });

    const offEnd = bus.on('match:end', ({ winner, winnerId }) => {
      const live = controller.getState();
      const player = live.units.find((unit) => unit.id === live.playerId);
      const ownedNow = live.zones.filter((zone) => zone.owner === 'player').length;
      const accuracyPct =
        playerShots > 0 ? Math.min(99, Math.round((enemyHits / playerShots) * 100)) : 0;
      const sorted = [...live.units].sort((a, b) => {
        if (b.kills !== a.kills) return b.kills - a.kills;
        if (a.deaths !== b.deaths) return a.deaths - b.deaths;
        return a.isPlayer ? -1 : 1;
      });
      setEndStandings(
        sorted.map((u) => ({
          id: u.id,
          name: u.isPlayer ? 'YOU' : (u.name ?? u.id),
          kills: u.kills,
          deaths: u.deaths,
          isPlayer: u.isPlayer,
        })),
      );
      const winUnit = winnerId ? live.units.find((u) => u.id === winnerId) : sorted[0];
      setEndWinnerName(winUnit ? (winUnit.isPlayer ? 'YOU' : (winUnit.name ?? winUnit.id)) : undefined);
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
      aimScreenRef.current = null;
      scopedRef.current = false;
      setAimScreenPos(null);
      setIsScoped(false);
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
      controller.clearInput();
      scopedRef.current = false;
      setIsScoped(false);
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
    const pos = { x: event.clientX, y: event.clientY };
    aimScreenRef.current = pos;
    setAimScreenPos(pos);
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
      onContextMenu={(e) => {
        if (screen === 'playing') e.preventDefault();
      }}
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
          scoped={isScoped}
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
          mode={matchConfig.mode}
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
          mode={state.matchConfig.mode}
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
          mode={matchConfig.mode}
          winner={(screen === 'won' ? 'player' : 'enemy') as Team}
          winnerName={endWinnerName}
          standings={endStandings}
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

