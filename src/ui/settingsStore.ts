import type { RenderQuality } from '../render';

export type CrosshairStyle = 'tactical' | 'dot' | 'chevron' | 'ring';
export type ScopeMode = 'hold' | 'toggle' | 'off';

export interface GameSettings {
  masterVolume: number; // 0..100
  sfxVolume: number; // 0..100
  musicVolume: number; // 0..100
  quality: RenderQuality;
  screenShake: number; // 0..150
  crosshairStyle: CrosshairStyle;
  scopeMode: ScopeMode;
  hudScale: number; // 75..125
  colorblindAssist: boolean;
  reducedMotion: boolean;
  showHints: boolean;
}

export const DEFAULT_SETTINGS: GameSettings = {
  masterVolume: 80,
  sfxVolume: 85,
  musicVolume: 45,
  quality: 'high',
  screenShake: 100,
  crosshairStyle: 'tactical',
  scopeMode: 'hold',
  hudScale: 100,
  colorblindAssist: false,
  reducedMotion: false,
  showHints: true,
};

const SETTINGS_KEY = 'zone-control:settings:v1';
const HINTS_KEY = 'zone-control:hints-seen:v1';

export function loadSettings(): GameSettings {
  if (typeof window === 'undefined') return { ...DEFAULT_SETTINGS };
  try {
    const raw = window.localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const parsed = JSON.parse(raw) as Partial<GameSettings>;
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(settings: GameSettings): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // Ignore storage quota errors
  }
}

export function applySettingsToDom(settings: GameSettings): void {
  if (typeof document === 'undefined') return;
  document.documentElement.dataset.reducedMotion = settings.reducedMotion
    ? 'true'
    : 'false';
  document.documentElement.style.setProperty(
    '--hud-scale',
    String(settings.hudScale / 100),
  );
}

export function getSeenHints(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = window.localStorage.getItem(HINTS_KEY);
    if (!raw) return new Set();
    const list = JSON.parse(raw) as string[];
    return new Set(list);
  } catch {
    return new Set();
  }
}

export function markHintSeen(id: string): void {
  if (typeof window === 'undefined') return;
  try {
    const current = getSeenHints();
    current.add(id);
    window.localStorage.setItem(HINTS_KEY, JSON.stringify([...current]));
  } catch {
    // Ignore storage quota errors
  }
}

export function resetSeenHints(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(HINTS_KEY);
  } catch {
    // Ignore
  }
}
