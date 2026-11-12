import { useCallback, useSyncExternalStore } from 'react';
import {
  createInitialSnapshot,
  type SnapshotStore,
  type UiSnapshot,
} from '../game/ui/UiSnapshot';

const bootstrapSnapshot = createInitialSnapshot();
const noopSubscribe = () => () => undefined;

export function useGameSnapshot(store: SnapshotStore | null): UiSnapshot {
  const subscribe = useCallback(
    (listener: () => void) => {
      if (!store) {
        return noopSubscribe();
      }

      return store.subscribe(listener);
    },
    [store],
  );

  const getSnapshot = useCallback(
    () => store?.getSnapshot() ?? bootstrapSnapshot,
    [store],
  );

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
