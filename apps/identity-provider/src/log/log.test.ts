import * as logModule from './log';

test('@dfinity/agent exports makeLog(logName)(logLevel, ...loggables)', () => {
  expect(typeof logModule.makeLog).toEqual('function');
  const log = logModule.makeLog('logName');
  expect(typeof log).toEqual('function');
  expect(logWithoutLevel).toThrow();
  function logWithoutLevel() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (log as any)();
  }
});
