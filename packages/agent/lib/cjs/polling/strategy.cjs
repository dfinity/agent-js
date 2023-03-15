'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.chain =
  exports.backoff =
  exports.timeout =
  exports.throttle =
  exports.maxAttempts =
  exports.conditionalDelay =
  exports.once =
  exports.defaultStrategy =
    void 0;
const buffer_js_1 = require('../utils/buffer.js');
const FIVE_MINUTES_IN_MSEC = 5 * 60 * 1000;
/**
 * A best practices polling strategy: wait 2 seconds before the first poll, then 1 second
 * with an exponential backoff factor of 1.2. Timeout after 5 minutes.
 */
function defaultStrategy() {
  return chain(conditionalDelay(once(), 1000), backoff(1000, 1.2), timeout(FIVE_MINUTES_IN_MSEC));
}
exports.defaultStrategy = defaultStrategy;
/**
 * Predicate that returns true once.
 */
function once() {
  let first = true;
  return async () => {
    if (first) {
      first = false;
      return true;
    }
    return false;
  };
}
exports.once = once;
/**
 * Delay the polling once.
 * @param condition A predicate that indicates when to delay.
 * @param timeInMsec The amount of time to delay.
 */
function conditionalDelay(condition, timeInMsec) {
  return async (canisterId, requestId, status) => {
    if (await condition(canisterId, requestId, status)) {
      return new Promise(resolve => setTimeout(resolve, timeInMsec));
    }
  };
}
exports.conditionalDelay = conditionalDelay;
/**
 * Error out after a maximum number of polling has been done.
 * @param count The maximum attempts to poll.
 */
function maxAttempts(count) {
  let attempts = count;
  return async (canisterId, requestId, status) => {
    if (--attempts <= 0) {
      throw new Error(
        `Failed to retrieve a reply for request after ${count} attempts:\n` +
          `  Request ID: ${(0, buffer_js_1.toHex)(requestId)}\n` +
          `  Request status: ${status}\n`,
      );
    }
  };
}
exports.maxAttempts = maxAttempts;
/**
 * Throttle polling.
 * @param throttleInMsec Amount in millisecond to wait between each polling.
 */
function throttle(throttleInMsec) {
  return () => new Promise(resolve => setTimeout(resolve, throttleInMsec));
}
exports.throttle = throttle;
/**
 * Reject a call after a certain amount of time.
 * @param timeInMsec Time in milliseconds before the polling should be rejected.
 */
function timeout(timeInMsec) {
  const end = Date.now() + timeInMsec;
  return async (canisterId, requestId, status) => {
    if (Date.now() > end) {
      throw new Error(
        `Request timed out after ${timeInMsec} msec:\n` +
          `  Request ID: ${(0, buffer_js_1.toHex)(requestId)}\n` +
          `  Request status: ${status}\n`,
      );
    }
  };
}
exports.timeout = timeout;
/**
 * A strategy that throttle, but using an exponential backoff strategy.
 * @param startingThrottleInMsec The throttle in milliseconds to start with.
 * @param backoffFactor The factor to multiple the throttle time between every poll. For
 *   example if using 2, the throttle will double between every run.
 */
function backoff(startingThrottleInMsec, backoffFactor) {
  let currentThrottling = startingThrottleInMsec;
  return () =>
    new Promise(resolve =>
      setTimeout(() => {
        currentThrottling *= backoffFactor;
        resolve();
      }, currentThrottling),
    );
}
exports.backoff = backoff;
/**
 * Chain multiple polling strategy. This _chains_ the strategies, so if you pass in,
 * say, two throttling strategy of 1 second, it will result in a throttle of 2 seconds.
 * @param strategies A strategy list to chain.
 */
function chain(...strategies) {
  return async (canisterId, requestId, status) => {
    for (const a of strategies) {
      await a(canisterId, requestId, status);
    }
  };
}
exports.chain = chain;
//# sourceMappingURL=strategy.js.map
