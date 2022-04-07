import { Actor, HttpAgent } from '@dfinity/agent';
import { IDL } from '@dfinity/candid';
import { Principal } from '@dfinity/principal';
import { readFileSync } from 'fs';
import path from 'path';
import agent, { port, identity } from '../utils/agent';

let cache: {
  canisterId: Principal;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  actor: any;
} | null = null;

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
    const idl: IDL.InterfaceFactory = ({ IDL }) => {
      return IDL.Service({
        inc: IDL.Func([], [], []),
        inc_read: IDL.Func([], [IDL.Nat], []),
        read: IDL.Func([], [IDL.Nat], ['query']),
        greet: IDL.Func([IDL.Text], [IDL.Text], []),
        queryGreet: IDL.Func([IDL.Text], [IDL.Text], ['query']),
      });
    };

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
  const disableNonceAgent = await Promise.resolve(
    new HttpAgent({
      host: 'http://127.0.0.1:' + port,
      identity,
      disableNonce: true,
    }),
  ).then(async agent => {
    await agent.fetchRootKey();
    return agent;
  });

  const canisterId = await Actor.createCanister({ agent: disableNonceAgent });
  await Actor.install({ module }, { canisterId, agent: disableNonceAgent });
  const idl: IDL.InterfaceFactory = ({ IDL }) => {
    return IDL.Service({
      inc: IDL.Func([], [], []),
      inc_read: IDL.Func([], [IDL.Nat], []),
      read: IDL.Func([], [IDL.Nat], ['query']),
      greet: IDL.Func([IDL.Text], [IDL.Text], []),
      queryGreet: IDL.Func([IDL.Text], [IDL.Text], ['query']),
    });
  };

  return {
    canisterId,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    actor: Actor.createActor(idl, { canisterId, agent: await disableNonceAgent }) as any,
  };
}
