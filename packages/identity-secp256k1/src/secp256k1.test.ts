import { DerEncodedPublicKey, PublicKey } from '@dfinity/agent';
import { randomBytes } from 'crypto';
import { sha256 } from '@noble/hashes/sha2';
import { secp256k1 } from '@noble/curves/secp256k1';
import { Secp256k1KeyIdentity, Secp256k1PublicKey } from './secp256k1';
import { hexToBytes, bytesToHex } from '@noble/curves/abstract/utils';

// DER KEY SECP256K1 PREFIX = 3056301006072a8648ce3d020106052b8104000a03420004
// These test vectors contain the hex encoding of the corresponding raw and DER versions
// of secp256k1 keys that were generated using OpenSSL as follows:
// openssl ecparam -name secp256k1 -genkey -noout -out private.ec.key
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

// Used for testing, agreed upon with dfx
const goldenSeedPhrase =
  'early cinnamon crucial teach mobile just toast real rebel around card priority spike aerobic result account marble hero action intact inside elbow wrestle oval';

// Generated by Uint8Array(randomBytes(32)), should not change
const goldenSeed = '8caa0410fa5955c05d6877801806f627e5dd313957a59c70f8d8ef252a482fb2';

describe('Secp256k1PublicKey Tests', () => {
  test('create from an existing public key', () => {
    testVectors.forEach(([rawPublicKeyHex]) => {
      const publicKey: PublicKey = Secp256k1PublicKey.fromRaw(hexToBytes(rawPublicKeyHex));

      const newKey = Secp256k1PublicKey.from(publicKey);
      expect(newKey).toMatchSnapshot();
    });
  });

  test('DER encoding of SECP256K1 keys', async () => {
    testVectors.forEach(([rawPublicKeyHex, derEncodedPublicKeyHex]) => {
      const publicKey = Secp256k1PublicKey.fromRaw(hexToBytes(rawPublicKeyHex));
      const expectedDerPublicKey = hexToBytes(derEncodedPublicKeyHex);
      expect(publicKey.toDer().toString()).toEqual(expectedDerPublicKey.toString());
    });
  });

  // we have to keep this function because the hex strings are do not have a valid padding,
  // and we cannot use `hexToBytes` from `@noble/hashes/utils`
  function fromHex(hex: string): Uint8Array {
    const hexRe = new RegExp(/^[0-9a-fA-F]+$/);
    if (!hexRe.test(hex)) {
      throw new Error('Invalid hexadecimal string.');
    }
    const buffer = [...hex]
      .reduce((acc, curr, i) => {
        acc[(i / 2) | 0] = (acc[(i / 2) | 0] || '') + curr;
        return acc;
      }, [] as string[])
      .map(x => Number.parseInt(x, 16));

    return new Uint8Array(buffer);
  }

  test('DER decoding of invalid keys', async () => {
    // Too short.
    expect(() => {
      Secp256k1PublicKey.fromDer(
        fromHex(
          '3056301006072a8648ce3d020106052b8104000a0342000401ec030acd7d1199f73ae3469329c114944e0693c89502f850bcc6bad397a5956767c79b410c29ac6f587eec84878020fdb54ba002a79b02aa153fe47b6',
        ) as DerEncodedPublicKey,
      );
    }).toThrow('DER payload mismatch: Expected length 65 actual length 63');
    // Too long.
    expect(() => {
      Secp256k1PublicKey.fromDer(
        fromHex(
          '3056301006072a8648ce3d020106052b8104000a0342000401ec030acd7d1199f73ae3469329c114944e0693c89502f850bcc6bad397a5956767c79b410c29ac6f587eec84878020fdb54ba002a79b02aa153fe47b6ffd33' +
            '1b42211ce',
        ) as DerEncodedPublicKey,
      );
    }).toThrow('DER payload mismatch: Expected length 65 actual length 70');

    // Invalid DER-encoding.
    expect(() => {
      Secp256k1PublicKey.fromDer(
        hexToBytes(
          '0693c89502f850bcc6bad397a5956767c79b410c29ac6f54fdac09ea93a1b9b744b5f19f091ada7978ceb2f045875bca8ef9b75fa8061704e76de023c6a23d77a118c5c8d0f5efaf0dbbfcc3702d5590604717f639f6f00d',
        ) as DerEncodedPublicKey,
      );
    }).toThrow('Expected: sequence');
  });
});

describe('Secp256k1KeyIdentity Tests', () => {
  test('can encode and decode to/from JSON', () => {
    const identity = Secp256k1KeyIdentity.generate();
    const json = JSON.stringify(identity);

    const identity2 = Secp256k1KeyIdentity.fromJSON(json);

    expect(new Uint8Array(identity.getPublicKey().toDer())).toEqual(
      new Uint8Array(identity2.getPublicKey().toDer()),
    );
  });

  test('fromJSON rejects if JSON does not have at least two items', () => {
    const identity = Secp256k1KeyIdentity.generate();
    const [privateKey] = identity.toJSON();
    const json = JSON.stringify([privateKey]);

    const shouldFail = () => {
      return Secp256k1KeyIdentity.fromJSON(json);
    };

    expect(shouldFail).toThrow('Deserialization error: JSON must have at least 2 items.');
  });

  test('fromJSON rejects if supplied is not an array', () => {
    const json = JSON.stringify({ key: 'value' });

    const shouldFail = () => {
      return Secp256k1KeyIdentity.fromJSON(json);
    };

    expect(shouldFail).toThrow('Deserialization error: Invalid JSON type for string');
  });

  test('fromSecretKey should generate an identity', () => {
    const identity = Secp256k1KeyIdentity.generate();
    const { secretKey } = identity.getKeyPair();

    const identity2 = Secp256k1KeyIdentity.fromSecretKey(secretKey);

    expect(new Uint8Array(identity.getPublicKey().toDer())).toEqual(
      new Uint8Array(identity2.getPublicKey().toDer()),
    );
  });

  test('generation from a seed should be supported', () => {
    const seed = new Uint8Array(hexToBytes(goldenSeed));
    const identity = Secp256k1KeyIdentity.generate(seed);
    const publicKey = identity.getKeyPair().publicKey as Secp256k1PublicKey;
    publicKey.toRaw();
    expect(bytesToHex(publicKey.toRaw())).toEqual(
      '04e2abe3b762fe0553f690d25f5100259b7eaeb3e476df6bd3dfc1d27e5dae56dad5a84f70bd87acc95ad54af0285f28c2be1e3b2f62a28a2fbad9fe44c84dc904',
    );
  });

  test('generation from seed rejects if the length is invalid', () => {
    const invalidSeed = new Uint8Array(randomBytes(64));
    const shouldFail = () => Secp256k1KeyIdentity.generate(invalidSeed);
    expect(shouldFail).toThrow('Secp256k1 Seed needs');
  });

  test('generation from a seed phrase', () => {
    const identity = Secp256k1KeyIdentity.fromSeedPhrase(goldenSeedPhrase);
    expect(identity.getPrincipal().toText()).toBe(
      'bh66w-ffyze-maien-ejjje-wzhqi-crrjo-rcgs7-twjrh-kf2km-hbtia-eae',
    );

    // Test from array
    const identity2 = Secp256k1KeyIdentity.fromSeedPhrase(goldenSeedPhrase.split(' '));
    expect(identity2.getPrincipal().toText()).toBe(
      'bh66w-ffyze-maien-ejjje-wzhqi-crrjo-rcgs7-twjrh-kf2km-hbtia-eae',
    );
  });

  test('fromSecretKey throws if bytelength is off', () => {
    const shouldFail = () => {
      const identity = Secp256k1KeyIdentity.generate();
      const { secretKey } = identity.getKeyPair();
      const shortArray = new Uint8Array(secretKey).subarray(1, 32);
      Secp256k1KeyIdentity.fromSecretKey(Uint8Array.from(shortArray).subarray(1, 32));
    };
    expect(shouldFail).toThrow('invalid private key: expected ui8a of size 32, got object'); // this error comes from @noble/curves
  });

  test('getKeyPair should return a copy of the key pair', () => {
    const identity = Secp256k1KeyIdentity.generate();
    const keyPair = identity.getKeyPair();

    expect(keyPair.publicKey).toBeTruthy();
    expect(keyPair.secretKey).toBeTruthy();
  });

  test('message signature is valid', async () => {
    const identity = Secp256k1KeyIdentity.generate();
    const rawPublicKey = identity.getPublicKey().toRaw();

    const message = 'Hello world. Secp256k1 test here';
    const challenge = new TextEncoder().encode(message);
    const signature = await identity.sign(challenge);
    const isValid = secp256k1.verify(signature, sha256(challenge), rawPublicKey);
    expect(isValid).toBe(true);
  });
});

test('fromPem should generate an identity', () => {
  const pem = `-----BEGIN EC PRIVATE KEY-----
  MHQCAQEEIGfKHuyoCCCbEXb0789MIdWiCIpZo1LaKApv95SSIaWPoAcGBSuBBAAK
  oUQDQgAEahC99Avid7r8D6kIeLjjxJ8kwdJRy5nPrN9o18P7xHT95i0JPr5ivc9v
  CB8vG2s97NB0re2MhqvdWgradJZ8Ow==
  -----END EC PRIVATE KEY-----`;
  const identity = Secp256k1KeyIdentity.fromPem(pem);
  expect(identity.getPrincipal().toString()).toStrictEqual(
    '42gbo-uiwfn-oq452-ql6yp-4jsqn-a6bxk-n7l4z-ni7os-yptq6-3htob-vqe',
  );
});

describe('public key serialization from various types', () => {
  it('should serialize from an existing public key', () => {
    const baseKey = Secp256k1KeyIdentity.generate();
    const publicKey: PublicKey = baseKey.getPublicKey();
    const newKey = Secp256k1PublicKey.from(publicKey);
    expect(newKey).toBeDefined();
  });
  it('should serialize from a raw key', () => {
    const baseKey = Secp256k1KeyIdentity.generate();
    const publicKey = baseKey.getPublicKey().rawKey;

    const newKey = Secp256k1PublicKey.from(publicKey);
    expect(newKey).toBeDefined();
  });
  it('should serialize from a DER key', () => {
    const baseKey = Secp256k1KeyIdentity.generate();
    const publicKey = baseKey.getPublicKey().derKey;
    const newKey = Secp256k1PublicKey.from(publicKey);
    expect(newKey).toBeDefined();
  });
  it('should serialize from a Uint8Array', () => {
    const baseKey = Secp256k1KeyIdentity.generate();
    const publicKey = new Uint8Array(baseKey.getPublicKey().toRaw());
    const newKey = Secp256k1PublicKey.from(publicKey);
    expect(newKey).toBeDefined();
  });
  it('should serialize from a hex string', () => {
    const baseKey = Secp256k1KeyIdentity.generate();
    const publicKey = bytesToHex(baseKey.getPublicKey().toRaw());
    const newKey = Secp256k1PublicKey.from(publicKey);
    expect(newKey).toBeDefined();
  });
  it('should fail to parse an invalid key', () => {
    const baseKey = 7;
    const shouldFail = () => Secp256k1PublicKey.from(baseKey as unknown);
    expect(shouldFail).toThrow('Cannot construct Secp256k1PublicKey from the provided key.');

    const shouldFailHex = () => Secp256k1PublicKey.from('not a hex string');
    expect(shouldFailHex).toThrow('hex string expected');
  });

  it('should throw an error serializing a too short seed phrase', () => {
    const shouldFail = () => Secp256k1KeyIdentity.fromSeedPhrase('one two three');
    expect(shouldFail).toThrow('Invalid mnemonic');
  });

  it('should throw an error serializing a too long seed phrase', () => {
    const shouldFail = () =>
      Secp256k1KeyIdentity.fromSeedPhrase(
        'one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen',
      );
    expect(shouldFail).toThrow('Invalid mnemonic');
  });
});
