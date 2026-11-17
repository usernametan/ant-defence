import { bus } from '../../shared/events';

let dialogueLocked = false;
let manualLocked = false;

/** Player movement / attack is suppressed while any lock is active. */
export function isInputLocked(): boolean {
  return dialogueLocked || manualLocked;
}

/** Used by scripted cutscenes that outlive a dialogue box. */
export function setManualInputLock(value: boolean): void {
  manualLocked = value;
}

export function resetInputLocks(): void {
  dialogueLocked = false;
  manualLocked = false;
}

/**
 * Subscribes input locking to the shared dialogue events. Returns an
 * unsubscribe function so scenes can clean up on shutdown.
 */
export function installDialogueInputLock(): () => void {
  const offStart = bus.on('dialogue:start', () => {
    dialogueLocked = true;
  });
  const offEnd = bus.on('dialogue:end', () => {
    dialogueLocked = false;
  });
  return () => {
    offStart();
    offEnd();
    resetInputLocks();
  };
}
