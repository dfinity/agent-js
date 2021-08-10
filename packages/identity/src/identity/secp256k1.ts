/* eslint-disable no-underscore-dangle */
import Secp256k1 from 'secp256k1';
import { sha256 } from 'js-sha256';

import {
  blobFromHex,
  blobFromUint8Array,
  blobToHex,
  BinaryBlob,
  derBlobFromBlob,
  blobFromBuffer,
} from '@dfinity/candid';
import { PublicKey, SignIdentity, DerEncodedBlob } from '@dfinity/agent';
import { randomBytes } from 'crypto';

declare type PublicKeyHex = string;
declare type SecretKeyHex = string;
export declare type JsonableSecp256k1Identity = [PublicKeyHex, SecretKeyHex];

const PEM_BEGIN = '-----BEGIN PRIVATE KEY-----';

const PEM_END = '-----END PRIVATE KEY-----';

const PRIV_KEY_INIT = '308184020100301006072a8648ce3d020106052b8104000a046d306b0201010420';

const KEY_SEPARATOR = 'a144034200';

export class Secp256k1PublicKey implements PublicKey {
  public static fromRaw(rawKey: BinaryBlob): Secp256k1PublicKey {
    return new Secp256k1PublicKey(rawKey);
  }

  public static fromDer(derKey: BinaryBlob | DerEncodedBlob): Secp256k1PublicKey {
    return new Secp256k1PublicKey(this.derDecode(derKey as BinaryBlob));
  }

  public static from(key: PublicKey): Secp256k1PublicKey {
    return this.fromDer(key.toDer());
  }

  // The length of secp256k1 public keys is always 65 bytes.
  private static RAW_KEY_LENGTH = 65;

  // Adding this prefix to a raw public key is sufficient to DER-encode it.
  // prettier-ignore
  private static DER_PREFIX = Uint8Array.from([
    0x30, 0x56, // SEQUENCE
    0x30, 0x10, // SEQUENCE
    0x06, 0x07, 0x2a, 0x86, 0x48, 0xce, 0x3d, 0x02, 0x01, // OID ECDSA
    0x06, 0x05, 0x2b, 0x81, 0x04, 0x00, 0x0a, // OID secp256k1
    0x03, 0x42, // BIT STRING
    0x00, // no padding
  ]);

  private static derEncode(publicKey: BinaryBlob): DerEncodedBlob {
    if (publicKey.byteLength !== Secp256k1PublicKey.RAW_KEY_LENGTH) {
      const bl = publicKey.byteLength;
      throw new TypeError(
        `secp256k1 public key must be ${Secp256k1PublicKey.RAW_KEY_LENGTH} bytes long (is ${bl})`,
      );
    }

    const derPublicKey = Uint8Array.from([
      ...Secp256k1PublicKey.DER_PREFIX,
      ...new Uint8Array(publicKey),
    ]);

    return derBlobFromBlob(blobFromUint8Array(derPublicKey));
  }

  private static derDecode(key: BinaryBlob): BinaryBlob {
    const expectedLength = Secp256k1PublicKey.DER_PREFIX.length + Secp256k1PublicKey.RAW_KEY_LENGTH;
    if (key.byteLength !== expectedLength) {
      const bl = key.byteLength;
      throw new TypeError(
        `secp256k1 DER-encoded public key must be ${expectedLength} bytes long (is ${bl})`,
      );
    }

    const rawKey = blobFromUint8Array(key.subarray(Secp256k1PublicKey.DER_PREFIX.length));
    if (!this.derEncode(rawKey).equals(key)) {
      throw new TypeError(
        'secp256k1 DER-encoded public key is invalid. A valid secp256k1 DER-encoded public key ' +
          `must have the following prefix: ${Secp256k1PublicKey.DER_PREFIX}`,
      );
    }

    return rawKey;
  }

  private readonly rawKey: BinaryBlob;

  private readonly derKey: DerEncodedBlob;

  // `fromRaw` and `fromDer` should be used for instantiation, not this constructor.
  private constructor(key: BinaryBlob) {
    this.rawKey = key;
    this.derKey = Secp256k1PublicKey.derEncode(key);
  }

  public toDer(): DerEncodedBlob {
    return this.derKey;
  }

  public toRaw(): BinaryBlob {
    return this.rawKey;
  }
}

export class Secp256k1KeyIdentity extends SignIdentity {
  public static generate(seed?: Uint8Array): Secp256k1KeyIdentity {
    if (seed && seed.length !== 32) {
      throw new Error('Secp256k1 Seed needs to be 32 bytes long.');
    }
    // TODO: Add seed parameter --> derive PK from it
    let privateKey = seed || randomBytes(32); // TODO: REMOVE THIS SINCE IT'S OVERWRITING THE SEED
    while (!Secp256k1.privateKeyVerify(privateKey)) {
      privateKey = randomBytes(32);
    }
    const publicKeyRaw = Secp256k1.publicKeyCreate(privateKey, false);
    return new this(
      Secp256k1PublicKey.fromRaw(blobFromUint8Array(publicKeyRaw)),
      blobFromBuffer(privateKey as any), // TODO: CHECK WHY THIS TYPE CHECK FAILS SMH
    );
  }

  public static fromParsedJson(obj: [string, string]): Secp256k1KeyIdentity {
    const [publicKeyRaw, privateKeyRaw] = obj;
    return new Secp256k1KeyIdentity(
      Secp256k1PublicKey.fromRaw(blobFromHex(publicKeyRaw)),
      blobFromHex(privateKeyRaw),
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
      const { publicKey, _publicKey, secretKey, _privateKey } = parsed;
      const pk = publicKey
        ? Secp256k1PublicKey.fromRaw(blobFromUint8Array(new Uint8Array(publicKey.data)))
        : Secp256k1PublicKey.fromDer(blobFromUint8Array(new Uint8Array(_publicKey.data)));

      if (publicKey && secretKey && secretKey.data) {
        return new Secp256k1KeyIdentity(pk, blobFromUint8Array(new Uint8Array(secretKey.data)));
      }
      if (_publicKey && _privateKey && _privateKey.data) {
        return new Secp256k1KeyIdentity(pk, blobFromUint8Array(new Uint8Array(_privateKey.data)));
      }
    }
    throw new Error(`Deserialization error: Invalid JSON type for string: ${JSON.stringify(json)}`);
  }

  public static fromKeyPair(publicKey: BinaryBlob, privateKey: BinaryBlob): Secp256k1KeyIdentity {
    return new Secp256k1KeyIdentity(Secp256k1PublicKey.fromRaw(publicKey), privateKey);
  }

  public static fromSecretKey(secretKey: ArrayBuffer): Secp256k1KeyIdentity {
    const publicKey = Secp256k1.publicKeyCreate(new Uint8Array(secretKey), false);
    const identity = Secp256k1KeyIdentity.fromKeyPair(
      blobFromUint8Array(publicKey),
      blobFromUint8Array(new Uint8Array(secretKey)),
    );
    return identity;
  }

  protected _publicKey: Secp256k1PublicKey;

  // `fromRaw` and `fromDer` should be used for instantiation, not this constructor.
  protected constructor(publicKey: PublicKey, protected _privateKey: BinaryBlob) {
    super();
    this._publicKey = Secp256k1PublicKey.from(publicKey);
  }

  /**
   * Serialize this key to JSON.
   */
  public toJSON(): JsonableSecp256k1Identity {
    return [blobToHex(this._publicKey.toRaw()), blobToHex(this._privateKey)];
  }

  /**
   * Return a copy of the key pair.
   */
  public getKeyPair(): {
    secretKey: BinaryBlob;
    publicKey: Secp256k1PublicKey;
  } {
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
   *  Return private key in a pem file
   */

  public getPem(): string {
    const rawPrivateKey = this._privateKey.toString('hex');
    const rawPublicKey = this._publicKey.toRaw().toString('hex');

    return `${PEM_BEGIN}\n${Buffer.from(
      `${PRIV_KEY_INIT}${rawPrivateKey}${KEY_SEPARATOR}${rawPublicKey}`,
      'hex',
    ).toString('base64')}\n${PEM_END}`;
  }

  /**
   * Signs a blob of data, with this identity's private key.
   * @param challenge - challenge to sign with this identity's secretKey, producing a signature
   */
  public async sign(challenge: BinaryBlob): Promise<BinaryBlob> {
    const hash = sha256.create();
    hash.update(challenge);
    const { signature } = Secp256k1.ecdsaSign(new Uint8Array(hash.digest()), this._privateKey);
    return blobFromUint8Array(signature);
  }
}

export default Secp256k1KeyIdentity;
