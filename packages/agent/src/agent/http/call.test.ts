import { Actor } from '../../actor';
import { AnonymousIdentity } from '../../auth';
import { Call } from './call';
import { IDL } from '@dfinity/candid';
import { HttpAgent } from '.';
import { Principal } from '@dfinity/principal';

const setup = () =>
  new Call({
    identity: new AnonymousIdentity(),
    canisterId: 'ivcos-eqaaa-aaaab-qablq-cai',
    callArgs: {
      arg: new ArrayBuffer(0),
      methodName: 'whoami',
    },
    maxTries: 3,
    fetchConfig: {
      body: new ArrayBuffer(0),
      method: 'POST',
      headers: {},
      fetch,
      host: 'https://icp-api.io',
    },
  });

jest.setTimeout(30000);
test('makes a call', async () => {
  jest.useRealTimers();
  const call = setup();
  expect(call).toBeInstanceOf(Call);
  const { response, requestId } = await call.request();
  expect(response).toBeTruthy();
});

test('actor', async () => {
  const actor = Actor.createActor(
    () => {
      return IDL.Service({
        whoami: IDL.Func([], [IDL.Principal], ['query']),
      });
    },
    {
      agent: new HttpAgent({ host: 'https://icp-api.io' }),
      canisterId: 'ivcos-eqaaa-aaaab-qablq-cai',
    },
  ) as Actor & { whoami: () => Promise<Principal> };
  const whoami = await actor.whoami();
  expect(whoami.toText()).toBe('2vxsx-fae');
});
