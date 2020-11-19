import { Actor, blobFromUint8Array, IDL } from "@dfinity/agent";
import * as path from "path";
import { readFileSync } from "fs";
import agent from "../utils/agent";

test("counter", async () => {
  const wasm = readFileSync(path.join(__dirname, "../canisters/counter.wasm"));

  const canisterId = await Actor.createCanister();
  await Actor.install({ module: blobFromUint8Array(wasm) }, { canisterId });
  const counter_idl: IDL.InterfaceFactory = ({ IDL }) => {
    return IDL.Service({
      inc: IDL.Func([], [], []),
      read: IDL.Func([], [IDL.Nat], ["query"]),
      greet: IDL.Func([IDL.Text], [IDL.Text], []),
    });
  };

  const counter = Actor.createActor(counter_idl, { canisterId, agent }) as any;
  expect(await counter.greet("counter")).toEqual("Hello, counter!");
  expect(+(await counter.read())).toEqual(0);
  await counter.inc();
  expect(+(await counter.read())).toEqual(1);
  await counter.inc();
  expect(+(await counter.read())).toEqual(2);
});
