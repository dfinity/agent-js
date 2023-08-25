import { SignIdentity } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';
import { Delegation, DelegationChain } from './delegation';
import { Ed25519KeyIdentity } from './ed25519';

function createIdentity(seed: number): SignIdentity {
  const s = new Uint8Array([seed, ...new Array(31).fill(0)]);
  return Ed25519KeyIdentity.generate(s);
}

function randomPrincipal(): Principal {
  const bytes = new Uint8Array(29);
  crypto.getRandomValues(bytes);
  return Principal.fromUint8Array(bytes);
}

test('delegation signs with proper keys (3)', async () => {
  const root = createIdentity(2);
  const middle = createIdentity(1);
  const bottom = createIdentity(0);

  const rootToMiddle = await DelegationChain.create(
    root,
    middle.getPublicKey(),
    new Date(1609459200000),
  );
  const middleToBottom = await DelegationChain.create(
    middle,
    bottom.getPublicKey(),
    new Date(1609459200000),
    {
      previous: rootToMiddle,
    },
  );

  const golden = {
    delegations: [
      {
        delegation: {
          expiration: '1655f29d787c0000',
          pubkey:
            '302a300506032b6570032100cecc1507dc1ddd7295951c290888f095adb9044d1b73d696e6df065d683bd4fc',
        },
        signature:
          'b106d135e5ad7459dc67db68a4946fdbe603e650df4035957db7f0fb54e7467bb463116a2ad025e1887cd1f29025e0f3607b09924abbbbebfaf921b675c8ff08',
      },
      {
        delegation: {
          expiration: '1655f29d787c0000',
          pubkey:
            '302a300506032b65700321003b6a27bcceb6a42d62a3a8d02a6f0d73653215771de243a63ac048a18b59da29',
        },
        signature:
          '5e40f3d171e499a691092e5b961b5447921091bcf8c6409cb5641541f4dc1390f501c5dfb16b10df29d429cd153b9e396af4e883ed3cfa090d28e214db14c308',
      },
    ],
    publicKey:
      '302a300506032b65700321006b79c57e6a095239282c04818e96112f3f03a4001ba97a564c23852a3f1ea5fc',
  };

  expect(middleToBottom.toJSON()).toEqual(golden);
});

test('DelegationChain can be serialized to and from JSON', async () => {
  const root = createIdentity(2);
  const middle = createIdentity(1);
  const bottom = createIdentity(0);

  const rootToMiddle = await DelegationChain.create(
    root,
    middle.getPublicKey(),
    new Date(1609459200000),
    {
      targets: [Principal.fromText('jyi7r-7aaaa-aaaab-aaabq-cai')],
    },
  );
  const middleToBottom = await DelegationChain.create(
    middle,
    bottom.getPublicKey(),
    new Date(1609459200000),
    {
      previous: rootToMiddle,
      targets: [Principal.fromText('u76ha-lyaaa-aaaab-aacha-cai')],
    },
  );

  const rootToMiddleJson = JSON.stringify(rootToMiddle);
  // All strings in the JSON should be hex so it is clear how to decode this as different versions
  // of `toJSON` evolve.
  JSON.parse(rootToMiddleJson, (key, value) => {
    if (typeof value === 'string') {
      const byte = parseInt(value, 16);
      if (isNaN(byte)) {
        throw new Error(`expected all strings to be hex, but got: ${value}`);
      }
    }
    return value;
  });
  const rootToMiddleActual = DelegationChain.fromJSON(rootToMiddleJson);
  expect(rootToMiddleActual).toEqual(rootToMiddle);

  const middleToBottomJson = JSON.stringify(middleToBottom);
  const middleToBottomActual = DelegationChain.fromJSON(middleToBottomJson);
  expect(middleToBottomActual).toEqual(middleToBottom);
});

test('DelegationChain has a maximum length of 20 delegations', async () => {
  const identities = new Array(21).fill(0).map((_, i) => createIdentity(i));
  const signedDelegations: DelegationChain[] = [];

  for (let i = 0; i < identities.length - 1; i++) {
    const identity = identities[i];
    const nextIdentity = identities[i + 1];
    let signedDelegation: DelegationChain;
    if (i === 0) {
      signedDelegation = await DelegationChain.create(
        identity,
        nextIdentity.getPublicKey(),
        new Date(1609459200000),
      );
    } else {
      signedDelegation = await DelegationChain.create(
        identity,
        nextIdentity.getPublicKey(),
        new Date(1609459200000),
        {
          previous: signedDelegations[i - 1],
        },
      );
    }
    signedDelegations.push(signedDelegation);
  }
  expect(signedDelegations.length).toEqual(20);

  const secondLastIdentity = identities[identities.length - 2];
  const lastIdentity = identities[identities.length - 1];
  expect(
    DelegationChain.create(
      secondLastIdentity,
      lastIdentity.getPublicKey(),
      new Date(1609459200000),
      {
        previous: signedDelegations[signedDelegations.length - 1],
      },
    ),
  ).rejects.toThrow('Delegation chain cannot exceed 20');
});

test('Delegation can include multiple targets', async () => {
  const pubkey = new Uint8Array([1, 2, 3]);
  const expiration = BigInt(Number(new Date(1609459200000)));
  const targets = [
    Principal.fromText('jyi7r-7aaaa-aaaab-aaabq-cai'),
    Principal.fromText('u76ha-lyaaa-aaaab-aacha-cai'),
  ];
  const delegation = new Delegation(pubkey, expiration, targets);
  expect(delegation.targets).toEqual(targets);
  expect(delegation.toJSON()).toMatchSnapshot();
});

test('Delegation targets cannot exceed 1_000', () => {
  const targets = new Array(1_001).fill(randomPrincipal());
  expect(() => new Delegation(new Uint8Array([1, 2, 3]), BigInt(0), targets)).toThrow(
    'Delegation targets cannot exceed 1000',
  );
});

test('Delegation chains cannot repeat public keys', async () => {
  const root = createIdentity(0);
  const middle = createIdentity(1);
  const bottom = createIdentity(2);

  const rootToMiddle = await DelegationChain.create(
    root,
    middle.getPublicKey(),
    new Date(1609459200000),
  );
  const middleToBottom = await DelegationChain.create(
    middle,
    bottom.getPublicKey(),
    new Date(1609459200000),
    {
      previous: rootToMiddle,
    },
  );

  expect(
    DelegationChain.create(bottom, root.getPublicKey(), new Date(1609459200000), {
      previous: middleToBottom,
    }),
  ).rejects.toThrow('Delegation chain cannot repeat public keys');
});
