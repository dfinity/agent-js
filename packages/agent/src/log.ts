/** Log something using globalThis.console, if present */
function log(level: keyof typeof console, ...loggables: any[]) {
  if (typeof console[level] === 'function') {
    console[level](...loggables);
    return;
  }
  if ( ! level) {
    throw new Error(`log level is required, but not provided`)
  }
  if (level !== 'info') {
    log('info', level, ...loggables);
  }
  if (typeof console?.log === 'function') {
    console.log(...loggables);
  }
}

export function makeLog(name: string): typeof log {
  return (level: keyof typeof console, ...loggables: any[]) => {
    log(level, `[${name}]`, ...loggables);
  };
}
