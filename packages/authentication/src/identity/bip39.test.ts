import { blobFromHex } from '@dfinity/agent';
import {
  Bip39Ed25519KeyIdentity,
  bip39EntropyToMnemonic,
  bip39GenerateMnemonic,
  bip39MnemonicToEntropy,
} from './bip39';

// Test vectors for BIP-39 [entropy, mnemonic]
// Generated using https://coinomi.github.io/tools/bip39/
const testVectorsBip39: Array<[string, string]> = [
  [
    'c626e2351db4af5d707f8601f087a5bf27ef6583c21261843bb04c1dc82e8c11',
    'shiver damage minute derive enough push sea valid acid loud truly layer ' +
      'leave ready audit drastic ghost canyon ugly oblige symptom blanket core child',
  ],
  [
    'b1050fedfaea6ad9ae9e69b90a533c343847bbdde980c4ac384c04574efd02e2',
    'rain chronic window volume pluck holiday risk snake ribbon family someone ' +
      'half love target jeans copy seven gift basic anger insane leader argue file',
  ],
];

test('BIP-39: Converting from entropy to mnemonic and vice versa', async () => {
  testVectorsBip39.forEach(([entropy, mnemonic]) => {
    expect(bip39MnemonicToEntropy(mnemonic).toString('hex')).toEqual(entropy);
    expect(bip39EntropyToMnemonic(blobFromHex(entropy))).toEqual(mnemonic);
  });
});

test('BIP-39 Identity works', async () => {
  for (const [entropy, mnemonic] of testVectorsBip39) {
    const id = Bip39Ed25519KeyIdentity.fromBip39Mnemonic(mnemonic);
    expect(id.getBip39Mnemonic()).toEqual(mnemonic);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((id as any)._entropy.toString('hex')).toEqual(entropy);
  }
});

test('BIP-39: Invalid inputs', async () => {
  testVectorsBip39.forEach(() => {
    expect(() => {
      // entropy too short
      bip39EntropyToMnemonic(
        blobFromHex('c626e2351db4af5d707f8601f087a5bf27ef6583c21261843bb04c1dc82e8c'),
      );
    }).toThrow();

    expect(() => {
      // entropy too long
      bip39EntropyToMnemonic(
        blobFromHex('c626e2351db4af5d707f8601f087a5bf27ef6583c21261843bb04c1dc82e8c0000'),
      );
    }).toThrow();
  });
});

test('BIP-39: Generate mnemonic', async () => {
  // Generate a randmon mnemonic, then convert it to entropy.
  // The conversion should succeed and result in an entropy 32 bytes in length.
  expect(bip39MnemonicToEntropy(bip39GenerateMnemonic()).length).toEqual(32);
});
