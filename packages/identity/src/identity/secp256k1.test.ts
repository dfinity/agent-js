import { DerEncodedPublicKey, PublicKey } from '@dfinity/agent';
import { fromHexString, toHexString } from '../buffer';
import { Secp256k1KeyIdentity, Secp256k1PublicKey } from './secp256k1';

import { randomBytes } from 'crypto';
import secp256k1 from 'secp256k1/elliptic';

const generateRandPubKey = () => {
  let privKey;
  do {
    privKey = Uint8Array.from(randomBytes(32));
  } while (!secp256k1.privateKeyVerify(privKey));

  privKey; //?

  const pubKey = secp256k1.publicKeyCreate(privKey); //?

  toHexString(pubKey).toUpperCase(); //?

  pubKey.length; //?
};

// ED25519 tests for reference

// test('DER encoding of ED25519 keys', async () => {
//   testVectors.forEach(([rawPublicKeyHex, derEncodedPublicKeyHex]) => {
//     const publicKey = Secp256k1PublicKey.fromRaw(fromHexString(rawPublicKeyHex));
//     const expectedDerPublicKey = fromHexString(derEncodedPublicKeyHex);
//     expect(publicKey.toDer()).toEqual(expectedDerPublicKey);
//   });
// });

// test('DER decoding of ED25519 keys', async () => {
//   testVectors.forEach(([rawPublicKeyHex, derEncodedPublicKeyHex]) => {
//     const derPublicKey = fromHexString(derEncodedPublicKeyHex) as DerEncodedPublicKey;
//     const expectedPublicKey = fromHexString(rawPublicKeyHex);
//     expect(new Uint8Array(Secp256k1PublicKey.fromDer(derPublicKey).toRaw())).toEqual(
//       new Uint8Array(expectedPublicKey),
//     );
//   });
// });

// test('DER decoding of invalid keys', async () => {
//   // Too short.
//   expect(() => {
//     Secp256k1PublicKey.fromDer(
//       fromHexString(
//         '302A300506032B6570032100B3997656BA51FF6DA37B61D8D549EC80717266ECF48FB5DA52B65441263484',
//       ) as DerEncodedPublicKey,
//     );
//   }).toThrow();
//   // Too long.
//   expect(() => {
//     Secp256k1PublicKey.fromDer(
//       fromHexString(
//         '302A300506032B6570032100B3997656BA51FF6DA37B61D8D549EC8071726' +
//           '6ECF48FB5DA52B654412634844C00',
//       ) as DerEncodedPublicKey,
//     );
//   }).toThrow();

//   // Invalid DER-encoding.
//   expect(() => {
//     Secp256k1PublicKey.fromDer(
//       fromHexString(
//         '002A300506032B6570032100B3997656BA51FF6DA37B61D8D549EC80717266ECF48FB5DA52B654412634844C',
//       ) as DerEncodedPublicKey,
//     );
//   }).toThrow();
// });

// test('fails with improper seed', () => {
//   expect(() => Secp256k1KeyIdentity.generate(new Uint8Array(new Array(31).fill(0)))).toThrow();
//   expect(() => Secp256k1KeyIdentity.generate(new Uint8Array(new Array(33).fill(0)))).toThrow();
// });

// test('can encode and decode to/from JSON', async () => {
//   const seed = new Array(32).fill(0);
//   const key = Secp256k1KeyIdentity.generate(new Uint8Array(seed));

//   const json = JSON.stringify(key);
//   const key2 = Secp256k1KeyIdentity.fromJSON(json);

//   expect(new Uint8Array(key.getPublicKey().toDer())).toEqual(
//     new Uint8Array(key2.getPublicKey().toDer()),
//   );
// });
