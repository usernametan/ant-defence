import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import type { GameState } from '../shared/types';
import type { GameController } from './GameController';

/** HUD snapshots refresh at 15 Hz while the renderer reads live state each frame. */
const HUD_INTERVAL_MS = 1000 / 15;

interface GameContextValue {
  controller: GameController;
}

const GameContext = createContext<GameContextValue | null>(null);

export function GameProvider({
  controller,
  children,
}: {
  controller: GameController;
  children: ReactNode;
}) {
  return <GameContext.Provider value={{ controller }}>{children}</GameContext.Provider>;
}

export function useGameController(): GameController {
  const context = useContext(GameContext);
  if (!context) throw new Error('Game hooks must be used inside a GameProvider');
  return context.controller;
}

/** Copy the live mutable state so React can detect a changed snapshot. */
function snapshot(state: Readonly<GameState>): GameState {
  return {
    ...state,
    units: state.units.map((unit) => ({
      ...unit,
      pos: { ...unit.pos },
      vel: { ...unit.vel },
    })),
    projectiles: state.projectiles.map((projectile) => ({
      ...projectile,
      pos: { ...projectile.pos },
      vel: { ...projectile.vel },
    })),
    pickups: state.pickups.map((pickup) => ({ ...pickup, pos: { ...pickup.pos } })),
    zones: state.zones.map((zone) => ({ ...zone })),
    score: { ...state.score },
    baseHp: { ...state.baseHp },
    matchConfig: { ...state.matchConfig },
    map: { ...state.map, coverHp: { ...state.map.coverHp } },
  };
}

/**
 * Throttled GameState snapshot for HUD and menus. The returned object is a
 * detached copy, safe to use in React renders without touching sim state.
 */
export function useGameState(): Readonly<GameState> {
  const controller = useGameController();
  const [state, setState] = useState<Readonly<GameState>>(() => snapshot(controller.getState()));

  useEffect(() => {
    let lastUpdate = 0;
    let rafId = 0;
    const poll = (now: number): void => {
      if (now - lastUpdate >= HUD_INTERVAL_MS) {
        lastUpdate = now;
        setState(snapshot(controller.getState()));
      }
      rafId = requestAnimationFrame(poll);
    };
    rafId = requestAnimationFrame(poll);
    return () => cancelAnimationFrame(rafId);
  }, [controller]);

  return state;
}
