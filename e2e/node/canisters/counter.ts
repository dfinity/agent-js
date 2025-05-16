import { Actor, ActorSubclass, HttpAgentOptions, Agent, ActorConfig } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';
import agent, { makeAgent } from '../utils/agent';
import { _SERVICE } from './declarations/counter';
import { execSync } from 'child_process';

let cache: {
  canisterId: Principal;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  actor: any;
} | null = null;

export const idl = ({ IDL }) => {
  return IDL.Service({
    inc: IDL.Func([], [], []),
    inc_read: IDL.Func([], [IDL.Nat], []),
    read: IDL.Func([], [IDL.Nat], ['query']),
    write: IDL.Func([IDL.Nat], [], []),
    greet: IDL.Func([IDL.Text], [IDL.Text], []),
    queryGreet: IDL.Func([IDL.Text], [IDL.Text], ['query']),
  });
};

export const counterCanisterId = Principal.from(process.env.COUNTER_CANISTER_ID ?? execSync('dfx canister id counter').toString().trim());

/**
 * Create a counter Actor + canisterId
 */
export default async function (): Promise<{
  canisterId: Principal;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  actor: any;
}> {
  if (!cache) {


    cache = {
      canisterId: counterCanisterId,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      actor: Actor.createActor(idl, { canisterId: counterCanisterId, agent: await agent }) as any,
    };
  }

  return cache;
}

export const createActor = async (canisterId, options?: {
  agentOptions?:HttpAgentOptions
  actorOptions?: ActorConfig
  agent?: Agent
}) => {
  const effectiveAgent = options?.agent
    ? await agent
    : await makeAgent(options?.agentOptions,
      );

  return Actor.createActor(idl, { canisterId, agent: effectiveAgent }) as ActorSubclass<_SERVICE>;
};
