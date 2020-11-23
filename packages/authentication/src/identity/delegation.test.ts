import { BinaryBlob, blobFromHex, SignIdentity } from '@dfinity/agent';
import BigNumber from 'bignumber.js';
import { createDelegation } from './delegation';
import { Ed25519KeyIdentity } from './ed25519';

function createIdentity(seed: number): SignIdentity {
  const s = new Uint8Array([seed, ...new Array(31).fill(0)]);
  return Ed25519KeyIdentity.generate(s);
}
export function seed32Bytes(input: Uint8Array): BinaryBlob {
  const seed32 = new Uint8Array(32);
  Object.assign(seed32, input.slice(0, 32));
  return seed32 as BinaryBlob;
}

test('delegation signs with proper keys (3)', async () => {
  const a = Ed25519KeyIdentity.generate(seed32Bytes(new Uint8Array([0])));
  const b = Ed25519KeyIdentity.generate(seed32Bytes(new Uint8Array([1])));
  const c = Ed25519KeyIdentity.generate(seed32Bytes(new Uint8Array([2])));

  const bToC = await createDelegation(b, c, {
    expiration: new Date(1609459200000),
  });
  const aToC = await createDelegation(a, b, {
    expiration: new Date(1609459200000),
    previous: bToC,
  });

  const golden = {
    sender_delegation: [
      {
        delegation: {
          pubkey: blobFromHex(
            '302a300506032b6570032100cecc1507dc1ddd7295951c290888f095adb9044d1b73d696' +
              'e6df065d683bd4fc',
          ),
          expiration: new BigNumber('1609459200000000000'),
        },
        signature: blobFromHex(
          '94d7529165664c18d8fde890c07a24d2e9e77d898d1ab835805ca9ddf8e006587d74978c' +
            'edc3e25b6520c0d0a867a3e465853c9b44a2e6e3621f3d9244cc0d0d',
        ),
      },
      {
        delegation: {
          pubkey: blobFromHex(
            '302a300506032b65700321006b79c57e6a095239282c04818e96112f3f03a4001ba97a56' +
              '4c23852a3f1ea5fc',
          ),
          expiration: new BigNumber('1609459200000000000'),
        },
        signature: blobFromHex(
          '9c98f9ffe903f70823823b1d8d0b4b4c3a1c445565628118410bcd8a684b5c101caf520c94d6f9a620d2b49b1993a8f427d0f8a260bd44a94dc1ea52175f8d07',
        ),
      },
    ],
    sender_pubkey: blobFromHex(
      '302a300506032b65700321003b6a27bcceb6a42d62a3a8d02a6f0d73653215771de243a63ac048a18b59da29',
    ),
  };

  expect(aToC).toEqual(golden);
});
