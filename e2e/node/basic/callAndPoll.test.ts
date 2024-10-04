import { HttpAgent, fromHex, callAndPoll } from '@dfinity/agent';
import { expect, describe, it, vi } from 'vitest';
describe('call and poll', () => {
  it('should handle call and poll', async () => {
    vi.useRealTimers();

    const options = {
      canisterId: 'tnnnb-2yaaa-aaaab-qaiiq-cai',
      methodName: 'inc_read',
      agent: await HttpAgent.create({ host: 'https://icp-api.io' }),
      arg: fromHex('4449444c0000'),
    };

    const certificate = await callAndPoll(options);
    expect(certificate instanceof ArrayBuffer).toBe(true);
  });
});
