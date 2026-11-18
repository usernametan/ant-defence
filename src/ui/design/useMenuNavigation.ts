import { useEffect } from 'react';
import type { RefObject } from 'react';
import { playUiBack, playUiClick, playUiHover } from './uiSound';

export interface MenuNavigationOptions {
  containerRef: RefObject<HTMLElement | null>;
  enabled?: boolean;
  onEscape?: () => void;
}

function getFocusable(root: HTMLElement): HTMLElement[] {
  const nodes = root.querySelectorAll<HTMLElement>(
    'button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), [tabindex]:not([tabindex="-1"])',
  );
  return Array.from(nodes).filter((el) => el.offsetParent !== null);
}

/** Enables Arrow/Enter/Escape and Gamepad menu navigation inside a container. */
export function useMenuNavigation({
  containerRef,
  enabled = true,
  onEscape,
}: MenuNavigationOptions): void {
  useEffect(() => {
    if (!enabled) return;

    const moveFocus = (dir: 1 | -1) => {
      const root = containerRef.current;
      if (!root) return;
      const items = getFocusable(root);
      if (items.length === 0) return;

      const active = document.activeElement as HTMLElement | null;
      const index = active ? items.indexOf(active) : -1;
      const nextIndex =
        index === -1
          ? dir === 1
            ? 0
            : items.length - 1
          : (index + dir + items.length) % items.length;
      items[nextIndex]?.focus();
      playUiHover();
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      const activeDialog = document.querySelector('[role="dialog"][aria-modal="true"]');
      if (activeDialog && containerRef.current && !containerRef.current.contains(activeDialog)) {
        return;
      }

      const target = e.target as HTMLElement | null;
      const isRangeOrInput =
        target?.tagName === 'INPUT' &&
        ((target as HTMLInputElement).type === 'range' ||
          (target as HTMLInputElement).type === 'number' ||
          (target as HTMLInputElement).type === 'text');

      if (e.key === 'Escape') {
        if (onEscape) {
          e.preventDefault();
          playUiBack();
          onEscape();
        }
        return;
      }

      if (e.key === 'ArrowDown' || (!isRangeOrInput && e.key === 'ArrowRight')) {
        e.preventDefault();
        moveFocus(1);
      } else if (
        e.key === 'ArrowUp' ||
        (!isRangeOrInput && e.key === 'ArrowLeft')
      ) {
        e.preventDefault();
        moveFocus(-1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    // Lightweight Gamepad menu navigation polling (D-pad + A/B)
    let rafId = 0;
    let lastActionAt = 0;
    const pollGamepad = (now: number) => {
      if (typeof navigator !== 'undefined' && navigator.getGamepads) {
        const pads = navigator.getGamepads();
        const pad = pads[0];
        if (pad && now - lastActionAt > 180) {
          const axisY = pad.axes[1] ?? 0;
          const up = pad.buttons[12]?.pressed || axisY < -0.6;
          const down = pad.buttons[13]?.pressed || axisY > 0.6;
          const accept = pad.buttons[0]?.pressed;
          const cancel = pad.buttons[1]?.pressed;

          if (down) {
            lastActionAt = now;
            moveFocus(1);
          } else if (up) {
            lastActionAt = now;
            moveFocus(-1);
          } else if (accept) {
            lastActionAt = now;
            const active = document.activeElement as HTMLElement | null;
            if (active && containerRef.current?.contains(active)) {
              playUiClick();
              active.click();
            }
          } else if (cancel && onEscape) {
            lastActionAt = now;
            playUiBack();
            onEscape();
          }
        }
      }
      rafId = requestAnimationFrame(pollGamepad);
    };

    rafId = requestAnimationFrame(pollGamepad);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      cancelAnimationFrame(rafId);
    };
  }, [containerRef, enabled, onEscape]);
}
