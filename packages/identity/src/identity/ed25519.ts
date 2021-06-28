import { KeyPair, PublicKey, SignIdentity } from '@dfinity/agent';
import {
  BinaryBlob,
  blobFromHex,
  blobFromUint8Array,
  blobToHex,
  derBlobFromBlob,
  DerEncodedBlob,
  blobFromBuffer,
} from '@dfinity/candid';
import { Buffer } from 'buffer/';
import * as tweetnacl from 'tweetnacl';
import { ED25519_OID, unwrapDER, wrapDER } from './der';

export class Ed25519PublicKey implements PublicKey {
  public static from(key: PublicKey): Ed25519PublicKey {
    return this.fromDer(key.toDer());
  }

  public static fromRaw(rawKey: BinaryBlob): Ed25519PublicKey {
    return new Ed25519PublicKey(rawKey);
  }

  public static fromDer(derKey: BinaryBlob): Ed25519PublicKey {
    return new Ed25519PublicKey(this.derDecode(derKey));
  }

  // The length of Ed25519 public keys is always 32 bytes.
  private static RAW_KEY_LENGTH = 32;

  private static derEncode(publicKey: BinaryBlob): DerEncodedBlob {
    return derBlobFromBlob(blobFromUint8Array(wrapDER(publicKey, ED25519_OID)));
  }

  private static derDecode(key: BinaryBlob): BinaryBlob {
    const unwrapped = unwrapDER(key, ED25519_OID);
    if (unwrapped.length !== this.RAW_KEY_LENGTH) {
      throw new Error('An Ed25519 public key must be exactly 32bytes long');
    }
    return blobFromUint8Array(unwrapped);
  }

  private readonly rawKey: BinaryBlob;
  private readonly derKey: DerEncodedBlob;

  // `fromRaw` and `fromDer` should be used for instantiation, not this constructor.
  private constructor(key: BinaryBlob) {
    this.rawKey = key;
    this.derKey = Ed25519PublicKey.derEncode(key);
  }

  public toDer(): DerEncodedBlob {
    return this.derKey;
  }

  public toRaw(): BinaryBlob {
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
    return new this(
      Ed25519PublicKey.fromRaw(blobFromUint8Array(publicKey)),
      blobFromUint8Array(secretKey),
    );
  }

  public static fromParsedJson(obj: JsonnableEd25519KeyIdentity): Ed25519KeyIdentity {
    const [publicKeyDer, privateKeyRaw] = obj;
    return new Ed25519KeyIdentity(
      Ed25519PublicKey.fromDer(blobFromHex(publicKeyDer)),
      blobFromHex(privateKeyRaw),
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
    } else if (typeof parsed === 'object' && parsed !== null) {
      const { publicKey, _publicKey, secretKey, _privateKey } = parsed;
      const pk = publicKey
        ? Ed25519PublicKey.fromRaw(blobFromUint8Array(new Uint8Array(publicKey.data)))
        : Ed25519PublicKey.fromDer(blobFromUint8Array(new Uint8Array(_publicKey.data)));

      if (publicKey && secretKey && secretKey.data) {
        return new Ed25519KeyIdentity(pk, blobFromUint8Array(new Uint8Array(secretKey.data)));
      } else if (_publicKey && _privateKey && _privateKey.data) {
        return new Ed25519KeyIdentity(pk, blobFromUint8Array(new Uint8Array(_privateKey.data)));
      }
    }
    throw new Error(`Deserialization error: Invalid JSON type for string: ${JSON.stringify(json)}`);
  }

  public static fromKeyPair(publicKey: BinaryBlob, privateKey: BinaryBlob): Ed25519KeyIdentity {
    return new Ed25519KeyIdentity(Ed25519PublicKey.fromRaw(publicKey), privateKey);
  }

  public static fromSecretKey(secretKey: ArrayBuffer): Ed25519KeyIdentity {
    const keyPair = tweetnacl.sign.keyPair.fromSecretKey(new Uint8Array(secretKey));
    const identity = Ed25519KeyIdentity.fromKeyPair(
      blobFromUint8Array(keyPair.publicKey),
      blobFromUint8Array(keyPair.secretKey),
    );
    return identity;
  }

  protected _publicKey: Ed25519PublicKey;

  // `fromRaw` and `fromDer` should be used for instantiation, not this constructor.
  protected constructor(publicKey: PublicKey, protected _privateKey: BinaryBlob) {
    super();
    this._publicKey = Ed25519PublicKey.from(publicKey);
  }

  /**
   * Serialize this key to JSON.
   */
  public toJSON(): JsonnableEd25519KeyIdentity {
    return [blobToHex(this._publicKey.toDer()), blobToHex(this._privateKey)];
  }

  /**
   * Return a copy of the key pair.
   */
  public getKeyPair(): KeyPair {
    return {
      secretKey: blobFromUint8Array(new Uint8Array(this._privateKey)),
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
  public async sign(challenge: BinaryBlob | ArrayBuffer): Promise<BinaryBlob> {
    const blob =
      challenge instanceof Buffer
        ? blobFromBuffer(challenge)
        : blobFromUint8Array(new Uint8Array(challenge));
    const signature = tweetnacl.sign.detached(blob, this._privateKey);
    return blobFromUint8Array(signature);
  }
}

type PublicKeyHex = string;
type SecretKeyHex = string;
export type JsonnableEd25519KeyIdentity = [PublicKeyHex, SecretKeyHex];
