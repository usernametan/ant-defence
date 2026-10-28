export function formatScore(value: number): string {
  return Math.max(0, Math.round(value)).toLocaleString('en-US');
}

export function formatTime(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(safe / 60);
  const remainder = safe % 60;
  return `${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`;
}

export function pad2(value: number): string {
  return String(Math.max(0, Math.floor(value))).padStart(2, '0');
}
