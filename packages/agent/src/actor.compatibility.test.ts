import { Actor } from './actor';
import { HttpAgent } from './agent/http';
import { HttpAgent as HttpAgentv1 } from 'agent1';

jest.useRealTimers();
test.only("Legacy Agent interface should be accepted by Actor's createActor", async () => {
  const idlFactory = ({ IDL }) => {
    return IDL.Service({
      greet: IDL.Func([IDL.Text], [IDL.Text], []),
      inc: IDL.Func([], [], []),
      inc_read: IDL.Func([], [IDL.Nat], []),
      queryGreet: IDL.Func([IDL.Text], [IDL.Text], ['query']),
      read: IDL.Func([], [IDL.Nat], ['query']),
      write: IDL.Func([IDL.Nat], [], []),
    });
  };

  const actor = Actor.createActor(idlFactory, {
    canisterId: 'tnnnb-2yaaa-aaaab-qaiiq-cai',
    agent: new HttpAgent({ host: 'https://icp-api.io' }) as unknown as HttpAgent,
  });

  //   await actor.write(8); //?
  const actor1 = Actor.createActor(idlFactory, {
    canisterId: 'tnnnb-2yaaa-aaaab-qaiiq-cai',
    agent: new HttpAgentv1({ host: 'https://icp-api.io' }) as unknown as HttpAgent,
  });

  await actor1.write(8); //?
  await actor1.read(); //?
});
// TODO: tests for rejected, unknown time out

jest.setTimeout(8000);
