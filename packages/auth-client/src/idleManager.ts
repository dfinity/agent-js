type IdleCB = () => unknown;
export type IdleManagerOptions = {
  /**
   * Callback after the user has gone idle
   */
  onIdle?: IdleCB;
  /**
   * timeout in ms
   * @default 30 minutes [600_000]
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

const events = ['mousedown', 'mousemove', 'keydown', 'touchstart', 'wheel'];

/**
 * Detects if the user has been idle for a duration of `idleTimeout` ms, and calls `onIdle` and registered callbacks.
 * By default, the IdleManager will log a user out after 10 minutes of inactivity.
 * To override these defaults, you can pass an `onIdle` callback, or configure a custom `idleTimeout` in milliseconds
 */
export class IdleManager {
  callbacks: IdleCB[] = [];
  idleTimeout: IdleManagerOptions['idleTimeout'] = 10 * 60 * 1000;
  timeoutID?: number = undefined;

  /**
   * Creates an {@link IdleManager}
   * @param {IdleManagerOptions} options Optional configuration
   * @see {@link IdleManagerOptions}
   * @param options.onIdle Callback once user has been idle. Use to prompt for fresh login, and use `Actor.agentOf(your_actor).invalidateIdentity()` to protect the user
   * @param options.idleTimeout timeout in ms
   * @param options.captureScroll capture scroll events
   * @param options.scrollDebounce scroll debounce time in ms
   */
  public static create(
    options: {
      /**
       * Callback after the user has gone idle
       * @see {@link IdleCB}
       */
      onIdle?: () => unknown;
      /**
       * timeout in ms
       * @default 10 minutes [600_000]
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
    } = {},
  ): IdleManager {
    return new this(options);
  }

  /**
   * @protected
   * @param options {@link IdleManagerOptions}
   */
  protected constructor(options: IdleManagerOptions = {}) {
    const { onIdle, idleTimeout = 10 * 60 * 1000 } = options || {};

    this.callbacks = onIdle ? [onIdle] : [];
    this.idleTimeout = idleTimeout;

    const _resetTimer = this._resetTimer.bind(this);

    window.addEventListener('load', _resetTimer, true);

    events.forEach(function (name) {
      document.addEventListener(name, _resetTimer, true);
    });

    // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
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
      const scroll = debounce(_resetTimer, options?.scrollDebounce ?? 100);
      window.addEventListener('scroll', scroll, true);
    }

    _resetTimer();
  }

  /**
   * @param {IdleCB} callback function to be called when user goes idle
   */
  public registerCallback(callback: IdleCB): void {
    this.callbacks.push(callback);
  }

  /**
   * Cleans up the idle manager and its listeners
   */
  public exit(): void {
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
  _resetTimer(): void {
    const exit = this.exit.bind(this);
    window.clearTimeout(this.timeoutID);
    this.timeoutID = window.setTimeout(exit, this.idleTimeout);
  }
}
