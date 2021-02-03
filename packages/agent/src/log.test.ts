import * as agentModule from '.';

test('@dfinity/agent exports makeLog(logName)(logLevel, ...loggables)', () => {
    expect(typeof agentModule.makeLog).toEqual('function');
    const log = agentModule.makeLog('logName');
    expect(typeof log).toEqual('function');
    expect(logWithoutLevel).toThrow();
    function logWithoutLevel() {
        (log as any)();
    }
});
