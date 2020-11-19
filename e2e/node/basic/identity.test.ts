import { Actor, blobFromUint8Array, HttpAgent, IDL } from "@dfinity/agent";
import { Ed25519KeyIdentity } from "@dfinity/authentication";
import * as path from "path";
import { readFileSync } from "fs";
import agent from "../utils/agent";

test("identity: query and call gives same principal", async () => {
  const wasm = readFileSync(path.join(__dirname, "../canisters/identity.wasm"));

  const canisterId = await Actor.createCanister();
  await Actor.install({ module: blobFromUint8Array(wasm) }, { canisterId });
  const identity_idl: IDL.InterfaceFactory = ({ IDL }) => {
    return IDL.Service({
      whoami: IDL.Func([], [IDL.Principal], []),
      whoami_query: IDL.Func([], [IDL.Principal], ["query"]),
    });
  };

  const identity = Actor.createActor(identity_idl, {
    canisterId,
    agent,
  }) as any;
  const callPrincipal = await identity.whoami();
  const queryPrincipal = await identity.whoami_query();
  expect(callPrincipal).toEqual(queryPrincipal);
});

test("identity: two different Ed25519 keys should have a different principal", async () => {
  const wasm = readFileSync(path.join(__dirname, "../canisters/identity.wasm"));

  const canisterId = await Actor.createCanister();
  await Actor.install({ module: blobFromUint8Array(wasm) }, { canisterId });
  const identity_idl: IDL.InterfaceFactory = ({ IDL }) => {
    return IDL.Service({
      whoami: IDL.Func([], [IDL.Principal], []),
      whoami_query: IDL.Func([], [IDL.Principal], ["query"]),
    });
  };

  const seed1 = new Array(32).fill(0);
  const id1 = Ed25519KeyIdentity.generate(new Uint8Array(seed1));
  const agent1 = new HttpAgent({ source: agent, identity: id1 });
  const identity1 = Actor.createActor(identity_idl, {
    canisterId,
    agent: agent1,
  }) as any;

  const seed2 = new Array(32).fill(1);
  const id2 = Ed25519KeyIdentity.generate(new Uint8Array(seed2));
  const agent2 = new HttpAgent({ source: agent, identity: id2 });
  const identity2 = Actor.createActor(identity_idl, {
    canisterId,
    agent: agent2,
  }) as any;

  const principal1 = await identity1.whoami_query();
  const principal2 = await identity2.whoami_query();
  expect(principal1).not.toEqual(principal2);
});
