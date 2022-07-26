import { CanisterStatus, HttpAgent } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';
import counter from '../canisters/counter';

describe('canister status', () => {
  it('should fetch successfully', async () => {
    const foo = await (await counter)();
    const agent = new HttpAgent({ host: `http://localhost:${process.env.REPLICA_PORT}` });
    const request = await CanisterStatus.request({
      canisterId: Principal.from(foo.canisterId),
      agent,
      paths: ['controllers'],
    });

    expect(Array.isArray(request.get('controllers'))).toBe(true);
  });
});
