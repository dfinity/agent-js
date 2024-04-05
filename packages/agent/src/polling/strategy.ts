import { Principal } from '@dfinity/principal';
import { RequestStatusResponseStatus } from '../agent';
import { toHex } from '../utils/buffer';
import { PollStrategy } from './index';
import { RequestId } from '../request_id';

export type Predicate<T> = (
  canisterId: Principal,
  requestId: RequestId,
  status: RequestStatusResponseStatus,
) => Promise<T>;

const FIVE_MINUTES_IN_MSEC = 5 * 60 * 1000;

/**
 * A best practices polling strategy: wait 2 seconds before the first poll, then 1 second
 * with an exponential backoff factor of 1.2. Timeout after 5 minutes.
 */
export function defaultStrategy(): PollStrategy {
  return chain(conditionalDelay(once(), 1000), backoff(1000, 1.2), timeout(FIVE_MINUTES_IN_MSEC));
}

/**
 * Predicate that returns true once.
 */
export function once(): Predicate<boolean> {
  let first = true;
  return async () => {
    if (first) {
      first = false;
      return true;
    }
    return false;
  };
}

/**
 * Delay the polling once.
 * @param condition A predicate that indicates when to delay.
 * @param timeInMsec The amount of time to delay.
 */
export function conditionalDelay(condition: Predicate<boolean>, timeInMsec: number): PollStrategy {
  return async (
    canisterId: Principal,
    requestId: RequestId,
    status: RequestStatusResponseStatus,
  ) => {
    if (await condition(canisterId, requestId, status)) {
      return new Promise(resolve => setTimeout(resolve, timeInMsec));
    }
  };
}

/**
 * Error out after a maximum number of polling has been done.
 * @param count The maximum attempts to poll.
 */
export function maxAttempts(count: number): PollStrategy {
  let attempts = count;
  return async (
    canisterId: Principal,
    requestId: RequestId,
    status: RequestStatusResponseStatus,
  ) => {
    if (--attempts <= 0) {
      throw new Error(
        `Failed to retrieve a reply for request after ${count} attempts:\n` +
          `  Request ID: ${toHex(requestId)}\n` +
          `  Request status: ${status}\n`,
      );
    }
  };
}

/**
 * Throttle polling.
 * @param throttleInMsec Amount in millisecond to wait between each polling.
 */
export function throttle(throttleInMsec: number): PollStrategy {
  return () => new Promise(resolve => setTimeout(resolve, throttleInMsec));
}

/**
 * Reject a call after a certain amount of time.
 * @param timeInMsec Time in milliseconds before the polling should be rejected.
 */
export function timeout(timeInMsec: number): PollStrategy {
  const end = Date.now() + timeInMsec;
  return async (
    canisterId: Principal,
    requestId: RequestId,
    status: RequestStatusResponseStatus,
  ) => {
    if (Date.now() > end) {
      throw new Error(
        `Request timed out after ${timeInMsec} msec:\n` +
          `  Request ID: ${toHex(requestId)}\n` +
          `  Request status: ${status}\n`,
      );
    }
  };
}

/**
 * A strategy that throttle, but using an exponential backoff strategy.
 * @param startingThrottleInMsec The throttle in milliseconds to start with.
 * @param backoffFactor The factor to multiple the throttle time between every poll. For
 *   example if using 2, the throttle will double between every run.
 */
export function backoff(startingThrottleInMsec: number, backoffFactor: number): PollStrategy {
  let currentThrottling = startingThrottleInMsec;

  return () =>
    new Promise(resolve =>
      setTimeout(() => {
        currentThrottling *= backoffFactor;
        resolve();
      }, currentThrottling),
    );
}

/**
 * Chain multiple polling strategy. This _chains_ the strategies, so if you pass in,
 * say, two throttling strategy of 1 second, it will result in a throttle of 2 seconds.
 * @param strategies A strategy list to chain.
 */
export function chain(...strategies: PollStrategy[]): PollStrategy {
  return async (
    canisterId: Principal,
    requestId: RequestId,
    status: RequestStatusResponseStatus,
  ) => {
    for (const a of strategies) {
      await a(canisterId, requestId, status);
    }
  };
}
