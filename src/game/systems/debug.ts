export function isDebugEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const params = new URLSearchParams(window.location.search);
    return params.get('debug') === '1';
  } catch {
    return false;
  }
}

export function isResetRequested(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const params = new URLSearchParams(window.location.search);
    return params.get('reset') === '1';
  } catch {
    return false;
  }
}
