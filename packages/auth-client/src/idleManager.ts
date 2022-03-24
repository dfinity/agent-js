export type IdleManagerOptions = {
  /**
   * Callback after the user has gone idle
   */
  onIdle?: () => void;
  /**
   * timeout in ms
   * @default 30 minutes [1_800_000]
   */
  idleTimeout?: number;
  /**
   * capture scroll events
   * @default false
   */
  captureScroll?: boolean;
  /**
   * scroll debounce time in ms
   * @default 100
   */
  scrollDebounce?: number;
};

const events = ['mousedown', 'mousemove', 'keypress', 'touchstart', 'wheel'];

/**
 * Detects if the user has been idle for a duration of `idleTimeout` ms, and calls `onIdle`.
 *
 * @param {IdleManagerOptions} options
 */
class IdleManager {
  onIdle: IdleManagerOptions['onIdle'] = undefined;
  idleTimeout: IdleManagerOptions['idleTimeout'] = 30 * 60 * 1000;
  timeoutID?: number = undefined;

  constructor(options: IdleManagerOptions = {}) {
    const { onIdle, idleTimeout = 30 * 60 * 1000 } = options || {};
    this.onIdle = onIdle;
    this.idleTimeout = idleTimeout;

    const resetTimer = this.resetTimer.bind(this);

    window.addEventListener('load', resetTimer, true);

    events.forEach(function (name) {
      document.addEventListener(name, resetTimer, true);
    });

    // eslint-disable-next-line @typescript-eslint/ban-types
    const debounce = (func: Function, wait: number) => {
      let timeout: number | undefined;
      return (...args: unknown[]) => {
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

    if (options?.captureScroll) {
      // debounce scroll events
      const scroll = debounce(resetTimer, options?.scrollDebounce ?? 100);
      window.addEventListener('scroll', scroll, true);
    }

    resetTimer();
  }

  /**
   * Cleans up the idle manager and its listeners
   */
  public exit(): void {
    this.onIdle?.();
    clearTimeout(this.timeoutID);
    window.removeEventListener('load', this.resetTimer, true);

    const resetTimer = this.resetTimer.bind(this);
    events.forEach(function (name) {
      document.removeEventListener(name, resetTimer, true);
    });
  }

  resetTimer(): void {
    const exit = this.exit.bind(this);
    window.clearTimeout(this.timeoutID);
    this.timeoutID = window.setTimeout(exit, this.idleTimeout);
  }
}

export default IdleManager;
