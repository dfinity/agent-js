import { Principal } from '@dfinity/principal';
import agent from '../utils/agent';
import { readFileSync } from 'fs';
import path from 'path';
import { Actor, ActorMethod, ActorSubclass } from '@dfinity/agent';
import { IDL } from '@dfinity/candid';

export interface _SERVICE {
  hello: ActorMethod<[string], undefined>;
}
export declare const init: (args: { IDL: typeof IDL }) => IDL.Type[];

export const idlFactory = ({ IDL }) => {
  return IDL.Service({ hello: IDL.Func([IDL.Text], [], []) });
};

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
    const module = readFileSync(path.join(__dirname, 'logs.wasm'));

    const canisterId = await Actor.createCanister({ agent: await agent });
    await Actor.install({ module }, { canisterId, agent: await agent });

    const actor = Actor.createActor(idlFactory, {
      canisterId,
      agent: await agent,
    }) as ActorSubclass<_SERVICE>;

    await actor.hello('first call');

    cache = {
      canisterId,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      actor,
    };
  }

  return cache;
}
