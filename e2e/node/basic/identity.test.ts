/**
 * @jest-environment node
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Actor, HttpAgent, SignIdentity } from '@dfinity/agent';
import { IDL } from '@dfinity/candid';
import { Principal } from '@dfinity/principal';
import {
  DelegationChain,
  DelegationIdentity,
  Ed25519KeyIdentity,
  Secp256k1KeyIdentity,
  ECDSAKeyIdentity,
} from '@dfinity/identity';
import agent from '../utils/agent';
import identityCanister from '../canisters/identity';

function createIdentity(seed: number): SignIdentity {
  const seed1 = new Array(32).fill(0);
  seed1[0] = seed;
  return Ed25519KeyIdentity.generate(new Uint8Array(seed1));
}

function createSecpIdentity(seed: number): SignIdentity {
  const seed1 = new Array(32).fill(0);
  seed1[0] = seed;
  return Secp256k1KeyIdentity.generate(new Uint8Array(seed1));
}

async function createIdentityActor(
  seed: number,
  canisterId: Principal,
  idl: IDL.InterfaceFactory,
): Promise<any> {
  const identity = createIdentity(seed);
  const agent1 = new HttpAgent({ source: await agent, identity });
  return Actor.createActor(idl, {
    canisterId,
    agent: agent1,
  }) as any;
}

async function createSecp256k1IdentityActor(
  canisterId: Principal,
  idl: IDL.InterfaceFactory,
  seed?: number,
): Promise<any> {
  let seed1: Uint8Array | undefined;
  if (seed) {
    seed1 = new Uint8Array(new Array(32).fill(0));
    seed1[0] = seed;
  }

  const identity = Secp256k1KeyIdentity.generate(seed1);
  const agent1 = new HttpAgent({ source: await agent, identity });
  return Actor.createActor(idl, {
    canisterId,
    agent: agent1,
  }) as any;
}

async function createEcdsaIdentityActor(
  canisterId: Principal,
  idl: IDL.InterfaceFactory,
  identity?: SignIdentity,
): Promise<any> {
  let effectiveIdentity: SignIdentity;
  if (identity) {
    effectiveIdentity = identity;
  } else {
    effectiveIdentity = await ECDSAKeyIdentity.generate();
  }
  const agent1 = new HttpAgent({ source: await agent, identity: effectiveIdentity });
  return Actor.createActor(idl, {
    canisterId,
    agent: agent1,
  }) as any;
}

async function installIdentityCanister(): Promise<{
  canisterId: Principal;
  idl: IDL.InterfaceFactory;
}> {
  const { canisterId, idl } = await identityCanister();
  return {
    canisterId,
    idl,
  };
}

jest.setTimeout(30000);
test('identity: query and call gives same principal', async () => {
  const { canisterId, idl } = await installIdentityCanister();
  const identity = Actor.createActor(idl, {
    canisterId,
    agent: await agent,
  }) as any;
  const callPrincipal = await identity.whoami();
  const queryPrincipal = await identity.whoami_query();
  expect(callPrincipal).toEqual(queryPrincipal);
});

jest.setTimeout(30000);
test('identity: two different Ed25519 keys should have a different principal', async () => {
  const { canisterId, idl } = await installIdentityCanister();
  const identity1 = await createIdentityActor(0, canisterId, idl);
  const identity2 = await createIdentityActor(1, canisterId, idl);

  const principal1 = await identity1.whoami_query();
  const principal2 = await identity2.whoami_query();
  expect(principal1).not.toEqual(principal2);
});

jest.setTimeout(30000);
test('identity: two different Secp256k1 keys should have a different principal', async () => {
  const { canisterId, idl } = await installIdentityCanister();
  // Seeded identity
  const identity1 = await createSecp256k1IdentityActor(canisterId, idl, 0);
  // Unseeded identity
  const identity2 = await createSecp256k1IdentityActor(canisterId, idl);

  const principal1 = await identity1.whoami_query();
  const principal2 = await identity2.whoami_query();
  expect(principal1).not.toEqual(principal2);
});

jest.setTimeout(30000);
test('identity: two different Ecdsa keys should have a different principal', async () => {
  const { canisterId, idl } = await installIdentityCanister();
  const identity1 = await createEcdsaIdentityActor(canisterId, idl);
  const identity2 = await createEcdsaIdentityActor(canisterId, idl);

  const principal1 = await identity1.whoami_query();
  const principal2 = await identity2.whoami_query();
  expect(principal1).not.toEqual(principal2);
});

jest.setTimeout(30000);
test('delegation: principal is the same between delegated keys with secp256k1', async () => {
  const { canisterId, idl } = await installIdentityCanister();

  const masterKey = createSecpIdentity(2);
  const sessionKey = createSecpIdentity(3);

  const delegation = await DelegationChain.create(masterKey, sessionKey.getPublicKey());
  const id3 = DelegationIdentity.fromDelegation(sessionKey, delegation);

  const identityActor1 = Actor.createActor(idl, {
    canisterId,
    agent: new HttpAgent({ source: await agent, identity: masterKey }),
  }) as any;
  const identityActor2 = Actor.createActor(idl, {
    canisterId,
    agent: new HttpAgent({ source: await agent, identity: sessionKey }),
  }) as any;
  const identityActor3 = Actor.createActor(idl, {
    canisterId,
    agent: new HttpAgent({ source: await agent, identity: id3 }),
  }) as any;

  const principal1 = await identityActor1.whoami_query();
  const principal2 = await identityActor2.whoami_query();
  const principal3 = await identityActor3.whoami_query();
  expect(principal1).not.toEqual(principal2);
  expect(principal1).toEqual(principal3);
  expect(principal2).not.toEqual(principal3);
});

jest.setTimeout(30000);
test('delegation: principal is the same between delegated keys', async () => {
  const { canisterId, idl } = await installIdentityCanister();

  const masterKey = createIdentity(2);
  const sessionKey = createIdentity(3);

  const delegation = await DelegationChain.create(masterKey, sessionKey.getPublicKey());
  const id3 = DelegationIdentity.fromDelegation(sessionKey, delegation);

  const identityActor1 = Actor.createActor(idl, {
    canisterId,
    agent: new HttpAgent({ source: await agent, identity: masterKey }),
  }) as any;
  const identityActor2 = Actor.createActor(idl, {
    canisterId,
    agent: new HttpAgent({ source: await agent, identity: sessionKey }),
  }) as any;
  const identityActor3 = Actor.createActor(idl, {
    canisterId,
    agent: new HttpAgent({ source: await agent, identity: id3 }),
  }) as any;

  const principal1 = await identityActor1.whoami_query();
  const principal2 = await identityActor2.whoami_query();
  const principal3 = await identityActor3.whoami_query();
  expect(principal1).not.toEqual(principal2);
  expect(principal1).toEqual(principal3);
  expect(principal2).not.toEqual(principal3);
});

jest.setTimeout(30000);
test('delegation: works with 3 keys', async () => {
  const { canisterId, idl } = await installIdentityCanister();

  const rootKey = createIdentity(4);
  const middleKey = createIdentity(5);
  const bottomKey = createIdentity(6);

  const id1D2 = await DelegationChain.create(rootKey, middleKey.getPublicKey());
  const idDelegated = DelegationIdentity.fromDelegation(
    bottomKey,
    await DelegationChain.create(middleKey, bottomKey.getPublicKey(), undefined, {
      previous: id1D2,
    }),
  );

  const identityActorBottom = Actor.createActor(idl, {
    canisterId,
    agent: new HttpAgent({ source: await agent, identity: bottomKey }),
  }) as any;
  const identityActorMiddle = Actor.createActor(idl, {
    canisterId,
    agent: new HttpAgent({ source: await agent, identity: middleKey }),
  }) as any;
  const identityActorRoot = Actor.createActor(idl, {
    canisterId,
    agent: new HttpAgent({ source: await agent, identity: rootKey }),
  }) as any;
  const identityActorDelegated = Actor.createActor(idl, {
    canisterId,
    agent: new HttpAgent({ source: await agent, identity: idDelegated }),
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

jest.setTimeout(30000);
test('delegation: works with 4 keys', async () => {
  const { canisterId, idl } = await installIdentityCanister();

  const rootKey = createIdentity(7);
  const middleKey = createIdentity(8);
  const middle2Key = createIdentity(9);
  const bottomKey = createIdentity(10);

  const rootToMiddle = await DelegationChain.create(rootKey, middleKey.getPublicKey());
  const middleToMiddle2 = await DelegationChain.create(
    middleKey,
    middle2Key.getPublicKey(),
    undefined,
    {
      previous: rootToMiddle,
    },
  );
  const idDelegated = DelegationIdentity.fromDelegation(
    bottomKey,
    await DelegationChain.create(middle2Key, bottomKey.getPublicKey(), undefined, {
      previous: middleToMiddle2,
    }),
  );

  const identityActorBottom = Actor.createActor(idl, {
    canisterId,
    agent: new HttpAgent({ source: await agent, identity: bottomKey }),
  }) as any;
  const identityActorMiddle = Actor.createActor(idl, {
    canisterId,
    agent: new HttpAgent({ source: await agent, identity: middleKey }),
  }) as any;
  const identityActorMiddle2 = Actor.createActor(idl, {
    canisterId,
    agent: new HttpAgent({ source: await agent, identity: middle2Key }),
  }) as any;
  const identityActorRoot = Actor.createActor(idl, {
    canisterId,
    agent: new HttpAgent({ source: await agent, identity: rootKey }),
  }) as any;
  const identityActorDelegated = Actor.createActor(idl, {
    canisterId,
    agent: new HttpAgent({ source: await agent, identity: idDelegated }),
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
