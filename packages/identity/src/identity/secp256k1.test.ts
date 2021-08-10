import { DerEncodedBlob } from '@dfinity/agent';
import { blobFromHex, blobFromUint8Array, blobToUint8Array } from '@dfinity/candid';
import { randomBytes } from 'crypto';
import { sha256 } from 'js-sha256';
import Secp256k1 from 'secp256k1';
import { Secp256k1KeyIdentity, Secp256k1PublicKey } from './secp256k1';

function fromHexString(hexString: string): ArrayBuffer {
  return new Uint8Array((hexString.match(/.{1,2}/g) ?? []).map(byte => parseInt(byte, 16))).buffer;
}

// DER KEY SECP256K1 PREFIX = 3056301006072a8648ce3d020106052b8104000a03420004
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

test('DER encoding of SECP256K1 keys', async () => {
  testVectors.forEach(([rawPublicKeyHex, derEncodedPublicKeyHex]) => {
    const publicKey = Secp256k1PublicKey.fromRaw(blobFromHex(rawPublicKeyHex));
    const expectedDerPublicKey = fromHexString(derEncodedPublicKeyHex);
    expect(publicKey.toDer().buffer).toEqual(expectedDerPublicKey);
  });
});

test('DER decoding of SECP256K1 keys', async () => {
  testVectors.forEach(([rawPublicKeyHex, derEncodedPublicKeyHex]) => {
    const derPublicKey = blobFromHex(derEncodedPublicKeyHex);
    const expectedPublicKey = fromHexString(rawPublicKeyHex);
    expect(new Uint8Array(Secp256k1PublicKey.fromDer(derPublicKey).toRaw())).toEqual(
      new Uint8Array(expectedPublicKey),
    );
  });
});

test('DER decoding of invalid keys', async () => {
  // Too short.
  expect(() => {
    Secp256k1PublicKey.fromDer(
      fromHexString(
        '3056301006072a8648ce3d020106052b8104000a0342000401ec030acd7d1199f73ae3469329c114944e0693c89502f850bcc6bad397a5956767c79b410c29ac6f587eec84878020fdb54ba002a79b02aa153fe47b6',
      ) as DerEncodedBlob,
    );
  }).toThrow();
  // Too long.
  expect(() => {
    Secp256k1PublicKey.fromDer(
      fromHexString(
        '3056301006072a8648ce3d020106052b8104000a0342000401ec030acd7d1199f73ae3469329c114944e0693c89502f850bcc6bad397a5956767c79b410c29ac6f587eec84878020fdb54ba002a79b02aa153fe47b6ffd33' +
          '1b42211ce',
      ) as DerEncodedBlob,
    );
  }).toThrow();

  // Invalid DER-encoding.
  expect(() => {
    Secp256k1PublicKey.fromDer(
      fromHexString(
        '0693c89502f850bcc6bad397a5956767c79b410c29ac6f54fdac09ea93a1b9b744b5f19f091ada7978ceb2f045875bca8ef9b75fa8061704e76de023c6a23d77a118c5c8d0f5efaf0dbbfcc3702d5590604717f639f6f00d',
      ) as DerEncodedBlob,
    );
  }).toThrow();
});

test('fails with improper seed', () => {
  expect(() => Secp256k1KeyIdentity.generate(new Uint8Array(new Array(31).fill(0)))).toThrow();
  expect(() => Secp256k1KeyIdentity.generate(new Uint8Array(new Array(33).fill(0)))).toThrow();
});

test('same seed generates same identity', () => {
  const seed = randomBytes(32);
  const id = Secp256k1KeyIdentity.generate(seed);
  const id2 = Secp256k1KeyIdentity.generate(seed);
  expect(new Uint8Array(id.getPublicKey().toDer())).toEqual(
    new Uint8Array(id2.getPublicKey().toDer()),
  );
});

test('can encode and decode to/from JSON', () => {
  const key = Secp256k1KeyIdentity.generate();
  const json = JSON.stringify(key);
  const key2 = Secp256k1KeyIdentity.fromJSON(json);

  expect(new Uint8Array(key.getPublicKey().toDer())).toEqual(
    new Uint8Array(key2.getPublicKey().toDer()),
  );
});

test('message signature is valid', async () => {
  const identity = Secp256k1KeyIdentity.generate();
  const rawPublicKey = identity.getPublicKey().toRaw();
  const message = 'Hello world. Secp256k1 test here';
  const challenge = new TextEncoder().encode(message);
  const signature = await identity.sign(blobFromUint8Array(challenge));
  const hash = sha256.create();
  hash.update(challenge);
  const isValid = Secp256k1.ecdsaVerify(
    blobToUint8Array(signature),
    new Uint8Array(hash.digest()),
    rawPublicKey,
  );
  expect(isValid).toBe(true);
});
