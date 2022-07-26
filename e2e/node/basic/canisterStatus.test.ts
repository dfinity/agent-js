import { CanisterStatus, HttpAgent } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';
import counter from '../canisters/counter';

jest.setTimeout(30_000);
describe.only('canister status', () => {
  it('should fetch successfully', async () => {
    const counterObj = await (await counter)();
    const agent = new HttpAgent({ host: `http://localhost:${process.env.REPLICA_PORT}` });
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
    const agent = new HttpAgent({ host: `http://localhost:${process.env.REPLICA_PORT}` });
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
