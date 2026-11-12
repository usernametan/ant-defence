export function clamp(value: number, min: number, max: number): number {
  if (min > max) {
    throw new RangeError("clamp minimum must not exceed maximum");
  }

  return Math.min(max, Math.max(min, value));
}

export function lerp(start: number, end: number, amount: number): number {
  return start + (end - start) * amount;
}

export function damp(
  current: number,
  target: number,
  smoothing: number,
  deltaSeconds: number,
): number {
  return lerp(current, target, 1 - Math.exp(-smoothing * deltaSeconds));
}

export function nearlyEqual(a: number, b: number, epsilon = 1e-6): boolean {
  return Math.abs(a - b) <= epsilon;
}
