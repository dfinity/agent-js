import { vi } from 'vitest';

/**
 * Waits for timers to be available and runs them a specified number of times.
 * @param {number} count - The number of times to wait for and run timers.
 * @returns {Promise<void>} A promise that resolves when all timers have been run.
 */
export async function waitForAndRunTimers(count: number = 1): Promise<void> {
  for (let i = 0; i < count; i++) {
    await vi.waitUntil(() => vi.getTimerCount() > 0);
    await vi.runAllTimersAsync();
  }
}
