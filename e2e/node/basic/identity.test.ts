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
} from '@dfinity/identity';
import agent from '../utils/agent';
import identityCanister from '../canisters/identity';
import { fromHexString } from '@dfinity/candid/lib/cjs/utils/buffer';

// 10 Stable Keys to test against for reproducible delegations
const seededKeys = [
  '00000000000000000000000000000000000000000000000000000000000000003b6a27bcceb6a42d62a3a8d02a6f0d73653215771de243a63ac048a18b59da29',
  '0100000000000000000000000000000000000000000000000000000000000000cecc1507dc1ddd7295951c290888f095adb9044d1b73d696e6df065d683bd4fc',
  '02000000000000000000000000000000000000000000000000000000000000006b79c57e6a095239282c04818e96112f3f03a4001ba97a564c23852a3f1ea5fc',
  '0300000000000000000000000000000000000000000000000000000000000000dadbd184a2d526f1ebdd5c06fdad9359b228759b4d7f79d66689fa254aad8546',
  '04000000000000000000000000000000000000000000000000000000000000009be3287795907809407e14439ff198d5bfc7dce6f9bc743cb369146f610b4801',
  '0500000000000000000000000000000000000000000000000000000000000000f4bd46521ce7b57899ae6f4ca09eddec689327a86a2232d4a3f2a4f39ac68a9e',
  '060000000000000000000000000000000000000000000000000000000000000034790764308e0b7b5f7cc9d5cdd29845fd82a03df53d2cffef3c0228547487c5',
  '0700000000000000000000000000000000000000000000000000000000000000a2fa2f4a355ba2e907a53009e9e37caddf7ac7e66a08ba07631f553072b3f24c',
  '0800000000000000000000000000000000000000000000000000000000000000d4c5061b81c4682b27a0cfc6459cd9d7892eb60a43f73dd1060b6c478aa7c3d8',
  '0900000000000000000000000000000000000000000000000000000000000000bb5c672482b0dcca91a21a4ed63b15afde8aa1378da72cd01b349589d6e7dd6a',
];

function createIdentity(seed: number): SignIdentity {
  return Ed25519KeyIdentity.fromSecretKey(fromHexString(seededKeys[seed]));
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
  seed: number,
  canisterId: Principal,
  idl: IDL.InterfaceFactory,
): Promise<any> {
  const identity = Secp256k1KeyIdentity.generate();
  const agent1 = new HttpAgent({ source: await agent, identity });
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

test('identity: two different Ed25519 keys should have a different principal', async () => {
  const { canisterId, idl } = await installIdentityCanister();
  const identity1 = await createIdentityActor(0, canisterId, idl);
  const identity2 = await createIdentityActor(1, canisterId, idl);

  const principal1 = await identity1.whoami_query();
  const principal2 = await identity2.whoami_query();
  expect(principal1).not.toEqual(principal2);
});

test('identity: two different Secp256k1 keys should have a different principal', async () => {
  const { canisterId, idl } = await installIdentityCanister();
  const identity1 = await createSecp256k1IdentityActor(0, canisterId, idl);
  const identity2 = await createSecp256k1IdentityActor(1, canisterId, idl);

  const principal1 = await identity1.whoami_query();
  const principal2 = await identity2.whoami_query();
  expect(principal1).not.toEqual(principal2);
});

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
