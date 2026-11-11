export const MOTION_STORAGE_KEY = 'ant-defense:reduced-motion:v1';

export function prefersReducedMotion(): boolean {
  try {
    return (
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    );
  } catch {
    return false;
  }
}

export function loadReducedMotion(): boolean {
  try {
    const stored = window.localStorage.getItem(MOTION_STORAGE_KEY);
    if (stored === '1') return true;
    if (stored === '0') return false;
  } catch {
    // Storage may be unavailable in private mode; fall back to the OS preference.
  }
  return prefersReducedMotion();
}

export function saveReducedMotion(value: boolean): void {
  try {
    window.localStorage.setItem(MOTION_STORAGE_KEY, value ? '1' : '0');
  } catch {
    // Storage may be unavailable in private mode; the choice won't persist.
  }
}
