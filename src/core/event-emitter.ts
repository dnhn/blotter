export type EventMap = Record<string, unknown[]>;

type Listener<Args extends unknown[]> = (...args: Args) => void;

/**
 * Minimal typed event emitter. `on` returns an unsubscribe function so
 * callers don't need to retain listener references for teardown.
 *
 * `emit` iterates the live listener array by index (no per-emit allocation —
 * it runs on the render loop). Listeners added during an emit are not called
 * for that emit; removing a listener during an emit may skip the next one.
 */
export class Emitter<E extends EventMap> {
  private listeners = new Map<keyof E, Listener<E[keyof E]>[]>();

  on<K extends keyof E>(event: K, listener: Listener<E[K]>): () => void {
    let bucket = this.listeners.get(event);
    if (!bucket) {
      bucket = [];
      this.listeners.set(event, bucket);
    }
    bucket.push(listener as Listener<E[keyof E]>);
    return () => this.off(event, listener);
  }

  off<K extends keyof E>(event: K, listener: Listener<E[K]>): void {
    const bucket = this.listeners.get(event);
    if (!bucket) return;
    const index = bucket.indexOf(listener as Listener<E[keyof E]>);
    if (index !== -1) bucket.splice(index, 1);
  }

  protected emit<K extends keyof E>(event: K, ...args: E[K]): void {
    const bucket = this.listeners.get(event);
    if (!bucket) return;
    const count = bucket.length;
    for (let i = 0; i < count && i < bucket.length; i++) {
      (bucket[i] as Listener<E[K]>)(...args);
    }
  }

  protected removeAllListeners(): void {
    this.listeners.clear();
  }
}
