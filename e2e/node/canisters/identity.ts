import { Actor, blobFromUint8Array, Principal, IDL } from "@dfinity/agent";
import { readFileSync } from "fs";
import path from "path";
import agent from "../utils/agent";

let cache: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  actor: any;
  canisterId: Principal;
  idl: IDL.InterfaceFactory;
} | null = null;

/**
 * Create an Actor that acts as an 'whoami service' (echoes back request.caller Principal)
 */
export default async function (): Promise<{
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  actor: any;
  canisterId: Principal;
  idl: IDL.InterfaceFactory;
}> {
  if (!cache) {
    const wasm = readFileSync(path.join(__dirname, "identity.wasm"));

    const canisterId = await Actor.createCanister();
    await Actor.install({ module: blobFromUint8Array(wasm) }, { canisterId });
    const idl: IDL.InterfaceFactory = ({ IDL }) => {
      return IDL.Service({
        whoami: IDL.Func([], [IDL.Principal], []),
        whoami_query: IDL.Func([], [IDL.Principal], ["query"]),
      });
    };

    cache = {
      canisterId,
      idl,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      actor: Actor.createActor(idl, { canisterId, agent }) as any,
    };
  }

  return cache;
}
