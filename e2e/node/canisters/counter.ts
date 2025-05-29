import { Actor, ActorSubclass, HttpAgentOptions, Agent, ActorConfig } from '@dfinity/agent';
import { makeAgent } from '../utils/agent';
import { type _SERVICE } from './declarations/counter/counter.did';
import { getCanisterId } from '../utils/canisterid';
import { IDL } from '@dfinity/candid';
import { Principal } from '@dfinity/principal';

export const idl: IDL.InterfaceFactory = ({ IDL }) => {
  return IDL.Service({
    inc: IDL.Func([], [], []),
    inc_read: IDL.Func([], [IDL.Nat], []),
    read: IDL.Func([], [IDL.Nat], ['query']),
    write: IDL.Func([IDL.Nat], [], []),
    greet: IDL.Func([IDL.Text], [IDL.Text], []),
    queryGreet: IDL.Func([IDL.Text], [IDL.Text], ['query']),
  });
};

export const counterCanisterId = getCanisterId('counter');

export const counter2CanisterId = getCanisterId('counter2');

export const createActor = async (
  canisterId: Principal,
  options?: {
    agentOptions?: HttpAgentOptions;
    actorOptions?: ActorConfig;
    agent?: Agent;
  },
) => {
  const effectiveAgent = options?.agent ? options.agent : await makeAgent(options?.agentOptions);

  return Actor.createActor(idl, { canisterId, agent: effectiveAgent }) as ActorSubclass<_SERVICE>;
};

// Export the counter actor directly
export const counterActor = await createActor(counterCanisterId);

// Export the counter2 actor directly
export const counter2Actor = await createActor(counter2CanisterId);
