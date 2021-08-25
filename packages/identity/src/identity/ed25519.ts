import { DerEncodedPublicKey, KeyPair, PublicKey, Signature, SignIdentity } from '@dfinity/agent';
import * as tweetnacl from 'tweetnacl';
import { fromHexString, toHexString } from '../buffer';
import { ED25519_OID, unwrapDER, wrapDER } from './der';

export class Ed25519PublicKey implements PublicKey {
  public static from(key: PublicKey): Ed25519PublicKey {
    return this.fromDer(key.toDer());
  }

  public static fromRaw(rawKey: ArrayBuffer): Ed25519PublicKey {
    return new Ed25519PublicKey(rawKey);
  }

  public static fromDer(derKey: DerEncodedPublicKey): Ed25519PublicKey {
    return new Ed25519PublicKey(this.derDecode(derKey));
  }

  // The length of Ed25519 public keys is always 32 bytes.
  private static RAW_KEY_LENGTH = 32;

  private static derEncode(publicKey: ArrayBuffer): DerEncodedPublicKey {
    return wrapDER(publicKey, ED25519_OID).buffer as DerEncodedPublicKey;
  }

  private static derDecode(key: DerEncodedPublicKey): ArrayBuffer {
    const unwrapped = unwrapDER(key, ED25519_OID);
    if (unwrapped.length !== this.RAW_KEY_LENGTH) {
      throw new Error('An Ed25519 public key must be exactly 32bytes long');
    }
    return unwrapped;
  }

  private readonly rawKey: ArrayBuffer;
  private readonly derKey: DerEncodedPublicKey;

  // `fromRaw` and `fromDer` should be used for instantiation, not this constructor.
  private constructor(key: ArrayBuffer) {
    this.rawKey = key;
    this.derKey = Ed25519PublicKey.derEncode(key);
  }

  public toDer(): DerEncodedPublicKey {
    return this.derKey;
  }

  public toRaw(): ArrayBuffer {
    return this.rawKey;
  }
}

export class Ed25519KeyIdentity extends SignIdentity {
  public static generate(seed?: Uint8Array): Ed25519KeyIdentity {
    if (seed && seed.length !== 32) {
      throw new Error('Ed25519 Seed needs to be 32 bytes long.');
    }

    const { publicKey, secretKey } =
      seed === undefined ? tweetnacl.sign.keyPair() : tweetnacl.sign.keyPair.fromSeed(seed);
    return new this(Ed25519PublicKey.fromRaw(publicKey), secretKey);
  }

  public static fromParsedJson(obj: JsonnableEd25519KeyIdentity): Ed25519KeyIdentity {
    const [publicKeyDer, privateKeyRaw] = obj;
    return new Ed25519KeyIdentity(
      Ed25519PublicKey.fromDer(fromHexString(publicKeyDer) as DerEncodedPublicKey),
      fromHexString(privateKeyRaw),
    );
  }

  public static fromJSON(json: string): Ed25519KeyIdentity {
    const parsed = JSON.parse(json);
    if (Array.isArray(parsed)) {
      if (typeof parsed[0] === 'string' && typeof parsed[1] === 'string') {
        return this.fromParsedJson([parsed[0], parsed[1]]);
      } else {
        throw new Error('Deserialization error: JSON must have at least 2 items.');
      }
    }
    throw new Error(`Deserialization error: Invalid JSON type for string: ${JSON.stringify(json)}`);
  }

  public static fromKeyPair(publicKey: ArrayBuffer, privateKey: ArrayBuffer): Ed25519KeyIdentity {
    return new Ed25519KeyIdentity(Ed25519PublicKey.fromRaw(publicKey), privateKey);
  }

  public static fromSecretKey(secretKey: ArrayBuffer): Ed25519KeyIdentity {
    const keyPair = tweetnacl.sign.keyPair.fromSecretKey(new Uint8Array(secretKey));
    return Ed25519KeyIdentity.fromKeyPair(keyPair.publicKey, keyPair.secretKey);
  }

  protected _publicKey: Ed25519PublicKey;

  // `fromRaw` and `fromDer` should be used for instantiation, not this constructor.
  protected constructor(publicKey: PublicKey, protected _privateKey: ArrayBuffer) {
    super();
    this._publicKey = Ed25519PublicKey.from(publicKey);
  }

  /**
   * Serialize this key to JSON.
   */
  public toJSON(): JsonnableEd25519KeyIdentity {
    return [toHexString(this._publicKey.toDer()), toHexString(this._privateKey)];
  }

  /**
   * Return a copy of the key pair.
   */
  public getKeyPair(): KeyPair {
    return {
      secretKey: this._privateKey,
      publicKey: this._publicKey,
    };
  }

  /**
   * Return the public key.
   */
  public getPublicKey(): PublicKey {
    return this._publicKey;
  }

  /**
   * Signs a blob of data, with this identity's private key.
   * @param challenge - challenge to sign with this identity's secretKey, producing a signature
   */
  public async sign(challenge: ArrayBuffer): Promise<Signature> {
    const blob = new Uint8Array(challenge);
    const signature = tweetnacl.sign.detached(blob, new Uint8Array(this._privateKey)).buffer;
    return signature as Signature;
  }
}

type PublicKeyHex = string;
type SecretKeyHex = string;
export type JsonnableEd25519KeyIdentity = [PublicKeyHex, SecretKeyHex];
