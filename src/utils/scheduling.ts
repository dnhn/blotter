interface SchedulerLike {
  yield?: () => Promise<void>;
}

/**
 * Yield to the event loop before heavy synchronous work so rendering and
 * input stay responsive (replaces the old setImmediate call sites). Uses
 * scheduler.yield() where available, otherwise a macrotask via setTimeout.
 */
export function yieldToMain(): Promise<void> {
  const scheduler = (globalThis as { scheduler?: SchedulerLike }).scheduler;
  if (scheduler?.yield) {
    return scheduler.yield();
  }
  return new Promise((resolve) => setTimeout(resolve, 0));
}
