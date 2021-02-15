export type DefaultLogLevel = 'debug' | 'warn' | 'info' | 'error';
export type LogFunction<Level extends DefaultLogLevel> = (
  level: Level,
  ...loggables: unknown[]
) => void;

/**
 * Log something using globalThis.console, if present.
 * @param level - log level. 'debug' shouldn't show in js console unless developers want it.
 * @param loggables - variable arguments passed to `console.log(...)`
 */
export function log<Level extends DefaultLogLevel>(level: Level, ...loggables: unknown[]): void {
  if (level in console && typeof console[level] === 'function') {
    console[level](...loggables);
    return;
  }
  if (!level) {
    throw new Error(`log level is required, but not provided`);
  }
  if (level !== 'info') {
    // unknown level, use 'info'
    log('info', level, ...loggables);
  }
}

/**
 * Make a log function that logs messages prefixed with a logger name
 * @param name - logger name to prepend before log messages
 */
export function makeLog<Level extends DefaultLogLevel>(name: string): LogFunction<Level> {
  return (level: Level, ...loggables: unknown[]) => {
    log(level, `[${name}]`, ...loggables);
  };
}
