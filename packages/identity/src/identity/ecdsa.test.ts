import { DerEncodedPublicKey, PublicKey } from '@dfinity/agent';
import { toHexString } from '@dfinity/candid/lib/cjs/utils/buffer';
import { randomBytes } from 'crypto';
import { sha256 } from 'js-sha256';
import { EcdsaKeyIdentity, EcdsaPublicKey } from './ecdsa';

function fromHexString(hexString: string): ArrayBuffer {
  return new Uint8Array((hexString.match(/.{1,2}/g) ?? []).map(byte => parseInt(byte, 16))).buffer;
}

// DER KEY SECP256K1 PREFIX = 3056301006072a8648ce3d020106052b8104000a03420004
// These test vectors contain the hex encoding of the corresponding raw and DER versions
// of ecdsa keys that were generated using OpenSSL as follows:
// openssl ecparam -name ecdsa -genkey -noout -out private.ec.key
// openssl ec -in private.ec.key -pubout -outform DER -out ecpubkey.der
// hexdump -ve '1/1 "%.2x"' ecpubkey.der
const testVectors: Array<[string, string]> = [
  [
    '0401ec030acd7d1199f73ae3469329c114944e0693c89502f850bcc6bad397a5956767c79b410c29ac6f587eec84878020fdb54ba002a79b02aa153fe47b6ffd33',
    '3056301006072a8648ce3d020106052b8104000a0342000401ec030acd7d1199f73ae3469329c114944e0693c89502f850bcc6bad397a5956767c79b410c29ac6f587eec84878020fdb54ba002a79b02aa153fe47b6ffd33',
  ],
  [
    '04eb3cbc81bdfa1d13c410151308b4ac65cc328620e368fe5302e2cf2cb7175132999dc2afff871a68afd66d76dd9c7c3911748e8e54ee2fb71df1a97bb4811c8c',
    '3056301006072a8648ce3d020106052b8104000a03420004eb3cbc81bdfa1d13c410151308b4ac65cc328620e368fe5302e2cf2cb7175132999dc2afff871a68afd66d76dd9c7c3911748e8e54ee2fb71df1a97bb4811c8c',
  ],
  [
    '04fdac09ea93a1b9b744b5f19f091ada7978ceb2f045875bca8ef9b75fa8061704e76de023c6a23d77a118c5c8d0f5efaf0dbbfcc3702d5590604717f639f6f00d',
    '3056301006072a8648ce3d020106052b8104000a03420004fdac09ea93a1b9b744b5f19f091ada7978ceb2f045875bca8ef9b75fa8061704e76de023c6a23d77a118c5c8d0f5efaf0dbbfcc3702d5590604717f639f6f00d',
  ],
];

// Generated by Uint8Array(randomBytes(32)), should not change
const goldenSeed = '8caa0410fa5955c05d6877801806f627e5dd313957a59c70f8d8ef252a482fb2';

describe('EcdsaPublicKey Tests', () => {
  test('create from an existing public key', () => {
    // testVectors.forEach(([rawPublicKeyHex]) => {
    //   const publicKey: PublicKey = EcdsaPublicKey.fromRaw(fromHexString(rawPublicKeyHex));
    //   const newKey = EcdsaPublicKey.from(publicKey);
    //   expect(newKey).toMatchSnapshot();
    // });
  });

  test('DER encoding of SECP256K1 keys', async () => {
    // testVectors.forEach(([rawPublicKeyHex, derEncodedPublicKeyHex]) => {
    //   const publicKey = EcdsaPublicKey.fromRaw(fromHexString(rawPublicKeyHex));
    //   const expectedDerPublicKey = fromHexString(derEncodedPublicKeyHex);
    //   expect(publicKey.toDer()).toEqual(expectedDerPublicKey);
    // });
  });

  test('DER decoding of invalid keys', async () => {
    //     // Too short.
    //     expect(() => {
    //       EcdsaPublicKey.fromDer(
    //         fromHexString(
    //           '3056301006072a8648ce3d020106052b8104000a0342000401ec030acd7d1199f73ae3469329c114944e0693c89502f850bcc6bad397a5956767c79b410c29ac6f587eec84878020fdb54ba002a79b02aa153fe47b6',
    //         ) as DerEncodedPublicKey,
    //       );
    //     }).toThrowError('DER payload mismatch: Expected length 65 actual length 63');
    //     // Too long.
    //     expect(() => {
    //       EcdsaPublicKey.fromDer(
    //         fromHexString(
    //           '3056301006072a8648ce3d020106052b8104000a0342000401ec030acd7d1199f73ae3469329c114944e0693c89502f850bcc6bad397a5956767c79b410c29ac6f587eec84878020fdb54ba002a79b02aa153fe47b6ffd33' +
    //             '1b42211ce',
    //         ) as DerEncodedPublicKey,
    //       );
    //     }).toThrowError('DER payload mismatch: Expected length 65 actual length 70');
    //     // Invalid DER-encoding.
    //     expect(() => {
    //       EcdsaPublicKey.fromDer(
    //         fromHexString(
    //           '0693c89502f850bcc6bad397a5956767c79b410c29ac6f54fdac09ea93a1b9b744b5f19f091ada7978ceb2f045875bca8ef9b75fa8061704e76de023c6a23d77a118c5c8d0f5efaf0dbbfcc3702d5590604717f639f6f00d',
    //         ) as DerEncodedPublicKey,
    //       );
    //     }).toThrowError('Expected: sequence');
  });
});

describe('EcdsaKeyIdentity Tests', () => {
  test('can encode and decode to/from JSON', () => {
    // const identity = EcdsaKeyIdentity.generate();
    // const json = JSON.stringify(identity);
    // const identity2 = EcdsaKeyIdentity.fromJSON(json);
    // expect(new Uint8Array(identity.getPublicKey().toDer())).toEqual(
    //   new Uint8Array(identity2.getPublicKey().toDer()),
    // );
  });

  test('fromJSON rejects if JSON does not have at least two items', () => {
    // const identity = EcdsaKeyIdentity.generate();
    // const [privateKey] = identity.toJSON();
    // const json = JSON.stringify([privateKey]);
    // const shouldFail = () => {
    //   return EcdsaKeyIdentity.fromJSON(json);
    // };
    // expect(shouldFail).toThrowError('Deserialization error: JSON must have at least 2 items.');
  });

  test('fromJSON rejects if supplied is not an array', () => {
    // const json = JSON.stringify({ key: 'value' });
    // const shouldFail = () => {
    //   return EcdsaKeyIdentity.fromJSON(json);
    // };
    // expect(shouldFail).toThrowError('Deserialization error: Invalid JSON type for string');
  });

  test('fromSecretKey should generate an identity', () => {
    // const identity = EcdsaKeyIdentity.generate();
    // const { secretKey } = identity.getKeyPair();
    // const identity2 = EcdsaKeyIdentity.fromSecretKey(secretKey);
    // expect(new Uint8Array(identity.getPublicKey().toDer())).toEqual(
    //   new Uint8Array(identity2.getPublicKey().toDer()),
    // );
  });

  test('generation from a seed should be supported', () => {
    // const seed = new Uint8Array(fromHexString(goldenSeed));
    // const identity = EcdsaKeyIdentity.generate(seed);
    // const publicKey = identity.getKeyPair().publicKey as EcdsaPublicKey;
    // publicKey.toRaw();
    // expect(toHexString(publicKey.toRaw())).toEqual(
    //   '04e2abe3b762fe0553f690d25f5100259b7eaeb3e476df6bd3dfc1d27e5dae56dad5a84f70bd87acc95ad54af0285f28c2be1e3b2f62a28a2fbad9fe44c84dc904',
    // );
  });

  test('generation from seed rejects if the length is invalid', () => {
    // const invalidSeed = new Uint8Array(randomBytes(64));
    // const shouldFail = () => EcdsaKeyIdentity.generate(invalidSeed);
    // expect(shouldFail).toThrowError('Ecdsa Seed needs');
  });

  test('fromSecretKey throws if bytelength is off', () => {
    // const shouldFail = () => {
    //   const identity = EcdsaKeyIdentity.generate();
    //   const { secretKey } = identity.getKeyPair();
    //   const shortArray = new Uint8Array(secretKey).subarray(1, 32);
    //   EcdsaKeyIdentity.fromSecretKey(Uint8Array.from(shortArray).subarray(1, 32));
    // };
    // expect(shouldFail).toThrowError('Expected private key to be an Uint8Array with length 32');
  });

  test('getKeyPair should return a copy of the key pair', () => {
    // const identity = EcdsaKeyIdentity.generate();
    // const keyPair = identity.getKeyPair();
    // expect(keyPair.publicKey).toBeTruthy();
    // expect(keyPair.secretKey).toBeTruthy();
  });

  test('message signature is valid', async () => {
    //     const identity = EcdsaKeyIdentity.generate();
    //     const rawPublicKey = identity.getPublicKey().toRaw();
    //     const message = 'Hello world. Ecdsa test here';
    //     const challenge = new TextEncoder().encode(message);
    //     const signature = await identity.sign(challenge);
    //     const hash = sha256.create();
    //     hash.update(challenge);
    //     const isValid = Ecdsa.ecdsaVerify(
    //       new Uint8Array(signature),
    //       new Uint8Array(hash.digest()),
    //       new Uint8Array(rawPublicKey),
    //     );
    //     expect(isValid).toBe(true);
  });
});
