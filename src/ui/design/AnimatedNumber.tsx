import React, { useEffect, useRef, useState } from 'react';

export interface AnimatedNumberProps {
  value: number;
  durationMs?: number;
  decimals?: number;
  suffix?: string;
  prefix?: string;
  className?: string;
}

function prefersReducedMotion(): boolean {
  if (typeof document !== 'undefined') {
    if (document.documentElement.dataset.reducedMotion === 'true') {
      return true;
    }
  }
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }
  return false;
}

export const AnimatedNumber: React.FC<AnimatedNumberProps> = ({
  value,
  durationMs = 260,
  decimals = 0,
  suffix = '',
  prefix = '',
  className,
}) => {
  const [display, setDisplay] = useState<number>(value);
  const currentRef = useRef<number>(value);

  useEffect(() => {
    if (prefersReducedMotion() || durationMs <= 0) {
      currentRef.current = value;
      setDisplay(value);
      return;
    }

    const from = currentRef.current;
    const delta = value - from;
    if (Math.abs(delta) < 0.001) {
      currentRef.current = value;
      setDisplay(value);
      return;
    }

    let rafId = 0;
    const start = performance.now();

    const step = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3);
      const next = from + delta * eased;
      currentRef.current = next;
      setDisplay(next);
      if (t < 1) {
        rafId = requestAnimationFrame(step);
      } else {
        currentRef.current = value;
        setDisplay(value);
      }
    };

    rafId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafId);
  }, [value, durationMs]);

  const formatted =
    decimals > 0 ? display.toFixed(decimals) : Math.round(display).toString();

  return (
    <span className={className ? `ht-num ${className}` : 'ht-num'}>
      {prefix}
      {formatted}
      {suffix}
    </span>
  );
};
