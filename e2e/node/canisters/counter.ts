import { Actor } from '@dfinity/agent';
import { blobFromUint8Array, IDL } from '@dfinity/candid';
import { Principal } from '@dfinity/principal';
import { readFileSync } from 'fs';
import path from 'path';
import agent from '../utils/agent';

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
    const wasm = readFileSync(path.join(__dirname, 'counter.wasm'));

    const canisterId = await Actor.createCanister({ agent: await agent });
    await Actor.install({ module: blobFromUint8Array(wasm) }, { canisterId, agent: await agent });
    const idl: IDL.InterfaceFactory = ({ IDL }) => {
      return IDL.Service({
        inc: IDL.Func([], [], []),
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
