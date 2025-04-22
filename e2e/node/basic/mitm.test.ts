import { createActor } from '../canisters/declarations/counter/index';
import { test, expect, TestAPI } from 'vitest';
import { makeAgent } from '../utils/agent';
import { AgentQueryError, CertificateVerificationErrorCode, TrustError } from '@dfinity/agent';

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
    expect.assertions(3);
    try {
      await counter.greet('counter');
    } catch (error) {
      expect(error).toBeInstanceOf(TrustError);
      expect(error.cause.code).toBeInstanceOf(CertificateVerificationErrorCode);
    }
    expect(await counter.queryGreet('counter')).toEqual('Hullo, counter!');
  },
  { timeout: 30000 },
);

mitmTest('mitm with query verification', async () => {
  const counter = createActor('tnnnb-2yaaa-aaaab-qaiiq-cai', {
    agent: await makeAgent({
      host: 'http://127.0.0.1:8888',
      verifyQuerySignatures: true,
    }),
  });
  expect.assertions(3);
  try {
    await counter.greet('counter');
  } catch (error) {
    expect(error).toBeInstanceOf(TrustError);
    expect(error.cause.code).toBeInstanceOf(CertificateVerificationErrorCode);
  }
  try {
    await counter.queryGreet('counter');
  } catch (error) {
    expect(error).toBeInstanceOf(AgentQueryError);
  }
});
