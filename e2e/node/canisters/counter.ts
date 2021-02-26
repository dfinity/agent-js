import { Actor, blobFromUint8Array, Principal, IDL } from "@dfinity/agent";
import { readFileSync } from "fs";
import path from "path";
import agent from "../utils/agent";

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
    const wasm = readFileSync(path.join(__dirname, "counter.wasm"));

    const canisterId = await Actor.createCanister();
    await Actor.install({ module: blobFromUint8Array(wasm) }, { canisterId });
    const idl: IDL.InterfaceFactory = ({ IDL }) => {
      return IDL.Service({
        inc: IDL.Func([], [], []),
        read: IDL.Func([], [IDL.Nat], ["query"]),
        greet: IDL.Func([IDL.Text], [IDL.Text], []),
        queryGreet: IDL.Func([IDL.Text], [IDL.Text], ["query"]),        
      });
    };

    cache = {
      canisterId,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      actor: Actor.createActor(idl, { canisterId, agent }) as any,
    };
  }

  return cache;
}
