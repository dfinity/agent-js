import { HttpAgent, fromHex, callAndPoll } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';
import { expect, describe, it, vi } from 'vitest';
describe('call and poll', () => {
  it('should handle call and poll', async () => {
    vi.useRealTimers();

    const options = {
      canister_id: Principal.from('tnnnb-2yaaa-aaaab-qaiiq-cai'),
      method_name: 'inc_read',
      agent: await HttpAgent.create({ host: 'https://icp-api.io' }),
      arg: fromHex('4449444c0000'),
    };

    const { certificate, contentMap } = await callAndPoll(options);
    expect(certificate instanceof ArrayBuffer).toBe(true);
    expect(contentMap).toMatchInlineSnapshot();
  });
});
