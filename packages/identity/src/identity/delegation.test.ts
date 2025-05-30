import { Principal } from '@dfinity/principal';
import { DelegationChain, DelegationIdentity, PartialDelegationIdentity } from './delegation';
import { Ed25519KeyIdentity } from './ed25519';
import { Ed25519PublicKey } from '@dfinity/agent';

function createIdentity(seed: number): Ed25519KeyIdentity {
  const s = new Uint8Array([seed, ...new Array(31).fill(0)]);
  return Ed25519KeyIdentity.generate(s);
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
  expect(rootToMiddleActual.toJSON()).toMatchObject(rootToMiddle.toJSON());

  const middleToBottomJson = JSON.stringify(middleToBottom);
  const middleToBottomActual = DelegationChain.fromJSON(middleToBottomJson);
  expect(middleToBottomActual.toJSON()).toEqual(middleToBottom.toJSON());
});

test('Delegation Chain can sign', async () => {
  const root = createIdentity(2);
  const middle = createIdentity(1);

  const rootToMiddle = await DelegationChain.create(
    root,
    middle.getPublicKey(),
    new Date(1609459200000),
    {
      targets: [Principal.fromText('jyi7r-7aaaa-aaaab-aaabq-cai')],
    },
  );

  const identity = DelegationIdentity.fromDelegation(middle, rootToMiddle);

  const signature = await identity.sign(new Uint8Array([1, 2, 3]));

  const isValid = Ed25519KeyIdentity.verify(
    signature,
    new Uint8Array([1, 2, 3]),
    middle.getPublicKey().rawKey,
  );
  expect(isValid).toBe(true);
  expect(middle.toJSON()[1].length).toBe(64);
});

describe('PartialDelegationIdentity', () => {
  it('should create a partial identity from a public key and a delegation chain', async () => {
    const key = Ed25519PublicKey.fromRaw(new Uint8Array(32).fill(0));
    const signingIdentity = Ed25519KeyIdentity.generate(new Uint8Array(32).fill(1));
    const chain = await DelegationChain.create(signingIdentity, key, new Date(1609459200000));

    const partial = PartialDelegationIdentity.fromDelegation(key, chain);

    const partialDelegation = partial.delegation;
    expect(partialDelegation).toBeDefined();

    const rawKey = partial.rawKey;
    expect(rawKey).toBeDefined();

    const principal = partial.getPrincipal();
    expect(principal).toBeDefined();
    expect(principal.toText()).toEqual(
      'deffl-liaaa-aaaaa-aaaaa-aaaaa-aaaaa-aaaaa-aaaaa-aaaaa-aaaaa-aaaaa-aaa',
    );
  });
  it('should throw an error if one attempts to sign', async () => {
    const key = Ed25519PublicKey.fromRaw(new Uint8Array(32).fill(0));
    const signingIdentity = Ed25519KeyIdentity.generate(new Uint8Array(32).fill(1));
    const chain = await DelegationChain.create(signingIdentity, key, new Date(1609459200000));

    const partial = PartialDelegationIdentity.fromDelegation(key, chain);
    await partial.transformRequest().catch(e => {
      expect(e).toContain('Not implemented.');
    });
  });
});
