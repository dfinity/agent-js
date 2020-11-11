import { blobFromHex, blobFromUint8Array } from '@dfinity/agent';
import { Ed25519PublicKey } from './ed25519';

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

test('DER encoding of ED25519 keys', async () => {
  testVectors.forEach(([rawPublicKeyHex, derEncodedPublicKeyHex], i) => {
    const publicKey = Ed25519PublicKey.fromRaw(blobFromHex(rawPublicKeyHex));
    const expectedDerPublicKey = blobFromHex(derEncodedPublicKeyHex);
    expect(publicKey.toDer()).toEqual(expectedDerPublicKey);
  });
});

test('DER decoding of ED25519 keys', async () => {
  testVectors.forEach(([rawPublicKeyHex, derEncodedPublicKeyHex], i) => {
    const derPublicKey = blobFromHex(derEncodedPublicKeyHex);
    const expectedPublicKey = blobFromHex(rawPublicKeyHex);
    expect(Ed25519PublicKey.fromDer(derPublicKey).toRaw()).toEqual(expectedPublicKey);
  });
});

test('DER encoding of invalid keys', async () => {
  expect(() => {
    Ed25519PublicKey.fromRaw(blobFromUint8Array(Buffer.alloc(31, 0))).toDer();
  }).toThrow();
  expect(() => {
    Ed25519PublicKey.fromRaw(blobFromUint8Array(Buffer.alloc(31, 0))).toDer();
  }).toThrow();
});

test('DER decoding of invalid keys', async () => {
  // Too short.
  expect(() => {
    Ed25519PublicKey.fromDer(
      blobFromHex(
        '302A300506032B6570032100B3997656BA51FF6DA37B61D8D549EC80717266ECF48FB5DA52B65441263484',
      ),
    );
  }).toThrow();
  // Too long.
  expect(() => {
    Ed25519PublicKey.fromDer(
      blobFromHex(
        '302A300506032B6570032100B3997656BA51FF6DA37B61D8D549EC8071726' +
          '6ECF48FB5DA52B654412634844C00',
      ),
    );
  }).toThrow();

  // Invalid DER-encoding.
  expect(() => {
    Ed25519PublicKey.fromDer(
      blobFromHex(
        '002A300506032B6570032100B3997656BA51FF6DA37B61D8D549EC80717266ECF48FB5DA52B654412634844C',
      ),
    );
  }).toThrow();
});
