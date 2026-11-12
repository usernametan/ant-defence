export type EventMap = Record<string, unknown>;

type Listener<TPayload> = (payload: TPayload) => void;

export class EventBus<TEvents extends EventMap> {
  private readonly listeners = new Map<
    keyof TEvents,
    Set<Listener<unknown>>
  >();

  on<TKey extends keyof TEvents>(
    type: TKey,
    listener: Listener<TEvents[TKey]>,
  ): () => void {
    let eventListeners = this.listeners.get(type);

    if (!eventListeners) {
      eventListeners = new Set<Listener<unknown>>();
      this.listeners.set(type, eventListeners);
    }

    eventListeners.add(listener as Listener<unknown>);

    return () => {
      const current = this.listeners.get(type);
      current?.delete(listener as Listener<unknown>);

      if (current?.size === 0) {
        this.listeners.delete(type);
      }
    };
  }

  emit<TKey extends keyof TEvents>(type: TKey, payload: TEvents[TKey]): void {
    const eventListeners = this.listeners.get(type);

    if (!eventListeners) {
      return;
    }

    for (const listener of [...eventListeners]) {
      listener(payload);
    }
  }

  clear(): void {
    this.listeners.clear();
  }
}
