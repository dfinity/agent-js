import { createActor } from '../canisters/declarations/counter/index';
import { test, expect, TestAPI } from 'vitest';
import { makeAgent } from '../utils/agent';

let mitmTest: TestAPI | typeof test.skip = test;
if (!process.env['MITM']) {
  mitmTest = test.skip;
}
mitmTest(
  'mitm greet',
  async () => {
    const counter = await createActor('tnnnb-2yaaa-aaaab-qaiiq-cai', {
      agent: await makeAgent({
        host: 'http://127.0.0.1:8888',
        verifyQuerySignatures: false,
      }),
    });
    await expect(counter.greet('counter')).rejects.toThrow(/Invalid certificate/);
    expect(await counter.queryGreet('counter')).toEqual('Hullo, counter!');
  },
  { timeout: 30000 },
);

mitmTest('mitm with query verification', async () => {
  const counter = await createActor('tnnnb-2yaaa-aaaab-qaiiq-cai', {
    agent: await makeAgent({
      host: 'http://127.0.0.1:8888',
      verifyQuerySignatures: true,
    }),
  });
  await expect(counter.greet('counter')).rejects.toThrow(/Invalid certificate/);
  await expect(counter.queryGreet('counter')).rejects.toThrow(/Invalid certificate/);
});
