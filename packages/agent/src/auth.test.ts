import { Buffer } from 'buffer/';
import { derEncodeED25519PublicKey, SenderDerPubKey, SenderPubKey } from './auth';
import { blobFromHex } from './types';

test('DER encoding of ED25519 keys', async () => {
  const testVectors: Array<[string, string]> = [
    [
      'B3997656BA51FF6DA37B61D8D549EC80717266ECF48FB5DA52B654412634844C',
      '302A300506032B6570032100B3997656BA51FF6DA37B61D8D549EC80717266ECF48FB5DA52B654412634844C',
    ],
    [
      'A5AFB5FEB6DFB6DDF5DD6563856FFF5484F5FE304391D9ED06697861F220C610',
      '302A300506032B6570032100A5AFB5FEB6DFB6DDF5DD6563856FFF5484F5FE304391D9ED06697861F220C610',
    ],
    [
      'C8413108F121CB794A10804D15F613E40ECC7C78A4EC567040DDF78467C71DFF',
      '302A300506032B6570032100C8413108F121CB794A10804D15F613E40ECC7C78A4EC567040DDF78467C71DFF',
    ],
  ];

  testVectors.forEach(([rawPublicKeyHex, derEncodedPublicKeyHex], i) => {
    const publicKey = blobFromHex(rawPublicKeyHex) as SenderPubKey;
    const expectedDerPublicKey = blobFromHex(derEncodedPublicKeyHex) as SenderDerPubKey;
    expect(derEncodeED25519PublicKey(publicKey)).toEqual(expectedDerPublicKey);
  });
});

test('DER encoding of invalid keys', async () => {
  expect(() => {
    derEncodeED25519PublicKey(Buffer.alloc(31, 0) as SenderPubKey);
  }).toThrow();
  expect(() => {
    derEncodeED25519PublicKey(Buffer.alloc(33, 0) as SenderPubKey);
  }).toThrow();
});
