export type RandomSource = () => number;

export function mulberry32(seed: number): RandomSource {
  let state = seed >>> 0;

  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashString(value: string): number {
  let hash = 0x811c9dc5;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }

  return hash >>> 0;
}

export function randomRange(
  random: RandomSource,
  min: number,
  max: number,
): number {
  return min + random() * (max - min);
}

export function randomInt(
  random: RandomSource,
  min: number,
  maxExclusive: number,
): number {
  if (maxExclusive <= min) {
    throw new RangeError("randomInt maximum must exceed minimum");
  }

  return Math.floor(randomRange(random, min, maxExclusive));
}
