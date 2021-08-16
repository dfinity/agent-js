/* eslint-disable no-underscore-dangle */
import { DerEncodedPublicKey, KeyPair, Signature } from '@dfinity/agent';
import Secp256k1 from 'secp256k1';
import { sha256 } from 'js-sha256';

import { PublicKey, SignIdentity } from '@dfinity/agent';
import { randomBytes } from 'crypto';
import { compare, fromHexString, toHexString } from '../buffer';
import { SECP256K1_OID } from './der';

declare type PublicKeyHex = string;
declare type SecretKeyHex = string;
export declare type JsonableSecp256k1Identity = [PublicKeyHex, SecretKeyHex];

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
  // The length of secp256k1 public keys is always 65 bytes.
  private static RAW_KEY_LENGTH = [23, 65];

  private static derEncode(publicKey: ArrayBuffer): DerEncodedPublicKey {
    publicKey.byteLength;
    if (!Secp256k1PublicKey.RAW_KEY_LENGTH.includes(publicKey.byteLength)) {
      const bl = publicKey.byteLength;
      throw new TypeError(
        `secp256k1 public key must be ${Secp256k1PublicKey.RAW_KEY_LENGTH} bytes long (is ${bl})`,
      );
    }

    const derPublicKey = Uint8Array.from([...SECP256K1_OID, ...new Uint8Array(publicKey)]);

    return derPublicKey.buffer as DerEncodedPublicKey;
  }

  private static derDecode(key: DerEncodedPublicKey): ArrayBuffer {
    const validLength = Secp256k1PublicKey.RAW_KEY_LENGTH.find(
      value => SECP256K1_OID.length + value === key.byteLength,
    );

    if (!validLength) {
      const bl = key.byteLength;
      throw new TypeError(
        `secp256k1 DER-encoded public key must be one of the following lengths: ${JSON.stringify(
          Secp256k1PublicKey.RAW_KEY_LENGTH.map(v => v + SECP256K1_OID.length),
        )}. Provided bytes have a length of ${bl}`,
      );
    }

    const rawKey = key.slice(0, SECP256K1_OID.length);
    if (compare(rawKey, SECP256K1_OID) !== 0) {
      throw new TypeError(
        'secp256k1 DER-encoded public key is invalid. A valid secp256k1 DER-encoded public key ' +
          `must have the following prefix: ${SECP256K1_OID}`,
      );
    }

    return rawKey;
  }

  private readonly rawKey: ArrayBuffer;

  private readonly derKey: DerEncodedPublicKey;

  // `fromRaw` and `fromDer` should be used for instantiation, not this constructor.
  private constructor(key: ArrayBuffer) {
    key.byteLength;
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

export class Secp256k1KeyIdentity extends SignIdentity {
  public static generate(seed?: Uint8Array): Secp256k1KeyIdentity {
    if (seed && seed.length !== 32) {
      throw new Error('Secp256k1 Seed needs to be 32 bytes long.');
    }

    let privateKey = seed || new Uint8Array(randomBytes(32));

    while (!Secp256k1.privateKeyVerify(privateKey)) {
      privateKey = new Uint8Array(randomBytes(32));
    }
    const publicKeyRaw = Secp256k1.publicKeyCreate(privateKey, false);

    const publicKey = Secp256k1PublicKey.fromRaw(publicKeyRaw);
    return new this(publicKey, privateKey);
  }

  public static fromParsedJson(obj: JsonableSecp256k1Identity): Secp256k1KeyIdentity {
    const [publicKeyRaw, privateKeyRaw] = obj;
    return new Secp256k1KeyIdentity(
      Secp256k1PublicKey.fromRaw(fromHexString(publicKeyRaw) as DerEncodedPublicKey),
      fromHexString(privateKeyRaw),
    );
  }

  public static fromJSON(json: string): Secp256k1KeyIdentity {
    const parsed = JSON.parse(json);
    if (Array.isArray(parsed)) {
      if (typeof parsed[0] === 'string' && typeof parsed[1] === 'string') {
        return this.fromParsedJson([parsed[0], parsed[1]]);
      }
      throw new Error('Deserialization error: JSON must have at least 2 items.');
    } else if (typeof parsed === 'object' && parsed !== null) {
      throw new Error('Deprecated JSON format for Ed25519 keys.');
    }
    throw new Error(`Deserialization error: Invalid JSON type for string: ${JSON.stringify(json)}`);
  }

  public static fromKeyPair(publicKey: ArrayBuffer, privateKey: ArrayBuffer): Secp256k1KeyIdentity {
    return new Secp256k1KeyIdentity(Secp256k1PublicKey.fromRaw(publicKey), privateKey);
  }

  public static fromSecretKey(secretKey: ArrayBuffer): Secp256k1KeyIdentity {
    const publicKey = Secp256k1.publicKeyCreate(new Uint8Array(secretKey), false);
    const identity = Secp256k1KeyIdentity.fromKeyPair(publicKey, new Uint8Array(secretKey));
    return identity;
  }

  protected _publicKey: Secp256k1PublicKey;

  protected constructor(publicKey: Secp256k1PublicKey, protected _privateKey: ArrayBuffer) {
    super();
    this._publicKey = publicKey;
  }

  /**
   * Serialize this key to JSON.
   */
  public toJSON(): JsonableSecp256k1Identity {
    return [toHexString(this._publicKey.toRaw()), toHexString(this._privateKey)];
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
  public getPublicKey(): Secp256k1PublicKey {
    return this._publicKey;
  }

  /**
   * Signs a blob of data, with this identity's private key.
   * @param challenge - challenge to sign with this identity's secretKey, producing a signature
   */
  public async sign(challenge: ArrayBuffer): Promise<Signature> {
    const hash = sha256.create();
    hash.update(challenge);
    const signature = Secp256k1.ecdsaSign(
      new Uint8Array(hash.digest()),
      new Uint8Array(this._privateKey),
    ).signature.buffer;
    return signature as Signature;
  }
}

export default Secp256k1KeyIdentity;
