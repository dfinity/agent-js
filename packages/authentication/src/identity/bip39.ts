import { BinaryBlob, blobFromHex, blobFromUint32Array } from '@dfinity/agent';
import * as bip39 from 'bip39';
import { Ed25519KeyIdentity } from './ed25519';

export function bip39MnemonicToEntropy(mnemonic: string, wordlist?: string[]): BinaryBlob {
  return blobFromHex(bip39.mnemonicToEntropy(mnemonic, wordlist));
}

export function bip39EntropyToMnemonic(seed: BinaryBlob): string {
  if (seed.byteLength !== 32) {
    throw new Error('Entropy for BIP-39 must be 32 bytes');
  }

  return bip39.entropyToMnemonic(seed.toString('hex'));
}

export function bip39GenerateMnemonic(): string {
  const entropy = new Uint32Array(32);
  crypto.getRandomValues(entropy);
  return bip39EntropyToMnemonic(blobFromUint32Array(entropy));
}

export class Bip39Ed25519KeyIdentity extends Ed25519KeyIdentity {
  public static generate(): Bip39Ed25519KeyIdentity {
    return this.fromBip39Mnemonic(bip39GenerateMnemonic());
  }

  public static fromBip39Mnemonic(mnemonic: string, wordlist?: string[]): Bip39Ed25519KeyIdentity {
    return new this(bip39MnemonicToEntropy(mnemonic, wordlist));
  }

  protected _entropy: BinaryBlob;

  protected constructor(entropy: BinaryBlob) {
    const keyPair = Ed25519KeyIdentity.generate(entropy).getKeyPair();

    super(keyPair.publicKey, keyPair.secretKey);
    this._entropy = entropy;
  }

  public getBip39Mnemonic(): string {
    return bip39EntropyToMnemonic(this._entropy);
  }
}
