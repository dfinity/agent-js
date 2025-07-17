import { AgentError, CanisterStatus, HttpAgent } from '@icp-sdk/core/agent';
import { Principal } from '@icp-sdk/core/principal';
import { makeAgent } from '../utils/agent.ts';
import { describe, it, afterEach, expect } from 'vitest';
import { getCanisterId } from '../utils/canisterid.ts';

afterEach(async () => {
  await Promise.resolve();
});
describe('canister status', () => {
  it('should fetch successfully', async () => {
    const counterCanisterId = getCanisterId('counter');
    const agent = await makeAgent();
    await agent.fetchRootKey();
    const request = await CanisterStatus.request({
      canisterId: counterCanisterId,
      agent,
      paths: ['controllers'],
    });

    expect(Array.isArray(request.get('controllers'))).toBe(true);
  });
  it('should throw an error if fetchRootKey has not been called', async () => {
    const counterCanisterId = getCanisterId('counter');
    const agent = new HttpAgent({
      host: `http://127.0.0.1:${process.env.REPLICA_PORT ?? 4943}`,
      verifyQuerySignatures: false,
    });
    expect.assertions(1);
    try {
      await CanisterStatus.request({
        canisterId: counterCanisterId,
        agent,
        paths: ['controllers'],
      });
    } catch (error) {
      expect(error).toBeInstanceOf(AgentError);
    }
  });
  it('should fetch the subnet id of a given canister', async () => {
    const counterCanisterId = getCanisterId('counter');
    const agent = await makeAgent();
    await agent.fetchRootKey();
    const statusMap = await CanisterStatus.request({
      canisterId: counterCanisterId,
      agent,
      paths: ['subnet'],
    });

    const subnet = statusMap.get('subnet') as CanisterStatus.SubnetStatus;

    expect(subnet).toBeDefined();

    const principal = Principal.fromText(subnet.subnetId);
    expect(principal).toBeDefined();
  });
});
