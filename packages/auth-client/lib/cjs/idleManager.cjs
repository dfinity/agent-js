'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.IdleManager = void 0;
const events = ['mousedown', 'mousemove', 'keydown', 'touchstart', 'wheel'];
/**
 * Detects if the user has been idle for a duration of `idleTimeout` ms, and calls `onIdle` and registered callbacks.
 * By default, the IdleManager will log a user out after 10 minutes of inactivity.
 * To override these defaults, you can pass an `onIdle` callback, or configure a custom `idleTimeout` in milliseconds
 */
class IdleManager {
  /**
   * @protected
   * @param options {@link IdleManagerOptions}
   */
  constructor(options = {}) {
    var _a;
    this.callbacks = [];
    this.idleTimeout = 10 * 60 * 1000;
    this.timeoutID = undefined;
    const { onIdle, idleTimeout = 10 * 60 * 1000 } = options || {};
    this.callbacks = onIdle ? [onIdle] : [];
    this.idleTimeout = idleTimeout;
    const _resetTimer = this._resetTimer.bind(this);
    window.addEventListener('load', _resetTimer, true);
    events.forEach(function (name) {
      document.addEventListener(name, _resetTimer, true);
    });
    // eslint-disable-next-line @typescript-eslint/ban-types
    const debounce = (func, wait) => {
      let timeout;
      return (...args) => {
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        const context = this;
        const later = function () {
          timeout = undefined;
          func.apply(context, args);
        };
        clearTimeout(timeout);
        timeout = window.setTimeout(later, wait);
      };
    };
    if (options === null || options === void 0 ? void 0 : options.captureScroll) {
      // debounce scroll events
      const scroll = debounce(
        _resetTimer,
        (_a = options === null || options === void 0 ? void 0 : options.scrollDebounce) !== null &&
          _a !== void 0
          ? _a
          : 100,
      );
      window.addEventListener('scroll', scroll, true);
    }
    _resetTimer();
  }
  /**
   * Creates an {@link IdleManager}
   * @param {IdleManagerOptions} options Optional configuration
   * @see {@link IdleManagerOptions}
   * @param options.onIdle Callback once user has been idle. Use to prompt for fresh login, and use `Actor.agentOf(your_actor).invalidateIdentity()` to protect the user
   * @param options.idleTimeout timeout in ms
   * @param options.captureScroll capture scroll events
   * @param options.scrollDebounce scroll debounce time in ms
   */
  static create(options = {}) {
    return new this(options);
  }
  /**
   * @param {IdleCB} callback function to be called when user goes idle
   */
  registerCallback(callback) {
    this.callbacks.push(callback);
  }
  /**
   * Cleans up the idle manager and its listeners
   */
  exit() {
    clearTimeout(this.timeoutID);
    window.removeEventListener('load', this._resetTimer, true);
    const _resetTimer = this._resetTimer.bind(this);
    events.forEach(function (name) {
      document.removeEventListener(name, _resetTimer, true);
    });
    this.callbacks.forEach(cb => cb());
  }
  /**
   * Resets the timeouts during cleanup
   */
  _resetTimer() {
    const exit = this.exit.bind(this);
    window.clearTimeout(this.timeoutID);
    this.timeoutID = window.setTimeout(exit, this.idleTimeout);
  }
}
exports.IdleManager = IdleManager;
//# sourceMappingURL=idleManager.js.map
