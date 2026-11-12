export type IdFactory = () => string;

export function createIdFactory(prefix: string): IdFactory {
  let next = 0;

  return () => {
    next += 1;
    return `${prefix}-${next}`;
  };
}
