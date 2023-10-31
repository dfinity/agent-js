import { Actor, HttpAgentOptions } from '@dfinity/agent';
import { IDL } from '@dfinity/candid';
import { Principal } from '@dfinity/principal';
import { readFileSync } from 'fs';
import path from 'path';
import agent, { identity, makeAgent } from '../utils/agent';

let cache: {
  canisterId: Principal;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  actor: any;
} | null = null;

const idl: IDL.InterfaceFactory = ({ IDL }) => {
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
/**
 * With no cache and nonce disabled
 */
export async function noncelessCanister(): Promise<{
  canisterId: Principal;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  actor: any;
}> {
  const module = readFileSync(path.join(__dirname, 'counter.wasm'));
  const disableNonceAgent = await makeAgent({
    identity,
    disableNonce: true,
  });

  const canisterId = await Actor.createCanister({ agent: disableNonceAgent });
  await Actor.install({ module }, { canisterId, agent: disableNonceAgent });
  const actor = Actor.createActor(idl, { canisterId, agent: await disableNonceAgent }) as any;
  return {
    canisterId,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    actor,
  };
}

export const createActor = async (options?: HttpAgentOptions) => {
  const module = readFileSync(path.join(__dirname, 'counter.wasm'));
  const agent = await makeAgent({
    ...options,
  });
  try {
    if (!options?.host?.includes('icp-api')) {
      await agent.fetchRootKey();
    }
  } catch (_) {
    //
  }

  const canisterId = await Actor.createCanister({ agent });
  await Actor.install({ module }, { canisterId, agent });
  return Actor.createActor(idl, { canisterId, agent }) as any;
};
