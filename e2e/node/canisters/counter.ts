import { Actor, blobFromUint8Array, Principal, IDL } from "@dfinity/agent";
import { readFileSync } from "fs";
import path from "path";
import agent from "../utils/agent";

let cache: {
  canisterId: Principal;
  actor: any;
} | null = null;

export default async function (): Promise<{
  canisterId: Principal;
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
      actor: Actor.createActor(idl, { canisterId, agent }) as any,
    };
  }

  return cache;
}
