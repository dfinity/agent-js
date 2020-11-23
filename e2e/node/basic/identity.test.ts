import {
  Actor,
  ActorSubclass,
  blobFromUint8Array,
  HttpAgent,
  IDL,
  Principal,
  SignIdentity,
} from "@dfinity/agent";
import {
  DelegationIdentity,
  Ed25519KeyIdentity,
} from "@dfinity/authentication";
import * as path from "path";
import { readFileSync } from "fs";
import agent from "../utils/agent";
import { createDelegation } from "@dfinity/authentication/src/identity/delegation";

function createIdentity(seed: number): SignIdentity {
  const seed1 = new Array(32).fill(0);
  seed1[0] = seed;
  return Ed25519KeyIdentity.generate(new Uint8Array(seed1));
}

function createIdentityActor(
  seed: number,
  canisterId: Principal,
  idl: IDL.InterfaceFactory
): any {
  const identity = createIdentity(seed);
  const agent1 = new HttpAgent({ source: agent, identity });
  return Actor.createActor(idl, {
    canisterId,
    agent: agent1,
  }) as any;
}

async function installIdentityCanister(): Promise<{
  canisterId: Principal;
  idl: IDL.InterfaceFactory;
}> {
  const wasm = readFileSync(path.join(__dirname, "../canisters/identity.wasm"));

  const canisterId = await Actor.createCanister();
  await Actor.install({ module: blobFromUint8Array(wasm) }, { canisterId });
  return {
    canisterId,
    idl: ({ IDL }) => {
      return IDL.Service({
        whoami: IDL.Func([], [IDL.Principal], []),
        whoami_query: IDL.Func([], [IDL.Principal], ["query"]),
      });
    },
  };
}

test("identity: query and call gives same principal", async () => {
  const { canisterId, idl } = await installIdentityCanister();
  const identity = Actor.createActor(idl, {
    canisterId,
    agent,
  }) as any;
  const callPrincipal = await identity.whoami();
  const queryPrincipal = await identity.whoami_query();
  expect(callPrincipal).toEqual(queryPrincipal);
});

test("identity: two different Ed25519 keys should have a different principal", async () => {
  const { canisterId, idl } = await installIdentityCanister();
  let identity1 = createIdentityActor(0, canisterId, idl);
  let identity2 = createIdentityActor(1, canisterId, idl);

  const principal1 = await identity1.whoami_query();
  const principal2 = await identity2.whoami_query();
  expect(principal1).not.toEqual(principal2);
});

test("delegation: principal is the same between delegated keys", async () => {
  const { canisterId, idl } = await installIdentityCanister();

  let id1 = createIdentity(0);
  let id2 = createIdentity(1);
  const id3 = DelegationIdentity.fromDelegation(
    id2,
    await createDelegation(id1, id2)
  );

  let identityActor1 = Actor.createActor(idl, {
    canisterId,
    agent: new HttpAgent({ source: agent, identity: id1 }),
  }) as any;
  let identityActor2 = Actor.createActor(idl, {
    canisterId,
    agent: new HttpAgent({ source: agent, identity: id2 }),
  }) as any;
  const identityActor3 = Actor.createActor(idl, {
    canisterId,
    agent: new HttpAgent({ source: agent, identity: id3 }),
  }) as any;

  const principal1 = await identityActor1.whoami_query();
  const principal2 = await identityActor2.whoami_query();
  const principal3 = await identityActor3.whoami_query();
  expect(principal1).not.toEqual(principal2);
  expect(principal1).toEqual(principal3);
  expect(principal2).not.toEqual(principal3);
});

test("delegation: works with 3 keys", async () => {
  const { canisterId, idl } = await installIdentityCanister();

  let rootKey = createIdentity(2);
  let middleKey = createIdentity(1);
  let bottomKey = createIdentity(0);

  const id1D2 = await createDelegation(rootKey, middleKey);
  const idDelegated = DelegationIdentity.fromDelegation(
    bottomKey,
    await createDelegation(middleKey, bottomKey, { previous: id1D2 })
  );

  let identityActorBottom = Actor.createActor(idl, {
    canisterId,
    agent: new HttpAgent({ source: agent, identity: bottomKey }),
  }) as any;
  let identityActorMiddle = Actor.createActor(idl, {
    canisterId,
    agent: new HttpAgent({ source: agent, identity: middleKey }),
  }) as any;
  const identityActorRoot = Actor.createActor(idl, {
    canisterId,
    agent: new HttpAgent({ source: agent, identity: rootKey }),
  }) as any;
  const identityActorDelegated = Actor.createActor(idl, {
    canisterId,
    agent: new HttpAgent({ source: agent, identity: idDelegated }),
  }) as any;

  const principalBottom = await identityActorBottom.whoami_query();
  const principalMiddle = await identityActorMiddle.whoami_query();
  const principalRoot = await identityActorRoot.whoami_query();
  const principalDelegated = await identityActorDelegated.whoami_query();
  expect(principalBottom).not.toEqual(principalMiddle);
  expect(principalMiddle).not.toEqual(principalRoot);
  expect(principalBottom).not.toEqual(principalRoot);
  expect(principalRoot).toEqual(principalDelegated);
});

test.skip("delegation: works with 4 keys", async () => {
  const { canisterId, idl } = await installIdentityCanister();

  let rootKey = createIdentity(3);
  let middleKey = createIdentity(2);
  let middle2Key = createIdentity(1);
  let bottomKey = createIdentity(0);

  const rootToMiddle = await createDelegation(rootKey, middleKey);
  const middleToMiddle2 = await createDelegation(middleKey, middle2Key, {
    previous: rootToMiddle,
  });
  const idDelegated = DelegationIdentity.fromDelegation(
    bottomKey,
    await createDelegation(middleKey, bottomKey, { previous: middleToMiddle2 })
  );

  let identityActorBottom = Actor.createActor(idl, {
    canisterId,
    agent: new HttpAgent({ source: agent, identity: bottomKey }),
  }) as any;
  let identityActorMiddle = Actor.createActor(idl, {
    canisterId,
    agent: new HttpAgent({ source: agent, identity: middleKey }),
  }) as any;
  let identityActorMiddle2 = Actor.createActor(idl, {
    canisterId,
    agent: new HttpAgent({ source: agent, identity: middle2Key }),
  }) as any;
  const identityActorRoot = Actor.createActor(idl, {
    canisterId,
    agent: new HttpAgent({ source: agent, identity: rootKey }),
  }) as any;
  const identityActorDelegated = Actor.createActor(idl, {
    canisterId,
    agent: new HttpAgent({ source: agent, identity: idDelegated }),
  }) as any;

  const principalBottom = await identityActorBottom.whoami_query();
  const principalMiddle = await identityActorMiddle.whoami_query();
  const principalMiddle2 = await identityActorMiddle2.whoami_query();
  const principalRoot = await identityActorRoot.whoami_query();
  const principalDelegated = await identityActorDelegated.whoami_query();
  expect(principalBottom).not.toEqual(principalMiddle);
  expect(principalMiddle).not.toEqual(principalRoot);
  expect(principalMiddle2).not.toEqual(principalRoot);
  expect(principalBottom).not.toEqual(principalRoot);
  expect(principalBottom).not.toEqual(principalMiddle2);
  expect(principalRoot).toEqual(principalDelegated);
});
