import { DerEncodedPublicKey, KeyPair, PublicKey, Signature, SignIdentity } from '@dfinity/agent';
import * as tweetnacl from 'tweetnacl';
import { fromHexString, toHexString } from '../buffer';
import { SECP256K1_OID, unwrapDER, wrapDER } from './der';

export class Secp256k1PublicKey implements PublicKey {
  public static from(key: PublicKey): Secp256k1PublicKey {
    return this.fromDer(key.toDer());
  }

  public static fromRaw(rawKey: ArrayBuffer): Secp256k1PublicKey {
    return new Secp256k1PublicKey(rawKey);
  }

  public static fromDer(derKey: DerEncodedPublicKey): Secp256k1PublicKey {
    return new Secp256k1PublicKey(this.derDecode(derKey));
  }
  // The length of Secp256k1 public keys is always 32 bytes plus 1 bit.
  private static RAW_KEY_LENGTH = 33;

  private static derEncode(publicKey: ArrayBuffer): DerEncodedPublicKey {
    return wrapDER(publicKey, SECP256K1_OID).buffer as DerEncodedPublicKey;
  }

  private static derDecode(key: DerEncodedPublicKey): ArrayBuffer {
    const unwrapped = unwrapDER(key, SECP256K1_OID);
    if (unwrapped.length !== this.RAW_KEY_LENGTH) {
      throw new Error(`A secp256k1 public key must be exactly ${this.RAW_KEY_LENGTH} bytes long`);
    }
    return unwrapped;
  }

  private readonly rawKey: ArrayBuffer;
  private readonly derKey: DerEncodedPublicKey;

  // `fromRaw` and `fromDer` should be used for instantiation, not this constructor.
  private constructor(key: ArrayBuffer) {
    this.rawKey = key;
    this.derKey = Secp256k1PublicKey.derEncode(key);
  }

  public toDer(): DerEncodedPublicKey {
    return this.derKey;
  }

  public toRaw(): ArrayBuffer {
    return this.rawKey;
  }
}

export class Secp256k1KeyIdentity extends SignIdentity {}

type PublicKeyHex = string;
type SecretKeyHex = string;

export type JsonnableSecp256k1KeyIdentity = [PublicKeyHex, SecretKeyHex];
