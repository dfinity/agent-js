import { AgentError, CanisterStatus, HttpAgent } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';
import { execSync } from 'child_process';
import { makeAgent } from '../utils/agent';
import { describe, it, afterEach, expect } from 'vitest';

afterEach(async () => {
  await Promise.resolve();
});
describe('canister status', () => {
  it('should fetch successfully', async () => {
    const counterCanisterId =
      process.env.COUNTER_CANISTER_ID || execSync('dfx canister id counter').toString().trim();
    const agent = await makeAgent();
    await agent.fetchRootKey();
    const request = await CanisterStatus.request({
      canisterId: Principal.fromText(counterCanisterId),
      agent,
      paths: ['controllers'],
    });

    expect(Array.isArray(request.get('controllers'))).toBe(true);
  });
  it('should throw an error if fetchRootKey has not been called', async () => {
    const counterCanisterId =
      process.env.COUNTER_CANISTER_ID || execSync('dfx canister id counter').toString().trim();
    const agent = new HttpAgent({
      host: `http://127.0.0.1:${process.env.REPLICA_PORT ?? 4943}`,
      verifyQuerySignatures: false,
    });
    expect.assertions(1);
    try {
      await CanisterStatus.request({
        canisterId: Principal.fromText(counterCanisterId),
        agent,
        paths: ['controllers'],
      });
    } catch (error) {
      expect(error).toBeInstanceOf(AgentError);
    }
  });
  it('should fetch the subnet id of a given canister', async () => {
    const counterCanisterId =
      process.env.COUNTER_CANISTER_ID || execSync('dfx canister id counter').toString().trim();
    const agent = await makeAgent();
    await agent.fetchRootKey();
    const statusMap = await CanisterStatus.request({
      canisterId: Principal.fromText(counterCanisterId),
      agent,
      paths: ['subnet'],
    });

    const subnet = statusMap.get('subnet') as CanisterStatus.SubnetStatus;

    expect(subnet).toBeDefined();

    const principal = Principal.fromText(subnet.subnetId);
    expect(principal).toBeDefined();
  });
});
