import { Actor, ActorSubclass, HttpAgentOptions, Agent } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';
import { readFileSync } from 'fs';
import path from 'path';
import agent, { makeAgent } from '../utils/agent';
import { _SERVICE } from './declarations/counter';
import { getDefaultEffectiveCanisterId } from '../basic/basic.test';

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

/**
 * Create a counter Actor + canisterId
 */
export default async function (): Promise<{
  canisterId: Principal;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  actor: any;
}> {
  if (!cache) {
    const module = readFileSync(path.join(__dirname, 'counter.wasm'));

    const canisterId = await Actor.createCanister({ agent: await agent });
    await Actor.install({ module }, { canisterId, agent: await agent });

    cache = {
      canisterId,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      actor: Actor.createActor(idl, { canisterId, agent: await agent }) as any,
    };
  }

  return cache;
}

export const createActor = async (options?: HttpAgentOptions, agent?: Agent) => {
  const module = readFileSync(path.join(__dirname, 'counter.wasm'));
  const effectiveAgent = agent
    ? agent
    : await makeAgent({
        ...options,
      });
  try {
    if (!options?.host?.includes('icp-api')) {
      await effectiveAgent.fetchRootKey();
    }
  } catch {
    //
  }

  const canisterId = await Actor.createCanister({
    agent: effectiveAgent,
    effectiveCanisterId: await getDefaultEffectiveCanisterId(),
  });
  await Actor.install({ module }, { canisterId, agent: effectiveAgent });
  return Actor.createActor(idl, { canisterId, agent: effectiveAgent }) as ActorSubclass<_SERVICE>;
};
