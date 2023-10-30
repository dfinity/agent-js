import { CanisterStatus, HttpAgent } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';
import counter from '../canisters/counter';
import { makeAgent } from '../utils/agent';
import { describe, it, afterEach, expect } from 'vitest';

afterEach(async () => {
  await Promise.resolve();
});
describe('canister status', () => {
  it('should fetch successfully', async () => {
    const counterObj = await (await counter)();
    const agent = await makeAgent();
    await agent.fetchRootKey();
    const request = await CanisterStatus.request({
      canisterId: Principal.from(counterObj.canisterId),
      agent,
      paths: ['controllers'],
    });

    expect(Array.isArray(request.get('controllers'))).toBe(true);
  });
  it('should throw an error if fetchRootKey has not been called', async () => {
    const counterObj = await (await counter)();
    const agent = new HttpAgent({
      host: `http://127.0.0.1:${process.env.REPLICA_PORT ?? 4943}`,
      verifyQuerySignatures: false,
    });
    const shouldThrow = async () => {
      // eslint-disable-next-line no-useless-catch
      try {
        const request = await CanisterStatus.request({
          canisterId: Principal.from(counterObj.canisterId),
          agent,
          paths: ['controllers'],
        }).catch(error => {
          throw error;
        });
        console.log(request);
      } catch (error) {
        throw error;
      }
    };

    expect(shouldThrow).rejects.toThrow();
  });
});
