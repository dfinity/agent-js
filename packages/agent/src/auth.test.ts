import { Buffer } from 'buffer/';
import { Ed25519PublicKey, deriveEd25519KeyPairFromSeed, bip39GenerateMnemonic, bip39EntropyToMnemonic, bip39MnemonicToEntropy } from './auth';
import { BinaryBlob, blobFromHex } from './types';

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
    Ed25519PublicKey.fromRaw(Buffer.alloc(31, 0) as BinaryBlob).toDer();
  }).toThrow();
  expect(() => {
    Ed25519PublicKey.fromRaw(Buffer.alloc(33, 0) as BinaryBlob).toDer();
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

// Test vectors consist of [hex seed, private key, public key], taken from https://github.com/satoshilabs/slips/blob/master/slip-0010.md
const testVectorsSLIP10: Array<[string, string, string]> = [
  [
    '000102030405060708090a0b0c0d0e0f',
    '2b4be7f19ee27bbf30c667b642d5f4aa69fd169872f8fc3059c08ebae2eb19e7',
    '00a4b2856bfec510abab89753fac1ac0e1112364e7d250545963f135f2a33188ed',
  ],
  [
    'fffcf9f6f3f0edeae7e4e1dedbd8d5d2cfccc9c6c3c0bdbab7b4b1aeaba8a5a29f9c999693908d8a8784817e7b7875726f6c696663605d5a5754514e4b484542',
    '171cb88b1b3c1db25add599712e36245d75bc65a1a5c9e18d76f9f2b1eab4012',
    '008fe9693f8fa62a4305a140b9764c5ee01e455963744fe18204b4fb948249308a',
  ],
]

test('derive Ed25519 via SLIP 0010', async () => {
  testVectorsSLIP10.forEach(([seed, privateKey, publicKey], i) => {
    const expectedPrivateKey = blobFromHex(privateKey);
    // The SLIP 0010 test vectors contain a leading 0-byte for now obvious reason, the remainder makes sense
    const expectedPublicKey = blobFromHex(publicKey).slice(1, 33);
    deriveEd25519KeyPairFromSeed(blobFromHex(seed)).then((keyPair) => {
      // TweetNacl appends the public key to the private key, we only want the raw private key which is 32 bytes.
      expect(keyPair.secretKey.slice(0, 32)).toEqual(expectedPrivateKey);
      expect(keyPair.publicKey.toRaw()).toEqual(expectedPublicKey);
    }).catch(reason => console.log(reason));
  })
});

// Test vectors for BIP-39 [entropy, mnemonic]
// Generated using https://coinomi.github.io/tools/bip39/
const testVectorsBip39: Array<[string, string]> = [
  [
    'c626e2351db4af5d707f8601f087a5bf27ef6583c21261843bb04c1dc82e8c11',
    'shiver damage minute derive enough push sea valid acid loud truly layer leave ready audit drastic ghost canyon ugly oblige symptom blanket core child',
  ],
  [
    'b1050fedfaea6ad9ae9e69b90a533c343847bbdde980c4ac384c04574efd02e2',
    'rain chronic window volume pluck holiday risk snake ribbon family someone half love target jeans copy seven gift basic anger insane leader argue file'
  ]
]; 

test('BIP-39: Converting from entropy to mnemonic and vice versa', async () => {
  testVectorsBip39.forEach(([entropy, mnemonic], i) => {
    expect(bip39MnemonicToEntropy(mnemonic).toString('hex')).toEqual(entropy);
    expect(bip39EntropyToMnemonic(blobFromHex(entropy))).toEqual(mnemonic);
  });
});

test('BIP-39: Invalid inputs', async () => {
  testVectorsBip39.forEach(([entropy, mnemonic], i) => {
    expect(() => {
      // entropy too short
      bip39EntropyToMnemonic(blobFromHex('c626e2351db4af5d707f8601f087a5bf27ef6583c21261843bb04c1dc82e8c'))
    }).toThrow();

    expect(() => {
      // entropy too long
      bip39EntropyToMnemonic(blobFromHex('c626e2351db4af5d707f8601f087a5bf27ef6583c21261843bb04c1dc82e8c0000'))
    }).toThrow();
  });
});


test('BIP-39: Generate mnemonic', async () => {
  // Generate a randmon mnemonic, then convert it to entropy.
  // The conversion should succeed and result in an entropy 32 bytes in length.
  expect(bip39MnemonicToEntropy(bip39GenerateMnemonic()).length).toEqual(32)
});
